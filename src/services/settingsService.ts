import api, { unwrapArray, unwrapData, type QueryParams } from "./apiClient";

type AnyRecord = Record<string, any>;
export type SettingsSection = "users" | "roles" | "modules" | "access" | "audit" | "pricing" | "aging" | "incident" | "resources" | "general";

function idFrom(row: AnyRecord, ...keys: string[]) {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== "") return row[key];
  }
  return row?.id;
}

export const settingsUsers = {
  async getAll() { const payload = await api.get("/api/settings/users"); return unwrapArray<AnyRecord>(payload); },
  async getById(id: number | string) { const payload = await api.get(`/api/settings/users/${id}`); return unwrapData<AnyRecord>(payload, {}); },
  async create(payload: AnyRecord) { return unwrapData(await api.post("/api/settings/users", payload)); },
  async update(id: number | string, payload: AnyRecord) { return unwrapData(await api.put(`/api/settings/users/${id}`, payload)); },
  async remove(id: number | string) { return api.delete(`/api/settings/users/${id}`); },
  async resetPassword(id: number | string, payload?: AnyRecord) { return unwrapData(await api.put(`/api/settings/users/${id}/reset-password`, payload || {})); },
  async setStatus(id: number | string, payload: AnyRecord) { return unwrapData(await api.put(`/api/settings/users/${id}/status`, payload)); },
  async lock(id: number | string, payload?: AnyRecord) { return unwrapData(await api.put(`/api/settings/users/${id}/lock`, payload || {})); },
  async unlock(id: number | string, payload?: AnyRecord) { return unwrapData(await api.put(`/api/settings/users/${id}/unlock`, payload || {})); },
  async setMfa(id: number | string, payload: AnyRecord) { return unwrapData(await api.put(`/api/settings/users/${id}/mfa`, payload)); },
  async reset2fa(id: number | string) { return unwrapData(await api.put(`/api/settings/users/${id}/2fa/reset`, {})); },
};

export const settingsRoles = {
  async getAll() { const payload = await api.get("/api/settings/roles"); return unwrapArray<AnyRecord>(payload); },
  async getById(id: number | string) { const payload = await api.get(`/api/settings/roles/${id}`); return unwrapData<AnyRecord>(payload, {}); },
  async create(payload: AnyRecord) { return unwrapData(await api.post("/api/settings/roles", payload)); },
  async update(id: number | string, payload: AnyRecord) { return unwrapData(await api.put(`/api/settings/roles/${id}`, payload)); },
  async remove(id: number | string) { return api.delete(`/api/settings/roles/${id}`); },
};

export const moduleAccess = {
  async get() { const payload = await api.get("/api/settings/module-access"); return unwrapData(payload, payload); },
  async save(payload: AnyRecord) { return unwrapData(await api.put("/api/settings/module-access", payload)); },
};

export const accessControls = {
  async getAll() { const payload = await api.get("/api/settings/access-controls"); return unwrapArray<AnyRecord>(payload); },
  async create(payload: AnyRecord) { return unwrapData(await api.post("/api/settings/access-controls", payload)); },
  async update(id: number | string, payload: AnyRecord) { return unwrapData(await api.put(`/api/settings/access-controls/${id}`, payload)); },
  async remove(id: number | string) { return api.delete(`/api/settings/access-controls/${id}`); },
};

export const auditLogs = {
  async get(params?: QueryParams | string) {
    const path = typeof params === "string" && params.trim()
      ? `/api/settings/audit-logs?${params}`
      : "/api/settings/audit-logs";
    const payload = typeof params === "string"
      ? await api.get(path)
      : await api.get(path, { params });
    return unwrapData(payload, payload);
  },
  async create(payload: AnyRecord) { return unwrapData(await api.post("/api/settings/audit-logs", payload)); },
  async exportEvent(payload: AnyRecord) { return unwrapData(await api.post("/api/settings/audit-logs/export-event", payload)); },
  async clear(params?: QueryParams) { return api.delete("/api/settings/audit-logs", { params }); },
};

export const devicePricing = {
  async getCategories() { const payload = await api.get("/api/settings/device-pricing/categories"); return unwrapArray<string>(payload); },
  async getBrands(category?: string) { const payload = await api.get("/api/settings/device-pricing/brands", { params: { category } }); return unwrapArray<string>(payload); },
  async getModels(category?: string, brand?: string) { const payload = await api.get("/api/settings/device-pricing/models", { params: { category, brand } }); return unwrapArray<string>(payload); },
  async getAll() { const payload = await api.get("/api/settings/device-pricing"); return unwrapArray<AnyRecord>(payload); },
  async saveAll(rows: AnyRecord[]) { return unwrapData(await api.post("/api/settings/device-pricing", rows)); },
  async saveRow(payload: AnyRecord) { return unwrapData(await api.post("/api/settings/device-pricing/row", payload)); },
  async update(id: number | string, payload: AnyRecord) { return unwrapData(await api.put(`/api/settings/device-pricing/${id}`, payload)); },
  async remove(id: number | string) { return api.delete(`/api/settings/device-pricing/${id}`); },
};

