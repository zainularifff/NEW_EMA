import api, { unwrapArray, unwrapData, type QueryParams } from "./apiClient";

export type AnyRecord = Record<string, any>;

export type DepartmentNode = AnyRecord & {
  Object_Rel_Idn?: number;
  Object_Rel_Name?: string;
  Object_Full_Name?: string;
  Object_PR_Idn?: number;
  children?: DepartmentNode[];
};

export type AssetItem = AnyRecord & {
  _Idn?: number;
  id?: number | string;
  Object_Root_Idn?: number;
  MDM_Asset_Idn?: number;
  Object_Agent?: string;
  Object_DeviceID?: string;
  ComputerName?: string;
  DeviceName?: string;
  PlatformType?: string;
  ConnectionStatus?: string;
  IP?: string;
  Object_Full_Name?: string;
  Object_Rel_Name?: string;
  Object_Rel_Idn?: number | string;
  Object_PR_Idn?: number | string;
};

export async function getDepartments() {
  const payload = await api.get("/api/departments");
  return unwrapData<DepartmentNode[]>(payload, []);
}

export async function getDepartmentChildren(parentID: number | string) {
  const payload = await api.get(`/api/departments/${parentID}`);
  return unwrapData<{ departments?: DepartmentNode[]; assets?: AssetItem[] }>(payload, { departments: [], assets: [] });
}

export async function getAssetsByRelationID(relationID: number | string) {
  const payload = await api.get(`/api/assets/${relationID}`);
  return unwrapArray<AssetItem>(payload);
}

export async function getAssets(params?: QueryParams) {
  const payload = await api.get("/api/assets", { params });
  return unwrapArray<AssetItem>(payload);
}

export async function getHardwareInventoryAssets(params?: QueryParams) {
  const payload = await api.get("/api/hardware-inventory/assets", { params });
  return unwrapArray<AssetItem>(payload);
}

export async function getAssetDetail(objectAgent: string, assetId: number | string) {
  const payload = await api.get(`/api/asset/${encodeURIComponent(objectAgent)}/${encodeURIComponent(String(assetId))}`);
  return unwrapData<AnyRecord>(payload, {});
}

export async function moveAssetDepartment(objectAgent: string, assetId: number | string, relationID: number | string) {
  const payload = await api.put(`/api/assets/${encodeURIComponent(objectAgent)}/${encodeURIComponent(String(assetId))}/department`, { relationID });
  return unwrapData<AnyRecord>(payload, {});
}

const commonService = {
  getDepartments,
  getDepartmentChildren,
  getAssets,
  getHardwareInventoryAssets,
  getAssetsByRelationID,
  getAssetDetail,
  moveAssetDepartment,
};

export default commonService;
