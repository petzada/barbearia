import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { ErrorResult, Result } from '~/contracts'
import { useBrand } from '../brand/BrandProvider'
import { Badge, type Tone } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Checkbox } from '../components/Checkbox'
import { ConfirmSheet } from '../components/ConfirmSheet'
import { DateStrip } from '../components/DateStrip'
import { DateTimeText, MoneyText } from '../components/format'
import { Icon, ICON_NAMES } from '../components/Icon'
import { Input } from '../components/Input'
import { OtpInput } from '../components/OtpInput'
import { PhoneInput } from '../components/PhoneInput'
import { Select } from '../components/Select'
import {
  AccessDenied,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PendingExternal,
} from '../components/states'
import { Filters, Table } from '../components/Table'
import { TimeSlotGrid } from '../components/TimeSlotGrid'
import { useToast } from '../components/Toast'
import { NotificationButton } from '../layouts/navigation-parts'
import { MutationStatus } from '../mutation/MutationStatus'
import { useMutation } from '../mutation/useMutation'
import { WelcomeCarousel } from '../welcome/WelcomeCarousel'

/**
 * Catálogo de desenvolvimento (`/_dev/ui`): todos os componentes e seus estados em uma página. Os dados
 * abaixo são de exemplo; nenhum valor é regra de negócio.
 */
export function Catalog() {
  const ref = useRef<HTMLElement>(null)
  // O catálogo carrega por `lazy`: só depois deste efeito os handlers existem (os E2E esperam por ele).
  useEffect(() => {
    if (ref.current) ref.current.dataset['pronto'] = 'true'
  }, [])
  return (
    <main
      ref={ref}
      id="conteudo"
      tabIndex={-1}
      className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-6 outline-none"
    >
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-texto">Catálogo de interface</h1>
        <p className="text-suave">
          Componentes e estados do design system (T05). Só existe em desenvolvimento.
        </p>
      </header>
      <SecaoTokens />
      <SecaoBotoes />
      <SecaoCampos />
      <SecaoDataHora />
      <SecaoCartoesEBadges />
      <SecaoEstadosDeConsulta />
      <SecaoMutacao />
      <SecaoFormatacao />
      <SecaoFeedback />
      <SecaoBackoffice />
      <SecaoNavegacao />
    </main>
  )
}

function Secao({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`sec-${id}`} data-secao={id} className="flex flex-col gap-4">
      <h2 id={`sec-${id}`} className="border-b border-borda pb-2 text-2xl font-bold text-texto">
        {titulo}
      </h2>
      {children}
    </section>
  )
}

function Sub({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-base font-semibold text-suave">{titulo}</h3>
      {children}
    </div>
  )
}

// ——— Tokens ———

const CORES = [
  ['fundo', 'bg-fundo'],
  ['superficie', 'bg-superficie'],
  ['elevada', 'bg-elevada'],
  ['primaria', 'bg-primaria'],
  ['sucesso', 'bg-sucesso'],
  ['alerta', 'bg-alerta'],
  ['perigo', 'bg-perigo'],
  ['info', 'bg-info'],
] as const

function SecaoTokens() {
  const marca = useBrand()
  return (
    <Secao id="tokens" titulo="Tokens">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CORES.map(([nome, classe]) => (
          <li key={nome} className="flex flex-col gap-1.5 text-sm text-texto">
            <span className={`h-14 rounded-md border border-borda-forte ${classe}`} />
            {nome}
          </li>
        ))}
      </ul>
      <Sub titulo="Tipografia e raios">
        <p className="text-3xl font-bold text-texto">Título 3xl</p>
        <p className="text-xl font-semibold text-texto">Subtítulo xl</p>
        <p className="text-base text-texto">Texto base de 16 px.</p>
        <p className="text-sm text-suave">Texto de apoio sm.</p>
        <ul className="flex gap-3">
          {(['sm', 'md', 'lg', 'xl'] as const).map((r) => (
            <li key={r} className="flex flex-col items-center gap-1 text-sm text-texto">
              <span
                className="size-14 border border-borda-forte bg-elevada"
                style={{ borderRadius: marca.raio[r] }}
              />
              {r}
            </li>
          ))}
        </ul>
      </Sub>
      <Sub titulo="Ícones">
        <ul className="flex flex-wrap gap-3 text-texto">
          {ICON_NAMES.map((n) => (
            <li key={n} className="flex w-16 flex-col items-center gap-1 text-xs text-suave">
              <Icon name={n} size={24} />
              {n}
            </li>
          ))}
        </ul>
      </Sub>
    </Secao>
  )
}

