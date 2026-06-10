import api, { apiRequest, unwrapArray, unwrapData, type QueryParams } from "./apiClient";
import { getAssets, getAssetsByRelationID, getDepartmentChildren, getDepartments, type AnyRecord } from "./commonService";

export async function ping() {
  return api.get("/api/internet-metering/ping");
}

export async function getUrlTree(params?: QueryParams) {
  const payload = await api.get("/api/internet-metering/urls/tree", { params });
  return unwrapArray<AnyRecord>(payload);
}

export async function getUrlTreePayload(params?: QueryParams) {
  return api.get("/api/internet-metering/urls/tree", { params });
}

export async function getUrlParents(params?: QueryParams) {
  const payload = await api.get("/api/internet-metering/urls/parents", { params });
  return unwrapArray<AnyRecord>(payload);
}

export async function getUrlChildren(params?: QueryParams) {
  const payload = await api.get("/api/internet-metering/urls/children", { params });
  return unwrapArray<AnyRecord>(payload);
}

export async function getUsage(params?: QueryParams) {
  const payload = await api.get("/api/internet-metering/usage", { params });
  return unwrapData(payload, payload);
}

export async function getUsagePayload(params?: QueryParams) {
  return api.get("/api/internet-metering/usage", { params });
}

export async function getStats(params?: QueryParams) {
  const payload = await api.get("/api/internet-metering/stats", { params });
  return unwrapData(payload, payload);
}

export async function getStatsPayload(params?: QueryParams) {
  return api.get("/api/internet-metering/stats", { params });
}

export async function start(payload: AnyRecord) {
  const response = await api.post("/api/internet-metering/start", payload);
  return unwrapData(response, response);
}

export async function collect(payload: AnyRecord) {
  const response = await api.post("/api/internet-metering/collect", payload);
  return unwrapData(response, response);
}

export async function stop(payload: AnyRecord) {
  const response = await api.post("/api/internet-metering/stop", payload);
  return unwrapData(response, response);
}

export async function runMeteringAction(action: "start" | "collect" | "stop", payload: AnyRecord) {
  if (action === "start") return start(payload);
  if (action === "stop") return stop(payload);
  return collect(payload);
}

export async function createUrl(payload: AnyRecord) {
  const response = await api.post("/api/internet-metering/urls", payload);
  return unwrapData(response, response);
}

export async function deleteUrl(payload: AnyRecord) {
  const response = await apiRequest("/api/internet-metering/urls", {
    method: "DELETE",
    body: JSON.stringify(payload),
  });
  return unwrapData(response, response);
}

export async function loadInitialData() {
  const [departments, urlTree] = await Promise.all([getDepartments(), getUrlTree().catch(() => [])]);
  return { departments, urlTree };
}

export default {
  ping,
  getDepartments,
  getDepartmentChildren,
  getAssets,
  getAssetsByRelationID,
  getUrlTree,
  getUrlTreePayload,
  getUrlParents,
  getUrlChildren,
  getUsage,
  getUsagePayload,
  getStats,
  getStatsPayload,
  start,
  collect,
  stop,
  runMeteringAction,
  createUrl,
  deleteUrl,
  loadInitialData,
};
