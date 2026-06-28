import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpDown,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Database,
  Download,
  FileText,
  Folder,
  FolderOpen,
  HardDrive,
  Layers,
  MonitorSmartphone,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";

type ApiSoftwareRecord = {
  SoftwareID?: number | string | null;
  SoftwareName?: string | null;
  CategoryName?: string | null;
  Publisher?: string | null;
  Version?: string | null;
  Username?: string | null;
  LastUpdated?: string | null;
  AssetID?: string | null;
  AssetTag?: string | null;
  MachineType?: string | null;
  OS?: string | null;
  ComputerName?: string | null;
  IP?: string | null;
  Department?: string | null;
  AgentStatus?: string | number | null;
  Description?: string | null;
  VisibilityStatus?: string | number | null;
  Object_Agent?: string | null;
  Object_DeviceID?: string | null;
  RawSoftwareID?: string | number | null;
  RawSoftwareName?: string | number | null;
};

type DepartmentNode = {
  Object_Rel_Idn: number;
  Object_Rel_Name?: string;
  Object_Full_Name?: string;
  Object_PR_Idn?: number;
  children?: DepartmentNode[];
};

type AssetItem = Record<string, unknown> & {
  _Idn?: number;
  id?: number;
  MDM_Asset_Idn?: number;
  Object_Root_Idn?: number;
  Object_Agent?: string;
  objectAgent?: string;
  ComputerName?: string;
  DeviceName?: string;
  AssetName?: string;
  Object_DeviceID?: string;
  DeviceID?: string;
  PlatformType?: string;
  ConnectionStatus?: string;
  IP?: string;
};

type TreeNode = {
  id: string;
  label: string;
  type: "org" | "branch" | "dept" | "device" | "category" | "sub";
  children?: TreeNode[];
  relationId?: number;
  assetId?: number;
  objectAgent?: string;
  objectDeviceId?: string;
  platformType?: string;
  connectionStatus?: string;
  ip?: string;
  count?: number;
  devicesLoaded?: boolean;
  devicesLoading?: boolean;
};

type SoftwareRecord = {
  id: string;
  softwareName: string;
  category: string;
  publisher: string;
  description: string;
  version: string;
  username: string;
  lastUpdated: string;
  assetId: string;
  assetTag: string;
  deviceName: string;
  machineType: string;
  os: string;
  ip: string;
  department: string;
  agentStatus: string;
  objectAgent: string;
  objectDeviceId: string;
  raw: ApiSoftwareRecord;
};

type TableKey = "registry" | "installedSoftware" | "licenseStatus" | "fileExtensionExe" | "fileExtensionDll" | "fileExtensionIni";
type SelectionMode = "registry" | "folder" | "device" | "statistic";
type SidebarTab = "organization" | "statistic";
type SortKey = "softwareName" | "category" | "publisher" | "version" | "deviceName" | "machineType" | "ip" | "lastUpdated";
type SortDirection = "asc" | "desc";
type ActiveView = "all" | "unique" | "installed" | "categories" | "unclassified";

type SelectedContext = {
  mode: SelectionMode;
  tableKey: TableKey;
  label: string;
  relationId?: number;
  assetId?: number;
  objectAgent?: string;
  objectDeviceId?: string;
};

type ToastState = {
  type: "success" | "error" | "info";
  title: string;
  message: string;
} | null;

type ApiRowsPayload = unknown[] | { data?: unknown[] | Record<string, unknown>; success?: boolean; totalRecords?: number };

function resolveApiBaseUrl() {
  const envUrl = ((import.meta.env.VITE_API_BASE_URL as string | undefined) || (import.meta.env.VITE_API_URL as string | undefined) || "").trim();
  if (envUrl) return envUrl.replace(/\/$/, "");

  return "";
}

const API_BASE_CANDIDATES = [resolveApiBaseUrl()];

const PAGE_SIZE = 10;
const EMPTY_VALUE = "-";

const tableColumns: Record<TableKey, string[]> = {
  registry: ["Software Name", "Category", "Publisher / Description", "Version", "Device", "Type", "IP Address", "Last Updated"],
  installedSoftware: ["Original Software Name", "License Limit", "Used", "Classification", "Custom Info", "Software Name", "Expiry Date"],
  licenseStatus: ["Application Package", "Manufacturer", "Authorization", "Used", "Search Date", "Classification", "Detail"],
  fileExtensionExe: ["File Name", "Count"],
  fileExtensionDll: ["File Name", "Count"],
  fileExtensionIni: ["File Name", "Count"],
};

const statisticTree: TreeNode[] = [
  { id: "stat-installed", label: "Installed Software", type: "category", children: [] },
  {
    id: "stat-extension",
    label: "File Extension",
    type: "category",
    children: [
      { id: "stat-exe", label: "EXE", type: "sub" },
      { id: "stat-dll", label: "DLL", type: "sub" },
      { id: "stat-ini", label: "INI", type: "sub" },
    ],
  },
];

const fallbackDeviceTree: TreeNode[] = [
  {
    id: "org-root",
    label: "All Branches",
    type: "org",
    children: [],
    relationId: -1,
  },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function buildApiUrl(baseUrl: string, path: string) {
  if (!baseUrl) return path;
  return `${baseUrl}${path}`;
}

function isHtmlPayload(text: string, contentType: string) {
  const trimmed = text.trim().toLowerCase();
  return contentType.toLowerCase().includes("text/html") || trimmed.startsWith("<!doctype") || trimmed.startsWith("<html");
}

function safeString(value: unknown, fallback = EMPTY_VALUE) {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function cleanCategory(value: unknown) {
  const text = safeString(value, "Unclassified");
  if (text === EMPTY_VALUE) return "Unclassified";
  if (text.toLowerCase() === "uncategorized") return "Unclassified";
  return text;
}

function isEmptyDisplay(value: string) {
  return !value || value === EMPTY_VALUE || value.toLowerCase() === "unassigned";
}

function isGuidLike(value: unknown) {
  const text = safeString(value, "").trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text);
}

function isNumericOnly(value: unknown) {
  const text = safeString(value, "").trim();
  return /^\d+$/.test(text);
}

function chooseSoftwareName(record: ApiSoftwareRecord, index: number) {
  const candidates = [record.RawSoftwareID, record.SoftwareID, record.SoftwareName, record.RawSoftwareName];

  for (const candidate of candidates) {
    const text = safeString(candidate, "");
    if (!text) continue;
    if (isGuidLike(text)) continue;
    if (isNumericOnly(text)) continue;
    return text;
  }

  const fallback = safeString(record.SoftwareName || record.RawSoftwareName || record.SoftwareID, "");
  return fallback || `Software Record ${index + 1}`;
}

function formatDateTime(value: unknown) {
  const raw = safeString(value, "");
  if (!raw || raw === EMPTY_VALUE) return EMPTY_VALUE;

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;

  return date.toLocaleString("en-MY", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeForCompare(value: string) {
  return value === EMPTY_VALUE ? "" : value.toLowerCase();
}

function getStoredToken() {
  const directKeys = ["ema-access-token", "accessToken", "token", "jwtToken", "bearerToken"];

  for (const key of directKeys) {
    const value = localStorage.getItem(key);
    if (value && value.trim()) return value.trim();
  }

  const objectKeys = ["ema-auth", "auth", "user", "ema-user"];

  for (const key of objectKeys) {
    const value = localStorage.getItem(key);
    if (!value) continue;

    try {
      const parsed = JSON.parse(value) as Record<string, unknown>;
      const token =
        parsed.accessToken ||
        parsed.token ||
        parsed.jwtToken ||
        parsed.bearerToken ||
        (parsed.data as Record<string, unknown> | undefined)?.accessToken ||
        (parsed.data as Record<string, unknown> | undefined)?.token;

      if (typeof token === "string" && token.trim()) return token.trim();
    } catch {
      // ignore malformed localStorage values
    }
  }

  return "";
}

async function readJsonResponse<T>(response: Response, url: string): Promise<T> {
  const text = await response.text();
  const contentType = response.headers.get("content-type") || "";

  if (isHtmlPayload(text, contentType)) {
    throw new Error(`API returned HTML instead of JSON from ${url}.`);
  }

  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`API returned invalid JSON from ${url}.`);
  }

  if (!response.ok) {
    const apiPayload = payload as { message?: string; error?: string } | null;
    throw new Error(apiPayload?.message || apiPayload?.error || `API request failed with status ${response.status} at ${url}.`);
  }

  return payload as T;
}

async function apiGet<T>(path: string): Promise<T> {
  const token = getStoredToken();
  if (!token) throw new Error("Access token missing. Please login again.");

  let lastError: Error | null = null;
  for (const baseUrl of API_BASE_CANDIDATES) {
    const url = buildApiUrl(baseUrl, path);
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      return await readJsonResponse<T>(response, url);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }
  throw lastError || new Error(`Unable to load API path ${path}.`);
}

async function apiPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const token = getStoredToken();
  if (!token) throw new Error("Access token missing. Please login again.");

  let lastError: Error | null = null;
  for (const baseUrl of API_BASE_CANDIDATES) {
    const url = buildApiUrl(baseUrl, path);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        credentials: "include",
        body: JSON.stringify(body),
      });
      return await readJsonResponse<T>(response, url);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }
  throw lastError || new Error(`Unable to post API path ${path}.`);
}

function unwrapRows(payload: ApiRowsPayload): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (!payload || typeof payload !== "object") return [];

  const data = (payload as { data?: unknown[] | Record<string, unknown> }).data;
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === "object") {
    const firstArray = Object.values(data).find(Array.isArray);
    if (Array.isArray(firstArray)) return firstArray as Record<string, unknown>[];
    return [data as Record<string, unknown>];
  }

  return [];
}

function normalizeSoftwareRecord(record: ApiSoftwareRecord, index: number): SoftwareRecord {
  const softwareName = chooseSoftwareName(record, index);
  const assetTag = safeString(record.AssetTag || record.Object_DeviceID || record.AssetID);
  const deviceName = safeString(record.ComputerName || record.Object_DeviceID || record.AssetTag || record.AssetID);
  const description = safeString(record.Description, "");
  const publisher = safeString(record.Publisher || record.Description);

  return {
    id: `${safeString(record.SoftwareID || record.RawSoftwareID, `software-${index}`)}-${assetTag}-${index}`,
    softwareName,
    category: cleanCategory(record.CategoryName),
    publisher,
    description,
    version: safeString(record.Version),
    username: safeString(record.Username),
    lastUpdated: safeString(record.LastUpdated),
    assetId: safeString(record.AssetID),
    assetTag,
    deviceName,
    machineType: safeString(record.MachineType, "Unknown"),
    os: safeString(record.OS || record.MachineType),
    ip: safeString(record.IP),
    department: safeString(record.Department),
    agentStatus: safeString(record.AgentStatus),
    objectAgent: safeString(record.Object_Agent, "MDM"),
    objectDeviceId: safeString(record.Object_DeviceID || record.AssetTag),
    raw: record,
  };
}

function pickValue(row: Record<string, unknown>, aliases: string[], fallbackIndex = -1) {
  for (const alias of aliases) {
    if (row[alias] !== undefined && row[alias] !== null && String(row[alias]).trim() !== "") {
      return row[alias];
    }
  }

  if (fallbackIndex >= 0) {
    const values = Object.values(row);
    if (values[fallbackIndex] !== undefined && values[fallbackIndex] !== null) return values[fallbackIndex];
  }

  return EMPTY_VALUE;
}

