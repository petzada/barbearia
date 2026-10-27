import { useEffect, useState, type FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import type { Result } from '~/contracts'
import {
  Badge,
  Button,
  Card,
  Checkbox,
  EmptyState,
  ErrorState,
  Input,
  LoadingSkeleton,
  MutationStatus,
  useMutation,
  useToast,
} from '~/ui'
import { changeEnablement, listMatrix, scheduleCommission } from '../client'
import { assinanteAcompanhaAvulso, formatPercentualBasisPoints, parsePercentual } from './format'

type Resultado = Awaited<ReturnType<typeof listMatrix>>
type Dados<T> = T extends Promise<Result<infer D>> ? D : never
type AlterarHabilitacaoInput = Omit<Parameters<typeof changeEnablement>[0], 'idempotencyKey'>
type AgendarComissaoInput = Omit<Parameters<typeof scheduleCommission>[0], 'idempotencyKey'>
type Celula = Dados<ReturnType<typeof listMatrix>>['celulas'][number]

export function AdminMatriz() {
  const [resultado, setResultado] = useState<Resultado | null>(null)

  async function carregar() {
    setResultado(await listMatrix({}))
  }

  useEffect(() => {
    let ativa = true
    void listMatrix({}).then((resposta) => {
      if (ativa) setResultado(resposta)
    })
    return () => {
      ativa = false
    }
  }, [])

  if (!resultado) return <LoadingSkeleton lines={6} label="Carregando matriz da equipe…" />
  if (resultado.status === 'error') {
    return (
      <ErrorState
        message={resultado.message}
        correlationId={resultado.correlationId}
        onRetry={carregar}
      />
    )
  }
  if (resultado.status !== 'ok') return null

  const celulas = resultado.data.celulas
  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-2 border-b border-borda pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold tracking-[0.16em] text-primaria uppercase">
            Gestão · Equipe
          </p>
          <h1 className="mt-1 text-3xl font-bold text-texto">Matriz barbeiro × serviço</h1>
        </div>
        <Link
          to="/admin/servicos"
          className="min-h-11 self-start rounded-md border border-borda-forte px-4 py-2 font-semibold text-texto hover:bg-elevada sm:self-auto"
        >
          Gerenciar serviços
        </Link>
      </header>

      <Card className="border-l-2 border-l-primaria/65">
        <p className="text-sm text-suave">
          Habilite somente os serviços que cada profissional realiza. Para uma visita, o barbeiro
          precisa estar habilitado no combo e em todos os seus componentes.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone="info">Avulso</Badge>
          <Badge tone="sucesso">Assinante</Badge>
          <span className="self-center text-sm text-suave">
            Percentuais de 0% a 100%; uma nova vigência preserva os atendimentos anteriores.
          </span>
        </div>
      </Card>

      {celulas.length === 0 ? (
        <Card>
          <EmptyState
            title="A matriz ainda não tem linhas"
            description="Cadastre serviços e vincule os perfis de barbeiro para configurar a habilitação e os percentuais."
            action={
              <Link to="/admin/servicos" className="font-semibold text-primaria underline">
                Abrir catálogo de serviços
              </Link>
            }
            icon="barbeiros"
          />
        </Card>
      ) : (
        <section aria-label="Habilitações e comissões" className="flex flex-col gap-3">
          {celulas.map((celula) => (
            <LinhaMatriz
              key={`${celula.barbeiroId}:${celula.servicoId}:${celula.habilitado}:${celula.inicioVigencia}:${celula.percentualAvulsoBp}:${celula.percentualAssinanteBp}`}
              celula={celula}
              aoAtualizar={carregar}
            />
          ))}
        </section>
      )}
    </div>
  )
}

