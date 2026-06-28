import { DragEvent, useMemo, useState, type CSSProperties } from "react";
import { previewReport } from "../services/reportService";
import { buildBuilderReportHtml } from "../utils/reportPdfBuilderOutput";
import { buildReportBlueprintPayload } from "../utils/reportBlueprintPayloads";
import "../styles/report-builder-rules.css";

type Pack = { id: string; title: string; subtitle: string; category: "Standard" | "Dynamic"; tone: string; icon: string; standalone?: boolean; dynamic?: boolean };
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
function isSummary(pack: Pack | null) { return pack?.standalone || pack?.id === "ai-executive-summary"; }
function categoryLabel(pack: Pack) { return pack.category === "Dynamic" ? "AI Dynamic Reporting" : "Standard Report"; }
function metric(value: number) { return `RM ${Math.round(value).toLocaleString()}`; }
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
    includeSummary: true,
    includeChart: true,
    includeTable: true,
    includeRecommendation: true,
  };
}

function fallbackPayload(pack: Pack, range: Range, source: any = {}) {
  if (pack.id === "software-roi-report") {
    const metrics = source.metrics || {};
    const owned = Number(metrics.licensesOwned || metrics.licencesOwned || 920);
    const used = Number(metrics.licensesUsed || metrics.licencesUsed || Math.round(owned * 0.72));
    const unused = Math.max(0, owned - used);
    const lowUsage = Number(metrics.lowUsageApps || metrics.unusedApplications || 38);
    const overused = Number(metrics.overusedLicenses || 12);
    const seatCost = 180;
    const reclaim = unused * seatCost;
    const lowUsageValue = lowUsage * seatCost;
    const exposure = overused * seatCost * 2;
    const total = reclaim + lowUsageValue + exposure;
    const utilisation = owned ? Math.round((used / owned) * 100) : 0;
    return {
      report: { id: pack.id, title: pack.title, category: pack.category, type: "ROI", description: pack.subtitle },
      generatedAt: new Date().toISOString(),
      filters: { ...baseFilters(range, pack), assumedSeatCost: seatCost },
      metrics: { totalRoiOpportunity: total, utilisation, owned, used, unused, lowUsage, overused, reclaim, lowUsageValue, exposure },
      narrative: {
        title: "Software ROI opportunity requires commercial validation",
        period: `${range.from} to ${range.to}`,
        scope: "All Sites",
        executiveSummary: `ROI Software estimates ${metric(total)} potential value from unused licence reclaim, low usage application optimisation and compliance exposure review. This provides a sales-ready view for client business case discussion.`,
        managementConclusion: "Validate software entitlement, usage evidence and renewal value before confirming final ROI.",
        keyFindings: [`Total ROI opportunity is ${metric(total)}.`, `${unused} unused licence seat(s) may be reclaimed.`, `${lowUsage} low usage application(s) should be reviewed before renewal.`, `Licence utilisation is ${utilisation}%.`],
      },
      sections: [
        { type: "kpi", title: "ROI Software KPI", rows: [
          { label: "Total ROI Opportunity", value: metric(total), note: "Reclaim + low usage + exposure." },
          { label: "Licence Utilisation", value: `${utilisation}%`, note: `${used} used / ${owned} owned seats.` },
          { label: "Unused Seats", value: unused, note: `${metric(reclaim)} reclaim value.` },
          { label: "Low Usage Apps", value: lowUsage, note: `${metric(lowUsageValue)} optimisation value.` },
        ]},
        { type: "bar", title: "ROI Software Dashboard", rows: [
          { label: "Unused licence reclaim", value: reclaim },
          { label: "Low usage app saving", value: lowUsageValue },
          { label: "Compliance exposure value", value: exposure },
        ]},
        { type: "bar", title: "Licence Utilisation Chart", rows: [
          { label: "Used seats", value: used },
          { label: "Unused seats", value: unused },
          { label: "Over-used signals", value: overused },
        ]},
        { type: "risk", title: "ROI Decision Focus", rows: [
          { area: "Unused Licence Reclaim", severity: "High", finding: `${unused} unused licence seat(s) can be reviewed.`, action: "Validate owner and reclaim before renewal." },
          { area: "Low Usage Application", severity: "Medium", finding: `${lowUsage} low usage app(s) need business validation.`, action: "Review usage reason and consolidation option." },
          { area: "Compliance Exposure", severity: overused ? "High" : "Low", finding: `${overused} over-used signal(s) require entitlement review.`, action: "Confirm procurement/compliance action." },
        ]},
      ],
      recommendations: [
        { priority: "Priority 1", action: `Validate ${unused} unused licence seat(s).`, owner: "Software Asset Manager", target: "Before renewal" },
        { priority: "Priority 2", action: `Review ${lowUsage} low usage application(s).`, owner: "Application Owner", target: "Next review" },
      ],
    };
  }

  const blueprint = buildReportBlueprintPayload(pack, range, source, baseFilters(range, pack));
  if (blueprint) return blueprint;

  const summary = `${pack.title} is prepared for All Sites covering ${range.from} to ${range.to}. ${pack.subtitle}.`;
  return {
    report: { id: pack.id, title: pack.title, category: pack.category, type: pack.category, description: pack.subtitle },
    generatedAt: new Date().toISOString(),
    filters: baseFilters(range, pack),
    metrics: source.metrics || {},
    narrative: { title: pack.title, period: `${range.from} to ${range.to}`, scope: "All Sites", executiveSummary: summary, managementConclusion: summary, keyFindings: [summary, pack.subtitle] },
    sections: [
      { type: "kpi", title: `${pack.title} KPI`, rows: [{ label: "Report Scope", value: pack.title, note: pack.subtitle }, { label: "Output", value: "PDF", note: "Legacy PDF Design" }] },
      { type: "risk", title: `${pack.title} Management Focus`, rows: [{ area: pack.title, severity: "Review", finding: summary, action: "Validate evidence and owner." }] },
    ],
    recommendations: [{ priority: "Review", action: `Review ${pack.title} findings and assign owner.`, owner: "Management Team", target: "Next review" }],
  };
}

