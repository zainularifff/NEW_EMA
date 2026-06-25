import { DragEvent, useMemo, useState, type CSSProperties } from "react";
import { previewReport } from "../services/reportService";
import { buildBuilderReportHtml } from "../utils/reportPdfBuilderOutput";
import "../styles/report-builder-rules.css";

type Category = "Standard" | "Dynamic";
type Pack = { id: string; title: string; subtitle: string; category: Category; tone: string; icon: string; standalone?: boolean; dynamic?: boolean };
type RangePreset = "today" | "this-week" | "this-month" | "last-30-days" | "custom";
type Range = { preset: RangePreset; from: string; to: string };

const PACKS: Pack[] = [
  { id: "ai-executive-summary", title: "AI Executive Summary", subtitle: "Standalone executive snapshot", category: "Standard", tone: "#2563eb", icon: "▥", standalone: true },
  { id: "client-summary-rnr", title: "Client RNR Report", subtitle: "Client risk and resource view", category: "Standard", tone: "#0f766e", icon: "◈" },
  { id: "hardware-asset-lifecycle", title: "Hardware Lifecycle", subtitle: "Asset lifecycle and refresh planning", category: "Standard", tone: "#7c3aed", icon: "▧" },
  { id: "operations-health-sla", title: "Ops Health & SLA", subtitle: "Operations and SLA health", category: "Standard", tone: "#0284c7", icon: "▤" },
  { id: "security-compliance-exposure", title: "Security Exposure", subtitle: "Risk and compliance exposure", category: "Standard", tone: "#ef4444", icon: "!" },
  { id: "software-application-governance", title: "Software Governance", subtitle: "BSA and software governance", category: "Standard", tone: "#f59e0b", icon: "◇" },
  { id: "software-metering-report", title: "Software Metering", subtitle: "Licence usage, installs and cleanup evidence", category: "Standard", tone: "#f97316", icon: "◫" },
  { id: "software-roi-report", title: "ROI Software", subtitle: "Savings opportunity, licence utilisation and reclaim value", category: "Standard", tone: "#16a34a", icon: "RM" },
  { id: "application-metering-report", title: "Application Metering", subtitle: "Application usage, active users and low usage apps", category: "Standard", tone: "#06b6d4", icon: "▦" },
  { id: "internet-metering-report", title: "Internet Metering", subtitle: "Bandwidth, users, department and category usage", category: "Standard", tone: "#14b8a6", icon: "◎" },
  { id: "dynamic-compliance-report", title: "Compliance Report", subtitle: "AI compliance narrative", category: "Dynamic", tone: "#f59e0b", icon: "✓", dynamic: true },
  { id: "dynamic-cost-saving-report", title: "Cost Saving Report", subtitle: "AI savings and optimisation", category: "Dynamic", tone: "#10b981", icon: "↗", dynamic: true },
  { id: "dynamic-risk-management-report", title: "Risk Management Report", subtitle: "AI risk management analysis", category: "Dynamic", tone: "#ef4444", icon: "⚠", dynamic: true },
];

const TEMPLATES = [
  { title: "Metering Governance Pack", packs: ["software-metering-report", "application-metering-report", "internet-metering-report"] },
  { title: "Software ROI Pack", packs: ["software-roi-report", "software-metering-report", "application-metering-report"] },
  { title: "Ops + Risk Pack", packs: ["operations-health-sla", "security-compliance-exposure", "hardware-asset-lifecycle"] },
];

