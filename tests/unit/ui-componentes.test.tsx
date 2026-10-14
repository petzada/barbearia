// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BrandProvider } from '~/ui/brand/BrandProvider'
import { defaultBrand } from '~/ui/brand/brand-config'
import { Checkbox } from '~/ui/components/Checkbox'
import { DateStrip } from '~/ui/components/DateStrip'
import { DateTimeText, MoneyText } from '~/ui/components/format'
import { Input } from '~/ui/components/Input'
import { OtpInput } from '~/ui/components/OtpInput'
import { PhoneInput } from '~/ui/components/PhoneInput'
import { formatPhoneMask, phoneDigits } from '~/ui/components/phone'
import { EmptyState, LoadingSkeleton, PendingExternal, AccessDenied } from '~/ui/components/states'
import { Table } from '~/ui/components/Table'
import { TimeSlotGrid } from '~/ui/components/TimeSlotGrid'
import { ToastProvider, useToast } from '~/ui/components/Toast'

afterEach(cleanup)

describe('MoneyText e DateTimeText: única formatação de dinheiro e data (PRD §4.1)', () => {
  it('dinheiro em BRL a partir de centavos', () => {
    render(
      <>
        <MoneyText cents={12990} />|<MoneyText cents={129990} />|<MoneyText cents={0} />|
        <MoneyText cents={-500} />
      </>,
    )
    expect(document.body.textContent).toBe('R$ 129,90|R$ 1.299,90|R$ 0,00|-R$ 5,00')
  })

  it('centavos não inteiros são recusados em vez de arredondados em silêncio', () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => render(<MoneyText cents={10.5} />)).toThrow()
    erro.mockRestore()
  })

  it('data no fuso da loja, não no do aparelho: 02:30Z é 23:30 do dia anterior em São Paulo', () => {
    render(<DateTimeText value="2026-10-17T02:30:00Z" format="completo" />)
    const t = document.querySelector('time')!
    expect(t.textContent).toMatch(/sexta-feira/)
    expect(t.textContent).toMatch(/16 de outubro/)
    expect(t.textContent).toMatch(/23:30/)
    expect(t.getAttribute('datetime')).toBe('2026-10-17T02:30:00.000Z')
  })

  it('formato completo traz dia da semana, dia, mês e hora (evento crítico)', () => {
    render(<DateTimeText value="2026-10-17T17:30:00Z" />)
    expect(document.querySelector('time')!.textContent).toMatch(
      /^sábado, 17 de outubro,? (às )?14:30$/,
    )
  })

  it('fuso configurado na marca e fuso explícito mandam na formatação', () => {
    const manaus = { ...defaultBrand, fuso: 'America/Manaus' }
    render(
      <BrandProvider brand={manaus}>
        <DateTimeText value="2026-10-17T17:30:00Z" format="hora" />
        <DateTimeText value="2026-10-17T17:30:00Z" format="hora" timeZone="America/Sao_Paulo" />
      </BrandProvider>,
    )
    const horas = [...document.querySelectorAll('time')].map((t) => t.textContent)
    expect(horas).toEqual(['13:30', '14:30'])
  })

  it('data inválida não quebra a tela', () => {
    render(<DateTimeText value="não é data" />)
    expect(screen.getByText('Data indisponível')).toBeTruthy()
  })

  it('virada de ano e meia-noite local ficam no dia certo', () => {
    render(<DateTimeText value="2027-01-01T02:59:00Z" format="dataCurta" />)
    expect(document.querySelector('time')!.textContent).toBe('31/12/2026')
  })
})

