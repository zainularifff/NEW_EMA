const env = ((import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {}) as Record<string, string | undefined>;
const rawApiBaseUrl = env["VITE_API_BASE_URL"] || env["VITE_API_URL"] || "";

const runtimeOrigin =
  typeof window !== "undefined" && window.location?.origin
    ? window.location.origin
    : "";

export const API_BASE_URL = (rawApiBaseUrl || runtimeOrigin).replace(/\/+$/, "");