function iso(date: Date) { return date.toISOString().slice(0, 10); }
function startOfWeek(date: Date) { const copy = new Date(date); const day = copy.getDay() || 7; copy.setDate(copy.getDate() - day + 1); return copy; }
function rangeForPreset(preset: RangePreset): Range {
  const end = new Date();
  const start = new Date();
  if (preset === "today") return { preset, from: iso(end), to: iso(end) };
  if (preset === "this-week") return { preset, from: iso(startOfWeek(end)), to: iso(end) };
  if (preset === "this-month") return { preset, from: iso(new Date(end.getFullYear(), end.getMonth(), 1)), to: iso(end) };
  start.setDate(end.getDate() - 29);
  return { preset: "last-30-days", from: iso(start), to: iso(end) };
}
function reportScope() { return { branchName: "All Branches", scope: "All Sites", relationID: 0, locationBranch: "All Branches" }; }
function isStandalone(pack: Pack | null) { return Boolean(pack?.standalone || pack?.id === "ai-executive-summary"); }
function categoryLabel(pack: Pack) { return pack.category === "Dynamic" ? "AI Dynamic Reporting" : "Standard Report"; }
function titleForSelection(packs: Pack[]) {
  if (packs.length === 0) return "Management Report Pack";
  if (packs.length === 1) return packs[0].title;
  if (packs.some((pack) => pack.id === "software-roi-report")) return "Software ROI Management Pack";
  if (packs.every((pack) => pack.id.includes("metering"))) return "Metering Governance Pack";
  return "Combined Management Report Pack";
}
function baseFilters(range: Range, pack?: Pack) {
  return {
    ...reportScope(),
    dateRange: range.preset,
    dateRangeLabel: range.preset.replace(/-/g, " "),
    period: `${range.from} to ${range.to}`,
    startDate: range.from,
    endDate: range.to,
    fromDate: range.from,
    toDate: range.to,
    outputFormat: "PDF",
    reportId: pack?.id,
    customReportTitle: pack?.title,
    dynamicReportType: pack?.dynamic ? pack.id : undefined,
    includeSummary: true,
    includeChart: true,
    includeTable: true,
    includeRecommendation: true,
  };
}
function unwrap(response: any) {
  if (response?.data?.report || response?.data?.sections || response?.data?.exportData) return response.data;
  if (response?.report || response?.sections || response?.exportData) return response;
  return null;
}
function hasLiveContent(payload: any) {
  const sections = Array.isArray(payload?.sections) ? payload.sections : [];
  const exportData = payload?.exportData && typeof payload.exportData === "object" ? payload.exportData : {};
  const exportRows = Object.values(exportData).some((value) => Array.isArray(value) && value.length > 0);
  const sectionRows = sections.some((section: any) => Array.isArray(section?.rows) && section.rows.length > 0);
  return sectionRows || exportRows || Object.keys(payload?.metrics || {}).length > 0;
}
function emptyPayload(pack: Pack, range: Range, message = "No live data returned for this report. Check backend report query and selected filters.") {
  return {
    success: true,
    mode: "live-empty",
    generatedAt: new Date().toISOString(),
    report: { id: pack.id, title: pack.title, category: pack.category, type: pack.category, description: pack.subtitle },
    filters: baseFilters(range, pack),
    metrics: {},
    narrative: {
      title: pack.title,
      period: `${range.from} to ${range.to}`,
      scope: "All Sites",
      executiveSummary: message,
      managementConclusion: message,
      keyFindings: [message],
      recommendations: ["Validate backend report query for this report scope."],
    },
    sections: [{ type: "table", title: "Live Data Evidence", rows: [], columns: ["message"] }],
    recommendations: [{ priority: "Action", action: message, owner: "Report Owner", target: "Backend query" }],
    dataSources: [],
    exportData: {},
  };
}
function normalizePayload(response: any, pack: Pack, range: Range) {
  const data = unwrap(response);
  if (!data || !hasLiveContent(data)) return emptyPayload(pack, range);
  return {
    ...data,
    report: { ...(data.report || {}), id: pack.id, title: data.report?.title || pack.title, category: data.report?.category || pack.category, description: data.report?.description || pack.subtitle },
    filters: { ...(data.filters || {}), ...baseFilters(range, pack) },
  };
}
function combinePayload(range: Range, packs: Pack[], payloads: any[]) {
  if (packs.length === 1) return payloads[0];
  const title = titleForSelection(packs);
  const sections = payloads.flatMap((payload, index) => (payload.sections || []).map((section: any) => ({ ...section, title: `${packs[index].title} · ${section.title || section.type}` })));
  const keyFindings = payloads.flatMap((payload, index) => (payload.narrative?.keyFindings || []).map((finding: string) => `${packs[index].title}: ${finding}`));
  return {
    report: { id: "report-pack-builder", title, category: "Combined Report Pack", type: "Combined" },
    generatedAt: new Date().toISOString(),
    filters: { ...baseFilters(range), reportId: "report-pack-builder" },
    narrative: { title, period: `${range.from} to ${range.to}`, scope: "All Sites", executiveSummary: keyFindings.join("\n\n"), managementConclusion: "Combined report pack prepared from selected live report payloads.", keyFindings },
    metrics: Object.assign({}, ...payloads.map((payload) => payload.metrics || {})),
    sections,
    recommendations: payloads.flatMap((payload) => payload.recommendations || []),
    exportData: Object.assign({}, ...payloads.map((payload) => payload.exportData || {})),
  };
}
function openPrint(payload: any, range: Range) {
  const html = buildBuilderReportHtml(payload, baseFilters(range), { autoPrint: true, preview: false });
  const win = window.open("", "_blank", "noopener,noreferrer,width=1100,height=900");
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
}

