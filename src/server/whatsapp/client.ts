/** Erro de chamada à API WhatsMiau (statusCode 502 = falha do provedor). */
export class WhatsmiauError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "WhatsmiauError";
  }
}

type HttpMethod = "GET" | "POST" | "DELETE";

type RequestInput = {
  method: HttpMethod;
  path: string;
  body?: unknown;
  retryable?: boolean;
};

export type ValidateNumberResult = {
  isValid: boolean;
  normalizedPhone: string | null;
  providerResponse: unknown;
};

const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 550;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const shouldRetry = (error: unknown): boolean => {
  if (error instanceof WhatsmiauError) {
    return error.statusCode >= 500;
  }

  return true;
};

const parseResponseBody = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const tryParseJson = (value: string): unknown | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
};

const isValidationItem = (value: unknown): value is Record<string, unknown> =>
  isRecord(value) &&
  ("exists" in value ||
    "valid" in value ||
    "isValid" in value ||
    "registered" in value ||
    "jid" in value ||
    "number" in value);

const extractValidationList = (value: unknown, depth = 0): unknown[] => {
  if (depth > 4 || value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = tryParseJson(value);
    if (parsed !== null) {
      return extractValidationList(parsed, depth + 1);
    }

    return [];
  }

  if (!isRecord(value)) {
    return [];
  }

  if (isValidationItem(value)) {
    return [value];
  }

  const candidateKeys = ["data", "result", "numbers", "response"] as const;
  for (const key of candidateKeys) {
    const resolved = extractValidationList(value[key], depth + 1);
    if (resolved.length > 0) {
      return resolved;
    }
  }

  return [];
};

const normalizeValidationPayload = (
  providerResponse: unknown,
  fallbackPhone: string
): ValidateNumberResult => {
  const sourceList = extractValidationList(providerResponse);

  if (sourceList.length === 0) {
    return {
      isValid: false,
      normalizedPhone: null,
      providerResponse,
    };
  }

  const firstItem = sourceList[0];
  if (typeof firstItem === "string") {
    return {
      isValid: firstItem.length > 0,
      normalizedPhone: firstItem || fallbackPhone,
      providerResponse,
    };
  }

  if (!isRecord(firstItem)) {
    return {
      isValid: false,
      normalizedPhone: null,
      providerResponse,
    };
  }

  const isValid = Boolean(
    firstItem.exists ??
      firstItem.valid ??
      firstItem.isValid ??
      firstItem.registered ??
      firstItem.jid
  );

  const normalizedPhone =
    typeof firstItem.number === "string"
      ? firstItem.number
      : typeof firstItem.jid === "string"
        ? firstItem.jid.split("@")[0]
        : fallbackPhone;

  return {
    isValid,
    normalizedPhone: isValid ? normalizedPhone : null,
    providerResponse,
  };
};

export class WhatsmiauClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(options: { baseUrl: string; apiKey: string; timeoutMs?: number }) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.timeoutMs = options.timeoutMs ?? 15000;
  }

  private async request(input: RequestInput): Promise<unknown> {
    const maxAttempts = input.retryable ? RETRY_ATTEMPTS : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const abortController = new AbortController();
      const timeoutHandle = setTimeout(() => abortController.abort(), this.timeoutMs);

      try {
        const url = `${this.baseUrl}${input.path}`;
        const response = await fetch(url, {
          method: input.method,
          headers: {
            Accept: "application/json",
            apikey: this.apiKey,
            ...(input.body !== undefined ? { "Content-Type": "application/json" } : {}),
          },
          body: input.body !== undefined ? JSON.stringify(input.body) : undefined,
          signal: abortController.signal,
        });

        clearTimeout(timeoutHandle);

        const payload = await parseResponseBody(response);
        if (!response.ok) {
          const message =
            response.status >= 500
              ? "Falha no provedor WhatsMiau."
              : "Requisição rejeitada pelo provedor WhatsMiau.";

          throw new WhatsmiauError(message, response.status >= 500 ? 502 : 400, {
            status: response.status,
            payload,
          });
        }

        return payload;
      } catch (error) {
        clearTimeout(timeoutHandle);

        if (attempt >= maxAttempts || !shouldRetry(error)) {
          throw error;
        }

        await sleep(RETRY_DELAY_MS * attempt);
      }
    }

    throw new WhatsmiauError("Falha ao comunicar com WhatsMiau.", 502);
  }

  async createInstance(instanceName: string): Promise<unknown> {
    return this.request({
      method: "POST",
      path: "/evolution/instance/create",
      body: {
        instanceName,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
      },
    });
  }

  async connectInstance(instanceId: string): Promise<unknown> {
    return this.request({
      method: "GET",
      path: `/evolution/instance/connect/${encodeURIComponent(instanceId)}`,
      retryable: true,
    });
  }

  async deleteInstance(instanceId: string): Promise<unknown> {
    const encodedId = encodeURIComponent(instanceId);
    const candidates = [
      `/evolution/instance/${encodedId}`,
      "/evolution/instance/delete/" + encodedId,
    ] as const;

    let lastError: unknown;

    for (const path of candidates) {
      try {
        return await this.request({
          method: "DELETE",
          path,
        });
      } catch (error) {
        lastError = error;

        if (error instanceof WhatsmiauError && (error.statusCode === 400 || error.statusCode === 404)) {
          continue;
        }

        throw error;
      }
    }

    throw lastError ?? new WhatsmiauError("Falha ao remover instância.", 502);
  }

  async sendText(instanceId: string, phone: string, text: string): Promise<unknown> {
    return this.request({
      method: "POST",
      path: `/message/sendText/${encodeURIComponent(instanceId)}`,
      body: {
        number: phone,
        text,
        textMessage: {
          text,
        },
      },
      retryable: false,
    });
  }

  async validateWhatsAppNumber(
    instanceId: string,
    phone: string
  ): Promise<ValidateNumberResult> {
    const providerResponse = await this.request({
      method: "POST",
      path: `/chat/whatsappNumbers/${encodeURIComponent(instanceId)}`,
      body: {
        numbers: [phone],
      },
      retryable: false,
    });

    return normalizeValidationPayload(providerResponse, phone);
  }

  async listInstances(): Promise<unknown> {
    const candidates = [
      "/evolution/instances",
      "/evolution/instance/fetchInstances",
      "/evolution/instance/list",
    ] as const;

    let lastError: unknown;

    for (const path of candidates) {
      try {
        return await this.request({
          method: "GET",
          path,
          retryable: true,
        });
      } catch (error) {
        lastError = error;
        if (error instanceof WhatsmiauError && error.statusCode === 400) {
          continue;
        }

        if (error instanceof WhatsmiauError && error.statusCode === 404) {
          continue;
        }

        throw error;
      }
    }

    console.warn("[whatsmiau] não foi possível listar instâncias", lastError);

    throw lastError ?? new WhatsmiauError("Falha ao listar instâncias.", 502);
  }
}
