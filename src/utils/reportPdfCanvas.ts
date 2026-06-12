type ReportSection = {
  type: string;
  title: string;
  rows: any[];
  columns?: string[];
};

type ReportPayload = any;
type ReportFilters = any;


const REPORT_PDF_TITLES: Record<string, string> = {
  "ai-executive-summary": "Executive Summary Report",
  "executive-summary": "Executive Summary Report",
  "client-summary-rnr": "Client RNR Report",
  "hardware-asset-lifecycle": "Hardware Lifecycle Report",
  "resource-planning-brand-summary": "Hardware Lifecycle Report",
  "operations-health-sla": "Operations SLA Report",
  "security-compliance-exposure": "Security Exposure Report",
  "compliance-exposure": "Security Exposure Report",
  "software-application-governance": "Software Governance Report",
  "software-inventory-summary": "Software Governance Report"
};

function pdfReportTitle(payload: ReportPayload, fallback = "EMA Report") {
  const id = String(payload?.report?.id || "");
  return REPORT_PDF_TITLES[id] || String(payload?.report?.title || fallback);
}


function formatDateTime(value?: string) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("en-MY", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  } catch (err) {
    return value;
  }
}

function formatLabel(value: string) {
  return String(value || "")
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function numberMetric(payload: ReportPayload, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = payload?.metrics?.[key];
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) return numeric;
  }
  return fallback;
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

function buildPdfCoverOnlyPage(payload: ReportPayload, filters: ReportFilters, mode: "executive" | "generic") {
  const generated = formatDateTime(payload.generatedAt);
  const period = payload.narrative.period || filters.dateRange;
  const scope = payload.narrative.scope || "All Sites";
  const title = pdfReportTitle(payload, "EMA Report");
  const intro = payload.report.description || payload.narrative.executiveSummary || "Prepared from the current EMA operational dataset.";
  const label = mode === "executive" ? "Management-ready report pack" : "Operational report pack";

  return `
    <section class="pdf-cover-page pdf-cover-${mode}">
      <header class="pdf-cover-brand-row">
        <div class="pdf-cover-brand-mark">E</div>
        <div><strong>EMA Unified System</strong><small>${pdfText(pdfReportPackName(payload), 70)}</small></div>
      </header>

      <div class="pdf-cover-title-block">
        <span>${pdfText(label, 60)}</span>
        <h1>${pdfText(title, 100)}</h1>
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
          <h2>${pdfText(payload.narrative.title || pdfReportTitle(payload), 90)}</h2>
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
    ${filters.includeTable ? `<section class="pdf-section"><div class="pdf-section-head"><div><h2>Board Attention Focus</h2><p>Management-level attention items are shown in a structured table-friendly layout.</p></div><span>Decision Focus</span></div><div class="pdf-focus-grid">${riskCardsHtml(payload)}</div></section>` : ""}
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
          <h2>${pdfText(payload.narrative.title || pdfReportTitle(payload), 90)}</h2>
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
    ${riskSection && filters.includeTable ? `<section class="pdf-section"><div class="pdf-section-head"><div><h2>${pdfText(riskSection.title, 80)}</h2><p>Evidence and priority items.</p></div><span>Risk</span></div><div class="pdf-focus-grid">${riskCardsHtml(payload)}</div></section>` : ""}
    ${tableSection && filters.includeTable ? `<section class="pdf-section"><div class="pdf-section-head"><div><h2>${pdfText(tableSection.title, 80)}</h2><p>Detail rows are rendered as real selectable table data.</p></div><span>Table</span></div>${tableRowsHtml(tableSection, 32)}</section>` : ""}
    ${filters.includeRecommendation ? `<section class="pdf-section"><div class="pdf-section-head"><div><h2>Recommended Actions</h2><p>Management actions generated from the live report dataset.</p></div><span>Action</span></div>${tableRowsHtml({ type: "table", title: "Actions", rows: payload.recommendations || [] }, 10)}</section>` : ""}
  `;
}

