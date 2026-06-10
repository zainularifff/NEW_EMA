import api, { unwrapArray, unwrapData } from "./apiClient";

type AnyRecord = Record<string, any>;

export const users = {
  async getAll() {
    const payload = await api.get("/api/users");
    return unwrapArray<AnyRecord>(payload);
  },
  async getById(id: number | string) {
    const payload = await api.get(`/api/users/${id}`);
    return unwrapData<AnyRecord>(payload, {});
  },
};

export const roles = {
  async getAll() {
    const payload = await api.get("/api/roles");
    return unwrapArray<AnyRecord>(payload);
  },
};

export default { users, roles };
