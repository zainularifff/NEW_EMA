import React, { useEffect, useMemo, useState } from "react";
import * as Icons from "lucide-react";

import managementDashboardService from "../services/managementDashboardService";
import { useTheme } from "../context/ThemeContext";

type IconComponent = React.ComponentType<{
  size?: number | string;
  strokeWidth?: number | string;
  className?: string;
}>;

const getIcon = (...names: string[]): IconComponent => {
  const iconSet = Icons as unknown as Record<string, IconComponent | undefined>;
  for (const name of names) {
    if (iconSet[name]) return iconSet[name] as IconComponent;
  }
  return (iconSet.Activity || iconSet.Circle || (() => null)) as IconComponent;
};

const IconSet = {
  dashboard: getIcon("LayoutDashboard", "Gauge", "BarChart3"),
  health: getIcon("ShieldCheck", "Shield"),
  money: getIcon("WalletCards", "Wallet", "CreditCard"),
  risk: getIcon("AlertTriangle", "AlertCircle", "ShieldAlert"),
  audit: getIcon("ClipboardCheck", "ClipboardList", "CheckSquare"),
  saving: getIcon("CircleDollarSign", "DollarSign", "BadgeDollarSign"),
  endpoint: getIcon("Monitor", "Laptop", "Computer"),
  users: getIcon("Users", "UsersRound"),
  trend: getIcon("TrendingUp", "LineChart", "BarChart3"),
  calendar: getIcon("CalendarDays", "Calendar"),
  refresh: getIcon("RefreshCw", "RotateCw"),
  download: getIcon("Download", "ArrowDownToLine"),
  filter: getIcon("Filter", "SlidersHorizontal"),
  search: getIcon("Search", "ScanLine"),
  back: getIcon("ArrowLeft", "ChevronLeft"),
  next: getIcon("ChevronRight", "ArrowRight"),
  package: getIcon("Package", "Box"),
  server: getIcon("Server", "Database"),
  activity: getIcon("Activity", "Pulse"),
  sparkles: getIcon("Sparkles", "WandSparkles", "Stars"),
  list: getIcon("ListChecks", "ListTodo"),
  target: getIcon("Target", "Crosshair"),
  clock: getIcon("Clock3", "Clock"),
  table: getIcon("Table2", "Table"),
};

type Tone = "blue" | "green" | "red" | "amber" | "purple" | "cyan" | "pink" | "orange" | "slate";
type DrillLevel = 1 | 2 | 3;

type KpiItem = {
  title: string;
  value: string;
  subValue?: string;
  note?: string;
  trend?: string;
  tone?: Tone;
  icon?: keyof typeof IconSet;
  area?: string;
  key?: string;
};

type DetailItem = {
  label: string;
  value: string;
  tone?: Tone;
  key?: string;
};

type PillarItem = {
  id: string;
  title: string;
  scoreTitle?: string;
  scoreValue?: string;
  scoreUnit?: string;
  scoreStatus?: string;
  statusTone?: Tone;
  secondTitle?: string;
  secondValue?: string;
  secondNote?: string;
  details?: DetailItem[];
  tone?: Tone;
  icon?: keyof typeof IconSet;
  area: string;
};

type BoardAction = {
  area: string;
  key: string;
  issue: string;
  impact: string;
  decision: string;
  priority: "High" | "Medium" | "Low" | string;
};

type TrendPoint = {
  month: string;
  label?: string;
  financialExposure?: number;
  riskExposure?: number;
  serviceRisk?: number;
  signals?: number;
  capex?: number;
  opex?: number;
};

type FinanceData = {
  capexOpex?: TrendPoint[];
  tangibleCost?: number;
  intangibleCost?: number;
  totalCost?: number;
  capexYtd?: number;
  opexYtd?: number;
  riskCost?: number;
  avgMonthlyCost?: number;
  potentialSavings?: number | null;
  actualSavingsRecorded?: boolean;
};

type AnalysisData = {
  headline?: string;
  trend?: TrendPoint[];
  mix?: {
    risk?: number;
    control?: number;
    savings?: number;
  };
  signals?: Array<{
    id?: string;
    title: string;
    subtitle?: string;
    value?: string;
    area?: string;
    key?: string;
    tone?: Tone;
    icon?: keyof typeof IconSet;
  }>;
};

type DrillRow = {
  key: string;
  label: string;
  count?: number;
  value?: number;
  valueFmt?: string;
  sample?: string[];
  level3Area?: string;
  level3Key?: string;
  tone?: Tone;
  impactType?: string;
  riskType?: string;
  costType?: string;
  decision?: string;
  insight?: string;
  confidence?: string;
  metricLabel?: string;
};

type EvidenceRow = {
  assetKey?: string;
  objectAgent?: string;
  assetId?: string;
  deviceName?: string;
  department?: string;
  category?: string;
  brand?: string;
  model?: string;
  platform?: string;
  status?: string;
  lastSeen?: string;
  age?: string;
  ipAddress?: string;
  riskScore?: number | string;
  riskSeverity?: string;
  replacementCost?: string;
  [key: string]: unknown;
};

type ExecutiveStory = {
  status?: string;
  tone?: "green" | "amber" | "red" | "blue" | "purple";
  headline?: string;
  summary?: string;
  narrative?: string;
  keySignals?: string[];
  boardRecommendation?: string;
  actionItems?: string[];
  source?: "gemini" | "local" | string;
  generatedAt?: string;
};

type PolicyUsed = {
  profileID?: number | string;
  profileKey?: string;
  profileName?: string;
  scopeType?: string;
  scopeKey?: string;
  isDefault?: boolean;
  updatedAt?: string | null;
};

type DashboardData = {
  generatedAt?: string;
  executiveKpis: KpiItem[];
  pillars: PillarItem[];
  boardActions: BoardAction[];
  finance: FinanceData;
  analysis?: AnalysisData;
  level2: Record<string, DrillRow[]>;
  metrics?: Record<string, number | string | boolean>;
  policyUsed?: PolicyUsed | null;
  assumptionValues?: Record<string, number>;
};

type DrillState = {
  level: DrillLevel;
  area?: string;
  key?: string;
  title?: string;
  rows?: DrillRow[] | EvidenceRow[];
  total?: number;
  loading?: boolean;
  parent?: DrillState;
};

const EMPTY_DASHBOARD: DashboardData = {
  generatedAt: "",
  executiveKpis: [],
  pillars: [],
  boardActions: [],
  finance: {},
  analysis: { trend: [], signals: [], mix: { risk: 0, control: 0, savings: 0 } },
  level2: {},
  metrics: {},
};

