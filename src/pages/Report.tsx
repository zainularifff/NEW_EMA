import { useEffect, useMemo, useState, type CSSProperties } from "react";
import "../styles/ema-layout.css";

type ReportType = "Summary" | "Detail" | "Audit" | "Compliance" | "Risk" | string;

type ReportTemplate = {
  id: string;
  title: string;
  description: string;
  type: ReportType;
  source: string;
  outputs: string[];
  category?: string;
  categoryDesc?: string;
  icon?: keyof typeof icons;
};

type ReportCategory = {
  name: string;
  desc: string;
  icon: keyof typeof icons;
  items: ReportTemplate[];
};

type ReportSection = {
  type: "kpi" | "bar" | "donut" | "risk" | "table" | string;
  title: string;
  rows: any[];
  columns?: string[];
};

type ReportPayload = {
  success: boolean;
  mode: string;
  generatedAt: string;
  report: ReportTemplate;
  filters: ReportFilters;
  metrics: Record<string, number | string>;
  narrative: {
    title: string;
    period: string;
    scope: string;
    executiveSummary: string;
    keyFindings: string[];
    managementConclusion: string;
    recommendations: string[];
  };
  sections: ReportSection[];
  recommendations: { priority: string; action: string }[];
  dataSources: { name: string; table: string; rows: number }[];
  exportData: Record<string, any[]>;
};

type ReportFilters = {
  dateRange: string;
  startDate?: string;
  endDate?: string;
  relationID: number;
  deviceGroup: string;
  status: string;
  outputFormat: string;
  includeChart: boolean;
  includeSummary: boolean;
  includeTable: boolean;
  includeRecommendation: boolean;
  clientName?: string;
  serviceType?: string;
  solutionVersion?: string;
  contractStart?: string;
  contractEnd?: string;
  contractedNodes?: number;
};

type ReportOptionItem = {
  value: string;
  label: string;
};

type ReportOptions = {
  sites: { id: number; name: string }[];
  groups: ReportOptionItem[];
  statuses: ReportOptionItem[];
  dateRanges: ReportOptionItem[];
  outputFormats: ReportOptionItem[];
};

type ScheduleDraft = {
  frequency: string;
  delivery: string;
  outputFormat: string;
  time: string;
  dayOfWeek: string;
  dayOfMonth: string;
};

type HistoryItem = {
  title: string;
  format: string;
  time: string;
  payload?: ReportPayload;
};

const icons = {
  chart:
    '<svg viewBox="0 0 24 24" fill="none"><path d="M5 20V10m7 10V4m7 16v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M4 20h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  device:
    '<svg viewBox="0 0 24 24" fill="none"><path d="M4 5h16v10H4V5Zm6 14h4m-7 0h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  asset:
    '<svg viewBox="0 0 24 24" fill="none"><path d="m12 3 8 4-8 4-8-4 8-4Zm-8 9 8 4 8-4M4 17l8 4 8-4" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  shield:
    '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3 20 6v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6l8-3Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  software:
    '<svg viewBox="0 0 24 24" fill="none"><path d="M7 7h10v10H7V7Zm-3 3H2m2 4H2m20-4h-2m2 4h-2M10 4V2m4 2V2m-4 20v-2m4 2v-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  geo:
    '<svg viewBox="0 0 24 24" fill="none"><path d="M12 21s7-4.6 7-11a7 7 0 1 0-14 0c0 6.4 7 11 7 11Z" stroke="currentColor" stroke-width="2"/><path d="M12 10.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" stroke="currentColor" stroke-width="2"/></svg>',
  remote:
    '<svg viewBox="0 0 24 24" fill="none"><path d="M6 5h12v9H6V5Zm4 14h4m-7 0h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="m17 9 3-3m0 0v3m0-3h-3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  ticket:
    '<svg viewBox="0 0 24 24" fill="none"><path d="M5 6h14v10H8l-3 3V6Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  data:
    '<svg viewBox="0 0 24 24" fill="none"><path d="M12 5c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3Zm-8 3v8c0 1.7 3.6 3 8 3s8-1.3 8-3V8M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" stroke="currentColor" stroke-width="1.9"/></svg>'
} as Record<string, string>;

const colors = {
  Summary: "#2563eb",
  Detail: "#10b981",
  Audit: "#7c3aed",
  Compliance: "#f59e0b",
  Risk: "#f43f5e"
} as Record<string, string>;

const emptyFilters: ReportFilters = {
  dateRange: "current-month",
  relationID: 0,
  deviceGroup: "all",
  status: "all",
  outputFormat: "PDF",
  includeChart: true,
  includeSummary: true,
  includeTable: true,
  includeRecommendation: true,
  clientName: "",
  serviceType: "Subscribe / Purchase",
  solutionVersion: "EMA System",
  contractStart: "",
  contractEnd: "",
  contractedNodes: 0
};

const fallbackOptions: ReportOptions = {
  sites: [],
  groups: [
    { value: "all", label: "All Groups" },
    { value: "em", label: "EM Devices" },
    { value: "mdm", label: "MDM Devices" }
  ],
  statuses: [
    { value: "all", label: "All Status" },
    { value: "online", label: "Online" },
    { value: "offline", label: "Offline" },
    { value: "stale", label: "Stale Sync" },
    { value: "locked", label: "Locked" }
  ],
  dateRanges: [
    { value: "current-month", label: "Current Month" },
    { value: "last-7-days", label: "Last 7 Days" },
    { value: "last-30-days", label: "Last 30 Days" },
    { value: "quarter-to-date", label: "Quarter to Date" },
    { value: "year-to-date", label: "Year to Date" },
    { value: "custom", label: "Custom Range" }
  ],
  outputFormats: [
    { value: "PDF", label: "PDF" },
    { value: "Excel", label: "Excel / CSV" },
    { value: "PowerPoint", label: "PowerPoint" }
  ]
};

const FRONTEND_REPORT_CATALOG: ReportCategory[] = [
  {
    name: "Featured Reports",
    desc: "Six focused report packs. Each card represents one report module only.",
    icon: "chart",
    items: [
      {
        id: "ai-executive-summary",
        title: "AI Executive Summary Report",
        description: "High-level management summary only: overall posture, key findings and priority recommendations.",
        type: "Summary",
        source: "Endpoint Inventory + Service Desk + Software Inventory + Jobs + Geolocation",
        outputs: ["PDF", "PowerPoint", "Excel"]
      },
      {
        id: "client-summary-rnr",
        title: "Client Risk & Resource Planning Report",
        description: "Client-facing Risk & Resources pack based on the agreed RNR reporting format.",
        type: "Summary",
        source: "Endpoint Inventory + Subscription + Asset Pricing + Software Inventory + Browser Risk",
        outputs: ["PDF", "PowerPoint", "Excel"]
      },
      {
        id: "hardware-asset-lifecycle",
        title: "Hardware & Asset Lifecycle Report",
        description: "Hardware lifecycle report only: asset estate, device age and replacement planning.",
        type: "Summary",
        source: "Hardware Inventory + Asset Lifecycle + Endpoint Inventory",
        outputs: ["PDF", "Excel"]
      },
      {
        id: "operations-health-sla",
        title: "Operations Health & SLA Report",
        description: "Operations report only: endpoint health, service activity and SLA follow-up.",
        type: "Summary",
        source: "Endpoint Inventory + Jobs + HD_Incidents + SLA Due",
        outputs: ["PDF", "PowerPoint", "Excel"]
      },
      {
        id: "security-compliance-exposure",
        title: "Security & Compliance Exposure Report",
        description: "Security exposure report only: endpoint risk, compliance gaps and exception action list.",
        type: "Risk",
        source: "Device Status + OS Inventory + Software Inventory + Data Quality + Service Desk SLA",
        outputs: ["PDF", "Excel"]
      },
      {
        id: "software-application-governance",
        title: "Software & Application Governance Report",
        description: "Software governance report only: application inventory, licence review and cleanup actions.",
        type: "Compliance",
        source: "TSMDM_SW_LIST + TS_SW_CATEGORY + Application Metering + Browser Inventory",
        outputs: ["PDF", "Excel"]
      }
    ]
  }
];

type FeaturedReportBlueprint = {
  eyebrow: string;
  icon: keyof typeof icons;
  intent: string;
  bestFor: string;
  accent: string;
  sections: string[];
  deliverables: string[];
};

const FEATURED_REPORT_BLUEPRINTS: Record<string, FeaturedReportBlueprint> = {
  "ai-executive-summary": {
    eyebrow: "Gemini Flash Narrative",
    icon: "chart",
    intent: "Management summary only: concise KPI overview, key findings and recommended action.",
    bestFor: "CEO / manager review, monthly update, quick operational status.",
    accent: "#2563eb",
    sections: ["Executive summary", "KPI snapshot", "Key findings", "Recommended action"],
    deliverables: ["AI narrative", "Management PDF", "PowerPoint summary"]
  },
  "client-summary-rnr": {
    eyebrow: "Client RNR Pack",
    icon: "shield",
    intent: "Client-facing report pack for renewal, risk and resource planning discussion.",
    bestFor: "Client QBR, subscription review, refresh planning, risk/resource meeting.",
    accent: "#0f766e",
    sections: [
      "Client / solution / company logo cover",
      "Subscription summary: service type, version, contract, total nodes",
      "Endpoint management: PC, Windows OS, coverage, benefits, endpoint type",
      "Endpoint analytics result and total endpoint type",
      "Location / department grouping",
      "Endpoint aging by location",
      "OS supported and Windows compliance",
      "Resource planning by PC brand",
      "Application purchasing: Microsoft / Adobe",
      "Sensitive application: remote tools",
      "Games, antivirus, unwanted and unauthorized software",
      "Browser vulnerability"
    ],
    deliverables: ["Client PDF", "Resource planning table", "Application risk appendix"]
  },
  "hardware-asset-lifecycle": {
    eyebrow: "Hardware Lifecycle",
    icon: "asset",
    intent: "Hardware estate and lifecycle readiness view for replacement and inventory planning.",
    bestFor: "Procurement planning, asset refresh, missing hardware data cleanup.",
    accent: "#7c3aed",
    sections: ["Hardware estate summary", "Brand/model distribution", "Endpoint type distribution", "PC age / BIOS age", "Aging candidates", "Missing hardware information", "Replacement planning"],
    deliverables: ["Lifecycle PDF", "Hardware inventory export", "Replacement candidate list"]
  },
  "operations-health-sla": {
    eyebrow: "Operations Health",
    icon: "device",
    intent: "Operations health report for endpoint status, service activity and SLA follow-up.",
    bestFor: "Operations review, SLA monitoring, weekly service health check.",
    accent: "#0ea5e9",
    sections: ["Endpoint availability", "Online / offline / stale sync", "Locked or not reporting devices", "Job execution status", "Open tickets", "SLA breach candidates", "Support workload"],
    deliverables: ["Operations PDF", "SLA evidence", "Follow-up action queue"]
  },
  "security-compliance-exposure": {
    eyebrow: "Security Exposure",
    icon: "shield",
    intent: "Risk and compliance exposure report for endpoint exceptions and management attention.",
    bestFor: "Security review, audit prep, compliance exception tracking.",
    accent: "#ef4444",
    sections: ["High-risk endpoint exposure", "Unsupported OS", "Duplicate IP / identity conflict", "Offline and stale exposure", "Locked device state", "Unauthorized software", "Compliance action list"],
    deliverables: ["Risk PDF", "Exception register", "Compliance action table"]
  },
  "software-application-governance": {
    eyebrow: "Application Governance",
    icon: "software",
    intent: "Software governance report for inventory, licence review and cleanup action.",
    bestFor: "License review, app cleanup, application governance meeting.",
    accent: "#f59e0b",
    sections: ["Software estate summary", "Purchasing candidates", "Microsoft / Adobe usage", "Sensitive remote tools", "Games", "Antivirus", "Unwanted software", "Unauthorized software", "Browser vulnerability"],
    deliverables: ["Software PDF", "Application list export", "Governance action list"]
  }
};

function getFeaturedReportBlueprint(reportId?: string): FeaturedReportBlueprint {
  return FEATURED_REPORT_BLUEPRINTS[reportId || ""] || FEATURED_REPORT_BLUEPRINTS["ai-executive-summary"];
}

function getFeaturedReportNumber(reports: ReportTemplate[], report?: ReportTemplate | null) {
  const index = reports.findIndex((item) => item.id === report?.id);
  return index >= 0 ? String(index + 1).padStart(2, "0") : "--";
}

function getApiBases() {
  const viteBase = (import.meta as any)?.env?.VITE_API_URL || (import.meta as any)?.env?.VITE_API_BASE_URL || "";
  const configured = String(viteBase || "").replace(/\/$/, "");

  // First use project config/proxy. If Vite proxy is not configured, fall back to the backend port used by server.js.
  return Array.from(new Set([configured, "", "http://localhost:3001"].filter((item) => item !== null && item !== undefined)));
}

function pickTokenFromJson(value: string | null) {
  if (!value) return "";
  try {
    const parsed = JSON.parse(value);
    return String(parsed?.token || parsed?.accessToken || parsed?.authToken || parsed?.jwt || parsed?.data?.token || parsed?.user?.token || "");
  } catch {
    return "";
  }
}

function getAuthToken() {
  const keys = [
    "token",
    "accessToken",
    "authToken",
    "emaToken",
    "ema_token",
    "access_token",
    "auth_token",
    "jwt",
    "userToken"
  ];

  for (const storage of [localStorage, sessionStorage]) {
    for (const key of keys) {
      const value = storage.getItem(key);
      if (value) return value;
    }

    for (const key of ["user", "auth", "authUser", "emaUser", "currentUser", "loginUser"]) {
      const token = pickTokenFromJson(storage.getItem(key));
      if (token) return token;
    }
  }

  return "";
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>)
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  let lastError: Error | null = null;

  for (const base of getApiBases()) {
    try {
      const response = await fetch(`${base}${path}`, {
        ...options,
        headers,
        credentials: "include"
      });

      const text = await response.text();
      let payload: any = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(`Invalid JSON from ${base || "current origin"}${path}. Check Vite proxy or set VITE_API_URL=http://localhost:3001`);
      }

      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.message || payload?.error || `Report request failed: ${response.status}`);
      }

      return payload as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error("Report Center request failed.");
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatGeneratedTime() {
  return new Date().toLocaleString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatLabel(value: string) {
  return String(value || "")
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^./, (char) => char.toUpperCase());
}

function valueText(value: any) {
  if (value === null || value === undefined || value === "") return "-";
  if (String(value).includes("T") && !Number.isNaN(new Date(value).getTime())) return formatDateTime(value);
  return String(value);
}

function getPreviewRows(report?: ReportTemplate, payload?: ReportPayload) {
  if (payload?.sections?.length) return payload.sections.map((section) => section.title);
  if (!report) return ["Select report template", "Configure filters", "Preview output", "Generate report"];
  if (report.type === "Detail") return ["Report title and filter summary", "Detailed record table", "Exception indicator", "Export-ready dataset", "Operational notes"];
  if (report.type === "Audit") return ["Audit scope and period", "Access / action summary", "User activity trail", "Exception log", "Evidence-ready output"];
  if (report.type === "Risk") return ["Risk summary", "Severity breakdown", "Affected endpoints", "Business impact", "Recommended action"];
  return ["Executive summary", "KPI snapshot", "Visual section", "Management findings", "Recommended action"];
}

function normalizeOptionList(items: any[] | undefined, fallback: ReportOptionItem[]) {
  if (!Array.isArray(items) || items.length === 0) return fallback;
  return items.map((item) => {
    if (typeof item === "string") {
      const value = item.toLowerCase().replace(/\s+/g, "-").replace("all-status", "all");
      return { value, label: item };
    }
    return {
      value: String(item.value ?? item.id ?? item.name ?? "").trim() || "all",
      label: String(item.label ?? item.name ?? item.value ?? "All").trim() || "All"
    };
  });
}

function allowedOutputs(report?: ReportTemplate, options?: ReportOptions) {
  const base = (options?.outputFormats?.length ? options.outputFormats : fallbackOptions.outputFormats).map((item) => item.value);
  const reportOutputs = report?.outputs?.length ? report.outputs : [];
  const merged = [...reportOutputs, ...base, "PDF", "Excel", "PowerPoint"];
  return Array.from(new Set(merged.filter(Boolean)));
}

function outputLabel(value: string) {
  const found = fallbackOptions.outputFormats.find((item) => item.value === value);
  return found?.label || value;
}