describe('campos: rótulo, erro e dica acessíveis', () => {
  it('erro tem role=alert, prefixo "Erro:", aria-invalid e ligação por aria-describedby', () => {
    render(
      <Input label="E-mail" hint="Usamos só para recibos." error="Informe um e-mail válido." />,
    )
    const campo = screen.getByLabelText('E-mail')
    expect(campo.getAttribute('aria-invalid')).toBe('true')
    const alerta = screen.getByRole('alert')
    expect(alerta.textContent).toContain('Erro:')
    expect(alerta.textContent).toContain('Informe um e-mail válido.')
    const descricao = campo.getAttribute('aria-describedby')!.split(' ')
    expect(descricao).toContain(alerta.id)
    expect(descricao).toHaveLength(2)
  })

  it('sem erro não há alerta nem aria-invalid', () => {
    render(<Input label="Nome" />)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByLabelText('Nome').getAttribute('aria-invalid')).toBeNull()
  })

  it('PhoneInput: máscara na tela e só dígitos no valor, limitado a 11', () => {
    expect(phoneDigits('(11) 98765-4321 ramal 9')).toBe('11987654321')
    expect(formatPhoneMask('11')).toBe('(11')
    expect(formatPhoneMask('119')).toBe('(11) 9')
    expect(formatPhoneMask('1198765')).toBe('(11) 9876-5')
    expect(formatPhoneMask('11987654321')).toBe('(11) 98765-4321')
    expect(formatPhoneMask('1133334444')).toBe('(11) 3333-4444')

    const onChange = vi.fn()
    render(<PhoneInput label="WhatsApp" value="1198765" onChange={onChange} />)
    const campo = screen.getByLabelText('WhatsApp') as HTMLInputElement
    expect(campo.value).toBe('(11) 9876-5')
    fireEvent.change(campo, { target: { value: '(11) 98765-43219999' } })
    expect(onChange).toHaveBeenLastCalledWith('11987654321')
  })

  it('OtpInput: aceita só dígitos até o tamanho do código e pede preenchimento automático', () => {
    const onChange = vi.fn()
    render(<OtpInput label="Código" value="" onChange={onChange} />)
    const campo = screen.getByLabelText('Código') as HTMLInputElement
    expect(campo.getAttribute('autocomplete')).toBe('one-time-code')
    expect(campo.getAttribute('inputmode')).toBe('numeric')
    fireEvent.change(campo, { target: { value: '12ab3456789' } })
    expect(onChange).toHaveBeenLastCalledWith('123456')
  })

  it('Checkbox: o rótulo inteiro marca e o erro é anunciado', () => {
    const onChange = vi.fn()
    render(<Checkbox label="Aceito os termos" error="É preciso aceitar." onChange={onChange} />)
    fireEvent.click(screen.getByText('Aceito os termos'))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('alert').textContent).toContain('É preciso aceitar.')
  })
})

const DIAS = [
  { date: '2026-10-19' },
  { date: '2026-10-20', disabled: true },
  { date: '2026-10-21' },
  { date: '2026-10-22' },
]

