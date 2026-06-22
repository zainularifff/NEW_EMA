export type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryValue | QueryValue[]>;

export type ApiRequestConfig = Omit<RequestInit, "body"> & {
  params?: QueryParams;
  /** Request payload for legacy DELETE calls that pass axios-style config.data. */
  data?: unknown;
  /** Legacy axios-style response type. Currently supports blob and text in addition to JSON. */
  responseType?: "json" | "blob" | "text" | string;
  /**
   * Frontend memory-cache TTL for GET requests. Set to 0 to skip cache for this request.
   * The default is controlled by VITE_API_CLIENT_CACHE_TTL_MS or 90000ms.
   */
  cacheTtlMs?: number;
  /** Force this GET request to bypass frontend memory cache. */
  forceRefresh?: boolean;
};

export type ApiEnvelope<T = unknown> = {
  success?: boolean;
  message?: string;
  error?: string;
  errorMessage?: string;
  data?: T;
  totalRecords?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  [key: string]: unknown;
};

function readEnv(name: string): string {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env || {};
  return String(env[name] || "").trim();
}

function getRuntimeOrigin() {
  if (typeof window === "undefined") return "";
  return String(window.location?.origin || "").replace(/\/+$/, "");
}

const configuredApiBaseUrl = (readEnv("VITE_API_BASE_URL") || readEnv("VITE_API_URL")).replace(/\/+$/, "");

export const API_BASE_URL = configuredApiBaseUrl || getRuntimeOrigin();
export const SERVER_PORT = (() => {
  try {
    const parsed = new URL(API_BASE_URL || getRuntimeOrigin());
    return parsed.port || (parsed.protocol === "https:" ? "443" : parsed.protocol === "http:" ? "80" : "");
  } catch {
    return "";
  }
})();

function readPositiveNumberEnv(name: string, fallback: number) {
  const parsed = Number(readEnv(name));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

const DEFAULT_GET_CACHE_TTL_MS = readPositiveNumberEnv("VITE_API_CLIENT_CACHE_TTL_MS", 90_000);
const MAX_GET_CACHE_ENTRIES = readPositiveNumberEnv("VITE_API_CLIENT_CACHE_MAX_ENTRIES", 160);

type CacheRecord = {
  expiresAt: number;
  value: unknown;
};

const getMemoryCache = new Map<string, CacheRecord>();
const inflightGetRequests = new Map<string, Promise<unknown>>();

function getTokenSignature(token: string) {
  if (!token) return "anonymous";
  if (token.length <= 24) return token;
  return `${token.slice(0, 10)}:${token.slice(-10)}`;
}

function getClientCacheTtl(config: ApiRequestConfig) {
  if (config.forceRefresh) return 0;
  if (config.cache === "no-store" || config.cache === "no-cache" || config.cache === "reload") return 0;

  const configuredTtl = Number(config.cacheTtlMs);
  if (Number.isFinite(configuredTtl)) return Math.max(0, configuredTtl);

  return DEFAULT_GET_CACHE_TTL_MS;
}

function buildClientCacheKey(method: string, url: string, token: string) {
  return `${method.toUpperCase()} ${url} ${getTokenSignature(token)}`;
}

function pruneGetMemoryCache() {
  const now = Date.now();

  for (const [key, record] of getMemoryCache.entries()) {
    if (record.expiresAt <= now) getMemoryCache.delete(key);
  }

  while (getMemoryCache.size > MAX_GET_CACHE_ENTRIES) {
    const firstKey = getMemoryCache.keys().next().value;
    if (!firstKey) break;
    getMemoryCache.delete(firstKey);
  }
}

export function clearApiClientCache(match?: string | RegExp) {
  if (!match) {
    getMemoryCache.clear();
    inflightGetRequests.clear();
    return;
  }

  for (const key of getMemoryCache.keys()) {
    const shouldDelete = typeof match === "string" ? key.includes(match) : match.test(key);
    if (shouldDelete) getMemoryCache.delete(key);
  }
}

const TOKEN_STORAGE_KEYS = [
  "ema-access-token",
  "ema-token",
  "accessToken",
  "token",
  "authToken",
  "ema-auth-token",
  "ema_access_token",
  "jwt",
];

const AUTH_STORAGE_KEYS = [
  "ema-auth",
  "auth",
  "user",
  "ema-user",
  "currentUser",
  "authUser",
  "ema-current-user",
];

function safeParseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function readStorage(key: string) {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(key) || window.sessionStorage.getItem(key) || "";
}

export function getStoredToken() {
  for (const key of TOKEN_STORAGE_KEYS) {
    const value = readStorage(key);
    if (value && value.trim()) return value.trim();
  }

  for (const key of AUTH_STORAGE_KEYS) {
    const authRecord = safeParseJson<{
      token?: string;
      accessToken?: string;
      authToken?: string;
      data?: { token?: string; accessToken?: string; authToken?: string };
      user?: { token?: string; accessToken?: string; authToken?: string };
    }>(readStorage(key));

    const token =
      authRecord?.accessToken ||
      authRecord?.token ||
      authRecord?.authToken ||
      authRecord?.data?.accessToken ||
      authRecord?.data?.token ||
      authRecord?.data?.authToken ||
      authRecord?.user?.accessToken ||
      authRecord?.user?.token ||
      authRecord?.user?.authToken ||
      "";

    if (token && token.trim()) return token.trim();
  }

  return "";
}

function appendParams(url: URL, params?: QueryParams) {
  if (!params) return;

  Object.entries(params).forEach(([key, rawValue]) => {
    if (Array.isArray(rawValue)) {
      rawValue.forEach((value) => {
        if (value !== undefined && value !== null && String(value).trim() !== "") {
          url.searchParams.append(key, String(value));
        }
      });
      return;
    }

    if (rawValue !== undefined && rawValue !== null && String(rawValue).trim() !== "") {
      url.searchParams.set(key, String(rawValue));
    }
  });
}

export function buildApiUrl(path: string, params?: QueryParams) {
  if (/^https?:\/\//i.test(path)) {
    const externalUrl = new URL(path);
    appendParams(externalUrl, params);
    return externalUrl.toString();
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const baseUrl = API_BASE_URL || getRuntimeOrigin();
  const url = new URL(`${baseUrl}${normalizedPath}`);
  appendParams(url, params);
  return url.toString();
}

async function parseResponse(response: Response, responseType?: string) {
  if (responseType === "blob") return response.blob();
  if (responseType === "text") return response.text();

  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();
  if (!text) return {};

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      return {};
    }
  }

  try {
    return JSON.parse(text);
  } catch {
    return { data: text };
  }
}

