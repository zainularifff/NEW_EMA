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
  osLifecycleStatus?: string;
  osLifecycleSeverity?: Severity | string;
  osLifecycleCycle?: string;
  osLifecycleEolDate?: string;
  osLifecycleSource?: string;
  osLifecycleBasis?: string;
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
  source?: string;
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

type GeoDeviceRow = {
  deviceName: string;
  deviceId?: string;
  platform?: string;
  department?: string;
  locationName?: string;
  lastSeen?: string;
  status?: string;
  reason?: string;
  signal?: string;
  latitude?: string | number;
  longitude?: string | number;
};

type GeoSummary = {
  trackedDevices: number;
  staleLocations: number;
  unknownLocations: number;
  latestLocationTime: string;
  topLocations: BreakdownItem[];
  locationRows: GeoDeviceRow[];
  trackedRows: GeoDeviceRow[];
  staleRows: GeoDeviceRow[];
  unknownRows: GeoDeviceRow[];
  missingGeoRows: GeoDeviceRow[];
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
  source: '-',
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
  locationRows: [],
  trackedRows: [],
  staleRows: [],
  unknownRows: [],
  missingGeoRows: [],
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
  departments: { title: 'Branch Health', subtitle: 'Branch asset coverage, incident load, patch compliance and health score.' },
  serviceDesk: { title: 'operations Service Operations', subtitle: 'Ticket queue, overdue SLA, response performance and priority mix.' },
  patch: { title: 'Patch Compliance', subtitle: 'Branch patch score and remediation priority.' },
  alerts: { title: 'Active Alerts', subtitle: 'Critical and high-priority items requiring operational triage.' },
  attention: { title: 'Exception Evidence', subtitle: 'Detailed evidence for generated follow-up signals.' },
  dataConfidence: { title: 'Data Confidence', subtitle: 'Source freshness and mapping reliability across operational domains.' },
};

function resolveApiBaseUrl() {
  const envUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (envUrl) return envUrl.replace(/\/$/, '');

  return '';
}

const API_BASE_URL = resolveApiBaseUrl();
const ITOPS_DASHBOARD_API_PATH = '/api/dashboard/it-operations';

