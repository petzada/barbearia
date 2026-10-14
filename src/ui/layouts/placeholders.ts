export interface PlaceholderInfo {
  readonly title: string
  /** Task que entrega a tela real (PRD §4.3); ao criar o arquivo de rota próprio, o esqueleto deixa de valer. */
  readonly owner: string
}

export type PlaceholderArea = 'publico' | 'app' | 'equipe' | 'admin'

/**
 * Destinos que a navegação já aponta mas cuja tela é de outra task. Uma rota genérica `$secao` por área
 * serve estes esqueletos; um arquivo de rota próprio (`app/agendar.tsx`) sempre ganha da genérica, então
 * as tasks donas não precisam apagar nada aqui. Slug desconhecido vira 404.
 */
export const PLACEHOLDERS: Record<PlaceholderArea, Record<string, PlaceholderInfo>> = {
  publico: {
    planos: { title: 'Planos e benefícios', owner: 'T07' },
    servicos: { title: 'Serviços', owner: 'T06' },
    barbeiros: { title: 'Barbeiros', owner: 'T06' },
    entrar: { title: 'Entrar', owner: 'T04' },
  },
  app: {
    agendar: { title: 'Agendar', owner: 'T17' },
    plano: { title: 'Plano', owner: 'T32' },
    perfil: { title: 'Perfil', owner: 'T32' },
    reservas: { title: 'Minhas reservas', owner: 'T32' },
    notificacoes: { title: 'Notificações', owner: 'T30' },
  },
  equipe: {
    atendimentos: { title: 'Atendimentos', owner: 'T25' },
    ganhos: { title: 'Ganhos', owner: 'T27' },
    gestao: { title: 'Gestão', owner: 'T34' },
    // Sem task dona no plano: B05 (instalação e push) vive aqui, mas o Perfil da equipe em si não tem dono.
    perfil: { title: 'Perfil', owner: 'T30 (instalação e push); demais itens sem task dona' },
    notificacoes: { title: 'Notificações', owner: 'T30' },
  },
  admin: {
    clientes: { title: 'Clientes', owner: 'T33' },
    agenda: { title: 'Agenda', owner: 'T14' },
    equipe: { title: 'Equipe', owner: 'T04 e T06' },
    servicos: { title: 'Serviços', owner: 'T06' },
    planos: { title: 'Planos', owner: 'T07' },
    jornadas: { title: 'Jornadas', owner: 'T14' },
    financeiro: { title: 'Financeiro', owner: 'T34' },
    comissoes: { title: 'Comissões', owner: 'T29' },
    correcoes: { title: 'Correções', owner: 'T28' },
    configuracoes: { title: 'Configurações', owner: 'T08' },
    suporte: { title: 'Suporte', owner: 'T33 e T36' },
    privacidade: { title: 'Privacidade', owner: 'T35' },
  },
}

export function placeholderOf(area: PlaceholderArea, slug: string): PlaceholderInfo | null {
  return Object.hasOwn(PLACEHOLDERS[area], slug) ? (PLACEHOLDERS[area][slug] ?? null) : null
}
