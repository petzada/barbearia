import { defineErrors } from '~/platform/errors'

// Mensagens do login nunca revelam se um número tem conta (RN01): erros de OTP valem igual para qualquer telefone.
export const IdentityErrors = defineErrors('IDENTITY', {
  PHONE_INVALID: {
    httpStatus: 422,
    message: 'Informe um WhatsApp brasileiro com DDD, por exemplo (11) 98765-4321.',
  },
  OTP_DELIVERY_FAILED: {
    httpStatus: 503,
    message: 'Não conseguimos enviar o código agora. Tente novamente em instantes.',
    retryable: true,
  },
  OTP_INVALID: {
    httpStatus: 422,
    message: 'Código inválido ou expirado. Confira o código ou peça um novo.',
  },
  OTP_ATTEMPTS_EXCEEDED: {
    httpStatus: 422,
    message: 'Você errou o código muitas vezes. Peça um novo código.',
  },
  CONTINUATION_INVALID: {
    httpStatus: 422,
    message: 'Sua confirmação expirou. Peça um novo código para continuar.',
  },
  PHONE_IN_USE: {
    httpStatus: 409,
    message:
      'Este número já está em uso em outra conta. Procure a barbearia para conferirmos juntos.',
  },
  PHONE_UNCHANGED: { httpStatus: 422, message: 'Este já é o seu número de WhatsApp.' },
  LAST_ADMIN: { httpStatus: 409, message: 'Não é possível remover o último administrador.' },
  USER_NOT_ELIGIBLE: {
    httpStatus: 422,
    message: 'Esta pessoa ainda não tem uma conta ativa para receber esse papel.',
  },
  TERMS_REQUIRED: {
    httpStatus: 422,
    message: 'Aceite os Termos de Uso e a Política de Privacidade para continuar.',
  },
  TERMS_OUTDATED: {
    httpStatus: 409,
    message: 'Os documentos foram atualizados. Leia e aceite as versões atuais.',
  },
  TERMS_UNAVAILABLE: {
    httpStatus: 503,
    message: 'Os documentos legais ainda não estão disponíveis. Tente novamente mais tarde.',
  },
  SESSION_REQUIRED_FOR_PURPOSE: {
    httpStatus: 401,
    message: 'É preciso estar logado para esta ação.',
  },
})