const MANAGEMENT_DASHBOARD_INLINE_CSS = `
:root {
  --md-font: var(--ema-font-sans, var(--ema-font-body, "Aptos", "Inter", "Manrope", "Segoe UI", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Arial, sans-serif));
  --md-display-font: var(--ema-font-display, "Aptos Display", "Manrope", "Inter", "Segoe UI", ui-sans-serif, system-ui, sans-serif);
  --md-mono-font: var(--ema-font-mono, "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace);
  --md-bg: #f4f8fc;
  --md-card: #ffffff;
  --md-ink: #0f172a;
  --md-muted: #64748b;
  --md-soft: #94a3b8;
  --md-line: rgba(148, 163, 184, 0.22);
  --md-shadow: 0 18px 42px rgba(15, 23, 42, 0.08);
  --md-shadow-soft: 0 10px 24px rgba(15, 23, 42, 0.06);
  --md-radius: 18px;
  --md-blue: #2563eb;
  --md-cyan: #06b6d4;
  --md-purple: #8b5cf6;
  --md-pink: #ec4899;
  --md-red: #ef4444;
  --md-orange: #fb923c;
  --md-amber: #f59e0b;
  --md-green: #059669;
}
* { box-sizing: border-box; }
button, table, input { font: inherit; }
button { cursor: pointer; }
html.md-dashboard-page-active,
body.md-dashboard-page-active,
body.md-dashboard-page-active #root {
  height: 100% !important;
  max-height: 100% !important;
  overflow: hidden !important;
  background: #f4f8fc !important;
}
body.md-dashboard-page-active .ema-main,
body.md-dashboard-page-active .ema-content,
body.md-dashboard-page-active .ema-content-area,
body.md-dashboard-page-active .app-main,
body.md-dashboard-page-active .app-content,
body.md-dashboard-page-active .layout-main,
body.md-dashboard-page-active .layout-content,
body.md-dashboard-page-active .main,
body.md-dashboard-page-active .main-content,
body.md-dashboard-page-active main {
  min-height: 0 !important;
  overflow: hidden !important;
  background: #f4f8fc !important;
}
body.md-dashboard-page-active .ema-page,
body.md-dashboard-page-active .page-content,
body.md-dashboard-page-active .content,
body.md-dashboard-page-active .content-area {
  height: calc(100dvh - 76px) !important;
  max-height: calc(100dvh - 76px) !important;
  min-height: 0 !important;
  overflow: hidden !important;
  padding: 0 !important;
  margin: 0 !important;
  background: #f4f8fc !important;
}
.management-center-page {
  width: 100%;
  max-width: none;
  height: 100%;
  min-height: 0;
  max-height: 100%;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  margin: 0;
  padding: 14px 14px 18px;
  background: linear-gradient(180deg, #f8fbff 0%, #f4f8fc 44%, #eef4fb 100%);
  color: var(--md-ink);
  font-family: var(--md-font);
  -webkit-font-smoothing: antialiased;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  -webkit-overflow-scrolling: touch;
}
.management-center-page::-webkit-scrollbar { width: 6px; }
.management-center-page::-webkit-scrollbar-track { background: rgba(226,232,240,.55); border-radius: 999px; }
.management-center-page::-webkit-scrollbar-thumb { background: rgba(100,116,139,.65); border-radius: 999px; border: 1px solid rgba(226,232,240,.55); }
.management-center-page::-webkit-scrollbar-thumb:hover { background: rgba(71,85,105,.78); }
.management-module-root {
  width: 100%;
  max-width: none;
  margin: 0;
}
.management-module-root > * { min-width: 0; }
.md-content {
  display: grid;
  gap: 12px;
  min-height: max-content;
  padding-bottom: 0;
}
.md-dashboard-view {
  display: grid;
  gap: 12px;
  min-height: max-content;
  padding-bottom: 0;
}
.md-icon {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
}
.md-card {
  border: 1px solid rgba(226, 232, 240, 0.88);
  border-radius: var(--md-radius);
  background: var(--md-card);
  box-shadow: var(--md-shadow-soft);
}
.md-kpi-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 8px;
}
.md-kpi-card {
  min-height: 88px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 40px;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: 0;
  text-align: left;
  transition: transform 160ms ease, box-shadow 160ms ease;
}
.md-kpi-card:hover { transform: translateY(-2px); box-shadow: var(--md-shadow); }
.md-kpi-card h3,
.md-chip-label,
.md-section-title,
.md-section-subtitle,
.md-small-title {
  margin: 0;
  color: #0f172a;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: -0.02em;
}
.md-section-subtitle { margin-top: 4px; color: #64748b; font-size: 10px; font-weight: 800; }
.md-kpi-card p { margin: 4px 0 0; color: var(--md-muted); font-size: 10px; font-weight: 800; }
.md-kpi-value { display: flex; align-items: baseline; gap: 4px; margin-top: 9px; }
.md-kpi-value strong { color: #0f172a; font-size: 24px; line-height: 1; font-weight: 950; letter-spacing: -0.05em; }
.md-kpi-value span { color: #475569; font-size: 14px; font-weight: 900; }
.md-kpi-icon,
.md-chip-icon,
.md-activity-icon {
  display: grid;
  place-items: center;
  color: #fff;
  box-shadow: 0 12px 22px rgba(15, 23, 42, 0.12);
}
.md-kpi-icon { width: 40px; height: 40px; border-radius: 14px; }
.tone-blue .md-kpi-icon, .bg-blue { background: linear-gradient(135deg, #1da4ff, #2563eb); }
.tone-green .md-kpi-icon, .bg-green { background: linear-gradient(135deg, #34d399, #059669); }
.tone-red .md-kpi-icon, .bg-red { background: linear-gradient(135deg, #fb7185, #ef4444); }
.tone-amber .md-kpi-icon, .bg-amber { background: linear-gradient(135deg, #fbbf24, #f59e0b); }
.tone-purple .md-kpi-icon, .bg-purple { background: linear-gradient(135deg, #a855f7, #6d5dfc); }
.tone-cyan .md-kpi-icon, .bg-cyan { background: linear-gradient(135deg, #22d3ee, #06b6d4); }
.tone-pink .md-kpi-icon, .bg-pink { background: linear-gradient(135deg, #f472b6, #ec4899); }
.tone-orange .md-kpi-icon, .bg-orange { background: linear-gradient(135deg, #ffbf4c, #fb923c); }
.tone-slate .md-kpi-icon, .bg-slate { background: linear-gradient(135deg, #64748b, #334155); }
.md-top-row {
  display: grid;
  grid-template-columns: minmax(0, 2.25fr) minmax(280px, .75fr);
  gap: 14px;
  align-items: start;
}
.md-chart-card,
.md-donut-card { padding: 14px 16px; min-width: 0; }
.md-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}
.md-eyebrow { display: block; color: #94a3b8; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: .06em; }
.md-card-head h2,
.md-view-header h2 { margin: 2px 0 0; color: #0f172a; font-size: 17px; line-height: 1.12; font-weight: 950; letter-spacing: -0.04em; }
.md-card-head p,
.md-view-header p { margin: 4px 0 0; color: #64748b; font-size: 12px; font-weight: 750; }
.md-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.md-action-btn {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 1px solid rgba(226,232,240,.95);
  border-radius: 12px;
  padding: 0 12px;
  color: #0f172a;
  background: #fff;
  font-size: 11px;
  font-weight: 900;
  box-shadow: 0 8px 18px rgba(15,23,42,.05);
}
.md-action-btn.primary { color: #fff; border: 0; background: linear-gradient(135deg, #ef477b, #8b5cf6); }
.md-action-icon { width: 36px; padding: 0; justify-content: center; }
.md-chart-layout { display: grid; grid-template-columns: 138px minmax(0, 1fr); gap: 14px; align-items: start; }
.md-chart-summary { display: grid; align-content: center; gap: 13px; }
.md-chart-number { margin: 0; color: #111827; font-size: 27px; line-height: 1; font-weight: 950; letter-spacing: -0.05em; }
.md-chart-summary span { color: #64748b; font-size: 11px; font-weight: 750; }
.md-summary-btn {
  width: max-content;
  min-height: 34px;
  border: 0;
  border-radius: 999px;
  padding: 0 16px;
  color: #fff;
  background: linear-gradient(135deg, #ec4899, #8b5cf6);
  box-shadow: 0 10px 20px rgba(139,92,246,.18);
  font-size: 11px;
  font-weight: 900;
}
.md-chart-panel { min-width: 0; position: relative; }
.md-chart-legend { display: flex; justify-content: flex-end; align-items: center; gap: 16px; color: #64748b; font-size: 10px; font-weight: 850; margin-bottom: 4px; }
.md-chart-legend span { display: inline-flex; align-items: center; gap: 6px; }
.md-dot { width: 8px; height: 8px; border-radius: 999px; display: inline-block; }
.md-dot.red { background: #ef4444; }
.md-dot.orange { background: #f59e0b; }
.md-dot.purple { background: #8b5cf6; }
.md-dot.cyan { background: #06b6d4; }
.md-dot.green { background: #059669; }
.md-chart-svg { width: 100%; height: 202px; display: block; overflow: visible; }
.md-chart-grid { stroke: rgba(148,163,184,.24); stroke-width: 1; stroke-dasharray: 4 8; }
.md-chart-axis { stroke: rgba(148,163,184,.45); stroke-width: 1; }
.md-chart-label { fill: #94a3b8; font-size: 10px; font-weight: 800; }
.md-chart-line-risk { fill: none; stroke: #ef4444; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
.md-chart-line-finance { fill: none; stroke: #f59e0b; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
.md-chart-area { fill: url(#mdAreaGradient); opacity: .9; }
.md-chart-point-risk { fill: #ef4444; stroke: #fff; stroke-width: 3; }
.md-chart-point-finance { fill: #f59e0b; stroke: #fff; stroke-width: 3; }
.md-chart-bar-finance { fill: #f59e0b; opacity: .82; rx: 6; }
.md-chart-bar-risk { fill: #ef4444; opacity: .86; rx: 6; }
.md-chart-empty-note { fill: #94a3b8; font-size: 12px; font-weight: 850; }
.md-finance-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  padding-top: 12px;
  margin-top: 8px;
  border-top: 1px solid rgba(226,232,240,.85);
}
.md-finance-chip {
  min-width: 0;
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  border: 0;
  background: transparent;
  padding: 0;
  text-align: left;
}
.md-chip-icon { width: 36px; height: 36px; border-radius: 12px; }
.md-chip-body { min-width: 0; display: block; line-height: 1.1; }
.md-chip-body .md-chip-label { display: block; color: #64748b; font-size: 10px; white-space: normal; }
.md-chip-value { display: block; margin-top: 4px; color: #0f172a; font-size: 13px; font-weight: 950; line-height: 1.1; }
.md-donut-card { display: grid; align-content: start; gap: 14px; }
.md-donut-shell { display: grid; justify-items: center; gap: 14px; }
.md-donut {
  --risk-end: 34%;
  --control-end: 78%;
  width: 168px;
  height: 168px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 999px;
  background: conic-gradient(#ef4444 0 var(--risk-end), #8b5cf6 var(--risk-end) var(--control-end), #06b6d4 var(--control-end) 100%);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.55), 0 18px 34px rgba(15,23,42,.08);
}
.md-donut-hole { width: 84px; height: 84px; display: grid; place-items: center; border-radius: 999px; background: #fff; }
.md-donut-core { width: 50px; height: 50px; display: grid; place-items: center; border-radius: 999px; color: #fff; background: linear-gradient(135deg, #ffc046, #ff982e); }
.md-mix-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; width: 100%; }
.md-mix-item { border: 1px solid rgba(226,232,240,.92); border-radius: 14px; padding: 9px 10px; background: #fff; text-align: left; }
.md-mix-item strong { display: block; color: #111827; font-size: 22px; line-height: 1; font-weight: 950; letter-spacing: -0.04em; }
.md-mix-item span { display: flex; align-items: center; gap: 6px; margin-top: 7px; color: #64748b; font-size: 10px; font-weight: 900; }
.md-pillar-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.md-pillar-tile {
  min-height: 100px;
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  border: 0;
  border-radius: 14px;
  padding: 14px;
  color: #fff;
  text-align: left;
  box-shadow: var(--md-shadow-soft);
}
.md-pillar-tile::after {
  position: absolute;
  right: 20px;
  bottom: 14px;
  width: 86px;
  height: 40px;
  border-bottom: 2px dashed rgba(255,255,255,.45);
  border-radius: 0 0 999px 999px;
  content: "";
}
.tile-purple { background: linear-gradient(135deg, #8b3ff5, #5b73ff); }
.tile-blue { background: linear-gradient(135deg, #19a8ff, #2d63f2); }
.tile-teal { background: linear-gradient(135deg, #25c3b2, #1aa9d5); }
.tile-orange { background: linear-gradient(135deg, #ffbb4f, #ff8744); }
.md-tile-icon { width: 54px; height: 54px; display: grid; place-items: center; border-radius: 16px; background: rgba(255,255,255,.22); }
.md-pillar-tile h3 { margin: 0; font-size: 12px; font-weight: 900; }
.md-tile-value { margin-top: 7px; display: flex; align-items: baseline; gap: 2px; }
.md-tile-value strong { font-size: 28px; line-height: 1; font-weight: 950; letter-spacing: -0.04em; }
.md-pillar-tile small { display: block; margin-top: 5px; color: rgba(255,255,255,.86); font-size: 10px; font-weight: 850; }
.md-bottom-grid { display: grid; grid-template-columns: minmax(320px, .68fr) minmax(0, 1.82fr); gap: 14px; align-items: start; margin-bottom: 28px; }
.md-signals-card,
.md-action-card { padding: 16px; }
.md-signal-stack { display: grid; gap: 12px; margin-top: 14px; }
.md-signal-row {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  border: 0;
  border-radius: 14px;
  background: transparent;
  padding: 8px 6px;
  text-align: left;
}
.md-signal-row:hover { background: #f8fafc; }
.md-activity-icon { width: 36px; height: 36px; border-radius: 999px; }
.md-signal-row strong { display: block; color: #0f172a; font-size: 14px; line-height: 1.08; font-weight: 950; letter-spacing: -0.035em; }
.md-signal-row span { display: block; margin-top: 4px; color: #64748b; font-size: 10px; font-weight: 850; }
.md-signal-value { color: #334155; font-size: 11px; font-weight: 950; white-space: nowrap; }
.md-table-wrap { width: 100%; overflow-x: auto; }
.md-action-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.md-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.md-table th { color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; font-weight: 950; text-align: left; padding: 12px 10px; border-bottom: 1px solid rgba(226,232,240,.9); }
.md-table td { color: #0f172a; font-size: 11.5px; font-weight: 800; line-height: 1.35; padding: 12px 10px; border-bottom: 1px solid rgba(226,232,240,.86); vertical-align: top; word-break: break-word; }
.md-table tbody tr { transition: background 160ms ease; }
.md-table tbody tr:hover { background: #f8fafc; }
.md-priority { display: inline-flex; min-height: 24px; align-items: center; justify-content: center; border-radius: 999px; padding: 0 10px; font-size: 10px; font-weight: 950; }
.md-priority.high { color: #991b1b; background: #fee2e2; }
.md-priority.medium { color: #92400e; background: #fef3c7; }
.md-priority.low { color: #065f46; background: #d1fae5; }
.md-status-pill { display: inline-flex; align-items: center; justify-content: center; border-radius: 10px; min-height: 28px; padding: 0 12px; color: #fff; background: linear-gradient(135deg, #1eb6e9, #3b82f6); font-size: 10px; font-weight: 950; }
.md-view-panel { padding: 18px; border: 1px solid rgba(226,232,240,.92); border-radius: 20px; background: #fff; box-shadow: var(--md-shadow-soft); }
.md-view-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding-bottom: 16px; border-bottom: 1px solid rgba(226,232,240,.88); }
.md-view-eyebrow { color: #2563eb; font-size: 11px; font-weight: 950; text-transform: uppercase; letter-spacing: .05em; }
.md-view-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.md-view-body { padding-top: 16px; }
.md-state-panel { display: grid; place-items: center; min-height: 220px; border: 1px solid rgba(226,232,240,.9); border-radius: 18px; background: #fff; color: #64748b; font-size: 13px; font-weight: 900; }
.md-state-error { color: #b91c1c; background: #fff7f7; border-color: rgba(239,68,68,.22); }
.md-breakdown-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px; }
.md-breakdown-card { min-height: 145px; display: grid; align-content: space-between; gap: 10px; border: 1px solid rgba(226,232,240,.92); border-radius: 16px; background: linear-gradient(180deg, #fff, #f8fbff); padding: 16px; text-align: left; box-shadow: 0 10px 22px rgba(15,23,42,.05); }
.md-breakdown-card span { color: #0f172a; font-size: 13px; font-weight: 950; }
.md-breakdown-card strong { color: #2563eb; font-size: 26px; line-height: 1; font-weight: 950; letter-spacing: -0.04em; }
.md-breakdown-card small { color: #64748b; font-size: 11px; font-weight: 850; }
.md-card-hint { display: inline-flex; align-items: center; gap: 5px; color: #8b5cf6; font-style: normal; font-size: 11px; font-weight: 950; }
.md-evidence-wrap { border: 1px solid rgba(226,232,240,.92); border-radius: 16px; background: #fff; }
.md-evidence-wrap .md-table { min-width: 920px; }

/* =========================================================
   Typography + executive polish
   Uses the same EMA typography tokens when global CSS is loaded,
   but keeps safe fallbacks because this dashboard CSS is inline.
========================================================= */
.management-center-page,
.management-center-page button,
.management-center-page input,
.management-center-page table {
  font-family: var(--md-font) !important;
  font-feature-settings: "cv02", "cv03", "cv04", "cv11", "tnum";
  text-rendering: geometricPrecision;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
.md-card-head h2,
.md-view-header h2,
.md-kpi-value strong,
.md-chart-number,
.md-chip-value,
.md-mix-item strong,
.md-pillar-tile h3,
.md-tile-value strong,
.md-signal-row strong,
.md-breakdown-card strong,
.md-breakdown-card span {
  font-family: var(--md-display-font) !important;
}
.md-kpi-card h3,
.md-section-title,
.md-small-title,
.md-eyebrow,
.md-view-eyebrow,
.md-table th,
.md-priority,
.md-status-pill,
.md-action-btn,
.md-summary-btn {
  font-family: var(--md-font) !important;
}
.md-card-head h2,
.md-view-header h2 {
  font-size: clamp(16px, 1.05vw, 19px) !important;
  line-height: 1.14 !important;
  font-weight: 850 !important;
  letter-spacing: -0.038em !important;
}
.md-card-head p,
.md-view-header p,
.md-chart-summary span {
  color: #5f718a !important;
  font-size: 11px !important;
  line-height: 1.45 !important;
  font-weight: 650 !important;
  letter-spacing: -0.005em !important;
}
.md-eyebrow,
.md-view-eyebrow {
  color: #8ca0ba !important;
  font-size: 10px !important;
  line-height: 1.1 !important;
  font-weight: 850 !important;
  letter-spacing: 0.10em !important;
}
.md-kpi-card h3,
.md-section-title,
.md-small-title {
  color: #10233f !important;
  font-size: 11.5px !important;
  line-height: 1.18 !important;
  font-weight: 850 !important;
  letter-spacing: -0.025em !important;
}
.md-kpi-card p,
.md-section-subtitle,
.md-chip-body .md-chip-label,
.md-signal-row span,
.md-breakdown-card small {
  color: #677b95 !important;
  font-size: 10.5px !important;
  line-height: 1.35 !important;
  font-weight: 650 !important;
  letter-spacing: -0.006em !important;
}
.md-kpi-value strong {
  font-size: clamp(23px, 1.65vw, 30px) !important;
  font-weight: 900 !important;
  letter-spacing: -0.060em !important;
  line-height: 0.96 !important;
  font-variant-numeric: tabular-nums;
}
.md-kpi-value span {
  font-size: 13px !important;
  font-weight: 800 !important;
  line-height: 1 !important;
}
.md-chart-number {
  font-size: clamp(26px, 2.2vw, 36px) !important;
  font-weight: 900 !important;
  letter-spacing: -0.064em !important;
  line-height: 0.98 !important;
  font-variant-numeric: tabular-nums;
}
.md-chip-value,
.md-signal-value,
.md-table td,
.md-mix-item strong,
.md-tile-value strong,
.md-breakdown-card strong {
  font-variant-numeric: tabular-nums;
}
.md-chip-value {
  font-size: 12.5px !important;
  font-weight: 850 !important;
  letter-spacing: -0.025em !important;
}
.md-mix-item strong {
  font-size: 22px !important;
  font-weight: 900 !important;
  letter-spacing: -0.052em !important;
}
.md-mix-item span {
  font-size: 10px !important;
  font-weight: 750 !important;
  letter-spacing: -0.004em !important;
}
.md-pillar-tile h3 {
  font-size: 12px !important;
  line-height: 1.12 !important;
  font-weight: 850 !important;
  letter-spacing: -0.025em !important;
}
.md-tile-value strong {
  font-size: clamp(25px, 2vw, 32px) !important;
  font-weight: 900 !important;
  letter-spacing: -0.058em !important;
}
.md-pillar-tile small {
  font-size: 10.5px !important;
  line-height: 1.22 !important;
  font-weight: 700 !important;
}
.md-signal-row strong {
  font-size: 14px !important;
  line-height: 1.12 !important;
  font-weight: 850 !important;
  letter-spacing: -0.035em !important;
}
.md-signal-value {
  color: #475569 !important;
  font-size: 11px !important;
  font-weight: 850 !important;
}
.md-table th {
  color: #65758e !important;
  font-size: 10px !important;
  line-height: 1.15 !important;
  font-weight: 850 !important;
  letter-spacing: 0.065em !important;
}
.md-table td {
  color: #14243a !important;
  font-size: 11.3px !important;
  line-height: 1.42 !important;
  font-weight: 690 !important;
  letter-spacing: -0.006em !important;
}
.md-priority,
.md-status-pill {
  font-size: 10px !important;
  line-height: 1 !important;
  font-weight: 800 !important;
  letter-spacing: -0.006em !important;
}
.md-action-btn,
.md-summary-btn {
  font-size: 11px !important;
  line-height: 1 !important;
  font-weight: 800 !important;
  letter-spacing: -0.012em !important;
}
.md-breakdown-card span {
  font-size: 13px !important;
  line-height: 1.2 !important;
  font-weight: 850 !important;
  letter-spacing: -0.025em !important;
}
.md-breakdown-card strong {
  font-size: 28px !important;
  font-weight: 900 !important;
  letter-spacing: -0.06em !important;
}
/* Small style refinement so typography feels less harsh without changing layout */
.md-card,
.md-view-panel,
.md-breakdown-card,
.md-evidence-wrap {
  border-color: rgba(203, 213, 225, 0.78) !important;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.045) !important;
}
.md-kpi-card,
.md-chart-card,
.md-donut-card,
.md-signals-card,
.md-action-card {
  background: linear-gradient(180deg, rgba(255,255,255,0.99), rgba(248,251,255,0.97)) !important;
}
.md-table tbody tr:hover,
.md-signal-row:hover {
  background: rgba(239, 246, 255, 0.56) !important;
}


/* Modern executive visual refresh: calmer palette, proper chart hover, premium ring */
:root {
  --md-prof-blue: #2563eb;
  --md-prof-cyan: #06b6d4;
  --md-prof-teal: #14b8a6;
  --md-prof-indigo: #6366f1;
  --md-prof-violet: #7c3aed;
  --md-prof-rose: #f43f5e;
  --md-prof-amber: #f59e0b;
  --md-prof-emerald: #10b981;
}
.md-kpi-icon,
.md-chip-icon {
  box-shadow: 0 10px 22px rgba(30, 64, 175, 0.12) !important;
}
.tone-blue .md-kpi-icon, .bg-blue { background: linear-gradient(135deg, #38bdf8 0%, #2563eb 100%) !important; }
.tone-green .md-kpi-icon, .bg-green { background: linear-gradient(135deg, #34d399 0%, #059669 100%) !important; }
.tone-red .md-kpi-icon, .bg-red { background: linear-gradient(135deg, #fb7185 0%, #e11d48 100%) !important; }
.tone-amber .md-kpi-icon, .bg-amber { background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%) !important; }
.tone-purple .md-kpi-icon, .bg-purple { background: linear-gradient(135deg, #a78bfa 0%, #6d28d9 100%) !important; }
.tone-cyan .md-kpi-icon, .bg-cyan { background: linear-gradient(135deg, #22d3ee 0%, #0891b2 100%) !important; }
.tone-pink .md-kpi-icon, .bg-pink { background: linear-gradient(135deg, #f472b6 0%, #db2777 100%) !important; }
.tone-orange .md-kpi-icon, .bg-orange { background: linear-gradient(135deg, #fdba74 0%, #f97316 100%) !important; }
.tone-slate .md-kpi-icon, .bg-slate { background: linear-gradient(135deg, #94a3b8 0%, #475569 100%) !important; }
.md-activity-icon.bg-blue { color: #1d4ed8 !important; background: #eff6ff !important; border: 1px solid #bfdbfe !important; box-shadow: none !important; }
.md-activity-icon.bg-green { color: #047857 !important; background: #ecfdf5 !important; border: 1px solid #a7f3d0 !important; box-shadow: none !important; }
.md-activity-icon.bg-red { color: #e11d48 !important; background: #fff1f2 !important; border: 1px solid #fecdd3 !important; box-shadow: none !important; }
.md-activity-icon.bg-amber { color: #b45309 !important; background: #fffbeb !important; border: 1px solid #fde68a !important; box-shadow: none !important; }
.md-activity-icon.bg-purple { color: #7c3aed !important; background: #f5f3ff !important; border: 1px solid #ddd6fe !important; box-shadow: none !important; }
.md-activity-icon.bg-cyan { color: #0891b2 !important; background: #ecfeff !important; border: 1px solid #a5f3fc !important; box-shadow: none !important; }
.md-activity-icon.bg-pink { color: #db2777 !important; background: #fdf2f8 !important; border: 1px solid #fbcfe8 !important; box-shadow: none !important; }
.md-activity-icon.bg-orange { color: #ea580c !important; background: #fff7ed !important; border: 1px solid #fed7aa !important; box-shadow: none !important; }
.md-activity-icon svg { stroke-width: 2.25 !important; }
.md-chart-card {
  background:
    radial-gradient(circle at 82% 0%, rgba(37, 99, 235, 0.045), transparent 20rem),
    linear-gradient(180deg, rgba(255,255,255,0.995), rgba(248,251,255,0.975)) !important;
}
.md-chart-panel {
  min-height: 222px;
  border-radius: 16px;
  padding: 4px 2px 0;
}
.md-chart-svg { height: 220px !important; cursor: crosshair; }
.md-chart-grid { stroke: rgba(148, 163, 184, 0.20) !important; stroke-dasharray: 3 9 !important; }
.md-chart-axis { stroke: rgba(100, 116, 139, 0.30) !important; }
.md-chart-label { fill: #7c8ea8 !important; font-size: 10px !important; font-weight: 850 !important; }
.md-chart-bar-finance { fill: url(#mdFinanceBarGradient) !important; opacity: 1 !important; filter: drop-shadow(0 5px 8px rgba(245, 158, 11, 0.14)); }
.md-chart-bar-risk { fill: url(#mdRiskBarGradient) !important; opacity: 1 !important; filter: drop-shadow(0 5px 8px rgba(244, 63, 94, 0.16)); }
.md-chart-hover-band { fill: transparent; cursor: pointer; }
.md-chart-hover-band:hover { fill: rgba(37, 99, 235, 0.035); }
.md-chart-active-line { stroke: rgba(37,99,235,.30); stroke-width: 1; stroke-dasharray: 4 5; }
.md-chart-tooltip-box { fill: rgba(15, 23, 42, 0.96); filter: drop-shadow(0 14px 20px rgba(15, 23, 42, 0.20)); }
.md-chart-tooltip-title { fill: #ffffff; font-size: 11px; font-weight: 900; }
.md-chart-tooltip-text { fill: #cbd5e1; font-size: 10px; font-weight: 750; }
.md-donut-card {
  background:
    radial-gradient(circle at 50% 18%, rgba(37, 99, 235, 0.055), transparent 14rem),
    linear-gradient(180deg, rgba(255,255,255,0.995), rgba(248,251,255,0.975)) !important;
}
.md-donut-shell { gap: 12px !important; }
.md-donut {
  width: 180px !important;
  height: 180px !important;
  border: 0 !important;
  border-radius: 24px !important;
  background:
    radial-gradient(circle at 52% 44%, rgba(255,255,255,.95) 0 35%, transparent 36%),
    linear-gradient(180deg, rgba(255,255,255,.88), rgba(245,249,253,.96)) !important;
  box-shadow: 0 18px 38px rgba(15, 23, 42, 0.075) !important;
  display: grid !important;
  place-items: center !important;
  padding: 0 !important;
}
.md-donut:hover { transform: translateY(-1px); box-shadow: 0 22px 44px rgba(15,23,42,.10) !important; }
.md-health-ring { position: relative; width: 160px; height: 160px; display: grid; place-items: center; }
.md-health-ring-svg { position: absolute; inset: 0; width: 100%; height: 100%; transform: rotate(-90deg); overflow: visible; }
.md-ring-track { fill: none; stroke: #e8eef7; stroke-width: 18; }
.md-ring-control { fill: none; stroke: url(#mdControlRingGradient); stroke-width: 18; stroke-linecap: round; filter: drop-shadow(0 10px 12px rgba(37, 99, 235, 0.18)); transition: stroke-dasharray 220ms ease; }
.md-ring-risk { fill: none; stroke: url(#mdRiskRingGradient); stroke-width: 14; stroke-linecap: round; opacity: .95; filter: drop-shadow(0 8px 12px rgba(244, 63, 94, 0.13)); }
.md-ring-center { position: relative; z-index: 1; width: 82px; height: 82px; border-radius: 999px; display: grid; place-items: center; background: #ffffff; box-shadow: inset 0 0 0 1px rgba(226,232,240,.88), 0 12px 22px rgba(15,23,42,.06); }
.md-ring-center strong { display: block; color: #10233f; font-size: 26px; line-height: 1; font-weight: 950; letter-spacing: -0.06em; font-variant-numeric: tabular-nums; }
.md-ring-center span { display: block; margin-top: 4px; color: #64748b; font-size: 9px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
.md-ring-core-icon { position: absolute; right: 24px; bottom: 20px; width: 36px; height: 36px; border-radius: 14px; display: grid; place-items: center; color: #ffffff; background: linear-gradient(135deg, #38bdf8, #2563eb); box-shadow: 0 14px 22px rgba(37,99,235,.18); }
.md-donut-hole,
.md-donut-core { display: none !important; }
.md-mix-item {
  border-color: rgba(203, 213, 225, 0.82) !important;
  background: rgba(255,255,255,0.86) !important;
  box-shadow: 0 8px 18px rgba(15,23,42,.035) !important;
}
.md-mix-item:hover { transform: translateY(-1px); border-color: rgba(37,99,235,.28) !important; }

/* Bottom gap fix: keep scroll usable without forcing a large empty footer. */
.management-center-page { padding-bottom: 18px !important; }
.md-content,
.md-dashboard-view { padding-bottom: 0 !important; }
.md-bottom-grid { margin-bottom: 0 !important; }


/* Final bottom card alignment polish */
.md-bottom-grid {
  align-items: stretch !important;
  grid-template-columns: minmax(320px, 0.72fr) minmax(0, 1.88fr) !important;
  gap: 14px !important;
}
.md-signals-card,
.md-action-card {
  height: 100% !important;
  min-height: 356px !important;
  display: flex !important;
  flex-direction: column !important;
}
.md-signals-card .md-card-head,
.md-action-card .md-action-header {
  flex: 0 0 auto !important;
}
.md-signal-stack {
  flex: 1 1 auto !important;
  display: grid !important;
  grid-auto-rows: minmax(56px, 1fr) !important;
  gap: 8px !important;
  margin-top: 12px !important;
}
.md-signal-row {
  min-height: 56px !important;
  height: 100% !important;
  display: grid !important;
  grid-template-columns: 42px minmax(0, 1fr) minmax(64px, auto) !important;
  align-items: center !important;
  gap: 11px !important;
  padding: 8px 10px !important;
  border: 1px solid transparent !important;
  border-radius: 16px !important;
}
.md-signal-row:hover {
  border-color: rgba(203, 213, 225, 0.82) !important;
  background: rgba(248, 251, 255, 0.88) !important;
}
.md-activity-icon {
  width: 38px !important;
  height: 38px !important;
  min-width: 38px !important;
  min-height: 38px !important;
  display: inline-grid !important;
  place-items: center !important;
  align-self: center !important;
  margin: 0 !important;
  border-radius: 14px !important;
}
.md-activity-icon .md-icon,
.md-activity-icon svg {
  width: 17px !important;
  height: 17px !important;
  display: block !important;
  margin: 0 !important;
}
.md-signal-copy {
  min-width: 0 !important;
  display: block !important;
  margin: 0 !important;
  align-self: center !important;
}
.md-signal-copy strong {
  display: block !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}
.md-signal-copy span {
  display: block !important;
  margin-top: 4px !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}
.md-signal-value {
  min-width: 64px !important;
  justify-self: end !important;
  align-self: center !important;
  margin: 0 !important;
  text-align: right !important;
}
.md-action-card .md-table-wrap {
  flex: 1 1 auto !important;
  min-height: 0 !important;
}
.md-action-header {
  align-items: flex-start !important;
}
.md-action-header .md-actions {
  align-items: center !important;
  flex-wrap: nowrap !important;
}
.md-action-btn {
  height: 36px !important;
  min-height: 36px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 7px !important;
  line-height: 1 !important;
}
.md-action-btn .md-icon,
.md-action-btn svg {
  width: 16px !important;
  height: 16px !important;
  display: block !important;
  margin: 0 !important;
}
.md-action-icon {
  width: 36px !important;
  min-width: 36px !important;
  height: 36px !important;
  padding: 0 !important;
  border-radius: 12px !important;
}

.md-domain-row.is-muted {
  opacity: .58;
  cursor: not-allowed;
}
.md-domain-row.is-muted:hover {
  transform: none !important;
  box-shadow: none !important;
}
@media (max-width: 1180px) {
  .md-kpi-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .md-top-row, .md-bottom-grid { grid-template-columns: 1fr; }
  .md-pillar-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
}
@media (max-width: 760px) {
  .management-center-page { height: 100%; max-height: 100%; overflow-y: auto !important; margin: 0; padding: 10px 8px 18px; }
  .md-kpi-grid, .md-pillar-grid, .md-finance-strip, .md-mix-row, .md-breakdown-grid { grid-template-columns: 1fr; }
  .md-chart-layout { grid-template-columns: 1fr; }
  .md-card-head, .md-action-header, .md-view-header { flex-direction: column; align-items: start; }
}
@media print {
  .management-center-page { height: auto; overflow: visible; padding: 0; background: #fff; }
  .md-actions, .md-view-actions { display: none; }
  .md-card, .md-view-panel { box-shadow: none; break-inside: avoid; }
}


/* Executive density polish - fills the main canvas with useful, compact signals */
.management-module-root {
  background:
    radial-gradient(circle at 8% 0%, rgba(37, 99, 235, 0.055), transparent 24rem),
    radial-gradient(circle at 98% 18%, rgba(14, 165, 233, 0.06), transparent 26rem),
    linear-gradient(135deg, #eef4fb 0%, #f8fbff 46%, #e8eff7 100%) !important;
}
.management-module-root::before {
  content: "";
  position: fixed;
  inset: 76px 0 0 0;
  pointer-events: none;
  opacity: .28;
  background-image:
    linear-gradient(rgba(100, 116, 139, .08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(100, 116, 139, .07) 1px, transparent 1px);
  background-size: 34px 34px;
  mask-image: linear-gradient(180deg, transparent 0%, black 12%, black 78%, transparent 100%);
}
.md-dashboard-view { gap: 12px !important; }
.md-card {
  background:
    radial-gradient(circle at 100% 0%, rgba(37,99,235,.035), transparent 11rem),
    linear-gradient(180deg, rgba(255,255,255,.99), rgba(248,251,255,.965)) !important;
}
.md-intel-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}
.md-intel-card {
  min-width: 0;
  border: 1px solid rgba(203, 213, 225, .86);
  border-radius: 16px;
  padding: 12px 13px;
  display: grid;
  gap: 8px;
  background:
    linear-gradient(135deg, rgba(255,255,255,.985), rgba(248,251,255,.96));
  box-shadow: 0 8px 18px rgba(15,23,42,.045);
  text-align: left;
  transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease;
}
.md-intel-card:hover {
  transform: translateY(-1px);
  border-color: rgba(37, 99, 235, .28);
  box-shadow: 0 14px 26px rgba(15,23,42,.075);
}
.md-intel-top {
  min-width: 0;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.md-intel-top span {
  min-width: 0;
  color: #64748b;
  font-size: 10px;
  font-weight: 950;
  letter-spacing: .075em;
  text-transform: uppercase;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.md-intel-top strong {
  color: #0f172a;
  font-family: var(--md-display-font);
  font-size: 18px;
  line-height: 1;
  font-weight: 950;
  letter-spacing: -.055em;
  white-space: nowrap;
}
.md-intel-card small {
  color: #64748b;
  font-size: 10px;
  font-weight: 780;
  line-height: 1.25;
}
.md-progress-track {
  height: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(203, 213, 225, .72);
}
.md-progress-track i {
  display: block;
  height: 100%;
  width: var(--w, 0%);
  border-radius: inherit;
  background: linear-gradient(90deg, var(--a, #2563eb), var(--b, #06b6d4));
  box-shadow: 0 0 0 1px rgba(255,255,255,.35) inset;
}
.md-intel-card.is-red { --a:#fb7185; --b:#ef4444; }
.md-intel-card.is-blue { --a:#38bdf8; --b:#2563eb; }
.md-intel-card.is-green { --a:#34d399; --b:#059669; }
.md-intel-card.is-amber { --a:#fbbf24; --b:#f59e0b; }
.md-chart-card { position: relative; overflow: hidden; }
.md-chart-card::after {
  content: "";
  position: absolute;
  right: 16px;
  top: 78px;
  width: 110px;
  height: 110px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(37,99,235,.08), transparent 64%);
  pointer-events: none;
}
.md-chart-summary {
  padding: 12px;
  border: 1px solid rgba(226,232,240,.78);
  border-radius: 16px;
  background: rgba(248,251,255,.74);
}
.md-chart-summary > div {
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(226,232,240,.75);
}
.md-chart-summary > div:last-of-type { border-bottom: 0; padding-bottom: 0; }
.md-donut-card { position: relative; overflow: hidden; }
.md-donut-card::after {
  content: "";
  position: absolute;
  inset: auto 20px 20px auto;
  width: 86px;
  height: 86px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(14,165,233,.08), transparent 68%);
  pointer-events: none;
}
.md-action-card,
.md-signals-card { min-height: 318px; }
.md-bottom-grid { margin-bottom: 12px !important; }
@media (max-width: 1180px) {
  .md-intel-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 720px) {
  .md-intel-strip { grid-template-columns: 1fr; }
}


/* =========================================================
   V Next - executive colour accents for previously plain cards
   Keep existing fully-coloured gradient cards unchanged.
========================================================= */
.md-card:not(.md-pillar-tile),
.md-view-panel,
.md-breakdown-card,
.md-evidence-wrap {
  position: relative;
  overflow: hidden;
}

.md-card:not(.md-pillar-tile)::before,
.md-view-panel::before,
.md-breakdown-card::before,
.md-evidence-wrap::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  background: linear-gradient(90deg, var(--card-a, #2563eb), var(--card-b, #06b6d4));
  opacity: .82;
  pointer-events: none;
}

.md-kpi-card {
  border: 1px solid rgba(203, 213, 225, .74) !important;
  background:
    radial-gradient(circle at 100% 12%, color-mix(in srgb, var(--card-a, #2563eb) 13%, transparent), transparent 48%),
    linear-gradient(135deg, rgba(255,255,255,.99), color-mix(in srgb, var(--card-a, #2563eb) 5%, #f8fbff)) !important;
}

.tone-blue { --card-a:#2563eb; --card-b:#06b6d4; }
.tone-cyan { --card-a:#06b6d4; --card-b:#0ea5e9; }
.tone-green { --card-a:#059669; --card-b:#22c55e; }
.tone-red { --card-a:#ef4444; --card-b:#f97316; }
.tone-amber { --card-a:#f59e0b; --card-b:#facc15; }
.tone-purple { --card-a:#8b5cf6; --card-b:#6366f1; }
.tone-pink { --card-a:#ec4899; --card-b:#8b5cf6; }
.tone-orange { --card-a:#fb923c; --card-b:#f97316; }
.tone-slate { --card-a:#64748b; --card-b:#334155; }

.md-chart-card {
  --card-a:#2563eb;
  --card-b:#06b6d4;
  background:
    radial-gradient(circle at 92% 10%, rgba(37,99,235,.115), transparent 15rem),
    radial-gradient(circle at 8% 100%, rgba(6,182,212,.08), transparent 14rem),
    linear-gradient(135deg, rgba(255,255,255,.99), rgba(239,246,255,.95)) !important;
}

.md-donut-card {
  --card-a:#10b981;
  --card-b:#0ea5e9;
  background:
    radial-gradient(circle at 96% 8%, rgba(16,185,129,.12), transparent 13rem),
    radial-gradient(circle at 0% 100%, rgba(14,165,233,.08), transparent 14rem),
    linear-gradient(135deg, rgba(255,255,255,.99), rgba(240,253,250,.94)) !important;
}

.md-signals-card {
  --card-a:#f43f5e;
  --card-b:#f59e0b;
  background:
    radial-gradient(circle at 94% 0%, rgba(244,63,94,.10), transparent 13rem),
    radial-gradient(circle at 0% 100%, rgba(245,158,11,.07), transparent 14rem),
    linear-gradient(135deg, rgba(255,255,255,.99), rgba(255,247,247,.94)) !important;
}

.md-action-card {
  --card-a:#6366f1;
  --card-b:#8b5cf6;
  background:
    radial-gradient(circle at 98% 0%, rgba(99,102,241,.11), transparent 14rem),
    radial-gradient(circle at 0% 100%, rgba(139,92,246,.07), transparent 15rem),
    linear-gradient(135deg, rgba(255,255,255,.99), rgba(245,243,255,.94)) !important;
}

.md-intel-card.is-blue {
  background:
    radial-gradient(circle at 100% 0%, rgba(37,99,235,.12), transparent 10rem),
    linear-gradient(135deg, #ffffff, #eff6ff) !important;
  border-color: rgba(37,99,235,.18) !important;
}
.md-intel-card.is-red {
  background:
    radial-gradient(circle at 100% 0%, rgba(239,68,68,.12), transparent 10rem),
    linear-gradient(135deg, #ffffff, #fff1f2) !important;
  border-color: rgba(239,68,68,.18) !important;
}
.md-intel-card.is-green {
  background:
    radial-gradient(circle at 100% 0%, rgba(5,150,105,.12), transparent 10rem),
    linear-gradient(135deg, #ffffff, #ecfdf5) !important;
  border-color: rgba(5,150,105,.18) !important;
}
.md-intel-card.is-amber {
  background:
    radial-gradient(circle at 100% 0%, rgba(245,158,11,.13), transparent 10rem),
    linear-gradient(135deg, #ffffff, #fffbeb) !important;
  border-color: rgba(245,158,11,.20) !important;
}

.md-chart-summary,
.md-finance-chip,
.md-mix-item {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at 100% 0%, rgba(37,99,235,.06), transparent 8rem),
    linear-gradient(135deg, rgba(255,255,255,.98), rgba(248,251,255,.94)) !important;
}

.md-finance-chip {
  border-radius: 14px;
  padding: 8px !important;
}
.md-finance-chip:nth-child(1) { background: linear-gradient(135deg, #fff, #fdf2f8) !important; }
.md-finance-chip:nth-child(2) { background: linear-gradient(135deg, #fff, #f5f3ff) !important; }
.md-finance-chip:nth-child(3) { background: linear-gradient(135deg, #fff, #ecfeff) !important; }
.md-finance-chip:nth-child(4) { background: linear-gradient(135deg, #fff, #fff7ed) !important; }

.md-mix-item:nth-child(1) { background: linear-gradient(135deg, #fff, #fff1f2) !important; border-color: rgba(244,63,94,.20) !important; }
.md-mix-item:nth-child(2) { background: linear-gradient(135deg, #fff, #f5f3ff) !important; border-color: rgba(139,92,246,.20) !important; }
.md-mix-item:nth-child(3) { background: linear-gradient(135deg, #fff, #ecfeff) !important; border-color: rgba(6,182,212,.20) !important; }

.md-signal-row {
  border: 1px solid rgba(226,232,240,.62) !important;
  background: rgba(255,255,255,.58) !important;
}
.md-signal-row:nth-child(1),
.md-signal-row:nth-child(2) { background: linear-gradient(135deg, rgba(255,255,255,.88), rgba(255,241,242,.72)) !important; }
.md-signal-row:nth-child(3),
.md-signal-row:nth-child(4) { background: linear-gradient(135deg, rgba(255,255,255,.88), rgba(245,243,255,.72)) !important; }
.md-signal-row:nth-child(5) { background: linear-gradient(135deg, rgba(255,255,255,.88), rgba(236,253,245,.72)) !important; }
.md-signal-row:hover { transform: translateY(-1px); box-shadow: 0 10px 20px rgba(15,23,42,.055); }

.md-table thead th {
  background: linear-gradient(180deg, rgba(248,250,252,.98), rgba(241,245,249,.92));
}
.md-table tbody tr:nth-child(odd) td { background: rgba(248,250,252,.36); }
.md-table tbody tr:hover td { background: rgba(239,246,255,.74) !important; }

.md-view-panel { --card-a:#2563eb; --card-b:#8b5cf6; }
.md-breakdown-card { --card-a:#2563eb; --card-b:#06b6d4; }
.md-breakdown-card:nth-child(4n + 2) { --card-a:#8b5cf6; --card-b:#6366f1; }
.md-breakdown-card:nth-child(4n + 3) { --card-a:#059669; --card-b:#10b981; }
.md-breakdown-card:nth-child(4n + 4) { --card-a:#f59e0b; --card-b:#fb923c; }
.md-evidence-wrap { --card-a:#0ea5e9; --card-b:#6366f1; }


/* =========================================================
   Final colour correction - no accent stripes, modern KPI cards
   Reference direction: rounded gradient cards with full colour body.
========================================================= */
.md-card:not(.md-pillar-tile)::before,
.md-view-panel::before,
.md-breakdown-card::before,
.md-evidence-wrap::before,
.md-chart-card::before,
.md-donut-card::before,
.md-signals-card::before,
.md-action-card::before {
  display: none !important;
  content: none !important;
}

.md-kpi-card {
  min-height: 74px !important;
  grid-template-columns: 42px minmax(0, 1fr) !important;
  gap: 10px !important;
  align-items: center !important;
  padding: 11px 12px !important;
  border: 0 !important;
  border-radius: 16px !important;
  color: #ffffff !important;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.10) !important;
  overflow: hidden !important;
}
.md-kpi-card > span:first-child {
  order: 2 !important;
  min-width: 0 !important;
}
.md-kpi-card .md-kpi-icon {
  order: 1 !important;
  width: 38px !important;
  height: 38px !important;
  border-radius: 999px !important;
  color: var(--md-kpi-icon-color, rgba(15, 23, 42, 0.55)) !important;
  background: rgba(255, 255, 255, 0.96) !important;
  border: 1px solid rgba(255, 255, 255, 0.82) !important;
  box-shadow: 0 8px 18px rgba(15,23,42,.10) !important;
}
.md-kpi-card .md-kpi-icon svg {
  width: 18px !important;
  height: 18px !important;
  stroke-width: 2.35 !important;
}
.md-kpi-card h3 {
  margin: 0 !important;
  color: rgba(255,255,255,.86) !important;
  font-size: 10px !important;
  font-weight: 850 !important;
  letter-spacing: -0.012em !important;
  line-height: 1.1 !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}
.md-kpi-card .md-kpi-value {
  margin-top: 4px !important;
  gap: 3px !important;
}
.md-kpi-card .md-kpi-value strong {
  color: #ffffff !important;
  font-size: 20px !important;
  font-weight: 950 !important;
  letter-spacing: -0.055em !important;
  text-shadow: 0 1px 0 rgba(15,23,42,.08) !important;
}
.md-kpi-card .md-kpi-value span {
  color: rgba(255,255,255,.88) !important;
  font-size: 11px !important;
  font-weight: 900 !important;
}
.md-kpi-card p {
  margin-top: 4px !important;
  color: rgba(255,255,255,.82) !important;
  font-size: 9px !important;
  font-weight: 760 !important;
  line-height: 1.18 !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}
.md-kpi-card:hover {
  transform: translateY(-1px) !important;
  box-shadow: 0 16px 28px rgba(15, 23, 42, 0.14) !important;
}

.tone-blue.md-kpi-card { background: linear-gradient(135deg, #21c6d8 0%, #1677f2 100%) !important; }
.tone-cyan.md-kpi-card { background: linear-gradient(135deg, #19c7d6 0%, #0ea5e9 100%) !important; }
.tone-green.md-kpi-card { background: linear-gradient(135deg, #13c88b 0%, #059669 100%) !important; }
.tone-red.md-kpi-card { background: linear-gradient(135deg, #ff6a78 0%, #ef4444 100%) !important; }
.tone-amber.md-kpi-card { background: linear-gradient(135deg, #ffbd42 0%, #f59e0b 100%) !important; }
.tone-purple.md-kpi-card { background: linear-gradient(135deg, #8b5cf6 0%, #2563eb 100%) !important; }
.tone-pink.md-kpi-card { background: linear-gradient(135deg, #f472b6 0%, #8b5cf6 100%) !important; }
.tone-orange.md-kpi-card { background: linear-gradient(135deg, #ffb64a 0%, #fb7b2b 100%) !important; }
.tone-slate.md-kpi-card { background: linear-gradient(135deg, #64748b 0%, #334155 100%) !important; }


/* KPI semantic colour system
   Premium/executive palette. Each top KPI uses a distinct semantic colour,
   while icons stay in clean white circular bubbles like the reference. */
.md-kpi-card.kpi-health {
  --md-kpi-icon-color: #e11d48;
  background:
    radial-gradient(circle at 12% 0%, rgba(255, 255, 255, 0.22), transparent 30%),
    linear-gradient(135deg, #e11d48 0%, #9f1239 100%) !important;
}
.md-kpi-card.kpi-financial {
  --md-kpi-icon-color: #2563eb;
  background:
    radial-gradient(circle at 12% 0%, rgba(255, 255, 255, 0.22), transparent 30%),
    linear-gradient(135deg, #0ea5e9 0%, #1d4ed8 100%) !important;
}
.md-kpi-card.kpi-risk {
  --md-kpi-icon-color: #dc2626;
  background:
    radial-gradient(circle at 12% 0%, rgba(255, 255, 255, 0.22), transparent 30%),
    linear-gradient(135deg, #fb923c 0%, #b91c1c 100%) !important;
}
.md-kpi-card.kpi-compliance {
  --md-kpi-icon-color: #ca8a04;
  background:
    radial-gradient(circle at 12% 0%, rgba(255, 255, 255, 0.22), transparent 30%),
    linear-gradient(135deg, #facc15 0%, #ca8a04 100%) !important;
}
.md-kpi-card.kpi-savings {
  --md-kpi-icon-color: #0f766e;
  background:
    radial-gradient(circle at 12% 0%, rgba(255, 255, 255, 0.22), transparent 30%),
    linear-gradient(135deg, #14b8a6 0%, #0f766e 100%) !important;
}
.md-kpi-card.kpi-board {
  --md-kpi-icon-color: #6366f1;
  background:
    radial-gradient(circle at 12% 0%, rgba(255, 255, 255, 0.22), transparent 30%),
    linear-gradient(135deg, #6366f1 0%, #4338ca 100%) !important;
}
.md-kpi-card.kpi-default {
  --md-kpi-icon-color: #475569;
  background:
    radial-gradient(circle at 12% 0%, rgba(255, 255, 255, 0.2), transparent 30%),
    linear-gradient(135deg, #64748b 0%, #334155 100%) !important;
}
.md-kpi-card.kpi-compliance .md-kpi-value strong,
.md-kpi-card.kpi-compliance h3,
.md-kpi-card.kpi-compliance p {
  text-shadow: 0 1px 0 rgba(120, 53, 15, 0.14) !important;
}

/* Plain panels now use full soft coloured borders, not thick top stripes. */
.md-chart-card,
.md-donut-card,
.md-signals-card,
.md-action-card,
.md-intel-card,
.md-view-panel,
.md-breakdown-card,
.md-evidence-wrap {
  border-width: 1.5px !important;
  border-style: solid !important;
}
.md-chart-card { border-color: rgba(37, 99, 235, .24) !important; }
.md-donut-card { border-color: rgba(20, 184, 166, .24) !important; }
.md-signals-card { border-color: rgba(244, 63, 94, .22) !important; }
.md-action-card { border-color: rgba(99, 102, 241, .24) !important; }
.md-intel-card.is-blue { border-color: rgba(37, 99, 235, .24) !important; }
.md-intel-card.is-red { border-color: rgba(239, 68, 68, .24) !important; }
.md-intel-card.is-green { border-color: rgba(5, 150, 105, .24) !important; }
.md-intel-card.is-amber { border-color: rgba(245, 158, 11, .26) !important; }

/* Remove the last over-coloured empty-card fills from the previous patch. */
.md-chart-card,
.md-donut-card,
.md-signals-card,
.md-action-card {
  background:
    radial-gradient(circle at 96% 0%, rgba(37,99,235,.035), transparent 14rem),
    linear-gradient(180deg, rgba(255,255,255,.995), rgba(248,251,255,.975)) !important;
}
.md-signal-row,
.md-signal-row:nth-child(1),
.md-signal-row:nth-child(2),
.md-signal-row:nth-child(3),
.md-signal-row:nth-child(4),
.md-signal-row:nth-child(5) {
  background: rgba(255,255,255,.72) !important;
  border-color: rgba(226,232,240,.78) !important;
}
.md-finance-chip,
.md-finance-chip:nth-child(1),
.md-finance-chip:nth-child(2),
.md-finance-chip:nth-child(3),
.md-finance-chip:nth-child(4),
.md-mix-item,
.md-mix-item:nth-child(1),
.md-mix-item:nth-child(2),
.md-mix-item:nth-child(3) {
  background: rgba(255,255,255,.86) !important;
}

@media (max-width: 1280px) {
  .md-kpi-grid { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
}
@media (max-width: 720px) {
  .md-kpi-grid { grid-template-columns: 1fr !important; }
}


/* =========================================================
   Chart layout repair
   Fix cramped left summary card and clipped CTA in Monthly Exposure Snapshot.
========================================================= */
.md-chart-card {
  overflow: hidden !important;
}
.md-chart-card .md-card-head {
  margin-bottom: 10px !important;
}
.md-chart-layout {
  grid-template-columns: minmax(206px, 0.28fr) minmax(0, 1fr) !important;
  gap: 18px !important;
  align-items: stretch !important;
}
.md-chart-summary {
  width: 100% !important;
  min-width: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  display: grid !important;
  gap: 10px !important;
  align-content: start !important;
}
.md-chart-summary > div {
  min-width: 0 !important;
  min-height: 82px !important;
  padding: 13px 14px !important;
  border: 1px solid rgba(203, 213, 225, 0.74) !important;
  border-radius: 16px !important;
  background:
    radial-gradient(circle at 100% 0%, rgba(37, 99, 235, 0.055), transparent 8rem),
    linear-gradient(180deg, rgba(255,255,255,0.98), rgba(247,250,254,0.96)) !important;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.035) !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: center !important;
  border-bottom: 1px solid rgba(203, 213, 225, 0.74) !important;
}
.md-chart-summary > div:last-of-type {
  padding-bottom: 13px !important;
}
.md-chart-number {
  font-size: 30px !important;
  line-height: 0.95 !important;
  letter-spacing: -0.06em !important;
  white-space: nowrap !important;
}
.md-chart-summary span {
  display: block !important;
  margin-top: 7px !important;
  color: #52677f !important;
  font-size: 11px !important;
  line-height: 1.42 !important;
  font-weight: 780 !important;
  white-space: normal !important;
  overflow-wrap: normal !important;
}
.md-summary-btn {
  width: 100% !important;
  max-width: 100% !important;
  min-height: 38px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 0 12px !important;
  border-radius: 14px !important;
  white-space: nowrap !important;
  box-sizing: border-box !important;
}
.md-chart-panel {
  min-width: 0 !important;
  align-self: stretch !important;
  padding-top: 4px !important;
}
.md-chart-svg {
  height: 226px !important;
  max-width: 100% !important;
}
.md-finance-strip {
  margin-top: 13px !important;
  padding-top: 12px !important;
  gap: 12px !important;
}
.md-finance-chip {
  min-height: 46px !important;
  border-radius: 15px !important;
  padding: 8px 10px !important;
}
@media (max-width: 1180px) {
  .md-chart-layout {
    grid-template-columns: 1fr !important;
  }
  .md-chart-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
  .md-summary-btn {
    grid-column: 1 / -1 !important;
  }
}
@media (max-width: 640px) {
  .md-chart-summary {
    grid-template-columns: 1fr !important;
  }
}


/* =========================================================
   Executive AI Storytelling Layer
========================================================= */
.md-story-banner {
  position: relative !important;
  min-width: 0 !important;
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 0.38fr) !important;
  gap: 14px !important;
  align-items: stretch !important;
  padding: 15px !important;
  border: 1px solid rgba(191, 219, 254, 0.9) !important;
  border-radius: 20px !important;
  background:
    radial-gradient(circle at 0% 0%, rgba(37, 99, 235, 0.10), transparent 18rem),
    radial-gradient(circle at 96% 0%, rgba(20, 184, 166, 0.10), transparent 18rem),
    linear-gradient(135deg, rgba(255,255,255,0.985), rgba(240,247,255,0.965)) !important;
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.055) !important;
  overflow: hidden !important;
}
.md-story-banner::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  background: linear-gradient(180deg, #0ea5e9, #14b8a6);
}
.md-story-main {
  min-width: 0 !important;
  display: grid !important;
  grid-template-columns: 46px minmax(0, 1fr) !important;
  gap: 12px !important;
  align-items: start !important;
}
.md-story-icon {
  width: 46px !important;
  height: 46px !important;
  display: grid !important;
  place-items: center !important;
  border-radius: 16px !important;
  color: #2563eb !important;
  background: #ffffff !important;
  border: 1px solid rgba(191, 219, 254, 0.94) !important;
  box-shadow: 0 10px 22px rgba(37, 99, 235, 0.10) !important;
}
.md-story-status {
  display: inline-flex !important;
  width: fit-content !important;
  align-items: center !important;
  gap: 6px !important;
  min-height: 22px !important;
  padding: 0 9px !important;
  border-radius: 999px !important;
  color: #1d4ed8 !important;
  background: rgba(37, 99, 235, 0.08) !important;
  border: 1px solid rgba(37, 99, 235, 0.14) !important;
  font-size: 10px !important;
  font-weight: 900 !important;
  letter-spacing: 0.08em !important;
  text-transform: uppercase !important;
}
.md-story-banner h2 {
  margin: 8px 0 0 !important;
  color: #0f172a !important;
  font-size: clamp(18px, 1.65vw, 26px) !important;
  line-height: 1.04 !important;
  font-weight: 950 !important;
  letter-spacing: -0.06em !important;
}
.md-story-banner p {
  margin: 7px 0 0 !important;
  max-width: 940px !important;
  color: #475569 !important;
  font-size: 12px !important;
  line-height: 1.52 !important;
  font-weight: 720 !important;
}
.md-story-signals {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 7px !important;
  margin-top: 10px !important;
}
.md-story-signals span {
  min-height: 24px !important;
  display: inline-flex !important;
  align-items: center !important;
  padding: 0 10px !important;
  border-radius: 999px !important;
  color: #334155 !important;
  background: rgba(255,255,255,0.78) !important;
  border: 1px solid rgba(203, 213, 225, 0.82) !important;
  font-size: 10px !important;
  font-weight: 850 !important;
}
.md-story-recommendation {
  min-width: 0 !important;
  display: grid !important;
  gap: 8px !important;
  align-content: start !important;
  padding: 13px !important;
  border-radius: 16px !important;
  border: 1px solid rgba(203, 213, 225, 0.82) !important;
  background: rgba(255,255,255,0.78) !important;
}
.md-story-recommendation span {
  color: #64748b !important;
  font-size: 10px !important;
  font-weight: 900 !important;
  letter-spacing: 0.08em !important;
  text-transform: uppercase !important;
}
.md-story-recommendation strong {
  color: #10233f !important;
  font-size: 13px !important;
  line-height: 1.34 !important;
  font-weight: 900 !important;
}
.md-story-actions {
  display: grid !important;
  gap: 6px !important;
  margin-top: 2px !important;
  padding-left: 0 !important;
  list-style: none !important;
}
.md-story-actions li {
  position: relative !important;
  padding-left: 14px !important;
  color: #52677f !important;
  font-size: 11px !important;
  line-height: 1.36 !important;
  font-weight: 760 !important;
}
.md-story-actions li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.48em;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #2563eb;
}
.md-story-source {
  width: fit-content !important;
  margin-top: 2px !important;
  padding: 3px 8px !important;
  border-radius: 999px !important;
  color: #64748b !important;
  background: rgba(226,232,240,.6) !important;
  font-size: 9px !important;
  font-weight: 900 !important;
}
.md-story-red::before { background: linear-gradient(180deg, #ef4444, #f97316) !important; }
.md-story-amber::before { background: linear-gradient(180deg, #f59e0b, #facc15) !important; }
.md-story-green::before { background: linear-gradient(180deg, #10b981, #14b8a6) !important; }
.md-story-purple::before { background: linear-gradient(180deg, #6366f1, #8b5cf6) !important; }
.md-story-red .md-story-icon { color: #e11d48 !important; border-color: #fecdd3 !important; }
.md-story-amber .md-story-icon { color: #d97706 !important; border-color: #fde68a !important; }
.md-story-green .md-story-icon { color: #047857 !important; border-color: #a7f3d0 !important; }
.md-story-purple .md-story-icon { color: #4f46e5 !important; border-color: #c7d2fe !important; }
@media (max-width: 1040px) {
  .md-story-banner { grid-template-columns: 1fr !important; }
}
@media (max-width: 640px) {
  .md-story-main { grid-template-columns: 1fr !important; }
  .md-story-icon { width: 40px !important; height: 40px !important; }
}


/* =========================================================
   Final executive layout rewrite
   - Storytelling moved to the top of the dashboard.
   - Removed all thin coloured stripe/progress-line styling.
   - Summary cards become clean executive pulse cards, not line cards.
========================================================= */
.md-dashboard-view {
  gap: 12px !important;
}

.md-card::before,
.md-view-panel::before,
.md-breakdown-card::before,
.md-evidence-wrap::before,
.md-chart-card::before,
.md-donut-card::before,
.md-signals-card::before,
.md-action-card::before,
.md-story-banner::before,
.md-story-red::before,
.md-story-amber::before,
.md-story-green::before,
.md-story-purple::before,
.md-intel-card::before {
  display: none !important;
  content: none !important;
}

.md-story-banner {
  grid-template-columns: minmax(0, 1.45fr) minmax(340px, .55fr) !important;
  gap: 16px !important;
  padding: 18px !important;
  border: 0 !important;
  border-radius: 24px !important;
  background:
    radial-gradient(circle at 8% 8%, rgba(96, 165, 250, .28), transparent 22rem),
    radial-gradient(circle at 94% 0%, rgba(45, 212, 191, .24), transparent 18rem),
    linear-gradient(135deg, #0f172a 0%, #1e293b 54%, #0f766e 100%) !important;
  box-shadow: 0 22px 48px rgba(15, 23, 42, .18) !important;
  overflow: hidden !important;
}

.md-story-main {
  grid-template-columns: 50px minmax(0, 1fr) !important;
  gap: 14px !important;
  align-items: start !important;
}

.md-story-icon {
  width: 50px !important;
  height: 50px !important;
  border-radius: 18px !important;
  color: #ffffff !important;
  background: rgba(255, 255, 255, .13) !important;
  border: 1px solid rgba(255, 255, 255, .20) !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.22), 0 18px 28px rgba(15,23,42,.18) !important;
}

.md-story-status {
  min-height: 24px !important;
  color: #dbeafe !important;
  background: rgba(255, 255, 255, .12) !important;
  border: 1px solid rgba(255, 255, 255, .20) !important;
  letter-spacing: .11em !important;
}

.md-story-banner h2 {
  max-width: 980px !important;
  margin-top: 10px !important;
  color: #ffffff !important;
  font-size: clamp(22px, 1.95vw, 34px) !important;
  line-height: 1.03 !important;
  letter-spacing: -0.065em !important;
  text-wrap: balance !important;
}

.md-story-banner p {
  max-width: 920px !important;
  color: rgba(226, 232, 240, .90) !important;
  font-size: 13px !important;
  line-height: 1.55 !important;
  font-weight: 730 !important;
}

.md-story-signals {
  gap: 8px !important;
  margin-top: 12px !important;
}

.md-story-signals span {
  min-height: 26px !important;
  color: #e2e8f0 !important;
  background: rgba(255, 255, 255, .11) !important;
  border: 1px solid rgba(255, 255, 255, .20) !important;
  backdrop-filter: blur(10px) !important;
}

.md-story-recommendation {
  align-content: start !important;
  gap: 10px !important;
  padding: 16px !important;
  border-radius: 20px !important;
  border: 1px solid rgba(255, 255, 255, .20) !important;
  background: rgba(255, 255, 255, .12) !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.16) !important;
  backdrop-filter: blur(12px) !important;
}

.md-story-recommendation span {
  color: rgba(219, 234, 254, .92) !important;
}

.md-story-recommendation strong {
  color: #ffffff !important;
  font-size: 14px !important;
  line-height: 1.35 !important;
}

.md-story-actions li {
  color: rgba(226, 232, 240, .90) !important;
  font-size: 11px !important;
}

.md-story-actions li::before {
  background: #67e8f9 !important;
  box-shadow: 0 0 0 4px rgba(103, 232, 249, .12) !important;
}

.md-story-source {
  color: rgba(226, 232, 240, .88) !important;
  background: rgba(255, 255, 255, .13) !important;
}

.md-intel-strip {
  display: grid !important;
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  gap: 10px !important;
}

.md-intel-card {
  min-height: 76px !important;
  display: grid !important;
  align-content: space-between !important;
  gap: 8px !important;
  padding: 13px 14px !important;
  border-radius: 18px !important;
  box-shadow: 0 12px 28px rgba(15, 23, 42, .075) !important;
  overflow: hidden !important;
}

.md-intel-strip .md-progress-track {
  display: none !important;
}

.md-intel-top {
  align-items: flex-start !important;
}

.md-intel-top > span {
  color: #475569 !important;
  font-size: 10px !important;
  font-weight: 950 !important;
  letter-spacing: .055em !important;
  text-transform: uppercase !important;
}

.md-intel-top strong {
  color: #0f172a !important;
  font-size: 25px !important;
  line-height: .9 !important;
  letter-spacing: -.055em !important;
}

.md-intel-card small {
  max-width: 92% !important;
  color: #64748b !important;
  font-size: 10px !important;
  line-height: 1.36 !important;
  font-weight: 750 !important;
}

.md-intel-card.is-blue,
.md-intel-card.is-red,
.md-intel-card.is-green,
.md-intel-card.is-amber {
  border: 1px solid rgba(203, 213, 225, .62) !important;
}

.md-intel-card.is-blue {
  background:
    radial-gradient(circle at 100% 0%, rgba(37,99,235,.12), transparent 8rem),
    linear-gradient(135deg, #ffffff 0%, #eef6ff 100%) !important;
}
.md-intel-card.is-red {
  background:
    radial-gradient(circle at 100% 0%, rgba(225,29,72,.12), transparent 8rem),
    linear-gradient(135deg, #ffffff 0%, #fff1f2 100%) !important;
}
.md-intel-card.is-green {
  background:
    radial-gradient(circle at 100% 0%, rgba(15,118,110,.12), transparent 8rem),
    linear-gradient(135deg, #ffffff 0%, #ecfdf5 100%) !important;
}
.md-intel-card.is-amber {
  background:
    radial-gradient(circle at 100% 0%, rgba(217,119,6,.13), transparent 8rem),
    linear-gradient(135deg, #ffffff 0%, #fffbeb 100%) !important;
}

@media (max-width: 1180px) {
  .md-story-banner { grid-template-columns: 1fr !important; }
  .md-intel-strip { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
}

@media (max-width: 720px) {
  .md-story-main { grid-template-columns: 1fr !important; }
  .md-intel-strip { grid-template-columns: 1fr !important; }
}


/* =========================================================
   Storytelling typography refinement
   Cleaner executive reading hierarchy, less heavy display type.
========================================================= */
.md-story-banner {
  min-height: 166px !important;
  padding: 20px 22px !important;
  font-family: var(--ema-font-sans, var(--ema-font-body, "Inter", "Aptos", "Segoe UI", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Arial, sans-serif)) !important;
}

.md-story-main {
  grid-template-columns: 46px minmax(0, 1fr) !important;
  gap: 14px !important;
}

.md-story-icon {
  width: 46px !important;
  height: 46px !important;
  border-radius: 16px !important;
}

.md-story-icon .md-icon,
.md-story-icon svg {
  width: 18px !important;
  height: 18px !important;
  stroke-width: 2.05 !important;
}

.md-story-status {
  min-height: 22px !important;
  padding: 0 10px !important;
  font-size: 9.5px !important;
  font-weight: 760 !important;
  letter-spacing: .075em !important;
}

.md-story-banner h2 {
  max-width: 900px !important;
  margin-top: 10px !important;
  font-family: var(--ema-font-sans, var(--ema-font-body, "Inter", "Aptos", "Segoe UI", ui-sans-serif, system-ui, sans-serif)) !important;
  font-size: clamp(21px, 1.55vw, 29px) !important;
  line-height: 1.12 !important;
  font-weight: 780 !important;
  letter-spacing: -0.038em !important;
}

.md-story-banner p {
  max-width: 860px !important;
  margin-top: 9px !important;
  font-size: 13px !important;
  line-height: 1.62 !important;
  font-weight: 560 !important;
  letter-spacing: -0.006em !important;
}

.md-story-signals {
  margin-top: 13px !important;
  gap: 8px !important;
}

.md-story-signals span {
  min-height: 25px !important;
  padding: 0 11px !important;
  font-size: 10.5px !important;
  font-weight: 680 !important;
  letter-spacing: -0.006em !important;
}

.md-story-recommendation {
  padding: 17px !important;
  gap: 9px !important;
}

.md-story-recommendation span {
  font-size: 9.5px !important;
  font-weight: 760 !important;
  letter-spacing: .07em !important;
}

.md-story-recommendation strong {
  font-family: var(--ema-font-sans, var(--ema-font-body, "Inter", "Aptos", "Segoe UI", ui-sans-serif, system-ui, sans-serif)) !important;
  font-size: 14px !important;
  line-height: 1.44 !important;
  font-weight: 720 !important;
  letter-spacing: -0.015em !important;
}

.md-story-actions {
  gap: 7px !important;
}

.md-story-actions li {
  padding-left: 16px !important;
  font-size: 11.5px !important;
  line-height: 1.52 !important;
  font-weight: 560 !important;
}

.md-story-actions li::before {
  top: .56em !important;
  width: 5px !important;
  height: 5px !important;
}

.md-story-source {
  margin-top: 4px !important;
  font-size: 9.5px !important;
  font-weight: 680 !important;
  letter-spacing: -0.005em !important;
}

@media (max-width: 1180px) {
  .md-story-banner { min-height: auto !important; }
  .md-story-banner h2 { max-width: 100% !important; }
  .md-story-banner p { max-width: 100% !important; }
}


/* =========================================================
   Executive second-level decision lens
   Replaces count-only cards with exposure, confidence, action and evidence logic.
========================================================= */
.md-executive-lens {
  display: grid;
  gap: 14px;
}
.md-lens-summary {
  display: grid;
  grid-template-columns: 1.15fr .85fr .85fr .85fr;
  gap: 12px;
}
.md-lens-hero,
.md-lens-metric,
.md-decision-card {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(203, 213, 225, .78);
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(255,255,255,.99), rgba(248,251,255,.96));
  box-shadow: 0 12px 28px rgba(15, 23, 42, .055);
}
.md-lens-hero {
  min-height: 142px;
  padding: 18px;
  background:
    radial-gradient(circle at 94% 8%, rgba(37,99,235,.13), transparent 13rem),
    radial-gradient(circle at 0% 100%, rgba(139,92,246,.09), transparent 14rem),
    linear-gradient(135deg, #ffffff, #eff6ff);
}
.md-lens-hero::after,
.md-decision-card::after {
  content: "";
  position: absolute;
  right: -42px;
  top: -42px;
  width: 130px;
  height: 130px;
  border-radius: 999px;
  background: radial-gradient(circle, color-mix(in srgb, var(--lens-a, #2563eb) 20%, transparent), transparent 64%);
  pointer-events: none;
}
.md-lens-label,
.md-card-kicker {
  display: inline-flex;
  align-items: center;
  width: max-content;
  min-height: 23px;
  border-radius: 999px;
  padding: 0 10px;
  color: #1e3a8a;
  background: rgba(219,234,254,.88);
  font-size: 9.5px;
  line-height: 1;
  font-weight: 850;
  letter-spacing: .065em;
  text-transform: uppercase;
}
.md-lens-title {
  max-width: 720px;
  margin: 12px 0 0;
  color: #0f172a;
  font-family: var(--md-display-font) !important;
  font-size: clamp(20px, 1.45vw, 27px);
  line-height: 1.12;
  font-weight: 850;
  letter-spacing: -.045em;
}
.md-lens-copy {
  max-width: 780px;
  margin: 9px 0 0;
  color: #51657f;
  font-size: 12.5px;
  line-height: 1.55;
  font-weight: 620;
}
.md-lens-metric {
  min-height: 142px;
  display: grid;
  align-content: space-between;
  gap: 12px;
  padding: 16px;
}
.md-lens-metric span {
  color: #64748b;
  font-size: 10px;
  font-weight: 850;
  letter-spacing: .055em;
  text-transform: uppercase;
}
.md-lens-metric strong {
  color: #0f172a;
  font-family: var(--md-display-font) !important;
  font-size: clamp(23px, 1.85vw, 34px);
  line-height: .96;
  font-weight: 900;
  letter-spacing: -.06em;
  font-variant-numeric: tabular-nums;
}
.md-lens-metric small {
  color: #64748b;
  font-size: 11px;
  line-height: 1.35;
  font-weight: 650;
}
.md-lens-metric.is-money { background: linear-gradient(135deg, #fff, #fdf2f8); }
.md-lens-metric.is-risk { background: linear-gradient(135deg, #fff, #fff1f2); }
.md-lens-metric.is-evidence { background: linear-gradient(135deg, #fff, #ecfeff); }


/* Visual intelligence layer for second-level breakdowns */
.md-visual-panel {
  display: grid;
  grid-template-columns: minmax(0, 1.12fr) minmax(320px, .88fr);
  gap: 12px;
}
.md-visual-chart-card,
.md-visual-legend-card {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(203, 213, 225, .78);
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(255,255,255,.99), rgba(248,251,255,.96));
  box-shadow: 0 12px 28px rgba(15, 23, 42, .055);
}
.md-visual-chart-card {
  min-height: 310px;
  padding: 17px;
  background:
    radial-gradient(circle at 96% 4%, rgba(37,99,235,.12), transparent 15rem),
    radial-gradient(circle at 0% 100%, rgba(6,182,212,.075), transparent 14rem),
    linear-gradient(135deg, #ffffff, #f8fbff);
}
.md-visual-legend-card {
  min-height: 310px;
  display: grid;
  align-content: start;
  gap: 12px;
  padding: 17px;
  background:
    radial-gradient(circle at 100% 0%, rgba(139,92,246,.11), transparent 14rem),
    linear-gradient(135deg, #ffffff, #f5f3ff);
}
.md-visual-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.md-visual-head > div { min-width: 0; }
.md-visual-head span,
.md-visual-mode {
  display: inline-flex;
  align-items: center;
  min-height: 23px;
  border-radius: 999px;
  padding: 0 10px;
  color: #1e3a8a;
  background: rgba(219,234,254,.82);
  border: 1px solid rgba(191,219,254,.72);
  font-size: 9.5px;
  line-height: 1;
  font-weight: 850;
  letter-spacing: .065em;
  text-transform: uppercase;
  white-space: nowrap;
}
.md-visual-head h3,
.md-visual-legend-card h3 {
  margin: 9px 0 0;
  color: #10233f;
  font-family: var(--md-display-font) !important;
  font-size: 17px;
  line-height: 1.14;
  font-weight: 860;
  letter-spacing: -.04em;
}
.md-visual-head p,
.md-visual-legend-card p {
  margin: 7px 0 0;
  color: #51657f;
  font-size: 11.7px;
  line-height: 1.48;
  font-weight: 610;
}
.md-visual-donut-row {
  display: grid;
  grid-template-columns: 235px minmax(0, 1fr);
  gap: 18px;
  align-items: center;
}
.md-visual-donut {
  width: 220px;
  height: 220px;
  position: relative;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: conic-gradient(var(--donut, #2563eb 0% 100%));
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.58), 0 18px 34px rgba(15,23,42,.10);
}
.md-visual-donut::before {
  content: "";
  position: absolute;
  width: 126px;
  height: 126px;
  border-radius: 999px;
  background: rgba(255,255,255,.98);
  box-shadow: inset 0 0 0 1px rgba(226,232,240,.92), 0 10px 22px rgba(15,23,42,.07);
}
.md-visual-donut-center {
  position: relative;
  z-index: 1;
  width: 106px;
  display: grid;
  justify-items: center;
  gap: 3px;
  text-align: center;
}
.md-visual-donut-center strong {
  color: #0f172a;
  font-family: var(--md-display-font) !important;
  font-size: 22px;
  line-height: .98;
  font-weight: 920;
  letter-spacing: -.065em;
  font-variant-numeric: tabular-nums;
}
.md-visual-donut-center small {
  color: #64748b;
  font-size: 9.5px;
  line-height: 1.18;
  font-weight: 760;
}
.md-visual-side-stats {
  display: grid;
  gap: 9px;
}
.md-visual-stat {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  min-height: 48px;
  border: 1px solid rgba(226,232,240,.8);
  border-radius: 15px;
  padding: 9px 10px;
  background: rgba(255,255,255,.72);
  text-align: left;
}
.md-visual-dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: var(--dot, #2563eb);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--dot, #2563eb) 14%, transparent);
}
.md-visual-stat span,
.md-visual-legend-row span {
  min-width: 0;
  color: #10233f;
  font-size: 11.5px;
  line-height: 1.22;
  font-weight: 800;
}
.md-visual-stat em,
.md-visual-legend-row em {
  display: block;
  margin-top: 2px;
  color: #64748b;
  font-size: 10px;
  line-height: 1.2;
  font-style: normal;
  font-weight: 640;
}
.md-visual-stat strong,
.md-visual-legend-row strong {
  color: #0f172a;
  font-size: 12px;
  line-height: 1;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.md-visual-bars {
  display: grid;
  gap: 10px;
  margin-top: 6px;
}
.md-visual-bar {
  display: grid;
  gap: 8px;
  border: 1px solid rgba(226,232,240,.86);
  border-radius: 15px;
  padding: 10px 11px;
  background: rgba(255,255,255,.72);
  text-align: left;
  transition: transform 160ms ease, box-shadow 160ms ease;
}
.md-visual-bar:hover,
.md-visual-stat:hover,
.md-visual-legend-row:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(15,23,42,.06);
}
.md-visual-bar-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: #10233f;
  font-size: 11.5px;
  line-height: 1.25;
  font-weight: 820;
}
.md-visual-bar-top em {
  color: #475569;
  font-style: normal;
  font-weight: 900;
  white-space: nowrap;
}
.md-visual-track {
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(226,232,240,.88);
}
.md-visual-track i {
  display: block;
  width: var(--w, 0%);
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--dot, #2563eb), color-mix(in srgb, var(--dot, #2563eb) 62%, #06b6d4));
}
.md-visual-legend {
  display: grid;
  gap: 8px;
}
.md-visual-legend-row {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  border: 1px solid rgba(226,232,240,.82);
  border-radius: 14px;
  padding: 9px 10px;
  background: rgba(255,255,255,.70);
  text-align: left;
}

.md-decision-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.md-decision-card {
  --lens-a: #2563eb;
  min-height: 235px;
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  gap: 12px;
  padding: 16px;
  text-align: left;
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
}
.md-decision-card:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--lens-a) 38%, rgba(203,213,225,.78));
  box-shadow: 0 18px 36px rgba(15, 23, 42, .085);
}
.md-decision-card.tone-blue { --lens-a:#2563eb; background: linear-gradient(135deg, #fff, #eff6ff); }
.md-decision-card.tone-cyan { --lens-a:#06b6d4; background: linear-gradient(135deg, #fff, #ecfeff); }
.md-decision-card.tone-green { --lens-a:#059669; background: linear-gradient(135deg, #fff, #ecfdf5); }
.md-decision-card.tone-red { --lens-a:#e11d48; background: linear-gradient(135deg, #fff, #fff1f2); }
.md-decision-card.tone-amber { --lens-a:#d97706; background: linear-gradient(135deg, #fff, #fffbeb); }
.md-decision-card.tone-purple { --lens-a:#7c3aed; background: linear-gradient(135deg, #fff, #f5f3ff); }
.md-decision-card.tone-pink { --lens-a:#db2777; background: linear-gradient(135deg, #fff, #fdf2f8); }
.md-decision-card.tone-orange { --lens-a:#f97316; background: linear-gradient(135deg, #fff, #fff7ed); }
.md-card-kicker {
  color: color-mix(in srgb, var(--lens-a) 84%, #0f172a);
  background: color-mix(in srgb, var(--lens-a) 12%, #fff);
}
.md-decision-card h3 {
  margin: 0;
  color: #10233f;
  font-family: var(--md-display-font) !important;
  font-size: 16px;
  line-height: 1.16;
  font-weight: 850;
  letter-spacing: -.035em;
}
.md-decision-value-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
}
.md-decision-value-row strong {
  color: color-mix(in srgb, var(--lens-a) 92%, #0f172a);
  font-family: var(--md-display-font) !important;
  font-size: clamp(24px, 1.9vw, 34px);
  line-height: .96;
  font-weight: 920;
  letter-spacing: -.065em;
  font-variant-numeric: tabular-nums;
}
.md-decision-value-row span {
  color: #64748b;
  font-size: 11px;
  font-weight: 750;
  text-align: right;
}
.md-decision-progress {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(226,232,240,.9);
}
.md-decision-progress i {
  display: block;
  height: 100%;
  width: var(--w, 0%);
  border-radius: inherit;
  background: linear-gradient(90deg, var(--lens-a), color-mix(in srgb, var(--lens-a) 58%, #06b6d4));
}
.md-decision-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.md-decision-meta span {
  min-height: 24px;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0 9px;
  color: #475569;
  background: rgba(255,255,255,.72);
  border: 1px solid rgba(226,232,240,.72);
  font-size: 10px;
  font-weight: 760;
}
.md-decision-insight {
  margin: 0;
  color: #51657f;
  font-size: 11.5px;
  line-height: 1.48;
  font-weight: 610;
}
.md-decision-next {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 34px;
  border-top: 1px solid rgba(226,232,240,.82);
  padding-top: 11px;
  color: #0f172a;
  font-size: 11px;
  font-weight: 820;
}
.md-decision-next em {
  color: color-mix(in srgb, var(--lens-a) 84%, #0f172a);
  font-style: normal;
  white-space: nowrap;
}


/* =========================================================
   Compact executive command center for second-level drilldown
   Designed to look valuable: dashboard cockpit + chart + action table.
========================================================= */
.md-command-lens {
  display: grid;
  gap: 12px;
}
.md-command-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(420px, .85fr);
  gap: 12px;
  align-items: stretch;
}
.md-command-story,
.md-command-scoreboard,
.md-command-chart-card,
.md-command-priority-card,
.md-command-read-card,
.md-command-table-card {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(203, 213, 225, .74);
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(255,255,255,.98), rgba(248,251,255,.96));
  box-shadow: 0 12px 28px rgba(15, 23, 42, .055);
}
.md-command-story {
  min-height: 132px;
  padding: 18px 20px;
  background:
    radial-gradient(circle at 98% 8%, rgba(37,99,235,.14), transparent 15rem),
    radial-gradient(circle at 4% 100%, rgba(6,182,212,.09), transparent 16rem),
    linear-gradient(135deg, #ffffff, #f8fbff);
}
.md-command-story > span,
.md-command-pill,
.md-command-card-head span {
  display: inline-flex;
  align-items: center;
  width: max-content;
  min-height: 22px;
  border-radius: 999px;
  padding: 0 9px;
  color: #155e75;
  background: rgba(207,250,254,.72);
  border: 1px solid rgba(165,243,252,.72);
  font-size: 9px;
  line-height: 1;
  font-weight: 880;
  letter-spacing: .07em;
  text-transform: uppercase;
  white-space: nowrap;
}
.md-command-story h3 {
  max-width: 860px;
  margin: 11px 0 0;
  color: #0f172a;
  font-family: var(--md-display-font) !important;
  font-size: clamp(18px, 1.35vw, 25px);
  line-height: 1.1;
  font-weight: 880;
  letter-spacing: -.045em;
}
.md-command-story p {
  max-width: 940px;
  margin: 8px 0 0;
  color: #51657f;
  font-size: 12px;
  line-height: 1.48;
  font-weight: 630;
}
.md-command-scoreboard {
  display: grid;
  grid-template-columns: repeat(3, minmax(0,1fr));
  gap: 0;
  background: #fff;
}
.md-command-scoreboard article {
  min-width: 0;
  display: grid;
  align-content: center;
  gap: 6px;
  padding: 14px 14px;
  border-right: 1px solid rgba(226,232,240,.78);
}
.md-command-scoreboard article:last-child { border-right: 0; }
.md-command-scoreboard span,
.md-command-read-card div span {
  color: #64748b;
  font-size: 9.5px;
  line-height: 1.1;
  font-weight: 850;
  letter-spacing: .06em;
  text-transform: uppercase;
}
.md-command-scoreboard strong,
.md-command-priority-card > strong,
.md-command-read-card div strong {
  color: #0f172a;
  font-family: var(--md-display-font) !important;
  font-size: clamp(20px, 1.65vw, 30px);
  line-height: .98;
  font-weight: 920;
  letter-spacing: -.06em;
  font-variant-numeric: tabular-nums;
}
.md-command-scoreboard small {
  color: #64748b;
  font-size: 10.5px;
  line-height: 1.28;
  font-weight: 650;
}
.md-command-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(245px, .52fr) minmax(255px, .58fr);
  gap: 12px;
  align-items: stretch;
}
.md-command-chart-card,
.md-command-priority-card,
.md-command-read-card,
.md-command-table-card {
  padding: 14px;
}
.md-command-chart-card {
  min-height: 252px;
  background:
    radial-gradient(circle at 100% 0%, rgba(37,99,235,.10), transparent 13rem),
    linear-gradient(135deg, #ffffff, #f8fbff);
}
.md-command-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.md-command-card-head h3,
.md-command-priority-card h3,
.md-command-read-card h3,
.md-command-table-head h3 {
  margin: 8px 0 0;
  color: #10233f;
  font-family: var(--md-display-font) !important;
  font-size: 15.5px;
  line-height: 1.13;
  font-weight: 870;
  letter-spacing: -.037em;
}
.md-command-card-head p,
.md-command-priority-card p,
.md-command-read-card p,
.md-command-table-head p {
  margin: 6px 0 0;
  color: #5a6f89;
  font-size: 11px;
  line-height: 1.42;
  font-weight: 630;
}
.md-command-card-head > em {
  align-self: flex-start;
  color: #475569;
  background: #f8fafc;
  border: 1px solid rgba(226,232,240,.84);
  border-radius: 999px;
  padding: 6px 9px;
  font-size: 9.5px;
  font-style: normal;
  font-weight: 820;
  white-space: nowrap;
}
.md-command-donut-layout {
  display: grid;
  grid-template-columns: 158px minmax(0,1fr);
  gap: 16px;
  align-items: center;
}
.md-command-donut {
  position: relative;
  width: 146px;
  height: 146px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: conic-gradient(var(--donut, #2563eb 0% 100%));
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.58), 0 14px 28px rgba(15,23,42,.09);
}
.md-command-donut::before {
  content: "";
  position: absolute;
  width: 82px;
  height: 82px;
  border-radius: 999px;
  background: #fff;
  box-shadow: inset 0 0 0 1px rgba(226,232,240,.9);
}
.md-command-donut > span {
  position: relative;
  z-index: 1;
  width: 74px;
  display: grid;
  justify-items: center;
  gap: 2px;
  text-align: center;
}
.md-command-donut strong {
  color: #0f172a;
  font-family: var(--md-display-font) !important;
  font-size: 16px;
  line-height: .98;
  font-weight: 920;
  letter-spacing: -.05em;
  font-variant-numeric: tabular-nums;
}
.md-command-donut small {
  color: #64748b;
  font-size: 8.8px;
  line-height: 1.12;
  font-weight: 760;
}
.md-command-mini-legend,
.md-command-bars {
  display: grid;
  gap: 7px;
}
.md-command-mini-legend button,
.md-command-bars button {
  border: 1px solid rgba(226,232,240,.82);
  border-radius: 13px;
  background: rgba(255,255,255,.76);
  text-align: left;
  transition: transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease;
}
.md-command-mini-legend button {
  min-height: 35px;
  display: grid;
  grid-template-columns: 9px minmax(0,1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 7px 9px;
}
.md-command-mini-legend button:hover,
.md-command-bars button:hover,
.md-command-row:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--dot, #2563eb) 36%, rgba(226,232,240,.82));
  box-shadow: 0 12px 24px rgba(15,23,42,.06);
}
.md-command-mini-legend i,
.md-command-row > span:first-child i {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--dot, #2563eb);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--dot, #2563eb) 13%, transparent);
}
.md-command-mini-legend span {
  min-width: 0;
  color: #10233f;
  font-size: 11px;
  line-height: 1.15;
  font-weight: 790;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.md-command-mini-legend strong {
  color: #0f172a;
  font-size: 11px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}
.md-command-bars button {
  display: grid;
  gap: 7px;
  padding: 8px 10px;
}
.md-command-bars button > span {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: #10233f;
  font-size: 11px;
  line-height: 1.15;
}
.md-command-bars b,
.md-command-row b {
  font-weight: 850;
}
.md-command-bars em,
.md-command-row em {
  color: #64748b;
  font-size: 10px;
  font-style: normal;
  font-weight: 690;
}
.md-command-bars button > i {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(226,232,240,.86);
}
.md-command-bars u {
  display: block;
  width: var(--w, 0%);
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--dot, #2563eb), color-mix(in srgb, var(--dot, #2563eb) 62%, #06b6d4));
}
.md-command-priority-card {
  display: grid;
  align-content: start;
  gap: 10px;
  background:
    radial-gradient(circle at 100% 0%, rgba(236,72,153,.10), transparent 12rem),
    linear-gradient(135deg, #ffffff, #fff7fb);
}
.md-command-priority-card > strong {
  color: #db2777;
}
.md-command-chipline {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.md-command-chipline span {
  min-height: 23px;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0 8px;
  color: #475569;
  background: rgba(255,255,255,.74);
  border: 1px solid rgba(226,232,240,.78);
  font-size: 9.5px;
  font-weight: 760;
}
.md-command-priority-card > button {
  width: max-content;
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  border-radius: 999px;
  padding: 0 12px;
  color: #fff;
  background: linear-gradient(135deg, #ec4899, #8b5cf6);
  font-size: 10.5px;
  font-weight: 840;
  box-shadow: 0 12px 22px rgba(139,92,246,.18);
}
.md-command-read-card {
  display: grid;
  align-content: start;
  gap: 10px;
  background:
    radial-gradient(circle at 100% 0%, rgba(6,182,212,.10), transparent 12rem),
    linear-gradient(135deg, #ffffff, #ecfeff);
}
.md-command-read-card div {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px 12px;
  margin-top: 2px;
  padding-top: 10px;
  border-top: 1px solid rgba(226,232,240,.82);
}
.md-command-read-card div strong {
  font-size: 14px;
  letter-spacing: -.035em;
  text-align: right;
}
.md-command-table-card {
  padding: 0;
  background: #fff;
}
.md-command-table-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px 12px;
  border-bottom: 1px solid rgba(226,232,240,.84);
}
.md-command-table-head h3 { margin-top: 7px; }
.md-command-table-head p {
  max-width: 280px;
  text-align: right;
}
.md-data-table-shell {
  display: grid;
  gap: 10px;
}
.md-data-toolbar {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) minmax(150px, max-content) minmax(112px, max-content) max-content;
  gap: 8px;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(226,232,240,.82);
  background: linear-gradient(180deg, #fff, #f8fbff);
}
.md-data-search {
  min-width: 0;
  min-height: 36px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(203,213,225,.86);
  border-radius: 12px;
  background: #fff;
  padding: 0 11px;
  color: #64748b;
}
.md-data-search input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #0f172a;
  font-size: 11.5px;
  font-weight: 720;
}
.md-data-toolbar select {
  min-height: 36px;
  border: 1px solid rgba(203,213,225,.86);
  border-radius: 12px;
  background: #fff;
  color: #10233f;
  padding: 0 10px;
  font-size: 11px;
  font-weight: 780;
}
.md-data-toolbar > span {
  color: #64748b;
  font-size: 10.5px;
  font-weight: 820;
  white-space: nowrap;
}
.md-empty-row {
  padding: 16px;
  color: #64748b;
  font-size: 12px;
  font-weight: 760;
}
.md-data-pagination {
  min-height: 44px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-top: 1px solid rgba(226,232,240,.82);
  background: #fff;
}
.md-data-pagination span,
.md-data-pagination strong {
  color: #64748b;
  font-size: 10.5px;
  font-weight: 820;
}
.md-data-pagination div {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.md-data-pagination button {
  min-height: 30px;
  border: 1px solid rgba(203,213,225,.86);
  border-radius: 10px;
  background: #fff;
  color: #10233f;
  padding: 0 10px;
  font-size: 10.5px;
  font-weight: 820;
}
.md-data-pagination button:disabled {
  cursor: not-allowed;
  opacity: .45;
}
.md-command-rows {
  display: grid;
}
.md-command-row {
  --dot: #2563eb;
  min-height: 60px;
  display: grid;
  grid-template-columns: 116px minmax(0, 1.3fr) 150px 150px minmax(220px, .9fr) 106px;
  align-items: center;
  gap: 10px;
  border: 0;
  border-bottom: 1px solid rgba(226,232,240,.76);
  background: #fff;
  padding: 10px 16px;
  text-align: left;
  transition: transform 150ms ease, box-shadow 150ms ease, background 150ms ease;
}
.md-command-row:last-child { border-bottom: 0; }
.md-command-row.tone-blue { --dot:#2563eb; }
.md-command-row.tone-cyan { --dot:#0891b2; }
.md-command-row.tone-green { --dot:#059669; }
.md-command-row.tone-red { --dot:#e11d48; }
.md-command-row.tone-amber { --dot:#d97706; }
.md-command-row.tone-purple { --dot:#7c3aed; }
.md-command-row.tone-pink { --dot:#db2777; }
.md-command-row.tone-orange { --dot:#f97316; }
.md-command-row:hover { background: linear-gradient(90deg, color-mix(in srgb, var(--dot) 5%, #fff), #fff); }
.md-command-row > span {
  min-width: 0;
  color: #10233f;
  font-size: 11px;
  line-height: 1.22;
  font-weight: 730;
}
.md-command-row > span:first-child {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: color-mix(in srgb, var(--dot) 88%, #0f172a);
  font-weight: 850;
}
.md-command-row > span:nth-child(2),
.md-command-row > span:nth-child(3),
.md-command-row > span:nth-child(4) {
  display: grid;
  gap: 3px;
}
.md-command-row > span:nth-child(6) {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
  color: color-mix(in srgb, var(--dot) 88%, #0f172a);
  font-weight: 850;
  white-space: nowrap;
}
.md-command-row-head {
  min-height: 36px;
  background: #f8fafc !important;
  pointer-events: none;
}
.md-command-row-head span {
  color: #64748b !important;
  font-size: 9.5px !important;
  font-weight: 880 !important;
  letter-spacing: .065em;
  text-transform: uppercase;
}
.md-command-row-head span:first-child i { display: none; }
@media (max-width: 1280px) {
  .md-command-hero,
  .md-command-grid { grid-template-columns: 1fr; }
  .md-command-row { grid-template-columns: 106px minmax(0,1.2fr) 130px 130px minmax(180px,.9fr) 96px; }
}
@media (max-width: 900px) {
  .md-command-scoreboard { grid-template-columns: 1fr; }
  .md-command-scoreboard article { border-right: 0; border-bottom: 1px solid rgba(226,232,240,.78); }
  .md-command-scoreboard article:last-child { border-bottom: 0; }
  .md-command-donut-layout { grid-template-columns: 1fr; justify-items: center; }
  .md-command-table-card { overflow-x: auto; }
  .md-command-row { min-width: 860px; }
  .md-data-toolbar { grid-template-columns: 1fr; }
  .md-data-pagination { align-items: flex-start; flex-direction: column; }
}
@media (max-width: 1240px) {
  .md-lens-summary { grid-template-columns: 1fr 1fr; }
  .md-lens-hero { grid-column: 1 / -1; }
  .md-visual-panel { grid-template-columns: 1fr; }
  .md-decision-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 760px) {
  .md-lens-summary,
  .md-visual-panel,
  .md-decision-grid { grid-template-columns: 1fr; }
  .md-visual-donut-row { grid-template-columns: 1fr; justify-items: center; }
}


/* De-duplicated management overview: one meaning per section */
.md-kpi-grid.md-exec-kpi-grid {
  grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
}
.md-overview-grid {
  grid-template-columns: minmax(0, 1.45fr) minmax(360px, .55fr) !important;
  align-items: stretch !important;
}
.md-domain-card {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.md-domain-list {
  display: grid;
  gap: 9px;
  margin-top: 6px;
}
.md-domain-row {
  width: 100%;
  min-height: 64px;
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  border: 1px solid rgba(203, 213, 225, .74);
  border-radius: 14px;
  background: linear-gradient(180deg, #ffffff, #f8fbff);
  padding: 10px 11px;
  text-align: left;
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
}
.md-domain-row:hover {
  transform: translateY(-1px);
  border-color: rgba(37, 99, 235, .28);
  box-shadow: 0 12px 24px rgba(15, 23, 42, .07);
}
.md-domain-icon {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  color: #fff;
}
.md-domain-copy {
  min-width: 0;
  display: grid;
  gap: 4px;
}
.md-domain-copy strong {
  color: #10233f;
  font-family: var(--md-display-font) !important;
  font-size: 12.5px;
  line-height: 1.12;
  font-weight: 900;
  letter-spacing: -0.025em;
}
.md-domain-copy span {
  color: #64748b;
  font-size: 10.5px;
  line-height: 1.32;
  font-weight: 700;
}
.md-domain-score {
  min-width: 86px;
  display: grid;
  justify-items: end;
  gap: 4px;
  color: #0f172a;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}
.md-domain-score strong {
  font-size: 15px;
  line-height: 1;
  letter-spacing: -0.035em;
}
.md-domain-score span {
  color: #64748b;
  font-size: 10px;
  line-height: 1.2;
  font-weight: 750;
}
.md-action-only-grid {
  grid-template-columns: minmax(0, 1fr) !important;
}
.md-action-card-wide {
  min-width: 0;
}
.md-management-action-grid {
  display: grid;
  grid-template-columns: minmax(300px, 0.34fr) minmax(0, 1fr);
  gap: 14px;
  align-items: stretch;
}
.md-core-module-panel {
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px !important;
  border-radius: 20px !important;
  background:
    radial-gradient(circle at 96% 0%, rgba(139, 92, 246, 0.075), transparent 13rem),
    linear-gradient(180deg, rgba(255,255,255,0.995), rgba(248,251,255,0.972)) !important;
  border: 1.5px solid rgba(139, 92, 246, 0.18) !important;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.055) !important;
}
.md-core-module-panel .md-card-head {
  margin-bottom: 2px !important;
  padding: 0 !important;
}
.md-core-module-panel .md-pillar-stack {
  flex: 1 1 auto;
  display: grid !important;
  grid-template-columns: 1fr !important;
  grid-auto-rows: minmax(112px, 1fr);
  gap: 12px !important;
}
.md-core-module-panel .md-pillar-tile {
  min-height: 116px !important;
  grid-template-columns: 54px minmax(0, 1fr) !important;
  align-items: center !important;
  padding: 14px !important;
}
.md-core-module-panel .md-tile-icon {
  width: 50px !important;
  height: 50px !important;
}
.md-core-module-panel .md-pillar-tile h3 {
  font-size: 12.5px !important;
}
.md-core-module-panel .md-tile-value strong {
  font-size: clamp(24px, 1.9vw, 31px) !important;
}
.md-decision-table-card {
  min-width: 0;
  min-height: 560px !important;
  height: 100% !important;
  display: flex !important;
  flex-direction: column !important;
}
.md-decision-table-card .md-action-header {
  flex: 0 0 auto !important;
}
.md-decision-table-card .md-table-wrap {
  flex: 1 1 auto !important;
  min-height: 0 !important;
}
.md-decision-table-card .md-table td {
  padding-top: 11px !important;
  padding-bottom: 11px !important;
}
@media (max-width: 1180px) {
  .md-management-action-grid { grid-template-columns: 1fr !important; }
  .md-core-module-panel .md-pillar-stack {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    grid-auto-rows: auto !important;
  }
  .md-decision-table-card { min-height: auto !important; }
}
@media (max-width: 680px) {
  .md-core-module-panel .md-pillar-stack { grid-template-columns: 1fr !important; }
}
.md-chart-summary .md-chart-context {
  color: #64748b;
  font-size: 10.5px;
  line-height: 1.35;
  font-weight: 750;
}
@media (max-width: 1180px) {
  .md-kpi-grid.md-exec-kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
  .md-overview-grid { grid-template-columns: 1fr !important; }
}
@media (max-width: 680px) {
  .md-kpi-grid.md-exec-kpi-grid { grid-template-columns: 1fr !important; }
  .md-domain-row { grid-template-columns: 34px minmax(0, 1fr); }
  .md-domain-score { grid-column: 2; justify-items: start; min-width: 0; }
}


/* Monthly Exposure Intelligence compact layout */
.md-chart-card {
  display: grid !important;
  align-content: start !important;
  gap: 12px !important;
  min-height: auto !important;
  padding: 16px 18px !important;
}
.md-chart-card .md-card-head {
  margin-bottom: 0 !important;
}
.md-chart-layout {
  grid-template-columns: minmax(206px, 0.24fr) minmax(0, 1fr) !important;
  gap: 18px !important;
  align-items: start !important;
}
.md-chart-panel {
  min-height: 250px !important;
  align-self: start !important;
}
.md-chart-svg {
  height: 238px !important;
}
.md-chart-summary > div {
  min-height: 80px !important;
}
.md-chart-context {
  min-height: 62px !important;
  display: flex !important;
  align-items: center !important;
  padding: 10px 12px !important;
  border: 1px solid rgba(226,232,240,.82) !important;
  border-radius: 14px !important;
  background: rgba(248,251,255,.74) !important;
}
.md-exposure-insight-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 2px;
}
.md-exposure-insight {
  --insight-a: #2563eb;
  min-width: 0;
  min-height: 86px;
  display: grid;
  align-content: space-between;
  gap: 7px;
  border: 1px solid rgba(203,213,225,.78);
  border-radius: 16px;
  padding: 12px 13px;
  background:
    radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--insight-a) 14%, transparent), transparent 8rem),
    linear-gradient(135deg, #ffffff, #f8fbff);
  text-align: left;
  box-shadow: 0 9px 20px rgba(15,23,42,.045);
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
}
.md-exposure-insight:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--insight-a) 34%, rgba(203,213,225,.78));
  box-shadow: 0 14px 28px rgba(15,23,42,.075);
}
.md-exposure-insight.tone-blue { --insight-a: #2563eb; }
.md-exposure-insight.tone-red { --insight-a: #e11d48; }
.md-exposure-insight.tone-amber { --insight-a: #f59e0b; }
.md-exposure-insight.tone-pink { --insight-a: #db2777; }
.md-exposure-insight.tone-green { --insight-a: #059669; }
.md-exposure-insight span {
  color: #64748b;
  font-size: 9.8px;
  line-height: 1.1;
  font-weight: 900;
  letter-spacing: .065em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.md-exposure-insight strong {
  color: #0f172a;
  font-family: var(--md-display-font) !important;
  font-size: clamp(20px, 1.55vw, 27px);
  line-height: .98;
  font-weight: 920;
  letter-spacing: -.06em;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.md-exposure-insight small {
  color: #5b6f89;
  font-size: 10.3px;
  line-height: 1.32;
  font-weight: 670;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
@media (max-width: 1180px) {
  .md-exposure-insight-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 680px) {
  .md-exposure-insight-strip { grid-template-columns: 1fr; }
}


/* =========================================================
   Executive Governance Hub revamp
   Dark/light mode is driven by TopNavbar ThemeContext and the root
   md-theme-dark/md-theme-light classes on this page.
========================================================= */
html.md-dashboard-page-active.md-dashboard-theme-dark,
body.md-dashboard-page-active.md-dashboard-theme-dark,
body.md-dashboard-page-active.md-dashboard-theme-dark #root,
html.md-dashboard-page-active.md-management-dashboard-dark,
body.md-dashboard-page-active.md-management-dashboard-dark,
body.md-dashboard-page-active.md-management-dashboard-dark #root {
  background: #050b18 !important;
}
body.md-dashboard-page-active.md-dashboard-theme-dark .ema-main,
body.md-dashboard-page-active.md-dashboard-theme-dark .ema-content,
body.md-dashboard-page-active.md-dashboard-theme-dark .ema-content-area,
body.md-dashboard-page-active.md-dashboard-theme-dark .app-main,
body.md-dashboard-page-active.md-dashboard-theme-dark .app-content,
body.md-dashboard-page-active.md-dashboard-theme-dark .layout-main,
body.md-dashboard-page-active.md-dashboard-theme-dark .layout-content,
body.md-dashboard-page-active.md-dashboard-theme-dark main,
body.md-dashboard-page-active.md-dashboard-theme-dark .content,
body.md-dashboard-page-active.md-dashboard-theme-dark .content-area,
body.md-dashboard-page-active.md-management-dashboard-dark .ema-main,
body.md-dashboard-page-active.md-management-dashboard-dark .ema-content,
body.md-dashboard-page-active.md-management-dashboard-dark .ema-content-area,
body.md-dashboard-page-active.md-management-dashboard-dark .app-main,
body.md-dashboard-page-active.md-management-dashboard-dark .app-content,
body.md-dashboard-page-active.md-management-dashboard-dark .layout-main,
body.md-dashboard-page-active.md-management-dashboard-dark .layout-content,
body.md-dashboard-page-active.md-management-dashboard-dark main,
body.md-dashboard-page-active.md-management-dashboard-dark .content,
body.md-dashboard-page-active.md-management-dashboard-dark .content-area {
  background: #050b18 !important;
}
body.md-dashboard-page-active.md-dashboard-theme-light,
body.md-dashboard-page-active.md-dashboard-theme-light #root,
body.md-dashboard-page-active.md-management-dashboard-light,
body.md-dashboard-page-active.md-management-dashboard-light #root {
  background: #f4f7fb !important;
}

.management-center-page {
  --gov-page: #f4f7fb;
  --gov-canvas: rgba(255, 255, 255, 0.72);
  --gov-panel: rgba(255, 255, 255, 0.92);
  --gov-panel-2: rgba(248, 251, 255, 0.92);
  --gov-border: rgba(203, 213, 225, 0.78);
  --gov-border-strong: rgba(148, 163, 184, 0.36);
  --gov-text: #0f172a;
  --gov-muted: #64748b;
  --gov-soft: #8aa0ba;
  --gov-shadow: 0 18px 44px rgba(15, 23, 42, 0.08);
  --gov-shadow-strong: 0 26px 70px rgba(15, 23, 42, 0.12);
  --gov-blue: #2563eb;
  --gov-purple: #7c3aed;
  --gov-cyan: #06b6d4;
  --gov-green: #10b981;
  --gov-orange: #f97316;
  --gov-red: #f43f5e;
  --gov-amber: #f59e0b;
  background:
    radial-gradient(circle at 8% 0%, rgba(37, 99, 235, 0.12), transparent 28rem),
    radial-gradient(circle at 96% 18%, rgba(124, 58, 237, 0.12), transparent 26rem),
    linear-gradient(180deg, #f8fbff 0%, var(--gov-page) 100%) !important;
}
.management-center-page.md-theme-dark {
  --gov-page: #050b18;
  --gov-canvas: rgba(5, 11, 24, 0.86);
  --gov-panel: rgba(12, 23, 43, 0.84);
  --gov-panel-2: rgba(15, 29, 54, 0.78);
  --gov-border: rgba(120, 145, 190, 0.24);
  --gov-border-strong: rgba(147, 197, 253, 0.24);
  --gov-text: #f8fafc;
  --gov-muted: #9fb2cc;
  --gov-soft: #7390b7;
  --gov-shadow: 0 22px 62px rgba(0, 0, 0, 0.32);
  --gov-shadow-strong: 0 34px 90px rgba(0, 0, 0, 0.44);
  background:
    radial-gradient(circle at 18% -10%, rgba(37, 99, 235, 0.20), transparent 30rem),
    radial-gradient(circle at 86% 12%, rgba(124, 58, 237, 0.20), transparent 28rem),
    radial-gradient(circle at 100% 88%, rgba(6, 182, 212, 0.10), transparent 32rem),
    linear-gradient(180deg, #050b18 0%, #071225 46%, #061120 100%) !important;
  color: var(--gov-text) !important;
}
.management-center-page.md-theme-light {
  color: var(--gov-text) !important;
}
.management-center-page.md-theme-dark::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.75) !important; }
.management-center-page.md-theme-dark::-webkit-scrollbar-thumb { background: rgba(96, 165, 250, 0.46) !important; border-color: rgba(15, 23, 42, 0.7) !important; }

.management-center-page.md-theme-dark .management-module-root,
.management-center-page.md-theme-light .management-module-root {
  background: transparent !important;
}
.management-center-page.md-theme-dark .management-module-root::before,
.management-center-page.md-theme-light .management-module-root::before {
  display: none !important;
}

.md-gov-shell {
  min-height: calc(100dvh - 104px);
  display: grid !important;
  grid-template-columns: 78px minmax(0, 1fr);
  gap: 18px !important;
  align-items: stretch;
  padding: 0 !important;
}
.md-gov-canvas {
  min-width: 0;
  display: grid;
  gap: 14px;
  align-content: start;
}
.md-gov-rail {
  position: sticky;
  top: 0;
  height: calc(100dvh - 104px);
  min-height: 720px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  padding: 16px 10px;
  border: 1px solid var(--gov-border);
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(255,255,255,0.86), rgba(239,246,255,0.74));
  box-shadow: var(--gov-shadow);
}
.md-theme-dark .md-gov-rail {
  background: linear-gradient(180deg, rgba(11, 24, 46, 0.92), rgba(8, 18, 34, 0.86));
  box-shadow: inset 0 1px 0 rgba(255,255,255,.05), var(--gov-shadow);
}
.md-gov-rail-logo {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  color: #ffffff;
  border-radius: 18px;
  background: linear-gradient(135deg, #7c3aed, #2563eb 54%, #06b6d4);
  box-shadow: 0 18px 34px rgba(37, 99, 235, 0.28);
}
.md-gov-rail nav {
  width: 100%;
  display: grid;
  gap: 10px;
}
.md-gov-rail button {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 16px;
  color: var(--gov-muted);
  background: transparent;
  transition: transform 160ms ease, border-color 160ms ease, background 160ms ease, color 160ms ease;
}
.md-gov-rail button span { display: none; }
.md-gov-rail button:hover {
  transform: translateY(-1px);
  color: var(--gov-text);
  border-color: var(--gov-border);
  background: rgba(96, 165, 250, 0.10);
}
.md-gov-rail button.is-active {
  color: #ffffff;
  border-color: rgba(96,165,250,.36);
  background: linear-gradient(135deg, #613df3, #2563eb);
  box-shadow: 0 15px 32px rgba(37, 99, 235, 0.30);
}
.md-gov-rail-bottom { margin-top: auto; }

.md-gov-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 18px;
  padding: 8px 4px 2px;
}
.md-gov-toolbar h1 {
  margin: 0;
  color: var(--gov-text);
  font-family: var(--md-display-font) !important;
  font-size: clamp(25px, 2.15vw, 38px);
  line-height: 1;
  font-weight: 940;
  letter-spacing: -0.065em;
}
.md-gov-toolbar p {
  margin: 6px 0 0;
  color: var(--gov-muted);
  font-size: 13px;
  line-height: 1.35;
  font-weight: 680;
}
.md-gov-toolbar-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}
.md-gov-toolbar-actions > button,
.md-gov-icon-btn,
.md-gov-panel-head > button,
.md-gov-lens-panel .md-gov-panel-head > button {
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--gov-border);
  border-radius: 14px;
  color: var(--gov-text);
  background: var(--gov-panel);
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.04);
  padding: 0 13px;
  font-size: 11px;
  font-weight: 850;
}
.md-theme-dark .md-gov-toolbar-actions > button,
.md-theme-dark .md-gov-panel-head > button,
.md-theme-dark .md-gov-lens-panel .md-gov-panel-head > button {
  background: rgba(12, 23, 43, 0.80);
  box-shadow: none;
}
.md-gov-toolbar-actions button span:first-child {
  color: var(--gov-soft);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: .08em;
}
.md-gov-icon-btn {
  width: 42px;
  justify-content: center;
  padding: 0 !important;
}
.md-gov-updated {
  color: var(--gov-muted);
  font-size: 10px;
  line-height: 1.18;
  font-weight: 760;
  text-align: right;
}
.md-gov-updated strong {
  color: var(--gov-text);
  font-size: 11px;
}

.md-gov-hero {
  position: relative;
  min-height: 174px;
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(180px, .34fr) minmax(280px, .46fr);
  gap: 18px;
  align-items: center;
  padding: 24px 26px;
  border: 1px solid rgba(124, 58, 237, 0.34);
  border-radius: 26px;
  background:
    radial-gradient(circle at 10% 4%, rgba(37, 99, 235, 0.34), transparent 30rem),
    radial-gradient(circle at 86% 0%, rgba(124, 58, 237, 0.38), transparent 28rem),
    linear-gradient(135deg, #0f2e6f 0%, #172554 48%, #3b1c77 100%);
  box-shadow: var(--gov-shadow-strong);
  color: #ffffff;
}
.md-theme-light .md-gov-hero {
  background:
    radial-gradient(circle at 12% 0%, rgba(37, 99, 235, 0.16), transparent 26rem),
    radial-gradient(circle at 88% 0%, rgba(124, 58, 237, 0.16), transparent 24rem),
    linear-gradient(135deg, #ffffff 0%, #eef4ff 50%, #f4edff 100%);
  color: #0f172a;
  border-color: rgba(147, 197, 253, 0.72);
}
.md-gov-hero::after {
  content: "";
  position: absolute;
  inset: auto -12% -48% 30%;
  height: 150px;
  opacity: .38;
  background: repeating-linear-gradient(0deg, transparent 0 12px, rgba(96,165,250,.32) 13px, transparent 16px);
  transform: rotate(-8deg);
  pointer-events: none;
}
.md-gov-eyebrow {
  display: inline-flex;
  align-items: center;
  color: var(--gov-soft);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: .13em;
  text-transform: uppercase;
}
.md-gov-hero .md-gov-eyebrow { color: rgba(219,234,254,.82); }
.md-theme-light .md-gov-hero .md-gov-eyebrow { color: #47668f; }
.md-gov-hero h2 {
  max-width: 760px;
  margin: 10px 0 0;
  color: inherit;
  font-family: var(--md-display-font) !important;
  font-size: clamp(22px, 2vw, 34px);
  line-height: 1.12;
  font-weight: 880;
  letter-spacing: -0.055em;
  text-wrap: balance;
}
.md-gov-hero p {
  max-width: 800px;
  margin: 12px 0 0;
  color: rgba(226, 232, 240, 0.88);
  font-size: 13px;
  line-height: 1.55;
  font-weight: 650;
}
.md-theme-light .md-gov-hero p { color: #526984; }
.md-gov-signal-row {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 12px;
}
.md-gov-signal-row span {
  min-height: 26px;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0 10px;
  color: rgba(239, 246, 255, 0.92);
  background: rgba(255, 255, 255, 0.10);
  border: 1px solid rgba(255,255,255,.18);
  font-size: 10px;
  font-weight: 850;
}
.md-theme-light .md-gov-signal-row span {
  color: #1f3b64;
  background: rgba(255,255,255,.72);
  border-color: rgba(191,219,254,.88);
}
.md-gov-orb {
  position: relative;
  width: 180px;
  height: 180px;
  justify-self: center;
  display: grid;
  place-items: center;
  isolation: isolate;
}
.md-gov-orb::before,
.md-gov-orb::after {
  content: "";
  position: absolute;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(96,165,250,.30), transparent 62%);
  filter: blur(2px);
  inset: 18px;
}
.md-gov-orb::after {
  inset: 48px 18px 18px;
  border: 1px solid rgba(96,165,250,.34);
  background: transparent;
  transform: rotateX(64deg);
}
.md-gov-orb svg {
  position: absolute;
  inset: 0;
  z-index: 1;
  transform: rotate(-90deg);
  overflow: visible;
}
.md-gov-ring-track,
.md-gov-ring-health,
.md-gov-ring-risk {
  fill: none;
  stroke-linecap: round;
}
.md-gov-ring-track { stroke: rgba(148, 163, 184, 0.24); stroke-width: 13; }
.md-gov-ring-health { stroke: url(#mdGovHealth); stroke-width: 13; filter: drop-shadow(0 0 14px rgba(96,165,250,.46)); }
.md-gov-ring-risk { stroke: url(#mdGovRisk); stroke-width: 9; opacity: .82; filter: drop-shadow(0 0 12px rgba(244,63,94,.34)); }
.md-gov-orb > span {
  position: relative;
  z-index: 2;
  width: 76px;
  height: 76px;
  display: grid;
  place-items: center;
  color: #ffffff;
  border-radius: 28px;
  background: linear-gradient(135deg, rgba(96,165,250,.92), rgba(124,58,237,.96));
  box-shadow: inset 0 1px 0 rgba(255,255,255,.35), 0 22px 40px rgba(30,64,175,.34);
}
.md-gov-orb > span .md-icon { width: 34px; height: 34px; }
.md-gov-priorities {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 10px;
  padding-left: 20px;
  border-left: 1px solid rgba(255,255,255,.18);
}
.md-theme-light .md-gov-priorities { border-left-color: rgba(59,130,246,.18); }
.md-gov-priorities > span,
.md-gov-priorities h3 {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: inherit;
  font-size: 14px;
  font-weight: 900;
  margin: 0;
}
.md-gov-priorities button {
  min-height: 26px;
  display: grid;
  grid-template-columns: 9px minmax(0, 1fr);
  align-items: start;
  gap: 9px;
  border: 0;
  padding: 0;
  color: rgba(239,246,255,.88);
  background: transparent;
  text-align: left;
  font-size: 11.5px;
  line-height: 1.35;
  font-weight: 680;
}
.md-theme-light .md-gov-priorities button { color: #405879; }
.md-gov-priorities button i {
  width: 8px;
  height: 8px;
  margin-top: .42em;
  border-radius: 999px;
  background: linear-gradient(135deg, #f43f5e, #f59e0b);
  box-shadow: 0 0 0 4px rgba(244,63,94,.12);
}

.md-gov-kpi-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}
.md-gov-kpi {
  --kpi-a: #2563eb;
  --kpi-b: #1d4ed8;
  position: relative;
  min-width: 0;
  min-height: 104px;
  overflow: hidden;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  border: 1px solid color-mix(in srgb, var(--kpi-a) 28%, var(--gov-border));
  border-radius: 20px;
  padding: 15px 16px;
  color: var(--gov-text);
  background:
    radial-gradient(circle at 94% 14%, color-mix(in srgb, var(--kpi-a) 28%, transparent), transparent 9rem),
    linear-gradient(135deg, color-mix(in srgb, var(--kpi-a) 14%, var(--gov-panel)), var(--gov-panel));
  box-shadow: var(--gov-shadow);
  text-align: left;
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
}
.md-gov-kpi:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--kpi-a) 48%, var(--gov-border));
  box-shadow: var(--gov-shadow-strong);
}
.md-gov-kpi.kpi-financial { --kpi-a: #2563eb; --kpi-b:#06b6d4; }
.md-gov-kpi.kpi-risk { --kpi-a: #f43f5e; --kpi-b:#fb923c; }
.md-gov-kpi.kpi-compliance { --kpi-a: #10b981; --kpi-b:#22c55e; }
.md-gov-kpi.kpi-board { --kpi-a: #f97316; --kpi-b:#f59e0b; }
.md-gov-kpi.kpi-health { --kpi-a: #7c3aed; --kpi-b:#2563eb; }
.md-gov-kpi.kpi-savings { --kpi-a: #06b6d4; --kpi-b:#0f766e; }
.md-gov-kpi-icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 18px;
  color: #ffffff;
  background: linear-gradient(135deg, var(--kpi-a), var(--kpi-b));
  box-shadow: 0 14px 24px color-mix(in srgb, var(--kpi-a) 26%, transparent);
}
.md-gov-kpi-copy {
  min-width: 0;
  display: grid;
  gap: 4px;
}
.md-gov-kpi-copy em {
  color: var(--gov-muted);
  font-size: 10px;
  line-height: 1.05;
  font-style: normal;
  font-weight: 880;
  letter-spacing: .02em;
}
.md-gov-kpi-copy strong {
  color: var(--gov-text);
  font-family: var(--md-display-font) !important;
  font-size: clamp(21px, 1.55vw, 29px);
  line-height: .98;
  font-weight: 940;
  letter-spacing: -.058em;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.md-gov-kpi-copy strong small { color: var(--gov-muted); font-size: 12px; letter-spacing: -.02em; }
.md-gov-kpi-copy span:last-child {
  color: var(--gov-muted);
  font-size: 10px;
  line-height: 1.25;
  font-weight: 680;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.md-gov-kpi-spark {
  position: absolute;
  right: 15px;
  bottom: 14px;
  width: 48px;
  height: 20px;
  opacity: .86;
  background: linear-gradient(135deg, transparent 38%, var(--kpi-a) 39% 44%, transparent 45% 55%, var(--kpi-b) 56% 61%, transparent 62%);
  border-bottom: 2px solid color-mix(in srgb, var(--kpi-a) 52%, transparent);
  border-radius: 0 0 999px 999px;
}

.md-gov-main-grid,
.md-gov-work-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.42fr) minmax(380px, .58fr);
  gap: 14px;
  align-items: stretch;
}
.md-gov-work-grid { grid-template-columns: minmax(0, 1.24fr) minmax(360px, .76fr); }
.md-gov-panel,
.md-gov-lens-panel {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--gov-border);
  border-radius: 22px;
  background: var(--gov-panel);
  box-shadow: var(--gov-shadow);
  backdrop-filter: blur(18px);
}
.md-theme-dark .md-gov-panel,
.md-theme-dark .md-gov-lens-panel {
  box-shadow: inset 0 1px 0 rgba(255,255,255,.04), var(--gov-shadow);
}
.md-gov-panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
  padding: 17px 18px 14px;
}
.md-gov-panel-head h2 {
  margin: 4px 0 0;
  color: var(--gov-text);
  font-family: var(--md-display-font) !important;
  font-size: clamp(16px, 1.1vw, 21px);
  line-height: 1.12;
  font-weight: 900;
  letter-spacing: -.045em;
}
.md-gov-panel-head p {
  margin: 5px 0 0;
  color: var(--gov-muted);
  font-size: 11px;
  line-height: 1.38;
  font-weight: 670;
}
.md-gov-panel-head > button {
  min-width: max-content;
  color: #dbeafe;
  background: linear-gradient(135deg, #2563eb, #7c3aed);
  border-color: transparent;
  box-shadow: 0 12px 28px rgba(37,99,235,.18);
}
.md-theme-light .md-gov-panel-head > button {
  color: #ffffff;
}
.md-gov-chart-split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, .72fr);
  gap: 16px;
  padding: 0 18px 16px;
}
.md-gov-bar-chart,
.md-gov-compliance-chart {
  min-width: 0;
  border: 1px solid var(--gov-border);
  border-radius: 18px;
  background: var(--gov-panel-2);
  padding: 14px;
}
.md-gov-chart-value,
.md-gov-compliance-chart > span {
  display: grid;
  gap: 4px;
  color: var(--gov-muted);
  font-size: 11px;
  font-weight: 760;
}
.md-gov-chart-value strong,
.md-gov-compliance-chart > strong {
  color: var(--gov-text);
  font-family: var(--md-display-font) !important;
  font-size: 25px;
  line-height: 1;
  font-weight: 930;
  letter-spacing: -.055em;
}
.md-gov-bars {
  height: 180px;
  display: grid;
  grid-template-columns: repeat(6, minmax(38px, 1fr));
  align-items: end;
  gap: 14px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed var(--gov-border);
}
.md-gov-bars > p {
  grid-column: 1 / -1;
  align-self: center;
  color: var(--gov-muted);
  text-align: center;
  font-size: 12px;
  font-weight: 760;
}
.md-gov-bars button {
  position: relative;
  min-width: 0;
  height: 100%;
  display: grid;
  align-items: end;
  justify-items: center;
  gap: 6px;
  border: 0;
  background: transparent;
  color: var(--gov-muted);
  padding: 0;
}
.md-gov-bars button i {
  width: 22px;
  height: var(--h, 8%);
  min-height: 12px;
  border-radius: 999px 999px 6px 6px;
  background: linear-gradient(180deg, #8b5cf6, #0ea5e9 58%, #2563eb);
  box-shadow: 0 12px 24px rgba(37,99,235,.20);
  transition: height 180ms ease, transform 180ms ease, filter 180ms ease;
}
.md-gov-bars button:hover i,
.md-gov-bars button.is-active i {
  transform: translateY(-3px);
  filter: brightness(1.15);
}
.md-gov-bars button span {
  font-size: 10px;
  font-weight: 760;
}
.md-gov-bars button em {
  position: absolute;
  top: 4px;
  display: none;
  min-width: 58px;
  border-radius: 999px;
  padding: 4px 7px;
  color: #ffffff;
  background: #2563eb;
  font-size: 9px;
  font-style: normal;
  font-weight: 880;
  box-shadow: 0 12px 22px rgba(37,99,235,.25);
}
.md-gov-bars button:hover em,
.md-gov-bars button.is-active em { display: inline-flex; justify-content: center; }
.md-gov-compliance-chart svg {
  width: 100%;
  height: 160px;
  display: block;
  margin-top: 2px;
  overflow: visible;
}
.md-gov-compliance-chart line { stroke: var(--gov-border); stroke-width: 1.2; stroke-dasharray: 4 6; }
.md-gov-compliance-chart polyline {
  fill: none;
  stroke: #22d3ee;
  stroke-width: 4;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 8px 12px rgba(34,211,238,.25));
}
.md-gov-compliance-chart circle { fill: #22d3ee; stroke: var(--gov-panel); stroke-width: 4; }
.md-gov-compliance-chart text { fill: #dbeafe; font-size: 11px; font-weight: 900; }
.md-theme-light .md-gov-compliance-chart text { fill: #2563eb; }
.md-gov-insight-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  padding: 0 18px 18px;
}
.md-gov-insight-grid button {
  min-width: 0;
  display: grid;
  gap: 6px;
  min-height: 92px;
  border: 1px solid var(--gov-border);
  border-radius: 16px;
  padding: 12px;
  background: var(--gov-panel-2);
  text-align: left;
}
.md-gov-insight-grid span {
  color: var(--gov-muted);
  font-size: 9px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: .06em;
}
.md-gov-insight-grid strong {
  color: var(--gov-text);
  font-family: var(--md-display-font) !important;
  font-size: 22px;
  line-height: 1;
  font-weight: 930;
  letter-spacing: -.055em;
}
.md-gov-insight-grid small {
  color: var(--gov-muted);
  font-size: 10px;
  line-height: 1.3;
  font-weight: 650;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.md-gov-domain-layout {
  display: grid;
  grid-template-columns: 230px minmax(0, 1fr);
  gap: 18px;
  align-items: center;
  padding: 0 18px 18px;
}
.md-gov-donut {
  width: 218px;
  height: 218px;
  display: grid;
  place-items: center;
  justify-self: center;
  border-radius: 999px;
  background: conic-gradient(var(--donut));
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.08), 0 22px 46px rgba(15,23,42,.16);
}
.md-gov-donut span {
  width: 112px;
  height: 112px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 4px;
  border-radius: 999px;
  background: var(--gov-panel);
  box-shadow: 0 0 0 10px color-mix(in srgb, var(--gov-panel) 68%, transparent), inset 0 0 0 1px var(--gov-border);
  text-align: center;
}
.md-gov-donut strong {
  color: var(--gov-text);
  font-family: var(--md-display-font) !important;
  font-size: 19px;
  line-height: 1;
  font-weight: 930;
  letter-spacing: -.055em;
}
.md-gov-donut small {
  color: var(--gov-muted);
  font-size: 9.5px;
  font-weight: 760;
}
.md-gov-domain-list {
  display: grid;
  gap: 10px;
}
.md-gov-domain-list button {
  min-width: 0;
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) minmax(74px, auto);
  gap: 11px;
  align-items: center;
  border: 1px solid var(--gov-border);
  border-radius: 14px;
  background: var(--gov-panel-2);
  padding: 10px 11px;
  text-align: left;
  color: var(--gov-text);
}
.md-gov-domain-list button.is-muted,
.md-gov-domain-list button:disabled { opacity: .55; cursor: not-allowed; }
.md-gov-domain-list button > i {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: var(--dot, #2563eb);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--dot, #2563eb) 18%, transparent);
}
.md-gov-domain-list strong,
.md-gov-domain-list em {
  color: var(--gov-text);
  font-size: 12px;
  font-weight: 880;
  font-style: normal;
}
.md-gov-domain-list small {
  display: block;
  margin-top: 3px;
  color: var(--gov-muted);
  font-size: 9.5px;
  line-height: 1.24;
  font-weight: 660;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.md-gov-domain-list u {
  grid-column: 1 / -1;
  height: 4px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(148,163,184,.20);
  text-decoration: none;
}
.md-gov-domain-list u b { display: block; height: 100%; border-radius: inherit; }

.md-gov-table-wrap {
  padding: 0 18px 18px;
  overflow-x: auto;
}
.md-gov-table {
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;
}
.md-gov-table th {
  color: var(--gov-soft);
  font-size: 9.5px;
  text-transform: uppercase;
  letter-spacing: .06em;
  font-weight: 900;
  text-align: left;
  padding: 10px 10px;
  border-bottom: 1px solid var(--gov-border);
}
.md-gov-table td {
  color: var(--gov-text);
  font-size: 11.2px;
  line-height: 1.36;
  font-weight: 700;
  padding: 12px 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--gov-border) 72%, transparent);
  cursor: pointer;
}
.md-gov-table tbody tr:hover td { background: rgba(59, 130, 246, .08); }
.md-gov-table .md-priority,
.md-gov-table .md-status-pill {
  min-height: 24px !important;
  padding: 0 9px !important;
  border-radius: 999px !important;
  font-size: 9.8px !important;
  box-shadow: none !important;
}
.md-gov-table .md-status-pill {
  color: #fbbf24 !important;
  background: rgba(245, 158, 11, 0.14) !important;
  border: 1px solid rgba(245,158,11,.22) !important;
}
.md-theme-light .md-gov-table .md-status-pill {
  color: #92400e !important;
  background: #fffbeb !important;
}

.md-gov-spotlight-list {
  display: grid;
  gap: 10px;
  padding: 0 18px 18px;
}
.md-gov-spotlight-list button {
  --spot: #2563eb;
  min-width: 0;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  align-items: center;
  gap: 11px;
  border: 1px solid var(--gov-border);
  border-radius: 16px;
  padding: 11px 12px;
  background:
    radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--spot) 18%, transparent), transparent 9rem),
    var(--gov-panel-2);
  color: var(--gov-text);
  text-align: left;
}
.md-gov-spotlight-list button.tone-red { --spot:#f43f5e; }
.md-gov-spotlight-list button.tone-orange { --spot:#fb923c; }
.md-gov-spotlight-list button.tone-amber { --spot:#f59e0b; }
.md-gov-spotlight-list button.tone-green { --spot:#10b981; }
.md-gov-spotlight-list button.tone-purple { --spot:#8b5cf6; }
.md-gov-spotlight-list button > span {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  color: #ffffff;
  border-radius: 15px;
  background: linear-gradient(135deg, var(--spot), color-mix(in srgb, var(--spot) 70%, #111827));
}
.md-gov-spotlight-list strong {
  min-width: 0;
  display: block;
  color: var(--gov-text);
  font-size: 12px;
  line-height: 1.22;
  font-weight: 850;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.md-gov-spotlight-list small {
  display: block;
  margin-top: 4px;
  color: var(--gov-muted);
  font-size: 10px;
  line-height: 1.24;
  font-weight: 650;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.md-gov-spotlight-list em {
  min-width: 58px;
  min-height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  color: var(--gov-text);
  background: color-mix(in srgb, var(--spot) 18%, transparent);
  border: 1px solid color-mix(in srgb, var(--spot) 28%, transparent);
  font-size: 11px;
  font-style: normal;
  font-weight: 880;
}

.md-gov-lens-panel {
  padding: 0 0 18px;
}
.md-gov-lens-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  padding: 0 18px;
}
.md-gov-lens-grid button {
  --lens: #7c3aed;
  position: relative;
  min-width: 0;
  min-height: 136px;
  overflow: hidden;
  display: grid;
  align-content: start;
  gap: 7px;
  border: 1px solid color-mix(in srgb, var(--lens) 32%, var(--gov-border));
  border-radius: 20px;
  padding: 16px;
  background:
    radial-gradient(circle at 100% 12%, color-mix(in srgb, var(--lens) 24%, transparent), transparent 10rem),
    linear-gradient(135deg, color-mix(in srgb, var(--lens) 16%, var(--gov-panel)), var(--gov-panel));
  color: var(--gov-text);
  text-align: left;
}
.md-gov-lens-grid button.tone-purple { --lens:#7c3aed; }
.md-gov-lens-grid button.tone-blue { --lens:#2563eb; }
.md-gov-lens-grid button.tone-green { --lens:#10b981; }
.md-gov-lens-grid button.tone-orange { --lens:#f97316; }
.md-gov-lens-grid button.tone-cyan { --lens:#06b6d4; }
.md-gov-lens-grid button.tone-red { --lens:#f43f5e; }
.md-gov-lens-grid button > span {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  color: #ffffff;
  border-radius: 15px;
  background: linear-gradient(135deg, var(--lens), color-mix(in srgb, var(--lens) 72%, #111827));
  box-shadow: 0 12px 24px color-mix(in srgb, var(--lens) 24%, transparent);
}
.md-gov-lens-grid em {
  color: var(--gov-muted);
  font-size: 11px;
  font-style: normal;
  font-weight: 820;
}
.md-gov-lens-grid strong {
  color: var(--gov-text);
  font-family: var(--md-display-font) !important;
  font-size: 28px;
  line-height: 1;
  font-weight: 930;
  letter-spacing: -.058em;
}
.md-gov-lens-grid strong small { color: var(--gov-muted); font-size: 12px; margin-left: 2px; }
.md-gov-lens-grid i {
  color: var(--gov-muted);
  font-size: 10px;
  font-style: normal;
  font-weight: 670;
}
.md-gov-lens-grid button::after {
  content: "";
  position: absolute;
  right: 16px;
  bottom: 18px;
  width: 82px;
  height: 24px;
  border-bottom: 2px solid color-mix(in srgb, var(--lens) 56%, transparent);
  border-radius: 0 0 999px 999px;
  opacity: .78;
}

.md-theme-light .md-gov-panel,
.md-theme-light .md-gov-lens-panel,
.md-theme-light .md-gov-kpi,
.md-theme-light .md-gov-bar-chart,
.md-theme-light .md-gov-compliance-chart,
.md-theme-light .md-gov-insight-grid button,
.md-theme-light .md-gov-domain-list button,
.md-theme-light .md-gov-spotlight-list button,
.md-theme-light .md-gov-lens-grid button {
  backdrop-filter: blur(10px);
}

@media (max-width: 1380px) {
  .md-gov-kpi-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .md-gov-hero { grid-template-columns: minmax(0, 1fr) minmax(280px, .48fr); }
  .md-gov-orb { display: none; }
  .md-gov-main-grid,
  .md-gov-work-grid { grid-template-columns: 1fr; }
}
@media (max-width: 1120px) {
  .md-gov-shell { grid-template-columns: 1fr; }
  .md-gov-rail { position: relative; top: auto; height: auto; min-height: 0; flex-direction: row; justify-content: space-between; padding: 10px; }
  .md-gov-rail nav { display: flex; gap: 8px; overflow-x: auto; }
  .md-gov-rail-bottom { margin-top: 0; }
  .md-gov-chart-split,
  .md-gov-domain-layout { grid-template-columns: 1fr; }
  .md-gov-donut { width: 190px; height: 190px; }
}
@media (max-width: 760px) {
  .md-gov-toolbar { flex-direction: column; }
  .md-gov-toolbar-actions { justify-content: flex-start; }
  .md-gov-hero { grid-template-columns: 1fr; padding: 20px; }
  .md-gov-priorities { padding-left: 0; border-left: 0; border-top: 1px solid rgba(148,163,184,.22); padding-top: 14px; }
  .md-gov-kpi-grid,
  .md-gov-insight-grid,
  .md-gov-lens-grid { grid-template-columns: 1fr; }
  .md-gov-panel-head { flex-direction: column; }
  .md-gov-bars { gap: 8px; }
  .md-gov-table { min-width: 680px; }
}

/* =========================================================
   Executive Governance Hub final layout
   Matches the selected concept and stays synced with TopNavbar ThemeContext.
========================================================= */
.management-center-page.md-theme-light {
  --gov-page: #f6f9ff;
  --gov-panel: rgba(255, 255, 255, .92);
  --gov-panel-strong: #ffffff;
  --gov-panel-muted: rgba(248, 251, 255, .92);
  --gov-border: rgba(203, 213, 225, .78);
  --gov-border-strong: rgba(191, 219, 254, .92);
  --gov-text: #0f172a;
  --gov-muted: #64748b;
  --gov-soft: #91a2bb;
  --gov-shadow: 0 18px 42px rgba(15, 23, 42, .075);
  --gov-shadow-soft: 0 10px 24px rgba(15, 23, 42, .055);
  --gov-hero: radial-gradient(circle at 12% 12%, rgba(37, 99, 235, .15), transparent 24rem), radial-gradient(circle at 80% 0%, rgba(124, 58, 237, .13), transparent 21rem), linear-gradient(135deg, #ffffff 0%, #eef6ff 55%, #f5f3ff 100%);
  --gov-hero-text: #10233f;
  --gov-hero-muted: #52677f;
  --gov-rail: linear-gradient(180deg, #ffffff, #f4f8ff);
  --gov-chart-grid: rgba(148, 163, 184, .25);
}
.management-center-page.md-theme-dark {
  --gov-page: #050b18;
  --gov-panel: rgba(12, 24, 46, .82);
  --gov-panel-strong: rgba(14, 27, 51, .96);
  --gov-panel-muted: rgba(20, 35, 61, .74);
  --gov-border: rgba(148, 163, 184, .18);
  --gov-border-strong: rgba(129, 140, 248, .28);
  --gov-text: #f8fafc;
  --gov-muted: #9fb0c8;
  --gov-soft: #70839f;
  --gov-shadow: 0 22px 52px rgba(0, 0, 0, .36);
  --gov-shadow-soft: 0 14px 32px rgba(0, 0, 0, .28);
  --gov-hero: radial-gradient(circle at 15% 14%, rgba(37, 99, 235, .42), transparent 24rem), radial-gradient(circle at 95% 8%, rgba(124, 58, 237, .38), transparent 22rem), linear-gradient(135deg, #0b1c3d 0%, #101b38 54%, #26145f 100%);
  --gov-hero-text: #ffffff;
  --gov-hero-muted: rgba(226, 232, 240, .86);
  --gov-rail: linear-gradient(180deg, rgba(13, 25, 48, .94), rgba(8, 16, 31, .96));
  --gov-chart-grid: rgba(148, 163, 184, .16);
}

.md-gov-shell {
  min-width: 0;
  display: grid !important;
  grid-template-columns: 76px minmax(0, 1fr);
  gap: 16px !important;
  align-items: start;
  padding: 0 !important;
}
.md-gov-canvas {
  min-width: 0;
  display: grid;
  gap: 14px;
}
.md-gov-rail {
  position: sticky;
  top: 12px;
  min-height: calc(100dvh - 106px);
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 14px;
  padding: 12px 10px;
  border: 1px solid var(--gov-border);
  border-radius: 26px;
  background: var(--gov-rail);
  box-shadow: var(--gov-shadow-soft);
}
.md-gov-rail-logo,
.md-gov-rail-bottom,
.md-gov-rail nav button {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 18px;
  color: var(--gov-muted);
  background: transparent;
}
.md-gov-rail-logo {
  color: #ffffff;
  background: radial-gradient(circle at 35% 20%, rgba(255,255,255,.28), transparent 45%), linear-gradient(135deg, #4f46e5, #7c3aed);
  box-shadow: 0 16px 26px rgba(79, 70, 229, .26);
}
.md-gov-rail nav {
  display: grid;
  align-content: start;
  gap: 8px;
}
.md-gov-rail nav button,
.md-gov-rail-bottom {
  position: relative;
  transition: transform 160ms ease, background 160ms ease, color 160ms ease, border-color 160ms ease;
}
.md-gov-rail nav button:hover,
.md-gov-rail nav button.is-active,
.md-gov-rail-bottom:hover {
  transform: translateY(-1px);
  color: #ffffff;
  border-color: rgba(96, 165, 250, .30);
  background: linear-gradient(135deg, #2563eb, #7c3aed);
  box-shadow: 0 14px 26px rgba(37, 99, 235, .22);
}
.md-gov-rail nav button span {
  position: absolute;
  left: 58px;
  top: 50%;
  z-index: 5;
  transform: translateY(-50%) translateX(-4px);
  pointer-events: none;
  opacity: 0;
  white-space: nowrap;
  border-radius: 999px;
  padding: 7px 10px;
  color: #ffffff;
  background: rgba(15, 23, 42, .92);
  font-size: 10.5px;
  font-weight: 850;
  transition: opacity 140ms ease, transform 140ms ease;
}
.md-gov-rail nav button:hover span {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}

.md-gov-toolbar {
  min-width: 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
}
.md-gov-toolbar h1 {
  margin: 0;
  color: var(--gov-text);
  font-family: var(--md-display-font) !important;
  font-size: clamp(25px, 2.35vw, 40px);
  line-height: 1;
  font-weight: 950;
  letter-spacing: -.068em;
}
.md-gov-toolbar p {
  margin: 6px 0 0;
  color: var(--gov-muted);
  font-size: 13px;
  line-height: 1.42;
  font-weight: 700;
}
.md-gov-toolbar-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 9px;
  flex-wrap: wrap;
}
.md-gov-toolbar-actions button,
.md-gov-updated {
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--gov-border);
  border-radius: 14px;
  padding: 0 12px;
  color: var(--gov-text);
  background: var(--gov-panel);
  box-shadow: var(--gov-shadow-soft);
  font-size: 11px;
  line-height: 1.2;
  font-weight: 850;
  white-space: nowrap;
}
.md-gov-toolbar-actions button span,
.md-gov-updated {
  color: var(--gov-muted);
  font-size: 10px;
  font-weight: 800;
}
.md-gov-updated {
  display: block;
  padding-top: 7px;
  padding-bottom: 7px;
  min-width: 92px;
  text-align: left;
}
.md-gov-updated strong { color: var(--gov-text); font-size: 11px; }
.md-gov-icon-btn { width: 42px !important; padding: 0 !important; justify-content: center; }

.md-gov-hero {
  position: relative;
  min-width: 0;
  min-height: 154px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 230px minmax(260px, .42fr);
  gap: 18px;
  align-items: center;
  overflow: hidden;
  border: 1px solid var(--gov-border-strong);
  border-radius: 28px;
  padding: 22px 24px;
  background: var(--gov-hero);
  box-shadow: var(--gov-shadow);
}
.md-gov-hero::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: .32;
  background-image: radial-gradient(circle at 70% 40%, rgba(255,255,255,.18) 1px, transparent 1px);
  background-size: 22px 22px;
  mask-image: linear-gradient(90deg, transparent, black 30%, transparent 95%);
}
.md-gov-hero-copy,
.md-gov-priorities,
.md-gov-orb { position: relative; z-index: 1; }
.md-gov-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #93c5fd;
  font-size: 10.5px;
  line-height: 1;
  font-weight: 950;
  letter-spacing: .105em;
  text-transform: uppercase;
}
.management-center-page.md-theme-light .md-gov-eyebrow { color: #4f46e5; }
.md-gov-hero h2 {
  max-width: 780px;
  margin: 9px 0 0;
  color: var(--gov-hero-text);
  font-family: var(--md-display-font) !important;
  font-size: clamp(22px, 2.1vw, 34px);
  line-height: 1.08;
  font-weight: 940;
  letter-spacing: -.064em;
  text-wrap: balance;
}
.md-gov-hero p {
  max-width: 820px;
  margin: 9px 0 0;
  color: var(--gov-hero-muted);
  font-size: 13px;
  line-height: 1.52;
  font-weight: 700;
}
.md-gov-signal-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 13px;
}
.md-gov-signal-row span {
  min-height: 27px;
  display: inline-flex;
  align-items: center;
  border: 1px solid rgba(255,255,255,.18);
  border-radius: 999px;
  padding: 0 11px;
  color: var(--gov-hero-muted);
  background: rgba(255,255,255,.12);
  font-size: 10px;
  line-height: 1;
  font-weight: 850;
}
.management-center-page.md-theme-light .md-gov-signal-row span {
  color: #334155;
  background: rgba(255,255,255,.76);
  border-color: rgba(203, 213, 225, .72);
}
.md-gov-orb {
  width: 210px;
  height: 142px;
  display: grid;
  place-items: center;
  justify-self: center;
}
.md-gov-orb svg {
  position: absolute;
  width: 164px;
  height: 164px;
  transform: rotate(-90deg);
  overflow: visible;
}
.md-gov-ring-track,
.md-gov-ring-health,
.md-gov-ring-risk {
  fill: none;
  stroke-linecap: round;
}
.md-gov-ring-track { stroke: rgba(148, 163, 184, .18); stroke-width: 16; }
.md-gov-ring-health { stroke: url(#mdGovHealth); stroke-width: 16; filter: drop-shadow(0 0 16px rgba(96, 165, 250, .32)); }
.md-gov-ring-risk { stroke: url(#mdGovRisk); stroke-width: 10; opacity: .92; }
.md-gov-orb > span {
  width: 86px;
  height: 86px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255,255,255,.22);
  border-radius: 28px;
  color: #ffffff;
  background: radial-gradient(circle at 34% 20%, rgba(255,255,255,.30), transparent 45%), linear-gradient(135deg, rgba(96,165,250,.92), rgba(124,58,237,.82));
  box-shadow: 0 0 0 15px rgba(59, 130, 246, .10), 0 24px 40px rgba(0, 0, 0, .28);
}
.md-gov-orb .md-icon { width: 38px; height: 38px; }
.md-gov-priorities {
  display: grid;
  gap: 10px;
  align-content: center;
  border-left: 1px solid rgba(255,255,255,.16);
  padding-left: 20px;
}
.management-center-page.md-theme-light .md-gov-priorities { border-left-color: rgba(148,163,184,.22); }
.md-gov-priorities > span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--gov-hero-text);
  font-size: 13px;
  font-weight: 900;
}
.md-gov-priorities button {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr);
  gap: 9px;
  align-items: start;
  border: 0;
  padding: 0;
  color: var(--gov-hero-muted);
  background: transparent;
  text-align: left;
  font-size: 11.5px;
  line-height: 1.35;
  font-weight: 730;
}
.md-gov-priorities button i {
  width: 7px;
  height: 7px;
  margin-top: .35em;
  border-radius: 999px;
  background: linear-gradient(135deg, #f43f5e, #fb923c);
  box-shadow: 0 0 0 4px rgba(244,63,94,.12);
}
.md-gov-priorities button:nth-child(3) i { background: linear-gradient(135deg, #f59e0b, #facc15); box-shadow: 0 0 0 4px rgba(245,158,11,.12); }
.md-gov-priorities button:nth-child(4) i { background: linear-gradient(135deg, #2563eb, #06b6d4); box-shadow: 0 0 0 4px rgba(37,99,235,.12); }

.md-gov-kpi-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}
.md-gov-kpi {
  --tone-a: #2563eb;
  --tone-b: #06b6d4;
  position: relative;
  min-width: 0;
  min-height: 88px;
  overflow: hidden;
  display: grid;
  grid-template-columns: 45px minmax(0, 1fr) 52px;
  gap: 10px;
  align-items: center;
  border: 1px solid color-mix(in srgb, var(--tone-a) 28%, var(--gov-border));
  border-radius: 20px;
  padding: 13px;
  background: radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--tone-a) 26%, transparent), transparent 9rem), var(--gov-panel);
  box-shadow: var(--gov-shadow-soft);
  color: var(--gov-text);
  text-align: left;
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
}
.md-gov-kpi:hover { transform: translateY(-2px); box-shadow: var(--gov-shadow); }
.md-gov-kpi.tone-blue, .md-gov-kpi.kpi-financial { --tone-a: #2563eb; --tone-b: #06b6d4; }
.md-gov-kpi.tone-cyan { --tone-a: #06b6d4; --tone-b: #22d3ee; }
.md-gov-kpi.tone-red, .md-gov-kpi.kpi-risk, .md-gov-kpi.kpi-health { --tone-a: #f43f5e; --tone-b: #fb923c; }
.md-gov-kpi.tone-green, .md-gov-kpi.kpi-compliance { --tone-a: #10b981; --tone-b: #22c55e; }
.md-gov-kpi.tone-orange, .md-gov-kpi.kpi-savings { --tone-a: #f59e0b; --tone-b: #fb923c; }
.md-gov-kpi.tone-purple, .md-gov-kpi.kpi-board { --tone-a: #7c3aed; --tone-b: #6366f1; }
.md-gov-kpi-icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 16px;
  color: #ffffff;
  background: linear-gradient(135deg, var(--tone-a), var(--tone-b));
  box-shadow: 0 14px 24px color-mix(in srgb, var(--tone-a) 22%, transparent);
}
.md-gov-kpi-copy { min-width: 0; display: grid; gap: 4px; }
.md-gov-kpi-copy em {
  color: var(--gov-muted);
  font-size: 10px;
  line-height: 1;
  font-style: normal;
  font-weight: 900;
  letter-spacing: .02em;
}
.md-gov-kpi-copy strong {
  color: var(--gov-text);
  font-family: var(--md-display-font) !important;
  font-size: 22px;
  line-height: .98;
  font-weight: 940;
  letter-spacing: -.055em;
  white-space: nowrap;
}
.md-gov-kpi-copy strong small { font-size: 12px; letter-spacing: -.02em; }
.md-gov-kpi-copy > span {
  color: var(--gov-muted);
  font-size: 9.8px;
  line-height: 1.25;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.md-gov-kpi-spark {
  justify-self: end;
  width: 48px;
  height: 22px;
  opacity: .78;
  border-radius: 0 0 16px 16px;
  border-bottom: 2px solid var(--tone-b);
  border-right: 2px solid transparent;
  transform: skewX(-18deg) rotate(-8deg);
}

.md-gov-main-grid,
.md-gov-work-grid {
  display: grid;
  gap: 14px;
  align-items: stretch;
}
.md-gov-main-grid { grid-template-columns: minmax(0, 1.32fr) minmax(380px, .68fr); }
.md-gov-work-grid { grid-template-columns: minmax(0, 1.25fr) minmax(360px, .75fr); }
.md-gov-panel,
.md-gov-lens-panel {
  min-width: 0;
  border: 1px solid var(--gov-border);
  border-radius: 24px;
  background: var(--gov-panel);
  box-shadow: var(--gov-shadow-soft);
  backdrop-filter: blur(14px);
}
.md-gov-panel { padding: 16px; }
.md-gov-lens-panel { padding: 16px; }
.md-gov-panel-head {
  min-width: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 13px;
}
.md-gov-panel-head h2 {
  margin: 5px 0 0;
  color: var(--gov-text);
  font-family: var(--md-display-font) !important;
  font-size: 18px;
  line-height: 1.08;
  font-weight: 940;
  letter-spacing: -.045em;
}
.md-gov-panel-head p {
  margin: 4px 0 0;
  color: var(--gov-muted);
  font-size: 11.2px;
  line-height: 1.38;
  font-weight: 670;
}
.md-gov-panel-head button {
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--gov-border);
  border-radius: 12px;
  padding: 0 11px;
  color: var(--gov-text);
  background: var(--gov-panel-muted);
  font-size: 10.5px;
  font-weight: 850;
  white-space: nowrap;
}

.md-gov-chart-split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(270px, .52fr);
  gap: 16px;
  align-items: stretch;
}
.md-gov-bar-chart,
.md-gov-compliance-chart {
  min-width: 0;
  border: 1px solid var(--gov-border);
  border-radius: 20px;
  background: var(--gov-panel-muted);
  padding: 14px;
}
.md-gov-chart-value { display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px; }
.md-gov-chart-value strong,
.md-gov-compliance-chart strong {
  color: var(--gov-text);
  font-family: var(--md-display-font) !important;
  font-size: 23px;
  line-height: 1;
  font-weight: 940;
  letter-spacing: -.055em;
}
.md-gov-chart-value span,
.md-gov-compliance-chart > span {
  color: var(--gov-muted);
  font-size: 10px;
  font-weight: 850;
}
.md-gov-bars {
  height: 210px;
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 8px;
  padding: 14px 4px 0;
  border-top: 1px dashed var(--gov-chart-grid);
  background-image: linear-gradient(var(--gov-chart-grid) 1px, transparent 1px);
  background-size: 100% 42px;
}
.md-gov-bars p {
  width: 100%;
  align-self: center;
  color: var(--gov-muted);
  text-align: center;
  font-size: 12px;
  font-weight: 800;
}
.md-gov-bars button {
  position: relative;
  flex: 1 1 0;
  min-width: 0;
  height: 100%;
  display: grid;
  align-items: end;
  justify-items: center;
  border: 0;
  padding: 0;
  background: transparent;
}
.md-gov-bars button i {
  width: min(34px, 70%);
  height: var(--h, 8%);
  border-radius: 12px 12px 5px 5px;
  background: linear-gradient(180deg, #8b5cf6, #2563eb 52%, #06b6d4);
  box-shadow: 0 10px 20px rgba(37, 99, 235, .20);
  transition: height 180ms ease, transform 160ms ease;
}
.md-gov-bars button:hover i,
.md-gov-bars button.is-active i { transform: translateY(-4px); box-shadow: 0 16px 26px rgba(37, 99, 235, .26); }
.md-gov-bars button span {
  margin-top: 8px;
  color: var(--gov-muted);
  font-size: 10px;
  font-weight: 800;
}
.md-gov-bars button em {
  position: absolute;
  top: 0;
  opacity: 0;
  transform: translateY(4px);
  border-radius: 999px;
  padding: 5px 8px;
  color: #ffffff;
  background: rgba(15, 23, 42, .92);
  font-size: 10px;
  font-style: normal;
  font-weight: 900;
  white-space: nowrap;
  transition: opacity 140ms ease, transform 140ms ease;
}
.md-gov-bars button:hover em,
.md-gov-bars button.is-active em { opacity: 1; transform: translateY(0); }
.md-gov-compliance-chart {
  display: grid;
  align-content: start;
  gap: 8px;
}
.md-gov-compliance-chart svg { width: 100%; height: 170px; overflow: visible; }
.md-gov-compliance-chart line { stroke: var(--gov-chart-grid); stroke-width: 1; }
.md-gov-compliance-chart polyline { fill: none; stroke: #38bdf8; stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; filter: drop-shadow(0 8px 12px rgba(56, 189, 248, .18)); }
.md-gov-compliance-chart circle { fill: #38bdf8; stroke: var(--gov-panel-strong); stroke-width: 3; }
.md-gov-compliance-chart text { fill: var(--gov-text); font-size: 12px; font-weight: 900; }
.md-gov-insight-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}
.md-gov-insight-grid button {
  min-width: 0;
  min-height: 75px;
  display: grid;
  align-content: space-between;
  gap: 5px;
  border: 1px solid var(--gov-border);
  border-radius: 16px;
  padding: 11px;
  background: var(--gov-panel-muted);
  text-align: left;
}
.md-gov-insight-grid span,
.md-gov-insight-grid small { color: var(--gov-muted); font-size: 9.7px; line-height: 1.25; font-weight: 760; }
.md-gov-insight-grid strong { color: var(--gov-text); font-size: 18px; font-family: var(--md-display-font) !important; line-height: 1; font-weight: 930; letter-spacing: -.05em; }

.md-gov-domain-layout {
  display: grid;
  grid-template-columns: 210px minmax(0, 1fr);
  gap: 16px;
  align-items: center;
}
.md-gov-donut {
  width: 204px;
  height: 204px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: conic-gradient(var(--donut));
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.12), 0 20px 38px rgba(0,0,0,.18);
}
.md-gov-donut span {
  width: 104px;
  height: 104px;
  display: grid;
  place-items: center;
  align-content: center;
  border-radius: 999px;
  background: var(--gov-panel-strong);
  text-align: center;
  box-shadow: inset 0 0 0 1px var(--gov-border);
}
.md-gov-donut strong { color: var(--gov-text); font-family: var(--md-display-font) !important; font-size: 20px; line-height: 1; font-weight: 940; letter-spacing: -.055em; }
.md-gov-donut small { display: block; margin-top: 5px; color: var(--gov-muted); font-size: 9px; font-weight: 850; }
.md-gov-domain-list { display: grid; gap: 9px; }
.md-gov-domain-list button {
  min-width: 0;
  min-height: 54px;
  display: grid;
  grid-template-columns: 12px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  border: 1px solid var(--gov-border);
  border-radius: 15px;
  padding: 10px;
  background: var(--gov-panel-muted);
  text-align: left;
}
.md-gov-domain-list button.is-muted { opacity: .56; cursor: not-allowed; }
.md-gov-domain-list i {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: var(--dot, #2563eb);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--dot, #2563eb) 16%, transparent);
}
.md-gov-domain-list strong,
.md-gov-domain-list em {
  color: var(--gov-text);
  font-size: 12px;
  font-style: normal;
  font-weight: 900;
}
.md-gov-domain-list small { display: block; margin-top: 3px; color: var(--gov-muted); font-size: 9.8px; line-height: 1.25; font-weight: 680; }
.md-gov-domain-list u {
  grid-column: 2 / -1;
  height: 5px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--gov-muted) 18%, transparent);
  text-decoration: none;
}
.md-gov-domain-list u b { display: block; height: 100%; border-radius: inherit; }

.md-gov-table-wrap { width: 100%; overflow-x: auto; }
.md-gov-table { width: 100%; border-collapse: collapse; min-width: 700px; }
.md-gov-table th,
.md-gov-table td {
  border-bottom: 1px solid var(--gov-border);
  padding: 12px 10px;
  text-align: left;
}
.md-gov-table th {
  color: var(--gov-muted);
  font-size: 9.8px;
  line-height: 1;
  font-weight: 950;
  letter-spacing: .07em;
  text-transform: uppercase;
}
.md-gov-table td {
  color: var(--gov-text);
  font-size: 11.2px;
  line-height: 1.38;
  font-weight: 720;
}
.md-gov-table tbody tr { cursor: pointer; transition: background 140ms ease; }
.md-gov-table tbody tr:hover { background: color-mix(in srgb, #2563eb 8%, transparent); }
.md-gov-spotlight-list { display: grid; gap: 9px; }
.md-gov-spotlight-list button {
  --tone-a: #2563eb;
  --tone-b: #06b6d4;
  min-height: 64px;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  border: 1px solid color-mix(in srgb, var(--tone-a) 18%, var(--gov-border));
  border-radius: 16px;
  padding: 10px;
  background: radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--tone-a) 14%, transparent), transparent 8rem), var(--gov-panel-muted);
  text-align: left;
}
.md-gov-spotlight-list button.tone-red { --tone-a: #f43f5e; --tone-b: #fb923c; }
.md-gov-spotlight-list button.tone-orange { --tone-a: #f59e0b; --tone-b: #fb923c; }
.md-gov-spotlight-list button.tone-purple { --tone-a: #7c3aed; --tone-b: #6366f1; }
.md-gov-spotlight-list button.tone-green { --tone-a: #10b981; --tone-b: #22c55e; }
.md-gov-spotlight-list button > span {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  color: #ffffff;
  background: linear-gradient(135deg, var(--tone-a), var(--tone-b));
}
.md-gov-spotlight-list strong { min-width: 0; color: var(--gov-text); font-size: 11.5px; line-height: 1.22; font-weight: 850; }
.md-gov-spotlight-list small { display: block; margin-top: 3px; color: var(--gov-muted); font-size: 9.8px; line-height: 1.28; font-weight: 660; }
.md-gov-spotlight-list em {
  justify-self: end;
  border-radius: 999px;
  padding: 6px 9px;
  color: var(--gov-text);
  background: color-mix(in srgb, var(--tone-a) 14%, var(--gov-panel-strong));
  font-size: 11px;
  line-height: 1;
  font-style: normal;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}
.md-gov-lens-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
.md-gov-lens-grid button {
  --tone-a: #7c3aed;
  --tone-b: #6366f1;
  min-height: 122px;
  display: grid;
  align-content: space-between;
  gap: 7px;
  border: 1px solid color-mix(in srgb, var(--tone-a) 24%, var(--gov-border));
  border-radius: 20px;
  padding: 14px;
  background: radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--tone-a) 18%, transparent), transparent 9rem), var(--gov-panel-muted);
  text-align: left;
}
.md-gov-lens-grid button.tone-blue { --tone-a: #2563eb; --tone-b: #06b6d4; }
.md-gov-lens-grid button.tone-green { --tone-a: #10b981; --tone-b: #22c55e; }
.md-gov-lens-grid button.tone-orange { --tone-a: #f59e0b; --tone-b: #fb923c; }
.md-gov-lens-grid button.tone-purple { --tone-a: #7c3aed; --tone-b: #6366f1; }
.md-gov-lens-grid button > span {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 15px;
  color: #ffffff;
  background: linear-gradient(135deg, var(--tone-a), var(--tone-b));
}
.md-gov-lens-grid em {
  color: var(--gov-muted);
  font-size: 10px;
  line-height: 1;
  font-style: normal;
  font-weight: 900;
}
.md-gov-lens-grid strong {
  color: var(--gov-text);
  font-family: var(--md-display-font) !important;
  font-size: 25px;
  line-height: 1;
  font-weight: 940;
  letter-spacing: -.055em;
}
.md-gov-lens-grid strong small { margin-left: 2px; font-size: 13px; letter-spacing: -.02em; }
.md-gov-lens-grid i { color: var(--gov-muted); font-size: 10px; line-height: 1.28; font-style: normal; font-weight: 670; }

.management-center-page.md-theme-light .md-gov-panel,
.management-center-page.md-theme-light .md-gov-lens-panel,
.management-center-page.md-theme-light .md-gov-toolbar-actions button,
.management-center-page.md-theme-light .md-gov-updated {
  background: rgba(255,255,255,.88);
}
.management-center-page.md-theme-dark .md-gov-panel,
.management-center-page.md-theme-dark .md-gov-lens-panel,
.management-center-page.md-theme-dark .md-gov-toolbar-actions button,
.management-center-page.md-theme-dark .md-gov-updated {
  background: rgba(12, 24, 46, .72);
}
.management-center-page.md-theme-light .md-gov-kpi {
  background: radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--tone-a) 16%, transparent), transparent 9rem), linear-gradient(135deg, #ffffff, color-mix(in srgb, var(--tone-a) 6%, #f8fbff));
}
.management-center-page.md-theme-dark .md-gov-kpi,
.management-center-page.md-theme-dark .md-gov-panel,
.management-center-page.md-theme-dark .md-gov-lens-panel {
  box-shadow: 0 18px 42px rgba(0, 0, 0, .26), inset 0 1px 0 rgba(255,255,255,.045);
}

@media (max-width: 1320px) {
  .md-gov-hero { grid-template-columns: minmax(0, 1fr) minmax(260px, .44fr); }
  .md-gov-orb { display: none; }
  .md-gov-kpi-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .md-gov-main-grid,
  .md-gov-work-grid { grid-template-columns: 1fr; }
}
@media (max-width: 980px) {
  .md-gov-shell { grid-template-columns: 1fr; }
  .md-gov-rail { position: static; min-height: 0; grid-template-columns: auto 1fr auto; grid-template-rows: 1fr; align-items: center; }
  .md-gov-rail nav { grid-auto-flow: column; overflow-x: auto; }
  .md-gov-toolbar { flex-direction: column; }
  .md-gov-toolbar-actions { justify-content: flex-start; }
  .md-gov-hero { grid-template-columns: 1fr; }
  .md-gov-priorities { border-left: 0; border-top: 1px solid var(--gov-border); padding-left: 0; padding-top: 14px; }
  .md-gov-chart-split,
  .md-gov-domain-layout { grid-template-columns: 1fr; }
  .md-gov-donut { justify-self: center; }
  .md-gov-lens-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 680px) {
  .md-gov-kpi-grid,
  .md-gov-insight-grid,
  .md-gov-lens-grid { grid-template-columns: 1fr; }
  .md-gov-toolbar-actions button:first-child { max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
  .md-gov-hero { padding: 18px; border-radius: 22px; }
  .md-gov-panel,
  .md-gov-lens-panel { border-radius: 20px; padding: 14px; }
  .md-gov-rail { display: none; }
}



/* =========================================================
   Compact management dashboard override
   - Removes the extra internal left rail because the app already has sidebar navigation.
   - Reduces oversized hero, KPI, chart and card spacing for normal management view.
========================================================= */
.management-center-page {
  padding: 10px 12px 14px !important;
}
.md-gov-shell {
  grid-template-columns: minmax(0, 1fr) !important;
  gap: 10px !important;
  min-height: auto !important;
}
.md-gov-rail {
  display: none !important;
}
.md-gov-canvas {
  gap: 10px !important;
}
.md-gov-toolbar {
  align-items: center !important;
  gap: 10px !important;
}
.md-gov-toolbar h1 {
  font-size: clamp(21px, 1.65vw, 28px) !important;
  letter-spacing: -0.055em !important;
}
.md-gov-toolbar p {
  margin-top: 3px !important;
  font-size: 11.5px !important;
}
.md-gov-toolbar-actions button,
.md-gov-updated {
  min-height: 34px !important;
  border-radius: 12px !important;
  padding: 0 10px !important;
  font-size: 10.5px !important;
}
.md-gov-icon-btn {
  width: 34px !important;
  min-width: 34px !important;
}
.md-gov-hero {
  min-height: 122px !important;
  grid-template-columns: minmax(0, 1fr) 132px minmax(260px, .46fr) !important;
  gap: 14px !important;
  padding: 16px 18px !important;
  border-radius: 22px !important;
}
.md-gov-eyebrow {
  font-size: 9.4px !important;
}
.md-gov-hero h2 {
  margin-top: 6px !important;
  font-size: clamp(20px, 1.45vw, 25px) !important;
  line-height: 1.09 !important;
}
.md-gov-hero p {
  margin-top: 7px !important;
  font-size: 11.4px !important;
  line-height: 1.42 !important;
}
.md-gov-signal-row {
  margin-top: 8px !important;
  gap: 6px !important;
}
.md-gov-signal-row span {
  min-height: 22px !important;
  padding: 0 8px !important;
  font-size: 9.3px !important;
}
.md-gov-orb {
  width: 130px !important;
  height: 96px !important;
}
.md-gov-orb svg {
  width: 118px !important;
  height: 118px !important;
}
.md-gov-orb > span {
  width: 58px !important;
  height: 58px !important;
  border-radius: 20px !important;
}
.md-gov-orb .md-icon {
  width: 26px !important;
  height: 26px !important;
}
.md-gov-priorities {
  gap: 7px !important;
  padding-left: 14px !important;
}
.md-gov-priorities > span {
  font-size: 12px !important;
}
.md-gov-priorities button {
  min-height: 20px !important;
  font-size: 10.2px !important;
  line-height: 1.28 !important;
}
.md-gov-kpi-grid {
  gap: 9px !important;
}
.md-gov-kpi {
  min-height: 70px !important;
  grid-template-columns: 34px minmax(0, 1fr) 36px !important;
  gap: 8px !important;
  padding: 10px !important;
  border-radius: 16px !important;
}
.md-gov-kpi-icon {
  width: 34px !important;
  height: 34px !important;
  border-radius: 12px !important;
}
.md-gov-kpi-icon .md-icon,
.md-gov-kpi-icon svg {
  width: 16px !important;
  height: 16px !important;
}
.md-gov-kpi-copy em {
  font-size: 9.2px !important;
}
.md-gov-kpi-copy strong {
  font-size: 18px !important;
}
.md-gov-kpi-copy > span {
  font-size: 8.9px !important;
}
.md-gov-kpi-spark {
  width: 34px !important;
  height: 16px !important;
  right: 10px !important;
  bottom: 10px !important;
}
.md-gov-main-grid,
.md-gov-work-grid {
  gap: 10px !important;
}
.md-gov-main-grid {
  grid-template-columns: minmax(0, 1.38fr) minmax(330px, .62fr) !important;
}
.md-gov-work-grid {
  grid-template-columns: minmax(0, 1.28fr) minmax(330px, .72fr) !important;
}
.md-gov-panel,
.md-gov-lens-panel {
  border-radius: 18px !important;
  padding: 12px !important;
}
.md-gov-panel-head {
  margin-bottom: 9px !important;
}
.md-gov-panel-head h2 {
  font-size: 15.5px !important;
}
.md-gov-panel-head p {
  font-size: 10px !important;
}
.md-gov-panel-head button {
  min-height: 30px !important;
  font-size: 9.5px !important;
}
.md-gov-chart-split {
  grid-template-columns: minmax(0, 1fr) minmax(240px, .45fr) !important;
  gap: 10px !important;
}
.md-gov-bar-chart,
.md-gov-compliance-chart {
  padding: 10px !important;
  border-radius: 14px !important;
}
.md-gov-chart-value strong,
.md-gov-compliance-chart strong {
  font-size: 20px !important;
}
.md-gov-bars {
  height: 154px !important;
  background-size: 100% 32px !important;
}
.md-gov-bars button i {
  width: min(26px, 68%) !important;
}
.md-gov-compliance-chart svg {
  height: 130px !important;
}
.md-gov-insight-grid {
  gap: 8px !important;
  margin-top: 9px !important;
}
.md-gov-insight-grid button {
  min-height: 60px !important;
  padding: 9px !important;
  border-radius: 13px !important;
}
.md-gov-insight-grid strong {
  font-size: 16px !important;
}
.md-gov-domain-layout {
  grid-template-columns: 164px minmax(0, 1fr) !important;
  gap: 12px !important;
}
.md-gov-donut {
  width: 158px !important;
  height: 158px !important;
}
.md-gov-donut span {
  width: 82px !important;
  height: 82px !important;
}
.md-gov-donut strong {
  font-size: 16px !important;
}
.md-gov-domain-list {
  gap: 7px !important;
}
.md-gov-domain-list button {
  min-height: 46px !important;
  padding: 8px !important;
  border-radius: 12px !important;
}
.md-gov-domain-list strong,
.md-gov-domain-list em {
  font-size: 10.8px !important;
}
.md-gov-domain-list small {
  font-size: 8.8px !important;
}
.md-gov-spotlight-list {
  gap: 7px !important;
}
.md-gov-spotlight-list button {
  min-height: 52px !important;
  grid-template-columns: 32px minmax(0, 1fr) auto !important;
  padding: 8px !important;
  border-radius: 13px !important;
}
.md-gov-spotlight-list button > span {
  width: 32px !important;
  height: 32px !important;
  border-radius: 11px !important;
}
.md-gov-spotlight-list strong {
  font-size: 10.5px !important;
}
.md-gov-spotlight-list small {
  font-size: 9px !important;
}
.md-gov-table th,
.md-gov-table td {
  padding: 9px 8px !important;
}
.md-gov-table td {
  font-size: 10.4px !important;
}
.md-gov-lens-grid {
  gap: 9px !important;
}
.md-gov-lens-grid button {
  min-height: 92px !important;
  padding: 11px !important;
  border-radius: 15px !important;
}
.md-gov-lens-grid button > span {
  width: 34px !important;
  height: 34px !important;
  border-radius: 12px !important;
}
.md-gov-lens-grid strong {
  font-size: 20px !important;
}
@media (max-width: 1320px) {
  .md-gov-main-grid,
  .md-gov-work-grid { grid-template-columns: 1fr !important; }
}
@media (max-width: 980px) {
  .md-gov-rail { display: none !important; }
  .md-gov-hero { grid-template-columns: 1fr !important; }
  .md-gov-orb { display: none !important; }
}
`;

