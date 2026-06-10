import api, { unwrapData, type QueryParams } from "./apiClient";

type AnyRecord = Record<string, any>;

let dashboardCache: AnyRecord | null = null;
let dashboardCacheAt = 0;
const CACHE_TTL_MS = 45_000;

function makeRows(source: unknown, sourceLabel = "Record") {
  if (!Array.isArray(source)) return [];
  return source.map((row, index) => ({ source: sourceLabel, id: (row as AnyRecord)?.id ?? (row as AnyRecord)?.key ?? index + 1, ...(row as AnyRecord) }));
}

function moduleRows(moduleId: string, data: AnyRecord) {
  switch (moduleId) {
    case "hardware": return makeRows(data.hardware?.topModels || data.risk?.topHardwareRisk || [], "Hardware");
    case "software": return makeRows(data.software?.topCategories || [], "Software");
    case "network": return makeRows(data.network?.workgroups || [], "Network");
    case "geolocation": return makeRows(data.geolocation?.topLocations || [], "Geolocation");
    case "tasks": return makeRows(data.tasks?.recentTasks || [], "Task");
    case "serviceDesk": return makeRows(data.activeAlerts || data.attentionQueue || [], "Service Desk");
    case "patch": return makeRows(data.patchDepartments || [], "Patch");
    case "risk": return makeRows(data.risk?.topFindings || [], "Risk");
    case "departments": return makeRows(data.departmentRows || [], "Department");
    case "alerts": return makeRows(data.activeAlerts || data.attentionQueue || [], "Alert");
    default: return [];
  }
}

export function clearItOperationsDashboardCache() {
  dashboardCache = null;
  dashboardCacheAt = 0;
}

export async function getItOperationsDashboard(mode?: "fast" | "full" | string, forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && dashboardCache && now - dashboardCacheAt < CACHE_TTL_MS) return dashboardCache;

  const payload = await api.get("/api/dashboard/it-operations", {
    params: forceRefresh ? { mode, refresh: 1 } : { mode },
  });
  dashboardCache = unwrapData<AnyRecord>(payload, {});
  dashboardCacheAt = now;
  return dashboardCache;
}

export async function getItOperationsModule(moduleId: string, params?: QueryParams) {
  const data = await getItOperationsDashboard(String(params?.mode || "fast"));
  return {
    generatedAt: data.generatedAt,
    [moduleId]: data[moduleId],
    rows: moduleRows(moduleId, data),
  };
}

export async function getItOperationsDrilldown(moduleId: string, params?: QueryParams) {
  const data = await getItOperationsDashboard("fast");
  const page = Number(params?.page || 1);
  const limit = Number(params?.limit || 10);
  const rows = moduleRows(moduleId, data);
  const start = (page - 1) * limit;
  const pagedRows = rows.slice(start, start + limit);

  return {
    success: true,
    module: moduleId,
    rows: pagedRows,
    groups: [],
    summary: {
      totalRecords: rows.length,
      groups: 0,
      criticalRows: rows.filter((row) => /critical|high|overdue|failed|risk/i.test(JSON.stringify(row))).length,
    },
    pagination: {
      page,
      limit,
      totalRecords: rows.length,
      totalPages: Math.max(Math.ceil(rows.length / limit), 1),
      hasPreviousPage: page > 1,
      hasNextPage: start + limit < rows.length,
    },
  };
}

export async function getItOperationsRecordDetail(moduleId: string, recordId: string | number, params?: QueryParams) {
  return {
    success: true,
    module: moduleId,
    recordId,
    title: String(params?.name || params?.deviceId || params?.assetId || params?.ipAddress || recordId),
    overview: { id: recordId, ...params },
    sections: [
      { title: "Source", data: { module: moduleId, recordId, ...params } },
    ],
  };
}

export default {
  getItOperationsDashboard,
  getItOperationsModule,
  getItOperationsDrilldown,
  getItOperationsRecordDetail,
  loadInitialData: getItOperationsDashboard,
};