// ——— Botões ———

function SecaoBotoes() {
  const [processados, setProcessados] = useState(0)
  return (
    <Secao id="botoes" titulo="Botões">
      <div className="flex flex-wrap gap-3">
        <Button>Primário</Button>
        <Button variant="secundario">Secundário</Button>
        <Button variant="perigo">Perigo</Button>
        <Button variant="fantasma">Fantasma</Button>
        <Button disabled>Desabilitado</Button>
        <Button sending>Confirmar</Button>
      </div>
      <Sub titulo="Bloqueio de duplo clique">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={async () => {
              await new Promise((r) => setTimeout(r, 600))
              setProcessados((n) => n + 1)
            }}
          >
            Enviar lento
          </Button>
          <p role="status" className="text-texto">
            Cliques processados: <strong data-testid="cliques-processados">{processados}</strong>
          </p>
        </div>
      </Sub>
    </Secao>
  )
}

// ——— Campos ———

function SecaoCampos() {
  const [telefone, setTelefone] = useState('')
  const [codigo, setCodigo] = useState('')
  const [aceite, setAceite] = useState(false)
  return (
    <Secao id="campos" titulo="Campos">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Nome"
          name="nome"
          placeholder="Como você prefere ser chamado"
          hint="Aparece para a equipe."
        />
        <Input
          label="E-mail"
          name="email"
          type="email"
          error="Informe um e-mail válido."
          defaultValue="ana@"
        />
        <PhoneInput
          label="WhatsApp"
          value={telefone}
          onChange={setTelefone}
          hint="Enviaremos um código."
        />
        <OtpInput label="Código de 6 dígitos" value={codigo} onChange={setCodigo} />
        <Select
          label="Serviço"
          placeholder="Escolha um serviço"
          options={[
            { value: 'corte', label: 'Corte' },
            { value: 'barba', label: 'Barba' },
            { value: 'combo', label: 'Corte + barba' },
            { value: 'indisponivel', label: 'Pigmentação (indisponível)', disabled: true },
          ]}
        />
        <Input label="Desabilitado" name="bloqueado" disabled defaultValue="Somente leitura" />
      </div>
      <p className="text-sm text-suave">
        Dígitos do telefone: <span data-testid="telefone-digitos">{telefone || '—'}</span>
      </p>
      <Checkbox
        label="Li e aceito os Termos e a Política de Privacidade"
        checked={aceite}
        onChange={(e) => setAceite(e.target.checked)}
      />
      <Checkbox label="Aceite com erro" error="É preciso aceitar para continuar." />
    </Secao>
  )
}

// ——— Data e hora ———

const DIAS = [
  { date: '2026-10-19' },
  { date: '2026-10-20' },
  { date: '2026-10-21', disabled: true },
  { date: '2026-10-22' },
  { date: '2026-10-23' },
  { date: '2026-10-24' },
  { date: '2026-10-25', disabled: true },
  { date: '2026-10-26' },
]

const HORARIOS = [
  { id: 'h1', startsAt: '2026-10-19T12:00:00Z', available: true },
  { id: 'h2', startsAt: '2026-10-19T12:30:00Z', available: false },
  { id: 'h3', startsAt: '2026-10-19T13:00:00Z', available: true },
  { id: 'h4', startsAt: '2026-10-19T13:30:00Z', available: true },
  { id: 'h5', startsAt: '2026-10-19T14:00:00Z', available: false },
  { id: 'h6', startsAt: '2026-10-19T14:30:00Z', available: true },
]

