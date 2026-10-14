import { useEffect, useState, type FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import type { Result } from '~/contracts'
import { parseBRL } from '~/platform/money'
import {
  Badge,
  Button,
  Card,
  Checkbox,
  ConfirmSheet,
  EmptyState,
  ErrorState,
  Input,
  LoadingSkeleton,
  MoneyText,
  MutationStatus,
  Select,
  useMutation,
  useToast,
} from '~/ui'
import {
  createCombo,
  createService,
  deactivateService,
  listAdminCatalog,
  updateService,
} from '../client'
import { brlInputFromCents } from './format'

type ResultadoLista = Awaited<ReturnType<typeof listAdminCatalog>>
type Dados<T> = T extends Promise<Result<infer D>> ? D : never
type CriarServicoInput = Omit<Parameters<typeof createService>[0], 'idempotencyKey'>
type CriarComboInput = Omit<Parameters<typeof createCombo>[0], 'idempotencyKey'>
type AtualizarInput = Omit<Parameters<typeof updateService>[0], 'idempotencyKey'>
type DesativarInput = Omit<Parameters<typeof deactivateService>[0], 'idempotencyKey'>
type ServicoAdmin = Dados<ReturnType<typeof listAdminCatalog>>['servicos'][number]

export function AdminServicos() {
  const [resultado, setResultado] = useState<ResultadoLista | null>(null)
  const [erroLocal, setErroLocal] = useState<string | null>(null)
  const [tipo, setTipo] = useState<'simples' | 'combo'>('simples')
  const [componentes, setComponentes] = useState<string[]>([])
  const toast = useToast()

  async function carregar() {
    setResultado(await listAdminCatalog({}))
  }

  useEffect(() => {
    let ativa = true
    void listAdminCatalog({}).then((resposta) => {
      if (ativa) setResultado(resposta)
    })
    return () => {
      ativa = false
    }
  }, [])

  const criarSimples = useMutation<CriarServicoInput, Dados<ReturnType<typeof createService>>>({
    action: (input, meta) => createService({ ...input, idempotencyKey: meta.idempotencyKey }),
  })
  const criarCombo = useMutation<CriarComboInput, Dados<ReturnType<typeof createCombo>>>({
    action: (input, meta) => createCombo({ ...input, idempotencyKey: meta.idempotencyKey }),
  })

  async function enviarNovo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    setErroLocal(null)
    const form = new FormData(formElement)
    let precoCentavos: number
    try {
      precoCentavos = parseBRL(String(form.get('preco') ?? '')).valueOf()
    } catch {
      setErroLocal('Informe o preço no formato 129,90.')
      return
    }
    const dados = {
      nome: String(form.get('nome') ?? '').trim(),
      descricao: String(form.get('descricao') ?? '').trim(),
      precoCentavos,
      duracaoMinutos: Number(form.get('duracao')),
    }
    if (tipo === 'combo') {
      if (componentes.length < 2) {
        setErroLocal('Selecione ao menos dois serviços simples para compor o combo.')
        return
      }
      const status = await criarCombo.submit({ ...dados, componenteIds: componentes })
      if (status.phase === 'done') {
        toast.show({ tone: 'sucesso', title: 'Combo cadastrado' })
        formElement.reset()
        setComponentes([])
        await carregar()
      }
      return
    }
    const status = await criarSimples.submit(dados)
    if (status.phase === 'done') {
      toast.show({ tone: 'sucesso', title: 'Serviço cadastrado' })
      formElement.reset()
      await carregar()
    }
  }

  if (!resultado) return <LoadingSkeleton lines={5} label="Carregando catálogo administrativo…" />
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

  const servicos = resultado.data.servicos
  const simplesAtivos = servicos.filter((servico) => servico.ativo && servico.tipo === 'simples')
  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-2 border-b border-borda pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold tracking-[0.16em] text-primaria uppercase">
            Gestão · Catálogo
          </p>
          <h1 className="mt-1 text-3xl font-bold text-texto">Serviços e combos</h1>
        </div>
        <Link
          to="/admin/equipe/matriz"
          className="min-h-11 self-start rounded-md border border-borda-forte px-4 py-2 font-semibold text-texto hover:bg-elevada sm:self-auto"
        >
          Abrir matriz da equipe
        </Link>
      </header>

      <Card id="adicionar-ao-catalogo" title="Adicionar ao catálogo" className="border-primaria/30">
        <form onSubmit={enviarNovo} className="grid gap-4 lg:grid-cols-2">
          <Select
            label="Tipo de cadastro"
            value={tipo}
            onChange={(event) => {
              setTipo(event.currentTarget.value as 'simples' | 'combo')
              setComponentes([])
            }}
            options={[
              { value: 'simples', label: 'Serviço simples' },
              { value: 'combo', label: 'Combo' },
            ]}
          />
          <Input
            label="Nome"
            name="nome"
            required
            maxLength={100}
            placeholder="Ex.: Corte clássico"
          />
          <Input
            label="Descrição"
            name="descricao"
            maxLength={1000}
            placeholder="Detalhes para quem está escolhendo"
          />
          <Input
            label="Preço"
            name="preco"
            required
            inputMode="decimal"
            placeholder="Ex.: 65,00"
            hint="Digite em reais; o sistema guarda centavos inteiros."
          />
          <Input
            label="Duração em minutos"
            name="duracao"
            type="number"
            min={1}
            step={1}
            required
            placeholder="Ex.: 30"
          />
          {tipo === 'combo' ? (
            <fieldset className="rounded-lg border border-borda p-3 lg:col-span-2">
              <legend className="px-1 text-sm font-semibold text-texto">
                Componentes do combo
              </legend>
              {simplesAtivos.length ? (
                <div className="grid gap-x-4 sm:grid-cols-2">
                  {simplesAtivos.map((servico) => (
                    <Checkbox
                      key={servico.id}
                      label={servico.nome}
                      checked={componentes.includes(servico.id)}
                      onChange={(event) => {
                        const selecionado = event.currentTarget.checked
                        setComponentes((atual) =>
                          selecionado
                            ? [...atual, servico.id]
                            : atual.filter((id) => id !== servico.id),
                        )
                      }}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-suave">
                  Cadastre dois serviços simples ativos antes de criar um combo.
                </p>
              )}
            </fieldset>
          ) : null}
          {erroLocal ? (
            <p role="alert" className="text-sm text-perigo lg:col-span-2">
              {erroLocal}
            </p>
          ) : null}
          <div className="flex flex-col gap-3 lg:col-span-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-sm text-suave">
              Preço e duração são próprios deste serviço ou combo e valem para novas reservas.
            </p>
            <Button type="submit" sending={criarSimples.isSending || criarCombo.isSending}>
              Salvar cadastro
            </Button>
          </div>
          <div className="lg:col-span-2">
            {tipo === 'combo' ? (
              <MutationStatus mutation={criarCombo} />
            ) : (
              <MutationStatus mutation={criarSimples} />
            )}
          </div>
        </form>
      </Card>

      {servicos.length === 0 ? (
        <Card>
          <EmptyState
            title="Nenhum serviço cadastrado"
            description="Cadastre os serviços da casa para que possam ser exibidos ao público."
            action={
              <a href="#adicionar-ao-catalogo" className="font-semibold text-primaria underline">
                Ir para o cadastro
              </a>
            }
            icon="servicos"
          />
        </Card>
      ) : (
        <section aria-label="Serviços cadastrados" className="flex flex-col gap-3">
          <h2 className="text-xl font-bold text-texto">
            Catálogo atual{' '}
            <span className="text-sm font-normal text-suave">({servicos.length})</span>
          </h2>
          {servicos.map((servico) => (
            <ServicoLinha
              key={`${servico.id}:${servico.revisao}`}
              servico={servico}
              aoAtualizar={carregar}
            />
          ))}
        </section>
      )}
    </div>
  )
}

function ServicoLinha({
  servico,
  aoAtualizar,
}: {
  servico: ServicoAdmin
  aoAtualizar: () => Promise<void>
}) {
  const [preco, setPreco] = useState(brlInputFromCents(servico.precoCentavos))
  const [duracao, setDuracao] = useState(String(servico.duracaoMinutos))
  const [confirmar, setConfirmar] = useState(false)
  const toast = useToast()
  const atualizar = useMutation<AtualizarInput, Dados<ReturnType<typeof updateService>>>({
    action: (input, meta) => updateService({ ...input, idempotencyKey: meta.idempotencyKey }),
  })
  const desativar = useMutation<DesativarInput, Dados<ReturnType<typeof deactivateService>>>({
    action: (input, meta) => deactivateService({ ...input, idempotencyKey: meta.idempotencyKey }),
  })

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    let precoCentavos: number
    try {
      precoCentavos = parseBRL(preco).valueOf()
    } catch {
      toast.show({ tone: 'perigo', title: 'Preço inválido', description: 'Use o formato 129,90.' })
      return
    }
    const resultado = await atualizar.submit({
      servicoId: servico.id,
      precoCentavos,
      duracaoMinutos: Number(duracao),
      expectedRevision: servico.revisao,
    })
    if (resultado.phase === 'done') {
      toast.show({
        tone: 'sucesso',
        title: 'Preço e duração atualizados',
        description: 'A alteração vale para novas reservas.',
      })
      await aoAtualizar()
    }
  }

  async function confirmarDesativacao() {
    const resultado = await desativar.submit({
      servicoId: servico.id,
      expectedRevision: servico.revisao,
    })
    if (resultado.phase === 'done') {
      setConfirmar(false)
      toast.show({
        tone: 'sucesso',
        title: 'Cadastro desativado',
        description: 'O histórico foi preservado.',
      })
      await aoAtualizar()
    }
  }

  return (
    <Card className={`flex flex-col gap-4 ${servico.ativo ? '' : 'opacity-75'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-texto">{servico.nome}</h3>
            <Badge tone={servico.ativo ? 'sucesso' : 'neutro'}>
              {servico.ativo ? 'Ativo' : 'Inativo'}
            </Badge>
            {servico.tipo === 'combo' ? <Badge tone="info">Combo</Badge> : null}
          </div>
          {servico.descricao ? (
            <p className="mt-1 text-sm text-suave">{servico.descricao}</p>
          ) : null}
          {servico.componentes.length ? (
            <p className="mt-2 text-sm text-suave">
              Inclui: {servico.componentes.map((item) => item.nome).join(' · ')}
            </p>
          ) : null}
        </div>
        {!servico.ativo ? (
          <p className="text-sm text-suave">
            <MoneyText cents={servico.precoCentavos} /> · {servico.duracaoMinutos} min
          </p>
        ) : null}
      </div>
      {servico.ativo ? (
        <>
          <form
            onSubmit={salvar}
            className="grid gap-3 border-t border-borda pt-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          >
            <Input
              label="Preço em reais"
              value={preco}
              onChange={(event) => setPreco(event.currentTarget.value)}
              inputMode="decimal"
              required
            />
            <Input
              label="Duração em minutos"
              type="number"
              min={1}
              step={1}
              value={duracao}
              onChange={(event) => setDuracao(event.currentTarget.value)}
              required
            />
            <Button type="submit" variant="secundario" sending={atualizar.isSending}>
              Salvar alteração
            </Button>
            <p className="text-sm text-suave sm:col-span-3">
              A mudança de preço e duração vale só para novas reservas.
            </p>
            <div className="sm:col-span-3">
              <MutationStatus mutation={atualizar} />
            </div>
          </form>
          <div className="flex justify-end">
            <Button variant="perigo" onClick={() => setConfirmar(true)}>
              Desativar
            </Button>
          </div>
          <MutationStatus mutation={desativar} />
          <ConfirmSheet
            open={confirmar}
            title={`Desativar ${servico.nome}?`}
            consequences={[
              'O serviço deixa de aparecer para novas reservas.',
              'Reservas e registros anteriores permanecem preservados.',
            ]}
            confirmLabel="Desativar serviço"
            tone="perigo"
            onConfirm={confirmarDesativacao}
            onCancel={() => setConfirmar(false)}
          />
        </>
      ) : null}
    </Card>
  )
}
