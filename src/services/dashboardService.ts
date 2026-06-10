import api, { unwrapData } from "./apiClient";

const DASHBOARD_SERVICE_CACHE_MS = 45000;
let itOpsCache: { at: number; value: unknown; mode?: string } | null = null;
let storyCache: { at: number; value: unknown } | null = null;

function fresh(entry: { at: number } | null | undefined, ttl = DASHBOARD_SERVICE_CACHE_MS) {
  return Boolean(entry && Date.now() - entry.at < ttl);
}

export function clearDashboardServiceCache() {
  itOpsCache = null;
  storyCache = null;
}

export async function getDashboardItOperations(mode?: string, forceRefresh = false) {
  if (!forceRefresh && fresh(itOpsCache) && itOpsCache?.mode === mode) return itOpsCache.value;

  const payload = await api.get("/api/dashboard/it-operations", {
    params: forceRefresh ? { mode, refresh: 1 } : { mode },
  });
  const value = unwrapData(payload, {});
  itOpsCache = { at: Date.now(), value, mode };
  return value;
}

export async function getDashboardStorytelling(forceRefresh = false) {
  if (!forceRefresh && fresh(storyCache)) return storyCache!.value;

  const payload = await api.get("/api/management-dashboard/storytelling");
  const value = unwrapData(payload, payload);
  storyCache = { at: Date.now(), value };
  return value;
}

export async function loadInitialData() {
  const itOperations = await getDashboardItOperations("fast");
  const storytelling = await getDashboardStorytelling().catch(() => null);
  return { itOperations, storytelling };
}

export default {
  getDashboardItOperations,
  getDashboardStorytelling,
  loadInitialData,
  clearDashboardServiceCache,
};
