import { buildRegeneratedReportHtml } from "./reportPdfCanvas";

type ReportTheme = {
  primary: string;
  accent: string;
  label: string;
  surface: string;
};

const REPORT_THEMES: Record<string, ReportTheme> = {
  "ai-executive-summary": { primary: "#2563eb", accent: "#93c5fd", label: "Executive Report Pack", surface: "#eef5ff" },
  "executive-summary": { primary: "#2563eb", accent: "#93c5fd", label: "Executive Report Pack", surface: "#eef5ff" },
  "client-summary-rnr": { primary: "#0f766e", accent: "#2dd4bf", label: "Client RNR Report Pack", surface: "#ecfdf5" },
  "hardware-asset-lifecycle": { primary: "#7c3aed", accent: "#c4b5fd", label: "Asset Lifecycle Report Pack", surface: "#f5f3ff" },
  "resource-planning-brand-summary": { primary: "#7c3aed", accent: "#c4b5fd", label: "Asset Lifecycle Report Pack", surface: "#f5f3ff" },
  "operations-health-sla": { primary: "#0284c7", accent: "#38bdf8", label: "Operations Health Report Pack", surface: "#ecfeff" },
  "security-compliance-exposure": { primary: "#ef4444", accent: "#fca5a5", label: "Risk & Compliance Report Pack", surface: "#fff1f2" },
  "compliance-exposure": { primary: "#ef4444", accent: "#fca5a5", label: "Risk & Compliance Report Pack", surface: "#fff1f2" },
  "software-application-governance": { primary: "#f59e0b", accent: "#fbbf24", label: "Software Governance Report Pack", surface: "#fffbeb" },
  "software-inventory-summary": { primary: "#f59e0b", accent: "#fbbf24", label: "Software Governance Report Pack", surface: "#fffbeb" },
  "software-metering-report": { primary: "#f97316", accent: "#fdba74", label: "Software Metering Report Pack", surface: "#fff7ed" },
  "application-metering-report": { primary: "#06b6d4", accent: "#67e8f9", label: "Application Metering Report Pack", surface: "#ecfeff" },
  "internet-metering-report": { primary: "#14b8a6", accent: "#5eead4", label: "Internet Metering Report Pack", surface: "#f0fdfa" },
  "software-roi-report": { primary: "#16a34a", accent: "#86efac", label: "ROI Software Report Pack", surface: "#f0fdf4" },
  "dynamic-compliance-report": { primary: "#f59e0b", accent: "#fbbf24", label: "AI Compliance Report Pack", surface: "#fffbeb" },
  "dynamic-cost-saving-report": { primary: "#10b981", accent: "#6ee7b7", label: "AI Cost Saving Report Pack", surface: "#ecfdf5" },
  "dynamic-risk-management-report": { primary: "#ef4444", accent: "#fca5a5", label: "AI Risk Management Report Pack", surface: "#fff1f2" },
  "report-pack-builder": { primary: "#334155", accent: "#94a3b8", label: "Management Combined Report Pack", surface: "#f8fafc" },
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function themeFor(payload: any): ReportTheme {
  const id = String(payload?.report?.id || payload?.filters?.reportId || "");
  const type = String(payload?.report?.type || payload?.report?.category || "").toLowerCase();
  if (REPORT_THEMES[id]) return REPORT_THEMES[id];
  if (type.includes("roi")) return REPORT_THEMES["software-roi-report"];
  if (type.includes("metering")) return REPORT_THEMES["application-metering-report"];
  if (type.includes("risk")) return REPORT_THEMES["security-compliance-exposure"];
  if (type.includes("compliance")) return REPORT_THEMES["software-application-governance"];
  if (type.includes("dynamic")) return REPORT_THEMES["report-pack-builder"];
  return REPORT_THEMES["report-pack-builder"];
}

function legacyCss(payload: any) {
  const theme = themeFor(payload);
  const label = escapeHtml(theme.label);
  return `
    <style id="legacy-report-design-theme">
      :root {
        --legacy-primary: ${theme.primary};
        --legacy-accent: ${theme.accent};
        --legacy-surface: ${theme.surface};
      }
      body {
        background:
          radial-gradient(circle at 12% 0%, color-mix(in srgb, var(--legacy-primary) 12%, transparent), transparent 28rem),
          #eef3f8 !important;
      }
      .pdf-cover-page {
        position: relative !important;
        overflow: hidden !important;
        background:
          radial-gradient(circle at 96% 10%, color-mix(in srgb, var(--legacy-accent) 24%, transparent), transparent 22rem),
          linear-gradient(135deg, #ffffff 0%, var(--legacy-surface) 100%) !important;
        border-top: 9px solid var(--legacy-primary) !important;
      }
      .pdf-cover-page::before {
        content: "";
        position: absolute;
        width: 78mm;
        height: 78mm;
        right: -24mm;
        top: -22mm;
        border-radius: 999px;
        border: 16mm solid color-mix(in srgb, var(--legacy-primary) 13%, transparent);
        pointer-events: none;
      }
      .pdf-cover-page::after {
        content: "${label}";
        position: absolute;
        right: 12mm;
        bottom: 12mm;
        color: color-mix(in srgb, var(--legacy-primary) 18%, transparent);
        font-size: 18pt;
        font-weight: 900;
        letter-spacing: .1em;
        text-transform: uppercase;
        pointer-events: none;
      }
      .pdf-cover-brand-mark,
      .pdf-cover-title-block span,
      .pdf-section-head span,
      .pdf-risk-pill,
      .pdf-severity {
        border-color: color-mix(in srgb, var(--legacy-primary) 28%, #d6e3f5) !important;
        color: var(--legacy-primary) !important;
        background: color-mix(in srgb, var(--legacy-primary) 9%, #ffffff) !important;
      }
      .pdf-cover-title-block h1,
      .pdf-section-head h2,
      .pdf-summary-copy h2,
      .pdf-real-table th {
        color: color-mix(in srgb, var(--legacy-primary) 72%, #071d3b) !important;
      }
      .pdf-cover-meta-table div,
      .pdf-section,
      .pdf-table-box,
      .pdf-focus-card,
      .pdf-evidence-card {
        border-color: color-mix(in srgb, var(--legacy-primary) 18%, #d6e3f5) !important;
      }
      .pdf-section { border-top: 5px solid var(--legacy-primary) !important; }
      .pdf-summary-section {
        background:
          radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--legacy-accent) 16%, transparent), transparent 16rem),
          linear-gradient(180deg, #ffffff 0%, var(--legacy-surface) 100%) !important;
      }
      .pdf-real-table th { background: color-mix(in srgb, var(--legacy-primary) 10%, #f8fbff) !important; }
      .pdf-bars em, .rnr-bars em, .rnr-vbars em { background: linear-gradient(90deg, var(--legacy-primary), var(--legacy-accent)) !important; }
      .pdf-focus-card, .pdf-evidence-card { box-shadow: inset 0 1.5mm 0 color-mix(in srgb, var(--legacy-primary) 10%, transparent), 0 2mm 8mm rgba(15,35,71,.06) !important; }
      .pdf-empty { color: color-mix(in srgb, var(--legacy-primary) 54%, #52647e) !important; background: color-mix(in srgb, var(--legacy-primary) 6%, #ffffff) !important; }
    </style>
  `;
}

export function buildLegacyReportHtml(payload: any, filters: any, _options: { autoPrint?: boolean; preview?: boolean } = {}) {
  const html = buildRegeneratedReportHtml(payload, filters);
  const themedHtml = html.replace("</head>", `${legacyCss(payload)}</head>`);
  const id = escapeHtml(payload?.report?.id || payload?.filters?.reportId || "report");
  return themedHtml.replace("<body ", `<body data-report-id="${id}" `);
}
