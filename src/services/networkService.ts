import api, { unwrapArray, unwrapData, type ApiEnvelope, type QueryParams } from "./apiClient";

type AnyRecord = Record<string, any>;

export type NetworkHierarchyNode = {
  id: string;
  label: string;
  type?: string;
  counts?: Record<string, number>;
  deviceDetails?: Record<string, AnyRecord[]>;
  details?: Array<{ label: string; value: string }>;
  children?: NetworkHierarchyNode[];
};

export async function getHierarchy() {
  const payload = await api.get<ApiEnvelope<NetworkHierarchyNode> | NetworkHierarchyNode>("/api/network/hierarchy");
  return unwrapData<NetworkHierarchyNode>(payload, {} as NetworkHierarchyNode);
}

export async function getSearchDate() {
  return api.get<ApiEnvelope<{ LastSearchDateStr?: string }> | { LastSearchDateStr?: string }>("/api/network/search-date");
}

export async function getWorkgroupCount() {
  const payload = await api.get<ApiEnvelope<AnyRecord[]> | AnyRecord[]>("/api/network/workgroup-count");
  return unwrapArray<AnyRecord>(payload);
}

export async function getDevices(params?: QueryParams) {
  return api.get<ApiEnvelope<AnyRecord[]> | AnyRecord[]>("/api/network/devices", { params });
}

export async function getIpAgent(ip: string) {
  const payload = await api.get<ApiEnvelope<AnyRecord[]> | AnyRecord[]>(`/api/network/ip/${encodeURIComponent(ip)}/agent`);
  return unwrapArray<AnyRecord>(payload);
}

export async function getIpObject(ip: string) {
  const payload = await api.get<ApiEnvelope<AnyRecord[]> | AnyRecord[]>(`/api/network/ip/${encodeURIComponent(ip)}/object`);
  return unwrapArray<AnyRecord>(payload);
}

export async function getSubnetDetails(subnet: string, params?: QueryParams) {
  return api.get<ApiEnvelope<AnyRecord[]> | AnyRecord[]>(`/api/network/subnet/${encodeURIComponent(subnet)}/details`, { params });
}

export async function getClient(clientID: number | string) {
  const payload = await api.get<ApiEnvelope<AnyRecord[]> | AnyRecord[]>(`/api/network/client/${clientID}`);
  return unwrapArray<AnyRecord>(payload);
}

export async function getObject(inventoryID: number | string) {
  const payload = await api.get<ApiEnvelope<AnyRecord[]> | AnyRecord[]>(`/api/network/object/${inventoryID}`);
  return unwrapArray<AnyRecord>(payload);
}

export async function getNetworkDeviceStatus(params?: QueryParams) {
  return api.get<ApiEnvelope<AnyRecord[]> | AnyRecord[]>("/api/network/network-device-status", { params });
}

export async function createNetworkDeviceStatus(payload: AnyRecord) {
  return api.post<ApiEnvelope<AnyRecord>>("/api/network/network-device-status", payload);
}

export async function updateNetworkDeviceStatus(id: number | string, payload: AnyRecord) {
  return api.put<ApiEnvelope<AnyRecord>>(`/api/network/network-device-status/${id}`, payload);
}

export async function deleteNetworkDeviceStatus(id: number | string) {
  return api.delete<ApiEnvelope<AnyRecord>>(`/api/network/network-device-status/${id}`);
}

export async function createNetworkScanJob(payload: AnyRecord) {
  const response = await api.post<ApiEnvelope<AnyRecord> | AnyRecord>("/api/network/scan", payload);
  return unwrapData<AnyRecord>(response, {});
}

export async function loadInitialData() {
  const [hierarchy, searchDate, workgroupCount] = await Promise.all([getHierarchy(), getSearchDate(), getWorkgroupCount()]);
  return { hierarchy, searchDate, workgroupCount };
}

export default {
  getHierarchy,
  getSearchDate,
  getWorkgroupCount,
  getDevices,
  getIpAgent,
  getIpObject,
  getSubnetDetails,
  getClient,
  getObject,
  getNetworkDeviceStatus,
  createNetworkDeviceStatus,
  updateNetworkDeviceStatus,
  deleteNetworkDeviceStatus,
  createNetworkScanJob,
  loadInitialData,
};
