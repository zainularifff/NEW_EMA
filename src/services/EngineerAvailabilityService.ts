import api, { unwrapArray, unwrapData, type QueryParams } from "./apiClient";

type AnyRecord = Record<string, any>;

export const engineerAvailability = {
  async getAll(params?: QueryParams) {
    const payload = await api.get("/api/engineer-availability", { params });
    return unwrapArray<AnyRecord>(payload);
  },
  async getAvailableEngineers(date?: string, supportLevel?: string) {
    const payload = await api.get("/api/engineer-availability/available-engineers", { params: { date, supportLevel } });
    return unwrapArray<AnyRecord>(payload);
  },
  async getEngineers(params?: QueryParams) {
    const payload = await api.get("/api/engineers", { params });
    return unwrapArray<AnyRecord>(payload);
  },
  async create(payload: AnyRecord) {
    const response = await api.post("/api/engineer-availability", payload);
    return unwrapData(response, response);
  },
  async update(id: number | string, payload: AnyRecord) {
    const response = await api.put(`/api/engineer-availability/${id}`, payload);
    return unwrapData(response, response);
  },
  async delete(id: number | string) {
    return api.delete(`/api/engineer-availability/${id}`);
  },
};

export default { engineerAvailability };
