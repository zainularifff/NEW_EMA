export type IdleTimeoutConfig = {
  enabled: boolean;
  timeoutMinutes: number;
};

export const EMA_LAST_ACTIVITY_KEY = "ema-last-activity-at";
const TOUCH_THROTTLE_MS = 10000;

let lastTouchWriteAt = 0;

function envNumber(name: string, fallback: number) {
  const env = (import.meta as any)?.env || {};
  const parsed = Number(env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function readSessionActivityAt() {
  if (typeof window === "undefined") return 0;

  const raw =
    window.localStorage.getItem(EMA_LAST_ACTIVITY_KEY) ||
    window.sessionStorage.getItem(EMA_LAST_ACTIVITY_KEY) ||
    "";

  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function touchSessionActivity(force = false) {
  if (typeof window === "undefined") return Date.now();

  const now = Date.now();

  if (!force && now - lastTouchWriteAt < TOUCH_THROTTLE_MS) {
    return readSessionActivityAt() || now;
  }

  lastTouchWriteAt = now;
  window.localStorage.setItem(EMA_LAST_ACTIVITY_KEY, String(now));
  window.sessionStorage.setItem(EMA_LAST_ACTIVITY_KEY, String(now));

  return now;
}

export function clearSessionActivity() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(EMA_LAST_ACTIVITY_KEY);
  window.sessionStorage.removeItem(EMA_LAST_ACTIVITY_KEY);
}

export function getLastActivityHeader() {
  const existing = readSessionActivityAt();
  return String(existing || touchSessionActivity(true));
}

function normalizeKey(value: any) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function unwrapRows(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.recordset)) return payload.recordset;
  return [];
}

function isEnabled(row: any) {
  const status = normalizeKey(row?.Status ?? row?.status);
  const enforcement = normalizeKey(row?.Enforcement ?? row?.enforcement);

  return status === "active" && enforcement !== "disabled";
}

function isSessionPolicy(row: any) {
  const key = normalizeKey(row?.PolicyKey ?? row?.policyKey);
  const name = normalizeKey(row?.PolicyName ?? row?.policyName ?? row?.name);

  return (
    key === "session_timeout" ||
    key === "timeout" ||
    key === "idle_timeout" ||
    name.includes("session_timeout") ||
    name.includes("idle_timeout")
  );
}

function parseDurationMinutes(row: any, fallbackMinutes: number) {
  const text = [
    row?.Description,
    row?.description,
    row?.ReviewCycle,
    row?.reviewCycle,
    row?.PolicyName,
    row?.policyName,
  ]
    .filter(Boolean)
    .join(" ");

  const match = String(text).match(/(\d+)\s*(minute|minutes|min|hour|hours|hr|hrs)/i);

  if (!match) return fallbackMinutes;

  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return fallbackMinutes;

  const unit = String(match[2] || "").toLowerCase();
  return unit.startsWith("hour") || unit.startsWith("hr") ? value * 60 : value;
}

export function getIdleTimeoutConfigFromAccessControls(payload: any): IdleTimeoutConfig {
  const fallbackMinutes = envNumber("VITE_IDLE_TIMEOUT_MINUTES", 30);
  const row = unwrapRows(payload).find(isSessionPolicy);

  if (!row || !isEnabled(row)) {
    return {
      enabled: false,
      timeoutMinutes: fallbackMinutes,
    };
  }

  return {
    enabled: true,
    timeoutMinutes: parseDurationMinutes(row, fallbackMinutes),
  };
}

export function isIdleTimedOut(timeoutMinutes: number) {
  const lastActivityAt = readSessionActivityAt() || touchSessionActivity(true);
  const timeoutMs = Math.max(1, Number(timeoutMinutes) || 30) * 60 * 1000;

  return Date.now() - lastActivityAt > timeoutMs;
}
