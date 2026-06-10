import api, { unwrapArray, unwrapData, type ApiEnvelope, type QueryParams } from "./apiClient";
import {
  getAssetsByRelationID,
  getHardwareInventoryAssets,
  getAssetDetail,
  getDepartmentChildren,
  getDepartments,
  moveAssetDepartment,
  type AnyRecord,
} from "./commonService";

export async function createDepartment(payload: { name: string; parentID?: number | string }) {
  const response = await api.post<ApiEnvelope<AnyRecord>>("/api/departments", payload);
  return unwrapData<AnyRecord>(response, response as AnyRecord);
}

export async function updateDepartment(relationID: number | string, payload: { name: string }) {
  const response = await api.put<ApiEnvelope<AnyRecord>>(`/api/departments/${encodeURIComponent(String(relationID))}`, payload);
  return unwrapData<AnyRecord>(response, response as AnyRecord);
}

export async function deleteDepartment(relationID: number | string) {
  const response = await api.delete<ApiEnvelope<AnyRecord>>(`/api/departments/${encodeURIComponent(String(relationID))}`);
  return unwrapData<AnyRecord>(response, response as AnyRecord);
}

export async function getHardwareStatistic(relationID: number | string, report: string, params?: QueryParams) {
  const payload = await api.get(`/api/hardware-statistics/${relationID}/${report}`, { params });
  return unwrapArray<AnyRecord>(payload);
}

export async function getHardwareStatisticCategory(relationID: number | string, categoryKey: string, params?: QueryParams) {
  const payload = await api.get(`/api/hardware-statistics/${relationID}/category/${encodeURIComponent(categoryKey)}`, { params });
  return unwrapArray<AnyRecord>(payload);
}

export async function getHardwareReport(relationID: number | string, reportKey: string, params?: QueryParams) {
  const payload = await api.get(`/api/hardware-reports/${relationID}/${encodeURIComponent(reportKey)}`, { params });
  return unwrapArray<AnyRecord>(payload);
}

export async function getClientListReport(relationID: number | string) {
  const payload = await api.get(`/api/hardware-reports/${relationID}/client-list`);
  return unwrapArray<AnyRecord>(payload);
}

export async function getChangedItems(relationID: number | string) {
  const payload = await api.get(`/api/hardware-management/${relationID}/changed-items`);
  return unwrapArray<AnyRecord>(payload);
}

export async function getDuplicateIps() {
  const payload = await api.get("/api/hardware-management/duplicate-ips");
  return unwrapArray<AnyRecord>(payload);
}

export async function createHardwareScanJob(payload: AnyRecord) {
  return api.post<ApiEnvelope<AnyRecord>>("/api/hardware-inventory/scan", payload);
}

export async function sendTextMessage(payload: AnyRecord, platform = false) {
  return api.post<ApiEnvelope<AnyRecord[]>>(platform ? "/api/mdm/text-message/platform" : "/api/mdm/text-message", payload);
}

export async function getLiveGeolocation(deviceID: string, params?: QueryParams) {
  const payload = await api.get(`/api/geolocation/live/${encodeURIComponent(deviceID)}`, { params });
  return unwrapArray<AnyRecord>(payload);
}

export async function getGeolocationHistory(deviceID: string, params?: QueryParams) {
  const payload = await api.get(`/api/geolocation/history/${encodeURIComponent(deviceID)}`, { params });
  return unwrapArray<AnyRecord>(payload);
}

export async function requestGeolocation(mode: "Live" | "All", payload: AnyRecord) {
  return api.post<ApiEnvelope<AnyRecord>>(mode === "Live" ? "/api/geolocation/live" : "/api/geolocation/history", payload);
}

export async function getRemoteControl(payload: AnyRecord) {
  return api.post<ApiEnvelope<AnyRecord[]>>("/api/mdm/remote-control", payload);
}

export async function lockUnlockDevice(payload: AnyRecord) {
  return api.post<ApiEnvelope<AnyRecord[]>>("/api/mdm/lock-unlock", payload);
}

export async function loadInitialData() {
  const departments = await getDepartments();
  return { departments };
}

export default {
  getDepartments,
  getDepartmentChildren,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getAssetsByRelationID,
  getHardwareInventoryAssets,
  getAssetDetail,
  moveAssetDepartment,
  getHardwareStatistic,
  getHardwareStatisticCategory,
  getHardwareReport,
  getClientListReport,
  getChangedItems,
  getDuplicateIps,
  createHardwareScanJob,
  sendTextMessage,
  getLiveGeolocation,
  getGeolocationHistory,
  requestGeolocation,
  getRemoteControl,
  lockUnlockDevice,
  loadInitialData,
};
