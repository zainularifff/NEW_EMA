import { Fragment, type MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Database,
  Folder,
  FolderOpen,
  FolderPlus,
  Lock,
  MapPin,
  MessageSquare,
  Monitor,
  MoreVertical,
  Pencil,
  RefreshCw,
  Search,
  Send,
  Shield,
  Trash2,
  Unlock,
  X,
} from "lucide-react";

type StatusType = "Online" | "Locked" | "Stale Sync" | "Offline";
type KpiFilter = "all" | "recent" | "stale" | "locked" | "running";
type SortDirection = "asc" | "desc";
type SortKey =
  | "name"
  | "platformModel"
  | "status"
  | "lastConnected"
  | "groupPath"
  | "deviceIdentifier"
  | "ip";
type TableFilters = {
  status: string;
  platform: string;
};
type ModalType =
  | "message"
  | "remote"
  | "geo"
  | "lock"
  | "move"
  | "addFolder"
  | "renameFolder"
  | "deleteFolder"
  | null;
type SessionType = "view" | "full" | "file";
type ToastType = "success" | "error" | "info";
type ToastState = {
  type: ToastType;
  title: string;
  message: string;
} | null;
type DetailTab = "overview" | "hardware" | "network" | "user" | "storage" | "timeline" | "raw";

type TreeNode = {
  key: string;
  label: string;
  children?: TreeNode[];
};

type Device = {
  id: string;
  name: string;
  owner: string;
  department: string;
  os: string;
  processor: string;
  memory: string;
  storage: string;
  platformModel: string;
  lastConnected: string;
  groupPath: string;
  ip: string;
  status: StatusType;
  folderKey: string;
  pathKeys: string[];
  latitude: string;
  longitude: string;
  accuracy: string;
  lastUpdate: string;
  assetId?: number;
  objectAgent?: string;
  deviceIdentifier?: string;
  rawApi?: unknown;
};

type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  errorMessage?: string;
  data: T;
  totalRecords?: number;
  summary?: {
    total?: number;
    SuccessCount?: number;
    FailedCount?: number;
    ErrorCount?: number;
  };
};

type RemoteControlApiResult = {
  message?: string;
  url?: string;
  method?: string;
  objectAgent?: string;
  Object_Root_Idn?: number;
  MDM_Asset_Idn?: number;
  deviceID?: string;
  deviceName?: string;
  iframeOptions?: {
    ShowOnlyRemoteScreen?: boolean;
    ScrBgClr?: string;
    ScrImg?: string;
  };
  tokenExpiresInSeconds?: number;
};

type LockUnlockApiResult = {
  message?: string;
  action?: "lock" | "unlock" | string;
  Object_Root_Idn?: number;
  MDM_Asset_Idn?: number;
  DeviceID?: string;
  DeviceName?: string;
  PlatformType?: string;
  JobName?: string;
  JobType?: string;
  JobId?: string;
};

type SendMessageApiResult = {
  message?: string;
  errorMessage?: string;
  DeviceID?: string;
  DeviceName?: string;
  PlatformType?: string;
  Object_Root_Idn?: number;
  MDM_Asset_Idn?: number;
};

type GeolocationApiRow = {
  DeviceID?: string;
  DeviceName?: string;
  Latitude?: string | number;
  Longitude?: string | number;
  LocationAccuracy?: string | number;
  Accuracy?: string | number;
  Time?: string;
  DateTime?: string;
  LastUpdate?: string;
  LocationName?: string;
  Address?: string;
  [key: string]: unknown;
};

type HardwareApiRow = Record<string, unknown>;

type StatisticNode = {
  id: string;
  name: string;
  type: "category" | "subcategory" | "report";
  icon?: "network" | "settings" | "cpu" | "file-text";
  children?: StatisticNode[];
  dataType?: "connection" | "hardware" | "report" | "management";
};

type StatisticApiState = {
  title: string;
  description: string;
  rows: HardwareApiRow[];
  columns: string[];
};

type HardwareScanMode = "all" | "folder" | "device";

type HardwareScanResult = {
  Job_Idn?: number;
  Job_Type?: number;
  Job_Command?: number;
  Job_Status?: number;
  scanMode?: string;
  targetCount?: number;
  historyRows?: number;
};

type GeoApiRuntime = {
  endpoint: string;
  method: "POST";
  mode: "Live" | "All";
  sync: boolean;
  resolverKey: string;
  resolverValue: string;
  requestPayload: Record<string, unknown>;
  responseTotal: number;
  rowsWithCoordinates: number;
  latestDeviceID: string;
  lastRun: string;
  message: string;
  error?: string;
};

type ApiDepartment = {
  Object_Rel_Idn: number;
  Object_Rel_Name: string;
  Object_Full_Name?: string;
  Object_PR_Idn?: number;
  children?: ApiDepartment[];
};

type ApiAsset = {
  _Idn: number;
  Object_Agent?: string;
  Object_DeviceID?: string;
  ComputerName?: string;
  Object_Full_Name?: string;
  PlatformType?: string;
  Model?: string;
  ConnectionTime?: string;
  ConnectionStatus?: string;
  IP?: string;
  Latitude?: string;
  Longitude?: string;
  Accuracy?: string;
  LastUpdate?: string;
  [key: string]: unknown;
};

const LOCK_STATE_CACHE_KEY = "ema.hardwareInventory.lockState.v1";

type DeviceLockCacheEntry = {
  status: "Locked";
  updatedAt: string;
  deviceName: string;
  reason?: string;
  duration?: string;
};

function getDeviceLockCacheKey(device: Pick<Device, "objectAgent" | "assetId" | "deviceIdentifier" | "name">) {
  const objectAgent = String(device.objectAgent || "EM").trim().toUpperCase();
  const assetId = device.assetId !== undefined && device.assetId !== null ? String(device.assetId).trim() : "";
  const deviceIdentifier = String(device.deviceIdentifier || "").trim();
  const deviceName = String(device.name || "").trim();

  return [objectAgent, assetId || deviceIdentifier || deviceName]
    .filter(Boolean)
    .join(":")
    .toLowerCase();
}

function readLockStateCache(): Record<string, DeviceLockCacheEntry> {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(LOCK_STATE_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (_) {
    return {};
  }
}

function writeLockStateCache(cache: Record<string, DeviceLockCacheEntry>) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(LOCK_STATE_CACHE_KEY, JSON.stringify(cache));
  } catch (_) {
    // Ignore storage failures. UI state still updates for the current session.
  }
}

function persistDeviceLockState(device: Device, status: StatusType, meta: { reason?: string; duration?: string } = {}) {
  const key = getDeviceLockCacheKey(device);
  if (!key) return;

  const cache = readLockStateCache();

  if (status === "Locked") {
    cache[key] = {
      status: "Locked",
      updatedAt: new Date().toISOString(),
      deviceName: device.name,
      reason: meta.reason,
      duration: meta.duration,
    };
  } else {
    delete cache[key];
  }

  writeLockStateCache(cache);
}

function normalizeApiLockState(value: unknown): "locked" | "unlocked" | "unknown" {
  if (value === undefined || value === null || value === "") return "unknown";
  if (typeof value === "boolean") return value ? "locked" : "unlocked";
  if (typeof value === "number") return value === 1 ? "locked" : value === 0 ? "unlocked" : "unknown";

  const text = String(value).trim().toLowerCase();
  if (!text) return "unknown";
  if (["true", "yes", "y", "1", "locked", "lock", "device locked", "lost mode"].includes(text)) return "locked";
  if (["false", "no", "n", "0", "unlocked", "unlock", "device unlocked", "none"].includes(text)) return "unlocked";
  if (text.includes("unlocked") || text.includes("unlock")) return "unlocked";
  if (text.includes("locked") || text.includes("lock") || text.includes("lost mode")) return "locked";
  return "unknown";
}

function deriveApiLockState(asset: ApiAsset): "locked" | "unlocked" | "unknown" {
  const directCandidates = [
    asset.LockStatus,
    asset.lockStatus,
    asset.DeviceLockStatus,
    asset.deviceLockStatus,
    asset.LockState,
    asset.lockState,
    asset.IsLocked,
    asset.isLocked,
    asset.Locked,
    asset.locked,
    asset.IsDeviceLocked,
    asset.isDeviceLocked,
    asset.LostModeEnabled,
    asset.lostModeEnabled,
    asset.IsLostModeEnabled,
    asset.isLostModeEnabled,
    asset.DeviceState,
    asset.deviceState,
    asset.SecurityState,
    asset.securityState,
  ];

  for (const candidate of directCandidates) {
    const state = normalizeApiLockState(candidate);
    if (state !== "unknown") return state;
  }

  const deepLockValue = findFirstDeepValue(asset, [
    "LockStatus",
    "DeviceLockStatus",
    "LockState",
    "IsLocked",
    "Locked",
    "IsDeviceLocked",
    "LostModeEnabled",
    "IsLostModeEnabled",
    "DeviceState",
    "SecurityState",
  ]);

  return normalizeApiLockState(deepLockValue);
}

function applyPersistentLockState(device: Device) {
  const key = getDeviceLockCacheKey(device);
  if (!key) return device;

  const cached = readLockStateCache()[key];
  if (cached?.status === "Locked") {
    return { ...device, status: "Locked" as StatusType };
  }

  return device;
}

type DepartmentPath = {
  key: string;
  relationID: number;
  label: string;
  pathKeys: string[];
  groupPath: string;
};

const PAGE_SIZE = 10;
function resolveApiBaseUrl() {
  const envUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (envUrl) return envUrl.replace(/\/$/, "");

  if (typeof window !== "undefined") {
    const { hostname, port, protocol } = window.location;
    const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";
    const isViteDevPort = port === "5173" || port === "5174" || port === "3000";

    if (isLocalHost && isViteDevPort) {
      return `${protocol}//${hostname}:3001`;
    }
  }

  return "";
}

const API_BASE_URL = resolveApiBaseUrl();
const TOKEN_STORAGE_KEYS = ["ema-access-token", "ema-token", "accessToken", "token", "authToken"];
const AUTH_PAYLOAD_KEYS = ["ema-auth", "auth", "user", "ema-user", "currentUser", "authUser", "ema-current-user"];
const TABLE_FILTER_DEFAULTS: TableFilters = { status: "all", platform: "all" };

const emptyDevice: Device = {
  id: "NO-DEVICE",
  name: "No device selected",
  owner: "-",
  department: "-",
  os: "-",
  processor: "-",
  memory: "-",
  storage: "-",
  platformModel: "- / -",
  lastConnected: "-",
  groupPath: "Organization",
  ip: "-",
  status: "Offline",
  folderKey: "organization",
  pathKeys: ["organization"],
  latitude: "-",
  longitude: "-",
  accuracy: "-",
  lastUpdate: "-",
};

const initialTreeData: TreeNode[] = [{ key: "organization", label: "Organization", children: [] }];

const STATISTIC_CATEGORY_KEY_MAP: Record<string, string> = {
  "stat-os": "os",
  "stat-processor": "processor",
  "stat-memory": "memory",
  "stat-hdd": "hardDisk",
  "stat-cdrom": "cdrom",
  "stat-sound": "soundCard",
  "stat-video": "videoCard",
  "stat-lan": "lanCard",
  "stat-modem": "modem",
  "stat-monitor": "monitor",
  "stat-manufacturer": "manufacturer",
  "stat-model": "model",
};

const STATISTIC_TITLE_MAP: Record<string, string> = {
  "conn-summary": "Connection Statistics",
  "conn-list": "Connection List",
  "client-version": "Client Version",
  "changed-items": "Changed Items",
  "duplicated-ip": "Duplicated IP",
  "stat-os": "Operating System",
  "stat-processor": "Processor",
  "stat-memory": "Memory",
  "stat-hdd": "Hard Disk",
  "stat-cdrom": "CD-ROM",
  "stat-sound": "Sound Card",
  "stat-video": "Video Card",
  "stat-lan": "LAN Card",
  "stat-modem": "Modem",
  "stat-monitor": "Monitor",
  "stat-manufacturer": "Manufacturer",
  "stat-model": "Model",
  "report-os": "Operating System Report",
  "report-processor": "Processor Report",
  "report-memory": "Memory Report",
  "report-hdd": "Hard Disk Report",
  "report-inventory": "Hardware Inventory List",
};

const REPORT_KEY_MAP: Record<string, string> = {
  "report-os": "os",
  "report-processor": "processor",
  "report-memory": "memory",
  "report-hdd": "hardDisk",
};

function generateStatisticTree(): StatisticNode[] {
  return [
    {
      id: "connection-statistics",
      name: "Connection Statistics",
      type: "category",
      icon: "network",
      dataType: "connection",
      children: [
        { id: "conn-summary", name: "Connection Statistics", type: "subcategory", dataType: "connection" },
        { id: "conn-list", name: "Connection List", type: "subcategory", dataType: "connection" },
        { id: "client-version", name: "Client Version", type: "subcategory", dataType: "connection" },
      ],
    },
    {
      id: "hardware-management",
      name: "Hardware Management",
      type: "category",
      icon: "settings",
      dataType: "management",
      children: [
        { id: "changed-items", name: "Changed Items", type: "subcategory", dataType: "management" },
        { id: "duplicated-ip", name: "Duplicated IP", type: "subcategory", dataType: "management" },
      ],
    },
    {
      id: "hardware-statistics",
      name: "Hardware Statistics",
      type: "category",
      icon: "cpu",
      dataType: "hardware",
      children: [
        { id: "stat-os", name: "Operating System", type: "subcategory", dataType: "hardware" },
        { id: "stat-processor", name: "Processor", type: "subcategory", dataType: "hardware" },
        { id: "stat-memory", name: "Memory", type: "subcategory", dataType: "hardware" },
        { id: "stat-hdd", name: "Hard Disk", type: "subcategory", dataType: "hardware" },
        { id: "stat-cdrom", name: "CD-ROM", type: "subcategory", dataType: "hardware" },
        { id: "stat-sound", name: "Sound Card", type: "subcategory", dataType: "hardware" },
        { id: "stat-video", name: "Video Card", type: "subcategory", dataType: "hardware" },
        { id: "stat-lan", name: "LAN Card", type: "subcategory", dataType: "hardware" },
        { id: "stat-modem", name: "Modem", type: "subcategory", dataType: "hardware" },
        { id: "stat-monitor", name: "Monitor", type: "subcategory", dataType: "hardware" },
        { id: "stat-manufacturer", name: "Manufacturer", type: "subcategory", dataType: "hardware" },
        { id: "stat-model", name: "Model", type: "subcategory", dataType: "hardware" },
      ],
    },
    {
      id: "reports",
      name: "Report",
      type: "category",
      icon: "file-text",
      dataType: "report",
      children: [
        { id: "report-os", name: "Operating System", type: "report", dataType: "report" },
        { id: "report-processor", name: "Processor", type: "report", dataType: "report" },
        { id: "report-memory", name: "Memory", type: "report", dataType: "report" },
        { id: "report-hdd", name: "Hard Disk", type: "report", dataType: "report" },
        { id: "report-inventory", name: "Hardware Inventory List", type: "report", dataType: "report" },
      ],
    },
  ];
}

function normalizeHardwareRows(value: unknown): HardwareApiRow[] {
  if (Array.isArray(value)) return value.map((row) => (asRecord(row) || {}) as HardwareApiRow);

  const valueRecord = asRecord(value);
  if (!valueRecord) return [];

  const nestedData = valueRecord.data;
  if (Array.isArray(nestedData)) return nestedData.map((row) => (asRecord(row) || {}) as HardwareApiRow);

  const nestedDataRecord = asRecord(nestedData);
  if (nestedDataRecord && Array.isArray(nestedDataRecord.data)) {
    return nestedDataRecord.data.map((row) => (asRecord(row) || {}) as HardwareApiRow);
  }

  return Object.keys(valueRecord).length ? [valueRecord] : [];
}

function getColumnsFromHardwareRows(rows: HardwareApiRow[]) {
  const preferred = [
    "Items",
    "Item",
    "Name",
    "OS",
    "CPU",
    "Processor",
    "Memory",
    "HardDisk",
    "ComputerName",
    "Object_Client_Name",
    "UserName",
    "Username",
    "Object_Full_Name",
    "Department",
    "IP",
    "IPAddress",
    "ClientVersion",
    "Count",
    "Cnt",
    "Total",
    "Workgroup",
    "Model",
    "Manufacturer",
    "ConnectionTime",
    "UpdateTime",
    "SearchDate",
    "Search_Date",
    "Version",
  ];

  const discovered = new Set<string>();
  rows.slice(0, 30).forEach((row) => {
    Object.keys(row).forEach((key) => {
      const value = row[key];
      if (value !== null && value !== undefined) discovered.add(key);
    });
  });

  return [
    ...preferred.filter((key) => discovered.has(key)),
    ...Array.from(discovered).filter((key) => !preferred.includes(key)),
  ].slice(0, 12);
}

function formatHardwareValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (value instanceof Date) return value.toLocaleString();
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function findHardwareRecordValue(row: HardwareApiRow, keys: string[]) {
  const entries = Object.entries(row);

  for (const wantedKey of keys) {
    const exact = row[wantedKey];
    if (exact !== undefined && exact !== null && String(exact).trim() !== "") return exact;

    const normalizedWantedKey = wantedKey.replace(/[\s_\-()/.]+/g, "").toLowerCase();
    const match = entries.find(([key, value]) => {
      const normalizedKey = key.replace(/[\s_\-()/.]+/g, "").toLowerCase();
      return normalizedKey === normalizedWantedKey && value !== undefined && value !== null && String(value).trim() !== "";
    });

    if (match) return match[1];
  }

  return undefined;
}

function readHardwareText(row: HardwareApiRow, keys: string[], fallback = "-") {
  const value = findHardwareRecordValue(row, keys);
  return formatHardwareValue(value === undefined ? fallback : value);
}

function readHardwareNumber(row: HardwareApiRow, keys: string[], fallback = 0) {
  const value = findHardwareRecordValue(row, keys);
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getStatisticItemLabel(row: HardwareApiRow) {
  return readHardwareText(row, [
    "Items",
    "Item",
    "Name",
    "Category",
    "Value",
    "OS",
    "OperatingSystem",
    "Processor",
    "CPU",
    "Memory",
    "HardDisk",
    "CD-ROM",
    "CDROM",
    "SoundCard",
    "SOUND_CARD",
    "VideoCard",
    "VIDEO_CARD",
    "LANCard",
    "LAN_CARD",
    "Modem",
    "Monitor",
    "Manufacturer",
    "Model",
    "ClientVersion",
    "clientVersion",
    "column1",
  ]);
}

function getStatisticCount(row: HardwareApiRow) {
  return readHardwareNumber(row, ["Count", "Cnt", "Total", "Total Device", "TotalDevice", "No", "column2"], 0);
}

function getTotalFromStatisticRows(rows: HardwareApiRow[]) {
  const directTotal = readHardwareNumber(rows[0] || {}, ["Total Connection(s)", "TotalConnection", "Total Device", "TotalDevice", "TotalCount", "Total", "total"], NaN);
  if (Number.isFinite(directTotal)) return directTotal;

  return rows.reduce((sum, row) => sum + getStatisticCount(row), 0);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function firstRecord(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) return asRecord(value[0]);
  return asRecord(value);
}

function pickValue(record: Record<string, unknown> | null, keys: string[]) {
  if (!record) return "";
  const lowerKeyMap = new Map(Object.keys(record).map((key) => [key.toLowerCase(), key]));

  for (const key of keys) {
    const actualKey = lowerKeyMap.get(key.toLowerCase());
    const value = actualKey ? record[actualKey] : undefined;
    if (value !== undefined && value !== null && String(value).trim() !== "") return String(value).trim();
  }

  return "";
}

function findTokenInValue(value: unknown, depth = 0): string {
  if (!value || depth > 5) return "";

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("eyJ")) return trimmed;

    try {
      return findTokenInValue(JSON.parse(trimmed), depth + 1);
    } catch {
      return "";
    }
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const token = findTokenInValue(item, depth + 1);
      if (token) return token;
    }
    return "";
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const nestedData = asRecord(record.data);
    const directToken =
      record.token ||
      record.accessToken ||
      record.authToken ||
      record.jwt ||
      record.jwtToken ||
      record.bearerToken ||
      nestedData?.token ||
      nestedData?.accessToken;

    if (typeof directToken === "string" && directToken.trim()) return directToken.trim();

    for (const item of Object.values(record)) {
      const token = findTokenInValue(item, depth + 1);
      if (token) return token;
    }
  }

  return "";
}

function getStoredAccessToken() {
  const storages = [window.localStorage, window.sessionStorage];

  for (const storage of storages) {
    for (const key of TOKEN_STORAGE_KEYS) {
      const directValue = storage.getItem(key);
      if (directValue?.trim()) return directValue.trim();
    }

    for (const key of AUTH_PAYLOAD_KEYS) {
      const token = findTokenInValue(storage.getItem(key));
      if (token) return token;
    }

    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key) continue;
      const token = findTokenInValue(storage.getItem(key));
      if (token) return token;
    }
  }

  return "";
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<ApiEnvelope<T>> {
  const token = getStoredAccessToken();
  if (!token) throw new Error("Access token missing. Please login again.");

  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  const rawBody = await response.text();
  let payload: ApiEnvelope<T>;

  try {
    payload = rawBody ? JSON.parse(rawBody) : ({ success: response.ok, data: undefined as T } as ApiEnvelope<T>);
  } catch {
    throw new Error(`Invalid API response from ${path}`);
  }

  if (!response.ok || payload.success === false) {
    throw new Error(payload.errorMessage || payload.message || `API request failed: ${response.status}`);
  }

  return payload;
}

function mapDepartmentTree(departments: ApiDepartment[]): TreeNode[] {
  return [
    {
      key: "organization",
      label: "Organization",
      children: departments.map((department) => mapDepartmentNode(department)),
    },
  ];
}

function mapDepartmentNode(department: ApiDepartment): TreeNode {
  return {
    key: String(department.Object_Rel_Idn),
    label: department.Object_Rel_Name || department.Object_Full_Name || String(department.Object_Rel_Idn),
    children: department.children?.map((child) => mapDepartmentNode(child)),
  };
}

function collectDepartmentPaths(nodes: TreeNode[], parentKeys: string[] = [], parentLabels: string[] = []): DepartmentPath[] {
  return nodes.flatMap((node) => {
    const currentKeys = [...parentKeys, node.key];
    const currentLabels = [...parentLabels, node.label];
    const relationID = Number(node.key);
    const currentPath: DepartmentPath[] = Number.isFinite(relationID)
      ? [
          {
            key: node.key,
            relationID,
            label: node.label,
            pathKeys: currentKeys,
            groupPath: currentLabels.join(" \\ "),
          },
        ]
      : [];

    return [...currentPath, ...(node.children ? collectDepartmentPaths(node.children, currentKeys, currentLabels) : [])];
  });
}

function flattenTree(nodes: TreeNode[]): TreeNode[] {
  return nodes.flatMap((node) => [node, ...(node.children ? flattenTree(node.children) : [])]);
}

function getDescendantKeys(node: TreeNode): string[] {
  if (!node.children?.length) return [node.key];
  return [node.key, ...node.children.flatMap(getDescendantKeys)];
}

function treeMatchesSearch(node: TreeNode, search: string): boolean {
  if (!search) return true;
  const selfMatch = node.label.toLowerCase().includes(search.toLowerCase());
  const childMatch = node.children?.some((child) => treeMatchesSearch(child, search)) ?? false;
  return selfMatch || childMatch;
}