function downloadPowerPoint(payload: ReportPayload) {
  const sections = payload.sections
    .map((section) => {
      const rows = (section.rows || []).slice(0, 8);
      const list = rows
        .map((row) => `<li>${Object.entries(row).slice(0, 4).map(([key, value]) => `<strong>${formatLabel(key)}:</strong> ${valueText(value)}`).join(" &nbsp; ")}</li>`)
        .join("");
      return `<div class="slide"><h2>${section.title}</h2><ul>${list || "<li>No matching records for this section.</li>"}</ul></div>`;
    })
    .join("");

  const body = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:p="urn:schemas-microsoft-com:office:powerpoint" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><title>${payload.report.title}</title></head>
      <body style="font-family:Arial,sans-serif;color:#0f2347">
        <div class="slide"><h1>${payload.report.title}</h1><p>${payload.narrative.executiveSummary}</p><p><small>${formatDateTime(payload.generatedAt)}</small></p></div>
        <div class="slide"><h2>Key Findings</h2><ul>${payload.narrative.keyFindings.map((item) => `<li>${item}</li>`).join("")}</ul></div>
        ${sections}
        <div class="slide"><h2>Recommended Actions</h2><ol>${payload.recommendations.map((item) => `<li><strong>${item.priority}</strong> ${item.action}</li>`).join("")}</ol></div>
      </body>
    </html>`;
  const blob = new Blob([body], { type: "application/vnd.ms-powerpoint;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${payload.report.id}-${Date.now()}.ppt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function applyOutputAction(payload: ReportPayload, format: string) {
  if (format === "Excel" || format === "CSV") downloadCsv(payload);
  if (format === "PowerPoint") downloadPowerPoint(payload);
}

function SearchIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path d="m21 21-4.3-4.3M10.8 18.2a7.4 7.4 0 1 1 0-14.8 7.4 7.4 0 0 1 0 14.8Z" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path d="M12 3v11m0 0 4-4m-4 4-4-4M4 17v3h16v-3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function flattenExportRows(payload: ReportPayload) {
  const reportId = payload.report.id;
  if (reportId === "client-summary-rnr") return payload.exportData.clientSummarySections || payload.exportData.assets || [];
  if (reportId.includes("resource-planning") || reportId.includes("brand-summary")) return payload.exportData.resourcePlanningModels || payload.exportData.resourcePlanningBrandSummary || payload.exportData.assets || [];
  if (reportId.includes("ticket") || reportId.includes("sla") || reportId.includes("incident") || reportId.includes("workload")) return payload.exportData.incidents || [];
  if (reportId.includes("software")) return payload.exportData.software || [];
  if (reportId.includes("remote") || reportId.includes("metering") || reportId.includes("distribution")) return payload.exportData.jobs || [];
  if (reportId.includes("geo") || reportId.includes("location")) return payload.exportData.geo || [];
  return payload.exportData.assets || [];
}

function downloadCsv(payload: ReportPayload) {
  const rows = flattenExportRows(payload);
  const first = rows[0] || {};
  const columns = Object.keys(first).length ? Object.keys(first) : ["message"];
  const csvRows = [columns.join(",")];

  if (!rows.length) {
    csvRows.push(`"No records returned for ${payload.report.title}"`);
  } else {
    rows.forEach((row) => {
      csvRows.push(
        columns
          .map((column) => `"${String(row[column] ?? "").replace(/"/g, '""')}"`)
          .join(",")
      );
    });
  }

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${payload.report.id}-${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadHtmlSummary(payload: ReportPayload) {
  const body = `
    <html><head><meta charset="utf-8"><title>${payload.report.title}</title></head>
    <body style="font-family:Arial,sans-serif;padding:32px;color:#102450">
      <h1>${payload.report.title}</h1>
      <h2>Executive Narrative</h2>
      <p>${payload.narrative.executiveSummary}</p>
      <h2>Key Findings</h2>
      <ul>${payload.narrative.keyFindings.map((item) => `<li>${item}</li>`).join("")}</ul>
      <h2>Recommended Actions</h2>
      <ol>${payload.recommendations.map((item) => `<li><strong>${item.priority}</strong> ${item.action}</li>`).join("")}</ol>
      <p><small>Generated ${formatDateTime(payload.generatedAt)}</small></p>
    </body></html>`;
  const blob = new Blob([body], { type: "text/html;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${payload.report.id}-management-summary.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function BarSection({ section }: { section: ReportSection }) {
  const max = Math.max(1, ...section.rows.map((row) => Number(row.value || 0)));
  return (
    <div className="report-card dynamic-report-card">
      <h3>{section.title}</h3>
      <div className="horizontal-bar-list">
        {section.rows.length === 0 && <p className="report-empty">No matching data available.</p>}
        {section.rows.map((row, index) => {
          const width = Math.max(4, Math.round((Number(row.value || 0) / max) * 100));
          return (
            <div className="bar-row-report" key={`${row.label}-${index}`}>
              <span>{row.label || "Unspecified"}</span>
              <div className="bar-track-report">
                <i className="bar-fill-report" style={{ "--w": `${width}%` } as CSSProperties} />
              </div>
              <b>{row.value}</b>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DonutSection({ section }: { section: ReportSection }) {
  const rows = section.rows.slice(0, 4);
  const total = rows.reduce((sum, row) => sum + Number(row.value || 0), 0) || 1;
  let cursor = 0;
  const colorsList = ["#10b981", "#f59e0b", "#f43f5e", "#94a3b8"];
  const stops = rows.map((row, index) => {
    const start = cursor;
    const size = (Number(row.value || 0) / total) * 100;
    cursor += size;
    return `${colorsList[index]} ${start}% ${cursor}%`;
  });

  return (
    <div className="report-card dynamic-report-card">
      <h3>{section.title}</h3>
      <div className="donut-report" style={{ background: `conic-gradient(${stops.join(", ")})` }}>
        <div className="donut-inner-report">
          <div>
            <span>Total</span>
            <strong>{total}</strong>
          </div>
        </div>
      </div>
      <div className="legend-report">
        {rows.map((row, index) => (
          <div key={`${row.label}-${index}`}>
            <i style={{ background: colorsList[index] }} /> {row.label}: {row.value}
          </div>
        ))}
      </div>
    </div>
  );
}

function KpiSection({ section }: { section: ReportSection }) {
  return (
    <section className="report-section">
      <div className="section-head">
        <div>
          <h2>{section.title}</h2>
          <p>KPI snapshot for the selected reporting scope.</p>
        </div>
        <span className="section-tag">KPI</span>
      </div>
      <div className="report-kpi-grid">
        {section.rows.map((row, index) => (
          <div className="report-kpi" key={`${row.label}-${index}`} style={{ "--accent": colorsListForIndex(index) } as CSSProperties}>
            <span>{row.label}</span>
            <strong>{row.value}</strong>
            <small>{row.note}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function colorsListForIndex(index: number) {
  return ["#2563eb", "#10b981", "#f59e0b", "#f43f5e", "#7c3aed"][index % 5];
}

function RiskSection({ section }: { section: ReportSection }) {
  return (
    <section className="report-section">
      <div className="section-head">
        <div>
          <h2>{section.title}</h2>
          <p>Management attention areas prepared from current operational records.</p>
        </div>
        <span className="section-tag">Risk</span>
      </div>
      <div className="report-table-wrap report-risk-wrap">
        <table className="report-table report-risk-table">
          <thead>
            <tr>
              <th>Area</th>
            <th>Severity</th>
            <th>Finding</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {section.rows.map((row, index) => (
            <tr key={`${row.area}-${index}`}>
              <td>{row.area}</td>
              <td>
                <span className={`risk-pill ${String(row.severity).toLowerCase().includes("high") ? "risk-high" : String(row.severity).toLowerCase().includes("medium") ? "risk-med" : "risk-low"}`}>{row.severity}</span>
              </td>
              <td>{row.finding}</td>
              <td>{row.action}</td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TableSection({ section }: { section: ReportSection }) {
  const columns = section.columns?.length ? section.columns : Object.keys(section.rows[0] || {});
  return (
    <section className="report-section">
      <div className="section-head">
        <div>
          <h2>{section.title}</h2>
          <p>{section.rows.length} item(s) included for this section.</p>
        </div>
        <span className="section-tag">Table</span>
      </div>
      <div className="report-table-wrap">
        <table className="report-table report-detail-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{formatLabel(column)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {section.rows.length === 0 && (
              <tr>
                <td colSpan={Math.max(columns.length, 1)}>No matching records for this report and filter.</td>
              </tr>
            )}
            {section.rows.slice(0, 25).map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((column) => (
                  <td key={column}>{valueText(row[column])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {section.rows.length > 25 && <p className="report-table-note">Showing first 25 records in the PDF preview. Full detail is available in Excel/CSV export.</p>}
    </section>
  );
}


type ReportVisualProfile = {
  key: string;
  label: string;
  eyebrow: string;
  accent: string;
  softAccent: string;
  storyTitle: string;
  storyHelp: string;
  heroMetricLabel: string;
};

function getReportProfile(report: ReportTemplate): ReportVisualProfile {
  const id = String(report.id || "").toLowerCase();
  const title = String(report.title || "").toLowerCase();
  const category = String(report.category || "").toLowerCase();
  const haystack = `${id} ${title} ${category}`;

  if (haystack.includes("risk") || haystack.includes("security") || haystack.includes("compliance") || haystack.includes("duplicate") || haystack.includes("sla")) {
    return {
      key: "risk",
      label: "Risk Register Layout",
      eyebrow: "Risk & Control Evidence",
      accent: "#ef4444",
      softAccent: "rgba(239,68,68,.10)",
      storyTitle: "Risk Interpretation",
      storyHelp: "Highlights exposure, business impact and control action.",
      heroMetricLabel: "Risk Items"
    };
  }

  if (haystack.includes("software") || haystack.includes("application-metering") || haystack.includes("distribution") || haystack.includes("unauthorized") || haystack.includes("outdated")) {
    return {
      key: "software",
      label: "Software Portfolio Layout",
      eyebrow: "Software & Deployment Evidence",
      accent: "#7c3aed",
      softAccent: "rgba(124,58,237,.10)",
      storyTitle: "Software Inventory Interpretation",
      storyHelp: "Highlights application coverage, category concentration and deployment status.",
      heroMetricLabel: "Software Rows"
    };
  }

  if (haystack.includes("geo") || haystack.includes("location") || haystack.includes("indoor")) {
    return {
      key: "geo",
      label: "Location Evidence Layout",
      eyebrow: "Location Coverage Evidence",
      accent: "#0891b2",
      softAccent: "rgba(8,145,178,.10)",
      storyTitle: "Location Coverage Interpretation",
      storyHelp: "Highlights tracked devices, missing coverage and location-quality exceptions.",
      heroMetricLabel: "Tracked Devices"
    };
  }

  if (haystack.includes("remote") || haystack.includes("audit") || haystack.includes("metering")) {
    return {
      key: "audit",
      label: "Audit Timeline Layout",
      eyebrow: "Activity Evidence & Traceability",
      accent: "#0f766e",
      softAccent: "rgba(15,118,110,.10)",
      storyTitle: "Audit Interpretation",
      storyHelp: "Highlights traceability, initiator, timestamp and exception evidence.",
      heroMetricLabel: "Activity Rows"
    };
  }

  if (haystack.includes("ticket") || haystack.includes("incident") || haystack.includes("support") || haystack.includes("workload")) {
    return {
      key: "service",
      label: "Service Desk SLA Layout",
      eyebrow: "Ticket & SLA Operations",
      accent: "#f97316",
      softAccent: "rgba(249,115,22,.10)",
      storyTitle: "Service Desk Interpretation",
      storyHelp: "Highlights ticket pressure, SLA exposure and workload ownership.",
      heroMetricLabel: "Open Tickets"
    };
  }

  if (haystack.includes("asset") || haystack.includes("hardware") || haystack.includes("registry") || haystack.includes("lifecycle") || haystack.includes("replacement")) {
    return {
      key: "register",
      label: "Asset Ledger Layout",
      eyebrow: "Inventory Register & Lifecycle",
      accent: "#2563eb",
      softAccent: "rgba(37,99,235,.10)",
      storyTitle: "Asset Register Interpretation",
      storyHelp: "Highlights device register, lifecycle readiness and inventory completeness.",
      heroMetricLabel: "Inventory Rows"
    };
  }

  if (haystack.includes("data") || haystack.includes("missing") || haystack.includes("invalid") || haystack.includes("telemetry")) {
    return {
      key: "data",
      label: "Data Quality Layout",
      eyebrow: "Reporting Confidence & Data Quality",
      accent: "#6366f1",
      softAccent: "rgba(99,102,241,.10)",
      storyTitle: "Data Quality Interpretation",
      storyHelp: "Highlights completeness, duplicate records and reporting confidence.",
      heroMetricLabel: "Data Issues"
    };
  }

  if (haystack.includes("endpoint") || haystack.includes("offline") || haystack.includes("stale") || haystack.includes("locked") || haystack.includes("operations")) {
    return {
      key: "operations",
      label: "Operations Health Layout",
      eyebrow: "Endpoint Operations Health",
      accent: "#0ea5e9",
      softAccent: "rgba(14,165,233,.10)",
      storyTitle: "Operations Interpretation",
      storyHelp: "Highlights endpoint availability, stale telemetry and operational exceptions.",
      heroMetricLabel: "Online Rate"
    };
  }

  return {
    key: "executive",
    label: "Executive Board Layout",
    eyebrow: "Executive Management Pack",
    accent: "#1d4ed8",
    softAccent: "rgba(29,78,216,.10)",
    storyTitle: "Management Interpretation",
    storyHelp: "A compact management summary with score, findings and action priorities.",
    heroMetricLabel: "Ops Score"
  };
}

function numberMetric(payload: ReportPayload, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = payload.metrics?.[key];
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) return numeric;
  }
  return fallback;
}

function getHeroMetric(payload: ReportPayload, profile: ReportVisualProfile) {
  if (profile.key === "risk") return String(numberMetric(payload, ["slaBreached", "duplicateIpGroups"]) + numberMetric(payload, ["offlineEndpoints"]));
  if (profile.key === "software") return String(numberMetric(payload, ["totalSoftwareRecords"]));
  if (profile.key === "geo") return String(numberMetric(payload, ["geolocationDevices", "geolocationRecords"]));
  if (profile.key === "audit") return String(numberMetric(payload, ["totalJobs"]));
  if (profile.key === "service") return String(numberMetric(payload, ["openTickets", "totalTickets"]));
  if (profile.key === "register") return String(numberMetric(payload, ["totalEndpoints"]));
  if (profile.key === "data") return String(numberMetric(payload, ["missingIp"]) + numberMetric(payload, ["missingModel"]) + numberMetric(payload, ["missingMapping"]));
  if (profile.key === "operations") return `${numberMetric(payload, ["onlineRate"])}%`;
  return `${numberMetric(payload, ["operationalScore"])}%`;
}

function firstSection(sections: ReportSection[], type: string) {
  return sections.find((section) => section.type === type);
}

function sectionGroup(sections: ReportSection[], types: string[]) {
  return sections.filter((section) => types.includes(String(section.type)));
}


function getReportSkin(report: ReportTemplate) {
  const id = String(report.id || "").toLowerCase();
  const title = String(report.title || "").toLowerCase();
  const haystack = `${id} ${title}`;
  if (haystack.includes("monthly") || haystack.includes("dashboard")) return "dashboard-pack";
  if (haystack.includes("action")) return "action-pack";
  if (haystack.includes("risk") || haystack.includes("security") || haystack.includes("sla-risk")) return "risk-register";
  if (haystack.includes("health") || haystack.includes("offline") || haystack.includes("stale") || haystack.includes("locked")) return "ops-board";
  if (haystack.includes("registry") || haystack.includes("hardware") || haystack.includes("asset") || haystack.includes("lifecycle")) return "asset-ledger";
  if (haystack.includes("software") || haystack.includes("application") || haystack.includes("distribution")) return "software-portfolio";
  if (haystack.includes("geo") || haystack.includes("location")) return "location-pack";
  if (haystack.includes("remote") || haystack.includes("audit")) return "audit-pack";
  if (haystack.includes("ticket") || haystack.includes("incident") || haystack.includes("workload") || haystack.includes("sla")) return "service-pack";
  if (haystack.includes("data") || haystack.includes("missing") || haystack.includes("duplicate") || haystack.includes("telemetry")) return "quality-pack";
  return "board-pack";
}

function topKpiRows(sections: ReportSection[], limit = 4) {
  const kpi = firstSection(sections, "kpi");
  return (kpi?.rows || []).slice(0, limit);
}

function firstTableSection(sections: ReportSection[]) {
  return sections.find((section) => section.type === "table" && section.rows?.length);
}

function ProfileDesignStrip({ payload, profile }: { payload: ReportPayload; profile: ReportVisualProfile }) {
  const rows = topKpiRows(payload.sections, 4);
  if (!rows.length) return null;
  return (
    <section className={`report-section design-strip-section strip-${profile.key}`}>
      <div className="design-strip-grid">
        {rows.map((row, index) => (
          <div className="design-strip-card" key={`${row.label}-${index}`} style={{ "--template-accent": colorsListForIndex(index) } as CSSProperties}>
            <span>{row.label}</span>
            <strong>{row.value}</strong>
            <small>{row.note}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function ExecutiveSnapshotBoard({ payload, profile }: { payload: ReportPayload; profile: ReportVisualProfile }) {
  const rows = topKpiRows(payload.sections, 5);
  const risk = firstSection(payload.sections, "risk");
  return (
    <section className="report-section executive-snapshot-board">
      <div className="executive-score-tile" style={{ "--template-accent": profile.accent } as CSSProperties}>
        <span>Management Score</span>
        <strong>{payload.metrics.operationalScore || 0}%</strong>
        <p>{payload.narrative.managementConclusion}</p>
      </div>
      <div className="executive-signal-grid">
        {rows.map((row, index) => (
          <div className="executive-signal-card" key={`${row.label}-${index}`}>
            <small>{row.label}</small>
            <b>{row.value}</b>
            <span>{row.note}</span>
          </div>
        ))}
      </div>
      {risk?.rows?.length ? (
        <div className="executive-priority-stack">
          <span>Priority Focus</span>
          {risk.rows.slice(0, 3).map((row, index) => (
            <p key={`${row.area}-${index}`}><b>{row.area}</b>{row.finding}</p>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function RiskHeatMap({ section, profile }: { section: ReportSection; profile: ReportVisualProfile }) {
  const rows = section.rows || [];
  return (
    <section className="report-section risk-heatmap-section">
      <div className="section-head template-section-head">
        <div>
          <h2>{section.title}</h2>
          <p>Severity-led risk view with management action direction.</p>
        </div>
        <span className="section-tag">Risk View</span>
      </div>
      <div className="risk-heatmap-grid">
        {rows.length === 0 && <p className="report-empty">No matching risk record for this report and filter.</p>}
        {rows.map((row, index) => {
          const severity = String(row.severity || "low").toLowerCase();
          return (
            <div className={`risk-heatmap-card severity-${severity.includes("high") ? "high" : severity.includes("medium") ? "medium" : "low"}`} key={`${row.area}-${index}`}>
              <div><span>{row.area}</span><b>{row.severity}</b></div>
              <strong>{row.finding}</strong>
              <p>{row.action}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function OperationsBoardSection({ section, profile }: { section: ReportSection; profile: ReportVisualProfile }) {
  const rowCount = section.rows?.length || 0;
  return (
    <section className="report-section operations-board-section clean-report-table-section">
      <div className="section-head template-section-head clean-section-head">
        <div>
          <h2>{section.title}</h2>
          <p>{rowCount} endpoint record(s) prepared in table format for easier PDF review.</p>
        </div>
        <span className="section-tag">Endpoint Table</span>
      </div>
      <CompactTableOnly section={section} limit={32} />
    </section>
  );
}

function SoftwarePortfolioSection({ section, profile }: { section: ReportSection; profile: ReportVisualProfile }) {
  const columns = section.columns?.length ? section.columns : Object.keys(section.rows[0] || {});
  const nameKey = columns.find((column) => ["softwareName", "name", "item"].includes(column)) || columns[0];
  const categoryKey = columns.find((column) => column.toLowerCase().includes("category"));
  const deviceKey = columns.find((column) => column.toLowerCase().includes("device"));
  return (
    <section className="report-section software-portfolio-section">
      <div className="section-head template-section-head">
        <div>
          <h2>{section.title}</h2>
          <p>Application evidence shown as portfolio tiles with supporting detail.</p>
        </div>
        <span className="section-tag">Portfolio</span>
      </div>
      <div className="software-tile-grid">
        {section.rows.slice(0, 10).map((row, index) => (
          <div className="software-tile" key={index} style={{ "--template-accent": profile.accent } as CSSProperties}>
            <span>{categoryKey ? valueText(row[categoryKey]) : "Application"}</span>
            <strong>{valueText(row[nameKey])}</strong>
            <p>{deviceKey ? `Device: ${valueText(row[deviceKey])}` : columns.slice(0, 2).map((column) => `${formatLabel(column)}: ${valueText(row[column])}`).join(" · ")}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function DataQualityBoardSection({ section, profile }: { section: ReportSection; profile: ReportVisualProfile }) {
  const columns = section.columns?.length ? section.columns : Object.keys(section.rows[0] || {});
  const nameKey = columns.find((column) => ["deviceName", "area", "item"].includes(column)) || columns[0];
  return (
    <section className="report-section data-quality-board-section">
      <div className="section-head template-section-head">
        <div>
          <h2>{section.title}</h2>
          <p>Data issues shown as correction cards with supporting detail.</p>
        </div>
        <span className="section-tag">Quality</span>
      </div>
      <div className="quality-card-grid">
        {section.rows.slice(0, 9).map((row, index) => (
          <div className="quality-card" key={index} style={{ "--template-accent": profile.accent } as CSSProperties}>
            <span>Check {index + 1}</span>
            <strong>{valueText(row[nameKey])}</strong>
            <p>{columns.slice(0, 3).map((column) => `${formatLabel(column)}: ${valueText(row[column])}`).join(" · ")}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ActionPriorityBoard({ payload, profile }: { payload: ReportPayload; profile: ReportVisualProfile }) {
  return (
    <section className="report-section action-priority-board">
      <div className="section-head template-section-head">
        <div>
          <h2>Priority Execution Board</h2>
          <p>Action cards arranged for management follow-up.</p>
        </div>
        <span className="section-tag">Execution</span>
      </div>
      <div className="priority-lane-grid">
        {payload.recommendations.map((item, index) => (
          <div className="priority-lane-card" key={`${item.priority}-${index}`} style={{ "--template-accent": colorsListForIndex(index) } as CSSProperties}>
            <span>{item.priority}</span>
            <strong>{item.action}</strong>
            <p>Assign owner, target date and evidence update before the next review cycle.</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProfileCover({ payload, filters, profile, skin }: { payload: ReportPayload; filters: ReportFilters; profile: ReportVisualProfile; skin: string }) {
  const kpiRows = topKpiRows(payload.sections, 6);
  const riskRows = (firstSection(payload.sections, "risk")?.rows || []).slice(0, 3);
  const visualSection = firstSection(payload.sections, "bar") || firstSection(payload.sections, "donut");
  const score = numberMetric(payload, ["operationalScore"], 0);
  const online = numberMetric(payload, ["onlineRate"], 0);
  const offline = numberMetric(payload, ["offlineEndpoints"], 0);
  const stale = numberMetric(payload, ["staleEndpoints"], 0);
  const openTickets = numberMetric(payload, ["openTickets", "totalTickets"], 0);
  const software = numberMetric(payload, ["totalSoftwareRecords", "distinctSoftware"], 0);
  const geo = numberMetric(payload, ["geolocationDevices", "geolocationRecords"], 0);
  const totalEndpoints = numberMetric(payload, ["totalEndpoints"], 0);

  const reportPackLabel = skin
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  const coverStats = profile.key === "executive"
    ? [
        { label: "Ops Score", value: `${score}%`, note: "Management posture" },
        { label: "Online Rate", value: `${online}%`, note: `${offline} offline endpoint(s)` },
        { label: "Open Tickets", value: openTickets, note: "Service desk pressure" },
        { label: "Software", value: software, note: "Inventory records" }
      ]
    : profile.key === "operations"
    ? [
        { label: "Online Rate", value: `${online}%`, note: `${offline} offline` },
        { label: "Stale Telemetry", value: stale, note: "Delayed check-in" },
        { label: "Total Endpoint", value: totalEndpoints, note: "Current scope" },
        { label: "Tickets", value: openTickets, note: "Operational impact" }
      ]
    : profile.key === "service"
    ? [
        { label: "Open Tickets", value: openTickets, note: "Active workload" },
        { label: "SLA Exposure", value: numberMetric(payload, ["slaBreached"], 0), note: "Breach candidate(s)" },
        { label: "Ops Score", value: `${score}%`, note: "Service impact" },
        { label: "Endpoint Scope", value: totalEndpoints, note: "Affected estate" }
      ]
    : profile.key === "geo"
    ? [
        { label: "Geo Records", value: geo, note: "Location telemetry" },
        { label: "Endpoint Scope", value: totalEndpoints, note: "Current coverage" },
        { label: "Offline", value: offline, note: "Location risk" },
        { label: "Stale", value: stale, note: "Freshness risk" }
      ]
    : profile.key === "software"
    ? [
        { label: "Software Records", value: software, note: "Inventory volume" },
        { label: "Distinct Names", value: numberMetric(payload, ["distinctSoftware"], 0), note: "Application spread" },
        { label: "Endpoint Scope", value: totalEndpoints, note: "Installed base" },
        { label: "Ops Score", value: `${score}%`, note: "Compliance posture" }
      ]
    : [
        { label: profile.heroMetricLabel, value: getHeroMetric(payload, profile), note: payload.report.type },
        { label: "Endpoint Scope", value: totalEndpoints, note: payload.narrative.scope },
        { label: "Open Tickets", value: openTickets, note: "Support exposure" },
        { label: "Online Rate", value: `${online}%`, note: `${offline} offline` }
      ];

  return (
    <section
      className={`report-cover report-template-cover report-cover-revamp clean-cover-page cover-skin-${skin}`}
      style={{ "--template-accent": profile.accent, "--template-soft": profile.softAccent } as CSSProperties}
    >
      <div className="report-clean-cover">
        <div className="report-clean-wave" />
        <div className="report-clean-curve one" />
        <div className="report-clean-curve two" />
        <div className="report-clean-dots" />

        <header className="report-clean-cover-brand">
          <div className="report-logo">E</div>
          <div>
            <b>EMA Unified System</b>
            <span>{reportPackLabel}</span>
          </div>
        </header>

        <div className="report-clean-cover-body">
          <span className="template-badge revamp-cover-badge">{profile.eyebrow}</span>
          <h1>{payload.report.title}</h1>
          <p>{payload.report.description}</p>
          <div className="report-clean-cover-meta">
            <div><span>Prepared</span><b>{formatDateTime(payload.generatedAt)}</b></div>
            <div><span>Scope</span><b>{payload.narrative.scope}</b></div>
            <div><span>Period</span><b>{payload.narrative.period}</b></div>
            <div><span>Format</span><b>{filters.outputFormat}</b></div>
          </div>
        </div>
      </div>
    </section>
  );
}
function ProfileNarrative({ payload, profile }: { payload: ReportPayload; profile: ReportVisualProfile }) {
  return (
    <section className="report-section template-narrative-section">
      <div className="section-head template-section-head">
        <div>
          <h2>{profile.storyTitle}</h2>
          <p>{profile.storyHelp}</p>
        </div>
        <span className="section-tag">Narrative</span>
      </div>
      <div className="template-story-card">
        <div className="template-story-main">
          <p>{payload.narrative.executiveSummary}</p>
          <ul className="report-finding-list template-finding-list">
            {payload.narrative.keyFindings.map((finding) => <li key={finding}>{finding}</li>)}
          </ul>
          <p className="template-conclusion">{payload.narrative.managementConclusion}</p>
        </div>
        <div className="template-score-panel">
          <span>Operational Score</span>
          <strong>{payload.metrics.operationalScore || 0}%</strong>
          <small>Based on availability, SLA exposure and reporting quality.</small>
        </div>
      </div>
    </section>
  );
}

function TemplateKpiSection({ section, profile }: { section: ReportSection; profile: ReportVisualProfile }) {
  return (
    <section className="report-section template-kpi-section">
      <div className="section-head template-section-head">
        <div>
          <h2>{section.title}</h2>
          <p>{profile.key === "executive" ? "Board-level KPI snapshot." : `KPI snapshot for ${profile.label.toLowerCase()}.`}</p>
        </div>
        <span className="section-tag">KPI</span>
      </div>
      <div className={`template-kpi-grid template-kpi-${profile.key}`}>
        {section.rows.map((row, index) => (
          <div className="template-kpi-card" key={`${row.label}-${index}`} style={{ "--template-accent": colorsListForIndex(index) } as CSSProperties}>
            <small>{row.label}</small>
            <strong>{row.value}</strong>
            <span>{row.note}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function TemplateChartSection({ section, profile }: { section: ReportSection; profile: ReportVisualProfile }) {
  return (
    <section className={`report-section template-chart-section chart-${profile.key}`}>
      <div className="section-head template-section-head">
        <div>
          <h2>{section.title}</h2>
          <p>{profile.key === "geo" ? "Location coverage distribution." : profile.key === "service" ? "Ticket/service pressure distribution." : "Visual summary for the selected reporting scope."}</p>
        </div>
        <span className="section-tag">{section.type === "donut" ? "Donut" : "Graph"}</span>
      </div>
      <div className="template-chart-shell">
        {section.type === "donut" ? <DonutSection section={section} /> : <BarSection section={section} />}
      </div>
    </section>
  );
}


function CompactTableOnly({ section, limit = 25 }: { section: ReportSection; limit?: number }) {
  const columns = section.columns?.length ? section.columns : Object.keys(section.rows[0] || {});
  return (
    <div className="report-table-wrap template-compact-table-wrap">
      <table className="report-table report-detail-table template-compact-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{formatLabel(column)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {section.rows.length === 0 && (
            <tr>
              <td colSpan={Math.max(columns.length, 1)}>No matching records for this report and filter.</td>
            </tr>
          )}
          {section.rows.slice(0, limit).map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column) => (
                <td key={column}>{valueText(row[column])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {section.rows.length > limit && <p className="report-table-note">Showing first {limit} records in the PDF preview. Full detail is available in Excel/CSV export.</p>}
    </div>
  );
}

function TemplateRiskSection({ section, profile }: { section: ReportSection; profile: ReportVisualProfile }) {
  return (
    <section className={`report-section template-risk-section risk-${profile.key}`}>
      <div className="section-head template-section-head">
        <div>
          <h2>{section.title}</h2>
          <p>{profile.key === "risk" ? "Risk register format with finding, severity and action owner direction." : "Management attention areas prepared from current operational records."}</p>
        </div>
        <span className="section-tag">Risk</span>
      </div>
      <div className="report-table-wrap report-risk-wrap template-risk-table-wrap">
        <table className="report-table report-risk-table template-risk-table">
          <thead>
            <tr>
              <th>Area</th>
              <th>Severity</th>
              <th>Finding</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {section.rows.length === 0 && (
              <tr>
                <td colSpan={4}>No matching risk record for this report and filter.</td>
              </tr>
            )}
            {section.rows.map((row, index) => (
              <tr key={`${row.area}-${index}`}>
                <td>{row.area}</td>
                <td>
                  <span className={`risk-pill ${String(row.severity).toLowerCase().includes("high") ? "risk-high" : String(row.severity).toLowerCase().includes("medium") ? "risk-med" : "risk-low"}`}>{row.severity}</span>
                </td>
                <td>{row.finding}</td>
                <td>{row.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TemplateTableSection({ section, profile }: { section: ReportSection; profile: ReportVisualProfile }) {
  if (profile.key === "audit") return <TimelineSection section={section} profile={profile} />;
  if (profile.key === "geo") return <GeoEvidenceSection section={section} profile={profile} />;
  if (profile.key === "service") return <ServiceEvidenceSection section={section} profile={profile} />;
  if (profile.key === "operations") return <OperationsBoardSection section={section} profile={profile} />;
  if (profile.key === "software") return <SoftwarePortfolioSection section={section} profile={profile} />;
  if (profile.key === "data") return <DataQualityBoardSection section={section} profile={profile} />;

  return (
    <section className={`report-section template-table-section table-${profile.key}`}>
      <div className="section-head template-section-head">
        <div>
          <h2>{section.title}</h2>
          <p>{profile.key === "register" ? "Asset ledger view for review and export." : `${section.rows.length} item(s) listed for review.`}</p>
        </div>
        <span className="section-tag">{profile.key === "register" ? "Register" : "Table"}</span>
      </div>
      <CompactTableOnly section={section} limit={profile.key === "register" ? 35 : 25} />
    </section>
  );
}

function TimelineSection({ section, profile }: { section: ReportSection; profile: ReportVisualProfile }) {
  const columns = section.columns?.length ? section.columns : Object.keys(section.rows[0] || {});
  if ((section.rows?.length || 0) > 5) {
    return (
      <section className="report-section template-timeline-section clean-report-table-section">
        <div className="section-head template-section-head clean-section-head"><div><h2>{section.title}</h2><p>Audit evidence is rendered as a table for dense PDF output.</p></div><span className="section-tag">Audit Table</span></div>
        <CompactTableOnly section={section} limit={32} />
      </section>
    );
  }
  const primary = columns.find((column) => ["jobCommand", "description", "title", "item"].includes(column)) || columns[0];
  const actor = columns.find((column) => ["createdBy", "assignedTo", "owner"].includes(column));
  const time = columns.find((column) => ["startTime", "createdAt", "locationTime", "lastSeen"].includes(column));

  return (
    <section className="report-section template-timeline-section">
      <div className="section-head template-section-head">
        <div>
          <h2>{section.title}</h2>
          <p>Timeline view for traceability and review.</p>
        </div>
        <span className="section-tag">Audit Trail</span>
      </div>
      <div className="template-timeline">
        {section.rows.length === 0 && <p className="report-empty">No matching audit record.</p>}
        {section.rows.slice(0, 14).map((row, index) => (
          <div className="template-timeline-item" key={index} style={{ "--template-accent": profile.accent } as CSSProperties}>
            <i />
            <div>
              <strong>{valueText(row[primary])}</strong>
              <p>{actor ? `By ${valueText(row[actor])}` : "Actor unavailable"} {time ? `· ${valueText(row[time])}` : ""}</p>
              <small>{columns.slice(0, 4).map((column) => `${formatLabel(column)}: ${valueText(row[column])}`).join(" · ")}</small>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function GeoEvidenceSection({ section, profile }: { section: ReportSection; profile: ReportVisualProfile }) {
  const columns = section.columns?.length ? section.columns : Object.keys(section.rows[0] || {});
  if ((section.rows?.length || 0) > 5) {
    return (
      <section className="report-section template-geo-section clean-report-table-section">
        <div className="section-head template-section-head clean-section-head"><div><h2>{section.title}</h2><p>Location evidence is rendered as a table for dense PDF output.</p></div><span className="section-tag">Location Table</span></div>
        <CompactTableOnly section={section} limit={32} />
      </section>
    );
  }
  const nameKey = columns.find((column) => ["deviceName", "locationName", "site"].includes(column)) || columns[0];
  const accuracyKey = columns.find((column) => column.toLowerCase().includes("accuracy"));
  const timeKey = columns.find((column) => ["locationTime", "lastSeen"].includes(column));

  return (
    <section className="report-section template-geo-section">
      <div className="section-head template-section-head">
        <div>
          <h2>{section.title}</h2>
          <p>Location exceptions displayed as evidence cards with supporting detail.</p>
        </div>
        <span className="section-tag">Location</span>
      </div>
      <div className="geo-card-grid">
        {section.rows.slice(0, 6).map((row, index) => (
          <div className="geo-evidence-card" key={index} style={{ "--template-accent": profile.accent } as CSSProperties}>
            <span>Location Evidence</span>
            <strong>{valueText(row[nameKey])}</strong>
            <p>{accuracyKey ? `Accuracy: ${valueText(row[accuracyKey])}` : "Accuracy evidence unavailable"}</p>
            <small>{timeKey ? valueText(row[timeKey]) : "No timestamp"}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function ServiceEvidenceSection({ section, profile }: { section: ReportSection; profile: ReportVisualProfile }) {
  const columns = section.columns?.length ? section.columns : Object.keys(section.rows[0] || {});
  if ((section.rows?.length || 0) > 5) {
    return (
      <section className="report-section template-service-section clean-report-table-section">
        <div className="section-head template-section-head clean-section-head"><div><h2>{section.title}</h2><p>Service desk evidence is rendered as a table for dense PDF output.</p></div><span className="section-tag">Ticket Table</span></div>
        <CompactTableOnly section={section} limit={32} />
      </section>
    );
  }
  const titleKey = columns.find((column) => ["title", "item", "id"].includes(column)) || columns[0];
  const statusKey = columns.find((column) => column.toLowerCase().includes("status"));
  const priorityKey = columns.find((column) => column.toLowerCase().includes("priority"));

  return (
    <section className="report-section template-service-section">
      <div className="section-head template-section-head">
        <div>
          <h2>{section.title}</h2>
          <p>Service desk queue displayed as SLA cards with supporting detail.</p>
        </div>
        <span className="section-tag">Tickets</span>
      </div>
      <div className="ticket-card-grid">
        {section.rows.slice(0, 8).map((row, index) => (
          <div className="ticket-evidence-card" key={index} style={{ "--template-accent": profile.accent } as CSSProperties}>
            <div>
              <span>{priorityKey ? valueText(row[priorityKey]) : "Ticket"}</span>
              <b>{statusKey ? valueText(row[statusKey]) : "Status n/a"}</b>
            </div>
            <strong>{valueText(row[titleKey])}</strong>
            <p>{columns.slice(0, 3).map((column) => `${formatLabel(column)}: ${valueText(row[column])}`).join(" · ")}</p>
          </div>
        ))}
      </div>
    </section>
  );
}


function getDisplayRows(section?: ReportSection, limit = 6) {
  return (section?.rows || []).slice(0, limit);
}

function ExecutiveNumberDashboard({ payload, profile }: { payload: ReportPayload; profile: ReportVisualProfile }) {
  const kpiRows = topKpiRows(payload.sections, 6);
  const chartSections = sectionGroup(payload.sections, ["bar", "donut"]);
  const riskSection = firstSection(payload.sections, "risk");
  const score = numberMetric(payload, ["operationalScore"], 0);
  const onlineRate = numberMetric(payload, ["onlineRate"], 0);
  const offline = numberMetric(payload, ["offlineEndpoints"], 0);
  const openTickets = numberMetric(payload, ["openTickets", "totalTickets"], 0);

  return (
    <section className="report-section executive-number-dashboard">
      <div className="executive-number-hero">
        <div className="executive-number-score" style={{ "--template-accent": profile.accent } as CSSProperties}>
          <span>Management Score</span>
          <strong>{score}%</strong>
          <p>{payload.narrative.managementConclusion}</p>
        </div>
        <div className="executive-number-metrics">
          <div><small>Online Rate</small><b>{onlineRate}%</b><span>Endpoint reachability</span></div>
          <div><small>Offline</small><b>{offline}</b><span>Requires follow-up</span></div>
          <div><small>Open Tickets</small><b>{openTickets}</b><span>Support workload</span></div>
        </div>
      </div>

      <div className="executive-number-card-grid">
        {kpiRows.map((row, index) => (
          <div className="executive-number-card" key={`${row.label}-${index}`} style={{ "--template-accent": colorsListForIndex(index) } as CSSProperties}>
            <span>{row.label}</span>
            <strong>{row.value}</strong>
            <small>{row.note}</small>
          </div>
        ))}
      </div>

      {chartSections.length ? (
        <div className="executive-visual-grid">
          {chartSections.slice(0, 2).map((section, index) => (
            <div className="executive-visual-card" key={`${section.title}-${index}`}>
              <div className="section-head template-section-head compact-head">
                <div>
                  <h2>{section.title}</h2>
                  <p>Visual management indicator without operational detail table.</p>
                </div>
                <span className="section-tag">Visual</span>
              </div>
              <div className="template-chart-shell executive-chart-shell">
                {section.type === "donut" ? <DonutSection section={section} /> : <BarSection section={section} />}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {riskSection?.rows?.length ? (
        <div className="executive-attention-mosaic">
          <div className="section-head template-section-head compact-head">
            <div>
              <h2>Management Attention</h2>
              <p>Number-led focus areas for executive discussion.</p>
            </div>
            <span className="section-tag">Focus</span>
          </div>
          <div className="executive-attention-grid">
            {riskSection.rows.slice(0, 4).map((row, index) => (
              <div className="executive-attention-card" key={`${row.area}-${index}`}>
                <span>{row.severity}</span>
                <strong>{row.area}</strong>
                <p>{row.finding}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ExecutiveMemoBoard({ payload, profile }: { payload: ReportPayload; profile: ReportVisualProfile }) {
  const score = numberMetric(payload, ["operationalScore"], 0);
  const totalEndpoints = numberMetric(payload, ["totalEndpoints"], 0);
  const onlineRate = numberMetric(payload, ["onlineRate"], 0);
  const onlineEndpoints = numberMetric(payload, ["onlineEndpoints"], 0);
  const offlineEndpoints = numberMetric(payload, ["offlineEndpoints"], 0);
  const openTickets = numberMetric(payload, ["openTickets", "totalTickets"], 0);
  const slaBreached = numberMetric(payload, ["slaBreached"], 0);
  const softwareRecords = numberMetric(payload, ["totalSoftwareRecords"], 0);
  const distinctSoftware = numberMetric(payload, ["distinctSoftwareNames"], 0);
  const dataIssues = numberMetric(payload, ["dataQualityIssues"], 0);
  const executiveSummaryLine = `${payload.report.title} covers ${payload.narrative.scope} for ${payload.narrative.period}. Board view combines endpoint availability, service desk pressure, software coverage and data quality into a ${score}% operational score.`;
  const compactFindings = [
    `${totalEndpoints} endpoints reviewed: ${onlineEndpoints || onlineRate} online and ${offlineEndpoints} offline.`,
    `${openTickets} open tickets, including ${slaBreached} SLA breach candidate(s).`,
    `${softwareRecords} software records across ${distinctSoftware} distinct software names.`,
    `${dataIssues} endpoint data-quality issue(s) affecting reporting confidence.`
  ];

  return (
    <section className="report-section executive-memo-board" style={{ "--template-accent": profile.accent } as CSSProperties}>
      <div className="executive-memo-copy">
        <span>Management Interpretation</span>
        <h2>{payload.narrative.title || "Executive Interpretation"}</h2>
        <p>{executiveSummaryLine}</p>
      </div>
      <div className="executive-memo-list">
        {compactFindings.map((finding, index) => (
          <div key={finding}>
            <b>{String(index + 1).padStart(2, "0")}</b>
            <span>{finding}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function DashboardScoreboard({ sections, profile }: { sections: ReportSection[]; profile: ReportVisualProfile }) {
  const kpiSections = sectionGroup(sections, ["kpi"]);
  const chartSections = sectionGroup(sections, ["bar", "donut"]);
  const riskSections = sectionGroup(sections, ["risk"]);
  return (
    <>
      <section className="report-section monthly-scoreboard-section">
        <div className="section-head template-section-head">
          <div>
            <h2>Monthly Performance Board</h2>
            <p>Dashboard-style indicators prepared for management review.</p>
          </div>
          <span className="section-tag">Dashboard</span>
        </div>
        <div className="monthly-scoreboard-grid">
          {kpiSections.flatMap((section) => section.rows).slice(0, 8).map((row, index) => (
            <div className="monthly-score-card" key={`${row.label}-${index}`} style={{ "--template-accent": colorsListForIndex(index) } as CSSProperties}>
              <small>{row.label}</small>
              <strong>{row.value}</strong>
              <span>{row.note}</span>
            </div>
          ))}
        </div>
      </section>
      <div className="template-two-col dashboard-visuals">
        {chartSections.map((section, index) => renderSectionByProfile(section, profile, index))}
      </div>
      {riskSections.map((section, index) => <RiskHeatMap key={`${section.title}-${index}`} section={section} profile={profile} />)}
    </>
  );
}

function ActionQueueVisual({ payload, profile, sections }: { payload: ReportPayload; profile: ReportVisualProfile; sections: ReportSection[] }) {
  const riskSections = sectionGroup(sections, ["risk"]);
  const kpiRows = sectionGroup(sections, ["kpi"]).flatMap((section) => section.rows).slice(0, 4);
  return (
    <>
      <section className="report-section action-command-strip">
        <div className="section-head template-section-head">
          <div>
            <h2>Execution Command View</h2>
            <p>Priority items grouped as management follow-up cards.</p>
          </div>
          <span className="section-tag">Queue</span>
        </div>
        <div className="action-command-kpis">
          {kpiRows.map((row, index) => (
            <div key={`${row.label}-${index}`}><span>{row.label}</span><b>{row.value}</b><small>{row.note}</small></div>
          ))}
        </div>
      </section>
      {riskSections.map((section, index) => <RiskHeatMap key={`${section.title}-${index}`} section={section} profile={profile} />)}
      <ActionPriorityBoard payload={payload} profile={profile} />
    </>
  );
}

function DetailEvidenceCards({ section, profile, label = "Evidence" }: { section: ReportSection; profile: ReportVisualProfile; label?: string }) {
  const columns = section.columns?.length ? section.columns : Object.keys(section.rows[0] || {});
  const primary = columns.find((column) => ["deviceName", "softwareName", "title", "item", "name", "assetName"].includes(column)) || columns[0];
  const status = columns.find((column) => column.toLowerCase().includes("status") || column.toLowerCase().includes("priority"));
  const secondary = columns.find((column) => column !== primary && column !== status) || columns[1];
  return (
    <div className="detail-evidence-grid">
      {section.rows.slice(0, 12).map((row, index) => (
        <div className="detail-evidence-card" key={index} style={{ "--template-accent": profile.accent } as CSSProperties}>
          <div><span>{label}</span><b>{status ? valueText(row[status]) : `#${String(index + 1).padStart(2, "0")}`}</b></div>
          <strong>{valueText(row[primary])}</strong>
          <p>{secondary ? `${formatLabel(secondary)}: ${valueText(row[secondary])}` : "Record available for export."}</p>
          <small>{columns.slice(0, 3).map((column) => `${formatLabel(column)}: ${valueText(row[column])}`).join(" · ")}</small>
        </div>
      ))}
      {!section.rows.length && <p className="report-empty">No matching records for this report and filter.</p>}
    </div>
  );
}

function sectionRows(section?: ReportSection, limit = 12) {
  return (section?.rows || []).slice(0, limit);
}

function firstColumn(section?: ReportSection, candidates: string[] = []) {
  const columns = section?.columns?.length ? section.columns : Object.keys(section?.rows?.[0] || {});
  return candidates.find((candidate) => columns.includes(candidate)) || columns[0] || "item";
}

function valueFromRow(row: any, key?: string) {
  if (!row || !key) return "-";
  return valueText(row[key]);
}

function RevampKpiRibbon({ sections, tone = "default" }: { sections: ReportSection[]; tone?: string }) {
  const rows = sectionGroup(sections, ["kpi"]).flatMap((section) => section.rows || []).slice(0, 8);
  if (!rows.length) return null;
  return (
    <section className={`report-section revamp-kpi-ribbon revamp-kpi-${tone}`}>
      {rows.map((row, index) => (
        <div className="revamp-kpi-tile" key={`${row.label}-${index}`} style={{ "--template-accent": colorsListForIndex(index) } as CSSProperties}>
          <span>{row.label}</span>
          <strong>{row.value}</strong>
          <small>{row.note}</small>
        </div>
      ))}
    </section>
  );
}

function RevampVisualPair({ sections, profile }: { sections: ReportSection[]; profile: ReportVisualProfile }) {
  const charts = sectionGroup(sections, ["bar", "donut"]).slice(0, 2);
  if (!charts.length) return null;
  return (
    <section className="report-section revamp-visual-pair">
      {charts.map((section, index) => (
        <div className="revamp-visual-card" key={`${section.title}-${index}`} style={{ "--template-accent": colorsListForIndex(index) } as CSSProperties}>
          <div className="revamp-mini-head">
            <span>{section.type === "donut" ? "Distribution" : "Trend"}</span>
            <h2>{section.title}</h2>
          </div>
          <div className="template-chart-shell revamp-chart-shell">
            {section.type === "donut" ? <DonutSection section={section} /> : <BarSection section={section} />}
          </div>
        </div>
      ))}
    </section>
  );
}

function ExecutiveBoardPackV2({ payload, sections, profile }: { payload: ReportPayload; sections: ReportSection[]; profile: ReportVisualProfile }) {
  const risk = firstSection(sections, "risk");
  const score = numberMetric(payload, ["operationalScore"], 0);
  const online = numberMetric(payload, ["onlineRate"], 0);
  const totalEndpoints = numberMetric(payload, ["totalEndpoints"], 0);
  const offline = numberMetric(payload, ["offlineEndpoints"], 0);
  const stale = numberMetric(payload, ["staleEndpoints"], 0);
  const tickets = numberMetric(payload, ["openTickets", "totalTickets"], 0);
  const sla = numberMetric(payload, ["slaBreached", "slaBreachCandidates", "slaBreaches"], 0);
  const software = numberMetric(payload, ["totalSoftwareRecords", "softwareRows", "softwareRecords"], 0);

  const executiveMetrics = [
    { label: "Endpoint Estate", value: totalEndpoints, note: `${online}% online / ${offline} offline` },
    { label: "Service Desk", value: tickets, note: `${sla} SLA breach candidate(s)` },
    { label: "Telemetry", value: stale, note: "Stale or missing last-seen" },
    { label: "Software", value: software, note: "Inventory records in scope" }
  ];

  return (
    <div className="exec-body-stack clean-exec-stack">
      <section className="report-section exec-clean-pack clean-exec-overview" style={{ "--template-accent": profile.accent } as CSSProperties}>
        <div className="clean-exec-copy">
          <span>Executive Decision Snapshot</span>
          <h2>{payload.report.title}</h2>
          <p>{payload.narrative.managementConclusion}</p>
        </div>
        <div className="clean-exec-score">
          <small>Board Score</small>
          <strong>{score}%</strong>
          <span>Composite posture</span>
        </div>
        <div className="clean-exec-metric-grid">
          {executiveMetrics.map((row, index) => (
            <div key={`${row.label}-${index}`}>
              <small>{row.label}</small>
              <strong>{row.value}</strong>
              <span>{row.note}</span>
            </div>
          ))}
        </div>
      </section>

      {risk?.rows?.length ? (
        <section className="report-section exec-clean-focus clean-report-table-section">
          <div className="section-head template-section-head clean-section-head">
            <div>
              <h2>Board Attention Focus</h2>
              <p>Management focus areas are shown as a table so long findings stay aligned.</p>
            </div>
            <span className="section-tag">Decision Table</span>
          </div>
          <div className="report-table-wrap template-risk-table-wrap clean-table-wrap">
            <table className="report-table report-risk-table template-risk-table clean-report-table">
              <thead>
                <tr>
                  <th>Area</th>
                  <th>Severity</th>
                  <th>Finding</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {risk.rows.slice(0, 10).map((row, index) => (
                  <tr key={`${row.area}-${index}`}>
                    <td>{row.area}</td>
                    <td><span className={`risk-pill ${String(row.severity).toLowerCase().includes("high") ? "risk-high" : String(row.severity).toLowerCase().includes("medium") ? "risk-med" : "risk-low"}`}>{row.severity}</span></td>
                    <td>{row.finding}</td>
                    <td>{row.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function MonthlyDashboardPackV2({ payload, sections, profile }: { payload: ReportPayload; sections: ReportSection[]; profile: ReportVisualProfile }) {
  const kpiRows = sectionGroup(sections, ["kpi"]).flatMap((section) => section.rows || []).slice(0, 8);
  const riskRows = sectionGroup(sections, ["risk"]).flatMap((section) => section.rows || []).slice(0, 4);
  return (
    <>
      <section className="report-section revamp-monthly-command">
        <div className="revamp-monthly-title">
          <span>Monthly Command View</span>
          <h2>{payload.narrative.period}</h2>
          <p>{payload.narrative.executiveSummary}</p>
        </div>
        <div className="revamp-monthly-grid">
          {kpiRows.map((row, index) => (
            <div className="revamp-monthly-card" key={`${row.label}-${index}`} style={{ "--template-accent": colorsListForIndex(index) } as CSSProperties}>
              <small>{row.label}</small>
              <strong>{row.value}</strong>
              <span>{row.note}</span>
            </div>
          ))}
        </div>
      </section>
      <RevampVisualPair sections={sections} profile={profile} />
      {riskRows.length ? (
        <section className="report-section revamp-monthly-focus">
          <div className="section-head template-section-head"><div><h2>Monthly Attention Matrix</h2><p>Items that should be tracked into the next management cycle.</p></div><span className="section-tag">Matrix</span></div>
          <div className="revamp-matrix-grid">
            {riskRows.map((row, index) => <div key={`${row.area}-${index}`}><b>{row.area}</b><span>{row.severity}</span><p>{row.action}</p></div>)}
          </div>
        </section>
      ) : null}
    </>
  );
}

function ActionQueuePackV2({ payload, sections, profile }: { payload: ReportPayload; sections: ReportSection[]; profile: ReportVisualProfile }) {
  const riskRows = sectionGroup(sections, ["risk"]).flatMap((section) => section.rows || []).slice(0, 6);
  const kpiRows = sectionGroup(sections, ["kpi"]).flatMap((section) => section.rows || []).slice(0, 4);
  return (
    <>
      <section className="report-section revamp-action-warroom">
        <div className="revamp-action-left">
          <span>Execution Board</span>
          <h2>Priority Queue</h2>
          <p>{payload.narrative.managementConclusion}</p>
        </div>
        <div className="revamp-action-stat-grid">
          {kpiRows.map((row, index) => <div key={`${row.label}-${index}`}><small>{row.label}</small><b>{row.value}</b><span>{row.note}</span></div>)}
        </div>
      </section>
      <section className="report-section revamp-kanban-board">
        <div className="revamp-kanban-lane"><h3>Now</h3>{riskRows.slice(0, 2).map((row, index) => <div key={index}><b>{row.area}</b><p>{row.finding}</p></div>)}</div>
        <div className="revamp-kanban-lane"><h3>Next</h3>{riskRows.slice(2, 4).map((row, index) => <div key={index}><b>{row.area}</b><p>{row.action}</p></div>)}</div>
        <div className="revamp-kanban-lane"><h3>Follow-Up</h3>{payload.recommendations.slice(0, 3).map((row, index) => <div key={index}><b>{row.priority}</b><p>{row.action}</p></div>)}</div>
      </section>
    </>
  );
}

function RiskRegisterPackV2({ sections, profile }: { sections: ReportSection[]; profile: ReportVisualProfile }) {
  const riskRows = sectionGroup(sections, ["risk"]).flatMap((section) => section.rows || []);
  const tableSections = sectionGroup(sections, ["table"]);
  return (
    <>
      <RevampKpiRibbon sections={sections} tone="risk" />
      <section className="report-section revamp-risk-register">
        <div className="section-head template-section-head"><div><h2>Risk Register</h2><p>Each risk is shown with severity, finding and control action.</p></div><span className="section-tag">Control</span></div>
        <div className="revamp-risk-grid">
          {riskRows.map((row, index) => {
            const severity = String(row.severity || "low").toLowerCase();
            return <div className={`revamp-risk-card risk-${severity.includes("high") ? "high" : severity.includes("medium") ? "medium" : "low"}`} key={`${row.area}-${index}`}><span>{row.severity}</span><h3>{row.area}</h3><p>{row.finding}</p><b>{row.action}</b></div>;
          })}
        </div>
      </section>
      {tableSections.map((section, index) => <section className="report-section revamp-evidence-strip" key={`${section.title}-${index}`}><div className="section-head template-section-head"><div><h2>{section.title}</h2><p>Evidence preview for validation. Full list remains available through export.</p></div><span className="section-tag">Evidence</span></div><DetailEvidenceCards section={section} profile={profile} label="Evidence" /></section>)}
      <RevampVisualPair sections={sections} profile={profile} />
    </>
  );
}

function EndpointOpsPackV2({ sections, profile }: { sections: ReportSection[]; profile: ReportVisualProfile }) {
  const table = firstTableSection(sections);
  return (
    <>
      <RevampKpiRibbon sections={sections} tone="ops" />
      <RevampVisualPair sections={sections} profile={profile} />
      {table ? (
        <section className="report-section revamp-noc-wall clean-report-table-section">
          <div className="section-head template-section-head clean-section-head">
            <div>
              <h2>Endpoint Operations Register</h2>
              <p>Endpoint exceptions are shown as a structured table so large PDF previews stay readable.</p>
            </div>
            <span className="section-tag">NOC Register</span>
          </div>
          <CompactTableOnly section={table} limit={32} />
        </section>
      ) : null}
    </>
  );
}

function AssetLedgerPackV2({ sections, profile }: { sections: ReportSection[]; profile: ReportVisualProfile }) {
  const tables = sectionGroup(sections, ["table"]);
  return (
    <>
      <RevampKpiRibbon sections={sections} tone="asset" />
      <section className="report-section revamp-ledger-cover">
        <div><span>Inventory Register</span><h2>Asset Ledger Review</h2><p>Designed as a record-first report for asset control, lifecycle review and export.</p></div>
        <div className="revamp-ledger-stamp">REGISTER</div>
      </section>
      {tables.map((section, index) => <section className="report-section revamp-ledger-table" key={`${section.title}-${index}`}><div className="section-head template-section-head"><div><h2>{section.title}</h2><p>Structured asset register for audit and reconciliation.</p></div><span className="section-tag">Ledger</span></div><CompactTableOnly section={section} limit={35} /></section>)}
      <RevampVisualPair sections={sections} profile={profile} />
    </>
  );
}

function SoftwarePortfolioPackV2({ sections, profile }: { sections: ReportSection[]; profile: ReportVisualProfile }) {
  const table = firstTableSection(sections);
  return (
    <>
      <RevampKpiRibbon sections={sections} tone="software" />
      <section className="report-section revamp-software-showcase">
        <div className="section-head template-section-head"><div><h2>Software Portfolio View</h2><p>Application records are grouped into portfolio-style evidence tiles.</p></div><span className="section-tag">Portfolio</span></div>
        {table ? <SoftwarePortfolioSection section={table} profile={profile} /> : <p className="report-empty">No software records returned.</p>}
      </section>
      <RevampVisualPair sections={sections} profile={profile} />
    </>
  );
}

function GeoExceptionPackV2({ sections, profile }: { sections: ReportSection[]; profile: ReportVisualProfile }) {
  const table = firstTableSection(sections);
  return (
    <>
      <RevampKpiRibbon sections={sections} tone="geo" />
      <section className="report-section revamp-location-board">
        <div className="revamp-location-map"><i /><i /><i /><span>Location Coverage</span></div>
        <div className="revamp-location-copy"><h2>Geolocation Exception Board</h2><p>Location evidence is shown as exception cards instead of a raw technical table.</p></div>
      </section>
      {table ? <GeoEvidenceSection section={table} profile={profile} /> : null}
      <RevampVisualPair sections={sections} profile={profile} />
    </>
  );
}

function RemoteAuditPackV2({ sections, profile }: { sections: ReportSection[]; profile: ReportVisualProfile }) {
  const table = firstTableSection(sections);
  return (
    <>
      <RevampKpiRibbon sections={sections} tone="audit" />
      <section className="report-section revamp-audit-coverline"><span>Audit Trail</span><h2>Remote Activity Evidence Timeline</h2><p>Activity is presented as traceable events for reviewer follow-up.</p></section>
      {table ? <TimelineSection section={table} profile={profile} /> : null}
      <RevampVisualPair sections={sections} profile={profile} />
    </>
  );
}

function ServiceDeskPackV2({ sections, profile }: { sections: ReportSection[]; profile: ReportVisualProfile }) {
  const table = firstTableSection(sections);
  return (
    <>
      <RevampKpiRibbon sections={sections} tone="service" />
      <section className="report-section revamp-sla-pack">
        <div><span>SLA Pack</span><h2>Service Desk Pressure View</h2><p>Ticket and SLA information is shown as queue cards for operational review.</p></div>
        <div className="revamp-sla-meter"><b>{getDisplayRows(table, 99).length}</b><span>records in preview</span></div>
      </section>
      {table ? <ServiceEvidenceSection section={table} profile={profile} /> : null}
      <RevampVisualPair sections={sections} profile={profile} />
    </>
  );
}

function DataQualityPackV2({ sections, profile }: { sections: ReportSection[]; profile: ReportVisualProfile }) {
  const table = firstTableSection(sections);
  const risks = sectionGroup(sections, ["risk"]);
  return (
    <>
      <RevampKpiRibbon sections={sections} tone="data" />
      <section className="report-section revamp-quality-gates">
        <div><span>Reporting Confidence</span><h2>Data Quality Gates</h2><p>Designed to show correction work required before management reporting can be trusted.</p></div>
        <div className="revamp-gate-grid"><i>Completeness</i><i>Mapping</i><i>Telemetry</i><i>Duplicate Check</i></div>
      </section>
      {risks.map((section, index) => <TemplateRiskSection key={`${section.title}-${index}`} section={section} profile={profile} />)}
      {table ? <DataQualityBoardSection section={table} profile={profile} /> : null}
    </>
  );
}

function ReportPackBody({ payload, sections, profile, skin }: { payload: ReportPayload; sections: ReportSection[]; profile: ReportVisualProfile; skin: string }) {
  if (profile.key === "executive") {
    if (skin === "dashboard-pack") return <MonthlyDashboardPackV2 payload={payload} sections={sections} profile={profile} />;
    if (skin === "action-pack") return <ActionQueuePackV2 payload={payload} sections={sections} profile={profile} />;
    return <ExecutiveBoardPackV2 payload={payload} sections={sections} profile={profile} />;
  }

  if (profile.key === "risk") return <RiskRegisterPackV2 sections={sections} profile={profile} />;
  if (profile.key === "operations") return <EndpointOpsPackV2 sections={sections} profile={profile} />;
  if (profile.key === "register") return <AssetLedgerPackV2 sections={sections} profile={profile} />;
  if (profile.key === "software") return <SoftwarePortfolioPackV2 sections={sections} profile={profile} />;
  if (profile.key === "geo") return <GeoExceptionPackV2 sections={sections} profile={profile} />;
  if (profile.key === "audit") return <RemoteAuditPackV2 sections={sections} profile={profile} />;
  if (profile.key === "service") return <ServiceDeskPackV2 sections={sections} profile={profile} />;
  if (profile.key === "data") return <DataQualityPackV2 sections={sections} profile={profile} />;

  return <ProfiledBody sections={sections} profile={profile} />;
}

function TemplateRecommendations({ payload, profile }: { payload: ReportPayload; profile: ReportVisualProfile }) {
  return (
    <section className={`report-section template-action-section action-${profile.key}`}>
      <div className="section-head template-section-head">
        <div>
          <h2>{profile.key === "risk" ? "Control Actions" : profile.key === "audit" ? "Follow-Up Evidence Required" : "Recommended Actions"}</h2>
          <p>Recommended action based on current report findings.</p>
        </div>
        <span className="section-tag">Action Plan</span>
      </div>
      <div className="action-grid-report dynamic-action-grid template-action-grid">
        {payload.recommendations.map((item) => (
          <div className="action-card-report template-action-card" key={`${item.priority}-${item.action}`} style={{ "--template-accent": profile.accent } as CSSProperties}>
            <span>{item.priority}</span>
            <strong>{item.action}</strong>
            <p>{profile.key === "service" ? "Update ticket owner, SLA note and resolution target." : profile.key === "audit" ? "Attach evidence, reviewer and approval note for traceability." : "Assign owner, due date and follow-up evidence before the next reporting cycle."}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function renderSectionByProfile(section: ReportSection, profile: ReportVisualProfile, index: number) {
  if (section.type === "kpi") return <TemplateKpiSection key={`${section.title}-${index}`} section={section} profile={profile} />;
  if (["bar", "donut"].includes(String(section.type))) return <TemplateChartSection key={`${section.title}-${index}`} section={section} profile={profile} />;
  if (section.type === "risk") return profile.key === "risk" ? <RiskHeatMap key={`${section.title}-${index}`} section={section} profile={profile} /> : <TemplateRiskSection key={`${section.title}-${index}`} section={section} profile={profile} />;
  if (section.type === "table") return <TemplateTableSection key={`${section.title}-${index}`} section={section} profile={profile} />;
  return null;
}

function ProfiledBody({ sections, profile }: { sections: ReportSection[]; profile: ReportVisualProfile }) {
  const kpiSections = sectionGroup(sections, ["kpi"]);
  const chartSections = sectionGroup(sections, ["bar", "donut"]);
  const riskSections = sectionGroup(sections, ["risk"]);
  const tableSections = sectionGroup(sections, ["table"]);

  if (profile.key === "executive") {
    return (
      <>
        {kpiSections.map((section, index) => renderSectionByProfile(section, profile, index))}
        <div className="template-two-col template-executive-grid">
          {chartSections.map((section, index) => renderSectionByProfile(section, profile, index))}
        </div>
        {riskSections.map((section, index) => renderSectionByProfile(section, profile, index))}
        {tableSections.map((section, index) => renderSectionByProfile(section, profile, index))}
      </>
    );
  }

  if (profile.key === "risk") {
    return (
      <>
        {riskSections.map((section, index) => renderSectionByProfile(section, profile, index))}
        {kpiSections.map((section, index) => renderSectionByProfile(section, profile, index))}
        {tableSections.map((section, index) => renderSectionByProfile(section, profile, index))}
        <div className="template-two-col">{chartSections.map((section, index) => renderSectionByProfile(section, profile, index))}</div>
      </>
    );
  }

  if (["register", "data"].includes(profile.key)) {
    return (
      <>
        {kpiSections.map((section, index) => renderSectionByProfile(section, profile, index))}
        {tableSections.map((section, index) => renderSectionByProfile(section, profile, index))}
        <div className="template-two-col">{chartSections.map((section, index) => renderSectionByProfile(section, profile, index))}</div>
        {riskSections.map((section, index) => renderSectionByProfile(section, profile, index))}
      </>
    );
  }

  if (["audit", "service", "geo", "software", "operations"].includes(profile.key)) {
    return (
      <>
        {kpiSections.map((section, index) => renderSectionByProfile(section, profile, index))}
        <div className="template-two-col">{chartSections.map((section, index) => renderSectionByProfile(section, profile, index))}</div>
        {riskSections.map((section, index) => renderSectionByProfile(section, profile, index))}
        {tableSections.map((section, index) => renderSectionByProfile(section, profile, index))}
      </>
    );
  }

  return <>{sections.map((section, index) => renderSectionByProfile(section, profile, index))}</>;
}

function ReportDocument({ payload, filters }: { payload: ReportPayload; filters: ReportFilters }) {
  const profile = getReportProfile(payload.report);
  const skin = getReportSkin(payload.report);
  const isExecutivePack = profile.key === "executive";
  const shouldRenderChart = (section: ReportSection) => ["bar", "donut"].includes(section.type);
  const shouldRenderTable = (section: ReportSection) => ["table", "risk"].includes(section.type);
  const visibleSections = payload.sections.filter((section) => {
    if (section.type === "kpi") return filters.includeSummary;
    if (shouldRenderChart(section)) return filters.includeChart;
    if (shouldRenderTable(section)) {
      if (isExecutivePack && section.type === "table") return false;
      return filters.includeTable || isExecutivePack;
    }
    return true;
  });

  return (
    <article
      className={`executive-report-page dynamic-report-page report-template report-template-${profile.key} report-skin-${skin}`}
      id="reportPrintArea"
      style={{ "--template-accent": profile.accent, "--template-soft": profile.softAccent } as CSSProperties}
    >
      <ProfileCover payload={payload} filters={filters} profile={profile} skin={skin} />
      {!isExecutivePack && <ProfileDesignStrip payload={payload} profile={profile} />}
      {isExecutivePack && filters.includeSummary ? <ExecutiveMemoBoard payload={payload} profile={profile} /> : filters.includeSummary ? <ProfileNarrative payload={payload} profile={profile} /> : null}
      <ReportPackBody payload={payload} sections={visibleSections} profile={profile} skin={skin} />
      {filters.includeRecommendation && !isExecutivePack && (skin === "action-pack" ? <ActionPriorityBoard payload={payload} profile={profile} /> : <TemplateRecommendations payload={payload} profile={profile} />)}
    </article>
  );
}


function pdfEscape(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function pdfText(value: unknown, max = 120) {
  const text = String(value ?? "-").replace(/\s+/g, " ").trim() || "-";
  return pdfEscape(text.length > max ? `${text.slice(0, max - 1)}…` : text);
}

function pdfNumber(payload: ReportPayload, keys: string[], fallback = 0) {
  return numberMetric(payload, keys, fallback);
}

function metricFromRows(section?: ReportSection, limit = 4) {
  return (section?.rows || []).slice(0, limit).map((row) => {
    const label = row.label ?? row.name ?? row.status ?? row.category ?? row.metric ?? row.area ?? "Metric";
    const value = row.value ?? row.count ?? row.total ?? row.score ?? row.percentage ?? "-";
    const note = row.note ?? row.description ?? row.finding ?? row.action ?? "";
    return { label, value, note };
  });
}

function printableKpis(payload: ReportPayload) {
  const kpiSection = payload.sections.find((section) => section.type === "kpi");
  const fromSection = metricFromRows(kpiSection, 4);
  if (fromSection.length) return fromSection;

  return [
    { label: "Endpoint Estate", value: pdfNumber(payload, ["endpointTotal", "totalEndpoints", "assets"], 0), note: `${pdfNumber(payload, ["onlineEndpoints", "online"], 0)} online · ${pdfNumber(payload, ["offlineEndpoints", "offline"], 0)} offline` },
    { label: "Open Tickets", value: pdfNumber(payload, ["openTickets", "tickets"], 0), note: `${pdfNumber(payload, ["slaBreachCandidates", "slaBreaches"], 0)} SLA breach candidate(s)` },
    { label: "Software Records", value: pdfNumber(payload, ["softwareRows", "softwareRecords"], 0), note: `${pdfNumber(payload, ["distinctSoftware", "softwareNames"], 0)} distinct software name(s)` },
    { label: "Telemetry Watch", value: pdfNumber(payload, ["staleEndpoints", "stale"], 0), note: "Stale or missing last-seen telemetry" }
  ];
}

function sectionByType(payload: ReportPayload, type: string) {
  return payload.sections.find((section) => section.type === type);
}

const PDF_COLUMN_PRIORITY = [
  "id",
  "assetId",
  "assetTag",
  "deviceName",
  "computerName",
  "name",
  "status",
  "severity",
  "priority",
  "category",
  "source",
  "site",
  "department",
  "assignedTo",
  "createdAt",
  "updatedAt",
  "lastSeen",
  "connectionStatus",
  "value",
  "count",
  "total"
];

function getPdfColumns(section: ReportSection | undefined, rows: Record<string, any>[], maxColumns = 7) {
  const sourceColumns = section?.columns?.length ? section.columns : Object.keys(rows[0] || {});
  const normalized = sourceColumns.filter((column) => !/^__/i.test(column));
  const selected: string[] = [];

  PDF_COLUMN_PRIORITY.forEach((priorityColumn) => {
    const found = normalized.find((column) => column.toLowerCase() === priorityColumn.toLowerCase());
    if (found && !selected.includes(found)) selected.push(found);
  });

  normalized.forEach((column) => {
    if (!selected.includes(column)) selected.push(column);
  });

  return selected.slice(0, maxColumns);
}

function tableRowsHtml(section?: ReportSection, limit = 36, maxColumns = 7) {
  const allRows = (section?.rows || []) as Record<string, any>[];
  const rows = allRows.slice(0, limit);
  if (!rows.length) return `<div class="pdf-empty">No matching records for this table.</div>`;

  const columns = getPdfColumns(section, rows, maxColumns);
  const table = `
    <div class="pdf-table-box">
      <table class="pdf-real-table">
        <thead><tr>${columns.map((col) => `<th>${pdfEscape(formatLabel(col))}</th>`).join("")}</tr></thead>
        <tbody>
          ${rows.map((row) => `<tr>${columns.map((col) => `<td>${pdfText(row[col], 120)}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;

  const note = allRows.length > limit
    ? `<p class="pdf-table-note">Showing first ${limit} of ${allRows.length} records in this PDF. Export Excel / CSV for the complete dataset.</p>`
    : "";

  return `${table}${note}`;
}

function sectionRowsHtml(section?: ReportSection, limit = 12) {
  const allRows = (section?.rows || []) as Record<string, any>[];
  const rows = allRows.slice(0, limit);
  if (!rows.length) return `<div class="pdf-empty">No matching records for this section.</div>`;

  const columns = getPdfColumns(section, rows, 6);
  const shouldRenderAsTable = allRows.length > 4 || columns.length > 4 || section?.type === "table";
  if (shouldRenderAsTable) return tableRowsHtml(section, Math.max(limit, 18), 6);

  return rows
    .map((row) => {
      const entries = Object.entries(row).slice(0, 4);
      const title = row.title ?? row.name ?? row.deviceName ?? row.area ?? row.category ?? row.status ?? entries[0]?.[1] ?? "Record";
      const meta = entries
        .filter(([key]) => !["title", "name", "deviceName", "area"].includes(key))
        .map(([key, value]) => `<span><b>${pdfEscape(formatLabel(key))}</b>${pdfText(value, 80)}</span>`)
        .join("");
      return `<article class="pdf-evidence-card"><strong>${pdfText(title, 90)}</strong><div>${meta}</div></article>`;
    })
    .join("");
}

function riskTableHtml(rows: Record<string, any>[], limit = 24) {
  const visible = rows.slice(0, limit);
  if (!visible.length) return `<div class="pdf-empty">No management attention items returned.</div>`;

  const table = `
    <div class="pdf-table-box">
      <table class="pdf-real-table pdf-risk-data-table">
        <thead>
          <tr><th>Area</th><th>Severity</th><th>Finding</th><th>Action</th></tr>
        </thead>
        <tbody>
          ${visible.map((row) => {
            const severity = row.severity || row.priority || "Focus";
            const area = row.area || row.title || row.category || "Management Focus";
            const finding = row.finding || row.description || row.issue || row.action || "Review this focus area.";
            const action = row.action || row.recommendation || row.nextStep || "Assign owner and track closure.";
            return `<tr><td>${pdfText(area, 90)}</td><td><span class="pdf-risk-pill">${pdfText(severity, 28)}</span></td><td>${pdfText(finding, 150)}</td><td>${pdfText(action, 150)}</td></tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;

  const note = rows.length > limit
    ? `<p class="pdf-table-note">Showing first ${limit} of ${rows.length} risk item(s). Export Excel / CSV for full evidence detail.</p>`
    : "";

  return `${table}${note}`;
}

function riskCardsHtml(payload: ReportPayload) {
  const riskSection = sectionByType(payload, "risk");
  const risks = (riskSection?.rows || payload.recommendations || []).slice(0, 4) as Record<string, any>[];
  if (!risks.length) return `<div class="pdf-empty">No management attention items returned.</div>`;
  return risks
    .map((row) => {
      const severity = row.severity || row.priority || "Focus";
      const area = row.area || row.title || row.action || "Management Focus";
      const finding = row.finding || row.description || row.action || "Review this focus area.";
      const action = row.action || row.recommendation || "Assign owner and track closure.";
      return `
        <article class="pdf-focus-card">
          <span class="pdf-severity">${pdfText(severity, 24)}</span>
          <h3>${pdfText(area, 70)}</h3>
          <p>${pdfText(finding, 120)}</p>
          <div>${pdfText(action, 120)}</div>
        </article>
      `;
    })
    .join("");
}

function managementAttentionHtml(payload: ReportPayload, limit = 24) {
  const riskSection = sectionByType(payload, "risk");
  const rows = (riskSection?.rows || payload.recommendations || []) as Record<string, any>[];
  if (!rows.length) return `<div class="pdf-empty">No management attention items returned.</div>`;
  if (rows.length > 2) return riskTableHtml(rows, limit);
  return `<div class="pdf-focus-grid">${riskCardsHtml(payload)}</div>`;
}

function recommendationsTableHtml(recommendations: ReportPayload["recommendations"], limit = 24) {
  const rows = (recommendations || []) as Record<string, any>[];
  const visible = rows.slice(0, limit);
  if (!visible.length) return `<div class="pdf-empty">No recommended actions generated for this report.</div>`;

  const table = `
    <div class="pdf-table-box">
      <table class="pdf-real-table pdf-action-table">
        <thead>
          <tr><th>Priority</th><th>Action</th><th>Owner</th><th>Target</th></tr>
        </thead>
        <tbody>
          ${visible.map((row) => {
            const priority = row.priority || row.severity || "Action";
            const action = row.action || row.recommendation || row.title || row.description || "Review and assign next action.";
            const owner = row.owner || row.assignee || row.assignedTo || "Management Team";
            const target = row.targetDate || row.dueDate || row.eta || row.timeline || row.status || "Track in next review";
            return `<tr><td><span class="pdf-risk-pill">${pdfText(priority, 28)}</span></td><td>${pdfText(action, 180)}</td><td>${pdfText(owner, 80)}</td><td>${pdfText(target, 80)}</td></tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;

  const note = rows.length > limit
    ? `<p class="pdf-table-note">Showing first ${limit} of ${rows.length} recommended action(s).</p>`
    : "";

  return `${table}${note}`;
}

function barListHtml(section?: ReportSection, limit = 6) {
  const rows = (section?.rows || []).slice(0, limit);
  if (!rows.length) return `<div class="pdf-empty">No chart rows available.</div>`;
  const max = Math.max(...rows.map((row) => Number(row.value ?? row.count ?? row.total ?? 0)), 1);
  return rows
    .map((row) => {
      const label = row.label ?? row.name ?? row.status ?? row.category ?? "Item";
      const value = Number(row.value ?? row.count ?? row.total ?? 0);
      const width = Math.max(4, Math.min(100, Math.round((value / max) * 100)));
      return `<div class="pdf-bar-row"><span>${pdfText(label, 46)}</span><b>${pdfEscape(value)}</b><i><em style="width:${width}%"></em></i></div>`;
    })
    .join("");
}

function printableFindingRows(payload: ReportPayload, limit = 6) {
  const findings = payload.narrative.keyFindings || [];
  if (!findings.length) return `<tr><td colspan="3">No key finding returned for this scope.</td></tr>`;
  return findings.slice(0, limit).map((item, index) => `<tr><td>${String(index + 1).padStart(2, "0")}</td><td>${pdfText(item, 190)}</td><td>${pdfText(index === 0 ? "High" : index === 1 ? "Medium" : "Monitor", 20)}</td></tr>`).join("");
}


function pdfReportPackName(payload: ReportPayload) {
  const raw = `${payload.report.category || payload.report.type || "Report Pack"}`;
  return raw.replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}


function formatReportContractDate(value?: string) {
  const text = String(value || "").trim();
  if (!text) return "To be configured";
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("en-MY", { day: "2-digit", month: "2-digit", year: "numeric" });
  }
  return text;
}

function numberOrFallback(value: any, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function buildClientRnrFilterValues(payload: ReportPayload, filters: ReportFilters) {
  const merged = { ...(payload.filters || {}), ...(filters || {}) } as ReportFilters;
  const endpointTotal = pdfNumber(payload, ["endpointTotal", "totalEndpoints", "assets"], 0);
  return {
    clientName: String(merged.clientName || "").trim(),
    serviceType: String(merged.serviceType || "Subscribe / Purchase").trim(),
    version: String(merged.solutionVersion || "EMA System").trim(),
    contractStart: formatReportContractDate(merged.contractStart),
    contractEnd: formatReportContractDate(merged.contractEnd),
    totalNodes: numberOrFallback(merged.contractedNodes, endpointTotal),
    integration: "Consider Integration"
  };
}

function applyClientRnrLiveOverrides(payload: ReportPayload, filters: ReportFilters): ReportPayload {
  if (payload.report.id !== "client-summary-rnr") {
    return { ...payload, filters: { ...(payload.filters || {}), ...(filters || {}) } };
  }

  const values = buildClientRnrFilterValues(payload, filters);
  const sections = (payload.sections || []).map((section) => {
    if (section.title === "Subscription Summary") {
      return {
        ...section,
        rows: [
          { label: "Service Type", value: values.serviceType, note: "Subscription or purchase service profile." },
          { label: "Version", value: values.version, note: "Solution / package version." },
          { label: "Total Nodes", value: values.totalNodes, note: "Contracted node count or endpoint estate in selected scope." },
          { label: "Integration", value: values.integration, note: "Connect subscription / contract data source for stronger report evidence." }
        ]
      };
    }

    if (section.title === "Subscription / Contract Summary") {
      return {
        ...section,
        rows: [
          { item: "Client", value: values.clientName || "Client logo / client name to be configured", note: "Shown together with solution and company branding in the PDF cover." },
          { item: "Service Type", value: values.serviceType, note: "Subscription or purchased service package." },
          { item: "Version", value: values.version, note: "Current solution package reference." },
          { item: "Start Contract", value: values.contractStart, note: "Contract start date." },
          { item: "End Contract", value: values.contractEnd, note: "Contract end date." },
          { item: "Total Nodes", value: values.totalNodes, note: "Total endpoint records or contracted nodes in current scope." },
          { item: "Integration Consideration", value: values.integration, note: "Integrate subscription/licensing source for final client report." }
        ],
        columns: ["item", "value", "note"]
      };
    }

    return section;
  });

  return {
    ...payload,
    filters: { ...(payload.filters || {}), ...(filters || {}) },
    sections
  };
}

function buildPdfCoverOnlyPage(payload: ReportPayload, filters: ReportFilters, mode: "executive" | "generic") {
  const generated = formatDateTime(payload.generatedAt);
  const period = payload.narrative.period || filters.dateRange;
  const scope = payload.narrative.scope || "All Sites";
  const title = payload.report.title || "EMA Report";
  const clientName = payload.report.id === "client-summary-rnr" ? String(filters.clientName || payload.filters?.clientName || "").trim() : "";
  const introBase = payload.report.description || payload.narrative.executiveSummary || "Prepared from the current EMA operational dataset.";
  const intro = clientName ? `Prepared for ${clientName}. ${introBase}` : introBase;
  const label = mode === "executive" ? "Management-ready report pack" : "Operational report pack";

  return `
    <section class="pdf-cover-page pdf-cover-${mode}">
      <div class="pdf-cover-wave"></div>
      <div class="pdf-cover-arc arc-primary"></div>
      <div class="pdf-cover-arc arc-gold"></div>
      <div class="pdf-cover-dots dots-left"></div>
      <div class="pdf-cover-dots dots-right"></div>

      <header class="pdf-cover-brand-row">
        <div class="pdf-cover-brand-mark">E</div>
        <div><strong>EMA Unified System</strong><small>${pdfText(pdfReportPackName(payload), 70)}</small></div>
      </header>

      <div class="pdf-cover-title-block">
        <span>${pdfText(label, 60)}</span>
        <h1>${pdfText(title, 100)}</h1>
        ${clientName ? `<div class="pdf-client-chip">Prepared for <strong>${pdfText(clientName, 90)}</strong></div>` : ""}
        <p>${pdfText(intro, 240)}</p>
      </div>

      <div class="pdf-cover-meta-table">
        <div><small>Prepared On</small><b>${pdfEscape(generated)}</b></div>
        <div><small>Scope</small><b>${pdfText(scope, 70)}</b></div>
        <div><small>Period</small><b>${pdfText(period, 60)}</b></div>
        <div><small>Output</small><b>${pdfText(filters.outputFormat || "PDF", 30)}</b></div>
      </div>
    </section>
    <div class="pdf-page-break"></div>
  `;
}

function buildPdfMetricTable(payload: ReportPayload) {
  const endpointTotal = pdfNumber(payload, ["endpointTotal", "totalEndpoints", "assets"], 0);
  const online = pdfNumber(payload, ["onlineEndpoints", "online"], 0);
  const offline = pdfNumber(payload, ["offlineEndpoints", "offline"], 0);
  const stale = pdfNumber(payload, ["staleEndpoints", "stale"], 0);
  const openTickets = pdfNumber(payload, ["openTickets", "tickets"], 0);
  const sla = pdfNumber(payload, ["slaBreachCandidates", "slaBreaches", "slaBreached"], 0);
  const software = pdfNumber(payload, ["softwareRows", "softwareRecords", "totalSoftwareRecords"], 0);
  const score = pdfNumber(payload, ["operationalScore", "score"], 0);
  const onlineRate = endpointTotal ? Math.round((online / Math.max(endpointTotal, 1)) * 100) : pdfNumber(payload, ["onlineRate"], 0);
  const rows = [
    ["Board Score", `${score}%`, "Composite management posture"],
    ["Endpoint Estate", endpointTotal, `${online} online / ${offline} offline`],
    ["Online Rate", `${onlineRate}%`, `${stale} stale or missing telemetry`],
    ["Service Desk", openTickets, `${sla} SLA breach candidate(s)`],
    ["Software", software, "Inventory records in scope"]
  ];

  return `
    <table class="pdf-real-table pdf-metric-table">
      <thead><tr><th>Metric</th><th>Value</th><th>Notes</th></tr></thead>
      <tbody>${rows.map((row) => `<tr><td>${pdfText(row[0], 60)}</td><td>${pdfText(row[1], 40)}</td><td>${pdfText(row[2], 100)}</td></tr>`).join("")}</tbody>
    </table>
  `;
}

function buildExecutivePrintableHtml(payload: ReportPayload, filters: ReportFilters) {
  const barSection = payload.sections.find((section) => ["bar", "donut"].includes(section.type));

  return `
    ${buildPdfCoverOnlyPage(payload, filters, "executive")}

    <section class="pdf-section pdf-summary-section">
      <div class="pdf-section-head"><div><h2>Management Snapshot</h2><p>High-level operating posture for the selected reporting scope.</p></div><span>Page 2</span></div>
      <div class="pdf-summary-layout">
        <div>
          <span class="pdf-eyebrow">Executive Summary</span>
          <h2>${pdfText(payload.narrative.title || payload.report.title, 90)}</h2>
          <p>${pdfText(payload.narrative.executiveSummary || payload.narrative.managementConclusion, 300)}</p>
        </div>
        ${buildPdfMetricTable(payload)}
      </div>
    </section>

    <section class="pdf-section">
      <div class="pdf-section-head"><div><h2>Key Findings</h2><p>Priority observations converted into management-ready findings.</p></div><span>Focus</span></div>
      <table class="pdf-real-table"><thead><tr><th>No</th><th>Finding</th></tr></thead><tbody>${payload.narrative.keyFindings.slice(0, 6).map((item, index) => `<tr><td>${String(index + 1).padStart(2, "0")}</td><td>${pdfText(item, 220)}</td></tr>`).join("")}</tbody></table>
    </section>

    ${filters.includeChart ? `<section class="pdf-section"><div class="pdf-section-head"><div><h2>${pdfText(barSection?.title || "Operational Distribution", 80)}</h2><p>Visual summary rendered as PDF-safe chart rows.</p></div><span>Chart</span></div><div class="pdf-bars">${barListHtml(barSection)}</div></section>` : ""}
    ${filters.includeTable ? `<section class="pdf-section pdf-table-section"><div class="pdf-section-head"><div><h2>Board Attention Focus</h2><p>Priority management attention items rendered as a proper decision table.</p></div><span>Decision Focus</span></div>${riskTableHtml(((sectionByType(payload, "risk")?.rows || payload.recommendations || []) as Record<string, any>[]), 12)}</section>` : ""}
    ${filters.includeRecommendation ? `<section class="pdf-section"><div class="pdf-section-head"><div><h2>Recommended Actions</h2><p>Follow-up actions generated from current findings.</p></div><span>Action Plan</span></div>${tableRowsHtml({ type: "table", title: "Actions", rows: payload.recommendations || [] }, 10)}</section>` : ""}
  `;
}

function buildGenericPrintableHtml(payload: ReportPayload, filters: ReportFilters) {
  const kpis = printableKpis(payload);
  const barSection = payload.sections.find((section) => ["bar", "donut"].includes(section.type));
  const tableSection = payload.sections.find((section) => section.type === "table");
  const riskSection = payload.sections.find((section) => section.type === "risk");

  return `
    ${buildPdfCoverOnlyPage(payload, filters, "generic")}

    <section class="pdf-section pdf-summary-section">
      <div class="pdf-section-head"><div><h2>Report Snapshot</h2><p>High-level overview of the current reporting scope.</p></div><span>Overview</span></div>
      <div class="pdf-summary-layout">
        <div>
          <span class="pdf-eyebrow">Report Narrative</span>
          <h2>${pdfText(payload.narrative.title || payload.report.title, 90)}</h2>
          <p>${pdfText(payload.narrative.managementConclusion || payload.narrative.executiveSummary, 300)}</p>
        </div>
        <table class="pdf-real-table pdf-metric-table">
          <thead><tr><th>Metric</th><th>Value</th><th>Notes</th></tr></thead>
          <tbody>${kpis.map((item) => `<tr><td>${pdfText(item.label, 55)}</td><td>${pdfText(item.value, 35)}</td><td>${pdfText(item.note, 95)}</td></tr>`).join("")}</tbody>
        </table>
      </div>
    </section>

    <section class="pdf-section">
      <div class="pdf-section-head"><div><h2>Key Findings</h2><p>Priority observations converted into report findings.</p></div><span>Findings</span></div>
      <table class="pdf-real-table"><thead><tr><th>No</th><th>Finding</th></tr></thead><tbody>${payload.narrative.keyFindings.slice(0, 6).map((item, index) => `<tr><td>${String(index + 1).padStart(2, "0")}</td><td>${pdfText(item, 220)}</td></tr>`).join("")}</tbody></table>
    </section>

    ${filters.includeChart ? `<section class="pdf-section"><div class="pdf-section-head"><div><h2>${pdfText(barSection?.title || "Operational Distribution", 80)}</h2><p>Summary chart generated as real HTML bars.</p></div><span>Chart</span></div><div class="pdf-bars">${barListHtml(barSection)}</div></section>` : ""}
    ${riskSection && filters.includeTable ? `<section class="pdf-section pdf-table-section"><div class="pdf-section-head"><div><h2>${pdfText(riskSection.title, 80)}</h2><p>Evidence and priority items rendered as a structured table.</p></div><span>Risk</span></div>${riskTableHtml((riskSection.rows || []) as Record<string, any>[], 18)}</section>` : ""}
    ${tableSection && filters.includeTable ? `<section class="pdf-section"><div class="pdf-section-head"><div><h2>${pdfText(tableSection.title, 80)}</h2><p>Detail rows are rendered as real selectable table data.</p></div><span>Table</span></div>${tableRowsHtml(tableSection, 32)}</section>` : ""}
    ${filters.includeRecommendation ? `<section class="pdf-section"><div class="pdf-section-head"><div><h2>Recommended Actions</h2><p>Management actions generated from the live report dataset.</p></div><span>Action</span></div>${tableRowsHtml({ type: "table", title: "Actions", rows: payload.recommendations || [] }, 10)}</section>` : ""}
  `;
}


function buildFullPackPrintableHtml(payload: ReportPayload, filters: ReportFilters) {
  const kpiSections = payload.sections.filter((section) => section.type === "kpi");
  const chartSections = payload.sections.filter((section) => ["bar", "donut"].includes(section.type));
  const riskSections = payload.sections.filter((section) => section.type === "risk");
  const tableSections = payload.sections.filter((section) => section.type === "table");

  return `
    ${buildPdfCoverOnlyPage(payload, filters, "generic")}

    <section class="pdf-section pdf-summary-section">
      <div class="pdf-section-head"><div><h2>Client Report Snapshot</h2><p>Consolidated Summary / RNR pack generated from available endpoint, software, pricing and report configuration data.</p></div><span>Summary</span></div>
      <div class="pdf-summary-layout">
        <div>
          <span class="pdf-eyebrow">Report Narrative</span>
          <h2>${pdfText(payload.narrative.title || payload.report.title, 90)}</h2>
          <p>${pdfText(payload.narrative.executiveSummary || payload.narrative.managementConclusion, 360)}</p>
        </div>
        ${buildPdfMetricTable(payload)}
      </div>
    </section>

    <section class="pdf-section">
      <div class="pdf-section-head"><div><h2>Key Findings</h2><p>Priority findings for management and RNR discussion.</p></div><span>Findings</span></div>
      <table class="pdf-real-table"><thead><tr><th>No</th><th>Finding</th></tr></thead><tbody>${payload.narrative.keyFindings.slice(0, 8).map((item, index) => `<tr><td>${String(index + 1).padStart(2, "0")}</td><td>${pdfText(item, 240)}</td></tr>`).join("")}</tbody></table>
    </section>

    ${filters.includeSummary ? kpiSections.map((section) => `<section class="pdf-section"><div class="pdf-section-head"><div><h2>${pdfText(section.title, 90)}</h2><p>KPI and management snapshot.</p></div><span>KPI</span></div>${tableRowsHtml(section, 18)}</section>`).join("") : ""}
    ${filters.includeChart ? chartSections.map((section) => `<section class="pdf-section"><div class="pdf-section-head"><div><h2>${pdfText(section.title, 90)}</h2><p>Distribution rendered as PDF-safe chart rows.</p></div><span>Chart</span></div><div class="pdf-bars">${barListHtml(section)}</div></section>`).join("") : ""}
    ${filters.includeTable ? riskSections.map((section) => `<section class="pdf-section"><div class="pdf-section-head"><div><h2>${pdfText(section.title, 90)}</h2><p>Risk and management attention items.</p></div><span>Risk</span></div>${riskTableHtml(section.rows || [], 24)}</section>`).join("") : ""}
    ${filters.includeTable ? tableSections.map((section) => `<section class="pdf-section pdf-table-section"><div class="pdf-section-head"><div><h2>${pdfText(section.title, 90)}</h2><p>Structured report table rendered for client-facing review.</p></div><span>Table</span></div>${tableRowsHtml(section, 40)}</section>`).join("") : ""}
    ${filters.includeRecommendation ? `<section class="pdf-section"><div class="pdf-section-head"><div><h2>Recommended Actions</h2><p>Follow-up actions generated from report evidence.</p></div><span>Action</span></div>${tableRowsHtml({ type: "table", title: "Actions", rows: payload.recommendations || [] }, 12)}</section>` : ""}
  `;
}

function buildRegeneratedReportHtml(payload: ReportPayload, filters: ReportFilters, options: { autoPrint?: boolean; preview?: boolean } = {}) {
  const liveFilters = { ...(payload.filters || {}), ...(filters || {}) } as ReportFilters;
  const livePayload = applyClientRnrLiveOverrides(payload, liveFilters);
  const isFullPack = ["client-summary-rnr", "resource-planning-brand-summary"].includes(livePayload.report.id);
  const isExecutive = /executive/i.test(`${livePayload.report.id} ${livePayload.report.title} ${livePayload.report.category || ""}`);
  const content = isFullPack ? buildFullPackPrintableHtml(livePayload, liveFilters) : isExecutive ? buildExecutivePrintableHtml(livePayload, liveFilters) : buildGenericPrintableHtml(livePayload, liveFilters);
  const autoPrint = options.autoPrint !== false;
  const bodyClass = options.preview ? "pdf-preview-mode" : "pdf-print-mode";
  const printScript = autoPrint ? `
  <script>
    const triggerPrint = () => setTimeout(() => { window.focus(); window.print(); }, 250);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(triggerPrint).catch(triggerPrint);
    else window.addEventListener('load', triggerPrint);
  <\/script>` : "";
  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${pdfText(livePayload.report.title, 90)}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #eef3f8; color: #17233c; font-family: "Segoe UI", Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { width: 210mm; min-height: 297mm; }
    body.pdf-preview-mode { width: 100%; min-width: 210mm; background: #eef3f8; padding: 8mm 0 12mm; }
    body.pdf-print-mode { background: #fff; }
    .pdf-pack { width: 190mm; margin: 0 auto; display: block; }
    .pdf-pack > * + * { margin-top: 6mm; }
    .pdf-page-break { page-break-after: always; break-after: page; height: 0; margin: 0 !important; }
    .pdf-cover-page { position: relative; width: 190mm; min-height: 255mm; overflow: hidden; border: 1px solid #d9e3f0; border-radius: 7mm; background: linear-gradient(180deg,#ffffff 0%,#fbfdff 100%); padding: 13mm; page-break-after: always; break-after: page; margin-bottom: 0; }
    .pdf-cover-executive { --pdf-cover-primary:#18324f; --pdf-cover-accent:#d3a84e; }
    .pdf-cover-generic { --pdf-cover-primary:#143b72; --pdf-cover-accent:#4f8df7; }
    .pdf-cover-brand-row { position: relative; z-index: 2; display: flex; align-items: center; gap: 4mm; color: #182c45; }
    .pdf-cover-brand-mark { width: 13mm; height: 13mm; border: 1px solid #d5deeb; border-radius: 4mm; display: grid; place-items: center; color: var(--pdf-cover-primary); background:#fff; font-weight: 900; }
    .pdf-cover-brand-row strong { display:block; font-size: 15pt; line-height: 1.1; }
    .pdf-cover-brand-row small { display:block; margin-top: 1mm; color:#718096; font-size: 7pt; text-transform: uppercase; letter-spacing: .14em; font-weight: 900; }
    .pdf-cover-title-block { position: relative; z-index: 2; max-width: 112mm; min-height: 156mm; display: flex; flex-direction: column; justify-content: center; }
    .pdf-cover-title-block span { width: fit-content; padding: 2.2mm 4mm; border:1px solid #d9e3f0; border-radius:999px; background:#fff; color: var(--pdf-cover-primary); font-size: 7pt; font-weight: 900; letter-spacing:.11em; text-transform: uppercase; }
    .pdf-cover-title-block h1 { margin: 7mm 0 0; color:#1d2f45; font-size: 35pt; line-height:.98; letter-spacing:-.055em; }
    .pdf-cover-title-block p { margin: 6mm 0 0; max-width: 92mm; color:#58677b; font-size: 11pt; line-height:1.58; font-weight: 600; }
    .pdf-client-chip { display: inline-flex; align-items: center; gap: 5px; max-width: 96mm; margin: 5mm 0 0; padding: 2.8mm 4.2mm; border: 1px solid #d8e3f0; border-radius: 999px; background: rgba(255,255,255,.86); color: #53657d; font-size: 8pt; font-weight: 900; letter-spacing: .05em; text-transform: uppercase; }
    .pdf-client-chip strong { color: #13294b; }
    .pdf-cover-meta-table { position: relative; z-index: 2; display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 3mm; padding-top: 6mm; border-top: 1px solid #dfe7f2; }
    .pdf-cover-meta-table div { min-width:0; }
    .pdf-cover-meta-table small { display:block; color:#718096; text-transform: uppercase; letter-spacing:.1em; font-size: 7pt; font-weight: 900; }
    .pdf-cover-meta-table b { display:block; margin-top:1.5mm; color:#1d2f45; font-size:8.5pt; line-height:1.3; }
    .pdf-cover-wave { position:absolute; left:-28mm; top:-24mm; width:140mm; height:72mm; border-top:1mm solid rgba(24,50,79,.14); border-radius:50%; box-shadow:0 4mm 0 rgba(24,50,79,.08),0 8mm 0 rgba(24,50,79,.08),0 12mm 0 rgba(24,50,79,.08),0 16mm 0 rgba(24,50,79,.08),0 20mm 0 rgba(24,50,79,.08),0 24mm 0 rgba(24,50,79,.08),0 28mm 0 rgba(24,50,79,.08); }
    .pdf-cover-arc { position:absolute; right:-38mm; bottom:-52mm; border-radius:50%; pointer-events:none; }
    .pdf-cover-arc.arc-primary { width:156mm; height:156mm; border:15mm solid var(--pdf-cover-primary); }
    .pdf-cover-arc.arc-gold { width:136mm; height:136mm; right:-30mm; bottom:-43mm; border:7mm solid var(--pdf-cover-accent); opacity:.9; }
    .pdf-cover-dots { position:absolute; width:26mm; height:26mm; background-image:radial-gradient(circle, rgba(89,108,136,.42) 1.1mm, transparent 1.2mm); background-size:8mm 8mm; opacity:.42; }
    .pdf-cover-dots.dots-left { left:14mm; bottom:16mm; }
    .pdf-cover-dots.dots-right { right:62mm; top:72mm; }
    .pdf-summary-layout { display:grid; grid-template-columns: 62mm minmax(0,1fr); gap: 7mm; align-items:start; }
    .pdf-summary-layout h2 { margin: 2mm 0 3mm; }
    .pdf-metric-table td:nth-child(2) { font-weight: 900; white-space: nowrap; width: 24mm; }
    .pdf-cover, .pdf-section { width: 100%; background: #fff; border: 1px solid #d9e3f0; border-radius: 5mm; overflow: hidden; box-shadow: 0 2mm 8mm rgba(15,35,71,.06); }
    .pdf-cover { min-height: 68mm; display: grid; grid-template-columns: 25mm 1fr 42mm; gap: 6mm; align-items: stretch; padding: 7mm; background: linear-gradient(180deg,#ffffff 0%,#f8fbff 100%); border-top: 5mm solid #143b72; }
    .pdf-generic-cover { grid-template-columns: 25mm 1fr; }
    .pdf-cover-mark { width: 18mm; height: 18mm; border-radius: 5mm; display: grid; place-items: center; background: #143b72; color: #fff; font-size: 9pt; font-weight: 900; letter-spacing: .08em; }
    .pdf-cover-copy { min-width: 0; }
    .pdf-eyebrow, .pdf-section-head > span, .pdf-kpi-grid small, .pdf-cover-score small, .pdf-meta-row span { text-transform: uppercase; letter-spacing: .11em; font-size: 7pt; font-weight: 900; color: #667996; }
    .pdf-cover-copy h1 { margin: 3mm 0 2mm; font-size: 28pt; line-height: 1.04; letter-spacing: -.055em; color: #0f2347; }
    .pdf-cover-copy p { max-width: 118mm; margin: 0; color: #42526e; font-size: 10pt; line-height: 1.45; font-weight: 650; }
    .pdf-meta-row { display: flex; flex-wrap: wrap; gap: 2mm; margin-top: 5mm; }
    .pdf-meta-row span { border: 1px solid #d9e3f0; border-radius: 999px; padding: 1.7mm 3mm; background: #fff; color: #3d4d66; }
    .pdf-cover-score { align-self: stretch; border: 1px solid #d9e3f0; border-radius: 4mm; background: #f8fbff; padding: 5mm; display: flex; flex-direction: column; justify-content: center; }
    .pdf-cover-score strong { display: block; margin: 2mm 0; font-size: 27pt; line-height: 1; color: #1d4ed8; }
    .pdf-cover-score span { color: #4b5d78; font-size: 8.5pt; font-weight: 800; }
    .pdf-section { padding: 6mm; break-inside: avoid; page-break-inside: avoid; }
    .pdf-table-section { break-inside: auto; page-break-inside: auto; overflow: visible; }
    .pdf-section-head { display: flex; justify-content: space-between; gap: 5mm; align-items: flex-start; padding-bottom: 3mm; margin-bottom: 4mm; border-bottom: 1px solid #d9e3f0; }
    .pdf-section-head h2 { margin: 0 0 1mm; color: #0f2347; font-size: 15pt; line-height: 1.15; letter-spacing: -.035em; }
    .pdf-section-head p, .pdf-lead { margin: 0; color: #5c6d86; font-size: 9pt; line-height: 1.5; }
    .pdf-section-head > span { white-space: nowrap; border: 1px solid #cbd8ea; border-radius: 999px; padding: 1.6mm 3mm; color: #1d4ed8; background: #f4f7ff; }
    .pdf-kpi-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 3mm; }
    .pdf-kpi-grid article { min-height: 26mm; border: 1px solid #dbe5f1; border-radius: 4mm; padding: 4mm; background: #fbfdff; }
    .pdf-kpi-grid article strong { display: block; margin: 1.5mm 0 1mm; color: #0f2347; font-size: 18pt; line-height: 1; }
    .pdf-kpi-grid article span { display: block; color: #52647e; font-size: 8pt; line-height: 1.35; font-weight: 750; }
    .pdf-lead { margin-bottom: 4mm; font-size: 9.5pt; color: #263a59; }
    .pdf-bars { display: flex; flex-direction: column; gap: 2.5mm; }
    .pdf-bar-row { display: grid; grid-template-columns: 44mm 16mm 1fr; gap: 3mm; align-items: center; font-size: 8pt; font-weight: 800; color: #314765; }
    .pdf-bar-row i { display: block; height: 4.5mm; border-radius: 999px; overflow: hidden; background: #edf3fb; }
    .pdf-bar-row em { display: block; height: 100%; border-radius: inherit; background: #2563eb; }
    .pdf-table-box { border: 1px solid #d6e2f2; border-radius: 3mm; overflow: hidden; background: #fff; }
    .pdf-compact-table-box { margin-top: 3mm; }
    .pdf-real-table { width: 100%; border-collapse: collapse; border-spacing: 0; table-layout: fixed; font-size: 7.6pt; line-height: 1.35; }
    .pdf-real-table thead { display: table-header-group; }
    .pdf-real-table tr { break-inside: avoid; page-break-inside: avoid; }
    .pdf-real-table th, .pdf-real-table td { text-align: left; padding: 2.15mm 2.4mm; border-bottom: 1px solid #e5edf7; vertical-align: top; overflow-wrap: anywhere; word-break: break-word; }
    .pdf-real-table th { background: #f1f6ff; color: #34496a; text-transform: uppercase; font-size: 6.8pt; letter-spacing: .075em; font-weight: 900; }
    .pdf-real-table tbody tr:nth-child(even) td { background: #fbfdff; }
    .pdf-real-table tbody tr:last-child td { border-bottom: 0; }
    .pdf-finding-table th:nth-child(1), .pdf-finding-table td:nth-child(1) { width: 13mm; text-align: center; }
    .pdf-finding-table th:nth-child(3), .pdf-finding-table td:nth-child(3) { width: 28mm; }
    .pdf-risk-data-table th:nth-child(1) { width: 25%; }
    .pdf-risk-data-table th:nth-child(2) { width: 17%; }
    .pdf-risk-data-table th:nth-child(3) { width: 31%; }
    .pdf-risk-data-table th:nth-child(4) { width: 27%; }
    .pdf-action-table th:nth-child(1) { width: 18%; }
    .pdf-action-table th:nth-child(2) { width: 46%; }
    .pdf-action-table th:nth-child(3), .pdf-action-table th:nth-child(4) { width: 18%; }
    .pdf-risk-pill { display: inline-flex; max-width: 100%; border-radius: 999px; padding: 1.1mm 2mm; background: #eef4ff; color: #1d4ed8; font-size: 6.8pt; font-weight: 900; text-transform: uppercase; letter-spacing: .04em; }
    .pdf-table-note { margin-top: 3mm !important; color: #6b7c94 !important; font-size: 7.5pt !important; font-weight: 800; }
    .pdf-empty { padding: 5mm; border: 1px dashed #cbd8ea; border-radius: 4mm; color: #6b7c94; background: #fbfdff; }
    @media print {
      html, body { width: auto; background: #fff !important; }
      body { padding: 0 !important; }
      .pdf-pack { width: 190mm; margin: 0 auto; }
      .pdf-cover, .pdf-section, .pdf-cover-page { box-shadow: none !important; }
      .pdf-section { break-inside: avoid; page-break-inside: avoid; }
      .pdf-table-section { break-inside: auto; page-break-inside: auto; }
    }
  </style>
</head>
<body class="${bodyClass}">
  <main class="pdf-pack">${content}</main>
  ${printScript}
</body>
</html>`;
}


function buildReportAnalysis(report: ReportTemplate | null, filters: ReportFilters, payload?: ReportPayload | null) {
  if (!report) {
    return {
      title: "Report readiness analysis",
      summary: "Select a report template to view the data source, output format and PDF components that can be generated.",
      bullets: [
        "The report catalog will come from the /api/reports/catalog API.",
        "Site, device group, status and date range filters will be applied during preview and generation.",
        "PDF content can be controlled through the Summary, Chart, Detail Table and Recommendation options."
      ],
      sources: ["Endpoint inventory", "Service desk", "Software", "Task/job", "Geolocation"]
    };
  }

  const id = `${report.id} ${report.title}`.toLowerCase();
  const pdfParts = [
    filters.includeSummary ? "summary narrative" : "summary hidden",
    filters.includeChart ? "chart/graph" : "chart hidden",
    filters.includeTable ? "detail table" : "detail table hidden",
    filters.includeRecommendation ? "recommendation" : "recommendation hidden"
  ];

  const bullets = [
    `${report.title} can be generated as ${allowedOutputs(report).join(" / ")}.`,
    `The PDF layout will include ${pdfParts.join(", ")}.`,
    `Current scope: ${filters.relationID ? `site ID ${filters.relationID}` : "all sites"}, ${filters.deviceGroup === "all" ? "all device groups" : filters.deviceGroup.toUpperCase()}, status ${filters.status}.`
  ];

  if (id.includes("ticket") || id.includes("sla") || id.includes("incident") || id.includes("support")) {
    bullets.push("Recommended analysis: ticket volume, queue status, SLA breach candidates, priority and assignment workload.");
  } else if (id.includes("software") || id.includes("application") || id.includes("metering")) {
    bullets.push("Recommended analysis: software coverage, category distribution, unauthorized or outdated candidates and deployment or metering evidence.");
  } else if (id.includes("geo") || id.includes("location")) {
    bullets.push("Recommended analysis: geolocation coverage, abnormal or missing location evidence and latest location history.");
  } else if (id.includes("risk") || id.includes("security") || id.includes("duplicate") || id.includes("compliance")) {
    bullets.push("Recommended analysis: high-risk endpoints, duplicate IPs, stale or offline exposure, SLA risk and data-quality issues.");
  } else {
    bullets.push("Recommended analysis: endpoint health, inventory completeness, lifecycle candidates, telemetry freshness and management score.");
  }

  if (payload) {
    bullets.push(`The current preview contains ${payload.sections.length} section(s), ${payload.dataSources.reduce((sum, item) => sum + Number(item.rows || 0), 0)} source data row(s) and an operational score of ${payload.metrics.operationalScore || 0}%.`);
  }

  return {
    title: "AI report analysis",
    summary: report.description || "Management-ready report generated from available EMA data.",
    bullets,
    sources: report.source.split("+").map((item) => item.trim()).filter(Boolean)
  };
}

export default function Report() {
  const [categories, setCategories] = useState<ReportCategory[]>(FRONTEND_REPORT_CATALOG);
  const [options, setOptions] = useState<ReportOptions>(fallbackOptions);
  const [activeCategory, setActiveCategory] = useState(FRONTEND_REPORT_CATALOG[0]?.name || "");
  const [selectedReport, setSelectedReport] = useState<ReportTemplate | null>(FRONTEND_REPORT_CATALOG[0]?.items?.[0] || null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [filters, setFilters] = useState<ReportFilters>(() => ({
    ...emptyFilters,
    outputFormat: allowedOutputs(FRONTEND_REPORT_CATALOG[0]?.items?.[0] || undefined, fallbackOptions)[0] || "PDF"
  }));
  const [payload, setPayload] = useState<ReportPayload | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(false);
  const [error, setError] = useState("");
  const [previewStatus, setPreviewStatus] = useState("Ready");
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleDraft>({
    frequency: "monthly",
    delivery: "download",
    outputFormat: "PDF",
    time: "09:00",
    dayOfWeek: "monday",
    dayOfMonth: "1"
  });
  const [savedSchedules, setSavedSchedules] = useState<HistoryItem[]>([]);

  const activeReportGroup = useMemo(() => categories.find((item) => item.name === activeCategory) || categories[0] || FRONTEND_REPORT_CATALOG[0], [categories, activeCategory]);
  const previewRows = getPreviewRows(selectedReport || undefined, payload || undefined);

  const filteredReports = useMemo(() => {
    const normalizedSearch = search.toLowerCase();
    return (activeReportGroup?.items || []).filter((item) => {
      const haystack = `${item.title} ${item.description} ${item.type} ${item.source}`.toLowerCase();
      const matchesSearch = haystack.includes(normalizedSearch);
      const matchesType = typeFilter === "all" || item.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [activeReportGroup, search, typeFilter]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("ema-settings-page-active", "ema-report-page-active");
    document.body.classList.add("ema-settings-page-active", "ema-report-page-active");

    return () => {
      document.documentElement.classList.remove("ema-settings-page-active", "ema-report-page-active");
      document.body.classList.remove("ema-settings-page-active", "ema-report-page-active");
    };
  }, []);

  useEffect(() => {
    if (!selectedReport) return;
    if (!allowedOutputs(selectedReport).includes(filters.outputFormat)) {
      setFilters((current) => ({ ...current, outputFormat: allowedOutputs(selectedReport, options)[0] || "PDF" }));
      setScheduleDraft((current) => ({ ...current, outputFormat: allowedOutputs(selectedReport, options)[0] || "PDF" }));
    }
  }, [selectedReport]);

  async function loadInitialData() {
    setBootLoading(true);
    setError("");

    // Render immediately using the local catalog so the sidebar never flashes a loading box.
    // The API catalog is still fetched quietly and replaces the local copy only when it succeeds.
    try {
      const catalogResponse = await apiRequest<{ success: boolean; data: ReportCategory[]; featured?: boolean }>("/api/reports/catalog");
      const incomingCategories = Array.isArray(catalogResponse.data) ? catalogResponse.data : [];
      const incomingCount = incomingCategories.reduce((sum, category) => sum + (category.items?.length || 0), 0);
      const isFeaturedCatalog = catalogResponse.featured === true || (
        incomingCategories.length === 1 &&
        incomingCategories[0]?.name === "Featured Reports" &&
        incomingCount > 0 &&
        incomingCount <= 10
      );
      const loadedCategories = isFeaturedCatalog ? incomingCategories : FRONTEND_REPORT_CATALOG;

      setCategories(loadedCategories);

      const nextCategory = loadedCategories[0] || FRONTEND_REPORT_CATALOG[0];
      const nextReport = selectedReport
        ? nextCategory?.items?.find((item) => item.id === selectedReport.id) || nextCategory?.items?.[0] || null
        : nextCategory?.items?.[0] || null;

      setActiveCategory(nextCategory?.name || "");
      setSelectedReport(nextReport);
      setFilters((current) => ({ ...current, outputFormat: allowedOutputs(nextReport || undefined, fallbackOptions)[0] || "PDF" }));
      setScheduleDraft((current) => ({ ...current, outputFormat: allowedOutputs(nextReport || undefined, fallbackOptions)[0] || "PDF" }));
      setPreviewStatus("Ready");
    } catch {
      setCategories(FRONTEND_REPORT_CATALOG);
      setSelectedReport((current) => current && FRONTEND_REPORT_CATALOG[0].items.some((item) => item.id === current.id) ? current : FRONTEND_REPORT_CATALOG[0]?.items?.[0] || null);
      setActiveCategory(FRONTEND_REPORT_CATALOG[0]?.name || "");
    }

    try {
      const optionsResponse = await apiRequest<{ success: boolean; data: Partial<ReportOptions> }>("/api/reports/options");
      setOptions({
        sites: Array.isArray(optionsResponse.data?.sites) ? optionsResponse.data?.sites || [] : [],
        groups: normalizeOptionList(optionsResponse.data?.groups as any[], fallbackOptions.groups),
        statuses: normalizeOptionList(optionsResponse.data?.statuses as any[], fallbackOptions.statuses),
        dateRanges: normalizeOptionList(optionsResponse.data?.dateRanges as any[], fallbackOptions.dateRanges),
        outputFormats: normalizeOptionList(optionsResponse.data?.outputFormats as any[], fallbackOptions.outputFormats)
      });
    } catch (optionErr) {
      setOptions(fallbackOptions);
      setError(`Report filter options failed, fallback options are used: ${optionErr instanceof Error ? optionErr.message : "Unknown error"}`);
    } finally {
      setBootLoading(false);
    }
  }

  function updateFilter<K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function selectCategory(categoryName: string) {
    const category = categories.find((item) => item.name === categoryName);
    const firstReport = category?.items?.[0] || null;
    setActiveCategory(categoryName);
    setSelectedReport(firstReport);
    setSearch("");
    setTypeFilter("all");
    setPayload(null);
    setPreviewStatus("Ready");
    if (firstReport) {
      const nextOutput = allowedOutputs(firstReport, options)[0] || "PDF";
      updateFilter("outputFormat", nextOutput);
      setScheduleDraft((current) => ({ ...current, outputFormat: nextOutput }));
    }
  }

  function selectTemplate(report: ReportTemplate) {
    setSelectedReport(report);
    setPayload(null);
    setPreviewStatus("Ready");
    const nextOutput = allowedOutputs(report, options)[0] || "PDF";
    updateFilter("outputFormat", nextOutput);
    setScheduleDraft((current) => ({ ...current, outputFormat: nextOutput }));
  }

  async function requestReport(mode: "preview" | "generate") {
    if (!selectedReport) return null;
    setLoading(true);
    setError("");
    try {
      const response = await apiRequest<ReportPayload>(`/api/reports/${mode === "preview" ? "preview" : "generate"}`, {
        method: "POST",
        body: JSON.stringify({ reportId: selectedReport.id, ...filters })
      });
      const responseWithLiveFilters = applyClientRnrLiveOverrides(response, filters);
      setPayload(responseWithLiveFilters);
      setPreviewStatus(mode === "preview" ? "Previewed" : "Generated");
      setIsPreviewOpen(true);

      if (mode === "generate") {
        setHistory((current) => [
          { title: responseWithLiveFilters.report.title, format: filters.outputFormat, time: formatGeneratedTime(), payload: responseWithLiveFilters },
          ...current.slice(0, 7)
        ]);

        if (filters.outputFormat === "PDF") {
          exportPdfPayload(responseWithLiveFilters);
        } else {
          applyOutputAction(responseWithLiveFilters, filters.outputFormat);
        }
      }

      return responseWithLiveFilters;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Report generation failed.");
      setPreviewStatus("Error");
      return null;
    } finally {
      setLoading(false);
    }
  }

  function openRegeneratedPrintWindow(reportPayload: ReportPayload) {
    const printWindow = window.open("", "_blank", "width=1180,height=900");
    if (!printWindow) return false;

    const html = buildRegeneratedReportHtml(reportPayload, filters, { autoPrint: true });
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    return true;
  }

  function exportPdfPayload(reportPayload: ReportPayload) {
    // This export rebuilds the report from live payload as real HTML text/cards/tables.
    // Browser print dialog lets user save the generated output as PDF without adding a new frontend package.
    const opened = openRegeneratedPrintWindow(reportPayload);
    if (!opened) {
      const blob = new Blob([buildRegeneratedReportHtml(reportPayload, filters, { autoPrint: true })], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    }
  }

  async function handleExportPdf() {
    if (!payload) return;
    exportPdfPayload(payload);
  }

  function handleRefresh() {
    setSearch("");
    setTypeFilter("all");
    setPayload(null);
    setPreviewStatus("Ready");
    loadInitialData();
  }

  function handleScheduleSave() {
    if (!selectedReport) return;
    const time = formatGeneratedTime();
    const item = {
      title: `${selectedReport.title} schedule draft`,
      format: scheduleDraft.outputFormat,
      time: `${scheduleDraft.frequency} · ${scheduleDraft.delivery} · ${time}`
    };
    setHistory((current) => [item, ...current.slice(0, 7)]);
    setSavedSchedules((current) => [item, ...current.slice(0, 4)]);
    try {
      const existing = JSON.parse(localStorage.getItem("emaReportSchedules") || "[]");
      localStorage.setItem("emaReportSchedules", JSON.stringify([{ reportId: selectedReport.id, reportTitle: selectedReport.title, filters, schedule: scheduleDraft, savedAt: new Date().toISOString() }, ...existing].slice(0, 20)));
    } catch {
      // Local storage can be disabled in some browsers; schedule draft still stays in the current session.
    }
    setPreviewStatus("Schedule Draft Saved");
    setIsScheduleOpen(false);
  }

  const selectedOutputs = allowedOutputs(selectedReport || undefined, options);
  const selectedStatusOptions = options.statuses?.length ? options.statuses : fallbackOptions.statuses;
  const selectedGroupOptions = options.groups?.length ? options.groups : fallbackOptions.groups;
  const selectedDateRangeOptions = options.dateRanges?.length ? options.dateRanges : fallbackOptions.dateRanges;
  const featuredReports = activeReportGroup?.items || FRONTEND_REPORT_CATALOG[0].items;
  const totalTemplateCount = featuredReports.length;
  const selectedBlueprint = getFeaturedReportBlueprint(selectedReport?.id);
  const selectedPackNumber = getFeaturedReportNumber(featuredReports, selectedReport);
  const reportAnalysis = buildReportAnalysis(selectedReport, filters, payload);

  return (
    <>
      <style>{`
        .report-settings-layout {
          grid-template-columns: 292px minmax(0, 1fr);
        }
        .featured-report-nav-panel {
          position: sticky;
          top: 18px;
          align-self: start;
          max-height: calc(100vh - 42px);
          overflow: hidden;
        }
        .featured-report-nav-panel .panel-head {
          padding: 18px 18px 14px;
        }
        .featured-report-nav-panel .panel-head span {
          font-size: .72rem;
          letter-spacing: .10em;
        }
        .featured-report-nav-panel .panel-head strong {
          font-size: 1rem;
          line-height: 1.2;
        }
        .featured-report-nav-panel .panel-head small {
          font-size: .74rem;
          line-height: 1.35;
        }
        .featured-report-nav-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 14px 14px 16px;
          overflow: auto;
          max-height: calc(100vh - 165px);
        }
        .featured-report-nav-item {
          width: 100%;
          border: 0;
          background: transparent;
          border-radius: 17px;
          padding: 10px 11px;
          min-height: 64px;
          display: grid;
          grid-template-columns: 42px minmax(0, 1fr);
          gap: 10px;
          align-items: center;
          text-align: left;
          color: #142f57;
          box-shadow: none;
          transition: background .18s ease, color .18s ease, transform .18s ease;
        }
        .featured-report-nav-item:hover {
          transform: none;
          background: #f4f8ff;
        }
        .featured-report-nav-item.active {
          color: #fff;
          background: linear-gradient(135deg, #3169ee 0%, #0787b8 100%);
          box-shadow: 0 12px 24px rgba(37, 99, 235, .18);
        }
        .featured-report-nav-icon {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          color: var(--pack-accent, #2563eb);
          background: #eef4ff;
          flex-shrink: 0;
        }
        .featured-report-nav-item.active .featured-report-nav-icon {
          color: #fff;
          background: rgba(255,255,255,.18);
        }
        .featured-report-nav-icon svg { width: 19px; height: 19px; }
        .featured-report-nav-copy { min-width: 0; }
        .featured-report-nav-copy strong {
          display: block;
          font-size: .84rem;
          line-height: 1.22;
          color: currentColor;
          margin-bottom: 3px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .featured-report-nav-copy small {
          display: block;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: #5d708f;
          line-height: 1.25;
          font-size: .70rem;
          font-weight: 700;
        }
        .featured-report-nav-item.active .featured-report-nav-copy small {
          color: rgba(255,255,255,.86);
        }
        .featured-report-nav-badge {
          display: none;
        }
        .featured-report-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(330px, 380px);
          gap: 22px;
          align-items: start;
        }
        .featured-report-main-panel {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .report-pack-command-card {
          position: relative;
          overflow: hidden;
          border-radius: 26px;
          border: 1px solid #d5e3f6;
          background: linear-gradient(135deg, #ffffff 0%, #f7fbff 54%, rgba(37, 99, 235, .08) 100%);
          box-shadow: 0 20px 44px rgba(15, 35, 71, .08);
          padding: 24px;
        }
        .report-pack-command-card::after {
          content: "";
          position: absolute;
          right: -86px;
          top: -86px;
          width: 220px;
          height: 220px;
          border-radius: 999px;
          border: 34px solid color-mix(in srgb, var(--pack-accent, #2563eb) 16%, transparent);
          pointer-events: none;
        }
        .report-pack-command-top {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 18px;
          align-items: start;
        }
        .pack-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 11px;
          border-radius: 999px;
          background: rgba(37, 99, 235, .10);
          color: #2756c8;
          font-size: .72rem;
          font-weight: 900;
          letter-spacing: .1em;
          text-transform: uppercase;
        }
        .report-pack-command-card h3 {
          margin: 12px 0 8px;
          color: #112b52;
          font-size: clamp(1.45rem, 2.2vw, 2.25rem);
          line-height: 1.03;
          letter-spacing: -.05em;
        }
        .report-pack-command-card p {
          margin: 0;
          color: #5c708f;
          line-height: 1.6;
          max-width: 820px;
          font-weight: 600;
        }
        .pack-number {
          width: 78px;
          height: 78px;
          border-radius: 24px;
          display: grid;
          place-items: center;
          background: #fff;
          border: 1px solid #d5e3f6;
          color: var(--pack-accent, #2563eb);
          font-weight: 950;
          font-size: 1.6rem;
          box-shadow: 0 12px 26px rgba(15, 35, 71, .075);
        }
        .report-pack-kpi-row {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-top: 22px;
        }
        .report-pack-kpi-row div {
          background: rgba(255,255,255,.86);
          border: 1px solid #dbe6f5;
          border-radius: 18px;
          padding: 14px;
        }
        .report-pack-kpi-row span,
        .report-pack-section-list span,
        .client-rnr-fields legend {
          display: block;
          color: #7a8dac;
          font-size: .72rem;
          text-transform: uppercase;
          letter-spacing: .08em;
          font-weight: 900;
          margin-bottom: 6px;
        }
        .report-pack-kpi-row strong {
          display: block;
          color: #17325d;
          font-size: .98rem;
          line-height: 1.3;
        }
        .report-pack-section-list {
          border: 1px solid #d5e3f6;
          border-radius: 24px;
          background: #fff;
          padding: 20px;
          box-shadow: 0 12px 30px rgba(15, 35, 71, .055);
        }
        .report-pack-section-list h4,
        .featured-report-card-grid h4 {
          margin: 0 0 4px;
          color: #17325d;
          font-size: 1.08rem;
          letter-spacing: -.02em;
        }
        .report-pack-section-list > p,
        .featured-report-card-grid > p {
          margin: 0 0 16px;
          color: #637691;
          line-height: 1.5;
        }
        .report-section-chip-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .report-section-chip-grid div {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          border: 1px solid #dce7f6;
          border-radius: 15px;
          padding: 12px;
          background: #f8fbff;
          color: #415879;
          line-height: 1.35;
          font-weight: 700;
        }
        .report-section-chip-grid b {
          flex: 0 0 auto;
          color: var(--pack-accent, #2563eb);
          font-size: .8rem;
        }
        .featured-report-card-grid {
          border: 1px solid #d5e3f6;
          border-radius: 24px;
          background: #fff;
          padding: 20px;
          box-shadow: 0 12px 30px rgba(15, 35, 71, .055);
        }
        .featured-pack-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
        .featured-pack-card {
          border: 1px solid #dbe6f5;
          border-left: 4px solid var(--pack-accent, #2563eb);
          border-radius: 18px;
          background: #fff;
          padding: 16px;
          text-align: left;
          min-height: 166px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          box-shadow: 0 10px 24px rgba(15, 35, 71, .045);
          transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
        }
        .featured-pack-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 16px 30px rgba(15, 35, 71, .075);
        }
        .featured-pack-card.active {
          background: linear-gradient(180deg, #fff 0%, #f5f9ff 100%);
          border-color: var(--pack-accent, #2563eb);
        }
        .featured-pack-card h5 {
          margin: 0;
          color: #17325d;
          font-size: 1rem;
          line-height: 1.35;
        }
        .featured-pack-card p {
          margin: 0;
          color: #5f7190;
          line-height: 1.45;
          font-size: .88rem;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .featured-pack-card-footer {
          margin-top: auto;
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
        }
        .featured-pack-card-footer span {
          padding: 6px 9px;
          border-radius: 999px;
          background: #eef4ff;
          color: #2557cd;
          font-size: .7rem;
          font-weight: 900;
        }
        .featured-pack-card-footer b {
          color: var(--pack-accent, #2563eb);
          font-size: .82rem;
        }
        .selected-pack-toolbar {
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          padding: 16px 18px;
        }
        .selected-pack-toolbar-copy {
          display: grid;
          gap: 4px;
          min-width: 0;
        }
        .selected-pack-toolbar-copy span,
        .selected-report-only-panel span,
        .selected-report-detail-card span {
          color: #7a8dac;
          font-size: .72rem;
          text-transform: uppercase;
          letter-spacing: .09em;
          font-weight: 900;
        }
        .selected-pack-toolbar-copy strong {
          color: #122d55;
          font-size: 1.05rem;
          line-height: 1.2;
        }
        .selected-pack-toolbar-copy small {
          color: #617591;
          font-weight: 600;
          line-height: 1.4;
        }
        .selected-report-only-panel {
          border: 1px solid color-mix(in srgb, var(--pack-accent, #2563eb) 38%, #dce7f6);
          border-left: 5px solid var(--pack-accent, #2563eb);
          border-radius: 24px;
          background:
            radial-gradient(circle at top right, color-mix(in srgb, var(--pack-accent, #2563eb) 10%, transparent), transparent 38%),
            #fff;
          padding: 22px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 18px;
          align-items: center;
          box-shadow: 0 14px 32px rgba(15, 35, 71, .06);
        }
        .selected-report-only-panel h4,
        .selected-report-detail-card h4 {
          margin: 7px 0 8px;
          color: #17325d;
          font-size: 1.08rem;
          letter-spacing: -.02em;
        }
        .selected-report-only-panel p,
        .selected-report-detail-card p {
          margin: 0;
          color: #607491;
          line-height: 1.55;
          font-weight: 600;
        }
        .selected-report-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .selected-report-deliverable-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(260px, .9fr);
          gap: 16px;
        }
        .selected-report-detail-card {
          border: 1px solid #d5e3f6;
          border-radius: 24px;
          background: #fff;
          padding: 20px;
          box-shadow: 0 12px 30px rgba(15, 35, 71, .055);
        }
        .selected-report-detail-card.muted {
          background: #f8fbff;
        }
        .selected-report-mini-list {
          display: grid;
          gap: 10px;
          margin-top: 14px;
        }
        .selected-report-mini-list div {
          display: flex;
          gap: 10px;
          align-items: center;
          padding: 11px 12px;
          border: 1px solid #dce7f6;
          border-radius: 14px;
          background: #f8fbff;
        }
        .selected-report-mini-list b {
          color: var(--pack-accent, #2563eb);
          font-size: .76rem;
        }
        .selected-report-mini-list strong {
          color: #405678;
          font-size: .88rem;
          line-height: 1.35;
        }
        .client-rnr-fields {
          border: 1px dashed #bdd1f2;
          border-radius: 18px;
          padding: 14px;
          background: #f8fbff;
          display: grid;
          gap: 12px;
        }
        .client-rnr-fields legend { margin-bottom: 0; }
        .client-rnr-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .config-head h3 { line-height: 1.2; }
        .score-box strong { line-height: 1.08; }
        @media (max-width: 1320px) {
          .report-settings-layout { grid-template-columns: 1fr; }
          .featured-report-nav-panel { position: static; max-height: none; }
          .featured-report-nav-list { max-height: none; display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); }
          .featured-report-layout { grid-template-columns: 1fr; }
        }
        @media (max-width: 780px) {
          .featured-report-nav-list,
          .featured-pack-grid,
          .report-pack-kpi-row,
          .report-section-chip-grid,
          .client-rnr-grid,
          .selected-pack-toolbar,
          .selected-report-only-panel,
          .selected-report-deliverable-grid { grid-template-columns: 1fr; }
          .selected-report-actions { justify-content: flex-start; }
          .report-pack-command-top { grid-template-columns: 1fr; }
          .pack-number { width: 58px; height: 58px; border-radius: 18px; }
        }
        .report-focus-scope { min-width: 0; }
        .report-builder-grid-refined {
          display: grid;
          grid-template-columns: minmax(0, 1.6fr) minmax(320px, 380px);
          gap: 22px;
          align-items: start;
        }
        .report-template-column-refined {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .report-spotlight-shell {
          background: linear-gradient(180deg, #fbfdff 0%, #f3f8ff 100%);
          border: 1px solid #d5e2f6;
          border-radius: 22px;
          padding: 20px;
          box-shadow: 0 12px 30px rgba(15, 35, 71, 0.06);
        }
        .report-spotlight-head {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
          margin-bottom: 16px;
        }
        .report-spotlight-head h3 {
          margin: 6px 0 6px;
          font-size: 1.2rem;
          line-height: 1.3;
          color: #16325c;
        }
        .report-spotlight-head p, .report-spotlight-main p {
          margin: 0;
          color: #5c708f;
          line-height: 1.55;
        }
        .report-spotlight-tag {
          display: inline-flex;
          align-items: center;
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(37, 99, 235, 0.09);
          color: #2756c8;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.08em;
        }
        .report-spotlight-meta {
          display: grid;
          grid-template-columns: repeat(3, minmax(88px, 1fr));
          gap: 10px;
          min-width: 290px;
        }
        .report-spotlight-meta > div {
          background: #fff;
          border: 1px solid #d7e1f2;
          border-radius: 16px;
          padding: 12px 14px;
        }
        .report-spotlight-meta span,
        .report-template-row-meta span,
        .report-spotlight-kicker span {
          display: block;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #7a8dab;
          margin-bottom: 6px;
        }
        .report-spotlight-meta strong,
        .report-template-row-meta strong,
        .report-spotlight-kicker b {
          display: block;
          color: #183153;
          line-height: 1.35;
          font-size: 0.98rem;
        }
        .report-spotlight-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
          gap: 16px;
          align-items: stretch;
        }
        .report-spotlight-main {
          background: rgba(255,255,255,0.82);
          border: 1px solid #d5e2f6;
          border-radius: 18px;
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .report-spotlight-main h4 {
          margin: 0;
          font-size: 1.05rem;
          color: #16325c;
        }
        .report-source-chips-refined {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .report-source-chips-refined span {
          padding: 8px 12px;
          border-radius: 999px;
          background: #eef4ff;
          border: 1px solid #cddcf6;
          color: #2457cd;
          font-size: 0.8rem;
          font-weight: 700;
        }
        .report-spotlight-points {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .report-spotlight-point {
          background: #fff;
          border: 1px solid #d7e1f2;
          border-radius: 18px;
          padding: 16px;
          min-height: 120px;
        }
        .report-spotlight-point span {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 12px;
          background: #edf3ff;
          color: #2756c8;
          font-size: 0.86rem;
          font-weight: 800;
          margin-bottom: 10px;
        }
        .report-spotlight-point p {
          margin: 0;
          color: #4f6485;
          line-height: 1.55;
          font-weight: 600;
        }
        .report-template-stack {
          display: flex;
          flex-direction: column;
          gap: 14px;
          max-height: 650px;
          overflow: auto;
          padding-right: 4px;
        }
        .report-template-row {
          width: 100%;
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(220px, 0.8fr) 132px;
          gap: 16px;
          align-items: center;
          text-align: left;
          background: #fff;
          border: 1px solid #d8e3f3;
          border-left: 4px solid var(--accent, #2563eb);
          border-radius: 18px;
          padding: 18px 18px 18px 16px;
          box-shadow: 0 10px 22px rgba(15, 35, 71, 0.045);
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }
        .report-template-row:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 26px rgba(15, 35, 71, 0.07);
          border-color: #bfd2f4;
        }
        .report-template-row.active {
          background: linear-gradient(180deg, #ffffff 0%, #f5f9ff 100%);
          border-color: #9cbcf4;
          box-shadow: 0 18px 34px rgba(37, 99, 235, 0.12);
        }
        .report-template-row-main, .report-template-row-meta { min-width: 0; }
        .report-template-row-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 8px;
        }
        .report-template-row-head h4 {
          margin: 0;
          color: #17325d;
          font-size: 1.05rem;
          line-height: 1.35;
        }
        .report-template-row-main p {
          margin: 0;
          color: #5d7190;
          line-height: 1.55;
        }
        .report-type-pill {
          flex-shrink: 0;
          padding: 7px 11px;
          border-radius: 999px;
          background: rgba(37, 99, 235, 0.09);
          color: #2557cd;
          font-size: 0.76rem;
          font-weight: 800;
        }
        .report-template-row-meta {
          display: grid;
          gap: 12px;
        }
        .report-template-row-action {
          justify-self: stretch;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          min-height: 88px;
          border-radius: 16px;
          border: 1px solid #d7e1f2;
          background: #f6f9ff;
          color: #2457cd;
        }
        .report-template-row-action small {
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #7d8fad;
        }
        .report-template-row-action b {
          font-size: 0.95rem;
        }
        .report-template-row.active .report-template-row-action {
          background: #edf4ff;
          border-color: #b7cef7;
        }
        .report-config-panel { position: sticky; top: 16px; }
        @media (max-width: 1400px) {
          .report-template-row { grid-template-columns: minmax(0, 1fr); }
          .report-template-row-action { min-height: 72px; }
        }
        @media (max-width: 1280px) {
          .report-builder-grid-refined { grid-template-columns: 1fr; }
          .report-config-panel { position: static; top: auto; }
        }
        @media (max-width: 900px) {
          .report-spotlight-head,
          .report-spotlight-grid {
            display: grid;
            grid-template-columns: 1fr;
          }
          .report-spotlight-meta { grid-template-columns: repeat(3, minmax(0, 1fr)); min-width: 0; }
          .report-spotlight-points { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .report-spotlight-meta { grid-template-columns: 1fr; }
        }
      `}</style>
      <main className="settings-module-root ema-settings-pro ema-report-pro ema-report-module-root report-module-root" data-section="report">
        <input aria-hidden="true" id="globalSearch" type="hidden" />
        <button hidden id="themeBtn" type="button">
          <span id="themeLabel">Dark Mode</span>
        </button>

        <div className="settings-layout report-settings-layout">
          <aside className="settings-menu report-category-panel ema-panel-surface featured-report-nav-panel">
            <div className="panel-head">
              <span>REPORT CENTER</span>
              <strong>Featured Report Packs</strong>
              <small>Only the six management-ready reports are shown here.</small>
            </div>

            <div className="featured-report-nav-list" role="tablist" aria-label="Featured report pack navigation">
              {featuredReports.map((report) => {
                const blueprint = getFeaturedReportBlueprint(report.id);
                const isActive = report.id === selectedReport?.id;
                return (
                  <button
                    key={report.id}
                    type="button"
                    className={`featured-report-nav-item ${isActive ? "active" : ""}`}
                    style={{ "--pack-accent": blueprint.accent } as CSSProperties}
                    onClick={() => selectTemplate(report)}
                  >
                    <span className="featured-report-nav-icon" dangerouslySetInnerHTML={{ __html: icons[blueprint.icon] || icons.chart }} />
                    <span className="featured-report-nav-copy">
                      <strong>{report.title}</strong>
                      <small>{blueprint.bestFor}</small>
                      <em className="featured-report-nav-badge">{blueprint.eyebrow}</em>
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="settings-content report-main-content">
            <div className="settings-hero ema-panel-surface users-hero">
              <div>
                <span className="eyebrow">REPORT GENERATOR WORKSPACE</span>
                <h2 id="categoryTitle">Featured Report Center</h2>
                <p id="categoryDesc">Six curated packs only: AI summary, client RNR, hardware lifecycle, operations SLA, security exposure and software governance.</p>
              </div>
              <div className="settings-score users-hero-score">
                <div className="score-box">
                  <span>Featured Reports</span>
                  <strong>{totalTemplateCount}</strong>
                  <small>Curated packs</small>
                </div>
                <div className="score-box">
                  <span>Selected Pack</span>
                  <strong>{selectedPackNumber}</strong>
                  <small>{selectedReport?.title || "No pack selected"}</small>
                </div>
                <div className="score-box">
                  <span>Status</span>
                  <strong>{previewStatus}</strong>
                  <small>{payload ? formatDateTime(payload.generatedAt) : "No preview yet"}</small>
                </div>
                <div className="score-box">
                  <span>Generated</span>
                  <strong>{history.length}</strong>
                  <small>Current session</small>
                </div>
              </div>
            </div>

            <div className="content-shell ema-panel-surface report-workspace-shell">
              <div className="content-toolbar report-toolbar selected-pack-toolbar">
                <div className="selected-pack-toolbar-copy">
                  <span>SELECTED REPORT MODULE</span>
                  <strong>{selectedReport?.title || "Choose a report pack"}</strong>
                  <small>{selectedBlueprint.intent}</small>
                </div>

                <div className="content-actions toolbar-actions report-toolbar-actions d-flex align-items-center justify-content-end gap-2">
                  <button className="btn soft-btn" id="refreshBtn" type="button" onClick={handleRefresh} disabled={loading}>
                    Refresh Data
                  </button>
                  <button className="btn primary-btn" id="scheduleBtn" type="button" onClick={() => setIsScheduleOpen(true)} disabled={!selectedReport}>
                    New Schedule
                  </button>
                </div>
              </div>

              {error && <div className="settings-inline-alert error report-error-banner">{error}</div>}

              <div className="content-body report-workspace-body report-focus-scope" id="contentBody">
                <div className="featured-report-layout" style={{ "--pack-accent": selectedBlueprint.accent } as CSSProperties}>
                  <section className="featured-report-main-panel">
                    <div className="report-pack-command-card">
                      <div className="report-pack-command-top">
                        <div>
                          <span className="pack-eyebrow">{selectedBlueprint.eyebrow}</span>
                          <h3>{selectedReport?.title || "Select featured report"}</h3>
                          <p>{selectedReport?.description || "Choose one of the six report packs from the left panel."}</p>
                        </div>
                        <div className="pack-number">{selectedPackNumber}</div>
                      </div>

                      <div className="report-pack-kpi-row">
                        <div><span>Report Pack</span><strong>{selectedBlueprint.eyebrow}</strong></div>
                        <div><span>Best For</span><strong>{selectedBlueprint.bestFor}</strong></div>
                        <div><span>Output</span><strong>{selectedOutputs.map(outputLabel).join(" / ")}</strong></div>
                        <div><span>Scope</span><strong>{filters.relationID === 0 ? "All Sites" : options.sites.find((site) => site.id === filters.relationID)?.name || "Selected Site"}</strong></div>
                      </div>
                    </div>

                    <div className="report-pack-section-list">
                      <span>Report Content</span>
                      <h4>What this report will include</h4>
                      <p>{selectedBlueprint.intent}</p>
                      <div className="report-section-chip-grid">
                        {selectedBlueprint.sections.map((section, index) => (
                          <div key={`${section}-${index}`}><b>{String(index + 1).padStart(2, "0")}</b><strong>{section}</strong></div>
                        ))}
                      </div>
                    </div>

                    <div className="selected-report-only-panel">
                      <div>
                        <span>ONLY THIS REPORT WILL BE GENERATED</span>
                        <h4>{selectedReport?.title || "Selected report"}</h4>
                        <p>
                          The center area now shows the selected module only. Other report packs stay in the left sidebar as navigation and will not be mixed into this report preview or output.
                        </p>
                      </div>
                      <div className="selected-report-actions">
                        <button className="btn soft-btn" type="button" onClick={() => requestReport("preview")} disabled={!selectedReport || loading}>
                          Preview This Report
                        </button>
                        <button className="btn primary-btn" type="button" onClick={() => requestReport("generate")} disabled={!selectedReport || loading}>
                          Generate This Report
                        </button>
                      </div>
                    </div>

                    <div className="selected-report-deliverable-grid">
                      <div className="selected-report-detail-card">
                        <span>Deliverables</span>
                        <h4>Output for this module</h4>
                        <div className="selected-report-mini-list">
                          {selectedBlueprint.deliverables.map((item, index) => (
                            <div key={`${item}-${index}`}><b>{String(index + 1).padStart(2, "0")}</b><strong>{item}</strong></div>
                          ))}
                        </div>
                      </div>

                      <div className="selected-report-detail-card muted">
                        <span>Not Combined</span>
                        <h4>No mixed report cards here</h4>
                        <p>
                          Summary reports will contain summary sections only. Client RNR will contain RNR sections only. Hardware, Operations, Security and Software reports stay separated by module.
                        </p>
                      </div>
                    </div>
                  </section>

                  <aside className="config-panel report-config-panel">
                    <div className="config-card">
                      <div className="config-head">
                        <span>BUILD REPORT</span>
                        <h3 id="selectedTitle">{selectedReport?.title || "No report selected"}</h3>
                        <p id="selectedDesc">{selectedBlueprint.intent}</p>
                      </div>

                      <div className="selected-meta selected-action-meta">
                        <button type="button" className="meta-pill active" onClick={() => selectedReport && setTypeFilter(selectedReport.type)}>{selectedReport?.type || "-"}</button>
                        {selectedOutputs.map((output) => (
                          <button
                            type="button"
                            key={output}
                            className={`meta-pill ${filters.outputFormat === output ? "active" : ""}`}
                            onClick={() => updateFilter("outputFormat", output)}
                          >
                            {outputLabel(output)}
                          </button>
                        ))}
                      </div>

                      <div className="config-form">
                        <label>
                          Date Range
                          <select className="form-select setting-select" value={filters.dateRange} onChange={(event) => updateFilter("dateRange", event.target.value)}>
                            {selectedDateRangeOptions.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
                          </select>
                        </label>
                        {filters.dateRange === "custom" && (
                          <div className="date-range-grid">
                            <label>
                              Start Date
                              <input className="form-control setting-input" type="date" value={filters.startDate || ""} onChange={(event) => updateFilter("startDate", event.target.value)} />
                            </label>
                            <label>
                              End Date
                              <input className="form-control setting-input" type="date" value={filters.endDate || ""} onChange={(event) => updateFilter("endDate", event.target.value)} />
                            </label>
                          </div>
                        )}
                        <label>
                          Site / Branch
                          <select className="form-select setting-select" value={filters.relationID} onChange={(event) => updateFilter("relationID", Number(event.target.value))}>
                            <option value={0}>All Sites</option>
                            {options.sites.map((site) => <option value={site.id} key={site.id}>{site.name}</option>)}
                          </select>
                        </label>
                        <label>
                          Device Group
                          <select className="form-select setting-select" value={filters.deviceGroup} onChange={(event) => updateFilter("deviceGroup", event.target.value)}>
                            {selectedGroupOptions.map((group) => <option value={group.value} key={group.value}>{group.label}</option>)}
                          </select>
                        </label>
                        <label>
                          Endpoint Status
                          <select className="form-select setting-select" value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
                            {selectedStatusOptions.map((status) => <option value={status.value} key={status.value}>{status.label}</option>)}
                          </select>
                        </label>

                        {selectedReport?.id === "client-summary-rnr" && (
                          <fieldset className="client-rnr-fields">
                            <legend>Client RNR Details</legend>
                            <label>
                              Client Name
                              <input className="form-control setting-input" value={filters.clientName || ""} onChange={(event) => updateFilter("clientName", event.target.value)} placeholder="Client name for report cover" />
                            </label>
                            <div className="client-rnr-grid">
                              <label>
                                Service Type
                                <input className="form-control setting-input" value={filters.serviceType || ""} onChange={(event) => updateFilter("serviceType", event.target.value)} placeholder="Subscribe / Purchase" />
                              </label>
                              <label>
                                Version
                                <input className="form-control setting-input" value={filters.solutionVersion || ""} onChange={(event) => updateFilter("solutionVersion", event.target.value)} placeholder="EMA System / version" />
                              </label>
                              <label>
                                Start Contract
                                <input className="form-control setting-input" type="date" value={filters.contractStart || ""} onChange={(event) => updateFilter("contractStart", event.target.value)} />
                              </label>
                              <label>
                                End Contract
                                <input className="form-control setting-input" type="date" value={filters.contractEnd || ""} onChange={(event) => updateFilter("contractEnd", event.target.value)} />
                              </label>
                              <label>
                                Total Nodes
                                <input className="form-control setting-input" type="number" min="0" value={filters.contractedNodes || 0} onChange={(event) => updateFilter("contractedNodes", Number(event.target.value || 0))} />
                              </label>
                            </div>
                          </fieldset>
                        )}

                        <div className="check-grid">
                          <label className="inline-check"><input checked={filters.includeChart} type="checkbox" onChange={(event) => updateFilter("includeChart", event.target.checked)} /> Include Chart</label>
                          <label className="inline-check"><input checked={filters.includeSummary} type="checkbox" onChange={(event) => updateFilter("includeSummary", event.target.checked)} /> Include Summary</label>
                          <label className="inline-check"><input checked={filters.includeTable} type="checkbox" onChange={(event) => updateFilter("includeTable", event.target.checked)} /> Detail Table</label>
                          <label className="inline-check"><input checked={filters.includeRecommendation} type="checkbox" onChange={(event) => updateFilter("includeRecommendation", event.target.checked)} /> Recommendation</label>
                        </div>

                        <label>
                          Output Format
                          <select className="form-select setting-select" id="outputFormat" value={filters.outputFormat} onChange={(event) => updateFilter("outputFormat", event.target.value)}>
                            {selectedOutputs.map((output) => <option key={output} value={output}>{outputLabel(output)}</option>)}
                          </select>
                        </label>
                      </div>

                      <div className="config-actions d-flex align-items-center gap-2">
                        <button className="btn soft-btn" id="previewBtn" type="button" onClick={() => requestReport("preview")} disabled={!selectedReport || loading}>
                          {loading ? "Loading..." : "Preview"}
                        </button>
                        <button className="btn primary-btn" id="generateBtn" type="button" onClick={() => requestReport("generate")} disabled={!selectedReport || loading}>
                          Generate
                        </button>
                      </div>

                      <div className="report-preview-map">
                        <strong>PDF content preview</strong>
                        {selectedBlueprint.sections.slice(0, 7).map((row, index) => <span key={`${row}-${index}`}>{row}</span>)}
                      </div>

                      {history.length > 0 && (
                        <div className="report-history-list">
                          <strong>Generated History</strong>
                          {history.slice(0, 5).map((item, index) => (
                            <button
                              key={`${item.title}-${index}`}
                              type="button"
                              onClick={() => {
                                if (item.payload) {
                                  setPayload(item.payload);
                                  setIsPreviewOpen(true);
                                }
                              }}
                            >
                              <span>{item.title}</span>
                              <small>{item.format} · {item.time}</small>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </aside>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <div aria-hidden={!isPreviewOpen} className={`executive-preview-modal ${isPreviewOpen ? "open" : ""}`} id="executivePreviewModal" onClick={(event) => event.target === event.currentTarget && setIsPreviewOpen(false)}>
        <div className="executive-preview-shell dynamic-preview-shell">
          <div className="executive-preview-top">
            <div className="executive-preview-top-left">
              <strong>{payload?.report.title || selectedReport?.title || "Report Preview"}</strong>
              <span>{payload ? `Prepared on ${formatDateTime(payload.generatedAt)}` : "Preview will appear after the report is prepared."}</span>
            </div>
            <div className="executive-preview-actions d-flex align-items-center justify-content-end gap-2">
              <button className="btn soft-btn" type="button" onClick={() => setIsPreviewOpen(false)}>Close</button>
              <button className="btn soft-btn" type="button" onClick={() => payload && downloadCsv(payload)} disabled={!payload}><DownloadIcon /> Excel/CSV</button>
              <button className="btn soft-btn" type="button" onClick={() => payload && downloadPowerPoint(payload)} disabled={!payload}>PowerPoint</button>
              <button className="btn soft-btn" type="button" onClick={handleExportPdf} disabled={!payload}>Export PDF</button>
              <button className="btn primary-btn" type="button" onClick={() => requestReport("generate")} disabled={!selectedReport || loading}>Generate Report</button>
            </div>
          </div>
          <div className="executive-preview-body report-print-preview-body" style={{ display: "flex", justifyContent: "center", alignItems: "flex-start", overflow: "auto", background: "#eef3f8", padding: "18px 20px" }}>
            {payload ? (
              <iframe
                key={`${payload.report.id}-${payload.generatedAt}-${filters.outputFormat}`}
                title={`${payload.report.title} print preview`}
                className="report-print-preview-frame"
                srcDoc={buildRegeneratedReportHtml(payload, filters, { autoPrint: false, preview: true })}
                style={{ width: "min(100%, 860px)", maxWidth: "860px", minHeight: "calc(100vh - 150px)", border: 0, borderRadius: 18, background: "#eef3f8", display: "block", flex: "0 0 auto", boxShadow: "0 18px 45px rgba(15,35,71,.14)" }}
              />
            ) : <div className="report-empty-block">No preview data yet.</div>}
          </div>
        </div>
      </div>

      <div aria-hidden={!isScheduleOpen} className={`executive-preview-modal ${isScheduleOpen ? "open" : ""}`} onClick={(event) => event.target === event.currentTarget && setIsScheduleOpen(false)}>
        <div className="report-schedule-dialog">
          <div className="config-head">
            <span>SCHEDULE DRAFT</span>
            <h3>{selectedReport?.title || "Report Schedule"}</h3>
            <p>This saves a schedule draft in the local generated history. Backend automation can be added later if needed.</p>
          </div>
          <div className="config-form">
            <label>
              Frequency
              <select className="form-select setting-select" value={scheduleDraft.frequency} onChange={(event) => setScheduleDraft((current) => ({ ...current, frequency: event.target.value }))}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </label>
            {scheduleDraft.frequency === "weekly" && (
              <label>
                Day of Week
                <select className="form-select setting-select" value={scheduleDraft.dayOfWeek} onChange={(event) => setScheduleDraft((current) => ({ ...current, dayOfWeek: event.target.value }))}>
                  <option value="monday">Monday</option>
                  <option value="tuesday">Tuesday</option>
                  <option value="wednesday">Wednesday</option>
                  <option value="thursday">Thursday</option>
                  <option value="friday">Friday</option>
                </select>
              </label>
            )}
            {(scheduleDraft.frequency === "monthly" || scheduleDraft.frequency === "quarterly") && (
              <label>
                Day of Month
                <select className="form-select setting-select" value={scheduleDraft.dayOfMonth} onChange={(event) => setScheduleDraft((current) => ({ ...current, dayOfMonth: event.target.value }))}>
                  {Array.from({ length: 28 }, (_, index) => String(index + 1)).map((day) => <option value={day} key={day}>{day}</option>)}
                </select>
              </label>
            )}
            <label>
              Time
              <input className="form-control setting-input" type="time" value={scheduleDraft.time} onChange={(event) => setScheduleDraft((current) => ({ ...current, time: event.target.value }))} />
            </label>
            <label>
              Delivery
              <select className="form-select setting-select" value={scheduleDraft.delivery} onChange={(event) => setScheduleDraft((current) => ({ ...current, delivery: event.target.value }))}>
                <option value="download">Manual Download</option>
                <option value="email-draft">Email Draft</option>
                <option value="management-pack">Management Pack</option>
              </select>
            </label>
            <label>
              Output
              <select className="form-select setting-select" value={scheduleDraft.outputFormat} onChange={(event) => setScheduleDraft((current) => ({ ...current, outputFormat: event.target.value }))}>
                {selectedOutputs.map((output) => <option key={output} value={output}>{outputLabel(output)}</option>)}
              </select>
            </label>
            {savedSchedules.length > 0 && (
              <div className="schedule-preview-list">
                <strong>Saved Drafts</strong>
                {savedSchedules.map((item, index) => <small key={`${item.title}-${index}`}>{item.title} · {item.time}</small>)}
              </div>
            )}
          </div>
          <div className="config-actions d-flex align-items-center gap-2">
            <button className="btn soft-btn" type="button" onClick={() => setIsScheduleOpen(false)}>Cancel</button>
            <button className="btn primary-btn" type="button" onClick={handleScheduleSave}>Save Draft</button>
          </div>
        </div>
      </div>
    </>
  );
}