function formatCell(value: unknown) {
  if (value === null || value === undefined || value === "") return EMPTY_VALUE;
  if (value instanceof Date) return formatDateTime(value.toISOString());
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

const columnAliases: Record<Exclude<TableKey, "registry">, string[][]> = {
  installedSoftware: [
    ["Original Software Name", "OriginalSoftwareName", "SWUNI_Alias", "SWUNI_Name", "Name", "SoftwareName", "RawSoftwareName", "Id"],
    ["License Limit", "LicenseLimit", "License_Limit", "Limit", "License", "SWUNI_License"],
    ["Used", "", "UsedCount", "InUse", "Usage", "SWUNI_Used", "TotalUsed", "Total", "Count", "Cnt", "CCount"],
    ["Classification", "CategoryName", "Category", "SW_Category", "SW_CATEGORY"],
    ["Custom Info", "CustomInfo", "Custom_Info", "Description", "Remark", "Remarks"],
    ["Software Name", "SoftwareName", "SWName", "SWUNI_Name", "SWUNI_Alias", "Name"],
    ["Expiry Date", "ExpiryDate", "ExpiredDate", "ExpireDate", "LicenseExpiry", "LicenseExpiredDate"],
  ],
  licenseStatus: [
    ["Application Package", "ApplicationPackage", "SW_Pkg_Name", "SWPkgName", "PackageName", "Pkg_Name", "Name"],
    ["Manufacturer", "Mfr", "Vendor", "Publisher"],
    ["Authorization", "License_Type_Text", "LicenseType", "AuthorizationStatus", "Status"],
    ["Used", "", "UsedCount", "IsUsed", "Usage", "TotalUsed", "Total", "Count", "Cnt", "CCount"],
    ["Search Date", "SearchDate", "Search_Date", "LastUpdated"],
    ["Classification", "CategoryName", "Category", "SW_Category"],
    ["Detail", "Description", "Remark", "Remarks", "Info"],
  ],
  fileExtensionExe: [],
  fileExtensionDll: [],
  fileExtensionIni: [],
};

const fileAliases = [
  ["File Name", "SW_OrgFileName", "SWOrgFileName", "OriginalFileName", "Original File Name", "FileName", "Filename", "File_Name", "SW_FileName", "SW_File_Name", "ProcessName", "Name"],
  ["Count", "", "Count", "Cnt", "CCount", "Total", "TotalRecords", "FileCount", "Files"],
];

columnAliases.fileExtensionExe = fileAliases;
columnAliases.fileExtensionDll = fileAliases;
columnAliases.fileExtensionIni = fileAliases;

function rowsToTableRows(tableKey: Exclude<TableKey, "registry">, rows: Record<string, unknown>[]) {
  return rows.map((row) => columnAliases[tableKey].map((aliases, index) => formatCell(pickValue(row, aliases, index))));
}

function tableKeyFromStatistic(id: string): Exclude<TableKey, "registry"> | null {
  const map: Record<string, Exclude<TableKey, "registry">> = {
    "stat-installed": "installedSoftware",
    "stat-license": "licenseStatus",
    "stat-exe": "fileExtensionExe",
    "stat-dll": "fileExtensionDll",
    "stat-ini": "fileExtensionIni",
  };
  return map[id] || null;
}

function getExtensionFromTableKey(tableKey: TableKey) {
  if (tableKey === "fileExtensionDll") return "DLL";
  if (tableKey === "fileExtensionIni") return "INI";
  return "EXE";
}

function getDepartmentName(department: DepartmentNode) {
  return department.Object_Rel_Name || department.Object_Full_Name || `Department ${department.Object_Rel_Idn}`;
}

function getDepartmentCount(department: DepartmentNode) {
  const record = department as DepartmentNode & Record<string, unknown>;
  const count = Number(record.TotalDevices ?? record.DeviceCount ?? record.AssetCount ?? record.TotalAssets ?? record.Count ?? record.count ?? 0);
  return Number.isFinite(count) ? count : 0;
}

function getSoftwareTreeCount(node: TreeNode): number {
  if (typeof node.count === "number" && Number.isFinite(node.count) && node.count > 0) return node.count;
  if (node.type === "device") return 1;
  return (node.children || []).reduce((total, child) => total + getSoftwareTreeCount(child), 0);
}

function mapDepartmentsToTree(departments: DepartmentNode[], depth = 0): TreeNode[] {
  return departments.map((department) => {
    const children = mapDepartmentsToTree(department.children || [], depth + 1);
    const explicitCount = getDepartmentCount(department);
    return {
      id: `dept-${department.Object_Rel_Idn}`,
      label: getDepartmentName(department),
      type: depth <= 0 ? "branch" : "dept",
      relationId: department.Object_Rel_Idn,
      count: explicitCount || children.reduce((total, child) => total + getSoftwareTreeCount(child), 0),
      children,
      devicesLoaded: false,
      devicesLoading: false,
    };
  });
}

function buildDeviceTreeFromDepartments(departments: DepartmentNode[]): TreeNode[] {
  const children = mapDepartmentsToTree(departments);
  return [{ id: "org-root", label: "All Branches", type: "org", relationId: -1, count: children.reduce((total, child) => total + getSoftwareTreeCount(child), 0), children }];
}

function collectDepartmentRelationIds(departments: DepartmentNode[]): number[] {
  return departments.flatMap((department) => [
    department.Object_Rel_Idn,
    ...collectDepartmentRelationIds(department.children || []),
  ]).filter((relationID) => Number.isFinite(relationID) && relationID > 0);
}

function mapAssetToDeviceNode(asset: AssetItem, relationId?: number): TreeNode {
  const assetId = Number(asset._Idn ?? asset.MDM_Asset_Idn ?? asset.Object_Root_Idn ?? asset.id ?? 0);
  const objectAgent = safeString(asset.Object_Agent || asset.objectAgent, "EM");
  const label = safeString(asset.ComputerName || asset.DeviceName || asset.AssetName || asset.Object_DeviceID || asset.DeviceID || asset.IP, `Device ${assetId}`);

  return {
    id: `device-${objectAgent}-${assetId}`,
    label,
    type: "device",
    assetId,
    objectAgent,
    objectDeviceId: safeString(asset.Object_DeviceID || asset.DeviceID, ""),
    platformType: safeString(asset.PlatformType, ""),
    connectionStatus: safeString(asset.ConnectionStatus, ""),
    ip: safeString(asset.IP, ""),
    relationId,
  };
}

function attachSoftwareDeviceInventoryToTree(nodes: TreeNode[], deviceNodes: TreeNode[]): TreeNode[] {
  const knownRelationIds = new Set<number>();
  const collectKnownRelations = (items: TreeNode[]) => {
    items.forEach((item) => {
      if (typeof item.relationId === "number" && item.relationId > 0) knownRelationIds.add(item.relationId);
      if (item.children?.length) collectKnownRelations(item.children);
    });
  };
  collectKnownRelations(nodes);

  const devicesByRelation = new Map<number, TreeNode[]>();
  const rootOnlyDevices: TreeNode[] = [];
  deviceNodes.forEach((device) => {
    const relationId = device.relationId || 0;
    if (relationId && knownRelationIds.has(relationId)) {
      devicesByRelation.set(relationId, [...(devicesByRelation.get(relationId) || []), device]);
    } else {
      rootOnlyDevices.push(device);
    }
  });

  const sortDevices = (items: TreeNode[]) => items.slice().sort((a, b) => a.label.localeCompare(b.label));
  const walk = (node: TreeNode, isRoot = false): TreeNode => {
    const folderChildren = (node.children || [])
      .filter((child) => child.type !== "device")
      .map((child) => walk(child, false));
    const directDevices = typeof node.relationId === "number" && node.relationId > 0 ? sortDevices(devicesByRelation.get(node.relationId) || []) : [];
    const orphanDevices = isRoot ? sortDevices(rootOnlyDevices) : [];
    const totalCount = directDevices.length + orphanDevices.length + folderChildren.reduce((total, child) => total + getSoftwareTreeCount(child), 0);
    return {
      ...node,
      count: totalCount || node.count || 0,
      children: [...folderChildren, ...directDevices, ...orphanDevices],
      devicesLoaded: true,
      devicesLoading: false,
    };
  };

  return nodes.map((node, index) => walk(node, index === 0 && node.type === "org"));
}

function updateTreeNode(nodes: TreeNode[], nodeId: string, updater: (node: TreeNode) => TreeNode): TreeNode[] {
  return nodes.map((node) => {
    if (node.id === nodeId) return updater(node);
    if (node.children?.length) return { ...node, children: updateTreeNode(node.children, nodeId, updater) };
    return node;
  });
}

function uniqueValues(records: SoftwareRecord[], key: keyof SoftwareRecord) {
  return Array.from(
    new Set(
      records
        .map((record) => String(record[key] || "").trim())
        .filter((value) => value && value !== EMPTY_VALUE && value.toLowerCase() !== "unassigned")
    )
  ).sort((a, b) => a.localeCompare(b));
}

function countBy(records: SoftwareRecord[], key: keyof SoftwareRecord) {
  const map = new Map<string, number>();
  records.forEach((record) => {
    const raw = String(record[key] || "").trim();
    const value = raw && raw !== EMPTY_VALUE && raw.toLowerCase() !== "unassigned" ? raw : "Unknown";
    map.set(value, (map.get(value) || 0) + 1);
  });
  return Array.from(map.entries()).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function dedupeBy(records: SoftwareRecord[], getKey: (record: SoftwareRecord) => string) {
  const seen = new Set<string>();
  const result: SoftwareRecord[] = [];
  for (const record of records) {
    const key = getKey(record).trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(record);
  }
  return result;
}

function parseNumber(value: unknown) {
  const parsed = parseInt(String(value || "0").replace(/[^0-9-]/g, ""), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function exportRegistryToCsv(records: SoftwareRecord[]) {
  const headers = ["Software Name", "Category", "Publisher / Description", "Version", "Device", "Device ID", "Device Type", "OS", "IP Address", "Last Updated"];
  const rows = records.map((record) => [record.softwareName, record.category, record.publisher, record.version, record.deviceName, record.assetTag, record.machineType, record.os, record.ip, formatDateTime(record.lastUpdated)]);
  downloadCsv("software", [headers, ...rows]);
}

function exportRowsToCsv(label: string, columns: string[], rows: string[][]) {
  downloadCsv(label, [columns, ...rows]);
}

function downloadCsv(label: string, rows: Array<Array<string | number>>) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function Software() {
  const [softwareRecords, setSoftwareRecords] = useState<SoftwareRecord[]>([]);
  const [categoriesFromApi, setCategoriesFromApi] = useState<string[]>([]);
  const [tableRows, setTableRows] = useState<Record<Exclude<TableKey, "registry">, string[][]>>({
    installedSoftware: [],
    licenseStatus: [],
    fileExtensionExe: [],
    fileExtensionDll: [],
    fileExtensionIni: [],
  });
  const [deviceTree, setDeviceTree] = useState<TreeNode[]>(fallbackDeviceTree);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["org-root", "stat-extension"]));
  const [currentRelationId, setCurrentRelationId] = useState(-1);
  const [selectedFolder, setSelectedFolder] = useState<{ id: number; label: string } | null>({ id: -1, label: "All Branches" });
  const [selectedDevice, setSelectedDevice] = useState<TreeNode | null>(null);
  const [selected, setSelected] = useState<SelectedContext>({ mode: "registry", tableKey: "registry", label: "Software", relationId: -1 });
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("organization");
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [tableError, setTableError] = useState("");
  const [treeLoading, setTreeLoading] = useState(false);
  const [treeError, setTreeError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [osFilter, setOsFilter] = useState("all");
  const [activeView, setActiveView] = useState<ActiveView>("all");
  const [sortKey, setSortKey] = useState<SortKey>("softwareName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [tableSort, setTableSort] = useState<{ index: number; direction: SortDirection } | null>(null);
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<ToastState>(null);
  const [openSelect, setOpenSelect] = useState<"category" | "type" | "os" | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [showInsightsModal, setShowInsightsModal] = useState(false);

  const showToast = (nextToast: ToastState) => {
    setToast(nextToast);
    if (nextToast) {
      window.setTimeout(() => {
        setToast((current) => (current === nextToast ? null : current));
      }, 2600);
    }
  };

  const loadSoftwareInventory = async () => {
    setLoading(true);
    setApiError("");

    void apiGet<string[] | { data?: string[] }>("/api/software/categories")
      .then((categoriesResponse) => {
        const categoryPayload = Array.isArray(categoriesResponse) ? categoriesResponse : Array.isArray(categoriesResponse.data) ? categoriesResponse.data : [];
        setCategoriesFromApi(categoryPayload.map((item) => cleanCategory(item)).filter(Boolean));
      })
      .catch(() => setCategoriesFromApi([]));

    try {
      const softwareResponse = await apiGet<ApiSoftwareRecord[] | { data?: ApiSoftwareRecord[] }>("/api/software");
      const softwarePayload = Array.isArray(softwareResponse) ? softwareResponse : Array.isArray(softwareResponse.data) ? softwareResponse.data : [];
      setSoftwareRecords(softwarePayload.map(normalizeSoftwareRecord));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load software data.";
      setApiError(message);
      setSoftwareRecords([]);
      showToast({ type: "error", title: "Software API failed", message });
    } finally {
      setLoading(false);
    }
  };

  const loadDepartmentTree = async () => {
    setTreeLoading(true);
    setTreeError("");
    try {
      const response = await apiGet<DepartmentNode[] | { data?: DepartmentNode[] }>("/api/departments");
      const departments = Array.isArray(response) ? response : Array.isArray(response.data) ? response.data : [];
      const baseTree = buildDeviceTreeFromDepartments(departments);
      const relationIds = collectDepartmentRelationIds(departments);
      const assetResults = await Promise.allSettled(
        relationIds.map(async (relationId) => {
          const assetResponse = await apiGet<AssetItem[] | { data?: AssetItem[] }>(`/api/assets/${relationId}`);
          const assets = Array.isArray(assetResponse) ? assetResponse : Array.isArray(assetResponse.data) ? assetResponse.data : [];
          return assets.map((asset) => mapAssetToDeviceNode(asset, relationId));
        })
      );
      const deviceNodes = assetResults.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
      setDeviceTree(attachSoftwareDeviceInventoryToTree(baseTree, deviceNodes));
    } catch (error) {
      const message = "Branch view is not available right now.";
      setTreeError(message);
      setDeviceTree(fallbackDeviceTree);
    } finally {
      setTreeLoading(false);
    }
  };

  useEffect(() => {
    void loadSoftwareInventory();
    void loadDepartmentTree();
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("ema-settings-page-active", "ema-layout-lock");
    document.body.classList.add("ema-settings-page-active", "ema-layout-lock");

    return () => {
      document.documentElement.classList.remove("ema-settings-page-active", "ema-layout-lock");
      document.body.classList.remove("ema-settings-page-active", "ema-layout-lock");
    };
  }, []);

  const categoryOptions = useMemo(() => {
    const fromRecords = uniqueValues(softwareRecords, "category");
    return Array.from(new Set([...categoriesFromApi, ...fromRecords])).filter((value) => value && value !== EMPTY_VALUE).sort((a, b) => a.localeCompare(b));
  }, [softwareRecords, categoriesFromApi]);

  const typeOptions = useMemo(() => uniqueValues(softwareRecords, "machineType"), [softwareRecords]);
  const osOptions = useMemo(() => uniqueValues(softwareRecords, "os"), [softwareRecords]);

  const baseFilteredRecords = useMemo(() => {
    const lowerSearch = searchTerm.trim().toLowerCase();
    return softwareRecords.filter((record) => {
      const searchable = [record.softwareName, record.category, record.publisher, record.description, record.version, record.assetTag, record.deviceName, record.machineType, record.os, record.username, record.ip, record.department].join(" ").toLowerCase();
      return (!lowerSearch || searchable.includes(lowerSearch)) &&
        (categoryFilter === "all" || record.category === categoryFilter) &&
        (typeFilter === "all" || record.machineType === typeFilter) &&
        (osFilter === "all" || record.os === osFilter);
    });
  }, [softwareRecords, searchTerm, categoryFilter, typeFilter, osFilter]);

  const filteredRecords = useMemo(() => {
    let rows = [...baseFilteredRecords];
    if (activeView === "unique") rows = dedupeBy(rows, (record) => record.softwareName);
    if (activeView === "installed") rows = rows.filter((record) => !isEmptyDisplay(record.deviceName));
    if (activeView === "unclassified") rows = rows.filter((record) => record.category.toLowerCase() === "unclassified");
    rows.sort((a, b) => {
      const first = normalizeForCompare(String(a[sortKey] || ""));
      const second = normalizeForCompare(String(b[sortKey] || ""));
      if (first < second) return sortDirection === "asc" ? -1 : 1;
      if (first > second) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return rows;
  }, [baseFilteredRecords, activeView, sortKey, sortDirection]);

  const currentTableRows = selected.tableKey === "registry" ? [] : tableRows[selected.tableKey];
  const filteredTableRows = useMemo(() => {
    if (selected.tableKey === "registry") return [];
    const lowerSearch = searchTerm.trim().toLowerCase();
    let rows = tableRows[selected.tableKey].filter((row) => !lowerSearch || row.join(" ").toLowerCase().includes(lowerSearch));
    if (tableSort) {
      rows = [...rows].sort((a, b) => {
        const first = normalizeForCompare(a[tableSort.index] || "");
        const second = normalizeForCompare(b[tableSort.index] || "");
        if (first < second) return tableSort.direction === "asc" ? -1 : 1;
        if (first > second) return tableSort.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return rows;
  }, [selected.tableKey, tableRows, searchTerm, tableSort]);

  const activeRowsCount = selected.tableKey === "registry" ? filteredRecords.length : filteredTableRows.length;
  const isDataLoading = selected.tableKey === "registry" ? loading : tableLoading;
  const totalPages = Math.max(1, Math.ceil(activeRowsCount / PAGE_SIZE));
  const pageRegistryRecords = selected.tableKey === "registry" ? filteredRecords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : [];
  const pageTableRows = selected.tableKey !== "registry" ? filteredTableRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : [];

  useEffect(() => {
    setPage(1);
  }, [searchTerm, categoryFilter, typeFilter, osFilter, activeView, selected.tableKey]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const summary = useMemo(() => {
    const uniqueSoftware = new Set(softwareRecords.map((record) => record.softwareName).filter(Boolean)).size;
    const uniqueDevices = new Set(softwareRecords.map((record) => record.assetTag || record.objectDeviceId || record.deviceName).filter(Boolean)).size;
    const unclassified = softwareRecords.filter((record) => record.category.toLowerCase() === "unclassified").length;
    return { totalRecords: softwareRecords.length, uniqueSoftware, uniqueDevices, categories: categoryOptions.length, unclassified };
  }, [softwareRecords, categoryOptions.length]);

  const classificationCoverage = summary.totalRecords ? Math.round(((summary.totalRecords - summary.unclassified) / summary.totalRecords) * 100) : 0;
  const categoryCounts = useMemo(() => countBy(softwareRecords, "category"), [softwareRecords]);
  const typeCounts = useMemo(() => countBy(softwareRecords, "machineType"), [softwareRecords]);
  const topSoftware = useMemo(() => countBy(softwareRecords, "softwareName").slice(0, 8), [softwareRecords]);

  const installedStats = useMemo(() => {
    const rows = tableRows.installedSoftware;
    const totalUsed = rows.reduce((sum, row) => sum + parseNumber(row[2]), 0);
    const expiringSoon = rows.filter((row) => {
      const expiry = row[6];
      if (!expiry || expiry === EMPTY_VALUE) return false;
      const date = new Date(expiry);
      if (Number.isNaN(date.getTime())) return false;
      const days = Math.ceil((date.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
      return days > 0 && days <= 90;
    }).length;
    return { totalSoftware: rows.length, totalUsed, expiringSoon };
  }, [tableRows.installedSoftware]);

  const licenseStats = useMemo(() => {
    const rows = tableRows.licenseStatus;
    return {
      authorized: rows.filter((row) => row[2]?.toLowerCase() === "authorized").length,
      limited: rows.filter((row) => row[2]?.toLowerCase() === "limited").length,
      unauthorized: rows.filter((row) => row[2]?.toLowerCase() === "unauthorized").length,
      totalUsed: rows.reduce((sum, row) => sum + parseNumber(row[3]), 0),
    };
  }, [tableRows.licenseStatus]);

  const getFileExtensionLoadedCount = (tableKey: TableKey) => {
    if (tableKey !== "fileExtensionExe" && tableKey !== "fileExtensionDll" && tableKey !== "fileExtensionIni") return 0;
    const rows = tableRows[tableKey];
    const summedCount = rows.reduce((sum, row) => sum + parseNumber(row[1]), 0);
    return summedCount || rows.length;
  };

  const loadDepartmentDevices = async (node: TreeNode) => {
    if ((node.type !== "dept" && node.type !== "branch" && node.type !== "org") || !node.relationId || node.devicesLoaded || node.devicesLoading) return;
    if (node.relationId === -1) return;

    setDeviceTree((prev) => updateTreeNode(prev, node.id, (target) => ({ ...target, devicesLoading: true })));
    try {
      const response = await apiGet<AssetItem[] | { data?: AssetItem[] }>(`/api/assets/${node.relationId}`);
      const assets = Array.isArray(response) ? response : Array.isArray(response.data) ? response.data : [];
      const deviceChildren = assets.map((asset) => mapAssetToDeviceNode(asset, node.relationId));

      setDeviceTree((prev) => updateTreeNode(prev, node.id, (target) => {
        const departmentChildren = (target.children || []).filter((child) => child.type !== "device");
        return { ...target, children: [...departmentChildren, ...deviceChildren], devicesLoaded: true, devicesLoading: false };
      }));
    } catch (error) {
      setDeviceTree((prev) => updateTreeNode(prev, node.id, (target) => ({ ...target, devicesLoaded: false, devicesLoading: false })));
      showToast({ type: "error", title: "Device view unavailable", message: "Device list is not available right now." });
    }
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const loadRowsForTable = async (tableKey: Exclude<TableKey, "registry">, relationID = currentRelationId) => {
    setTableLoading(true);
    setTableError("");
    try {
      const buildStatisticPath = (targetRelationID: number) => {
        if (tableKey === "licenseStatus") return `/api/software/relation/${targetRelationID}/packages?mode=stat1`;
        if (tableKey === "fileExtensionExe" || tableKey === "fileExtensionDll" || tableKey === "fileExtensionIni") {
          return `/api/software/relation/${targetRelationID}/files?extension=${getExtensionFromTableKey(tableKey)}`;
        }
        return `/api/software/relation/${targetRelationID}/installed?mode=summary1`;
      };

      let rawRows: Record<string, unknown>[] = [];

      if (relationID <= 0 && (tableKey === "installedSoftware" || tableKey === "licenseStatus")) {
        const departmentResponse = await apiGet<DepartmentNode[] | { data?: DepartmentNode[] }>("/api/departments");
        const departments = Array.isArray(departmentResponse) ? departmentResponse : Array.isArray(departmentResponse.data) ? departmentResponse.data : [];
        const relationIds = collectDepartmentRelationIds(departments);
        const payloads = await Promise.all(relationIds.map((targetRelationID) => apiGet<ApiRowsPayload>(buildStatisticPath(targetRelationID))));
        rawRows = payloads.flatMap(unwrapRows);
      } else {
        const payload = await apiGet<ApiRowsPayload>(buildStatisticPath(relationID));
        rawRows = unwrapRows(payload);
      }

      const rows = rowsToTableRows(tableKey, rawRows);
      setTableRows((prev) => ({ ...prev, [tableKey]: rows }));
      return rows;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load selected software records from API.";
      setTableError(message);
      setTableRows((prev) => ({ ...prev, [tableKey]: [] }));
      showToast({ type: "error", title: "View failed", message });
      return [];
    } finally {
      setTableLoading(false);
    }
  };

  const loadRowsForDevice = async (node: TreeNode) => {
    if (!node.assetId) return;
    setTableLoading(true);
    setTableError("");
    try {
      const agent = (node.objectAgent || "EM").toUpperCase();
      const path = agent === "MDM" && node.objectDeviceId
        ? `/api/software/mdm/${encodeURIComponent(node.objectDeviceId)}`
        : `/api/software/client/${node.assetId}`;
      const payload = await apiGet<ApiRowsPayload>(path);
      const rows = rowsToTableRows("installedSoftware", unwrapRows(payload));
      setTableRows((prev) => ({ ...prev, installedSoftware: rows }));
      setSelected({ mode: "device", tableKey: "installedSoftware", label: node.label, relationId: node.relationId, assetId: node.assetId, objectAgent: node.objectAgent, objectDeviceId: node.objectDeviceId });
      setSelectedDevice(node);
      setSidebarTab("organization");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load installed software for selected device.";
      setTableError(message);
      setTableRows((prev) => ({ ...prev, installedSoftware: [] }));
      showToast({ type: "error", title: "Device software failed", message });
    } finally {
      setTableLoading(false);
    }
  };

  const handleFolderClick = async (node: TreeNode, canExpand: boolean) => {
    setSidebarTab("organization");
    setSelectedDevice(null);

    if (node.relationId !== undefined) {
      setCurrentRelationId(node.relationId);
      setSelectedFolder({ id: node.relationId, label: node.label });

      if (node.relationId === -1) {
        setSelected({ mode: "registry", tableKey: "registry", label: "Software", relationId: -1 });
        setTableLoading(false);
        setTableError("");
        setTableSort(null);
        setActiveView("all");
        setPage(1);
        if (canExpand) toggleGroup(node.id);
        return;
      }

      setSelected({ mode: "folder", tableKey: "installedSoftware", label: node.label, relationId: node.relationId });
      void loadRowsForTable("installedSoftware", node.relationId);
    }

    if (canExpand) toggleGroup(node.id);
    if ((node.type === "dept" || node.type === "branch") && !node.devicesLoaded) {
      await loadDepartmentDevices(node);
      setExpandedGroups((prev) => new Set([...prev, node.id]));
    }
  };

  const selectStatistic = async (node: TreeNode) => {
    const nextTableKey = tableKeyFromStatistic(node.id);
    if (!nextTableKey) {
      toggleGroup(node.id);
      return;
    }

    setSidebarTab("statistic");
    setSelectedDevice(null);
    setSelected({ mode: "statistic", tableKey: nextTableKey, label: node.label, relationId: currentRelationId });
    setTableSort(null);
    await loadRowsForTable(nextTableKey, currentRelationId);
  };

  const handleSoftwareScan = async (scanMode: "all" | "folder" | "device") => {
    if (scanMode === "folder" && !selectedFolder) {
      showToast({ type: "error", title: "Select a folder first", message: "Choose a folder or organisation before scanning." });
      return;
    }
    if (scanMode === "device" && !selectedDevice) {
      showToast({ type: "error", title: "Select a device first", message: "Click one device in the organisation tree before scanning." });
      return;
    }

    setScanLoading(true);
    try {
      const body: Record<string, unknown> = { scanMode, Job_Style: 1, Job_Description: `Software inventory scan - ${scanMode}` };
      if (scanMode === "folder" && selectedFolder) body.Object_Rel_Idn = selectedFolder.id;
      if (scanMode === "device" && selectedDevice) {
        body.Object_Root_Idn = selectedDevice.assetId;
        body.Object_DeviceID = selectedDevice.objectDeviceId;
      }
      const response = await apiPost<{ data?: { Job_Idn?: number; targetCount?: number }; message?: string }>("/api/software-inventory/scan", body);
      const jobId = response.data?.Job_Idn || "-";
      const targetCount = response.data?.targetCount ?? "-";
      showToast({ type: "success", title: "Software scan job created", message: `Job ${jobId} created for ${targetCount} target(s).` });
    } catch (error) {
      showToast({ type: "error", title: "Scan job failed", message: error instanceof Error ? error.message : "Failed to create software scan job." });
    } finally {
      setScanLoading(false);
    }
  };

  const resetFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setTypeFilter("all");
    setOsFilter("all");
    setActiveView("all");
    setSortKey("softwareName");
    setSortDirection("asc");
    setTableSort(null);
    setPage(1);
  };

  const activateView = (view: ActiveView) => {
    setSelected({ mode: "registry", tableKey: "registry", label: "Software", relationId: currentRelationId });
    setActiveView(view);
    setPage(1);
    if (view === "all") {
      resetFilters();
      return;
    }
    if (view === "unique") setSortKey("softwareName");
    if (view === "installed") setSortKey("deviceName");
    if (view === "categories") setSortKey("category");
    if (view === "unclassified") {
      setCategoryFilter("Unclassified");
      setSortKey("softwareName");
    }
  };

  const handleRegistrySort = (key: SortKey) => {
    if (sortKey === key) setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const handleTableSort = (index: number) => {
    setTableSort((current) => current?.index === index ? { index, direction: current.direction === "asc" ? "desc" : "asc" } : { index, direction: "asc" });
  };

  const setCategoryScope = (category: string) => {
    setSelected({ mode: "registry", tableKey: "registry", label: "Software", relationId: currentRelationId });
    setCategoryFilter(category);
    setActiveView(category === "Unclassified" ? "unclassified" : "all");
    setPage(1);
  };

  const setTypeScope = (type: string) => {
    setSelected({ mode: "registry", tableKey: "registry", label: "Software", relationId: currentRelationId });
    setTypeFilter(type);
    setActiveView("all");
    setPage(1);
  };

  const refreshCurrentView = async () => {
    if (selected.tableKey === "registry") {
      await loadSoftwareInventory();
      return;
    }
    if (selected.mode === "device" && selectedDevice) {
      await loadRowsForDevice(selectedDevice);
      return;
    }
    await loadRowsForTable(selected.tableKey, selected.relationId ?? currentRelationId);
  };

  const exportCurrentView = () => {
    if (selected.tableKey === "registry") exportRegistryToCsv(filteredRecords);
    else exportRowsToCsv(selected.label, tableColumns[selected.tableKey], filteredTableRows);
  };

  const FilterSelect = ({ selectKey, label, value, options, allLabel, onChange }: { selectKey: "category" | "type" | "os"; label: string; value: string; options: string[]; allLabel: string; onChange: (nextValue: string) => void }) => {
    const isOpen = openSelect === selectKey;
    const displayValue = value === "all" ? allLabel : value;
    return (
      <div>
        <label>{label}</label>
        <div>
          <button type="button" onClick={() => setOpenSelect(isOpen ? null : selectKey)}>
            <span>{displayValue}</span>
            <ChevronDown size={15} />
          </button>
          {isOpen && (
            <div>
              <button type="button" onClick={() => { onChange("all"); setOpenSelect(null); }}>
                <span>{allLabel}</span>
              </button>
              {options.map((option) => (
                <button type="button" key={option} onClick={() => { onChange(option); setOpenSelect(null); }}>
                  <span>{option}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const SortButton = ({ label, columnKey }: { label: string; columnKey: SortKey }) => (
    <button type="button" onClick={() => handleRegistrySort(columnKey)}>
      <span>{label}</span>
      <ArrowUpDown size={12} />
    </button>
  );

  const TableSortButton = ({ label, index }: { label: string; index: number }) => (
    <button type="button" onClick={() => handleTableSort(index)}>
      <span>{label}</span>
      <ArrowUpDown size={12} />
    </button>
  );

  const renderTree = (nodes: TreeNode[], depth = 0, mode: "organization" | "statistic" = "organization") => (
    <div>
      {nodes.map((node) => {
        const hasChildren = Boolean(node.children?.length);
        const isExpanded = expandedGroups.has(node.id);
        const isDevice = node.type === "device";
        const isSelectedFolderNode = mode === "organization"
          && !isDevice
          && node.relationId !== undefined
          && selectedFolder?.id === node.relationId;
        const isActive = mode === "organization"
          ? (selected.mode === "device" && selected.assetId === node.assetId)
            || isSelectedFolderNode
            || (selected.mode === "folder" && selected.relationId === node.relationId && node.type !== "device")
          : selected.tableKey === tableKeyFromStatistic(node.id);
        const canLazyLoadDevices = mode === "organization"
          && !isDevice
          && node.relationId !== undefined
          && node.relationId !== -1
          && node.devicesLoaded !== true;
        const isExpandable = hasChildren || canLazyLoadDevices;
        const handleNodeAction = () => {
          if (mode === "statistic") {
            void selectStatistic(node);
            return;
          }
          if (isDevice) void loadRowsForDevice(node);
          else void handleFolderClick(node, isExpandable);
        };

        return (
          <div key={node.id}>
            <div>
              <button
                type="button"
                onClick={handleNodeAction}
                aria-label={isExpandable ? (isExpanded ? "Collapse" : "Expand") : "Open"}
              >
                {isExpandable ? (isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />) : <span aria-hidden="true" />}
              </button>

              <button type="button" onClick={handleNodeAction}>
                <span>
                  {isDevice
                    ? <MonitorSmartphone size={13} />
                    : mode === "statistic"
                      ? <Database size={13} />
                      : hasChildren && isExpanded
                        ? <FolderOpen size={15} />
                        : <Folder size={15} />}
                </span>
                <span>{node.label}</span>
                {node.type !== "org" && getSoftwareTreeCount(node) > 0 && <span>{getSoftwareTreeCount(node).toLocaleString()}</span>}
              </button>

              {node.devicesLoading ? <RefreshCw size={12} /> : null}
            </div>

            {hasChildren && isExpanded && renderTree(node.children || [], depth + 1, mode)}
          </div>
        );
      })}
    </div>
  );

  const filtersActive = searchTerm || categoryFilter !== "all" || typeFilter !== "all" || osFilter !== "all" || activeView !== "all";
  const visibleStart = activeRowsCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const visibleEnd = Math.min(page * PAGE_SIZE, activeRowsCount);
  const tableTitle = selected.tableKey === "registry" ? "Software" : selected.label;

  return (
    <main data-section="software">
        <style>{`
          /* Software sidebar alignment: match Hardware sidebar width and prevent the switcher from pushing the tree down. */
          .software-inventory-module .settings-layout.software-settings-layout {
            grid-template-columns: minmax(300px, 322px) minmax(0, 1fr) !important;
            height: 100% !important;
            min-height: 0 !important;
            gap: 0.85rem !important;
            overflow: hidden !important;
          }

          .software-inventory-module .settings-menu.software-left-panel {
            min-width: 300px !important;
            max-width: 322px !important;
            min-height: 0 !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
          }

          .software-inventory-module .settings-menu > .ema-module-sidebar-switcher {
            flex: 0 0 auto !important;
            margin: 0 !important;
            overflow: visible !important;
          }

          .software-inventory-module .settings-menu > .ema-sidebar-content {
            flex: 1 1 auto !important;
            min-height: 0 !important;
            padding-top: 0.65rem !important;
          }

          .software-inventory-module .ema-sidebar-subpanel {
            justify-content: flex-start !important;
            min-height: 0 !important;
          }

          .software-inventory-module .ema-sidebar-tree {
            min-height: 0 !important;
          }


          /* Software toolbar alignment: keep actions, search, refresh/export and filters in fixed rows. */
          .software-inventory-module .software-registry-card--full {
            min-width: 0 !important;
            overflow: hidden !important;
          }

          .software-inventory-module .software-registry-head.software-registry-head--standard {
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 0.75rem !important;
            padding: 1rem 1rem 0.85rem !important;
            overflow: visible !important;
          }

          .software-inventory-module .software-registry-tools.software-registry-tools--standard {
            display: grid !important;
            grid-template-columns: max-content max-content max-content max-content minmax(280px, 1fr) 44px max-content !important;
            align-items: center !important;
            gap: 0.6rem !important;
            width: 100% !important;
            min-width: 0 !important;
          }

          .software-inventory-module .software-registry-tools--standard .soft-btn,
          .software-inventory-module .software-registry-tools--standard .primary-btn,
          .software-inventory-module .software-registry-tools--standard .icon-action-btn {
            height: 42px !important;
            min-height: 42px !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 0.45rem !important;
            white-space: nowrap !important;
            flex: 0 0 auto !important;
            margin: 0 !important;
          }

          .software-inventory-module .software-registry-tools--standard .software-insights-toggle,
          .software-inventory-module .software-registry-tools--standard .software-scan-btn {
            min-width: 126px !important;
            padding-inline: 0.95rem !important;
          }

          .software-inventory-module .software-registry-tools--standard .software-icon-btn {
            width: 44px !important;
            min-width: 44px !important;
            padding: 0 !important;
          }

          .software-inventory-module .software-registry-tools--standard .software-export-btn {
            min-width: 92px !important;
            padding-inline: 1rem !important;
          }

          .software-inventory-module .software-search-box {
            width: 100% !important;
            min-width: 280px !important;
            height: 42px !important;
            margin: 0 !important;
            display: flex !important;
            align-items: center !important;
          }

          .software-inventory-module .software-search-box input {
            min-width: 0 !important;
            width: 100% !important;
          }

          .software-inventory-module .software-filter-row.software-filter-row--toolbar {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(190px, 230px)) !important;
            gap: 0.7rem !important;
            align-items: end !important;
            justify-content: start !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            clear: both !important;
          }

          .software-inventory-module .software-filter-row--toolbar .software-filter-group,
          .software-inventory-module .software-filter-row--toolbar .form-field {
            min-width: 0 !important;
            width: 100% !important;
            margin: 0 !important;
          }

          .software-inventory-module .software-filter-row--toolbar label {
            display: block !important;
            margin: 0 0 0.35rem !important;
            line-height: 1 !important;
            white-space: nowrap !important;
          }

          .software-inventory-module .software-filter-row--toolbar .ema-sw-select,
          .software-inventory-module .software-filter-row--toolbar .setting-select-dropdown,
          .software-inventory-module .software-filter-row--toolbar .ema-sw-select-trigger,
          .software-inventory-module .software-filter-row--toolbar .setting-select-trigger {
            width: 100% !important;
            min-width: 0 !important;
          }

          .software-inventory-module .software-filter-row--toolbar .ema-sw-select-trigger,
          .software-inventory-module .software-filter-row--toolbar .setting-select-trigger {
            height: 40px !important;
            min-height: 40px !important;
          }

          /* Match Software table design to Hardware table design. */
          .software-inventory-module .software-registry-card {
            display: flex !important;
            flex-direction: column !important;
            min-height: 0 !important;
            max-height: calc(100dvh - 196px) !important;
            overflow: hidden !important;
          }

          .software-inventory-module .software-registry-head,
          .software-inventory-module .software-stat-summary-row,
          .software-inventory-module .software-page-pagination,
          .software-inventory-module .software-table-status-row,
          .software-inventory-module .software-error-banner {
            flex: 0 0 auto !important;
          }

          .software-inventory-module .software-table-status-row {
            padding: 0 1rem 0.65rem !important;
            color: #102a5a !important;
            font-size: 0.92rem !important;
            font-weight: 800 !important;
          }

          .software-inventory-module .software-device-table.software-standard-table {
            display: block !important;
            flex: 1 1 auto !important;
            min-height: 260px !important;
            max-height: min(54vh, 560px) !important;
            width: calc(100% - 2.1rem) !important;
            max-width: calc(100% - 2.1rem) !important;
            margin: 0 1.05rem 0.5rem !important;
            overflow-y: auto !important;
            overflow-x: auto !important;
            scrollbar-gutter: stable !important;
            -webkit-overflow-scrolling: touch !important;
          }

          .software-inventory-module .software-device-table.software-standard-table::-webkit-scrollbar {
            width: 8px !important;
            height: 8px !important;
          }

          .software-inventory-module .software-device-table.software-standard-table::-webkit-scrollbar-track {
            background: rgba(226, 232, 240, 0.58) !important;
            border-radius: 999px !important;
          }

          .software-inventory-module .software-device-table.software-standard-table::-webkit-scrollbar-thumb {
            background: rgba(100, 116, 139, 0.62) !important;
            border-radius: 999px !important;
          }

          .software-inventory-module .software-device-table .software-device-table-row {
            align-items: center !important;
            column-gap: 0 !important;
            min-width: 1080px !important;
            width: 100% !important;
          }

          .software-inventory-module .software-device-table .software-registry-row {
            display: grid !important;
            grid-template-columns: 56px minmax(250px, 1.8fr) minmax(170px, 1fr) minmax(210px, 1.2fr) minmax(140px, 0.8fr) minmax(160px, 0.95fr) minmax(170px, 0.9fr) !important;
            min-width: 1150px !important;
          }

          .software-inventory-module .software-device-table .software-dynamic-row {
            min-width: max-content !important;
          }

          .software-inventory-module .software-device-table .user-cell {
            min-width: 0 !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
          }

          .software-inventory-module .software-device-table .head.software-device-table-row {
            position: sticky !important;
            top: 0 !important;
            z-index: 3 !important;
            background: #eef3fb !important;
            border-bottom: 1px solid rgba(148, 163, 184, 0.28) !important;
          }

          .software-inventory-module .software-device-table .head.software-device-table-row > .user-cell {
            min-height: 44px !important;
            display: flex !important;
            align-items: center !important;
            white-space: nowrap !important;
            text-transform: uppercase !important;
            color: #64748b !important;
            font-size: 0.72rem !important;
            letter-spacing: 0.08em !important;
            font-weight: 900 !important;
          }

          .software-inventory-module .software-device-table .software-sort-btn {
            max-width: 100% !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
            color: #2f5fe3 !important;
            font-size: 0.76rem !important;
            font-weight: 900 !important;
            letter-spacing: 0.04em !important;
            text-transform: uppercase !important;
          }

          .software-inventory-module .software-device-table .software-standard-row.software-device-table-row:not(.head) {
            border-bottom: 1px solid rgba(148, 163, 184, 0.18) !important;
            min-height: 68px !important;
            background: #ffffff !important;
          }

          .software-inventory-module .software-device-table .software-standard-row.software-device-table-row:not(.head):hover {
            background: rgba(239, 244, 255, 0.65) !important;
          }

          .software-inventory-module .software-device-main-cell,
          .software-inventory-module .software-user-name,
          .software-inventory-module .software-user-name > div,
          .software-inventory-module .software-location-cell,
          .software-inventory-module .software-device-cell,
          .software-inventory-module .software-category-cell,
          .software-inventory-module .software-type-cell {
            min-width: 0 !important;
          }

          .software-inventory-module .software-user-name,
          .software-inventory-module .software-device-cell,
          .software-inventory-module .software-category-cell,
          .software-inventory-module .software-type-cell {
            display: flex !important;
            flex-direction: column !important;
            align-items: flex-start !important;
            justify-content: center !important;
            gap: 0.18rem !important;
          }

          .software-inventory-module .software-user-name strong,
          .software-inventory-module .software-device-cell strong,
          .software-inventory-module .software-category-cell strong,
          .software-inventory-module .software-type-cell strong,
          .software-inventory-module .software-model-text,
          .software-inventory-module .software-date-cell {
            display: block !important;
            max-width: 100% !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
            color: #102a5a !important;
            font-size: 0.76rem !important;
            font-weight: 900 !important;
            line-height: 1.12 !important;
          }

          .software-inventory-module .software-user-name small,
          .software-inventory-module .software-device-cell small,
          .software-inventory-module .software-category-cell small,
          .software-inventory-module .software-type-cell small,
          .software-inventory-module .software-text-cell {
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

          .software-inventory-module .software-status-dot {
            width: 11px !important;
            height: 11px !important;
            min-width: 11px !important;
            border-radius: 999px !important;
            background: #94a3b8 !important;
            box-shadow: 0 0 0 4px rgba(148, 163, 184, 0.18) !important;
            margin-top: 0.2rem !important;
          }

          .software-inventory-module .row-index-pill.software-row-no {
            min-width: 34px !important;
            height: 30px !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 0 0.55rem !important;
            border-radius: 12px !important;
            border: 1px solid rgba(91, 123, 255, 0.42) !important;
            background: rgba(241, 245, 255, 0.98) !important;
            color: #5b6b87 !important;
            font-size: 0.82rem !important;
            font-weight: 900 !important;
          }

          .software-inventory-module .software-empty-state {
            min-height: 220px !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 0.45rem !important;
            color: #64748b !important;
          }

          .software-inventory-module .settings-toast-layer.software-toast-layer {
            position: fixed !important;
            top: 86px !important;
            right: 24px !important;
            bottom: auto !important;
            left: auto !important;
            z-index: 2147483647 !important;
            pointer-events: none !important;
          }

          .software-inventory-module .software-toast {
            pointer-events: auto !important;
            max-width: min(26rem, calc(100vw - 32px)) !important;
          }

          @media (max-width: 1320px) {
            .software-inventory-module .software-registry-tools.software-registry-tools--standard {
              grid-template-columns: max-content max-content max-content max-content minmax(240px, 1fr) 44px max-content !important;
            }

            .software-inventory-module .software-registry-tools--standard .software-insights-toggle,
            .software-inventory-module .software-registry-tools--standard .software-scan-btn {
              min-width: 118px !important;
              padding-inline: 0.75rem !important;
            }
          }

          @media (max-width: 1180px) {
            .software-inventory-module .software-registry-tools.software-registry-tools--standard {
              grid-template-columns: repeat(4, minmax(120px, max-content)) 1fr 44px max-content !important;
            }

            .software-inventory-module .software-search-box {
              min-width: 220px !important;
            }
          }

          @media (max-width: 980px) {
            .software-inventory-module .software-registry-tools.software-registry-tools--standard {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }

            .software-inventory-module .software-search-box,
            .software-inventory-module .software-registry-tools--standard .software-export-btn,
            .software-inventory-module .software-registry-tools--standard .software-icon-btn {
              width: 100% !important;
              min-width: 0 !important;
            }

            .software-inventory-module .software-filter-row.software-filter-row--toolbar {
              grid-template-columns: 1fr !important;
            }
          }

          @media (max-width: 1100px) {
            .software-inventory-module .settings-layout.software-settings-layout {
              grid-template-columns: 1fr !important;
            }

            .software-inventory-module .settings-menu.software-left-panel {
              min-width: 0 !important;
              max-width: none !important;
            }
          }


          /* Final rescue fix: prevent Software toolbar clipping/overlap with statistic cards. */
          body .software-inventory-module .content-shell.software-registry-card.software-registry-card--full,
          body .software-inventory-module .software-registry-card.software-registry-card--full {
            position: relative !important;
            display: flex !important;
            flex-direction: column !important;
            min-height: 0 !important;
            overflow: hidden !important;
            padding: 0 !important;
          }

          body .software-inventory-module .software-registry-head.software-registry-head--standard {
            position: relative !important;
            flex: 0 0 auto !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
            justify-content: flex-start !important;
            gap: 0.85rem !important;
            min-height: auto !important;
            height: auto !important;
            padding: 1rem 1rem 0.95rem !important;
            margin: 0 !important;
            overflow: visible !important;
            border-bottom: 1px solid rgba(203, 213, 225, 0.62) !important;
            background: #ffffff !important;
            z-index: 5 !important;
          }

          body .software-inventory-module .software-registry-tools.software-registry-tools--standard {
            position: relative !important;
            display: grid !important;
            grid-template-columns: max-content max-content max-content max-content minmax(260px, 1fr) 44px max-content !important;
            align-items: center !important;
            gap: 0.62rem !important;
            width: 100% !important;
            min-width: 0 !important;
            height: auto !important;
            min-height: 44px !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }

          body .software-inventory-module .software-registry-tools--standard .soft-btn,
          body .software-inventory-module .software-registry-tools--standard .primary-btn,
          body .software-inventory-module .software-registry-tools--standard .icon-action-btn {
            position: static !important;
            height: 42px !important;
            min-height: 42px !important;
            max-height: 42px !important;
            line-height: 1 !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 0.45rem !important;
            margin: 0 !important;
            transform: none !important;
            white-space: nowrap !important;
            flex: 0 0 auto !important;
          }

          body .software-inventory-module .software-registry-tools--standard .software-insights-toggle,
          body .software-inventory-module .software-registry-tools--standard .software-scan-btn {
            min-width: 118px !important;
            padding: 0 0.82rem !important;
          }

          body .software-inventory-module .software-registry-tools--standard .software-icon-btn {
            width: 44px !important;
            min-width: 44px !important;
            padding: 0 !important;
          }

          body .software-inventory-module .software-registry-tools--standard .software-header-export-btn,
          body .software-inventory-module .software-registry-tools--standard .software-export-btn {
            min-width: 96px !important;
            padding: 0 1rem !important;
            margin-left: 0 !important;
            order: initial !important;
          }

          body .software-inventory-module .software-search-box {
            position: relative !important;
            width: 100% !important;
            min-width: 260px !important;
            max-width: none !important;
            height: 42px !important;
            min-height: 42px !important;
            margin: 0 !important;
            padding: 0 0.75rem !important;
            display: flex !important;
            align-items: center !important;
            gap: 0.48rem !important;
            overflow: hidden !important;
          }

          body .software-inventory-module .software-search-box input {
            width: 100% !important;
            min-width: 0 !important;
            height: 100% !important;
            border: 0 !important;
            outline: 0 !important;
            background: transparent !important;
          }

          body .software-inventory-module .software-filter-row.software-filter-row--toolbar {
            position: relative !important;
            display: grid !important;
            grid-template-columns: repeat(3, minmax(190px, 230px)) !important;
            align-items: end !important;
            justify-content: start !important;
            gap: 0.72rem !important;
            width: 100% !important;
            min-height: 58px !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }

          body .software-inventory-module .software-filter-row--toolbar .software-filter-group,
          body .software-inventory-module .software-filter-row--toolbar .form-field {
            display: flex !important;
            flex-direction: column !important;
            gap: 0.36rem !important;
            width: 100% !important;
            min-width: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }

          body .software-inventory-module .software-filter-row--toolbar label {
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            line-height: 1 !important;
            display: block !important;
          }

          body .software-inventory-module .software-toolbar-spacer {
            display: none !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          body .software-inventory-module .software-stat-summary-row {
            flex: 0 0 auto !important;
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 0.7rem !important;
            padding: 0.8rem 1rem 0.72rem !important;
            margin: 0 !important;
            border-bottom: 1px solid rgba(203, 213, 225, 0.58) !important;
            background: #ffffff !important;
            overflow: visible !important;
          }

          body .software-inventory-module .software-table-status-row {
            flex: 0 0 auto !important;
          }

          body .software-inventory-module .software-standard-table {
            flex: 1 1 auto !important;
            min-height: 0 !important;
            overflow: auto !important;
          }

          body .software-inventory-module .software-page-pagination {
            flex: 0 0 auto !important;
          }

          @media (max-width: 1240px) {
            body .software-inventory-module .software-registry-tools.software-registry-tools--standard {
              grid-template-columns: repeat(4, max-content) minmax(220px, 1fr) 44px max-content !important;
            }

            body .software-inventory-module .software-registry-tools--standard .software-insights-toggle,
            body .software-inventory-module .software-registry-tools--standard .software-scan-btn {
              min-width: 108px !important;
              padding-inline: 0.7rem !important;
            }
          }

          @media (max-width: 1040px) {
            body .software-inventory-module .software-registry-tools.software-registry-tools--standard {
              grid-template-columns: repeat(4, minmax(120px, 1fr)) !important;
            }

            body .software-inventory-module .software-search-box,
            body .software-inventory-module .software-registry-tools--standard .software-icon-btn,
            body .software-inventory-module .software-registry-tools--standard .software-export-btn {
              width: 100% !important;
              min-width: 0 !important;
            }

            body .software-inventory-module .software-search-box {
              grid-column: 1 / -1 !important;
            }

            body .software-inventory-module .software-stat-summary-row,
            body .software-inventory-module .software-filter-row.software-filter-row--toolbar {
              grid-template-columns: 1fr !important;
            }
          }



          /* Final polish: align the 2 Software filters to the right and remove the thin divider line above the table. */
          body .software-inventory-module .software-filter-row.software-filter-row--toolbar,
          .software-inventory-module .software-filter-row.software-filter-row--toolbar {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(210px, 230px)) !important;
            justify-content: end !important;
            justify-items: stretch !important;
            align-items: end !important;
            gap: 0.72rem !important;
            width: 100% !important;
            min-height: 58px !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }

          body .software-inventory-module .software-registry-head.software-registry-head--standard,
          .software-inventory-module .software-registry-head.software-registry-head--standard {
            border-bottom: 0 !important;
            box-shadow: none !important;
          }

          body .software-inventory-module .software-table-status-row,
          .software-inventory-module .software-table-status-row {
            border: 0 !important;
            box-shadow: none !important;
          }

          body .software-inventory-module .software-device-table.software-standard-table,
          .software-inventory-module .software-device-table.software-standard-table {
            border-top: 0 !important;
            box-shadow: none !important;
          }

          body .software-inventory-module .software-device-table .head.software-device-table-row,
          .software-inventory-module .software-device-table .head.software-device-table-row {
            border-top: 0 !important;
          }

          @media (max-width: 980px) {
            body .software-inventory-module .software-filter-row.software-filter-row--toolbar,
            .software-inventory-module .software-filter-row.software-filter-row--toolbar {
              grid-template-columns: 1fr !important;
              justify-content: stretch !important;
            }
          }

        `}</style>

      
      <style>{`
        /* SOFTWARE_FINAL_STANDARD_HERO_KPI_STYLE */
        html body .software-inventory-module.settings-module-root .settings-hero.software-hero {
          height: 132px !important;
          min-height: 132px !important;
          max-height: 132px !important;
          padding: 18px 20px !important;
          display: grid !important;
          grid-template-columns: minmax(360px, 0.86fr) minmax(720px, 1.14fr) !important;
          align-items: center !important;
          gap: 18px !important;
          overflow: hidden !important;
          border: 1px solid rgba(203, 213, 225, 0.95) !important;
          border-radius: 16px !important;
          background:
            radial-gradient(circle at 0% 0%, rgba(79, 70, 229, 0.08), transparent 32%),
            #ffffff !important;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.04) !important;
        }

        html body .software-inventory-module.settings-module-root .settings-hero.software-hero > div:first-child {
          min-width: 0 !important;
          overflow: hidden !important;
        }

        html body .software-inventory-module.settings-module-root .settings-hero.software-hero h2 {
          margin: 9px 0 0 !important;
          color: #0f2746 !important;
          font-size: 28px !important;
          line-height: 1.05 !important;
          font-weight: 650 !important;
          letter-spacing: -0.055em !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }

        html body .software-inventory-module.settings-module-root .settings-hero.software-hero p {
          margin: 8px 0 0 !important;
          color: #64748b !important;
          font-size: 12.5px !important;
          line-height: 1.35 !important;
          max-width: 760px !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }

        html body .software-inventory-module.settings-module-root .software-hero-kpi-grid {
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
          height: 78px !important;
          min-height: 78px !important;
          max-height: 78px !important;
          display: grid !important;
          grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
          grid-auto-rows: 78px !important;
          gap: 10px !important;
          align-items: stretch !important;
          justify-items: stretch !important;
          overflow: hidden !important;
          padding: 0 !important;
          margin: 0 !important;
          border: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
        }

        html body .software-inventory-module.settings-module-root .software-hero-kpi-grid .software-kpi-card,
        html body .software-inventory-module.settings-module-root .software-hero-kpi-grid .ema-kpi-card {
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
          height: 78px !important;
          min-height: 78px !important;
          max-height: 78px !important;
          margin: 0 !important;
          padding: 10px 11px !important;
          border: 1px solid rgba(203, 213, 225, 0.95) !important;
          border-radius: 14px !important;
          background: #ffffff !important;
          box-shadow: none !important;
          outline: none !important;
          color: #0f2746 !important;
          display: block !important;
          overflow: hidden !important;
          cursor: pointer !important;
          transform: none !important;
          text-align: left !important;
        }

        html body .software-inventory-module.settings-module-root .software-hero-kpi-grid .software-kpi-card:hover,
        html body .software-inventory-module.settings-module-root .software-hero-kpi-grid .software-kpi-card.is-active,
        html body .software-inventory-module.settings-module-root .software-hero-kpi-grid .ema-kpi-card:hover,
        html body .software-inventory-module.settings-module-root .software-hero-kpi-grid .ema-kpi-card.is-active {
          border-color: #c7d2fe !important;
          background: #f8f7ff !important;
          box-shadow: inset 3px 0 0 #4f46e5 !important;
        }

        html body .software-inventory-module.settings-module-root .software-hero-kpi-grid .software-kpi-content,
        html body .software-inventory-module.settings-module-root .software-hero-kpi-grid .ema-kpi-content {
          width: 100% !important;
          height: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
          display: grid !important;
          grid-template-columns: 30px minmax(0, 1fr) !important;
          grid-template-rows: 13px 24px 13px !important;
          column-gap: 8px !important;
          row-gap: 3px !important;
          align-items: center !important;
          justify-content: stretch !important;
          overflow: hidden !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        html body .software-inventory-module.settings-module-root .software-hero-kpi-grid .software-kpi-icon,
        html body .software-inventory-module.settings-module-root .software-hero-kpi-grid .ema-kpi-icon {
          grid-column: 1 !important;
          grid-row: 1 / 4 !important;
          width: 30px !important;
          height: 30px !important;
          min-width: 30px !important;
          min-height: 30px !important;
          padding: 7px !important;
          border-radius: 999px !important;
          background: #eef5ff !important;
          color: #2563eb !important;
          box-shadow: none !important;
          margin: 0 !important;
          align-self: center !important;
          justify-self: center !important;
          display: grid !important;
          place-items: center !important;
        }

        html body .software-inventory-module.settings-module-root .software-hero-kpi-grid .software-kpi-icon svg,
        html body .software-inventory-module.settings-module-root .software-hero-kpi-grid .ema-kpi-icon svg {
          width: 16px !important;
          height: 16px !important;
          min-width: 16px !important;
          min-height: 16px !important;
          padding: 0 !important;
          margin: 0 !important;
          color: currentColor !important;
          background: transparent !important;
          box-shadow: none !important;
          display: block !important;
        }

        html body .software-inventory-module.settings-module-root .software-hero-kpi-grid .software-kpi-label,
        html body .software-inventory-module.settings-module-root .software-hero-kpi-grid .ema-kpi-label {
          grid-column: 2 !important;
          grid-row: 1 !important;
          min-width: 0 !important;
          max-width: 100% !important;
          color: #64748b !important;
          font-size: 8.8px !important;
          font-weight: 600 !important;
          line-height: 1 !important;
          letter-spacing: 0.045em !important;
          text-transform: uppercase !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          margin: 0 !important;
          padding: 0 !important;
          display: block !important;
        }

        html body .software-inventory-module.settings-module-root .software-hero-kpi-grid .software-kpi-value,
        html body .software-inventory-module.settings-module-root .software-hero-kpi-grid .ema-kpi-value {
          grid-column: 2 !important;
          grid-row: 2 !important;
          min-width: 0 !important;
          max-width: 100% !important;
          color: #0f2746 !important;
          font-size: 18px !important;
          font-weight: 650 !important;
          line-height: 1 !important;
          letter-spacing: -0.025em !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          margin: 0 !important;
          padding: 0 !important;
          display: block !important;
        }

        html body .software-inventory-module.settings-module-root .software-hero-kpi-grid .software-kpi-note,
        html body .software-inventory-module.settings-module-root .software-hero-kpi-grid .ema-kpi-note {
          grid-column: 2 !important;
          grid-row: 3 !important;
          min-width: 0 !important;
          max-width: 100% !important;
          color: #64748b !important;
          font-size: 9.2px !important;
          font-weight: 500 !important;
          line-height: 1.05 !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          margin: 0 !important;
          padding: 0 !important;
          display: block !important;
        }

        html body .software-inventory-module.settings-module-root .settings-hero.software-hero::before,
        html body .software-inventory-module.settings-module-root .settings-hero.software-hero::after {
          display: none !important;
          content: none !important;
        }

        @media (max-width: 1320px) {
          html body .software-inventory-module.settings-module-root .settings-hero.software-hero {
            grid-template-columns: minmax(320px, 0.8fr) minmax(660px, 1.2fr) !important;
          }

          html body .software-inventory-module.settings-module-root .software-hero-kpi-grid .software-kpi-note,
          html body .software-inventory-module.settings-module-root .software-hero-kpi-grid .ema-kpi-note {
            display: none !important;
          }
        }
      `}</style>

      
      <style>{`
        /* SOFTWARE_DROPDOWN_AND_TABLE_WRAP_FINAL_FIX */

        /* Dropdown final fix */
        html body .software-inventory-module .software-filter-row.software-filter-row--toolbar {
          overflow: visible !important;
          position: relative !important;
          z-index: 20 !important;
        }

        html body .software-inventory-module .software-filter-group {
          min-width: 0 !important;
          width: 100% !important;
          display: grid !important;
          gap: 7px !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
          position: relative !important;
        }

        html body .software-inventory-module .software-filter-group label {
          margin: 0 !important;
          color: #0f2746 !important;
          font-size: 11px !important;
          font-weight: 650 !important;
          line-height: 1 !important;
          letter-spacing: 0 !important;
          text-transform: none !important;
        }

        html body .software-inventory-module .ema-sw-select {
          width: 100% !important;
          min-width: 0 !important;
          height: 38px !important;
          position: relative !important;
          display: block !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
        }

        html body .software-inventory-module .ema-sw-select-trigger {
          width: 100% !important;
          min-width: 0 !important;
          height: 38px !important;
          min-height: 38px !important;
          max-height: 38px !important;
          border: 1px solid rgba(203, 213, 225, 0.95) !important;
          border-radius: 12px !important;
          background: #ffffff !important;
          color: #0f2746 !important;
          padding: 0 12px !important;
          margin: 0 !important;
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) 16px !important;
          gap: 8px !important;
          align-items: center !important;
          text-align: left !important;
          font-size: 11.8px !important;
          font-weight: 600 !important;
          line-height: 1 !important;
          box-shadow: none !important;
          outline: none !important;
          cursor: pointer !important;
          overflow: hidden !important;
        }

        html body .software-inventory-module .ema-sw-select-trigger:hover {
          border-color: #c9dbff !important;
          background: #fbfdff !important;
        }

        html body .software-inventory-module .ema-sw-select-trigger:focus,
        html body .software-inventory-module .ema-sw-select-trigger:focus-visible,
        html body .software-inventory-module .ema-sw-select.is-open .ema-sw-select-trigger,
        html body .software-inventory-module .ema-sw-select.open .ema-sw-select-trigger {
          border-color: #93c5fd !important;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.10) !important;
          outline: none !important;
        }

        html body .software-inventory-module .ema-sw-select-trigger span {
          min-width: 0 !important;
          max-width: 100% !important;
          color: #0f2746 !important;
          font-size: 11.8px !important;
          font-weight: 600 !important;
          line-height: 1 !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }

        html body .software-inventory-module .ema-sw-select-trigger svg {
          width: 15px !important;
          height: 15px !important;
          min-width: 15px !important;
          color: #64748b !important;
          justify-self: end !important;
        }

        html body .software-inventory-module .ema-sw-select-menu {
          position: absolute !important;
          top: calc(100% + 6px) !important;
          left: 0 !important;
          right: 0 !important;
          z-index: 2147482800 !important;
          min-width: 100% !important;
          max-height: 240px !important;
          overflow: auto !important;
          border: 1px solid rgba(203, 213, 225, 0.95) !important;
          border-radius: 12px !important;
          background: #ffffff !important;
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.16) !important;
          padding: 6px !important;
        }

        html body .software-inventory-module .ema-sw-select-option {
          width: 100% !important;
          min-height: 32px !important;
          border: 0 !important;
          border-radius: 9px !important;
          background: transparent !important;
          color: #0f2746 !important;
          padding: 0 10px !important;
          margin: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: flex-start !important;
          text-align: left !important;
          font-size: 11.5px !important;
          font-weight: 500 !important;
          line-height: 1 !important;
          cursor: pointer !important;
          box-shadow: none !important;
          outline: none !important;
        }

        html body .software-inventory-module .ema-sw-select-option:hover,
        html body .software-inventory-module .ema-sw-select-option.selected,
        html body .software-inventory-module .ema-sw-select-option.is-selected {
          background: #eef5ff !important;
          color: #2563eb !important;
        }

        /* Remove old black-border dropdown class effect */
        html body .software-inventory-module .software-filter-row--toolbar .setting-select-trigger,
        html body .software-inventory-module .software-filter-row--toolbar .software-custom-select-trigger,
        html body .software-inventory-module .software-filter-row--toolbar .ema-sw-select-trigger {
          border: 1px solid rgba(203, 213, 225, 0.95) !important;
          background: #ffffff !important;
          box-shadow: none !important;
          outline: none !important;
        }

        /* Table layout final wrap fix */
        html body .software-inventory-module .software-device-table.software-standard-table {
          width: calc(100% - 28px) !important;
          max-width: calc(100% - 28px) !important;
          margin-left: 14px !important;
          margin-right: 14px !important;
          overflow: auto !important;
        }

        html body .software-inventory-module .software-device-table .software-standard-row.software-device-table-row,
        html body .software-inventory-module .software-device-table .software-device-table-row {
          display: grid !important;
          grid-template-columns:
            56px
            minmax(160px, 1.55fr)
            minmax(160px, 1.45fr)
            minmax(110px, 0.75fr)
            minmax(130px, 0.95fr)
            minmax(150px, 1.05fr)
            minmax(140px, 1fr) !important;
          min-width: 100% !important;
          width: 100% !important;
          align-items: stretch !important;
        }

        html body .software-inventory-module .software-device-table .software-standard-row.software-device-table-row:not(.head),
        html body .software-inventory-module .software-device-table .software-device-table-row:not(.head),
        html body .software-inventory-module .software-device-table .user-row:not(.head) {
          height: auto !important;
          min-height: 72px !important;
        }

        html body .software-inventory-module .software-device-table .user-cell {
          min-width: 0 !important;
          max-width: 100% !important;
          min-height: 72px !important;
          height: auto !important;
          padding: 12px 12px !important;
          display: flex !important;
          align-items: center !important;
          overflow: visible !important;
          white-space: normal !important;
        }

        html body .software-inventory-module .software-device-table .head .user-cell,
        html body .software-inventory-module .software-device-table .user-row.head .user-cell {
          min-height: 50px !important;
          height: 50px !important;
          padding-top: 14px !important;
          padding-bottom: 14px !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }

        /* Force long text to wrap, overriding old inline nowrap */
        html body .software-inventory-module .software-device-table .user-row:not(.head) .user-cell,
        html body .software-inventory-module .software-device-table .user-row:not(.head) .user-cell *,
        html body .software-inventory-module .software-device-table .software-user-name,
        html body .software-inventory-module .software-device-table .software-user-name *,
        html body .software-inventory-module .software-device-table .software-device-cell,
        html body .software-inventory-module .software-device-table .software-device-cell *,
        html body .software-inventory-module .software-device-table .software-category-cell,
        html body .software-inventory-module .software-device-table .software-category-cell *,
        html body .software-inventory-module .software-device-table .software-type-cell,
        html body .software-inventory-module .software-device-table .software-type-cell *,
        html body .software-inventory-module .software-device-table .software-text-cell,
        html body .software-inventory-module .software-device-table .software-model-text,
        html body .software-inventory-module .software-device-table .software-date-cell {
          white-space: normal !important;
          overflow: visible !important;
          text-overflow: unset !important;
          overflow-wrap: anywhere !important;
          word-break: break-word !important;
          line-height: 1.35 !important;
        }

        html body .software-inventory-module .software-device-table .software-user-name,
        html body .software-inventory-module .software-device-table .software-device-cell,
        html body .software-inventory-module .software-device-table .software-category-cell,
        html body .software-inventory-module .software-device-table .software-type-cell {
          display: flex !important;
          flex-direction: column !important;
          align-items: flex-start !important;
          justify-content: center !important;
          gap: 3px !important;
        }

        html body .software-inventory-module .software-device-table .user-row:not(.head) .user-cell strong,
        html body .software-inventory-module .software-device-table .user-row:not(.head) .user-cell span,
        html body .software-inventory-module .software-device-table .user-row:not(.head) .user-cell small,
        html body .software-inventory-module .software-device-table .user-row:not(.head) .user-cell em {
          display: block !important;
          max-width: 100% !important;
          color: inherit !important;
        }

        /* Keep row number compact */
        html body .software-inventory-module .software-device-table .row-index-pill,
        html body .software-inventory-module .software-device-table .software-row-no {
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          word-break: normal !important;
        }
      `}</style>

      {toast && (
        <div>
          <div>
            <div>{toast.type === "error" ? <AlertTriangle size={18} /> : <ShieldCheck size={18} />}</div>
            <div><strong>{toast.title}</strong><span>{toast.message}</span></div>
            <button type="button" onClick={() => setToast(null)}><X size={15} /></button>
          </div>
        </div>
      )}

      <div>
        <aside>
          <div>
            <span>SOFTWARE</span>
            <strong>Software</strong>
            <small>Browse software records, devices and statistics.</small>
          </div>

          <nav id="softwareMenu" role="tablist" aria-label="Software navigation">
            <button
              type="button"
              onClick={() => setSidebarTab("organization")}
            >
              <span><FolderOpen size={16} /></span>
              <span><strong>Branch</strong><small>Branch endpoint scope</small></span>
            </button>
            <button
              type="button"
              onClick={() => setSidebarTab("statistic")}
            >
              <span><Database size={16} /></span>
              <span><strong>Statistics</strong><small>Software evidence views</small></span>
            </button>
          </nav>

          <div>
            <div>
              <div>
                <Search size={15} />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={sidebarTab === "organization" ? "Search branches..." : "Search statistics..."}
                />
                {searchTerm && <button type="button" onClick={() => setSearchTerm("")}><X size={14} /></button>}
              </div>

              {sidebarTab === "organization" ? (
                <div aria-label="Software organization tree">
                  {treeError ? <div>{treeError}</div> : null}
                  {deviceTree && !treeError ? (
                    renderTree(deviceTree, 0, "organization")
                  ) : null}
                </div>
              ) : (
                <div aria-label="Software statistics tree">
                  <div><Database size={15} /><span>Statistics</span></div>
                  {renderTree(statisticTree, 0, "statistic")}
                </div>
              )}
            </div>
          </div>

        </aside>

        <section>
          <section>
            <div>
              <span>SOFTWARE</span>
              <h2>Software</h2>
              <p>Manage installed software records, package statistics, file extension evidence and scan jobs from one locked workspace.</p>
            </div>
            <div>
            <button type="button" onClick={() => activateView("all")}>
              <div><div><Package size={18} /></div><span>Total Records</span><strong>{summary.totalRecords}</strong><small>{selected.tableKey === "registry" ? `${filteredRecords.length} shown` : "registry records"}</small></div>
            </button>
            <button type="button" onClick={() => activateView("unique")}>
              <div><div><BarChart3 size={18} /></div><span>Unique Software</span><strong>{summary.uniqueSoftware}</strong><small>unique names</small></div>
            </button>
            <button type="button" onClick={() => activateView("installed")}>
              <div><div><MonitorSmartphone size={18} /></div><span>Installed Devices</span><strong>{summary.uniqueDevices}</strong><small>linked devices</small></div>
            </button>
            <button type="button" onClick={() => activateView("categories")}>
              <div><div><Layers size={18} /></div><span>Categories</span><strong>{summary.categories}</strong><small>class types</small></div>
            </button>
            <button type="button" onClick={() => activateView("unclassified")}>
              <div><div><AlertTriangle size={18} /></div><span>Unclassified</span><strong>{summary.unclassified}</strong><small>no category</small></div>
            </button>
          </div>
          </section>

          <section>
            <div>
              <div>
                <button type="button" onClick={() => setShowInsightsModal(true)}><FileText size={15} />Insights <span>{classificationCoverage}%</span></button>
                <button type="button" onClick={() => void handleSoftwareScan("device")} disabled={!selectedDevice || scanLoading}><MonitorSmartphone size={15} />Scan Device</button>
                <button type="button" onClick={() => void handleSoftwareScan("folder")} disabled={!selectedFolder || scanLoading}><FolderOpen size={15} />Scan Folder</button>
                <button type="button" onClick={() => void handleSoftwareScan("all")} disabled={scanLoading}><RefreshCw size={15} />Scan All</button>
                <div><Search size={15} /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search software records..." />{searchTerm && <button type="button" onClick={() => setSearchTerm("")}><X size={14} /></button>}</div>
                <button type="button" onClick={() => void refreshCurrentView()} title="Refresh" aria-label="Refresh software records"><RefreshCw size={15} /></button>
                <button type="button" onClick={exportCurrentView} disabled={isDataLoading || activeRowsCount === 0}><Download size={15} />Export</button>
              </div>

              {selected.tableKey === "registry" ? (
                <div>
                  <FilterSelect selectKey="category" label="Category" value={categoryFilter} options={categoryOptions} allLabel="All category" onChange={(value) => { setCategoryFilter(value); setActiveView(value === "Unclassified" ? "unclassified" : "all"); }} />
                  <FilterSelect selectKey="os" label="Operating System" value={osFilter} options={osOptions} allLabel="All OS" onChange={setOsFilter} />
                </div>
              ) : (
                <div aria-hidden="true" />
              )}
            </div>

            {selected.tableKey !== "registry" && (
              <div>
                {selected.tableKey === "installedSoftware" && (
                  <>
                    <div><span>Software Titles</span><strong>{installedStats.totalSoftware}</strong><small>installed registry</small></div>
                    <div><span>License Used</span><strong>{installedStats.totalUsed}</strong><small>current usage</small></div>
                    <div><span>Expiring Soon</span><strong>{installedStats.expiringSoon}</strong><small>within 90 days</small></div>
                  </>
                )}
                {selected.tableKey === "licenseStatus" && (
                  <>
                    <div><span>Authorized</span><strong>{licenseStats.authorized}</strong><small>valid packages</small></div>
                    <div><span>Limited</span><strong>{licenseStats.limited}</strong><small>limited seats</small></div>
                    <div><span>Unauthorized</span><strong>{licenseStats.unauthorized}</strong><small>needs review</small></div>
                  </>
                )}
                {(selected.tableKey === "fileExtensionExe" || selected.tableKey === "fileExtensionDll" || selected.tableKey === "fileExtensionIni") && (
                  <>
                    <div><span>Extension</span><strong>{getExtensionFromTableKey(selected.tableKey)}</strong><small>file inventory</small></div>
                    <div><span>Files</span><strong>{getFileExtensionLoadedCount(selected.tableKey)}</strong><small>loaded records</small></div>
                    <div><span>Scope</span><strong>{selectedFolder?.label || "All"}</strong><small>selected folder</small></div>
                  </>
                )}
              </div>
            )}

            {apiError && selected.tableKey === "registry" && <div><AlertTriangle size={16} /><div><strong>Software API failed</strong><span>{apiError}</span></div></div>}
            {tableError && selected.tableKey !== "registry" && <div><AlertTriangle size={16} /><div><strong>View failed</strong><span>{tableError}</span></div></div>}

            <div role="table" aria-label={tableTitle}>
              {selected.tableKey === "registry" ? (
                <>
                  <div role="row">
                    <div>#</div>
                    <div><SortButton label="Software Name" columnKey="softwareName" /></div>
                    <div><SortButton label="Category" columnKey="category" /></div>
                    <div><SortButton label="Device" columnKey="deviceName" /></div>
                    <div><SortButton label="Version" columnKey="version" /></div>
                    <div><SortButton label="Type" columnKey="machineType" /></div>
                    <div><SortButton label="Last Updated" columnKey="lastUpdated" /></div>
                  </div>
                  {!isDataLoading && pageRegistryRecords.map((record, index) => (
                    <div role="row" key={record.id}>
                      <div><span>{String((page - 1) * PAGE_SIZE + index + 1).padStart(2, "0")}</span></div>
                      <div><div><span /><div><strong title={record.softwareName}>{record.softwareName}</strong><small>{record.publisher || record.assetTag || "-"}</small></div></div></div>
                      <div><div><strong>{record.category}</strong><small>{record.publisher || "Software category"}</small></div></div>
                      <div><div><strong title={record.deviceName}>{record.deviceName}</strong><small>{record.ip || record.assetTag || "-"}</small></div></div>
                      <div><span>{record.version}</span></div>
                      <div><div><strong>{record.machineType || "-"}</strong><small>{record.os || "-"}</small></div></div>
                      <div><span>{formatDateTime(record.lastUpdated)}</span></div>
                    </div>
                  ))}
                  {!pageRegistryRecords.length && !isDataLoading && <div><Package size={24} /><strong>No software records found</strong><span>No records match the current filter/search.</span></div>}
                </>
              ) : (
                <>
                  <div data-table-key={selected.tableKey} role="row">
                    <div>#</div>
                    {tableColumns[selected.tableKey].map((column, index) => <div key={column}><TableSortButton label={column} index={index} /></div>)}
                  </div>
                  {!isDataLoading && pageTableRows.map((row, rowIndex) => (
                    <div data-table-key={selected.tableKey} role="row" key={`${selected.tableKey}-${rowIndex}`} style={{ gridTemplateColumns: `56px repeat(${tableColumns[selected.tableKey].length}, minmax(150px, 1fr))` }}>
                      <div><span>{String((page - 1) * PAGE_SIZE + rowIndex + 1).padStart(2, "0")}</span></div>
                      {row.slice(0, tableColumns[selected.tableKey].length).map((cell, cellIndex) => <div key={cellIndex}>{cell}</div>)}
                    </div>
                  ))}
                  {!pageTableRows.length && !isDataLoading && <div><Database size={24} /><strong>No software records loaded</strong><span>Choose a folder, device or statistic view to load data.</span></div>}
                </>
              )}
            </div>

            {!isDataLoading && activeRowsCount > 0 && (
              <div aria-label="Software pagination">
                <div>Page {page} of {totalPages}</div>
                <div>
                  <button type="button" onClick={() => setPage(1)} disabled={page <= 1} aria-label="First page">&laquo;</button>
                  <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} aria-label="Previous page">&lsaquo;</button>
                  <span>{page}</span>
                  <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages} aria-label="Next page">&rsaquo;</button>
                  <button type="button" onClick={() => setPage(totalPages)} disabled={page >= totalPages} aria-label="Last page">&raquo;</button>
                </div>
              </div>
            )}
          </section>
        </section>
      </div>

      {showInsightsModal && (
        <div role="dialog" aria-modal="true" onClick={() => setShowInsightsModal(false)}>
          <section onClick={(event) => event.stopPropagation()}>
            <div>
              <div><div><FileText size={22} /></div><div><span>Software Insights</span><h2>Inventory Overview</h2><p>Computed from current inventory data without shrinking the registry table.</p></div></div>
              <button type="button" onClick={() => setShowInsightsModal(false)} aria-label="Close software insights"><X size={18} /></button>
            </div>
            <div>
              <div>
                <button type="button" onClick={() => { activateView("all"); setShowInsightsModal(false); }}><span>Inventory Health</span><strong>{summary.totalRecords}</strong><small>{filteredRecords.length} visible records</small></button>
                <button type="button" onClick={() => { activateView("categories"); setShowInsightsModal(false); }}><span>Classified Coverage</span><strong>{classificationCoverage}%</strong><div aria-hidden="true"><i style={{ width: `${classificationCoverage}%` }} /></div><small>{summary.categories} class types</small></button>
                <button type="button" onClick={() => { activateView("unclassified"); setShowInsightsModal(false); }}><span>Needs Attention</span><strong>{summary.unclassified}</strong><small>records without category</small></button>
              </div>
              <div>
                <div><div><Package size={15} /><div><strong>Top Software</strong><small>Highest installed software names</small></div></div><div>{topSoftware.map((item) => <button type="button" key={item.label} onClick={() => { setSearchTerm(item.label); setSelected({ mode: "registry", tableKey: "registry", label: "Software" }); setShowInsightsModal(false); }}><span>{item.label}</span><strong>{item.count}</strong></button>)}{!topSoftware.length && <div>No software data yet.</div>}</div></div>
                <div><div><HardDrive size={15} /><div><strong>Device Mix</strong><small>Records grouped by device type</small></div></div><div>{typeCounts.slice(0, 6).map((item) => <button type="button" key={item.label} onClick={() => { setTypeScope(item.label); setShowInsightsModal(false); }}><span>{item.label}</span><strong>{item.count}</strong></button>)}{!typeCounts.length && <div>No device data yet.</div>}</div></div>
                <div><div><Layers size={15} /><div><strong>Categories</strong><small>Quick category drilldown</small></div></div><div>{categoryCounts.slice(0, 6).map((item) => <button type="button" key={item.label} onClick={() => { setCategoryScope(item.label); setShowInsightsModal(false); }}><span>{item.label}</span><strong>{item.count}</strong></button>)}{!categoryCounts.length && <div>No category data yet.</div>}</div></div>
              </div>
            </div>
            <div><button type="button" onClick={() => { resetFilters(); setShowInsightsModal(false); }}><X size={14} />Reset Filters</button><button type="button" onClick={() => void handleSoftwareScan("all")} disabled={scanLoading}><RefreshCw size={15} />Scan All</button></div>
          </section>
        </div>
      )}

    </main>
  );
}
