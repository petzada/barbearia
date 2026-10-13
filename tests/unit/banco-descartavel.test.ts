import { describe, expect, it } from 'vitest'
import {
  BancoNaoPermitidoError,
  bancoDescartavel,
  exigirBancoDescartavel,
  nomeDoBancoDaUrl,
} from '~/platform/db/safety'

// D0082: db:reset e testes de integração só podem tocar bancos *_dev e *_test.
describe('trava de banco descartável', () => {
  it('aceita bancos _dev e _test', () => {
    expect(bancoDescartavel('barbearia_dev')).toBe(true)
    expect(bancoDescartavel('barbearia_test')).toBe(true)
  })

  it('recusa o banco padrão do deploy e nomes parecidos', () => {
    expect(bancoDescartavel('railway')).toBe(false)
    expect(bancoDescartavel('barbearia')).toBe(false)
    expect(bancoDescartavel('barbearia_test_prod')).toBe(false)
    expect(bancoDescartavel('_test')).toBe(false)
  })

  it('extrai o nome do banco da URL sem depender de parâmetros', () => {
    expect(nomeDoBancoDaUrl('postgresql://u:p@host:5432/barbearia_dev?sslmode=no-verify')).toBe(
      'barbearia_dev',
    )
  })

  it('lança BancoNaoPermitidoError para URL de banco não descartável', () => {
    expect(() => exigirBancoDescartavel('postgresql://u:p@host:5432/railway')).toThrow(
      BancoNaoPermitidoError,
    )
  })

  it('retorna o nome quando o banco é descartável', () => {
    expect(exigirBancoDescartavel('postgresql://u:p@host:5432/barbearia_test')).toBe(
      'barbearia_test',
    )
  })

  it('rejeita URL sem nome de banco', () => {
    expect(() => nomeDoBancoDaUrl('postgresql://u:p@host:5432')).toThrow()
  })
})
