import api, { unwrapArray, type QueryParams } from "./apiClient";
import type { AssetItem } from "./commonService";

export const assets = {
  async getAll(params?: QueryParams) {
    const payload = await api.get("/api/assets", { params });
    return unwrapArray<AssetItem>(payload);
  },
  async getByCustomer(customerName: string) {
    const payload = await api.get("/api/assets", { params: { customerName } });
    return unwrapArray<AssetItem>(payload);
  },
  async search(search: string) {
    const payload = await api.get("/api/assets/search", { params: { search } });
    return unwrapArray<AssetItem>(payload);
  },
};

export default { assets };
