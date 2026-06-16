import { buildLegacyReportHtml } from "./reportPdfLegacyDesign";
import { buildExecutiveLegacyReportHtml } from "./reportPdfExecutiveDesign";

export function buildBuilderReportHtml(payload: any, filters: any, options: any = {}) {
  const id = String(payload?.report?.id || "").toLowerCase();
  const title = String(payload?.report?.title || payload?.narrative?.title || "").toLowerCase();
  const executive = id === "ai-executive-summary" || id === "executive-summary" || title.includes("executive summary");
  return executive ? buildExecutiveLegacyReportHtml(payload, filters, options) : buildLegacyReportHtml(payload, filters, options);
}