function formatApiDate(value?: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);

  return parsed.toLocaleString("en-MY", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatGeoDate(value?: string) {
  if (!value) return "-";
  const text = String(value).trim();
  if (!text) return "-";

  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (match) {
    const [, year, month, day, hour, minute] = match;
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthLabel = monthNames[Math.max(0, Math.min(11, Number(month) - 1))];
    return `${day} ${monthLabel} ${year}, ${hour}:${minute}`;
  }

  return formatApiDate(text);
}

function formatGeoDateWithDay(value?: string) {
  if (!value) return "-";
  const text = String(value).trim();
  if (!text) return "-";

  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (match) {
    const [, year, month, day, hour, minute] = match;
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dateObject = new Date(Number(year), Number(month) - 1, Number(day));
    const dayLabel = dayNames[dateObject.getDay()] || "";
    const monthLabel = monthNames[Math.max(0, Math.min(11, Number(month) - 1))];
    return `${dayLabel}, ${day} ${monthLabel} ${year}, ${hour}:${minute}`;
  }

  return formatGeoDate(text);
}

function getGeoDateParts(value?: string) {
  if (!value) return { dayDate: "-", time: "-" };
  const text = String(value).trim();
  if (!text) return { dayDate: "-", time: "-" };

  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (match) {
    const [, year, month, day, hour, minute] = match;
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const dateObject = new Date(Number(year), Number(month) - 1, Number(day));
    const dayLabel = dayNames[dateObject.getDay()] || "";
    const monthLabel = monthNames[Math.max(0, Math.min(11, Number(month) - 1))];

    return {
      dayDate: `${dayLabel}, ${Number(day)} ${monthLabel} ${year}`,
      time: `${hour}:${minute}`,
    };
  }

  const fallback = formatGeoDate(text);
  return { dayDate: fallback, time: "-" };
}

function mapApiStatus(status?: string, asset?: ApiAsset): StatusType {
  if (asset && deriveApiLockState(asset) === "locked") return "Locked";

  const value = String(status || "").toLowerCase();
  if (value.includes("unlock")) return "Online";
  if (value.includes("lock")) return "Locked";
  if (value.includes("online") || value === "1" || value === "connected") return "Online";
  if (value.includes("offline") || value === "0" || value === "disconnected") return "Offline";
  if (value.includes("stale") || value.includes("sync")) return "Stale Sync";
  return "Offline";
}

function mapApiAssetToDevice(asset: ApiAsset, department: DepartmentPath): Device {
  const objectAgent = String(asset.Object_Agent || "").trim();
  const assetId = Number(asset._Idn);
  const deviceIdentifier = String(asset.Object_DeviceID || "").trim();
  const deviceName = String(asset.ComputerName || deviceIdentifier || "-").trim();
  const platform = String(asset.PlatformType || "-").trim();
  const model = String(asset.Model || "-").trim();
  const groupPath = String(asset.Object_Full_Name || department.groupPath || department.label).trim();
  const departmentName =
    groupPath
      .split("\\")
      .map((item) => item.trim())
      .filter(Boolean)
      .pop() || department.label;
  const status = mapApiStatus(asset.ConnectionStatus, asset);
  const lastConnected = formatApiDate(asset.ConnectionTime);
  const internalId = [objectAgent || "asset", Number.isFinite(assetId) ? String(assetId) : deviceIdentifier || deviceName]
    .filter(Boolean)
    .join("-");

  return {
    id: internalId,
    name: deviceName,
    owner: "-",
    department: departmentName,
    os: platform,
    processor: "-",
    memory: "-",
    storage: "-",
    platformModel: `${platform} / ${model}`,
    lastConnected,
    groupPath,
    ip: String(asset.IP || "-").trim() || "-",
    status,
    folderKey: department.key,
    pathKeys: department.pathKeys,
    latitude: String(asset.Latitude || "-").trim() || "-",
    longitude: String(asset.Longitude || "-").trim() || "-",
    accuracy: String(asset.Accuracy || "-").trim() || "-",
    lastUpdate: formatApiDate(String(asset.LastUpdate || asset.ConnectionTime || "")),
    assetId: Number.isFinite(assetId) ? assetId : undefined,
    objectAgent: objectAgent || undefined,
    deviceIdentifier: deviceIdentifier || undefined,
    rawApi: asset,
  };
}

function buildStorageLabel(payload: Record<string, unknown>) {
  const diskRecord = firstRecord(payload.DiskDrives) || firstRecord(payload.DISKDRIVES) || firstRecord(payload.diskDrives);
  const total = pickValue(diskRecord, ["TotalSize", "Total", "Capacity", "Size", "DriveTotal", "driveTotal", "drive_total"]);
  const free = pickValue(diskRecord, ["FreeSpace", "Free", "Available", "DriveFree", "driveFree", "drive_free"]);
  if (total && free) return `${total} / ${free} free`;
  if (total) return total;
  return "";
}

function enrichDeviceWithDetails(device: Device, payload: unknown): Device {
  const root = asRecord(payload);
  if (!root) return { ...device, rawApi: payload };

  const mdm = asRecord(root.MDM);
  const hwMainInfo =
    firstRecord(root.HWMainInfo) || firstRecord(root.hwMainInfo) || firstRecord(root.MainInfo) || firstRecord(mdm?.HWMainInfo);

  const processor = pickValue(hwMainInfo, ["Processor", "CPU", "CPUName", "ProcessorName", "ProcessorType"]);
  const memory = pickValue(hwMainInfo, ["Memory", "RAM", "PhysicalMemory", "TotalPhysicalMemory", "TotalMemory"]);
  const os = pickValue(hwMainInfo, ["OS", "OSName", "OperatingSystem", "OSCaption", "PlatformType"]);
  const model = pickValue(hwMainInfo, ["Model", "DeviceModelName", "ComputerModel", "SystemModel"]);
  const owner = pickValue(hwMainInfo, ["UserName", "Username", "LoginName", "LastLoginUser", "Owner", "EmailAddress"]);
  const computerName = pickValue(hwMainInfo, ["ComputerName", "DeviceName", "HostName"]);
  const ip = pickValue(hwMainInfo, ["IP", "IPAddress", "DeviceIPAddress", "DeviceLocalIPAddress"]);
  const latitude = pickValue(hwMainInfo, ["Latitude", "GPSLatitude", "Lat"]);
  const longitude = pickValue(hwMainInfo, ["Longitude", "GPSLongitude", "Long", "Lng"]);
  const accuracy = pickValue(hwMainInfo, ["Accuracy", "GPSAccuracy", "LocationAccuracy"]);
  const lastUpdate = pickValue(hwMainInfo, ["LastUpdate", "LastUpdated", "UpdateTime", "LocationTime"]);
  const storage = buildStorageLabel(root);
  const previous = splitPlatformModel(device.platformModel);

  return {
    ...device,
    name: computerName || device.name,
    owner: owner || device.owner,
    os: os || device.os,
    processor: processor || device.processor,
    memory: memory || device.memory,
    storage: storage || device.storage,
    platformModel: `${os || previous.platform} / ${model || previous.model}`,
    ip: ip || device.ip,
    latitude: latitude || device.latitude,
    longitude: longitude || device.longitude,
    accuracy: accuracy || device.accuracy,
    lastUpdate: lastUpdate ? formatApiDate(lastUpdate) : device.lastUpdate,
    rawApi: payload,
  };
}

function getStatusClass(status: StatusType) {
  switch (status) {
    case "Online":
      return "is-online";
    case "Locked":
      return "is-locked";
    case "Stale Sync":
      return "is-stale";
    case "Offline":
      return "is-offline";
    default:
      return "";
  }
}

function getDeviceTimestamp(device: Device) {
  for (const candidate of [device.lastConnected, device.lastUpdate]) {
    if (!candidate || candidate === "-") continue;
    const parsed = new Date(candidate);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function isRecentlyConnected(device: Device) {
  const timestamp = getDeviceTimestamp(device);
  if (!timestamp) return device.status === "Online";
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return timestamp.getTime() >= sevenDaysAgo || device.status === "Online";
}

function isStaleSyncDevice(device: Device) {
  if (device.status === "Stale Sync") return true;
  const timestamp = getDeviceTimestamp(device);
  if (!timestamp) return false;
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return timestamp.getTime() < thirtyDaysAgo;
}

function isRunningJobDevice(device: Device) {
  return device.status === "Online";
}

function getKpiFilterLabel(filter: KpiFilter) {
  switch (filter) {
    case "recent":
      return "Recently Connected";
    case "stale":
      return "Last Sync / Stale Sync";
    case "locked":
      return "Locked Devices";
    case "running":
      return "Online Devices";
    default:
      return "Total Devices";
  }
}

function splitPlatformModel(platformModel: string) {
  const [platform = "-", model = "-"] = platformModel.split(" / ");
  return { platform, model };
}

function getWorkgroup(groupPath: string) {
  const parts = groupPath
    .split("\\")
    .map((item) => item.trim())
    .filter(Boolean);
  return parts[parts.length - 1] || "-";
}

function getStorageUsage(storage: string) {
  const match = storage.match(/(\d+(?:\.\d+)?)\s*(TB|GB)\s*\/\s*(\d+(?:\.\d+)?)\s*(TB|GB)\s*free/i);
  if (!match) return null;
  const totalValue = Number(match[1]);
  const totalUnit = match[2].toUpperCase();
  const freeValue = Number(match[3]);
  const freeUnit = match[4].toUpperCase();
  const totalGb = totalUnit === "TB" ? totalValue * 1024 : totalValue;
  const freeGb = freeUnit === "TB" ? freeValue * 1024 : freeValue;
  if (!totalGb || Number.isNaN(totalGb) || Number.isNaN(freeGb)) return null;
  return Math.min(100, Math.max(0, Math.round(((totalGb - freeGb) / totalGb) * 100)));
}

function getSortValue(device: Device, key: SortKey): string | number {
  switch (key) {
    case "name":
      return device.name || "";
    case "platformModel":
      return device.platformModel || "";
    case "status":
      return device.status || "";
    case "lastConnected": {
      const time = Date.parse(device.lastConnected || "");
      return Number.isNaN(time) ? 0 : time;
    }
    case "groupPath":
      return device.groupPath || "";
    case "deviceIdentifier":
      return device.deviceIdentifier || device.id || "";
    case "ip":
      return device.ip || "";
    default:
      return "";
  }
}

function compareSortValues(a: string | number, b: string | number) {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

function getUniqueOptions(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );
}

function normalizeApiMessage(value: unknown, fallback = "") {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function getGeoField(row: GeolocationApiRow | undefined, keys: string[]) {
  if (!row) return "";
  const record = row as Record<string, unknown>;
  const lowerKeyMap = new Map(Object.keys(record).map((key) => [key.toLowerCase(), key]));

  for (const key of keys) {
    const actualKey = lowerKeyMap.get(key.toLowerCase()) || key;
    const value = record[actualKey];
    if (value !== undefined && value !== null && String(value).trim() !== "") return String(value).trim();
  }
  return "";
}

function getRecordValueCaseInsensitive(record: Record<string, unknown>, key: string) {
  const actualKey = Object.keys(record).find((item) => item.toLowerCase() === key.toLowerCase());
  return actualKey ? record[actualKey] : undefined;
}

function findFirstDeepValue(value: unknown, keys: string[], depth = 0, visited = new WeakSet<object>()): string {
  if (!value || depth > 6) return "";

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstDeepValue(item, keys, depth + 1, visited);
      if (found) return found;
    }
    return "";
  }

  const record = asRecord(value);
  if (!record || visited.has(record)) return "";
  visited.add(record);

  const directValue = pickValue(record, keys);
  if (directValue) return directValue;

  for (const nested of Object.values(record)) {
    if (nested && typeof nested === "object") {
      const found = findFirstDeepValue(nested, keys, depth + 1, visited);
      if (found) return found;
    }
  }

  return "";
}

function uniqueGeoRows(rows: GeolocationApiRow[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const latitude = getGeoLatitude(row);
    const longitude = getGeoLongitude(row);
    const key = [getGeoField(row, ["DeviceID", "deviceID", "DeviceName"]), latitude, longitude, getGeoField(row, ["Time", "DateTime", "LastUpdate"])].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getGeoRowsFromUnknown(value: unknown, depth = 0, visited = new WeakSet<object>()): GeolocationApiRow[] {
  if (!value || depth > 8) return [];

  if (Array.isArray(value)) {
    return uniqueGeoRows(value.flatMap((item) => getGeoRowsFromUnknown(item, depth + 1, visited)));
  }

  const record = asRecord(value);
  if (!record) return [];
  if (visited.has(record)) return [];
  visited.add(record);

  const currentRow = record as GeolocationApiRow;
  const hasCoordinates = Boolean(getGeoLatitude(currentRow) && getGeoLongitude(currentRow));
  const rows: GeolocationApiRow[] = hasCoordinates ? [currentRow] : [];

  const candidateKeys = [
    "data",
    "rows",
    "row",
    "result",
    "results",
    "saved",
    "locations",
    "location",
    "Location",
    "Locations",
    "LastLocation",
    "lastLocation",
    "CurrentLocation",
    "currentLocation",
    "DeviceLocation",
    "deviceLocation",
    "payload",
    "Payload",
    "response",
    "Response",
    "raw",
    "Raw",
    "sync",
    "Sync",
  ];

  for (const key of candidateKeys) {
    const candidate = getRecordValueCaseInsensitive(record, key);
    rows.push(...getGeoRowsFromUnknown(candidate, depth + 1, visited));
  }

  // Last safety net: SureMDM responses can be nested differently between versions.
  // Search any nested object, but only keep rows that actually contain coordinates.
  for (const nested of Object.values(record)) {
    if (nested && typeof nested === "object") {
      rows.push(...getGeoRowsFromUnknown(nested, depth + 1, visited));
    }
  }

  return uniqueGeoRows(rows);
}

function parseGeoNumber(value: string) {
  const parsed = Number.parseFloat(String(value || "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseLongitudeLatitude(row: GeolocationApiRow | undefined) {
  const combined = getGeoField(row, [
    "LongitudeLatitude",
    "longitudeLatitude",
    "LongLat",
    "longLat",
    "LatLong",
    "latLong",
    "LatLongString",
    "Coordinates",
    "coordinates",
  ]);
  if (!combined) return { latitude: "", longitude: "" };

  const parts = combined
    .split(/[\/,|]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (parts.length < 2) return { latitude: "", longitude: "" };

  const first = parseGeoNumber(parts[0]);
  const second = parseGeoNumber(parts[1]);

  if (first !== null && second !== null) {
    // Backend normalizes LongitudeLatitude as "longitude / latitude".
    // Some SureMDM payloads use "latitude, longitude", so detect obvious ranges too.
    if (Math.abs(first) <= 90 && Math.abs(second) > 90) {
      return { latitude: parts[0], longitude: parts[1] };
    }
    if (Math.abs(first) > 90 && Math.abs(second) <= 90) {
      return { longitude: parts[0], latitude: parts[1] };
    }
  }

  return { longitude: parts[0], latitude: parts[1] };
}

function getGeoLatitude(row: GeolocationApiRow | undefined) {
  return getGeoField(row, ["Latitude", "latitude", "Lat", "lat"]) || parseLongitudeLatitude(row).latitude;
}

function getGeoLongitude(row: GeolocationApiRow | undefined) {
  return getGeoField(row, ["Longitude", "longitude", "Lon", "Long", "lng"]) || parseLongitudeLatitude(row).longitude;
}

function getLatestGeoRow(rows: GeolocationApiRow[]) {
  return [...rows].sort((a, b) => {
    const timeA = Date.parse(getGeoField(a, ["Time", "DateTime", "LastUpdate"]));
    const timeB = Date.parse(getGeoField(b, ["Time", "DateTime", "LastUpdate"]));
    return (Number.isNaN(timeB) ? 0 : timeB) - (Number.isNaN(timeA) ? 0 : timeA);
  })[0];
}

function sortGeoRowsByTimeDesc(rows: GeolocationApiRow[]) {
  return [...rows].sort((a, b) => {
    const timeA = Date.parse(getGeoField(a, ["Time", "DateTime", "LastUpdate"]));
    const timeB = Date.parse(getGeoField(b, ["Time", "DateTime", "LastUpdate"]));
    return (Number.isNaN(timeB) ? 0 : timeB) - (Number.isNaN(timeA) ? 0 : timeA);
  });
}


type HardwareDropdownOption = {
  value: string;
  label: string;
};

function HardwareDropdown({
  label,
  value,
  options,
  onChange,
  disabled = false,
  placeholder = "Select option",
}: {
  label: string;
  value: string;
  options: HardwareDropdownOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!dropdownRef.current || !(target instanceof Node)) return;
      if (dropdownRef.current.contains(target)) return;
      setIsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (disabled) setIsOpen(false);
  }, [disabled]);

  return (
    <div ref={dropdownRef} className={`hardware-custom-select ${isOpen ? "is-open" : ""} ${disabled ? "is-disabled" : ""}`}>
      <button
        type="button"
        className="hardware-custom-select-trigger"
        onClick={() => !disabled && setIsOpen((current) => !current)}
        disabled={disabled}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{selectedOption?.label || placeholder}</span>
        <ChevronDown size={15} />
      </button>

      {isOpen && (
        <div className="hardware-custom-select-menu" role="listbox" aria-label={label}>
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                className={`hardware-custom-select-option ${isSelected ? "is-selected" : ""}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                <span>{option.label}</span>
                {isSelected && <span className="hardware-custom-select-check">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}


function DetailItem({ label, value, mono = false }: { label: string; value?: string | number; mono?: boolean }) {
  return (
    <div className="hardware-detail-item">
      <span>{label}</span>
      <strong className={mono ? "is-mono" : ""}>{value || "-"}</strong>
    </div>
  );
}

function DeviceDetailsDrawer({ device, isOpen, onClose }: { device: Device; isOpen: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");

  useEffect(() => {
    if (isOpen) setActiveTab("overview");
  }, [device.id, isOpen]);

  if (!isOpen) return null;

  const { platform, model } = splitPlatformModel(device.platformModel);
  const workgroup = getWorkgroup(device.groupPath);
  const storageUsage = getStorageUsage(device.storage);
  const detailTabs: Array<{ key: DetailTab; label: string }> = [
    { key: "overview", label: "Overview" },
    { key: "hardware", label: "Hardware" },
    { key: "network", label: "OS & Network" },
    { key: "user", label: "User" },
    { key: "storage", label: "Storage" },
    { key: "timeline", label: "Timeline" },
    { key: "raw", label: "Raw API" },
  ];

  return (
    <div className="hardware-detail-drawer-overlay hardware-detail-form-overlay">
      <aside className="hardware-detail-drawer hardware-detail-form-modal" onClick={(event) => event.stopPropagation()}>
        <div className="hardware-detail-drawer-header">
          <div className="hardware-detail-title-wrap">
            <div className="hardware-detail-device-icon">
              <Monitor size={22} />
            </div>
            <div>
              <div className="hardware-detail-eyebrow">Device Details</div>
              <h2>{device.name}</h2>
              <p>
                {device.os} • {device.ip} • {workgroup}
              </p>
            </div>
          </div>

          <div className="hardware-detail-header-actions">
            <span className={`hardware-detail-status ${getStatusClass(device.status)}`}>{device.status}</span>
            <button type="button" className="hardware-detail-close" onClick={onClose} aria-label="Close device detail form" title="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="hardware-detail-summary-grid">
          <div className="hardware-detail-summary-card">
            <span>Last Connected</span>
            <strong>{device.lastConnected}</strong>
          </div>
          <div className="hardware-detail-summary-card">
            <span>Agent</span>
            <strong>{device.objectAgent || "-"}</strong>
          </div>
          <div className="hardware-detail-summary-card">
            <span>Storage Usage</span>
            <strong>{storageUsage === null ? "-" : `${storageUsage}%`}</strong>
          </div>
          <div className="hardware-detail-summary-card">
            <span>Status</span>
            <strong>{device.status}</strong>
          </div>
        </div>

        <div className="hardware-detail-tabs">
          {detailTabs.map((tab) => (
            <button key={tab.key} type="button" className={activeTab === tab.key ? "is-active" : ""} onClick={() => setActiveTab(tab.key)}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="hardware-detail-body">
          {activeTab === "overview" && (
            <div className="hardware-detail-section-grid">
              <div className="hardware-detail-card">
                <h3>Device Identity</h3>
                <DetailItem label="Device Name" value={device.name} />
                <DetailItem label="Device ID" value={device.deviceIdentifier || device.id} mono />
                <DetailItem label="Agent" value={device.objectAgent || "-"} mono />
                <DetailItem label="Platform" value={platform} />
                <DetailItem label="Model" value={model} />
                <DetailItem label="Status" value={device.status} />
              </div>
              <div className="hardware-detail-card">
                <h3>Operational Context</h3>
                <DetailItem label="User" value={device.owner} />
                <DetailItem label="Department" value={device.department} />
                <DetailItem label="Group Path" value={device.groupPath} />
                <DetailItem label="Workgroup" value={workgroup} />
                <DetailItem label="Last Connected" value={device.lastConnected} />
                <DetailItem label="IP Address" value={device.ip} mono />
              </div>
            </div>
          )}

          {activeTab === "hardware" && (
            <div className="hardware-detail-section-grid">
              <div className="hardware-detail-card">
                <h3>Hardware Profile</h3>
                <DetailItem label="Platform" value={platform} />
                <DetailItem label="Model" value={model} />
                <DetailItem label="Processor" value={device.processor} />
                <DetailItem label="Memory" value={device.memory} />
                <DetailItem label="Storage" value={device.storage} />
                <DetailItem label="Last Update" value={device.lastUpdate} />
              </div>
              <div className="hardware-detail-card">
                <h3>Asset Reference</h3>
                <DetailItem label="Asset ID" value={device.assetId || "-"} mono />
                <DetailItem label="Device Identifier" value={device.deviceIdentifier || "-"} mono />
                <DetailItem label="Agent" value={device.objectAgent || "-"} mono />
                <DetailItem label="Device Group" value={workgroup} />
                <DetailItem label="Group Path" value={device.groupPath} />
              </div>
            </div>
          )}

          {activeTab === "network" && (
            <div className="hardware-detail-section-grid">
              <div className="hardware-detail-card">
                <h3>Operating System</h3>
                <DetailItem label="OS" value={device.os} />
                <DetailItem label="Platform" value={platform} />
                <DetailItem label="Model" value={model} />
                <DetailItem label="Connection Status" value={device.status} />
              </div>
              <div className="hardware-detail-card">
                <h3>Network</h3>
                <DetailItem label="IP Address" value={device.ip} mono />
                <DetailItem label="Workgroup" value={workgroup} />
                <DetailItem label="Last Connected" value={device.lastConnected} />
              </div>
            </div>
          )}

          {activeTab === "user" && (
            <div className="hardware-detail-section-grid">
              <div className="hardware-detail-card">
                <h3>User Ownership</h3>
                <DetailItem label="Username" value={device.owner} />
                <DetailItem label="Department" value={device.department} />
              </div>
              <div className="hardware-detail-card">
                <h3>Access Context</h3>
                <DetailItem label="Lock State" value={device.status === "Locked" ? "Locked" : "-"} />
                <DetailItem label="Remote Access" value="Managed by agent" />
                <DetailItem label="Message Delivery" value="Available" />
                <DetailItem label="Geo Tracking" value={device.latitude !== "-" && device.longitude !== "-" ? "Available" : "No coordinate"} />
                <DetailItem label="Last Action" value="-" />
              </div>
            </div>
          )}

          {activeTab === "storage" && (
            <div className="hardware-detail-section-grid">
              <div className="hardware-detail-card hardware-detail-card-wide">
                <h3>Storage Utilisation</h3>
                <div className="hardware-storage-hero">
                  <div>
                    <span>Primary Storage</span>
                    <strong>{device.storage}</strong>
                  </div>
                  <div className="hardware-storage-percent">{storageUsage === null ? "-" : `${storageUsage}%`}</div>
                </div>
                {storageUsage !== null && (
                  <div className="hardware-storage-bar">
                    <div style={{ width: `${storageUsage}%` }} />
                  </div>
                )}
                <div className="hardware-storage-grid">
                  <DetailItem label="Storage" value={device.storage} />
                  <DetailItem label="Storage Usage" value={storageUsage === null ? "-" : `${storageUsage}%`} />
                </div>
              </div>
            </div>
          )}

          {activeTab === "timeline" && (
            <div className="hardware-detail-timeline">
              <div className="hardware-timeline-item is-current">
                <span />
                <div>
                  <strong>Last connected</strong>
                  <p>{device.lastConnected}</p>
                  <small>From API data</small>
                </div>
              </div>
              <div className="hardware-timeline-item">
                <span />
                <div>
                  <strong>Last update</strong>
                  <p>{device.lastUpdate}</p>
                  <small>From API data</small>
                </div>
              </div>
              <div className="hardware-timeline-item">
                <span />
                <div>
                  <strong>Current status</strong>
                  <p>{device.status}</p>
                  <small>From API data</small>
                </div>
              </div>
            </div>
          )}

          {activeTab === "raw" && (
            <div className="hardware-detail-card hardware-detail-card-wide">
              <h3>Raw Device Payload</h3>
              <pre className="hardware-raw-json">{JSON.stringify({ device, apiPayload: device.rawApi }, null, 2)}</pre>
            </div>
          )}
        </div>

        <div className="hardware-detail-form-footer">
          <button type="button" className="hardware-btn link" onClick={onClose}>
            Close
          </button>
          <button type="button" className="hardware-btn primary" onClick={onClose}>
            Done
          </button>
        </div>
      </aside>
    </div>
  );
}

function FolderTree({
  node,
  depth,
  selectedKey,
  expandedKeys,
  folderMenuKey,
  search,
  countForNode,
  onSelect,
  onToggle,
  onMenu,
  onAdd,
  onRename,
  onDelete,
}: {
  node: TreeNode;
  depth: number;
  selectedKey: string;
  expandedKeys: Record<string, boolean>;
  folderMenuKey: string | null;
  search: string;
  countForNode: (key: string) => number;
  onSelect: (key: string) => void;
  onToggle: (key: string) => void;
  onMenu: (key: string | null) => void;
  onAdd: (key?: string) => void;
  onRename: (node: TreeNode) => void;
  onDelete: (node: TreeNode) => void;
}) {
  if (!treeMatchesSearch(node, search.trim().toLowerCase())) return null;

  const hasChildren = Boolean(node.children?.length);
  const isExpanded = expandedKeys[node.key] ?? false;
  const isSelected = selectedKey === node.key;

  return (
    <div className="hardware-tree-branch ema-sidebar-tree-branch">
      <div
        className={`hardware-tree-node ema-sidebar-tree-node ${isSelected ? "is-selected is-active" : ""}`}
        style={{ paddingLeft: `${Math.max(0, depth) * 12 + 8}px` }}
      >
        <button type="button" className="hardware-tree-node-chevron ema-sidebar-tree-toggle" onClick={() => hasChildren && onToggle(node.key)}>
          {hasChildren ? isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} /> : <span />}
        </button>

        <button type="button" className="hardware-tree-node-main ema-sidebar-tree-main" onClick={() => onSelect(node.key)}>
          <span className="hardware-tree-node-icon ema-sidebar-tree-icon">
            {hasChildren && isExpanded ? <FolderOpen size={15} /> : <Folder size={15} />}
          </span>
          <span className="hardware-tree-node-label ema-sidebar-tree-label">{node.label}</span>
        </button>

        <span className="hardware-tree-node-count ema-sidebar-tree-count">{countForNode(node.key)}</span>

        {node.key !== "organization" && (
          <div className="hardware-tree-menu-wrap ema-sidebar-tree-menu-wrap">
            <button
              type="button"
              className="hardware-tree-menu-btn ema-sidebar-tree-menu-btn"
              onClick={(event) => {
                event.stopPropagation();
                onMenu(folderMenuKey === node.key ? null : node.key);
              }}
            >
              <MoreVertical size={14} />
            </button>

            {folderMenuKey === node.key && (
              <div className="hardware-tree-menu ema-sidebar-tree-menu">
                <button type="button" onClick={() => onAdd(node.key)}>
                  Add subfolder
                </button>
                <button type="button" onClick={() => onRename(node)}>
                  Rename folder
                </button>
                <button type="button" className="danger" onClick={() => onDelete(node)}>
                  Delete folder
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className="hardware-tree-children ema-sidebar-tree-children">
          {node.children!.map((child) => (
            <FolderTree
              key={child.key}
              node={child}
              depth={depth + 1}
              selectedKey={selectedKey}
              expandedKeys={expandedKeys}
              folderMenuKey={folderMenuKey}
              search={search}
              countForNode={countForNode}
              onSelect={onSelect}
              onToggle={onToggle}
              onMenu={onMenu}
              onAdd={onAdd}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function HardwareInventory() {
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>(initialTreeData);
  const [apiDevices, setApiDevices] = useState<Device[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [activeTab, setActiveTab] = useState<"organization" | "statistics">("organization");
  const [selectedFolderKey, setSelectedFolderKey] = useState("organization");
  const [selectedDeviceId, setSelectedDeviceId] = useState("NO-DEVICE");
  const [detailDeviceId, setDetailDeviceId] = useState("NO-DEVICE");
  const [showDeviceDetails, setShowDeviceDetails] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});
  const [folderMenuKey, setFolderMenuKey] = useState<string | null>(null);
  const [searchHierarchy, setSearchHierarchy] = useState("");
  const [searchDevices, setSearchDevices] = useState("");
  const [tableFilters, setTableFilters] = useState<TableFilters>(TABLE_FILTER_DEFAULTS);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: "name", direction: "asc" });
  const [page, setPage] = useState(1);
  const [activeKpiFilter, setActiveKpiFilter] = useState<KpiFilter>("all");
  const [departmentOptions, setDepartmentOptions] = useState<DepartmentPath[]>([]);
  const [moveTargetKey, setMoveTargetKey] = useState("");
  const [moveLoading, setMoveLoading] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [folderModalMode, setFolderModalMode] = useState<"main" | "sub">("main");
  const [folderModalParentKey, setFolderModalParentKey] = useState("organization");
  const [folderNameInput, setFolderNameInput] = useState("");
  const [folderNameError, setFolderNameError] = useState("");
  const [folderCreateLoading, setFolderCreateLoading] = useState(false);
  const [folderActionNode, setFolderActionNode] = useState<TreeNode | null>(null);
  const [folderActionInput, setFolderActionInput] = useState("");
  const [folderActionError, setFolderActionError] = useState("");
  const [folderActionLoading, setFolderActionLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [sessionType, setSessionType] = useState<SessionType>("full");
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [notifyUser, setNotifyUser] = useState(true);
  const [recordSession, setRecordSession] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState(false);
  const [forceRead, setForceRead] = useState(false);
  const [messageSubject, setMessageSubject] = useState("System Maintenance Notice");
  const [messageBody, setMessageBody] = useState("Please keep your device online for scheduled maintenance.");
  const [messageLoading, setMessageLoading] = useState(false);
  const [messageError, setMessageError] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoHistory, setGeoHistory] = useState<GeolocationApiRow[]>([]);
  const [geoStatus, setGeoStatus] = useState("Loading saved location...");
  const [geoApiRuntime, setGeoApiRuntime] = useState<GeoApiRuntime | null>(null);
  const [geoHistoryPage, setGeoHistoryPage] = useState(1);
  const [lockReason, setLockReason] = useState("");
  const [lockDuration, setLockDuration] = useState("24 Hours");
  const [lockActionLoading, setLockActionLoading] = useState(false);
  const [note, setNote] = useState("Device action ready.");
  const hardwareQuickPanelRef = useRef<HTMLDivElement | null>(null);

  const statisticTree = useMemo(() => generateStatisticTree(), []);
  const [expandedStatisticGroups, setExpandedStatisticGroups] = useState<Record<string, boolean>>({
    "connection-statistics": false,
    "hardware-management": false,
    "hardware-statistics": false,
    reports: false,
  });
  const [selectedStatistic, setSelectedStatistic] = useState<string>("conn-summary");
  const [statisticLoading, setStatisticLoading] = useState(false);
  const [statisticError, setStatisticError] = useState("");
  const [statisticApiData, setStatisticApiData] = useState<StatisticApiState | null>(null);
  const [hardwareScanLoading, setHardwareScanLoading] = useState(false);

  const showToast = useCallback((type: ToastType, title: string, message: string) => {
    setToast({ type, title, message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);


  const loadHardwareInventory = useCallback(async () => {
    setInventoryLoading(true);
    setApiError("");

    try {
      const departmentsResponse = await apiRequest<ApiDepartment[]>("/api/departments");
      const departmentTree = mapDepartmentTree(departmentsResponse.data || []);
      const departmentPaths = collectDepartmentPaths(departmentTree);

      setDepartmentOptions(departmentPaths);
      setTreeNodes(departmentTree);

      const assetResults = await Promise.allSettled(
        departmentPaths.map(async (department) => {
          const response = await apiRequest<ApiAsset[]>(`/api/assets/${department.relationID}`);
          return (response.data || []).map((asset) => mapApiAssetToDevice(asset, department));
        })
      );

      const nextDevices = assetResults
        .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
        .map(applyPersistentLockState)
        .sort((a, b) => a.name.localeCompare(b.name));

      setApiDevices(nextDevices);
      setSelectedDeviceId((current) => (nextDevices.some((device) => device.id === current) ? current : "NO-DEVICE"));
      setShowDeviceDetails(false);
      setDetailDeviceId("NO-DEVICE");
      setActiveModal(null);
      setNote(`Loaded ${nextDevices.length} devices from EMA API. Select a device row to enable endpoint actions.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load hardware inventory.";
      setApiError(message);
      setApiDevices([]);
      setNote(`API load failed. ${message}`);
      showToast("error", "Hardware inventory failed", message);
    } finally {
      setInventoryLoading(false);
    }
  }, [showToast]);

  const loadDeviceDetails = useCallback(async (device: Device) => {
    if (!device.assetId || !device.objectAgent) return;

    try {
      setNote(`Loading live details for ${device.name}...`);
      const response = await apiRequest<unknown>(`/api/asset/${device.objectAgent}/${device.assetId}`);
      const enrichedDevice = enrichDeviceWithDetails(device, response.data);
      setApiDevices((current) => current.map((item) => (item.id === device.id ? enrichedDevice : item)));
      setNote(`${device.name} live details loaded.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load device details.";
      setNote(`${device.name} selected. Detail API failed: ${message}`);
    }
  }, []);

  useEffect(() => {
    void loadHardwareInventory();
  }, [loadHardwareInventory]);

  const allTreeNodes = useMemo(() => flattenTree(treeNodes), [treeNodes]);
  const descendantMap = useMemo(() => {
    const map = new Map<string, string[]>();
    allTreeNodes.forEach((node) => map.set(node.key, getDescendantKeys(node)));
    return map;
  }, [allTreeNodes]);

  const selectedFolderDescendants = useMemo(() => descendantMap.get(selectedFolderKey) ?? [selectedFolderKey], [descendantMap, selectedFolderKey]);
  const selectedFolderLabel = allTreeNodes.find((node) => node.key === selectedFolderKey)?.label ?? "Organization";
  const folderModalParentLabel = allTreeNodes.find((node) => node.key === folderModalParentKey)?.label ?? "Organization";
  const allDevices = apiDevices;

  const baseDevices = useMemo(() => {
    const keyword = searchDevices.trim().toLowerCase();
    return allDevices.filter((device) => {
      const inFolder = device.pathKeys.some((item) => selectedFolderDescendants.includes(item));
      const inSearch =
        !keyword ||
        device.name.toLowerCase().includes(keyword) ||
        device.ip.toLowerCase().includes(keyword) ||
        device.owner.toLowerCase().includes(keyword) ||
        device.department.toLowerCase().includes(keyword) ||
        device.id.toLowerCase().includes(keyword) ||
        String(device.deviceIdentifier || "").toLowerCase().includes(keyword);
      return inFolder && inSearch;
    });
  }, [allDevices, searchDevices, selectedFolderDescendants]);

  const kpiFilteredDevices = useMemo(() => {
    switch (activeKpiFilter) {
      case "recent":
        return baseDevices.filter(isRecentlyConnected);
      case "stale":
        return baseDevices.filter(isStaleSyncDevice);
      case "locked":
        return baseDevices.filter((device) => device.status === "Locked");
      case "running":
        return baseDevices.filter(isRunningJobDevice);
      default:
        return baseDevices;
    }
  }, [activeKpiFilter, baseDevices]);

  const tableFilterOptions = useMemo(
    () => ({
      statuses: getUniqueOptions(kpiFilteredDevices.map((device) => device.status)),
      platforms: getUniqueOptions(kpiFilteredDevices.map((device) => device.os)),
    }),
    [kpiFilteredDevices]
  );

  const tableFilteredDevices = useMemo(() => {
    return kpiFilteredDevices.filter((device) => {
      const statusMatches = tableFilters.status === "all" || device.status === tableFilters.status;
      const platformMatches = tableFilters.platform === "all" || device.os === tableFilters.platform;
      return statusMatches && platformMatches;
    });
  }, [kpiFilteredDevices, tableFilters]);

  const filteredDevices = useMemo(() => {
    const multiplier = sortConfig.direction === "asc" ? 1 : -1;
    return [...tableFilteredDevices].sort((a, b) => compareSortValues(getSortValue(a, sortConfig.key), getSortValue(b, sortConfig.key)) * multiplier);
  }, [sortConfig, tableFilteredDevices]);

  const activeTableFilterCount = [tableFilters.status, tableFilters.platform].filter((value) => value !== "all").length;
  const pageCount = Math.max(1, Math.ceil(filteredDevices.length / PAGE_SIZE));
  const pagedDevices = useMemo(() => filteredDevices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filteredDevices, page]);
  const selectedDevice = allDevices.find((device) => device.id === selectedDeviceId) ?? emptyDevice;
  const detailDevice = allDevices.find((device) => device.id === detailDeviceId) ?? selectedDevice;
  const hasSelectedDevice = selectedDevice.id !== "NO-DEVICE";
  const hasDetailDevice = showDeviceDetails && detailDevice.id !== "NO-DEVICE";

  useEffect(() => {
    if (!hasSelectedDevice || showDeviceDetails || activeModal) return;

    const handleOutsidePointerDown = (event: PointerEvent) => {
      const panel = hardwareQuickPanelRef.current;
      const target = event.target;

      if (!panel || !(target instanceof Node)) return;
      if (panel.contains(target)) return;

      setSelectedDeviceId("NO-DEVICE");
      setNote("Advanced action panel closed.");
    };

    document.addEventListener("pointerdown", handleOutsidePointerDown);
    return () => document.removeEventListener("pointerdown", handleOutsidePointerDown);
  }, [activeModal, hasSelectedDevice, showDeviceDetails]);

  const totalVisible = filteredDevices.length;
  const totalAvailable = baseDevices.length;
  const recentCount = baseDevices.filter(isRecentlyConnected).length;
  const staleCount = baseDevices.filter(isStaleSyncDevice).length;
  const lockedCount = baseDevices.filter((device) => device.status === "Locked").length;
  const offlineCount = baseDevices.filter((device) => device.status === "Offline").length;
  const onlineDeviceCount = baseDevices.filter(isRunningJobDevice).length;
  const activeKpiLabel = getKpiFilterLabel(activeKpiFilter);

  useEffect(() => {
    if (page > pageCount) setPage(1);
  }, [page, pageCount]);

  const countForNode = (key: string) => {
    const descendants = descendantMap.get(key) ?? [key];
    return allDevices.filter((device) => device.pathKeys.some((item) => descendants.includes(item))).length;
  };

  const closeModal = () => {
    setActiveModal(null);
    setFolderMenuKey(null);
    setFolderNameError("");
    setFolderActionError("");
    setMessageError("");
    setGeoHistoryPage(1);
  };

  const handleFolderToggle = (key: string) => {
    setExpandedKeys((current) => ({ ...current, [key]: !current[key] }));
  };

  const handleFolderSelect = (key: string) => {
    setSelectedFolderKey(key);
    setActiveKpiFilter("all");
    setPage(1);
    setFolderMenuKey(null);
    setNote(`Hierarchy filtered by ${allTreeNodes.find((node) => node.key === key)?.label ?? key}. Device panel remains open until closed.`);
  };

  const handleAddFolder = (parentKey?: string) => {
    const isSubfolder = Boolean(parentKey && parentKey !== "organization");
    setFolderModalMode(isSubfolder ? "sub" : "main");
    setFolderModalParentKey(isSubfolder && parentKey ? parentKey : "organization");
    setFolderNameInput("");
    setFolderNameError("");
    setFolderMenuKey(null);
    setActiveModal("addFolder");
  };

  const handleCreateFolderSubmit = async () => {
    const cleanName = folderNameInput.trim();
    if (!cleanName) {
      setFolderNameError("Folder name is required.");
      return;
    }

    const parentID = folderModalMode === "main" ? -1 : Number.isFinite(Number(folderModalParentKey)) ? Number(folderModalParentKey) : -1;
    setFolderCreateLoading(true);
    setFolderNameError("");

    try {
      const response = await apiRequest<ApiDepartment>("/api/departments", {
        method: "POST",
        body: JSON.stringify({ name: cleanName, parentID }),
      });
      const newRelationID = response.data?.Object_Rel_Idn;
      closeModal();
      setFolderNameInput("");
      await loadHardwareInventory();
      setExpandedKeys((current) => ({
        ...current,
        organization: true,
        ...(folderModalMode === "sub" ? { [folderModalParentKey]: true } : {}),
        ...(newRelationID ? { [String(newRelationID)]: true } : {}),
      }));
      if (newRelationID) setSelectedFolderKey(String(newRelationID));
      setPage(1);
      showToast("success", folderModalMode === "main" ? "Main folder created" : "Subfolder created", `${cleanName} has been created successfully.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create folder.";
      setFolderNameError(message);
      showToast("error", "Create folder failed", message);
    } finally {
      setFolderCreateLoading(false);
    }
  };

  const handleRenameFolder = (node: TreeNode) => {
    if (node.key === "organization") return;
    setFolderActionNode(node);
    setFolderActionInput(node.label);
    setFolderActionError("");
    setFolderMenuKey(null);
    setActiveModal("renameFolder");
  };

  const handleRenameFolderSubmit = async () => {
    const node = folderActionNode;
    const cleanName = folderActionInput.trim();
    if (!node || node.key === "organization") return;
    if (!cleanName) {
      setFolderActionError("Folder name is required.");
      return;
    }

    setFolderActionLoading(true);
    setFolderActionError("");

    try {
      await apiRequest<ApiDepartment>(`/api/departments/${node.key}`, {
        method: "PUT",
        body: JSON.stringify({ name: cleanName }),
      });
      closeModal();
      setFolderActionNode(null);
      setFolderActionInput("");
      await loadHardwareInventory();
      setSelectedFolderKey(node.key);
      showToast("success", "Folder renamed", `${node.label} has been renamed to ${cleanName}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to rename folder.";
      setFolderActionError(message);
      showToast("error", "Rename failed", message);
    } finally {
      setFolderActionLoading(false);
    }
  };

  const handleDeleteFolder = (node: TreeNode) => {
    if (node.key === "organization") return;
    setFolderActionNode(node);
    setFolderActionInput(node.label);
    setFolderActionError("");
    setFolderMenuKey(null);
    setActiveModal("deleteFolder");
  };

  const handleDeleteFolderSubmit = async () => {
    const node = folderActionNode;
    if (!node || node.key === "organization") return;

    setFolderActionLoading(true);
    setFolderActionError("");

    try {
      await apiRequest<{ Object_Rel_Idn: number }>(`/api/departments/${node.key}`, { method: "DELETE" });
      closeModal();
      setFolderActionNode(null);
      await loadHardwareInventory();
      if (selectedFolderKey === node.key || (descendantMap.get(node.key) ?? []).includes(selectedFolderKey)) setSelectedFolderKey("organization");
      setPage(1);
      showToast("success", "Folder deleted", `${node.label} has been deleted successfully.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete folder.";
      setFolderActionError(message);
      showToast("error", "Delete failed", message);
    } finally {
      setFolderActionLoading(false);
    }
  };

  const handleDeviceRowSelect = (device: Device) => {
    setSelectedDeviceId(device.id);
    setShowDeviceDetails(false);
    setDetailDeviceId("NO-DEVICE");
    setGeoHistory([]);
    setGeoStatus("Ready to track");
    setGeoApiRuntime(null);
    setMessageError("");
    setNote(`${device.name} selected from device registry. Advanced action panel is ready.`);
    void loadDeviceDetails(device);
  };

  const handleDeviceNameClick = (event: MouseEvent<HTMLButtonElement>, device: Device) => {
    event.preventDefault();
    event.stopPropagation();
    setDetailDeviceId(device.id);
    setShowDeviceDetails(true);
    setActiveModal(null);
    setGeoHistory([]);
    setGeoStatus("Ready to track");
    setGeoApiRuntime(null);
    setMessageError("");
    setNote(`Opening hardware detail form for ${device.name}.`);
    void loadDeviceDetails(device);
  };

  const closeDeviceDetails = () => {
    setShowDeviceDetails(false);
    setDetailDeviceId("NO-DEVICE");
    setNote("Hardware detail form closed.");
  };

  const clearSelectedDevice = (nextNote?: string) => {
    setSelectedDeviceId("NO-DEVICE");
    setDetailDeviceId("NO-DEVICE");
    setShowDeviceDetails(false);
    setActiveModal(null);
    setGeoHistory([]);
    setGeoStatus("Ready to track");
    setGeoApiRuntime(null);
    setMessageError("");
    if (nextNote) setNote(nextNote);
  };

  const handleKpiFilterClick = (filter: KpiFilter) => {
    setActiveKpiFilter(filter);
    setPage(1);
    setNote(`Device registry filtered by ${getKpiFilterLabel(filter)}. Current device panel remains open until closed.`);
  };

  const handleTableFilterChange = (key: keyof TableFilters, value: string) => {
    setTableFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
    setNote("Device panel remains open until you close it.");
  };

  const clearTableFilters = () => {
    setTableFilters(TABLE_FILTER_DEFAULTS);
    setSearchDevices("");
    setPage(1);
    setNote("Device registry filters cleared. Device panel remains open until you close it.");
  };

  const handleSort = (key: SortKey) => {
    setSortConfig((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));
    setPage(1);
  };

  const renderSortIndicator = (key: SortKey) => {
    if (sortConfig.key !== key) return <span className="hardware-sort-icon">↕</span>;
    return <span className="hardware-sort-icon is-active">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>;
  };

  const getSelectedRelationID = useCallback(() => {
    if (selectedFolderKey === "organization") return -1;
    const relationID = Number(selectedFolderKey);
    return Number.isFinite(relationID) ? relationID : -1;
  }, [selectedFolderKey]);

  const loadSelectedStatisticData = useCallback(async () => {
    if (!selectedStatistic) {
      setStatisticApiData(null);
      return;
    }

    const relationID = getSelectedRelationID();
    const title = STATISTIC_TITLE_MAP[selectedStatistic] || selectedStatistic;
    const descriptionPrefix = selectedFolderLabel && selectedFolderLabel !== "Organization" ? `Live data for ${selectedFolderLabel}` : "Live data for all available departments";

    setStatisticLoading(true);
    setStatisticError("");

    try {
      let rows: HardwareApiRow[] = [];
      let description = descriptionPrefix;

      if (selectedStatistic === "conn-summary") {
        const response = await apiRequest<HardwareApiRow[]>(`/api/hardware-statistics/${relationID}/connection-summary`);
        rows = normalizeHardwareRows(response);
        description = "Connection period summary from backend API";
      } else if (selectedStatistic === "conn-list") {
        const response = await apiRequest<HardwareApiRow[]>(`/api/hardware-statistics/${relationID}/connection-list`);
        rows = normalizeHardwareRows(response);
        description = "Client connection list from backend API";
      } else if (selectedStatistic === "client-version") {
        const response = await apiRequest<HardwareApiRow[]>(`/api/hardware-statistics/${relationID}/client-version`);
        rows = normalizeHardwareRows(response);
        description = "Client version distribution from backend API";
      } else if (selectedStatistic === "changed-items") {
        const response = await apiRequest<HardwareApiRow[]>(`/api/hardware-management/${relationID}/changed-items`);
        rows = normalizeHardwareRows(response);
        description = "Changed hardware item statistics from backend API";
      } else if (selectedStatistic === "duplicated-ip") {
        const response = await apiRequest<HardwareApiRow[]>("/api/hardware-management/duplicate-ips");
        rows = normalizeHardwareRows(response);
        description = "Duplicated IP list from backend API";
      } else if (selectedStatistic.startsWith("stat-")) {
        const categoryKey = STATISTIC_CATEGORY_KEY_MAP[selectedStatistic];
        const response = await apiRequest<HardwareApiRow[]>(`/api/hardware-statistics/${relationID}/category/${categoryKey}`);
        rows = normalizeHardwareRows(response);
        description = `${title} distribution from backend API`;
      } else if (selectedStatistic === "report-inventory") {
        const response = await apiRequest<HardwareApiRow[]>(`/api/hardware-reports/${relationID}/client-list`);
        rows = normalizeHardwareRows(response);
        description = "Hardware inventory report list from backend API";
      } else if (selectedStatistic.startsWith("report-")) {
        const reportKey = REPORT_KEY_MAP[selectedStatistic];
        const response = await apiRequest<HardwareApiRow[]>(`/api/hardware-reports/${relationID}/${reportKey}`);
        rows = normalizeHardwareRows(response);
        description = `${title} generated from backend report API`;
      }

      setStatisticApiData({
        title,
        description,
        rows,
        columns: getColumnsFromHardwareRows(rows),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load hardware statistic data.";
      setStatisticApiData({ title, description: "No data loaded", rows: [], columns: [] });
      setStatisticError(message);
      showToast("error", "Hardware statistic failed", message);
    } finally {
      setStatisticLoading(false);
    }
  }, [getSelectedRelationID, selectedFolderLabel, selectedStatistic, showToast]);

  useEffect(() => {
    if (activeTab !== "statistics") return;
    void loadSelectedStatisticData();
  }, [activeTab, loadSelectedStatisticData]);

  const toggleStatisticGroup = (key: string) => {
    setExpandedStatisticGroups((current) => ({ ...current, [key]: !(current[key] ?? false) }));
  };

  const handleStatisticSelect = (node: StatisticNode) => {
    if (node.children?.length) {
      toggleStatisticGroup(node.id);
      return;
    }

    setSelectedStatistic(node.id);
    setStatisticApiData(null);
    setStatisticError("");
    setPage(1);
    setNote(`Loading ${node.name} statistic data.`);
  };

  const handleScanHardware = async (mode: HardwareScanMode) => {
    if (mode === "device") {
      if (!hasSelectedDevice || selectedDevice.id === "NO-DEVICE") {
        showToast("info", "Select a device first", "Select one EM/Windows device before creating a scan job.");
        return;
      }

      if (String(selectedDevice.objectAgent || "EM").toUpperCase() !== "EM") {
        showToast("error", "Scan unavailable", "Hardware inventory scan jobs can only be created for EM/Windows agent devices.");
        return;
      }
    }

    const relationID = getSelectedRelationID();

    if (mode === "folder" && relationID === -1) {
      showToast("info", "Select a folder first", "Choose a department/folder first, or use Scan All.");
      return;
    }

    const targetLabel =
      mode === "all"
        ? "all EM/Windows devices"
        : mode === "folder"
          ? `${selectedFolderLabel} and child folders`
          : selectedDevice.name;

    const confirmed = window.confirm(`Create a hardware inventory scan job for ${targetLabel}?`);
    if (!confirmed) return;

    setHardwareScanLoading(true);
    setNote(`Creating hardware inventory scan job for ${targetLabel}...`);

    try {
      const response = await apiRequest<HardwareScanResult>("/api/hardware-inventory/scan", {
        method: "POST",
        body: JSON.stringify({
          scanMode: mode,
          objectRelIdn: mode === "folder" ? relationID : undefined,
          relationID: mode === "folder" ? relationID : undefined,
          objectRootIdn: mode === "device" ? selectedDevice.assetId : undefined,
          objectDeviceID: mode === "device" ? selectedDevice.deviceIdentifier : undefined,
          deviceID: mode === "device" ? selectedDevice.deviceIdentifier : undefined,
          deviceName: mode === "device" ? selectedDevice.name : undefined,
          jobStyle: 1,
          jobPriority: 0,
          description:
            mode === "all"
              ? "Hardware inventory scan - all devices"
              : mode === "folder"
                ? `Hardware inventory scan - ${selectedFolderLabel}`
                : `Hardware inventory scan - ${selectedDevice.name}`,
        }),
      });

      const jobId = response.data?.Job_Idn ? ` Job ID: ${response.data.Job_Idn}.` : "";
      const targetCount = response.data?.targetCount ? ` Target: ${response.data.targetCount}.` : "";
      showToast("success", "Hardware scan queued", `${response.message || "Hardware inventory scan job created."}${jobId}${targetCount}`);
      setNote(`Hardware inventory scan queued.${jobId}${targetCount}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create hardware scan job.";
      showToast("error", "Hardware scan failed", message);
      setNote(`Hardware scan failed. ${message}`);
    } finally {
      setHardwareScanLoading(false);
    }
  };

  const handleRefresh = () => {
    setNote("Refreshing hardware inventory. Device panel remains open until closed.");
    void loadHardwareInventory();
  };

  const openMoveDepartmentModal = () => {
    if (!hasSelectedDevice) {
      showToast("info", "Select a device first", "Click a device row before running endpoint actions.");
      return;
    }

    const currentDepartment = departmentOptions.find((department) => department.key === selectedDevice.folderKey);
    setMoveTargetKey(currentDepartment?.key || departmentOptions[0]?.key || "");
    setActiveModal("move");
    setNote(`Choose a destination department for ${selectedDevice.name}.`);
  };

  const handleMoveDepartmentSubmit = async () => {
    const targetDepartment = departmentOptions.find((department) => department.key === moveTargetKey);
    if (!selectedDevice.assetId || !selectedDevice.objectAgent) {
      showToast("error", "Move failed", `${selectedDevice.name} has no API asset id.`);
      return;
    }
    if (!targetDepartment) {
      showToast("error", "Move failed", "Please select a destination department.");
      return;
    }
    if (targetDepartment.key === selectedDevice.folderKey) {
      showToast("info", "No change", `${selectedDevice.name} is already in ${targetDepartment.label}.`);
      setActiveModal(null);
      return;
    }

    setMoveLoading(true);

    try {
      await apiRequest(`/api/assets/${selectedDevice.objectAgent}/${selectedDevice.assetId}/department`, {
        method: "PUT",
        body: JSON.stringify({ relationID: targetDepartment.relationID }),
      });
      setApiDevices((current) =>
        current.map((device) =>
          device.id === selectedDevice.id
            ? {
                ...device,
                department: targetDepartment.label,
                folderKey: targetDepartment.key,
                pathKeys: targetDepartment.pathKeys,
                groupPath: targetDepartment.groupPath,
              }
            : device
        )
      );
      setSelectedFolderKey(targetDepartment.key);
      setExpandedKeys((current) => ({
        ...current,
        organization: true,
        ...Object.fromEntries(targetDepartment.pathKeys.map((key) => [key, true])),
      }));
      setPage(1);
      setNote(`${selectedDevice.name} moved to ${targetDepartment.groupPath}.`);
      showToast("success", "Device moved", `${selectedDevice.name} moved to ${targetDepartment.groupPath}.`);
      setActiveModal(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to move device.";
      showToast("error", "Move failed", message);
    } finally {
      setMoveLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!hasSelectedDevice) {
      showToast("info", "Select a device first", "Click a device row before sending a message.");
      return;
    }

    const cleanSubject = messageSubject.trim();
    const cleanBody = messageBody.trim();

    if (!cleanSubject || !cleanBody) {
      setMessageError("Message subject and body are required.");
      return;
    }

    if (broadcastMessage && !selectedDevice.os) {
      setMessageError("Platform type is required for broadcast message.");
      return;
    }

    setMessageLoading(true);
    setMessageError("");

    try {
      const endpoint = broadcastMessage ? "/api/mdm/text-message/platform" : "/api/mdm/text-message";
      const response = await apiRequest<SendMessageApiResult[]>(endpoint, {
        method: "POST",
        body: JSON.stringify(
          buildSelectedDeviceMdmPayload({
            Subject: cleanSubject,
            Body: cleanBody,
            ForceRead: forceRead,
            ReadNotification: true,
            PlatformType: selectedDevice.os,
            MDM_DeviceID: selectedDevice.objectAgent === "MDM" ? selectedDevice.deviceIdentifier : undefined,
          })
        ),
      });

      const rows = response.data || [];
      const successCount = response.summary?.SuccessCount ?? rows.filter((row) => normalizeApiMessage(row.message).toLowerCase() === "success").length;
      const total = response.summary?.total ?? (rows.length || 1);
      const apiMessage = normalizeApiMessage(response.message, "Success");
      const message = broadcastMessage
        ? `Broadcast message sent to ${successCount}/${total} ${selectedDevice.os || "platform"} device(s).`
        : `${selectedDevice.name} message job returned ${apiMessage}.`;

      setActiveModal(null);
      setNote(message);
      showToast("success", broadcastMessage ? "Broadcast sent" : "Message sent", message);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send message.";
      setMessageError(message);
      showToast("error", "Send message failed", message);
    } finally {
      setMessageLoading(false);
    }
  };

  const updateSelectedDeviceFromGeo = (row: GeolocationApiRow) => {
    const latitude = getGeoLatitude(row);
    const longitude = getGeoLongitude(row);
    const accuracy = getGeoField(row, ["LocationAccuracy", "Accuracy", "accuracy"]);
    const lastUpdateRaw = getGeoField(row, ["Time", "DateTime", "LastUpdate", "lastUpdate"]);
    const locationName = getGeoField(row, ["LocationName", "Address", "address"]);

    setApiDevices((current) =>
      current.map((device) =>
        device.id === selectedDevice.id
          ? {
              ...device,
              latitude: latitude || device.latitude,
              longitude: longitude || device.longitude,
              accuracy: accuracy || device.accuracy,
              lastUpdate: lastUpdateRaw ? formatGeoDate(lastUpdateRaw) : device.lastUpdate,
              rawApi: {
                ...(asRecord(device.rawApi) || {}),
                latestGeolocation: row,
                LocationName: locationName,
              },
            }
          : device
      )
    );
  };

  const getSelectedMdmDeviceID = () => {
    const rawApi = asRecord(selectedDevice.rawApi);
    const objectAgent = String(selectedDevice.objectAgent || "EM").toUpperCase();

    if (objectAgent === "MDM") {
      return selectedDevice.deviceIdentifier || findFirstDeepValue(rawApi, ["MDM_DeviceID", "DeviceID", "deviceID", "DeviceId", "Object_DeviceID"]);
    }

    return findFirstDeepValue(rawApi, ["MDM_DeviceID", "mdmDeviceID", "DeviceID", "deviceID", "DeviceId"]);
  };

  const buildGeolocationApiRequest = (sync: boolean, queryType: "Live" | "All" = "Live") => {
    const objectAgent = String(selectedDevice.objectAgent || "EM").toUpperCase();
    const endpoint = queryType === "Live" ? "/api/geolocation/live" : "/api/geolocation/history";
    const mdmDeviceID = getSelectedMdmDeviceID();
    const now = new Date();

    const payload = buildSelectedDeviceMdmPayload({
      QueryType: queryType,
      Sync: sync,
      Refresh: sync,
      DeviceName: selectedDevice.name,
      deviceName: selectedDevice.name,
      ComputerName: selectedDevice.name,
      MDM_DeviceID: mdmDeviceID || undefined,
      DeviceID: objectAgent === "MDM" ? mdmDeviceID || undefined : undefined,
      deviceID: objectAgent === "MDM" ? mdmDeviceID || undefined : undefined,
      ...(queryType === "All"
        ? {
            StartTime: `${now.getFullYear()}-01-01T00:00:00.000`,
            EndTime: now.toISOString().replace(/Z$/, "").slice(0, 23),
          }
        : {}),
    });

    return { endpoint, payload, objectAgent, mdmDeviceID };
  };

  const applyGeolocationResponse = (rows: GeolocationApiRow[], runtime: GeoApiRuntime) => {
    const orderedRows = sortGeoRowsByTimeDesc(uniqueGeoRows(rows));
    const coordinateRows = orderedRows.filter((row) => getGeoLatitude(row) && getGeoLongitude(row));
    const latestRow = getLatestGeoRow(coordinateRows) || getLatestGeoRow(orderedRows);

    setGeoHistory(orderedRows);
    setGeoHistoryPage(1);
    setGeoApiRuntime(runtime);

    if (!latestRow || !getGeoLatitude(latestRow) || !getGeoLongitude(latestRow)) {
      const message = orderedRows.length
        ? `Location records found for ${selectedDevice.name}, but no valid coordinate is available yet.`
        : `No saved location found for ${selectedDevice.name}.`;
      setGeoStatus(message);
      setNote(message);
      showToast("info", "No coordinate found", message);
      return;
    }

    updateSelectedDeviceFromGeo(latestRow);
    const latitude = getGeoLatitude(latestRow);
    const longitude = getGeoLongitude(latestRow);
    const message = runtime.sync
      ? `Current location updated for ${selectedDevice.name}.`
      : `Saved location loaded for ${selectedDevice.name}.`;
    setGeoStatus(message);
    setNote(`${message} ${latitude}, ${longitude}`);
    showToast(runtime.sync ? "success" : "info", "Location loaded", message);
  };

  const requestGeolocationRows = async (sync: boolean, queryType: "Live" | "All") => {
    const requestConfig = buildGeolocationApiRequest(sync, queryType);
    const response = await apiRequest<unknown>(requestConfig.endpoint, {
      method: "POST",
      body: JSON.stringify(requestConfig.payload),
    });

    const envelope = response as ApiEnvelope<unknown> & { sync?: unknown; status?: number };
    const rows = uniqueGeoRows([...getGeoRowsFromUnknown(envelope.data), ...getGeoRowsFromUnknown(envelope.sync)]);
    const coordinateRows = rows.filter((row) => getGeoLatitude(row) && getGeoLongitude(row));
    const latestRow = getLatestGeoRow(coordinateRows) || getLatestGeoRow(rows);
    const syncRecord = asRecord(envelope.sync);

    return {
      rows,
      totalRecords: envelope.totalRecords ?? rows.length,
      coordinateCount: coordinateRows.length,
      latestDeviceID: getGeoField(latestRow, ["DeviceID", "deviceID"]) || pickValue(syncRecord, ["DeviceID", "deviceID"]) || requestConfig.mdmDeviceID || "-",
      message: envelope.message || (sync ? "Location refresh completed." : "Saved location loaded."),
      requestConfig,
    };
  };

  const handleRefreshGeolocation = async (sync = true) => {
    if (!hasSelectedDevice) {
      showToast("info", "Select a device first", "Click a device row before tracking location.");
      return;
    }

    if (!selectedDevice.assetId && !selectedDevice.deviceIdentifier && !selectedDevice.name) {
      showToast("error", "Geolocation unavailable", `${selectedDevice.name} has no asset reference or device ID.`);
      return;
    }

    const liveRequest = buildGeolocationApiRequest(sync, "Live");
    setGeoLoading(true);
    setGeoStatus(sync ? "Refreshing current device location..." : "Loading saved device location...");
    setGeoApiRuntime({
      endpoint: liveRequest.endpoint,
      method: "POST",
      mode: "Live",
      sync,
      resolverKey: "device",
      resolverValue: selectedDevice.name,
      requestPayload: liveRequest.payload,
      responseTotal: 0,
      rowsWithCoordinates: 0,
      latestDeviceID: liveRequest.mdmDeviceID || "-",
      lastRun: new Date().toLocaleString("en-MY"),
      message: sync ? "Refreshing current device location" : "Loading saved location",
    });

    try {
      const liveResult = await requestGeolocationRows(sync, "Live");
      let combinedRows = liveResult.rows;
      let historyResult: Awaited<ReturnType<typeof requestGeolocationRows>> | null = null;

      try {
        historyResult = await requestGeolocationRows(false, "All");
        combinedRows = uniqueGeoRows([...liveResult.rows, ...historyResult.rows]);
      } catch {
        // Keep the live result. History is helpful for the list, but not required for the map.
      }

      const coordinateCount = combinedRows.filter((row) => getGeoLatitude(row) && getGeoLongitude(row)).length;
      applyGeolocationResponse(combinedRows, {
        endpoint: liveResult.requestConfig.endpoint,
        method: "POST",
        mode: "Live",
        sync,
        resolverKey: "device",
        resolverValue: selectedDevice.name,
        requestPayload: liveResult.requestConfig.payload,
        responseTotal: historyResult?.totalRecords ?? liveResult.totalRecords ?? combinedRows.length,
        rowsWithCoordinates: coordinateCount,
        latestDeviceID: liveResult.latestDeviceID || historyResult?.latestDeviceID || "-",
        lastRun: new Date().toLocaleString("en-MY"),
        message: liveResult.message,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load geolocation.";
      setGeoStatus(message);
      setGeoApiRuntime((current) =>
        current
          ? { ...current, error: message, message, lastRun: new Date().toLocaleString("en-MY") }
          : {
              endpoint: liveRequest.endpoint,
              method: "POST",
              mode: "Live",
              sync,
              resolverKey: "device",
              resolverValue: selectedDevice.name,
              requestPayload: liveRequest.payload,
              responseTotal: 0,
              rowsWithCoordinates: 0,
              latestDeviceID: liveRequest.mdmDeviceID || "-",
              lastRun: new Date().toLocaleString("en-MY"),
              message,
              error: message,
            }
      );
      showToast("error", "Geolocation failed", message);
    } finally {
      setGeoLoading(false);
    }
  };

  const openGeolocationModal = () => {
    setGeoHistoryPage(1);
    setGeoStatus("Loading saved location...");
    setActiveModal("geo");
    void handleRefreshGeolocation(false);
  };

  const updateSelectedDeviceStatus = (status: StatusType, meta: { reason?: string; duration?: string } = {}) => {
    persistDeviceLockState(selectedDevice, status, meta);

    setApiDevices((current) =>
      current.map((device) =>
        device.id === selectedDevice.id
          ? {
              ...device,
              status,
            }
          : device
      )
    );
  };

  const buildSelectedDeviceMdmPayload = (extra: Record<string, unknown> = {}) => {
    const objectAgent = String(selectedDevice.objectAgent || "EM").toUpperCase();
    const rawApi = asRecord(selectedDevice.rawApi);
    const deepMdmAssetId = findFirstDeepValue(rawApi, ["MDM_Asset_Idn", "mdmAssetIdn", "MDMAssetIdn"]);
    const deepMdmDeviceID = findFirstDeepValue(rawApi, ["MDM_DeviceID", "mdmDeviceID", "DeviceID", "deviceID", "DeviceId"]);
    const payload: Record<string, unknown> = {
      objectAgent,
      Object_Agent: objectAgent,
      assetId: selectedDevice.assetId,
      DeviceName: selectedDevice.name,
      deviceName: selectedDevice.name,
      ComputerName: selectedDevice.name,
      computerName: selectedDevice.name,
      PlatformType: selectedDevice.os,
      ...extra,
    };

    if (objectAgent === "EM") {
      payload.Object_Root_Idn = selectedDevice.assetId;
      payload.objectRootIdn = selectedDevice.assetId;
      if (selectedDevice.deviceIdentifier) payload.Object_DeviceID = selectedDevice.deviceIdentifier;
      if (deepMdmAssetId) payload.MDM_Asset_Idn = Number.isNaN(Number(deepMdmAssetId)) ? deepMdmAssetId : Number(deepMdmAssetId);
      if (deepMdmDeviceID) payload.MDM_DeviceID = deepMdmDeviceID;
    } else {
      payload.MDM_Asset_Idn = selectedDevice.assetId;
      payload.mdmAssetIdn = selectedDevice.assetId;
      const mdmDeviceID = selectedDevice.deviceIdentifier || deepMdmDeviceID;
      if (mdmDeviceID) {
        payload.DeviceID = mdmDeviceID;
        payload.deviceID = mdmDeviceID;
        payload.MDM_DeviceID = mdmDeviceID;
        payload.Object_DeviceID = mdmDeviceID;
      }
    }

    return payload;
  };

  const openRemoteLoadingTab = () => {
    const popup = window.open("about:blank", "_blank");

    if (popup) {
      try {
        popup.document.title = "Starting remote control";
        popup.document.body.innerHTML = `
          <div style="font-family: Inter, Segoe UI, Arial, sans-serif; padding: 32px; color: #102a5a;">
            <h2 style="margin: 0 0 8px; font-size: 18px;">Starting remote control session...</h2>
            <p style="margin: 0; color: #6079a6; font-size: 13px;">Please wait while EMA requests a temporary SureMDM remote support token.</p>
          </div>
        `;
      } catch {
        // Ignore browser restrictions on the temporary loading tab.
      }
    }

    return popup;
  };

  const handleStartRemoteControl = async () => {
    if (!hasSelectedDevice) {
      showToast("info", "Select a device first", "Click a device row before starting remote control.");
      return;
    }

    if (!selectedDevice.assetId || !selectedDevice.objectAgent) {
      showToast("error", "Remote control unavailable", `${selectedDevice.name} has no API asset id.`);
      return;
    }

    const showOnlyRemoteScreen = sessionType === "view";
    const popup = openRemoteLoadingTab();
    setRemoteLoading(true);

    try {
      const response = await apiRequest<RemoteControlApiResult[]>("/api/mdm/remote-control", {
        method: "POST",
        body: JSON.stringify(
          buildSelectedDeviceMdmPayload({
            ShowOnlyRemoteScreen: showOnlyRemoteScreen,
            ScrBgClr: "null",
            ScrImg: "null",
          })
        ),
      });

      const remoteUrl = response.data?.[0]?.url;

      if (!remoteUrl) {
        throw new Error("Remote control URL was not returned.");
      }

      if (popup && !popup.closed) {
        popup.location.href = remoteUrl;
      } else {
        window.open(remoteUrl, "_blank", "noopener,noreferrer");
      }

      const message = `Remote control session launched for ${selectedDevice.name}.`;
      setActiveModal(null);
      setNote(message);
      showToast("success", "Remote control started", message);
    } catch (error) {
      if (popup && !popup.closed) popup.close();
      const message = error instanceof Error ? error.message : "Failed to start remote control session.";
      showToast("error", "Remote control failed", message);
    } finally {
      setRemoteLoading(false);
    }
  };

  const handleLockUnlockDevice = async (action: "lock" | "unlock") => {
    if (!hasSelectedDevice) {
      showToast("info", "Select a device first", "Click a device row before running lock or unlock.");
      return;
    }

    if (!selectedDevice.assetId || !selectedDevice.objectAgent) {
      showToast("error", "Action unavailable", `${selectedDevice.name} has no API asset id.`);
      return;
    }

    const cleanReason = lockReason.trim();

    if (action === "lock" && !cleanReason) {
      showToast("error", "Lock reason required", "Please enter a reason before locking this device.");
      return;
    }

    setLockActionLoading(true);

    try {
      const response = await apiRequest<LockUnlockApiResult[]>("/api/mdm/lock-unlock", {
        method: "POST",
        body: JSON.stringify(
          buildSelectedDeviceMdmPayload({
            action,
            Message: cleanReason || undefined,
            Reason: cleanReason || undefined,
            Duration: action === "lock" ? lockDuration : undefined,
          })
        ),
      });

      const result = response.data?.[0];
      const nextStatus: StatusType = action === "lock" ? "Locked" : "Online";
      const title = action === "lock" ? "Device locked" : "Device unlocked";
      const message =
        action === "lock"
          ? `${selectedDevice.name} has been locked successfully.`
          : `${selectedDevice.name} has been unlocked successfully.`;

      updateSelectedDeviceStatus(nextStatus, { reason: cleanReason || undefined, duration: action === "lock" ? lockDuration : undefined });
      setSelectedDeviceId(selectedDevice.id);
      setActiveModal(null);
      setLockReason("");
      setNote(`${message}${result?.JobName ? ` Job: ${result.JobName}.` : ""}`);
      showToast("success", title, message);
    } catch (error) {
      const message = error instanceof Error ? error.message : `Failed to ${action} device.`;
      showToast("error", action === "lock" ? "Lock failed" : "Unlock failed", message);
    } finally {
      setLockActionLoading(false);
    }
  };

  const handleLockSubmit = () => {
    void handleLockUnlockDevice("lock");
  };

  const latestGeoRow = useMemo(() => getLatestGeoRow(geoHistory), [geoHistory]);

  const geoMeta = useMemo(() => {
    const latestLatitude = getGeoLatitude(latestGeoRow);
    const latestLongitude = getGeoLongitude(latestGeoRow);
    const latitude = Number.parseFloat(String(latestLatitude || selectedDevice.latitude || "").replace(",", "."));
    const longitude = Number.parseFloat(String(latestLongitude || selectedDevice.longitude || "").replace(",", "."));
    const hasLocation = Number.isFinite(latitude) && Number.isFinite(longitude);
    const delta = 0.01;
    return {
      latitude,
      longitude,
      hasLocation,
      mapEmbedUrl: hasLocation
        ? `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - delta}%2C${latitude - delta}%2C${longitude + delta}%2C${latitude + delta}&layer=mapnik&marker=${latitude}%2C${longitude}`
        : "",
      mapOpenUrl: hasLocation ? `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}` : "",
    };
  }, [latestGeoRow, selectedDevice.latitude, selectedDevice.longitude]);

  const geoLocationName = getGeoField(latestGeoRow, ["LocationName", "Address", "address"]) || "-";
  const geoLatestDeviceID = getGeoField(latestGeoRow, ["DeviceID", "deviceID"]) || geoApiRuntime?.latestDeviceID || getSelectedMdmDeviceID() || "-";
  const geoLatestTime = getGeoField(latestGeoRow, ["Time", "DateTime", "LastUpdate", "lastUpdate"]);
  const geoLatestAccuracy = getGeoField(latestGeoRow, ["LocationAccuracy", "Accuracy", "accuracy"]) || selectedDevice.accuracy || "-";
  const GEO_HISTORY_PAGE_SIZE = 10;
  const geoHistoryTotalPages = Math.max(1, Math.ceil(geoHistory.length / GEO_HISTORY_PAGE_SIZE));
  const geoHistoryCurrentPage = Math.min(geoHistoryPage, geoHistoryTotalPages);
  const geoHistoryStartIndex = (geoHistoryCurrentPage - 1) * GEO_HISTORY_PAGE_SIZE;
  const geoHistoryPageRows = geoHistory.slice(geoHistoryStartIndex, geoHistoryStartIndex + GEO_HISTORY_PAGE_SIZE);
  const geoHistoryRangeStart = geoHistory.length ? geoHistoryStartIndex + 1 : 0;
  const geoHistoryRangeEnd = Math.min(geoHistoryStartIndex + GEO_HISTORY_PAGE_SIZE, geoHistory.length);
  const geoHistoryPageNumbers = useMemo(() => {
    const pages = new Set<number>();
    [1, geoHistoryTotalPages, geoHistoryCurrentPage - 1, geoHistoryCurrentPage, geoHistoryCurrentPage + 1]
      .filter((pageNumber) => pageNumber >= 1 && pageNumber <= geoHistoryTotalPages)
      .forEach((pageNumber) => pages.add(pageNumber));
    return Array.from(pages).sort((a, b) => a - b);
  }, [geoHistoryCurrentPage, geoHistoryTotalPages]);

  const renderStatisticTreeNode = (node: StatisticNode, depth = 0) => {
    const hasChildren = Boolean(node.children?.length);
    const isExpanded = expandedStatisticGroups[node.id] ?? false;
    const isSelected = selectedStatistic === node.id;

    return (
    <div
      className={`hardware-command-console ${hasSelectedDevice && !showDeviceDetails ? "has-selected-device" : "no-selected-device"} ${
        activeTab === "statistics" ? "is-statistics-view" : "is-directory-view"
      }`}
    >
      <section className="hardware-command-hero">
        <div className="hardware-command-hero-copy">
          <span className="hardware-command-eyebrow">EMA Hardware Console</span>
          <h2>Device Command Center</h2>
          <p>
            Search, filter, organize and act on endpoint records from one focused command workspace.
          </p>
        </div>

        <div className="hardware-command-hero-actions">
          <div className="hardware-command-search">
            <Search size={16} />
            <input
              value={searchDevices}
              onChange={(event) => {
                setSearchDevices(event.target.value);
                setPage(1);
                setNote("Device panel remains open until you close it.");
              }}
              placeholder="Search device, IP, user, department..."
            />
            {searchDevices && (
              <button
                type="button"
                onClick={() => {
                  setSearchDevices("");
                  setPage(1);
                  setNote("Device panel remains open until you close it.");
                }}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button type="button" className="hardware-command-icon-btn" onClick={handleRefresh} title="Refresh inventory">
            <RefreshCw size={16} />
          </button>

          {activeTab === "organization" && (
            <button type="button" className="hardware-command-primary-btn" onClick={() => handleAddFolder()}>
              <FolderPlus size={16} />
              New Folder
            </button>
          )}
        </div>
      </section>

      <section className="hardware-command-strip">
        <div className="hardware-command-tabs">
          <button type="button" className={activeTab === "organization" ? "is-active" : ""} onClick={() => setActiveTab("organization")}>
            Organization
          </button>
          <button type="button" className={activeTab === "statistics" ? "is-active" : ""} onClick={() => setActiveTab("statistics")}>
            Statistics
          </button>
        </div>

        <div className="hardware-command-scope">
          <span>Current Scope</span>
          <strong>{selectedFolderLabel}</strong>
          <small>{getSelectedRelationID() === -1 ? "All departments" : `Relation ID: ${getSelectedRelationID()}`}</small>
        </div>

        {activeTab === "organization" ? (
          <div className="hardware-command-organization">
            <div className="hardware-command-mini-search">
              <Search size={15} />
              <input
                value={searchHierarchy}
                onChange={(event) => setSearchHierarchy(event.target.value)}
                placeholder="Search folder hierarchy..."
              />
            </div>

            <div className="hardware-command-folder-rail">
              {treeNodes.map((node) => (
                <FolderTree
                  key={node.key}
                  node={node}
                  depth={0}
                  selectedKey={selectedFolderKey}
                  expandedKeys={expandedKeys}
                  folderMenuKey={folderMenuKey}
                  search={searchHierarchy}
                  countForNode={countForNode}
                  onSelect={handleFolderSelect}
                  onToggle={handleFolderToggle}
                  onMenu={setFolderMenuKey}
                  onAdd={handleAddFolder}
                  onRename={handleRenameFolder}
                  onDelete={handleDeleteFolder}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="hardware-command-stat-nav">
            <div className="hardware-command-folder-rail">
              {statisticTree.map((node) => renderStatisticTreeNode(node))}
            </div>
          </div>
        )}
      </section>

      <main className="hardware-command-workbench">
        {activeTab === "statistics" ? (
          <div className="hardware-command-statistics">
            {renderStatisticsContent()}
          </div>
        ) : (
          <>
            <div className="hardware-command-workbench-head">
              <div>
                <span className="hardware-command-eyebrow">Endpoint Directory</span>
                <h3>Devices</h3>
                <p>
                  Showing {filteredDevices.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filteredDevices.length)} of {filteredDevices.length} devices
                  {activeTableFilterCount ? ` • ${activeTableFilterCount} filter active` : ""}
                  {searchDevices ? ` • Search: ${searchDevices}` : ""}
                  {inventoryLoading ? " • Loading live API data..." : ""}
                  {apiError ? ` • API notice: ${apiError}` : ""}
                </p>
              </div>

              <div className="hardware-command-filter-row">
                <div className="hardware-command-filter">
                  <label>Status</label>
                  <HardwareDropdown
                    label="Status filter"
                    value={tableFilters.status}
                    onChange={(value) => handleTableFilterChange("status", value)}
                    options={[
                      { value: "all", label: "All status" },
                      ...tableFilterOptions.statuses.map((status) => ({ value: status, label: status })),
                    ]}
                  />
                </div>

                <div className="hardware-command-filter">
                  <label>Platform</label>
                  <HardwareDropdown
                    label="Platform filter"
                    value={tableFilters.platform}
                    onChange={(value) => handleTableFilterChange("platform", value)}
                    options={[
                      { value: "all", label: "All platform" },
                      ...tableFilterOptions.platforms.map((platform) => ({ value: platform, label: platform })),
                    ]}
                  />
                </div>

                <button type="button" className="hardware-command-reset-btn" onClick={clearTableFilters} disabled={!searchDevices && activeTableFilterCount === 0}>
                  <X size={14} />
                  Reset
                </button>
              </div>
            </div>

            <div className="hardware-command-table-wrap">
              <table className="hardware-command-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>
                      <button type="button" className="hardware-sort-btn" onClick={() => handleSort("name")}>
                        Device {renderSortIndicator("name")}
                      </button>
                    </th>
                    <th>
                      <button type="button" className="hardware-sort-btn" onClick={() => handleSort("platformModel")}>
                        Platform / Model {renderSortIndicator("platformModel")}
                      </button>
                    </th>
                    <th>
                      <button type="button" className="hardware-sort-btn" onClick={() => handleSort("status")}>
                        Status {renderSortIndicator("status")}
                      </button>
                    </th>
                    <th>
                      <button type="button" className="hardware-sort-btn" onClick={() => handleSort("lastConnected")}>
                        Last Connected {renderSortIndicator("lastConnected")}
                      </button>
                    </th>
                    <th>
                      <button type="button" className="hardware-sort-btn" onClick={() => handleSort("groupPath")}>
                        Group {renderSortIndicator("groupPath")}
                      </button>
                    </th>
                    <th>
                      <button type="button" className="hardware-sort-btn" onClick={() => handleSort("deviceIdentifier")}>
                        Device ID {renderSortIndicator("deviceIdentifier")}
                      </button>
                    </th>
                    <th>
                      <button type="button" className="hardware-sort-btn" onClick={() => handleSort("ip")}>
                        IP {renderSortIndicator("ip")}
                      </button>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {pagedDevices.map((device, index) => (
                    <tr
                      key={device.id}
                      className={hasSelectedDevice && selectedDevice.id === device.id ? "is-selected" : ""}
                      onClick={() => handleDeviceRowSelect(device)}
                    >
                      <td>
                        <span className="hardware-command-row-no">{String((page - 1) * PAGE_SIZE + index + 1).padStart(2, "0")}</span>
                      </td>
                      <td>
                        <div className="hardware-command-device-cell">
                          <span className={`hardware-command-status-dot ${getStatusClass(device.status)}`} />
                          <div>
                            <button
                              type="button"
                              className="hardware-command-device-link"
                              onClick={(event) => handleDeviceNameClick(event, device)}
                              title={`Open full details for ${device.name}`}
                            >
                              {device.name}
                            </button>
                            <small>{device.owner} / {device.department}</small>
                          </div>
                        </div>
                      </td>
                      <td>{device.platformModel}</td>
                      <td>
                        <span className={`hardware-command-status-pill ${getStatusClass(device.status)}`}>{device.status}</span>
                      </td>
                      <td>{device.lastConnected}</td>
                      <td>{device.groupPath}</td>
                      <td>{device.deviceIdentifier ?? device.id}</td>
                      <td>{device.ip}</td>
                    </tr>
                  ))}

                  {pagedDevices.length === 0 && (
                    <tr>
                      <td colSpan={8}>
                        <div className="hardware-command-empty">
                          {inventoryLoading ? "Loading hardware inventory from API..." : "No device found for current filter/search."}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="hardware-command-pagination">
              <span>
                Page {page} of {pageCount}
              </span>
              <div>
                <button type="button" onClick={() => { setPage(1); setNote("Device panel remains open until you close it."); }} disabled={page === 1}>
                  <ChevronsLeft size={14} />
                </button>
                <button type="button" onClick={() => { setPage((current) => Math.max(1, current - 1)); setNote("Device panel remains open until you close it."); }} disabled={page === 1}>
                  <ChevronLeft size={14} />
                </button>
                <strong>{page}</strong>
                <button type="button" onClick={() => { setPage((current) => Math.min(pageCount, current + 1)); setNote("Device panel remains open until you close it."); }} disabled={page === pageCount}>
                  <ChevronRight size={14} />
                </button>
                <button type="button" onClick={() => { setPage(pageCount); setNote("Device panel remains open until you close it."); }} disabled={page === pageCount}>
                  <ChevronsRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      {hasSelectedDevice && !showDeviceDetails && (
        <aside ref={hardwareQuickPanelRef} className="hardware-command-inspector">
          <div className="hardware-command-inspector-head">
            <div className="hardware-command-inspector-icon">
              <Monitor size={20} />
            </div>

            <div>
              <span>Selected Device</span>
              <h3>{selectedDevice.name}</h3>
              <p>{selectedDevice.os} • {selectedDevice.ip}</p>
            </div>

            <button
              type="button"
              className="hardware-command-close-btn"
              onClick={() => clearSelectedDevice("Device actions panel closed.")}
              aria-label="Close device actions panel"
              title="Close panel"
            >
              <X size={18} />
            </button>
          </div>

          <div className="hardware-command-inspector-grid">
            <div>
              <span>Department</span>
              <strong>{selectedDevice.department}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{selectedDevice.status}</strong>
            </div>
          </div>

          <div className="hardware-command-note">
            <span>Operational Note</span>
            <p>{note}</p>
          </div>

          <div className="hardware-command-actions">
            <button type="button" className="hardware-command-action-item" onClick={() => setActiveModal("message")} disabled={messageLoading}>
              <Send size={16} />
              <div>
                <strong>Send Message</strong>
                <span>Direct message to device user</span>
              </div>
            </button>

            <button type="button" className="hardware-command-action-item" onClick={() => setActiveModal("remote")}>
              <Monitor size={16} />
              <div>
                <strong>Remote Control</strong>
                <span>Open managed support session</span>
              </div>
            </button>

            <button type="button" className="hardware-command-action-item" onClick={openGeolocationModal} disabled={geoLoading}>
              <MapPin size={16} />
              <div>
                <strong>Geolocation</strong>
                <span>Map and latest coordinates</span>
              </div>
            </button>

            {selectedDevice.status === "Locked" ? (
              <button type="button" className="hardware-command-action-item" onClick={() => void handleLockUnlockDevice("unlock")} disabled={lockActionLoading}>
                <Unlock size={16} />
                <div>
                  <strong>{lockActionLoading ? "Unlocking..." : "Unlock Device"}</strong>
                  <span>Release device lock state</span>
                </div>
              </button>
            ) : (
              <button type="button" className="hardware-command-action-item" onClick={() => setActiveModal("lock")} disabled={lockActionLoading}>
                <Lock size={16} />
                <div>
                  <strong>Lock Device</strong>
                  <span>Restrict user interaction</span>
                </div>
              </button>
            )}

            <button type="button" className="hardware-command-action-item" onClick={() => void handleScanHardware("device")} disabled={hardwareScanLoading || String(selectedDevice.objectAgent || "EM").toUpperCase() !== "EM"}>
              <RefreshCw size={16} />
              <div>
                <strong>{hardwareScanLoading ? "Queueing Scan..." : "Scan Hardware"}</strong>
                <span>Create inventory scan job</span>
              </div>
            </button>

            <button type="button" className="hardware-command-action-item" onClick={openMoveDepartmentModal}>
              <Database size={16} />
              <div>
                <strong>Move Department</strong>
                <span>Assign to another department</span>
              </div>
            </button>
          </div>
        </aside>
      )}

      <DeviceDetailsDrawer device={detailDevice} isOpen={hasDetailDevice} onClose={closeDeviceDetails} />

      {toast && (
        <div className={`hardware-toast hardware-toast-${toast.type}`} role="status">
          <div className="hardware-toast-icon">{toast.type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}</div>
          <div>
            <strong>{toast.title}</strong>
            <span>{toast.message}</span>
          </div>
          <button type="button" onClick={() => setToast(null)} aria-label="Close notification">
            <X size={15} />
          </button>
        </div>
      )}

      {activeModal === "addFolder" && (
        <div className="hardware-modal-overlay" onClick={closeModal}>
          <div className="hardware-modal hardware-folder-modal" onClick={(event) => event.stopPropagation()}>
            <div className="hardware-modal-header blue">
              <div className="hardware-modal-title">
                <FolderPlus size={20} />
                <div>
                  <strong>{folderModalMode === "main" ? "CREATE MAIN FOLDER" : "CREATE SUBFOLDER"}</strong>
                  <span>{folderModalMode === "main" ? "Create a new top-level folder." : `Parent folder: ${folderModalParentLabel}`}</span>
                </div>
              </div>
              <button type="button" className="hardware-modal-close inverse" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>
            <form
              className="hardware-modal-body"
              onSubmit={(event) => {
                event.preventDefault();
                void handleCreateFolderSubmit();
              }}
            >
              <div className="hardware-form-group">
                <label>Folder Name</label>
                <input autoFocus type="text" value={folderNameInput} disabled={folderCreateLoading} onChange={(event) => setFolderNameInput(event.target.value)} placeholder="Example: Finance, Servers, HQ Branch" />
                {folderNameError && <div className="hardware-form-error">{folderNameError}</div>}
              </div>
              <div className="hardware-preview-card">
                <span>Preview</span>
                <strong>{folderModalMode === "main" ? folderNameInput.trim() || "New Main Folder" : `${folderModalParentLabel} \\ ${folderNameInput.trim() || "New Subfolder"}`}</strong>
              </div>
              <div className="hardware-modal-footer embedded">
                <button type="button" className="hardware-btn link" onClick={closeModal} disabled={folderCreateLoading}>
                  Cancel
                </button>
                <button type="submit" className="hardware-btn primary" disabled={folderCreateLoading || !folderNameInput.trim()}>
                  {folderCreateLoading ? "Creating..." : "Create Folder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeModal === "renameFolder" && folderActionNode && (
        <div className="hardware-modal-overlay" onClick={closeModal}>
          <div className="hardware-modal hardware-folder-modal" onClick={(event) => event.stopPropagation()}>
            <div className="hardware-modal-header blue">
              <div className="hardware-modal-title">
                <Pencil size={20} />
                <div>
                  <strong>RENAME FOLDER</strong>
                  <span>Update department hierarchy label.</span>
                </div>
              </div>
              <button type="button" className="hardware-modal-close inverse" onClick={closeModal} disabled={folderActionLoading}>
                <X size={18} />
              </button>
            </div>
            <form
              className="hardware-modal-body"
              onSubmit={(event) => {
                event.preventDefault();
                void handleRenameFolderSubmit();
              }}
            >
              <div className="hardware-preview-card">
                <span>Current Folder</span>
                <strong>{folderActionNode.label}</strong>
              </div>
              <div className="hardware-form-group">
                <label>New Folder Name</label>
                <input autoFocus type="text" value={folderActionInput} disabled={folderActionLoading} onChange={(event) => setFolderActionInput(event.target.value)} />
                {folderActionError && <div className="hardware-form-error">{folderActionError}</div>}
              </div>
              <div className="hardware-modal-footer embedded">
                <button type="button" className="hardware-btn link" onClick={closeModal} disabled={folderActionLoading}>
                  Cancel
                </button>
                <button type="submit" className="hardware-btn primary" disabled={folderActionLoading || !folderActionInput.trim()}>
                  {folderActionLoading ? "Renaming..." : "Rename Folder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeModal === "deleteFolder" && folderActionNode && (
        <div className="hardware-modal-overlay" onClick={closeModal}>
          <div className="hardware-modal hardware-folder-modal" onClick={(event) => event.stopPropagation()}>
            <div className="hardware-modal-header red">
              <div className="hardware-modal-title">
                <Trash2 size={20} />
                <div>
                  <strong>DELETE FOLDER</strong>
                  <span>This will remove the folder from hierarchy.</span>
                </div>
              </div>
              <button type="button" className="hardware-modal-close inverse" onClick={closeModal} disabled={folderActionLoading}>
                <X size={18} />
              </button>
            </div>
            <div className="hardware-modal-body">
              <div className="hardware-info-banner red">
                <AlertCircle size={16} />
                <div>
                  <strong>{folderActionNode.label}</strong>
                  <span>Delete is only allowed when this folder has no child folders and no devices.</span>
                </div>
              </div>
              {folderActionError && <div className="hardware-form-error">{folderActionError}</div>}
              <div className="hardware-modal-footer embedded">
                <button type="button" className="hardware-btn link" onClick={closeModal} disabled={folderActionLoading}>
                  Cancel
                </button>
                <button type="button" className="hardware-btn danger" onClick={() => void handleDeleteFolderSubmit()} disabled={folderActionLoading}>
                  {folderActionLoading ? "Deleting..." : "Delete Folder"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {hasSelectedDevice && activeModal === "move" && (
        <div className="hardware-modal-overlay" onClick={closeModal}>
          <div className="hardware-modal hardware-modal-colored" onClick={(event) => event.stopPropagation()}>
            <div className="hardware-modal-header blue">
              <div className="hardware-modal-title">
                <Database size={20} />
                <div>
                  <strong>MOVE DEPARTMENT</strong>
                  <span>Move selected device to another organization folder</span>
                </div>
              </div>
              <button type="button" className="hardware-modal-close inverse" onClick={closeModal} disabled={moveLoading}>
                <X size={18} />
              </button>
            </div>
            <div className="hardware-modal-body">
              <div className="hardware-info-banner blue">
                <AlertCircle size={16} />
                <div>
                  <strong>{selectedDevice.name}</strong>
                  <span>Current department: {selectedDevice.groupPath || selectedDevice.department || "-"}</span>
                </div>
              </div>
              <div className="hardware-form-group">
                <label>Destination Department</label>
                <HardwareDropdown
                  label="Destination department"
                  value={moveTargetKey}
                  onChange={setMoveTargetKey}
                  disabled={moveLoading || departmentOptions.length === 0}
                  placeholder="No department available"
                  options={
                    departmentOptions.length === 0
                      ? [{ value: "", label: "No department available" }]
                      : departmentOptions.map((department) => ({ value: department.key, label: department.groupPath }))
                  }
                />
              </div>
              <div className="hardware-last-update-box">
                <span>Path Location</span>
                <strong>
                  Path :/{selectedDevice.objectAgent || "AGENT"}/{selectedDevice.assetId || "ASSET_ID"}/department
                </strong>
              </div>
            </div>
            <div className="hardware-modal-footer">
              <button type="button" className="hardware-btn link" onClick={closeModal}>
                Cancel
              </button>
              <button type="button" className="hardware-btn primary" onClick={handleMoveDepartmentSubmit} disabled={moveLoading || !moveTargetKey}>
                {moveLoading ? "Moving..." : "Move Device"}
              </button>
            </div>
          </div>
        </div>
      )}

      {hasSelectedDevice && activeModal === "message" && (
        <div className="hardware-modal-overlay" onClick={messageLoading ? undefined : closeModal}>
          <div className="hardware-modal hardware-modal-message" onClick={(event) => event.stopPropagation()}>
            <div className="hardware-modal-header blue">
              <div className="hardware-modal-title">
                <MessageSquare size={20} />
                <div>
                  <strong>SEND MESSAGE</strong>
                  <span>Target device: {selectedDevice.name}</span>
                </div>
              </div>
              <button type="button" className="hardware-modal-close inverse" onClick={closeModal} disabled={messageLoading}>
                <X size={18} />
              </button>
            </div>
            <div className="hardware-modal-body">
              <div className="hardware-device-target-card">
                <Monitor size={18} />
                <div>
                  <strong>{selectedDevice.name}</strong>
                  <span>
                    {selectedDevice.owner} • {selectedDevice.department} • {selectedDevice.ip}
                  </span>
                </div>
              </div>
              <label className="hardware-check">
                <input type="checkbox" checked={broadcastMessage} onChange={(event) => setBroadcastMessage(event.target.checked)} disabled={messageLoading} />
                <span>Broadcast Message</span>
              </label>
              {broadcastMessage && (
                <div className="hardware-info-banner yellow">
                  <AlertCircle size={16} />
                  <div>
                    <strong>Platform broadcast</strong>
                    <span>This will send the message to all SureMDM assets with platform type: {selectedDevice.os || "-"}.</span>
                  </div>
                </div>
              )}
              <div className="hardware-form-group">
                <label>Message Subject</label>
                <input type="text" value={messageSubject} onChange={(event) => setMessageSubject(event.target.value)} placeholder="Message subject" disabled={messageLoading} />
              </div>
              <div className="hardware-form-group">
                <label>Message Body</label>
                <textarea rows={6} value={messageBody} onChange={(event) => setMessageBody(event.target.value)} placeholder="Enter message for device user" disabled={messageLoading} />
              </div>
              <label className="hardware-check">
                <input type="checkbox" checked={forceRead} onChange={(event) => setForceRead(event.target.checked)} disabled={messageLoading} />
                <span>Force Read</span>
              </label>
              {messageError && <div className="hardware-form-error">{messageError}</div>}
            </div>
            <div className="hardware-modal-footer">
              <button type="button" className="hardware-btn link" onClick={closeModal} disabled={messageLoading}>
                Close
              </button>
              <button type="button" className="hardware-btn primary" onClick={() => void handleSendMessage()} disabled={messageLoading}>
                {messageLoading ? "Sending..." : "Send Message"}
              </button>
            </div>
          </div>
        </div>
      )}

      {hasSelectedDevice && activeModal === "remote" && (
        <div className="hardware-modal-overlay" onClick={remoteLoading ? undefined : closeModal}>
          <div className="hardware-modal hardware-modal-colored" onClick={(event) => event.stopPropagation()}>
            <div className="hardware-modal-header blue">
              <div className="hardware-modal-title">
                <Monitor size={20} />
                <div>
                  <strong>ADVANCED REMOTE CONTROL</strong>
                  <span>{selectedDevice.name}</span>
                </div>
              </div>
              <button type="button" className="hardware-modal-close inverse" onClick={closeModal} disabled={remoteLoading}>
                <X size={18} />
              </button>
            </div>
            <div className="hardware-modal-body">
              <div className="hardware-info-banner blue">
                <AlertCircle size={16} />
                <div>
                  <strong>SureMDM iframe remote support</strong>
                  <span>EMA will request a temporary AuthToken URL from the backend, then open the remote support session in a new tab.</span>
                </div>
              </div>

              <div className="hardware-modal-section-title">Remote Support Mode</div>
              <div className="hardware-session-grid">
                <button type="button" className={sessionType === "full" ? "is-active" : ""} onClick={() => setSessionType("full")} disabled={remoteLoading}>
                  <Monitor size={18} />
                  <span>Normal Session</span>
                </button>
                <button type="button" className={sessionType === "view" ? "is-active" : ""} onClick={() => setSessionType("view")} disabled={remoteLoading}>
                  <Monitor size={18} />
                  <span>Screen Only</span>
                </button>
              </div>
              <label className="hardware-option-card">
                <input type="checkbox" checked={notifyUser} onChange={(event) => setNotifyUser(event.target.checked)} disabled={remoteLoading} />
                <div>
                  <strong>Notify User</strong>
                  <span>Send notification to device user about remote session</span>
                </div>
              </label>
              <label className="hardware-option-card">
                <input type="checkbox" checked={recordSession} onChange={(event) => setRecordSession(event.target.checked)} disabled={remoteLoading} />
                <div>
                  <strong>Record Session</strong>
                  <span>Record the session for audit trail</span>
                </div>
              </label>
              <div className="hardware-info-banner blue">
                <AlertCircle size={16} />
                <div>
                  <strong>Session Information</strong>
                  <span>POST /api/mdm/remote-control • ShowOnlyRemoteScreen: {sessionType === "view" ? "true" : "false"}</span>
                </div>
              </div>
            </div>
            <div className="hardware-modal-footer">
              <button type="button" className="hardware-btn link" onClick={closeModal} disabled={remoteLoading}>
                Cancel
              </button>
              <button type="button" className="hardware-btn primary" onClick={() => void handleStartRemoteControl()} disabled={remoteLoading}>
                {remoteLoading ? "Starting..." : "Start Remote Control"}
              </button>
            </div>
          </div>
        </div>
      )}

      {hasSelectedDevice && activeModal === "geo" && (
        <div className="hardware-modal-overlay" onClick={geoLoading ? undefined : closeModal}>
          <div className="hardware-modal hardware-modal-geo hardware-modal-geo-v2" onClick={(event) => event.stopPropagation()}>
            <div className="hardware-modal-header green">
              <div className="hardware-modal-title">
                <MapPin size={20} />
                <div>
                  <strong>DEVICE GEOLOCATION</strong>
                  <span>{selectedDevice.name} • {selectedDevice.department || selectedDevice.groupPath || "Inventory device"}</span>
                </div>
              </div>
              <button type="button" className="hardware-modal-close inverse" onClick={closeModal} disabled={geoLoading}>
                <X size={18} />
              </button>
            </div>


            <div className="hardware-modal-body hardware-geo-redesign-body">
              <section className="hardware-geo-redesign-left">
                <div className="hardware-geo-current-card">
                  <div className="hardware-geo-current-head">
                    <div className="hardware-geo-current-icon">
                      <MapPin size={18} />
                    </div>
                    <div>
                      <span>Device Location</span>
                      <strong>{selectedDevice.name}</strong>
                      <p>{geoLoading ? "Loading saved location automatically..." : geoStatus}</p>
                    </div>
                    <div className={`hardware-geo-current-state ${geoMeta.hasLocation ? "is-success" : geoLoading ? "is-loading" : "is-empty"}`}>
                      <span />
                      {geoMeta.hasLocation ? "Location found" : geoLoading ? "Loading" : "No coordinate"}
                    </div>
                  </div>

                  <div className="hardware-geo-current-grid">
                    <div className="is-wide">
                      <small>Location Name</small>
                      <strong>{geoLocationName}</strong>
                    </div>
                    <div>
                      <small>Coordinate</small>
                      <strong>{geoMeta.hasLocation ? `${geoMeta.latitude.toFixed(6)}, ${geoMeta.longitude.toFixed(6)}` : "-"}</strong>
                    </div>
                    <div>
                      <small>Last Update</small>
                      <strong>{geoLatestTime ? getGeoDateParts(geoLatestTime).dayDate : selectedDevice.lastUpdate || selectedDevice.lastConnected || "-"}</strong>
                      <span>{geoLatestTime ? getGeoDateParts(geoLatestTime).time : ""}</span>
                    </div>
                    {/* <div>
                      <small>Accuracy</small>
                      <strong>{geoLatestAccuracy}</strong>
                    </div>
                    <div className="is-wide">
                      <small>Device Reference</small>
                      <strong>{geoLatestDeviceID}</strong>
                      <span>{selectedDevice.ip || "No IP"} • {selectedDevice.department || selectedDevice.groupPath || "No department"}</span>
                    </div> */}
                  </div>
                </div>

                <div className="hardware-geo-map-shell">
                  <div className="hardware-geo-map-shell-head">
                    <div>
                      <span>Map View</span>
                      <strong>{geoMeta.hasLocation ? `${geoMeta.latitude.toFixed(6)}, ${geoMeta.longitude.toFixed(6)}` : "No map coordinate"}</strong>
                    </div>
                    {geoMeta.hasLocation && (
                      <a className="hardware-geo-map-mini-link" href={geoMeta.mapOpenUrl} target="_blank" rel="noreferrer">
                        Open Map
                      </a>
                    )}
                  </div>
                  <div className="hardware-geo-map-frame">
                    {geoMeta.hasLocation ? (
                      <>
                        <iframe title={`Map location for ${selectedDevice.name}`} src={geoMeta.mapEmbedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                        <div className="hardware-geo-floating-marker">
                          <MapPin size={15} />
                          <div>
                            <strong>{selectedDevice.name}</strong>
                            <span>{geoLocationName !== "-" ? geoLocationName : `${geoMeta.latitude.toFixed(6)}, ${geoMeta.longitude.toFixed(6)}`}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="hardware-geo-empty hardware-geo-empty-redesign">
                        <MapPin size={28} />
                        <strong>No coordinate available</strong>
                        <span>{geoLoading ? "Loading saved geolocation automatically..." : "No saved coordinate returned for this device yet."}</span>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="hardware-geo-history-modern">
                <div className="hardware-geo-history-modern-head">
                  <div>
                    <span>Location History</span>
                    <strong>Latest movement records</strong>
                  </div>
                  <div className="hardware-geo-history-count">
                    <strong>{geoHistory.length}</strong>
                    <span>loaded</span>
                  </div>
                </div>

                {geoHistory.length ? (
                  <>
                    <div className="hardware-geo-history-list-modern">
                      {geoHistoryPageRows.map((row, index) => {
                        const absoluteIndex = geoHistoryStartIndex + index + 1;
                        const rowTime = getGeoField(row, ["Time", "DateTime", "LastUpdate"]);
                        const rowLocation = getGeoField(row, ["LocationName", "Address", "address"]) || "No address";
                        const rowLatitude = getGeoLatitude(row) || "-";
                        const rowLongitude = getGeoLongitude(row) || "-";
                        const rowDateParts = getGeoDateParts(rowTime);

                        return (
                          <article className="hardware-geo-history-item-modern" key={`${getGeoField(row, ["DeviceID", "deviceID"])}-${rowTime}-${absoluteIndex}`}>
                            <div className="hardware-geo-history-index-modern">{absoluteIndex}</div>
                            <div className="hardware-geo-history-content-modern">
                              <div className="hardware-geo-history-date-modern">
                                <strong>{rowDateParts.dayDate}</strong>
                                <span>{rowDateParts.time}</span>
                              </div>
                              <p title={rowLocation}>{rowLocation}</p>
                              <div className="hardware-geo-history-meta-modern" aria-label={`Latitude ${rowLatitude}, longitude ${rowLongitude}`}>
                                <span>{rowLatitude}</span>
                                <span>{rowLongitude}</span>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>

                    <div className="hardware-geo-history-pagination-modern">
                      <span>
                        Showing {geoHistoryRangeStart}-{geoHistoryRangeEnd} of {geoHistory.length}
                      </span>
                      <div>
                        <button
                          type="button"
                          onClick={() => setGeoHistoryPage((current) => Math.max(1, current - 1))}
                          disabled={geoHistoryCurrentPage <= 1}
                          aria-label="Previous geolocation history page"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        {geoHistoryPageNumbers.map((pageNumber, index) => {
                          const previousPageNumber = geoHistoryPageNumbers[index - 1];
                          const showGap = previousPageNumber !== undefined && pageNumber - previousPageNumber > 1;
                          return (
                            <Fragment key={pageNumber}>
                              {showGap && <span className="hardware-geo-pagination-gap">…</span>}
                              <button
                                type="button"
                                className={pageNumber === geoHistoryCurrentPage ? "is-active" : ""}
                                onClick={() => setGeoHistoryPage(pageNumber)}
                                aria-label={`Go to geolocation history page ${pageNumber}`}
                              >
                                {pageNumber}
                              </button>
                            </Fragment>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => setGeoHistoryPage((current) => Math.min(geoHistoryTotalPages, current + 1))}
                          disabled={geoHistoryCurrentPage >= geoHistoryTotalPages}
                          aria-label="Next geolocation history page"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="hardware-geo-history-empty-modern">
                    <MapPin size={24} />
                    <strong>{geoLoading ? "Loading location history..." : "No location history"}</strong>
                    <span>{geoLoading ? "The latest records will appear here automatically." : "No geolocation history returned for this device yet."}</span>
                  </div>
                )}
              </section>
            </div>

            <div className="hardware-modal-footer hardware-geo-footer">
              <button type="button" className="hardware-btn link" onClick={closeModal} disabled={geoLoading}>
                Close
              </button>
              <button type="button" className="hardware-btn primary" onClick={() => void handleRefreshGeolocation(true)} disabled={geoLoading}>
                {geoLoading ? "Refreshing..." : "Refresh Live Location"}
              </button>
            </div>
          </div>
        </div>
      )}


      {hasSelectedDevice && activeModal === "lock" && (
        <div className="hardware-modal-overlay" onClick={lockActionLoading ? undefined : closeModal}>
          <div className="hardware-modal hardware-modal-colored" onClick={(event) => event.stopPropagation()}>
            <div className="hardware-modal-header red">
              <div className="hardware-modal-title">
                <Lock size={20} />
                <div>
                  <strong>LOCK DEVICE</strong>
                  <span>{selectedDevice.name}</span>
                </div>
              </div>
              <button type="button" className="hardware-modal-close inverse" onClick={closeModal} disabled={lockActionLoading}>
                <X size={18} />
              </button>
            </div>
            <div className="hardware-modal-body">
              <div className="hardware-info-banner yellow">
                <AlertCircle size={16} />
                <div>
                  <strong>Security Warning</strong>
                  <span>Locking this device will restrict access and user interaction.</span>
                </div>
              </div>
              <div className="hardware-form-group">
                <label>Reason for Lock</label>
                <textarea rows={4} placeholder="Enter reason for locking this device..." value={lockReason} onChange={(event) => setLockReason(event.target.value)} disabled={lockActionLoading} />
              </div>
              <div className="hardware-form-group">
                <label>Lock Duration</label>
                <HardwareDropdown
                  label="Lock duration"
                  value={lockDuration}
                  onChange={setLockDuration}
                  disabled={lockActionLoading}
                  options={["1 Hour", "4 Hours", "8 Hours", "24 Hours", "Until manually unlocked"].map((item) => ({
                    value: item,
                    label: item,
                  }))}
                />
              </div>
            </div>
            <div className="hardware-modal-footer">
              <button type="button" className="hardware-btn link" onClick={closeModal} disabled={lockActionLoading}>
                Cancel
              </button>
              <button type="button" className="hardware-btn danger" onClick={handleLockSubmit} disabled={lockActionLoading}>
                {lockActionLoading ? "Locking..." : "Lock Device"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
}