function SecaoDataHora() {
  const [dia, setDia] = useState<string | null>('2026-10-19')
  const [horario, setHorario] = useState<string | null>(null)
  return (
    <Secao id="data-hora" titulo="Dia e horário">
      <DateStrip label="Escolha o dia" days={DIAS} selected={dia} onSelect={setDia} />
      <TimeSlotGrid
        label="Escolha o horário"
        slots={HORARIOS}
        selectedId={horario}
        onSelect={setHorario}
      />
      <p role="status" className="text-texto">
        Selecionado: dia <strong data-testid="dia-escolhido">{dia ?? '—'}</strong>, horário{' '}
        <strong data-testid="horario-escolhido">{horario ?? '—'}</strong>
      </p>
    </Secao>
  )
}

// ——— Cartões e badges ———

const TONS: readonly [Tone, string][] = [
  ['neutro', 'Rascunho'],
  ['sucesso', 'Confirmada'],
  ['alerta', 'Pagamento pendente'],
  ['perigo', 'Cancelada'],
  ['info', 'Em análise'],
]

function SecaoCartoesEBadges() {
  return (
    <Secao id="cartoes" titulo="Cartões e badges de estado">
      <div className="flex flex-wrap gap-2">
        {TONS.map(([tom, texto]) => (
          <Badge key={tom} tone={tom}>
            {texto}
          </Badge>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="Cartão com título" aside={<Badge tone="sucesso">Ativo</Badge>}>
          <p className="text-suave">Conteúdo do cartão com texto de apoio.</p>
        </Card>
        <Card>
          <p className="text-suave">Cartão sem título.</p>
        </Card>
      </div>
    </Secao>
  )
}

// ——— Estados de consulta ———

function SecaoEstadosDeConsulta() {
  const [tentativas, setTentativas] = useState(0)
  return (
    <Secao id="estados-consulta" titulo="Estados de consulta">
      <Sub titulo="Carregando">
        <LoadingSkeleton lines={3} />
        <LoadingSkeleton lines={2} variant="cartoes" label="Carregando cartões…" />
      </Sub>
      <Sub titulo="Vazio (com próxima ação)">
        <Card>
          <EmptyState
            title="Nenhuma reserva ainda"
            description="Quando você agendar, os horários aparecem aqui."
            action={<Button>Agendar agora</Button>}
            icon="agendar"
          />
        </Card>
      </Sub>
      <Sub titulo="Erro recuperável">
        <Card>
          <ErrorState
            message="Não conseguimos carregar suas reservas agora."
            correlationId="a1b2c3d4"
            onRetry={async () => {
              await new Promise((r) => setTimeout(r, 300))
              setTentativas((n) => n + 1)
            }}
          />
          <p role="status" className="text-center text-sm text-suave">
            Tentativas: <span data-testid="tentativas">{tentativas}</span>
          </p>
        </Card>
      </Sub>
      <Sub titulo="Acesso negado">
        <Card>
          <AccessDenied action={<Button variant="secundario">Voltar ao início</Button>} />
        </Card>
      </Sub>
    </Secao>
  )
}

// ——— Mutação ———

type Cenario = 'ok' | 'pendente' | 'conflito' | 'validacao' | 'rede' | 'servidor'

function erro(
  code: ErrorResult['code'],
  message: string,
  httpStatus: number,
  extra: Partial<ErrorResult> = {},
): ErrorResult {
  return {
    status: 'error',
    code,
    message,
    fields: [],
    retryable: false,
    correlationId: 'demo-1234',
    httpStatus,
    ...extra,
  }
}

function SecaoMutacao() {
  const [cenario, setCenario] = useState<Cenario>('ok')
  const [nome, setNome] = useState('Ana')
  const [chaves, setChaves] = useState<readonly string[]>([])

  const mutacao = useMutation<{ nome: string }, { protocolo: string }>({
    action: async (_entrada, { idempotencyKey }): Promise<Result<{ protocolo: string }>> => {
      setChaves((atuais) => [...atuais, idempotencyKey])
      await new Promise((r) => setTimeout(r, 400))
      switch (cenario) {
        case 'ok':
          return { status: 'ok', data: { protocolo: 'OK-001' }, revision: 2 }
        case 'pendente':
          return {
            status: 'pending',
            operationId: 'op-1',
            protocol: 'PROT-2026-0001',
            nextUpdateAt: '2026-10-19T15:30:00Z',
          }
        case 'conflito':
          return erro('SCHEDULING.SLOT_UNAVAILABLE', 'Este horário não está mais disponível.', 409)
        case 'validacao':
          return erro('VALIDATION.FAILED', 'Confira os campos informados.', 422, {
            fields: [{ path: 'nome', message: 'O nome precisa ter ao menos 3 letras.' }],
          })
        case 'rede':
          throw new Error('rede')
        case 'servidor':
          return erro('SYSTEM.INTERNAL', 'Algo deu errado. Tente novamente em instantes.', 500, {
            retryable: true,
          })
      }
    },
  })

  return (
    <Secao id="mutacao" titulo="Estados de mutação">
      <form
        className="flex max-w-md flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          void mutacao.submit({ nome })
        }}
      >
        <Select
          label="Resultado simulado"
          name="cenario"
          value={cenario}
          onChange={(e) => setCenario(e.target.value as Cenario)}
          options={[
            { value: 'ok', label: 'Confirmado' },
            { value: 'pendente', label: 'Pendente externa' },
            { value: 'conflito', label: 'Conflito' },
            { value: 'validacao', label: 'Erro de validação' },
            { value: 'rede', label: 'Falha de rede' },
            { value: 'servidor', label: 'Erro do servidor' },
          ]}
        />
        <Input
          label="Nome"
          name="nome-mutacao"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          error={mutacao.fieldErrors['nome']}
        />
        <Button type="submit" sending={mutacao.isSending} sendingLabel="Salvando…">
          Salvar
        </Button>
      </form>
      <p className="text-sm text-suave">
        Chamadas ao servidor: <strong data-testid="mut-chamadas">{chaves.length}</strong> · chaves
        distintas: <strong data-testid="mut-chaves">{new Set(chaves).size}</strong>
      </p>
      <MutationStatus
        mutation={mutacao}
        pendingNextSteps={[
          'Estamos aguardando a confirmação do banco.',
          'Você recebe um aviso no WhatsApp quando terminar.',
        ]}
        conflictAlternatives={[
          { id: 'a', label: 'Hoje às 15:30', onChoose: () => setNome('Ana (15:30)') },
          { id: 'b', label: 'Amanhã às 10:00', onChoose: () => setNome('Ana (10:00)') },
        ]}
        renderDone={(d) => <Badge tone="sucesso">Confirmado pelo servidor: {d.protocolo}</Badge>}
      />
    </Secao>
  )
}

// ——— Formatação ———

function SecaoFormatacao() {
  return (
    <Secao id="formatacao" titulo="Dinheiro e datas">
      <ul className="flex flex-col gap-1 text-texto">
        <li>
          Valor: <MoneyText cents={12990} />
        </li>
        <li>
          Valor grande: <MoneyText cents={129990} />
        </li>
        <li>
          Zero: <MoneyText cents={0} />
        </li>
        <li>
          Estorno: <MoneyText cents={-500} />
        </li>
        <li>
          Evento crítico (completo, fuso da loja):{' '}
          <DateTimeText value="2026-10-17T17:30:00Z" format="completo" />
        </li>
        <li>
          Com ano: <DateTimeText value="2026-12-31T02:30:00Z" format="completoComAno" />
        </li>
        <li>
          Só data: <DateTimeText value="2026-10-17T17:30:00Z" format="data" />
        </li>
        <li>
          Hora: <DateTimeText value="2026-10-17T17:30:00Z" format="hora" />
        </li>
        <li>
          Outro fuso (Manaus):{' '}
          <DateTimeText value="2026-10-17T17:30:00Z" format="hora" timeZone="America/Manaus" />
        </li>
      </ul>
      <PendingExternal
        protocol="PROT-2026-0042"
        nextSteps={['Aguardando a confirmação do pagamento.', 'Avisaremos por WhatsApp.']}
        nextUpdateAt="2026-10-18T12:00:00Z"
      />
    </Secao>
  )
}

// ——— Feedback ———

function SecaoFeedback() {
  const toast = useToast()
  const [aberta, setAberta] = useState(false)
  const [resultado, setResultado] = useState('Nada confirmado ainda')
  return (
    <Secao id="feedback" titulo="Toast e confirmação">
      <div className="flex flex-wrap gap-3">
        <Button
          variant="secundario"
          onClick={() => toast.show({ tone: 'sucesso', title: 'Reserva confirmada' })}
        >
          Toast de sucesso
        </Button>
        <Button
          variant="secundario"
          onClick={() =>
            toast.show({
              tone: 'perigo',
              title: 'Não foi possível salvar',
              description: 'Tente de novo.',
            })
          }
        >
          Toast de erro
        </Button>
        <Button onClick={() => setAberta(true)}>Cancelar reserva…</Button>
      </div>
      <p role="status" className="text-texto" data-testid="resultado-confirmacao">
        {resultado}
      </p>
      <ConfirmSheet
        open={aberta}
        title="Cancelar esta reserva?"
        tone="perigo"
        consequences={[
          'O horário volta a ficar disponível para outras pessoas.',
          'Você recebe o aviso do cancelamento no WhatsApp.',
        ]}
        confirmLabel="Cancelar reserva"
        cancelLabel="Manter reserva"
        onCancel={() => setAberta(false)}
        onConfirm={async () => {
          await new Promise((r) => setTimeout(r, 300))
          setAberta(false)
          setResultado('Cancelamento confirmado pelo servidor')
        }}
      />
    </Secao>
  )
}

// ——— Backoffice ———

interface Cliente {
  id: string
  nome: string
  plano: string
  saldoCents: number
}

const CLIENTES: Cliente[] = [
  { id: '1', nome: 'Ana Souza', plano: 'Plano completo', saldoCents: 0 },
  { id: '2', nome: 'Bruno Lima', plano: 'Plano corte', saldoCents: 4500 },
  { id: '3', nome: 'Carla Dias', plano: 'Sem plano', saldoCents: 12990 },
]

function SecaoBackoffice() {
  const [busca, setBusca] = useState('')
  const [aplicado, setAplicado] = useState('')
  const linhas = CLIENTES.filter((c) => c.nome.toLowerCase().includes(aplicado.toLowerCase()))
  return (
    <Secao id="backoffice" titulo="Tabela e filtros (desktop)">
      <Filters
        label="Filtrar clientes"
        onApply={() => setAplicado(busca)}
        onClear={() => {
          setBusca('')
          setAplicado('')
        }}
      >
        <Input
          label="Buscar por nome"
          name="busca"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </Filters>
      <Table
        caption="Clientes"
        columns={[
          { key: 'nome', header: 'Cliente', render: (c) => c.nome },
          { key: 'plano', header: 'Plano', render: (c) => c.plano },
          {
            key: 'saldo',
            header: 'Saldo',
            align: 'right',
            render: (c) => <MoneyText cents={c.saldoCents} />,
          },
        ]}
        rows={linhas}
        getRowId={(c) => c.id}
        empty={
          <EmptyState
            title="Nenhum cliente encontrado"
            description="Tente outra busca."
            action={
              <Button variant="secundario" onClick={() => setAplicado('')}>
                Limpar busca
              </Button>
            }
          />
        }
      />
      <Sub titulo="Tabela carregando">
        <Table
          caption="Pagamentos"
          columns={[]}
          rows={[]}
          getRowId={() => ''}
          loading
          empty={null}
        />
      </Sub>
    </Secao>
  )
}

// ——— Navegação ———

function SecaoNavegacao() {
  return (
    <Secao id="navegacao" titulo="Notificações e Como funciona">
      <div className="flex items-center gap-4 text-texto">
        <NotificationButton count={0} to="/app/notificacoes" />
        <NotificationButton count={3} to="/app/notificacoes" />
        <NotificationButton count={120} to="/app/notificacoes" />
      </div>
      <Card title="Como funciona (boas-vindas reutilizadas)">
        <div data-testid="como-funciona">
          <WelcomeCarousel mode="revisao" onExit={() => undefined} />
        </div>
      </Card>
    </Secao>
  )
}
