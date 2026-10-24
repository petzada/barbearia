import { extractDigits, normalizeBrazilPhone } from "@/lib/phone";
import type { WhatsappInstanceStatus } from "@/server/db/schema";

type UnknownRecord = Record<string, unknown>;

export type ParsedConnectionUpdateEvent = {
  isConnectionUpdate: boolean;
  instanceId: string | null;
  status: WhatsappInstanceStatus;
  rawStatus: string | null;
  phoneConnected: string | null;
  qrCode: string | null;
};

const asRecord = (value: unknown): UnknownRecord | null => {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  return value as UnknownRecord;
};

const asString = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
};

const firstNonEmptyString = (...candidates: unknown[]): string | null => {
  for (const candidate of candidates) {
    const resolved = asString(candidate);
    if (resolved) {
      return resolved;
    }
  }

  return null;
};

const normalizeStatusKey = (value: string | null): string | null =>
  value ? value.trim().toLowerCase() : null;

export const mapConnectionStatus = (
  rawStatus: string | null | undefined
): WhatsappInstanceStatus => {
  const normalizedStatus = normalizeStatusKey(rawStatus ?? null);

  if (!normalizedStatus) {
    return "unknown";
  }

  if (["open", "connected", "online", "ready"].includes(normalizedStatus)) {
    return "connected";
  }

  if (["connecting", "opening", "initializing"].includes(normalizedStatus)) {
    return "connecting";
  }

  if (
    ["close", "closed", "disconnected", "disconnect", "logout", "offline"].includes(
      normalizedStatus
    )
  ) {
    return "disconnected";
  }

  if (["qr", "qrcode", "qr_required", "pairing", "scan_qr"].includes(normalizedStatus)) {
    return "qr_required";
  }

  return "unknown";
};

const extractInstanceId = (payload: UnknownRecord, data: UnknownRecord | null): string | null => {
  const nestedInstance = asRecord(payload.instance);
  const nestedDataInstance = asRecord(data?.instance);

  return (
    firstNonEmptyString(
      payload.instance_id,
      payload.instanceId,
      payload.id,
      payload._id,
      payload.instance,
      payload.instanceName,
      payload.whatsmiau_instance_id,
      payload.instance_name,
      data?.instance_id,
      data?.instanceId,
      data?.id,
      data?._id,
      data?.instance,
      data?.instanceName,
      data?.whatsmiau_instance_id,
      data?.instance_name,
      nestedInstance?.instance_id,
      nestedInstance?.instanceId,
      nestedInstance?.id,
      nestedInstance?._id,
      nestedInstance?.instanceName,
      nestedInstance?.name,
      nestedDataInstance?.instance_id,
      nestedDataInstance?.instanceId,
      nestedDataInstance?.id,
      nestedDataInstance?._id,
      nestedDataInstance?.instanceName,
      nestedDataInstance?.name
    )
  );
};

const normalizePhoneCandidate = (value: string | null): string | null => {
  if (!value) {
    return null;
  }

  const withoutJid = value.includes("@") ? value.split("@")[0] : value;
  const normalized = normalizeBrazilPhone(withoutJid);

  if (normalized.isValid) {
    return normalized.normalized;
  }

  const digits = extractDigits(withoutJid);
  return digits.length > 0 ? digits : null;
};

const extractPhoneConnected = (
  payload: UnknownRecord,
  data: UnknownRecord | null
): string | null => {
  const me = asRecord(data?.me);

  return normalizePhoneCandidate(
    asString(data?.phone) ??
      asString(data?.number) ??
      asString(me?.id) ??
      asString(me?.jid) ??
      asString(payload.phone) ??
      asString(payload.number)
  );
};

const extractQrCode = (payload: UnknownRecord, data: UnknownRecord | null): string | null => {
  const qrValue =
    asString(data?.qr) ??
    asString(data?.qrcode) ??
    asString(data?.base64) ??
    asString(payload.qr) ??
    asString(payload.qrcode) ??
    asString(payload.base64);
  return qrValue;
};

const extractRawStatus = (payload: UnknownRecord, data: UnknownRecord | null): string | null => {
  return (
    asString(data?.connection) ??
    asString(data?.state) ??
    asString(data?.status) ??
    asString(payload.connection) ??
    asString(payload.state) ??
    asString(payload.status)
  );
};

export const parseConnectionUpdateEvent = (
  rawPayload: unknown
): ParsedConnectionUpdateEvent => {
  const payload = asRecord(rawPayload);
  if (!payload) {
    return {
      isConnectionUpdate: false,
      instanceId: null,
      status: "unknown",
      rawStatus: null,
      phoneConnected: null,
      qrCode: null,
    };
  }

  const eventName = normalizeStatusKey(asString(payload.event) ?? asString(payload.type) ?? asString(payload.name));
  const isConnectionUpdate =
    eventName === "connection.update" || eventName === "connection_update";

  const data = asRecord(payload.data);
  const rawStatus = extractRawStatus(payload, data);
  const status = mapConnectionStatus(rawStatus);

  return {
    isConnectionUpdate,
    instanceId: extractInstanceId(payload, data),
    status,
    rawStatus,
    phoneConnected: extractPhoneConnected(payload, data),
    qrCode: extractQrCode(payload, data),
  };
};

export const extractInstanceStatusSnapshot = (
  rawPayload: unknown
): Omit<ParsedConnectionUpdateEvent, "isConnectionUpdate"> => {
  const parsed = parseConnectionUpdateEvent(rawPayload);

  return {
    instanceId: parsed.instanceId,
    status: parsed.status,
    rawStatus: parsed.rawStatus,
    phoneConnected: parsed.phoneConnected,
    qrCode: parsed.qrCode,
  };
};
