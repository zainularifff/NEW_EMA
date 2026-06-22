import { type MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Database,
  Download,
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
type ToastType = "success" | "error" | "info" | "delete";
type ToastState = {
  type: ToastType;
  title: string;
  message: string;
} | null;
type DetailTab = "overview" | "hardware" | "network" | "user" | "storage" | "timeline";

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
  totalDevices?: number;
  category?: string;
  label?: string;
  code?: number;
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
  totalDevices?: number;
};

type StatisticDetailState = {
  title: string;
  value: string;
  rows: HardwareApiRow[];
  columns: string[];
};

type HardwareScanMode = "all" | "folder" | "device";

type HardwareScanResult = {
  Job_Idn?: number;
  Job_Type?: number;
  Job_Command?: number;
  Job_Style?: number;
  Job_Status?: number;
  Job_StartTime?: string;
  Job_ScheduleTime?: string;
  Job_Description?: string;
  scanMode?: string;
  targetCount?: number;
  historyRows?: number;
  destination?: Record<string, unknown>;
};

type HardwareScanPayload = {
  scanMode: HardwareScanMode;
  objectRelIdn?: number;
  relationID?: number;
  objectRootIdn?: number;
  objectDeviceID?: string;
  deviceID?: string;
  deviceName?: string;
  jobStyle?: number;
  jobPriority?: number;
  scheduleTime?: string;
  description?: string;
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
  ConnectionStatus?: string | number | boolean;
  RawConnectionStatus?: string | number | boolean;
  IsOnline?: string | number | boolean;
  isOnline?: string | number | boolean;
  MDM_ConnectionStatus?: string | number | boolean;
  MDMConnectionStatus?: string | number | boolean;
  MDM_IsOnline?: string | number | boolean;
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
  const envUrl = (
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
    (import.meta.env.VITE_API_URL as string | undefined) ||
    ""
  ).trim();

  if (envUrl) return envUrl.replace(/\/$/, "");

  // Match the Software page behavior: when no API base URL is configured,
  // keep requests relative so the app can use the existing Vite/proxy setup.
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
  groupPath: "All Branches",
  ip: "-",
  status: "Offline",
  folderKey: "organization",
  pathKeys: ["organization"],
  latitude: "-",
  longitude: "-",
  accuracy: "-",
  lastUpdate: "-",
};

const initialTreeData: TreeNode[] = [{ key: "organization", label: "All Branches", children: [] }];

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
  ];
}

function normalizeHardwareStatRow(row: unknown): HardwareApiRow {
  if (Array.isArray(row)) {
    return row.reduce<HardwareApiRow>((record, value, index) => {
      record[`column${index + 1}`] = value;
      return record;
    }, { __rawArray: row } as HardwareApiRow);
  }

  const record = asRecord(row) || {};
  const normalized: HardwareApiRow = { ...record };
  const emptyKeyValue = record[""];

  // Restore the original Connection Statistics array handling. Some legacy
  // procedures return the full statistic row under an unnamed array column.
  // Expanding it back into column1, column2, etc. keeps the previous
  // Connection Statistics, Connection List and Client Version behaviour.
  if (Array.isArray(emptyKeyValue)) {
    return emptyKeyValue.reduce<HardwareApiRow>((expanded, value, index) => {
      expanded[`column${index + 1}`] = value;
      return expanded;
    }, { ...record, __rawArray: emptyKeyValue } as HardwareApiRow);
  }

  const explicitCount = findHardwareRecordValue(record, ["count", "CCount", "Count", "Cnt", "DeviceCount", "TotalCount"]);

  // spGetHWStat2 returns the hardware value under an unnamed SQL column and
  // the number of matching devices under CCount. Keep the unnamed value as
  // the item/rawValue, never as the count.
  if (emptyKeyValue !== undefined && emptyKeyValue !== null && String(emptyKeyValue).trim() !== "") {
    if (explicitCount !== undefined) {
      normalized.item = normalized.item ?? emptyKeyValue;
      normalized.rawValue = normalized.rawValue ?? emptyKeyValue;
      normalized.column1 = normalized.column1 ?? emptyKeyValue;
      normalized.count = normalized.count ?? explicitCount;
      return normalized;
    }

    const nonEmptyKeys = Object.keys(record).filter(
      (key) => key !== "" && record[key] !== undefined && record[key] !== null && String(record[key]).trim() !== "",
    );
    const numericValue = Number(String(emptyKeyValue).replace(/,/g, ""));

    // Preserve support for older procedures where a named column is the label
    // and the unnamed numeric column is the count.
    if (Number.isFinite(numericValue) && nonEmptyKeys.length > 0) {
      normalized.Count = normalized.Count ?? emptyKeyValue;
      normalized.Cnt = normalized.Cnt ?? emptyKeyValue;
      normalized.column2 = normalized.column2 ?? emptyKeyValue;
    } else {
      normalized.item = normalized.item ?? emptyKeyValue;
      normalized.rawValue = normalized.rawValue ?? emptyKeyValue;
      normalized.column1 = normalized.column1 ?? emptyKeyValue;
    }
  }

  if (normalized.count === undefined && explicitCount !== undefined) normalized.count = explicitCount;
  return normalized;
}

function normalizeHardwareRows(value: unknown): HardwareApiRow[] {
  if (Array.isArray(value)) return value.map(normalizeHardwareStatRow);

  const valueRecord = asRecord(value);
  if (!valueRecord) return [];

  const nestedData = valueRecord.data;
  if (Array.isArray(nestedData)) return nestedData.map(normalizeHardwareStatRow);

  const nestedDataRecord = asRecord(nestedData);
  if (nestedDataRecord && Array.isArray(nestedDataRecord.data)) {
    return nestedDataRecord.data.map(normalizeHardwareStatRow);
  }

  return Object.keys(valueRecord).length ? [normalizeHardwareStatRow(valueRecord)] : [];
}

