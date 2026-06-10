import api, { unwrapArray, unwrapData, type QueryParams } from "./apiClient";
import { getAssetsByRelationID, getDepartments, type AnyRecord } from "./commonService";

export async function getSoftware(params?: QueryParams) {
  const payload = await api.get("/api/software", { params });
  return unwrapArray<AnyRecord>(payload);
}

export async function getSoftwareCategories() {
  const payload = await api.get("/api/software/categories");
  return unwrapArray<string>(payload);
}

export async function getSoftwareByRelation(relationID: number | string, params?: QueryParams) {
  const payload = await api.get(`/api/software/${relationID}`, { params });
  return unwrapArray<AnyRecord>(payload);
}

export async function getInstalledSoftwareByRelation(relationID: number | string, params?: QueryParams) {
  const payload = await api.get(`/api/software/relation/${relationID}/installed`, { params });
  return unwrapData(payload, payload);
}

export async function getSoftwarePackagesByRelation(relationID: number | string, params?: QueryParams) {
  const payload = await api.get(`/api/software/relation/${relationID}/packages`, { params });
  return unwrapData(payload, payload);
}

export async function getSoftwareFilesByRelation(relationID: number | string, params?: QueryParams) {
  const payload = await api.get(`/api/software/relation/${relationID}/files`, { params });
  return unwrapData(payload, payload);
}

export async function getSoftwareByClient(clientID: number | string, params?: QueryParams) {
  const payload = await api.get(`/api/software/client/${clientID}`, { params });
  return unwrapData(payload, payload);
}

export async function getSoftwareByMdmDevice(deviceID: string, params?: QueryParams) {
  const payload = await api.get(`/api/software/mdm/${encodeURIComponent(deviceID)}`, { params });
  return unwrapData(payload, payload);
}

export async function createSoftwareInventoryScan(payload: AnyRecord) {
  const response = await api.post("/api/software-inventory/scan", payload);
  return unwrapData(response, response);
}

export async function loadInitialData() {
  const [software, categories] = await Promise.all([getSoftware(), getSoftwareCategories()]);
  return { software, categories };
}

export default {
  getSoftware,
  getSoftwareCategories,
  getDepartments,
  getAssetsByRelationID,
  getSoftwareByRelation,
  getInstalledSoftwareByRelation,
  getSoftwarePackagesByRelation,
  getSoftwareFilesByRelation,
  getSoftwareByClient,
  getSoftwareByMdmDevice,
  createSoftwareInventoryScan,
  loadInitialData,
};