function buildApiUrl(path: string, query?: Record<string, string | number | boolean | undefined>) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE_URL}${normalizedPath}`;
  const params = new URLSearchParams();

  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });

  const queryText = params.toString();
  return queryText ? `${url}?${queryText}` : url;
}

const ITOPS_DASHBOARD_CLIENT_CACHE_MS = 45000;
let itopsDashboardClientCache: { at: number; data: ItOpsDashboardData } | null = null;

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


function firstTextValue(record: Record<string, unknown>, keys: string[], fallback = '') {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim();
  }
  return fallback;
}

function firstRawValue(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return undefined;
}

function readArrayFromRecord(record: Record<string, unknown> | undefined, keys: string[]) {
  if (!record) return [] as unknown[];
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value;
  }
  return [] as unknown[];
}

function normalizeGeoDeviceRows(rows: unknown, defaultSignal = ''): GeoDeviceRow[] {
  if (!Array.isArray(rows)) return [];

  return rows.map((row) => {
    const record = (row || {}) as Record<string, unknown>;
    const locationName = firstTextValue(record, ['locationName', 'LocationName', 'location', 'Location', 'address', 'Address', 'geoLocation', 'GeoLocation'], 'Unknown Location');
    const signal = firstTextValue(record, ['signal', 'Signal', 'riskType', 'RiskType', 'category', 'Category', 'status', 'Status'], defaultSignal);
    const lastSeenRaw = firstRawValue(record, ['lastSeen', 'LastSeen', 'locationTime', 'LocationTime', 'time', 'Time', 'updatedAt', 'UpdatedAt', 'DeviceTimeStamp']);

    return {
      deviceName: firstTextValue(record, ['deviceName', 'DeviceName', 'computerName', 'ComputerName', 'hostname', 'HostName', 'name', 'Name'], firstTextValue(record, ['deviceId', 'DeviceID', 'Object_DeviceID', 'serialNumber', 'SerialNumber'], '-')),
      deviceId: firstTextValue(record, ['deviceId', 'DeviceID', 'Object_DeviceID', 'assetId', 'AssetID', 'id', 'ID']),
      platform: firstTextValue(record, ['platform', 'Platform', 'platformType', 'PlatformType', 'osName', 'OSName']),
      department: firstTextValue(record, ['department', 'Department', 'objectFullName', 'Object_Full_Name', 'Object_Rel_Name', 'group', 'Group']),
      locationName,
      lastSeen: lastSeenRaw ? formatDateLabel(lastSeenRaw) : firstTextValue(record, ['lastSeenLabel', 'LastSeenLabel', 'timeLabel', 'TimeLabel']),
      status: firstTextValue(record, ['status', 'Status', 'connectionStatus', 'ConnectionStatus'], signal || defaultSignal),
      reason: firstTextValue(record, ['reason', 'Reason', 'reasons', 'Reasons', 'remark', 'Remark'], signal || defaultSignal || 'Location evidence returned by API'),
      signal,
      latitude: firstRawValue(record, ['latitude', 'Latitude', 'lat', 'Lat']),
      longitude: firstRawValue(record, ['longitude', 'Longitude', 'lng', 'Lng', 'long', 'Long']),
    };
  }).filter((row) => row.deviceName && row.deviceName !== '-');
}

function uniqueGeoRows(rows: GeoDeviceRow[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = [row.deviceId, row.deviceName, row.locationName, row.lastSeen, row.signal].filter(Boolean).join('|').toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
    geolocation: (() => {
      const geoRecord = (data.geolocation || {}) as Partial<GeoSummary> & Record<string, unknown>;
      const locationRows = normalizeGeoDeviceRows(readArrayFromRecord(geoRecord, ['locationRows', 'deviceRows', 'devices', 'records', 'rows', 'geoRows']), 'Tracked Devices');
      const trackedRows = normalizeGeoDeviceRows(readArrayFromRecord(geoRecord, ['trackedRows', 'trackedDeviceRows', 'trackedDevicesRows', 'usableRows']), 'Tracked Devices');
      const staleRows = normalizeGeoDeviceRows(readArrayFromRecord(geoRecord, ['staleRows', 'staleLocationRows', 'staleLocationRecords', 'staleDevices']), 'Stale Location Records');
      const unknownRows = normalizeGeoDeviceRows(readArrayFromRecord(geoRecord, ['unknownRows', 'unknownLocationRows', 'unknownLocationRecords', 'unknownDevices']), 'Unknown Locations');
      const missingGeoRows = normalizeGeoDeviceRows(readArrayFromRecord(geoRecord, ['missingGeoRows', 'missingGeoDevices', 'missingGeoIdentityRows', 'missingIdentityRows']), 'Missing Geo Identity');

      return {
        ...EMPTY_GEO_SUMMARY,
        ...geoRecord,
        topLocations: Array.isArray(geoRecord.topLocations) ? geoRecord.topLocations : [],
        locationRows,
        trackedRows,
        staleRows,
        unknownRows,
        missingGeoRows,
      };
    })(),
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

async function fetchItOpsDashboardData(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && itopsDashboardClientCache && now - itopsDashboardClientCache.at < ITOPS_DASHBOARD_CLIENT_CACHE_MS) {
    return itopsDashboardClientCache.data;
  }

  const token = getStoredAccessToken();
  const headers = new Headers({ Accept: 'application/json' });
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(buildApiUrl(ITOPS_DASHBOARD_API_PATH, { refresh: forceRefresh ? 1 : undefined }), {
    headers,
    credentials: 'include',
  });

  const payload = (await response.json().catch(() => null)) as {
    success?: boolean;
    message?: string;
    error?: string;
    data?: Partial<ItOpsDashboardData>;
  } | null;

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || payload?.message || `Dashboard API failed: ${response.status}`);
  }

  if (!payload?.data) {
    throw new Error('Dashboard API returned an invalid response. Expected { success, data } from /api/dashboard/it-operations.');
  }

  const data = normalizeDashboardData(payload.data);
  itopsDashboardClientCache = { at: Date.now(), data };
  return data;
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
    <button type="button" className={`itops-pro-kpi itops-pro-kpi-${card.tone}`} onClick={() => onOpen(card.view)} aria-haspopup="dialog" data-drilldown-view={card.view}>
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

function IncidentTrendChart({ data, summary, showSummaryCards = true }: { data: IncidentTrendPoint[]; summary?: TrendSummary; showSummaryCards?: boolean }) {
  const rows = data.slice(-5);
  const summaryValues = summary || {
    newIncidents: rows.reduce((total, row) => total + numberOrFallback(row.newIncidents), 0),
    resolved: rows.reduce((total, row) => total + numberOrFallback(row.resolved), 0),
    openBacklog: rows.length ? numberOrFallback(rows[rows.length - 1]?.open) : 0
  };
  const summaryCards = showSummaryCards ? (
    <div className="itops-pulse-card-grid">
      <MiniMetric label="New" value={formatNumber(summaryValues.newIncidents)} tone="blue" note="Created" />
      <MiniMetric label="Resolved" value={formatNumber(summaryValues.resolved)} tone="green" note="Closed" />
      <MiniMetric label="Open Backlog" value={formatNumber(summaryValues.openBacklog)} tone="amber" note="Current queue" />
    </div>
  ) : null;

  if (!rows.length) {
    return (
      <div className="itops-pulse-flow">
        {summaryCards}
        <EmptyState label="No incident movement found for the selected period." />
      </div>
    );
  }

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
  const extraCards = showSummaryCards ? (
    <div className="itops-pulse-card-grid itops-pulse-card-grid-extended">
      <MiniMetric label="Latest Backlog" value={formatNumber(latestBacklog)} tone="cyan" note={previous ? `${backlogDelta >= 0 ? '+' : ''}${formatNumber(backlogDelta)} vs previous day` : 'Current open workload'} />
      <MiniMetric label="Peak Movement" value={formatNumber(peakTotal)} tone="purple" note={peakDay.day} />
    </div>
  ) : null;

  return (
    <div className="itops-pulse-flow">
      {summaryCards}
      {extraCards}

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
  if (text.includes('confidence') || text.includes('freshness') || text.includes('source of truth') || text.includes('data quality')) return 'dataConfidence';
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
  if (view === 'dataConfidence') return Gauge;
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
  if (view === 'dataConfidence') return 'Validate source freshness before using dashboard as source of truth';
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


function DataConfidenceCard({ score, rows, onOpen }: { score: number; rows: BreakdownItem[]; onOpen: () => void }) {
  const status = healthStatus(score);
  return (
    <button type="button" className={`itops-data-confidence itops-data-confidence-${status.toLowerCase()}`} onClick={onOpen}>
      <div className="itops-data-confidence-head">
        <span className="itops-data-confidence-icon"><Gauge size={18} /></span>
        <div>
          <span>Data Confidence</span>
          <strong>{formatPercent(score, 0)}</strong>
          <small>Source of truth readiness</small>
        </div>
        <StatusBadge status={status} />
      </div>
      <div className="itops-data-confidence-meter" aria-hidden="true"><i style={{ width: `${clampPercent(score)}%` }} /></div>
      <div className="itops-data-confidence-grid">
        {rows.slice(0, 6).map((row) => (
          <div key={row.name}>
            <span>{row.name}</span>
            <strong>{formatPercent(row.percent ?? row.value, 0)}</strong>
          </div>
        ))}
      </div>
    </button>
  );
}

function DrilldownTrace({ domain, stage, selected }: { domain: string; stage: 'breakdown' | 'evidence'; selected?: string }) {
  return (
    <div className="itops-drill-trace" aria-label="Drilldown data flow">
      <span className="done">KPI</span>
      <ChevronRight size={13} />
      <span className={stage === 'breakdown' ? 'active' : 'done'}>Breakdown</span>
      <ChevronRight size={13} />
      <span className={stage === 'evidence' ? 'active' : ''}>Evidence</span>
      <small>{domain}{selected ? ` • ${selected}` : ''}</small>
    </div>
  );
}

function LocationDistribution({ items, onOpen }: { items: BreakdownItem[]; onOpen: (name: string) => void }) {
  const visible = items.slice(0, 8);
  if (!visible.length) return <EmptyState label="No recorded location distribution returned by the API yet." />;

  return (
    <div className="itops-location-list">
      {visible.map((item) => {
        const percent = item.percent === undefined ? 0 : clampPercent(item.percent);
        return (
          <button type="button" key={item.name} onClick={() => onOpen(item.name)}>
            <div>
              <strong>{item.name}</strong>
              <span>{item.percent === undefined ? `${formatNumber(item.value)} record(s)` : `${formatPercent(percent)} of returned location mix`}</span>
            </div>
            <em>{item.percent === undefined ? formatNumber(item.value) : formatPercent(percent)}</em>
            <ChevronRight size={15} />
          </button>
        );
      })}
    </div>
  );
}

function LifecycleBadge({ value }: { value?: string }) {
  const text = String(value || 'Lifecycle Not Provided');
  const normalized = text.toLowerCase();
  const tone: StatusTone = normalized.includes('eol') || normalized.includes('eos')
    ? 'danger'
    : normalized.includes('near')
      ? 'warning'
      : normalized.includes('not')
        ? 'neutral'
        : 'info';
  return <ToneBadge tone={tone}>{text}</ToneBadge>;
}

function ActionQueue({ items, onOpen }: { items: AttentionItem[]; onOpen: (view: string) => void }) {
  if (!items.length) return <EmptyState label="No action item generated from current operational signals." />;

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
  const [selectedDepartment, setSelectedDepartment] = useState('All Branches');
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

  const loadDashboard = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setError('');

    try {
      const data = await fetchItOpsDashboardData(forceRefresh);
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
    document.documentElement.classList.add('itops-dashboard-page-active', 'md-dashboard-page-active');
    document.body.classList.add('itops-dashboard-page-active', 'md-dashboard-page-active');
    document.documentElement.classList.remove('itops-dashboard-scroll-enabled', 'md-management-dashboard-active');
    document.body.classList.remove('itops-dashboard-scroll-enabled', 'md-management-dashboard-active');

    return () => {
      document.documentElement.classList.remove('itops-dashboard-page-active', 'md-dashboard-page-active');
      document.body.classList.remove('itops-dashboard-page-active', 'md-dashboard-page-active');
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
  const endpointFreshnessPercent = hardware.totalDevices > 0 ? ((hardware.totalDevices - hardware.staleSync) / hardware.totalDevices) * 100 : 0;
  const taskCompletionPercent = tasks.totalTasks > 0 ? (tasks.completedTasks / tasks.totalTasks) * 100 : 0;
  const networkRegistrationPercent = network.knownIps > 0 ? (network.registeredDevices / network.knownIps) * 100 : 0;
  const softwareMappingPercent = software.uniqueSoftware > 0 ? ((Math.max(0, software.uniqueSoftware - software.unclassifiedSoftware)) / software.uniqueSoftware) * 100 : 0;
  const locationSignalTotal = geolocation.trackedDevices + geolocation.staleLocations + geolocation.unknownLocations + risk.missingGeoDevices;
  const locationFreshPercent = locationSignalTotal > 0 ? (geolocation.trackedDevices / locationSignalTotal) * 100 : 0;
  const dataConfidenceRows = useMemo<BreakdownItem[]>(() => [
    { name: 'Endpoint freshness', value: endpointFreshnessPercent, percent: endpointFreshnessPercent },
    { name: 'Software mapping', value: softwareMappingPercent, percent: softwareMappingPercent },
    { name: 'Network mapping', value: networkRegistrationPercent, percent: networkRegistrationPercent },
    { name: 'Location reliability', value: locationFreshPercent, percent: locationFreshPercent },
    { name: 'Task execution', value: taskCompletionPercent, percent: taskCompletionPercent },
    { name: 'Service SLA', value: serviceDesk.slaAchievement, percent: serviceDesk.slaAchievement },
  ], [endpointFreshnessPercent, locationFreshPercent, networkRegistrationPercent, serviceDesk.slaAchievement, softwareMappingPercent, taskCompletionPercent]);
  const dataConfidenceScore = useMemo(() => averagePercent(dataConfidenceRows), [dataConfidenceRows]);
  const geoEvidenceRows = useMemo(() => {
    const hardwareGeoFallback = risk.topHardwareRisk
      .filter((device) => /geo|location/i.test(`${device.reasons || ''} ${device.department || ''}`))
      .map((device) => ({
        deviceName: device.deviceName,
        platform: device.platform,
        department: device.department,
        locationName: device.department || 'Missing / unmatched location identity',
        lastSeen: device.lastSeen,
        status: 'Missing Geo Identity',
        signal: 'Missing Geo Identity',
        reason: device.reasons || 'Endpoint has geo/location risk signal',
      } satisfies GeoDeviceRow));

    return uniqueGeoRows([
      ...geolocation.locationRows,
      ...geolocation.trackedRows,
      ...geolocation.staleRows,
      ...geolocation.unknownRows,
      ...geolocation.missingGeoRows,
      ...hardwareGeoFallback,
    ]);
  }, [geolocation.locationRows, geolocation.missingGeoRows, geolocation.staleRows, geolocation.trackedRows, geolocation.unknownRows, risk.topHardwareRisk]);

  const resolveGeoEvidenceRows = useCallback((item = '') => {
    const key = String(item || '').toLowerCase();
    let rows = geoEvidenceRows;

    if (key.includes('tracked')) {
      rows = geolocation.trackedRows.length ? geolocation.trackedRows : geoEvidenceRows.filter((row) => /tracked|usable|fresh/i.test(`${row.signal} ${row.status} ${row.reason}`));
    } else if (key.includes('stale')) {
      rows = geolocation.staleRows.length ? geolocation.staleRows : geoEvidenceRows.filter((row) => /stale|old|expired/i.test(`${row.signal} ${row.status} ${row.reason}`));
    } else if (key.includes('unknown')) {
      rows = geolocation.unknownRows.length ? geolocation.unknownRows : geoEvidenceRows.filter((row) => /unknown|empty|unable/i.test(`${row.locationName} ${row.signal} ${row.status} ${row.reason}`));
    } else if (key.includes('missing geo') || key.includes('missing identity')) {
      rows = geolocation.missingGeoRows.length ? geolocation.missingGeoRows : geoEvidenceRows.filter((row) => /missing|identity|mapping/i.test(`${row.signal} ${row.status} ${row.reason}`));
    } else if (item) {
      rows = geoEvidenceRows.filter((row) => row.locationName === item || row.department === item || row.deviceName === item || row.deviceId === item);
    }

    return uniqueGeoRows(rows);
  }, [geoEvidenceRows, geolocation.missingGeoRows, geolocation.staleRows, geolocation.trackedRows, geolocation.unknownRows]);

  const domainHealthForMatrix = useMemo<DomainHealthItem[]>(() => {
    const existing = domainHealth.filter((item) => resolveDomainView(item.name) !== 'dataConfidence').slice(0, 5);
    return [...existing, { name: 'Data Confidence', percent: dataConfidenceScore, color: '#2563eb' }];
  }, [dataConfidenceScore, domainHealth]);
  const overallHealth = useMemo(() => {
    const values = [endpointOnlinePercent, patchComplianceAverage, serviceDesk.slaAchievement, taskCompletionPercent, networkRegistrationPercent, locationFreshPercent, dataConfidenceScore].filter((item) => Number.isFinite(item));
    if (!values.length) return 0;
    return values.reduce((total, item) => total + clampPercent(item), 0) / values.length;
  }, [dataConfidenceScore, endpointOnlinePercent, patchComplianceAverage, serviceDesk.slaAchievement, taskCompletionPercent, networkRegistrationPercent, locationFreshPercent]);

  const departments = useMemo(() => ['All Branches', ...patchDepartments.map((item) => item.name)], [patchDepartments]);

  const filteredDepartments = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return departmentRows.filter((row) => {
      const matchesDepartment = selectedDepartment === 'All Branches' || row.department === selectedDepartment;
      const matchesSearch = !keyword || row.department.toLowerCase().includes(keyword);
      return matchesDepartment && matchesSearch;
    });
  }, [departmentRows, search, selectedDepartment]);

  const filteredPatchDepartments = useMemo(() => {
    if (selectedDepartment === 'All Branches') return patchDepartments;
    return patchDepartments.filter((item) => item.name === selectedDepartment);
  }, [patchDepartments, selectedDepartment]);

  useEffect(() => {
    if (selectedDepartment !== 'All Departments' && !departments.includes(selectedDepartment)) {
      setSelectedDepartment('All Departments');
    }
  }, [departments, selectedDepartment]);

  const focusCards: FocusCard[] = useMemo(() => [
    {
      id: 'location',
      label: 'Location Coverage',
      value: formatNumber(geolocation.trackedDevices),
      note: `${formatNumber(geolocation.staleLocations)} stale record(s) • ${formatNumber(risk.missingGeoDevices)} missing geo`,
      icon: MapPin,
      tone: 'green',
      progress: locationFreshPercent,
      status: healthStatus(locationFreshPercent),
      view: 'geolocation',
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
  ], [endpointOnlinePercent, geolocation.staleLocations, geolocation.trackedDevices, geolocation.unknownLocations, risk.missingGeoDevices, hardware.onlineDevices, hardware.staleSync, hardware.totalDevices, locationFreshPercent, patchComplianceAverage, risk.score, risk.totalCritical, risk.totalHigh, risk.totalRiskItems, security.criticalVulnerabilities, serviceDesk.overdueTickets, serviceDesk.pendingTickets, serviceDesk.slaAchievement, taskCompletionPercent, tasks.failedTasks, tasks.latestTaskTime, tasks.runningTasks]);

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
            <th>Lifecycle</th>
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
              <td><LifecycleBadge value={item.osLifecycleStatus} /></td>
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
        <Panel title="Live Operations Pulse" subtitle="New, resolved and open backlog movement from Service Desk API." icon={Activity} className="span-2" action={<div className="itops-pro-legend"><span className="new" /> New <span className="resolved" /> Resolved <span className="open" /> Open</div>}>
          <IncidentTrendChart data={incidentTrend} summary={trendSummary} />
        </Panel>

        <Panel title="Risk Command" subtitle="Severity, category and endpoint lifecycle exposure." icon={ShieldAlert}>
          <button type="button" className="itops-risk-command-summary" onClick={() => openLevel2('risk')}>
            <div className="itops-risk-command-copy">
              <span>Exposure Index</span>
              <strong>{formatNumber(risk.score)}<em>/100</em></strong>
              <small>Weighted from endpoint, patch, network, geo and task exposure. Use the drilldown to see category and lifecycle evidence.</small>
            </div>
            <StatusBadge status={riskStatus(risk.score, 35, 70)} />
            <div className="itops-risk-command-meter" aria-hidden="true"><i style={{ width: `${clampPercent(risk.score)}%` }} /></div>
          </button>

          <div className="itops-risk-severity-grid">
            <button type="button" className="itops-risk-severity itops-risk-severity-critical" onClick={() => openLevel3('risk', 'Critical')}>
              <span>Critical</span>
              <strong>{formatNumber(risk.totalCritical)}</strong>
              <small>Immediate review</small>
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

          <div className="itops-risk-driver-mini">
            <BarList items={risk.categoryBreakdown} limit={4} emptyLabel="No risk driver breakdown returned yet." />
          </div>
          <button type="button" className="itops-pro-link-btn itops-pro-link-btn-risk" onClick={() => openLevel2('risk')}>Review risk evidence <ChevronRight size={15} /></button>
        </Panel>

        <Panel title="Coverage & Data Quality Matrix" subtitle="Source-of-truth confidence by endpoint, software, network, location and automation domain." icon={BarChart3} className="span-2">
          <HealthRadar items={domainHealthForMatrix} onOpen={(view) => openLevel2(view)} />
        </Panel>

        <Panel title="Source of Truth Confidence" subtitle="Shows whether dashboard data is reliable before managers act on it." icon={Gauge}>
          <DataConfidenceCard score={dataConfidenceScore} rows={dataConfidenceRows} onOpen={() => openLevel2('dataConfidence')} />
        </Panel>
      </section>
    </>
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
              <th>Lifecycle</th>
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
                <td><LifecycleBadge value={device.osLifecycleStatus} /></td>
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

  const renderGeoDeviceEvidenceTable = (item = '') => {
    const rows = resolveGeoEvidenceRows(item);
    const isSummaryOnly = rows.length === 0;

    return (
      <div className="itops-pro-table-wrap">
        <table className="itops-pro-table">
          <thead>
            <tr>
              <th>PC / Device</th>
              <th>Device ID</th>
              <th>Platform</th>
              <th>Department</th>
              <th>Location</th>
              <th>Last Seen / Time</th>
              <th>Signal</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 50).map((row, index) => (
              <tr key={`${row.deviceId || row.deviceName}-${row.locationName}-${index}`}>
                <td><strong>{row.deviceName || '-'}</strong></td>
                <td>{row.deviceId || '-'}</td>
                <td>{row.platform || '-'}</td>
                <td>{row.department || '-'}</td>
                <td>{row.locationName || '-'}</td>
                <td>{row.lastSeen || '-'}</td>
                <td><ToneBadge tone={/stale|missing|unknown/i.test(`${row.signal} ${row.status}`) ? 'warning' : 'info'}>{row.signal || row.status || 'Location Record'}</ToneBadge></td>
                <td>{row.reason || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {isSummaryOnly && (
          <EmptyState label="No PC-level geolocation rows were returned by the current dashboard API payload for this selection. Level 2 counts are available, but Level 3 needs device/location row evidence from the API." />
        )}
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
            <IncidentTrendChart data={incidentTrend} summary={trendSummary} showSummaryCards={false} />
          </Panel>
        </div>
      );
    }

    if (view === 'hardware') {
      return (
        <div className="itops-pro-drawer-stack">
          <DrilldownTrace domain="Endpoint Fleet" stage="breakdown" />
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
          <DrilldownTrace domain="Open Incidents" stage="breakdown" />
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
          <DrilldownTrace domain="Critical Risk" stage="breakdown" />
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
          <DrilldownTrace domain="Location Coverage" stage="breakdown" />
          <div className="itops-pro-story-panel"><strong>Location Coverage Breakdown</strong><p>Level 2 is the manager view: it explains why the Location Coverage KPI needs attention. Click any category to open Level 3 PC/device evidence.</p></div>
          <div className="itops-pro-drill-grid">
            <DrillCard icon={MapPin} label="Tracked Devices" value={formatNumber(geolocation.trackedDevices)} note="Click to view PCs with usable location" tone="green" onClick={() => openLevel3('geolocation', 'Tracked Devices')} />
            <DrillCard icon={AlertTriangle} label="Stale Location Records" value={formatNumber(geolocation.staleLocations)} note="Click to view stale device/location records" tone="amber" onClick={() => openLevel3('geolocation', 'Stale Location Records')} />
            <DrillCard icon={ShieldAlert} label="Unknown Locations" value={formatNumber(geolocation.unknownLocations)} note="Click to view devices with unknown location" tone="red" onClick={() => openLevel3('geolocation', 'Unknown Locations')} />
            <DrillCard icon={Database} label="Missing Geo Identity" value={formatNumber(risk.missingGeoDevices)} note="Click to view endpoints missing geo mapping" tone="purple" onClick={() => openLevel3('geolocation', 'Missing Geo Identity')} />
          </div>
          <Panel title="Location Distribution" subtitle="Summary only. Click a location to view the PCs/device records behind that location in Level 3." icon={MapPin}><LocationDistribution items={geolocation.topLocations} onOpen={(name) => openLevel3('geolocation', name)} /></Panel>
          <div className="itops-evidence-note"><strong>Flow:</strong><span>Location KPI → category breakdown → affected PC/device records. Level 2 should not repeat Level 3 tables.</span></div>
        </div>
      );
    }

    if (view === 'dataConfidence') {
      return (
        <div className="itops-pro-drawer-stack">
          <DrilldownTrace domain="Data Confidence" stage="breakdown" />
          <div className="itops-pro-story-panel"><strong>Source of Truth Breakdown</strong><p>Use this view to validate whether managers can trust the dashboard before acting on the KPI cards. Each score translates API coverage, mapping and freshness into an operational confidence signal.</p></div>
          <div className="itops-pro-drill-grid">
            {dataConfidenceRows.map((row) => (
              <DrillCard key={row.name} icon={Gauge} label={row.name} value={formatPercent(row.percent ?? row.value, 0)} note="Open source evidence" tone={healthStatus(row.percent ?? row.value) === 'Healthy' ? 'green' : healthStatus(row.percent ?? row.value) === 'Watch' ? 'amber' : 'red'} onClick={() => openLevel3('dataConfidence', row.name)} />
            ))}
          </div>
          <Panel title="Confidence Drivers" subtitle="Signals used to judge whether the dashboard is ready to be treated as source of truth." icon={BarChart3}><BarList items={dataConfidenceRows} limit={6} /></Panel>
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
      const affectedRows = resolveGeoEvidenceRows(item);
      return (
        <div className="itops-pro-drawer-stack">
          <DrilldownTrace domain="Location Coverage" stage="evidence" selected={selectedLabel} />
          <div className="itops-pro-story-panel level3"><strong>Affected PC / Device Evidence</strong><p>Selected: {selectedLabel}. Level 3 now focuses on the PCs or device records behind the selected location signal, not the same summary cards from Level 2.</p></div>
          <div className="itops-pro-summary-row four">
            <MiniMetric label="Selected Records" value={formatNumber(affectedRows.length)} tone="blue" note="PC/device rows" />
            <MiniMetric label="Tracked Devices" value={formatNumber(geolocation.trackedDevices)} tone="green" note="summary count" />
            <MiniMetric label="Stale Records" value={formatNumber(geolocation.staleLocations)} tone="amber" note="summary count" />
            <MiniMetric label="Missing Geo Identity" value={formatNumber(risk.missingGeoDevices)} tone="purple" note="summary count" />
          </div>
          <Panel title="Affected PCs / Device Records" subtitle="Device-level evidence returned by the API for the selected Location Coverage signal." icon={MapPin}>{renderGeoDeviceEvidenceTable(item)}</Panel>
          <div className="itops-evidence-note"><strong>Next action:</strong><span>For stale records, validate MDM location sync. For missing geo identity, check device-to-location mapping. For unknown locations, inspect raw address fields before escalation.</span></div>
        </div>
      );
    }

    if (view === 'dataConfidence') {
      const selectedRow = dataConfidenceRows.find((row) => row.name === item);
      return (
        <div className="itops-pro-drawer-stack">
          <DrilldownTrace domain="Data Confidence" stage="evidence" selected={selectedLabel} />
          <div className="itops-pro-story-panel level3"><strong>Source Confidence Evidence</strong><p>Selected: {selectedLabel}. This view explains how the dashboard confidence index is translated from API counts into manager-ready source-of-truth signals.</p></div>
          <div className="itops-pro-summary-row four">
            <MiniMetric label="Overall Confidence" value={formatPercent(dataConfidenceScore, 0)} tone="blue" />
            <MiniMetric label="Endpoint Freshness" value={formatPercent(endpointFreshnessPercent, 0)} tone="blue" />
            <MiniMetric label="Location Reliability" value={formatPercent(locationFreshPercent, 0)} tone="green" />
            <MiniMetric label="Network Mapping" value={formatPercent(networkRegistrationPercent, 0)} tone="cyan" />
          </div>
          {selectedRow && <Panel title="Selected Confidence Driver" subtitle="Selected metric calculation result." icon={Gauge}><BarList items={[selectedRow]} limit={1} /></Panel>}
          <Panel title="All Confidence Drivers" subtitle="This is the source-quality layer behind the KPI cards." icon={BarChart3}><BarList items={dataConfidenceRows} limit={6} /></Panel>
          <div className="itops-evidence-note"><strong>How to read this:</strong><span>Low confidence does not always mean operational failure. It means the source data needs refresh, mapping or classification review before the dashboard can be used as final evidence.</span></div>
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
          <p>Professional operations dashboard mapped to the unified IT Operations API.</p>
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
          <button type="button" className="itops-pro-primary-btn" onClick={() => void loadDashboard(true)} disabled={isLoading}>
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
  width: 100%;
  max-width: none;
  height: 100%;
  min-height: 0;
  max-height: 100%;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  margin: 0;
  padding: 14px 14px 18px;
  color: #101828;
  background: linear-gradient(180deg, #f8fbff 0%, #f4f8fc 44%, #eef4fb 100%);
  font-family: var(--ema-font-sans, var(--ema-font-body, "Aptos", "Inter", "Manrope", "Segoe UI", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Arial, sans-serif));
  -webkit-font-smoothing: antialiased;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  -webkit-overflow-scrolling: touch;
}

.itops-pro-page::-webkit-scrollbar { width: 6px; }
.itops-pro-page::-webkit-scrollbar-track { background: rgba(226, 232, 240, 0.55); border-radius: 999px; }
.itops-pro-page::-webkit-scrollbar-thumb { background: rgba(100, 116, 139, 0.65); border-radius: 999px; border: 1px solid rgba(226, 232, 240, 0.55); }
.itops-pro-page::-webkit-scrollbar-thumb:hover { background: rgba(71, 85, 105, 0.78); }

html.itops-dashboard-page-active,
body.itops-dashboard-page-active,
body.itops-dashboard-page-active #root {
  height: 100% !important;
  max-height: 100% !important;
  overflow: hidden !important;
  background: #f4f8fc !important;
}

body.itops-dashboard-page-active .ema-main,
body.itops-dashboard-page-active .ema-content,
body.itops-dashboard-page-active .ema-content-area,
body.itops-dashboard-page-active .app-main,
body.itops-dashboard-page-active .app-content,
body.itops-dashboard-page-active .layout-main,
body.itops-dashboard-page-active .layout-content,
body.itops-dashboard-page-active .main,
body.itops-dashboard-page-active .main-content,
body.itops-dashboard-page-active main {
  min-height: 0 !important;
  overflow: hidden !important;
  background: #f4f8fc !important;
}

body.itops-dashboard-page-active .ema-page,
body.itops-dashboard-page-active .page-content,
body.itops-dashboard-page-active .content,
body.itops-dashboard-page-active .content-area,
body.itops-dashboard-page-active .dashboard-page,
body.itops-dashboard-page-active .dashboard-content,
body.itops-dashboard-page-active .page-container,
body.itops-dashboard-page-active .router-content {
  height: calc(100dvh - 76px) !important;
  max-height: calc(100dvh - 76px) !important;
  min-height: 0 !important;
  overflow: hidden !important;
  padding: 0 !important;
  margin: 0 !important;
  background: #f4f8fc !important;
}

.itops-pro-bg-grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(100, 116, 139, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(100, 116, 139, 0.07) 1px, transparent 1px);
  background-size: 34px 34px;
  mask-image: linear-gradient(180deg, transparent 0%, black 12%, black 78%, transparent 100%);
}

.itops-pro-page > :not(style):not(.itops-pro-bg-grid):not(.itops-pro-modal-overlay) {
  position: relative;
  z-index: 1;
}

.itops-pro-page button,
.itops-pro-page [role="button"],
.itops-pro-kpi,
.itops-pro-insight,
.itops-pro-health,
.itops-pro-queue-row,
.itops-pro-drill-card,
.itops-risk-command-summary,
.itops-risk-severity {
  pointer-events: auto;
}

.itops-pro-page * { box-sizing: border-box; }


.itops-pro-error,
.itops-pro-loading {
  position: relative;
  z-index: 1;
}

.itops-pro-hero {
  position: relative;
  z-index: 1;
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

.itops-pulse-card-grid-extended {
  grid-template-columns: repeat(2, minmax(0, 1fr));
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
  z-index: 3000 !important;
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
  .itops-pro-page { padding: 10px 8px 18px; }
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


.itops-data-confidence {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  min-height: 100%;
  border: 1px solid rgba(37, 99, 235, 0.18);
  border-radius: 24px;
  padding: 16px;
  background: linear-gradient(135deg, #ffffff, #f8fbff);
  text-align: left;
  cursor: pointer;
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.06);
}
.itops-data-confidence-head { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 12px; align-items: center; }
.itops-data-confidence-icon { display: inline-flex; align-items: center; justify-content: center; width: 42px; height: 42px; border-radius: 16px; color: #fff; background: linear-gradient(135deg, #2563eb, #06b6d4); }
.itops-data-confidence-head span { display: block; color: #64748b; font-size: 11px; font-weight: 950; letter-spacing: .07em; text-transform: uppercase; }
.itops-data-confidence-head strong { display: block; margin-top: 2px; color: #0f172a; font-size: 28px; line-height: 1; font-weight: 950; letter-spacing: -0.05em; }
.itops-data-confidence-head small { display: block; margin-top: 5px; color: #64748b; font-size: 11px; font-weight: 750; }
.itops-data-confidence-meter { height: 8px; overflow: hidden; border-radius: 999px; background: #e2e8f0; }
.itops-data-confidence-meter i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #2563eb, #14b8a6, #22c55e); }
.itops-data-confidence-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.itops-data-confidence-grid div { min-width: 0; border: 1px solid rgba(226, 232, 240, .9); border-radius: 14px; padding: 9px 10px; background: rgba(248, 250, 252, .85); }
.itops-data-confidence-grid span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #64748b; font-size: 10px; font-weight: 900; }
.itops-data-confidence-grid strong { display: block; margin-top: 3px; color: #0f172a; font-size: 15px; font-weight: 950; }
.itops-risk-driver-mini { margin-top: 12px; padding: 12px; border: 1px solid rgba(226, 232, 240, .9); border-radius: 18px; background: rgba(248, 250, 252, .78); }
.itops-drill-trace { display: inline-flex; align-items: center; flex-wrap: wrap; gap: 8px; padding: 9px 12px; border: 1px solid rgba(147, 197, 253, .65); border-radius: 999px; background: rgba(239, 246, 255, .88); color: #475569; font-size: 11px; font-weight: 900; }
.itops-drill-trace span { padding: 4px 9px; border-radius: 999px; background: #e2e8f0; color: #64748b; text-transform: uppercase; letter-spacing: .06em; }
.itops-drill-trace span.done { background: #dcfce7; color: #166534; }
.itops-drill-trace span.active { background: #2563eb; color: #fff; }
.itops-drill-trace small { color: #334155; font-weight: 850; }
.itops-location-list { display: grid; gap: 10px; }
.itops-location-list button { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 12px; align-items: center; width: 100%; border: 1px solid rgba(226, 232, 240, .96); border-radius: 16px; padding: 12px 14px; background: #fff; text-align: left; cursor: pointer; }
.itops-location-list button:hover { border-color: rgba(37, 99, 235, .34); box-shadow: 0 10px 24px rgba(15, 23, 42, .07); }
.itops-location-list strong { display: block; color: #0f172a; font-size: 13px; line-height: 1.35; font-weight: 900; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.itops-location-list span { display: block; margin-top: 4px; color: #64748b; font-size: 11px; font-weight: 750; }
.itops-location-list em { font-style: normal; color: #0f172a; font-size: 13px; font-weight: 950; }
.itops-evidence-note { display: flex; gap: 8px; align-items: flex-start; padding: 13px 14px; border: 1px solid rgba(147, 197, 253, .65); border-radius: 18px; background: #eff6ff; color: #334155; }
.itops-evidence-note strong { color: #1d4ed8; font-size: 12px; font-weight: 950; white-space: nowrap; }
.itops-evidence-note span { color: #475569; font-size: 12px; font-weight: 760; line-height: 1.45; }

@media (max-width: 900px) {
  .itops-data-confidence-grid { grid-template-columns: 1fr; }
  .itops-location-list button { grid-template-columns: minmax(0, 1fr) auto; }
  .itops-location-list button svg { display: none; }
}

`;
