import api, { unwrapArray, unwrapData } from "./apiClient";

export type SoftwareDistributionPayload = Record<string, any>;

export async function getPackages() {
  const payload = await api.get("/api/software-distribution/packages");
  return unwrapArray<SoftwareDistributionPayload>(payload);
}

export async function getTargets() {
  const payload = await api.get("/api/software-distribution/targets");
  return unwrapArray<SoftwareDistributionPayload>(payload);
}

export async function createPackage(payload: SoftwareDistributionPayload | FormData) {
  const response = await api.post("/api/software-distribution/packages", payload);
  return unwrapData(response, response);
}

export async function deletePackage(packageName: string) {
  return api.delete(`/api/software-distribution/packages/${encodeURIComponent(packageName)}`);
}

export async function deletePackageVersion(packageName: string, version: string | number) {
  return api.delete(`/api/software-distribution/packages/${encodeURIComponent(packageName)}/versions/${encodeURIComponent(String(version))}`);
}

export async function sendPackage(payload: SoftwareDistributionPayload) {
  const response = await api.post("/api/software-distribution/send", payload);
  return unwrapData(response, response);
}

export async function loadInitialData() {
  const [packages, targets] = await Promise.all([getPackages(), getTargets()]);
  return { packages, targets };
}

export default { getPackages, getTargets, createPackage, deletePackage, deletePackageVersion, sendPackage, loadInitialData };
