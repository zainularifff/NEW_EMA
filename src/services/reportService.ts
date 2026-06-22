import api, { unwrapData, type QueryParams } from "./apiClient";

export type ReportFilters = Record<string, any>;

declare global {
  interface Window {
    __emaReportDateRange?: {
      preset: string;
      label: string;
      startDate: string;
      endDate: string;
    };
  }
}

function withSelectedDateRange(payload: ReportFilters) {
  if (typeof window === "undefined" || !window.__emaReportDateRange) return payload;
  const range = window.__emaReportDateRange;
  return {
    ...payload,
    dateRange: range.preset,
    dateRangeLabel: range.label,
    period: `${range.startDate} to ${range.endDate}`,
    startDate: range.startDate,
    endDate: range.endDate,
    fromDate: range.startDate,
    toDate: range.endDate,
  };
}

export async function getReportCatalog() {
  const payload = await api.get("/api/reports/catalog");
  return unwrapData(payload, payload);
}

export async function getReportOptions() {
  const payload = await api.get("/api/reports/options");
  return unwrapData(payload, {});
}

export async function previewReport(payload: ReportFilters) {
  return api.post("/api/reports/preview", withSelectedDateRange(payload));
}

export async function generateReport(payload: ReportFilters) {
  return api.post("/api/reports/generate", withSelectedDateRange(payload));
}

export async function getReport(reportId: string, params?: QueryParams) {
  return api.get(`/api/reports/${encodeURIComponent(reportId)}`, { params });
}

export async function loadInitialData() {
  const [catalog, options] = await Promise.all([getReportCatalog(), getReportOptions()]);
  return { catalog, options };
}

export default { getReportCatalog, getReportOptions, previewReport, generateReport, getReport, loadInitialData };
