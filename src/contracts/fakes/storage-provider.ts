import type {
  SignedUrl,
  StorageProvider,
  StoredObjectInfo,
  UploadUrlRequest,
} from '../ports/storage-provider'

/** Fake em memória. `simulateUpload` imita o PUT do navegador na URL pré-assinada. */
export class FakeStorageProvider implements StorageProvider {
  readonly objects = new Map<string, StoredObjectInfo>()

  constructor(private readonly clock: { now(): Date }) {}

  createUploadUrl(request: UploadUrlRequest): Promise<SignedUrl> {
    return Promise.resolve(this.sign(`fake://upload/${request.key}`, request.expiresInSeconds))
  }

  createReadUrl(input: { key: string; expiresInSeconds: number }): Promise<SignedUrl> {
    return Promise.resolve(this.sign(`fake://read/${input.key}`, input.expiresInSeconds))
  }

  head(key: string): Promise<StoredObjectInfo | null> {
    return Promise.resolve(this.objects.get(key) ?? null)
  }

  remove(key: string): Promise<void> {
    this.objects.delete(key)
    return Promise.resolve()
  }

  simulateUpload(key: string, info: StoredObjectInfo): void {
    this.objects.set(key, info)
  }

  private sign(url: string, expiresInSeconds: number): SignedUrl {
    return { url, expiresAt: new Date(this.clock.now().getTime() + expiresInSeconds * 1000) }
  }
}
