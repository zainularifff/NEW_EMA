import api, { unwrapArray, unwrapData, type QueryParams } from "./apiClient";
import { getAssetsByRelationID, getDepartments, type AssetItem, type DepartmentNode } from "./commonService";

export { getAssetsByRelationID, getDepartments };
export type { AssetItem, DepartmentNode };

export type OnlinePatchStatusFilter = "all" | "missing" | "installed" | "downloaded" | "failed" | string;
export type OnlinePatchQueryParams = QueryParams & { page?: number; limit?: number; search?: string; severity?: string; status?: OnlinePatchStatusFilter };
export type OnlinePatchScopeParams = QueryParams & { scope?: "all" | "relation" | "device" | string; Object_Rel_Idn?: number; Object_Root_Idn?: number; objectAgent?: string; objectDeviceID?: string };
export type OnlinePatchSummary = Record<string, any>;
export type OnlinePatchRow = Record<string, any>;
export type OnlinePatchDetail = Record<string, any>;

export async function getOnlinePatchSummary(params?: OnlinePatchScopeParams) {
  const payload = await api.get("/api/patch/online/summary", { params });
  return unwrapData<OnlinePatchSummary>(payload, {});
}

export async function getOnlinePatchStatus(params?: OnlinePatchQueryParams & OnlinePatchScopeParams) {
  const payload = await api.get("/api/patch/online/status", { params });
  return unwrapData(payload, payload) as { rows?: OnlinePatchRow[]; data?: OnlinePatchRow[]; totalRecords?: number; page?: number; limit?: number; totalPages?: number };
}

export async function getOnlinePatchCatalog(params?: OnlinePatchQueryParams) {
  const payload = await api.get("/api/patch/online/catalog", { params });
  return unwrapData(payload, payload) as { rows?: OnlinePatchRow[]; data?: OnlinePatchRow[]; totalRecords?: number; page?: number; limit?: number; totalPages?: number };
}

export async function getOnlinePatchDetail(updateID: number | string, revisionNumber: number | string) {
  const payload = await api.get(`/api/patch/online/updates/${encodeURIComponent(String(updateID))}/${encodeURIComponent(String(revisionNumber))}`);
  return unwrapData<OnlinePatchDetail>(payload, {});
}

export async function prepareOnlinePatchInstall(payload: Record<string, any>) {
  const response = await api.post("/api/patch/online/install", payload);
  return unwrapData(response, response);
}

export async function createOnlinePatchScanJob(payload: OnlinePatchScopeParams) {
  const response = await api.post("/api/patch/online/scan", payload);
  return unwrapData(response, response);
}

export async function loadInitialData() {
  const [departments, summary] = await Promise.all([getDepartments(), getOnlinePatchSummary()]);
  return { departments, summary };
}

export default {
  getDepartments,
  getAssetsByRelationID,
  getOnlinePatchSummary,
  getOnlinePatchStatus,
  getOnlinePatchCatalog,
  getOnlinePatchDetail,
  prepareOnlinePatchInstall,
  createOnlinePatchScanJob,
  loadInitialData,
};
