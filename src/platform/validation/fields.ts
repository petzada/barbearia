import type { z } from 'zod'
import type { FieldError } from '~/contracts/result'
import { ValidationErrors } from '../errors/generic'
import type { AppError } from '../errors/app-error'
import { configurarMensagensDeValidacao } from './messages'

/** `ZodError` → campos com caminho pontuado (`itens.0.servicoId`). Sem eco do valor recebido. */
export function zodIssuesToFields(error: z.ZodError): FieldError[] {
  configurarMensagensDeValidacao()
  return error.issues.map((issue) => ({
    path: issue.path.map(String).join('.'),
    message: issue.message,
  }))
}

export function validationErrorFrom(error: z.ZodError): AppError {
  return ValidationErrors.FAILED({ fields: zodIssuesToFields(error) })
}
