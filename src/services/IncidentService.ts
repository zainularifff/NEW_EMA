import api, { unwrapArray, unwrapData, type QueryParams } from "./apiClient";

type AnyRecord = Record<string, any>;

function getId(row: AnyRecord) {
  return row?.id ?? row?.IncidentID ?? row?.incidentID ?? row?.ticketId ?? row?.TicketID;
}

export const incidents = {
  async getAll(params?: QueryParams) {
    const payload = await api.get("/api/incidents", { params });
    return unwrapArray<AnyRecord>(payload);
  },
  async getById(id: number | string) {
    const payload = await api.get(`/api/incidents/${id}`);
    return unwrapData<AnyRecord>(payload, {});
  },
  async search(payload: AnyRecord) {
    const response = await api.post("/api/incidents/search", payload);
    return unwrapData(response, response);
  },
  async create(payload: AnyRecord) {
    const response = await api.post("/api/incidents", payload);
    return unwrapData(response, response);
  },
  async update(payload: AnyRecord) {
    const id = getId(payload);
    if (!id) throw new Error("Incident id is required for update.");
    const response = await api.put(`/api/incidents/${id}`, payload);
    return unwrapData(response, response);
  },
  async delete(id: number | string) {
    return api.delete(`/api/incidents/${id}`);
  },
};

export const incidentConfig = {
  async getAll() {
    const payload = await api.get("/api/incident-config");
    return unwrapArray<AnyRecord>(payload);
  },
  async getWorkingHours() {
    const payload = await api.get("/api/incident-config/working-hours");
    return unwrapArray<AnyRecord>(payload);
  },
  async getVisibilityConfig() {
    const payload = await api.get("/api/incident-config/visibility");
    return unwrapData<AnyRecord>(payload, {});
  },
};

export const incidentCategories = {
  async getAll() {
    const payload = await api.get("/api/incident-categories");
    return unwrapArray<AnyRecord>(payload);
  },
};

export default { incidents, incidentConfig, incidentCategories };
