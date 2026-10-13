// API pública dos contratos (T02 é a dona; mudanças passam pelo orquestrador). Documentação em README.md.
export type { Clock } from './clock'
export { newIdempotencyKey } from './command'
export type { CommandInput, CommandMeta } from './command'
export { ROLES } from './context'
export type { AuthenticatedContext, RequestContext, Role } from './context'
export type { DomainEvent } from './events'
export type { Jsonify, JsonPrimitive, JsonValue } from './json'
export type { AuditEntry, AuditWriter } from './ports/audit-writer'
export type { EnqueueResult, JobQueue, JobRequest } from './ports/job-queue'
export type { MetricEvent, MetricProperties, MetricsSink } from './ports/metrics-sink'
export type {
  NotificationChannel,
  NotificationHealth,
  NotificationMessage,
  NotificationOutcome,
  NotificationProvider,
} from './ports/notification-provider'
export type { Outbox } from './ports/outbox'
export { PAYMENT_CAPABILITY_KEYS } from './ports/payment-provider'
export type {
  CapabilityStatus,
  CreateRecurringInput,
  ExternalId,
  PaymentCapabilities,
  PaymentCapabilityKey,
  PaymentEnvironment,
  PaymentProvider,
  PaymentSnapshot,
  PaymentStatus,
  RecurringPayer,
  RecurringSnapshot,
  RecurringStatus,
  RefundResult,
} from './ports/payment-provider'
export type {
  PushOutcome,
  PushPayload,
  PushProvider,
  PushSubscriptionData,
} from './ports/push-provider'
export type {
  SignedUrl,
  StorageProvider,
  StoredObjectInfo,
  UploadUrlRequest,
} from './ports/storage-provider'
export { ok, pending } from './result'
export type { ErrorCode, ErrorResult, FieldError, OkResult, PendingResult, Result } from './result'
export type { ResolvedSession, SessionResolver } from './session'
