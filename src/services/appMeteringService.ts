import api, { unwrapArray, unwrapData, type QueryParams } from "./apiClient";
import { getAssetsByRelationID, getDepartmentChildren, getDepartments, type AnyRecord } from "./commonService";

export async function getMeteringDevices(params?: QueryParams) {
  const payload = await api.get("/api/application-metering/devices", { params });
  return unwrapArray<AnyRecord>(payload);
}

export async function getMeteringHierarchy(params?: QueryParams) {
  const payload = await api.get("/api/application-metering/hierarchy", { params });
  return unwrapArray<AnyRecord>(payload);
}

export async function resolveMeteringTarget(payload: AnyRecord) {
  const response = await api.post("/api/application-metering/resolve-target", payload);
  return unwrapData(response, response);
}

export async function getPackages(params?: QueryParams) {
  const payload = await api.get("/api/application-metering/packages", { params });
  return unwrapArray<AnyRecord>(payload);
}

export async function getPackageFiles(packageId: number | string) {
  const payload = await api.get(`/api/application-metering/packages/${packageId}/files`);
  return unwrapArray<AnyRecord>(payload);
}


function normalizeApplicationUsageParams(params?: QueryParams): QueryParams {
  const next = { ...(params || {}) } as QueryParams & Record<string, unknown>;
  const rawSoftwareFilter = next.swPkgId ?? next.sw_pkg_id ?? next.SW_Idn ?? next.SW_Pkg_Idn ?? next.packageId;

  if (rawSoftwareFilter === undefined || rawSoftwareFilter === null || rawSoftwareFilter === "" || String(rawSoftwareFilter) === "0") {
    next.swPkgId = -1;
  }

  return next;
}

export async function getUsage(params?: QueryParams) {
  const payload = await api.get("/api/application-metering/usage", { params: normalizeApplicationUsageParams(params) });
  return unwrapData(payload, payload);
}

export async function getStats(params?: QueryParams) {
  const payload = await api.get("/api/application-metering/stats", { params: normalizeApplicationUsageParams(params) });
  return unwrapData(payload, payload);
}

export async function startMetering(payload: AnyRecord) {
  const response = await api.post("/api/application-metering/start", payload);
  return unwrapData(response, response);
}

export async function collectMetering(payload: AnyRecord) {
  const response = await api.post("/api/application-metering/collect", payload);
  return unwrapData(response, response);
}

export async function stopMetering(payload: AnyRecord) {
  const response = await api.post("/api/application-metering/stop", payload);
  return unwrapData(response, response);
}

export async function runMeteringAction(action: "start" | "collect" | "stop", payload: AnyRecord) {
  if (action === "start") return startMetering(payload);
  if (action === "stop") return stopMetering(payload);
  return collectMetering(payload);
}

export async function loadInitialData() {
  const [departments, packages] = await Promise.all([getDepartments(), getPackages()]);
  return { departments, packages };
}

export default {
  getDepartments,
  getDepartmentChildren,
  getAssetsByRelationID,
  getMeteringDevices,
  getMeteringHierarchy,
  resolveMeteringTarget,
  getPackages,
  getPackageFiles,
  getUsage,
  getStats,
  startMetering,
  collectMetering,
  stopMetering,
  runMeteringAction,
  loadInitialData,
};
