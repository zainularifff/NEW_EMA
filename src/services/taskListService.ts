import api, { type ApiEnvelope, type QueryParams } from "./apiClient";

export type { ApiEnvelope } from "./apiClient";

type AnyRecord = Record<string, any>;

export type TaskListSearchPayload = AnyRecord & {
  classification?: string;
  state?: string;
  fromDate?: string;
  job_starttime?: string;
  limit?: number;
};

export async function getOptions<T = any>(): Promise<ApiEnvelope<T>> {
  return api.get<ApiEnvelope<T>>("/api/task-list/options");
}

export async function searchTasks<T = any>(payload: TaskListSearchPayload): Promise<ApiEnvelope<T>> {
  return api.post<ApiEnvelope<T>>("/api/task-list/search", payload);
}

export async function getTasks<T = any>(params?: QueryParams): Promise<ApiEnvelope<T>> {
  return api.get<ApiEnvelope<T>>("/api/task-list", { params });
}

export async function getTaskStatus<T = any>(jobId: number | string): Promise<ApiEnvelope<T>> {
  return api.get<ApiEnvelope<T>>(`/api/task-list/${jobId}/status`);
}

export async function getTaskProgressDetail<T = any>(jobId: number | string): Promise<ApiEnvelope<T>> {
  return api.get<ApiEnvelope<T>>(`/api/task-list/${jobId}/progress-detail`);
}

export async function getTaskTargets<T = any>(jobId: number | string): Promise<ApiEnvelope<T>> {
  return api.get<ApiEnvelope<T>>(`/api/task-list/${jobId}/targets`);
}

export async function getTaskDetail<T = any>(jobId: number | string): Promise<ApiEnvelope<T>> {
  return api.get<ApiEnvelope<T>>(`/api/task-list/${jobId}/detail`);
}

export async function runTaskAction<T = any>(jobId: number | string, payload: { action: string } & AnyRecord): Promise<ApiEnvelope<T>> {
  return api.post<ApiEnvelope<T>>(`/api/task-list/${jobId}/action`, payload);
}

export async function loadInitialData() {
  const options = await getOptions();
  return { options };
}

const taskListService = {
  getOptions,
  searchTasks,
  getTasks,
  getTaskStatus,
  getTaskProgressDetail,
  getTaskTargets,
  getTaskDetail,
  runTaskAction,
  loadInitialData,
};

export default taskListService;
