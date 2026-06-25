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
  id?: string;
  assetId?: string;
  deviceId?: string;
  source?: string;
  deviceName: string;
  platform: string;
  model: string;
  department: string;
  site?: string;
  ipAddress?: string;
  status?: string;
  lastSeen: string;
  ageSource?: string;
  ageSourceDate?: string;
  pcAgeYears?: number | null;
  pcAgeLabel?: string;
  pcAgingStatus?: string;
  pcAgingSeverity?: Severity | string;
  pcAgingReason?: string;
  hiUpdateTime?: string;
  regDate?: string;
  biosDate: string;
  osName: string;
  riskScore: number;
  riskSeverity?: Severity | string;
  severity?: Severity | string;
  riskSignals?: string[];
  riskCategory?: string;
  reasons: string;
  reason?: string;
  osLifecycleStatus?: string;
  osLifecycleSeverity?: Severity | string;
  osLifecycleCycle?: string;
  osLifecycleEolDate?: string;
  osLifecycleDaysToEol?: number | null;
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
  deviceRiskRows: HardwareRiskDeviceRow[];
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

type HardwareEndpointRow = {
  deviceName: string;
  deviceId?: string;
  source?: string;
  platform?: string;
  osName?: string;
  osBuild?: string;
  model?: string;
  department?: string;
  ipAddress?: string;
  lastSeen?: string;
  status?: string;
  isOnline?: boolean;
  isStale?: boolean;
  riskScore?: number;
  reasons?: string;
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
  endpointRows: HardwareEndpointRow[];
};

type SoftwareLifecycleItem = {
  name: string;
  vendor?: string;
  productKey?: string;
  installs: number;
  uniqueTitles: number;
  lifecycleStatus: string;
  supportStatus?: string;
  latestCycle?: string;
  eolDate?: string;
  eosDate?: string;
  daysToEol?: number | null;
  source?: string;
};

type SoftwareInventoryRow = {
  softwareName: string;
  category: string;
  classification: string;
  productGroup: string;
  deviceId?: string;
  deviceName?: string;
  branch?: string;
  version?: string;
  publisher?: string;
  lastScan?: string;
  lifecycleStatus?: string;
  supportStatus?: string;
  eolDate?: string;
  eosDate?: string;
  riskLevel?: string;
  recommendation?: string;
};

type SoftwareSummary = {
  totalInstallations: number;
  uniqueSoftware: number;
  devicesWithSoftware: number;
  unclassifiedSoftware: number;
  latestScan: string;
  topCategories: BreakdownItem[];
  classificationBreakdown: BreakdownItem[];
  lifecycleWatch: SoftwareLifecycleItem[];
  softwareRows: SoftwareInventoryRow[];
  businessSoftware: number;
  remoteControlSoftware: number;
  antivirusSoftware: number;
  browserSoftware: number;
  gamingSoftware: number;
  eolApplications: number;
  eosApplications: number;
  unsupportedApplications: number;
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
  endpointRows: [],
};

const EMPTY_SOFTWARE_SUMMARY: SoftwareSummary = {
  totalInstallations: 0,
  uniqueSoftware: 0,
  devicesWithSoftware: 0,
  unclassifiedSoftware: 0,
  latestScan: '-',
  topCategories: [],
  classificationBreakdown: [],
  lifecycleWatch: [],
  softwareRows: [],
  businessSoftware: 0,
  remoteControlSoftware: 0,
  antivirusSoftware: 0,
  browserSoftware: 0,
  gamingSoftware: 0,
  eolApplications: 0,
  eosApplications: 0,
  unsupportedApplications: 0,
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
  deviceRiskRows: [],
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
  overview: { title: 'Dashboard Summary', subtitle: 'Current IT summary.' },
  hardware: { title: 'Devices', subtitle: 'Device list, online status, old sync and OS details.' },
  software: { title: 'Software', subtitle: 'Installed software, category and scan status.' },
  network: { title: 'Network', subtitle: 'Known IP, registered device and subnet view.' },
  geolocation: { title: 'Location', subtitle: 'Devices with location and devices that are not mapped yet.' },
  tasks: { title: 'Automation Jobs', subtitle: 'Running, completed, failed jobs and recent task execution.' },
  risk: { title: 'Device Risk', subtitle: 'EOL/EOS and Management Policy score based device risk.' },
  departments: { title: 'Branch', subtitle: 'Branch device, ticket and update status.' },
  serviceDesk: { title: 'Open Tickets', subtitle: 'Open, overdue and SLA status.' },
  patch: { title: 'Security Updates', subtitle: 'Device update status, missing updates and branch scores.' },
  alerts: { title: 'Ticket Alerts', subtitle: 'Ticket records that need follow-up.' },
  attention: { title: 'Exception Details', subtitle: 'Detailed records for follow-up signals.' },
  dataConfidence: { title: 'Data Check', subtitle: 'Freshness and mapping status.' },
};

function resolveApiBaseUrl() {
  const envUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (envUrl) return envUrl.replace(/\/$/, '');

  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    const isFrontendDevServer = ['5173', '5174', '5175', '3000'].includes(port);

    if (isFrontendDevServer) {
      return `${protocol}//${hostname}:3001`;
    }
  }

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
const DRILLDOWN_TABLE_PAGE_SIZE = 10;
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
      reason: firstTextValue(record, ['reason', 'Reason', 'reasons', 'Reasons', 'remark', 'Remark'], signal || defaultSignal || 'Location record'),
      signal,
      latitude: firstRawValue(record, ['latitude', 'Latitude', 'lat', 'Lat']),
      longitude: firstRawValue(record, ['longitude', 'Longitude', 'lng', 'Lng', 'long', 'Long']),
    };
  }).filter((row) => row.deviceName && row.deviceName !== '-');
}

function normalizeHardwareEndpointRows(rows: unknown): HardwareEndpointRow[] {
  if (!Array.isArray(rows)) return [];

  return rows.map((row) => {
    const record = (row || {}) as Record<string, unknown>;
    const lastSeenRaw = firstRawValue(record, ['lastSeen', 'LastSeen', 'connectionTime', 'ConnectionTime', 'DeviceTimeStamp', 'updatedAt', 'UpdatedAt']);
    const status = firstTextValue(record, ['status', 'Status', 'statusLabel', 'StatusLabel', 'connectionStatus', 'ConnectionStatus'], 'Unknown');
    const isOnlineRaw = firstRawValue(record, ['isOnline', 'IsOnline', 'online', 'Online']);
    const isStaleRaw = firstRawValue(record, ['isStale', 'IsStale', 'stale', 'Stale']);
    const statusText = String(status || '').toLowerCase();

    return {
      deviceName: firstTextValue(record, ['deviceName', 'DeviceName', 'computerName', 'ComputerName', 'hostname', 'HostName', 'Object_DeviceID', 'deviceId', 'DeviceID'], '-'),
      deviceId: firstTextValue(record, ['deviceId', 'DeviceID', 'Object_DeviceID', 'assetId', 'AssetID', 'id', 'ID']),
      source: firstTextValue(record, ['source', 'Source', 'sourceType', 'SourceType'], 'Hardware'),
      platform: firstTextValue(record, ['platform', 'Platform', 'osName', 'OSName', 'operatingSystem', 'OperatingSystem'], 'Unknown'),
      osName: firstTextValue(record, ['osName', 'OSName', 'operatingSystem', 'OperatingSystem', 'platform', 'Platform'], 'Unknown'),
      osBuild: firstTextValue(record, ['osBuild', 'OSBuild', 'build', 'Build', 'version', 'Version']),
      model: firstTextValue(record, ['model', 'Model', 'deviceModelName', 'DeviceModelName'], '-'),
      department: firstTextValue(record, ['department', 'Department', 'objectFullName', 'Object_Full_Name', 'Object_Rel_Name', 'branch', 'Branch'], 'Unmapped'),
      ipAddress: firstTextValue(record, ['ipAddress', 'IPAddress', 'IP', 'DeviceIPAddress', 'DeviceLocalIPAddress']),
      lastSeen: lastSeenRaw ? formatDateLabel(lastSeenRaw) : firstTextValue(record, ['lastSeenLabel', 'LastSeenLabel']),
      status,
      isOnline: typeof isOnlineRaw === 'boolean' ? isOnlineRaw : String(isOnlineRaw ?? '').trim() === '1' || statusText.includes('online') || statusText.includes('active') || statusText.includes('connected'),
      isStale: typeof isStaleRaw === 'boolean' ? isStaleRaw : String(isStaleRaw ?? '').trim() === '1',
      riskScore: numberOrFallback(firstRawValue(record, ['riskScore', 'RiskScore', 'score', 'Score']), 0),
      reasons: firstTextValue(record, ['reasons', 'Reasons', 'reason', 'Reason'], 'Inventory record'),
    };
  }).filter((row) => row.deviceName && row.deviceName !== '-');
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? '').trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/[,+|]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeHardwareRiskDeviceRows(rows: unknown): HardwareRiskDeviceRow[] {
  if (!Array.isArray(rows)) return [];

  return rows.map((row) => {
    const record = (row || {}) as Record<string, unknown>;
    const lastSeenRaw = firstRawValue(record, ['lastSeen', 'LastSeen', 'connectionTime', 'ConnectionTime', 'DeviceTimeStamp', 'updatedAt', 'UpdatedAt']);
    const ageSourceDateRaw = firstRawValue(record, ['ageSourceDate', 'AgeSourceDate', 'purchaseDate', 'PurchaseDate', 'regDate', 'RegDate', 'hiUpdateTime', 'HIUpdateTime', 'biosDate', 'BiosDate']);
    const biosDateRaw = firstRawValue(record, ['biosDate', 'BiosDate', 'BIOSDate']);
    const regDateRaw = firstRawValue(record, ['regDate', 'RegDate']);
    const hiUpdateTimeRaw = firstRawValue(record, ['hiUpdateTime', 'HIUpdateTime']);
    const riskSignals = normalizeStringArray(firstRawValue(record, ['riskSignals', 'RiskSignals', 'signals', 'Signals', 'riskCategory', 'RiskCategory', 'category', 'Category']));
    const riskCategory = firstTextValue(record, ['riskCategory', 'RiskCategory', 'category', 'Category'], riskSignals.join(' + '));
    const reasons = firstTextValue(record, ['reasons', 'Reasons', 'reason', 'Reason', 'riskReason', 'RiskReason', 'description', 'Description'], riskCategory || 'Device risk record');
    const osName = firstTextValue(record, ['osName', 'OSName', 'operatingSystem', 'OperatingSystem', 'platform', 'Platform'], 'Unknown');
    const platform = firstTextValue(record, ['platform', 'Platform', 'osName', 'OSName', 'operatingSystem', 'OperatingSystem'], osName);
    const department = firstTextValue(record, ['department', 'Department', 'site', 'Site', 'objectFullName', 'Object_Full_Name', 'Object_Rel_Name', 'branch', 'Branch'], 'Unmapped');

    return {
      id: firstTextValue(record, ['id', 'ID', 'riskId', 'RiskID']),
      assetId: firstTextValue(record, ['assetId', 'AssetID', 'MDM_Asset_Idn', '_Idn']),
      deviceId: firstTextValue(record, ['deviceId', 'DeviceID', 'Object_DeviceID', 'serialNumber', 'SerialNumber']),
      source: firstTextValue(record, ['source', 'Source', 'sourceType', 'SourceType'], 'Hardware'),
      deviceName: firstTextValue(record, ['deviceName', 'DeviceName', 'computerName', 'ComputerName', 'hostname', 'HostName', 'name', 'Name', 'Object_DeviceID'], firstTextValue(record, ['deviceId', 'DeviceID'], '-')),
      platform,
      model: firstTextValue(record, ['model', 'Model', 'deviceModelName', 'DeviceModelName'], '-'),
      department,
      site: firstTextValue(record, ['site', 'Site'], department),
      ipAddress: firstTextValue(record, ['ipAddress', 'IPAddress', 'ip', 'IP', 'DeviceIPAddress', 'DeviceLocalIPAddress']),
      status: firstTextValue(record, ['status', 'Status', 'connectionStatus', 'ConnectionStatus'], 'Unknown'),
      lastSeen: lastSeenRaw ? formatDateLabel(lastSeenRaw) : firstTextValue(record, ['lastSeenLabel', 'LastSeenLabel'], '-'),
      ageSource: firstTextValue(record, ['ageSource', 'AgeSource'], ''),
      ageSourceDate: ageSourceDateRaw ? formatDateLabel(ageSourceDateRaw) : firstTextValue(record, ['ageSourceDateLabel', 'AgeSourceDateLabel'], ''),
      pcAgeYears: (() => {
        const age = firstRawValue(record, ['pcAgeYears', 'PcAgeYears', 'ageYears', 'AgeYears']);
        if (age === undefined || age === null || String(age).trim() === '') return null;
        const parsed = Number(age);
        return Number.isFinite(parsed) ? parsed : null;
      })(),
      pcAgeLabel: firstTextValue(record, ['pcAgeLabel', 'PcAgeLabel', 'ageLabel', 'AgeLabel']),
      pcAgingStatus: firstTextValue(record, ['pcAgingStatus', 'PcAgingStatus', 'agingStatus', 'AgingStatus']),
      pcAgingSeverity: firstTextValue(record, ['pcAgingSeverity', 'PcAgingSeverity', 'agingSeverity', 'AgingSeverity']),
      pcAgingReason: firstTextValue(record, ['pcAgingReason', 'PcAgingReason', 'agingReason', 'AgingReason']),
      hiUpdateTime: hiUpdateTimeRaw ? formatDateLabel(hiUpdateTimeRaw) : firstTextValue(record, ['hiUpdateTimeLabel', 'HIUpdateTimeLabel'], ''),
      regDate: regDateRaw ? formatDateLabel(regDateRaw) : firstTextValue(record, ['regDateLabel', 'RegDateLabel'], ''),
      biosDate: biosDateRaw ? formatDateLabel(biosDateRaw) : firstTextValue(record, ['biosDateLabel', 'BiosDateLabel'], '-'),
      osName,
      riskScore: numberOrFallback(firstRawValue(record, ['riskScore', 'RiskScore', 'score', 'Score', 'policyScore', 'PolicyScore']), 0),
      riskSeverity: firstTextValue(record, ['riskSeverity', 'RiskSeverity', 'severity', 'Severity']),
      severity: firstTextValue(record, ['severity', 'Severity', 'riskSeverity', 'RiskSeverity']),
      riskSignals,
      riskCategory,
      reasons,
      reason: firstTextValue(record, ['reason', 'Reason'], reasons),
      osLifecycleStatus: firstTextValue(record, ['osLifecycleStatus', 'OSLifecycleStatus', 'lifecycleStatus', 'LifecycleStatus']),
      osLifecycleSeverity: firstTextValue(record, ['osLifecycleSeverity', 'OSLifecycleSeverity', 'lifecycleSeverity', 'LifecycleSeverity']),
      osLifecycleCycle: firstTextValue(record, ['osLifecycleCycle', 'OSLifecycleCycle', 'lifecycleCycle', 'LifecycleCycle']),
      osLifecycleEolDate: firstTextValue(record, ['osLifecycleEolDate', 'OSLifecycleEolDate', 'eolDate', 'EolDate', 'EOLDate']),
      osLifecycleDaysToEol: (() => {
        const days = firstRawValue(record, ['osLifecycleDaysToEol', 'OSLifecycleDaysToEol', 'daysToEol', 'DaysToEol']);
        if (days === undefined || days === null || String(days).trim() === '') return null;
        const parsed = Number(days);
        return Number.isFinite(parsed) ? parsed : null;
      })(),
      osLifecycleSource: firstTextValue(record, ['osLifecycleSource', 'OSLifecycleSource', 'lifecycleSource', 'LifecycleSource'], ''),
      osLifecycleBasis: firstTextValue(record, ['osLifecycleBasis', 'OSLifecycleBasis', 'lifecycleBasis', 'LifecycleBasis'], ''),
    };
  }).filter((row) => row.deviceName && row.deviceName !== '-');
}

