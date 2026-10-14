import { describe, expect, it } from 'vitest'
import type { Role } from '~/contracts'
import { placeholderOf, type PlaceholderArea } from '~/ui/layouts/placeholders'
import { decideAccess, homeOf, loginHref, safeDestination } from '~/ui/navigation/access'
import { MENU_ADMIN, TABS_CLIENTE, TABS_PUBLICO, isStaff, staffTabs } from '~/ui/navigation/tabs'

const rotulos = (itens: readonly { label: string }[]) => itens.map((i) => i.label)

describe('abas por papel (PRD §4.2, D0047)', () => {
  it('visitante: Planos · Serviços · Barbeiros · Entrar', () => {
    expect(rotulos(TABS_PUBLICO)).toEqual(['Planos', 'Serviços', 'Barbeiros', 'Entrar'])
  })

  it('cliente: Início · Agendar · Plano · Perfil', () => {
    expect(rotulos(TABS_CLIENTE)).toEqual(['Início', 'Agendar', 'Plano', 'Perfil'])
  })

  it('barbeiro: Agenda · Atendimentos · Ganhos · Perfil', () => {
    expect(rotulos(staffTabs(['barbeiro']))).toEqual(['Agenda', 'Atendimentos', 'Ganhos', 'Perfil'])
  })

  it('admin que também é barbeiro: abas de barbeiro + Gestão', () => {
    expect(rotulos(staffTabs(['barbeiro', 'admin']))).toEqual([
      'Agenda',
      'Atendimentos',
      'Ganhos',
      'Gestão',
      'Perfil',
    ])
  })

  it('admin que não é barbeiro: Agenda · Atendimentos · Gestão · Perfil (sem Ganhos)', () => {
    expect(rotulos(staffTabs(['admin']))).toEqual(['Agenda', 'Atendimentos', 'Gestão', 'Perfil'])
  })

  it('o papel cliente não acrescenta nem tira abas de equipe', () => {
    expect(staffTabs(['cliente'])).toEqual([])
    expect(rotulos(staffTabs(['cliente', 'barbeiro']))).toEqual(rotulos(staffTabs(['barbeiro'])))
  })

  it('backoffice tem as treze áreas do PRD §4.3 e começa pelo Painel', () => {
    expect(rotulos(MENU_ADMIN)).toEqual([
      'Painel',
      'Clientes',
      'Agenda',
      'Equipe',
      'Serviços',
      'Planos',
      'Jornadas',
      'Financeiro',
      'Comissões',
      'Correções',
      'Configurações',
      'Suporte',
      'Privacidade',
    ])
  })

  it('todo destino da navegação (que não é a raiz da área) tem tela ou esqueleto', () => {
    const faltando: string[] = []
    const conferir = (area: PlaceholderArea, itens: readonly { to: string; exact?: boolean }[]) => {
      for (const item of itens) {
        if (item.exact) continue
        const slug = item.to.split('/').filter(Boolean).at(-1) ?? ''
        if (!placeholderOf(area, slug)) faltando.push(`${area}:${slug}`)
      }
    }
    conferir('publico', TABS_PUBLICO)
    conferir('app', TABS_CLIENTE)
    conferir('equipe', staffTabs(['admin', 'barbeiro']))
    conferir('admin', MENU_ADMIN)
    expect(faltando).toEqual([])
  })

  it('slug desconhecido ou herdado de Object não vira esqueleto', () => {
    expect(placeholderOf('admin', 'inexistente')).toBeNull()
    expect(placeholderOf('admin', 'constructor')).toBeNull()
    expect(placeholderOf('app', '__proto__')).toBeNull()
  })
})

describe('guarda de rota só de UX (PRD §4.2)', () => {
  const sessao = (...roles: Role[]) => ({ roles })

  it('sem sessão vai ao login em qualquer área', () => {
    for (const area of ['app', 'equipe', 'admin'] as const) {
      expect(decideAccess(area, null)).toEqual({ kind: 'login' })
    }
  })

  it('cliente: libera /app; em /equipe volta ao app; em /admin é negado', () => {
    expect(decideAccess('app', sessao('cliente'))).toEqual({ kind: 'allow' })
    expect(decideAccess('equipe', sessao('cliente'))).toEqual({ kind: 'redirect', to: '/app' })
    expect(decideAccess('admin', sessao('cliente'))).toEqual({ kind: 'denied' })
  })

  it('barbeiro: libera /equipe; /app leva à equipe; /admin é negado', () => {
    expect(decideAccess('equipe', sessao('barbeiro'))).toEqual({ kind: 'allow' })
    expect(decideAccess('app', sessao('barbeiro'))).toEqual({ kind: 'redirect', to: '/equipe' })
    expect(decideAccess('admin', sessao('barbeiro'))).toEqual({ kind: 'denied' })
  })

  it('admin: libera /equipe e /admin', () => {
    expect(decideAccess('equipe', sessao('admin'))).toEqual({ kind: 'allow' })
    expect(decideAccess('admin', sessao('admin'))).toEqual({ kind: 'allow' })
  })

  it('papéis combinados acessam os dois contextos', () => {
    const combinado = sessao('cliente', 'barbeiro')
    expect(decideAccess('app', combinado)).toEqual({ kind: 'allow' })
    expect(decideAccess('equipe', combinado)).toEqual({ kind: 'allow' })
  })

  it('sessão sem papel conhecido é negada', () => {
    expect(decideAccess('app', sessao())).toEqual({ kind: 'denied' })
    expect(decideAccess('equipe', sessao())).toEqual({ kind: 'denied' })
  })

  it('home: equipe primeiro, depois cliente, anônimo na raiz', () => {
    expect(homeOf(null)).toBe('/')
    expect(homeOf(sessao('cliente'))).toBe('/app')
    expect(homeOf(sessao('barbeiro'))).toBe('/equipe')
    expect(homeOf(sessao('cliente', 'admin'))).toBe('/equipe')
    expect(homeOf(sessao())).toBe('/')
    expect(isStaff(['cliente'])).toBe(false)
  })
})

describe('destino do login (deep links preservados, sem redirecionamento aberto)', () => {
  it('aceita só caminho interno', () => {
    expect(safeDestination('/app/plano')).toBe('/app/plano')
    expect(safeDestination('/app/reservas?aba=futuras')).toBe('/app/reservas?aba=futuras')
  })

  it.each([
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    'javascript:alert(1)',
    'app/plano',
    '',
    '/app\nSet-Cookie: x=1',
    '/app\\..\\x',
  ])('recusa %j', (raw) => {
    expect(safeDestination(raw)).toBeNull()
  })

  it('recusa valores que não são texto ou são enormes', () => {
    expect(safeDestination(undefined)).toBeNull()
    expect(safeDestination(['/app'])).toBeNull()
    expect(safeDestination(`/${'a'.repeat(3000)}`)).toBeNull()
  })

  it('loginHref codifica o destino e cai no login simples se for inseguro', () => {
    expect(loginHref('/app/plano?x=1')).toBe('/entrar?destino=%2Fapp%2Fplano%3Fx%3D1')
    expect(loginHref('//evil.example')).toBe('/entrar')
  })
})