describe('DateStrip e TimeSlotGrid: escolha por teclado e sem cálculo de disponibilidade', () => {
  it('DateStrip: nomeia o dia, seleciona e não seleciona dia indisponível', () => {
    const onSelect = vi.fn()
    render(<DateStrip label="Dia" days={DIAS} selected="2026-10-19" onSelect={onSelect} />)
    const grupo = screen.getByRole('radiogroup', { name: 'Dia' })
    const dias = within(grupo).getAllByRole('radio')
    expect(dias).toHaveLength(4)
    expect(dias[0]!.getAttribute('aria-checked')).toBe('true')
    expect(dias[0]!.getAttribute('aria-label')).toMatch(/segunda-feira, 19 de outubro/)
    expect(dias[1]!.getAttribute('aria-label')).toMatch(/indisponível/)

    fireEvent.click(dias[1]!)
    expect(onSelect).not.toHaveBeenCalled()
    fireEvent.click(dias[2]!)
    expect(onSelect).toHaveBeenCalledWith('2026-10-21')
  })

  it('DateStrip: só o item ativo está na ordem de tabulação (roving) e as setas pulam o indisponível', () => {
    render(<DateStrip label="Dia" days={DIAS} selected="2026-10-19" onSelect={() => undefined} />)
    const dias = screen.getAllByRole('radio')
    expect(dias.map((d) => d.getAttribute('tabindex'))).toEqual(['0', '-1', '-1', '-1'])
    dias[0]!.focus()
    fireEvent.keyDown(dias[0]!.parentElement!, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(dias[2])
    fireEvent.keyDown(dias[0]!.parentElement!, { key: 'End' })
    expect(document.activeElement).toBe(dias[3])
    fireEvent.keyDown(dias[0]!.parentElement!, { key: 'Home' })
    expect(document.activeElement).toBe(dias[0])
  })

  it('TimeSlotGrid: mostra a hora no fuso da loja e respeita o que o servidor marcou como indisponível', () => {
    const onSelect = vi.fn()
    render(
      <TimeSlotGrid
        label="Horário"
        selectedId={null}
        onSelect={onSelect}
        slots={[
          { id: 'a', startsAt: '2026-10-19T12:00:00Z', available: true },
          { id: 'b', startsAt: '2026-10-19T12:30:00Z', available: false },
        ]}
      />,
    )
    const [livre, ocupado] = screen.getAllByRole('radio')
    expect(livre!.textContent).toBe('09:00')
    expect(ocupado!.getAttribute('aria-label')).toBe('09:30, indisponível')
    fireEvent.click(ocupado!)
    expect(onSelect).not.toHaveBeenCalled()
    fireEvent.click(livre!)
    expect(onSelect).toHaveBeenCalledWith('a')
  })
})

describe('estados de consulta (PRD §4.1)', () => {
  it('carregando é anunciado ao leitor de tela', () => {
    render(<LoadingSkeleton label="Carregando reservas…" />)
    const area = screen.getByRole('status')
    expect(area.getAttribute('aria-busy')).toBe('true')
    expect(area.textContent).toContain('Carregando reservas…')
  })

  it('vazio sempre traz a próxima ação', () => {
    render(<EmptyState title="Nada aqui" action={<button type="button">Agendar</button>} />)
    expect(screen.getByRole('button', { name: 'Agendar' })).toBeTruthy()
  })

  it('acesso negado explica e oferece saída', () => {
    render(<AccessDenied action={<a href="/">Voltar</a>} />)
    expect(screen.getByRole('alert').textContent).toContain('Você não tem acesso a esta tela')
    expect(screen.getByRole('link', { name: 'Voltar' })).toBeTruthy()
  })

  it('pendente externa mostra protocolo, passos e próxima atualização no fuso da loja', () => {
    render(
      <PendingExternal
        protocol="PROT-1"
        nextSteps={['Aguardando o banco.', 'Avisamos por WhatsApp.']}
        nextUpdateAt="2026-10-17T17:30:00Z"
      />,
    )
    const caixa = screen.getByRole('status')
    expect(caixa.textContent).toContain('PROT-1')
    expect(caixa.textContent).toContain('Aguardando o banco.')
    expect(caixa.textContent).toMatch(/17 de outubro/)
    expect(caixa.textContent).toMatch(/14:30/)
  })
})

describe('Table (backoffice)', () => {
  const colunas = [
    { key: 'nome', header: 'Cliente', render: (r: { nome: string; cents: number }) => r.nome },
    {
      key: 'saldo',
      header: 'Saldo',
      align: 'right' as const,
      render: (r: { nome: string; cents: number }) => <MoneyText cents={r.cents} />,
    },
  ]

  it('tabela semântica com legenda, cabeçalhos de coluna e valores formatados', () => {
    render(
      <Table
        caption="Clientes"
        columns={colunas}
        rows={[{ nome: 'Ana', cents: 4500 }]}
        getRowId={(r) => r.nome}
        empty={null}
      />,
    )
    expect(screen.getByRole('table', { name: 'Clientes' })).toBeTruthy()
    expect(screen.getAllByRole('columnheader').map((c) => c.textContent)).toEqual([
      'Cliente',
      'Saldo',
    ])
    expect(screen.getByText('R$ 45,00')).toBeTruthy()
  })

  it('sem linhas mostra o vazio; carregando mostra o esqueleto', () => {
    const { rerender } = render(
      <Table
        caption="Clientes"
        columns={colunas}
        rows={[]}
        getRowId={() => ''}
        empty={<p>Nenhum cliente.</p>}
      />,
    )
    expect(screen.getByText('Nenhum cliente.')).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
    rerender(
      <Table
        caption="Clientes"
        columns={colunas}
        rows={[]}
        getRowId={() => ''}
        empty={null}
        loading
      />,
    )
    expect(screen.getByRole('status').textContent).toContain('Carregando Clientes…')
  })
})

function Disparador() {
  const toast = useToast()
  const [n, setN] = useState(0)
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setN(n + 1)
          toast.show({ tone: 'sucesso', title: `Salvo ${n + 1}` })
        }}
      >
        ok
      </button>
      <button type="button" onClick={() => toast.show({ tone: 'perigo', title: 'Falhou' })}>
        erro
      </button>
    </>
  )
}

describe('Toast: aria-live', () => {
  it('informação vai à região polite e erro à região assertive, ambas já montadas', async () => {
    render(
      <ToastProvider>
        <Disparador />
      </ToastProvider>,
    )
    const polite = document.querySelector('[aria-live="polite"]')!
    const assertive = document.querySelector('[aria-live="assertive"]')!
    expect(polite.getAttribute('role')).toBe('status')
    expect(assertive.getAttribute('role')).toBe('alert')

    await act(async () => {
      fireEvent.click(screen.getByText('ok'))
    })
    expect(polite.textContent).toContain('Salvo 1')
    await act(async () => {
      fireEvent.click(screen.getByText('erro'))
    })
    expect(assertive.textContent).toContain('Falhou')
    expect(polite.textContent).not.toContain('Falhou')
  })

  it('o aviso pode ser fechado pelo botão de 44 px', async () => {
    render(
      <ToastProvider>
        <Disparador />
      </ToastProvider>,
    )
    await act(async () => {
      fireEvent.click(screen.getByText('ok'))
    })
    const fechar = screen.getByRole('button', { name: 'Fechar aviso' })
    expect(fechar.className).toContain('size-11')
    await act(async () => {
      fireEvent.click(fechar)
    })
    expect(screen.queryByText('Salvo 1')).toBeNull()
  })
})