function normalizePayload(response: any, pack: Pack, range: Range) {
  const data = response?.data && typeof response.data === "object" ? response.data : response;
  const returnedId = String(data?.report?.id || data?.filters?.reportId || "").toLowerCase();
  const standardNeedsBlueprint = pack.category === "Standard" && pack.id !== "ai-executive-summary";
  const source = !returnedId || returnedId !== pack.id || standardNeedsBlueprint ? fallbackPayload(pack, range, data) : data;
  return { ...source, report: { ...(source.report || {}), id: pack.id, title: source.report?.title || pack.title, category: source.report?.category || pack.category, description: source.report?.description || pack.subtitle }, filters: { ...(source.filters || {}), ...baseFilters(range, pack) } };
}

function combinePayload(range: Range, packs: Pack[], payloads: any[]) {
  const title = titleForSelection(packs);
  if (packs.length === 1) return payloads[0];
  const sections = payloads.flatMap((payload, index) => (payload.sections || []).map((section: any) => ({ ...section, title: `${packs[index].title} · ${section.title || section.type}` })));
  const keyFindings = payloads.flatMap((payload, index) => (payload.narrative?.keyFindings || []).map((finding: string) => `${packs[index].title}: ${finding}`));
  return {
    report: { id: "report-pack-builder", title, category: "Combined Report Pack", type: "Combined" },
    generatedAt: new Date().toISOString(),
    filters: { ...baseFilters(range), reportId: "report-pack-builder" },
    narrative: { title, period: `${range.from} to ${range.to}`, scope: "All Sites", executiveSummary: keyFindings.join("\n\n"), managementConclusion: "Combined report pack prepared from selected reports.", keyFindings },
    metrics: Object.assign({}, ...payloads.map((payload) => payload.metrics || {})),
    sections,
    recommendations: payloads.flatMap((payload) => payload.recommendations || []),
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

export default function ReportBuilderRulesClean() {
  const [range, setRange] = useState<Range>(() => rangeForPreset("last-30-days"));
  const [slots, setSlots] = useState<(Pack | null)[]>(() => Array.from({ length: 6 }, () => null));
  const [tab, setTab] = useState<"packs" | "templates">("packs");
  const [filter, setFilter] = useState<"all" | "Standard" | "Dynamic">("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{ title: string; html: string; count: number } | null>(null);

  const selected = useMemo(() => slots.filter(Boolean) as Pack[], [slots]);
  const buildTitle = titleForSelection(selected);
  const packs = useMemo(() => PACKS.filter((pack) => (filter === "all" || pack.category === filter) && `${pack.title} ${pack.subtitle}`.toLowerCase().includes(search.toLowerCase())), [filter, search]);
  const hasSummary = selected.some(isSummary);

  const addPack = (pack: Pack, target?: number) => setSlots((current) => {
    if (isSummary(pack)) {
      const next = Array.from({ length: 6 }, () => null) as (Pack | null)[];
      next[0] = pack;
      setError("AI Executive Summary is standalone and cannot be combined.");
      return next;
    }
    const next = current.map((item) => item?.id === pack.id || isSummary(item) ? null : item);
    const index = typeof target === "number" ? target : next.findIndex((item) => !item);
    if (index >= 0) next[index] = pack;
    setError("");
    return next;
  });

  const runReport = async (mode: "preview" | "generate") => {
    if (!selected.length) return setError("Select at least one report pack first.");
    setLoading(mode);
    setError("");
    try {
      const responses = [];
      for (const pack of selected) {
        try { responses.push(await previewReport({ ...baseFilters(range, pack), customReportTitle: pack.title, dynamicReportType: pack.dynamic ? pack.id : undefined })); }
        catch { responses.push({}); }
      }
      const payloads = responses.map((response, index) => normalizePayload(response, selected[index], range));
      const payload = combinePayload(range, selected, payloads);
      if (mode === "generate") openPrint(payload, range);
      else setPreview({ title: payload.report?.title || buildTitle, html: buildBuilderReportHtml(payload, baseFilters(range), { preview: true, autoPrint: false }), count: selected.length });
    } finally { setLoading(""); }
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
        <aside className="panel"><div className="head"><strong>Report Packs</strong><small>{PACKS.filter((p) => p.category === "Standard").length} standard · {PACKS.filter((p) => p.category === "Dynamic").length} AI dynamic reporting</small></div><div className="tabs"><button className={tab === "packs" ? "active" : ""} onClick={() => setTab("packs")}>Modules</button><button className={tab === "templates" ? "active" : ""} onClick={() => setTab("templates")}>Templates</button></div>{tab === "packs" ? <><div className="search"><input placeholder="Search report packs..." value={search} onChange={(event) => setSearch(event.target.value)} /></div><div className="filters"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All</button><button className={filter === "Standard" ? "active" : ""} onClick={() => setFilter("Standard")}>Standard</button><button className={filter === "Dynamic" ? "active" : ""} onClick={() => setFilter("Dynamic")}>AI Dynamic Reporting</button></div><div className="pack-list">{packs.map((pack) => <button key={pack.id} className={`pack ${isSummary(pack) ? "standalone" : ""}`} draggable onDragStart={(event) => event.dataTransfer.setData("text/report-pack", pack.id)} onClick={() => addPack(pack)} style={{ "--accent": pack.tone } as CSSProperties}><span className="ico">{pack.icon}</span><strong>{pack.title}</strong><small>{isSummary(pack) ? "Standalone report" : pack.dynamic ? "AI Dynamic Reporting" : pack.subtitle}</small></button>)}</div></> : <div className="templates">{TEMPLATES.map((template) => <button key={template.title} className="builder-btn" onClick={() => setSlots(Array.from({ length: 6 }, (_, index) => PACKS.find((pack) => pack.id === template.packs[index]) || null))}>{template.title}</button>)}</div>}</aside>
        <section className="canvas-wrap"><div className="canvas-head"><div><strong>Report Canvas</strong><small>{hasSummary ? "AI Executive Summary is standalone." : "Drag report packs here to combine them into one management report."}</small></div><button className="clear" onClick={() => setSlots(Array.from({ length: 6 }, () => null))}>Clear Canvas</button></div><div className="canvas">{slots.map((slot, index) => <div key={index} className="slot" onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropPack(event, index)}>{slot ? <article className={`filled ${isSummary(slot) ? "standalone" : ""}`} style={{ "--accent": slot.tone } as CSSProperties}><button className="remove" onClick={() => setSlots((current) => current.map((item, itemIndex) => itemIndex === index ? null : item))}>×</button><div><div className="filled-top"><span className="ico">{slot.icon}</span><em>{isSummary(slot) ? "Standalone" : categoryLabel(slot)}</em></div><h3>{slot.title}</h3><p>{slot.subtitle}</p></div><small>Canvas Slot {index + 1}</small></article> : <div className="slot-empty"><strong>+</strong><span>Drop Report</span></div>}</div>)}</div></section>
        <aside className="panel right"><div className="head"><strong>Build Summary</strong><small>{selected.length} selected report pack{selected.length === 1 ? "" : "s"}</small></div><div className="summary"><div className="metric"><span>Report Output</span><strong>{buildTitle}</strong></div><div className="metric"><span>Branch Scope</span><strong>All Branches</strong></div><div className="metric"><span>Period</span><strong>{range.from} → {range.to}</strong></div><div className="metric"><span>Output</span><strong>{selected.length > 1 ? "Combined PDF" : "Legacy PDF Design"}</strong></div><div className="rule-note">ROI Software is a normal report pack and can be combined with other reports.</div>{selected.map((pack, index) => <div className="selected-pill" key={`${pack.id}-${index}`}><span className="ico" style={{ "--accent": pack.tone } as CSSProperties}>{pack.icon}</span>{index + 1}. {pack.title}</div>)}</div></aside>
      </section>
      {preview && <div className="backdrop" onClick={(event) => event.target === event.currentTarget && setPreview(null)}><section className="preview"><div className="preview-head"><div><strong>{preview.title}</strong><small>{range.from} to {range.to} · {preview.count} pack{preview.count === 1 ? "" : "s"}</small></div><button className="builder-btn" onClick={() => setPreview(null)}>Close</button></div><iframe className="preview-frame" title={`${preview.title} preview`} srcDoc={preview.html} /></section></div>}
    </main>
  );
}