function LinhaMatriz({
  celula,
  aoAtualizar,
}: {
  celula: Celula
  aoAtualizar: () => Promise<void>
}) {
  const [avulso, setAvulso] = useState(
    celula.percentualAvulsoBp === null
      ? ''
      : formatPercentualBasisPoints(celula.percentualAvulsoBp),
  )
  const [assinante, setAssinante] = useState(
    celula.percentualAssinanteBp === null
      ? ''
      : formatPercentualBasisPoints(celula.percentualAssinanteBp),
  )
  // Se os percentuais gravados já diferem, o ajuste do avulso não pode apagar o do assinante (D0023).
  const [assinanteEditado, setAssinanteEditado] = useState(
    !assinanteAcompanhaAvulso(celula.percentualAvulsoBp, celula.percentualAssinanteBp),
  )
  const [inicio, setInicio] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const toast = useToast()
  const habilitacao = useMutation<
    AlterarHabilitacaoInput,
    Dados<ReturnType<typeof changeEnablement>>
  >({
    action: (input, meta) => changeEnablement({ ...input, idempotencyKey: meta.idempotencyKey }),
  })
  const comissao = useMutation<AgendarComissaoInput, Dados<ReturnType<typeof scheduleCommission>>>({
    action: (input, meta) => scheduleCommission({ ...input, idempotencyKey: meta.idempotencyKey }),
  })

  async function alternarHabilitacao(checked: boolean) {
    const resultado = await habilitacao.submit({
      barbeiroId: celula.barbeiroId,
      servicoId: celula.servicoId,
      habilitado: checked,
    })
    if (resultado.phase === 'done') {
      toast.show({
        tone: 'sucesso',
        title: checked ? 'Serviço habilitado' : 'Habilitação removida',
      })
      await aoAtualizar()
    }
  }

  async function salvarComissao(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErro(null)
    const percentualAvulsoBp = parsePercentual(avulso)
    const percentualAssinanteBp = parsePercentual(assinante)
    if (percentualAvulsoBp === null || percentualAssinanteBp === null) {
      setErro('Informe percentuais de 0% a 100%, com até duas casas decimais.')
      return
    }
    if (!inicio) {
      setErro('Informe a data local de início da vigência.')
      return
    }
    const status = await comissao.submit({
      barbeiroId: celula.barbeiroId,
      servicoId: celula.servicoId,
      percentualAvulsoBp,
      percentualAssinanteBp,
      inicio,
    })
    if (status.phase === 'done') {
      toast.show({ tone: 'sucesso', title: 'Vigência agendada' })
      setInicio('')
      await aoAtualizar()
    }
  }

  return (
    <Card className="gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-borda pb-3">
        <div>
          <h2 className="text-lg font-bold text-texto">{celula.barbeiroNome}</h2>
          <p className="mt-1 text-sm text-suave">
            {celula.servicoNome}
            {celula.servicoTipo === 'combo' ? ' · combo' : ''}
          </p>
        </div>
        {celula.inicioVigencia ? (
          <Badge tone="neutro">Vigente desde {celula.inicioVigencia}</Badge>
        ) : (
          <Badge tone="alerta">Sem percentual cadastrado</Badge>
        )}
      </div>

      <Checkbox
        label={`Habilitado para ${celula.servicoNome}`}
        checked={celula.habilitado}
        onChange={(event) => void alternarHabilitacao(event.currentTarget.checked)}
        disabled={habilitacao.isSending}
      />
      <MutationStatus mutation={habilitacao} />

      <form
        onSubmit={salvarComissao}
        className="grid gap-3 border-t border-borda pt-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_auto] xl:items-end"
      >
        <Input
          label="Percentual avulso"
          value={avulso}
          onChange={(event) => {
            const valor = event.currentTarget.value
            setAvulso(valor)
            if (!assinanteEditado) setAssinante(valor)
          }}
          inputMode="decimal"
          required
          hint={
            celula.percentualAvulsoBp === null
              ? 'Sem valor inicial definido.'
              : `Atual: ${formatPercentualBasisPoints(celula.percentualAvulsoBp)}`
          }
        />
        <Input
          label="Percentual assinante"
          value={assinante}
          onChange={(event) => {
            setAssinanteEditado(true)
            setAssinante(event.currentTarget.value)
          }}
          inputMode="decimal"
          required
          hint="Começa igual ao percentual avulso; você pode ajustar antes de salvar."
        />
        <Input
          label="Início da vigência"
          type="date"
          value={inicio}
          onChange={(event) => setInicio(event.currentTarget.value)}
          required
        />
        <Button type="submit" variant="secundario" sending={comissao.isSending}>
          Agendar
        </Button>
        {erro ? (
          <p role="alert" className="text-sm text-perigo sm:col-span-2 xl:col-span-4">
            {erro}
          </p>
        ) : null}
        <div className="sm:col-span-2 xl:col-span-4">
          <MutationStatus mutation={comissao} />
        </div>
      </form>
    </Card>
  )
}
