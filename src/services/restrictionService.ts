import api, { unwrapArray, unwrapData, type QueryParams } from "./apiClient";

export type RestrictionModule = "appBlacklist" | "appWhitelist" | "webRestriction" | string;
export type RestrictionTreeNode = Record<string, any>;
export type RestrictionTarget = Record<string, any>;
export type RestrictionPolicyDetail = Record<string, any>;
export type RestrictionPolicyRow = Record<string, any>;
export type RestrictionStatusRow = Record<string, any>;
export type RestrictionPackage = Record<string, any>;
export type RestrictionPackageFile = Record<string, any>;
export type PackageManagerPayload = Record<string, any>;
export type WhitelistSoftware = Record<string, any>;
export type WebGroup = Record<string, any>;
export type WebGroupUrl = Record<string, any>;

function modulePath(module: RestrictionModule) {
  return encodeURIComponent(String(module));
}

function targetParams(target?: RestrictionTarget, extra?: QueryParams): QueryParams {
  return {
    target_type: target?.target_type ?? target?.targetType,
    target_id: target?.target_id ?? target?.targetId ?? target?.id,
    Object_Rel_Idn: target?.Object_Rel_Idn ?? target?.objectRelIdn,
    Object_Root_Idn: target?.Object_Root_Idn ?? target?.objectRootIdn,
    Object_Agent: target?.Object_Agent ?? target?.objectAgent,
    Object_DeviceID: target?.Object_DeviceID ?? target?.objectDeviceID,
    ...extra,
  };
}

export function getCurrentLoginId() {
  if (typeof window === "undefined") return "";
  const keys = ["ema-auth", "auth", "user", "ema-user", "currentUser", "authUser", "ema-current-user"];
  for (const key of keys) {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) || window.sessionStorage.getItem(key) || "null");
      const user = parsed?.user || parsed?.data?.user || parsed;
      const id = user?.userID || user?.username || user?.email || user?.name || user?.id;
      if (id) return String(id);
    } catch {
      // Try next key.
    }
  }
  return "";
}

export async function getTree() {
  const payload = await api.get("/api/restrictions/tree");
  return unwrapArray<RestrictionTreeNode>(payload);
}

export async function getEffectivePolicy(module: RestrictionModule, target?: RestrictionTarget) {
  const payload = await api.get(`/api/restrictions/${modulePath(module)}/effective-policy`, { params: targetParams(target) });
  return unwrapData<RestrictionPolicyDetail>(payload, {});
}

export async function getPolicyList(module: RestrictionModule, target?: RestrictionTarget) {
  const payload = await api.get(`/api/restrictions/${modulePath(module)}/policies`, { params: targetParams(target) });
  return unwrapArray<RestrictionPolicyRow>(payload);
}

export async function getRestrictionStatus(module: RestrictionModule, target?: RestrictionTarget, params?: QueryParams) {
  const payload = await api.get(`/api/restrictions/${modulePath(module)}/status`, { params: targetParams(target, params) });
  return unwrapArray<RestrictionStatusRow>(payload);
}

export async function savePolicy(module: RestrictionModule, payload: Record<string, any>) {
  const response = await api.post(`/api/restrictions/${modulePath(module)}/policy`, payload);
  return unwrapData(response, response);
}

export async function getPackages(params?: QueryParams) {
  const payload = await api.get("/api/restrictions/app/packages", { params });
  return unwrapArray<RestrictionPackage>(payload);
}

export async function getWhitelistSoftware(params?: QueryParams) {
  const payload = await api.get("/api/restrictions/whitelist/software", { params });
  return unwrapArray<WhitelistSoftware>(payload);
}

export async function getWebGroups(params?: QueryParams) {
  const payload = await api.get("/api/restrictions/web/groups", { params });
  return unwrapArray<WebGroup>(payload);
}

export async function getWebGroup(groupId: number | string) {
  const payload = await api.get(`/api/restrictions/web/groups/${groupId}`);
  return unwrapData<WebGroup>(payload, {});
}

export async function createWebGroup(name: string, urls: string[] = [], description = "") {
  const response = await api.post("/api/restrictions/web/groups", { name, urls, description });
  return unwrapData(response, response);
}

export async function updateWebGroup(groupId: number | string, name: string, description = "") {
  const response = await api.put(`/api/restrictions/web/groups/${groupId}`, { name, description });
  return unwrapData(response, response);
}

