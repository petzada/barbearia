// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { FormEvent } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ErrorResult, Result } from '~/contracts'
import { Button } from '~/ui/components/Button'
import { ErrorState } from '~/ui/components/states'
import { MutationStatus } from '~/ui/mutation/MutationStatus'
import { useMutation } from '~/ui/mutation/useMutation'

afterEach(cleanup)

function adiavel<T>() {
  let resolver!: (v: T) => void
  const promessa = new Promise<T>((r) => {
    resolver = r
  })
  return { promessa, resolver }
}

describe('Button: estado enviando e bloqueio de duplo clique (PRD §4.1)', () => {
  it('enviando mostra o texto de envio, fica aria-busy e ignora cliques', () => {
    const onClick = vi.fn()
    render(
      <Button sending sendingLabel="Salvando…" onClick={onClick}>
        Salvar
      </Button>,
    )
    const botao = screen.getByRole('button', { name: 'Salvando…' })
    expect(botao.getAttribute('aria-busy')).toBe('true')
    expect(botao.getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(botao)
    fireEvent.click(botao)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('onClick assíncrono: o segundo clique durante o voo é ignorado e o botão volta depois', async () => {
    const espera = adiavel<void>()
    const onClick = vi.fn(() => espera.promessa)
    render(<Button onClick={onClick}>Confirmar</Button>)

    const botao = screen.getByRole('button', { name: 'Confirmar' })
    fireEvent.click(botao)
    fireEvent.click(screen.getByRole('button', { name: 'Enviando…' }))
    fireEvent.click(screen.getByRole('button', { name: 'Enviando…' }))
    expect(onClick).toHaveBeenCalledTimes(1)

    await act(async () => {
      espera.resolver()
      await espera.promessa
    })
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(onClick).toHaveBeenCalledTimes(2)
  })

  it('libera o botão mesmo se a promessa falhar', async () => {
    const onClick = vi.fn(() => Promise.reject(new Error('falhou')))
    render(<Button onClick={onClick}>Confirmar</Button>)
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirmar' })).toBeTruthy())
  })

  it('submit duplo em formulário (Enter repetido) dispara um envio só', () => {
    const onSubmit = vi.fn((e: FormEvent) => e.preventDefault())
    render(
      <form onSubmit={onSubmit}>
        <Button type="submit" sending>
          Enviar
        </Button>
      </form>,
    )
    const botao = screen.getByRole('button')
    fireEvent.click(botao)
    fireEvent.click(botao)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('disabled usa o atributo nativo e não clica', () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Salvar
      </Button>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('o alvo de toque mínimo (44 px) vem da classe do botão', () => {
    render(<Button>OK</Button>)
    expect(screen.getByRole('button').className).toContain('min-h-11')
    expect(screen.getByRole('button').className).toContain('min-w-11')
  })
})

function erro(partes: Partial<ErrorResult> = {}): ErrorResult {
  return {
    status: 'error',
    code: 'SYSTEM.INTERNAL',
    message: 'Algo deu errado.',
    fields: [],
    retryable: false,
    correlationId: 'corr-77',
    httpStatus: 500,
    ...partes,
  }
}

/** Tela mínima: mantém o campo, envia e mostra o status padrão. */
function Tela({
  proximo,
  chaves,
}: {
  proximo: () => Promise<Result<{ protocolo: string }>>
  chaves: string[]
}) {
  const mutacao = useMutation<{ nome: string }, { protocolo: string }>({
    action: (_entrada, { idempotencyKey }) => {
      chaves.push(idempotencyKey)
      return proximo()
    },
  })
  return (
    <div>
      <label>
        Nome
        <input
          defaultValue="Ana"
          name="nome"
          aria-invalid={mutacao.fieldErrors['nome'] ? true : undefined}
        />
      </label>
      <p data-testid="erro-nome">{mutacao.fieldErrors['nome'] ?? ''}</p>
      <Button
        sending={mutacao.isSending}
        onClick={() => {
          const campo = document.querySelector<HTMLInputElement>('input[name="nome"]')
          void mutacao.submit({ nome: campo?.value ?? '' })
        }}
      >
        Salvar
      </Button>
      <MutationStatus
        mutation={mutacao}
        pendingNextSteps={['Aguarde a confirmação do banco.']}
        conflictAlternatives={[{ id: 'a', label: 'Hoje às 15:30', onChoose: vi.fn() }]}
        renderDone={(d) => <p>Confirmado: {d.protocolo}</p>}
      />
    </div>
  )
}

describe('useMutation + MutationStatus: estados na tela', () => {
  it('enviando: bloqueia o botão e anuncia; duplo clique chama o servidor uma vez', async () => {
    const espera = adiavel<Result<{ protocolo: string }>>()
    const proximo = vi.fn(() => espera.promessa)
    const chaves: string[] = []
    render(<Tela proximo={proximo} chaves={chaves} />)

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    const bloqueado = await screen.findByRole('button', { name: 'Enviando…' })
    fireEvent.click(bloqueado)
    fireEvent.click(bloqueado)
    expect(proximo).toHaveBeenCalledTimes(1)
    expect(screen.getAllByText('Enviando…').length).toBeGreaterThan(0)

    await act(async () => {
      espera.resolver({ status: 'ok', data: { protocolo: 'P-1' }, revision: 1 })
      await espera.promessa
    })
    expect(await screen.findByText('Confirmado: P-1')).toBeTruthy()
  })

  it('sucesso só aparece depois do ok do servidor, nunca no clique', async () => {
    const espera = adiavel<Result<{ protocolo: string }>>()
    render(<Tela proximo={() => espera.promessa} chaves={[]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await screen.findByRole('button', { name: 'Enviando…' })
    expect(screen.queryByText(/Confirmado/)).toBeNull()
    await act(async () => {
      espera.resolver({ status: 'ok', data: { protocolo: 'P-2' }, revision: null })
      await espera.promessa
    })
    expect(await screen.findByText('Confirmado: P-2')).toBeTruthy()
  })

  it('pendente externa: mostra protocolo e próximos passos, sem texto de sucesso', async () => {
    render(
      <Tela
        chaves={[]}
        proximo={() =>
          Promise.resolve({
            status: 'pending',
            operationId: 'op-1',
            protocol: 'PROT-2026-9',
            nextUpdateAt: '2026-10-19T15:30:00.000Z',
          })
        }
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText('PROT-2026-9')).toBeTruthy()
    expect(screen.getByText('Aguarde a confirmação do banco.')).toBeTruthy()
    expect(screen.queryByText(/Confirmado/)).toBeNull()
  })

  it('conflito: mostra a mensagem e as alternativas reais', async () => {
    render(
      <Tela
        chaves={[]}
        proximo={() =>
          Promise.resolve(
            erro({
              code: 'SCHEDULING.SLOT_UNAVAILABLE',
              httpStatus: 409,
              message: 'Horário ocupado.',
            }),
          )
        }
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText('Horário ocupado.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Hoje às 15:30' })).toBeTruthy()
  })

  it('erro de validação: mantém o que foi digitado e liga a mensagem ao campo', async () => {
    render(
      <Tela
        chaves={[]}
        proximo={() =>
          Promise.resolve(
            erro({
              code: 'VALIDATION.FAILED',
              httpStatus: 422,
              message: 'Confira os campos informados.',
              fields: [{ path: 'nome', message: 'Muito curto.' }],
            }),
          )
        }
      />,
    )
    const campo = screen.getByLabelText('Nome') as HTMLInputElement
    fireEvent.change(campo, { target: { value: 'A' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Confira os campos informados.')).toBeTruthy()
    expect(screen.getByTestId('erro-nome').textContent).toBe('Muito curto.')
    expect(campo.value).toBe('A')
    expect(screen.getByText('Suas informações foram mantidas.')).toBeTruthy()
  })

  it('falha retentável: "Tentar de novo" repete com a mesma chave de idempotência', async () => {
    const chaves: string[] = []
    const respostas: Array<Result<{ protocolo: string }>> = [
      erro({ retryable: true, httpStatus: 503, message: 'Serviço indisponível.' }),
      { status: 'ok', data: { protocolo: 'P-3' }, revision: 2 },
    ]
    render(<Tela chaves={chaves} proximo={() => Promise.resolve(respostas.shift()!)} />)

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText('Serviço indisponível.')).toBeTruthy()
    expect(screen.getByText('corr-77')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByText('Confirmado: P-3')).toBeTruthy()
    expect(chaves).toHaveLength(2)
    expect(chaves[0]).toBe(chaves[1])
  })

  it('falha sem retentativa não oferece "Tentar de novo"', async () => {
    render(<Tela chaves={[]} proximo={() => Promise.resolve(erro({ retryable: false }))} />)
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await screen.findByText('Algo deu errado.')
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).toBeNull()
  })

  it('rede caiu (exceção): mensagem segura e botão para tentar de novo', async () => {
    render(<Tela chaves={[]} proximo={() => Promise.reject(new Error('socket hang up'))} />)
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText(/Não foi possível falar com o servidor/)).toBeTruthy()
    expect(screen.queryByText(/socket hang up/)).toBeNull()
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeTruthy()
  })
})

describe('ErrorState: tentar de novo', () => {
  it('chama onRetry uma vez mesmo com duplo clique', async () => {
    const espera = adiavel<void>()
    const onRetry = vi.fn(() => espera.promessa)
    render(<ErrorState message="Falhou." onRetry={onRetry} correlationId="abc" />)
    const botao = screen.getByRole('button', { name: 'Tentar de novo' })
    fireEvent.click(botao)
    fireEvent.click(screen.getByRole('button', { name: 'Enviando…' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(screen.getByText('abc')).toBeTruthy()
    await act(async () => {
      espera.resolver()
      await espera.promessa
    })
  })
})
