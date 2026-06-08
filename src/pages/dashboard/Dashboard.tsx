import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import {
  Activity,
  ArrowLeft,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  ChevronRight,
  Cpu,
  Database,
  Download,
  Filter,
  Gauge,
  Layers3,
  Laptop,
  Loader2,
  MapPin,
  Network,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
  Wrench,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';

type Severity = 'Critical' | 'High' | 'Medium' | 'Low';
type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
type CardTone = 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'cyan' | 'slate';
type DashboardMode = 'command' | 'level2' | 'level3';

type ApiKpiCard = {
  title: string;
  value: string | number;
  caption: string;
  trend: string;
  trendDirection: 'up' | 'down' | 'flat';
  icon: string;
  tone: CardTone;
  progress?: number;
};

type BreakdownItem = {
  name: string;
  value: number;
  percent?: number;
  tone?: string;
};

type DepartmentRow = {
  department: string;
  assets: number;
  patchCompliance: number;
  openIncidents: number;
  healthScore: number;
};

type IncidentTrendPoint = {
  day: string;
  newIncidents: number;
  resolved: number;
  open: number;
};

type DomainHealthItem = {
  name: string;
  percent: number;
  color: string;
};

type PatchDepartmentItem = {
  name: string;
  percent: number;
};

type ActiveAlertRow = {
  severity: Severity;
  alert: string;
  system: string;
  owner: string;
  status: string;
  tone: StatusTone;
};

type ProblematicSystemRow = {
  rank: number;
  device: string;
  score: number;
  trend: number[];
};

type RiskFindingRow = {
  id: string;
  module: string;
  title: string;
  count: number;
  severity: Severity;
  recommendation: string;
};

type HardwareRiskDeviceRow = {
  deviceName: string;
  platform: string;
  model: string;
  department: string;
  lastSeen: string;
  biosDate: string;
  osName: string;
  riskScore: number;
  reasons: string;
};

type RiskSummary = {
  score: number;
  totalRiskItems: number;
  totalCritical: number;
  totalHigh: number;
  totalMedium: number;
  hardwareRiskItems: number;
  oldBiosDevices: number;
  unsupportedOsDevices: number;
  outdatedOsDevices: number;
  staleHardwareDevices: number;
  missingHardwareIdentity: number;
  geolocationRiskItems: number;
  missingGeoDevices: number;
  staleGeoDevices: number;
  unknownGeoDevices: number;
  patchCriticalItems: number;
  failedTaskItems: number;
  networkRiskItems: number;
  severityBreakdown: BreakdownItem[];
  categoryBreakdown: BreakdownItem[];
  osBreakdown: BreakdownItem[];
  biosAgeBreakdown: BreakdownItem[];
  topFindings: RiskFindingRow[];
  topHardwareRisk: HardwareRiskDeviceRow[];
};

type PriorityBreakdownItem = {
  label: string;
  value: number;
  tone: 'red' | 'amber' | 'yellow' | 'green';
};

type ServiceDeskSummary = {
  pendingTickets: number;
  overdueTickets: number;
  mttr: string;
  firstResponse: string;
  slaAchievement: number;
  priorityBreakdown: PriorityBreakdownItem[];
};

type SecuritySummary = {
  criticalVulnerabilities: number;
  antiVirusStatus: string;
  failedBackups: number;
  policyExceptions: number;
};

type TrendSummary = {
  newIncidents: number;
  resolved: number;
  openBacklog: number;
};

type HardwareSummary = {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  staleSync: number;
  lockedDevices: number;
  mdmDevices: number;
  emDevices: number;
  topModels: BreakdownItem[];
  platformBreakdown: BreakdownItem[];
};

type SoftwareSummary = {
  totalInstallations: number;
  uniqueSoftware: number;
  devicesWithSoftware: number;
  unclassifiedSoftware: number;
  latestScan: string;
  topCategories: BreakdownItem[];
};

type NetworkSummary = {
  knownIps: number;
  registeredDevices: number;
  unregisteredIps: number;
  activeIps: number;
  subnetCount: number;
  lastScan: string;
  workgroups: BreakdownItem[];
};

type GeoSummary = {
  trackedDevices: number;
  staleLocations: number;
  unknownLocations: number;
  latestLocationTime: string;
  topLocations: BreakdownItem[];
};

type TaskSummary = {
  totalTasks: number;
  runningTasks: number;
  completedTasks: number;
  failedTasks: number;
  latestTaskTime: string;
  jobTypeBreakdown: BreakdownItem[];
  recentTasks: {
    id: string;
    type: string;
    status: string;
    target: string;
    time: string;
    tone: StatusTone;
  }[];
};

type AttentionItem = {
  id: string;
  module: string;
  title: string;
  subtitle: string;
  severity: Severity;
  tone: StatusTone;
};

type ItOpsDashboardData = {
  generatedAt?: string;
  rangeLabel: string;
  kpiCards: ApiKpiCard[];
  incidentTrend: IncidentTrendPoint[];
  trendSummary: TrendSummary;
  domainHealth: DomainHealthItem[];
  patchDepartments: PatchDepartmentItem[];
  activeAlerts: ActiveAlertRow[];
  problematicSystems: ProblematicSystemRow[];
  serviceDesk: ServiceDeskSummary;
  security: SecuritySummary;
  departmentRows: DepartmentRow[];
  hardware: HardwareSummary;
  software: SoftwareSummary;
  network: NetworkSummary;
  geolocation: GeoSummary;
  tasks: TaskSummary;
  risk: RiskSummary;
  attentionQueue: AttentionItem[];
};

type FocusCard = {
  id: string;
  label: string;
  value: ReactNode;
  note: string;
  icon: LucideIcon;
  tone: CardTone;
  progress?: number;
  status: 'Healthy' | 'Watch' | 'Action';
  view: string;
};

const EMPTY_TREND_SUMMARY: TrendSummary = { newIncidents: 0, resolved: 0, openBacklog: 0 };

const EMPTY_SERVICE_DESK: ServiceDeskSummary = {
  pendingTickets: 0,
  overdueTickets: 0,
  mttr: '-',
  firstResponse: '-',
  slaAchievement: 0,
  priorityBreakdown: [
    { label: 'Critical', value: 0, tone: 'red' },
    { label: 'High', value: 0, tone: 'amber' },
    { label: 'Medium', value: 0, tone: 'yellow' },
    { label: 'Low', value: 0, tone: 'green' },
  ],
};

const EMPTY_SECURITY: SecuritySummary = {
  criticalVulnerabilities: 0,
  antiVirusStatus: '-',
  failedBackups: 0,
  policyExceptions: 0,
};

const EMPTY_HARDWARE_SUMMARY: HardwareSummary = {
  totalDevices: 0,
  onlineDevices: 0,
  offlineDevices: 0,
  staleSync: 0,
  lockedDevices: 0,
  mdmDevices: 0,
  emDevices: 0,
  topModels: [],
  platformBreakdown: [],
};

const EMPTY_SOFTWARE_SUMMARY: SoftwareSummary = {
  totalInstallations: 0,
  uniqueSoftware: 0,
  devicesWithSoftware: 0,
  unclassifiedSoftware: 0,
  latestScan: '-',
  topCategories: [],
};

const EMPTY_NETWORK_SUMMARY: NetworkSummary = {
  knownIps: 0,
  registeredDevices: 0,
  unregisteredIps: 0,
  activeIps: 0,
  subnetCount: 0,
  lastScan: '-',
  workgroups: [],
};

const EMPTY_GEO_SUMMARY: GeoSummary = {
  trackedDevices: 0,
  staleLocations: 0,
  unknownLocations: 0,
  latestLocationTime: '-',
  topLocations: [],
};

const EMPTY_TASK_SUMMARY: TaskSummary = {
  totalTasks: 0,
  runningTasks: 0,
  completedTasks: 0,
  failedTasks: 0,
  latestTaskTime: '-',
  jobTypeBreakdown: [],
  recentTasks: [],
};

const EMPTY_RISK_SUMMARY: RiskSummary = {
  score: 0,
  totalRiskItems: 0,
  totalCritical: 0,
  totalHigh: 0,
  totalMedium: 0,
  hardwareRiskItems: 0,
  oldBiosDevices: 0,
  unsupportedOsDevices: 0,
  outdatedOsDevices: 0,
  staleHardwareDevices: 0,
  missingHardwareIdentity: 0,
  geolocationRiskItems: 0,
  missingGeoDevices: 0,
  staleGeoDevices: 0,
  unknownGeoDevices: 0,
  patchCriticalItems: 0,
  failedTaskItems: 0,
  networkRiskItems: 0,
  severityBreakdown: [],
  categoryBreakdown: [],
  osBreakdown: [],
  biosAgeBreakdown: [],
  topFindings: [],
  topHardwareRisk: [],
};

const EMPTY_DASHBOARD_DATA: ItOpsDashboardData = {
  rangeLabel: '-',
  kpiCards: [],
  incidentTrend: [],
  trendSummary: EMPTY_TREND_SUMMARY,
  domainHealth: [],
  patchDepartments: [],
  activeAlerts: [],
  problematicSystems: [],
  serviceDesk: EMPTY_SERVICE_DESK,
  security: EMPTY_SECURITY,
  departmentRows: [],
  hardware: EMPTY_HARDWARE_SUMMARY,
  software: EMPTY_SOFTWARE_SUMMARY,
  network: EMPTY_NETWORK_SUMMARY,
  geolocation: EMPTY_GEO_SUMMARY,
  tasks: EMPTY_TASK_SUMMARY,
  risk: EMPTY_RISK_SUMMARY,
  attentionQueue: [],
};

const TOKEN_STORAGE_KEYS = ['ema-access-token', 'ema-token', 'accessToken', 'token', 'authToken'];
const AUTH_PAYLOAD_KEYS = ['ema-auth', 'auth', 'user', 'ema-user', 'currentUser', 'authUser', 'ema-current-user'];

const VIEW_TITLES: Record<string, { title: string; subtitle: string }> = {
  overview: { title: 'Operations Command Snapshot', subtitle: 'Full live state from IT operations API.' },
  hardware: { title: 'Endpoint Fleet', subtitle: 'Hardware, source mix, online status, stale sync and model concentration.' },
  software: { title: 'Software Estate', subtitle: 'Installations, classification quality and scan freshness.' },
  network: { title: 'Network Coverage', subtitle: 'Known IPs, registered devices, active IPs, subnet and workgroup view.' },
  geolocation: { title: 'Location Coverage', subtitle: 'Tracked devices, stale locations and unknown location records.' },
  tasks: { title: 'Automation Jobs', subtitle: 'Running, completed, failed jobs and recent task execution.' },
  risk: { title: 'engineering Risk Register', subtitle: 'Critical and high-risk signals across endpoint, OS, BIOS, patch, network and geo.' },
  departments: { title: 'Department Health', subtitle: 'Department asset coverage, incident load, patch compliance and health score.' },
  serviceDesk: { title: 'operations Service Operations', subtitle: 'Ticket queue, overdue SLA, response performance and priority mix.' },
  patch: { title: 'Patch Compliance', subtitle: 'Department patch score and remediation priority.' },
  alerts: { title: 'Active Alerts', subtitle: 'Critical and high-priority items requiring operational triage.' },
  attention: { title: 'Attention Queue', subtitle: 'Cross-module follow-up queue for operational ownership.' },
};

function resolveApiBaseUrl() {
  const envUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (envUrl) return envUrl.replace(/\/$/, '');

  if (typeof window !== 'undefined') {
    const { hostname, port, protocol } = window.location;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    const isVite = port === '5173' || port === '5174' || port === '3000';
    if (isLocal && isVite) return `${protocol}//${hostname}:3001`;
  }

  return '';
}

const API_BASE_URL = resolveApiBaseUrl();

function safeParseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function findTokenInValue(value: unknown, depth = 0): string {
  if (!value || depth > 4) return '';

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('eyJ')) return trimmed;
    const parsed = safeParseJson<unknown>(trimmed);
    return parsed ? findTokenInValue(parsed, depth + 1) : '';
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const token = findTokenInValue(item, depth + 1);
      if (token) return token;
    }
    return '';
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const data = record.data as Record<string, unknown> | undefined;
    const directToken = record.token || record.accessToken || record.authToken || record.jwt || data?.token || data?.accessToken;

    if (typeof directToken === 'string' && directToken.trim()) return directToken.trim();

    for (const item of Object.values(record)) {
      const token = findTokenInValue(item, depth + 1);
      if (token) return token;
    }
  }

  return '';
}

function getStoredAccessToken() {
  if (typeof window === 'undefined') return '';

  for (const storage of [window.localStorage, window.sessionStorage]) {
    for (const key of TOKEN_STORAGE_KEYS) {
      const directValue = storage.getItem(key);
      if (directValue?.trim()) return directValue.trim();
    }

    for (const key of AUTH_PAYLOAD_KEYS) {
      const token = findTokenInValue(storage.getItem(key));
      if (token) return token;
    }
  }

  return '';
}

