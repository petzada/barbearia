import { defineErrors } from './define-errors'

// Códigos genéricos da plataforma (PRD §7.3). Os de cada módulo ficam em `modules/<m>/errors.ts`.

export const AuthErrors = defineErrors('AUTH', {
  REQUIRED: { httpStatus: 401, message: 'É preciso entrar para continuar.' },
  FORBIDDEN: { httpStatus: 403, message: 'Você não tem permissão para esta ação.' },
  // D0071: ação sensível exige login recente; a tela leva à reautenticação e volta para a ação.
  RECENT_REQUIRED: {
    httpStatus: 401,
    message: 'Confirme sua identidade novamente para continuar.',
  },
})

export const ValidationErrors = defineErrors('VALIDATION', {
  FAILED: { httpStatus: 422, message: 'Confira os campos informados.' },
})

export const ConcurrencyErrors = defineErrors('CONCURRENCY', {
  REVISION_CONFLICT: {
    httpStatus: 409,
    message: 'Esses dados foram alterados por outra pessoa. Atualize a tela e tente de novo.',
  },
})

export const IdempotencyErrors = defineErrors('IDEMPOTENCY', {
  KEY_REUSED: {
    httpStatus: 422,
    message: 'Esta chave de operação já foi usada com outros dados.',
  },
})

export const RateErrors = defineErrors('RATE', {
  LIMITED: {
    httpStatus: 429,
    message: 'Muitas tentativas. Aguarde um pouco e tente de novo.',
    retryable: true,
  },
})

export const DependencyErrors = defineErrors('DEPENDENCY', {
  UNAVAILABLE: {
    httpStatus: 503,
    message: 'Um serviço de que dependemos está indisponível. Tente novamente em instantes.',
    retryable: true,
  },
})

export const SystemErrors = defineErrors('SYSTEM', {
  // D0078: após restore, o operador mantém o sistema em modo recuperação até conciliar (T03).
  RECOVERY_MODE: {
    httpStatus: 503,
    message: 'O sistema está em manutenção para recuperação. Tente novamente mais tarde.',
  },
  INTERNAL: { httpStatus: 500, message: 'Algo deu errado. Tente novamente em instantes.' },
  OPERATION_NOT_FOUND: { httpStatus: 404, message: 'Operação não encontrada.' },
})