function getColumnsFromHardwareRows(rows: HardwareApiRow[]) {
  const preferred = [
    "displayValue",
    "item",
    "rawValue",
    "count",
    "percentage",
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

function formatHardwareLabel(label: string) {
  return label
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .replace(/\bCnt\b/gi, "Count")
    .replace(/\bIPAddress\b/g, "IP Address")
    .replace(/\bIP Address\b/g, "IP Address")
    .replace(/\bOS\b/g, "Operating System")
    .replace(/\bCPU\b/g, "Processor")
    .replace(/\bHDD\b/g, "Storage")
    .replace(/\bObject\b/gi, "")
    .trim() || "Details";
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
  for (const key of keys) {
    const value = findHardwareRecordValue(row, [key]);
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const parsed = Number(String(value ?? "").replace(/,/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }

  return fallback;
}

function getStatisticItemLabel(row: HardwareApiRow) {
  return readHardwareText(row, [
    "displayValue",
    "item",
    "rawValue",
    "Items",
    "Item",
    "Name",
    "Category_Inventory",
    "category_inventory",
    "CategoryInventory",
    "Category",
    "Value",
    "sCatg",
    "Catg",
    "OS",
    "OperatingSystem",
    "Processor",
    "CPU",
    "Memory",
    "RAM",
    "HardDisk",
    "HDD",
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
    "MadeCompany",
    "Model",
    "ClientVersion",
    "clientVersion",
    "column1",
  ]);
}

function getStatisticCount(row: HardwareApiRow) {
  return readHardwareNumber(row, ["count", "CCount", "Count", "Cnt", "TotalCount", "DeviceCount", "No", "column2", "column3", "column4", "Total Device", "TotalDevice"], 0);
}

function getStatisticTotal(row: HardwareApiRow, fallback = 0) {
  return readHardwareNumber(row, ["totalDevices", "Total", "GrandTotal", "TotalDevices", "TotalDeviceCount"], fallback);
}

function getStatisticPercentage(row: HardwareApiRow, count: number, total: number) {
  const reportedPercentage = readHardwareNumber(row, ["percentage", "Percentage", "Percent", "Rate", "Ratio"], NaN);
  if (Number.isFinite(reportedPercentage)) return reportedPercentage;
  return total > 0 ? (count / total) * 100 : 0;
}

function getStatisticRawValue(row: HardwareApiRow) {
  const value = findHardwareRecordValue(row, [
    "rawValue",
    "RawValue",
    "category_inventory",
    "Category_Inventory",
    "Value",
    "item",
    "Item",
    "Items",
    "column1",
  ]);
  return value === undefined || value === null ? "" : String(value).trim();
}

function formatStatisticDisplayItem(row: HardwareApiRow, selectedStatistic: string) {
  const explicitDisplay = findHardwareRecordValue(row, ["displayValue"]);
  if (explicitDisplay !== undefined && explicitDisplay !== null && String(explicitDisplay).trim() !== "") {
    return String(explicitDisplay).trim();
  }

  const rawValue = getStatisticRawValue(row);
  if (selectedStatistic === "stat-memory") {
    const memoryMb = Number(rawValue.replace(/,/g, ""));
    if (Number.isFinite(memoryMb) && memoryMb > 0) {
      const memoryGb = memoryMb / 1024;
      const roundedGb = Math.abs(memoryGb - Math.round(memoryGb)) < 0.05
        ? String(Math.round(memoryGb))
        : memoryGb.toFixed(1);
      return `${roundedGb} GB`;
    }
  }

  return getStatisticItemLabel(row);
}

function getRawHardwareArray(row: HardwareApiRow): unknown[] {
  return Array.isArray(row.__rawArray) ? row.__rawArray as unknown[] : [];
}

function getConnectionSummaryMetrics(rows: HardwareApiRow[]) {
  const raw = getRawHardwareArray(rows[0] || {});

  if (raw.length >= 5) {
    return {
      total: Number(raw[0] || 0),
      periods: [
        { period: "One Day", connected: Number(raw[1] || 0), notConnected: Number(raw[5] || 0) },
        { period: "One Week", connected: Number(raw[2] || 0), notConnected: Number(raw[5] || 0) },
        { period: "One Month", connected: Number(raw[3] || 0), notConnected: Number(raw[5] || 0) },
        { period: "Three Months", connected: Number(raw[4] || 0), notConnected: Number(raw[5] || 0) },
      ],
    };
  }

  const periods = ["One Day", "One Week", "One Month", "Three Months"];
  const total = getTotalFromStatisticRows(rows);
  return {
    total,
    periods: periods.map((period, index) => {
      const sourceRow = rows[index] || rows[0] || {};
      const connectedKeys = [
        "Connected", "ConnectedCount", "ConnectCount",
        index === 0 ? "One_day" : "",
        index === 1 ? "One_week" : "",
        index === 2 ? "One_month" : "",
        index === 3 ? "three_month" : "",
        `column${index + 2}`,
      ].filter(Boolean);
      const connected = readHardwareNumber(sourceRow, connectedKeys, 0);
      const notConnected = readHardwareNumber(sourceRow, ["Not Connected", "NotConnected", "Not_Connected", "NotConnectedCount", "column6"], Math.max(total - connected, 0));
      return { period: readHardwareText(sourceRow, ["Period", "period", "Items", "Item"], period), connected, notConnected };
    }),
  };
}

const fixedChangedItemColumns = ["Server", "New User", "Server IP", "Department", "Processor", "Memory", "Workgroup", "Computer Name", "User Name", "IP Address"];

const changedItemColumnKeys: Record<string, string[]> = {
  Server: ["Server", "ServerName", "Server_Name", "nPoints Server Name", "ComputerName"],
  "New User": ["New User", "NewUser", "UserName", "Username", "Object_Client_Name"],
  "Server IP": ["Server IP", "ServerIP", "Server_IP", "IP"],
  Department: ["Department", "Object_Full_Name", "Object_Rel_Name"],
  Processor: ["Processor", "CPU"],
  Memory: ["Memory", "RAM"],
  Workgroup: ["Workgroup", "WorkGroup"],
  "Computer Name": ["Computer Name", "ComputerName", "DeviceName"],
  "User Name": ["User Name", "UserName", "Username", "Object_Client_Name"],
  "IP Address": ["IP Address", "IPAddress", "IP", "RealIP"],
};

function isChangedItemSummaryResponse(rows: HardwareApiRow[]) {
  return rows.some((row) => findHardwareRecordValue(row, ["FieldName", "fieldName", "Field", "field"]) !== undefined);
}

function getChangedItemFieldName(row: HardwareApiRow) {
  return readHardwareText(row, ["FieldName", "fieldName", "Field", "field", "Items", "Item", "Name", "column1"]);
}

function getChangedItemFieldCount(row: HardwareApiRow) {
  return readHardwareNumber(row, ["Count", "Cnt", "Total", "", "column2", "column3"], getStatisticCount(row));
}

const connectionListColumns = [
  { label: "Username", keys: ["Username", "UserName", "Object_Client_Name", "Object_Client_Name "] },
  { label: "Department", keys: ["Department", "Object_Full_Name", "Object_Rel_Name"] },
  { label: "IP Address", keys: ["IP Address", "IPAddress", "IP", "RealIP"] },
  { label: "Email", keys: ["Email", "EmailAddress"] },
  { label: "Phone No.", keys: ["Phone No.", "PhoneNo", "TelNumber", "Phone"] },
  { label: "Last Connection", keys: ["Last Connection", "LastConnection", "ConnectionTime"] },
  { label: "MAC Address", keys: ["MAC Address", "MACAddress", "MacAddress", "Macaddress"] },
  { label: "Operating System (OS)", keys: ["Operating System (OS)", "OS", "OperatingSystem"] },
  { label: "OS Version", keys: ["OS Version", "OSVersion", "OS_Version"] },
  { label: "OS Service Pack", keys: ["OS Service Pack", "OSServicePack", "OS_ServicePack"] },
  { label: "Processor", keys: ["Processor", "CPU"] },
  { label: "Memory", keys: ["Memory", "RAM"] },
  { label: "Manufacturer", keys: ["Manufacturer", "MadeCompany"] },
  { label: "Model", keys: ["Model"] },
  { label: "Update Time", keys: ["Update Time", "UpdateTime", "HIUpdateTime", "SearchDate"] },
  { label: "Reserved 01", keys: ["Reserved 01", "Reserved01", "Reserved0"] },
  { label: "Reserved 02", keys: ["Reserved 02", "Reserved02", "Reserved1"] },
  { label: "Reserved 03", keys: ["Reserved 03", "Reserved03", "Reserved2"] },
  { label: "Workgroup", keys: ["Workgroup", "WorkGroup"] },
  { label: "Computer Name", keys: ["Computer Name", "ComputerName", "DeviceName"] },
];

const reportInventoryColumns = [
  { label: "Username", keys: ["Username", "UserName", "Object_Client_Name"] },
  { label: "Operating System", keys: ["Operating System", "OS", "OperatingSystem"] },
  { label: "Processor", keys: ["Processor", "CPU"] },
  { label: "Memory", keys: ["Memory", "RAM"] },
  { label: "Hard Disk", keys: ["Hard Disk", "HardDisk", "HDD"] },
  { label: "Video Card", keys: ["Video Card", "VideoCard", "VIDEO_CARD"] },
  { label: "LAN Card", keys: ["LAN Card", "LANCard", "LAN_CARD"] },
  { label: "IP Address", keys: ["IP Address", "IPAddress", "IP"] },
  { label: "Computer Name", keys: ["Computer Name", "ComputerName", "DeviceName"] },
];

function getTotalFromStatisticRows(rows: HardwareApiRow[]) {
  const directTotal = readHardwareNumber(rows[0] || {}, ["Total Connection(s)", "TotalConnection", "Total Device", "TotalDevice", "TotalCount", "Total", "total"], NaN);
  if (Number.isFinite(directTotal)) return directTotal;

  return rows.reduce((sum, row) => sum + getStatisticCount(row), 0);
}

function isReportSummaryLabel(value: string) {
  const normalized = String(value || "").trim().replace(/\s+/g, "").toLowerCase();
  return normalized === "total" || normalized === "subtotal" || normalized === "sub-total";
}

function getReportItemText(row: HardwareApiRow, selectedStatistic: string) {
  const keysByReport: Record<string, string[]> = {
    "report-os": ["OS", "OperatingSystem", "Operating System", "Item", "Items", "Name", "column1"],
    "report-processor": ["Processor", "CPU", "Item", "Items", "Name", "column1"],
    "report-memory": ["Memory", "RAM", "Item", "Items", "Name", "column1"],
    "report-hdd": ["HardDisk", "HDD", "Hard Disk", "Disk", "Item", "Items", "Name", "column1"],
  };

  return readHardwareText(row, keysByReport[selectedStatistic] || ["Items", "Item", "Name", "column1"], getStatisticItemLabel(row));
}

function getReportWorkgroupText(row: HardwareApiRow) {
  // Do not fall back to column2 here. In the report output, column2 is often
  // a count/frequency/subtotal value, not a Workgroup name. Only display a
  // value when the result includes a Workgroup-like field.
  return readHardwareText(row, [
    "Workgroup",
    "WorkGroup",
    "Work_Group",
    "Work Group",
    "WG",
    "Group",
    "GroupName",
    "Group_Name",
    "Department",
    "Object_Full_Name",
    "Object_Rel_Name",
  ]);
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
    throw new Error("Unable to read server response.");
  }

  if (!response.ok || payload.success === false) {
    throw new Error(payload.errorMessage || payload.message || `Request failed: ${response.status}`);
  }

  return payload;
}

async function scanHardwareInventory(payload: HardwareScanPayload): Promise<ApiEnvelope<HardwareScanResult>> {
  const requestPayload = {
    scanMode: payload.scanMode,
    Object_Rel_Idn: payload.objectRelIdn ?? payload.relationID,
    objectRelIdn: payload.objectRelIdn ?? payload.relationID,
    relationID: payload.relationID ?? payload.objectRelIdn,
    Object_Root_Idn: payload.objectRootIdn,
    objectRootIdn: payload.objectRootIdn,
    Object_DeviceID: payload.objectDeviceID ?? payload.deviceID,
    objectDeviceID: payload.objectDeviceID ?? payload.deviceID,
    deviceID: payload.deviceID ?? payload.objectDeviceID,
    deviceName: payload.deviceName,
    Job_Style: payload.jobStyle ?? 1,
    jobStyle: payload.jobStyle ?? 1,
    Job_Priority: payload.jobPriority ?? 0,
    jobPriority: payload.jobPriority ?? 0,
    Job_ScheduleTime: payload.scheduleTime ?? "",
    scheduleTime: payload.scheduleTime ?? "",
    Job_Description: payload.description ?? `Hardware inventory scan - ${payload.scanMode}`,
    description: payload.description ?? `Hardware inventory scan - ${payload.scanMode}`,
  };

  return apiRequest<HardwareScanResult>("/api/hardware-inventory/scan", {
    method: "POST",
    body: JSON.stringify(requestPayload),
  });
}

function mapDepartmentTree(departments: ApiDepartment[]): TreeNode[] {
  return [
    {
      key: "organization",
      label: "All Branches",
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

function isOnlineFlag(value: unknown) {
  if (value === true) return true;
  if (typeof value === "number") return value === 1;

  const text = String(value ?? "").trim().toLowerCase();
  return ["1", "true", "yes", "y", "online", "connected"].includes(text);
}

function normalizeStatusText(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function mapApiStatus(status?: unknown, asset?: ApiAsset | Record<string, unknown> | null): StatusType {
  const assetRecord = asRecord(asset);

  if (assetRecord && deriveApiLockState(assetRecord as ApiAsset) === "locked") return "Locked";

  const onlineFlags = [
    assetRecord?.IsOnline,
    assetRecord?.isOnline,
    assetRecord?.MDM_IsOnline,
    assetRecord?.mdmIsOnline,
    assetRecord?.Online,
    assetRecord?.online,
  ];

  if (onlineFlags.some(isOnlineFlag)) return "Online";

  const candidates = [
    status,
    assetRecord?.ConnectionStatus,
    assetRecord?.RawConnectionStatus,
    assetRecord?.rawConnectionStatus,
    assetRecord?.MDM_ConnectionStatus,
    assetRecord?.MDMConnectionStatus,
    assetRecord?.mdmConnectionStatus,
    assetRecord?.MDMStatus,
    assetRecord?.Status,
    assetRecord?.status,
  ];

  let sawStale = false;
  let sawOffline = false;

  for (const candidate of candidates) {
    const value = normalizeStatusText(candidate);
    if (!value) continue;

    if (value.includes("unlock")) return "Online";
    if (value.includes("lost mode") || value.includes("locked") || value === "lock") return "Locked";
    if (value.includes("online") || value === "1" || value === "connected" || value === "true" || value === "yes") return "Online";

    if (value.includes("stale") || value.includes("sync")) sawStale = true;
    if (value.includes("offline") || value === "0" || value === "disconnected" || value === "false" || value === "no") sawOffline = true;
  }

  if (sawStale) return "Stale Sync";
  if (sawOffline) return "Offline";
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
  const rootHwMainInfo = firstRecord(root.HWMainInfo) || firstRecord(root.hwMainInfo) || firstRecord(root.MainInfo) || firstRecord(root.HWMain);
  const mdmHwMainInfo = firstRecord(mdm?.HWMainInfo) || firstRecord(mdm?.hwMainInfo) || firstRecord(mdm?.HWMain) || firstRecord(mdm?.data);
  const hwMainInfo = rootHwMainInfo || mdmHwMainInfo;

  const processor = pickValue(hwMainInfo, ["Processor", "CPU", "CPUName", "ProcessorName", "ProcessorType"]);
  const memory = pickValue(hwMainInfo, ["Memory", "RAM", "PhysicalMemory", "TotalPhysicalMemory", "TotalMemory"]);
  const os = pickValue(hwMainInfo, ["OS", "OSName", "OperatingSystem", "OSCaption", "PlatformType"]);
  const model = pickValue(hwMainInfo, ["Model", "DeviceModelName", "ComputerModel", "SystemModel"]);
  const owner = pickValue(hwMainInfo, ["UserName", "Username", "LoginName", "LastLoginUser", "Owner", "EmailAddress"]);
  const computerName = pickValue(hwMainInfo, ["ComputerName", "DeviceName", "HostName"]);
  const ip = pickValue(hwMainInfo, ["IP", "IPAddress", "DeviceIPAddress", "DeviceLocalIPAddress"]);
  const latitude = pickValue(hwMainInfo, ["Latitude", "GPSLatitude", "Lat"]);
  const longitude = pickValue(hwMainInfo, ["Longitude", "GPSLongitude", "Long", "Lng", "Longitute"]);
  const accuracy = pickValue(hwMainInfo, ["Accuracy", "GPSAccuracy", "LocationAccuracy"]);
  const lastUpdate = pickValue(hwMainInfo, ["LastUpdate", "LastUpdated", "UpdateTime", "LocationTime", "LocationtimeStamp"]);
  const connectionTime =
    pickValue(mdmHwMainInfo, ["ConnectionTime", "LastTimeStamp", "DeviceTimeStamp", "LastUpdate"]) ||
    pickValue(rootHwMainInfo, ["ConnectionTime", "LastTimeStamp", "DeviceTimeStamp", "LastUpdate"]);

  // Detail API can contain mapped MDM data even when the list row is EM.
  // Prefer MDM status as a fallback, because TS_OBJECT_ROOT may still be 0 while TSMDM_ASSET is Online.
  const mdmStatus =
    pickValue(mdmHwMainInfo, ["ConnectionStatus", "RawConnectionStatus", "Status"]) ||
    findFirstDeepValue(mdm, ["ConnectionStatus", "RawConnectionStatus", "Status"]);
  const mdmIsOnline =
    pickValue(mdmHwMainInfo, ["IsOnline", "isOnline", "Online"]) ||
    findFirstDeepValue(mdm, ["IsOnline", "isOnline", "Online"]);
  const rootStatus =
    pickValue(rootHwMainInfo, ["ConnectionStatus", "RawConnectionStatus", "Status"]) ||
    pickValue(root, ["ConnectionStatus", "RawConnectionStatus", "Status"]);
  const detailStatus = mapApiStatus(mdmStatus || rootStatus || device.status, {
    ...(asRecord(device.rawApi) || {}),
    ...(rootHwMainInfo || {}),
    ConnectionStatus: rootStatus || mdmStatus || device.status,
    MDM_ConnectionStatus: mdmStatus,
    MDM_IsOnline: mdmIsOnline,
  });

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
    status: device.status === "Locked" ? "Locked" : detailStatus,
    latitude: latitude || device.latitude,
    longitude: longitude || device.longitude,
    accuracy: accuracy || device.accuracy,
    lastConnected: connectionTime ? formatApiDate(connectionTime) : device.lastConnected,
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

  // Last safety check: SureMDM data can be nested differently between versions.
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
    // Saved coordinate values can use "longitude / latitude". Some SureMDM records
    // use "latitude, longitude", so detect obvious ranges too.
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
              <div className="hardware-detail-card">
                <h3>Storage Utilisation</h3>
                <DetailItem label="Primary Storage" value={device.storage} />
                <DetailItem label="Storage Usage" value={storageUsage === null ? "-" : `${storageUsage}%`} />
                <DetailItem label="Platform" value={platform} />
                <DetailItem label="Last Update" value={device.lastUpdate} />
              </div>
              <div className="hardware-detail-card">
                <h3>Capacity Reference</h3>
                <div className="hardware-storage-hero">
                  <div>
                    <span>Used Capacity</span>
                    <strong>{storageUsage === null ? "-" : `${storageUsage}%`}</strong>
                  </div>
                  <div className="hardware-storage-percent">{storageUsage === null ? "-" : `${storageUsage}%`}</div>
                </div>
                <div className="hardware-storage-bar">
                  <div style={{ width: `${storageUsage === null ? 0 : storageUsage}%` }} />
                </div>
                <DetailItem label="Device Name" value={device.name} />
                <DetailItem label="Asset ID" value={device.assetId || "-"} mono />
              </div>
            </div>
          )}

          {activeTab === "timeline" && (
            <div className="hardware-detail-section-grid">
              <div className="hardware-detail-card">
                <h3>Lifecycle Timeline</h3>
                <DetailItem label="Last Connected" value={device.lastConnected} />
                <DetailItem label="Last Update" value={device.lastUpdate} />
                <DetailItem label="Current Status" value={device.status} />
                <DetailItem label="Device Record" value={device.deviceIdentifier || device.id} mono />
              </div>
              <div className="hardware-detail-card">
                <h3>Activity Reference</h3>
                <div className="hardware-detail-clean-timeline">
                  <div className="hardware-timeline-item is-current">
                    <span />
                    <div>
                      <strong>Last connected</strong>
                      <p>{device.lastConnected}</p>
                      <small>Device record</small>
                    </div>
                  </div>
                  <div className="hardware-timeline-item">
                    <span />
                    <div>
                      <strong>Last update</strong>
                      <p>{device.lastUpdate}</p>
                      <small>Device record</small>
                    </div>
                  </div>
                  <div className="hardware-timeline-item">
                    <span />
                    <div>
                      <strong>Current status</strong>
                      <p>{device.status}</p>
                      <small>Device record</small>
                    </div>
                  </div>
                </div>
              </div>
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
  countMap,
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
  countMap: Record<string, number>;
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
  const displayCount = countMap[node.key] || 0;

  return (
    <div className="ema-sidebar-tree-branch">
      <div className={`ema-sidebar-tree-node depth-${Math.min(depth, 8)} ${isSelected ? "is-selected is-active" : ""} ${hasChildren ? "is-expandable" : ""}`}>
        <button type="button" className="ema-sidebar-tree-toggle" onClick={() => hasChildren && onToggle(node.key)}>
          {hasChildren ? isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} /> : <span />}
        </button>

        <button type="button" className="ema-sidebar-tree-main" onClick={() => onSelect(node.key)}>
          <span className="ema-sidebar-tree-icon">
            {hasChildren && isExpanded ? <FolderOpen size={15} /> : <Folder size={15} />}
          </span>
          <span className="ema-sidebar-tree-label">{node.label}</span>
          {node.key !== "organization" && displayCount > 0 && <span className="ema-sidebar-tree-count">{displayCount.toLocaleString()}</span>}
        </button>

        {node.key !== "organization" && (
          <div className="ema-sidebar-tree-menu-wrap">
            <button
              type="button"
              className="ema-sidebar-tree-menu-btn"
              onClick={(event) => {
                event.stopPropagation();
                onMenu(folderMenuKey === node.key ? null : node.key);
              }}
            >
              <MoreVertical size={14} />
            </button>

            {folderMenuKey === node.key && (
              <div className="ema-sidebar-tree-menu">
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
        <div className="ema-sidebar-tree-children is-nested">
          {node.children!.map((child) => (
            <FolderTree
              key={child.key}
              node={child}
              depth={depth + 1}
              selectedKey={selectedKey}
              expandedKeys={expandedKeys}
              folderMenuKey={folderMenuKey}
              search={search}
              countMap={countMap}
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
  const hardwareRegistryToolbarRef = useRef<HTMLDivElement | null>(null);

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
  const [statisticDetail, setStatisticDetail] = useState<StatisticDetailState | null>(null);
  const [statisticDetailLoading, setStatisticDetailLoading] = useState(false);
  const [statisticDetailError, setStatisticDetailError] = useState("");
  const [hardwareScanLoading, setHardwareScanLoading] = useState(false);

  const showToast = useCallback((type: ToastType, title: string, message: string) => {
    setToast({ type, title, message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    document.documentElement.classList.add("ema-settings-page-active");
    document.body.classList.add("ema-settings-page-active");

    return () => {
      document.documentElement.classList.remove("ema-settings-page-active");
      document.body.classList.remove("ema-settings-page-active");
    };
  }, []);


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
          const response = await apiRequest<ApiAsset[]>(`/api/assets/${department.relationID}?refresh=1&_=${Date.now()}`);
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
      setNote(`Loaded ${nextDevices.length} devices. Select a device row to view available actions.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load hardware inventory.";
      setApiError(message);
      setApiDevices([]);
      setNote(`Unable to load devices. ${message}`);
      showToast("error", "Hardware inventory failed", message);
    } finally {
      setInventoryLoading(false);
    }
  }, [showToast]);

  const loadDeviceDetails = useCallback(async (device: Device) => {
    if (!device.assetId || !device.objectAgent) return;

    try {
      setNote(`Loading live details for ${device.name}...`);
      const response = await apiRequest<unknown>(`/api/asset/${device.objectAgent}/${device.assetId}?refresh=1&_=${Date.now()}`);
      const enrichedDevice = enrichDeviceWithDetails(device, response.data);
      setApiDevices((current) => current.map((item) => (item.id === device.id ? enrichedDevice : item)));
      setNote(`${device.name} live details loaded.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load device details.";
      setNote(`${device.name} selected. Some details could not be loaded.`);
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
  const folderDeviceCountMap = useMemo(() => {
    return allTreeNodes.reduce<Record<string, number>>((counts, node) => {
      const folderKeys = descendantMap.get(node.key) ?? [node.key];
      counts[node.key] = apiDevices.filter((device) => device.pathKeys.some((key) => folderKeys.includes(key))).length;
      return counts;
    }, {});
  }, [allTreeNodes, apiDevices, descendantMap]);
  const selectedFolderLabel = allTreeNodes.find((node) => node.key === selectedFolderKey)?.label ?? "All Branches";
  const folderModalParentLabel = allTreeNodes.find((node) => node.key === folderModalParentKey)?.label ?? "All Branches";
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
        device.groupPath.toLowerCase().includes(keyword) ||
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
      const toolbar = hardwareRegistryToolbarRef.current;
      const target = event.target;

      if (!panel || !(target instanceof Node)) return;
      if (panel.contains(target)) return;
      if (toolbar?.contains(target)) return;

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
    setNote(`Branch filtered by ${allTreeNodes.find((node) => node.key === key)?.label ?? key}. Device panel remains open until closed.`);
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
      showToast("delete", "Folder deleted", `${node.label} has been deleted successfully.`);
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

  const handleDeviceNameClick = (event: MouseEvent<HTMLElement>, device: Device) => {
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
    const descriptionPrefix = selectedFolderLabel && selectedFolderLabel !== "All Branches" ? `Live data for ${selectedFolderLabel}` : "Live data for all available branches";

    setStatisticLoading(true);
    setStatisticError("");

    try {
      let rows: HardwareApiRow[] = [];
      let totalDevices: number | undefined;
      let description = descriptionPrefix;
      setStatisticDetail(null);
      setStatisticDetailError("");

      if (selectedStatistic === "conn-summary") {
        const response = await apiRequest<HardwareApiRow[]>(`/api/hardware-statistics/${relationID}/connection-summary`);
        rows = normalizeHardwareRows(response);
        description = "Connection period summary";
      } else if (selectedStatistic === "conn-list") {
        const response = await apiRequest<HardwareApiRow[]>(`/api/hardware-statistics/${relationID}/connection-list`);
        rows = normalizeHardwareRows(response);
        description = "Client connection list";
      } else if (selectedStatistic === "client-version") {
        const response = await apiRequest<HardwareApiRow[]>(`/api/hardware-statistics/${relationID}/client-version`);
        rows = normalizeHardwareRows(response);
        description = "Client version distribution";
      } else if (selectedStatistic === "changed-items") {
        const response = await apiRequest<HardwareApiRow[]>(`/api/hardware-management/${relationID}/changed-items`);
        rows = normalizeHardwareRows(response);
        description = "Changed hardware item statistics";
      } else if (selectedStatistic === "duplicated-ip") {
        const response = await apiRequest<HardwareApiRow[]>("/api/hardware-management/duplicate-ips");
        rows = normalizeHardwareRows(response);
        description = "Duplicated IP list";
      } else if (selectedStatistic.startsWith("stat-")) {
        const categoryKey = STATISTIC_CATEGORY_KEY_MAP[selectedStatistic];
        const response = await apiRequest<HardwareApiRow[]>(`/api/hardware-statistics/${relationID}/category/${categoryKey}`);
        rows = normalizeHardwareRows(response);
        totalDevices = Number(response.totalDevices || 0) || undefined;
        description = `${title} distribution`;
      } else if (selectedStatistic === "report-inventory") {
        const response = await apiRequest<HardwareApiRow[]>(`/api/hardware-reports/${relationID}/client-list`);
        rows = normalizeHardwareRows(response);
        description = "Hardware inventory report list";
      } else if (selectedStatistic.startsWith("report-")) {
        const reportKey = REPORT_KEY_MAP[selectedStatistic];
        const response = await apiRequest<HardwareApiRow[]>(`/api/hardware-reports/${relationID}/${reportKey}`);
        rows = normalizeHardwareRows(response);
        description = `${title} report`;
      }

      setStatisticApiData({
        title,
        description,
        rows,
        columns: getColumnsFromHardwareRows(rows),
        totalDevices,
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

  const loadHardwareStatisticDetail = useCallback(async (row: HardwareApiRow) => {
    if (!selectedStatistic.startsWith("stat-")) return;

    const categoryKey = STATISTIC_CATEGORY_KEY_MAP[selectedStatistic];
    const rawValue = getStatisticRawValue(row);
    if (!categoryKey || !rawValue) return;

    const relationID = getSelectedRelationID();
    const displayValue = formatStatisticDisplayItem(row, selectedStatistic);
    setStatisticDetailLoading(true);
    setStatisticDetailError("");
    setStatisticDetail(null);

    try {
      const response = await apiRequest<HardwareApiRow[]>(
        `/api/hardware-statistics/${relationID}/category/${categoryKey}/list?value=${encodeURIComponent(rawValue)}&mode=2`,
      );
      const detailRows = normalizeHardwareRows(response);
      setStatisticDetail({
        title: `${STATISTIC_TITLE_MAP[selectedStatistic] || "Hardware"}: ${displayValue}`,
        value: rawValue,
        rows: detailRows,
        columns: getColumnsFromHardwareRows(detailRows),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load matching devices.";
      setStatisticDetailError(message);
      showToast("error", "Statistic detail failed", message);
    } finally {
      setStatisticDetailLoading(false);
    }
  }, [getSelectedRelationID, selectedStatistic, showToast]);

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
    setStatisticDetail(null);
    setStatisticDetailError("");
    setStatisticError("");
    setPage(1);
    setNote(`Loading ${node.name} statistic data.`);
  };

  const handleScanHardware = async (mode: HardwareScanMode) => {
    if (mode === "device") {
      if (!hasSelectedDevice || selectedDevice.id === "NO-DEVICE") {
        showToast("info", "Select a device first", "Select one Windows device before refreshing inventory.");
        return;
      }

      if (String(selectedDevice.objectAgent || "EM").toUpperCase() !== "EM") {
        showToast("error", "Inventory refresh unavailable", "This action is only available for supported Windows devices.");
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

    const confirmed = window.confirm(`Refresh hardware inventory for ${targetLabel}?`);
    if (!confirmed) return;

    setHardwareScanLoading(true);
    setNote(`Refreshing hardware inventory for ${targetLabel}...`);

    try {
      const response = await scanHardwareInventory({
        scanMode: mode,
        objectRelIdn: mode === "folder" ? relationID : undefined,
        relationID: mode === "folder" ? relationID : undefined,
        objectRootIdn: mode === "device" ? selectedDevice.assetId : undefined,
        objectDeviceID: mode === "device" ? selectedDevice.deviceIdentifier : undefined,
        deviceID: mode === "device" ? selectedDevice.deviceIdentifier : undefined,
        deviceName: mode === "device" ? selectedDevice.name : undefined,
        jobStyle: 1,
        jobPriority: 0,
        scheduleTime: "",
        description:
          mode === "all"
            ? "Hardware inventory scan - all devices"
            : mode === "folder"
              ? `Hardware inventory scan - ${selectedFolderLabel}`
              : `Hardware inventory scan - ${selectedDevice.name}`,
      });

      const targetCount = response.data?.targetCount ? ` Devices included: ${response.data.targetCount}.` : "";
      showToast("success", "Inventory refresh started", `Hardware inventory refresh has started.${targetCount}`);
      setNote(`Hardware inventory refresh started.${targetCount}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to refresh hardware inventory.";
      showToast("error", "Inventory refresh failed", message);
      setNote(`Inventory refresh failed. ${message}`);
    } finally {
      setHardwareScanLoading(false);
    }
  };

  const handleRefresh = () => {
    setNote("Refreshing hardware inventory. Device panel remains open until closed.");
    void loadHardwareInventory();
  };

  const handleExportHardwareTable = () => {
    if (!filteredDevices.length) {
      showToast("info", "No data to export", "The current table has no device records to export.");
      return;
    }

    const escapeCsvCell = (value: unknown) => {
      const text = value === undefined || value === null ? "" : String(value);
      return `"${text.replace(/"/g, '""')}"`;
    };

    const headers = [
      "No",
      "Device",
      "Device ID",
      "Owner",
      "Branch",
      "Branch Path",
      "Platform / Model",
      "Status",
      "Last Connected",
      "Network",
      "Asset ID",
      "Agent",
      "Latitude",
      "Longitude",
      "Accuracy",
      "Last Update",
    ];

    const rows = filteredDevices.map((device, index) => [
      index + 1,
      device.name,
      device.deviceIdentifier || device.id,
      device.owner,
      device.department,
      device.groupPath,
      device.platformModel,
      device.status,
      device.lastConnected,
      device.ip,
      device.assetId || "",
      device.objectAgent || "",
      device.latitude,
      device.longitude,
      device.accuracy,
      device.lastUpdate,
    ]);

    const csv = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\n");
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `hardware-inventory-${dateStamp}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    showToast("success", "Hardware table exported", `${filteredDevices.length} device record(s) exported to CSV.`);
    setNote(`${filteredDevices.length} current table record(s) exported.`);
  };

  const openMoveDepartmentModal = () => {
    if (!hasSelectedDevice) {
      showToast("info", "Select a device first", "Click a device row before using device actions.");
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
      showToast("error", "Move failed", `${selectedDevice.name} cannot be moved right now.`);
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
        : `${selectedDevice.name} message result: ${apiMessage}.`;

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
            <p style="margin: 0; color: #6079a6; font-size: 13px;">Please wait while EMA prepares the remote support session.</p>
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
      showToast("error", "Remote control unavailable", `${selectedDevice.name} cannot start a remote session right now.`);
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
        throw new Error("Remote session could not be opened.");
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
      showToast("error", "Action unavailable", `${selectedDevice.name} cannot be updated right now.`);
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
      <div key={node.id} className="ema-sidebar-tree-branch">
        <div className={`ema-sidebar-tree-node depth-${Math.min(depth, 8)} ${isSelected ? "is-selected is-active" : ""} ${hasChildren ? "is-expandable" : ""}`}>
          <button type="button" className="ema-sidebar-tree-toggle" onClick={() => (hasChildren ? toggleStatisticGroup(node.id) : handleStatisticSelect(node))}>
            {hasChildren ? isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} /> : <span />}
          </button>
          <button type="button" className="ema-sidebar-tree-main" onClick={() => handleStatisticSelect(node)}>
            <span className="ema-sidebar-tree-icon">
              {hasChildren ? isExpanded ? <FolderOpen size={15} /> : <Folder size={15} /> : <Database size={15} />}
            </span>
            <span className="ema-sidebar-tree-label">{node.name}</span>
          </button>
        </div>

        {hasChildren && isExpanded && (
          <div className="ema-sidebar-tree-children is-nested">
            {node.children!.map((child) => renderStatisticTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderStatisticsWorkbench = () => {
    const rows = statisticApiData?.rows || [];
    const selectedTitle = statisticApiData?.title || STATISTIC_TITLE_MAP[selectedStatistic] || "Hardware Statistics";
    const selectedCode = selectedStatistic ? selectedStatistic.toUpperCase() : "SELECT A CATEGORY";

    const emptyState = (title: string, message: string) => (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <div className="text-center max-w-md px-4">
          <Database className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-xs font-bold uppercase tracking-widest">{title}</p>
          <p className="text-[10px] text-slate-500 mt-1">{message}</p>
        </div>
      </div>
    );

    const renderStatisticTable = () => {
      if (!selectedStatistic) {
        return emptyState("Select a statistic category", "Choose a category from the statistic tree to view data.");
      }

      if (statisticLoading) {
        return (
          <div className="flex items-center justify-center h-64 text-slate-400">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-blue-500" />
              <p className="text-xs font-bold uppercase tracking-widest">Loading statistic data...</p>
            </div>
          </div>
        );
      }

      if (statisticError) {
        return (
          <div className="flex items-center justify-center h-64 text-slate-400">
            <div className="text-center max-w-md px-4">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
              <p className="text-xs font-black text-rose-600 uppercase tracking-widest">Failed to load statistic</p>
              <p className="text-[10px] text-slate-500 mt-1">{statisticError}</p>
            </div>
          </div>
        );
      }

      if (rows.length === 0) {
        return emptyState("No records found", "No information is available for this statistic yet.");
      }

      if (selectedStatistic === "conn-summary") {
        const summaryMetrics = getConnectionSummaryMetrics(rows);
        const totalConnections = summaryMetrics.total;
        const periodData = summaryMetrics.periods;

        return (
          <div className="hardware-stat-summary-layout">
            <div className="hardware-stat-summary-total">Total Connection(s) : {totalConnections}</div>
            <table className="hardware-stat-summary-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Connected</th>
                  <th>Not Connected</th>
                </tr>
              </thead>
              <tbody>
                {periodData.map((row) => (
                  <tr key={row.period}>
                    <td>{row.period}</td>
                    <td>{row.connected}</td>
                    <td>{row.notConnected}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="hardware-stat-summary-reference">
              Reference Date - {new Date().toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" })}
            </div>
          </div>
        );
      }

      if (selectedStatistic === "conn-list") {
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 border-b border-slate-100">
                  {connectionListColumns.map((column) => <th key={column.label} className="px-3 py-2">{column.label}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((row, index) => (
                  <tr key={`conn-list-${index}`} className="hover:bg-blue-50/30 transition-colors">
                    {connectionListColumns.map((column) => (
                      <td key={`${index}-${column.label}`} className={`px-3 py-2 text-[10px] whitespace-nowrap ${column.label.includes("IP") || column.label.includes("MAC") ? "text-slate-500 font-mono" : "text-slate-600"} ${column.label === "Username" ? "font-medium text-slate-900" : ""}`}>
                        {readHardwareText(row, [...column.keys, `column${connectionListColumns.indexOf(column) + 1}`])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      if (selectedStatistic === "client-version") {
        return (
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 border-b border-slate-100">
                <th className="px-3 py-2">Client Version</th>
                <th className="px-3 py-2">Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((row, index) => {
                const version = readHardwareText(row, ["Client Version", "ClientVersion", "clientVersion", "Version", "TCAVersion", "Items", "Item", "column1"]);
                const count = readHardwareNumber(row, ["CCount", "Count", "Cnt", "Total", "", "column2", "column3"], getStatisticCount(row));
                return (
                  <tr key={`${version}-${index}`} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-3 py-2 font-mono text-[10px] font-medium text-slate-900">{version}</td>
                    <td className="px-3 py-2"><span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">{count}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        );
      }

      if (selectedStatistic === "changed-items") {
        const isSummaryResponse = isChangedItemSummaryResponse(rows);

        return (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight">Changed Items</h4>
                <p className="text-[9px] text-slate-500 mt-0.5">Latest changed hardware records</p>
              </div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{rows.length} Records</span>
            </div>

            {isSummaryResponse ? (
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 border-b border-slate-100">
                    <th className="px-3 py-2">Changed Item</th>
                    <th className="px-3 py-2">Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rows.map((row, index) => {
                    const fieldName = getChangedItemFieldName(row);
                    const count = getChangedItemFieldCount(row);
                    return (
                      <tr key={`changed-summary-${fieldName}-${index}`} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-3 py-2 text-[10px] font-medium text-slate-900">{fieldName}</td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">{count}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 border-b border-slate-100">
                    {fixedChangedItemColumns.map((col) => <th key={col} className="px-3 py-2">{col}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rows.map((row, index) => (
                    <tr key={`changed-${index}`} className="hover:bg-blue-50/30 transition-colors">
                      {fixedChangedItemColumns.map((col) => (
                        <td key={`${index}-${col}`} className={`px-3 py-2 text-[10px] ${col.includes("IP") ? "font-mono" : ""}`}>
                          {readHardwareText(row, [...(changedItemColumnKeys[col] || [col]), `column${fixedChangedItemColumns.indexOf(col) + 1}`])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      }

      if (selectedStatistic === "duplicated-ip") {
        return (
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 border-b border-slate-100">
                <th className="px-3 py-2">IP Address</th>
                <th className="px-3 py-2">Count</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.length > 0 ? rows.map((row, index) => {
                const ip = readHardwareText(row, ["IP Address", "IPAddress", "IP", "ip", "column1"]);
                const count = readHardwareNumber(row, ["CCount", "Count", "Cnt", "Total", "", "column2", "column3"], getStatisticCount(row));
                return (
                  <tr key={`${ip}-${index}`} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-3 py-2 font-mono text-[10px] font-medium text-slate-900">{ip}</td>
                    <td className="px-3 py-2"><span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">{count}</span></td>
                    <td className="px-3 py-2"><span className="flex items-center gap-1 text-[10px] text-red-600 font-bold"><AlertCircle className="w-3 h-3" /> Duplicate</span></td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-400"><CheckCircle className="w-7 h-7 mx-auto mb-1.5 text-emerald-500" /> No duplicated IP addresses found</td></tr>
              )}
            </tbody>
          </table>
        );
      }

      if (selectedStatistic.startsWith("stat-")) {
        const distributionRows = rows
          .map((row, index) => ({
            row,
            index,
            item: formatStatisticDisplayItem(row, selectedStatistic),
            rawValue: getStatisticRawValue(row),
            count: getStatisticCount(row),
          }))
          .filter(({ item, rawValue, count }) => item !== "-" && Boolean(rawValue) && count > 0)
          .sort((a, b) => b.count - a.count);

        if (distributionRows.length === 0) {
          return emptyState(
            "No hardware statistics available",
            "The selected category did not return any named hardware values.",
          );
        }

        const summedCount = distributionRows.reduce((sum, entry) => sum + entry.count, 0);
        const reportedTotal = rows.reduce((max, row) => Math.max(max, getStatisticTotal(row, 0)), 0);
        const totalCount = statisticApiData?.totalDevices || reportedTotal || summedCount;

        return (
          <div>
            <div className="mb-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight">Distribution</h4>
              <p className="text-[9px] text-slate-500 mt-0.5">Showing hardware values by device count. Click a row to view matching devices.</p>
            </div>
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 border-b border-slate-100">
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Count</th>
                  <th className="px-3 py-2">Percentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {distributionRows.map(({ row, index, item, rawValue, count }) => {
                  const rawPercentage = getStatisticPercentage(row, count, totalCount);
                  const percentage = Number.isFinite(rawPercentage) ? rawPercentage.toFixed(1) : "0.0";
                  const barWidth = `${Math.max(0, Math.min(100, Number(percentage) || 0))}%`;
                  return (
                    <tr
                      key={`${rawValue}-${index}`}
                      className="hover:bg-blue-50/50 transition-colors cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onClick={() => void loadHardwareStatisticDetail(row)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          void loadHardwareStatisticDetail(row);
                        }
                      }}
                    >
                      <td className="px-3 py-2 text-[10px] font-medium text-slate-900">{item}</td>
                      <td className="px-3 py-2"><span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">{count}</span></td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: barWidth }} /></div>
                          <span className="text-[10px] font-bold text-slate-600 w-10">{percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {statisticDetailLoading && (
              <div className="mt-4 border-t border-slate-100 pt-4 text-center text-[10px] font-bold text-slate-500">
                <RefreshCw className="w-4 h-4 inline-block mr-2 animate-spin text-blue-500" />
                Loading matching devices...
              </div>
            )}

            {statisticDetailError && (
              <div className="mt-4 border-t border-slate-100 pt-4 text-[10px] font-medium text-rose-600">
                <AlertCircle className="w-4 h-4 inline-block mr-2" />
                {statisticDetailError}
              </div>
            )}

            {statisticDetail && !statisticDetailLoading && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-wider">{statisticDetail.title}</h5>
                    <p className="text-[9px] text-slate-500 mt-0.5">{statisticDetail.rows.length} matching device record(s)</p>
                  </div>
                  <button
                    type="button"
                    className="text-[9px] font-bold text-slate-500 hover:text-slate-800"
                    onClick={() => setStatisticDetail(null)}
                  >
                    Close details
                  </button>
                </div>

                {statisticDetail.rows.length === 0 ? (
                  <div className="py-5 text-center text-[10px] text-slate-400">No matching device records were returned.</div>
                ) : (
                  <div className="overflow-x-auto border border-slate-100 rounded-lg">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 border-b border-slate-100">
                          {statisticDetail.columns.map((column) => (
                            <th key={column} className="px-3 py-2 whitespace-nowrap">{formatHardwareLabel(column)}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {statisticDetail.rows.map((detailRow, detailIndex) => (
                          <tr key={`stat-detail-${detailIndex}`} className="hover:bg-blue-50/30">
                            {statisticDetail.columns.map((column) => (
                              <td key={`${detailIndex}-${column}`} className="px-3 py-2 text-[10px] text-slate-600 whitespace-nowrap">
                                {formatHardwareValue(detailRow[column])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }

      if (selectedStatistic === "report-inventory") {
        return (
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 border-b border-slate-100 sticky top-0">
                {reportInventoryColumns.map((column) => <th key={column.label} className="px-3 py-2">{column.label}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((row, index) => (
                <tr key={`report-inventory-${index}`} className="hover:bg-blue-50/30 transition-colors">
                  {reportInventoryColumns.map((column) => (
                    <td key={`${index}-${column.label}`} className={`px-3 py-2 text-[10px] ${column.label.includes("IP") ? "text-slate-500 font-mono" : column.label === "Username" ? "font-medium text-slate-900" : "text-slate-600"}`}>
                      {readHardwareText(row, [...column.keys, `column${reportInventoryColumns.indexOf(column) + 1}`])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        );
      }

      if (selectedStatistic.startsWith("report-")) {
        const reportRows = rows
          .map((row, index) => ({
            row,
            index,
            item: getReportItemText(row, selectedStatistic),
            workgroup: getReportWorkgroupText(row),
          }))
          .filter(({ item, workgroup }) => !isReportSummaryLabel(item) && !isReportSummaryLabel(workgroup));

        return (
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 border-b border-slate-100">
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Workgroup</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {reportRows.map(({ index, item, workgroup }) => (
                <tr key={`report-${index}`} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-3 py-2 text-[10px] font-medium text-slate-900">{item}</td>
                  <td className="px-3 py-2 text-slate-600 text-[10px]">{workgroup}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      }

      return null;
    };

    return (
      <div className="hardware-stat-workbench hardware-stat-workbench-clean">
        <div className="hardware-stat-commandbar hardware-stat-commandbar-compact">
          <div>
            <h3>Hardware Statistics</h3>
            <p>{selectedCode}</p>
          </div>
          <button type="button" className="hardware-stat-refresh-btn" onClick={() => void loadSelectedStatisticData()} disabled={statisticLoading}>
            <RefreshCw size={16} />
            {statisticLoading ? "Loading" : "Refresh"}
          </button>
        </div>

        <div className="hardware-stat-table-card hardware-stat-table-card-inventory-layout">
          <div className="hardware-stat-table-scroll hardware-stat-table-scroll-inventory-layout">
            {renderStatisticTable()}
          </div>
        </div>
      </div>
    );
  };

  const kpiCards = [
    { key: "all" as KpiFilter, title: "Total Devices", value: totalAvailable, subtitle: "inventory scope", icon: <Monitor size={17} />, color: "is-total" },
    { key: "recent" as KpiFilter, title: "Recently Connected", value: recentCount, subtitle: "online devices", icon: <CheckCircle size={17} />, color: "is-connected" },
    { key: "stale" as KpiFilter, title: "Stale Sync", value: staleCount, subtitle: "needs attention", icon: <AlertCircle size={17} />, color: "is-stale" },
    { key: "locked" as KpiFilter, title: "Locked Devices", value: lockedCount, subtitle: "security state", icon: <Lock size={17} />, color: "is-locked" },
    { key: "running" as KpiFilter, title: "Online Devices", value: onlineDeviceCount, subtitle: "currently online", icon: <RefreshCw size={17} />, color: "is-online" },
  ];

  return (
    <main className={`settings-module-root hardware-module-root ema-settings-pro container-fluid p-3 p-xl-4 ${hasSelectedDevice ? "has-selected-device" : "no-selected-device"}`} data-section={activeTab}>
      <style>{`



        /* Consistent Hardware detail drawer layout: all tabs keep the same clean form size. */
        .hardware-module-root .hardware-detail-form-overlay,
        .hardware-module-root .hardware-detail-drawer-overlay {
          position: fixed !important;
          inset: 0 !important;
          z-index: 9999 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: flex-end !important;
          padding: 72px 22px 22px 260px !important;
          background: rgba(15, 23, 42, 0.38) !important;
          backdrop-filter: blur(3px) !important;
          overflow: hidden !important;
        }

        .hardware-module-root .hardware-detail-form-modal,
        .hardware-module-root .hardware-detail-drawer {
          position: relative !important;
          inset: auto !important;
          width: min(1000px, calc(100vw - 322px)) !important;
          height: min(78vh, 740px) !important;
          min-height: 620px !important;
          max-height: calc(100vh - 104px) !important;
          margin: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          overflow: hidden !important;
          border: 1px solid rgba(203, 213, 225, 0.98) !important;
          border-radius: 22px !important;
          background: #ffffff !important;
          box-shadow: 0 28px 80px rgba(15, 23, 42, 0.24) !important;
          transform: none !important;
        }

        .hardware-module-root .hardware-detail-drawer-header {
          flex: 0 0 auto !important;
          min-height: 122px !important;
          padding: 22px 26px 18px !important;
          display: flex !important;
          align-items: flex-start !important;
          justify-content: space-between !important;
          gap: 18px !important;
          border-bottom: 1px solid rgba(226, 232, 240, 0.96) !important;
          background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%) !important;
        }

        .hardware-module-root .hardware-detail-title-wrap {
          min-width: 0 !important;
          display: flex !important;
          align-items: flex-start !important;
          gap: 14px !important;
        }

        .hardware-module-root .hardware-detail-title-wrap h2 {
          margin: 0 !important;
          color: #0a2554 !important;
          font-size: clamp(1.55rem, 2.2vw, 2.05rem) !important;
          line-height: 1.04 !important;
          font-weight: 950 !important;
          letter-spacing: -0.045em !important;
        }

        .hardware-module-root .hardware-detail-title-wrap p {
          margin: 6px 0 0 !important;
          max-width: 620px !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
          color: #64748b !important;
          font-size: 0.78rem !important;
          font-weight: 800 !important;
        }

        .hardware-module-root .hardware-detail-eyebrow {
          color: #1858ff !important;
          font-size: 0.68rem !important;
          font-weight: 950 !important;
          letter-spacing: 0.13em !important;
          text-transform: uppercase !important;
        }

        .hardware-module-root .hardware-detail-device-icon {
          width: 42px !important;
          height: 42px !important;
          flex: 0 0 42px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          border: 1px solid #dbe7ff !important;
          border-radius: 15px !important;
          color: #1f63ff !important;
          background: #eef4ff !important;
        }

        .hardware-module-root .hardware-detail-header-actions {
          display: inline-flex !important;
          align-items: center !important;
          gap: 10px !important;
          flex: 0 0 auto !important;
        }

        .hardware-module-root .hardware-detail-close {
          width: 38px !important;
          height: 38px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          border: 1px solid #d5e0ef !important;
          border-radius: 14px !important;
          background: #f8fbff !important;
          color: #64748b !important;
        }

        .hardware-module-root .hardware-detail-summary-grid {
          flex: 0 0 auto !important;
          display: grid !important;
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          gap: 10px !important;
          padding: 12px 26px !important;
          border-bottom: 1px solid rgba(226, 232, 240, 0.8) !important;
          background: #ffffff !important;
        }

        .hardware-module-root .hardware-detail-summary-card {
          min-width: 0 !important;
          height: 76px !important;
          padding: 14px 16px !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: flex-start !important;
          gap: 6px !important;
          border: 1px solid #e1e8f2 !important;
          border-radius: 16px !important;
          background: #ffffff !important;
          box-shadow: none !important;
        }

        .hardware-module-root .hardware-detail-summary-card span {
          min-width: 0 !important;
          color: #334155 !important;
          font-size: 0.75rem !important;
          font-weight: 700 !important;
          line-height: 1.15 !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }

        .hardware-module-root .hardware-detail-summary-card strong {
          min-width: 0 !important;
          color: #0a2554 !important;
          font-size: 0.9rem !important;
          line-height: 1.15 !important;
          font-weight: 950 !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          display: -webkit-box !important;
          -webkit-line-clamp: 2 !important;
          -webkit-box-orient: vertical !important;
        }

        .hardware-module-root .hardware-detail-tabs {
          flex: 0 0 auto !important;
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
          padding: 12px 26px 10px !important;
          border-bottom: 1px solid rgba(226, 232, 240, 0.8) !important;
          background: #ffffff !important;
          overflow-x: auto !important;
          scrollbar-width: none !important;
        }

        .hardware-module-root .hardware-detail-tabs::-webkit-scrollbar {
          display: none !important;
        }

        .hardware-module-root .hardware-detail-tabs button {
          height: 35px !important;
          min-width: 74px !important;
          padding: 0 14px !important;
          border: 1px solid #dbe5f1 !important;
          border-radius: 999px !important;
          background: #ffffff !important;
          color: #5b6b83 !important;
          font-size: 0.72rem !important;
          font-weight: 900 !important;
          white-space: nowrap !important;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04) !important;
        }

        .hardware-module-root .hardware-detail-tabs button.is-active {
          border-color: #1f63ff !important;
          background: linear-gradient(135deg, #1f63ff 0%, #3457e8 100%) !important;
          color: #ffffff !important;
          box-shadow: 0 10px 22px rgba(31, 99, 255, 0.22) !important;
        }

        .hardware-module-root .hardware-detail-body {
          flex: 1 1 auto !important;
          min-height: 0 !important;
          padding: 14px 26px 22px !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
          background: #ffffff !important;
          scrollbar-gutter: stable !important;
        }

        .hardware-module-root .hardware-detail-section-grid {
          min-height: 100% !important;
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 14px !important;
          align-items: start !important;
        }

        .hardware-module-root .hardware-detail-card,
        .hardware-module-root .hardware-detail-card.hardware-detail-card-wide {
          min-width: 0 !important;
          grid-column: auto !important;
          min-height: 330px !important;
          height: auto !important;
          padding: 0 !important;
          overflow: hidden !important;
          border: 1px solid #e1e8f2 !important;
          border-radius: 16px !important;
          background: #ffffff !important;
          box-shadow: none !important;
        }

        .hardware-module-root .hardware-detail-card h3 {
          margin: 0 !important;
          padding: 14px 16px 10px !important;
          color: #0a2554 !important;
          font-size: clamp(1.02rem, 1.5vw, 1.28rem) !important;
          line-height: 1.1 !important;
          font-weight: 950 !important;
          letter-spacing: -0.035em !important;
          border-bottom: 1px solid rgba(226, 232, 240, 0.72) !important;
        }

        .hardware-module-root .hardware-detail-item {
          min-height: 60px !important;
          padding: 12px 16px !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: center !important;
          gap: 5px !important;
          border-bottom: 1px solid rgba(226, 232, 240, 0.82) !important;
          background: #ffffff !important;
        }

        .hardware-module-root .hardware-detail-item:last-child {
          border-bottom: 0 !important;
        }

        .hardware-module-root .hardware-detail-item span {
          color: #64748b !important;
          font-size: 0.62rem !important;
          font-weight: 950 !important;
          letter-spacing: 0.08em !important;
          line-height: 1.1 !important;
          text-transform: uppercase !important;
        }

        .hardware-module-root .hardware-detail-item strong {
          min-width: 0 !important;
          color: #0a2554 !important;
          font-size: 0.84rem !important;
          font-weight: 950 !important;
          line-height: 1.25 !important;
          overflow-wrap: anywhere !important;
        }

        .hardware-module-root .hardware-storage-hero {
          margin: 12px 16px !important;
          padding: 12px !important;
          min-height: 72px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          gap: 12px !important;
          border: 1px solid #e1e8f2 !important;
          border-radius: 14px !important;
          background: #f8fbff !important;
        }

        .hardware-module-root .hardware-storage-hero span {
          display: block !important;
          color: #64748b !important;
          font-size: 0.65rem !important;
          font-weight: 900 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.08em !important;
        }

        .hardware-module-root .hardware-storage-hero strong,
        .hardware-module-root .hardware-storage-percent {
          color: #0a2554 !important;
          font-size: 1rem !important;
          font-weight: 950 !important;
        }

        .hardware-module-root .hardware-storage-bar {
          height: 10px !important;
          margin: 0 16px 12px !important;
          border-radius: 999px !important;
          background: #e8eef8 !important;
          overflow: hidden !important;
        }

        .hardware-module-root .hardware-storage-bar > div {
          height: 100% !important;
          border-radius: inherit !important;
          background: linear-gradient(90deg, #2563eb, #22c55e) !important;
        }

        .hardware-module-root .hardware-detail-clean-timeline {
          padding: 10px 14px 14px !important;
          display: grid !important;
          gap: 10px !important;
        }

        .hardware-module-root .hardware-detail-timeline {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 14px !important;
        }

        .hardware-module-root .hardware-timeline-item {
          min-height: 70px !important;
          padding: 12px 12px !important;
          display: grid !important;
          grid-template-columns: 16px minmax(0, 1fr) !important;
          gap: 10px !important;
          border: 1px solid #e1e8f2 !important;
          border-radius: 14px !important;
          background: #f8fbff !important;
        }

        .hardware-module-root .hardware-timeline-item > span {
          width: 10px !important;
          height: 10px !important;
          margin-top: 3px !important;
          border-radius: 999px !important;
          background: #cbd5e1 !important;
          box-shadow: 0 0 0 4px #eef4ff !important;
        }

        .hardware-module-root .hardware-timeline-item.is-current > span {
          background: #2563eb !important;
        }

        .hardware-module-root .hardware-timeline-item strong {
          display: block !important;
          color: #0a2554 !important;
          font-size: 0.82rem !important;
          font-weight: 950 !important;
        }

        .hardware-module-root .hardware-timeline-item p,
        .hardware-module-root .hardware-timeline-item small {
          margin: 4px 0 0 !important;
          color: #334155 !important;
          font-size: 0.78rem !important;
          font-weight: 700 !important;
        }

        .hardware-module-root .hardware-timeline-item small {
          color: #64748b !important;
          font-size: 0.65rem !important;
          font-weight: 900 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.06em !important;
        }

        .hardware-module-root .hardware-detail-form-footer {
          display: none !important;
        }

        @media (max-width: 1180px) {
          .hardware-module-root .hardware-detail-form-overlay,
          .hardware-module-root .hardware-detail-drawer-overlay {
            padding-left: 18px !important;
          }

          .hardware-module-root .hardware-detail-form-modal,
          .hardware-module-root .hardware-detail-drawer {
            width: min(920px, calc(100vw - 36px)) !important;
          }
        }

        @media (max-width: 760px) {
          .hardware-module-root .hardware-detail-form-overlay,
          .hardware-module-root .hardware-detail-drawer-overlay {
            align-items: stretch !important;
            padding: 12px !important;
          }

          .hardware-module-root .hardware-detail-form-modal,
          .hardware-module-root .hardware-detail-drawer {
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: calc(100vh - 24px) !important;
          }

          .hardware-module-root .hardware-detail-drawer-header,
          .hardware-module-root .hardware-detail-summary-grid,
          .hardware-module-root .hardware-detail-tabs,
          .hardware-module-root .hardware-detail-body {
            padding-left: 16px !important;
            padding-right: 16px !important;
          }

          .hardware-module-root .hardware-detail-summary-grid,
          .hardware-module-root .hardware-detail-section-grid {
            grid-template-columns: 1fr !important;
          }
        }


        /* Hardware sidebar fix: wider panel + keep Branch/Statistics switcher compact. */
        .hardware-module-root .settings-layout.hardware-settings-layout {
          grid-template-columns: minmax(300px, 322px) minmax(0, 1fr) !important;
        }

        .hardware-module-root .settings-menu.hardware-left-panel {
          min-width: 300px !important;
        }

        .hardware-module-root .settings-menu > .ema-module-sidebar-switcher {
          flex: 0 0 auto !important;
          margin: 0 !important;
        }

        .hardware-module-root .settings-menu > .ema-sidebar-content {
          flex: 1 1 auto !important;
          padding-top: 0.65rem !important;
        }

        .hardware-module-root .ema-sidebar-subpanel {
          justify-content: flex-start !important;
        }

        .hardware-module-root .ema-sidebar-tree {
          min-height: 0 !important;
        }

        /* Device registry table: force 7 fixed grid columns after adding Branch.
           This prevents Network/IP from wrapping into a second header/body line. */
        .hardware-module-root .hardware-device-table {
          width: 100% !important;
          overflow-x: auto !important;
          overflow-y: visible !important;
        }

        .hardware-module-root .hardware-device-table .hardware-device-table-row {
          display: grid !important;
          grid-template-columns: 52px minmax(240px, 1.55fr) minmax(150px, 0.95fr) minmax(210px, 1.35fr) minmax(105px, 0.65fr) minmax(150px, 0.9fr) minmax(130px, 0.8fr) !important;
          align-items: center !important;
          column-gap: 0 !important;
          min-width: 1037px !important;
          width: 100% !important;
        }

        .hardware-module-root .hardware-device-table .user-cell {
          min-width: 0 !important;
          overflow: hidden !important;
        }

        .hardware-module-root .hardware-device-table .head .user-cell {
          display: flex !important;
          align-items: center !important;
          min-height: 44px !important;
        }

        .hardware-module-root .hardware-device-table .hardware-sort-btn {
          max-width: 100% !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
        }

        .hardware-module-root .hardware-device-main-cell,
        .hardware-module-root .hardware-user-name,
        .hardware-module-root .hardware-user-name > div {
          min-width: 0 !important;
        }

        /* Strong override for existing global Hardware table CSS.
           The global stylesheet still has the old 6-column grid with higher specificity,
           so these selectors pin every header/body cell into one 7-column row. */
        .hardware-module-root .hardware-device-table.hardware-standard-table {
          display: block !important;
          width: calc(100% - 2.1rem) !important;
          max-width: calc(100% - 2.1rem) !important;
          overflow-x: auto !important;
          overflow-y: hidden !important;
        }

        .hardware-module-root .hardware-device-table .user-row.advanced.clean-table-row.hardware-standard-row.hardware-device-table-row,
        .hardware-module-root .hardware-device-table .hardware-standard-row.hardware-device-table-row,
        .hardware-module-root .hardware-device-table .hardware-device-table-row {
          display: grid !important;
          grid-template-columns: 56px minmax(250px, 1.6fr) minmax(170px, 0.95fr) minmax(220px, 1.25fr) 112px 180px 160px !important;
          grid-auto-flow: row !important;
          grid-auto-rows: auto !important;
          align-items: center !important;
          gap: 0 !important;
          column-gap: 0 !important;
          min-width: 1160px !important;
          width: 100% !important;
        }

        .hardware-module-root .hardware-device-table .hardware-device-table-row > .user-cell:nth-child(1) { grid-column: 1 !important; grid-row: 1 !important; }
        .hardware-module-root .hardware-device-table .hardware-device-table-row > .user-cell:nth-child(2) { grid-column: 2 !important; grid-row: 1 !important; }
        .hardware-module-root .hardware-device-table .hardware-device-table-row > .user-cell:nth-child(3) { grid-column: 3 !important; grid-row: 1 !important; }
        .hardware-module-root .hardware-device-table .hardware-device-table-row > .user-cell:nth-child(4) { grid-column: 4 !important; grid-row: 1 !important; }
        .hardware-module-root .hardware-device-table .hardware-device-table-row > .user-cell:nth-child(5) { grid-column: 5 !important; grid-row: 1 !important; }
        .hardware-module-root .hardware-device-table .hardware-device-table-row > .user-cell:nth-child(6) { grid-column: 6 !important; grid-row: 1 !important; }
        .hardware-module-root .hardware-device-table .hardware-device-table-row > .user-cell:nth-child(7) { grid-column: 7 !important; grid-row: 1 !important; }

        .hardware-module-root .hardware-device-table .hardware-device-table-row > .user-cell,
        .hardware-module-root .hardware-device-table .hardware-standard-row.hardware-device-table-row > .user-cell {
          min-width: 0 !important;
          max-width: 100% !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
        }

        .hardware-module-root .hardware-device-table .head.hardware-device-table-row > .user-cell {
          min-height: 44px !important;
          white-space: nowrap !important;
        }

        .hardware-module-root .hardware-location-cell,
        .hardware-module-root .hardware-network-cell {
          min-width: 0 !important;
          max-width: 100% !important;
          overflow: hidden !important;
          display: grid !important;
          gap: 0.12rem !important;
          align-content: center !important;
        }

        .hardware-module-root .hardware-location-cell strong,
        .hardware-module-root .hardware-location-cell small,
        .hardware-module-root .hardware-network-cell strong,
        .hardware-module-root .hardware-network-cell small,
        .hardware-module-root .hardware-model-text,
        .hardware-module-root .hardware-date-cell {
          max-width: 100% !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
        }

        .hardware-module-root .hardware-user-name strong,
        .hardware-module-root .hardware-user-name small,
        .hardware-module-root .hardware-user-name em,
        .hardware-module-root .hardware-model-text,
        .hardware-module-root .hardware-date-cell {
          max-width: 100% !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
        }

        .hardware-module-root .hardware-location-cell,
        .hardware-module-root .hardware-network-cell {
          display: flex !important;
          flex-direction: column !important;
          align-items: flex-start !important;
          justify-content: center !important;
          gap: 0.18rem !important;
          min-width: 0 !important;
        }

        .hardware-module-root .hardware-location-cell strong,
        .hardware-module-root .hardware-network-cell strong {
          display: block !important;
          max-width: 100% !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
          font-size: 0.76rem !important;
          font-weight: 900 !important;
          color: #102a5a !important;
          line-height: 1.1 !important;
        }

        .hardware-module-root .hardware-location-cell small {
          display: block !important;
          max-width: 100% !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
          color: #64748b !important;
          font-size: 0.66rem !important;
          font-weight: 800 !important;
          line-height: 1.15 !important;
        }

        @media (max-width: 1100px) {
          .hardware-module-root .settings-layout.hardware-settings-layout {
            grid-template-columns: 1fr !important;
          }

          .hardware-module-root .settings-menu.hardware-left-panel {
            min-width: 0 !important;
          }
        }



        /* Hardware registry table vertical-scroll fix.
           Keep toolbar + summary + pagination visible, and scroll only the device rows/table area. */
        .hardware-module-root .hardware-settings-content,
        .hardware-module-root .hardware-main-grid {
          min-height: 0 !important;
          overflow: hidden !important;
        }

        .hardware-module-root .hardware-registry-card {
          display: flex !important;
          flex-direction: column !important;
          min-height: 0 !important;
          max-height: calc(100dvh - 196px) !important;
          overflow: hidden !important;
        }

        .hardware-module-root .hardware-registry-toolbar,
        .hardware-module-root .hardware-registry-subhead,
        .hardware-module-root .hardware-pagination {
          flex: 0 0 auto !important;
        }

        .hardware-module-root .hardware-device-table.hardware-standard-table {
          flex: 1 1 auto !important;
          min-height: 260px !important;
          max-height: min(54vh, 560px) !important;
          overflow-y: auto !important;
          overflow-x: auto !important;
          padding-bottom: 0 !important;
          scrollbar-gutter: stable !important;
          -webkit-overflow-scrolling: touch !important;
        }

        .hardware-module-root .hardware-device-table.hardware-standard-table::-webkit-scrollbar {
          width: 8px !important;
          height: 8px !important;
        }

        .hardware-module-root .hardware-device-table.hardware-standard-table::-webkit-scrollbar-track {
          background: rgba(226, 232, 240, 0.58) !important;
          border-radius: 999px !important;
        }

        .hardware-module-root .hardware-device-table.hardware-standard-table::-webkit-scrollbar-thumb {
          background: rgba(100, 116, 139, 0.62) !important;
          border-radius: 999px !important;
          border: 2px solid rgba(248, 250, 252, 0.9) !important;
        }

        .hardware-module-root .hardware-device-table .head.hardware-device-table-row {
          position: sticky !important;
          top: 0 !important;
          z-index: 8 !important;
          background: #f3f6fb !important;
          box-shadow: 0 1px 0 rgba(203, 213, 225, 0.85) !important;
        }

        .hardware-module-root .hardware-device-table .hardware-device-row {
          min-height: 58px !important;
        }

        @media (max-height: 760px) {
          .hardware-module-root .hardware-registry-card {
            max-height: calc(100dvh - 168px) !important;
          }

          .hardware-module-root .hardware-device-table.hardware-standard-table {
            max-height: min(48vh, 440px) !important;
          }
        }


        /* Hardware toolbar layout fix: keep actions, search, refresh and filters aligned. */
        .hardware-module-root .hardware-registry-toolbar.hardware-registry-toolbar-stacked {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) !important;
          align-items: stretch !important;
          gap: 12px !important;
          width: 100% !important;
          min-width: 0 !important;
        }

        .hardware-module-root .hardware-scan-command-row {
          display: grid !important;
          grid-template-columns: max-content max-content max-content minmax(280px, 1fr) 42px max-content !important;
          align-items: center !important;
          gap: 10px !important;
          width: 100% !important;
          min-width: 0 !important;
          flex-wrap: nowrap !important;
        }

        .hardware-module-root .hardware-command-btn {
          height: 38px;
          min-width: 132px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 0 16px;
          border: 1px solid #a9befd;
          border-radius: 13px;
          background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
          color: #1858ff;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: -0.01em;
          white-space: nowrap;
          box-shadow: 0 10px 24px rgba(40, 85, 200, 0.08);
          transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
        }

        .hardware-command-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          border-color: #6f8fff;
          box-shadow: 0 14px 28px rgba(40, 85, 200, 0.14);
        }

        .hardware-command-btn:disabled {
          color: #9eb0e8;
          background: #f8faff;
          border-color: #d4ddff;
          box-shadow: none;
          cursor: not-allowed;
        }

        .hardware-command-btn-muted b {
          padding: 3px 8px;
          border-radius: 999px;
          background: #e9efff;
          color: #1858ff;
          font-size: 11px;
          line-height: 1;
        }

        .hardware-module-root .hardware-toolbar-search {
          flex: 1 1 auto !important;
          width: 100% !important;
          min-width: 0 !important;
          max-width: none !important;
          height: 38px !important;
        }

        .hardware-module-root .hardware-toolbar-refresh {
          flex: 0 0 auto !important;
          width: 42px !important;
          height: 38px !important;
          justify-self: end !important;
          align-self: center !important;
        }

        .hardware-module-root .hardware-toolbar-export {
          flex: 0 0 auto !important;
          height: 38px !important;
          min-width: 92px !important;
          justify-self: end !important;
          align-self: center !important;
          border-color: #0b7ed7 !important;
          background: linear-gradient(135deg, #1d6fd7 0%, #0b83c7 100%) !important;
          color: #ffffff !important;
          box-shadow: 0 14px 28px rgba(11, 126, 215, 0.22) !important;
        }

        .hardware-module-root .hardware-toolbar-export:hover:not(:disabled) {
          border-color: #075fa7 !important;
          box-shadow: 0 18px 34px rgba(11, 126, 215, 0.28) !important;
        }

        .hardware-module-root .hardware-toolbar-export:disabled {
          border-color: #cbd5e1 !important;
          background: #eff4fb !important;
          color: #94a3b8 !important;
          box-shadow: none !important;
        }

        .hardware-module-root .hardware-registry-filter-row {
          display: grid !important;
          grid-template-columns: minmax(210px, 240px) minmax(210px, 240px) max-content !important;
          justify-content: end !important;
          align-items: end !important;
          gap: 10px !important;
          width: 100% !important;
          min-width: 0 !important;
        }

        .hardware-module-root .hardware-filter-group,
        .hardware-module-root .hardware-custom-select,
        .hardware-module-root .hardware-custom-select-trigger {
          min-width: 0 !important;
          width: 100% !important;
        }

        .hardware-module-root .hardware-clear-filters-btn {
          height: 38px !important;
          align-self: end !important;
          white-space: nowrap !important;
        }

        /* Hardware toast position fix: always top-right, not bottom-right. */
        .hardware-module-root .hardware-toast,
        body .hardware-toast {
          position: fixed !important;
          top: 86px !important;
          right: 24px !important;
          bottom: auto !important;
          left: auto !important;
          z-index: 2147483647 !important;
          max-width: min(26rem, calc(100vw - 32px)) !important;
          pointer-events: auto !important;
          display: flex !important;
          align-items: flex-start !important;
          gap: 12px !important;
          padding: 16px 18px !important;
          border: 1px solid #bfdbfe !important;
          border-radius: 18px !important;
          background: #ffffff !important;
          box-shadow: 0 18px 42px rgba(15, 23, 42, 0.16) !important;
        }

        .hardware-module-root .hardware-toast-icon,
        body .hardware-toast .hardware-toast-icon {
          width: 40px !important;
          height: 40px !important;
          flex: 0 0 40px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          border-radius: 14px !important;
          color: #2563eb !important;
          background: #eff6ff !important;
          border: 1px solid #bfdbfe !important;
        }

        .hardware-module-root .hardware-toast-success,
        body .hardware-toast-success {
          border-color: #bbf7d0 !important;
        }

        .hardware-module-root .hardware-toast-success .hardware-toast-icon,
        body .hardware-toast-success .hardware-toast-icon {
          color: #16a34a !important;
          background: #dcfce7 !important;
          border-color: #bbf7d0 !important;
        }

        .hardware-module-root .hardware-toast-error,
        .hardware-module-root .hardware-toast-delete,
        body .hardware-toast-error,
        body .hardware-toast-delete {
          border-color: #fecaca !important;
        }

        .hardware-module-root .hardware-toast-error .hardware-toast-icon,
        .hardware-module-root .hardware-toast-delete .hardware-toast-icon,
        body .hardware-toast-error .hardware-toast-icon,
        body .hardware-toast-delete .hardware-toast-icon {
          color: #dc2626 !important;
          background: #fee2e2 !important;
          border-color: #fecaca !important;
        }

        .hardware-module-root .hardware-toast-info,
        body .hardware-toast-info {
          border-color: #bfdbfe !important;
        }

        .hardware-module-root .hardware-toast-info .hardware-toast-icon,
        body .hardware-toast-info .hardware-toast-icon {
          color: #2563eb !important;
          background: #eff6ff !important;
          border-color: #bfdbfe !important;
        }

        @media (max-width: 720px) {
          .hardware-module-root .hardware-toast,
          body .hardware-toast {
            top: 18px !important;
            right: 16px !important;
            left: 16px !important;
            bottom: auto !important;
            width: auto !important;
            max-width: none !important;
          }
        }



        .hardware-stat-summary-layout {
          padding: 18px 18px 16px;
        }

        .hardware-stat-summary-total {
          margin-bottom: 18px;
          color: #1559ff;
          font-size: 15px;
          font-weight: 900;
          letter-spacing: -0.01em;
        }

        .hardware-stat-summary-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 12px;
          color: #0f2854;
        }

        .hardware-stat-summary-table thead tr {
          background: #2847a8;
        }

        .hardware-stat-summary-table thead th {
          padding: 11px 14px;
          color: #ffffff !important;
          font-size: 10px;
          line-height: 1.2;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          text-align: left;
          border: 0;
        }

        .hardware-stat-summary-table tbody td {
          padding: 12px 14px;
          font-weight: 700;
          border-bottom: 1px solid rgba(226, 232, 240, 0.85);
          background: #ffffff;
        }

        .hardware-stat-summary-table tbody td:nth-child(2) {
          background: #e8f1ff;
          color: #0639b7;
        }

        .hardware-stat-summary-table tbody td:nth-child(3) {
          background: #eefcf4;
          color: #047857;
        }

        .hardware-stat-summary-reference {
          margin-top: 16px;
          color: #8b9ab5;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        @media (max-width: 1250px) {
          .hardware-module-root .hardware-scan-command-row {
            grid-template-columns: repeat(3, minmax(132px, 1fr)) 42px max-content !important;
          }

          .hardware-module-root .hardware-toolbar-search {
            grid-column: 1 / -3 !important;
            grid-row: 2 !important;
          }

          .hardware-module-root .hardware-toolbar-refresh {
            grid-column: -3 / -2 !important;
            grid-row: 2 !important;
          }

          .hardware-module-root .hardware-toolbar-export {
            grid-column: -2 / -1 !important;
            grid-row: 2 !important;
          }
        }

        @media (max-width: 1100px) {
          .hardware-module-root .hardware-registry-filter-row {
            grid-template-columns: 1fr !important;
            justify-content: stretch !important;
          }
          .hardware-module-root .hardware-toolbar-search {
            flex-basis: 100% !important;
          }
        }

        @media (max-width: 760px) {
          .hardware-module-root .hardware-scan-command-row {
            grid-template-columns: 1fr !important;
          }

          .hardware-module-root .hardware-toolbar-search,
          .hardware-module-root .hardware-toolbar-refresh,
          .hardware-module-root .hardware-toolbar-export {
            grid-column: auto !important;
            grid-row: auto !important;
            width: 100% !important;
            justify-self: stretch !important;
          }
        }
      `}</style>
      <input aria-hidden="true" id="globalSearch" type="hidden" />
      <button hidden id="themeBtn" type="button">
        <span id="themeLabel">Dark Mode</span>
      </button>

      <div className="settings-layout hardware-settings-layout d-grid gap-3">
        <aside className="settings-menu hardware-left-panel ema-panel-surface">
          <div className="panel-head">
            <span>HARDWARE</span>
            <strong>Hardware Inventory</strong>
            <small>Manage hardware folders and device records.</small>
          </div>

          <nav className="settings-menu-list ema-module-sidebar-nav ema-module-sidebar-switcher" id="hardwareMenu" role="tablist" aria-label="Hardware navigation">
            <button
              type="button"
              className={`setting-btn ${activeTab === "organization" ? "active" : ""}`}
              onClick={() => setActiveTab("organization")}
            >
              <span className="setting-icon"><FolderOpen size={16} /></span>
              <span><strong>Branch</strong><small>Branch device scope</small></span>
            </button>
            <button
              type="button"
              className={`setting-btn ${activeTab === "statistics" ? "active" : ""}`}
              onClick={() => setActiveTab("statistics")}
            >
              <span className="setting-icon"><Database size={16} /></span>
              <span><strong>Statistics</strong><small>Hardware operational views</small></span>
            </button>
          </nav>

          <div className="ema-sidebar-content">
            <div className="ema-sidebar-subpanel">
              {activeTab === "organization" ? (
                <>
                  <div className="section-search ema-sidebar-field">
                    <Search size={15} />
                    <input value={searchHierarchy} onChange={(event) => setSearchHierarchy(event.target.value)} placeholder="Search branches..." />
                  </div>

                  <button type="button" className="soft-btn d-inline-flex align-items-center gap-1 px-2" onClick={() => handleAddFolder()}><FolderPlus size={13} /> New Branch Path</button>

                  <div className="ema-sidebar-tree" aria-label="Hardware location tree">
                    {treeNodes.map((node) => (
                      <FolderTree
                        key={node.key}
                        node={node}
                        depth={0}
                        selectedKey={selectedFolderKey}
                        expandedKeys={expandedKeys}
                        folderMenuKey={folderMenuKey}
                        search={searchHierarchy}
                        countMap={folderDeviceCountMap}
                        onSelect={handleFolderSelect}
                        onToggle={handleFolderToggle}
                        onMenu={setFolderMenuKey}
                        onAdd={handleAddFolder}
                        onRename={handleRenameFolder}
                        onDelete={handleDeleteFolder}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="settings-helper-card ema-sidebar-scope-card">
                    <strong>{selectedFolderLabel}</strong>
                    <span>{getSelectedRelationID() === -1 ? "All departments" : "Selected folder"}</span>
                  </div>

                  <div className="ema-sidebar-tree" aria-label="Hardware statistics tree">
                    <div className="ema-sidebar-section-title"><Database size={14} /><span>Statistics</span></div>
                    {statisticTree.map((node) => renderStatisticTreeNode(node))}
                  </div>
                </>
              )}
            </div>
          </div>
        </aside>

        <section className="settings-content hardware-settings-content d-grid gap-3">
          <div className="settings-hero hardware-hero ema-panel-surface">
            <div>
              <span className="eyebrow">ENDPOINT OPERATIONS</span>
              <h2>{activeTab === "statistics" ? "Hardware Statistics" : "Device Registry"}</h2>
              <p>Live hardware inventory with device actions, location view, remote support and security controls.</p>
            </div>
            <div className="hardware-hero-score">
              {kpiCards.map((card) => (
                <button
                  key={card.key}
                  type="button"
                  className={`hardware-kpi-card ${card.color} ${activeKpiFilter === card.key ? "is-active" : ""} ${
                    card.key === "stale" || card.key === "locked" ? "is-attention" : ""
                  }`}
                  onClick={() => handleKpiFilterClick(card.key)}
                  aria-pressed={activeKpiFilter === card.key}
                >
                  <div className="hardware-kpi-content">
                    <i className="hardware-kpi-icon">{card.icon}</i>
                    <span className="hardware-kpi-label">{card.title}</span>
                    <strong className="hardware-kpi-value">{card.value}</strong>
                    <small className="hardware-kpi-note">{card.subtitle}</small>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className={`hardware-main-grid ${hasSelectedDevice && !showDeviceDetails ? "has-inspector" : ""}`}>
        <section className="content-shell hardware-card hardware-registry-card ema-panel-surface">
        {activeTab === "statistics" ? renderStatisticsWorkbench() : (
          <>

          <div ref={hardwareRegistryToolbarRef} className="hardware-registry-toolbar hardware-registry-toolbar-stacked">
            <div className="hardware-scan-command-row">
              {/* <button
                type="button"
                className="hardware-command-btn hardware-command-btn-muted"
                onClick={() => setActiveTab("statistics")}
                title="Open hardware statistics and insights"
              >
                <Database size={15} />
                <span>Insights</span>
                <b>0%</b>
              </button> */}

              <button
                type="button"
                className="hardware-command-btn"
                onClick={() => void handleScanHardware("device")}
                disabled={hardwareScanLoading || !hasSelectedDevice || String(selectedDevice.objectAgent || "EM").toUpperCase() !== "EM"}
                title={!hasSelectedDevice ? "Select a device first" : String(selectedDevice.objectAgent || "EM").toUpperCase() !== "EM" ? "Only supported Windows/EM devices can be scanned" : `Refresh hardware inventory for ${selectedDevice.name}`}
              >
                <Monitor size={15} />
                {hardwareScanLoading ? "Scanning..." : "Scan Device"}
              </button>

              <button
                type="button"
                className="hardware-command-btn"
                onClick={() => void handleScanHardware("folder")}
                disabled={hardwareScanLoading || getSelectedRelationID() === -1}
                title={getSelectedRelationID() === -1 ? "Select a folder first, or use Scan All" : `Refresh hardware inventory for ${selectedFolderLabel}`}
              >
                <FolderOpen size={15} />
                Scan Folder
              </button>

              <button
                type="button"
                className="hardware-command-btn"
                onClick={() => void handleScanHardware("all")}
                disabled={hardwareScanLoading}
                title="Refresh hardware inventory for all EM/Windows devices"
              >
                <RefreshCw size={15} />
                {hardwareScanLoading ? "Scanning..." : "Scan All"}
              </button>

              <div className="hardware-search-box small hardware-search-box-with-clear hardware-toolbar-search">
                <Search size={15} />
                <input
                  type="text"
                  placeholder="Search devices, IPs, users..."
                  value={searchDevices}
                  onChange={(event) => {
                    setSearchDevices(event.target.value);
                    setPage(1);
                    setNote("Device panel remains open until you close it.");
                  }}
                />
                {searchDevices && (
                  <button
                    type="button"
                    className="hardware-search-clear"
                    onClick={() => {
                      setSearchDevices("");
                      setPage(1);
                      setNote("Device panel remains open until you close it.");
                    }}
                    aria-label="Clear device search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <button type="button" className="hardware-icon-btn hardware-toolbar-refresh" onClick={handleRefresh} title="Refresh inventory">
                <RefreshCw size={16} />
              </button>

              <button
                type="button"
                className="hardware-command-btn hardware-toolbar-export"
                onClick={handleExportHardwareTable}
                disabled={!filteredDevices.length}
                title="Export current table data"
              >
                <Download size={15} />
                Export
              </button>
            </div>

            <div className="hardware-registry-filters hardware-registry-filter-row">
              <div className="hardware-filter-group">
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

              <div className="hardware-filter-group">
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

              <button type="button" className="hardware-clear-filters-btn" onClick={clearTableFilters} disabled={!searchDevices && activeTableFilterCount === 0}>
                <X size={14} />
                Reset
              </button>
            </div>
          </div>

          <div className="hardware-registry-subhead">
            <div>
              <span>
                {selectedFolderLabel} scope
                {activeKpiFilter !== "all" ? ` • KPI filter: ${activeKpiLabel}` : ""}
                {activeTableFilterCount ? ` • Table filters: ${activeTableFilterCount}` : ""}
                {searchDevices ? ` • Search: ${searchDevices}` : ""}
                {inventoryLoading ? " • Loading device data..." : ""}
                {apiError ? " • Note: Some records could not be refreshed." : ""}
              </span>
            </div>
          </div>

          <div className="user-access-table advanced clean-table hardware-standard-table hardware-device-table">
            <div className="user-row head advanced clean-table-row hardware-standard-row hardware-device-table-row">
              <div className="user-cell">No</div>
              <div className="user-cell">
                <button type="button" className="hardware-sort-btn" onClick={() => handleSort("name")}>
                  Device {renderSortIndicator("name")}
                </button>
              </div>
              <div className="user-cell">
                <button type="button" className="hardware-sort-btn" onClick={() => handleSort("groupPath")}>
                  Branch {renderSortIndicator("groupPath")}
                </button>
              </div>
              <div className="user-cell">
                <button type="button" className="hardware-sort-btn" onClick={() => handleSort("platformModel")}>
                  Platform / Model {renderSortIndicator("platformModel")}
                </button>
              </div>
              <div className="user-cell">
                <button type="button" className="hardware-sort-btn" onClick={() => handleSort("status")}>
                  Status {renderSortIndicator("status")}
                </button>
              </div>
              <div className="user-cell">
                <button type="button" className="hardware-sort-btn" onClick={() => handleSort("lastConnected")}>
                  Last Connected {renderSortIndicator("lastConnected")}
                </button>
              </div>
              <div className="user-cell">
                <button type="button" className="hardware-sort-btn" onClick={() => handleSort("ip")}>
                  Network {renderSortIndicator("ip")}
                </button>
              </div>
            </div>

            {pagedDevices.map((device, index) => (
              <div
                role="button"
                tabIndex={0}
                key={device.id}
                className={`user-row advanced clean-table-row hardware-standard-row hardware-device-table-row hardware-device-row ${hasSelectedDevice && selectedDevice.id === device.id ? "is-selected" : ""}`}
                onClick={() => handleDeviceRowSelect(device)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") handleDeviceRowSelect(device);
                }}
              >
                <div className="user-cell row-number">
                  <span className="row-index-pill">{String((page - 1) * PAGE_SIZE + index + 1).padStart(2, "0")}</span>
                </div>
                <div className="user-cell hardware-device-main-cell">
                  <div className="user-name hardware-user-name">
                    <i className={`hardware-status-dot ${getStatusClass(device.status)}`} />
                    <div>
                      <strong
                        role="button"
                        tabIndex={0}
                        onClick={(event) => handleDeviceNameClick(event, device)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            handleDeviceNameClick(event as unknown as MouseEvent<HTMLElement>, device);
                          }
                        }}
                        title={`Open full details for ${device.name}`}
                      >
                        {device.name}
                      </strong>
                      <small>{device.owner} / {device.department}</small>
                      <em>{device.deviceIdentifier ?? device.id}</em>
                    </div>
                  </div>
                </div>
                <div className="user-cell hardware-location-cell">
                  <strong>{device.department}</strong>
                  <small title={device.groupPath}>{device.groupPath}</small>
                </div>
                <div className="user-cell"><span className="hardware-model-text">{device.platformModel}</span></div>
                <div className="user-cell"><span className={`user-pill hardware-status-pill ${getStatusClass(device.status)}`}>{device.status}</span></div>
                <div className="user-cell"><span className="muted-cell hardware-date-cell">{device.lastConnected}</span></div>
                <div className="user-cell hardware-network-cell">
                  <strong>{device.ip}</strong>
                </div>
              </div>
            ))}

            {pagedDevices.length === 0 && (
              <div className="settings-empty-state hardware-empty-state">{inventoryLoading ? "Loading hardware inventory..." : "No device found for current filter/search."}</div>
            )}
          </div>

          <div className="uam-pagination global-style hardware-pagination">
            <div className="uam-page-summary hardware-page-summary">Page {page} of {pageCount}</div>
            <div className="uam-pagination-controls global-style hardware-pagination-actions" aria-label="Hardware inventory pagination">
              <button className="uam-page-icon" type="button" onClick={() => { setPage(1); setNote("Device panel remains open until you close it."); }} disabled={page === 1} aria-label="First page">
                «
              </button>
              <button className="uam-page-icon" type="button" onClick={() => { setPage((current) => Math.max(1, current - 1)); setNote("Device panel remains open until you close it."); }} disabled={page === 1} aria-label="Previous page">
                ‹
              </button>
              <span className="uam-page-current hardware-pagination-current">{page}</span>
              <button className="uam-page-icon" type="button" onClick={() => { setPage((current) => Math.min(pageCount, current + 1)); setNote("Device panel remains open until you close it."); }} disabled={page === pageCount} aria-label="Next page">
                ›
              </button>
              <button className="uam-page-icon" type="button" onClick={() => { setPage(pageCount); setNote("Device panel remains open until you close it."); }} disabled={page === pageCount} aria-label="Last page">
                »
              </button>
            </div>
          </div>
          </>
        )}
      
      </section>

      {hasSelectedDevice && !showDeviceDetails && (
      <aside ref={hardwareQuickPanelRef} className="hardware-card hardware-right-panel ema-panel-surface">
        <div className="hardware-right-device">
          <div className="hardware-right-header">
            <div className="hardware-right-icon">
              <Monitor size={20} />
            </div>
            <div className="hardware-right-title">
              <h3>{selectedDevice.name}</h3>
              <p>
                {selectedDevice.os} • {selectedDevice.ip}
              </p>
            </div>
            <button
              type="button"
              className="hardware-right-close"
              onClick={() => clearSelectedDevice("Device actions panel closed.")}
              aria-label="Close device actions panel"
              title="Close panel"
            >
              <X size={18} />
            </button>
          </div>

          <div className="hardware-action-list">
            <button type="button" className="hardware-action-item is-action-message" onClick={() => setActiveModal("message")} disabled={messageLoading}>
              <div className="hardware-action-icon">
                <Send size={16} />
              </div>
              <div>
                <strong>Send Message</strong>
                <span>Notify the device user</span>
              </div>
            </button>

            <button type="button" className="hardware-action-item is-action-remote" onClick={() => setActiveModal("remote")}>
              <div className="hardware-action-icon">
                <Monitor size={16} />
              </div>
              <div>
                <strong>Advanced Remote Control</strong>
                <span>Start a secure support session</span>
              </div>
            </button>

            <button type="button" className="hardware-action-item is-action-geo" onClick={openGeolocationModal} disabled={geoLoading}>
              <div className="hardware-action-icon">
                <MapPin size={16} />
              </div>
              <div>
                <strong>Device Geolocation</strong>
                <span>View latest location and movement history</span>
              </div>
            </button>

            {selectedDevice.status === "Locked" ? (
              <button type="button" className="hardware-action-item is-action-unlock" onClick={() => void handleLockUnlockDevice("unlock")} disabled={lockActionLoading}>
                <div className="hardware-action-icon">
                  <Unlock size={16} />
                </div>
                <div>
                  <strong>{lockActionLoading ? "Unlocking..." : "Unlock Device"}</strong>
                  <span>Restore access for this device</span>
                </div>
              </button>
            ) : (
              <button type="button" className="hardware-action-item is-action-lock" onClick={() => setActiveModal("lock")} disabled={lockActionLoading}>
                <div className="hardware-action-icon">
                  <Lock size={16} />
                </div>
                <div>
                  <strong>Lock Device</strong>
                  <span>Temporarily restrict this device</span>
                </div>
              </button>
            )}


            <button type="button" className="hardware-action-item is-action-move" onClick={openMoveDepartmentModal}>
              <div className="hardware-action-icon">
                <Database size={16} />
              </div>
              <div>
                <strong>Move Department</strong>
                <span>Move this device to another folder</span>
              </div>
            </button>
          </div>
        </div>
      </aside>
      )}
          </div>
        </section>
      </div>

      <DeviceDetailsDrawer device={detailDevice} isOpen={hasDetailDevice} onClose={closeDeviceDetails} />

      {toast && (
        <div className={`hardware-toast hardware-toast-${toast.type}`} role="status">
          <div className="hardware-toast-icon">{toast.type === "success" ? <CheckCircle size={18} /> : toast.type === "delete" ? <Trash2 size={18} /> : <AlertCircle size={18} />}</div>
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
                <input autoFocus type="text" value={folderNameInput} disabled={folderCreateLoading} onChange={(event) => setFolderNameInput(event.target.value)} placeholder="Example: Johor, Kuala Lumpur, HQ" />
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
          <div className="hardware-modal hardware-modal-colored hardware-move-modal" onClick={(event) => event.stopPropagation()}>
            <div className="hardware-modal-header blue">
              <div className="hardware-modal-title">
                <Database size={20} />
                <div>
                  <strong>MOVE DEPARTMENT</strong>
                  <span>Move selected device to another folder</span>
                </div>
              </div>
              <button type="button" className="hardware-modal-close inverse" onClick={closeModal} disabled={moveLoading}>
                <X size={18} />
              </button>
            </div>
            <div className="hardware-modal-body hardware-move-modal-body">
              <div className="hardware-info-banner blue hardware-move-current-card">
                <AlertCircle size={16} />
                <div>
                  <strong>{selectedDevice.name}</strong>
                  <span>Current location: {selectedDevice.groupPath || selectedDevice.department || "-"}</span>
                </div>
              </div>
              <div className="hardware-form-group hardware-move-select-group">
                <label>Destination Folder</label>
                <HardwareDropdown
                  label="Destination folder"
                  value={moveTargetKey}
                  onChange={setMoveTargetKey}
                  disabled={moveLoading || departmentOptions.length === 0}
                  placeholder="No folder available"
                  options={
                    departmentOptions.length === 0
                      ? [{ value: "", label: "No folder available" }]
                      : departmentOptions.map((department) => ({ value: department.key, label: department.groupPath }))
                  }
                />
                <p className="hardware-move-helper">Choose the folder where this device should be placed.</p>
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
                    <span>This will send the message to all matching devices for this platform.</span>
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
                  <strong>Remote assistance</strong>
                  <span>Choose a support mode and start a secure remote session for this device.</span>
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
                  <span>Notify the user before the support session starts</span>
                </div>
              </label>
              <label className="hardware-option-card">
                <input type="checkbox" checked={recordSession} onChange={(event) => setRecordSession(event.target.checked)} disabled={remoteLoading} />
                <div>
                  <strong>Record Session</strong>
                  <span>Keep a session recording for review</span>
                </div>
              </label>
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
                  <span>{selectedDevice.name} • Location history</span>
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
                        <iframe title={`Map for ${selectedDevice.name}`} src={geoMeta.mapEmbedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
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
                        <span>{geoLoading ? "Loading current location..." : "No location has been recorded for this device yet."}</span>
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

                    <div className="uam-pagination global-style hardware-geo-pagination">
                      <div className="uam-page-summary hardware-geo-page-summary">Page {geoHistoryCurrentPage} of {geoHistoryTotalPages}</div>
                      <div className="uam-pagination-controls global-style hardware-geo-pagination-actions" aria-label="Device location history pagination">
                        <button
                          className="uam-page-icon"
                          type="button"
                          onClick={() => setGeoHistoryPage(1)}
                          disabled={geoHistoryCurrentPage <= 1}
                          aria-label="First location history page"
                        >
                          «
                        </button>
                        <button
                          className="uam-page-icon"
                          type="button"
                          onClick={() => setGeoHistoryPage((current) => Math.max(1, current - 1))}
                          disabled={geoHistoryCurrentPage <= 1}
                          aria-label="Previous location history page"
                        >
                          ‹
                        </button>
                        <span className="uam-page-current hardware-geo-pagination-current">{geoHistoryCurrentPage}</span>
                        <button
                          className="uam-page-icon"
                          type="button"
                          onClick={() => setGeoHistoryPage((current) => Math.min(geoHistoryTotalPages, current + 1))}
                          disabled={geoHistoryCurrentPage >= geoHistoryTotalPages}
                          aria-label="Next location history page"
                        >
                          ›
                        </button>
                        <button
                          className="uam-page-icon"
                          type="button"
                          onClick={() => setGeoHistoryPage(geoHistoryTotalPages)}
                          disabled={geoHistoryCurrentPage >= geoHistoryTotalPages}
                          aria-label="Last location history page"
                        >
                          »
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="hardware-geo-history-empty-modern">
                    <MapPin size={24} />
                    <strong>{geoLoading ? "Loading location history..." : "No location history"}</strong>
                    <span>{geoLoading ? "The latest records will appear here automatically." : "No location history is available for this device yet."}</span>
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
    </main>
  );
}
