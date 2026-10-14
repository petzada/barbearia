import type { IconName } from '../components/Icon'

export interface BrandColors {
  fundo: string
  superficie: string
  elevada: string
  texto: string
  suave: string
  borda: string
  bordaForte: string
  primaria: string
  sobrePrimaria: string
  sucesso: string
  alerta: string
  perigo: string
  info: string
  foco: string
}

export interface WelcomeScreenConfig {
  readonly id: string
  readonly titulo: string
  readonly texto: string
  readonly icone: IconName
}

/**
 * Marca e conteúdo de apresentação (D0001). T05 só define a interface e os padrões neutros; T08 entrega
 * a configuração real da barbearia e a registra com `setBrand`. Nenhum componente usa cor ou texto de
 * marca fora destes campos.
 */
export interface BrandConfig {
  readonly nome: string
  readonly nomeCurto: string
  readonly descricao: string
  /** Fuso IANA da loja: base de `DateTimeText` (PRD §4.1). */
  readonly fuso: string
  /** Cor da barra do navegador e do splash do PWA. */
  readonly corTema: string
  readonly cores: BrandColors
  readonly tipografia: { readonly fontePrincipal: string }
  readonly raio: { sm: string; md: string; lg: string; xl: string }
  /** Caminhos dos ícones do PWA (servidos de `public/`). */
  readonly icones: {
    readonly icone192: string
    readonly icone512: string
    readonly mascaravel512: string
    readonly apple180: string
  }
  readonly boasVindas: {
    /** Sobe quando o conteúdo muda bastante: as boas-vindas reaparecem uma vez (D0048). */
    readonly versao: string
    readonly telas: readonly WelcomeScreenConfig[]
  }
}

export const defaultBrand: BrandConfig = {
  nome: 'Barbearia',
  nomeCurto: 'Barbearia',
  descricao: 'Agende seu horário, acompanhe seu plano e fale com a barbearia.',
  fuso: 'America/Sao_Paulo',
  corTema: '#0f0f10',
  cores: {
    fundo: '#0f0f10',
    superficie: '#1a1a1c',
    elevada: '#252528',
    texto: '#f5f5f4',
    suave: '#b9b9b4',
    borda: '#3d3d42',
    bordaForte: '#8d8d94',
    primaria: '#d6a84b',
    sobrePrimaria: '#14110a',
    sucesso: '#62d690',
    alerta: '#f2b84f',
    perigo: '#ff8f86',
    info: '#86bfff',
    foco: '#9bcbff',
  },
  tipografia: {
    fontePrincipal:
      "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  raio: { sm: '0.375rem', md: '0.75rem', lg: '1.25rem', xl: '1.75rem' },
  icones: {
    icone192: '/icons/icon-192.png',
    icone512: '/icons/icon-512.png',
    mascaravel512: '/icons/maskable-512.png',
    apple180: '/icons/apple-touch-icon.png',
  },
  boasVindas: {
    versao: '1',
    telas: [
      {
        id: 'marca',
        titulo: 'Bem-vindo',
        texto: 'Agende seu horário e acompanhe tudo pelo celular, sem ligação e sem fila.',
        icone: 'servicos',
      },
      {
        id: 'planos',
        titulo: 'Planos e benefícios',
        texto: 'Veja os planos, o que cada um cobre e escolha o que combina com o seu jeito.',
        icone: 'planos',
      },
      {
        id: 'entrar',
        titulo: 'Entre para começar',
        texto: 'Entre com o seu WhatsApp para agendar, assinar um plano e ver seus horários.',
        icone: 'entrar',
      },
    ],
  },
}

let marcaAtual: BrandConfig = defaultBrand

export function getBrand(): BrandConfig {
  return marcaAtual
}

/** T08 registra a marca real ao carregar a configuração; os testes usam para trocar a versão das boas-vindas. */
export function setBrand(brand: BrandConfig): void {
  marcaAtual = brand
}

export function resetBrand(): void {
  marcaAtual = defaultBrand
}

// Só aceita valores que sejam cor, medida ou lista de fontes: a configuração vira CSS dentro de <style>.
const VALOR_CSS_SEGURO = /^[#a-zA-Z0-9\s(),.%'"_/-]+$/

export class BrandConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BrandConfigError'
  }
}

function valorSeguro(chave: string, valor: string): string {
  if (!VALOR_CSS_SEGURO.test(valor) || valor.includes('/*')) {
    throw new BrandConfigError(`Valor de marca inválido para ${chave}.`)
  }
  return valor
}

/** Variáveis CSS (mesmos nomes do `@theme` de `src/styles.css`) geradas da configuração da marca. */
export function brandToCssVars(brand: BrandConfig): Record<string, string> {
  const c = brand.cores
  const mapa: Record<string, string> = {
    '--color-fundo': c.fundo,
    '--color-superficie': c.superficie,
    '--color-elevada': c.elevada,
    '--color-texto': c.texto,
    '--color-suave': c.suave,
    '--color-borda': c.borda,
    '--color-borda-forte': c.bordaForte,
    '--color-primaria': c.primaria,
    '--color-sobre-primaria': c.sobrePrimaria,
    '--color-sucesso': c.sucesso,
    '--color-alerta': c.alerta,
    '--color-perigo': c.perigo,
    '--color-info': c.info,
    '--color-foco': c.foco,
    '--font-sans': brand.tipografia.fontePrincipal,
    '--radius-sm': brand.raio.sm,
    '--radius-md': brand.raio.md,
    '--radius-lg': brand.raio.lg,
    '--radius-xl': brand.raio.xl,
  }
  return Object.fromEntries(Object.entries(mapa).map(([k, v]) => [k, valorSeguro(k, v)]))
}

export function brandToCss(brand: BrandConfig): string {
  const linhas = Object.entries(brandToCssVars(brand)).map(([k, v]) => `${k}:${v};`)
  return `:root{${linhas.join('')}}`
}