export default function ReportBuilderRulesLive() {
  const [range, setRange] = useState<Range>(() => rangeForPreset("last-30-days"));
  const [slots, setSlots] = useState<(Pack | null)[]>(() => Array.from({ length: 6 }, () => null));
  const [tab, setTab] = useState<"packs" | "templates">("packs");
  const [filter, setFilter] = useState<"all" | Category>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{ title: string; html: string; count: number } | null>(null);

  const selected = useMemo(() => slots.filter(Boolean) as Pack[], [slots]);
  const buildTitle = titleForSelection(selected);
  const packs = useMemo(() => PACKS.filter((pack) => (filter === "all" || pack.category === filter) && `${pack.title} ${pack.subtitle}`.toLowerCase().includes(search.toLowerCase())), [filter, search]);
  const hasSummary = selected.some(isStandalone);

  const addPack = (pack: Pack, target?: number) => setSlots((current) => {
    if (isStandalone(pack)) {
      const next = Array.from({ length: 6 }, () => null) as (Pack | null)[];
      next[0] = pack;
      setError("AI Executive Summary is standalone and cannot be combined.");
      return next;
    }
    const next = current.map((item) => item?.id === pack.id || isStandalone(item) ? null : item);
    const index = typeof target === "number" ? target : next.findIndex((item) => !item);
    if (index >= 0) next[index] = pack;
    setError("");
    return next;
  });

  const runReport = async (mode: "preview" | "generate") => {
    if (!selected.length) {
      setError("Select at least one report pack first.");
      return;
    }
    setLoading(mode);
    setError("");
    try {
      const responses = [];
      for (const pack of selected) {
        try {
          responses.push(await previewReport(baseFilters(range, pack)));
        } catch (err) {
          responses.push(emptyPayload(pack, range, err instanceof Error ? err.message : "Report request failed."));
        }
      }
      const payloads = responses.map((response, index) => normalizePayload(response, selected[index], range));
      const payload = combinePayload(range, selected, payloads);
      if (mode === "generate") openPrint(payload, range);
      else setPreview({ title: payload.report?.title || buildTitle, html: buildBuilderReportHtml(payload, baseFilters(range), { preview: true, autoPrint: false }), count: selected.length });
    } finally {
      setLoading("");
    }
  };

  const dropPack = (event: DragEvent, index: number) => {
    event.preventDefault();
    const pack = PACKS.find((item) => item.id === event.dataTransfer.getData("text/report-pack"));
    if (pack) addPack(pack, index);
  };

  return (
    <main className="builder-page">
      <section className="builder-top no-report-title">
        <div className="auto-title-field"><span>Report Output</span><strong>{buildTitle}</strong></div>
        <label className="field"><span>Location / Branch</span><select><option>All Branches</option></select></label>
        <label className="field"><span>Date Range</span><select value={range.preset} onChange={(event) => setRange(rangeForPreset(event.target.value as RangePreset))}><option value="today">Today</option><option value="this-week">This Week</option><option value="this-month">This Month</option><option value="last-30-days">Last 30 Days</option><option value="custom">Custom Range</option></select></label>
        {range.preset === "custom" && <><label className="field compact-date"><span>From</span><input type="date" value={range.from} onChange={(event) => setRange((current) => ({ ...current, from: event.target.value }))} /></label><label className="field compact-date"><span>To</span><input type="date" value={range.to} onChange={(event) => setRange((current) => ({ ...current, to: event.target.value }))} /></label></>}
        <div className="actions"><button className="builder-btn" onClick={() => runReport("preview")} disabled={Boolean(loading)}>{loading === "preview" ? "Loading..." : "Preview"}</button><button className="builder-btn primary" onClick={() => runReport("generate")} disabled={Boolean(loading)}>{loading === "generate" ? "Opening PDF..." : "Generate Report"}</button></div>
      </section>
      {error && <div className="error">{error}</div>}
      <section className="builder-layout">
        <aside className="panel"><div className="head"><strong>Report Packs</strong><small>{PACKS.filter((p) => p.category === "Standard").length} standard · {PACKS.filter((p) => p.category === "Dynamic").length} AI dynamic reporting</small></div><div className="tabs"><button className={tab === "packs" ? "active" : ""} onClick={() => setTab("packs")}>Modules</button><button className={tab === "templates" ? "active" : ""} onClick={() => setTab("templates")}>Templates</button></div>{tab === "packs" ? <><div className="search"><input placeholder="Search report packs..." value={search} onChange={(event) => setSearch(event.target.value)} /></div><div className="filters"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All</button><button className={filter === "Standard" ? "active" : ""} onClick={() => setFilter("Standard")}>Standard</button><button className={filter === "Dynamic" ? "active" : ""} onClick={() => setFilter("Dynamic")}>AI Dynamic Reporting</button></div><div className="pack-list">{packs.map((pack) => <button key={pack.id} className={`pack ${isStandalone(pack) ? "standalone" : ""}`} draggable onDragStart={(event) => event.dataTransfer.setData("text/report-pack", pack.id)} onClick={() => addPack(pack)} style={{ "--accent": pack.tone } as CSSProperties}><span className="ico">{pack.icon}</span><strong>{pack.title}</strong><small>{isStandalone(pack) ? "Standalone report" : pack.dynamic ? "AI Dynamic Reporting" : pack.subtitle}</small></button>)}</div></> : <div className="templates">{TEMPLATES.map((template) => <button key={template.title} className="builder-btn" onClick={() => setSlots(Array.from({ length: 6 }, (_, index) => PACKS.find((pack) => pack.id === template.packs[index]) || null))}>{template.title}</button>)}</div>}</aside>
        <section className="canvas-wrap"><div className="canvas-head"><div><strong>Report Canvas</strong><small>{hasSummary ? "AI Executive Summary is standalone." : "Drag report packs here to combine them into one management report."}</small></div><button className="clear" onClick={() => setSlots(Array.from({ length: 6 }, () => null))}>Clear Canvas</button></div><div className="canvas">{slots.map((slot, index) => <div key={index} className="slot" onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropPack(event, index)}>{slot ? <article className={`filled ${isStandalone(slot) ? "standalone" : ""}`} style={{ "--accent": slot.tone } as CSSProperties}><button className="remove" onClick={() => setSlots((current) => current.map((item, itemIndex) => itemIndex === index ? null : item))}>×</button><div><div className="filled-top"><span className="ico">{slot.icon}</span><em>{isStandalone(slot) ? "Standalone" : categoryLabel(slot)}</em></div><h3>{slot.title}</h3><p>{slot.subtitle}</p></div><small>Canvas Slot {index + 1}</small></article> : <div className="slot-empty"><strong>+</strong><span>Drop Report</span></div>}</div>)}</div></section>
        <aside className="panel right"><div className="head"><strong>Build Summary</strong><small>{selected.length} selected report pack{selected.length === 1 ? "" : "s"}</small></div><div className="summary"><div className="metric"><span>Report Output</span><strong>{buildTitle}</strong></div><div className="metric"><span>Branch Scope</span><strong>All Branches</strong></div><div className="metric"><span>Period</span><strong>{range.from} → {range.to}</strong></div><div className="metric"><span>Output</span><strong>{selected.length > 1 ? "Combined PDF" : "Legacy PDF Design"}</strong></div><div className="rule-note">Report content is rendered from live backend payload. No UI fallback rows are generated.</div>{selected.map((pack, index) => <div className="selected-pill" key={`${pack.id}-${index}`}><span className="ico" style={{ "--accent": pack.tone } as CSSProperties}>{pack.icon}</span>{index + 1}. {pack.title}</div>)}</div></aside>
      </section>
      {preview && <div className="backdrop" onClick={(event) => event.target === event.currentTarget && setPreview(null)}><section className="preview"><div className="preview-head"><div><strong>{preview.title}</strong><small>{range.from} to {range.to} · {preview.count} pack{preview.count === 1 ? "" : "s"}</small></div><button className="builder-btn" onClick={() => setPreview(null)}>Close</button></div><iframe className="preview-frame" title={`${preview.title} preview`} srcDoc={preview.html} /></section></div>}
    </main>
  );
}