function numberOrFallback(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampPercent(value: unknown, fallback = 0) {
  return Math.max(0, Math.min(100, numberOrFallback(value, fallback)));
}

function formatNumber(value: unknown) {
  return numberOrFallback(value).toLocaleString();
}

function formatPercent(value: unknown, digits = 1) {
  return `${clampPercent(value).toFixed(digits)}%`;
}

function formatDateLabel(value: unknown) {
  if (!value) return '-';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('en-MY', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function averagePercent(rows: { percent: number }[]) {
  if (!rows.length) return 0;
  return rows.reduce((total, row) => total + clampPercent(row.percent), 0) / rows.length;
}

function healthStatus(percent: number): 'Healthy' | 'Watch' | 'Action' {
  if (percent >= 90) return 'Healthy';
  if (percent >= 75) return 'Watch';
  return 'Action';
}

function riskStatus(value: number, warn = 1, danger = 5): 'Healthy' | 'Watch' | 'Action' {
  if (value >= danger) return 'Action';
  if (value >= warn) return 'Watch';
  return 'Healthy';
}

function normalizeSeverity(value: unknown): Severity {
  const text = String(value || '').trim();
  if (text === 'Critical' || text === 'High' || text === 'Medium' || text === 'Low') return text;
  return 'Medium';
}

function normalizeDashboardData(raw: Partial<ItOpsDashboardData> | null | undefined): ItOpsDashboardData {
  const data = raw ?? {};

  return {
    ...EMPTY_DASHBOARD_DATA,
    ...data,
    rangeLabel: data.rangeLabel || EMPTY_DASHBOARD_DATA.rangeLabel,
    kpiCards: Array.isArray(data.kpiCards) ? data.kpiCards : [],
    incidentTrend: Array.isArray(data.incidentTrend) ? data.incidentTrend : [],
    trendSummary: { ...EMPTY_TREND_SUMMARY, ...(data.trendSummary || {}) },
    domainHealth: Array.isArray(data.domainHealth) ? data.domainHealth : [],
    patchDepartments: Array.isArray(data.patchDepartments) ? data.patchDepartments : [],
    activeAlerts: Array.isArray(data.activeAlerts) ? data.activeAlerts.map((row) => ({ ...row, severity: normalizeSeverity(row.severity) })) : [],
    problematicSystems: Array.isArray(data.problematicSystems) ? data.problematicSystems : [],
    serviceDesk: {
      ...EMPTY_SERVICE_DESK,
      ...(data.serviceDesk || {}),
      priorityBreakdown: Array.isArray(data.serviceDesk?.priorityBreakdown) ? data.serviceDesk.priorityBreakdown : EMPTY_SERVICE_DESK.priorityBreakdown,
    },
    security: { ...EMPTY_SECURITY, ...(data.security || {}) },
    departmentRows: Array.isArray(data.departmentRows) ? data.departmentRows : [],
    hardware: {
      ...EMPTY_HARDWARE_SUMMARY,
      ...(data.hardware || {}),
      topModels: Array.isArray(data.hardware?.topModels) ? data.hardware.topModels : [],
      platformBreakdown: Array.isArray(data.hardware?.platformBreakdown) ? data.hardware.platformBreakdown : [],
    },
    software: {
      ...EMPTY_SOFTWARE_SUMMARY,
      ...(data.software || {}),
      topCategories: Array.isArray(data.software?.topCategories) ? data.software.topCategories : [],
    },
    network: {
      ...EMPTY_NETWORK_SUMMARY,
      ...(data.network || {}),
      workgroups: Array.isArray(data.network?.workgroups) ? data.network.workgroups : [],
    },
    geolocation: {
      ...EMPTY_GEO_SUMMARY,
      ...(data.geolocation || {}),
      topLocations: Array.isArray(data.geolocation?.topLocations) ? data.geolocation.topLocations : [],
    },
    tasks: {
      ...EMPTY_TASK_SUMMARY,
      ...(data.tasks || {}),
      recentTasks: Array.isArray(data.tasks?.recentTasks) ? data.tasks.recentTasks : [],
      jobTypeBreakdown: Array.isArray(data.tasks?.jobTypeBreakdown) ? data.tasks.jobTypeBreakdown : [],
    },
    risk: {
      ...EMPTY_RISK_SUMMARY,
      ...(data.risk || {}),
      severityBreakdown: Array.isArray(data.risk?.severityBreakdown) ? data.risk.severityBreakdown : [],
      categoryBreakdown: Array.isArray(data.risk?.categoryBreakdown) ? data.risk.categoryBreakdown : [],
      osBreakdown: Array.isArray(data.risk?.osBreakdown) ? data.risk.osBreakdown : [],
      biosAgeBreakdown: Array.isArray(data.risk?.biosAgeBreakdown) ? data.risk.biosAgeBreakdown : [],
      topFindings: Array.isArray(data.risk?.topFindings) ? data.risk.topFindings.map((row) => ({ ...row, severity: normalizeSeverity(row.severity) })) : [],
      topHardwareRisk: Array.isArray(data.risk?.topHardwareRisk) ? data.risk.topHardwareRisk : [],
    },
    attentionQueue: Array.isArray(data.attentionQueue) ? data.attentionQueue.map((row) => ({ ...row, severity: normalizeSeverity(row.severity) })) : [],
  };
}

async function fetchItOpsDashboardData() {
  const token = getStoredAccessToken();
  const headers = new Headers({ Accept: 'application/json' });
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}/api/dashboard/it-operations`, {
    headers,
    credentials: 'include',
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || payload?.message || `Dashboard API failed: ${response.status}`);
  }

  return normalizeDashboardData(payload?.data ?? payload);
}

function exportJsonFile(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function exportCsvFile(name: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escapeValue = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.join(','), ...rows.map((row) => headers.map((header) => escapeValue(row[header])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function StatusBadge({ status }: { status: 'Healthy' | 'Watch' | 'Action' }) {
  return <span className={`itops-pro-status itops-pro-status-${status.toLowerCase()}`}>{status}</span>;
}

function ToneBadge({ children, tone = 'neutral' }: { children: ReactNode; tone?: StatusTone }) {
  return <span className={`itops-pro-pill itops-pro-pill-${tone}`}>{children}</span>;
}

function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={`itops-pro-severity itops-pro-severity-${severity.toLowerCase()}`}>{severity}</span>;
}

function EmptyState({ label = 'No live data returned from API yet.' }: { label?: string }) {
  return (
    <div className="itops-pro-empty">
      <Database size={18} />
      <span>{label}</span>
    </div>
  );
}

function KpiCard({ card, onOpen }: { card: FocusCard; onOpen: (view: string) => void }) {
  const Icon = card.icon;

  return (
    <button type="button" className={`itops-pro-kpi itops-pro-kpi-${card.tone}`} onClick={() => onOpen(card.view)}>
      <div className="itops-pro-kpi-top">
        <span className="itops-pro-kpi-icon"><Icon size={20} /></span>
        <StatusBadge status={card.status} />
      </div>
      <span className="itops-pro-kpi-label">{card.label}</span>
      <strong>{card.value}</strong>
      <small>{card.note}</small>
      {card.progress !== undefined && (
        <div className="itops-pro-progress" aria-hidden="true"><i style={{ width: `${clampPercent(card.progress)}%` }} /></div>
      )}
    </button>
  );
}

function Panel({ title, subtitle, icon: Icon, action, children, className = '' }: { title: string; subtitle?: string; icon?: LucideIcon; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`itops-pro-panel ${className}`}>
      <div className="itops-pro-panel-head">
        <div className="itops-pro-panel-title">
          {Icon && <span><Icon size={18} /></span>}
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>
        {action && <div className="itops-pro-panel-action">{action}</div>}
      </div>
      {children}
    </section>
  );
}

function MiniMetric({ label, value, tone = 'slate', note }: { label: string; value: ReactNode; tone?: CardTone; note?: string }) {
  return (
    <div className={`itops-pro-mini itops-pro-mini-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </div>
  );
}

function BarList({ items, limit = 7, emptyLabel = 'No breakdown data yet.' }: { items: BreakdownItem[]; limit?: number; emptyLabel?: string }) {
  const visible = items.slice(0, limit);
  const maxValue = Math.max(1, ...visible.map((item) => numberOrFallback(item.percent, item.value)));

  if (!visible.length) return <EmptyState label={emptyLabel} />;

  return (
    <div className="itops-pro-bars">
      {visible.map((item) => {
        const raw = numberOrFallback(item.percent, item.value);
        const width = item.percent === undefined ? Math.max(5, (raw / maxValue) * 100) : clampPercent(raw);
        return (
          <div className="itops-pro-bar" key={item.name}>
            <div>
              <span>{item.name}</span>
              <strong>{item.percent === undefined ? formatNumber(item.value) : formatPercent(item.percent)}</strong>
            </div>
            <em><i style={{ width: `${width}%` }} /></em>
          </div>
        );
      })}
    </div>
  );
}

function IncidentTrendChart({ data, summary }: { data: IncidentTrendPoint[]; summary?: TrendSummary }) {
  const rows = data.slice(-5);

  if (!rows.length) return <EmptyState label="No incident trend returned from API yet." />;

  const maxDailyVolume = Math.max(
    1,
    ...rows.map((row) => numberOrFallback(row.newIncidents) + numberOrFallback(row.resolved) + numberOrFallback(row.open))
  );
  const latest = rows[rows.length - 1];
  const previous = rows.length > 1 ? rows[rows.length - 2] : null;
  const latestBacklog = numberOrFallback(latest?.open);
  const previousBacklog = numberOrFallback(previous?.open);
  const backlogDelta = previous ? latestBacklog - previousBacklog : 0;
  const peakDay = rows.reduce((best, row) => {
    const rowTotal = numberOrFallback(row.newIncidents) + numberOrFallback(row.resolved) + numberOrFallback(row.open);
    const bestTotal = numberOrFallback(best.newIncidents) + numberOrFallback(best.resolved) + numberOrFallback(best.open);
    return rowTotal > bestTotal ? row : best;
  }, rows[0]);
  const peakTotal = numberOrFallback(peakDay.newIncidents) + numberOrFallback(peakDay.resolved) + numberOrFallback(peakDay.open);
  const summaryValues = summary || {
    newIncidents: numberOrFallback(latest?.newIncidents),
    resolved: numberOrFallback(latest?.resolved),
    openBacklog: latestBacklog
  };

  return (
    <div className="itops-pulse-flow">
      <div className="itops-pulse-card-grid">
        <MiniMetric label="New" value={formatNumber(summaryValues.newIncidents)} tone="blue" note="Created" />
        <MiniMetric label="Resolved" value={formatNumber(summaryValues.resolved)} tone="green" note="Closed" />
        <MiniMetric label="Open Backlog" value={formatNumber(summaryValues.openBacklog)} tone="amber" note="Current queue" />
        <MiniMetric label="Latest Backlog" value={formatNumber(latestBacklog)} tone="cyan" note={previous ? `${backlogDelta >= 0 ? '+' : ''}${formatNumber(backlogDelta)} vs previous day` : 'Current open workload'} />
        <MiniMetric label="Peak Movement" value={formatNumber(peakTotal)} tone="purple" note={peakDay.day} />
      </div>

      <div className="itops-pulse-table" role="table" aria-label="Incident movement by day">
        <div className="itops-pulse-row itops-pulse-head" role="row">
          <span>Date</span>
          <span>Daily movement</span>
          <span>New</span>
          <span>Resolved</span>
          <span>Open</span>
        </div>
        {rows.map((row) => {
          const newCount = numberOrFallback(row.newIncidents);
          const resolvedCount = numberOrFallback(row.resolved);
          const openCount = numberOrFallback(row.open);
          const total = newCount + resolvedCount + openCount;
          const width = total > 0 ? Math.max(8, (total / maxDailyVolume) * 100) : 0;

          return (
            <div
              className="itops-pulse-row itops-pulse-data"
              key={row.day}
              title={`${row.day}: ${newCount} new, ${resolvedCount} resolved, ${openCount} open`}
            >
              <span className="itops-pulse-date">{row.day}</span>
              <span className="itops-pulse-track" aria-hidden="true">
                <span className="itops-pulse-fill" style={{ width: `${width}%` }}>
                  {newCount > 0 && <i className="new" style={{ flexGrow: newCount }} />}
                  {resolvedCount > 0 && <i className="resolved" style={{ flexGrow: resolvedCount }} />}
                  {openCount > 0 && <i className="open" style={{ flexGrow: openCount }} />}
                </span>
              </span>
              <strong className="new">{formatNumber(newCount)}</strong>
              <strong className="resolved">{formatNumber(resolvedCount)}</strong>
              <strong className="open">{formatNumber(openCount)}</strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function resolveDomainView(name: string) {
  const text = String(name || '').toLowerCase();
  if (text.includes('endpoint') || text.includes('hardware') || text.includes('device')) return 'hardware';
  if (text.includes('software') || text.includes('application') || text.includes('app')) return 'software';
  if (text.includes('network') || text.includes('ip') || text.includes('subnet')) return 'network';
  if (text.includes('geo') || text.includes('location')) return 'geolocation';
  if (text.includes('task') || text.includes('job') || text.includes('automation')) return 'tasks';
  return 'overview';
}

function resolveDomainIcon(name: string): LucideIcon {
  const view = resolveDomainView(name);
  if (view === 'hardware') return Laptop;
  if (view === 'software') return Database;
  if (view === 'network') return Network;
  if (view === 'geolocation') return MapPin;
  if (view === 'tasks') return Wrench;
  return BarChart3;
}

function domainActionLabel(name: string, status: 'Healthy' | 'Watch' | 'Action') {
  const view = resolveDomainView(name);
  if (status === 'Healthy') return 'Monitor and maintain baseline';
  if (view === 'hardware') return 'Validate stale endpoints and device identity';
  if (view === 'software') return 'Review classification and inventory coverage';
  if (view === 'network') return 'Investigate unmanaged IP exposure';
  if (view === 'geolocation') return 'Refresh missing or stale location data';
  if (view === 'tasks') return 'Review failed or delayed execution jobs';
  return 'Review evidence and assign owner';
}

function HealthRadar({ items, onOpen }: { items: DomainHealthItem[]; onOpen?: (view: string, item?: string) => void }) {
  const visible = items.slice(0, 6);
  if (!visible.length) return <EmptyState label="No operational domain data returned by the API yet." />;

  return (
    <div className="itops-pro-health-grid">
      {visible.map((item) => {
        const percent = clampPercent(item.percent);
        const status = healthStatus(percent);
        const view = resolveDomainView(item.name);
        const Icon = resolveDomainIcon(item.name);
        return (
          <button type="button" className={`itops-pro-health itops-pro-health-${status.toLowerCase()}`} key={item.name} onClick={() => onOpen?.(view, item.name)}>
            <div className="itops-pro-health-topline">
              <span className="itops-pro-health-icon"><Icon size={17} /></span>
              <span className={`itops-pro-status itops-pro-status-${status.toLowerCase()}`}>{status}</span>
            </div>
            <div className="itops-pro-health-main">
              <span>{item.name}</span>
              <strong>{formatPercent(percent, 0)}</strong>
            </div>
            <p>{domainActionLabel(item.name, status)}</p>
            <div className="itops-pro-health-progress"><i style={{ width: `${percent}%` }} /></div>
            <div className="itops-pro-health-footer">
              <small>{status === 'Healthy' ? 'Stable signal' : 'Evidence required'}</small>
              <ChevronRight size={15} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ActionQueue({ items, onOpen }: { items: AttentionItem[]; onOpen: (view: string) => void }) {
  if (!items.length) return <EmptyState label="No cross-module action queue at the moment." />;

  return (
    <div className="itops-pro-queue">
      {items.slice(0, 5).map((item) => (
        <button type="button" key={item.id} className="itops-pro-queue-row" onClick={() => onOpen('attention')}>
          <SeverityBadge severity={item.severity} />
          <div>
            <strong>{item.title}</strong>
            <span>{item.module} • {item.subtitle}</span>
          </div>
          <ChevronRight size={16} />
        </button>
      ))}
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (!values.length) return <span className="itops-pro-sparkline-empty">-</span>;
  const max = Math.max(1, ...values);
  return (
    <span className="itops-pro-sparkline">
      {values.slice(-8).map((value, index) => (
        <i key={`${value}-${index}`} style={{ height: `${Math.max(10, (value / max) * 100)}%` }} />
      ))}
    </span>
  );
}

function InsightCard({ icon: Icon, title, value, subtitle, tone = 'blue', onClick }: { icon: LucideIcon; title: string; value: ReactNode; subtitle: string; tone?: CardTone; onClick?: () => void }) {
  const content = (
    <>
      <span className="itops-pro-insight-icon"><Icon size={19} /></span>
      <div>
        <p>{title}</p>
        <strong>{value}</strong>
        <small>{subtitle}</small>
      </div>
    </>
  );

  if (onClick) {
    return <button type="button" className={`itops-pro-insight itops-pro-insight-${tone}`} onClick={onClick}>{content}</button>;
  }

  return <div className={`itops-pro-insight itops-pro-insight-${tone}`}>{content}</div>;
}


function DrillCard({
  icon: Icon,
  label,
  value,
  note,
  tone = 'blue',
  onClick,
}: {
  icon?: LucideIcon;
  label: string;
  value: ReactNode;
  note: string;
  tone?: CardTone;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`itops-pro-drill-card itops-pro-drill-card-${tone}`} onClick={onClick}>
      {Icon && <span className="itops-pro-drill-icon"><Icon size={18} /></span>}
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
      <ChevronRight size={16} />
    </button>
  );
}

function parseDrilldownKey(value: string | null) {
  if (!value) return { level: '', view: 'overview', item: '' };
  const [level, view, ...rest] = value.split(':');
  if (level === 'level2' || level === 'level3') {
    return {
      level,
      view: view || 'overview',
      item: rest.length ? decodeURIComponent(rest.join(':')) : '',
    };
  }
  return { level: 'level2', view: value, item: '' };
}

function ModeTabs({ active, onChange }: { active: DashboardMode; onChange: (mode: DashboardMode) => void }) {
  const items: { id: DashboardMode; label: string; description: string; icon: LucideIcon }[] = [
    { id: 'command', label: 'Command Center', description: 'Executive health view', icon: Activity },
    { id: 'level2', label: 'Operational Triage', description: 'SLA, queue & department ownership', icon: Layers3 },
    { id: 'level3', label: 'Engineering Evidence', description: 'Risk, endpoint & job detail', icon: Cpu },
  ];

  return (
    <div className="itops-pro-tabs" role="tablist" aria-label="Dashboard view mode">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button key={item.id} type="button" className={active === item.id ? 'active' : ''} onClick={() => onChange(item.id)}>
            <Icon size={17} />
            <span>{item.label}</span>
            <small>{item.description}</small>
          </button>
        );
      })}
    </div>
  );
}

function RiskScoreGauge({ value }: { value: number }) {
  const score = clampPercent(value);
  const status = riskStatus(score, 35, 70);

  return (
    <div className="itops-pro-gauge-wrap">
      <div className="itops-pro-gauge" style={{ '--score': `${score}%` } as CSSProperties & Record<string, string>}>
        <div>
          <strong>{score.toFixed(0)}</strong>
          <span>Risk Score</span>
        </div>
      </div>
      <StatusBadge status={status} />
    </div>
  );
}

export default function ITOperationsDashboard() {
  const [dashboardData, setDashboardData] = useState<ItOpsDashboardData>(EMPTY_DASHBOARD_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments');
  const [search, setSearch] = useState('');
  const [activeView, setActiveView] = useState<string | null>(null);
  const [viewHistory, setViewHistory] = useState<(string | null)[]>([]);

  const openDrilldownView = useCallback((nextView: string) => {
    setActiveView((currentView) => {
      setViewHistory((history) => [...history, currentView]);
      return nextView;
    });
  }, []);

  const closeDrilldown = useCallback((event?: MouseEvent<HTMLElement>) => {
    event?.preventDefault();
    event?.stopPropagation();
    setActiveView(null);
    setViewHistory([]);
  }, []);

  const openLevel2 = useCallback((view: string) => openDrilldownView(`level2:${view}`), [openDrilldownView]);
  const openLevel3 = useCallback((view: string, item = '') => {
    const suffix = item ? `:${encodeURIComponent(item)}` : '';
    openDrilldownView(`level3:${view}${suffix}`);
  }, [openDrilldownView]);

  const handleDrilldownBack = useCallback((event?: MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    event?.stopPropagation();

    if (viewHistory.length > 0) {
      const previousView = viewHistory[viewHistory.length - 1] || null;
      setViewHistory((history) => history.slice(0, -1));
      setActiveView(previousView);
      return;
    }

    const drilldown = parseDrilldownKey(activeView);
    if (drilldown.level === 'level3') {
      setActiveView(`level2:${drilldown.view || 'overview'}`);
      return;
    }

    setActiveView(null);
  }, [activeView, viewHistory]);
  const pageRef = useRef<HTMLDivElement | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await fetchItOpsDashboardData();
      setDashboardData(data);
    } catch (loadError) {
      console.error('Failed to load IT Operations dashboard:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Failed to load dashboard data.');
      setDashboardData(EMPTY_DASHBOARD_DATA);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const pageElement = pageRef.current;
    const touched = new Map<HTMLElement, Map<string, { value: string; priority: string }>>();

    const remember = (element: HTMLElement, property: string) => {
      if (!touched.has(element)) touched.set(element, new Map());
      const elementStyles = touched.get(element);
      if (elementStyles && !elementStyles.has(property)) {
        elementStyles.set(property, {
          value: element.style.getPropertyValue(property),
          priority: element.style.getPropertyPriority(property),
        });
      }
    };

    const forceStyle = (element: HTMLElement | null | undefined, property: string, value: string) => {
      if (!element) return;
      remember(element, property);
      element.style.setProperty(property, value, 'important');
    };

    document.documentElement.classList.add('itops-dashboard-scroll-enabled');
    document.body.classList.add('itops-dashboard-scroll-enabled');

    forceStyle(document.documentElement, 'height', 'auto');
    forceStyle(document.documentElement, 'min-height', '100%');
    forceStyle(document.documentElement, 'max-height', 'none');
    forceStyle(document.documentElement, 'overflow-y', 'auto');
    forceStyle(document.documentElement, 'overflow-x', 'hidden');

    forceStyle(document.body, 'height', 'auto');
    forceStyle(document.body, 'min-height', '100%');
    forceStyle(document.body, 'max-height', 'none');
    forceStyle(document.body, 'overflow-y', 'auto');
    forceStyle(document.body, 'overflow-x', 'hidden');

    const scrollContainers = new Set<HTMLElement>();
    const rootElement = document.getElementById('root');
    if (rootElement) scrollContainers.add(rootElement);

    let parent = pageElement?.parentElement || null;
    while (parent && parent !== document.body && parent !== document.documentElement) {
      scrollContainers.add(parent);
      parent = parent.parentElement;
    }

    [
      'main',
      '.main-content',
      '.page-content',
      '.dashboard-page',
      '.dashboard-content',
      '.ema-main',
      '.ema-main-content',
      '.app-main',
      '.app-content',
      '.content-wrapper',
      '.content-area',
      '.layout-content',
      '.page-container',
      '.router-content',
    ].forEach((selector) => {
      document.querySelectorAll<HTMLElement>(selector).forEach((element) => scrollContainers.add(element));
    });

    scrollContainers.forEach((element) => {
      forceStyle(element, 'height', 'auto');
      forceStyle(element, 'min-height', '0');
      forceStyle(element, 'max-height', 'none');
      forceStyle(element, 'overflow-y', 'visible');
      forceStyle(element, 'overflow-x', 'hidden');
    });

    forceStyle(pageElement, 'height', 'auto');
    forceStyle(pageElement, 'min-height', '100vh');
    forceStyle(pageElement, 'max-height', 'none');
    forceStyle(pageElement, 'overflow-y', 'visible');
    forceStyle(pageElement, 'overflow-x', 'hidden');

    return () => {
      document.documentElement.classList.remove('itops-dashboard-scroll-enabled');
      document.body.classList.remove('itops-dashboard-scroll-enabled');

      touched.forEach((properties, element) => {
        properties.forEach(({ value, priority }, property) => {
          if (value) element.style.setProperty(property, value, priority);
          else element.style.removeProperty(property);
        });
      });
    };
  }, []);

  useEffect(() => {
    if (!activeView) return;

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDrilldown();
    };

    document.addEventListener('keydown', handleKeydown);

    return () => {
      document.removeEventListener('keydown', handleKeydown);
    };
  }, [activeView, closeDrilldown]);

  const {
    generatedAt,
    rangeLabel,
    incidentTrend,
    trendSummary,
    domainHealth,
    patchDepartments,
    activeAlerts,
    problematicSystems,
    serviceDesk,
    security,
    departmentRows,
    hardware,
    software,
    network,
    geolocation,
    tasks,
    risk,
    attentionQueue,
  } = dashboardData;

  const patchComplianceAverage = useMemo(() => averagePercent(patchDepartments), [patchDepartments]);
  const endpointOnlinePercent = hardware.totalDevices > 0 ? (hardware.onlineDevices / hardware.totalDevices) * 100 : 0;
  const taskCompletionPercent = tasks.totalTasks > 0 ? (tasks.completedTasks / tasks.totalTasks) * 100 : 0;
  const networkRegistrationPercent = network.knownIps > 0 ? (network.registeredDevices / network.knownIps) * 100 : 0;
  const locationFreshPercent = geolocation.trackedDevices > 0 ? ((geolocation.trackedDevices - geolocation.staleLocations) / geolocation.trackedDevices) * 100 : 0;
  const overallHealth = useMemo(() => {
    const values = [endpointOnlinePercent, patchComplianceAverage, serviceDesk.slaAchievement, taskCompletionPercent, networkRegistrationPercent, locationFreshPercent].filter((item) => Number.isFinite(item));
    if (!values.length) return 0;
    return values.reduce((total, item) => total + clampPercent(item), 0) / values.length;
  }, [endpointOnlinePercent, patchComplianceAverage, serviceDesk.slaAchievement, taskCompletionPercent, networkRegistrationPercent, locationFreshPercent]);

  const departments = useMemo(() => ['All Departments', ...patchDepartments.map((item) => item.name)], [patchDepartments]);

  const filteredDepartments = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return departmentRows.filter((row) => {
      const matchesDepartment = selectedDepartment === 'All Departments' || row.department === selectedDepartment;
      const matchesSearch = !keyword || row.department.toLowerCase().includes(keyword);
      return matchesDepartment && matchesSearch;
    });
  }, [departmentRows, search, selectedDepartment]);

  const filteredPatchDepartments = useMemo(() => {
    if (selectedDepartment === 'All Departments') return patchDepartments;
    return patchDepartments.filter((item) => item.name === selectedDepartment);
  }, [patchDepartments, selectedDepartment]);

  useEffect(() => {
    if (selectedDepartment !== 'All Departments' && !departments.includes(selectedDepartment)) {
      setSelectedDepartment('All Departments');
    }
  }, [departments, selectedDepartment]);

  const focusCards: FocusCard[] = useMemo(() => [
    {
      id: 'overall',
      label: 'Ops Health Score',
      value: formatPercent(overallHealth, 0),
      note: `${rangeLabel} • ${formatDateLabel(generatedAt)}`,
      icon: Gauge,
      tone: 'cyan',
      progress: overallHealth,
      status: healthStatus(overallHealth),
      view: 'overview',
    },
    {
      id: 'devices',
      label: 'Endpoint Fleet',
      value: formatNumber(hardware.totalDevices),
      note: `${formatNumber(hardware.onlineDevices)} online • ${formatNumber(hardware.staleSync)} stale`,
      icon: Laptop,
      tone: 'blue',
      progress: endpointOnlinePercent,
      status: healthStatus(endpointOnlinePercent),
      view: 'hardware',
    },
    {
      id: 'service',
      label: 'Open Incidents',
      value: formatNumber(serviceDesk.pendingTickets),
      note: `${formatNumber(serviceDesk.overdueTickets)} overdue • SLA ${formatPercent(serviceDesk.slaAchievement)}`,
      icon: Ticket,
      tone: 'red',
      progress: serviceDesk.slaAchievement,
      status: riskStatus(serviceDesk.overdueTickets, 1, 5),
      view: 'serviceDesk',
    },
    {
      id: 'patch',
      label: 'Patch Compliance',
      value: formatPercent(patchComplianceAverage),
      note: `${formatNumber(security.criticalVulnerabilities)} critical vulnerability item(s)`,
      icon: ShieldCheck,
      tone: 'green',
      progress: patchComplianceAverage,
      status: healthStatus(patchComplianceAverage),
      view: 'patch',
    },
    {
      id: 'tasks',
      label: 'Automation Jobs',
      value: formatNumber(tasks.runningTasks),
      note: `${formatNumber(tasks.failedTasks)} failed/cancelled • ${tasks.latestTaskTime || '-'}`,
      icon: Wrench,
      tone: 'amber',
      progress: taskCompletionPercent,
      status: riskStatus(tasks.failedTasks, 1, 3),
      view: 'tasks',
    },
    {
      id: 'risk',
      label: 'Critical Risk',
      value: `${formatNumber(risk.totalCritical)} / ${formatNumber(risk.totalHigh)}`,
      note: `Critical / high • ${formatNumber(risk.totalRiskItems)} total risk signal(s)`,
      icon: ShieldAlert,
      tone: 'purple',
      progress: risk.score,
      status: riskStatus(risk.totalCritical + risk.totalHigh, 1, 6),
      view: 'risk',
    },
  ], [endpointOnlinePercent, generatedAt, hardware.onlineDevices, hardware.staleSync, hardware.totalDevices, overallHealth, patchComplianceAverage, rangeLabel, risk.score, risk.totalCritical, risk.totalHigh, risk.totalRiskItems, security.criticalVulnerabilities, serviceDesk.overdueTickets, serviceDesk.pendingTickets, serviceDesk.slaAchievement, taskCompletionPercent, tasks.failedTasks, tasks.latestTaskTime, tasks.runningTasks]);

  const renderServiceDeskTable = () => (
    <div className="itops-pro-table-wrap">
      <table className="itops-pro-table">
        <thead>
          <tr>
            <th>Severity</th>
            <th>Alert / Ticket Signal</th>
            <th>System</th>
            <th>Owner</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {activeAlerts.slice(0, 8).map((row, index) => (
            <tr key={`${row.alert}-${index}`}>
              <td><SeverityBadge severity={row.severity} /></td>
              <td><strong>{row.alert}</strong></td>
              <td>{row.system || '-'}</td>
              <td>{row.owner || '-'}</td>
              <td><ToneBadge tone={row.tone}>{row.status || '-'}</ToneBadge></td>
            </tr>
          ))}
        </tbody>
      </table>
      {!activeAlerts.length && <EmptyState label="No active alert records returned." />}
    </div>
  );

  const renderDepartmentTable = () => (
    <div className="itops-pro-table-wrap">
      <table className="itops-pro-table">
        <thead>
          <tr>
            <th>Department</th>
            <th>Assets</th>
            <th>Patch</th>
            <th>Open Incidents</th>
            <th>Health</th>
          </tr>
        </thead>
        <tbody>
          {filteredDepartments.slice(0, 10).map((row) => (
            <tr key={row.department}>
              <td><strong>{row.department}</strong></td>
              <td>{formatNumber(row.assets)}</td>
              <td>{formatPercent(row.patchCompliance)}</td>
              <td>{formatNumber(row.openIncidents)}</td>
              <td><StatusBadge status={healthStatus(row.healthScore)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      {!filteredDepartments.length && <EmptyState label="No matching department rows." />}
    </div>
  );

  const renderRiskTable = () => (
    <div className="itops-pro-table-wrap">
      <table className="itops-pro-table itops-pro-table-risk">
        <thead>
          <tr>
            <th>Severity</th>
            <th>Module</th>
            <th>Finding</th>
            <th>Count</th>
            <th>Recommended Action</th>
          </tr>
        </thead>
        <tbody>
          {risk.topFindings.slice(0, 8).map((item) => (
            <tr key={item.id || `${item.module}-${item.title}`}>
              <td><SeverityBadge severity={item.severity} /></td>
              <td>{item.module}</td>
              <td><strong>{item.title}</strong></td>
              <td>{formatNumber(item.count)}</td>
              <td>{item.recommendation || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!risk.topFindings.length && <EmptyState label="No engineering risk findings returned." />}
    </div>
  );

  const renderEndpointRiskTable = () => (
    <div className="itops-pro-table-wrap">
      <table className="itops-pro-table">
        <thead>
          <tr>
            <th>Device</th>
            <th>Platform</th>
            <th>Department</th>
            <th>Last Seen</th>
            <th>Risk</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          {risk.topHardwareRisk.slice(0, 8).map((item) => (
            <tr key={`${item.deviceName}-${item.department}`}>
              <td><strong>{item.deviceName || '-'}</strong><span className="itops-pro-muted-block">{item.model || '-'}</span></td>
              <td>{item.platform || '-'}</td>
              <td>{item.department || '-'}</td>
              <td>{item.lastSeen || '-'}</td>
              <td><ToneBadge tone={item.riskScore >= 70 ? 'danger' : item.riskScore >= 40 ? 'warning' : 'info'}>{item.riskScore}</ToneBadge></td>
              <td>{item.reasons || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!risk.topHardwareRisk.length && <EmptyState label="No endpoint risk devices returned." />}
    </div>
  );


  const renderProblematicSystems = () => (
    <div className="itops-pro-table-wrap">
      <table className="itops-pro-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Device / System</th>
            <th>Impact Score</th>
            <th>Trend</th>
          </tr>
        </thead>
        <tbody>
          {problematicSystems.slice(0, 8).map((item) => (
            <tr key={`${item.rank}-${item.device}`}>
              <td><strong>#{item.rank}</strong></td>
              <td><strong>{item.device || '-'}</strong></td>
              <td><ToneBadge tone={item.score >= 70 ? 'danger' : item.score >= 40 ? 'warning' : 'info'}>{item.score}</ToneBadge></td>
              <td><Sparkline values={item.trend || []} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      {!problematicSystems.length && <EmptyState label="No problematic system ranking returned." />}
    </div>
  );

  const renderTaskTable = () => (
    <div className="itops-pro-table-wrap">
      <table className="itops-pro-table">
        <thead>
          <tr>
            <th>Job ID</th>
            <th>Type</th>
            <th>Target</th>
            <th>Status</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {tasks.recentTasks.slice(0, 8).map((task) => (
            <tr key={task.id}>
              <td><strong>{task.id}</strong></td>
              <td>{task.type || '-'}</td>
              <td>{task.target || '-'}</td>
              <td><ToneBadge tone={task.tone}>{task.status || '-'}</ToneBadge></td>
              <td>{task.time || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!tasks.recentTasks.length && <EmptyState label="No recent job rows returned." />}
    </div>
  );

  const renderCommandMode = () => (
    <>
      <section className="itops-pro-kpi-grid">
        {focusCards.map((card) => <KpiCard key={card.id} card={card} onOpen={openLevel2} />)}
      </section>

      <section className="itops-pro-command-grid">
        <Panel title="Live Operations Pulse" subtitle="Incidents, resolution flow and backlog movement." icon={Activity} className="span-2" action={<div className="itops-pro-legend"><span className="new" /> New <span className="resolved" /> Resolved <span className="open" /> Open</div>}>
          <IncidentTrendChart data={incidentTrend} summary={trendSummary} />
        </Panel>

        <Panel title="Risk Command" subtitle="Engineering security and endpoint exposure." icon={ShieldAlert}>
          <button type="button" className="itops-risk-command-summary" onClick={() => openLevel2('risk')}>
            <div className="itops-risk-command-copy">
              <span>Risk posture</span>
              <strong>{formatNumber(risk.score)}<em>/100</em></strong>
              <small>Calculated from critical, high and medium risk signals.</small>
            </div>
            <StatusBadge status={riskStatus(risk.score, 35, 70)} />
            <div className="itops-risk-command-meter" aria-hidden="true"><i style={{ width: `${clampPercent(risk.score)}%` }} /></div>
          </button>

          <div className="itops-risk-severity-grid">
            <button type="button" className="itops-risk-severity itops-risk-severity-critical" onClick={() => openLevel3('risk', 'Critical')}>
              <span>Critical</span>
              <strong>{formatNumber(risk.totalCritical)}</strong>
              <small>Immediate engineering review</small>
            </button>
            <button type="button" className="itops-risk-severity itops-risk-severity-high" onClick={() => openLevel3('risk', 'High')}>
              <span>High</span>
              <strong>{formatNumber(risk.totalHigh)}</strong>
              <small>Prioritise this cycle</small>
            </button>
            <button type="button" className="itops-risk-severity itops-risk-severity-medium" onClick={() => openLevel3('risk', 'Medium')}>
              <span>Medium</span>
              <strong>{formatNumber(risk.totalMedium)}</strong>
              <small>Monitor and schedule</small>
            </button>
          </div>

          <button type="button" className="itops-pro-link-btn itops-pro-link-btn-risk" onClick={() => openLevel2('risk')}>Review risk evidence <ChevronRight size={15} /></button>
        </Panel>

        <Panel title="Operational Domain Matrix" subtitle="Health signals by endpoint, software, network, location and automation domain." icon={BarChart3} className="span-2">
          <HealthRadar items={domainHealth} onOpen={(view) => openLevel2(view)} />
        </Panel>

        <Panel title="Operations Queue" subtitle="Items that need owner follow-up." icon={Zap}>
          <ActionQueue items={attentionQueue} onOpen={openLevel2} />
        </Panel>
      </section>
    </>
  );

  const renderLevel2Mode = () => (
    <section className="itops-pro-level-grid">
      <Panel title="Service Triage" subtitle="Queue health, SLA risk and incident workload." icon={Ticket} className="span-2" action={<button type="button" className="itops-pro-soft-btn" onClick={() => openLevel2('serviceDesk')}>View detail</button>}>
        <div className="itops-pro-summary-row four">
          <MiniMetric label="Pending Tickets" value={formatNumber(serviceDesk.pendingTickets)} tone="amber" />
          <MiniMetric label="Overdue SLA" value={formatNumber(serviceDesk.overdueTickets)} tone="red" />
          <MiniMetric label="MTTR" value={serviceDesk.mttr || '-'} tone="blue" />
          <MiniMetric label="First Response" value={serviceDesk.firstResponse || '-'} tone="green" />
        </div>
        <div className="itops-pro-two-col">
          <BarList items={serviceDesk.priorityBreakdown.map((item) => ({ name: item.label, value: item.value }))} emptyLabel="No priority breakdown yet." />
          {renderServiceDeskTable()}
        </div>
      </Panel>

      <Panel title="Patch Follow-up" subtitle="Department patch compliance for operational escalation." icon={ShieldCheck}>
        <div className="itops-pro-summary-row two">
          <MiniMetric label="Average Patch" value={formatPercent(patchComplianceAverage)} tone="green" />
          <MiniMetric label="Critical Missing" value={formatNumber(security.criticalVulnerabilities)} tone="red" />
        </div>
        <BarList items={filteredPatchDepartments.map((item) => ({ name: item.name, value: item.percent, percent: item.percent }))} emptyLabel="No patch department data yet." />
      </Panel>

      <Panel title="Department Ownership Board" subtitle="Use this for operations department coordination and follow-up." icon={Users} className="span-2" action={
        <div className="itops-pro-filter-row compact">
          <label><Search size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search department" /></label>
          <select value={selectedDepartment} onChange={(event) => setSelectedDepartment(event.target.value)}>
            {departments.map((department) => <option key={department}>{department}</option>)}
          </select>
        </div>
      }>
        {renderDepartmentTable()}
      </Panel>

      <Panel title="Active operations Alerts" subtitle="Alerts that should be owned or escalated by operations first." icon={AlertTriangle}>
        <ActionQueue items={attentionQueue} onOpen={openLevel2} />
      </Panel>
    </section>
  );

  const renderLevel3Mode = () => (
    <section className="itops-pro-level-grid">
      <Panel title="Engineering Risk Register" subtitle="Actual risk signals generated by the live API." icon={ShieldAlert} className="span-2" action={<button type="button" className="itops-pro-soft-btn" onClick={() => exportCsvFile('itops-risk-register.csv', risk.topFindings as unknown as Record<string, unknown>[])}>Export CSV</button>}>
        <div className="itops-pro-summary-row five">
          <MiniMetric label="Risk Score" value={`${formatNumber(risk.score)}/100`} tone="purple" />
          <MiniMetric label="Hardware Risk" value={formatNumber(risk.hardwareRiskItems)} tone="red" />
          <MiniMetric label="Patch Critical" value={formatNumber(risk.patchCriticalItems)} tone="amber" />
          <MiniMetric label="Network Risk" value={formatNumber(risk.networkRiskItems)} tone="blue" />
          <MiniMetric label="Failed Jobs" value={formatNumber(risk.failedTaskItems)} tone="red" />
        </div>
        {renderRiskTable()}
      </Panel>

      <Panel title="Endpoint Risk Detail" subtitle="Devices that engineering should inspect first." icon={Laptop} className="span-2">
        {renderEndpointRiskTable()}
      </Panel>

      <Panel title="Automation Job Health" subtitle="Failed job follow-up and job type distribution." icon={Wrench}>
        <div className="itops-pro-summary-row two">
          <MiniMetric label="Completed" value={formatNumber(tasks.completedTasks)} tone="green" />
          <MiniMetric label="Failed" value={formatNumber(tasks.failedTasks)} tone="red" />
        </div>
        <BarList items={tasks.jobTypeBreakdown} emptyLabel="No job type breakdown yet." />
      </Panel>

      <Panel title="Recent Job Execution" subtitle="Latest job records from automation/task API." icon={CalendarDays} className="span-2">
        {renderTaskTable()}
      </Panel>

      <Panel title="Problematic Systems" subtitle="Repeated-impact devices ranked for engineering engineering follow-up." icon={AlertTriangle}>
        {renderProblematicSystems()}
      </Panel>

      <Panel title="Network & Geolocation Exposure" subtitle="Registration and location freshness gaps." icon={Network}>
        <div className="itops-pro-summary-row two">
          <MiniMetric label="Unregistered IP" value={formatNumber(network.unregisteredIps)} tone="amber" />
          <MiniMetric label="Stale Location" value={formatNumber(geolocation.staleLocations)} tone="red" />
        </div>
        <BarList items={geolocation.topLocations} emptyLabel="No geolocation location data yet." />
      </Panel>
    </section>
  );

  const renderBreakdownDrillCards = (items: BreakdownItem[], view: string, emptyLabel = 'No breakdown data yet.') => {
    if (!items.length) return <EmptyState label={emptyLabel} />;

    return (
      <div className="itops-pro-drill-grid compact">
        {items.slice(0, 10).map((item) => (
          <DrillCard
            key={`${view}-${item.name}`}
            icon={ChevronRight}
            label={item.name}
            value={item.percent === undefined ? formatNumber(item.value) : formatPercent(item.percent)}
            note="Open technical evidence"
            tone="slate"
            onClick={() => openLevel3(view, item.name)}
          />
        ))}
      </div>
    );
  };

  const renderDepartmentDrillTable = (level: 'level2' | 'level3', item = '') => {
    const rows = item
      ? filteredDepartments.filter((row) => row.department === item)
      : filteredDepartments;

    return (
      <div className="itops-pro-table-wrap">
        <table className="itops-pro-table">
          <thead>
            <tr>
              <th>Department</th>
              <th>Assets</th>
              <th>Patch</th>
              <th>Open Incidents</th>
              <th>Health</th>
              <th>Next</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, level === 'level3' ? 20 : 10).map((row) => (
              <tr
                key={row.department}
                className={level === 'level2' ? 'itops-pro-clickable-row' : ''}
                onClick={level === 'level2' ? () => openLevel3('departments', row.department) : undefined}
              >
                <td><strong>{row.department}</strong></td>
                <td>{formatNumber(row.assets)}</td>
                <td>{formatPercent(row.patchCompliance)}</td>
                <td>{formatNumber(row.openIncidents)}</td>
                <td><StatusBadge status={healthStatus(row.healthScore)} /></td>
                <td>{level === 'level2' ? <ChevronRight size={15} /> : <ToneBadge tone={row.healthScore < 75 ? 'warning' : 'success'}>{row.healthScore < 75 ? 'Review' : 'Stable'}</ToneBadge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <EmptyState label="No matching department rows." />}
      </div>
    );
  };

  const renderAlertDrillTable = (level: 'level2' | 'level3', item = '') => {
    const rows = item
      ? activeAlerts.filter((row) => row.alert === item || row.system === item || row.owner === item)
      : activeAlerts;

    return (
      <div className="itops-pro-table-wrap">
        <table className="itops-pro-table">
          <thead>
            <tr>
              <th>Severity</th>
              <th>Alert / Ticket Signal</th>
              <th>System</th>
              <th>Owner</th>
              <th>Status</th>
              <th>Next</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, level === 'level3' ? 20 : 10).map((row, index) => (
              <tr
                key={`${row.alert}-${index}`}
                className={level === 'level2' ? 'itops-pro-clickable-row' : ''}
                onClick={level === 'level2' ? () => openLevel3('alerts', row.alert) : undefined}
              >
                <td><SeverityBadge severity={row.severity} /></td>
                <td><strong>{row.alert}</strong></td>
                <td>{row.system || '-'}</td>
                <td>{row.owner || '-'}</td>
                <td><ToneBadge tone={row.tone}>{row.status || '-'}</ToneBadge></td>
                <td>{level === 'level2' ? <ChevronRight size={15} /> : <ToneBadge tone="info">Evidence</ToneBadge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <EmptyState label="No active alert records returned." />}
      </div>
    );
  };

  const renderTaskDrillTable = (level: 'level2' | 'level3', item = '') => {
    const rows = item
      ? tasks.recentTasks.filter((task) => task.id === item || task.type === item || task.status === item || task.target === item)
      : tasks.recentTasks;

    return (
      <div className="itops-pro-table-wrap">
        <table className="itops-pro-table">
          <thead>
            <tr>
              <th>Job ID</th>
              <th>Type</th>
              <th>Target</th>
              <th>Status</th>
              <th>Time</th>
              <th>Next</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, level === 'level3' ? 20 : 10).map((task) => (
              <tr
                key={task.id}
                className={level === 'level2' ? 'itops-pro-clickable-row' : ''}
                onClick={level === 'level2' ? () => openLevel3('tasks', task.id || task.type) : undefined}
              >
                <td><strong>{task.id}</strong></td>
                <td>{task.type || '-'}</td>
                <td>{task.target || '-'}</td>
                <td><ToneBadge tone={task.tone}>{task.status || '-'}</ToneBadge></td>
                <td>{task.time || '-'}</td>
                <td>{level === 'level2' ? <ChevronRight size={15} /> : <ToneBadge tone="info">Trace</ToneBadge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <EmptyState label="No recent job rows returned." />}
      </div>
    );
  };

  const renderRiskDrillTable = (level: 'level2' | 'level3', item = '') => {
    const rows = item
      ? risk.topFindings.filter((finding) => finding.title === item || finding.module === item || finding.severity === item)
      : risk.topFindings;

    return (
      <div className="itops-pro-table-wrap">
        <table className="itops-pro-table itops-pro-table-risk">
          <thead>
            <tr>
              <th>Severity</th>
              <th>Module</th>
              <th>Finding</th>
              <th>Count</th>
              <th>Recommended Action</th>
              <th>Next</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, level === 'level3' ? 20 : 10).map((itemRow) => (
              <tr
                key={itemRow.id || `${itemRow.module}-${itemRow.title}`}
                className={level === 'level2' ? 'itops-pro-clickable-row' : ''}
                onClick={level === 'level2' ? () => openLevel3('risk', itemRow.title || itemRow.module) : undefined}
              >
                <td><SeverityBadge severity={itemRow.severity} /></td>
                <td>{itemRow.module}</td>
                <td><strong>{itemRow.title}</strong></td>
                <td>{formatNumber(itemRow.count)}</td>
                <td>{itemRow.recommendation || '-'}</td>
                <td>{level === 'level2' ? <ChevronRight size={15} /> : <ToneBadge tone="warning">Engineering Action</ToneBadge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <EmptyState label="No engineering risk findings returned." />}
      </div>
    );
  };

  const renderEndpointRiskDrillTable = (level: 'level2' | 'level3', item = '') => {
    const rows = item
      ? risk.topHardwareRisk.filter((device) => device.deviceName === item || device.department === item || device.platform === item || device.model === item)
      : risk.topHardwareRisk;

    return (
      <div className="itops-pro-table-wrap">
        <table className="itops-pro-table">
          <thead>
            <tr>
              <th>Device</th>
              <th>Platform</th>
              <th>Department</th>
              <th>Last Seen</th>
              <th>Risk</th>
              <th>Reason</th>
              <th>Next</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, level === 'level3' ? 20 : 10).map((device) => (
              <tr
                key={`${device.deviceName}-${device.department}`}
                className={level === 'level2' ? 'itops-pro-clickable-row' : ''}
                onClick={level === 'level2' ? () => openLevel3('hardware', device.deviceName || device.department) : undefined}
              >
                <td><strong>{device.deviceName || '-'}</strong><span className="itops-pro-muted-block">{device.model || '-'}</span></td>
                <td>{device.platform || '-'}</td>
                <td>{device.department || '-'}</td>
                <td>{device.lastSeen || '-'}</td>
                <td><ToneBadge tone={device.riskScore >= 70 ? 'danger' : device.riskScore >= 40 ? 'warning' : 'info'}>{device.riskScore}</ToneBadge></td>
                <td>{device.reasons || '-'}</td>
                <td>{level === 'level2' ? <ChevronRight size={15} /> : <ToneBadge tone="info">Device Detail</ToneBadge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <EmptyState label="No endpoint risk devices returned." />}
      </div>
    );
  };

  const renderLevel2Drilldown = (view: string) => {
    if (view === 'overview') {
      return (
        <div className="itops-pro-drawer-stack">
          <div className="itops-pro-story-panel">
            <strong>Operational Breakdown from Command Center</strong>
            <p>This view translates the executive health score into actionable queues. Click any item below to open the supporting technical evidence.</p>
          </div>
          <div className="itops-pro-drill-grid">
            <DrillCard icon={Laptop} label="Endpoint Fleet" value={formatNumber(hardware.totalDevices)} note="Online, stale sync, platform and model concentration" tone="blue" onClick={() => openLevel3('hardware')} />
            <DrillCard icon={Ticket} label="Service Desk" value={formatNumber(serviceDesk.pendingTickets)} note="Pending tickets, overdue SLA and alert ownership" tone="amber" onClick={() => openLevel3('serviceDesk')} />
            <DrillCard icon={ShieldCheck} label="Patch Compliance" value={formatPercent(patchComplianceAverage)} note="Department patch score and vulnerable areas" tone="green" onClick={() => openLevel3('patch')} />
            <DrillCard icon={Wrench} label="Automation Jobs" value={formatNumber(tasks.failedTasks)} note="Failed/cancelled jobs and execution trace" tone="red" onClick={() => openLevel3('tasks')} />
            <DrillCard icon={Network} label="Network Coverage" value={formatNumber(network.unregisteredIps)} note="Unregistered IP and workgroup gaps" tone="cyan" onClick={() => openLevel3('network')} />
            <DrillCard icon={ShieldAlert} label="Critical Risk" value={`${formatNumber(risk.totalCritical)} / ${formatNumber(risk.totalHigh)}`} note="Critical/high findings requiring engineering review" tone="purple" onClick={() => openLevel3('risk')} />
          </div>
          <Panel title="Live Operations Pulse" subtitle="Backlog movement and incident flow for operational decision-making." icon={Activity}>
            <div className="itops-pro-summary-row">
              <MiniMetric label="New" value={formatNumber(trendSummary.newIncidents)} tone="blue" />
              <MiniMetric label="Resolved" value={formatNumber(trendSummary.resolved)} tone="green" />
              <MiniMetric label="Open Backlog" value={formatNumber(trendSummary.openBacklog)} tone="amber" />
            </div>
            <IncidentTrendChart data={incidentTrend} summary={trendSummary} />
          </Panel>
        </div>
      );
    }

    if (view === 'hardware') {
      return (
        <div className="itops-pro-drawer-stack">
          <div className="itops-pro-story-panel">
            <strong>Endpoint Fleet Breakdown</strong>
            <p>Review device coverage first: online status, stale sync, source mix and groups that require engineering follow-up.</p>
          </div>
          <div className="itops-pro-drill-grid">
            <DrillCard icon={Laptop} label="Total Devices" value={formatNumber(hardware.totalDevices)} note="Open full endpoint evidence" tone="blue" onClick={() => openLevel3('hardware', 'Total Devices')} />
            <DrillCard icon={Activity} label="Online" value={formatNumber(hardware.onlineDevices)} note="Connectivity and availability baseline" tone="green" onClick={() => openLevel3('hardware', 'Online Devices')} />
            <DrillCard icon={AlertTriangle} label="Offline" value={formatNumber(hardware.offlineDevices)} note="Potential unreachable endpoints" tone="red" onClick={() => openLevel3('hardware', 'Offline Devices')} />
            <DrillCard icon={RefreshCw} label="Stale Sync" value={formatNumber(hardware.staleSync)} note="Devices not reporting recently" tone="amber" onClick={() => openLevel3('hardware', 'Stale Sync')} />
          </div>
          <Panel title="Platform Breakdown" subtitle="Click each platform to inspect technical evidence." icon={Laptop}>{renderBreakdownDrillCards(hardware.platformBreakdown, 'hardware', 'No platform breakdown yet.')}</Panel>
          <Panel title="Endpoint Risk Candidates" subtitle="Rows below can be escalated for device investigation." icon={ShieldAlert}>{renderEndpointRiskDrillTable('level2')}</Panel>
        </div>
      );
    }

    if (view === 'serviceDesk' || view === 'alerts') {
      return (
        <div className="itops-pro-drawer-stack">
          <div className="itops-pro-story-panel">
            <strong>Service Desk Queue Breakdown</strong>
            <p>Review triage ownership, SLA watch and follow-up queues. Click a metric or alert row to open the supporting evidence.</p>
          </div>
          <div className="itops-pro-drill-grid">
            <DrillCard icon={Ticket} label="Pending Tickets" value={formatNumber(serviceDesk.pendingTickets)} note="Current workload requiring triage" tone="amber" onClick={() => openLevel3('serviceDesk', 'Pending Tickets')} />
            <DrillCard icon={AlertTriangle} label="Overdue SLA" value={formatNumber(serviceDesk.overdueTickets)} note="Breach risk to investigate" tone="red" onClick={() => openLevel3('serviceDesk', 'Overdue SLA')} />
            <DrillCard icon={Gauge} label="SLA Achievement" value={formatPercent(serviceDesk.slaAchievement)} note="Service performance indicator" tone="green" onClick={() => openLevel3('serviceDesk', 'SLA Achievement')} />
            <DrillCard icon={Activity} label="MTTR" value={serviceDesk.mttr || '-'} note="Mean time to resolve" tone="blue" onClick={() => openLevel3('serviceDesk', 'MTTR')} />
          </div>
          <Panel title="Priority Mix" subtitle="Click a priority to inspect related technical signals." icon={Layers3}>{renderBreakdownDrillCards(serviceDesk.priorityBreakdown.map((item) => ({ name: item.label, value: item.value })), 'serviceDesk', 'No priority breakdown yet.')}</Panel>
          <Panel title="Active Alerts / Ticket Signals" subtitle="Click any row for technical detail." icon={AlertTriangle}>{renderAlertDrillTable('level2')}</Panel>
        </div>
      );
    }

    if (view === 'patch' || view === 'departments') {
      return (
        <div className="itops-pro-drawer-stack">
          <div className="itops-pro-story-panel">
            <strong>Patch & Department Queue</strong>
            <p>Identify which department needs follow-up. Click a department row to open patch and endpoint evidence.</p>
          </div>
          <div className="itops-pro-drill-grid">
            <DrillCard icon={ShieldCheck} label="Average Patch" value={formatPercent(patchComplianceAverage)} note="Overall patch compliance" tone="green" onClick={() => openLevel3('patch', 'Average Patch')} />
            <DrillCard icon={ShieldAlert} label="Critical Vulnerability" value={formatNumber(security.criticalVulnerabilities)} note="Critical patch/security item" tone="red" onClick={() => openLevel3('risk', 'Critical Vulnerability')} />
            <DrillCard icon={Users} label="Departments" value={formatNumber(filteredDepartments.length)} note="Department rows returned by API" tone="blue" onClick={() => openLevel3('departments')} />
          </div>
          <div className="itops-pro-filter-row">
            <label><Search size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search department" /></label>
            <select value={selectedDepartment} onChange={(event) => setSelectedDepartment(event.target.value)}>
              {departments.map((department) => <option key={department}>{department}</option>)}
            </select>
          </div>
          {renderDepartmentDrillTable('level2')}
        </div>
      );
    }

    if (view === 'tasks') {
      return (
        <div className="itops-pro-drawer-stack">
          <div className="itops-pro-story-panel">
            <strong>Automation Job Breakdown</strong>
            <p>Validate which jobs failed, which jobs are running and which targets need engineering investigation.</p>
          </div>
          <div className="itops-pro-drill-grid">
            <DrillCard icon={Wrench} label="Total Tasks" value={formatNumber(tasks.totalTasks)} note="Automation volume" tone="blue" onClick={() => openLevel3('tasks', 'Total Tasks')} />
            <DrillCard icon={Loader2} label="Running" value={formatNumber(tasks.runningTasks)} note="Still in-progress" tone="amber" onClick={() => openLevel3('tasks', 'Running')} />
            <DrillCard icon={ShieldCheck} label="Completed" value={formatNumber(tasks.completedTasks)} note="Successful job execution" tone="green" onClick={() => openLevel3('tasks', 'Completed')} />
            <DrillCard icon={AlertTriangle} label="Failed" value={formatNumber(tasks.failedTasks)} note="Failed/cancelled job follow-up" tone="red" onClick={() => openLevel3('tasks', 'Failed')} />
          </div>
          <Panel title="Job Type Breakdown" subtitle="Click a job type to inspect execution trace." icon={Layers3}>{renderBreakdownDrillCards(tasks.jobTypeBreakdown, 'tasks', 'No job type breakdown yet.')}</Panel>
          <Panel title="Recent Job Execution" subtitle="Click any job row for execution trace." icon={CalendarDays}>{renderTaskDrillTable('level2')}</Panel>
        </div>
      );
    }

    if (view === 'risk') {
      return (
        <div className="itops-pro-drawer-stack">
          <div className="itops-pro-story-panel">
            <strong>Risk Triage Breakdown</strong>
            <p>Review the risk queue and decide what requires engineering action. Click any severity, finding or endpoint to open engineering detail.</p>
          </div>
          <div className="itops-pro-drill-grid">
            <DrillCard icon={ShieldAlert} label="Critical" value={formatNumber(risk.totalCritical)} note="Must review first" tone="red" onClick={() => openLevel3('risk', 'Critical')} />
            <DrillCard icon={AlertTriangle} label="High" value={formatNumber(risk.totalHigh)} note="High-risk queue" tone="amber" onClick={() => openLevel3('risk', 'High')} />
            <DrillCard icon={Cpu} label="Hardware Risk" value={formatNumber(risk.hardwareRiskItems)} note="Endpoint technical risk" tone="purple" onClick={() => openLevel3('hardware', 'Hardware Risk')} />
            <DrillCard icon={Network} label="Network Risk" value={formatNumber(risk.networkRiskItems)} note="Network exposure signal" tone="cyan" onClick={() => openLevel3('network', 'Network Risk')} />
          </div>
          <Panel title="Risk Findings" subtitle="Click a finding to inspect technical evidence." icon={ShieldAlert}>{renderRiskDrillTable('level2')}</Panel>
          <Panel title="Endpoint Risk Candidates" subtitle="Click a device to inspect endpoint evidence." icon={Laptop}>{renderEndpointRiskDrillTable('level2')}</Panel>
        </div>
      );
    }

    if (view === 'software') {
      return (
        <div className="itops-pro-drawer-stack">
          <div className="itops-pro-story-panel"><strong>Software Estate Breakdown</strong><p>Review inventory coverage and classification issues before escalating to engineering.</p></div>
          <div className="itops-pro-drill-grid">
            <DrillCard icon={Database} label="Installations" value={formatNumber(software.totalInstallations)} note="Total software records" tone="purple" onClick={() => openLevel3('software', 'Installations')} />
            <DrillCard icon={Database} label="Unique Software" value={formatNumber(software.uniqueSoftware)} note="Unique titles" tone="blue" onClick={() => openLevel3('software', 'Unique Software')} />
            <DrillCard icon={AlertTriangle} label="Unclassified" value={formatNumber(software.unclassifiedSoftware)} note="Needs cleanup/classification" tone="amber" onClick={() => openLevel3('software', 'Unclassified')} />
          </div>
          <Panel title="Software Categories" subtitle="Click a category for technical detail." icon={Database}>{renderBreakdownDrillCards(software.topCategories, 'software', 'No software category data yet.')}</Panel>
        </div>
      );
    }

    if (view === 'network') {
      return (
        <div className="itops-pro-drawer-stack">
          <div className="itops-pro-story-panel"><strong>Network Coverage Breakdown</strong><p>Review known IPs, registered devices, active IPs and unregistered exposure before technical investigation.</p></div>
          <div className="itops-pro-drill-grid">
            <DrillCard icon={Network} label="Known IPs" value={formatNumber(network.knownIps)} note="Network inventory records" tone="cyan" onClick={() => openLevel3('network', 'Known IPs')} />
            <DrillCard icon={Laptop} label="Registered Devices" value={formatNumber(network.registeredDevices)} note="Mapped devices" tone="green" onClick={() => openLevel3('network', 'Registered Devices')} />
            <DrillCard icon={AlertTriangle} label="Unregistered IPs" value={formatNumber(network.unregisteredIps)} note="Unknown endpoint exposure" tone="amber" onClick={() => openLevel3('network', 'Unregistered IPs')} />
            <DrillCard icon={Network} label="Subnets" value={formatNumber(network.subnetCount)} note="Subnet spread" tone="blue" onClick={() => openLevel3('network', 'Subnets')} />
          </div>
          <Panel title="Workgroups" subtitle="Click a workgroup for network detail." icon={Network}>{renderBreakdownDrillCards(network.workgroups, 'network', 'No workgroup data yet.')}</Panel>
        </div>
      );
    }

    if (view === 'geolocation') {
      return (
        <div className="itops-pro-drawer-stack">
          <div className="itops-pro-story-panel"><strong>Geolocation Coverage Breakdown</strong><p>Review whether locations are fresh, stale or unknown before endpoint follow-up.</p></div>
          <div className="itops-pro-drill-grid">
            <DrillCard icon={MapPin} label="Tracked Devices" value={formatNumber(geolocation.trackedDevices)} note="Location records available" tone="green" onClick={() => openLevel3('geolocation', 'Tracked Devices')} />
            <DrillCard icon={AlertTriangle} label="Stale Locations" value={formatNumber(geolocation.staleLocations)} note="Location may be outdated" tone="amber" onClick={() => openLevel3('geolocation', 'Stale Locations')} />
            <DrillCard icon={ShieldAlert} label="Unknown Locations" value={formatNumber(geolocation.unknownLocations)} note="Missing/unknown location" tone="red" onClick={() => openLevel3('geolocation', 'Unknown Locations')} />
          </div>
          <Panel title="Top Locations" subtitle="Click a location for technical detail." icon={MapPin}>{renderBreakdownDrillCards(geolocation.topLocations, 'geolocation', 'No location data yet.')}</Panel>
        </div>
      );
    }

    if (view === 'attention') {
      return (
        <div className="itops-pro-drawer-stack">
          <div className="itops-pro-story-panel"><strong>Attention Queue Breakdown</strong><p>These are cross-module items that need operational ownership. Click each item to inspect technical evidence.</p></div>
          <div className="itops-pro-queue">
            {attentionQueue.slice(0, 12).map((item) => (
              <button type="button" key={item.id} className="itops-pro-queue-row" onClick={() => openLevel3('attention', item.title)}>
                <SeverityBadge severity={item.severity} />
                <div><strong>{item.title}</strong><span>{item.module} • {item.subtitle}</span></div>
                <ChevronRight size={16} />
              </button>
            ))}
            {!attentionQueue.length && <EmptyState label="No cross-module action queue at the moment." />}
          </div>
        </div>
      );
    }

    return renderLevel2Drilldown('overview');
  };

  const renderLevel3Drilldown = (view: string, item = '') => {
    const selectedLabel = item || VIEW_TITLES[view]?.title || 'Selected data';

    if (view === 'overview') {
      return (
        <div className="itops-pro-drawer-stack">
          <div className="itops-pro-story-panel level3">
            <strong>Command Center Evidence</strong>
            <p>Selected: {selectedLabel}. This view shows the raw technical signals behind the Command Center health score.</p>
          </div>
          <HealthRadar items={domainHealth} onOpen={(view, item) => openLevel3(view, item)} />
          <IncidentTrendChart data={incidentTrend} summary={trendSummary} />
        </div>
      );
    }

    if (view === 'hardware') {
      return (
        <div className="itops-pro-drawer-stack">
          <div className="itops-pro-story-panel level3"><strong>Endpoint Engineering Detail</strong><p>Selected: {selectedLabel}. Inspect stale endpoints, old BIOS, unsupported OS and identity gaps.</p></div>
          <div className="itops-pro-summary-row five">
            <MiniMetric label="Total" value={formatNumber(hardware.totalDevices)} tone="blue" />
            <MiniMetric label="Stale Sync" value={formatNumber(hardware.staleSync)} tone="amber" />
            <MiniMetric label="Old BIOS" value={formatNumber(risk.oldBiosDevices)} tone="purple" />
            <MiniMetric label="Unsupported OS" value={formatNumber(risk.unsupportedOsDevices)} tone="red" />
            <MiniMetric label="Missing Identity" value={formatNumber(risk.missingHardwareIdentity)} tone="amber" />
          </div>
          {renderEndpointRiskDrillTable('level3', item)}
          <Panel title="Platform Evidence" subtitle="Inventory concentration by platform." icon={Laptop}><BarList items={hardware.platformBreakdown} /></Panel>
          <Panel title="Model Evidence" subtitle="Top endpoint models from inventory." icon={Cpu}><BarList items={hardware.topModels} /></Panel>
        </div>
      );
    }

    if (view === 'serviceDesk' || view === 'alerts') {
      return (
        <div className="itops-pro-drawer-stack">
          <div className="itops-pro-story-panel level3"><strong>Ticket / Alert Evidence</strong><p>Selected: {selectedLabel}. Confirm system, owner, status and technical action before remediation.</p></div>
          <div className="itops-pro-summary-row four">
            <MiniMetric label="Pending" value={formatNumber(serviceDesk.pendingTickets)} tone="amber" />
            <MiniMetric label="Overdue" value={formatNumber(serviceDesk.overdueTickets)} tone="red" />
            <MiniMetric label="SLA" value={formatPercent(serviceDesk.slaAchievement)} tone="green" />
            <MiniMetric label="First Response" value={serviceDesk.firstResponse || '-'} tone="blue" />
          </div>
          {renderAlertDrillTable('level3', item)}
          <Panel title="Priority Evidence" subtitle="Priority distribution behind the selected service queue." icon={Layers3}><BarList items={serviceDesk.priorityBreakdown.map((row) => ({ name: row.label, value: row.value }))} /></Panel>
        </div>
      );
    }

    if (view === 'patch' || view === 'departments') {
      return (
        <div className="itops-pro-drawer-stack">
          <div className="itops-pro-story-panel level3"><strong>Patch / Department Technical Detail</strong><p>Selected: {selectedLabel}. Verify patch score, open incidents and department health before remediation.</p></div>
          <div className="itops-pro-summary-row four">
            <MiniMetric label="Patch Avg" value={formatPercent(patchComplianceAverage)} tone="green" />
            <MiniMetric label="Critical Vuln" value={formatNumber(security.criticalVulnerabilities)} tone="red" />
            <MiniMetric label="Patch Critical" value={formatNumber(risk.patchCriticalItems)} tone="amber" />
            <MiniMetric label="Departments" value={formatNumber(departmentRows.length)} tone="blue" />
          </div>
          {renderDepartmentDrillTable('level3', item)}
          <Panel title="Patch Compliance by Department" subtitle="Live patch score returned by API." icon={ShieldCheck}>{renderBreakdownDrillCards(filteredPatchDepartments.map((row) => ({ name: row.name, value: row.percent, percent: row.percent })), 'patch', 'No patch department data yet.')}</Panel>
        </div>
      );
    }

    if (view === 'tasks') {
      return (
        <div className="itops-pro-drawer-stack">
          <div className="itops-pro-story-panel level3"><strong>Automation Job Trace</strong><p>Selected: {selectedLabel}. Confirm job type, target, status and execution time.</p></div>
          <div className="itops-pro-summary-row five">
            <MiniMetric label="Total" value={formatNumber(tasks.totalTasks)} tone="blue" />
            <MiniMetric label="Running" value={formatNumber(tasks.runningTasks)} tone="amber" />
            <MiniMetric label="Completed" value={formatNumber(tasks.completedTasks)} tone="green" />
            <MiniMetric label="Failed" value={formatNumber(tasks.failedTasks)} tone="red" />
            <MiniMetric label="Latest" value={tasks.latestTaskTime || '-'} tone="purple" />
          </div>
          {renderTaskDrillTable('level3', item)}
          <Panel title="Job Type Evidence" subtitle="Distribution by automation type." icon={Wrench}><BarList items={tasks.jobTypeBreakdown} /></Panel>
        </div>
      );
    }

    if (view === 'risk') {
      return (
        <div className="itops-pro-drawer-stack">
          <div className="itops-pro-story-panel level3"><strong>Risk Engineering Detail</strong><p>Selected: {selectedLabel}. Review finding count, affected module and recommended remediation.</p></div>
          <div className="itops-pro-summary-row five">
            <MiniMetric label="Risk Score" value={`${formatNumber(risk.score)}/100`} tone="purple" />
            <MiniMetric label="Critical" value={formatNumber(risk.totalCritical)} tone="red" />
            <MiniMetric label="High" value={formatNumber(risk.totalHigh)} tone="amber" />
            <MiniMetric label="Network Risk" value={formatNumber(risk.networkRiskItems)} tone="cyan" />
            <MiniMetric label="Failed Jobs" value={formatNumber(risk.failedTaskItems)} tone="red" />
          </div>
          {renderRiskDrillTable('level3', item)}
          {renderEndpointRiskDrillTable('level3')}
          <Panel title="Risk Category Evidence" subtitle="Risk signals grouped by category." icon={BarChart3}><BarList items={risk.categoryBreakdown} /></Panel>
        </div>
      );
    }

    if (view === 'software') {
      return (
        <div className="itops-pro-drawer-stack">
          <div className="itops-pro-story-panel level3"><strong>Software Inventory Detail</strong><p>Selected: {selectedLabel}. Validate inventory coverage, unclassified software and scan freshness.</p></div>
          <div className="itops-pro-summary-row four">
            <MiniMetric label="Installations" value={formatNumber(software.totalInstallations)} tone="purple" />
            <MiniMetric label="Unique" value={formatNumber(software.uniqueSoftware)} tone="blue" />
            <MiniMetric label="Devices Covered" value={formatNumber(software.devicesWithSoftware)} tone="green" />
            <MiniMetric label="Unclassified" value={formatNumber(software.unclassifiedSoftware)} tone="amber" />
          </div>
          <Panel title="Software Category Evidence" icon={Database}><BarList items={software.topCategories} /></Panel>
        </div>
      );
    }

    if (view === 'network') {
      return (
        <div className="itops-pro-drawer-stack">
          <div className="itops-pro-story-panel level3"><strong>Network Evidence</strong><p>Selected: {selectedLabel}. Inspect registered coverage, unregistered IP exposure and workgroup distribution.</p></div>
          <div className="itops-pro-summary-row five">
            <MiniMetric label="Known IP" value={formatNumber(network.knownIps)} tone="cyan" />
            <MiniMetric label="Registered" value={formatNumber(network.registeredDevices)} tone="green" />
            <MiniMetric label="Unregistered" value={formatNumber(network.unregisteredIps)} tone="amber" />
            <MiniMetric label="Active IP" value={formatNumber(network.activeIps)} tone="blue" />
            <MiniMetric label="Subnets" value={formatNumber(network.subnetCount)} tone="purple" />
          </div>
          <Panel title="Workgroup Evidence" icon={Network}><BarList items={network.workgroups} /></Panel>
        </div>
      );
    }

    if (view === 'geolocation') {
      return (
        <div className="itops-pro-drawer-stack">
          <div className="itops-pro-story-panel level3"><strong>Geolocation Evidence</strong><p>Selected: {selectedLabel}. Inspect stale, unknown and missing location risk before endpoint follow-up.</p></div>
          <div className="itops-pro-summary-row four">
            <MiniMetric label="Tracked" value={formatNumber(geolocation.trackedDevices)} tone="green" />
            <MiniMetric label="Stale" value={formatNumber(geolocation.staleLocations)} tone="amber" />
            <MiniMetric label="Unknown" value={formatNumber(geolocation.unknownLocations)} tone="red" />
            <MiniMetric label="Missing Geo" value={formatNumber(risk.missingGeoDevices)} tone="purple" />
          </div>
          <Panel title="Location Evidence" icon={MapPin}><BarList items={geolocation.topLocations} /></Panel>
        </div>
      );
    }

    if (view === 'attention') {
      return (
        <div className="itops-pro-drawer-stack">
          <div className="itops-pro-story-panel level3"><strong>Action Queue Evidence</strong><p>Selected: {selectedLabel}. Review the technical evidence behind the attention queue.</p></div>
          <ActionQueue items={attentionQueue} onOpen={(nextView) => openLevel3(nextView)} />
        </div>
      );
    }

    return renderLevel3Drilldown('overview', item);
  };

  const renderDrawerContent = () => {
    const drilldown = parseDrilldownKey(activeView);
    if (drilldown.level === 'level3') return renderLevel3Drilldown(drilldown.view, drilldown.item);
    return renderLevel2Drilldown(drilldown.view);
  };

  const activeMeta = useMemo(() => {
    if (!activeView) return null;
    const drilldown = parseDrilldownKey(activeView);
    const baseMeta = VIEW_TITLES[drilldown.view] || VIEW_TITLES.overview;
    const levelLabel = drilldown.level === 'level3' ? 'Technical Evidence' : 'Operational Breakdown';
    return {
      title: `${levelLabel}: ${baseMeta.title}`,
      subtitle: drilldown.level === 'level3'
        ? `${baseMeta.subtitle} Selected data: ${drilldown.item || 'All evidence'}.`
        : `${baseMeta.subtitle} Click any row or card to open the supporting technical evidence.`,
    };
  }, [activeView]);

  return (
    <div ref={pageRef} className="itops-pro-page">
      <style>{ITOPS_PRO_STYLES}</style>

      <div className="itops-pro-bg-grid" />

      <header className="itops-pro-hero">
        <div>
          <span className="itops-pro-overline"><Sparkles size={15} /> IT Operations Dashboard</span>
          <h1>Operations Command Center</h1>
          <p>Professional operations dashboard powered by the existing live IT Ops API. No backend change required.</p>
          <div className="itops-pro-hero-meta">
            <span><CalendarDays size={14} /> Range: {rangeLabel || '-'}</span>
            <span><Activity size={14} /> Generated: {formatDateLabel(generatedAt)}</span>
            <span><Gauge size={14} /> Health: {formatPercent(overallHealth, 0)}</span>
          </div>
        </div>

        <div className="itops-pro-hero-actions">
          <button type="button" className="itops-pro-outline-btn" onClick={() => exportJsonFile('itops-dashboard-snapshot.json', dashboardData)}>
            <Download size={16} /> Export
          </button>
          <button type="button" className="itops-pro-primary-btn" onClick={() => void loadDashboard()} disabled={isLoading}>
            {isLoading ? <Loader2 size={16} className="itops-pro-spin" /> : <RefreshCw size={16} />} Refresh
          </button>
        </div>
      </header>

      {error && (
        <div className="itops-pro-error">
          <AlertTriangle size={18} />
          <div>
            <strong>Dashboard API error</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      {renderCommandMode()}

      <section className="itops-pro-quick-grid">
        <InsightCard icon={Laptop} title="Hardware" value={formatNumber(hardware.totalDevices)} subtitle="Endpoints in inventory" tone="blue" onClick={() => openLevel2('hardware')} />
        <InsightCard icon={Database} title="Software" value={formatNumber(software.uniqueSoftware)} subtitle="Unique software titles" tone="purple" onClick={() => openLevel2('software')} />
        <InsightCard icon={Network} title="Network" value={formatNumber(network.knownIps)} subtitle="Known IP records" tone="cyan" onClick={() => openLevel2('network')} />
        <InsightCard icon={MapPin} title="Geolocation" value={formatNumber(geolocation.trackedDevices)} subtitle="Tracked devices" tone="green" onClick={() => openLevel2('geolocation')} />
      </section>


      {activeView && activeMeta && (
        <div className="itops-pro-modal-overlay" role="presentation" onMouseDown={(event) => closeDrilldown(event)}>
          <section className="itops-pro-drill-modal" role="dialog" aria-modal="true" aria-label={activeMeta.title} onMouseDown={(event) => event.stopPropagation()}>
            <div className="itops-pro-modal-head">
              <div>
                <span className="itops-pro-overline"><Filter size={14} /> Insight Drilldown</span>
                <h2>{activeMeta.title}</h2>
                <p>{activeMeta.subtitle}</p>
              </div>
              <div className="itops-pro-modal-actions">
                <button type="button" className="itops-pro-back" onClick={handleDrilldownBack}>
                  <ArrowLeft size={18} /> {viewHistory.length > 0 ? 'Back to Previous View' : parseDrilldownKey(activeView).level === 'level3' ? 'Return to Breakdown' : 'Return to Dashboard'}
                </button>
                <button type="button" className="itops-pro-close" onClick={(event) => closeDrilldown(event)} aria-label="Close drilldown modal" title="Close drilldown modal"><X size={18} /> Close</button>
              </div>
            </div>
            <div className="itops-pro-modal-body">{renderDrawerContent()}</div>
          </section>
        </div>
      )}
    </div>
  );
}

const ITOPS_PRO_STYLES = `
.itops-pro-page {
  position: relative;
  min-height: 100vh;
  height: auto;
  max-height: none;
  padding: 28px 28px 72px;
  overflow: visible;
  color: #101828;
  background:
    radial-gradient(circle at 12% 10%, rgba(47, 128, 237, 0.14), transparent 26%),
    radial-gradient(circle at 88% 12%, rgba(124, 58, 237, 0.13), transparent 28%),
    linear-gradient(180deg, #f8fbff 0%, #eef4fb 48%, #f8fafc 100%);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}


html.itops-dashboard-scroll-enabled,
body.itops-dashboard-scroll-enabled,
html:has(.itops-pro-page),
body:has(.itops-pro-page) {
  height: auto !important;
  min-height: 100% !important;
  max-height: none !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
}

body.itops-dashboard-scroll-enabled #root,
body:has(.itops-pro-page) #root {
  height: auto !important;
  min-height: 100% !important;
  max-height: none !important;
  overflow-y: visible !important;
  overflow-x: hidden !important;
}

body.itops-dashboard-scroll-enabled main,
body.itops-dashboard-scroll-enabled .main-content,
body.itops-dashboard-scroll-enabled .page-content,
body.itops-dashboard-scroll-enabled .dashboard-page,
body.itops-dashboard-scroll-enabled .dashboard-content,
body.itops-dashboard-scroll-enabled .ema-main,
body.itops-dashboard-scroll-enabled .ema-main-content,
body.itops-dashboard-scroll-enabled .app-main,
body.itops-dashboard-scroll-enabled .app-content,
body.itops-dashboard-scroll-enabled .content-wrapper,
body.itops-dashboard-scroll-enabled .content-area,
body.itops-dashboard-scroll-enabled .layout-content,
body.itops-dashboard-scroll-enabled .page-container,
body.itops-dashboard-scroll-enabled .router-content,
body:has(.itops-pro-page) main,
body:has(.itops-pro-page) .main-content,
body:has(.itops-pro-page) .page-content,
body:has(.itops-pro-page) .dashboard-page,
body:has(.itops-pro-page) .dashboard-content,
body:has(.itops-pro-page) .ema-main,
body:has(.itops-pro-page) .ema-main-content,
body:has(.itops-pro-page) .app-main,
body:has(.itops-pro-page) .app-content,
body:has(.itops-pro-page) .content-wrapper,
body:has(.itops-pro-page) .content-area,
body:has(.itops-pro-page) .layout-content,
body:has(.itops-pro-page) .page-container,
body:has(.itops-pro-page) .router-content {
  height: auto !important;
  min-height: 0 !important;
  max-height: none !important;
  overflow-y: visible !important;
  overflow-x: hidden !important;
}

.itops-pro-bg-grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(16, 24, 40, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(16, 24, 40, 0.035) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: linear-gradient(to bottom, black, transparent 86%);
}

.itops-pro-page * { box-sizing: border-box; }

.itops-pro-hero,
.itops-pro-tabs,
.itops-pro-kpi-grid,
.itops-pro-command-grid,
.itops-pro-level-grid,
.itops-pro-quick-grid,
.itops-pro-error,
.itops-pro-loading {
  position: relative;
  z-index: 1;
}

.itops-pro-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 30px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 30px;
  background:
    linear-gradient(135deg, rgba(15, 23, 42, 0.97), rgba(30, 41, 59, 0.94)),
    linear-gradient(120deg, rgba(47, 128, 237, 0.4), rgba(124, 58, 237, 0.28));
  color: #ffffff;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.22);
  overflow: hidden;
}

.itops-pro-hero:before {
  content: "";
  position: absolute;
  width: 460px;
  height: 460px;
  right: -120px;
  top: -210px;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.34), transparent 66%);
}

.itops-pro-overline {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  color: #bae6fd;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.itops-pro-hero h1 {
  margin: 0;
  font-size: clamp(30px, 4vw, 48px);
  line-height: 1.02;
  letter-spacing: -0.055em;
  font-weight: 900;
}

.itops-pro-hero p {
  max-width: 820px;
  margin: 14px 0 0;
  color: rgba(226, 232, 240, 0.86);
  font-size: 15px;
  line-height: 1.65;
}

.itops-pro-hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 20px;
}

.itops-pro-hero-meta span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  color: rgba(241, 245, 249, 0.9);
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(14px);
  font-size: 12px;
  font-weight: 700;
}

.itops-pro-hero-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.itops-pro-outline-btn,
.itops-pro-primary-btn,
.itops-pro-soft-btn,
.itops-pro-link-btn,
.itops-pro-close {
  border: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 14px;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.itops-pro-outline-btn,
.itops-pro-primary-btn {
  min-height: 42px;
  padding: 0 16px;
}

.itops-pro-outline-btn {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.18);
}

.itops-pro-primary-btn {
  color: #0f172a;
  background: linear-gradient(135deg, #ffffff, #dff6ff);
  box-shadow: 0 14px 28px rgba(14, 165, 233, 0.22);
}

.itops-pro-soft-btn {
  min-height: 34px;
  padding: 0 13px;
  color: #1d4ed8;
  background: #eff6ff;
}

.itops-pro-link-btn {
  width: 100%;
  min-height: 42px;
  margin-top: 14px;
  color: #1d4ed8;
  background: #eff6ff;
}

.itops-pro-close {
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid #fecaca;
  color: #991b1b;
  background: linear-gradient(135deg, #fff7f7 0%, #fee2e2 100%);
  box-shadow: 0 12px 24px rgba(239, 68, 68, 0.10);
}

.itops-pro-close svg {
  width: 18px;
  height: 18px;
  stroke-width: 2.4;
}

.itops-pro-close:hover {
  border-color: #fca5a5;
  color: #7f1d1d;
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  box-shadow: 0 16px 30px rgba(239, 68, 68, 0.18);
}

.itops-pro-close:focus-visible,
.itops-pro-back:focus-visible {
  outline: 3px solid rgba(59, 130, 246, 0.28);
  outline-offset: 2px;
}

.itops-pro-outline-btn:hover,
.itops-pro-primary-btn:hover,
.itops-pro-soft-btn:hover,
.itops-pro-link-btn:hover,
.itops-pro-close:hover,
.itops-pro-kpi:hover,
.itops-pro-insight:hover,
.itops-pro-queue-row:hover {
  transform: translateY(-1px);
}

.itops-pro-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 20px 0;
}

.itops-pro-tabs button {
  min-height: 74px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 22px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
  text-align: left;
  color: #334155;
  cursor: pointer;
  transition: all 0.2s ease;
}

.itops-pro-tabs button svg {
  display: inline-block;
  margin-right: 8px;
  color: #2563eb;
  vertical-align: middle;
}

.itops-pro-tabs span {
  display: inline-block;
  font-weight: 900;
  vertical-align: middle;
}

.itops-pro-tabs small {
  display: block;
  margin-top: 6px;
  color: #64748b;
  font-weight: 700;
}

.itops-pro-tabs button.active {
  color: #ffffff;
  background: linear-gradient(135deg, #2563eb, #7c3aed);
  border-color: transparent;
  box-shadow: 0 18px 40px rgba(37, 99, 235, 0.28);
}

.itops-pro-tabs button.active svg,
.itops-pro-tabs button.active small { color: rgba(255, 255, 255, 0.82); }

.itops-pro-kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin: 22px 0 18px;
}

.itops-pro-kpi {
  min-height: 196px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 24px;
  padding: 18px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 16px 38px rgba(15, 23, 42, 0.08);
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.itops-pro-kpi-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.itops-pro-kpi-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 16px;
  color: #ffffff;
  background: #2563eb;
  box-shadow: 0 14px 30px rgba(37, 99, 235, 0.22);
}

.itops-pro-kpi-blue .itops-pro-kpi-icon { background: linear-gradient(135deg, #2563eb, #38bdf8); }
.itops-pro-kpi-green .itops-pro-kpi-icon { background: linear-gradient(135deg, #059669, #34d399); }
.itops-pro-kpi-amber .itops-pro-kpi-icon { background: linear-gradient(135deg, #d97706, #fbbf24); }
.itops-pro-kpi-red .itops-pro-kpi-icon { background: linear-gradient(135deg, #dc2626, #fb7185); }
.itops-pro-kpi-purple .itops-pro-kpi-icon { background: linear-gradient(135deg, #7c3aed, #c084fc); }
.itops-pro-kpi-cyan .itops-pro-kpi-icon { background: linear-gradient(135deg, #0891b2, #22d3ee); }

.itops-pro-kpi-label {
  display: block;
  color: #64748b;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.itops-pro-kpi strong {
  display: block;
  margin-top: 6px;
  color: #0f172a;
  font-size: 30px;
  line-height: 1;
  letter-spacing: -0.05em;
  font-weight: 950;
}

.itops-pro-kpi small {
  display: block;
  min-height: 40px;
  margin-top: 10px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.45;
  font-weight: 700;
}

.itops-pro-progress {
  height: 7px;
  margin-top: auto;
  border-radius: 999px;
  overflow: hidden;
  background: #e2e8f0;
}

.itops-pro-progress i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #2563eb, #22c55e);
}

.itops-pro-status {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 900;
}

.itops-pro-status-healthy { color: #047857; background: #dcfce7; }
.itops-pro-status-watch { color: #92400e; background: #fef3c7; }
.itops-pro-status-action { color: #b91c1c; background: #fee2e2; }


.itops-pro-health-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
  align-items: stretch;
}

.itops-pro-health {
  width: 100%;
  min-width: 0;
  min-height: 122px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff, #f8fafc);
  color: #0f172a;
  text-align: left;
  cursor: pointer;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.045);
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.itops-pro-health:hover {
  transform: translateY(-1px);
  border-color: #bfdbfe;
  background: #ffffff;
  box-shadow: 0 14px 30px rgba(37, 99, 235, 0.10);
}

.itops-pro-health-topline,
.itops-pro-health-main,
.itops-pro-health-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.itops-pro-health-icon {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border-radius: 11px;
  color: #1d4ed8;
  background: #eff6ff;
}

.itops-pro-health-action .itops-pro-health-icon { color: #b91c1c; background: #fef2f2; }
.itops-pro-health-watch .itops-pro-health-icon { color: #92400e; background: #fffbeb; }
.itops-pro-health-healthy .itops-pro-health-icon { color: #047857; background: #ecfdf5; }

.itops-pro-health-main span {
  min-width: 0;
  color: #334155;
  font-size: 12px;
  font-weight: 900;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.itops-pro-health-main strong {
  flex: 0 0 auto;
  color: #0f172a;
  font-size: 18px;
  line-height: 1;
  font-weight: 950;
  letter-spacing: -0.04em;
}

.itops-pro-health p {
  min-height: 34px;
  margin: 0 !important;
  color: #64748b;
  font-size: 11px;
  line-height: 1.35;
  font-weight: 750;
}

.itops-pro-health-progress {
  height: 6px;
  margin-top: auto;
  overflow: hidden;
  border-radius: 999px;
  background: #e2e8f0;
}

.itops-pro-health-progress i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #2563eb, #22c55e);
}

.itops-pro-health-footer small {
  color: #64748b;
  font-size: 11px;
  font-weight: 850;
}

.itops-pro-health-footer svg {
  color: #2563eb;
  flex: 0 0 auto;
}

.itops-pro-queue {
  display: grid;
  gap: 9px;
}

.itops-pro-queue-row {
  width: 100%;
  min-height: 58px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 11px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff, #f8fafc);
  color: #0f172a;
  text-align: left;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.itops-pro-queue-row:hover {
  border-color: #bfdbfe;
  background: #ffffff;
  box-shadow: 0 12px 28px rgba(37, 99, 235, 0.10);
}

.itops-pro-queue-row > div {
  min-width: 0;
}

.itops-pro-queue-row strong {
  display: block;
  color: #0f172a;
  font-size: 13px;
  line-height: 1.25;
  font-weight: 950;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.itops-pro-queue-row span {
  display: block;
  margin-top: 3px;
  color: #64748b;
  font-size: 11px;
  line-height: 1.35;
  font-weight: 750;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.itops-pro-queue-row svg {
  color: #2563eb;
  flex: 0 0 auto;
}

.itops-pro-command-grid,
.itops-pro-level-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.itops-pro-panel {
  min-width: 0;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 26px;
  padding: 18px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 16px 42px rgba(15, 23, 42, 0.08);
}

.itops-pro-panel.span-2 { grid-column: span 2; }
.itops-pro-panel.drawer-span { grid-column: 1 / -1; }

.itops-pro-command-grid .itops-pro-panel {
  padding: 16px;
  border-radius: 24px;
}

.itops-pro-command-grid .itops-pro-panel-head {
  margin-bottom: 12px;
}

.itops-pro-command-grid .itops-pro-panel h2 {
  font-size: 17px;
}


.itops-pro-panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;
}

.itops-pro-panel-title {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.itops-pro-panel-title > span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  border-radius: 14px;
  color: #1d4ed8;
  background: #eff6ff;
}

.itops-pro-panel h2 {
  margin: 0;
  color: #0f172a;
  font-size: 18px;
  font-weight: 950;
  letter-spacing: -0.025em;
}

.itops-pro-panel p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.45;
  font-weight: 700;
}

.itops-pro-panel-action { flex: 0 0 auto; }

.itops-pro-summary-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.itops-pro-summary-row.two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.itops-pro-summary-row.four { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.itops-pro-summary-row.five { grid-template-columns: repeat(5, minmax(0, 1fr)); }

.itops-pro-mini {
  min-width: 0;
  padding: 13px;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: #f8fafc;
}

.itops-pro-mini span {
  display: block;
  color: #64748b;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.itops-pro-mini strong {
  display: block;
  margin-top: 5px;
  color: #0f172a;
  font-size: 20px;
  line-height: 1.12;
  font-weight: 950;
  letter-spacing: -0.035em;
  word-break: break-word;
}

.itops-pro-mini small {
  display: block;
  margin-top: 4px;
  color: #64748b;
  font-weight: 700;
}

.itops-pro-mini-blue { background: #eff6ff; border-color: #bfdbfe; }
.itops-pro-mini-green { background: #ecfdf5; border-color: #bbf7d0; }
.itops-pro-mini-amber { background: #fffbeb; border-color: #fde68a; }
.itops-pro-mini-red { background: #fef2f2; border-color: #fecaca; }
.itops-pro-mini-purple { background: #f5f3ff; border-color: #ddd6fe; }
.itops-pro-mini-cyan { background: #ecfeff; border-color: #a5f3fc; }

.itops-pulse-flow {
  display: grid;
  gap: 10px;
}

.itops-pulse-card-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  align-items: stretch;
  margin-bottom: 2px;
}

.itops-pulse-card-grid .itops-pro-mini {
  min-height: 74px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.itops-pulse-insights {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.itops-pulse-insights > div {
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid rgba(37, 99, 235, 0.12);
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(239, 246, 255, 0.95), rgba(248, 250, 252, 0.96));
}

.itops-pulse-insights span,
.itops-pulse-head span {
  color: #64748b;
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.itops-pulse-insights strong {
  display: block;
  margin-top: 4px;
  color: #0f172a;
  font-size: 20px;
  line-height: 1;
  font-weight: 950;
  letter-spacing: -0.04em;
}

.itops-pulse-insights small {
  display: block;
  margin-top: 5px;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

.itops-pulse-table {
  display: grid;
  gap: 5px;
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  background: linear-gradient(180deg, #ffffff, #f8fafc);
}

.itops-pulse-row {
  display: grid;
  grid-template-columns: minmax(102px, 1fr) minmax(180px, 4fr) 52px 66px 52px;
  align-items: center;
  gap: 10px;
}

.itops-pulse-head {
  padding: 2px 10px 6px;
}

.itops-pulse-head span:nth-child(n+3) {
  text-align: right;
}

.itops-pulse-data {
  width: 100%;
  min-height: 38px;
  padding: 6px 9px;
  border: 1px solid transparent;
  border-radius: 15px;
  background: rgba(248, 250, 252, 0.75);
  cursor: default;
  text-align: left;
  transition: border-color 0.18s ease, background 0.18s ease, transform 0.18s ease;
}

.itops-pulse-data:hover {
  border-color: #bfdbfe;
  background: #ffffff;
  transform: translateY(-1px);
}

.itops-pulse-date {
  color: #334155;
  font-size: 11px;
  font-weight: 950;
}

.itops-pulse-track {
  display: block;
  height: 11px;
  overflow: hidden;
  border-radius: 999px;
  background: #e2e8f0;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.04);
}

.itops-pulse-fill {
  display: flex;
  height: 100%;
  overflow: hidden;
  border-radius: inherit;
  background: rgba(226, 232, 240, 0.6);
}

.itops-pulse-fill i {
  min-width: 3px;
  flex-basis: 0;
}

.itops-pulse-fill .new,
.itops-pro-legend .new { background: #2563eb; }
.itops-pulse-fill .resolved,
.itops-pro-legend .resolved { background: #16a34a; }
.itops-pulse-fill .open,
.itops-pro-legend .open { background: #f97316; }

.itops-pulse-data strong {
  color: #0f172a;
  font-size: 12px;
  font-weight: 950;
  text-align: right;
}

.itops-pulse-data strong.new { color: #1d4ed8; }
.itops-pulse-data strong.resolved { color: #15803d; }
.itops-pulse-data strong.open { color: #c2410c; }

.itops-pro-two-col {
  display: grid;
  grid-template-columns: 0.72fr 1.28fr;
  gap: 14px;
  align-items: start;
}

.itops-pro-table-wrap {
  width: 100%;
  overflow: auto;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  background: #ffffff;
}

.itops-pro-table {
  width: 100%;
  min-width: 680px;
  border-collapse: collapse;
}

.itops-pro-table th,
.itops-pro-table td {
  padding: 12px 14px;
  border-bottom: 1px solid #eef2f7;
  text-align: left;
  vertical-align: middle;
  color: #334155;
  font-size: 12px;
}

.itops-pro-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  color: #64748b;
  background: #f8fafc;
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.itops-pro-table tr:last-child td { border-bottom: 0; }
.itops-pro-table strong { color: #0f172a; font-weight: 900; }
.itops-pro-muted-block { display: block; margin-top: 4px; color: #94a3b8; font-size: 11px; font-weight: 700; }

.itops-pro-filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.itops-pro-filter-row.compact {
  flex-wrap: nowrap;
}

.itops-pro-filter-row label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  padding: 0 12px;
  border: 1px solid #dbe3ef;
  border-radius: 14px;
  background: #ffffff;
  color: #64748b;
}

.itops-pro-filter-row input,
.itops-pro-filter-row select {
  border: 0;
  outline: 0;
  background: transparent;
  color: #334155;
  font-size: 12px;
  font-weight: 800;
}

.itops-pro-filter-row select {
  min-height: 38px;
  padding: 0 12px;
  border: 1px solid #dbe3ef;
  border-radius: 14px;
  background: #ffffff;
}

.itops-pro-quick-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-top: 16px;
}

.itops-pro-insight {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 13px;
  align-items: center;
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 22px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.07);
  text-align: left;
  cursor: pointer;
  transition: all 0.18s ease;
}

.itops-pro-insight-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 16px;
  color: #ffffff;
  background: #2563eb;
}

.itops-pro-insight p,
.itops-pro-insight strong,
.itops-pro-insight small { display: block; margin: 0; }
.itops-pro-insight p { color: #64748b; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.07em; }
.itops-pro-insight strong { margin-top: 3px; color: #0f172a; font-size: 24px; font-weight: 950; letter-spacing: -0.04em; }
.itops-pro-insight small { margin-top: 2px; color: #64748b; font-size: 12px; font-weight: 700; }
.itops-pro-insight-blue .itops-pro-insight-icon { background: linear-gradient(135deg, #2563eb, #38bdf8); }
.itops-pro-insight-purple .itops-pro-insight-icon { background: linear-gradient(135deg, #7c3aed, #c084fc); }
.itops-pro-insight-cyan .itops-pro-insight-icon { background: linear-gradient(135deg, #0891b2, #22d3ee); }
.itops-pro-insight-green .itops-pro-insight-icon { background: linear-gradient(135deg, #059669, #34d399); }

.itops-pro-error,
.itops-pro-loading {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 16px 0;
  padding: 14px 16px;
  border-radius: 18px;
  font-weight: 800;
}

.itops-pro-error {
  color: #991b1b;
  background: #fef2f2;
  border: 1px solid #fecaca;
}

.itops-pro-error strong,
.itops-pro-error span { display: block; }
.itops-pro-error span { margin-top: 2px; color: #b91c1c; font-size: 12px; }

.itops-pro-loading {
  justify-content: center;
  color: #1d4ed8;
  background: rgba(239, 246, 255, 0.9);
  border: 1px solid #bfdbfe;
}

.itops-pro-spin { animation: itopsProSpin 0.8s linear infinite; }
@keyframes itopsProSpin { to { transform: rotate(360deg); } }

.itops-pro-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 96px;
  padding: 14px;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
  text-align: center;
}

.itops-pro-sparkline {
  display: inline-flex;
  align-items: end;
  gap: 3px;
  width: 78px;
  height: 30px;
}

.itops-pro-sparkline i {
  width: 7px;
  border-radius: 999px 999px 2px 2px;
  background: linear-gradient(180deg, #2563eb, #22c55e);
}

.itops-pro-sparkline-empty { color: #94a3b8; }

.itops-pro-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 26px;
  background: rgba(15, 23, 42, 0.62);
  backdrop-filter: blur(10px);
}

.itops-pro-drill-modal {
  width: min(1180px, 96vw);
  max-height: min(88vh, 920px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 30px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  box-shadow: 0 32px 90px rgba(15, 23, 42, 0.38);
  animation: itopsProModalIn 0.18s ease-out;
}

@keyframes itopsProModalIn {
  from { opacity: 0; transform: translateY(16px) scale(0.985); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.itops-pro-modal-head {
  position: relative;
  z-index: 5;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 24px 26px 20px;
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.98), rgba(239, 246, 255, 0.96));
  border-bottom: 1px solid #e2e8f0;
}

.itops-pro-modal-head .itops-pro-overline { color: #2563eb; margin-bottom: 8px; }
.itops-pro-modal-head h2 { margin: 0; color: #0f172a; font-size: 28px; font-weight: 950; letter-spacing: -0.05em; }
.itops-pro-modal-head p { max-width: 760px; margin: 7px 0 0; color: #64748b; font-size: 13px; font-weight: 700; line-height: 1.45; }

.itops-pro-modal-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.itops-pro-back {
  border: 1px solid #bfdbfe;
  border-radius: 16px;
  background: linear-gradient(135deg, #eff6ff, #ffffff);
  color: #1d4ed8;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 14px;
  font-size: 13px;
  font-weight: 900;
  white-space: nowrap;
  box-shadow: 0 10px 24px rgba(37, 99, 235, 0.10);
}

.itops-pro-back:hover {
  transform: translateY(-1px);
  border-color: #93c5fd;
  box-shadow: 0 14px 30px rgba(37, 99, 235, 0.16);
}

.itops-pro-modal-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 22px 24px 26px;
}
.itops-pro-drawer-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
.itops-pro-drawer-stack { display: grid; gap: 14px; }

.itops-pro-drill-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.itops-pro-drill-grid.compact {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.itops-pro-drill-card {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 94px;
  padding: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.itops-pro-drill-card:hover,
.itops-pro-clickable-row:hover {
  transform: translateY(-1px);
  border-color: rgba(37, 99, 235, 0.38);
  box-shadow: 0 16px 34px rgba(37, 99, 235, 0.12);
}

.itops-pro-drill-card > svg {
  color: #94a3b8;
}

.itops-pro-drill-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 16px;
  color: #ffffff;
  background: linear-gradient(135deg, #2563eb, #38bdf8);
}

.itops-pro-drill-card span:not(.itops-pro-drill-icon) {
  display: block;
  color: #64748b;
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.itops-pro-drill-card strong {
  display: block;
  margin-top: 4px;
  color: #0f172a;
  font-size: 22px;
  font-weight: 950;
  letter-spacing: -0.04em;
}

.itops-pro-drill-card small {
  display: block;
  margin-top: 3px;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.35;
}

.itops-pro-drill-card-green .itops-pro-drill-icon { background: linear-gradient(135deg, #059669, #34d399); }
.itops-pro-drill-card-amber .itops-pro-drill-icon { background: linear-gradient(135deg, #d97706, #fbbf24); }
.itops-pro-drill-card-red .itops-pro-drill-icon { background: linear-gradient(135deg, #dc2626, #fb7185); }
.itops-pro-drill-card-purple .itops-pro-drill-icon { background: linear-gradient(135deg, #7c3aed, #c084fc); }
.itops-pro-drill-card-cyan .itops-pro-drill-icon { background: linear-gradient(135deg, #0891b2, #22d3ee); }
.itops-pro-drill-card-slate .itops-pro-drill-icon { background: linear-gradient(135deg, #475569, #94a3b8); }

.itops-pro-story-panel {
  padding: 16px 18px;
  border: 1px solid #bfdbfe;
  border-radius: 22px;
  background: linear-gradient(135deg, #eff6ff, #ffffff);
}

.itops-pro-story-panel.level3 {
  border-color: #ddd6fe;
  background: linear-gradient(135deg, #f5f3ff, #ffffff);
}

.itops-pro-story-panel strong {
  display: block;
  color: #0f172a;
  font-size: 16px;
  font-weight: 950;
  letter-spacing: -0.02em;
}

.itops-pro-story-panel p {
  margin: 6px 0 0;
  color: #475569;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.55;
}

.itops-pro-clickable-row {
  cursor: pointer;
  transition: background 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
}

.itops-pro-clickable-row:hover td {
  background: #f8fbff;
}


.itops-risk-command-summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px 14px;
  width: 100%;
  padding: 16px;
  border: 1px solid rgba(191, 219, 254, 0.95);
  border-radius: 22px;
  background:
    radial-gradient(circle at top right, rgba(59, 130, 246, 0.16), transparent 38%),
    linear-gradient(135deg, #ffffff 0%, #eff6ff 100%);
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.06);
  cursor: pointer;
  text-align: left;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.itops-risk-command-summary:hover {
  transform: translateY(-2px);
  border-color: rgba(37, 99, 235, 0.45);
  box-shadow: 0 20px 38px rgba(37, 99, 235, 0.12);
}

.itops-risk-command-copy span,
.itops-risk-severity span {
  display: block;
  color: #64748b;
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.itops-risk-command-copy strong {
  display: block;
  margin-top: 6px;
  color: #0f172a;
  font-size: 42px;
  font-weight: 950;
  letter-spacing: -0.07em;
  line-height: 0.92;
}

.itops-risk-command-copy strong em {
  margin-left: 4px;
  color: #64748b;
  font-size: 16px;
  font-style: normal;
  letter-spacing: -0.02em;
}

.itops-risk-command-copy small,
.itops-risk-severity small {
  display: block;
  margin-top: 8px;
  color: #64748b;
  font-size: 12px;
  font-weight: 750;
  line-height: 1.35;
}

.itops-risk-command-meter {
  grid-column: 1 / -1;
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: #e2e8f0;
}

.itops-risk-command-meter i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #2563eb, #7c3aed, #ef4444);
}

.itops-risk-severity-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.itops-risk-severity {
  min-width: 0;
  min-height: 108px;
  padding: 14px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 20px;
  background: #ffffff;
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.itops-risk-severity:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 30px rgba(15, 23, 42, 0.08);
}

.itops-risk-severity strong {
  display: block;
  margin-top: 8px;
  color: #0f172a;
  font-size: 25px;
  font-weight: 950;
  letter-spacing: -0.045em;
  line-height: 1;
}

.itops-risk-severity-critical {
  border-color: rgba(248, 113, 113, 0.45);
  background: linear-gradient(180deg, #fff7f7 0%, #ffffff 100%);
}

.itops-risk-severity-high {
  border-color: rgba(251, 191, 36, 0.55);
  background: linear-gradient(180deg, #fffbeb 0%, #ffffff 100%);
}

.itops-risk-severity-medium {
  border-color: rgba(196, 181, 253, 0.65);
  background: linear-gradient(180deg, #f5f3ff 0%, #ffffff 100%);
}

.itops-pro-link-btn-risk {
  width: 100%;
  justify-content: center;
  margin-top: 12px;
}


@media (max-width: 760px) {
  .itops-risk-severity-grid { grid-template-columns: 1fr; }
  .itops-risk-command-copy strong { font-size: 34px; }
  .itops-pulse-insights { grid-template-columns: 1fr; }
  .itops-pulse-row {
    grid-template-columns: 1fr;
    gap: 7px;
  }
  .itops-pulse-head { display: none; }
  .itops-pulse-data strong { text-align: left; }
  .itops-pulse-data strong::before {
    display: inline-block;
    min-width: 74px;
    color: #94a3b8;
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
  }
  .itops-pulse-data strong.new::before { content: 'New'; }
  .itops-pulse-data strong.resolved::before { content: 'Resolved'; }
  .itops-pulse-data strong.open::before { content: 'Open'; }
}

@media (max-width: 1400px) {
  .itops-pro-kpi-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .itops-pro-command-grid,
  .itops-pro-level-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 980px) {
  .itops-pro-page { padding: 16px 16px 56px; }
  .itops-pro-hero { flex-direction: column; padding: 22px; }
  .itops-pro-hero-actions { width: 100%; }
  .itops-pro-outline-btn,
  .itops-pro-primary-btn { flex: 1; }
  .itops-pro-tabs,
  .itops-pro-kpi-grid,
  .itops-pro-command-grid,
  .itops-pro-level-grid,
  .itops-pro-quick-grid,
  .itops-pro-two-col,
  .itops-pro-drawer-grid,
  .itops-pro-drill-grid,
  .itops-pro-drill-grid.compact { grid-template-columns: 1fr; }
  .itops-pro-panel.span-2 { grid-column: auto; }
  .itops-pro-summary-row,
  .itops-pro-summary-row.two,
  .itops-pro-summary-row.four,
  .itops-pro-summary-row.five,
  .itops-pulse-card-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .itops-pro-panel-head,
  .itops-pro-modal-head { flex-direction: column; }
  .itops-pro-modal-actions { width: 100%; justify-content: space-between; }
}

@media (max-width: 560px) {
  .itops-pro-summary-row,
  .itops-pro-summary-row.two,
  .itops-pro-summary-row.four,
  .itops-pro-summary-row.five,
  .itops-pro-health-grid { grid-template-columns: 1fr; }
  .itops-pro-hero-actions,
  .itops-pro-filter-row.compact { flex-direction: column; align-items: stretch; }
  .itops-pro-modal-overlay { padding: 12px; }
  .itops-pro-drill-modal { width: 100%; max-height: 92vh; border-radius: 22px; }
  .itops-pro-modal-head { padding: 18px; }
  .itops-pro-modal-body { padding: 16px; }
}


/* Dashboard section balance fix: remove stretched panels and restore readable cards */
.itops-pro-command-grid {
  align-items: start;
  grid-auto-rows: auto;
}

.itops-pro-command-grid .itops-pro-panel {
  align-self: start;
  height: auto;
  min-height: 0;
}

.itops-pro-command-grid .itops-pro-panel.span-2 {
  min-height: 0;
}

.itops-pro-command-grid .itops-pro-panel:has(.itops-pro-health-grid),
.itops-pro-command-grid .itops-pro-panel:has(.itops-pro-queue),
.itops-pro-command-grid .itops-pro-panel:has(.itops-pro-risk-layout) {
  padding: 18px;
}

.itops-pro-health-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.itops-pro-health {
  min-height: 150px;
  padding: 14px;
  border-radius: 20px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  border-color: rgba(148, 163, 184, 0.28);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.045);
}

.itops-pro-health-topline {
  min-height: 30px;
}

.itops-pro-health-main {
  align-items: flex-start;
}

.itops-pro-health-main span {
  font-size: 13px;
  line-height: 1.25;
  white-space: normal;
}

.itops-pro-health-main strong {
  font-size: 24px;
  letter-spacing: -0.05em;
}

.itops-pro-health p {
  min-height: 38px;
  font-size: 12px;
  line-height: 1.4;
}

.itops-pro-health-footer {
  margin-top: 2px;
  padding-top: 8px;
  border-top: 1px solid rgba(226, 232, 240, 0.9);
}

.itops-pro-health-footer small {
  font-size: 11px;
}

.itops-pro-queue {
  gap: 10px;
}

.itops-pro-queue-row {
  min-height: 66px;
  padding: 12px 13px;
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.itops-pro-queue-row strong {
  font-size: 13px;
  line-height: 1.28;
  white-space: normal;
}

.itops-pro-queue-row span {
  font-size: 11px;
  line-height: 1.38;
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.itops-pro-risk-layout {
  display: grid;
  gap: 12px;
}

.itops-pro-risk-metrics {
  gap: 10px;
}

.itops-pro-link-btn {
  margin-top: 12px;
}

.itops-pulse-flow {
  gap: 12px;
}

.itops-pulse-insights > div {
  padding: 12px 14px;
}

.itops-pulse-table {
  padding: 12px;
  gap: 6px;
}

.itops-pulse-row {
  grid-template-columns: minmax(110px, 0.9fr) minmax(220px, 4fr) 56px 72px 56px;
}

.itops-pulse-data {
  min-height: 40px;
  padding: 7px 10px;
}

@media (max-width: 1500px) {
  .itops-pro-health-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .itops-pulse-card-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.itops-risk-command-summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px 14px;
  width: 100%;
  padding: 16px;
  border: 1px solid rgba(191, 219, 254, 0.95);
  border-radius: 22px;
  background:
    radial-gradient(circle at top right, rgba(59, 130, 246, 0.16), transparent 38%),
    linear-gradient(135deg, #ffffff 0%, #eff6ff 100%);
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.06);
  cursor: pointer;
  text-align: left;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.itops-risk-command-summary:hover {
  transform: translateY(-2px);
  border-color: rgba(37, 99, 235, 0.45);
  box-shadow: 0 20px 38px rgba(37, 99, 235, 0.12);
}

.itops-risk-command-copy span,
.itops-risk-severity span {
  display: block;
  color: #64748b;
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.itops-risk-command-copy strong {
  display: block;
  margin-top: 6px;
  color: #0f172a;
  font-size: 42px;
  font-weight: 950;
  letter-spacing: -0.07em;
  line-height: 0.92;
}

.itops-risk-command-copy strong em {
  margin-left: 4px;
  color: #64748b;
  font-size: 16px;
  font-style: normal;
  letter-spacing: -0.02em;
}

.itops-risk-command-copy small,
.itops-risk-severity small {
  display: block;
  margin-top: 8px;
  color: #64748b;
  font-size: 12px;
  font-weight: 750;
  line-height: 1.35;
}

.itops-risk-command-meter {
  grid-column: 1 / -1;
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: #e2e8f0;
}

.itops-risk-command-meter i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #2563eb, #7c3aed, #ef4444);
}

.itops-risk-severity-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.itops-risk-severity {
  min-width: 0;
  min-height: 108px;
  padding: 14px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 20px;
  background: #ffffff;
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.itops-risk-severity:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 30px rgba(15, 23, 42, 0.08);
}

.itops-risk-severity strong {
  display: block;
  margin-top: 8px;
  color: #0f172a;
  font-size: 25px;
  font-weight: 950;
  letter-spacing: -0.045em;
  line-height: 1;
}

.itops-risk-severity-critical {
  border-color: rgba(248, 113, 113, 0.45);
  background: linear-gradient(180deg, #fff7f7 0%, #ffffff 100%);
}

.itops-risk-severity-high {
  border-color: rgba(251, 191, 36, 0.55);
  background: linear-gradient(180deg, #fffbeb 0%, #ffffff 100%);
}

.itops-risk-severity-medium {
  border-color: rgba(196, 181, 253, 0.65);
  background: linear-gradient(180deg, #f5f3ff 0%, #ffffff 100%);
}

.itops-pro-link-btn-risk {
  width: 100%;
  justify-content: center;
  margin-top: 12px;
}


@media (max-width: 760px) {
  .itops-pro-health-grid {
    grid-template-columns: 1fr;
  }
}

/* Pulse cards alignment fix */
.itops-pulse-card-grid {
  grid-template-columns: repeat(5, minmax(0, 1fr));
  align-items: stretch;
}

.itops-pulse-card-grid .itops-pro-mini {
  height: 100%;
  min-height: 82px;
}

.itops-pulse-table {
  margin-top: 2px;
}

.itops-pro-legend {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  font-weight: 800;
  color: #475569;
}

@media (max-width: 1500px) {
  .itops-pulse-card-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@media (max-width: 900px) {
  .itops-pulse-card-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 640px) {
  .itops-pulse-card-grid { grid-template-columns: 1fr; }
}

`;
