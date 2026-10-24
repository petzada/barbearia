/** Erro de regra de negócio com mensagem pronta para o usuário (pt-BR). */
export class DomainError extends Error {
  constructor(
    public readonly code:
      | "unauthorized"
      | "forbidden"
      | "not_found"
      | "invalid"
      | "conflict"
      | "provider",
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export type ActionResult<T = null> =
  | { ok: true; data: T; error: null }
  | { ok: false; data: null; error: string; code?: DomainError["code"] };

/** Converte exceções de domínio em resultado serializável para Server Actions. */
export async function toActionResult<T>(
  fn: () => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn(), error: null };
  } catch (error) {
    if (error instanceof DomainError) {
      return { ok: false, data: null, error: error.message, code: error.code };
    }
    console.error("[action] erro inesperado", error);
    return {
      ok: false,
      data: null,
      error: "Algo deu errado. Tente novamente em instantes.",
    };
  }
}
