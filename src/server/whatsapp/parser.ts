import {
  extractInstanceStatusSnapshot,
  type ParsedConnectionUpdateEvent,
} from "./connection";

type UnknownRecord = Record<string, unknown>;

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

const getIdentityCandidates = (payload: unknown): string[] => {
  const source = asRecord(payload);
  if (!source) {
    return [];
  }

  const data = asRecord(source.data);
  const nestedInstance = asRecord(source.instance);
  const dataNestedInstance = asRecord(data?.instance);

  const candidates = [
    source.instance_id,
    source.instanceId,
    source.id,
    source._id,
    source.instance,
    source.name,
    source.instanceName,
    source.instance_name,
    source.whatsmiau_instance_id,
    data?.instance_id,
    data?.instanceId,
    data?.id,
    data?._id,
    data?.instance,
    data?.name,
    data?.instanceName,
    data?.instance_name,
    data?.whatsmiau_instance_id,
    nestedInstance?.instance_id,
    nestedInstance?.instanceId,
    nestedInstance?.id,
    nestedInstance?._id,
    nestedInstance?.instanceName,
    nestedInstance?.name,
    dataNestedInstance?.instance_id,
    dataNestedInstance?.instanceId,
    dataNestedInstance?.id,
    dataNestedInstance?._id,
    dataNestedInstance?.instanceName,
    dataNestedInstance?.name,
  ]
    .map((item) => asString(item))
    .filter((item): item is string => Boolean(item));

  return Array.from(new Set(candidates));
};

export const extractInstanceIdFromPayload = (payload: unknown): string | null => {
  const candidates = getIdentityCandidates(payload);

  return (
    firstNonEmptyString(
      candidates.find((candidate) => /^[a-f0-9]{24}$/i.test(candidate)),
      ...candidates
    ) ?? null
  );
};

export const extractProviderMessageId = (payload: unknown): string | null => {
  const source = asRecord(payload);
  const nestedData = asRecord(source?.data);
  const nestedKey = asRecord(source?.key);

  return (
    asString(source?.messageId) ??
    asString(source?.message_id) ??
    asString(source?.id) ??
    asString(nestedData?.messageId) ??
    asString(nestedData?.message_id) ??
    asString(nestedData?.id) ??
    asString(nestedKey?.id) ??
    null
  );
};

const normalizeInstancesResponse = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  const source = asRecord(payload);
  if (!source) {
    return [];
  }

  const keys = ["instances", "data", "result", "rows"] as const;
  for (const key of keys) {
    const candidate = source[key];
    if (Array.isArray(candidate)) {
      return candidate;
    }

    const nestedRecord = asRecord(candidate);
    if (Array.isArray(nestedRecord?.instances)) {
      return nestedRecord.instances;
    }
  }

  if (getIdentityCandidates(source).length > 0) {
    return [source];
  }

  return [];
};

export const findInstanceInList = (
  payload: unknown,
  instanceId: string
): unknown | null => {
  const target = instanceId.trim().toLowerCase();

  if (!target) {
    return null;
  }

  const instances = normalizeInstancesResponse(payload);
  for (const item of instances) {
    const itemCandidates = getIdentityCandidates(item).map((candidate) =>
      candidate.toLowerCase()
    );
    if (itemCandidates.includes(target)) {
      return item;
    }
  }

  return null;
};

export const extractStatusSnapshotFromPayload = (
  payload: unknown
): Omit<ParsedConnectionUpdateEvent, "isConnectionUpdate"> =>
  extractInstanceStatusSnapshot(payload);