export const pcAgingRule = {
  async get() { const payload = await api.get("/api/settings/pc-aging-rule"); return unwrapData(payload, payload); },
  async save(payload: AnyRecord) { return unwrapData(await api.post("/api/settings/pc-aging-rule", payload)); },
  async update(payload: AnyRecord) { return unwrapData(await api.put("/api/settings/pc-aging-rule", payload)); },
};

export const incidentSettings = {
  async getSla() { const payload = await api.get("/api/settings/incident-config/sla"); return unwrapArray<AnyRecord>(payload); },
  async saveSla(payload: AnyRecord) { return unwrapData(await api.put("/api/settings/incident-config/sla", payload)); },
  async getWorkingHours() { const payload = await api.get("/api/settings/incident-config/working-hours"); return unwrapArray<AnyRecord>(payload); },
  async saveWorkingHours(payload: AnyRecord) { return unwrapData(await api.put("/api/settings/incident-config/working-hours", payload)); },
  async getFields() { const payload = await api.get("/api/settings/incident-config/fields"); return unwrapData(payload, payload); },
  async saveFields(payload: AnyRecord) { return unwrapData(await api.put("/api/settings/incident-config/fields", payload)); },
  async getCategories() { const payload = await api.get("/api/settings/incident-config/categories"); return unwrapData(payload, payload); },
  async createCategory(payload: AnyRecord) { return unwrapData(await api.post("/api/settings/incident-config/categories", payload)); },
  async updateCategory(id: number | string, payload: AnyRecord) { return unwrapData(await api.put(`/api/settings/incident-config/categories/${id}`, payload)); },
  async deleteCategory(id: number | string) { return api.delete(`/api/settings/incident-config/categories/${id}`); },
  async createSubcategory(categoryId: number | string, payload: AnyRecord) { return unwrapData(await api.post(`/api/settings/incident-config/categories/${categoryId}/subcategories`, payload)); },
  async updateSubcategory(id: number | string, payload: AnyRecord) { return unwrapData(await api.put(`/api/settings/incident-config/subcategories/${id}`, payload)); },
  async deleteSubcategory(id: number | string) { return api.delete(`/api/settings/incident-config/subcategories/${id}`); },
  async createDetail(subcategoryId: number | string, payload: AnyRecord) { return unwrapData(await api.post(`/api/settings/incident-config/subcategories/${subcategoryId}/details`, payload)); },
  async updateDetail(id: number | string, payload: AnyRecord) { return unwrapData(await api.put(`/api/settings/incident-config/details/${id}`, payload)); },
  async deleteDetail(id: number | string) { return api.delete(`/api/settings/incident-config/details/${id}`); },
};

export const resourcePlanning = {
  async getSchedules(params?: QueryParams) { const payload = await api.get("/api/engineer-availability", { params }); return unwrapArray<AnyRecord>(payload); },
  async getEngineers(params?: QueryParams) { const payload = await api.get("/api/engineers", { params }); return unwrapArray<AnyRecord>(payload); },
  async create(payload: AnyRecord) { return unwrapData(await api.post("/api/engineer-availability", payload)); },
  async update(id: number | string, payload: AnyRecord) { return unwrapData(await api.put(`/api/engineer-availability/${id}`, payload)); },
  async remove(id: number | string) { return api.delete(`/api/engineer-availability/${id}`); },
};

export async function loadSection(section: SettingsSection, params?: QueryParams) {
  switch (section) {
    case "users": return { users: await settingsUsers.getAll() };
    case "roles": return { roles: await settingsRoles.getAll() };
    case "modules": return { moduleAccess: await moduleAccess.get() };
    case "access": return { accessControls: await accessControls.getAll() };
    case "audit": return { auditLogs: await auditLogs.get(params) };
    case "pricing": {
      const [categories, rows] = await Promise.all([devicePricing.getCategories(), devicePricing.getAll()]);
      return { categories, rows };
    }
    case "aging": return { pcAgingRule: await pcAgingRule.get() };
    case "incident": {
      const [sla, workingHours, categories] = await Promise.all([incidentSettings.getSla(), incidentSettings.getWorkingHours(), incidentSettings.getCategories()]);
      return { sla, workingHours, categories };
    }
    case "resources": {
      const [schedules, engineers] = await Promise.all([resourcePlanning.getSchedules(), resourcePlanning.getEngineers()]);
      return { schedules, engineers };
    }
    case "general":
    default:
      return {};
  }
}

export async function loadInitialData() {
  // Light first paint for Settings. Heavier sections should call loadSection(section).
  const [users, roles, moduleAccessPayload] = await Promise.all([
    settingsUsers.getAll(),
    settingsRoles.getAll(),
    moduleAccess.get().catch(() => null),
  ]);
  return { users, roles, moduleAccess: moduleAccessPayload };
}

export default {
  settingsUsers,
  settingsRoles,
  moduleAccess,
  accessControls,
  auditLogs,
  devicePricing,
  pcAgingRule,
  incidentSettings,
  resourcePlanning,
  loadSection,
  loadInitialData,
};