function Icon({ name, className = "" }: { name: keyof typeof IconSet; className?: string }) {
  const Cmp = IconSet[name] || IconSet.activity;
  return <Cmp className={`md-icon ${className}`} strokeWidth={2.1} aria-hidden="true" />;
}

function moneyValue(value: unknown) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  return n;
}

function formatMoney(value: unknown) {
  const n = moneyValue(value);
  if (Math.abs(n) >= 1000000) return `RM ${(n / 1000000).toFixed(2)}M`;
  if (Math.abs(n) >= 1000) return `RM ${Math.round(n / 1000).toLocaleString()}K`;
  return `RM ${Math.round(n).toLocaleString()}`;
}

function parseNumberFromText(value: unknown, fallback = 0) {
  const matched = String(value ?? "").replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return matched ? Number(matched[0]) : fallback;
}

function clampPercent(value: unknown) {
  const n = Math.round(moneyValue(value));
  return Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));
}

const TABLE_PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

function normalizeTableSearchText(...values: unknown[]) {
  return values
    .map((value) => String(value ?? "").toLowerCase().trim())
    .filter(Boolean)
    .join(" ");
}

function clampPage(page: number, totalPages: number) {
  return Math.max(1, Math.min(Math.max(1, totalPages), page));
}

function getPageInfo(totalRows: number, page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = clampPage(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const end = Math.min(start + pageSize, totalRows);
  return { totalPages, safePage, start, end };
}

function normalizeTone(value?: string): Tone {
  const text = String(value || "blue").toLowerCase();
  if (["blue", "green", "red", "amber", "purple", "cyan", "pink", "orange", "slate"].includes(text)) return text as Tone;
  return "blue";
}


function getKpiSemanticClass(kpi: KpiItem, index = 0) {
  const title = String(kpi.title || "").toLowerCase();

  if (title.includes("health")) return "kpi-health";
  if (title.includes("financial") || title.includes("exposure")) {
    if (title.includes("risk")) return "kpi-risk";
    return "kpi-financial";
  }
  if (title.includes("risk")) return "kpi-risk";
  if (title.includes("compliance") || title.includes("audit")) return "kpi-compliance";
  if (title.includes("saving") || title.includes("opportunity")) return "kpi-savings";
  if (title.includes("board") || title.includes("attention") || title.includes("decision")) return "kpi-board";

  const fallback = ["kpi-health", "kpi-financial", "kpi-risk", "kpi-compliance", "kpi-savings", "kpi-board"];
  return fallback[index % fallback.length] || "kpi-default";
}

function normalizeIcon(value?: string): keyof typeof IconSet {
  const key = String(value || "dashboard") as keyof typeof IconSet;
  return IconSet[key] ? key : "dashboard";
}

function normalizeDashboard(payload: Partial<DashboardData> | null | undefined): DashboardData {
  return {
    generatedAt: payload?.generatedAt || "",
    executiveKpis: Array.isArray(payload?.executiveKpis) ? payload.executiveKpis : [],
    pillars: Array.isArray(payload?.pillars) ? payload.pillars : [],
    boardActions: Array.isArray(payload?.boardActions) ? payload.boardActions : [],
    finance: payload?.finance || {},
    analysis: {
      ...(payload?.analysis || {}),
      trend: Array.isArray(payload?.analysis?.trend) ? payload.analysis?.trend : [],
      signals: Array.isArray(payload?.analysis?.signals) ? payload.analysis?.signals : [],
      mix: payload?.analysis?.mix || { risk: 0, control: 0, savings: 0 },
    },
    level2: payload?.level2 || {},
    metrics: payload?.metrics || {},
  };
}

function getKpiTarget(kpi: KpiItem) {
  const title = String(kpi.title || "").toLowerCase();
  if (kpi.area) return { area: kpi.area, key: kpi.key || "", title: kpi.title };
  if (title.includes("financial")) return { area: "capex", key: "", title: kpi.title };
  if (title.includes("risk")) return { area: "risk", key: "", title: kpi.title };
  if (title.includes("compliance")) return { area: "compliance", key: "", title: kpi.title };
  if (title.includes("saving")) return { area: "saving", key: "", title: kpi.title };
  if (title.includes("board") || title.includes("attention")) return { area: "actions", key: "", title: "Board Action Queue" };
  return { area: "resources", key: "", title: kpi.title || "Management Insight" };
}

function parseActionTarget(action: BoardAction) {
  const raw = String(action.key || "");
  const [prefix, ...rest] = raw.split(":");
  let area = String(action.area || prefix || "risk").toLowerCase();
  let key = rest.join(":") || raw;
  if (area === "capex-category" || area === "capex-department") area = "capex";
  if (area === "data-quality") area = "compliance";
  if (!area || area === "actions") area = "risk";
  return { area, key };
}

function getDrillValue(row: DrillRow, area?: string) {
  const areaKey = String(area || "").toLowerCase();
  const rowValue = getRowValue(row);
  if (isEvidenceOnlyArea(areaKey)) {
    if (row.valueFmt && !/^RM\s/i.test(row.valueFmt)) return row.valueFmt;
    return formatEvidenceCount(row, "evidence record(s)");
  }
  if (row.valueFmt && !isZeroMoneyText(row.valueFmt)) return row.valueFmt;
  if (areaKey === "resources") return `${Number(row.count || 0).toLocaleString()} endpoint(s)`;
  if (areaKey === "compliance") return row.key === "pricing-coverage" ? `${Number(row.value || 0)}%` : `${Number(row.count || 0).toLocaleString()} record(s)`;
  if (areaKey === "actions") return rowValue > 0 ? formatMoney(rowValue) : "Decision item";
  return rowValue > 0 ? formatMoney(rowValue) : `${Number(row.count || 0).toLocaleString()} record(s)`;
}

function drillNumber(value: unknown) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function drillMoneyFromText(value: unknown) {
  const text = String(value || "");
  const match = text.replace(/,/g, "").match(/RM\s*([0-9.]+)\s*([MK])?/i);
  if (!match) return 0;
  const base = Number(match[1] || 0);
  const suffix = String(match[2] || "").toUpperCase();
  if (suffix === "M") return base * 1000000;
  if (suffix === "K") return base * 1000;
  return base;
}

function getRowValue(row: DrillRow) {
  const rawValue = drillNumber(row.value);
  const moneyTextValue = drillMoneyFromText(row.valueFmt);
  if (rawValue > 0) return rawValue;
  if (moneyTextValue > 0) return moneyTextValue;
  return 0;
}

function isEvidenceOnlyArea(area?: string) {
  return ["software", "network", "geolocation", "service", "servicedesk", "service-desk"].includes(String(area || "").toLowerCase());
}

function isZeroMoneyText(value?: string) {
  return /^RM\s*0(?:\.00)?$/i.test(String(value || "").trim());
}

function formatEvidenceCount(row: DrillRow, unit = "record(s)") {
  return `${Number(row.count || 0).toLocaleString()} ${unit}`;
}


type BreakdownVisualItem = {
  row: DrillRow;
  label: string;
  shortLabel: string;
  value: number;
  display: string;
  percent: number;
  tone: Tone;
  color: string;
};

type BreakdownVisualModel = {
  type: "donut" | "bar";
  modeLabel: string;
  title: string;
  description: string;
  headline: string;
  guidance: string;
  totalLabel: string;
  totalCaption: string;
  gradient: string;
  items: BreakdownVisualItem[];
};

function shortVisualLabel(value: unknown, max = 34) {
  const text = String(value || "-").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function getToneHex(tone?: string, index = 0) {
  const palette: Record<string, string> = {
    blue: "#2563eb",
    cyan: "#06b6d4",
    green: "#059669",
    red: "#e11d48",
    amber: "#d97706",
    purple: "#7c3aed",
    pink: "#db2777",
    orange: "#f97316",
    slate: "#475569",
  };
  const fallback = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#e11d48", "#06b6d4"];
  return palette[String(tone || "").toLowerCase()] || fallback[index % fallback.length];
}

function getVisualMeasure(row: DrillRow, area?: string) {
  const areaKey = String(area || "").toLowerCase();
  const rowKey = String(row.key || "").toLowerCase();
  const valueFmt = String(row.valueFmt || "");
  const rowValue = getRowValue(row);
  const rowCount = drillNumber(row.count);

  if (areaKey === "resources" || areaKey === "actions") {
    return { value: rowCount || rowValue, mode: "count" as const };
  }

  if (areaKey === "compliance" && (valueFmt.includes("%") || /coverage|identity|telemetry|sla/.test(rowKey))) {
    return { value: rowCount || rowValue, mode: "count" as const };
  }

  if (rowValue > 0 && !valueFmt.includes("%")) return { value: rowValue, mode: "money" as const };
  return { value: rowCount || rowValue, mode: rowValue > 0 ? "value" as const : "count" as const };
}

function formatVisualMeasure(row: DrillRow, area?: string) {
  const measure = getVisualMeasure(row, area);
  if (isEvidenceOnlyArea(area)) {
    if (row.valueFmt && !/^RM\s/i.test(row.valueFmt)) return row.valueFmt;
    return formatEvidenceCount(row, "evidence record(s)");
  }
  if (measure.mode === "money") return row.valueFmt && !isZeroMoneyText(row.valueFmt) ? row.valueFmt : formatMoney(measure.value);
  if (row.valueFmt && !/^RM\s/i.test(row.valueFmt)) return row.valueFmt;
  return `${Math.round(measure.value).toLocaleString()} record(s)`;
}

function buildBreakdownVisual(rows: DrillRow[], area?: string, lens?: ReturnType<typeof getBreakdownLens>): BreakdownVisualModel | null {
  if (!rows.length) return null;

  const areaKey = String(area || "").toLowerCase();
  const rawItems = rows
    .map((row, index) => {
      const measure = getVisualMeasure(row, area);
      return {
        row,
        label: row.label || row.key || `Item ${index + 1}`,
        shortLabel: shortVisualLabel(row.label || row.key || `Item ${index + 1}`),
        value: measure.value,
        display: formatVisualMeasure(row, area),
        tone: normalizeTone(row.tone),
        color: getToneHex(row.tone, index),
      };
    })
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  if (!rawItems.length) return null;

  const total = rawItems.reduce((sum, item) => sum + item.value, 0) || 1;
  const items = rawItems.map((item) => ({
    ...item,
    percent: Math.max(1, Math.round((item.value / total) * 100)),
  }));

  let cursor = 0;
  const gradient = items.map((item, index) => {
    const start = index === 0 ? 0 : cursor;
    const end = index === items.length - 1 ? 100 : Math.min(100, cursor + (item.value / total) * 100);
    cursor = end;
    return `${item.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
  }).join(", ");

  const pricedComposition = ["capex", "risk", "saving"].includes(areaKey) && rows.filter((row) => getVisualMeasure(row, area).mode === "money").length >= 2;
  const type: "donut" | "bar" = pricedComposition ? "donut" : "bar";
  const hasMoney = items.some((item) => getVisualMeasure(item.row, area).mode === "money");

  const titles: Record<string, { title: string; barTitle: string; headline: string; guidance: string }> = {
    capex: {
      title: "Financial exposure composition",
      barTitle: "Financial exposure ranking",
      headline: "Read this as budget shape, not just a count.",
      guidance: "Large slices show where immediate spend, reserve, risk-adjusted cost or pricing cleanup is driving management exposure.",
    },
    risk: {
      title: "Risk exposure composition",
      barTitle: "Risk pressure ranking",
      headline: "Risk is split by source and business consequence.",
      guidance: "Use the distribution to separate financial risk, PC lifecycle risk, visibility risk and auditor evidence risk before assigning owners.",
    },
    saving: {
      title: "Optimization evidence mix",
      barTitle: "Optimization evidence ranking",
      headline: "Optimization is shown only where live evidence exists.",
      guidance: "Rows without an approved cost or savings source are shown as evidence counts, not invented RM values.",
    },
    compliance: {
      title: "Audit evidence distribution",
      barTitle: "Audit gap ranking",
      headline: "Audit compliance is an evidence problem before it is a score problem.",
      guidance: "Prioritise the tallest bars because they show pricing, identity, telemetry or SLA proof gaps that auditors can challenge.",
    },
    resources: {
      title: "Endpoint visibility distribution",
      barTitle: "Endpoint pressure ranking",
      headline: "Resource view should show usable fleet, blind spots and ownership pressure.",
      guidance: "This chart turns endpoint counts into operational planning: online capacity, offline pressure, stale telemetry and ownership gaps.",
    },
    actions: {
      title: "Decision queue distribution",
      barTitle: "Decision queue pressure",
      headline: "This is the board queue, ranked by evidence pressure.",
      guidance: "Use the chart to identify which decision needs evidence review first, then open the linked evidence detail.",
    },
  };

  const copy = titles[areaKey] || {
    title: `${lens?.label || "Executive"} composition`,
    barTitle: `${lens?.label || "Executive"} ranking`,
    headline: "Use this visual to decide what needs attention first.",
    guidance: "The chart translates the second-level data into a ranking or composition so the cards below are easier to interpret.",
  };

  return {
    type,
    modeLabel: type === "donut" ? "Donut composition" : "Ranked bar chart",
    title: type === "donut" ? copy.title : copy.barTitle,
    description: type === "donut"
      ? "Auto-selected because this breakdown contains comparable priced exposure buckets."
      : "Auto-selected because this breakdown is better read as ranked operational or evidence pressure.",
    headline: copy.headline,
    guidance: copy.guidance,
    totalLabel: hasMoney ? formatMoney(total) : Math.round(total).toLocaleString(),
    totalCaption: hasMoney ? "visualised exposure" : "visualised records",
    gradient,
    items,
  };
}

function getBreakdownLens(area?: string, title?: string) {
  const key = String(area || "").toLowerCase();
  const copy: Record<string, { label: string; title: string; description: string; valueLabel: string; recordLabel: string; evidenceLabel: string }> = {
    capex: {
      label: "Financial lens",
      title: "Exposure split by tangible cost, intangible confidence gap and risk-adjusted spend.",
      description: "This view should help management decide what must be bought, what can be deferred, and what needs evidence cleanup before budget approval.",
      valueLabel: "Exposure value",
      recordLabel: "Endpoint scope",
      evidenceLabel: "Decision confidence",
    },
    risk: {
      label: "Risk lens",
      title: "Risk is separated into financial, PC lifecycle, operational visibility and audit evidence exposure.",
      description: "Not every risk is the same. The cards below separate replacement money, stale telemetry, offline control loss and audit weakness so ownership is clearer.",
      valueLabel: "Risk value",
      recordLabel: "Risk records",
      evidenceLabel: "Control pressure",
    },
    saving: {
      label: "Optimization lens",
      title: "Optimization uses actual cost evidence only; uncosted items remain evidence counts.",
      description: "This avoids displaying fake savings. Reuse, deferral, cleanup and productivity items only become RM values when a live cost or approved savings source exists.",
      valueLabel: "Recorded value",
      recordLabel: "Opportunity scope",
      evidenceLabel: "Actionability",
    },
    compliance: {
      label: "Audit lens",
      title: "Audit compliance is based on pricing evidence, identity quality, telemetry recency and SLA governance.",
      description: "This translates evidence gaps into audit risk so teams know what needs proof, not just what has a missing field.",
      valueLabel: "Evidence value",
      recordLabel: "Evidence records",
      evidenceLabel: "Audit readiness",
    },
    resources: {
      label: "Resource lens",
      title: "Endpoint visibility is split by usable fleet, offline pressure, stale telemetry and ownership gaps.",
      description: "This makes the second level useful for resource planning instead of showing department counts only.",
      valueLabel: "Resource value",
      recordLabel: "Endpoint scope",
      evidenceLabel: "Operational coverage",
    },
    actions: {
      label: "Decision lens",
      title: "Board actions are grouped by management decision, business impact and evidence target.",
      description: "Use this view to move from dashboard signal to owner, decision and next evidence check.",
      valueLabel: "Impact",
      recordLabel: "Decision items",
      evidenceLabel: "Execution focus",
    },
  };
  return copy[key] || {
    label: "Executive lens",
    title: title || "Management breakdown",
    description: "Review the business impact, evidence and next decision for each item below.",
    valueLabel: "Value",
    recordLabel: "Records",
    evidenceLabel: "Confidence",
  };
}

function getRowLens(row: DrillRow, area?: string, maxValue = 1, totalCount = 0) {
  const key = String(row.key || "").toLowerCase();
  const label = String(row.label || "").toLowerCase();
  const rowValue = getRowValue(row);
  const rowCount = drillNumber(row.count);
  const evidenceOnly = isEvidenceOnlyArea(area) || /evidence only|not costed|not priced/i.test(`${row.costType || ""} ${row.confidence || ""} ${row.valueFmt || ""}`);
  const progress = Math.max(6, Math.min(100, Math.round(((rowValue || rowCount) / Math.max(1, rowValue ? maxValue : totalCount)) * 100)));
  const tone = normalizeTone(row.tone || (rowValue > 0 ? "blue" : rowCount > 0 ? "purple" : "slate"));

  const base = {
    tone,
    progress,
    impactType: row.impactType || "Operational",
    costType: row.costType || (rowValue > 0 && !evidenceOnly ? "Recorded cost" : "Evidence only"),
    riskType: row.riskType || "Management signal",
    confidence: row.confidence || (rowValue > 0 && rowCount > 0 && !evidenceOnly ? "Costed evidence" : rowCount > 0 ? "Evidence gap" : "Monitor"),
    decision: row.decision || "Open evidence and assign owner",
    insight: row.insight || "This item needs evidence review before management can decide confidently.",
    metricLabel: row.metricLabel || (rowValue > 0 && !evidenceOnly ? "Recorded value" : "Evidence records"),
  };

  if (/financial|capex|replacement|cost/.test(`${area} ${key} ${label}`)) {
    return { ...base, tone: row.tone || "pink", impactType: row.impactType || "Financial", costType: row.costType || "Tangible + risk-adjusted", riskType: row.riskType || "Budget exposure", decision: row.decision || "Prioritise budget, deferment or pricing cleanup", insight: row.insight || "Exposure is not a single cost bucket; separate immediate replacement, risk-adjusted refresh and confidence gaps." };
  }
  if (/risk|stale|offline|aging|visibility|control/.test(`${area} ${key} ${label}`)) {
    return { ...base, tone: row.tone || "red", impactType: row.impactType || "Risk", costType: row.costType || (rowValue > 0 ? "Financial risk" : "Control risk"), riskType: row.riskType || "PC / operational risk", decision: row.decision || "Validate ownership and remediation path", insight: row.insight || "This separates PC lifecycle, telemetry and control risk instead of mixing all risk into one number." };
  }
  if (/saving|reuse|defer|cleanup|recover|optimization/.test(`${area} ${key} ${label}`)) {
    return { ...base, tone: row.tone || "green", impactType: row.impactType || "Cost optimization", costType: row.costType || (rowValue > 0 ? "Recorded cost" : "Evidence only - no saving source"), riskType: row.riskType || "Optimization", decision: row.decision || "Review reuse, recovery or deferral policy", insight: row.insight || "No savings value is shown unless it comes from live cost evidence or an approved savings source." };
  }
  if (/compliance|audit|pricing|identity|sla|evidence/.test(`${area} ${key} ${label}`)) {
    return { ...base, tone: row.tone || "purple", impactType: row.impactType || "Audit compliance", costType: row.costType || "Intangible exposure", riskType: row.riskType || "Auditor / evidence risk", decision: row.decision || "Close evidence gap and keep audit trail", insight: row.insight || "Compliance value comes from real evidence quality: pricing, ownership, telemetry and SLA proof." };
  }
  if (/resource|endpoint|online|owner|department/.test(`${area} ${key} ${label}`)) {
    return { ...base, tone: row.tone || "blue", impactType: row.impactType || "Resource", costType: row.costType || "Capacity", riskType: row.riskType || "Resource control", decision: row.decision || "Validate capacity, owner and endpoint state", insight: row.insight || "Resource visibility should show usability, ownership and operational pressure, not department counts alone." };
  }
  return base;
}

function readText(value: unknown, fallback = "-") {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
}


function evidenceCellValue(row: EvidenceRow, keys: string | string[], fallback = "-") {
  const list = Array.isArray(keys) ? keys : [keys];
  for (const key of list) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return String(value);
  }
  return fallback;
}

function evidenceDomain(row: EvidenceRow) {
  return evidenceCellValue(row, ["evidenceDomain", "category", "platform", "objectAgent"], "Uncategorised");
}

function evidenceKind(area?: string, key?: string, rows: EvidenceRow[] = []) {
  const a = String(area || "").toLowerCase();
  const k = String(key || "").toLowerCase();
  const sample = rows[0] || {};
  const agent = String(sample.evidenceType || sample.objectAgent || sample.platform || sample.category || "").toLowerCase();
  if (/software/.test(`${a} ${k} ${agent}`)) return "software";
  if (/network/.test(`${a} ${k} ${agent}`)) return "network";
  if (/geo|location/.test(`${a} ${k} ${agent}`)) return "geolocation";
  if (/service|ticket|incident|sla/.test(`${a} ${k} ${agent}`)) return "service";
  return "hardware";
}

function evidenceRiskText(row: EvidenceRow) {
  const severity = evidenceCellValue(row, ["riskSeverity", "severity"], "-");
  const score = evidenceCellValue(row, ["riskScore", "score"], "");
  return score ? `${severity} (${score})` : severity;
}

function evidenceCostText(row: EvidenceRow) {
  const raw = evidenceCellValue(row, ["replacementCost", "replacementCostFmt", "cost", "costSource"], "");
  if (!raw) return "Not priced";
  if (/^(0|rm\s*0)$/i.test(raw.trim())) return "Not priced";
  if (/not priced|not costed|evidence only|no cost/i.test(raw)) return "Not priced";
  return raw;
}

function getEvidenceColumns(kind: string) {
  if (kind === "software") {
    return [
      { label: "Software", render: (row: EvidenceRow) => evidenceCellValue(row, ["deviceName", "softwareName"]) },
      { label: "Device / scope", render: (row: EvidenceRow) => evidenceCellValue(row, ["assetId", "department"], "Unmapped device") },
      { label: "Publisher", render: (row: EvidenceRow) => evidenceCellValue(row, ["brand", "publisher"], "-") },
      { label: "Version", render: (row: EvidenceRow) => evidenceCellValue(row, ["model", "version"], "-") },
      { label: "Classification", render: (row: EvidenceRow) => evidenceDomain(row).replace(/^Software\s*\/\s*/i, "") },
      { label: "Inventory status", render: (row: EvidenceRow) => evidenceCellValue(row, "status") },
      { label: "Last scan", render: (row: EvidenceRow) => evidenceCellValue(row, ["lastSeen", "age"], "-") },
      { label: "Risk", render: evidenceRiskText }
    ];
  }

  if (kind === "network") {
    return [
      { label: "IP / network item", render: (row: EvidenceRow) => evidenceCellValue(row, ["ipAddress", "assetId", "deviceName"]) },
      { label: "Host / owner", render: (row: EvidenceRow) => evidenceCellValue(row, ["deviceName", "department"], "-") },
      { label: "Owner / scope", render: (row: EvidenceRow) => evidenceCellValue(row, ["department", "owner"], "Unmapped network") },
      { label: "Network evidence", render: (row: EvidenceRow) => evidenceCellValue(row, ["model", "brand", "platform"], "-") },
      { label: "Mapping status", render: (row: EvidenceRow) => evidenceCellValue(row, "status") },
      { label: "Freshness", render: (row: EvidenceRow) => evidenceCellValue(row, ["lastSeen", "age"], "-") },
      { label: "Risk", render: evidenceRiskText }
    ];
  }

  if (kind === "geolocation") {
    return [
      { label: "Device", render: (row: EvidenceRow) => evidenceCellValue(row, ["assetId", "deviceName"]) },
      { label: "Location / address", render: (row: EvidenceRow) => evidenceCellValue(row, ["department", "locationName"], "Unknown location") },
      { label: "Coordinates", render: (row: EvidenceRow) => evidenceCellValue(row, ["model", "coordinates"], "No coordinates") },
      { label: "Telemetry time", render: (row: EvidenceRow) => evidenceCellValue(row, ["lastSeen", "locationTime"], "-") },
      { label: "Location state", render: (row: EvidenceRow) => evidenceCellValue(row, "status") },
      { label: "Evidence issue", render: (row: EvidenceRow) => evidenceCellValue(row, ["age", "issue"], "-") },
      { label: "Risk", render: evidenceRiskText }
    ];
  }

  if (kind === "service") {
    return [
      { label: "Ticket", render: (row: EvidenceRow) => evidenceCellValue(row, ["assetId", "assetKey"]) },
      { label: "Summary", render: (row: EvidenceRow) => evidenceCellValue(row, "deviceName") },
      { label: "Customer / owner", render: (row: EvidenceRow) => evidenceCellValue(row, ["department", "owner"], "Service Desk") },
      { label: "Priority", render: (row: EvidenceRow) => evidenceCellValue(row, "brand", "-") },
      { label: "Queue / asset", render: (row: EvidenceRow) => evidenceCellValue(row, ["model", "ipAddress"], "-") },
      { label: "Status", render: (row: EvidenceRow) => evidenceCellValue(row, "status") },
      { label: "SLA / due", render: (row: EvidenceRow) => evidenceCellValue(row, ["age", "lastSeen"], "-") },
      { label: "Risk", render: evidenceRiskText }
    ];
  }

  return [
    { label: "Device", render: (row: EvidenceRow) => evidenceCellValue(row, ["deviceName", "assetId"]) },
    { label: "Owner / department", render: (row: EvidenceRow) => evidenceCellValue(row, "department", "Unassigned") },
    { label: "Asset type", render: (row: EvidenceRow) => evidenceCellValue(row, "category") },
    { label: "Brand / model", render: (row: EvidenceRow) => `${evidenceCellValue(row, "brand", "")} ${evidenceCellValue(row, "model", "")}`.trim() || "-" },
    { label: "Status", render: (row: EvidenceRow) => evidenceCellValue(row, "status") },
    { label: "Last seen / age", render: (row: EvidenceRow) => evidenceCellValue(row, ["age", "lastSeen"], "-") },
    { label: "Risk", render: evidenceRiskText },
    { label: "Cost source", render: evidenceCostText }
  ];
}

function normalizeStoryTone(value?: string): "green" | "amber" | "red" | "blue" | "purple" {
  const tone = String(value || "blue").toLowerCase();
  if (["green", "amber", "red", "blue", "purple"].includes(tone)) return tone as any;
  return "blue";
}

function buildLocalExecutiveStory(dashboard: DashboardData): ExecutiveStory {
  const metrics = dashboard.metrics || {};
  const riskSignals = Number(metrics.riskCandidates || 0);
  const boardItems = Number(metrics.boardItems || dashboard.boardActions.length || 0);
  const health = clampPercent(parseNumberFromText(dashboard.executiveKpis.find((item) => /health/i.test(item.title))?.value, Number(metrics.healthScore || 0)));
  const exposure = formatMoney(dashboard.finance.totalCost || 0);
  const compliance = clampPercent(metrics.pricingCoverage || parseNumberFromText(dashboard.executiveKpis.find((item) => /compliance/i.test(item.title))?.value, 0));
  const tone = health < 50 || riskSignals > 20 ? "red" : health < 75 || boardItems > 0 ? "amber" : "green";
  const status = tone === "red" ? "Needs attention" : tone === "amber" ? "Watch closely" : "Healthy posture";
  const riskLabel = riskSignals === 1 ? "risk signal" : "risk signals";
  const boardLabel = boardItems === 1 ? "board action" : "board actions";
  const headline = `${status}: ${exposure} exposure across ${riskSignals.toLocaleString()} ${riskLabel}`;
  return {
    status,
    tone,
    headline,
    narrative: `Health is at ${health || 0}% with ${compliance}% evidence coverage. Prioritise recorded high-exposure endpoints, refresh ownership and pricing cleanup before the next management review.`,
    keySignals: [
      `${riskSignals.toLocaleString()} ${riskLabel}`,
      `${boardItems.toLocaleString()} ${boardLabel}`,
      `${compliance}% evidence coverage`,
    ],
    boardRecommendation: boardItems > 0
      ? "Confirm ownership for risk remediation and refresh planning."
      : "Maintain weekly monitoring for risk, compliance and lifecycle evidence.",
    actionItems: [
      "Review the endpoint groups with the highest exposure.",
      "Assign accountable owner for remediation or refresh approval.",
      "Close pricing and compliance gaps before the next review cycle.",
    ],
    source: "local",
  };
}

function buildChartRows(dashboard: DashboardData): TrendPoint[] {
  const hasSignal = (row: TrendPoint) =>
    moneyValue(row.financialExposure) > 0 ||
    moneyValue(row.riskExposure) > 0 ||
    moneyValue(row.capex) > 0 ||
    moneyValue(row.opex) > 0 ||
    Number(row.signals || row.serviceRisk || 0) > 0;

  const direct = dashboard.analysis?.trend || [];
  if (direct.length) {
    const rows = direct.slice(-6);
    return rows.some(hasSignal) ? rows : [];
  }

  const financeRows = dashboard.finance.capexOpex || [];
  if (financeRows.length) {
    const rows = financeRows.slice(-6).map((row) => ({
      month: row.month,
      label: row.label || row.month,
      financialExposure: moneyValue(row.financialExposure ?? row.capex),
      riskExposure: moneyValue(row.riskExposure ?? row.opex),
      signals: Number(row.signals || 0),
    }));
    return rows.some(hasSignal) ? rows : [];
  }

  return [];
}

export default function ManagementDashboard() {
  const { isDark } = useTheme();
  const [dashboard, setDashboard] = useState<DashboardData>(EMPTY_DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drill, setDrill] = useState<DrillState>({ level: 1 });
  const [chartHover, setChartHover] = useState<number | null>(null);
  const [story, setStory] = useState<ExecutiveStory | null>(null);
  const [storyLoading, setStoryLoading] = useState(false);
  const [tableSearch, setTableSearch] = useState("");
  const [tableFilter, setTableFilter] = useState("all");
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(10);

  const resetDrillTableState = () => {
    setTableSearch("");
    setTableFilter("all");
    setTablePage(1);
  };

  useEffect(() => {
    setTableSearch("");
    setTableFilter("all");
    setTablePage(1);
  }, [drill.level, drill.area, drill.key]);

  async function loadExecutiveStory() {
    setStoryLoading(true);
    try {
      const data = await managementDashboardService.getStorytelling();
      setStory((data || null) as ExecutiveStory | null);
    } catch {
      setStory(null);
    } finally {
      setStoryLoading(false);
    }
  }

  async function loadDashboard() {
    setLoading(true);
    setError("");
    try {
      const overview = await managementDashboardService.getOverview();
      setDashboard(normalizeDashboard(overview));
      const scheduleStoryLoad = () => void loadExecutiveStory();
      const idleCallback = (window as any).requestIdleCallback;
      if (typeof idleCallback === "function") {
        idleCallback(scheduleStoryLoad, { timeout: 2500 });
      } else {
        window.setTimeout(scheduleStoryLoad, 800);
      }
    } catch (err) {
      setDashboard(EMPTY_DASHBOARD);
      setError(err instanceof Error ? err.message : "Management dashboard failed to load.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDashboard(); }, []);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    html.classList.add("md-dashboard-page-active");
    body.classList.add("md-dashboard-page-active");
    html.classList.remove("md-management-dashboard-active");
    body.classList.remove("md-management-dashboard-active");

    return () => {
      html.classList.remove(
        "md-dashboard-page-active",
        "md-dashboard-theme-dark",
        "md-dashboard-theme-light",
        "md-management-dashboard-dark",
        "md-management-dashboard-light",
      );
      body.classList.remove(
        "md-dashboard-page-active",
        "md-dashboard-theme-dark",
        "md-dashboard-theme-light",
        "md-management-dashboard-dark",
        "md-management-dashboard-light",
      );
    };
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    html.classList.toggle("md-dashboard-theme-dark", isDark);
    body.classList.toggle("md-dashboard-theme-dark", isDark);
    html.classList.toggle("md-dashboard-theme-light", !isDark);
    body.classList.toggle("md-dashboard-theme-light", !isDark);
    html.classList.toggle("md-management-dashboard-dark", isDark);
    body.classList.toggle("md-management-dashboard-dark", isDark);
    html.classList.toggle("md-management-dashboard-light", !isDark);
    body.classList.toggle("md-management-dashboard-light", !isDark);
  }, [isDark]);

  useEffect(() => {
    const root = document.querySelector(".management-center-page") as HTMLElement | null;
    if (root) root.scrollTo({ top: 0, behavior: "smooth" });
  }, [drill.level, drill.title]);

  const topKpis = useMemo(() => dashboard.executiveKpis.slice(0, 6), [dashboard.executiveKpis]);
  const pillars = useMemo(() => dashboard.pillars.slice(0, 4), [dashboard.pillars]);
  const actions = useMemo(() => dashboard.boardActions.slice(0, 8), [dashboard.boardActions]);
  const signals = useMemo(() => {
    const serviceSignals = dashboard.analysis?.signals || [];
    if (serviceSignals.length) return serviceSignals.slice(0, 5);
    return pillars.flatMap((pillar) => (pillar.details || []).slice(0, 1).map((detail) => ({
      title: detail.label,
      subtitle: `${detail.value} from ${pillar.title}`,
      value: detail.value,
      area: pillar.area,
      key: detail.key || "",
      tone: detail.tone || pillar.tone,
      icon: normalizeIcon(pillar.icon),
    }))).slice(0, 5);
  }, [dashboard.analysis?.signals, pillars]);

  const chartRows = useMemo(() => buildChartRows(dashboard), [dashboard]);
  const chartMode = useMemo(() => {
    if (chartRows.some((row) => moneyValue(row.financialExposure) > 0 || moneyValue(row.riskExposure) > 0)) return "money" as const;
    if (chartRows.some((row) => Number(row.signals || row.serviceRisk || 0) > 0)) return "signals" as const;
    return "empty" as const;
  }, [chartRows]);

  const policyLabel = dashboard.policyUsed?.profileName || "Default EMA Management Policy";
  const policyScope = dashboard.policyUsed?.scopeType || dashboard.policyUsed?.scopeKey || "GLOBAL";
  const chartMax = useMemo(() => Math.max(1, ...chartRows.flatMap((row) => chartMode === "money"
    ? [moneyValue(row.financialExposure), moneyValue(row.riskExposure)]
    : [Number(row.signals || row.serviceRisk || 0)]
  )), [chartRows, chartMode]);
  const mix = dashboard.analysis?.mix || { risk: 0, control: 0, savings: 0 };
  const healthValue = parseNumberFromText(topKpis.find((item) => /health/i.test(item.title))?.value, moneyValue(mix.control));
  const ringHealth = clampPercent(healthValue || moneyValue(mix.control));
  const ringRisk = clampPercent(moneyValue(mix.risk));
  const ringCircumference = 2 * Math.PI * 78;
  const ringControlDash = (ringHealth / 100) * ringCircumference;
  const ringRiskDash = (Math.min(100, ringRisk) / 100) * ringCircumference;

  function openLevel2(area: string, title: string, key = "") {
    resetDrillTableState();
    if (area === "actions") {
      const rows: DrillRow[] = dashboard.boardActions.map((action) => {
        const target = parseActionTarget(action);
        return {
          key: action.key || `${target.area}:${target.key}`,
          label: action.issue,
          count: 1,
          valueFmt: action.impact,
          level3Area: target.area,
          level3Key: target.key,
        };
      });
      setDrill({ level: 2, area, key, title, rows, total: rows.length });
      return;
    }

    if (!key) {
      const rows = dashboard.level2[area] || [];
      if (rows.length) {
        setDrill({ level: 2, area, key, title, rows, total: rows.length });
        return;
      }
      // If the overview did not include a local breakdown, load the live domain breakdown.
    }

    setDrill({ level: 2, area, key, title, rows: [], total: 0, loading: true });
    managementDashboardService.getDrilldown({ area, key, level: "2" })
      .then((data) => {
        const result = (data || {}) as { title?: string; rows?: DrillRow[]; total?: number };
        setDrill({ level: 2, area, key, title: title || result.title || "Management Breakdown", rows: result.rows || [], total: result.total || 0 });
      })
      .catch(() => setDrill({ level: 2, area, key, title, rows: [], total: 0 }));
  }

  function openLevel3(area: string, key: string, title: string) {
    resetDrillTableState();
    const parent = drill.level === 2 ? { ...drill, loading: false } : undefined;
    const evidenceTitle = title || key || "Evidence Detail";
    setDrill({ level: 3, area, key, title: evidenceTitle, rows: [], total: 0, loading: true, parent });
    managementDashboardService.getDrilldown({ area, key, level: "3" })
      .then((data) => {
        const result = (data || {}) as { rows?: EvidenceRow[]; total?: number };
        setDrill({ level: 3, area, key, title: evidenceTitle, rows: result.rows || [], total: result.total || 0, parent });
      })
      .catch(() => setDrill({ level: 3, area, key, title: evidenceTitle, rows: [], total: 0, parent }));
  }

  function closeDrilldown() { resetDrillTableState(); setDrill({ level: 1 }); }
  function backDrilldown() { resetDrillTableState(); drill.level === 3 && drill.parent ? setDrill({ ...drill.parent, level: 2 }) : closeDrilldown(); }
  function refreshDashboard() { closeDrilldown(); loadDashboard(); }
  function printDashboard() { window.print(); }

  function renderOverview() {
    const metrics = dashboard.metrics || {};
    const metricNumber = (key: string): number | null => {
      const raw = metrics[key];
      if (typeof raw === "number" && Number.isFinite(raw)) return raw;
      if (typeof raw === "string" && raw.trim() !== "" && Number.isFinite(Number(raw))) return Number(raw);
      return null;
    };
    const metricBoolean = (key: string): boolean | null => {
      const raw = metrics[key];
      if (raw === undefined || raw === null || raw === "") return null;
      if (typeof raw === "boolean") return raw;
      if (typeof raw === "number") return raw === 1;
      const text = String(raw).trim().toLowerCase();
      if (["true", "1", "yes", "y", "on", "enabled"].includes(text)) return true;
      if (["false", "0", "no", "n", "off", "disabled"].includes(text)) return false;
      return null;
    };
    const pendingText = loading ? "Loading..." : "Not recorded";
    const countText = (value: number | null, unit = "") => value === null ? pendingText : `${value.toLocaleString()}${unit ? ` ${unit}` : ""}`;
    const percentText = (value: number | null) => value === null ? pendingText : `${clampPercent(value)}%`;
    const exposureValue = typeof dashboard.finance.totalCost === "number" && dashboard.finance.totalCost > 0 ? dashboard.finance.totalCost : null;
    const totalEndpointsValue = metricNumber("totalEndpoints");
    const onlineCoverageValue = metricNumber("onlineCoverage") ?? metricNumber("onlineRate");
    const pricingCoverageValue = metricNumber("pricingCoverage");
    const riskSignalsValue = metricNumber("riskCandidates");
    const boardItemsValue = metricNumber("boardAttention") ?? metricNumber("boardItems") ?? (actions.length > 0 ? actions.length : null);
    const healthScoreValue = metricNumber("healthScore");
    const complianceScoreValue = metricNumber("complianceScore");
    const pcAgingRuleFlag = metricBoolean("pcAgingRuleEnabled");
    const hardwareLifecycleRiskValue =
      metricNumber("hardwareLifecycleRiskItems") ??
      metricNumber("endpointRiskCandidates") ??
      metricNumber("aging");
    const hasHardwareLifecycleMetrics =
      hardwareLifecycleRiskValue !== null ||
      metricNumber("hardwareAgingItems") !== null ||
      metricNumber("hardwareMonitorItems") !== null ||
      metricNumber("hardwareStaleItems") !== null ||
      totalEndpointsValue !== null;
    const pcAgingRuleActive = pcAgingRuleFlag === null ? hasHardwareLifecycleMetrics : pcAgingRuleFlag;
    const executiveStory = story || buildLocalExecutiveStory(dashboard);

    const latestTrendRow = chartRows[chartRows.length - 1] || null;
    const peakTrendRow = chartRows.reduce<TrendPoint | null>((best, row) => {
      const rowTotal = moneyValue(row.financialExposure) + moneyValue(row.riskExposure) + moneyValue(row.capex) + moneyValue(row.opex);
      const bestTotal = best ? moneyValue(best.financialExposure) + moneyValue(best.riskExposure) + moneyValue(best.capex) + moneyValue(best.opex) : -1;
      return rowTotal > bestTotal ? row : best;
    }, null);
    const peakExposureValue = peakTrendRow
      ? moneyValue(peakTrendRow.financialExposure) + moneyValue(peakTrendRow.riskExposure) + moneyValue(peakTrendRow.capex) + moneyValue(peakTrendRow.opex)
      : 0;
    const latestFinancialValue = latestTrendRow
      ? moneyValue(latestTrendRow.financialExposure) + moneyValue(latestTrendRow.capex)
      : 0;
    const latestRiskValue = latestTrendRow
      ? moneyValue(latestTrendRow.riskExposure) + moneyValue(latestTrendRow.opex)
      : 0;
    const chartSignalTotal = chartRows.reduce((sum, row) => sum + Number(row.signals || row.serviceRisk || 0), 0);
    const chartRiskSignalValue = riskSignalsValue ?? (chartSignalTotal > 0 ? chartSignalTotal : null);
    const softwareScopeValue = metricNumber("uniqueSoftware") ?? metricNumber("softwareInstallCount") ?? metricNumber("softwareInstalls");
    const networkScopeValue = metricNumber("networkKnownIps") ?? metricNumber("networkRecordCount") ?? metricNumber("networkRecords");
    const geoScopeValue = metricNumber("geoTrackedDevices");
    const evidenceCoverageText = [
      totalEndpointsValue !== null ? `${countText(totalEndpointsValue)} endpoint(s)` : "endpoint scope not recorded",
      softwareScopeValue !== null ? `${countText(softwareScopeValue)} software item(s)` : "software not recorded",
      networkScopeValue !== null ? `${countText(networkScopeValue)} network record(s)` : "network not recorded",
      geoScopeValue !== null ? `${countText(geoScopeValue)} geo device(s)` : "geo not recorded",
    ].join(" • ");
    const chartInsightCards = [
      {
        label: "Peak Exposure",
        value: peakExposureValue > 0 ? formatMoney(peakExposureValue) : "Not recorded",
        note: peakTrendRow ? `${peakTrendRow.label || peakTrendRow.month} highest combined exposure` : "No monthly exposure yet",
        tone: "pink" as Tone,
        area: "capex",
        title: "Costed Exposure",
      },
      {
        label: "Risk Movement",
        value: countText(chartRiskSignalValue),
        note: chartRiskSignalValue === null ? "Risk signal source not recorded" : "Cross-domain risk signals detected",
        tone: "red" as Tone,
        area: "risk",
        title: "Active Risk Signals",
      },
      {
        label: "Current Month",
        value: latestFinancialValue + latestRiskValue > 0 ? formatMoney(latestFinancialValue + latestRiskValue) : "Not recorded",
        note: latestTrendRow ? `${latestTrendRow.label || latestTrendRow.month}: ${formatMoney(latestFinancialValue)} financial / ${formatMoney(latestRiskValue)} risk` : "No current month movement",
        tone: "amber" as Tone,
        area: "capex",
        title: "Costed Exposure",
      },
      {
        label: "Evidence Coverage",
        value: totalEndpointsValue === null ? "Not recorded" : countText(totalEndpointsValue),
        note: evidenceCoverageText,
        tone: "blue" as Tone,
        area: "resources",
        title: "Estate Scope",
      },
    ];

    const frontKpis = [
      {
        title: "Estate Scope",
        value: countText(totalEndpointsValue),
        subValue: totalEndpointsValue === null ? "" : "endpoint(s)",
        note: onlineCoverageValue === null ? "Online/control coverage not recorded" : `${percentText(onlineCoverageValue)} online/control coverage`,
        tone: "blue" as Tone,
        icon: "endpoint" as keyof typeof IconSet,
        area: "resources",
        key: "",
      },
      {
        title: "Costed Exposure",
        value: exposureValue === null ? "Not recorded" : formatMoney(exposureValue),
        note: exposureValue === null ? "No live cost source recorded" : "Costed from pricing/catalog evidence",
        tone: exposureValue === null ? "slate" as Tone : "pink" as Tone,
        icon: "money" as keyof typeof IconSet,
        area: "capex",
        key: "",
      },
      {
        title: "Active Risk Signals",
        value: countText(riskSignalsValue),
        note: "Hardware, software, network, geolocation and service evidence",
        tone: riskSignalsValue && riskSignalsValue > 0 ? "red" as Tone : "green" as Tone,
        icon: "risk" as keyof typeof IconSet,
        area: "risk",
        key: "",
      },
      {
        title: "Compliance Coverage",
        value: percentText(pricingCoverageValue),
        note: complianceScoreValue === null ? "Evidence score not recorded" : `${percentText(complianceScoreValue)} compliance score`,
        tone: complianceScoreValue !== null && complianceScoreValue >= 80 ? "green" as Tone : "amber" as Tone,
        icon: "audit" as keyof typeof IconSet,
        area: "compliance",
        key: "",
      },
      {
        title: "Open Decisions",
        value: countText(boardItemsValue),
        note: "Items requiring management owner, approval or evidence follow-up",
        tone: boardItemsValue && boardItemsValue > 0 ? "orange" as Tone : "green" as Tone,
        icon: "list" as keyof typeof IconSet,
        area: "actions",
        key: "",
      },
    ];

    const domainMatrix = [
      {
        title: "Hardware",
        caption: "Endpoint lifecycle, aging, stale telemetry and control evidence.",
        value: pcAgingRuleActive ? hardwareLifecycleRiskValue : null,
        valueLabel: "lifecycle signal(s)",
        meta: pcAgingRuleActive ? (totalEndpointsValue === null ? "Estate scope not recorded" : `${countText(totalEndpointsValue)} endpoint(s) in estate`) : "PC aging rule/source not configured",
        score: pcAgingRuleActive ? healthScoreValue : null,
        scoreLabel: "health",
        tone: "blue" as Tone,
        icon: "endpoint" as keyof typeof IconSet,
        area: "risk",
        key: "pc-lifecycle",
      },
      {
        title: "Software",
        caption: "Unclassified, stale or review-needed software evidence.",
        value: metricNumber("softwareRiskItems"),
        valueLabel: "software signal(s)",
        meta: metricNumber("uniqueSoftware") === null ? "Software scope not recorded" : `${countText(metricNumber("uniqueSoftware"))} app(s) tracked`,
        score: metricNumber("softwareComplianceScore"),
        scoreLabel: "classification",
        tone: "cyan" as Tone,
        icon: "package" as keyof typeof IconSet,
        area: "software",
        key: "software-risk",
      },
      {
        title: "Network",
        caption: "Unregistered IP, duplicate IP and network evidence integrity.",
        value: metricNumber("networkRiskItems"),
        valueLabel: "network signal(s)",
        meta: metricNumber("networkKnownIps") === null ? "Network scope not recorded" : `${countText(metricNumber("networkKnownIps"))} IP record(s)`,
        score: metricNumber("networkIntegrityScore"),
        scoreLabel: "integrity",
        tone: "purple" as Tone,
        icon: "activity" as keyof typeof IconSet,
        area: "network",
        key: "network-risk",
      },
      {
        title: "Geolocation",
        caption: "Missing, stale or unknown location/custody evidence.",
        value: metricNumber("geoRiskItems"),
        valueLabel: "location issue(s)",
        meta: metricNumber("geoTrackedDevices") === null ? "Location scope not recorded" : `${countText(metricNumber("geoTrackedDevices"))} tracked device(s)`,
        score: metricNumber("geoIntegrityScore"),
        scoreLabel: "freshness",
        tone: "amber" as Tone,
        icon: "target" as keyof typeof IconSet,
        area: "geolocation",
        key: "geolocation-risk",
      },
      {
        title: "Service Desk",
        caption: "Open ticket load, SLA governance and support pressure.",
        value: metricNumber("slaBreached") !== null && Number(metricNumber("slaBreached")) > 0 ? metricNumber("slaBreached") : metricNumber("openTickets"),
        valueLabel: metricNumber("slaBreached") !== null && Number(metricNumber("slaBreached")) > 0 ? "SLA exception(s)" : "open ticket(s)",
        meta: metricNumber("openTickets") === null ? "Ticket scope not recorded" : `${countText(metricNumber("openTickets"))} open ticket(s)`,
        score: null,
        scoreLabel: "queue",
        tone: "orange" as Tone,
        icon: "list" as keyof typeof IconSet,
        area: "service",
        key: metricNumber("slaBreached") !== null && Number(metricNumber("slaBreached")) > 0 ? "sla-breach" : "service-desk",
      },
    ];

    const generatedAtDate = dashboard.generatedAt ? new Date(dashboard.generatedAt) : null;
    const updatedAtText = generatedAtDate && !Number.isNaN(generatedAtDate.getTime())
      ? generatedAtDate.toLocaleString("en-MY", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
      : "Live";
    const domainColors = ["#7c3aed", "#f43f5e", "#0ea5e9", "#f59e0b", "#10b981", "#64748b"];
    const domainTotal = domainMatrix.reduce((sum, domain) => sum + Number(domain.value || 0), 0);
    const domainMax = Math.max(1, ...domainMatrix.map((domain) => Number(domain.value || 0)));
    let domainCursor = 0;
    const domainSegments = domainMatrix.map((domain, index) => {
      const rawValue = Number(domain.value || 0);
      const percent = domainTotal > 0 ? (rawValue / domainTotal) * 100 : 0;
      const start = domainCursor;
      domainCursor += percent;
      return {
        ...domain,
        rawValue,
        percent,
        start,
        end: domainCursor,
        color: domainColors[index % domainColors.length],
      };
    });
    const domainGradient = domainTotal > 0
      ? domainSegments.map((segment) => `${segment.color} ${segment.start}% ${segment.end}%`).join(", ")
      : "rgba(100,116,139,.55) 0% 100%";
    const heroPriorities = [
      ...(executiveStory.actionItems || []),
      `Address ${countText(riskSignalsValue)} risk signals requiring management attention`,
      `Validate ${countText(boardItemsValue)} pending management decision(s)`,
      "Close critical evidence gaps before the next review",
    ].filter(Boolean).slice(0, 3);
    const spotlightRows = (signals.length ? signals.slice(0, 4).map((signal, index) => ({
      title: signal.title,
      detail: signal.subtitle || "Evidence signal requiring review",
      value: signal.value || `${index + 1}`,
      tone: normalizeTone(signal.tone),
      icon: normalizeIcon(signal.icon),
      area: signal.area || "risk",
      key: signal.key || "",
    })) : [
      {
        title: `${countText(riskSignalsValue)} risk signals require management attention`,
        detail: "Across hardware, software, network and geolocation evidence",
        value: countText(riskSignalsValue),
        tone: "red" as Tone,
        icon: "risk" as keyof typeof IconSet,
        area: "risk",
        key: "",
      },
      {
        title: "Validate stale / inactive telemetry records",
        detail: "Visibility gaps impacting management confidence",
        value: actions[1]?.impact || "Review",
        tone: "orange" as Tone,
        icon: "activity" as keyof typeof IconSet,
        area: "actions",
        key: actions[1]?.key || "",
      },
      {
        title: "Policy adherence",
        detail: `${policyLabel} in effect for this dashboard`,
        value: percentText(pricingCoverageValue),
        tone: "green" as Tone,
        icon: "audit" as keyof typeof IconSet,
        area: "compliance",
        key: "",
      },
      {
        title: "Management decisions awaiting closure",
        detail: "Approval and ownership are the current bottleneck",
        value: countText(boardItemsValue),
        tone: "purple" as Tone,
        icon: "list" as keyof typeof IconSet,
        area: "actions",
        key: "",
      },
    ]);

    return (
      <section className="md-dashboard-view md-gov-shell" aria-label="Executive governance dashboard overview">
        <div className="md-gov-canvas">
          <header className="md-gov-toolbar">
            <div>
              <h1>Executive Governance Hub</h1>
              <p>Real-time oversight of exposure, risk, compliance and decisions</p>
            </div>
            <div className="md-gov-toolbar-actions">
              <button type="button" title="Active management policy"><span>Policy</span>{policyLabel} · {policyScope}</button>
              <button type="button" title="Dashboard period"><Icon name="calendar" /> Jun 2025</button>
              <span className="md-gov-updated">Last updated<br /><strong>{updatedAtText}</strong></span>
              <button type="button" className="md-gov-icon-btn" onClick={refreshDashboard} aria-label="Refresh dashboard"><Icon name="refresh" /></button>
            </div>
          </header>

          <section className={`md-gov-hero md-story-${normalizeStoryTone(executiveStory.tone)}`} aria-label="Executive summary">
            <div className="md-gov-hero-copy">
              <span className="md-gov-eyebrow">Executive Summary</span>
              <h2>{executiveStory.headline || "Governance posture requires focused management action."}</h2>
              <p>{executiveStory.narrative || executiveStory.summary || "Evidence is complete. Management should focus on ownership, approvals and closing high-risk endpoint groups."}</p>
              <div className="md-gov-signal-row">
                {(executiveStory.keySignals || []).slice(0, 4).map((signal, index) => <span key={`${signal}-${index}`}>{signal}</span>)}
              </div>
            </div>
            <div className="md-gov-orb" aria-hidden="true">
              <svg viewBox="0 0 180 180">
                <defs>
                  <linearGradient id="mdGovHealth" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                  <linearGradient id="mdGovRisk" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" />
                    <stop offset="100%" stopColor="#fb923c" />
                  </linearGradient>
                </defs>
                <circle className="md-gov-ring-track" cx="90" cy="90" r="78" />
                <circle className="md-gov-ring-health" cx="90" cy="90" r="78" strokeDasharray={`${ringControlDash} ${ringCircumference}`} />
                <circle className="md-gov-ring-risk" cx="90" cy="90" r="60" strokeDasharray={`${ringRiskDash} ${ringCircumference}`} />
              </svg>
              <span><Icon name="health" /></span>
            </div>
            <aside className="md-gov-priorities">
              <span><Icon name="target" /> Key Priorities</span>
              {heroPriorities.map((item, index) => (
                <button type="button" key={`${item}-${index}`} onClick={() => openLevel2(index === 1 ? "actions" : "risk", "Key Priority") }>
                  <i />{item}
                </button>
              ))}
            </aside>
          </section>

          <section className="md-gov-kpi-grid" aria-label="Executive KPI cards">
            {frontKpis.map((kpi, index) => (
              <button type="button" className={`md-gov-kpi tone-${normalizeTone(kpi.tone)} ${getKpiSemanticClass(kpi, index)}`} key={`${kpi.title}-${index}`} onClick={() => openLevel2(kpi.area, kpi.title, kpi.key)}>
                <span className="md-gov-kpi-icon"><Icon name={normalizeIcon(kpi.icon)} /></span>
                <span className="md-gov-kpi-copy">
                  <em>{kpi.title}</em>
                  <strong>{kpi.value}{kpi.subValue && <small> {kpi.subValue}</small>}</strong>
                  <span>{kpi.note}</span>
                </span>
                <span className="md-gov-kpi-spark" aria-hidden="true" />
              </button>
            ))}
          </section>

          <section className="md-gov-main-grid" aria-label="Exposure and risk analysis">
            <article className="md-gov-panel md-gov-exposure-panel">
              <div className="md-gov-panel-head">
                <div>
                  <span className="md-gov-eyebrow">Exposure & Compliance Overview</span>
                  <h2>Exposure Trend</h2>
                  <p>{dashboard.analysis?.headline || "Monthly movement translated into exposure, evidence and action context."}</p>
                </div>
                <button type="button" onClick={() => openLevel2("capex", "Exposure Trend")}>Open evidence <Icon name="next" /></button>
              </div>
              <div className="md-gov-chart-split">
                <div className="md-gov-bar-chart" onMouseLeave={() => setChartHover(null)}>
                  <div className="md-gov-chart-value"><strong>{peakExposureValue > 0 ? formatMoney(peakExposureValue) : "Not recorded"}</strong><span>Peak exposure</span></div>
                  <div className="md-gov-bars">
                    {chartRows.length === 0 ? <p>No live monthly exposure trend is recorded yet.</p> : chartRows.map((row, index) => {
                      const rawValue = chartMode === "signals"
                        ? Number(row.signals || row.serviceRisk || 0)
                        : moneyValue(row.financialExposure) + moneyValue(row.riskExposure) + moneyValue(row.capex) + moneyValue(row.opex);
                      const height = Math.max(8, Math.min(100, (rawValue / chartMax) * 100));
                      return (
                        <button
                          type="button"
                          key={`${row.month}-${index}`}
                          className={chartHover === index ? "is-active" : ""}
                          style={{ "--h": `${height}%` } as React.CSSProperties}
                          onMouseEnter={() => setChartHover(index)}
                        >
                          <i />
                          <span>{row.label || row.month}</span>
                          <em>{chartMode === "signals" ? rawValue.toLocaleString() : formatMoney(rawValue)}</em>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="md-gov-compliance-chart">
                  <span>Compliance Coverage Over Time (%)</span>
                  <strong>{percentText(pricingCoverageValue)}</strong>
                  <svg viewBox="0 0 320 140" role="img" aria-label="Compliance trend">
                    <line x1="20" x2="300" y1="116" y2="116" />
                    <line x1="20" x2="20" y1="22" y2="116" />
                    <polyline points="25,100 78,58 132,42 186,42 240,42 295,42" />
                    <circle cx="295" cy="42" r="5" />
                    <text x="250" y="33">{percentText(pricingCoverageValue)}</text>
                  </svg>
                </div>
              </div>
              <div className="md-gov-insight-grid" title={evidenceCoverageText}>
                {chartInsightCards.map((card) => (
                  <button type="button" key={card.label} className={`tone-${normalizeTone(card.tone)}`} onClick={() => openLevel2(card.area, card.title)}>
                    <span>{card.label}</span>
                    <strong>{card.value}</strong>
                    <small>{card.note}</small>
                  </button>
                ))}
              </div>
            </article>

            <article className="md-gov-panel md-gov-domain-panel">
              <div className="md-gov-panel-head">
                <div>
                  <span className="md-gov-eyebrow">Risk by Evidence Domain</span>
                  <h2>Risk Composition</h2>
                  <p>Domain ranking shows where management action will have the strongest impact.</p>
                </div>
              </div>
              <div className="md-gov-domain-layout">
                <div className="md-gov-donut" style={{ "--donut": domainGradient } as React.CSSProperties}>
                  <span><strong>{exposureValue === null ? countText(domainTotal) : formatMoney(exposureValue)}</strong><small>{exposureValue === null ? "Total signals" : "Total exposure"}</small></span>
                </div>
                <div className="md-gov-domain-list">
                  {domainSegments.map((domain) => {
                    const domainHasData = domain.value !== null && Number(domain.value) > 0;
                    return (
                      <button type="button" key={domain.title} disabled={!domainHasData} className={domainHasData ? "" : "is-muted"} onClick={() => domainHasData && openLevel2(domain.area, domain.title, domain.key)}>
                        <i style={{ "--dot": domain.color } as React.CSSProperties} />
                        <span><strong>{domain.title}</strong><small>{domain.meta}</small></span>
                        <em>{domain.value === null ? "-" : domain.value.toLocaleString()}</em>
                        <u><b style={{ width: `${Math.max(4, (Number(domain.value || 0) / domainMax) * 100)}%`, background: domain.color }} /></u>
                      </button>
                    );
                  })}
                </div>
              </div>
            </article>
          </section>

          <section className="md-gov-work-grid" aria-label="Decision queue and management actions">
            <article className="md-gov-panel md-gov-decision-panel">
              <div className="md-gov-panel-head">
                <div>
                  <span className="md-gov-eyebrow">Approvals & Decision Queue</span>
                  <h2>{countText(boardItemsValue)} open management decision(s)</h2>
                  <p>Translate risk signals into approvals, ownership and closure actions.</p>
                </div>
                <button type="button" onClick={() => openLevel2("actions", "Management Decision Queue")}>View all decisions <Icon name="next" /></button>
              </div>
              <div className="md-gov-table-wrap">
                <table className="md-gov-table">
                  <thead>
                    <tr>
                      <th>Priority</th>
                      <th>Request</th>
                      <th>Impact</th>
                      <th>Requested by</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actions.length === 0 ? (
                      <tr><td colSpan={5}>No executive action is required for this view.</td></tr>
                    ) : actions.slice(0, 4).map((action, index) => {
                      const target = parseActionTarget(action);
                      const priority = String(action.priority || "Low").toLowerCase();
                      return (
                        <tr key={`${action.area}-${action.key}-${index}`} onClick={() => openLevel2(target.area, action.issue, target.key)}>
                          <td><span className={`md-priority ${priority}`}>{action.priority}</span></td>
                          <td>{action.issue}</td>
                          <td>{action.impact}</td>
                          <td>{action.area}</td>
                          <td><span className="md-status-pill">Pending</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </article>

            <aside className="md-gov-panel md-gov-spotlight-panel">
              <div className="md-gov-panel-head">
                <div>
                  <span className="md-gov-eyebrow">Management Actions Spotlight</span>
                  <h2>What requires attention</h2>
                </div>
              </div>
              <div className="md-gov-spotlight-list">
                {spotlightRows.map((item, index) => (
                  <button type="button" key={`${item.title}-${index}`} className={`tone-${normalizeTone(item.tone)}`} onClick={() => openLevel2(item.area, item.title, item.key)}>
                    <span><Icon name={normalizeIcon(item.icon)} /></span>
                    <strong>{item.title}<small>{item.detail}</small></strong>
                    <em>{item.value}</em>
                  </button>
                ))}
              </div>
            </aside>
          </section>

          <section className="md-gov-lens-panel" aria-label="Management lenses">
            <div className="md-gov-panel-head">
              <div>
                <span className="md-gov-eyebrow">Management Lenses</span>
                <h2>Performance lenses for faster review</h2>
              </div>
              <button type="button" onClick={() => openLevel2("actions", "Management Decision Queue")}>Expand all <Icon name="next" /></button>
            </div>
            <div className="md-gov-lens-grid">
              {pillars.map((pillar, index) => (
                <button type="button" key={pillar.id || `${pillar.title}-${index}`} className={`tone-${normalizeTone(pillar.tone || ["purple", "blue", "green", "orange"][index % 4])}`} onClick={() => openLevel2(pillar.area, pillar.title)}>
                  <span><Icon name={normalizeIcon(pillar.icon)} /></span>
                  <em>{pillar.title}</em>
                  <strong>{pillar.scoreValue || pillar.secondValue || "-"}{pillar.scoreUnit && <small>{pillar.scoreUnit}</small>}</strong>
                  <i>{[pillar.scoreTitle, pillar.scoreStatus || pillar.secondNote].filter(Boolean).join(" • ") || "Open management lens"}</i>
                </button>
              ))}
            </div>
          </section>
        </div>
      </section>
    );
  }


  function renderBreakdownView() {
    const rows = (drill.rows || []) as DrillRow[];
    const lens = getBreakdownLens(drill.area, drill.title);
    const totalCount = rows.reduce((sum, row) => sum + drillNumber(row.count), 0);
    const totalValue = rows.reduce((sum, row) => sum + getRowValue(row), 0);
    const maxValue = Math.max(1, ...rows.map((row) => getRowValue(row)));
    const costedRows = rows.filter((row) => getRowValue(row) > 0).length;
    const confidence = rows.length ? Math.round((costedRows / rows.length) * 100) : 0;
    const visual = buildBreakdownVisual(rows, drill.area, lens);
    const sortedRows = [...rows].sort((a, b) => (getRowValue(b) || drillNumber(b.count)) - (getRowValue(a) || drillNumber(a.count)));
    const commandFilterOptions = Array.from(new Set(sortedRows.map((row) => getRowLens(row, drill.area, maxValue, totalCount).impactType).filter(Boolean)));
    const commandSearch = tableSearch.trim().toLowerCase();
    const filteredCommandRows = sortedRows.filter((row) => {
      const rowLens = getRowLens(row, drill.area, maxValue, totalCount);
      const matchesFilter = tableFilter === "all" || rowLens.impactType === tableFilter;
      if (!matchesFilter) return false;
      if (!commandSearch) return true;
      return normalizeTableSearchText(row.label, row.valueFmt, row.sample?.join(" "), rowLens.impactType, rowLens.riskType, rowLens.costType, rowLens.decision, rowLens.insight).includes(commandSearch);
    });
    const commandPageInfo = getPageInfo(filteredCommandRows.length, tablePage, tablePageSize);
    const visibleCommandRows = filteredCommandRows.slice(commandPageInfo.start, commandPageInfo.end);
    const topRow = sortedRows[0];
    const topLens = topRow ? getRowLens(topRow, drill.area, maxValue, totalCount) : null;
    const topPrimary = topRow ? getDrillValue(topRow, drill.area) : "-";
    const scopeTotal = Number(totalCount || drill.total || rows.length || 0);
    const primaryValue = totalValue > 0 ? formatMoney(totalValue) : scopeTotal.toLocaleString();
    const exposureCaption = totalValue > 0 ? "Recorded / priced value" : "Evidence records in scope";
    const managementRead = topRow
      ? `${topRow.label} is the strongest management signal. Open evidence to confirm owner, recorded value and remediation path.`
      : "Open a breakdown item to review the supporting evidence.";

    return (
      <section className="md-view-panel">
        <div className="md-view-header">
          <div>
            <span className="md-view-eyebrow">Executive Command Center</span>
            <h2>{drill.title || "Management Breakdown"}</h2>
            <p>{scopeTotal.toLocaleString()} item(s). Compact view for value, risk, evidence and action priority.</p>
          </div>
          <div className="md-view-actions">
            <button type="button" className="md-action-btn primary" onClick={closeDrilldown}><Icon name="back" /> Back to Overview</button>
            <button type="button" className="md-action-btn" onClick={refreshDashboard}><Icon name="refresh" /> Refresh</button>
          </div>
        </div>
        <div className="md-view-body">
          {drill.loading ? <div className="md-state-panel">Loading breakdown...</div> : rows.length === 0 ? <div className="md-state-panel">No breakdown item is available for this selection.</div> : (
            <div className="md-command-lens">
              <section className="md-command-hero">
                <div className="md-command-story">
                  <span>{lens.label}</span>
                  <h3>{lens.title}</h3>
                  <p>{lens.description}</p>
                </div>
                <div className="md-command-scoreboard">
                  <article>
                    <span>{lens.valueLabel}</span>
                    <strong>{primaryValue}</strong>
                    <small>{exposureCaption}</small>
                  </article>
                  <article>
                    <span>{lens.recordLabel}</span>
                    <strong>{scopeTotal.toLocaleString()}</strong>
                    <small>Evidence records represented</small>
                  </article>
                  <article>
                    <span>{lens.evidenceLabel}</span>
                    <strong>{confidence}%</strong>
                    <small>{costedRows.toLocaleString()} / {rows.length.toLocaleString()} priced rows</small>
                  </article>
                </div>
              </section>

              {visual && (
                <section className="md-command-grid">
                  <article className="md-command-chart-card">
                    <div className="md-command-card-head">
                      <div>
                        <span>{visual.modeLabel}</span>
                        <h3>{visual.title}</h3>
                        <p>{visual.headline}</p>
                      </div>
                      <em>{visual.type === "donut" ? "Composition" : "Ranking"}</em>
                    </div>

                    {visual.type === "donut" ? (
                      <div className="md-command-donut-layout">
                        <div className="md-command-donut" style={{ "--donut": visual.gradient } as React.CSSProperties} aria-label={visual.title}>
                          <span>
                            <strong>{visual.totalLabel}</strong>
                            <small>{visual.totalCaption}</small>
                          </span>
                        </div>
                        <div className="md-command-mini-legend">
                          {visual.items.slice(0, 5).map((item) => (
                            <button
                              type="button"
                              key={`cmd-donut-${item.row.key || item.label}`}
                              style={{ "--dot": item.color } as React.CSSProperties}
                              onClick={() => openLevel3(item.row.level3Area || drill.area || "risk", item.row.level3Key || item.row.key, item.label)}
                            >
                              <i />
                              <span>{item.shortLabel}</span>
                              <strong>{item.percent}%</strong>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="md-command-bars">
                        {visual.items.map((item) => (
                          <button
                            type="button"
                            key={`cmd-bar-${item.row.key || item.label}`}
                            style={{ "--dot": item.color } as React.CSSProperties}
                            onClick={() => openLevel3(item.row.level3Area || drill.area || "risk", item.row.level3Key || item.row.key, item.label)}
                          >
                            <span><b>{item.shortLabel}</b><em>{item.display}</em></span>
                            <i><u style={{ "--w": `${item.percent}%` } as React.CSSProperties} /></i>
                          </button>
                        ))}
                      </div>
                    )}
                  </article>

                  <article className="md-command-priority-card">
                    <span className="md-command-pill">Priority signal</span>
                    <h3>{topRow?.label || "No priority signal"}</h3>
                    <strong>{topPrimary}</strong>
                    <p>{managementRead}</p>
                    {topLens && (
                      <div className="md-command-chipline">
                        <span>{topLens.impactType}</span>
                        <span>{topLens.riskType}</span>
                        <span>{topLens.confidence}</span>
                      </div>
                    )}
                    {topRow && (
                      <button type="button" onClick={() => openLevel3(topRow.level3Area || drill.area || "risk", topRow.level3Key || topRow.key, topRow.label)}>
                        Open evidence <Icon name="next" />
                      </button>
                    )}
                  </article>

                  <article className="md-command-read-card">
                    <span className="md-command-pill">Management read</span>
                    <h3>What this means</h3>
                    <p>{visual.guidance}</p>
                    <div>
                      <span>Value</span><strong>{totalValue > 0 ? formatMoney(totalValue) : "Not priced"}</strong>
                      <span>Scope</span><strong>{scopeTotal.toLocaleString()}</strong>
                      <span>Priced</span><strong>{confidence}%</strong>
                    </div>
                  </article>
                </section>
              )}

              <section className="md-command-table-card">
                <div className="md-command-table-head">
                  <div>
                    <span className="md-command-pill">Decision queue</span>
                    <h3>Management actions by value and evidence</h3>
                  </div>
                  <p>Search, filter and paginate the queue before opening evidence. No assumed values are shown.</p>
                </div>
                <div className="md-data-toolbar">
                  <label className="md-data-search">
                    <Icon name="search" />
                    <input
                      type="search"
                      value={tableSearch}
                      onChange={(event) => { setTableSearch(event.target.value); setTablePage(1); }}
                      placeholder="Search signal, risk, decision..."
                    />
                  </label>
                  <select value={tableFilter} onChange={(event) => { setTableFilter(event.target.value); setTablePage(1); }} aria-label="Filter decision queue">
                    <option value="all">All impact types</option>
                    {commandFilterOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                  <select value={tablePageSize} onChange={(event) => { setTablePageSize(Number(event.target.value)); setTablePage(1); }} aria-label="Rows per page">
                    {TABLE_PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size} rows</option>)}
                  </select>
                  <span>{filteredCommandRows.length.toLocaleString()} / {sortedRows.length.toLocaleString()} row(s)</span>
                </div>
                <div className="md-command-rows">
                  <div className="md-command-row md-command-row-head" aria-hidden="true">
                    <span>Impact</span>
                    <span>Signal</span>
                    <span>Value</span>
                    <span>Evidence</span>
                    <span>Decision</span>
                    <span></span>
                  </div>
                  {visibleCommandRows.length === 0 ? (
                    <div className="md-empty-row">No matching decision row.</div>
                  ) : visibleCommandRows.map((row) => {
                    const rowLens = getRowLens(row, drill.area, maxValue, totalCount);
                    const primary = getDrillValue(row, drill.area);
                    const countLabel = `${Number(row.count || 0).toLocaleString()} record(s)`;
                    return (
                      <button
                        type="button"
                        key={row.key || row.label}
                        className={`md-command-row tone-${normalizeTone(rowLens.tone)}`}
                        onClick={() => openLevel3(row.level3Area || drill.area || "risk", row.level3Key || row.key, row.label)}
                      >
                        <span><i />{rowLens.impactType}</span>
                        <span><b>{row.label}</b><em>{rowLens.riskType}</em></span>
                        <span><b>{primary}</b><em>{rowLens.metricLabel}</em></span>
                        <span><b>{countLabel}</b><em>{rowLens.confidence}</em></span>
                        <span>{rowLens.decision}</span>
                        <span>Evidence <Icon name="next" /></span>
                      </button>
                    );
                  })}
                </div>
                <div className="md-data-pagination">
                  <span>Showing {filteredCommandRows.length ? (commandPageInfo.start + 1).toLocaleString() : 0} - {commandPageInfo.end.toLocaleString()} of {filteredCommandRows.length.toLocaleString()}</span>
                  <div>
                    <button type="button" onClick={() => setTablePage(1)} disabled={commandPageInfo.safePage <= 1}>First</button>
                    <button type="button" onClick={() => setTablePage((page) => Math.max(1, page - 1))} disabled={commandPageInfo.safePage <= 1}>Prev</button>
                    <strong>Page {commandPageInfo.safePage} / {commandPageInfo.totalPages}</strong>
                    <button type="button" onClick={() => setTablePage((page) => Math.min(commandPageInfo.totalPages, page + 1))} disabled={commandPageInfo.safePage >= commandPageInfo.totalPages}>Next</button>
                    <button type="button" onClick={() => setTablePage(commandPageInfo.totalPages)} disabled={commandPageInfo.safePage >= commandPageInfo.totalPages}>Last</button>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </section>
    );
  }


  function renderEvidenceView() {
    const rows = (drill.rows || []) as EvidenceRow[];
    const kind = evidenceKind(drill.area, drill.key, rows);
    const evidenceColumns = getEvidenceColumns(kind);
    const evidenceFilterOptions = Array.from(new Set(rows.map((row) => evidenceDomain(row)).filter(Boolean)));
    const evidenceSearch = tableSearch.trim().toLowerCase();
    const filteredEvidenceRows = rows.filter((row) => {
      const domain = evidenceDomain(row);
      const matchesFilter = tableFilter === "all" || domain === tableFilter;
      if (!matchesFilter) return false;
      if (!evidenceSearch) return true;
      return normalizeTableSearchText(...Object.values(row as Record<string, unknown>)).includes(evidenceSearch);
    });
    const evidencePageInfo = getPageInfo(filteredEvidenceRows.length, tablePage, tablePageSize);
    const visibleEvidenceRows = filteredEvidenceRows.slice(evidencePageInfo.start, evidencePageInfo.end);
    return (
      <section className="md-view-panel">
        <div className="md-view-header">
          <div>
            <span className="md-view-eyebrow">Evidence Detail</span>
            <h2>{drill.title || "Evidence View"}</h2>
            <p>{drill.loading ? "Loading evidence for this selection..." : `${Number(drill.total || rows.length || 0).toLocaleString()} record(s) found for this selection.`}</p>
          </div>
          <div className="md-view-actions">
            <button type="button" className="md-action-btn primary" onClick={backDrilldown}><Icon name="back" /> {drill.parent ? "Back to Breakdown" : "Back to Overview"}</button>
            <button type="button" className="md-action-btn" onClick={closeDrilldown}>Close</button>
          </div>
        </div>
        <div className="md-view-body">
          {drill.loading ? <div className="md-state-panel">Loading evidence...</div> : (
            <div className="md-data-table-shell">
              <div className="md-data-toolbar">
                <label className="md-data-search">
                  <Icon name="search" />
                  <input
                    type="search"
                    value={tableSearch}
                    onChange={(event) => { setTableSearch(event.target.value); setTablePage(1); }}
                    placeholder={kind === "geolocation" ? "Search device, location, coordinate, issue..." : kind === "software" ? "Search software, device, publisher, version..." : kind === "network" ? "Search IP, host, owner, status..." : kind === "service" ? "Search ticket, customer, SLA, priority..." : "Search device, owner, model, risk..."}
                  />
                </label>
                <select value={tableFilter} onChange={(event) => { setTableFilter(event.target.value); setTablePage(1); }} aria-label="Filter evidence domain">
                  <option value="all">All domains</option>
                  {evidenceFilterOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
                <select value={tablePageSize} onChange={(event) => { setTablePageSize(Number(event.target.value)); setTablePage(1); }} aria-label="Rows per page">
                  {TABLE_PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size} rows</option>)}
                </select>
                <span>{filteredEvidenceRows.length.toLocaleString()} / {rows.length.toLocaleString()} record(s)</span>
              </div>
              <div className="md-table-wrap md-evidence-wrap">
                <table className="md-table">
                  <thead>
                    <tr>
                      {evidenceColumns.map((column) => <th key={column.label}>{column.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleEvidenceRows.length === 0 ? <tr><td colSpan={evidenceColumns.length}>No matching evidence record found.</td></tr> : visibleEvidenceRows.map((row, index) => (
                      <tr key={row.assetKey || `${row.objectAgent}-${row.assetId}-${evidencePageInfo.start + index}`}>
                        {evidenceColumns.map((column) => <td key={column.label}>{column.render(row)}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md-data-pagination">
                <span>Showing {filteredEvidenceRows.length ? (evidencePageInfo.start + 1).toLocaleString() : 0} - {evidencePageInfo.end.toLocaleString()} of {filteredEvidenceRows.length.toLocaleString()}</span>
                <div>
                  <button type="button" onClick={() => setTablePage(1)} disabled={evidencePageInfo.safePage <= 1}>First</button>
                  <button type="button" onClick={() => setTablePage((page) => Math.max(1, page - 1))} disabled={evidencePageInfo.safePage <= 1}>Prev</button>
                  <strong>Page {evidencePageInfo.safePage} / {evidencePageInfo.totalPages}</strong>
                  <button type="button" onClick={() => setTablePage((page) => Math.min(evidencePageInfo.totalPages, page + 1))} disabled={evidencePageInfo.safePage >= evidencePageInfo.totalPages}>Next</button>
                  <button type="button" onClick={() => setTablePage(evidencePageInfo.totalPages)} disabled={evidencePageInfo.safePage >= evidencePageInfo.totalPages}>Last</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }

  const hasData =
    dashboard.executiveKpis.length > 0 ||
    dashboard.pillars.length > 0 ||
    dashboard.boardActions.length > 0 ||
    Object.keys(dashboard.metrics || {}).length > 0 ||
    Boolean(dashboard.analysis?.signals?.length || dashboard.analysis?.trend?.length) ||
    Object.values(dashboard.level2 || {}).some((rows) => Array.isArray(rows) && rows.length > 0);

  const shouldRenderDashboard = !error && (hasData || loading);

  return (
    <div className={`management-center-page ${isDark ? "md-theme-dark" : "md-theme-light"}`} data-theme={isDark ? "dark" : "light"}>
      <style>{MANAGEMENT_DASHBOARD_INLINE_CSS}</style>
      <main className="management-module-root">
        <div className="md-content">
          {!loading && error && <div className="md-state-panel md-state-error">{error}</div>}
          {shouldRenderDashboard && (drill.level === 2 ? renderBreakdownView() : drill.level === 3 ? renderEvidenceView() : renderOverview())}
          {!loading && !error && !hasData && <div className="md-state-panel">No management insight is available right now.</div>}
        </div>
      </main>
    </div>
  );
}
