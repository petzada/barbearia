import { defineErrors } from '~/platform/errors'

export const CatalogErrors = defineErrors('CATALOG', {
  SERVICE_NOT_FOUND: { httpStatus: 404, message: 'Este serviço não foi encontrado.' },
  BARBER_NOT_FOUND: { httpStatus: 404, message: 'Este barbeiro não foi encontrado.' },
  INVALID_SERVICE: { httpStatus: 422, message: 'Confira o nome, o preço e a duração do serviço.' },
  INVALID_COMBO: {
    httpStatus: 422,
    message: 'Um combo precisa de ao menos dois serviços simples ativos.',
  },
  DUPLICATE_COMBO: { httpStatus: 409, message: 'Já existe um combo ativo com esses componentes.' },
  SERVICE_IN_USE: {
    httpStatus: 409,
    message: 'Desative os combos que usam este serviço antes de desativá-lo.',
  },
  INVALID_COMMISSION: {
    httpStatus: 422,
    message: 'Os percentuais devem estar entre 0% e 100%.',
  },
  INVALID_EFFECTIVE_DATE: {
    httpStatus: 409,
    message: 'A nova vigência deve começar depois da vigência já cadastrada.',
  },
})
