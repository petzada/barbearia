export interface UploadUrlRequest {
  /** Chave gerada pelo servidor: `<barbearia>/<propósito>/<dono>/<uuid>`. Nunca vem do cliente. */
  readonly key: string
  readonly contentType: string
  readonly maxBytes: number
  readonly expiresInSeconds: number
}

export interface SignedUrl {
  readonly url: string
  readonly expiresAt: Date
}

export interface StoredObjectInfo {
  readonly sizeBytes: number
  readonly contentType: string
}

/** Bucket privado; leitura e escrita por URL pré-assinada curta (PRD §7.8). Implementação R2 em T08. */
export interface StorageProvider {
  createUploadUrl(request: UploadUrlRequest): Promise<SignedUrl>
  createReadUrl(input: { key: string; expiresInSeconds: number }): Promise<SignedUrl>
  /** Confirma que o upload aconteceu antes de usar o arquivo; `null` se não existe. */
  head(key: string): Promise<StoredObjectInfo | null>
  remove(key: string): Promise<void>
}
