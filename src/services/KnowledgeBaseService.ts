import api, { unwrapArray, unwrapData } from "./apiClient";

type AnyRecord = Record<string, any>;

function getId(row: AnyRecord) {
  return row?.id ?? row?.KnowledgeID ?? row?.knowledgeID ?? row?.kbId ?? row?.KBID;
}

export const knowledgeBase = {
  async getAll() {
    const payload = await api.get("/api/knowledge-base");
    return unwrapArray<AnyRecord>(payload);
  },
  async create(payload: AnyRecord) {
    const response = await api.post("/api/knowledge-base", payload);
    return unwrapData(response, response);
  },
  async update(payload: AnyRecord) {
    const id = getId(payload);
    if (!id) throw new Error("Knowledge base id is required for update.");
    const response = await api.put(`/api/knowledge-base/${id}`, payload);
    return unwrapData(response, response);
  },
  async delete(id: number | string) {
    return api.delete(`/api/knowledge-base/${id}`);
  },
};

export default { knowledgeBase };