export function buildRegeneratedReportHtml(payload: ReportPayload, filters: ReportFilters) {
  const isExecutive = /executive/i.test(`${payload.report.id} ${payload.report.title} ${payload.report.category || ""}`);
  const content = isExecutive ? buildExecutivePrintableHtml(payload, filters) : buildGenericPrintableHtml(payload, filters);
  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${pdfText(pdfReportTitle(payload), 90)}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #eef3f8; color: #17233c; font-family: "Aptos", "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-feature-settings: "kern" 1, "liga" 1; text-rendering: geometricPrecision; }
    h1, h2, h3, th, .pdf-eyebrow, .pdf-cover-title-block span, .pdf-cover-meta-table small { font-family: "Aptos Display", "Aptos", "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif; }
    body { width: 210mm; min-height: 297mm; }
    .pdf-pack { width: 190mm; margin: 0 auto; display: flex; flex-direction: column; gap: 6mm; }
    .pdf-page-break { page-break-after: always; break-after: page; height: 0; }
    .pdf-cover-page { position: relative; width: 190mm; min-height: 277mm; overflow: hidden; border: 1px solid #d9e3f0; border-radius: 7mm; background: linear-gradient(180deg,#ffffff 0%,#fbfdff 100%); padding: 13mm; page-break-after: always; }
    .pdf-cover-executive { --pdf-cover-primary:#18324f; --pdf-cover-accent:#d3a84e; }
    .pdf-cover-generic { --pdf-cover-primary:#143b72; --pdf-cover-accent:#4f8df7; }
    .pdf-cover-brand-row { position: relative; z-index: 2; display: flex; align-items: center; gap: 4mm; color: #182c45; }
    .pdf-cover-brand-mark { width: 13mm; height: 13mm; border: 1px solid #d5deeb; border-radius: 4mm; display: grid; place-items: center; color: var(--pdf-cover-primary); background:#fff; font-weight: 900; }
    .pdf-cover-brand-row strong { display:block; font-size: 15pt; line-height: 1.1; }
    .pdf-cover-brand-row small { display:block; margin-top: 1mm; color:#718096; font-size: 7pt; text-transform: uppercase; letter-spacing: .14em; font-weight: 900; }
    .pdf-cover-title-block { position: relative; z-index: 2; max-width: 112mm; min-height: 178mm; display: flex; flex-direction: column; justify-content: center; }
    .pdf-cover-title-block span { width: fit-content; padding: 2.2mm 4mm; border:1px solid #d9e3f0; border-radius:999px; background:#fff; color: var(--pdf-cover-primary); font-size: 7pt; font-weight: 900; letter-spacing:.11em; text-transform: uppercase; }
    .pdf-cover-title-block h1 { margin: 7mm 0 0; color:#1d2f45; font-size: 35pt; line-height:.98; letter-spacing:-.055em; }
    .pdf-cover-title-block p { margin: 6mm 0 0; max-width: 92mm; color:#58677b; font-size: 11pt; line-height:1.58; font-weight: 600; }
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
    .pdf-real-table { width: 100%; border-collapse: collapse; border-spacing: 0; table-layout: fixed; font-size: 7.8pt; line-height: 1.35; }
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

    .pdf-cover-wave, .pdf-cover-arc, .pdf-cover-dots { display: none !important; }
    .pdf-cover-page { min-height: auto !important; height: auto !important; padding: 14mm !important; border-radius: 5mm !important; page-break-after: always; background: linear-gradient(135deg,#ffffff 0%,#f8fbff 62%,#eef6ff 100%) !important; }
    .pdf-cover-brand-row { margin-bottom: 20mm !important; }
    .pdf-cover-title-block { min-height: auto !important; max-width: none !important; display: block !important; padding: 0 0 20mm !important; }
    .pdf-cover-title-block h1 { max-width: 142mm !important; margin-top: 6mm !important; color: #0f2347 !important; font-size: 28pt !important; line-height: 1.06 !important; letter-spacing: -.04em !important; }
    .pdf-cover-title-block p { max-width: 130mm !important; color:#52647e !important; font-size: 10.5pt !important; line-height:1.55 !important; }
    .pdf-cover-meta-table { grid-template-columns: repeat(4,minmax(0,1fr)) !important; padding-top: 6mm !important; }
    @media print {
      html, body { width: auto; background: #fff !important; }
      .pdf-pack { width: 190mm; margin: 0 auto; }
      .pdf-cover, .pdf-section { box-shadow: none !important; }
      .pdf-section { break-inside: avoid; page-break-inside: avoid; }
      .pdf-table-section { break-inside: auto; page-break-inside: auto; }
    }
  </style>
</head>
<body>
  <main class="pdf-pack">${content}</main>
  <script>
    const triggerPrint = () => setTimeout(() => { window.focus(); window.print(); }, 250);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(triggerPrint).catch(triggerPrint);
    else window.addEventListener('load', triggerPrint);
  <\/script>
</body>
</html>`;
}