export async function deleteWebGroup(groupId: number | string) {
  return api.delete(`/api/restrictions/web/groups/${groupId}`);
}

export async function getWebGroupUrls(groupId: number | string) {
  const payload = await api.get(`/api/restrictions/web/groups/${groupId}/urls`);
  return unwrapArray<WebGroupUrl>(payload);
}

export async function addWebGroupUrl(groupId: number | string, url: string) {
  const response = await api.post(`/api/restrictions/web/groups/${groupId}/urls`, { url });
  return unwrapData(response, response);
}

export async function updateWebGroupUrl(groupId: number | string, seq: number | string, url: string) {
  const response = await api.put(`/api/restrictions/web/groups/${groupId}/urls/${seq}`, { url });
  return unwrapData(response, response);
}

export async function deleteWebGroupUrl(groupId: number | string, seq: number | string) {
  return api.delete(`/api/restrictions/web/groups/${groupId}/urls/${seq}`);
}

export async function getPackageManagerPackages(search = "", includeFiles = false) {
  const payload = await api.get("/api/restrictions/app/package-manager", { params: { search, includeFiles } });
  return unwrapArray<RestrictionPackage>(payload);
}

export async function getPackageManagerPackage(packageId: number | string) {
  const payload = await api.get(`/api/restrictions/app/package-manager/${packageId}`);
  return unwrapData<RestrictionPackage>(payload, {});
}

export async function createPackageManagerPackage(payload: PackageManagerPayload) {
  const response = await api.post("/api/restrictions/app/package-manager", payload);
  return response as { success?: boolean; data?: RestrictionPackage; message?: string };
}

export async function updatePackageManagerPackage(packageId: number | string, payload: PackageManagerPayload) {
  const response = await api.put(`/api/restrictions/app/package-manager/${packageId}`, payload);
  return response as { success?: boolean; data?: RestrictionPackage; message?: string };
}

export async function deletePackageManagerPackage(packageId: number | string) {
  return api.delete(`/api/restrictions/app/package-manager/${packageId}`);
}

export async function searchPackageManagerFiles(search = "", extension = "EXE") {
  const payload = await api.get("/api/restrictions/app/package-manager/file-search", { params: { search, extension } });
  return unwrapArray<RestrictionPackageFile>(payload);
}

export async function addPackageManagerFile(packageId: number | string, payload: RestrictionPackageFile) {
  const response = await api.post(`/api/restrictions/app/package-manager/${packageId}/files`, payload);
  return response as { success?: boolean; data?: RestrictionPackage; message?: string };
}

export async function updatePackageManagerFile(packageId: number | string, fileId: number | string, payload: RestrictionPackageFile) {
  const response = await api.put(`/api/restrictions/app/package-manager/${packageId}/files/${fileId}`, payload);
  return response as { success?: boolean; data?: RestrictionPackage; message?: string };
}

export async function deletePackageManagerFile(packageId: number | string, fileId: number | string) {
  const response = await api.delete(`/api/restrictions/app/package-manager/${packageId}/files/${fileId}`);
  return response as { success?: boolean; data?: RestrictionPackage; message?: string };
}

export async function loadInitialData() {
  const [tree, packages, whitelistSoftware, webGroups] = await Promise.all([
    getTree(),
    getPackages(),
    getWhitelistSoftware(),
    getWebGroups(),
  ]);
  return { tree, packages, whitelistSoftware, webGroups };
}

const restrictionService = {
  getCurrentLoginId,
  getTree,
  getEffectivePolicy,
  getPolicyList,
  getRestrictionStatus,
  savePolicy,
  getPackages,
  getWhitelistSoftware,
  getWebGroups,
  getWebGroup,
  createWebGroup,
  updateWebGroup,
  deleteWebGroup,
  getWebGroupUrls,
  addWebGroupUrl,
  updateWebGroupUrl,
  deleteWebGroupUrl,
  getPackageManagerPackages,
  getPackageManagerPackage,
  createPackageManagerPackage,
  updatePackageManagerPackage,
  deletePackageManagerPackage,
  searchPackageManagerFiles,
  addPackageManagerFile,
  updatePackageManagerFile,
  deletePackageManagerFile,
  loadInitialData,
};

export default restrictionService;