export async function request<T = any>(
  method: string,
  path: string,
  data?: unknown,
  config: ApiRequestConfig = {}
): Promise<T> {
  const normalizedMethod = method.toUpperCase();
  const token = getStoredToken();
  const payloadData = data !== undefined ? data : config.data;
  const isFormData = typeof FormData !== "undefined" && payloadData instanceof FormData;
  const headers = new Headers(config.headers || {});
  const url = buildApiUrl(path, config.params);
  const responseType = config.responseType;

  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (isFormData && headers.get("Content-Type")?.includes("multipart/form-data")) {
    headers.delete("Content-Type");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const requestConfig: ApiRequestConfig = { ...config };
  delete requestConfig.params;
  delete requestConfig.cacheTtlMs;
  delete requestConfig.forceRefresh;
  delete requestConfig.data;
  delete requestConfig.responseType;

  const runFetch = async () => {
    const response = await fetch(url, {
      ...requestConfig,
      method: normalizedMethod,
      credentials: requestConfig.credentials || "include",
      headers,
      body:
        normalizedMethod === "GET" || normalizedMethod === "HEAD"
          ? undefined
          : isFormData
            ? (payloadData as BodyInit)
            : payloadData !== undefined
              ? JSON.stringify(payloadData)
              : undefined,
    });

    const payload = await parseResponse(response, responseType);

    if (!response.ok) {
      const maybeRecord = payload as Record<string, any>;
      const message =
        maybeRecord?.message ||
        maybeRecord?.error ||
        maybeRecord?.errorMessage ||
        maybeRecord?.status ||
        `Request failed with status ${response.status}`;

      const error = new Error(message);
      (error as Error & { response?: { status: number; data: unknown } }).response = {
        status: response.status,
        data: payload,
      };
      throw error;
    }

    return payload as T;
  };

  const cacheTtl = normalizedMethod === "GET" ? getClientCacheTtl(config) : 0;

  if (cacheTtl > 0) {
    pruneGetMemoryCache();
    const cacheKey = buildClientCacheKey(normalizedMethod, url, token);
    const cached = getMemoryCache.get(cacheKey);
    const now = Date.now();

    if (cached && cached.expiresAt > now) {
      return cached.value as T;
    }

    const inflight = inflightGetRequests.get(cacheKey);
    if (inflight) return inflight as Promise<T>;

    const inflightRequest = runFetch()
      .then((payload) => {
        getMemoryCache.set(cacheKey, {
          expiresAt: Date.now() + cacheTtl,
          value: payload,
        });
        pruneGetMemoryCache();
        return payload;
      })
      .finally(() => {
        inflightGetRequests.delete(cacheKey);
      });

    inflightGetRequests.set(cacheKey, inflightRequest);
    return inflightRequest;
  }

  if (normalizedMethod !== "GET" && normalizedMethod !== "HEAD") {
    clearApiClientCache();
  }

  return runFetch();
}

export async function apiRequest<T = any>(path: string, config: ApiRequestConfig & { method?: string; body?: BodyInit | string | null } = {}) {
  const method = (config.method || "GET").toUpperCase();
  const body = config.body;
  const requestConfig: ApiRequestConfig = { ...config };
  delete (requestConfig as Record<string, unknown>).method;
  delete (requestConfig as Record<string, unknown>).body;

  const data =
    body instanceof FormData
      ? body
      : typeof body === "string"
        ? safeParseJson(body) ?? body
        : body ?? requestConfig.data ?? undefined;

  return request<T>(method, path, data, requestConfig);
}

export function unwrapData<T = any>(payload: any, emptyValue?: T): T {
  if (payload === undefined || payload === null) return emptyValue as T;
  if (payload?.data !== undefined) return payload.data as T;
  return payload as T;
}

export function unwrapArray<T = any>(payload: any): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (Array.isArray(payload?.data)) return payload.data as T[];
  if (Array.isArray(payload?.data?.data)) return payload.data.data as T[];
  if (Array.isArray(payload?.rows)) return payload.rows as T[];
  if (Array.isArray(payload?.reports)) return payload.reports as T[];
  if (Array.isArray(payload?.recordset)) return payload.recordset as T[];
  return [];
}

export const api = {
  get<T = any>(path: string, config: ApiRequestConfig = {}) {
    return request<T>("GET", path, undefined, config);
  },

  post<T = any>(path: string, data?: unknown, config: ApiRequestConfig = {}) {
    return request<T>("POST", path, data, config);
  },

  put<T = any>(path: string, data?: unknown, config: ApiRequestConfig = {}) {
    return request<T>("PUT", path, data, config);
  },

  patch<T = any>(path: string, data?: unknown, config: ApiRequestConfig = {}) {
    return request<T>("PATCH", path, data, config);
  },

  delete<T = any>(path: string, config: ApiRequestConfig = {}) {
    return request<T>("DELETE", path, config.data, config);
  },
};

export default api;