function uniqueHardwareEndpointRows(rows: HardwareEndpointRow[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = [row.deviceId, row.deviceName, row.source, row.department, row.model].filter(Boolean).join('|').toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function endpointStatusMatches(row: HardwareEndpointRow, label = '') {
  const selected = String(label || '').toLowerCase();
  const status = String(row.status || '').toLowerCase();
  const isOnline = Boolean(row.isOnline) || status.includes('online') || status.includes('active') || status.includes('connected');
  const isStale = Boolean(row.isStale);

  if (!selected || selected.includes('total')) return true;
  if (selected.includes('online')) return isOnline;
  if (selected.includes('offline')) return !isOnline;
  if (selected.includes('stale')) return isStale;
  if (selected.includes('risk')) {
    const reasonText = String(row.reasons || '').toLowerCase();
    return numberOrFallback(row.riskScore) > 0 || isStale || !isOnline || (reasonText !== '' && reasonText !== 'inventory evidence' && reasonText !== 'inventory record');
  }

  return [row.deviceName, row.deviceId, row.department, row.platform, row.osName, row.model, row.source]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase() === selected);
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
    hardware: (() => {
      const hardwareRecord = (data.hardware || {}) as Partial<HardwareSummary> & Record<string, unknown>;
      const endpointRows = uniqueHardwareEndpointRows(normalizeHardwareEndpointRows(readArrayFromRecord(hardwareRecord, ['endpointRows', 'deviceRows', 'devices', 'rows', 'hardwareRows', 'inventoryRows'])));

      return {
        ...EMPTY_HARDWARE_SUMMARY,
        ...hardwareRecord,
        topModels: Array.isArray(hardwareRecord.topModels) ? hardwareRecord.topModels : [],
        platformBreakdown: Array.isArray(hardwareRecord.platformBreakdown) ? hardwareRecord.platformBreakdown : [],
        endpointRows,
      };
    })(),
    software: {
      ...EMPTY_SOFTWARE_SUMMARY,
      ...(data.software || {}),
      topCategories: Array.isArray(data.software?.topCategories) ? data.software.topCategories : [],
      classificationBreakdown: Array.isArray(data.software?.classificationBreakdown) ? data.software.classificationBreakdown : [],
      lifecycleWatch: Array.isArray(data.software?.lifecycleWatch) ? data.software.lifecycleWatch : [],
      softwareRows: Array.isArray(data.software?.softwareRows) ? data.software.softwareRows : [],
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
    risk: (() => {
      const riskRecord = (data.risk || {}) as Partial<RiskSummary> & Record<string, unknown>;
      const deviceRiskRows = normalizeHardwareRiskDeviceRows(readArrayFromRecord(riskRecord, [
        'deviceRiskRows',
        'deviceRiskRecords',
        'riskDeviceRows',
        'riskDevices',
        'hardwareRiskRows',
        'hardwareRiskDevices',
        'affectedDevices',
        'affectedDeviceRows',
        'records',
        'rows',
      ]));

      return {
        ...EMPTY_RISK_SUMMARY,
        ...riskRecord,
        severityBreakdown: Array.isArray(riskRecord.severityBreakdown) ? riskRecord.severityBreakdown : [],
        categoryBreakdown: Array.isArray(riskRecord.categoryBreakdown) ? riskRecord.categoryBreakdown : [],
        osBreakdown: Array.isArray(riskRecord.osBreakdown) ? riskRecord.osBreakdown : [],
        biosAgeBreakdown: Array.isArray(riskRecord.biosAgeBreakdown) ? riskRecord.biosAgeBreakdown : [],
        topFindings: Array.isArray(riskRecord.topFindings) ? riskRecord.topFindings.map((row) => ({ ...row, severity: normalizeSeverity((row as RiskFindingRow).severity) })) : [],
        deviceRiskRows,
      };
    })(),
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

  const dashboardUrl = buildApiUrl(ITOPS_DASHBOARD_API_PATH, { refresh: forceRefresh ? 1 : undefined });
  const response = await fetch(dashboardUrl, {
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
    throw new Error(payload?.error || payload?.message || `Dashboard data failed: ${response.status} (${dashboardUrl})`);
  }

  if (!payload?.data) {
    throw new Error('Dashboard data returned an invalid response.');
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

function EmptyState({ label = 'No live data available yet.' }: { label?: string }) {
  return (
    <div className="itops-pro-empty">
      <Database size={18} />
      <span>{label}</span>
    </div>
  );
}

function getCompactPageNumbers(totalPages: number, currentPage: number) {
  return Array.from({ length: totalPages }, (_, index) => index + 1).filter((page) => {
    if (totalPages <= 5) return true;
    return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
  });
}

function DrilldownTablePagination({
  page,
  totalCount,
  pageSize = DRILLDOWN_TABLE_PAGE_SIZE,
  onPageChange,
}: {
  page: number;
  totalCount: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (totalPages <= 1) return null;

  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize + 1;
  const end = Math.min(totalCount, safePage * pageSize);
  const pages = getCompactPageNumbers(totalPages, safePage);

  return (
    <div className="itops-pro-table-pagination" aria-label="Pagination">
      <span className="itops-pro-table-page-range">{start}-{end} of {formatNumber(totalCount)}</span>
      <div className="itops-pro-table-page-controls">
        <button type="button" disabled={safePage === 1} onClick={() => onPageChange(safePage - 1)}>Prev</button>
        {pages.map((pageNumber, index) => {
          const previousPage = pages[index - 1];
          const needsGap = previousPage && pageNumber - previousPage > 1;
          return (
            <span key={pageNumber} className="itops-pro-table-page-item">
              {needsGap ? <em>...</em> : null}
              <button
                type="button"
                className={pageNumber === safePage ? 'active' : ''}
                onClick={() => onPageChange(pageNumber)}
                aria-current={pageNumber === safePage ? 'page' : undefined}
              >
                {pageNumber}
              </button>
            </span>
          );
        })}
        <button type="button" disabled={safePage === totalPages} onClick={() => onPageChange(safePage + 1)}>Next</button>
      </div>
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
  if (text.includes('confidence') || text.includes('freshness') || text.includes('readiness') || text.includes('data quality')) return 'dataConfidence';
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
  if (view === 'hardware') return 'Check old device data and missing device info';
  if (view === 'software') return 'Check software category and inventory data';
  if (view === 'network') return 'Check unmanaged IP records';
  if (view === 'geolocation') return 'Update missing or old location data';
  if (view === 'tasks') return 'Check failed or delayed jobs';
  if (view === 'dataConfidence') return 'Check data before using this dashboard';
  return 'Review details and assign assignee';
}

function HealthRadar({ items, onOpen }: { items: DomainHealthItem[]; onOpen?: (view: string, item?: string) => void }) {
  const visible = items.slice(0, 6);
  if (!visible.length) return <EmptyState label="No operational domain data available yet." />;

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
              <small>{status === 'Healthy' ? 'Stable signal' : 'Review required'}</small>
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
          <small>Decision readiness</small>
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
      <span className={stage === 'evidence' ? 'active' : ''}>Details</span>
      <small>{domain}{selected ? ` • ${selected}` : ''}</small>
    </div>
  );
}

function LocationDistribution({ items, onOpen }: { items: BreakdownItem[]; onOpen: (name: string) => void }) {
  const visible = items.slice(0, 8);
  if (!visible.length) return <EmptyState label="No location data yet." />;

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
  const [endpointDetailPage, setEndpointDetailPage] = useState(1);
  const [geoDetailPage, setGeoDetailPage] = useState(1);
  const [ticketDetailPage, setTicketDetailPage] = useState(1);
  const [securityUpdateDetailPage, setSecurityUpdateDetailPage] = useState(1);
  const [riskDetailPage, setRiskDetailPage] = useState(1);
  const [softwareDetailPage, setSoftwareDetailPage] = useState(1);

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
    setEndpointDetailPage(1);
    setGeoDetailPage(1);
    setTicketDetailPage(1);
    setSecurityUpdateDetailPage(1);
    setRiskDetailPage(1);
    setSoftwareDetailPage(1);
  }, [activeView]);

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
  const locationSignalTotal = geolocation.trackedDevices + risk.missingGeoDevices;
  const locationFreshPercent = locationSignalTotal > 0 ? (geolocation.trackedDevices / locationSignalTotal) * 100 : 0;
  const openTicketCount = Math.max(0, numberOrFallback(serviceDesk.pendingTickets));
  const overdueTicketCount = Math.max(0, numberOrFallback(serviceDesk.overdueTickets));
  const onTrackTicketCount = Math.max(0, openTicketCount - overdueTicketCount);
  const ticketSlaPercent = clampPercent(serviceDesk.slaAchievement);
  const overdueTicketPercent = openTicketCount > 0 ? (overdueTicketCount / openTicketCount) * 100 : 0;
  const onTrackTicketPercent = openTicketCount > 0 ? (onTrackTicketCount / openTicketCount) * 100 : 0;
  const highTicketSignalCount = activeAlerts.filter((row) => row.severity === 'Critical' || row.severity === 'High').length;
  const ticketPriorityTotal = serviceDesk.priorityBreakdown.reduce((total, row) => total + numberOrFallback(row.value), 0);
  const securityUpdateScore = patchComplianceAverage;
  const securityUpdateTotalDevices = Math.max(0, numberOrFallback(hardware.totalDevices));
  const hasSecurityUpdateScore = patchDepartments.length > 0 && securityUpdateTotalDevices > 0;
  const securityUpdatedDevices = hasSecurityUpdateScore ? Math.min(securityUpdateTotalDevices, Math.round((securityUpdateScore / 100) * securityUpdateTotalDevices)) : 0;
  const securityNeedUpdateDevices = hasSecurityUpdateScore ? Math.max(0, securityUpdateTotalDevices - securityUpdatedDevices) : 0;
  const criticalUpdateIssueCount = Math.max(numberOrFallback(security.criticalVulnerabilities), numberOrFallback(risk.patchCriticalItems));
  const dataConfidenceRows = useMemo<BreakdownItem[]>(() => [
    { name: 'Device Data', value: endpointFreshnessPercent, percent: endpointFreshnessPercent },
    { name: 'Software Data', value: softwareMappingPercent, percent: softwareMappingPercent },
    { name: 'Network Data', value: networkRegistrationPercent, percent: networkRegistrationPercent },
    { name: 'Location Data', value: locationFreshPercent, percent: locationFreshPercent },
    { name: 'Job Status', value: taskCompletionPercent, percent: taskCompletionPercent },
    { name: 'Ticket SLA', value: serviceDesk.slaAchievement, percent: serviceDesk.slaAchievement },
  ], [endpointFreshnessPercent, locationFreshPercent, networkRegistrationPercent, serviceDesk.slaAchievement, softwareMappingPercent, taskCompletionPercent]);
  const dataConfidenceScore = useMemo(() => averagePercent(dataConfidenceRows), [dataConfidenceRows]);
  const deviceRiskRows = useMemo(() => Array.isArray(risk.deviceRiskRows) ? risk.deviceRiskRows : [], [risk.deviceRiskRows]);
  const linkedDeviceRiskCount = deviceRiskRows.length;
  const deviceRiskCount = linkedDeviceRiskCount || Math.max(numberOrFallback(risk.hardwareRiskItems), numberOrFallback(risk.totalRiskItems));
  const deviceRiskScore = useMemo(() => deviceRiskRows.length
    ? Math.max(...deviceRiskRows.map((device) => clampPercent(device.riskScore)))
    : clampPercent(risk.score), [deviceRiskRows, risk.score]);
  const deviceRiskCriticalCount = useMemo(() => {
    if (!deviceRiskRows.length) return numberOrFallback(risk.totalCritical);
    return deviceRiskRows.filter((device) => {
      const severity = String(device.riskSeverity || device.severity || device.osLifecycleSeverity || '').toLowerCase();
      return severity === 'critical' || numberOrFallback(device.riskScore) >= 70;
    }).length;
  }, [deviceRiskRows, risk.totalCritical]);
  const deviceRiskHighCount = useMemo(() => {
    if (!deviceRiskRows.length) return numberOrFallback(risk.totalHigh);
    return deviceRiskRows.filter((device) => {
      const severity = String(device.riskSeverity || device.severity || device.osLifecycleSeverity || '').toLowerCase();
      const score = numberOrFallback(device.riskScore);
      return severity === 'high' || (score >= 40 && score < 70);
    }).length;
  }, [deviceRiskRows, risk.totalHigh]);
  const deviceRiskMediumCount = useMemo(() => {
    if (!deviceRiskRows.length) return numberOrFallback(risk.totalMedium);
    return deviceRiskRows.filter((device) => {
      const severity = String(device.riskSeverity || device.severity || device.osLifecycleSeverity || '').toLowerCase();
      const score = numberOrFallback(device.riskScore);
      return severity === 'medium' || (score >= 20 && score < 40);
    }).length;
  }, [deviceRiskRows, risk.totalMedium]);
  const geoEvidenceRows = useMemo(() => uniqueGeoRows([
    ...geolocation.locationRows,
    ...geolocation.trackedRows,
    ...geolocation.staleRows,
    ...geolocation.unknownRows,
    ...geolocation.missingGeoRows,
  ]), [geolocation.locationRows, geolocation.missingGeoRows, geolocation.staleRows, geolocation.trackedRows, geolocation.unknownRows]);

  const resolveGeoEvidenceRows = useCallback((item = '') => {
    const key = String(item || '').toLowerCase();
    let rows = geoEvidenceRows;

    if (key.includes('tracked') || key.includes('with location')) {
      rows = geolocation.trackedRows.length ? geolocation.trackedRows : geoEvidenceRows.filter((row) => /tracked|usable|fresh/i.test(`${row.signal} ${row.status} ${row.reason}`));
    } else if (key.includes('stale') || key.includes('old location') || key.includes('old data')) {
      rows = geolocation.staleRows.length ? geolocation.staleRows : geoEvidenceRows.filter((row) => /stale|old|expired/i.test(`${row.signal} ${row.status} ${row.reason}`));
    } else if (key.includes('unknown')) {
      rows = geolocation.unknownRows.length ? geolocation.unknownRows : geoEvidenceRows.filter((row) => /unknown|empty|unable/i.test(`${row.locationName} ${row.signal} ${row.status} ${row.reason}`));
    } else if (key.includes('missing geo') || key.includes('missing identity') || key.includes('not mapped') || key.includes('no location')) {
      rows = geolocation.missingGeoRows.length ? geolocation.missingGeoRows : geoEvidenceRows.filter((row) => /missing|identity|mapping/i.test(`${row.signal} ${row.status} ${row.reason}`));
    } else if (item) {
      rows = geoEvidenceRows.filter((row) => row.locationName === item || row.department === item || row.deviceName === item || row.deviceId === item);
    }

    return uniqueGeoRows(rows);
  }, [geoEvidenceRows, geolocation.missingGeoRows, geolocation.staleRows, geolocation.trackedRows, geolocation.unknownRows]);


  const formatLocationStatusLabel = (value?: string) => {
    const text = String(value || '').trim();
    const normalized = text.toLowerCase();
    if (!text) return 'Location Record';
    if (normalized.includes('tracked') || normalized.includes('usable') || normalized.includes('fresh')) return 'With Location';
    if (normalized.includes('stale') || normalized.includes('old') || normalized.includes('expired')) return 'Old Data';
    if (normalized.includes('unknown') || normalized.includes('empty') || normalized.includes('unable')) return 'Unknown';
    if (normalized.includes('missing') || normalized.includes('identity') || normalized.includes('mapping')) return 'Not Mapped';
    return text;
  };

  const formatLocationNote = (value?: string) => {
    return String(value || '-')
      .replace(/Missing Geo Identity/gi, 'Not mapped')
      .replace(/geo identity/gi, 'location map')
      .replace(/geo mapping/gi, 'location mapping')
      .replace(/geolocation/gi, 'location')
      .replace(/stale/gi, 'old');
  };

  const domainHealthForMatrix = useMemo<DomainHealthItem[]>(() => {
    const existing = domainHealth.filter((item) => resolveDomainView(item.name) !== 'dataConfidence').slice(0, 5);
    return [...existing, { name: 'Data Confidence', percent: dataConfidenceScore, color: '#0ea5e9' }];
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
      label: 'Location',
      value: formatNumber(geolocation.trackedDevices),
      note: `${formatNumber(risk.missingGeoDevices)} not mapped • ${formatPercent(locationFreshPercent, 0)} with location`,
      icon: MapPin,
      tone: 'cyan',
      progress: locationFreshPercent,
      status: healthStatus(locationFreshPercent),
      view: 'geolocation',
    },
    {
      id: 'devices',
      label: 'Devices',
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
      label: 'Open Tickets',
      value: formatNumber(serviceDesk.pendingTickets),
      note: `${formatNumber(serviceDesk.overdueTickets)} overdue • ${formatPercent(serviceDesk.slaAchievement, 0)} SLA`,
      icon: Ticket,
      tone: 'red',
      progress: serviceDesk.slaAchievement,
      status: riskStatus(serviceDesk.overdueTickets, 1, 5),
      view: 'serviceDesk',
    },
    {
      id: 'patch',
      label: 'Security Updates',
      value: hasSecurityUpdateScore ? formatPercent(securityUpdateScore, 0) : 'Not Checked',
      note: hasSecurityUpdateScore
        ? `${formatNumber(securityUpdatedDevices)} updated • ${formatNumber(securityNeedUpdateDevices)} need update`
        : `${formatNumber(securityUpdateTotalDevices)} devices not checked`,
      icon: ShieldCheck,
      tone: 'green',
      progress: hasSecurityUpdateScore ? securityUpdateScore : 0,
      status: hasSecurityUpdateScore ? healthStatus(securityUpdateScore) : 'Action',
      view: 'patch',
    },
    {
      id: 'software',
      label: 'Software',
      value: formatNumber(software.uniqueSoftware),
      note: `${formatNumber(software.unclassifiedSoftware)} unclassified • ${formatNumber(software.totalInstallations)} installs`,
      icon: Database,
      tone: 'amber',
      progress: softwareMappingPercent,
      status: healthStatus(softwareMappingPercent),
      view: 'software',
    },
    {
      id: 'risk',
      label: 'Device Risk',
      value: formatNumber(deviceRiskCount),
      note: `${formatNumber(deviceRiskCriticalCount)} critical • ${formatNumber(deviceRiskHighCount)} high`,
      icon: ShieldAlert,
      tone: 'purple',
      progress: deviceRiskScore,
      status: riskStatus(deviceRiskCount, 1, 6),
      view: 'risk',
    },
  ], [endpointOnlinePercent, geolocation.staleLocations, geolocation.trackedDevices, geolocation.unknownLocations, risk.missingGeoDevices, hardware.onlineDevices, hardware.staleSync, hardware.totalDevices, locationFreshPercent, patchComplianceAverage, deviceRiskCount, deviceRiskCriticalCount, deviceRiskHighCount, deviceRiskScore, hasSecurityUpdateScore, securityNeedUpdateDevices, securityUpdateScore, securityUpdateTotalDevices, securityUpdatedDevices, security.criticalVulnerabilities, serviceDesk.overdueTickets, serviceDesk.pendingTickets, serviceDesk.slaAchievement, softwareMappingPercent, software.totalInstallations, software.uniqueSoftware, software.unclassifiedSoftware]);


  const overviewHealthRows = useMemo<BreakdownItem[]>(() => [
    { name: 'Devices Online', value: endpointOnlinePercent, percent: endpointOnlinePercent },
    { name: 'Updates Done', value: hasSecurityUpdateScore ? securityUpdateScore : 0, percent: hasSecurityUpdateScore ? securityUpdateScore : 0 },
    { name: 'Tickets On Track', value: onTrackTicketPercent, percent: onTrackTicketPercent },
    { name: 'Location Ready', value: locationFreshPercent, percent: locationFreshPercent },
    { name: 'Software Mapped', value: softwareMappingPercent, percent: softwareMappingPercent },
    { name: 'Network Mapped', value: networkRegistrationPercent, percent: networkRegistrationPercent },
  ], [endpointOnlinePercent, hasSecurityUpdateScore, locationFreshPercent, networkRegistrationPercent, onTrackTicketPercent, securityUpdateScore, softwareMappingPercent]);



  const endpointTrendRows = useMemo(() => {
    type EndpointTrendRow = {
      label: string;
      online: number;
      offline: number;
      stale: number;
      total: number;
      sortKey: number;
      source: 'history' | 'snapshot';
    };

    const buildSnapshotRow = (): EndpointTrendRow => {
      const total = Math.max(0, numberOrFallback(hardware.totalDevices));
      const online = Math.max(0, numberOrFallback(hardware.onlineDevices));
      const offline = Math.max(0, numberOrFallback(hardware.offlineDevices));
      const stale = Math.max(0, numberOrFallback(hardware.staleSync));

      return {
        label: rangeLabel && rangeLabel !== '-' ? rangeLabel : 'Current',
        online,
        offline,
        stale,
        total: total || online + offline,
        sortKey: Date.now(),
        source: 'snapshot',
      };
    };

    const grouped = new Map<string, EndpointTrendRow>();

    hardware.endpointRows.forEach((device) => {
      const parsed = Date.parse(String(device.lastSeen || ''));
      if (!Number.isFinite(parsed)) return;

      const day = new Date(parsed);
      day.setHours(0, 0, 0, 0);
      const sortKey = day.getTime();
      const label = day.toLocaleDateString('en-MY', { day: '2-digit', month: 'short' });
      const existing = grouped.get(label) || { label, online: 0, offline: 0, stale: 0, total: 0, sortKey, source: 'history' as const };
      const statusText = String(device.status || '').toLowerCase();
      const isOnline = Boolean(device.isOnline) || statusText.includes('online') || statusText.includes('active') || statusText.includes('connected');
      const isStale = Boolean(device.isStale) || statusText.includes('stale') || statusText.includes('old');

      existing.total += 1;
      if (isOnline) existing.online += 1;
      else existing.offline += 1;
      if (isStale) existing.stale += 1;
      grouped.set(label, existing);
    });

    const historyRows = Array.from(grouped.values())
      .filter((row) => row.total > 0)
      .sort((a, b) => a.sortKey - b.sortKey)
      .slice(-5);

    return historyRows.length >= 2 ? historyRows : [buildSnapshotRow()];
  }, [hardware.endpointRows, hardware.offlineDevices, hardware.onlineDevices, hardware.staleSync, hardware.totalDevices, rangeLabel]);

  const endpointTrendMaxTotal = useMemo(() => Math.max(1, ...endpointTrendRows.map((row) => row.total)), [endpointTrendRows]);
  const endpointTrendUsesHistory = endpointTrendRows.some((row) => row.source === 'history');
  const ticketTrendRows = useMemo(() => incidentTrend.slice(-5), [incidentTrend]);
  const ticketTrendMaxTotal = useMemo(() => Math.max(1, ...ticketTrendRows.map((row) => numberOrFallback(row.newIncidents) + numberOrFallback(row.resolved) + numberOrFallback(row.open))), [ticketTrendRows]);

  const overviewBranchRows = useMemo<BreakdownItem[]>(() => {
    const branchSource = departmentRows.length
      ? departmentRows.map((row) => ({ name: row.department, value: row.openIncidents, percent: clampPercent(row.healthScore) }))
      : patchDepartments.map((row) => ({ name: row.name, value: 0, percent: clampPercent(row.percent) }));

    return branchSource
      .filter((row) => row.name)
      .sort((a, b) => clampPercent(a.percent) - clampPercent(b.percent))
      .slice(0, 5);
  }, [departmentRows, patchDepartments]);

  const overviewActionItems = useMemo(() => [
    {
      id: 'overdue-tickets',
      label: 'Overdue Tickets',
      value: overdueTicketCount,
      note: overdueTicketCount > 0 ? 'Check ticket assignee first' : 'No overdue ticket found',
      tone: overdueTicketCount > 0 ? 'red' : 'green',
      icon: Ticket,
      view: 'serviceDesk',
      item: 'Overdue',
    },
    {
      id: 'need-update',
      label: 'Need Update',
      value: securityNeedUpdateDevices,
      note: hasSecurityUpdateScore ? 'Devices that still need update' : 'Update data not checked yet',
      tone: securityNeedUpdateDevices > 0 ? 'amber' : 'green',
      icon: ShieldCheck,
      view: 'patch',
      item: 'Need Update',
    },
    {
      id: 'critical-risk',
      label: 'Device Risk',
      value: deviceRiskCount,
      note: deviceRiskCount > 0 ? 'Review EOL/EOS or policy device risk' : 'No device risk found',
      tone: deviceRiskCriticalCount > 0 ? 'red' : deviceRiskHighCount > 0 ? 'amber' : 'green',
      icon: ShieldAlert,
      view: 'risk',
      item: 'Critical',
    },
    {
      id: 'location-map',
      label: 'Location Mapping',
      value: risk.missingGeoDevices,
      note: risk.missingGeoDevices > 0 ? 'Devices without location mapping' : 'Location mapping looks good',
      tone: risk.missingGeoDevices > 0 ? 'purple' : 'green',
      icon: MapPin,
      view: 'geolocation',
      item: 'Not Mapped',
    },
    {
      id: 'software-review',
      label: 'Software Review',
      value: software.unclassifiedSoftware,
      note: software.unclassifiedSoftware > 0 ? 'Classify software inventory items' : 'Software inventory looks classified',
      tone: software.unclassifiedSoftware > 0 ? 'amber' : 'green',
      icon: Database,
      view: 'software',
      item: 'Unclassified',
    },
  ], [deviceRiskCount, deviceRiskCriticalCount, deviceRiskHighCount, hasSecurityUpdateScore, overdueTicketCount, risk.missingGeoDevices, securityNeedUpdateDevices, software.unclassifiedSoftware]);

  const riskCategoryRows = useMemo<BreakdownItem[]>(() => {
    const apiCategoryRows = Array.isArray(risk.categoryBreakdown)
      ? risk.categoryBreakdown.filter((row) => numberOrFallback(row.value) > 0)
      : [];
    if (apiCategoryRows.length) return apiCategoryRows;

    const apiFindingRows = Array.isArray(risk.topFindings)
      ? risk.topFindings
          .filter((row) => numberOrFallback(row.count) > 0)
          .map((row) => ({ name: row.title || row.module, value: numberOrFallback(row.count), tone: row.severity === 'Critical' ? 'red' : row.severity === 'High' ? 'amber' : 'purple' }))
      : [];
    if (apiFindingRows.length) return apiFindingRows;

    const countByCause = new Map<string, number>();
    deviceRiskRows.forEach((device) => {
      const signals = Array.isArray(device.riskSignals) && device.riskSignals.length
        ? device.riskSignals
        : normalizeStringArray(device.riskCategory || device.reasons || device.osLifecycleStatus || device.pcAgingStatus);

      signals.forEach((signal) => {
        const normalized = signal.toLowerCase();
        let label = signal;
        if (/near/.test(normalized)) label = 'Near EOS';
        else if (/eol|eos|end of life|end of support|unsupported/.test(normalized)) label = 'EOL / EOS';
        else if (/aging monitor|monitor/.test(normalized)) label = 'PC Aging Monitor';
        else if (/aging|pc age/.test(normalized)) label = 'PC Aging';
        else if (/policy|score|management/.test(normalized)) label = 'Management Policy Score';
        countByCause.set(label, (countByCause.get(label) || 0) + 1);
      });
    });

    return [...countByCause.entries()]
      .map(([name, value]) => ({ name, value, tone: name.includes('EOL') || name.includes('Aging') ? 'red' : name.includes('Near') || name.includes('Monitor') ? 'amber' : 'purple' }))
      .filter((row) => row.value > 0);
  }, [deviceRiskRows, risk.categoryBreakdown, risk.topFindings]);

  const riskSeverityRows = useMemo<BreakdownItem[]>(() => {
    const apiSeverityRows = Array.isArray(risk.severityBreakdown)
      ? risk.severityBreakdown.filter((row) => numberOrFallback(row.value) > 0)
      : [];
    if (apiSeverityRows.length) return apiSeverityRows;

    return [
      { name: 'Critical', value: deviceRiskCriticalCount, tone: 'red' },
      { name: 'High', value: deviceRiskHighCount, tone: 'amber' },
      { name: 'Medium', value: deviceRiskMediumCount, tone: 'yellow' },
    ].filter((row) => row.value > 0);
  }, [deviceRiskCriticalCount, deviceRiskHighCount, deviceRiskMediumCount, risk.severityBreakdown]);


  const resolveTicketRows = useCallback((item = '') => {
    const selected = String(item || '').trim().toLowerCase();
    if (!selected) return activeAlerts;

    return activeAlerts.filter((row) => {
      const statusText = String(row.status || '').toLowerCase();
      const toneText = String(row.tone || '').toLowerCase();
      const severityText = String(row.severity || '').toLowerCase();
      const rowText = [row.alert, row.system, row.owner, row.status, row.severity].filter(Boolean).join(' ').toLowerCase();

      if (selected.includes('need action')) return ['critical', 'high'].includes(severityText) || ['danger', 'warning'].includes(toneText) || /overdue|late|breach/i.test(statusText);
      if (selected.includes('overdue')) return /overdue|late|breach/i.test(statusText) || toneText === 'danger';
      if (selected.includes('on track') || selected.includes('healthy')) return !/overdue|late|breach/i.test(statusText) && toneText !== 'danger';
      if (selected.includes('priority')) return ['critical', 'high'].includes(severityText);
      if (selected.includes('sla')) return toneText !== 'danger' && !/overdue|late|breach/i.test(statusText);
      if (['critical', 'high', 'medium', 'low'].includes(selected)) return severityText === selected;
      return rowText.includes(selected);
    });
  }, [activeAlerts]);

  const renderServiceDeskTable = () => (
    <div className="itops-pro-table-wrap">
      <table className="itops-pro-table">
        <thead>
          <tr>
            <th>Severity</th>
            <th>Ticket / Alert</th>
            <th>System</th>
            <th>Assignee</th>
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
      {!activeAlerts.length && <EmptyState label="No ticket records returned." />}
    </div>
  );

  const renderDepartmentTable = () => (
    <div className="itops-pro-table-wrap">
      <table className="itops-pro-table">
        <thead>
          <tr>
            <th>Branch</th>
            <th>Assets</th>
            <th>Update</th>
            <th>Open Tickets</th>
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
      {!risk.topFindings.length && <EmptyState label="No operational risk findings available." />}
    </div>
  );

  const renderEndpointRiskTable = () => (
    <div className="itops-pro-table-wrap">
      <table className="itops-pro-table">
        <thead>
          <tr>
            <th>Device</th>
            <th>Platform</th>
            <th>Branch</th>
            <th>Last Seen</th>
            <th>Risk</th>
            <th>Lifecycle</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          {deviceRiskRows.slice(0, 8).map((item) => (
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
      {!deviceRiskRows.length && <EmptyState label="No device risk records returned." />}
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
      <section className="itops-pro-kpi-grid itops-main-kpi-grid">
        {focusCards.map((card) => <KpiCard key={card.id} card={card} onOpen={openLevel2} />)}
      </section>

      <section className="itops-main-overview-grid">
        <Panel title="Operational Trends" subtitle="Analytics style view for devices, tickets and execution." icon={Gauge} className="span-2 main-today-panel main-analytics-panel">
          <div className="itops-analytics-dashboard">
            <button type="button" className="itops-analytics-chart-card device" onClick={() => openLevel2('hardware')}>
              <div className="itops-analytics-card-head">
                <div>
                  <span>Device Availability</span>
                  <strong>{formatNumber(hardware.totalDevices)} devices</strong>
                  <small>{endpointTrendUsesHistory ? 'Last seen trend' : 'Current snapshot'}</small>
                </div>
                <b>{formatPercent(endpointOnlinePercent, 0)} online</b>
              </div>
              <div className="itops-analytics-stat-row">
                <span className="online">{formatNumber(hardware.onlineDevices)} online</span>
                <span className="offline">{formatNumber(hardware.offlineDevices)} offline</span>
                <span className="stale">{formatNumber(hardware.staleSync)} old data</span>
              </div>
              <div className="itops-availability-donut-layout">
                {(() => {
                  const totalDevices = Math.max(0, numberOrFallback(hardware.totalDevices) || numberOrFallback(hardware.onlineDevices) + numberOrFallback(hardware.offlineDevices));
                  const onlineDevices = Math.max(0, numberOrFallback(hardware.onlineDevices));
                  const offlineDevices = Math.max(0, numberOrFallback(hardware.offlineDevices));
                  const safeTotal = Math.max(1, totalDevices || onlineDevices + offlineDevices);
                  const onlinePercentValue = (onlineDevices / safeTotal) * 100;
                  const offlinePercentValue = (offlineDevices / safeTotal) * 100;
                  const donutCircumference = 339.292;
                  const onlineDash = (clampPercent(onlinePercentValue) / 100) * donutCircumference;
                  const offlineDash = (clampPercent(offlinePercentValue) / 100) * donutCircumference;

                  return (
                    <div className="itops-availability-donut-card" title={`${formatNumber(onlineDevices)} online • ${formatNumber(offlineDevices)} offline • ${formatNumber(hardware.staleSync)} old data`}>
                      <svg viewBox="0 0 160 160" role="img" aria-label="Online and offline devices donut chart">
                        <circle className="base" cx="80" cy="80" r="54" />
                        <circle
                          className="online"
                          cx="80"
                          cy="80"
                          r="54"
                          strokeDasharray={`${onlineDash} ${donutCircumference}`}
                          strokeDashoffset="0"
                        >
                          <title>{`${formatNumber(onlineDevices)} online device(s) • ${formatPercent(onlinePercentValue, 0)}`}</title>
                        </circle>
                        <circle
                          className="offline"
                          cx="80"
                          cy="80"
                          r="54"
                          strokeDasharray={`${offlineDash} ${donutCircumference}`}
                          strokeDashoffset={`-${onlineDash}`}
                        >
                          <title>{`${formatNumber(offlineDevices)} offline device(s) • ${formatPercent(offlinePercentValue, 0)}`}</title>
                        </circle>
                      </svg>
                      <div className="itops-availability-donut-center">
                        <strong>{formatPercent(onlinePercentValue, 0)}</strong>
                        <span>online</span>
                      </div>
                      <div className="itops-availability-donut-hover">
                        <b>Current device status</b>
                        <span>{formatNumber(onlineDevices)} online</span>
                        <span>{formatNumber(offlineDevices)} offline</span>
                        <span>{formatNumber(hardware.staleSync)} old data</span>
                      </div>
                    </div>
                  );
                })()}

                <div className="itops-availability-donut-side">
                  <div className="itops-availability-donut-legend">
                    <span className="online"><i /> Online</span>
                    <span className="offline"><i /> Offline</span>
                    <span className="stale"><i /> Old data</span>
                  </div>

                  <div className="itops-availability-trend-list">
                    {endpointTrendRows.map((row) => {
                      const safeRowTotal = Math.max(1, row.total);
                      const onlineWidth = (row.online / safeRowTotal) * 100;
                      const offlineWidth = (row.offline / safeRowTotal) * 100;
                      const staleWidth = (row.stale / safeRowTotal) * 100;

                      return (
                        <div key={`device-donut-trend-${row.label}`} className="itops-availability-trend-row">
                          <div>
                            <strong>{row.label}</strong>
                            <span>{formatNumber(row.total)} device{row.total === 1 ? '' : 's'}</span>
                          </div>
                          <em>
                            <i className="online" style={{ width: `${clampPercent(onlineWidth)}%` }} />
                            <i className="offline" style={{ width: `${clampPercent(offlineWidth)}%` }} />
                            <i className="stale" style={{ width: `${clampPercent(staleWidth)}%` }} />
                          </em>
                          <b>{formatNumber(row.online)}/{formatNumber(row.total)}</b>
                          <span className="itops-availability-row-hover">
                            {row.label}: {formatNumber(row.online)} online, {formatNumber(row.offline)} offline, {formatNumber(row.stale)} old data
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </button>

            <button type="button" className="itops-analytics-chart-card ticket" onClick={() => openLevel2('serviceDesk')}>
              <div className="itops-analytics-card-head">
                <div>
                  <span>Ticket Movement</span>
                  <strong>{formatNumber(trendSummary.openBacklog)} open backlog</strong>
                  <small>{ticketTrendRows.length ? `${ticketTrendRows.length} day trend` : 'No history yet'}</small>
                </div>
                <b>{formatNumber(trendSummary.newIncidents)} new</b>
              </div>
              <div className="itops-analytics-stat-row">
                <span className="new">{formatNumber(trendSummary.newIncidents)} new</span>
                <span className="resolved">{formatNumber(trendSummary.resolved)} closed</span>
                <span className="open">{formatNumber(trendSummary.openBacklog)} open</span>
              </div>
              <div className="itops-modern-column-chart ticket" aria-label="Ticket movement chart">
                {ticketTrendRows.length ? ticketTrendRows.map((row) => {
                  const newCount = numberOrFallback(row.newIncidents);
                  const resolvedCount = numberOrFallback(row.resolved);
                  const openCount = numberOrFallback(row.open);
                  const total = newCount + resolvedCount + openCount;
                  const newHeight = ticketTrendMaxTotal > 0 ? (newCount / ticketTrendMaxTotal) * 100 : 0;
                  const resolvedHeight = ticketTrendMaxTotal > 0 ? (resolvedCount / ticketTrendMaxTotal) * 100 : 0;
                  const openHeight = ticketTrendMaxTotal > 0 ? (openCount / ticketTrendMaxTotal) * 100 : 0;
                  return (
                    <div key={`ticket-chart-${row.day}`} className="itops-modern-column">
                      <div className="itops-modern-column-stack">
                        {newCount > 0 && <i className="new" style={{ height: `${Math.max(8, clampPercent(newHeight))}%` }} />}
                        {resolvedCount > 0 && <i className="resolved" style={{ height: `${Math.max(8, clampPercent(resolvedHeight))}%` }} />}
                        {openCount > 0 && <i className="open" style={{ height: `${Math.max(8, clampPercent(openHeight))}%` }} />}
                        {total <= 0 && <i className="empty" style={{ height: '8%' }} />}
                      </div>
                      <span>{row.day}</span>
                      <strong>{formatNumber(total)}</strong>
                    </div>
                  );
                }) : <div className="itops-analytics-empty-chart"><Database size={18} /><span>No ticket movement found yet.</span></div>}
              </div>
            </button>

            <div className="itops-analytics-mini-grid">
              <button type="button" className="itops-analytics-mini blue" onClick={() => openLevel2('patch')}>
                <span>Updates Done</span><strong>{formatPercent(hasSecurityUpdateScore ? securityUpdateScore : 0, 0)}</strong><small>{formatNumber(securityUpdatedDevices)} device(s) updated</small>
              </button>
              <button type="button" className="itops-analytics-mini amber" onClick={() => openLevel2('serviceDesk')}>
                <span>Tickets On Track</span><strong>{formatPercent(onTrackTicketPercent, 0)}</strong><small>{formatNumber(onTrackTicketCount)} currently on SLA</small>
              </button>
              <button type="button" className="itops-analytics-mini green" onClick={() => openLevel2('tasks')}>
                <span>Jobs Completed</span><strong>{formatPercent(taskCompletionPercent, 0)}</strong><small>{formatNumber(tasks.completedTasks)} completed jobs</small>
              </button>
              <button type="button" className="itops-analytics-mini orange" onClick={() => openLevel2('geolocation')}>
                <span>Location Ready</span><strong>{formatPercent(locationFreshPercent, 0)}</strong><small>{formatNumber(geolocation.trackedDevices)} tracked devices</small>
              </button>
            </div>
          </div>
        </Panel>

        <Panel title="Need Action" subtitle="Main items to check first." icon={AlertTriangle} className="main-action-panel">
          <div className="itops-main-action-list">
            {overviewActionItems.map((action) => {
              const Icon = action.icon;
              return (
                <button type="button" key={action.id} className={`itops-main-action-row ${action.tone}`} onClick={() => openLevel3(action.view, action.item)}>
                  <span><Icon size={17} /></span>
                  <div>
                    <strong>{action.label}</strong>
                    <small>{action.note}</small>
                  </div>
                  <b>{formatNumber(action.value)}</b>
                </button>
              );
            })}
          </div>
        </Panel>
      </section>

      <section className="itops-pro-command-grid itops-main-command-grid itops-main-filled-grid">
        <Panel title="Branch Check" subtitle="Compact branch score view." icon={Users} className="main-branch-filled-panel">
          <div className="itops-main-branch-list">
            {overviewBranchRows.map((row) => {
              const percent = clampPercent(row.percent ?? row.value);
              return (
                <button type="button" key={`main-branch-${row.name}`} className={`itops-main-branch-row ${healthStatus(percent).toLowerCase()}`} onClick={() => openLevel3('departments', row.name)}>
                  <div>
                    <strong>{row.name}</strong>
                    <span>{row.value > 0 ? `${formatNumber(row.value)} open ticket(s)` : 'Branch score'}</span>
                  </div>
                  <em>{formatPercent(percent, 0)}</em>
                </button>
              );
            })}
            {!overviewBranchRows.length && <EmptyState label="No branch score yet." />}
          </div>
        </Panel>

        <Panel title="Decision Signals" subtitle="One-row health signals without repeating big panels." icon={Gauge} className="span-2 main-decision-panel">
          <div className="itops-main-decision-grid">
            <button type="button" className="itops-main-decision-card blue" onClick={() => openLevel2('overview')}>
              <span>Overall Health</span><strong>{formatPercent(overallHealth, 0)}</strong><small>{healthStatus(overallHealth)}</small>
            </button>
            <button type="button" className="itops-main-decision-card cyan" onClick={() => openLevel2('dataConfidence')}>
              <span>Data Confidence</span><strong>{formatPercent(dataConfidenceScore, 0)}</strong><small>Decision readiness</small>
            </button>
            <button type="button" className="itops-main-decision-card purple" onClick={() => openLevel2('network')}>
              <span>Network Mapped</span><strong>{formatPercent(networkRegistrationPercent, 0)}</strong><small>{formatNumber(network.registeredDevices)} registered IP(s)</small>
            </button>
            <button type="button" className="itops-main-decision-card red" onClick={() => openLevel2('risk')}>
              <span>Device Risk</span><strong>{formatNumber(deviceRiskCount)}</strong><small>{formatNumber(deviceRiskCriticalCount)} critical</small>
            </button>
            <button type="button" className="itops-main-decision-card amber" onClick={() => openLevel2('serviceDesk')}>
              <span>Open Tickets</span><strong>{formatNumber(openTicketCount)}</strong><small>{formatNumber(overdueTicketCount)} overdue</small>
            </button>
            <button type="button" className="itops-main-decision-card green" onClick={() => openLevel2('software')}>
              <span>Software Mapped</span><strong>{formatPercent(softwareMappingPercent, 0)}</strong><small>{formatNumber(software.uniqueSoftware)} software • {formatNumber(software.unclassifiedSoftware)} unclassified</small>
            </button>
          </div>
        </Panel>
      </section>
    </>
  );
  const renderBreakdownDrillCards = (items: BreakdownItem[], view: string, emptyLabel = 'No breakdown data yet.') => {
    if (!items.length) return <EmptyState label={emptyLabel} />;

    return (
      <div className="itops-pro-drill-grid compact square">
        {items.slice(0, 10).map((item) => (
          <DrillCard
            key={`${view}-${item.name}`}
            icon={ChevronRight}
            label={item.name}
            value={item.percent === undefined ? formatNumber(item.value) : formatPercent(item.percent)}
            note="Open details"
            tone="slate"
            onClick={() => openLevel3(view, item.name)}
          />
        ))}
      </div>
    );
  };

  const getSoftwareLifecycleTone = (item: SoftwareLifecycleItem): CardTone => {
    const text = `${item.lifecycleStatus || ''} ${item.supportStatus || ''}`.toLowerCase();
    const days = item.daysToEol;
    if (text.includes('eol') || text.includes('eos') || text.includes('expired') || text.includes('unsupported')) return 'red';
    if (typeof days === 'number' && days >= 0 && days <= 365) return 'amber';
    if (text.includes('near') || text.includes('review')) return 'amber';
    if (text.includes('supported') || text.includes('active')) return 'green';
    return 'slate';
  };

  const getSoftwareRiskTone = (risk?: string): StatusTone => {
    const text = String(risk || '').toLowerCase();
    if (text.includes('critical') || text.includes('high')) return 'danger';
    if (text.includes('medium') || text.includes('review') || text.includes('near')) return 'warning';
    if (text.includes('low') || text.includes('supported') || text.includes('approved')) return 'success';
    return 'neutral';
  };

  const renderSoftwareLifecycleCards = () => {
    const rows = Array.isArray(software.lifecycleWatch) ? software.lifecycleWatch : [];

    if (!rows.length) {
      return <EmptyState label="No application lifecycle records returned by backend yet." />;
    }

    return (
      <div className="itops-pro-drill-grid compact">
        {rows.map((row) => {
          const dateText = row.eolDate || row.eosDate || '-';
          const daysText = typeof row.daysToEol === 'number'
            ? row.daysToEol < 0
              ? `${Math.abs(row.daysToEol)} days past`
              : `${row.daysToEol} days left`
            : 'Lifecycle date pending';

          return (
            <DrillCard
              key={row.productKey || row.name}
              icon={CalendarDays}
              label={row.name}
              value={formatNumber(row.installs)}
              note={`${row.lifecycleStatus || 'Lifecycle'} • ${dateText} • ${daysText}`}
              tone={getSoftwareLifecycleTone(row)}
              onClick={() => openLevel3('software', row.name)}
            />
          );
        })}
      </div>
    );
  };

  const resolveSoftwareEvidenceRows = (item = '') => {
    const selected = String(item || '').trim().toLowerCase();
    const rows = Array.isArray(software.softwareRows) ? software.softwareRows : [];

    if (!selected || selected.includes('install') || selected.includes('unique software')) return rows;

    return rows.filter((row) => {
      const values = [
        row.softwareName,
        row.category,
        row.classification,
        row.productGroup,
        row.deviceName,
        row.branch,
        row.lifecycleStatus,
        row.supportStatus,
        row.riskLevel,
      ].map((value) => String(value || '').toLowerCase());

      if (selected.includes('unclassified')) return values.some((value) => value.includes('unclassified'));
      if (selected.includes('business')) return values.some((value) => value.includes('business'));
      if (selected.includes('remote')) return values.some((value) => value.includes('remote'));
      if (selected.includes('antivirus') || selected.includes('anti-virus')) return values.some((value) => value.includes('antivirus') || value.includes('anti-virus') || value.includes('endpoint protection'));
      if (selected.includes('browser') || selected.includes('web')) return values.some((value) => value.includes('browser') || value.includes('chrome') || value.includes('firefox') || value.includes('edge'));
      if (selected.includes('gaming') || selected.includes('games')) return values.some((value) => value.includes('game') || value.includes('gaming'));
      if (selected.includes('eol') || selected.includes('eos') || selected.includes('unsupported')) {
        return values.some((value) => value.includes('eol') || value.includes('eos') || value.includes('unsupported') || value.includes('expired'));
      }

      return values.some((value) => value === selected || value.includes(selected));
    });
  };

  const renderSoftwareInventoryTable = (item = '') => {
    const rows = resolveSoftwareEvidenceRows(item);
    const totalRows = rows.length;
    const pageSize = DRILLDOWN_TABLE_PAGE_SIZE;
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    const safePage = Math.min(Math.max(softwareDetailPage, 1), totalPages);
    const visibleRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize);

    return (
      <div className="itops-pro-table-wrap">
        <table className="itops-pro-table">
          <thead>
            <tr>
              <th>Software</th>
              <th>Category</th>
              <th>Device</th>
              <th>Branch</th>
              <th>Lifecycle</th>
              <th>EOL/EOS</th>
              <th>Risk</th>
              <th>Recommendation</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, index) => (
              <tr key={`${row.softwareName}-${row.deviceId || row.deviceName || index}-${index}`}>
                <td><strong>{row.softwareName || '-'}</strong><small>{row.version || row.publisher || ''}</small></td>
                <td>{row.classification || row.category || '-'}</td>
                <td>{row.deviceName || row.deviceId || '-'}</td>
                <td>{row.branch || '-'}</td>
                <td><ToneBadge tone={getSoftwareRiskTone(row.lifecycleStatus)}>{row.lifecycleStatus || '-'}</ToneBadge></td>
                <td>{row.eolDate || row.eosDate || '-'}</td>
                <td><ToneBadge tone={getSoftwareRiskTone(row.riskLevel)}>{row.riskLevel || 'Review'}</ToneBadge></td>
                <td>{row.recommendation || 'Review software classification and lifecycle evidence.'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <EmptyState label="No software records matched this selection." />}
        <DrilldownTablePagination page={safePage} totalCount={totalRows} pageSize={pageSize} onPageChange={setSoftwareDetailPage} />
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
              <th>Branch</th>
              <th>Assets</th>
              <th>Update</th>
              <th>Open Tickets</th>
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


  const renderSecurityUpdateBranchTable = (level: 'level2' | 'level3', item = '') => {
    const selected = String(item || '').trim().toLowerCase();
    const rows = selected && !['updated', 'need update', 'security updates', 'average patch'].includes(selected)
      ? filteredDepartments.filter((row) => row.department.toLowerCase() === selected)
      : filteredDepartments;

    return (
      <div className="itops-pro-table-wrap">
        <table className="itops-pro-table">
          <thead>
            <tr>
              <th>Branch</th>
              <th>Update Score</th>
              <th>Open Tickets</th>
              <th>Status</th>
              <th>Next</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, level === 'level3' ? 20 : 10).map((row) => (
              <tr
                key={`security-update-${row.department}`}
                className={level === 'level2' ? 'itops-pro-clickable-row' : ''}
                onClick={level === 'level2' ? () => openLevel3('patch', row.department) : undefined}
              >
                <td><strong>{row.department}</strong></td>
                <td>{formatPercent(row.patchCompliance)}</td>
                <td>{formatNumber(row.openIncidents)}</td>
                <td><StatusBadge status={healthStatus(row.patchCompliance)} /></td>
                <td>{level === 'level2' ? <ChevronRight size={15} /> : <ToneBadge tone={row.patchCompliance < 75 ? 'warning' : 'success'}>{row.patchCompliance < 75 ? 'Need Update' : 'Updated'}</ToneBadge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <EmptyState label="No branch update score yet." />}
      </div>
    );
  };

  const getBranchUpdateScore = useCallback((branchName = '') => {
    const selected = String(branchName || '').trim().toLowerCase();
    const branchScore = patchDepartments.find((row) => row.name.toLowerCase() === selected)?.percent;
    const departmentScore = departmentRows.find((row) => row.department.toLowerCase() === selected)?.patchCompliance;
    const score = branchScore ?? departmentScore ?? securityUpdateScore;
    return clampPercent(score);
  }, [departmentRows, patchDepartments, securityUpdateScore]);

  const resolveSecurityUpdateDeviceRows = useCallback((item = '') => {
    const selected = String(item || '').trim().toLowerCase();
    const isUpdatedFilter = selected === 'updated';
    const isNeedUpdateFilter = selected === 'need update' || selected === 'need updates';
    const isGeneralFilter = !selected || ['security updates', 'average patch', 'all devices'].includes(selected) || isUpdatedFilter || isNeedUpdateFilter;
    const branchMatchedRows = isGeneralFilter
      ? hardware.endpointRows
      : hardware.endpointRows.filter((row) => {
        const branchText = String(row.department || '').toLowerCase();
        return branchText === selected || branchText.includes(selected) || selected.includes(branchText);
      });
    const baseRows = branchMatchedRows.length ? branchMatchedRows : hardware.endpointRows;
    const branchScore = isGeneralFilter ? securityUpdateScore : getBranchUpdateScore(item);
    const updatedTarget = hasSecurityUpdateScore ? Math.min(baseRows.length, Math.round((branchScore / 100) * baseRows.length)) : 0;
    const needUpdateTarget = hasSecurityUpdateScore ? Math.max(0, baseRows.length - updatedTarget) : baseRows.length;

    const scoredRows = baseRows
      .map((device, index) => {
        const statusText = String(device.status || '').toLowerCase();
        const reasonText = String(device.reasons || '').toLowerCase();
        const priorityScore = (device.isStale ? 40 : 0)
          + (!device.isOnline ? 25 : 0)
          + numberOrFallback(device.riskScore)
          + (statusText.includes('offline') ? 10 : 0)
          + (reasonText.includes('risk') || reasonText.includes('old') || reasonText.includes('stale') ? 10 : 0);
        return { device, index, priorityScore };
      })
      .sort((a, b) => b.priorityScore - a.priorityScore || a.index - b.index);

    const needUpdateKeys = new Set(scoredRows.slice(0, needUpdateTarget).map((row) => row.index));

    return baseRows
      .map((device, index) => {
        const updateStatus = hasSecurityUpdateScore
          ? needUpdateKeys.has(index) ? 'Need Update' : 'Updated'
          : 'Not Checked';
        return {
          ...device,
          updateStatus,
          updateScore: branchScore,
          updateSource: isGeneralFilter ? 'Overall score' : 'Branch score',
        } as HardwareEndpointRow & { updateStatus: string; updateScore: number; updateSource: string };
      })
      .filter((device) => {
        if (isUpdatedFilter) return device.updateStatus === 'Updated';
        if (isNeedUpdateFilter) return device.updateStatus === 'Need Update';
        return true;
      });
  }, [getBranchUpdateScore, hardware.endpointRows, hasSecurityUpdateScore, securityUpdateScore]);

  const renderSecurityUpdateDeviceTable = (item = '') => {
    const rows = resolveSecurityUpdateDeviceRows(item);
    const pageSize = DRILLDOWN_TABLE_PAGE_SIZE;
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    const safePage = Math.min(Math.max(securityUpdateDetailPage, 1), totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const pageRows = rows.slice(startIndex, startIndex + pageSize);

    return (
      <div className="itops-pro-table-wrap">
        <table className="itops-pro-table">
          <thead>
            <tr>
              <th>Device</th>
              <th>Branch</th>
              <th>OS</th>
              <th>IP</th>
              <th>Last Seen</th>
              <th>Update Status</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((device, index) => (
              <tr key={`security-update-device-${device.deviceId || device.deviceName}-${startIndex + index}`}>
                <td><strong>{device.deviceName || '-'}</strong><span className="itops-pro-muted-block">{device.deviceId || '-'}</span></td>
                <td>{device.department || 'Unmapped'}</td>
                <td><strong>{device.osName || device.platform || '-'}</strong><span className="itops-pro-muted-block">{device.osBuild || ''}</span></td>
                <td>{device.ipAddress || '-'}</td>
                <td>{device.lastSeen || '-'}</td>
                <td><ToneBadge tone={device.updateStatus === 'Updated' ? 'success' : device.updateStatus === 'Need Update' ? 'warning' : 'neutral'}>{device.updateStatus}</ToneBadge></td>
                <td><strong>{formatPercent(device.updateScore, 1)}</strong><span className="itops-pro-muted-block">{device.updateSource}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <EmptyState label="No device records available for this update selection." />}
        <DrilldownTablePagination page={safePage} totalCount={rows.length} pageSize={pageSize} onPageChange={setSecurityUpdateDetailPage} />
      </div>
    );
  };

  const renderAlertDrillTable = (level: 'level2' | 'level3', item = '') => {
    const rows = resolveTicketRows(item);
    const pageSize = level === 'level3' ? 10 : 8;
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    const safePage = Math.min(Math.max(ticketDetailPage, 1), totalPages);
    const visibleRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize);

    return (
      <div className="itops-pro-table-wrap">
        <table className="itops-pro-table">
          <thead>
            <tr>
              <th>Priority</th>
              <th>Ticket / Alert</th>
              <th>Device / System</th>
              <th>Assignee</th>
              <th>Status</th>
              <th>Next</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, index) => (
              <tr
                key={`${row.alert}-${safePage}-${index}`}
                className={level === 'level2' ? 'itops-pro-clickable-row' : ''}
                onClick={level === 'level2' ? () => openLevel3('alerts', row.alert) : undefined}
              >
                <td><SeverityBadge severity={row.severity} /></td>
                <td><strong>{row.alert}</strong></td>
                <td>{row.system || '-'}</td>
                <td>{row.owner || '-'}</td>
                <td><ToneBadge tone={row.tone}>{row.status || '-'}</ToneBadge></td>
                <td>{level === 'level2' ? <ChevronRight size={15} /> : <ToneBadge tone="info">Details</ToneBadge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <EmptyState label="No ticket records returned." />}
        <DrilldownTablePagination page={safePage} totalCount={rows.length} pageSize={pageSize} onPageChange={setTicketDetailPage} />
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

  const getDeviceRiskLevel = useCallback((device: HardwareRiskDeviceRow): Severity => {
    const directSeverity = String(device.riskSeverity || device.severity || '').trim();
    if (directSeverity === 'Critical' || directSeverity === 'High' || directSeverity === 'Medium' || directSeverity === 'Low') return directSeverity;

    const lifecycleSeverity = String(device.osLifecycleSeverity || '').trim();
    if (lifecycleSeverity === 'Critical' || lifecycleSeverity === 'High' || lifecycleSeverity === 'Medium' || lifecycleSeverity === 'Low') {
      if (lifecycleSeverity === 'Critical' || numberOrFallback(device.riskScore) >= 70) return 'Critical';
      if (lifecycleSeverity === 'High' || numberOrFallback(device.riskScore) >= 40) return 'High';
      if (lifecycleSeverity === 'Medium' || numberOrFallback(device.riskScore) >= 20) return 'Medium';
    }

    if (numberOrFallback(device.riskScore) >= 70) return 'Critical';
    if (numberOrFallback(device.riskScore) >= 40) return 'High';
    if (numberOrFallback(device.riskScore) >= 20) return 'Medium';
    return 'Low';
  }, []);

  const getDeviceRiskMainIssue = useCallback((device: HardwareRiskDeviceRow) => {
    const signals = Array.isArray(device.riskSignals) ? device.riskSignals.filter(Boolean).join(' + ') : '';
    const category = String(device.riskCategory || '').trim();
    const lifecycle = String(device.osLifecycleStatus || '').trim();
    const pcAging = String(device.pcAgingStatus || '').trim();
    const reasons = String(device.reasons || device.reason || device.pcAgingReason || '').trim();

    if (signals) return signals;
    if (category) return category;
    if (lifecycle && lifecycle !== 'Lifecycle Not Provided') return lifecycle;
    if (pcAging) return pcAging;
    if (reasons) return reasons;
    if (numberOrFallback(device.riskScore) >= 70) return 'High device risk score';
    if (numberOrFallback(device.riskScore) >= 40) return 'Needs review';
    return 'Risk record';
  }, []);

  const getDeviceRiskEvidence = useCallback((device: HardwareRiskDeviceRow) => {
    const evidence = [
      getDeviceRiskMainIssue(device),
      device.osLifecycleStatus ? `Lifecycle: ${device.osLifecycleStatus}` : '',
      device.osLifecycleCycle ? `Cycle: ${device.osLifecycleCycle}` : '',
      device.osLifecycleEolDate ? `EOL/EOS date: ${device.osLifecycleEolDate}` : '',
      device.pcAgingStatus ? `PC aging: ${device.pcAgingStatus}` : '',
      device.pcAgeLabel ? `PC age: ${device.pcAgeLabel}` : '',
      device.ageSourceDate ? `Age source: ${device.ageSourceDate}` : '',
      device.pcAgingReason || '',
      device.reasons || device.reason || '',
    ];

    const seen = new Set<string>();
    return evidence
      .map((value) => String(value || '').trim())
      .filter((value) => {
        if (!value || value === '-' || seen.has(value.toLowerCase())) return false;
        seen.add(value.toLowerCase());
        return true;
      });
  }, [getDeviceRiskMainIssue]);

  const resolveRiskFindingRows = useCallback((item = '') => {
    const selected = String(item || '').trim().toLowerCase();
    const sourceRows = risk.topFindings.length
      ? risk.topFindings
      : riskCategoryRows.map((row) => ({
          id: `device-risk-${row.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          module: 'Device Risk',
          title: row.name,
          count: numberOrFallback(row.value),
          severity: row.name.toLowerCase().includes('eol') || row.name.toLowerCase().includes('eos') || row.name.toLowerCase().includes('aging') ? 'Critical' as Severity : 'High' as Severity,
          recommendation: row.name.toLowerCase().includes('eol') || row.name.toLowerCase().includes('eos')
            ? 'Check OS lifecycle status and plan upgrade/replacement.'
            : row.name.toLowerCase().includes('aging')
              ? 'Review PC Aging Rule threshold and replacement planning.'
              : 'Review Management Policy score and assigned threshold.',
        }));

    const rows: RiskFindingRow[] = sourceRows.map((row) => ({
      id: row.id || `device-risk-${String(row.title || row.module).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      module: row.module || 'Device Risk',
      title: row.title || row.module || 'Device Risk',
      count: numberOrFallback(row.count),
      severity: normalizeSeverity(row.severity),
      recommendation: row.recommendation || 'Check affected devices and assign action.',
    }));

    if (!selected || ['critical risk', 'device risk', 'risk', 'all risk', 'all'].includes(selected)) return rows;

    return rows.filter((row) => {
      const rowText = [row.title, row.module, row.severity, row.recommendation].join(' ').toLowerCase();
      if (['critical', 'high', 'medium', 'low'].includes(selected)) return String(row.severity || '').toLowerCase() === selected;
      if (selected.includes('near')) return rowText.includes('near');
      if (selected.includes('eol') || selected.includes('eos') || selected.includes('lifecycle')) return /eol|eos|lifecycle|end of support|end of life/i.test(rowText);
      if (selected.includes('aging') || selected.includes('pc age')) return /aging|pc age|refresh|replacement/i.test(rowText);
      if (selected.includes('policy') || selected.includes('score') || selected.includes('management')) return /policy|score|management/i.test(rowText);
      return rowText.includes(selected);
    });
  }, [risk.topFindings, riskCategoryRows]);

  const resolveRiskDeviceRows = useCallback((item = '') => {
    const selected = String(item || '').trim().toLowerCase();
    const baseRows = deviceRiskRows;
    if (!selected || ['critical risk', 'device risk', 'risk', 'all risk', 'all'].includes(selected)) return baseRows;

    return baseRows.filter((device) => {
      const riskLevel = getDeviceRiskLevel(device).toLowerCase();
      const mainIssue = getDeviceRiskMainIssue(device).toLowerCase();
      const signalText = Array.isArray(device.riskSignals) ? device.riskSignals.join(' ') : '';
      const rowText = [
        device.deviceName,
        device.deviceId,
        device.assetId,
        device.department,
        device.site,
        device.platform,
        device.model,
        device.status,
        device.source,
        device.osName,
        device.osLifecycleStatus,
        device.osLifecycleSeverity,
        device.osLifecycleCycle,
        device.osLifecycleEolDate,
        device.riskSeverity,
        device.severity,
        device.riskCategory,
        signalText,
        device.pcAgingStatus,
        device.pcAgingSeverity,
        device.pcAgingReason,
        device.pcAgeLabel,
        device.ageSource,
        device.ageSourceDate,
        device.reasons,
        device.reason,
        mainIssue,
      ].filter(Boolean).join(' ').toLowerCase();

      if (['critical', 'high', 'medium', 'low'].includes(selected)) return riskLevel === selected;
      if (selected.includes('near')) return /near/.test(rowText);
      if (selected.includes('eol') || selected.includes('eos') || selected.includes('lifecycle')) return /eol|eos|end of life|end of support|unsupported|outdated/i.test(rowText);
      if (selected.includes('aging') || selected.includes('pc age')) return /pc aging|aging|pc age|replacement|refresh/.test(rowText);
      if (selected.includes('policy') || selected.includes('score') || selected.includes('management')) return numberOrFallback(device.riskScore) > 0 || /policy|score|management/.test(rowText);
      return rowText.includes(selected);
    });
  }, [deviceRiskRows, getDeviceRiskLevel, getDeviceRiskMainIssue]);

  const renderRiskDrillTable = (level: 'level2' | 'level3', item = '') => {
    const rows = resolveRiskFindingRows(item);
    const visibleRows = level === 'level3' ? rows.slice(0, 12) : rows.slice(0, 8);

    return (
      <div className="itops-pro-table-wrap">
        <table className="itops-pro-table itops-pro-table-risk">
          <thead>
            <tr>
              <th>Risk Level</th>
              <th>Area</th>
              <th>Issue</th>
              <th>Total</th>
              <th>What To Do</th>
              <th>Next</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((itemRow) => (
              <tr
                key={itemRow.id || `${itemRow.module}-${itemRow.title}`}
                className={level === 'level2' ? 'itops-pro-clickable-row' : ''}
                onClick={level === 'level2' ? () => openLevel3('risk', itemRow.title || itemRow.module) : undefined}
              >
                <td><SeverityBadge severity={itemRow.severity} /></td>
                <td>{itemRow.module || '-'}</td>
                <td><strong>{itemRow.title || '-'}</strong></td>
                <td>{formatNumber(itemRow.count)}</td>
                <td>{itemRow.recommendation || 'Check affected devices and assign action.'}</td>
                <td>{level === 'level2' ? <ChevronRight size={15} /> : <ToneBadge tone={itemRow.severity === 'Critical' ? 'danger' : itemRow.severity === 'High' ? 'warning' : 'info'}>Review</ToneBadge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <EmptyState label="No risk issue found for this selection." />}
      </div>
    );
  };

  const renderEndpointRiskDrillTable = (level: 'level2' | 'level3', item = '') => {
    const rows = resolveRiskDeviceRows(item);
    const pageSize = level === 'level3' ? DRILLDOWN_TABLE_PAGE_SIZE : 8;
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    const safePage = Math.min(Math.max(riskDetailPage, 1), totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const visibleRows = rows.slice(startIndex, startIndex + pageSize);

    return (
      <div className="itops-pro-table-wrap">
        <table className="itops-pro-table itops-pro-device-risk-table">
          <thead>
            {level === 'level3' ? (
              <tr>
                <th>Device</th>
                <th>Branch</th>
                <th>OS / Lifecycle</th>
                <th>Last Seen</th>
                <th>Risk Level</th>
                <th>Score</th>
                <th>Why Listed</th>
              </tr>
            ) : (
              <tr>
                <th>Device</th>
                <th>Branch</th>
                <th>OS</th>
                <th>Last Seen</th>
                <th>Risk Level</th>
                <th>Score</th>
                <th>Main Issue</th>
                <th>Next</th>
              </tr>
            )}
          </thead>
          <tbody>
            {visibleRows.map((device, index) => {
              const levelText = getDeviceRiskLevel(device);
              const mainIssue = getDeviceRiskMainIssue(device);
              const evidenceRows = getDeviceRiskEvidence(device);
              const listedEvidenceRows = evidenceRows.filter((evidence) => evidence.toLowerCase() !== mainIssue.toLowerCase());
              return (
                <tr
                  key={`${device.deviceName}-${device.department}-${startIndex + index}`}
                  className={level === 'level2' ? 'itops-pro-clickable-row' : ''}
                  onClick={level === 'level2' ? () => openLevel3('risk', device.deviceName || device.department || levelText) : undefined}
                >
                  <td><strong>{device.deviceName || '-'}</strong><span className="itops-pro-muted-block">{device.model || '-'}</span></td>
                  <td>{device.department || 'Unmapped'}</td>
                  <td>
                    <strong>{device.osName || device.platform || '-'}</strong>
                    <span className="itops-pro-muted-block">
                      {[device.osLifecycleCycle, device.osLifecycleEolDate ? `EOL/EOS: ${device.osLifecycleEolDate}` : ''].filter(Boolean).join(' • ')}
                    </span>
                  </td>
                  <td>{device.lastSeen || '-'}</td>
                  <td><SeverityBadge severity={levelText} /></td>
                  <td><ToneBadge tone={device.riskScore >= 70 ? 'danger' : device.riskScore >= 40 ? 'warning' : 'info'}>{formatNumber(device.riskScore)}</ToneBadge></td>
                  {level === 'level3' ? (
                    <td className="itops-risk-why-cell">
                      <strong>{mainIssue}</strong>
                      <ul className="itops-risk-evidence-list" aria-label={`Risk evidence for ${device.deviceName || 'device'}`}>
                        {listedEvidenceRows.slice(0, 7).map((evidence) => <li key={evidence}>{evidence}</li>)}
                      </ul>
                    </td>
                  ) : (
                    <>
                      <td>
                        <strong>{mainIssue}</strong>
                        <span className="itops-pro-muted-block">
                          {[device.pcAgingStatus, device.pcAgeLabel, device.ageSourceDate ? `Age source: ${device.ageSourceDate}` : ''].filter(Boolean).join(' • ')}
                        </span>
                      </td>
                      <td><ChevronRight size={15} /></td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length && <EmptyState label="No linked device risk records found for this selection." />}
        <DrilldownTablePagination page={safePage} totalCount={rows.length} pageSize={pageSize} onPageChange={setRiskDetailPage} />
      </div>
    );
  };

  const resolveHardwareEndpointRows = (item = '') => {
    const baseRows = hardware.endpointRows.length
      ? hardware.endpointRows
      : deviceRiskRows.map((row) => ({
          deviceName: row.deviceName || '-',
          platform: row.platform || row.osName || 'Unknown',
          osName: row.osName || row.platform || 'Unknown',
          model: row.model || '-',
          department: row.department || 'Unmapped',
          lastSeen: row.lastSeen || '-',
          status: row.riskScore >= 40 ? 'Risk' : 'Inventory',
          isOnline: false,
          isStale: String(row.reasons || '').toLowerCase().includes('stale'),
          riskScore: row.riskScore,
          reasons: row.reasons || 'Hardware risk record',
        } as HardwareEndpointRow));

    return baseRows.filter((row) => endpointStatusMatches(row, item));
  };

  const renderHardwareEndpointEvidenceTable = (item = '') => {
    const rows = resolveHardwareEndpointRows(item);
    const totalPages = Math.max(1, Math.ceil(rows.length / DRILLDOWN_TABLE_PAGE_SIZE));
    const safePage = Math.min(Math.max(endpointDetailPage, 1), totalPages);
    const startIndex = (safePage - 1) * DRILLDOWN_TABLE_PAGE_SIZE;
    const pageRows = rows.slice(startIndex, startIndex + DRILLDOWN_TABLE_PAGE_SIZE);

    return (
      <div className="itops-pro-table-wrap">
        <table className="itops-pro-table">
          <thead>
            <tr>
              <th>Device</th>
              <th>Inventory</th>
              <th>Platform / OS</th>
              <th>Model</th>
              <th>Branch</th>
              <th>IP</th>
              <th>Status</th>
              <th>Last Seen</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((device, index) => (
              <tr key={`${device.deviceId || device.deviceName}-${device.source || 'hardware'}-${startIndex + index}`}>
                <td><strong>{device.deviceName || '-'}</strong><span className="itops-pro-muted-block">{device.deviceId || '-'}</span></td>
                <td>{device.source || 'Hardware'}</td>
                <td><strong>{device.platform || device.osName || '-'}</strong><span className="itops-pro-muted-block">{device.osBuild || ''}</span></td>
                <td>{device.model || '-'}</td>
                <td>{device.department || '-'}</td>
                <td>{device.ipAddress || '-'}</td>
                <td><ToneBadge tone={device.isStale ? 'warning' : device.isOnline ? 'success' : 'danger'}>{device.status || (device.isOnline ? 'Online' : 'Offline')}</ToneBadge></td>
                <td>{device.lastSeen || '-'}</td>
                <td>{device.reasons || 'Inventory record'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <EmptyState label="No device records available for this selection." />}
        <DrilldownTablePagination
          page={safePage}
          totalCount={rows.length}
          onPageChange={setEndpointDetailPage}
        />
      </div>
    );
  };


  const buildEndpointBreakdown = (
    rows: HardwareEndpointRow[],
    resolver: (row: HardwareEndpointRow) => string | undefined,
    fallback: string,
    limit = 6,
  ): BreakdownItem[] => {
    const counts = new Map<string, number>();

    rows.forEach((row) => {
      const label = String(resolver(row) || fallback).trim() || fallback;
      counts.set(label, (counts.get(label) || 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([name, value]) => ({
        name,
        value,
        percent: rows.length ? (value / rows.length) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);
  };

  const renderEndpointGraphBars = (items: BreakdownItem[], total: number) => (
    <div className="itops-endpoint-graph-bars">
      {items.map((row) => {
        const percent = total > 0 ? (row.value / total) * 100 : 0;
        return (
          <div className="itops-endpoint-graph-row" key={row.name}>
            <div>
              <strong>{row.name}</strong>
              <span>{formatNumber(row.value)} device{row.value === 1 ? '' : 's'}</span>
            </div>
            <em aria-hidden="true"><i style={{ width: `${Math.max(5, percent)}%` }} /></em>
            <b>{formatPercent(percent, 0)}</b>
          </div>
        );
      })}
    </div>
  );

  const renderEndpointFleetGraphs = (item = '') => {
    const rows = resolveHardwareEndpointRows(item);
    const total = rows.length;

    if (!total) return <EmptyState label="No device records available for this chart." />;

    const onlineCount = rows.filter((row) => Boolean(row.isOnline)).length;
    const staleCount = rows.filter((row) => Boolean(row.isStale)).length;
    const offlineCount = Math.max(0, total - onlineCount);
    const statusItems: BreakdownItem[] = [
      { name: 'Online', value: onlineCount, percent: total ? (onlineCount / total) * 100 : 0 },
      { name: 'Offline', value: offlineCount, percent: total ? (offlineCount / total) * 100 : 0 },
      { name: 'Stale sync', value: staleCount, percent: total ? (staleCount / total) * 100 : 0 },
    ].filter((row) => row.value > 0 || row.name !== 'Stale sync');
    const platformItems = buildEndpointBreakdown(rows, (row) => row.osName || row.platform, 'Unknown platform', 5);
    const modelItems = buildEndpointBreakdown(rows, (row) => row.model, 'Unknown model', 5);

    return (
      <div className="itops-endpoint-graph-grid">
        <div className="itops-endpoint-graph-card">
          <div className="itops-endpoint-graph-head">
            <span>Status overview</span>
            <strong>{formatNumber(total)}</strong>
          </div>
          {renderEndpointGraphBars(statusItems, total)}
        </div>
        <div className="itops-endpoint-graph-card">
          <div className="itops-endpoint-graph-head">
            <span>Platform mix</span>
            <strong>{formatNumber(platformItems.length)}</strong>
          </div>
          {renderEndpointGraphBars(platformItems, total)}
        </div>
        <div className="itops-endpoint-graph-card">
          <div className="itops-endpoint-graph-head">
            <span>Top models</span>
            <strong>{formatNumber(modelItems.length)}</strong>
          </div>
          {renderEndpointGraphBars(modelItems, total)}
        </div>
      </div>
    );
  };

  const renderEndpointLevel2Stats = () => {
    const total = numberOrFallback(hardware.totalDevices);
    const online = numberOrFallback(hardware.onlineDevices);
    const offline = numberOrFallback(hardware.offlineDevices);
    const stale = numberOrFallback(hardware.staleSync);
    const onlinePercent = total > 0 ? (online / total) * 100 : 0;
    const offlinePercent = total > 0 ? (offline / total) * 100 : 0;
    const stalePercent = total > 0 ? (stale / total) * 100 : 0;
    const freshnessPercent = Math.max(0, 100 - stalePercent);

    const endpointTiles: { label: string; value: number; note: string; tone: CardTone; icon: LucideIcon; target: string }[] = [
      { label: 'All Devices', value: total, note: 'All records', tone: 'blue', icon: Laptop, target: 'Total Devices' },
      { label: 'Online', value: online, note: 'Available now', tone: 'green', icon: Activity, target: 'Online Devices' },
      { label: 'Offline', value: offline, note: 'Need check', tone: 'red', icon: AlertTriangle, target: 'Offline Devices' },
      { label: 'Not Updated', value: stale, note: 'Old sync', tone: 'amber', icon: RefreshCw, target: 'Stale Sync' },
    ];

    const statusBars = [
      { label: 'Online', value: online, percent: onlinePercent, tone: 'online', target: 'Online Devices' },
      { label: 'Offline', value: offline, percent: offlinePercent, tone: 'offline', target: 'Offline Devices' },
      { label: 'Not Updated', value: stale, percent: stalePercent, tone: 'stale', target: 'Stale Sync' },
      { label: 'Fresh Data', value: Math.max(0, total - stale), percent: freshnessPercent, tone: 'fresh', target: 'Total Devices' },
    ];

    const platformItems = hardware.platformBreakdown.slice(0, 8);

    return (
      <div className="itops-endpoint-redesign">
        <button
          type="button"
          className="itops-endpoint-status-panel"
          onClick={() => openLevel3('hardware', 'Total Devices')}
          aria-label="Open device records"
        >
          <div className="itops-endpoint-status-head">
            <span>Device Status</span>
            <strong>{formatNumber(total)}</strong>
            <small>Total devices</small>
          </div>

          <div className="itops-endpoint-status-body">
            <div className="itops-device-status-chart" aria-hidden="true">
              <div className="itops-device-chart-main">
                <span>Online now</span>
                <strong>{formatPercent(onlinePercent, 0)}</strong>
                <small>{formatNumber(online)} online from {formatNumber(total)} devices</small>
              </div>

              <div className="itops-device-availability-track">
                <i className="online" style={{ width: `${clampPercent(onlinePercent)}%` }} />
                <i className="offline" style={{ width: `${clampPercent(offlinePercent)}%` }} />
              </div>

              <div className="itops-device-status-bars">
                {statusBars.map((bar) => (
                  <span className={`itops-device-status-bar itops-device-status-bar-${bar.tone}`} key={bar.label} style={{ '--bar-height': `${Math.max(8, clampPercent(bar.percent))}%` } as CSSProperties & Record<string, string>}>
                    <i />
                    <em>{bar.label}</em>
                    <strong>{formatNumber(bar.value)}</strong>
                  </span>
                ))}
              </div>

              <div className="itops-device-freshness-strip">
                <span>Data Freshness</span>
                <em><i style={{ width: `${clampPercent(freshnessPercent)}%` }} /></em>
                <strong>{formatPercent(freshnessPercent, 0)}</strong>
              </div>
            </div>
          </div>

          <div className="itops-endpoint-status-legend">
            <span className="online"><i />Online <strong>{formatNumber(online)}</strong></span>
            <span className="offline"><i />Offline <strong>{formatNumber(offline)}</strong></span>
            <span className="stale"><i />Not Updated <strong>{formatNumber(stale)}</strong></span>
            <span className="fresh"><i />Fresh <strong>{formatPercent(freshnessPercent, 0)}</strong></span>
          </div>
        </button>

        <section className="itops-endpoint-side-panel" aria-label="Device level 2 details">
          <div className="itops-endpoint-side-head">
            <div>
              <span>Device Summary</span>
              <strong>Status and OS summary</strong>
            </div>
            <small>Click any card to view device list.</small>
          </div>

          <div className="itops-endpoint-mini-metrics">
            {endpointTiles.map((tile) => {
              const Icon = tile.icon;
              return (
                <button
                  type="button"
                  className={`itops-endpoint-mini-tile itops-endpoint-mini-tile-${tile.tone}`}
                  key={tile.label}
                  onClick={() => openLevel3('hardware', tile.target)}
                >
                  <span className="itops-endpoint-mini-icon"><Icon size={16} /></span>
                  <div>
                    <small>{tile.label}</small>
                    <strong>{formatNumber(tile.value)}</strong>
                    <em>{tile.note}</em>
                  </div>
                  <ChevronRight size={14} />
                </button>
              );
            })}
          </div>

          <div className="itops-endpoint-platform-compact">
            <div className="itops-endpoint-platform-head">
              <div>
                <span>Operating System</span>
                <strong>{formatNumber(platformItems.length)} OS type{platformItems.length === 1 ? '' : 's'}</strong>
              </div>
              <small>OS list</small>
            </div>

            {platformItems.length ? (
              <div className="itops-endpoint-platform-list">
                {platformItems.map((item) => {
                  const percent = item.percent === undefined ? (total > 0 ? (item.value / total) * 100 : 0) : item.percent;
                  return (
                    <button type="button" className="itops-endpoint-platform-chip" key={item.name} onClick={() => openLevel3('hardware', item.name)}>
                      <div>
                        <strong>{item.name}</strong>
                        <span>{formatNumber(item.value)} device{item.value === 1 ? '' : 's'}</span>
                      </div>
                      <em>{formatPercent(percent, 1)}</em>
                      <b aria-hidden="true"><i style={{ width: `${clampPercent(percent)}%` }} /></b>
                    </button>
                  );
                })}
              </div>
            ) : (
              <EmptyState label="No OS data yet." />
            )}
          </div>

          <div className="itops-endpoint-followup-grid">
            <button type="button" onClick={() => openLevel3('hardware', 'Offline Devices')}>
              <span>Need Check</span>
              <strong>{formatNumber(offline)}</strong>
              <small>Offline devices</small>
            </button>
            <button type="button" onClick={() => openLevel3('hardware', 'Stale Sync')}>
              <span>Old Data</span>
              <strong>{formatNumber(stale)}</strong>
              <small>Not updated recently</small>
            </button>
            <button type="button" onClick={() => openLevel3('hardware', 'Total Devices')}>
              <span>Fresh Data</span>
              <strong>{formatPercent(freshnessPercent, 0)}</strong>
              <small>Updated records</small>
            </button>
          </div>
        </section>
      </div>
    );
  };

  const renderGeoDeviceEvidenceTable = (item = '') => {
    const rows = resolveGeoEvidenceRows(item);
    const isSummaryOnly = rows.length === 0;
    const totalPages = Math.max(1, Math.ceil(rows.length / DRILLDOWN_TABLE_PAGE_SIZE));
    const safePage = Math.min(Math.max(geoDetailPage, 1), totalPages);
    const startIndex = (safePage - 1) * DRILLDOWN_TABLE_PAGE_SIZE;
    const pageRows = rows.slice(startIndex, startIndex + DRILLDOWN_TABLE_PAGE_SIZE);

    return (
      <div className="itops-pro-table-wrap">
        <table className="itops-pro-table">
          <thead>
            <tr>
              <th>Device</th>
              <th>Device ID</th>
              <th>Platform</th>
              <th>Branch</th>
              <th>Location</th>
              <th>Last Seen</th>
              <th>Status</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, index) => (
              <tr key={`${row.deviceId || row.deviceName}-${row.locationName}-${startIndex + index}`}>
                <td><strong>{row.deviceName || '-'}</strong></td>
                <td>{row.deviceId || '-'}</td>
                <td>{row.platform || '-'}</td>
                <td>{row.department || '-'}</td>
                <td>{row.locationName || '-'}</td>
                <td>{row.lastSeen || '-'}</td>
                <td><ToneBadge tone={/stale|missing|unknown/i.test(`${row.signal} ${row.status}`) ? 'warning' : 'info'}>{formatLocationStatusLabel(row.signal || row.status)}</ToneBadge></td>
                <td>{formatLocationNote(row.reason)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {isSummaryOnly && (
          <EmptyState label="No device records available for this selection." />
        )}
        <DrilldownTablePagination
          page={safePage}
          totalCount={rows.length}
          onPageChange={setGeoDetailPage}
        />
      </div>
    );
  };


  const renderLocationLevel2Stats = () => {
    const withLocation = numberOrFallback(geolocation.trackedDevices);
    const notMapped = numberOrFallback(risk.missingGeoDevices);
    const total = Math.max(0, withLocation + notMapped);
    const withPercent = total > 0 ? (withLocation / total) * 100 : 0;
    const notMappedPercent = total > 0 ? (notMapped / total) * 100 : 0;
    const locationCount = geolocation.topLocations.length;
    const topLocation = geolocation.topLocations[0];
    const evidenceCount = geoEvidenceRows.length;
    const actionTone: CardTone = notMapped > 0 ? 'amber' : 'green';
    const locationRows = [
      { name: 'With Location', value: withLocation, percent: withPercent, tone: 'green' as CardTone, note: 'Ready to use', icon: MapPin },
      { name: 'Not Mapped', value: notMapped, percent: notMappedPercent, tone: actionTone, note: 'Need mapping', icon: Database },
    ];

    return (
      <div className="itops-location-level2">
        <section className="itops-location-status-card">
          <div className="itops-location-card-head">
            <div>
              <span>Location Status</span>
              <strong>{formatNumber(total)}</strong>
              <small>Total location records checked</small>
            </div>
            <button type="button" onClick={() => openLevel3('geolocation', 'With Location')}>View devices <ChevronRight size={15} /></button>
          </div>

          <div className="itops-location-score-wrap">
            <div className="itops-location-score" style={{ '--location-score': `${clampPercent(withPercent)}%` } as CSSProperties & Record<string, string>}>
              <strong>{formatPercent(withPercent, 0)}</strong>
              <span>With location</span>
            </div>
            <div className="itops-location-status-bars">
              {locationRows.map((row) => {
                const Icon = row.icon;
                return (
                  <button type="button" key={row.name} className={`itops-location-status-row itops-location-status-row-${row.tone}`} onClick={() => openLevel3('geolocation', row.name)}>
                    <span className="itops-location-status-icon"><Icon size={15} /></span>
                    <div>
                      <strong>{row.name}</strong>
                      <small>{row.note}</small>
                      <em><i style={{ width: `${clampPercent(row.percent)}%` }} /></em>
                    </div>
                    <b>{formatNumber(row.value)}</b>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="itops-location-summary-card">
          <div className="itops-location-summary-head">
            <div>
              <span>Location Summary</span>
              <strong>Useful checks</strong>
            </div>
            <small>Click any card to view device records.</small>
          </div>

          <div className="itops-location-mini-grid">
            <button type="button" className="itops-location-mini-card" onClick={() => openLevel3('geolocation', 'With Location')}>
              <span>With Location</span>
              <strong>{formatNumber(withLocation)}</strong>
              <small>Ready records</small>
            </button>
            <button type="button" className="itops-location-mini-card warning" onClick={() => openLevel3('geolocation', 'Not Mapped')}>
              <span>Not Mapped</span>
              <strong>{formatNumber(notMapped)}</strong>
              <small>Need branch/location mapping</small>
            </button>
            <button type="button" className="itops-location-mini-card" onClick={() => openLevel3('geolocation', topLocation?.name || 'With Location')}>
              <span>Top Location</span>
              <strong>{topLocation?.name || '-'}</strong>
              <small>{topLocation ? `${formatNumber(topLocation.value)} device${topLocation.value === 1 ? '' : 's'}` : 'No location list yet'}</small>
            </button>
            <button type="button" className="itops-location-mini-card" onClick={() => openLevel3('geolocation', 'With Location')}>
              <span>Location Names</span>
              <strong>{formatNumber(locationCount)}</strong>
              <small>Listed locations</small>
            </button>
          </div>

          <div className="itops-location-action-box">
            <span>Next check</span>
            <strong>{notMapped > 0 ? 'Fix devices without location mapping' : 'Location data looks complete'}</strong>
            <p>{notMapped > 0 ? 'Check branch/location mapping for the devices listed under Not Mapped.' : 'Keep monitoring the location list and device records.'}</p>
          </div>
        </section>

        <section className="itops-location-list-card">
          <div className="itops-location-list-head">
            <div>
              <span>Location List</span>
              <strong>{formatNumber(locationCount)} location{locationCount === 1 ? '' : 's'}</strong>
            </div>
            <small>Click a location to see devices.</small>
          </div>
          <LocationDistribution items={geolocation.topLocations} onOpen={(name) => openLevel3('geolocation', name)} />
        </section>

        <section className="itops-location-insight-card">
          <div className="itops-location-list-head">
            <div>
              <span>Device Records</span>
              <strong>{formatNumber(evidenceCount)}</strong>
            </div>
            <small>Records available for drilldown.</small>
          </div>
          <div className="itops-location-insight-grid">
            <div><span>Data ready</span><strong>{formatPercent(withPercent, 0)}</strong></div>
            <div><span>Need mapping</span><strong>{formatPercent(notMappedPercent, 0)}</strong></div>
            <div><span>Total checked</span><strong>{formatNumber(total)}</strong></div>
          </div>
          <div className="itops-location-wide-meter" aria-hidden="true">
            <i style={{ width: `${clampPercent(withPercent)}%` }} />
          </div>
        </section>
      </div>
    );
  };


  const renderOpenTicketsLevel2Stats = () => {
    const priorityRows = serviceDesk.priorityBreakdown.filter((row) => numberOrFallback(row.value) > 0);
    const priorityMax = Math.max(1, ...priorityRows.map((row) => numberOrFallback(row.value)));
    const topPriority = [...priorityRows].sort((a, b) => numberOrFallback(b.value) - numberOrFallback(a.value))[0];
    const needActionCount = overdueTicketCount + highTicketSignalCount;
    const safeQueueTotal = Math.max(1, openTicketCount + highTicketSignalCount);
    const needActionPercent = clampPercent((needActionCount / safeQueueTotal) * 100);
    const healthyPercent = clampPercent(100 - needActionPercent);
    const movementRows = incidentTrend.slice(-5);
    const movementMax = Math.max(1, ...movementRows.map((row) => numberOrFallback(row.newIncidents) + numberOrFallback(row.resolved) + numberOrFallback(row.open)));
    const nextFocusText = overdueTicketCount > 0
      ? 'Start with overdue tickets before checking the normal queue.'
      : highTicketSignalCount > 0
        ? 'Review high priority tickets first, then monitor open tickets.'
        : 'Queue looks controlled. Keep monitoring new tickets and SLA.';
    const queueTone = overdueTicketCount > 0 ? 'danger' : highTicketSignalCount > 0 ? 'warning' : 'success';
    const topPriorityLabel = topPriority?.label || 'No Priority';
    const topPriorityValue = numberOrFallback(topPriority?.value);

    return (
      <div className="itops-ticket-layout itops-ticket-layout-clean">
        <section className="itops-ticket-command-panel">
          <div className="itops-ticket-command-head">
            <div>
              <span>Ticket Health</span>
              <strong>{queueTone === 'success' ? 'On Track' : 'Need Action'}</strong>
              <small>{nextFocusText}</small>
            </div>
            <ToneBadge tone={queueTone}>{queueTone === 'success' ? 'Stable' : 'Check Now'}</ToneBadge>
          </div>

          <div className={`itops-ticket-focus-card itops-ticket-focus-${queueTone}`}>
            <div>
              <span>Need Action</span>
              <strong>{formatNumber(needActionCount)}</strong>
              <small>Overdue + high priority</small>
            </div>
            <button type="button" onClick={() => openLevel3('serviceDesk', 'Need Action')}>Open list</button>
          </div>

          <div className="itops-ticket-health-meter">
            <div className="itops-ticket-meter-row">
              <span>Healthy queue</span>
              <strong>{formatPercent(healthyPercent, 0)}</strong>
            </div>
            <div className="itops-ticket-meter-track" aria-hidden="true">
              <i className="healthy" style={{ width: `${healthyPercent}%` }} />
              <i className="risk" style={{ width: `${needActionPercent}%` }} />
            </div>
            <div className="itops-ticket-meter-labels">
              <small>{formatNumber(onTrackTicketCount)} on track</small>
              <small>{formatNumber(needActionCount)} need action</small>
            </div>
          </div>

          <div className="itops-ticket-sla-strip-card">
            <div>
              <span>SLA Met</span>
              <strong>{formatPercent(ticketSlaPercent, 0)}</strong>
              <small>Service target</small>
            </div>
            <em aria-hidden="true"><i style={{ width: `${ticketSlaPercent}%` }} /></em>
          </div>

          <div className="itops-ticket-time-grid">
            <div className="blue"><span>First Reply</span><strong>{serviceDesk.firstResponse || '-'}</strong><small>Average response</small></div>
            <div className="purple"><span>Resolve Time</span><strong>{serviceDesk.mttr || '-'}</strong><small>Average close time</small></div>
          </div>
        </section>

        <section className="itops-ticket-work-panel">
          <div className="itops-ticket-panel-title">
            <div>
              <span>Work Plan</span>
              <strong>Simple action view</strong>
            </div>
            <small>Each section shows a different purpose. No repeated summary cards.</small>
          </div>

          <div className="itops-ticket-plan-grid">
            <button type="button" className="danger" onClick={() => openLevel3('serviceDesk', 'Overdue')}>
              <span>Do First</span>
              <strong>{formatNumber(overdueTicketCount)}</strong>
              <small>Overdue tickets</small>
            </button>
            <button type="button" className="warning" onClick={() => openLevel3('serviceDesk', topPriorityLabel)}>
              <span>Priority Focus</span>
              <strong>{topPriorityLabel}</strong>
              <small>{formatNumber(topPriorityValue)} ticket(s)</small>
            </button>
            <div className="success">
              <span>Keep Moving</span>
              <strong>{formatNumber(trendSummary.resolved)}</strong>
              <small>Resolved in current view</small>
            </div>
          </div>

          <div className="itops-ticket-board-grid">
            <section className="itops-ticket-movement-card">
              <div className="itops-ticket-list-head">
                <span>Ticket Movement</span>
                <strong>{movementRows.length ? `${movementRows.length} day view` : 'No trend'}</strong>
              </div>
              {movementRows.length ? movementRows.map((row) => {
                const newCount = numberOrFallback(row.newIncidents);
                const resolvedCount = numberOrFallback(row.resolved);
                const openCount = numberOrFallback(row.open);
                const total = Math.max(1, newCount + resolvedCount + openCount);
                const width = Math.max(8, (total / movementMax) * 100);

                return (
                  <div className="itops-ticket-movement-row" key={row.day}>
                    <span>{row.day}</span>
                    <em aria-hidden="true" style={{ width: `${width}%` }}>
                      {newCount > 0 && <i className="new" style={{ flexGrow: newCount }} />}
                      {resolvedCount > 0 && <i className="resolved" style={{ flexGrow: resolvedCount }} />}
                      {openCount > 0 && <i className="open" style={{ flexGrow: openCount }} />}
                    </em>
                    <strong>{formatNumber(total)}</strong>
                  </div>
                );
              }) : <EmptyState label="No ticket movement yet." />}
              <div className="itops-ticket-movement-legend">
                <span><i className="new" />New</span>
                <span><i className="resolved" />Resolved</span>
                <span><i className="open" />Open</span>
              </div>
            </section>

            <section className="itops-ticket-priority-clean-card">
              <div className="itops-ticket-list-head">
                <span>Priority Workload</span>
                <strong>{formatNumber(ticketPriorityTotal)}</strong>
              </div>
              {priorityRows.length ? priorityRows.map((row) => {
                const value = numberOrFallback(row.value);
                const tone = String(row.label || '').toLowerCase();
                return (
                  <button type="button" className={`itops-ticket-priority-row ${tone}`} key={row.label} onClick={() => openLevel3('serviceDesk', row.label)}>
                    <div><strong>{row.label}</strong><span>{formatNumber(value)} ticket(s)</span></div>
                    <em><i style={{ width: `${Math.max(5, (value / priorityMax) * 100)}%` }} /></em>
                    <b>{formatNumber(value)}</b>
                  </button>
                );
              }) : <EmptyState label="No priority data yet." />}
            </section>
          </div>
        </section>
      </div>
    );
  };

  const renderLevel2Drilldown = (view: string) => {
    if (view === 'overview') {
      return (
        <div className="itops-pro-drawer-stack">
          <div className="itops-pro-story-panel">
            <strong>Dashboard Summary</strong>
            <p>This view shows the main dashboard numbers in a simple action list. Click any item below to open the details.</p>
          </div>
          <div className="itops-pro-drill-grid">
            <DrillCard icon={Laptop} label="Devices" value={formatNumber(hardware.totalDevices)} note="Online, old sync, OS and model summary" tone="blue" onClick={() => openLevel3('hardware')} />
            <DrillCard icon={Ticket} label="Open Tickets" value={formatNumber(serviceDesk.pendingTickets)} note="Open, overdue and SLA status" tone="amber" onClick={() => openLevel3('serviceDesk')} />
            <DrillCard icon={ShieldCheck} label="Security Updates" value={hasSecurityUpdateScore ? formatPercent(securityUpdateScore, 0) : 'Not Checked'} note={`${formatNumber(securityUpdateTotalDevices)} device baseline`} tone="green" onClick={() => openLevel3('patch')} />
            <DrillCard icon={Wrench} label="Automation Jobs" value={formatNumber(tasks.failedTasks)} note="Failed/cancelled jobs and execution trace" tone="red" onClick={() => openLevel3('tasks')} />
            <DrillCard icon={Network} label="Network Coverage" value={formatNumber(network.unregisteredIps)} note="Unregistered IP and workgroup gaps" tone="cyan" onClick={() => openLevel3('network')} />
            <DrillCard icon={ShieldAlert} label="Device Risk" value={formatNumber(deviceRiskCount)} note="EOL/EOS and Management Policy risk" tone="purple" onClick={() => openLevel3('risk')} />
          </div>
          <Panel title="Ticket Movement" subtitle="New, closed and open tickets." icon={Activity}>
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
          <DrilldownTrace domain="Devices" stage="breakdown" />
          <div className="itops-pro-story-panel">
            <strong>Device Breakdown</strong>
            <p>Review simple device status first: online, offline, old data and OS type.</p>
          </div>
          {renderEndpointLevel2Stats()}
        </div>
      );
    }

    if (view === 'serviceDesk' || view === 'alerts') {
      return (
        <div className="itops-pro-drawer-stack">
          <DrilldownTrace domain="Open Tickets" stage="breakdown" />
          <div className="itops-pro-story-panel">
            <strong>Open Tickets</strong>
            <p>Check open tickets, overdue items, SLA status and priority workload.</p>
          </div>
          {renderOpenTicketsLevel2Stats()}
          <Panel title="Ticket List" subtitle="Click any row to see details." icon={Ticket}>{renderAlertDrillTable('level2')}</Panel>
        </div>
      );
    }

    if (view === 'patch' || view === 'departments') {
      return (
        <div className="itops-pro-drawer-stack">
          <DrilldownTrace domain="Security Updates" stage="breakdown" />
          <div className="itops-pro-story-panel">
            <strong>Security Updates</strong>
            <p>Simple view: how many devices are updated, how many still need update, and which branch needs attention.</p>
          </div>

          <div className="itops-security-update-layout">
            <section className="itops-security-update-main">
              <div className="itops-security-update-head">
                <span><ShieldCheck size={22} /></span>
                <div>
                  <small>Update Status</small>
                  <strong>{hasSecurityUpdateScore ? formatPercent(securityUpdateScore, 0) : 'Not Checked'}</strong>
                  <p>{hasSecurityUpdateScore ? `${formatNumber(securityUpdatedDevices)} of ${formatNumber(securityUpdateTotalDevices)} devices are updated` : `${formatNumber(securityUpdateTotalDevices)} devices waiting for update check`}</p>
                </div>
              </div>

              <div className="itops-security-update-meter" aria-label="Security update score">
                <i style={{ width: `${hasSecurityUpdateScore ? clampPercent(securityUpdateScore) : 0}%` }} />
              </div>

              <div className="itops-security-update-split">
                <button type="button" className="updated" onClick={() => openLevel3('patch', 'Updated')}>
                  <span>Updated</span>
                  <strong>{hasSecurityUpdateScore ? formatNumber(securityUpdatedDevices) : '-'}</strong>
                  <small>Good device count</small>
                </button>
                <button type="button" className="need" onClick={() => openLevel3('patch', 'Need Update')}>
                  <span>Need Update</span>
                  <strong>{hasSecurityUpdateScore ? formatNumber(securityNeedUpdateDevices) : '-'}</strong>
                  <small>Action needed</small>
                </button>
                <button type="button" className="critical" onClick={() => openLevel3('risk', 'Critical Update')}>
                  <span>Critical Issues</span>
                  <strong>{formatNumber(criticalUpdateIssueCount)}</strong>
                  <small>Issue count only</small>
                </button>
              </div>
            </section>

            <section className="itops-security-branch-card">
              <div className="itops-security-branch-head">
                <div>
                  <small>Branch Score</small>
                  <strong>Lowest score first</strong>
                </div>
                <button type="button" onClick={() => openLevel3('departments')}>View All</button>
              </div>
              <div className="itops-security-branch-list">
                {(filteredPatchDepartments.length ? filteredPatchDepartments : patchDepartments)
                  .slice()
                  .sort((a, b) => numberOrFallback(a.percent) - numberOrFallback(b.percent))
                  .slice(0, 5)
                  .map((row) => (
                    <button type="button" key={`security-branch-${row.name}`} onClick={() => openLevel3('patch', row.name)}>
                      <div><strong>{row.name}</strong><span>{formatPercent(row.percent, 0)}</span></div>
                      <em><i style={{ width: `${clampPercent(row.percent)}%` }} /></em>
                    </button>
                  ))}
                {!patchDepartments.length && <EmptyState label="No branch update score yet." />}
              </div>
            </section>
          </div>

          <div className="itops-pro-filter-row">
            <label><Search size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search branch" /></label>
            <select value={selectedDepartment} onChange={(event) => setSelectedDepartment(event.target.value)}>
              {departments.map((department) => <option key={department}>{department}</option>)}
            </select>
          </div>
          <Panel title="Branch Update Score" subtitle="Branch ranking only. This is not added into device total." icon={ShieldCheck}>{renderSecurityUpdateBranchTable('level2')}</Panel>
        </div>
      );
    }

    if (view === 'tasks') {
      return (
        <div className="itops-pro-drawer-stack">
          <div className="itops-pro-story-panel">
            <strong>Automation Job Breakdown</strong>
            <p>Validate which jobs failed, which jobs are running and which targets need investigation.</p>
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
      const criticalDeviceCount = resolveRiskDeviceRows('Critical').length;
      const highDeviceCount = resolveRiskDeviceRows('High').length;
      const deviceRiskCount = resolveRiskDeviceRows().length;
      const mainRiskRows = riskCategoryRows.slice(0, 5);
      const maxRiskDriver = Math.max(1, ...mainRiskRows.map((row) => numberOrFallback(row.value)));
      const hasDeviceRiskRows = deviceRiskCount > 0;

      return (
        <div className="itops-pro-drawer-stack">
          <DrilldownTrace domain="Device Risk" stage="breakdown" />
          <div className="itops-pro-story-panel">
            <strong>Device Risk</strong>
            <p>Risk is calculated from device EOL/EOS and the score values set in Management Policy.</p>
          </div>

          <div className="itops-critical-risk-layout">
            <section className="itops-critical-risk-main">
              <div className="itops-critical-risk-head">
                <span><ShieldAlert size={22} /></span>
                <div>
                  <small>Risk Status</small>
                  <strong>{formatNumber(deviceRiskScore)}<em>/100</em></strong>
                  <p>{formatNumber(deviceRiskCount)} linked device risk record(s) found • policy based</p>
                </div>
                <StatusBadge status={riskStatus(deviceRiskCount, 1, 6)} />
              </div>
              <div className="itops-critical-risk-meter" aria-label="Risk score"><i style={{ width: `${clampPercent(deviceRiskScore)}%` }} /></div>
              <div className="itops-critical-risk-split">
                <button type="button" className="critical" onClick={() => openLevel3('risk', 'Critical')}>
                  <span>Critical Devices</span>
                  <strong>{formatNumber(criticalDeviceCount)}</strong>
                  <small>Linked device rows</small>
                </button>
                <button type="button" className="high" onClick={() => openLevel3('risk', 'High')}>
                  <span>High Devices</span>
                  <strong>{formatNumber(highDeviceCount)}</strong>
                  <small>Linked device rows</small>
                </button>
                <button type="button" className="device" onClick={() => openLevel3('risk', 'Device Risk')}>
                  <span>Total At Risk</span>
                  <strong>{formatNumber(deviceRiskCount)}</strong>
                  <small>{hasDeviceRiskRows ? 'Open device list' : 'No device from policy'}</small>
                </button>
              </div>
            </section>

            <section className="itops-critical-risk-driver-card">
              <div className="itops-critical-risk-driver-head">
                <div>
                  <small>Main Causes</small>
                  <strong>Top risk causes</strong>
                </div>
                <button type="button" onClick={() => openLevel3('risk')}>View All</button>
              </div>
              <div className="itops-critical-risk-driver-list">
                {mainRiskRows.length ? mainRiskRows.map((row) => {
                  const value = numberOrFallback(row.value);
                  return (
                    <button type="button" key={`risk-cause-${row.name}`} onClick={() => openLevel3('risk', row.name)}>
                      <div><strong>{row.name}</strong><span>{formatNumber(value)} record(s)</span></div>
                      <em><i style={{ width: `${Math.max(6, (value / maxRiskDriver) * 100)}%` }} /></em>
                    </button>
                  );
                }) : <EmptyState label="No EOL/EOS or Management Policy cause returned yet." />}
              </div>
            </section>
          </div>

          {hasDeviceRiskRows ? (
            <Panel title="Device Risk List" subtitle="Devices listed from EOL/EOS and Management Policy scoring." icon={Laptop}>{renderEndpointRiskDrillTable('level2')}</Panel>
          ) : (
            <Panel title="Device Risk" subtitle="Device rows appear when EOL/EOS or policy evidence reaches the risk threshold." icon={Laptop}>
              <div className="itops-risk-empty-note">
                <strong>No device risk from current policy.</strong>
                <p>Either no device meets the EOL/EOS criteria, or the Management Policy score values are below the risk threshold.</p>
              </div>
            </Panel>
          )}
          <Panel title="Device Risk Causes" subtitle="Only EOL/EOS and Management Policy score causes are shown here." icon={ShieldAlert}>{renderRiskDrillTable('level2')}</Panel>
        </div>
      );
    }

    if (view === 'software') {
      return (
        <div className="itops-pro-drawer-stack">
          <DrilldownTrace domain="Software" stage="breakdown" />
          <div className="itops-pro-story-panel">
            <strong>Software Estate & Application Lifecycle</strong>
            <p>Review installed software, classification exposure, remote tools, business applications and major application EOL/EOS signals before escalation.</p>
          </div>

          <div className="itops-pro-drill-grid">
            <DrillCard icon={Database} label="Installations" value={formatNumber(software.totalInstallations)} note="Total software records" tone="purple" onClick={() => openLevel3('software', 'Installations')} />
            <DrillCard icon={Database} label="Unique Software" value={formatNumber(software.uniqueSoftware)} note="Unique titles" tone="blue" onClick={() => openLevel3('software', 'Unique Software')} />
            <DrillCard icon={AlertTriangle} label="Unclassified" value={formatNumber(software.unclassifiedSoftware)} note="Needs cleanup/classification" tone="amber" onClick={() => openLevel3('software', 'Unclassified')} />
            <DrillCard icon={Layers3} label="Business Software" value={formatNumber(software.businessSoftware)} note="Microsoft, Adobe and business tools" tone="green" onClick={() => openLevel3('software', 'Business Software')} />
            <DrillCard icon={Wrench} label="Remote Control" value={formatNumber(software.remoteControlSoftware)} note="Remote access tools detected" tone="red" onClick={() => openLevel3('software', 'Remote Control')} />
            <DrillCard icon={ShieldCheck} label="Antivirus" value={formatNumber(software.antivirusSoftware)} note="Endpoint protection tools" tone="cyan" onClick={() => openLevel3('software', 'Antivirus')} />
            <DrillCard icon={Network} label="Web Browsers" value={formatNumber(software.browserSoftware)} note="Chrome, Edge, Firefox and browser tools" tone="blue" onClick={() => openLevel3('software', 'Web Browsers')} />
            <DrillCard icon={AlertTriangle} label="Gaming Software" value={formatNumber(software.gamingSoftware)} note="Non-business game software" tone="amber" onClick={() => openLevel3('software', 'Gaming Software')} />
          </div>

          <Panel title="Major Application EOL / EOS Watch" subtitle="Lifecycle view for Microsoft Office, Microsoft 365, Adobe, Google Chrome and Firefox from the backend lifecycle lookup." icon={CalendarDays}>
            {renderSoftwareLifecycleCards()}
          </Panel>

          <Panel title="Software Classification Statistics" subtitle="Click a statistic to open the matching software list." icon={BarChart3}>
            {renderBreakdownDrillCards(software.classificationBreakdown, 'software', 'No software classification statistics returned yet.')}
          </Panel>

          <Panel title="Software Categories" subtitle="Click a category for details." icon={Database}>
            {renderBreakdownDrillCards(software.topCategories, 'software', 'No software category data yet.')}
          </Panel>
        </div>
      );
    }

    if (view === 'network') {
      return (
        <div className="itops-pro-drawer-stack">
          <div className="itops-pro-story-panel"><strong>Network Coverage Breakdown</strong><p>Review known IPs, registered devices, active IPs and unregistered exposure before investigation.</p></div>
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
          <DrilldownTrace domain="Location" stage="breakdown" />
          <div className="itops-pro-story-panel"><strong>Location Breakdown</strong><p>See which devices have location data and which devices still need location mapping.</p></div>
          {renderLocationLevel2Stats()}
        </div>
      );
    }

    if (view === 'dataConfidence') {
      return (
        <div className="itops-pro-drawer-stack">
          <DrilldownTrace domain="Data Confidence" stage="breakdown" />
          <div className="itops-pro-story-panel"><strong>Data Check</strong><p>This view shows whether the dashboard data is ready to use. Low score means the data needs refresh, mapping or review.</p></div>
          <div className="itops-pro-drill-grid">
            {dataConfidenceRows.map((row) => (
              <DrillCard key={row.name} icon={Gauge} label={row.name} value={formatPercent(row.percent ?? row.value, 0)} note="Open details" tone={healthStatus(row.percent ?? row.value) === 'Healthy' ? 'green' : healthStatus(row.percent ?? row.value) === 'Watch' ? 'amber' : 'red'} onClick={() => openLevel3('dataConfidence', row.name)} />
            ))}
          </div>
          <Panel title="Confidence Drivers" subtitle="Signals used to judge whether the dashboard is ready for operational decisions." icon={BarChart3}><BarList items={dataConfidenceRows} limit={6} /></Panel>
        </div>
      );
    }

    if (view === 'attention') {
      return (
        <div className="itops-pro-drawer-stack">
          <div className="itops-pro-story-panel"><strong>Attention Queue Breakdown</strong><p>These are cross-module items that need operational ownership. Click each item to inspect details.</p></div>
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
            <strong>Dashboard Details</strong>
            <p>Selected: {selectedLabel}. This view shows the details behind the dashboard score.</p>
          </div>
          <HealthRadar items={domainHealth} onOpen={(view, item) => openLevel3(view, item)} />
          <IncidentTrendChart data={incidentTrend} summary={trendSummary} />
        </div>
      );
    }

    if (view === 'hardware') {
      return (
        <div className="itops-pro-drawer-stack">
          <div className="itops-pro-story-panel level3"><strong>Device Details</strong><p>Selected: {selectedLabel}. Review device status, inventory details, location and last seen time.</p></div>
          <div className="itops-pro-summary-row five">
            <MiniMetric label="Total" value={formatNumber(hardware.totalDevices)} tone="blue" />
            <MiniMetric label="Selected Rows" value={formatNumber(resolveHardwareEndpointRows(item).length)} tone="green" />
            <MiniMetric label="Online" value={formatNumber(hardware.onlineDevices)} tone="green" />
            <MiniMetric label="Offline" value={formatNumber(hardware.offlineDevices)} tone="red" />
            <MiniMetric label="Stale Sync" value={formatNumber(hardware.staleSync)} tone="amber" />
          </div>
          <Panel title="Device Records" subtitle="Device records for the selected item." icon={Laptop}>{renderHardwareEndpointEvidenceTable(item)}</Panel>
          <Panel title="Device Charts" subtitle="Charts for the selected devices." icon={BarChart3}>{renderEndpointFleetGraphs(item)}</Panel>
        </div>
      );
    }

    if (view === 'serviceDesk' || view === 'alerts') {
      const ticketRows = resolveTicketRows(item);
      const selectedOverdueCount = ticketRows.filter((row) => /overdue|late|breach/i.test(String(row.status || '')) || row.tone === 'danger').length;
      const selectedHighCount = ticketRows.filter((row) => row.severity === 'Critical' || row.severity === 'High').length;
      const selectedOwnerList = Array.from(new Set(ticketRows.map((row) => row.owner).filter(Boolean)));
      const selectedStatusList = Array.from(new Set(ticketRows.map((row) => row.status).filter(Boolean)));
      const selectedSystemList = Array.from(new Set(ticketRows.map((row) => row.system).filter(Boolean)));
      const ownerLabel = selectedOwnerList.length === 0 ? '-' : selectedOwnerList.length === 1 ? selectedOwnerList[0] : `${selectedOwnerList.length} assignees`;
      const statusLabel = selectedStatusList.length === 0 ? '-' : selectedStatusList.length === 1 ? selectedStatusList[0] : `${selectedStatusList.length} statuses`;
      const selectedPriorityRows = (['Critical', 'High', 'Medium', 'Low'] as Severity[])
        .map((severity) => ({ name: severity, value: ticketRows.filter((row) => row.severity === severity).length }))
        .filter((row) => row.value > 0);
      const priorityFallbackRows = serviceDesk.priorityBreakdown.map((row) => ({ name: row.label, value: row.value })).filter((row) => numberOrFallback(row.value) > 0);
      const priorityRows = selectedPriorityRows.length ? selectedPriorityRows : priorityFallbackRows;
      const priorityMax = Math.max(1, ...priorityRows.map((row) => numberOrFallback(row.value)));
      const nextActionText = selectedOverdueCount > 0
        ? 'Follow up overdue assignee first.'
        : selectedHighCount > 0
          ? 'Review critical or high priority ticket first.'
          : ticketRows.length > 0
            ? 'Monitor the queue and close normal tickets.'
            : 'No matching ticket row returned for this selection.';

      return (
        <div className="itops-pro-drawer-stack itops-ticket-detail-stack">
          <div className="itops-pro-story-panel level3"><strong>Ticket Details</strong><p>Selected: {selectedLabel}. This page only shows ticket rows and actions for the selected queue.</p></div>
          <div className="itops-pro-summary-row four">
            <MiniMetric label="Selected" value={formatNumber(ticketRows.length)} tone="blue" />
            <MiniMetric label="Overdue" value={formatNumber(selectedOverdueCount)} tone={selectedOverdueCount > 0 ? 'red' : 'green'} />
            <MiniMetric label="High Priority" value={formatNumber(selectedHighCount)} tone={selectedHighCount > 0 ? 'amber' : 'green'} />
            <MiniMetric label="Assignee" value={ownerLabel} tone="purple" />
          </div>
          {renderAlertDrillTable('level3', item)}

          <div className="itops-ticket-detail-lower-grid">
            <section className="itops-ticket-detail-card action">
              <div className="itops-ticket-detail-card-head">
                <span>Next Action</span>
                <strong>{selectedOverdueCount > 0 || selectedHighCount > 0 ? 'Check Now' : 'Monitor'}</strong>
              </div>
              <p>{nextActionText}</p>
              <div className="itops-ticket-detail-mini-grid">
                <div><span>Status</span><strong>{statusLabel}</strong></div>
                <div><span>Systems</span><strong>{formatNumber(selectedSystemList.length)}</strong></div>
              </div>
            </section>

            <section className="itops-ticket-detail-card priority">
              <div className="itops-ticket-detail-card-head">
                <span>Priority Mix</span>
                <strong>{formatNumber(priorityRows.reduce((total, row) => total + numberOrFallback(row.value), 0))}</strong>
              </div>
              <div className="itops-ticket-detail-priority-list">
                {priorityRows.length ? priorityRows.map((row) => {
                  const value = numberOrFallback(row.value);
                  const tone = row.name.toLowerCase();
                  return (
                    <button type="button" key={row.name} className={`itops-ticket-detail-priority ${tone}`} onClick={() => openLevel3('serviceDesk', row.name)}>
                      <span>{row.name}</span>
                      <em><i style={{ width: `${Math.max(6, (value / priorityMax) * 100)}%` }} /></em>
                      <strong>{formatNumber(value)}</strong>
                    </button>
                  );
                }) : <EmptyState label="No priority count for this selection." />}
              </div>
            </section>
          </div>

          <div className="itops-ticket-detail-note-card">
            <div>
              <span>Why this section exists</span>
              <strong>{ticketRows.length ? 'Shows selected ticket context only' : 'No ticket detail found'}</strong>
            </div>
            <p>{ticketRows.length ? 'Use the table above for assignee/status, then use the priority mix and next action box to decide what to check next.' : 'The selected card has no matching ticket row from the service desk data.'}</p>
          </div>
        </div>
      );
    }

    if (view === 'patch' || view === 'departments') {
      return (
        <div className="itops-pro-drawer-stack">
          {(() => {
            const securityDeviceRows = resolveSecurityUpdateDeviceRows(item);
            const selectedUpdatedRows = securityDeviceRows.filter((device) => device.updateStatus === 'Updated').length;
            const selectedNeedUpdateRows = securityDeviceRows.filter((device) => device.updateStatus === 'Need Update').length;
            const selectedBranchCount = new Set(securityDeviceRows.map((device) => device.department || 'Unmapped')).size;

            return (
              <>
                <div className="itops-pro-story-panel level3"><strong>Security Update Details</strong><p>Selected: {selectedLabel}. Device list is taken from Devices, then matched with the selected update score.</p></div>
                <div className="itops-pro-summary-row four">
                  <MiniMetric label="Selected Devices" value={formatNumber(securityDeviceRows.length)} tone="blue" />
                  <MiniMetric label="Updated" value={hasSecurityUpdateScore ? formatNumber(selectedUpdatedRows) : '-'} tone="green" />
                  <MiniMetric label="Need Update" value={hasSecurityUpdateScore ? formatNumber(selectedNeedUpdateRows) : '-'} tone="amber" />
                  <MiniMetric label="Branch" value={formatNumber(selectedBranchCount)} tone="purple" />
                </div>
                <Panel title="Device Update Details" subtitle="Each row shows device, branch and update status for the selected item." icon={ShieldCheck}>{renderSecurityUpdateDeviceTable(item)}</Panel>
              </>
            );
          })()}
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
          <Panel title="Job Type Overview" subtitle="Automation type distribution." icon={Wrench}><BarList items={tasks.jobTypeBreakdown} /></Panel>
        </div>
      );
    }

    if (view === 'risk') {
      const selectedRiskDevices = resolveRiskDeviceRows(item);
      const hasLinkedDeviceRows = selectedRiskDevices.length > 0;

      return (
        <div className="itops-pro-drawer-stack itops-risk-detail-stack itops-risk-selected-device-stack">
          <div className="itops-pro-story-panel level3">
            <strong>Device Risk Details</strong>
            <p>Selected: {selectedLabel}. This level only shows the selected device record and the reason it appears in the risk list.</p>
          </div>
          {hasLinkedDeviceRows ? (
            <Panel title="Selected Device Risk" subtitle="Device details and exact risk evidence from EOL/EOS, PC Aging and Management Policy score." icon={Laptop}>{renderEndpointRiskDrillTable('level3', item)}</Panel>
          ) : (
            <Panel title="Device Risk Cause Details" subtitle="No linked device row matched this selection. Showing the matched risk cause only." icon={ShieldAlert}>{renderRiskDrillTable('level3', item)}</Panel>
          )}
        </div>
      );
    }

    if (view === 'software') {
      const selectedRows = resolveSoftwareEvidenceRows(item);
      const selectedLifecycle = software.lifecycleWatch.find((row) => String(row.name || '').toLowerCase() === String(item || '').toLowerCase());

      return (
        <div className="itops-pro-drawer-stack">
          <DrilldownTrace domain="Software" stage="evidence" selected={selectedLabel} />
          <div className="itops-pro-story-panel level3">
            <strong>Software Inventory Evidence</strong>
            <p>Selected: {selectedLabel}. This list shows software records behind the selected statistic, including classification and application lifecycle signals where available.</p>
          </div>
          <div className="itops-pro-summary-row five">
            <MiniMetric label="Matched Rows" value={formatNumber(selectedRows.length)} tone="blue" />
            <MiniMetric label="Installations" value={formatNumber(software.totalInstallations)} tone="purple" />
            <MiniMetric label="Unique" value={formatNumber(software.uniqueSoftware)} tone="blue" />
            <MiniMetric label="Unclassified" value={formatNumber(software.unclassifiedSoftware)} tone="amber" />
            <MiniMetric label="EOL/EOS Watch" value={formatNumber(software.eolApplications + software.eosApplications)} tone="red" />
          </div>
          {selectedLifecycle && (
            <Panel title={`${selectedLifecycle.name} Lifecycle`} subtitle="Application lifecycle signal from backend lookup." icon={CalendarDays}>
              <div className="itops-pro-summary-row four">
                <MiniMetric label="Installs" value={formatNumber(selectedLifecycle.installs)} tone="purple" />
                <MiniMetric label="Unique Titles" value={formatNumber(selectedLifecycle.uniqueTitles)} tone="blue" />
                <MiniMetric label="Status" value={selectedLifecycle.lifecycleStatus || '-'} tone={getSoftwareLifecycleTone(selectedLifecycle)} />
                <MiniMetric label="EOL/EOS Date" value={selectedLifecycle.eolDate || selectedLifecycle.eosDate || '-'} tone="amber" />
              </div>
            </Panel>
          )}
          <Panel title="Software Records" subtitle="Click another software statistic from Level 2 to filter this table." icon={Database}>
            {renderSoftwareInventoryTable(item)}
          </Panel>
          <Panel title="Classification Overview" icon={BarChart3}>
            <BarList items={software.classificationBreakdown.length ? software.classificationBreakdown : software.topCategories} />
          </Panel>
        </div>
      );
    }

    if (view === 'network') {
      return (
        <div className="itops-pro-drawer-stack">
          <div className="itops-pro-story-panel level3"><strong>Network Details</strong><p>Selected: {selectedLabel}. Inspect registered coverage, unregistered IP exposure and workgroup distribution.</p></div>
          <div className="itops-pro-summary-row five">
            <MiniMetric label="Known IP" value={formatNumber(network.knownIps)} tone="cyan" />
            <MiniMetric label="Registered" value={formatNumber(network.registeredDevices)} tone="green" />
            <MiniMetric label="Unregistered" value={formatNumber(network.unregisteredIps)} tone="amber" />
            <MiniMetric label="Active IP" value={formatNumber(network.activeIps)} tone="blue" />
            <MiniMetric label="Subnets" value={formatNumber(network.subnetCount)} tone="purple" />
          </div>
          <Panel title="Workgroup Overview" icon={Network}><BarList items={network.workgroups} /></Panel>
        </div>
      );
    }

    if (view === 'geolocation') {
      const affectedRows = resolveGeoEvidenceRows(item);
      return (
        <div className="itops-pro-drawer-stack">
          <DrilldownTrace domain="Location" stage="evidence" selected={selectedLabel} />
          <div className="itops-pro-story-panel level3"><strong>Device Location Details</strong><p>Selected: {selectedLabel}. This shows the devices behind the selected location status.</p></div>
          <div className="itops-pro-summary-row four">
            <MiniMetric label="Rows" value={formatNumber(affectedRows.length)} tone="blue" note="device records" />
            <MiniMetric label="With Location" value={formatNumber(geolocation.trackedDevices)} tone="green" note="ready records" />
            <MiniMetric label="Not Mapped" value={formatNumber(risk.missingGeoDevices)} tone="purple" note="need mapping" />
            <MiniMetric label="Location Data" value={formatPercent(locationFreshPercent, 0)} tone="cyan" note="ready rate" />
          </div>
          <Panel title="Device Records" subtitle="Device records for the selected location status." icon={MapPin}>{renderGeoDeviceEvidenceTable(item)}</Panel>
          <div className="itops-evidence-note"><strong>Next action:</strong><span>For not mapped devices, check branch or location mapping. Devices with location can be used for reporting and drilldown.</span></div>
        </div>
      );
    }

    if (view === 'dataConfidence') {
      const selectedRow = dataConfidenceRows.find((row) => row.name === item);
      return (
        <div className="itops-pro-drawer-stack">
          <DrilldownTrace domain="Data Confidence" stage="evidence" selected={selectedLabel} />
          <div className="itops-pro-story-panel level3"><strong>Data Check Details</strong><p>Selected: {selectedLabel}. This view explains whether the dashboard data is ready to use.</p></div>
          <div className="itops-pro-summary-row four">
            <MiniMetric label="Overall Confidence" value={formatPercent(dataConfidenceScore, 0)} tone="blue" />
            <MiniMetric label="Device Data" value={formatPercent(endpointFreshnessPercent, 0)} tone="blue" />
            <MiniMetric label="Location Data" value={formatPercent(locationFreshPercent, 0)} tone="green" />
            <MiniMetric label="Network Mapping" value={formatPercent(networkRegistrationPercent, 0)} tone="cyan" />
          </div>
          {selectedRow && <Panel title="Selected Confidence Driver" subtitle="Selected metric calculation result." icon={Gauge}><BarList items={[selectedRow]} limit={1} /></Panel>}
          <Panel title="All Confidence Drivers" subtitle="This is the data quality layer behind the KPI cards." icon={BarChart3}><BarList items={dataConfidenceRows} limit={6} /></Panel>
          <div className="itops-evidence-note"><strong>How to read this:</strong><span>Low confidence does not always mean operational failure. It means the data needs refresh, mapping or classification review before the dashboard can be used for final decisions.</span></div>
        </div>
      );
    }

    if (view === 'attention') {
      return (
        <div className="itops-pro-drawer-stack">
          <div className="itops-pro-story-panel level3"><strong>Action Queue Details</strong><p>Selected: {selectedLabel}. Review the details behind the attention queue.</p></div>
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
    const levelLabel = drilldown.level === 'level3' ? 'Details' : 'Breakdown';
    return {
      title: `${levelLabel}: ${baseMeta.title}`,
      subtitle: drilldown.level === 'level3'
        ? `${baseMeta.subtitle} Selected: ${drilldown.item || 'All details'}.`
        : `${baseMeta.subtitle} Click any row or card to view details.`,
    };
  }, [activeView]);

  return (
    <div ref={pageRef} className="itops-pro-page">
      <style>{ITOPS_PRO_STYLES}</style>

      <div className="itops-pro-bg-grid" />

      <header className="itops-pro-hero">
        <div>
          <span className="itops-pro-overline"><Sparkles size={15} /> Dashboard</span>
          <h1>IT Overview</h1>
          <p>Simple view for devices, tickets, updates, jobs, location and risk.</p>
          <div className="itops-pro-hero-meta">
            <span><CalendarDays size={14} /> Range: {rangeLabel || '-'}</span>
            <span><Activity size={14} /> Generated: {formatDateLabel(generatedAt)}</span>
            <span><Gauge size={14} /> Overall: {formatPercent(overallHealth, 0)}</span>
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
            <strong>Dashboard data error</strong>
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
                <span className="itops-pro-overline"><Filter size={14} /> Details View</span>
                <h2>{activeMeta.title}</h2>
                <p>{activeMeta.subtitle}</p>
              </div>
              <div className="itops-pro-modal-actions">
                <button type="button" className="itops-pro-back" onClick={handleDrilldownBack}>
                  <ArrowLeft size={18} /> {viewHistory.length > 0 ? 'Back' : parseDrilldownKey(activeView).level === 'level3' ? 'Back to Breakdown' : 'Back to Dashboard'}
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
  color: #0369a1;
  background: #eff6ff;
}

.itops-pro-link-btn {
  width: 100%;
  min-height: 42px;
  margin-top: 14px;
  color: #0369a1;
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
  color: #0ea5e9;
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
  background: linear-gradient(135deg, #0ea5e9, #7c3aed);
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
  background: #0ea5e9;
  box-shadow: 0 14px 30px rgba(37, 99, 235, 0.22);
}

.itops-pro-kpi-blue .itops-pro-kpi-icon { background: linear-gradient(135deg, #0ea5e9, #38bdf8); }
.itops-pro-kpi-green .itops-pro-kpi-icon { background: linear-gradient(135deg, #059669, #38bdf8); }
.itops-pro-kpi-amber .itops-pro-kpi-icon { background: linear-gradient(135deg, #d97706, #fbbf24); }
.itops-pro-kpi-red .itops-pro-kpi-icon { background: linear-gradient(135deg, #dc2626, #f59e0b); }
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
  background: linear-gradient(90deg, #0ea5e9, #22c55e);
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

.itops-pro-status-healthy { color: #0369a1; background: #e0f2fe; }
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
  color: #0369a1;
  background: #eff6ff;
}

.itops-pro-health-action .itops-pro-health-icon { color: #b91c1c; background: #fef2f2; }
.itops-pro-health-watch .itops-pro-health-icon { color: #92400e; background: #fffbeb; }
.itops-pro-health-healthy .itops-pro-health-icon { color: #0369a1; background: #ecfdf5; }

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
  background: linear-gradient(90deg, #0ea5e9, #22c55e);
}

.itops-pro-health-footer small {
  color: #64748b;
  font-size: 11px;
  font-weight: 850;
}

.itops-pro-health-footer svg {
  color: #0ea5e9;
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
  color: #0ea5e9;
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
  color: #0369a1;
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
.itops-pro-legend .new { background: #0ea5e9; }
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

.itops-pulse-data strong.new { color: #0369a1; }
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

.itops-pro-table-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-top: 1px solid #e2e8f0;
  background: linear-gradient(180deg, #ffffff, #f8fafc);
}

.itops-pro-table-page-range {
  flex: 0 0 auto;
  color: #64748b;
  font-size: 12px;
  font-weight: 900;
}

.itops-pro-table-page-controls {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 7px;
  min-width: 0;
}

.itops-pro-table-page-item {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.itops-pro-table-page-item em {
  color: #94a3b8;
  font-size: 12px;
  font-style: normal;
  font-weight: 900;
}

.itops-pro-table-page-controls button {
  min-width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 11px;
  border: 1px solid #dbe3ef;
  border-radius: 999px;
  background: #ffffff;
  color: #475569;
  font-size: 12px;
  font-weight: 900;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, color 0.18s ease;
}

.itops-pro-table-page-controls button:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: #93c5fd;
  color: #0369a1;
}

.itops-pro-table-page-controls button.active {
  border-color: #0ea5e9;
  background: #0ea5e9;
  color: #ffffff;
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.22);
}

.itops-pro-table-page-controls button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

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
  background: #0ea5e9;
}

.itops-pro-insight p,
.itops-pro-insight strong,
.itops-pro-insight small { display: block; margin: 0; }
.itops-pro-insight p { color: #64748b; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.07em; }
.itops-pro-insight strong { margin-top: 3px; color: #0f172a; font-size: 24px; font-weight: 950; letter-spacing: -0.04em; }
.itops-pro-insight small { margin-top: 2px; color: #64748b; font-size: 12px; font-weight: 700; }
.itops-pro-insight-blue .itops-pro-insight-icon { background: linear-gradient(135deg, #0ea5e9, #38bdf8); }
.itops-pro-insight-purple .itops-pro-insight-icon { background: linear-gradient(135deg, #7c3aed, #c084fc); }
.itops-pro-insight-cyan .itops-pro-insight-icon { background: linear-gradient(135deg, #0891b2, #22d3ee); }
.itops-pro-insight-green .itops-pro-insight-icon { background: linear-gradient(135deg, #059669, #38bdf8); }


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
  color: #0369a1;
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
  background: linear-gradient(180deg, #0ea5e9, #22c55e);
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

.itops-pro-modal-head .itops-pro-overline { color: #0ea5e9; margin-bottom: 8px; }
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
  color: #0369a1;
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

.itops-endpoint-graph-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.itops-endpoint-graph-card {
  min-width: 0;
  padding: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  background: linear-gradient(180deg, #ffffff, #f8fafc);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
}

.itops-endpoint-graph-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.itops-endpoint-graph-head span {
  color: #475569;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.02em;
}

.itops-endpoint-graph-head strong {
  color: #0f172a;
  font-size: 18px;
  font-weight: 950;
}

.itops-endpoint-graph-bars {
  display: grid;
  gap: 10px;
}

.itops-endpoint-graph-row {
  display: grid;
  grid-template-columns: minmax(100px, 1.1fr) minmax(120px, 1.4fr) 46px;
  align-items: center;
  gap: 10px;
}

.itops-endpoint-graph-row div {
  min-width: 0;
}

.itops-endpoint-graph-row strong {
  display: block;
  overflow: hidden;
  color: #0f172a;
  font-size: 12px;
  font-weight: 950;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.itops-endpoint-graph-row span {
  display: block;
  color: #64748b;
  font-size: 11px;
  font-weight: 800;
}

.itops-endpoint-graph-row em {
  display: block;
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: #e2e8f0;
}

.itops-endpoint-graph-row em i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #0ea5e9, #38bdf8);
}

.itops-endpoint-graph-row b {
  color: #334155;
  font-size: 12px;
  font-weight: 950;
  text-align: right;
}


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
  background: linear-gradient(135deg, #0ea5e9, #38bdf8);
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

.itops-pro-drill-card-green .itops-pro-drill-icon { background: linear-gradient(135deg, #059669, #38bdf8); }
.itops-pro-drill-card-amber .itops-pro-drill-icon { background: linear-gradient(135deg, #d97706, #fbbf24); }
.itops-pro-drill-card-red .itops-pro-drill-icon { background: linear-gradient(135deg, #dc2626, #f59e0b); }
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
  background: linear-gradient(90deg, #0ea5e9, #7c3aed, #ef4444);
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
  .itops-pro-drill-grid.compact,
  .itops-endpoint-graph-grid { grid-template-columns: 1fr; }
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
  background: linear-gradient(90deg, #0ea5e9, #7c3aed, #ef4444);
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
.itops-data-confidence-icon { display: inline-flex; align-items: center; justify-content: center; width: 42px; height: 42px; border-radius: 16px; color: #fff; background: linear-gradient(135deg, #0ea5e9, #06b6d4); }
.itops-data-confidence-head span { display: block; color: #64748b; font-size: 11px; font-weight: 950; letter-spacing: .07em; text-transform: uppercase; }
.itops-data-confidence-head strong { display: block; margin-top: 2px; color: #0f172a; font-size: 28px; line-height: 1; font-weight: 950; letter-spacing: -0.05em; }
.itops-data-confidence-head small { display: block; margin-top: 5px; color: #64748b; font-size: 11px; font-weight: 750; }
.itops-data-confidence-meter { height: 8px; overflow: hidden; border-radius: 999px; background: #e2e8f0; }
.itops-data-confidence-meter i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #0ea5e9, #14b8a6, #22c55e); }
.itops-data-confidence-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.itops-data-confidence-grid div { min-width: 0; border: 1px solid rgba(226, 232, 240, .9); border-radius: 14px; padding: 9px 10px; background: rgba(248, 250, 252, .85); }
.itops-data-confidence-grid span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #64748b; font-size: 10px; font-weight: 900; }
.itops-data-confidence-grid strong { display: block; margin-top: 3px; color: #0f172a; font-size: 15px; font-weight: 950; }
.itops-risk-driver-mini { margin-top: 12px; padding: 12px; border: 1px solid rgba(226, 232, 240, .9); border-radius: 18px; background: rgba(248, 250, 252, .78); }
.itops-drill-trace { display: inline-flex; align-items: center; flex-wrap: wrap; gap: 8px; padding: 9px 12px; border: 1px solid rgba(147, 197, 253, .65); border-radius: 999px; background: rgba(239, 246, 255, .88); color: #475569; font-size: 11px; font-weight: 900; }
.itops-drill-trace span { padding: 4px 9px; border-radius: 999px; background: #e2e8f0; color: #64748b; text-transform: uppercase; letter-spacing: .06em; }
.itops-drill-trace span.done { background: #e0f2fe; color: #166534; }
.itops-drill-trace span.active { background: #0ea5e9; color: #fff; }
.itops-drill-trace small { color: #334155; font-weight: 850; }
.itops-location-list { display: grid; gap: 10px; }
.itops-location-list button { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 12px; align-items: center; width: 100%; border: 1px solid rgba(226, 232, 240, .96); border-radius: 16px; padding: 12px 14px; background: #fff; text-align: left; cursor: pointer; }
.itops-location-list button:hover { border-color: rgba(37, 99, 235, .34); box-shadow: 0 10px 24px rgba(15, 23, 42, .07); }
.itops-location-list strong { display: block; color: #0f172a; font-size: 13px; line-height: 1.35; font-weight: 900; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.itops-location-list span { display: block; margin-top: 4px; color: #64748b; font-size: 11px; font-weight: 750; }
.itops-location-list em { font-style: normal; color: #0f172a; font-size: 13px; font-weight: 950; }
.itops-evidence-note { display: flex; gap: 8px; align-items: flex-start; padding: 13px 14px; border: 1px solid rgba(147, 197, 253, .65); border-radius: 18px; background: #eff6ff; color: #334155; }
.itops-evidence-note strong { color: #0369a1; font-size: 12px; font-weight: 950; white-space: nowrap; }
.itops-evidence-note span { color: #475569; font-size: 12px; font-weight: 760; line-height: 1.45; }

@media (max-width: 900px) {
  .itops-data-confidence-grid { grid-template-columns: 1fr; }
  .itops-location-list button { grid-template-columns: minmax(0, 1fr) auto; }
  .itops-location-list button svg { display: none; }
}


/* Location Level 2 layout */
.itops-location-level2 {
  display: grid;
  grid-template-columns: minmax(330px, .86fr) minmax(0, 1.32fr);
  gap: 14px;
  align-items: stretch;
}
.itops-location-status-card,
.itops-location-summary-card,
.itops-location-list-card,
.itops-location-insight-card {
  min-width: 0;
  border: 1px solid rgba(191, 219, 254, .88);
  border-radius: 22px;
  background: linear-gradient(145deg, #ffffff, #f8fbff);
  box-shadow: 0 16px 36px rgba(15, 23, 42, .06);
}
.itops-location-status-card { padding: 16px; background: radial-gradient(circle at 18% 8%, rgba(219, 234, 254, .92), transparent 34%), radial-gradient(circle at 92% 4%, rgba(204, 251, 241, .78), transparent 34%), #fff; }
.itops-location-summary-card { padding: 16px; }
.itops-location-list-card,
.itops-location-insight-card { padding: 15px; }
.itops-location-card-head,
.itops-location-summary-head,
.itops-location-list-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.itops-location-card-head span,
.itops-location-summary-head span,
.itops-location-list-head span {
  display: block;
  color: #64748b;
  font-size: 11px;
  font-weight: 950;
  letter-spacing: .07em;
  text-transform: uppercase;
}
.itops-location-card-head strong,
.itops-location-summary-head strong,
.itops-location-list-head strong {
  display: block;
  margin-top: 4px;
  color: #0f172a;
  font-size: 24px;
  line-height: 1;
  font-weight: 950;
  letter-spacing: -.04em;
}
.itops-location-card-head small,
.itops-location-summary-head small,
.itops-location-list-head small {
  display: block;
  margin-top: 5px;
  color: #64748b;
  font-size: 11px;
  font-weight: 780;
}
.itops-location-card-head button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(37, 99, 235, .18);
  border-radius: 999px;
  padding: 7px 10px;
  background: rgba(239, 246, 255, .9);
  color: #0369a1;
  font-size: 11px;
  font-weight: 900;
  cursor: pointer;
}
.itops-location-score-wrap {
  display: grid;
  grid-template-columns: 190px minmax(0, 1fr);
  gap: 16px;
  align-items: center;
}
.itops-location-score {
  display: grid;
  place-items: center;
  width: 174px;
  height: 174px;
  border-radius: 36px;
  background: conic-gradient(from 220deg, #14b8a6 var(--location-score), #e2e8f0 0);
  position: relative;
  box-shadow: inset 0 0 0 1px rgba(20, 184, 166, .12), 0 18px 34px rgba(15, 23, 42, .08);
}
.itops-location-score::after {
  content: '';
  position: absolute;
  inset: 18px;
  border-radius: 28px;
  background: #fff;
  box-shadow: inset 0 0 0 1px rgba(226, 232, 240, .85);
}
.itops-location-score strong,
.itops-location-score span { position: relative; z-index: 1; text-align: center; }
.itops-location-score strong { align-self: end; color: #0f172a; font-size: 34px; line-height: .9; font-weight: 950; letter-spacing: -.06em; }
.itops-location-score span { align-self: start; margin-top: 6px; color: #64748b; font-size: 11px; font-weight: 900; }
.itops-location-status-bars { display: grid; gap: 10px; }
.itops-location-status-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 11px;
  align-items: center;
  width: 100%;
  border: 1px solid rgba(226, 232, 240, .95);
  border-radius: 18px;
  padding: 11px 12px;
  background: rgba(255, 255, 255, .92);
  text-align: left;
  cursor: pointer;
}
.itops-location-status-row:hover { border-color: rgba(20, 184, 166, .35); box-shadow: 0 12px 24px rgba(15, 23, 42, .07); }
.itops-location-status-icon { display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 13px; color: #fff; background: linear-gradient(135deg, #14b8a6, #0ea5e9); }
.itops-location-status-row-amber .itops-location-status-icon { background: linear-gradient(135deg, #f59e0b, #f97316); }
.itops-location-status-row-green .itops-location-status-icon { background: linear-gradient(135deg, #0ea5e9, #14b8a6); }
.itops-location-status-row strong { display: block; color: #0f172a; font-size: 13px; font-weight: 950; }
.itops-location-status-row small { display: block; margin-top: 3px; color: #64748b; font-size: 10px; font-weight: 780; }
.itops-location-status-row em { display: block; height: 7px; margin-top: 8px; overflow: hidden; border-radius: 999px; background: #e2e8f0; }
.itops-location-status-row em i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #14b8a6, #0ea5e9); }
.itops-location-status-row-amber em i { background: linear-gradient(90deg, #f59e0b, #f97316); }
.itops-location-status-row b { color: #0f172a; font-size: 18px; font-weight: 950; }
.itops-location-mini-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.itops-location-mini-card {
  min-width: 0;
  min-height: 94px;
  border: 1px solid rgba(226, 232, 240, .95);
  border-radius: 18px;
  padding: 12px;
  background: #fff;
  text-align: left;
  cursor: pointer;
}
.itops-location-mini-card:hover { border-color: rgba(37, 99, 235, .26); box-shadow: 0 12px 22px rgba(15, 23, 42, .06); }
.itops-location-mini-card.warning { background: linear-gradient(145deg, #fff, #fffbeb); }
.itops-location-mini-card span { display: block; color: #64748b; font-size: 10px; font-weight: 950; letter-spacing: .06em; text-transform: uppercase; }
.itops-location-mini-card strong { display: block; margin-top: 7px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #0f172a; font-size: 22px; line-height: 1; font-weight: 950; letter-spacing: -.04em; }
.itops-location-mini-card small { display: block; margin-top: 7px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #64748b; font-size: 10px; font-weight: 760; }
.itops-location-action-box {
  margin-top: 12px;
  border: 1px solid rgba(37, 99, 235, .18);
  border-radius: 18px;
  padding: 12px;
  background: linear-gradient(135deg, #eff6ff, #f0fdfa);
}
.itops-location-action-box span { display: block; color: #0ea5e9; font-size: 10px; font-weight: 950; letter-spacing: .06em; text-transform: uppercase; }
.itops-location-action-box strong { display: block; margin-top: 5px; color: #0f172a; font-size: 14px; font-weight: 950; }
.itops-location-action-box p { margin: 5px 0 0; color: #475569; font-size: 12px; line-height: 1.45; font-weight: 740; }
.itops-location-list-card { grid-column: 1 / 2; }
.itops-location-insight-card { grid-column: 2 / 3; }
.itops-location-insight-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.itops-location-insight-grid div { min-width: 0; border: 1px solid rgba(226, 232, 240, .92); border-radius: 16px; padding: 11px; background: #fff; }
.itops-location-insight-grid span { display: block; color: #64748b; font-size: 10px; font-weight: 930; text-transform: uppercase; letter-spacing: .05em; }
.itops-location-insight-grid strong { display: block; margin-top: 5px; color: #0f172a; font-size: 18px; font-weight: 950; }
.itops-location-wide-meter { height: 10px; margin-top: 13px; overflow: hidden; border-radius: 999px; background: #e2e8f0; }
.itops-location-wide-meter i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #14b8a6, #0ea5e9); }
@media (max-width: 1100px) {
  .itops-location-level2 { grid-template-columns: 1fr; }
  .itops-location-list-card,
  .itops-location-insight-card { grid-column: auto; }
}
@media (max-width: 780px) {
  .itops-location-score-wrap { grid-template-columns: 1fr; }
  .itops-location-score { width: 150px; height: 150px; justify-self: center; }
  .itops-location-mini-grid,
  .itops-location-insight-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 520px) {
  .itops-location-mini-grid,
  .itops-location-insight-grid { grid-template-columns: 1fr; }
}


/* Drilldown modal sizing + compact level 2 card layout */
.itops-pro-modal-overlay {
  padding: 14px !important;
  align-items: center !important;
}

.itops-pro-drill-modal {
  width: min(1500px, calc(100vw - 28px)) !important;
  max-height: min(94vh, 980px) !important;
  border-radius: 26px !important;
}

.itops-pro-modal-head {
  padding: 18px 22px 15px !important;
  gap: 14px !important;
}

.itops-pro-modal-head .itops-pro-overline {
  margin-bottom: 5px !important;
  font-size: 11px !important;
}

.itops-pro-modal-head h2 {
  font-size: 24px !important;
  letter-spacing: -0.045em !important;
}

.itops-pro-modal-head p {
  max-width: 920px !important;
  margin-top: 5px !important;
  font-size: 12px !important;
  line-height: 1.35 !important;
}

.itops-pro-modal-actions {
  gap: 8px !important;
}

.itops-pro-back,
.itops-pro-close {
  min-height: 38px !important;
  padding: 9px 12px !important;
  border-radius: 14px !important;
  font-size: 12px !important;
}

.itops-pro-modal-body {
  padding: 16px 18px 20px !important;
}

.itops-pro-drill-modal .itops-pro-drawer-stack {
  gap: 11px !important;
}

.itops-pro-drill-modal .itops-pro-story-panel {
  padding: 12px 14px !important;
  border-radius: 18px !important;
}

.itops-pro-drill-modal .itops-pro-story-panel strong {
  font-size: 13px !important;
}

.itops-pro-drill-modal .itops-pro-story-panel p {
  margin-top: 4px !important;
  font-size: 12px !important;
  line-height: 1.35 !important;
}

.itops-pro-drill-modal .itops-pro-drill-grid,
.itops-pro-drill-modal .itops-pro-drill-grid.compact {
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  gap: 10px !important;
}

.itops-pro-drill-modal .itops-pro-drill-card {
  min-height: 74px !important;
  grid-template-columns: 34px minmax(0, 1fr) !important;
  align-items: center !important;
  gap: 10px !important;
  padding: 11px 12px !important;
  border-radius: 16px !important;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.045) !important;
}

.itops-pro-drill-modal .itops-pro-drill-card:hover,
.itops-pro-drill-modal .itops-pro-clickable-row:hover {
  transform: translateY(-1px) !important;
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.10) !important;
}

.itops-pro-drill-modal .itops-pro-drill-icon {
  width: 34px !important;
  height: 34px !important;
  border-radius: 12px !important;
}

.itops-pro-drill-modal .itops-pro-drill-icon svg {
  width: 16px !important;
  height: 16px !important;
}

.itops-pro-drill-modal .itops-pro-drill-card > svg {
  position: absolute !important;
  top: 10px !important;
  right: 10px !important;
  width: 13px !important;
  height: 13px !important;
  color: #cbd5e1 !important;
}

.itops-pro-drill-modal .itops-pro-drill-card span:not(.itops-pro-drill-icon) {
  overflow: hidden !important;
  font-size: 10px !important;
  letter-spacing: 0.055em !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

.itops-pro-drill-modal .itops-pro-drill-card strong {
  margin-top: 2px !important;
  font-size: 18px !important;
  line-height: 1 !important;
}

.itops-pro-drill-modal .itops-pro-drill-card small {
  margin-top: 3px !important;
  padding-right: 10px !important;
  overflow: hidden !important;
  color: #64748b !important;
  font-size: 10.5px !important;
  line-height: 1.25 !important;
  display: -webkit-box !important;
  -webkit-line-clamp: 2 !important;
  -webkit-box-orient: vertical !important;
}

.itops-pro-drill-modal .itops-pro-panel {
  padding: 14px !important;
  border-radius: 20px !important;
}

.itops-pro-drill-modal .itops-pro-panel-head {
  margin-bottom: 10px !important;
  padding-bottom: 10px !important;
}

.itops-pro-drill-modal .itops-pro-panel-title h2 {
  font-size: 15px !important;
}

.itops-pro-drill-modal .itops-pro-panel-title p {
  font-size: 11.5px !important;
}

.itops-pro-drill-modal .itops-pro-summary-row,
.itops-pro-drill-modal .itops-pro-summary-row.four,
.itops-pro-drill-modal .itops-pro-summary-row.five {
  gap: 9px !important;
}

.itops-pro-drill-modal .itops-pro-mini,
.itops-pro-drill-modal .itops-pro-insight {
  min-height: 72px !important;
  padding: 11px 12px !important;
  border-radius: 16px !important;
}

.itops-pro-drill-modal .itops-pro-mini strong,
.itops-pro-drill-modal .itops-pro-insight strong {
  font-size: 18px !important;
}

.itops-pro-drill-modal .itops-pro-table th,
.itops-pro-drill-modal .itops-pro-table td {
  padding-top: 9px !important;
  padding-bottom: 9px !important;
}

.itops-pro-drill-modal .itops-endpoint-graph-card {
  padding: 12px !important;
  border-radius: 17px !important;
}

.itops-pro-drill-modal .itops-endpoint-graph-grid {
  gap: 10px !important;
}

@media (max-width: 1280px) {
  .itops-pro-drill-modal .itops-pro-drill-grid,
  .itops-pro-drill-modal .itops-pro-drill-grid.compact {
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  }
}

@media (max-width: 900px) {
  .itops-pro-drill-modal .itops-pro-drill-grid,
  .itops-pro-drill-modal .itops-pro-drill-grid.compact {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
}

@media (max-width: 560px) {
  .itops-pro-drill-modal {
    width: 100% !important;
    max-height: 94vh !important;
    border-radius: 20px !important;
  }

  .itops-pro-drill-modal .itops-pro-drill-grid,
  .itops-pro-drill-modal .itops-pro-drill-grid.compact {
    grid-template-columns: 1fr !important;
  }
}


/* Endpoint Fleet level 2 redesign: graph left, compact square cards right */
.itops-pro-drill-modal .itops-endpoint-level2-layout {
  display: grid;
  grid-template-columns: minmax(310px, 0.82fr) minmax(360px, 1.18fr);
  gap: 14px;
  align-items: stretch;
}

.itops-endpoint-stat-visual-card {
  position: relative;
  min-height: 330px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 14px;
  width: 100%;
  padding: 18px;
  overflow: hidden;
  border: 1px solid rgba(191, 219, 254, 0.85);
  border-radius: 28px;
  background:
    radial-gradient(circle at 16% 12%, rgba(37, 99, 235, 0.14), transparent 34%),
    radial-gradient(circle at 90% 4%, rgba(16, 185, 129, 0.14), transparent 32%),
    linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.08);
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.itops-endpoint-stat-visual-card:hover {
  transform: translateY(-2px);
  border-color: rgba(37, 99, 235, 0.45);
  box-shadow: 0 22px 42px rgba(37, 99, 235, 0.14);
}

.itops-endpoint-stat-copy span,
.itops-endpoint-legend-grid span {
  color: #64748b;
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.itops-endpoint-stat-copy strong {
  display: block;
  margin-top: 6px;
  color: #0f172a;
  font-size: 42px;
  font-weight: 950;
  letter-spacing: -0.07em;
  line-height: 0.92;
}

.itops-endpoint-stat-copy small {
  display: block;
  max-width: 260px;
  margin-top: 8px;
  color: #64748b;
  font-size: 12px;
  font-weight: 750;
  line-height: 1.38;
}

.itops-endpoint-donut-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 146px;
}

.itops-endpoint-donut {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 168px;
  height: 168px;
  border-radius: 50%;
  background: conic-gradient(#0ea5e9 0 var(--online), #ef4444 var(--online) var(--offline), #e2e8f0 var(--offline) 100%);
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.04), 0 16px 36px rgba(15, 23, 42, 0.08);
}

.itops-endpoint-donut::after {
  content: '';
  position: absolute;
  inset: 18px;
  border-radius: inherit;
  background: #ffffff;
  box-shadow: inset 0 0 0 1px rgba(226, 232, 240, 0.9);
}

.itops-endpoint-donut i {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  font-style: normal;
  text-align: center;
}

.itops-endpoint-donut strong {
  color: #0f172a;
  font-size: 28px;
  font-weight: 950;
  letter-spacing: -0.06em;
  line-height: 1;
}

.itops-endpoint-donut small {
  margin-top: 4px;
  color: #64748b;
  font-size: 11px;
  font-weight: 900;
}

.itops-endpoint-legend-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.itops-endpoint-legend-grid span {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
  padding: 9px 10px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.86);
  text-transform: none;
  letter-spacing: 0;
  white-space: nowrap;
}

.itops-endpoint-legend-grid span i {
  flex: 0 0 auto;
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: #94a3b8;
}

.itops-endpoint-legend-grid span strong {
  margin-left: auto;
  color: #0f172a;
  font-size: 12px;
  font-weight: 950;
}

.itops-endpoint-legend-grid .online i { background: #0ea5e9; }
.itops-endpoint-legend-grid .offline i { background: #ef4444; }
.itops-endpoint-legend-grid .stale i { background: #f59e0b; }
.itops-endpoint-legend-grid .fresh i { background: #0ea5e9; }

.itops-pro-drill-modal .itops-endpoint-level2-cards {
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  gap: 12px !important;
}

.itops-pro-drill-modal .itops-endpoint-level2-cards .itops-pro-drill-card,
.itops-pro-drill-modal .itops-pro-drill-grid.square .itops-pro-drill-card {
  min-height: 0 !important;
  aspect-ratio: 1 / 1 !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: flex-start !important;
  justify-content: space-between !important;
  gap: 10px !important;
  padding: 14px !important;
  border-radius: 22px !important;
}

.itops-pro-drill-modal .itops-endpoint-level2-cards .itops-pro-drill-card {
  min-height: 156px !important;
}

.itops-pro-drill-modal .itops-pro-drill-grid.square {
  grid-template-columns: repeat(auto-fill, minmax(148px, 1fr)) !important;
  gap: 10px !important;
}

.itops-pro-drill-modal .itops-pro-drill-grid.square .itops-pro-drill-card {
  min-height: 148px !important;
}

.itops-pro-drill-modal .itops-endpoint-level2-cards .itops-pro-drill-card > div,
.itops-pro-drill-modal .itops-pro-drill-grid.square .itops-pro-drill-card > div {
  width: 100% !important;
  min-width: 0 !important;
}

.itops-pro-drill-modal .itops-endpoint-level2-cards .itops-pro-drill-icon,
.itops-pro-drill-modal .itops-pro-drill-grid.square .itops-pro-drill-icon {
  width: 38px !important;
  height: 38px !important;
  border-radius: 14px !important;
}

.itops-pro-drill-modal .itops-endpoint-level2-cards .itops-pro-drill-card span:not(.itops-pro-drill-icon),
.itops-pro-drill-modal .itops-pro-drill-grid.square .itops-pro-drill-card span:not(.itops-pro-drill-icon) {
  display: -webkit-box !important;
  min-height: 26px !important;
  overflow: hidden !important;
  font-size: 10px !important;
  line-height: 1.3 !important;
  letter-spacing: 0.05em !important;
  text-overflow: initial !important;
  white-space: normal !important;
  -webkit-line-clamp: 2 !important;
  -webkit-box-orient: vertical !important;
}

.itops-pro-drill-modal .itops-endpoint-level2-cards .itops-pro-drill-card strong,
.itops-pro-drill-modal .itops-pro-drill-grid.square .itops-pro-drill-card strong {
  margin-top: 5px !important;
  font-size: 22px !important;
  line-height: 0.95 !important;
}

.itops-pro-drill-modal .itops-endpoint-level2-cards .itops-pro-drill-card small,
.itops-pro-drill-modal .itops-pro-drill-grid.square .itops-pro-drill-card small {
  min-height: 27px !important;
  margin-top: 5px !important;
  padding-right: 4px !important;
  font-size: 11px !important;
  line-height: 1.25 !important;
  -webkit-line-clamp: 2 !important;
}

.itops-pro-drill-modal .itops-endpoint-level2-cards .itops-pro-drill-card > svg,
.itops-pro-drill-modal .itops-pro-drill-grid.square .itops-pro-drill-card > svg {
  top: 12px !important;
  right: 12px !important;
}

.itops-pro-drill-modal .itops-endpoint-platform-panel {
  border-radius: 24px !important;
}

@media (max-width: 980px) {
  .itops-pro-drill-modal .itops-endpoint-level2-layout {
    grid-template-columns: 1fr;
  }

  .itops-pro-drill-modal .itops-endpoint-level2-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
}

@media (max-width: 560px) {
  .itops-pro-drill-modal .itops-endpoint-level2-cards,
  .itops-pro-drill-modal .itops-pro-drill-grid.square {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }

  .itops-pro-drill-modal .itops-endpoint-level2-cards .itops-pro-drill-card,
  .itops-pro-drill-modal .itops-pro-drill-grid.square .itops-pro-drill-card {
    min-height: 132px !important;
  }

  .itops-endpoint-stat-visual-card {
    min-height: 300px;
  }

  .itops-endpoint-donut {
    width: 142px;
    height: 142px;
  }
}


/* Endpoint Fleet Level 2 final redesign: balanced graph + compact right-side summary */
.itops-pro-modal-overlay {
  padding: 18px !important;
  align-items: center !important;
}

.itops-pro-drill-modal {
  width: min(1680px, calc(100vw - 36px)) !important;
  height: min(94vh, 980px) !important;
  max-height: min(94vh, 980px) !important;
  border-radius: 26px !important;
}

.itops-pro-modal-head {
  flex: 0 0 auto !important;
  padding: 18px 22px 14px !important;
}

.itops-pro-modal-body {
  padding: 14px 18px 20px !important;
}

.itops-pro-drill-modal .itops-pro-drawer-stack {
  gap: 10px !important;
}

.itops-endpoint-redesign {
  display: grid;
  grid-template-columns: minmax(270px, 360px) minmax(0, 1fr);
  gap: 14px;
  align-items: stretch;
}

.itops-endpoint-status-panel,
.itops-endpoint-side-panel {
  min-width: 0;
  border: 1px solid rgba(191, 219, 254, 0.8);
  border-radius: 22px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.055);
}

.itops-endpoint-status-panel {
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 12px;
  min-height: 300px;
  padding: 16px;
  overflow: hidden;
  text-align: left;
  cursor: pointer;
  background:
    radial-gradient(circle at 12% 8%, rgba(37, 99, 235, 0.13), transparent 34%),
    radial-gradient(circle at 94% 5%, rgba(16, 185, 129, 0.13), transparent 32%),
    linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.itops-endpoint-status-panel:hover,
.itops-endpoint-mini-tile:hover,
.itops-endpoint-platform-chip:hover {
  transform: translateY(-1px);
  border-color: rgba(37, 99, 235, 0.42);
  box-shadow: 0 16px 32px rgba(37, 99, 235, 0.11);
}

.itops-endpoint-status-head span,
.itops-endpoint-side-head span,
.itops-endpoint-platform-head span,
.itops-endpoint-mini-tile small {
  display: block;
  color: #64748b;
  font-size: 10px;
  font-weight: 950;
  letter-spacing: 0.065em;
  text-transform: uppercase;
}

.itops-endpoint-status-head strong {
  display: block;
  margin-top: 4px;
  color: #0f172a;
  font-size: 34px;
  font-weight: 950;
  letter-spacing: -0.07em;
  line-height: 0.95;
}

.itops-endpoint-status-head small,
.itops-endpoint-side-head small,
.itops-endpoint-platform-head small {
  display: block;
  margin-top: 4px;
  color: #64748b;
  font-size: 11px;
  font-weight: 750;
  line-height: 1.35;
}

.itops-endpoint-status-body {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 126px;
}

.itops-endpoint-redesign-donut {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 132px;
  height: 132px;
  border-radius: 50%;
  background: conic-gradient(#0ea5e9 0 var(--online), #ef4444 var(--online) var(--offline), #e2e8f0 var(--offline) 100%);
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.04), 0 12px 28px rgba(15, 23, 42, 0.08);
}

.itops-endpoint-redesign-donut::after {
  content: '';
  position: absolute;
  inset: 16px;
  border-radius: inherit;
  background: #ffffff;
  box-shadow: inset 0 0 0 1px rgba(226, 232, 240, 0.9);
}

.itops-endpoint-redesign-donut i {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  font-style: normal;
  text-align: center;
}

.itops-endpoint-redesign-donut strong {
  color: #0f172a;
  font-size: 24px;
  font-weight: 950;
  letter-spacing: -0.055em;
  line-height: 1;
}

.itops-endpoint-redesign-donut small {
  margin-top: 4px;
  color: #64748b;
  font-size: 10px;
  font-weight: 900;
}

.itops-endpoint-status-legend {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
}

.itops-endpoint-status-legend span {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  padding: 7px 8px;
  border: 1px solid rgba(226, 232, 240, 0.94);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.86);
  color: #64748b;
  font-size: 10.5px;
  font-weight: 900;
  white-space: nowrap;
}

.itops-endpoint-status-legend span i {
  flex: 0 0 auto;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #94a3b8;
}

.itops-endpoint-status-legend span strong {
  margin-left: auto;
  color: #0f172a;
  font-size: 11px;
  font-weight: 950;
}

.itops-endpoint-status-legend .online i { background: #0ea5e9; }
.itops-endpoint-status-legend .offline i { background: #ef4444; }
.itops-endpoint-status-legend .stale i { background: #f59e0b; }
.itops-endpoint-status-legend .fresh i { background: #0ea5e9; }

.itops-endpoint-side-panel {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 12px;
  padding: 14px;
}

.itops-endpoint-side-head,
.itops-endpoint-platform-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.itops-endpoint-side-head strong,
.itops-endpoint-platform-head strong {
  display: block;
  margin-top: 3px;
  color: #0f172a;
  font-size: 14px;
  font-weight: 950;
  letter-spacing: -0.025em;
}

.itops-endpoint-mini-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 9px;
}

.itops-endpoint-mini-tile {
  position: relative;
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  min-height: 74px;
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #ffffff;
  text-align: left;
  cursor: pointer;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.itops-endpoint-mini-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 11px;
  color: #ffffff;
  background: linear-gradient(135deg, #0ea5e9, #38bdf8);
}

.itops-endpoint-mini-tile-green .itops-endpoint-mini-icon { background: linear-gradient(135deg, #059669, #38bdf8); }
.itops-endpoint-mini-tile-red .itops-endpoint-mini-icon { background: linear-gradient(135deg, #dc2626, #f59e0b); }
.itops-endpoint-mini-tile-amber .itops-endpoint-mini-icon { background: linear-gradient(135deg, #d97706, #fbbf24); }
.itops-endpoint-mini-tile-slate .itops-endpoint-mini-icon { background: linear-gradient(135deg, #475569, #94a3b8); }
.itops-endpoint-mini-tile-purple .itops-endpoint-mini-icon { background: linear-gradient(135deg, #7c3aed, #c084fc); }
.itops-endpoint-mini-tile-cyan .itops-endpoint-mini-icon { background: linear-gradient(135deg, #0891b2, #22d3ee); }

.itops-endpoint-mini-tile div {
  min-width: 0;
}

.itops-endpoint-mini-tile strong {
  display: block;
  margin-top: 2px;
  color: #0f172a;
  font-size: 20px;
  font-weight: 950;
  letter-spacing: -0.045em;
  line-height: 1;
}

.itops-endpoint-mini-tile em {
  display: block;
  overflow: hidden;
  margin-top: 4px;
  color: #64748b;
  font-size: 10.5px;
  font-style: normal;
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.itops-endpoint-mini-tile > svg {
  color: #cbd5e1;
}

.itops-endpoint-platform-compact {
  min-height: 0;
  padding: 12px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 18px;
  background: rgba(248, 250, 252, 0.72);
}

.itops-endpoint-platform-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 10px;
}

.itops-endpoint-platform-chip {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-rows: auto 6px;
  gap: 7px 10px;
  min-height: 62px;
  padding: 9px 10px;
  border: 1px solid rgba(226, 232, 240, 0.96);
  border-radius: 14px;
  background: #ffffff;
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.itops-endpoint-platform-chip div {
  min-width: 0;
}

.itops-endpoint-platform-chip strong {
  display: block;
  overflow: hidden;
  color: #0f172a;
  font-size: 11.5px;
  font-weight: 950;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.itops-endpoint-platform-chip span {
  display: block;
  margin-top: 3px;
  color: #64748b;
  font-size: 10.5px;
  font-weight: 750;
}

.itops-endpoint-platform-chip em {
  color: #0f172a;
  font-size: 12px;
  font-style: normal;
  font-weight: 950;
}

.itops-endpoint-platform-chip b {
  grid-column: 1 / -1;
  display: block;
  height: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: #e2e8f0;
}

.itops-endpoint-platform-chip b i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #0ea5e9, #38bdf8);
}

@media (max-width: 1160px) {
  .itops-endpoint-redesign {
    grid-template-columns: 1fr;
  }

  .itops-endpoint-mini-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .itops-endpoint-mini-metrics,
  .itops-endpoint-platform-list,
  .itops-endpoint-status-legend {
    grid-template-columns: 1fr;
  }

  .itops-pro-drill-modal {
    width: calc(100vw - 20px) !important;
    height: calc(100vh - 20px) !important;
    max-height: calc(100vh - 20px) !important;
  }
}


/* Simple Device Level 2 layout update */
.itops-endpoint-redesign {
  grid-template-columns: minmax(340px, 420px) minmax(0, 1fr) !important;
  min-height: clamp(560px, calc(100vh - 305px), 720px) !important;
}

.itops-endpoint-status-panel {
  min-height: 100% !important;
  padding: 18px !important;
}

.itops-endpoint-status-body {
  align-items: stretch !important;
  min-height: 0 !important;
}

.itops-device-status-chart {
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  gap: 16px;
  width: 100%;
  min-height: 0;
}

.itops-device-chart-main {
  padding: 15px 16px;
  border: 1px solid rgba(125, 211, 252, 0.55);
  border-radius: 18px;
  background:
    radial-gradient(circle at 12% 16%, rgba(34, 211, 238, 0.22), transparent 38%),
    radial-gradient(circle at 90% 18%, rgba(129, 140, 248, 0.18), transparent 35%),
    linear-gradient(135deg, #ffffff 0%, #f8fbff 100%);
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.07);
}

.itops-device-chart-main span {
  display: block;
  color: #64748b;
  font-size: 10px;
  font-weight: 950;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.itops-device-chart-main strong {
  display: block;
  margin-top: 6px;
  color: #0f172a;
  font-size: 42px;
  font-weight: 950;
  letter-spacing: -0.08em;
  line-height: 0.92;
}

.itops-device-chart-main small {
  display: block;
  margin-top: 8px;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

.itops-device-availability-track {
  display: flex;
  width: 100%;
  height: 16px;
  overflow: hidden;
  border-radius: 999px;
  background: #e2e8f0;
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.22);
}

.itops-device-availability-track i {
  display: block;
  min-width: 3px;
  height: 100%;
}

.itops-device-availability-track .online { background: linear-gradient(90deg, #14b8a6, #67e8f9); }
.itops-device-availability-track .offline { background: linear-gradient(90deg, #f43f5e, #f59e0b); }

.itops-device-status-bars {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  align-items: end;
  gap: 10px;
  min-height: 210px;
  padding: 14px 10px 10px;
  border: 1px solid rgba(226, 232, 240, 0.88);
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(248, 250, 252, 0.9), rgba(255, 255, 255, 0.92)),
    repeating-linear-gradient(0deg, transparent 0 42px, rgba(226, 232, 240, 0.55) 43px 44px);
}

.itops-device-status-bar {
  display: grid;
  grid-template-rows: 1fr auto auto;
  gap: 7px;
  height: 100%;
  min-width: 0;
  text-align: center;
}

.itops-device-status-bar i {
  align-self: end;
  display: block;
  width: 100%;
  height: var(--bar-height);
  min-height: 8px;
  border-radius: 14px 14px 8px 8px;
  box-shadow: 0 12px 22px rgba(15, 23, 42, 0.12);
}

.itops-device-status-bar-online i { background: linear-gradient(180deg, #2dd4bf, #0891b2); }
.itops-device-status-bar-offline i { background: linear-gradient(180deg, #f59e0b, #92400e); }
.itops-device-status-bar-stale i { background: linear-gradient(180deg, #fbbf24, #d97706); }
.itops-device-status-bar-fresh i { background: linear-gradient(180deg, #818cf8, #0ea5e9); }

.itops-device-status-bar em {
  overflow: hidden;
  color: #64748b;
  font-size: 10px;
  font-style: normal;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.itops-device-status-bar strong {
  color: #0f172a;
  font-size: 14px;
  font-weight: 950;
}

.itops-device-freshness-strip {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid rgba(199, 210, 254, 0.8);
  border-radius: 16px;
  background: linear-gradient(135deg, #eef2ff, #ffffff);
}

.itops-device-freshness-strip span,
.itops-device-freshness-strip strong {
  color: #334155;
  font-size: 11px;
  font-weight: 950;
}

.itops-device-freshness-strip em {
  display: block;
  height: 9px;
  overflow: hidden;
  border-radius: 999px;
  background: #e0f2fe;
}

.itops-device-freshness-strip em i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #6366f1, #22d3ee);
}

.itops-endpoint-side-panel {
  grid-template-rows: auto auto minmax(0, 1fr) auto !important;
  min-height: 100% !important;
}

.itops-endpoint-platform-compact {
  display: flex !important;
  flex-direction: column !important;
}

.itops-endpoint-platform-list {
  flex: 1 1 auto;
  align-content: start;
}

.itops-endpoint-followup-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.itops-endpoint-followup-grid button {
  min-width: 0;
  padding: 13px 14px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 17px;
  background:
    radial-gradient(circle at 92% 8%, rgba(59, 130, 246, 0.11), transparent 32%),
    #ffffff;
  box-shadow: 0 9px 20px rgba(15, 23, 42, 0.045);
  text-align: left;
  cursor: pointer;
}

.itops-endpoint-followup-grid button:hover {
  transform: translateY(-1px);
  border-color: rgba(37, 99, 235, 0.36);
  box-shadow: 0 14px 28px rgba(37, 99, 235, 0.10);
}

.itops-endpoint-followup-grid span {
  display: block;
  color: #64748b;
  font-size: 10px;
  font-weight: 950;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.itops-endpoint-followup-grid strong {
  display: block;
  margin-top: 7px;
  color: #0f172a;
  font-size: 24px;
  font-weight: 950;
  letter-spacing: -0.05em;
  line-height: 1;
}

.itops-endpoint-followup-grid small {
  display: block;
  margin-top: 6px;
  color: #64748b;
  font-size: 11px;
  font-weight: 750;
}

@media (max-width: 1160px) {
  .itops-endpoint-redesign { min-height: auto !important; }
  .itops-endpoint-followup-grid { grid-template-columns: 1fr; }
}


/* Open Tickets Level 2 layout update */
.itops-ticket-layout {
  display: grid;
  grid-template-columns: minmax(340px, 430px) minmax(0, 1fr);
  gap: 16px;
  min-height: clamp(520px, calc(100vh - 330px), 700px);
}

.itops-ticket-status-panel,
.itops-ticket-detail-panel,
.itops-ticket-priority-card {
  border: 1px solid rgba(191, 219, 254, 0.95);
  border-radius: 22px;
  background:
    radial-gradient(circle at 12% 8%, rgba(59, 130, 246, 0.13), transparent 36%),
    radial-gradient(circle at 92% 8%, rgba(20, 184, 166, 0.12), transparent 36%),
    linear-gradient(135deg, #ffffff 0%, #f8fbff 100%);
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.06);
}

.itops-ticket-status-panel {
  display: grid;
  grid-template-rows: auto auto minmax(210px, 1fr) auto;
  gap: 16px;
  padding: 18px;
}

.itops-ticket-status-head,
.itops-ticket-panel-title,
.itops-ticket-list-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.itops-ticket-status-head span,
.itops-ticket-panel-title span,
.itops-ticket-list-head span {
  display: block;
  color: #64748b;
  font-size: 10px;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.itops-ticket-status-head strong {
  display: block;
  margin-top: 7px;
  color: #0f172a;
  font-size: 44px;
  font-weight: 950;
  letter-spacing: -0.08em;
  line-height: 0.9;
}

.itops-ticket-status-head small,
.itops-ticket-stack-card small,
.itops-ticket-panel-title small,
.itops-ticket-status-head small {
  display: block;
  margin-top: 7px;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

.itops-ticket-stack-card,
.itops-ticket-sla-card {
  padding: 14px;
  border: 1px solid rgba(226, 232, 240, 0.94);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.82);
}

.itops-ticket-stack-labels {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.itops-ticket-stack-labels span {
  color: #64748b;
  font-size: 11px;
  font-weight: 850;
}

.itops-ticket-stack-labels strong {
  color: #0f172a;
  font-weight: 950;
}

.itops-ticket-stack-track {
  display: flex;
  width: 100%;
  height: 16px;
  overflow: hidden;
  border-radius: 999px;
  background: #e2e8f0;
}

.itops-ticket-stack-track i {
  display: block;
  height: 100%;
  min-width: 3px;
}

.itops-ticket-stack-track .ontrack { background: linear-gradient(90deg, #22c55e, #14b8a6); }
.itops-ticket-stack-track .overdue { background: linear-gradient(90deg, #f97316, #ef4444); }

.itops-ticket-bar-chart {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  align-items: end;
  gap: 10px;
  min-height: 230px;
  padding: 14px 10px 10px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(248, 250, 252, 0.9), rgba(255, 255, 255, 0.94)),
    repeating-linear-gradient(0deg, transparent 0 42px, rgba(226, 232, 240, 0.55) 43px 44px);
}

.itops-ticket-bar {
  display: grid;
  grid-template-rows: 1fr auto auto;
  gap: 7px;
  height: 100%;
  min-width: 0;
  text-align: center;
}

.itops-ticket-bar i {
  align-self: end;
  display: block;
  width: 100%;
  min-height: 8px;
  border-radius: 14px 14px 8px 8px;
  box-shadow: 0 12px 22px rgba(15, 23, 42, 0.12);
}

.itops-ticket-bar-open i { background: linear-gradient(180deg, #38bdf8, #0ea5e9); }
.itops-ticket-bar-overdue i { background: linear-gradient(180deg, #f59e0b, #92400e); }
.itops-ticket-bar-track i { background: linear-gradient(180deg, #2dd4bf, #059669); }
.itops-ticket-bar-priority i { background: linear-gradient(180deg, #fbbf24, #f97316); }

.itops-ticket-bar em {
  overflow: hidden;
  color: #64748b;
  font-size: 10px;
  font-style: normal;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.itops-ticket-bar strong {
  color: #0f172a;
  font-size: 14px;
  font-weight: 950;
}

.itops-ticket-sla-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 14px;
}

.itops-ticket-sla-card span {
  color: #64748b;
  font-size: 10px;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.itops-ticket-sla-card strong {
  display: block;
  margin-top: 4px;
  color: #0f172a;
  font-size: 24px;
  font-weight: 950;
  letter-spacing: -0.04em;
}

.itops-ticket-sla-card em {
  display: block;
  height: 12px;
  overflow: hidden;
  border-radius: 999px;
  background: #e0f2fe;
}

.itops-ticket-sla-card em i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #0ea5e9, #22d3ee);
}

.itops-ticket-detail-panel {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 14px;
  padding: 18px;
}

.itops-ticket-panel-title strong,
.itops-ticket-list-head strong {
  display: block;
  margin-top: 4px;
  color: #0f172a;
  font-size: 18px;
  font-weight: 950;
  letter-spacing: -0.03em;
}

.itops-ticket-card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.itops-ticket-card-grid button {
  min-width: 0;
  padding: 14px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 17px;
  background:
    radial-gradient(circle at 92% 8%, rgba(59, 130, 246, 0.1), transparent 32%),
    #ffffff;
  box-shadow: 0 9px 20px rgba(15, 23, 42, 0.045);
  text-align: left;
  cursor: pointer;
}

.itops-ticket-card-grid button:hover,
.itops-ticket-priority-card button:hover {
  transform: translateY(-1px);
  border-color: rgba(37, 99, 235, 0.36);
  box-shadow: 0 14px 28px rgba(37, 99, 235, 0.1);
}

.itops-ticket-card-grid span {
  display: block;
  color: #64748b;
  font-size: 10px;
  font-weight: 950;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.itops-ticket-card-grid strong {
  display: block;
  margin-top: 7px;
  color: #0f172a;
  font-size: 24px;
  font-weight: 950;
  letter-spacing: -0.05em;
  line-height: 1;
}

.itops-ticket-card-grid small {
  display: block;
  margin-top: 6px;
  color: #64748b;
  font-size: 11px;
  font-weight: 750;
}

.itops-ticket-lower-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 0.75fr);
  gap: 12px;
  min-height: 0;
}

.itops-ticket-priority-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  padding: 14px;
}

.itops-ticket-priority-card button {
  display: grid;
  grid-template-columns: minmax(0, 150px) minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 14px;
  background: #ffffff;
  text-align: left;
  cursor: pointer;
}

.itops-ticket-priority-card button strong {
  display: block;
  color: #0f172a;
  font-size: 12px;
  font-weight: 950;
}

.itops-ticket-priority-card button span {
  color: #64748b;
  font-size: 10px;
  font-weight: 800;
}

.itops-ticket-priority-card button em {
  display: block;
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: #e2e8f0;
}

.itops-ticket-priority-card button em i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #f97316, #ef4444);
}

.itops-ticket-priority-card button b {
  color: #0f172a;
  font-size: 13px;
  font-weight: 950;
}

.itops-ticket-action-list {
  display: grid;
  gap: 10px;
}

.itops-ticket-action-list div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 15px;
  background: #ffffff;
}

.itops-ticket-action-list span {
  color: #64748b;
  font-size: 11px;
  font-weight: 900;
}

.itops-ticket-action-list strong {
  color: #0f172a;
  font-size: 18px;
  font-weight: 950;
}

@media (max-width: 1180px) {
  .itops-ticket-layout,
  .itops-ticket-lower-grid {
    grid-template-columns: 1fr;
  }

  .itops-ticket-card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .itops-ticket-card-grid,
  .itops-ticket-bar-chart {
    grid-template-columns: 1fr;
  }

  .itops-ticket-priority-card button {
    grid-template-columns: 1fr;
  }
}

/* Open Tickets cleanup - remove repeated static cards */
.itops-ticket-layout-clean {
  grid-template-columns: minmax(340px, 410px) minmax(0, 1fr) !important;
  gap: 16px !important;
}

.itops-ticket-command-panel,
.itops-ticket-work-panel,
.itops-ticket-movement-card,
.itops-ticket-priority-clean-card {
  border: 1px solid rgba(203, 213, 225, 0.88);
  border-radius: 22px;
  background:
    radial-gradient(circle at 12% 10%, rgba(37, 99, 235, 0.11), transparent 34%),
    radial-gradient(circle at 90% 0%, rgba(20, 184, 166, 0.10), transparent 32%),
    linear-gradient(135deg, #ffffff 0%, #f8fbff 100%);
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.06);
}

.itops-ticket-command-panel {
  display: grid;
  grid-template-rows: auto auto auto auto 1fr;
  gap: 14px;
  padding: 18px;
}

.itops-ticket-work-panel {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 14px;
  padding: 18px;
}

.itops-ticket-command-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.itops-ticket-command-head span,
.itops-ticket-focus-card span,
.itops-ticket-sla-strip-card span,
.itops-ticket-time-grid span,
.itops-ticket-plan-grid span,
.itops-ticket-movement-card .itops-ticket-list-head span,
.itops-ticket-priority-clean-card .itops-ticket-list-head span {
  display: block;
  color: #64748b;
  font-size: 10px;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.itops-ticket-command-head strong {
  display: block;
  margin-top: 7px;
  color: #0f172a;
  font-size: 30px;
  font-weight: 950;
  letter-spacing: -0.06em;
  line-height: 1;
}

.itops-ticket-command-head small,
.itops-ticket-focus-card small,
.itops-ticket-sla-strip-card small,
.itops-ticket-time-grid small,
.itops-ticket-plan-grid small {
  display: block;
  margin-top: 6px;
  color: #64748b;
  font-size: 11px;
  font-weight: 780;
  line-height: 1.35;
}

.itops-ticket-focus-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  min-height: 130px;
  padding: 18px;
  border-radius: 22px;
  color: #ffffff;
  overflow: hidden;
  position: relative;
}

.itops-ticket-focus-card::after {
  content: '';
  position: absolute;
  width: 170px;
  height: 170px;
  right: -60px;
  top: -70px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
}

.itops-ticket-focus-danger { background: linear-gradient(135deg, #92400e 0%, #f97316 100%); }
.itops-ticket-focus-warning { background: linear-gradient(135deg, #c2410c 0%, #f59e0b 100%); }
.itops-ticket-focus-success { background: linear-gradient(135deg, #0369a1 0%, #14b8a6 100%); }

.itops-ticket-focus-card span,
.itops-ticket-focus-card small,
.itops-ticket-focus-card strong,
.itops-ticket-focus-card button {
  position: relative;
  z-index: 1;
}

.itops-ticket-focus-card span,
.itops-ticket-focus-card small { color: rgba(255, 255, 255, 0.86); }

.itops-ticket-focus-card strong {
  display: block;
  margin-top: 5px;
  font-size: 52px;
  font-weight: 950;
  letter-spacing: -0.08em;
  line-height: 0.9;
}

.itops-ticket-focus-card button {
  flex: 0 0 auto;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.38);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  color: #ffffff;
  font-size: 11px;
  font-weight: 900;
  cursor: pointer;
}

.itops-ticket-health-meter,
.itops-ticket-sla-strip-card,
.itops-ticket-time-grid > div {
  padding: 14px;
  border: 1px solid rgba(226, 232, 240, 0.92);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.84);
}

.itops-ticket-meter-row,
.itops-ticket-meter-labels {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.itops-ticket-meter-row span,
.itops-ticket-meter-labels small {
  color: #64748b;
  font-size: 11px;
  font-weight: 850;
}

.itops-ticket-meter-row strong {
  color: #0f172a;
  font-size: 15px;
  font-weight: 950;
}

.itops-ticket-meter-track {
  display: flex;
  height: 16px;
  margin: 10px 0 8px;
  overflow: hidden;
  border-radius: 999px;
  background: #e2e8f0;
}

.itops-ticket-meter-track i { display: block; height: 100%; min-width: 3px; }
.itops-ticket-meter-track .healthy { background: linear-gradient(90deg, #14b8a6, #22c55e); }
.itops-ticket-meter-track .risk { background: linear-gradient(90deg, #f97316, #e11d48); }

.itops-ticket-sla-strip-card {
  display: grid;
  gap: 12px;
}

.itops-ticket-sla-strip-card strong,
.itops-ticket-time-grid strong {
  display: block;
  margin-top: 5px;
  color: #0f172a;
  font-size: 24px;
  font-weight: 950;
  letter-spacing: -0.04em;
}

.itops-ticket-sla-strip-card em {
  display: block;
  height: 13px;
  overflow: hidden;
  border-radius: 999px;
  background: #e0f2fe;
}

.itops-ticket-sla-strip-card em i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #0ea5e9, #22d3ee);
}

.itops-ticket-time-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.itops-ticket-time-grid .blue { border-color: rgba(96, 165, 250, 0.38); background: linear-gradient(135deg, #eff6ff, #ffffff); }
.itops-ticket-time-grid .purple { border-color: rgba(167, 139, 250, 0.34); background: linear-gradient(135deg, #f5f3ff, #ffffff); }

.itops-ticket-plan-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.itops-ticket-plan-grid button,
.itops-ticket-plan-grid > div {
  min-width: 0;
  min-height: 118px;
  padding: 15px;
  border: 1px solid rgba(226, 232, 240, 0.92);
  border-radius: 18px;
  text-align: left;
}

.itops-ticket-plan-grid button { cursor: pointer; }
.itops-ticket-plan-grid button:hover { transform: translateY(-1px); box-shadow: 0 14px 28px rgba(15, 23, 42, 0.09); }
.itops-ticket-plan-grid .danger { border-color: rgba(251, 113, 133, 0.42); background: linear-gradient(135deg, #fff1f2, #ffffff); }
.itops-ticket-plan-grid .warning { border-color: rgba(251, 191, 36, 0.48); background: linear-gradient(135deg, #fffbeb, #ffffff); }
.itops-ticket-plan-grid .success { border-color: rgba(45, 212, 191, 0.40); background: linear-gradient(135deg, #ecfdf5, #ffffff); }

.itops-ticket-plan-grid strong {
  display: block;
  margin-top: 8px;
  color: #0f172a;
  font-size: 26px;
  font-weight: 950;
  letter-spacing: -0.05em;
  line-height: 1;
}

.itops-ticket-board-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  gap: 12px;
  min-height: 0;
}

.itops-ticket-movement-card,
.itops-ticket-priority-clean-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  padding: 14px;
}

.itops-ticket-movement-row {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) 48px;
  align-items: center;
  gap: 10px;
  min-height: 34px;
}

.itops-ticket-movement-row > span {
  color: #64748b;
  font-size: 11px;
  font-weight: 900;
}

.itops-ticket-movement-row em {
  display: flex;
  height: 14px;
  overflow: hidden;
  border-radius: 999px;
  background: #e2e8f0;
}

.itops-ticket-movement-row em i { display: block; min-width: 3px; }
.itops-ticket-movement-row .new,
.itops-ticket-movement-legend .new { background: #0ea5e9; }
.itops-ticket-movement-row .resolved,
.itops-ticket-movement-legend .resolved { background: #14b8a6; }
.itops-ticket-movement-row .open,
.itops-ticket-movement-legend .open { background: #f59e0b; }

.itops-ticket-movement-row strong {
  color: #0f172a;
  font-size: 13px;
  font-weight: 950;
  text-align: right;
}

.itops-ticket-movement-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: auto;
  color: #64748b;
  font-size: 10px;
  font-weight: 850;
}

.itops-ticket-movement-legend span { display: inline-flex; align-items: center; gap: 5px; }
.itops-ticket-movement-legend i { width: 9px; height: 9px; border-radius: 999px; }

.itops-ticket-priority-row {
  display: grid;
  grid-template-columns: minmax(0, 132px) minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 15px;
  background: #ffffff;
  text-align: left;
  cursor: pointer;
}

.itops-ticket-priority-row:hover {
  transform: translateY(-1px);
  border-color: rgba(37, 99, 235, 0.34);
  box-shadow: 0 14px 24px rgba(15, 23, 42, 0.08);
}

.itops-ticket-priority-row strong {
  display: block;
  color: #0f172a;
  font-size: 12px;
  font-weight: 950;
}

.itops-ticket-priority-row span {
  color: #64748b;
  font-size: 10px;
  font-weight: 800;
}

.itops-ticket-priority-row em {
  display: block;
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: #e2e8f0;
}

.itops-ticket-priority-row em i { display: block; height: 100%; border-radius: inherit; }
.itops-ticket-priority-row.critical em i { background: linear-gradient(90deg, #92400e, #f43f5e); }
.itops-ticket-priority-row.high em i { background: linear-gradient(90deg, #ea580c, #f59e0b); }
.itops-ticket-priority-row.medium em i { background: linear-gradient(90deg, #0ea5e9, #22d3ee); }
.itops-ticket-priority-row.low em i { background: linear-gradient(90deg, #059669, #22c55e); }
.itops-ticket-priority-row b { color: #0f172a; font-size: 13px; font-weight: 950; }


.itops-ticket-detail-stack {
  gap: 12px !important;
}

.itops-ticket-detail-lower-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 12px;
}

.itops-ticket-detail-card,
.itops-ticket-detail-note-card {
  border: 1px solid rgba(203, 213, 225, 0.9);
  border-radius: 20px;
  background:
    radial-gradient(circle at 10% 8%, rgba(37, 99, 235, 0.10), transparent 32%),
    linear-gradient(135deg, #ffffff 0%, #f8fbff 100%);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.055);
}

.itops-ticket-detail-card {
  min-height: 185px;
  padding: 16px;
}

.itops-ticket-detail-card.action {
  border-color: rgba(251, 191, 36, 0.45);
  background:
    radial-gradient(circle at 12% 8%, rgba(245, 158, 11, 0.14), transparent 34%),
    linear-gradient(135deg, #ffffff 0%, #fffbeb 100%);
}

.itops-ticket-detail-card.priority {
  border-color: rgba(147, 197, 253, 0.56);
}

.itops-ticket-detail-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.itops-ticket-detail-card-head span,
.itops-ticket-detail-note-card span,
.itops-ticket-detail-mini-grid span,
.itops-ticket-detail-priority span {
  display: block;
  color: #64748b;
  font-size: 10px;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.itops-ticket-detail-card-head strong,
.itops-ticket-detail-note-card strong {
  display: block;
  color: #0f172a;
  font-size: 20px;
  font-weight: 950;
  letter-spacing: -0.04em;
}

.itops-ticket-detail-card p,
.itops-ticket-detail-note-card p {
  margin: 14px 0 0;
  color: #475569;
  font-size: 12px;
  font-weight: 780;
  line-height: 1.55;
}

.itops-ticket-detail-mini-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 15px;
}

.itops-ticket-detail-mini-grid div {
  min-width: 0;
  padding: 12px;
  border: 1px solid rgba(226, 232, 240, 0.94);
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.74);
}

.itops-ticket-detail-mini-grid strong {
  display: block;
  margin-top: 5px;
  color: #0f172a;
  font-size: 15px;
  font-weight: 950;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.itops-ticket-detail-priority-list {
  display: grid;
  gap: 9px;
  margin-top: 14px;
}

.itops-ticket-detail-priority {
  display: grid;
  grid-template-columns: 94px minmax(0, 1fr) 34px;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 34px;
  padding: 8px 10px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 14px;
  background: #ffffff;
  cursor: pointer;
}

.itops-ticket-detail-priority:hover {
  transform: translateY(-1px);
  border-color: rgba(37, 99, 235, 0.32);
  box-shadow: 0 12px 22px rgba(15, 23, 42, 0.075);
}

.itops-ticket-detail-priority em {
  display: block;
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: #e2e8f0;
}

.itops-ticket-detail-priority em i {
  display: block;
  height: 100%;
  border-radius: inherit;
}

.itops-ticket-detail-priority.critical em i { background: linear-gradient(90deg, #92400e, #f43f5e); }
.itops-ticket-detail-priority.high em i { background: linear-gradient(90deg, #ea580c, #f59e0b); }
.itops-ticket-detail-priority.medium em i { background: linear-gradient(90deg, #0ea5e9, #22d3ee); }
.itops-ticket-detail-priority.low em i { background: linear-gradient(90deg, #059669, #22c55e); }

.itops-ticket-detail-priority strong {
  color: #0f172a;
  font-size: 13px;
  font-weight: 950;
  text-align: right;
}

.itops-ticket-detail-note-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  min-height: 92px;
  padding: 16px 18px;
  background:
    radial-gradient(circle at 90% 0%, rgba(20, 184, 166, 0.13), transparent 32%),
    linear-gradient(135deg, #ffffff 0%, #f0fdfa 100%);
}

.itops-ticket-detail-note-card p {
  max-width: 720px;
  margin: 0;
}

@media (max-width: 1180px) {
  .itops-ticket-layout-clean,
  .itops-ticket-board-grid { grid-template-columns: 1fr !important; }
}

@media (max-width: 760px) {
  .itops-ticket-plan-grid,
  .itops-ticket-time-grid { grid-template-columns: 1fr; }
  .itops-ticket-priority-row,
  .itops-ticket-movement-row { grid-template-columns: 1fr; }
}

@media (max-width: 1180px) {
  .itops-ticket-detail-lower-grid { grid-template-columns: 1fr; }
  .itops-ticket-detail-note-card { align-items: flex-start; flex-direction: column; }
}

@media (max-width: 760px) {
  .itops-ticket-detail-priority,
  .itops-ticket-detail-mini-grid { grid-template-columns: 1fr; }
}



.itops-security-update-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(360px, 0.85fr);
  gap: 14px;
  align-items: stretch;
}

.itops-security-update-main,
.itops-security-branch-card {
  min-height: 276px;
  padding: 18px;
  border: 1px solid rgba(191, 219, 254, 0.78);
  border-radius: 24px;
  background: linear-gradient(135deg, #ffffff 0%, #eff6ff 100%);
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.07);
}

.itops-security-update-main {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 18px;
  background:
    radial-gradient(circle at 90% 12%, rgba(34, 197, 94, 0.18), transparent 30%),
    linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
}

.itops-security-update-head {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.itops-security-update-head > span {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 18px;
  background: linear-gradient(135deg, #16a34a, #22c55e);
  color: #ffffff;
  box-shadow: 0 14px 28px rgba(34, 197, 94, 0.22);
}

.itops-security-update-head small,
.itops-security-branch-head small,
.itops-security-update-split span {
  color: #64748b;
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.itops-security-update-head strong {
  display: block;
  margin-top: 3px;
  color: #0f172a;
  font-size: 54px;
  font-weight: 950;
  letter-spacing: -0.08em;
  line-height: 0.95;
}

.itops-security-update-head p {
  margin: 8px 0 0;
  color: #475569;
  font-size: 13px;
  font-weight: 800;
}

.itops-security-update-meter {
  height: 18px;
  overflow: hidden;
  border-radius: 999px;
  background: #e2e8f0;
}

.itops-security-update-meter i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #16a34a, #22c55e, #67e8f9);
}

.itops-security-update-split {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.itops-security-update-split button {
  min-height: 96px;
  padding: 13px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 18px;
  background: #ffffff;
  text-align: left;
  cursor: pointer;
}

.itops-security-update-split button:hover,
.itops-security-branch-list button:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.08);
}

.itops-security-update-split .updated { border-color: rgba(74, 222, 128, 0.42); background: linear-gradient(135deg, #f0fdf4, #ffffff); }
.itops-security-update-split .need { border-color: rgba(251, 191, 36, 0.46); background: linear-gradient(135deg, #fffbeb, #ffffff); }
.itops-security-update-split .critical { border-color: rgba(251, 113, 133, 0.42); background: linear-gradient(135deg, #fff1f2, #ffffff); }

.itops-security-update-split strong {
  display: block;
  margin-top: 8px;
  color: #0f172a;
  font-size: 30px;
  font-weight: 950;
  letter-spacing: -0.05em;
  line-height: 1;
}

.itops-security-update-split small {
  display: block;
  margin-top: 6px;
  color: #64748b;
  font-size: 11px;
  font-weight: 800;
}

.itops-security-branch-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.itops-security-branch-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.itops-security-branch-head strong {
  display: block;
  margin-top: 4px;
  color: #0f172a;
  font-size: 17px;
  font-weight: 950;
}

.itops-security-branch-head button {
  flex: 0 0 auto;
  padding: 9px 12px;
  border: 1px solid rgba(14, 165, 233, 0.30);
  border-radius: 999px;
  background: #eff6ff;
  color: #0369a1;
  font-size: 11px;
  font-weight: 950;
  cursor: pointer;
}

.itops-security-branch-list {
  display: grid;
  gap: 10px;
}

.itops-security-branch-list button {
  padding: 10px 12px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.86);
  text-align: left;
  cursor: pointer;
}

.itops-security-branch-list div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.itops-security-branch-list strong {
  min-width: 0;
  color: #0f172a;
  font-size: 12px;
  font-weight: 950;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.itops-security-branch-list span {
  flex: 0 0 auto;
  color: #475569;
  font-size: 12px;
  font-weight: 950;
}

.itops-security-branch-list em {
  display: block;
  height: 9px;
  overflow: hidden;
  border-radius: 999px;
  background: #e2e8f0;
}

.itops-security-branch-list em i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #0ea5e9, #22d3ee);
}


.itops-critical-risk-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(360px, 0.85fr);
  gap: 14px;
  align-items: stretch;
}

.itops-critical-risk-main,
.itops-critical-risk-driver-card {
  min-height: 286px;
  padding: 18px;
  border: 1px solid rgba(254, 202, 202, 0.78);
  border-radius: 24px;
  background: linear-gradient(135deg, #ffffff 0%, #fff7ed 100%);
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.07);
}

.itops-critical-risk-main {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 18px;
  background:
    radial-gradient(circle at 92% 8%, rgba(244, 63, 94, 0.16), transparent 32%),
    linear-gradient(135deg, #ffffff 0%, #fff7ed 100%);
}

.itops-critical-risk-head {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.itops-critical-risk-head > span {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 18px;
  background: linear-gradient(135deg, #92400e, #f43f5e);
  color: #ffffff;
  box-shadow: 0 18px 34px rgba(244, 63, 94, 0.22);
}

.itops-critical-risk-head small,
.itops-critical-risk-split span,
.itops-critical-risk-driver-head small,
.itops-risk-detail-card-head span,
.itops-risk-detail-mini-grid span,
.itops-risk-detail-cause-list span {
  display: block;
  color: #64748b;
  font-size: 10px;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.itops-critical-risk-head strong {
  display: flex;
  align-items: baseline;
  gap: 4px;
  color: #0f172a;
  font-size: 42px;
  font-weight: 950;
  letter-spacing: -0.08em;
}

.itops-critical-risk-head strong em {
  color: #64748b;
  font-size: 16px;
  font-style: normal;
  letter-spacing: -0.03em;
}

.itops-critical-risk-head p {
  margin: 2px 0 0;
  color: #475569;
  font-size: 12px;
  font-weight: 800;
}

.itops-critical-risk-meter {
  height: 14px;
  overflow: hidden;
  border-radius: 999px;
  background: #fee2e2;
}

.itops-critical-risk-meter i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #f59e0b, #f97316, #f59e0b);
}

.itops-critical-risk-split {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.itops-critical-risk-split button,
.itops-critical-risk-driver-list button,
.itops-risk-detail-cause-list button {
  border: 1px solid rgba(226, 232, 240, 0.95);
  background: #ffffff;
  cursor: pointer;
  text-align: left;
  transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease;
}

.itops-critical-risk-split button {
  min-height: 104px;
  padding: 14px;
  border-radius: 18px;
}

.itops-critical-risk-split button:hover,
.itops-critical-risk-driver-list button:hover,
.itops-risk-detail-cause-list button:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 26px rgba(15, 23, 42, 0.08);
}

.itops-critical-risk-split .critical { border-color: rgba(251, 113, 133, 0.46); background: linear-gradient(135deg, #fff1f2, #ffffff); }
.itops-critical-risk-split .high { border-color: rgba(251, 191, 36, 0.52); background: linear-gradient(135deg, #fffbeb, #ffffff); }
.itops-critical-risk-split .device { border-color: rgba(196, 181, 253, 0.52); background: linear-gradient(135deg, #f5f3ff, #ffffff); }

.itops-critical-risk-split strong {
  display: block;
  margin-top: 8px;
  color: #0f172a;
  font-size: 28px;
  font-weight: 950;
  letter-spacing: -0.06em;
}

.itops-critical-risk-split small {
  display: block;
  margin-top: 5px;
  color: #64748b;
  font-size: 11px;
  font-weight: 820;
}

.itops-critical-risk-driver-card {
  border-color: rgba(196, 181, 253, 0.58);
  background:
    radial-gradient(circle at 92% 10%, rgba(124, 58, 237, 0.12), transparent 32%),
    linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
}

.itops-critical-risk-driver-head {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 14px;
}

.itops-critical-risk-driver-head strong {
  display: block;
  margin-top: 4px;
  color: #0f172a;
  font-size: 17px;
  font-weight: 950;
}

.itops-critical-risk-driver-head button {
  flex: 0 0 auto;
  padding: 9px 12px;
  border: 1px solid rgba(124, 58, 237, 0.22);
  border-radius: 999px;
  background: #f5f3ff;
  color: #92400e;
  font-size: 11px;
  font-weight: 950;
  cursor: pointer;
}

.itops-critical-risk-driver-list {
  display: grid;
  gap: 10px;
}

.itops-critical-risk-driver-list button {
  padding: 10px 12px;
  border-radius: 16px;
}

.itops-critical-risk-driver-list div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.itops-critical-risk-driver-list strong {
  min-width: 0;
  color: #0f172a;
  font-size: 12px;
  font-weight: 950;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.itops-critical-risk-driver-list span {
  flex: 0 0 auto;
  color: #475569;
  font-size: 12px;
  font-weight: 950;
}

.itops-critical-risk-driver-list em {
  display: block;
  height: 9px;
  overflow: hidden;
  border-radius: 999px;
  background: #e2e8f0;
}

.itops-critical-risk-driver-list em i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #92400e, #f97316, #facc15);
}

.itops-risk-empty-note {
  padding: 16px 18px;
  border: 1px dashed rgba(148, 163, 184, 0.62);
  border-radius: 18px;
  background:
    radial-gradient(circle at 96% 0%, rgba(124, 58, 237, 0.10), transparent 34%),
    linear-gradient(135deg, #ffffff, #f8fafc);
}

.itops-risk-empty-note strong {
  display: block;
  color: #0f172a;
  font-size: 14px;
  font-weight: 950;
}

.itops-risk-empty-note p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.55;
  font-weight: 760;
}

.itops-risk-detail-stack { gap: 12px !important; }

.itops-risk-detail-lower-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 12px;
}

.itops-risk-detail-card {
  min-height: 172px;
  padding: 16px;
  border: 1px solid rgba(203, 213, 225, 0.9);
  border-radius: 20px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fbff 100%);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.055);
}

.itops-risk-detail-card.action {
  border-color: rgba(251, 113, 133, 0.42);
  background:
    radial-gradient(circle at 12% 8%, rgba(244, 63, 94, 0.13), transparent 34%),
    linear-gradient(135deg, #ffffff 0%, #fff1f2 100%);
}

.itops-risk-detail-card.causes {
  border-color: rgba(196, 181, 253, 0.55);
}

.itops-risk-detail-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.itops-risk-detail-card-head strong {
  display: block;
  color: #0f172a;
  font-size: 20px;
  font-weight: 950;
  letter-spacing: -0.04em;
}

.itops-risk-detail-card p {
  margin: 14px 0 0;
  color: #475569;
  font-size: 12px;
  font-weight: 780;
  line-height: 1.55;
}

.itops-risk-detail-mini-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 15px;
}

.itops-risk-detail-mini-grid div {
  padding: 12px;
  border: 1px solid rgba(226, 232, 240, 0.94);
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.74);
}

.itops-risk-detail-mini-grid strong {
  display: block;
  margin-top: 5px;
  color: #0f172a;
  font-size: 15px;
  font-weight: 950;
}

.itops-risk-detail-cause-list {
  display: grid;
  gap: 9px;
  margin-top: 14px;
}

.itops-risk-detail-cause-list button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 38px;
  padding: 9px 11px;
  border-radius: 14px;
}

.itops-risk-detail-cause-list strong {
  color: #0f172a;
  font-size: 13px;
  font-weight: 950;
}

.itops-risk-selected-device-stack .itops-pro-panel {
  margin-bottom: 0;
}

.itops-pro-device-risk-table th:nth-child(7),
.itops-pro-device-risk-table td:nth-child(7) {
  min-width: 320px;
}

.itops-risk-why-cell strong {
  display: block;
  color: #0f172a;
  font-size: 13px;
  font-weight: 950;
}

.itops-risk-evidence-list {
  display: grid;
  gap: 6px;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}

.itops-risk-evidence-list li {
  position: relative;
  padding-left: 14px;
  color: #475569;
  font-size: 11.5px;
  font-weight: 780;
  line-height: 1.35;
}

.itops-risk-evidence-list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.55em;
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: #64748b;
}


@media (max-width: 1180px) {
  .itops-security-update-layout { grid-template-columns: 1fr; }
}

@media (max-width: 1180px) {
  .itops-critical-risk-layout,
  .itops-risk-detail-lower-grid { grid-template-columns: 1fr; }
}

@media (max-width: 760px) {
  .itops-critical-risk-split,
  .itops-risk-detail-mini-grid { grid-template-columns: 1fr; }
}


@media (max-width: 760px) {
  .itops-security-update-split { grid-template-columns: 1fr; }
}


/* Main dashboard simple wording + space usage */
.itops-main-kpi-grid {
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 14px;
  margin: 18px 0 14px;
}

.itops-main-kpi-grid .itops-pro-kpi {
  min-height: 154px;
  padding: 16px;
  border-radius: 22px;
}

.itops-main-kpi-grid .itops-pro-kpi-top {
  margin-bottom: 12px;
}

.itops-main-kpi-grid .itops-pro-kpi-icon {
  width: 38px;
  height: 38px;
  border-radius: 14px;
}

.itops-main-kpi-grid .itops-pro-kpi strong {
  font-size: 27px;
}

.itops-main-kpi-grid .itops-pro-kpi small {
  min-height: 34px;
  margin-top: 8px;
}

.itops-main-overview-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.itops-main-overview-grid .itops-pro-panel,
.itops-main-command-grid .itops-pro-panel {
  background: rgba(255, 255, 255, 0.94);
  border-color: rgba(147, 197, 253, 0.38);
}

.itops-main-trend-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.18fr) minmax(320px, 0.82fr);
  gap: 14px;
  align-items: stretch;
}

.itops-main-trend-hero,
.itops-main-trend-summary,
.itops-main-ticket-trend,
.itops-main-trend-mini {
  width: 100%;
  border: 1px solid #e0f2fe;
  border-radius: 24px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  color: #0f172a;
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.itops-main-trend-hero:hover,
.itops-main-trend-summary:hover,
.itops-main-ticket-trend:hover,
.itops-main-trend-mini:hover {
  transform: translateY(-1px);
  border-color: #93c5fd;
  box-shadow: 0 12px 26px rgba(37, 99, 235, 0.10);
}

.itops-main-trend-hero {
  min-height: 280px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  background: radial-gradient(circle at 84% 12%, rgba(56, 189, 248, 0.14), transparent 34%), linear-gradient(180deg, #ffffff 0%, #eff6ff 100%);
}

.itops-main-trend-hero-head,
.itops-main-ticket-trend-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.itops-main-trend-hero-head span,
.itops-main-ticket-trend-head span,
.itops-main-trend-summary span,
.itops-main-trend-mini span {
  display: block;
  color: #64748b;
  font-size: 12px;
  font-weight: 850;
}

.itops-main-trend-hero-head strong,
.itops-main-ticket-trend-head strong,
.itops-main-trend-summary strong,
.itops-main-trend-mini strong {
  display: block;
  color: #0f172a;
  letter-spacing: -0.03em;
  font-weight: 950;
}

.itops-main-trend-hero-head strong,
.itops-main-ticket-trend-head strong {
  margin-top: 4px;
  font-size: 20px;
}

.itops-main-trend-hero-head small,
.itops-main-ticket-trend-head small,
.itops-main-trend-summary small,
.itops-main-trend-mini small {
  color: #475569;
  font-size: 12px;
  font-weight: 700;
}

.itops-main-trend-bars,
.itops-main-ticket-trend-bars {
  display: grid;
  gap: 10px;
}

.itops-main-trend-row {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}

.itops-main-trend-label {
  display: grid;
  gap: 2px;
}

.itops-main-trend-label span {
  color: #64748b;
  font-size: 11px;
  font-weight: 800;
}

.itops-main-trend-label strong {
  color: #0f172a;
  font-size: 14px;
  font-weight: 950;
}

.itops-main-trend-track {
  height: 12px;
  display: flex;
  overflow: hidden;
  border-radius: 999px;
  background: #e2e8f0;
}

.itops-main-trend-track i { display: block; height: 100%; }
.itops-main-trend-track .online { background: linear-gradient(90deg, #0ea5e9, #22c55e); }
.itops-main-trend-track .offline { background: linear-gradient(90deg, #ef4444, #f59e0b); }
.itops-main-trend-track .stale { background: linear-gradient(90deg, #f59e0b, #fbbf24); }

.itops-main-trend-values {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.itops-main-trend-values small {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
}

.itops-main-trend-values .online { color: #0369a1; background: #e0f2fe; }
.itops-main-trend-values .offline { color: #b91c1c; background: #fee2e2; }
.itops-main-trend-values .stale { color: #92400e; background: #fef3c7; }

.itops-main-trend-side {
  display: grid;
  gap: 12px;
}

.itops-main-trend-summary {
  padding: 16px;
  display: grid;
  gap: 10px;
}

.itops-main-trend-summary > div {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.itops-main-trend-summary strong {
  font-size: 34px;
}

.itops-main-trend-summary em {
  display: block;
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: #e2e8f0;
}

.itops-main-trend-summary em i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #0ea5e9, #22c55e);
}

.itops-main-ticket-trend {
  padding: 14px 16px;
  display: grid;
  gap: 12px;
}

.itops-main-ticket-trend-row {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr) 36px;
  gap: 10px;
  align-items: center;
}

.itops-main-ticket-trend-row span {
  color: #64748b;
  font-size: 11px;
  font-weight: 800;
}

.itops-main-ticket-trend-row strong {
  color: #0f172a;
  font-size: 12px;
  font-weight: 900;
  text-align: right;
}

.itops-main-ticket-trend-track {
  width: var(--trend-width, 100%);
  height: 12px;
  display: flex;
  overflow: hidden;
  border-radius: 999px;
  background: #e2e8f0;
}

.itops-main-ticket-trend-track i { display: block; height: 100%; }
.itops-main-ticket-trend-track .new { background: linear-gradient(90deg, #3b82f6, #38bdf8); }
.itops-main-ticket-trend-track .resolved { background: linear-gradient(90deg, #0ea5e9, #38bdf8); }
.itops-main-ticket-trend-track .open { background: linear-gradient(90deg, #f97316, #fb923c); }

.itops-main-trend-mini-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.itops-main-trend-mini {
  min-height: 92px;
  padding: 12px;
  display: grid;
  gap: 4px;
}

.itops-main-trend-mini strong { font-size: 24px; }
.itops-main-trend-mini.blue { background: linear-gradient(180deg, #ffffff 0%, #eff6ff 100%); border-color: #bfdbfe; }
.itops-main-trend-mini.amber { background: linear-gradient(180deg, #ffffff 0%, #fffbeb 100%); border-color: #fde68a; }
.itops-main-trend-mini.green { background: linear-gradient(180deg, #ffffff 0%, #ecfdf5 100%); border-color: #bbf7d0; }
.itops-main-trend-mini.orange { background: linear-gradient(180deg, #ffffff 0%, #fff7ed 100%); border-color: #fdba74; }

.itops-main-today-layout {
  display: grid;
  grid-template-columns: minmax(210px, 0.68fr) minmax(0, 1.32fr);
  gap: 14px;
  align-items: stretch;
}

.itops-main-health-card {
  width: 100%;
  min-height: 220px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  padding: 18px;
  border: 1px solid rgba(191, 219, 254, 0.94);
  border-radius: 24px;
  background:
    radial-gradient(circle at 85% 12%, rgba(56, 189, 248, 0.18), transparent 32%),
    linear-gradient(180deg, #ffffff 0%, #eff6ff 100%);
  color: #0f172a;
  text-align: left;
  cursor: pointer;
  box-shadow: 0 14px 32px rgba(37, 99, 235, 0.10);
}

.itops-main-health-card span,
.itops-main-stack-head span,
.itops-main-ready-row span,
.itops-main-bar-row span,
.itops-main-branch-row span,
.itops-main-action-row small {
  color: #64748b;
  font-size: 12px;
  font-weight: 850;
}

.itops-main-health-card strong {
  color: #0f172a;
  font-size: 52px;
  line-height: 1;
  letter-spacing: -0.07em;
  font-weight: 950;
}

.itops-main-health-card small {
  color: #0369a1;
  font-size: 13px;
  font-weight: 900;
}

.itops-main-health-card em,
.itops-main-ready-row em,
.itops-main-bar-row em {
  display: block;
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: #e2e8f0;
}

.itops-main-health-card em i,
.itops-main-ready-row em i,
.itops-main-bar-row em i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #0ea5e9, #22c55e);
}

.itops-main-ready-list,
.itops-main-action-list,
.itops-main-bar-list,
.itops-main-branch-list {
  display: grid;
  gap: 10px;
}

.itops-main-ready-list {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.itops-main-ready-row,
.itops-main-bar-row,
.itops-main-action-row,
.itops-main-branch-row {
  width: 100%;
  min-width: 0;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  color: #0f172a;
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.itops-main-ready-row:hover,
.itops-main-bar-row:hover,
.itops-main-action-row:hover,
.itops-main-branch-row:hover {
  transform: translateY(-1px);
  border-color: #bfdbfe;
  box-shadow: 0 12px 26px rgba(37, 99, 235, 0.10);
}

.itops-main-ready-row {
  min-height: 82px;
  padding: 12px;
}

.itops-main-ready-row div,
.itops-main-bar-row div,
.itops-main-stack-head,
.itops-main-branch-row,
.itops-main-action-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.itops-main-ready-row div {
  margin-bottom: 10px;
}

.itops-main-ready-row strong,
.itops-main-bar-row strong,
.itops-main-branch-row strong,
.itops-main-action-row b,
.itops-main-stack-head strong {
  color: #0f172a;
  font-weight: 950;
  letter-spacing: -0.03em;
}

.itops-main-ready-row strong { font-size: 20px; }

.itops-main-ready-row.action em i { background: linear-gradient(90deg, #ef4444, #f97316); }
.itops-main-ready-row.watch em i { background: linear-gradient(90deg, #f59e0b, #facc15); }
.itops-main-ready-row.healthy em i { background: linear-gradient(90deg, #0ea5e9, #22c55e); }

.itops-main-action-panel .itops-pro-panel-head {
  margin-bottom: 10px;
}

.itops-main-action-row {
  min-height: 67px;
  padding: 11px 12px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  display: grid;
}

.itops-main-action-row > span {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  color: #0ea5e9;
  background: #eff6ff;
}

.itops-main-action-row.red > span { color: #dc2626; background: #fef2f2; }
.itops-main-action-row.amber > span { color: #d97706; background: #fffbeb; }
.itops-main-action-row.purple > span { color: #7c3aed; background: #f5f3ff; }
.itops-main-action-row.green > span { color: #059669; background: #ecfdf5; }

.itops-main-action-row div {
  min-width: 0;
}

.itops-main-action-row strong {
  display: block;
  color: #0f172a;
  font-size: 13px;
  font-weight: 950;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.itops-main-action-row small {
  display: block;
  margin-top: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.itops-main-action-row b {
  font-size: 21px;
}

.itops-main-device-grid {
  display: grid;
  grid-template-columns: minmax(230px, 0.72fr) minmax(0, 1.28fr);
  gap: 14px;
  align-items: stretch;
}

.itops-main-device-stack {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 14px;
  min-height: 250px;
  padding: 16px;
  border: 1px solid rgba(191, 219, 254, 0.9);
  border-radius: 22px;
  background:
    radial-gradient(circle at 85% 5%, rgba(59, 130, 246, 0.16), transparent 34%),
    linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.itops-main-stack-head strong {
  font-size: 40px;
}

.itops-main-stack-bar {
  display: flex;
  height: 18px;
  overflow: hidden;
  border-radius: 999px;
  background: #e2e8f0;
}

.itops-main-stack-bar i {
  display: block;
  min-width: 4px;
  height: 100%;
}

.itops-main-stack-bar .online,
.itops-main-stack-legend .online { background: #0ea5e9; }
.itops-main-stack-bar .offline,
.itops-main-stack-legend .offline { background: #ef4444; }
.itops-main-stack-bar .old,
.itops-main-stack-legend .old { background: #f59e0b; }

.itops-main-stack-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
}

.itops-main-stack-legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #64748b;
  font-size: 11px;
  font-weight: 850;
}

.itops-main-stack-legend i {
  width: 8px;
  height: 8px;
  border-radius: 999px;
}

.itops-main-bar-row {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) minmax(160px, 2fr) auto;
  align-items: center;
  gap: 12px;
  min-height: 46px;
  padding: 9px 11px;
}

.itops-main-bar-row div {
  justify-content: flex-start;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.itops-main-bar-row strong {
  font-size: 16px;
}

.itops-main-bar-row b {
  color: #475569;
  font-size: 12px;
  font-weight: 950;
}

.itops-main-bar-row.green em i { background: linear-gradient(90deg, #0ea5e9, #22c55e); }
.itops-main-bar-row.red em i { background: linear-gradient(90deg, #ef4444, #f59e0b); }
.itops-main-bar-row.amber em i { background: linear-gradient(90deg, #f59e0b, #facc15); }

.itops-main-branch-row {
  min-height: 50px;
  padding: 10px 12px;
}

.itops-main-branch-row div {
  min-width: 0;
}

.itops-main-branch-row strong {
  display: block;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.itops-main-branch-row em {
  flex: 0 0 auto;
  min-width: 62px;
  text-align: center;
  padding: 7px 9px;
  border-radius: 999px;
  font-style: normal;
  color: #0369a1;
  background: #eff6ff;
  font-size: 12px;
  font-weight: 950;
}

.itops-main-branch-row.action em { color: #b91c1c; background: #fee2e2; }
.itops-main-branch-row.watch em { color: #92400e; background: #fef3c7; }
.itops-main-branch-row.healthy em { color: #0369a1; background: #e0f2fe; }

.itops-main-command-grid {
  align-items: stretch;
}

.itops-main-command-grid .itops-pro-panel {
  min-height: 100%;
}

@media (max-width: 1600px) {
  .itops-main-kpi-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@media (max-width: 1180px) {
  .itops-main-overview-grid,
  .itops-main-command-grid,
  .itops-main-trend-layout,
  .itops-main-today-layout,
  .itops-main-device-grid { grid-template-columns: 1fr; }
  .itops-main-overview-grid .span-2,
  .itops-main-command-grid .span-2 { grid-column: auto; }
}

@media (max-width: 760px) {
  .itops-main-kpi-grid,
  .itops-main-ready-list { grid-template-columns: 1fr; }
  .itops-main-bar-row { grid-template-columns: 1fr; }
  .itops-main-health-card { min-height: 170px; }
}


/* FINAL: Header title and KPI cards use the coloured dashboard-card style from the reference image */
.itops-pro-hero {
  padding: 24px 26px !important;
  border-radius: 26px !important;
  border: 1px solid rgba(255, 255, 255, 0.22) !important;
  background:
    radial-gradient(circle at 88% -18%, rgba(255, 255, 255, 0.22) 0 118px, transparent 120px),
    radial-gradient(circle at -8% 108%, rgba(34, 211, 238, 0.22) 0 82px, transparent 84px),
    linear-gradient(135deg, #7547ff 0%, #5b3ee4 42%, #111827 100%) !important;
  color: #ffffff !important;
  box-shadow: 0 22px 52px rgba(49, 46, 129, 0.24) !important;
  overflow: hidden !important;
}

.itops-pro-hero:before { display: none !important; }
.itops-pro-hero h1 { color: #ffffff !important; }
.itops-pro-hero p { color: rgba(255, 255, 255, 0.86) !important; }
.itops-pro-overline { color: rgba(255, 255, 255, 0.86) !important; }
.itops-pro-hero-meta span {
  color: rgba(255, 255, 255, 0.9) !important;
  background: rgba(255, 255, 255, 0.12) !important;
  border-color: rgba(255, 255, 255, 0.20) !important;
  backdrop-filter: blur(12px) !important;
}
.itops-pro-hero .itops-pro-outline-btn {
  color: #ffffff !important;
  background: rgba(255, 255, 255, 0.10) !important;
  border-color: rgba(255, 255, 255, 0.24) !important;
}
.itops-pro-hero .itops-pro-primary-btn {
  color: #4338ca !important;
  background: rgba(255, 255, 255, 0.94) !important;
  border-color: rgba(255, 255, 255, 0.94) !important;
}

.itops-main-kpi-grid {
  grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
  gap: 14px !important;
}

.itops-main-kpi-grid .itops-pro-kpi {
  position: relative !important;
  min-height: 148px !important;
  padding: 16px 17px !important;
  border: 1px solid rgba(255, 255, 255, 0.28) !important;
  border-radius: 24px !important;
  color: #ffffff !important;
  overflow: hidden !important;
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.16) !important;
  isolation: isolate !important;
}

.itops-main-kpi-grid .itops-pro-kpi::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  background:
    linear-gradient(120deg, rgba(255, 255, 255, 0.18), transparent 42%),
    radial-gradient(circle at 76% 2%, rgba(255, 255, 255, 0.16), transparent 28%);
  pointer-events: none;
}

.itops-main-kpi-grid .itops-pro-kpi::after {
  content: "";
  position: absolute;
  right: -40px;
  top: -48px;
  width: 138px;
  height: 138px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.13);
  filter: blur(0.2px);
  pointer-events: none;
}

.itops-main-kpi-grid .itops-pro-kpi-blue {
  background:
    radial-gradient(circle at 92% -10%, rgba(125, 211, 252, 0.36), transparent 30%),
    radial-gradient(circle at 0% 105%, rgba(168, 85, 247, 0.32), transparent 34%),
    linear-gradient(135deg, #0f172a 0%, #0369a1 48%, #06b6d4 100%) !important;
}

.itops-main-kpi-grid .itops-pro-kpi-green {
  background:
    radial-gradient(circle at 92% -10%, rgba(190, 242, 100, 0.36), transparent 30%),
    radial-gradient(circle at -8% 110%, rgba(20, 184, 166, 0.34), transparent 34%),
    linear-gradient(135deg, #042f2e 0%, #0f766e 50%, #84cc16 100%) !important;
}

.itops-main-kpi-grid .itops-pro-kpi-red {
  background:
    radial-gradient(circle at 92% -10%, rgba(251, 146, 60, 0.38), transparent 31%),
    radial-gradient(circle at -6% 105%, rgba(217, 70, 239, 0.30), transparent 34%),
    linear-gradient(135deg, #3b0764 0%, #92400e 52%, #fb923c 100%) !important;
}

.itops-main-kpi-grid .itops-pro-kpi-amber {
  background:
    radial-gradient(circle at 92% -10%, rgba(253, 224, 71, 0.34), transparent 30%),
    radial-gradient(circle at -8% 110%, rgba(244, 63, 94, 0.26), transparent 36%),
    linear-gradient(135deg, #1f1306 0%, #92400e 48%, #f59e0b 100%) !important;
}

.itops-main-kpi-grid .itops-pro-kpi-purple {
  background:
    radial-gradient(circle at 92% -10%, rgba(244, 114, 182, 0.38), transparent 31%),
    radial-gradient(circle at -8% 108%, rgba(56, 189, 248, 0.24), transparent 34%),
    linear-gradient(135deg, #1e1b4b 0%, #92400e 50%, #ec4899 100%) !important;
}

.itops-main-kpi-grid .itops-pro-kpi-cyan {
  background:
    radial-gradient(circle at 92% -10%, rgba(45, 212, 191, 0.38), transparent 31%),
    radial-gradient(circle at -8% 110%, rgba(99, 102, 241, 0.30), transparent 34%),
    linear-gradient(135deg, #082f49 0%, #0e7490 48%, #14b8a6 100%) !important;
}

.itops-main-kpi-grid .itops-pro-kpi-slate {
  background:
    radial-gradient(circle at 92% -10%, rgba(148, 163, 184, 0.35), transparent 31%),
    radial-gradient(circle at -8% 110%, rgba(45, 212, 191, 0.24), transparent 34%),
    linear-gradient(135deg, #020617 0%, #334155 48%, #0f766e 100%) !important;
}

.itops-main-kpi-grid .itops-pro-kpi-icon {
  width: 36px !important;
  height: 36px !important;
  border-radius: 14px !important;
  color: #ffffff !important;
  background: rgba(255, 255, 255, 0.18) !important;
  border: 1px solid rgba(255, 255, 255, 0.24) !important;
  box-shadow: none !important;
  backdrop-filter: blur(8px);
}

.itops-main-kpi-grid .itops-pro-status {
  min-height: 22px !important;
  padding: 0 8px !important;
  color: #ffffff !important;
  background: rgba(255, 255, 255, 0.18) !important;
  border: 1px solid rgba(255, 255, 255, 0.20) !important;
  box-shadow: none !important;
  backdrop-filter: blur(8px);
}

.itops-main-kpi-grid .itops-pro-kpi-label,
.itops-main-kpi-grid .itops-pro-kpi strong,
.itops-main-kpi-grid .itops-pro-kpi small {
  color: #ffffff !important;
}

.itops-main-kpi-grid .itops-pro-kpi-label {
  opacity: 0.78 !important;
  letter-spacing: 0.09em !important;
}

.itops-main-kpi-grid .itops-pro-kpi strong {
  margin-top: 5px !important;
  font-size: 27px !important;
  text-shadow: 0 10px 24px rgba(15, 23, 42, 0.22);
}

.itops-main-kpi-grid .itops-pro-kpi small {
  min-height: 31px !important;
  margin-top: 7px !important;
  opacity: 0.86 !important;
}

.itops-main-kpi-grid .itops-pro-progress {
  height: 6px !important;
  background: rgba(255, 255, 255, 0.22) !important;
}

.itops-main-kpi-grid .itops-pro-progress i {
  background: rgba(255, 255, 255, 0.9) !important;
}

.itops-main-kpi-grid .itops-pro-kpi:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 22px 52px rgba(15, 23, 42, 0.22) !important;
}

.itops-main-kpi-grid .itops-pro-kpi-top { margin-bottom: 10px !important; }

@media (max-width: 1600px) {
  .itops-main-kpi-grid { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
}

@media (max-width: 760px) {
  .itops-main-kpi-grid { grid-template-columns: 1fr !important; }
}


/* Main dashboard: endpoint trend replaces duplicate device/update + risk panels */
.itops-endpoint-trend-layout {
  display: grid;
  grid-template-columns: minmax(180px, 0.58fr) minmax(0, 1.42fr);
  gap: 14px;
  align-items: stretch;
}

.itops-endpoint-trend-summary {
  display: grid;
  gap: 10px;
}

.itops-endpoint-trend-metric {
  width: 100%;
  min-height: 78px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  padding: 13px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  color: #0f172a;
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.itops-endpoint-trend-metric:hover {
  transform: translateY(-1px);
  border-color: #bfdbfe;
  box-shadow: 0 12px 26px rgba(37, 99, 235, 0.10);
}

.itops-endpoint-trend-metric span {
  color: #64748b;
  font-size: 12px;
  font-weight: 900;
}

.itops-endpoint-trend-metric strong {
  color: #0f172a;
  font-size: 28px;
  line-height: 1;
  letter-spacing: -0.04em;
  font-weight: 950;
}

.itops-endpoint-trend-metric small {
  color: #64748b;
  font-size: 11px;
  font-weight: 850;
}

.itops-endpoint-trend-metric.online { background: linear-gradient(180deg, #ffffff 0%, #ecfdf5 100%); border-color: #bbf7d0; }
.itops-endpoint-trend-metric.offline { background: linear-gradient(180deg, #ffffff 0%, #fef2f2 100%); border-color: #fecaca; }
.itops-endpoint-trend-metric.stale { background: linear-gradient(180deg, #ffffff 0%, #fffbeb 100%); border-color: #fde68a; }

.itops-endpoint-trend-chart {
  display: grid;
  gap: 10px;
}

.itops-endpoint-trend-row {
  width: 100%;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(92px, 0.42fr) minmax(180px, 1fr) minmax(210px, 0.72fr);
  gap: 12px;
  align-items: center;
  padding: 11px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  color: #0f172a;
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.itops-endpoint-trend-row:hover {
  transform: translateY(-1px);
  border-color: #bfdbfe;
  box-shadow: 0 12px 26px rgba(37, 99, 235, 0.10);
}

.itops-endpoint-trend-label strong {
  display: block;
  color: #0f172a;
  font-size: 13px;
  font-weight: 950;
}

.itops-endpoint-trend-label span {
  display: block;
  margin-top: 2px;
  color: #64748b;
  font-size: 11px;
  font-weight: 850;
}

.itops-endpoint-trend-track {
  width: var(--trend-width);
  min-width: 42px;
  max-width: 100%;
  display: flex;
  height: 14px;
  overflow: hidden;
  border-radius: 999px;
  background: #e2e8f0;
}

.itops-endpoint-trend-track i {
  display: block;
  min-width: 3px;
  height: 100%;
}

.itops-endpoint-trend-track .online { background: linear-gradient(90deg, #0ea5e9, #22c55e); }
.itops-endpoint-trend-track .offline { background: linear-gradient(90deg, #ef4444, #f59e0b); }

.itops-endpoint-trend-values {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.itops-endpoint-trend-values span {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 900;
}

.itops-endpoint-trend-values .online { color: #0369a1; background: #e0f2fe; }
.itops-endpoint-trend-values .offline { color: #b91c1c; background: #fee2e2; }
.itops-endpoint-trend-values .stale { color: #92400e; background: #fef3c7; }

@media (max-width: 1180px) {
  .itops-endpoint-trend-layout,
  .itops-endpoint-trend-row { grid-template-columns: 1fr; }
  .itops-endpoint-trend-track { width: 100%; }
  .itops-endpoint-trend-values { justify-content: flex-start; }
}


/* Better main dashboard analytics charts */
.main-analytics-panel .itops-pro-panel-head { margin-bottom: 12px; }

.itops-analytics-dashboard {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.itops-analytics-chart-card {
  min-height: 272px;
  display: grid;
  grid-template-rows: auto auto 1fr;
  gap: 12px;
  padding: 16px;
  border: 1px solid #e0f2fe;
  border-radius: 24px;
  background: radial-gradient(circle at 82% 10%, rgba(56, 189, 248, 0.14), transparent 34%), linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  color: #0f172a;
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.itops-analytics-chart-card.ticket {
  background: radial-gradient(circle at 88% 8%, rgba(34, 197, 94, 0.12), transparent 32%), linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.itops-analytics-chart-card:hover,
.itops-analytics-mini:hover,
.itops-main-decision-card:hover {
  transform: translateY(-1px);
  border-color: #93c5fd;
  box-shadow: 0 12px 26px rgba(37, 99, 235, 0.10);
}

.itops-analytics-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.itops-analytics-card-head span,
.itops-analytics-mini span,
.itops-main-decision-card span {
  display: block;
  color: #64748b;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.02em;
}

.itops-analytics-card-head strong {
  display: block;
  margin-top: 4px;
  color: #0f172a;
  font-size: 21px;
  line-height: 1.05;
  font-weight: 950;
  letter-spacing: -0.04em;
}

.itops-analytics-card-head small,
.itops-analytics-mini small,
.itops-main-decision-card small {
  color: #475569;
  font-size: 11px;
  font-weight: 800;
}

.itops-analytics-card-head b {
  padding: 7px 10px;
  border-radius: 999px;
  background: #eff6ff;
  color: #0369a1;
  font-size: 12px;
  font-weight: 950;
}

.itops-analytics-stat-row {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.itops-analytics-stat-row span {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 5px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 900;
}

.itops-analytics-stat-row .online,
.itops-analytics-stat-row .resolved { color: #0369a1; background: #e0f2fe; }
.itops-analytics-stat-row .offline,
.itops-analytics-stat-row .open { color: #b91c1c; background: #fee2e2; }
.itops-analytics-stat-row .stale { color: #92400e; background: #fef3c7; }
.itops-analytics-stat-row .new { color: #0369a1; background: #e0f2fe; }

.itops-modern-column-chart {
  min-height: 148px;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  align-items: end;
  gap: 12px;
  padding: 14px 12px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  background: linear-gradient(to top, rgba(148, 163, 184, 0.18) 1px, transparent 1px) 0 0 / 100% 25%, linear-gradient(180deg, rgba(255,255,255,0.75), rgba(248,250,252,0.92));
}

.itops-modern-column {
  min-width: 0;
  height: 100%;
  display: grid;
  grid-template-rows: minmax(96px, 1fr) auto auto;
  align-items: end;
  gap: 6px;
  text-align: center;
}

.itops-modern-column-stack {
  width: min(46px, 82%);
  height: 108px;
  margin: 0 auto;
  display: flex;
  flex-direction: column-reverse;
  justify-content: flex-start;
  overflow: hidden;
  border-radius: 14px 14px 8px 8px;
  background: #e2e8f0;
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.12);
}

.itops-modern-column-stack i {
  display: block;
  width: 100%;
  min-height: 0;
}

.itops-modern-column-stack .online,
.itops-modern-column-stack .resolved { background: linear-gradient(180deg, #38bdf8, #0ea5e9); }
.itops-modern-column-stack .offline,
.itops-modern-column-stack .open { background: linear-gradient(180deg, #f59e0b, #ef4444); }
.itops-modern-column-stack .stale { background: linear-gradient(180deg, #fbbf24, #f59e0b); }
.itops-modern-column-stack .new { background: linear-gradient(180deg, #38bdf8, #0ea5e9); }
.itops-modern-column-stack .empty { background: #cbd5e1; }

.itops-modern-column span {
  color: #64748b;
  font-size: 11px;
  font-weight: 900;
}

.itops-modern-column strong {
  color: #0f172a;
  font-size: 12px;
  font-weight: 950;
}

.itops-analytics-empty-chart {
  grid-column: 1 / -1;
  min-height: 118px;
  display: grid;
  place-items: center;
  gap: 7px;
  color: #64748b;
  font-size: 12px;
  font-weight: 850;
}

.itops-analytics-mini-grid {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.itops-analytics-mini,
.itops-main-decision-card {
  min-height: 86px;
  display: grid;
  align-content: center;
  gap: 5px;
  padding: 12px;
  border: 1px solid #e0f2fe;
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  color: #0f172a;
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.itops-analytics-mini strong,
.itops-main-decision-card strong {
  color: #0f172a;
  font-size: 24px;
  line-height: 1;
  font-weight: 950;
  letter-spacing: -0.04em;
}

.itops-analytics-mini.blue,
.itops-main-decision-card.blue { background: linear-gradient(180deg, #ffffff 0%, #eff6ff 100%); border-color: #bfdbfe; }
.itops-analytics-mini.amber,
.itops-main-decision-card.amber { background: linear-gradient(180deg, #ffffff 0%, #fffbeb 100%); border-color: #fde68a; }
.itops-analytics-mini.green,
.itops-main-decision-card.green { background: linear-gradient(180deg, #ffffff 0%, #ecfdf5 100%); border-color: #bbf7d0; }
.itops-analytics-mini.orange { background: linear-gradient(180deg, #ffffff 0%, #fff7ed 100%); border-color: #fdba74; }

.itops-main-filled-grid { align-items: stretch; margin-top: 14px; }
.main-branch-filled-panel,
.main-decision-panel { height: 100%; }

.main-branch-filled-panel .itops-main-branch-list { gap: 9px; }
.main-branch-filled-panel .itops-main-branch-row { min-height: 58px; padding: 10px 12px; }
.main-decision-panel .itops-pro-panel-head { margin-bottom: 12px; }

.itops-main-decision-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.itops-main-decision-card.cyan { background: linear-gradient(180deg, #ffffff 0%, #ecfeff 100%); border-color: #a5f3fc; }
.itops-main-decision-card.purple { background: linear-gradient(180deg, #ffffff 0%, #f5f3ff 100%); border-color: #ddd6fe; }
.itops-main-decision-card.red { background: linear-gradient(180deg, #ffffff 0%, #fef2f2 100%); border-color: #fecaca; }

@media (max-width: 1180px) {
  .itops-analytics-dashboard,
  .itops-main-decision-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .itops-analytics-mini-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 780px) {
  .itops-analytics-dashboard,
  .itops-analytics-mini-grid,
  .itops-main-decision-grid { grid-template-columns: 1fr; }
  .itops-modern-column-chart { gap: 8px; }
}


/* Donut availability chart with hover */
.itops-availability-donut-layout {
  min-height: 182px;
  display: grid;
  grid-template-columns: minmax(190px, 0.82fr) minmax(0, 1.18fr);
  gap: 14px;
  align-items: center;
  padding: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 22px;
  background:
    radial-gradient(circle at 88% 8%, rgba(34, 197, 94, 0.10), transparent 30%),
    linear-gradient(180deg, rgba(255,255,255,0.78), rgba(248,250,252,0.94));
}

.itops-availability-donut-card {
  position: relative;
  width: 178px;
  height: 178px;
  margin: 0 auto;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: radial-gradient(circle, #ffffff 0%, #ffffff 52%, #eff6ff 53%, #f8fbff 100%);
}

.itops-availability-donut-card svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.itops-availability-donut-card circle {
  fill: none;
  stroke-width: 17;
  stroke-linecap: round;
  transform: rotate(-90deg);
  transform-origin: 50% 50%;
}

.itops-availability-donut-card .base {
  stroke: #e2e8f0;
}

.itops-availability-donut-card .online {
  stroke: url(#unused);
  stroke: #0ea5e9;
  filter: drop-shadow(0 5px 10px rgba(14, 165, 233, 0.30));
}

.itops-availability-donut-card .offline {
  stroke: #f59e0b;
  filter: drop-shadow(0 5px 10px rgba(245, 158, 11, 0.30));
}

.itops-availability-donut-center {
  position: relative;
  z-index: 2;
  display: grid;
  place-items: center;
  text-align: center;
}

.itops-availability-donut-center strong {
  color: #0f172a;
  font-size: 30px;
  line-height: 1;
  font-weight: 950;
  letter-spacing: -0.06em;
}

.itops-availability-donut-center span {
  margin-top: 4px;
  color: #64748b;
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.itops-availability-donut-hover {
  position: absolute;
  left: 50%;
  bottom: -18px;
  z-index: 5;
  min-width: 185px;
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border: 1px solid #e0f2fe;
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.16);
  color: #334155;
  font-size: 11px;
  font-weight: 800;
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, 8px);
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.itops-availability-donut-hover b {
  color: #0f172a;
  font-size: 12px;
  font-weight: 950;
}

.itops-availability-donut-card:hover .itops-availability-donut-hover {
  opacity: 1;
  transform: translate(-50%, 0);
}

.itops-availability-donut-side {
  min-width: 0;
  display: grid;
  gap: 12px;
}

.itops-availability-donut-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.itops-availability-donut-legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 26px;
  padding: 5px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 900;
}

.itops-availability-donut-legend i {
  width: 8px;
  height: 8px;
  border-radius: 999px;
}

.itops-availability-donut-legend .online { color: #0369a1; background: #e0f2fe; }
.itops-availability-donut-legend .offline { color: #92400e; background: #fef3c7; }
.itops-availability-donut-legend .stale { color: #92400e; background: #fef3c7; }
.itops-availability-donut-legend .online i { background: #0ea5e9; }
.itops-availability-donut-legend .offline i { background: #f59e0b; }
.itops-availability-donut-legend .stale i { background: #f59e0b; }

.itops-availability-trend-list {
  display: grid;
  gap: 8px;
}

.itops-availability-trend-row {
  position: relative;
  display: grid;
  grid-template-columns: 74px minmax(0, 1fr) 52px;
  gap: 10px;
  align-items: center;
  padding: 8px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: rgba(255,255,255,0.76);
}

.itops-availability-trend-row > div {
  display: grid;
  gap: 2px;
}

.itops-availability-trend-row strong {
  color: #0f172a;
  font-size: 12px;
  font-weight: 950;
}

.itops-availability-trend-row span {
  color: #64748b;
  font-size: 10px;
  font-weight: 800;
}

.itops-availability-trend-row em {
  height: 10px;
  display: flex;
  overflow: hidden;
  border-radius: 999px;
  background: #e2e8f0;
}

.itops-availability-trend-row em i {
  display: block;
  height: 100%;
}

.itops-availability-trend-row em .online { background: #0ea5e9; }
.itops-availability-trend-row em .offline { background: #f59e0b; }
.itops-availability-trend-row em .stale { background: #f59e0b; }

.itops-availability-trend-row b {
  color: #0f172a;
  font-size: 11px;
  font-weight: 950;
  text-align: right;
}

.itops-availability-row-hover {
  position: absolute;
  right: 10px;
  top: -34px;
  z-index: 4;
  width: max-content;
  max-width: 280px;
  padding: 7px 9px;
  border: 1px solid #e0f2fe;
  border-radius: 12px;
  background: rgba(255,255,255,0.98);
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.13);
  color: #334155 !important;
  font-size: 11px !important;
  font-weight: 850 !important;
  opacity: 0;
  pointer-events: none;
  transform: translateY(5px);
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.itops-availability-trend-row:hover .itops-availability-row-hover {
  opacity: 1;
  transform: translateY(0);
}

@media (max-width: 1180px) {
  .itops-availability-donut-layout {
    grid-template-columns: 1fr;
  }

  .itops-availability-donut-card {
    width: 160px;
    height: 160px;
  }
}


/* Availability donut custom color override: blue + purple, no red/green */
.itops-availability-donut-card .online {
  stroke: #0ea5e9;
  filter: drop-shadow(0 5px 10px rgba(14, 165, 233, 0.30));
}

.itops-availability-donut-card .offline {
  stroke: #f59e0b;
  filter: drop-shadow(0 5px 10px rgba(245, 158, 11, 0.30));
}

.itops-availability-donut-legend .online {
  color: #0369a1;
  background: #e0f2fe;
}

.itops-availability-donut-legend .offline {
  color: #92400e;
  background: #fef3c7;
}

.itops-availability-donut-legend .online i,
.itops-availability-trend-row em .online {
  background: #0ea5e9;
}

.itops-availability-donut-legend .offline i,
.itops-availability-trend-row em .offline {
  background: #f59e0b;
}

.itops-analytics-stat-row .online {
  color: #0369a1;
  background: #e0f2fe;
}

.itops-analytics-stat-row .offline {
  color: #92400e;
  background: #fef3c7;
}


/* Availability donut stronger contrast override */
.itops-availability-donut-card .online {
  stroke: #0ea5e9 !important;
  filter: drop-shadow(0 6px 12px rgba(14, 165, 233, 0.30)) !important;
}

.itops-availability-donut-card .offline {
  stroke: #f59e0b !important;
  filter: drop-shadow(0 6px 12px rgba(245, 158, 11, 0.30)) !important;
}

.itops-availability-donut-card .base {
  stroke: #e2e8f0 !important;
}

.itops-availability-donut-legend .online {
  color: #0369a1 !important;
  background: #e0f2fe !important;
}

.itops-availability-donut-legend .offline {
  color: #92400e !important;
  background: #fef3c7 !important;
}

.itops-availability-donut-legend .stale {
  color: #475569 !important;
  background: #f1f5f9 !important;
}

.itops-availability-donut-legend .online i,
.itops-availability-trend-row em .online {
  background: #0ea5e9 !important;
}

.itops-availability-donut-legend .offline i,
.itops-availability-trend-row em .offline {
  background: #f59e0b !important;
}

.itops-availability-donut-legend .stale i,
.itops-availability-trend-row em .stale {
  background: #64748b !important;
}

.itops-analytics-stat-row .online {
  color: #0369a1 !important;
  background: #e0f2fe !important;
}

.itops-analytics-stat-row .offline {
  color: #92400e !important;
  background: #fef3c7 !important;
}

.itops-analytics-stat-row .stale {
  color: #475569 !important;
  background: #f1f5f9 !important;
}

`;
