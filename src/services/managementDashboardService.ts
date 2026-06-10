import api, { unwrapData, type QueryParams } from "./apiClient";

export type ManagementDashboardLevel = "2" | "3" | 2 | 3;

export type ManagementDashboardDrilldownParams = QueryParams & {
  area?: string;
  key?: string;
  level?: ManagementDashboardLevel;
};

const MANAGEMENT_DASHBOARD_CACHE_MS = 45000;
const MANAGEMENT_DASHBOARD_DRILLDOWN_CACHE_MS = 30000;

let overviewCache: { at: number; value: unknown } | null = null;
let storytellingCache: { at: number; value: unknown } | null = null;
const drilldownCache = new Map<string, { at: number; value: unknown }>();

function cacheIsFresh(entry: { at: number } | null | undefined, ttl = MANAGEMENT_DASHBOARD_CACHE_MS) {
  return Boolean(entry && Date.now() - entry.at < ttl);
}

function drilldownCacheKey(params?: ManagementDashboardDrilldownParams) {
  return JSON.stringify({
    area: params?.area || "",
    key: params?.key || "",
    level: params?.level || "",
  });
}

export function clearManagementDashboardCache() {
  overviewCache = null;
  storytellingCache = null;
  drilldownCache.clear();
}

export async function getOverview<T = unknown>(forceRefresh = false): Promise<T> {
  if (!forceRefresh && cacheIsFresh(overviewCache)) return overviewCache!.value as T;

  const payload = await api.get("/api/management-dashboard/overview", {
    params: forceRefresh ? { refresh: 1 } : undefined,
  });
  const value = unwrapData<T>(payload, {} as T);
  overviewCache = { at: Date.now(), value };
  return value;
}

export async function getStorytelling<T = unknown>(forceRefresh = false): Promise<T> {
  if (!forceRefresh && cacheIsFresh(storytellingCache)) return storytellingCache!.value as T;

  const payload = await api.get("/api/management-dashboard/storytelling");
  const value = unwrapData<T>(payload, payload as T);
  storytellingCache = { at: Date.now(), value };
  return value;
}

export async function refreshStorytelling<T = unknown>(params?: QueryParams): Promise<T> {
  storytellingCache = null;
  const payload = await api.post("/api/management-dashboard/storytelling/refresh", params || {});
  return unwrapData<T>(payload, payload as T);
}

export async function getDrilldown<T = unknown>(params?: ManagementDashboardDrilldownParams, forceRefresh = false): Promise<T> {
  const key = drilldownCacheKey(params);
  const cached = drilldownCache.get(key);
  if (!forceRefresh && cacheIsFresh(cached, MANAGEMENT_DASHBOARD_DRILLDOWN_CACHE_MS)) return cached!.value as T;

  const payload = await api.get("/api/management-dashboard/drilldown", {
    params: forceRefresh ? { ...(params || {}), refresh: 1 } : params,
  });
  const value = unwrapData<T>(payload, payload as T);
  drilldownCache.set(key, { at: Date.now(), value });
  return value;
}

export async function loadInitialData() {
  const overview = await getOverview();
  const storytelling = await getStorytelling().catch(() => null);
  return { overview, storytelling };
}

// Backward-compatible names for existing imports elsewhere.
export const getManagementDashboardOverview = getOverview;
export const getManagementDashboardStorytelling = getStorytelling;
export const refreshManagementDashboardStorytelling = refreshStorytelling;
export const getManagementDashboardDrilldown = getDrilldown;

export default {
  getOverview,
  getStorytelling,
  refreshStorytelling,
  getDrilldown,
  loadInitialData,
  clearManagementDashboardCache,
  getManagementDashboardOverview,
  getManagementDashboardStorytelling,
  refreshManagementDashboardStorytelling,
  getManagementDashboardDrilldown,
};
