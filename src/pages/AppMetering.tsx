import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
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
  Filter,
  Folder,
  FolderOpen,
  Gauge,
  Package,
  Play,
  RefreshCw,
  Search,
  StopCircle,
  UserRound,
  X,
} from "lucide-react";
import appMeteringService from "../services/appMeteringService";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type ViewMode = "device" | "package";
type ToastType = "success" | "error" | "info";

type ToastState = {
  type: ToastType;
  title: string;
  message: string;
} | null;

type TreeNode = {
  id: string;
  label: string;
  subLabel?: string;
  status?: string;
  type: "folder" | "device" | "package";
  count?: number;
  relationID?: number;
  objectRootIdn?: number;
  objectDeviceID?: string;
  objectAgent?: string;
  mdmAssetIdn?: number;
  packageId?: number;
  raw?: Record<string, unknown>;
  children?: TreeNode[];
};

type PackageRow = {
  id: string;
  SW_Pkg_Idn: number;
  label: string;
  name: string;
  manufacturer: string;
  classification: string;
  raw?: Record<string, unknown>;
};

type PackageFileRow = {
  id: string;
  fileName: string;
  originalFileName: string;
  version: string;
  fileSize: string;
  raw?: Record<string, unknown>;
};

type ApiAsset = {
  _Idn?: number;
  Object_Root_Idn?: number;
  Object_Agent?: string;
  Object_DeviceID?: string;
  ComputerName?: string;
  Object_Client_Name?: string;
  OwnerName?: string;
  DeviceOwner?: string;
  DisplayName?: string;
  UserName?: string;
  LastLoggedInUser?: string;
  Object_Full_Name?: string;
  Object_Rel_Idn?: number;
  MDM_Asset_Idn?: number;
  MDM_DeviceID?: string;
  MDM_DeviceName?: string;
  PlatformType?: string;
  Model?: string;
  ConnectionStatus?: string;
  IP?: string;
  [key: string]: unknown;
};

type UsageRow = {
  id: string;
  application: string;
  publisher: string;
  version: string;
  fileName: string;
  originalFileName: string;
  device: string;
  user: string;
  site: string;
  ip: string;
  filePath: string;
  appStartTime: string;
  appEndTime: string;
  usedTimeHours: number;
  usedTimeSeconds: number;
  launchCount: number;
  lastUsed: string;
  raw?: Record<string, unknown>;
};

type ApiDepartment = {
  Object_Rel_Idn?: number;
  Object_Rel_Name?: string;
  Object_Full_Name?: string;
  Object_PR_Idn?: number;
  children?: ApiDepartment[];
  [key: string]: unknown;
};

type DepartmentPath = {
  key: string;
  relationID: number;
  label: string;
  pathKeys: string[];
  groupPath: string;
};

type AppMeteringStats = {
  totalRecords?: number;
  uniqueApplications?: number;
  totalUsageSeconds?: number;
  rows?: unknown[];
};

type MeteringActiveRecord = {
  startedAt: string;
  scopeLabel: string;
  scanMode: string;
  packageId: number;
  jobIdn?: number;
  jobCommand?: number;
};

type MeteringActiveMap = Record<string, MeteringActiveRecord>;

const PAGE_SIZE = 10;
const METERING_ACTIVE_STORAGE_KEY = "ema-application-metering-active-scopes";

const emptyNode: TreeNode = {
  id: "organization",
  label: "Organization",
  type: "folder",
  relationID: -1,
  count: 0,
  children: [],
};

const emptyUsageRow: UsageRow = {
  id: "empty",
  application: "No application selected",
  publisher: "-",
  version: "-",
  fileName: "-",
  originalFileName: "-",
  device: "-",
  user: "-",
  site: "-",
  ip: "-",
  filePath: "-",
  appStartTime: "-",
  appEndTime: "-",
  usedTimeHours: 0,
  usedTimeSeconds: 0,
  launchCount: 0,
  lastUsed: "-",
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function getDataArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  const envelope = asRecord(payload);
  if (!envelope) return [];

  const dataObject = asRecord(envelope.data);
  if (Array.isArray(envelope.rows)) return envelope.rows as T[];
  if (Array.isArray(envelope.data)) return envelope.data as T[];
  if (Array.isArray(dataObject?.rows)) return dataObject.rows as T[];
  if (Array.isArray(envelope.raw)) return envelope.raw as T[];
  if (Array.isArray(dataObject?.raw)) return dataObject.raw as T[];

  return [];
}

function getTransportPayload(payload: unknown): Record<string, unknown> | unknown {
  const envelope = asRecord(payload);
  const data = asRecord(envelope?.data);

  // axios-style response shape: { data: { success, data, raw, ... }, status, headers, ... }
  if (data && (
    Object.prototype.hasOwnProperty.call(data, "success") ||
    Object.prototype.hasOwnProperty.call(data, "raw") ||
    Object.prototype.hasOwnProperty.call(data, "rows") ||
    Object.prototype.hasOwnProperty.call(data, "procedure") ||
    Object.prototype.hasOwnProperty.call(data, "totalRecords")
  )) {
    return data;
  }

  return payload;
}

function getUsageDataArray<T>(payload: unknown): T[] {
  const unwrapped = getTransportPayload(payload);
  if (Array.isArray(unwrapped)) return unwrapped as T[];

  const envelope = asRecord(unwrapped);
  if (!envelope) return [];

  const dataObject = asRecord(envelope.data);

  // For Application Metering, the backend-normalized `data` can lose SW_FileName,
  // ActiveTime, CCount, App_StartTime and App_EndTime. Prefer raw SP rows.
  if (Array.isArray(envelope.raw)) return envelope.raw as T[];
  if (Array.isArray(dataObject?.raw)) return dataObject.raw as T[];
  if (Array.isArray(dataObject?.rows)) return dataObject.rows as T[];
  if (Array.isArray(envelope.rows)) return envelope.rows as T[];
  if (Array.isArray(envelope.data)) return envelope.data as T[];

  return [];
}

function getDataObject(payload: unknown): Record<string, unknown> {
  const envelope = asRecord(payload);
  const data = asRecord(envelope?.data);
  return data || envelope || {};
}

function getEnvelopeData<T>(payload: unknown, fallback: T): T {
  const envelope = asRecord(payload);
  if (!envelope) return fallback;
  return (envelope.data as T) ?? (envelope as T) ?? fallback;
}

function isBlankValue(value: unknown) {
  if (value === undefined || value === null) return true;
  const text = String(value).trim();
  return !text || text === "-" || text.toLowerCase() === "null" || text.toLowerCase() === "undefined";
}

function pickValue(record: Record<string, unknown> | null | undefined, keys: string[], fallback = "") {
  if (!record) return fallback;
  const lowerMap = new Map(Object.keys(record).map((key) => [key.toLowerCase(), key]));

  for (const key of keys) {
    const actualKey = lowerMap.get(key.toLowerCase());
    const value = actualKey ? record[actualKey] : undefined;
    if (!isBlankValue(value)) return String(value).trim();
  }

  return fallback;
}

function parseNumber(value: unknown, fallback = 0) {
  if (isBlankValue(value)) return fallback;
  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatDateInput(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
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

function defaultStartDate() {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return formatDateInput(date);
}

function mapDepartmentNode(department: ApiDepartment): TreeNode {
  const relationID = parseNumber(department.Object_Rel_Idn, 0);
  const label = department.Object_Rel_Name || department.Object_Full_Name || `Department ${relationID}`;
  return {
    id: `relation-${relationID}`,
    label,
    type: "folder",
    relationID,
    count: parseNumber(department.TotalDevices ?? department.DeviceCount ?? department.Count, 0),
    raw: department,
    children: department.children?.map(mapDepartmentNode) || [],
  };
}

function buildDepartmentTree(departments: ApiDepartment[]) {
  return [{ ...emptyNode, count: departments.length, children: departments.map(mapDepartmentNode) }];
}

function collectDepartmentPaths(nodes: TreeNode[], parentKeys: string[] = [], parentLabels: string[] = []): DepartmentPath[] {
  return nodes.flatMap((node) => {
    const currentKeys = [...parentKeys, node.id];
    const currentLabels = [...parentLabels, node.label];
    const relationID = Number(node.relationID ?? Number.NaN);
    const currentPath: DepartmentPath[] = Number.isFinite(relationID) && relationID > 0
      ? [
          {
            key: node.id,
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

function buildPackageTree(packages: PackageRow[]) {
  const groups = new Map<string, PackageRow[]>();
  for (const item of packages) {
    const groupName = item.classification || "Application";
    groups.set(groupName, [...(groups.get(groupName) || []), item]);
  }

  const children: TreeNode[] = Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([groupName, items]) => ({
      id: `pkg-group-${groupName}`,
      label: groupName,
      type: "folder",
      count: items.length,
      children: items
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((pkg) => ({
          id: `package-${pkg.SW_Pkg_Idn}`,
          label: pkg.name,
          type: "package" as const,
          packageId: pkg.SW_Pkg_Idn,
          count: 0,
          raw: pkg.raw,
        })),
    }));

  return [{ id: "all-packages", label: "Application Packages", type: "folder" as const, count: packages.length, children }];
}

function flattenTree(nodes: TreeNode[]): TreeNode[] {
  return nodes.flatMap((node) => [node, ...(node.children ? flattenTree(node.children) : [])]);
}

function secondsToHours(seconds: number) {
  return seconds / 3600;
}

function formatUsageDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(Number.isFinite(seconds) ? seconds : 0));
  if (safeSeconds <= 0) return "0s";

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  if (hours > 0) {
    const decimalHours = safeSeconds / 3600;
    return `${decimalHours.toFixed(decimalHours >= 10 ? 0 : 1)}h`;
  }

  if (minutes > 0) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  return `${remainingSeconds}s`;
}

function normalizePackageRow(row: unknown, index = 0): PackageRow {
  const record = asRecord(row) || {};
  const id = parseNumber(pickValue(record, ["SW_Pkg_Idn", "SW_Pkg_ID", "SWPkgIdn", "SW_Idn", "id"], String(index + 1)), index + 1);
  const name = pickValue(record, ["label", "name", "SW_Pkg_Name", "SWPkgName", "PackageName", "ApplicationPackage"], `Package ${index + 1}`);
  return {
    id: String(id),
    SW_Pkg_Idn: id,
    label: name,
    name,
    manufacturer: pickValue(record, ["manufacturer", "Manufacturer", "CompanyName", "Vendor"], "-"),
    classification: pickValue(record, ["classification", "Classification", "CategoryName", "SW_Category"], "Application"),
    raw: record,
  };
}

function normalizePackageFileRow(row: unknown, index = 0): PackageFileRow {
  const record = asRecord(row) || {};
  const fileName = pickValue(record, [
    "fileName",
    "FileName",
    "File_Name",
    "SW_File_Name",
    "ProcessName",
    "EXE_Name",
  ], `File ${index + 1}`);

  return {
    id: String(pickValue(record, ["id", "ID", "SW_File_Idn", "File_Idn", "No"], String(index + 1))),
    fileName,
    originalFileName: pickValue(record, ["originalFileName", "OriginalFileName", "Original_File_Name", "OriginalName"], "-"),
    version: pickValue(record, ["version", "Version", "FileVersion", "SW_Version"], "-"),
    fileSize: pickValue(record, ["FileSize", "File_Size", "Size"], "-"),
    raw: record,
  };
}

function normalizeAssetNode(row: unknown, department: DepartmentPath, index = 0): TreeNode | null {
  const record = asRecord(row) || {};
  const agent = pickValue(record, ["Object_Agent", "Agent", "Source"], "EM").toUpperCase();
  const rawAssetId = parseNumber(pickValue(record, ["_Idn", "Object_Root_Idn", "ObjectRootIdn", "ClientID", "MDM_Asset_Idn"], "0"), 0);
  if (!rawAssetId) return null;

  const deviceIdentifier = pickValue(record, ["Object_DeviceID", "DeviceID", "deviceID", "MDM_DeviceID"], "");
  const deviceName = pickValue(record, [
    "DeviceName",
    "DeviceDisplayName",
    "ComputerName",
    "MDM_DeviceName",
    "Name",
    "Object_DeviceID",
  ], `Device ${index + 1}`);

  const ownerName = pickValue(record, [
    "DisplayName",
    "OwnerName",
    "DeviceOwner",
    "UserName",
    "LastLoggedInUser",
    "Object_Client_Name",
    "Owner",
    "LoginUser",
  ], "-");

  const siteName = pickValue(record, ["Object_Full_Name", "Department", "Site", "GroupName"], department.groupPath || department.label);
  const status = pickValue(record, ["ConnectionStatus", "Status"], "-");
  const objectRootIdn = agent === "EM" ? rawAssetId : 0;
  const mdmAssetIdn = agent === "MDM" ? rawAssetId : parseNumber(pickValue(record, ["MDM_Asset_Idn"], "0"), 0);
  const ownerIsUseful = ownerName && ownerName !== "-" && ownerName.toLowerCase() !== deviceName.toLowerCase();
  const subLabel = ownerIsUseful ? ownerName : siteName;

  return {
    id: `device-${agent || "ASSET"}-${rawAssetId}`,
    label: deviceName,
    subLabel,
    status,
    type: "device",
    relationID: department.relationID,
    objectRootIdn,
    objectDeviceID: deviceIdentifier,
    objectAgent: agent,
    mdmAssetIdn,
    count: 0,
    raw: {
      ...record,
      _Idn: rawAssetId,
      Object_Agent: agent,
      Object_Rel_Idn: department.relationID,
      ComputerName: deviceName,
      DeviceName: deviceName,
      OwnerName: ownerName,
      DisplayName: ownerName,
      Object_Full_Name: siteName,
      ConnectionStatus: status,
    },
  };
}

function collectFolderRelationIds(node: TreeNode | null): Set<number> {
  const ids = new Set<number>();
  const walk = (item: TreeNode | null | undefined) => {
    if (!item) return;
    if (item.type === "folder" && typeof item.relationID === "number" && item.relationID > 0) ids.add(item.relationID);
    item.children?.forEach((child) => {
      if (child.type === "folder") walk(child);
    });
  };
  walk(node);
  return ids;
}

function departmentPathFromNode(node: TreeNode): DepartmentPath {
  return {
    key: node.id,
    relationID: node.relationID ?? -1,
    label: node.label || "Organization",
    pathKeys: [node.id],
    groupPath: node.subLabel || node.label || "Organization",
  };
}

function getTreeNodeValue(node: TreeNode, keys: string[], fallback = "-") {
  return pickValue(node.raw || {}, keys, fallback);
}

function getTreeStatusClass(status = "") {
  const value = status.trim().toLowerCase();
  if (value === "online" || value === "connected") return "online";
  if (value === "offline" || value === "disconnected") return "offline";
  return "unknown";
}

function getTreeStatusPillClass(status = "") {
  const treeStatus = getTreeStatusClass(status);
  if (treeStatus === "online") return "user-pill active";
  if (treeStatus === "offline") return "user-pill hardware-status-pill is-offline appm-status-offline";
  return "user-pill muted-cell";
}



function collectRelationIds(nodes: TreeNode[], ids = new Set<number>()): Set<number> {
  for (const node of nodes) {
    if (node.type === "folder" && typeof node.relationID === "number") ids.add(node.relationID);
    if (node.children?.length) collectRelationIds(node.children, ids);
  }
  return ids;
}

function attachDeviceInventoryToTree(nodes: TreeNode[], deviceNodes: TreeNode[]): TreeNode[] {
  const knownRelationIds = collectRelationIds(nodes);
  const devicesByRelation = new Map<number, TreeNode[]>();
  const rootOnlyDevices: TreeNode[] = [];

  for (const device of deviceNodes) {
    const relationID = device.relationID || 0;
    if (relationID && knownRelationIds.has(relationID)) {
      devicesByRelation.set(relationID, [...(devicesByRelation.get(relationID) || []), device]);
    } else {
      rootOnlyDevices.push(device);
    }
  }

  const sortDevices = (items: TreeNode[]) => items.slice().sort((a, b) => a.label.localeCompare(b.label));

  const walk = (node: TreeNode, isRoot = false): TreeNode => {
    const folderChildren = (node.children || [])
      .filter((child) => child.type !== "device")
      .map((child) => walk(child, false));

    const directDevices = node.type === "folder" && node.relationID
      ? sortDevices(devicesByRelation.get(node.relationID) || [])
      : [];

    const orphanDevices = isRoot ? sortDevices(rootOnlyDevices) : [];
    const totalDeviceCount = directDevices.length
      + orphanDevices.length
      + folderChildren.reduce((sum, child) => sum + (child.count || 0), 0);

    return {
      ...node,
      count: totalDeviceCount,
      children: [...folderChildren, ...directDevices, ...orphanDevices],
    };
  };

  return nodes.map((node, index) => walk(node, index === 0 && node.id === "organization"));
}

function findTreeNodeById(nodes: TreeNode[], nodeId: string): TreeNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) return node;
    const childMatch = node.children?.length ? findTreeNodeById(node.children, nodeId) : null;
    if (childMatch) return childMatch;
  }
  return null;
}

function mergeUsageRecord(row: unknown): Record<string, unknown> {
  const record = asRecord(row) || {};
  const raw = asRecord(record.raw);
  return raw ? { ...record, ...raw } : record;
}

function normalizeUsageRow(row: unknown, index = 0, scopeNode?: TreeNode): UsageRow {
  const record = mergeUsageRecord(row);
  const isDeviceScope = scopeNode?.type === "device";
  const scopeRaw = scopeNode?.raw || {};

  const application = pickValue(record, [
    "SW_FileName",
    "SW_File_Name",
    "FileName",
    "fileName",
    "ProcessName",
    "SW_OrgFileName",
    "application",
    "Application",
    "SW_Pkg_Name",
    "applicationPackage",
    "ApplicationPackage",
    "Application Package",
    "SWPkgName",
    "PackageName",
    "Pkg_Name",
  ], `Application ${index + 1}`);

  const fileName = pickValue(record, [
    "SW_FileName",
    "SW_File_Name",
    "FileName",
    "fileName",
    "File_Name",
    "ProcessName",
    "EXE_Name",
    "Executable",
  ], application);

  const originalFileName = pickValue(record, [
    "SW_OrgFileName",
    "originalFileName",
    "OriginalFileName",
    "Original_File_Name",
    "OriginalName",
    "OrgFileName",
  ], fileName);

  const rawSeconds = parseNumber(pickValue(record, [
    "ActiveTime",
    "activeTime",
    "usedTime",
    "UsedTime",
    "Used_Time",
    "DurationSeconds",
    "Seconds",
    "TotalSeconds",
    "UsageSeconds",
  ], "0"), 0);

  const launchCount = parseNumber(pickValue(record, [
    "CCount",
    "cCount",
    "LaunchCount",
    "launchCount",
    "counts",
    "Counts",
    "Count",
    "UseCount",
    "UsedCount",
    "RunCount",
  ], "0"), 0);

  const fallbackDevice = isDeviceScope
    ? pickValue(scopeRaw, ["ComputerName", "DeviceName", "DeviceDisplayName", "MDM_DeviceName", "Object_DeviceID"], scopeNode?.label || "-")
    : "-";
  const fallbackUser = isDeviceScope
    ? pickValue(scopeRaw, ["Object_Client_Name", "DisplayName", "OwnerName", "DeviceOwner", "UserName", "LastLoggedInUser", "Owner"], scopeNode?.subLabel || "-")
    : "-";
  const fallbackSite = pickValue(scopeRaw, ["Object_Full_Name", "Object_Rel_Name", "Department", "Site", "GroupName", "Location", "Workgroup"], scopeNode?.type === "folder" ? scopeNode.label : "-");
  const fallbackIp = isDeviceScope ? pickValue(scopeRaw, ["IP", "IPAddress", "DeviceIPAddress", "DeviceLocalIPAddress"], "-") : "-";

  const device = pickValue(record, ["ComputerName", "computerName", "device", "DeviceName", "MachineName", "Object_DeviceID", "MDM_DeviceName"], fallbackDevice);
  const user = pickValue(record, ["Object_Client_Name", "ClientName", "UserName", "user", "User", "LoginUser", "Owner", "OwnerName", "Email"], fallbackUser);
  const site = pickValue(record, ["Object_Full_Name", "Object_Rel_Name", "site", "Department", "GroupName", "Location", "Workgroup"], fallbackSite);
  const ip = pickValue(record, ["IP", "IPAddress", "DeviceIPAddress", "DeviceLocalIPAddress"], fallbackIp);
  const filePath = pickValue(record, ["SW_Path", "Path", "FilePath", "File_Path", "InstallPath"], "-");

  const usedTimeHours = secondsToHours(rawSeconds);
  const startTimeRaw = pickValue(record, ["App_StartTime", "AppStartTime", "StartTime", "MeterDate", "Meter_Date", "SearchDate", "UseDate"], "");
  const endTimeRaw = pickValue(record, ["App_EndTime", "AppEndTime", "EndTime", "LastUsed", "Last_Used", "date", "Date", "ConnectionTime"], "");

  return {
    id: String(pickValue(record, ["IDN", "idn", "id", "ID", "RowNumber", "No"], String(index + 1))),
    application,
    publisher: pickValue(record, ["publisher", "Publisher", "Manufacturer", "CompanyName", "Vendor"], "-"),
    version: pickValue(record, ["SW_VerInfo", "version", "Version", "FileVersion", "SW_Version", "VerInfo"], "-"),
    fileName,
    originalFileName,
    device,
    user,
    site,
    ip,
    filePath,
    appStartTime: formatApiDate(startTimeRaw),
    appEndTime: formatApiDate(endTimeRaw),
    usedTimeHours,
    usedTimeSeconds: rawSeconds,
    launchCount,
    lastUsed: endTimeRaw ? formatApiDate(endTimeRaw) : startTimeRaw ? formatApiDate(startTimeRaw) : "-",
    raw: record,
  };
}

function getSelectedDeviceOwner(node: TreeNode) {
  const raw = node.raw || {};
  return pickValue(raw, ["DisplayName", "OwnerName", "DeviceOwner", "UserName", "LastLoggedInUser", "Object_Client_Name"], node.subLabel || "-");
}

function getSelectedDeviceName(node: TreeNode) {
  const raw = node.raw || {};
  return pickValue(raw, ["DeviceName", "ComputerName", "DeviceDisplayName", "MDM_DeviceName", "Object_DeviceID"], node.label || "-");
}

function readMeteringActiveMap(): MeteringActiveMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(METERING_ACTIVE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as MeteringActiveMap : {};
  } catch {
    return {};
  }
}

function writeMeteringActiveMap(value: MeteringActiveMap) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(METERING_ACTIVE_STORAGE_KEY, JSON.stringify(value));
}

function getMeteringJobIdFromResponse(payload: unknown) {
  const data = getDataObject(payload);
  const direct = pickValue(data, ["Job_Idn", "jobIdn", "JobID", "jobID", "jobIndex"], "0");
  const parsed = Number.parseInt(String(direct || "0"), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}


function getMeteringScanMode(node: TreeNode) {
  if (node.type === "device") return "device";
  if (node.id === "organization") return "all";
  return "folder";
}

function getMeteringScopeKey(node: TreeNode, packageId = 0) {
  const scope = node.type === "device"
    ? `device-${node.objectRootIdn || node.id}`
    : node.id === "organization"
      ? "organization"
      : `folder-${node.relationID ?? node.id}`;

  return `${scope}::package-${packageId || 0}`;
}

function formatMeteringStartedAt(value = "") {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function exportCsv(rows: UsageRow[]) {
  const header = ["Application", "Publisher", "Version", "File", "Original File", "Device", "User", "Site", "IP", "Path", "Start Time", "End Time", "Used Hours", "Used Seconds", "Launch Count", "Last Used"];
  const csv = [
    header.join(","),
    ...rows.map((row) => [
      row.application,
      row.publisher,
      row.version,
      row.fileName,
      row.originalFileName,
      row.device,
      row.user,
      row.site,
      row.ip,
      row.filePath,
      row.appStartTime,
      row.appEndTime,
      row.usedTimeHours.toFixed(4),
      row.usedTimeSeconds,
      row.launchCount,
      row.lastUsed,
    ].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "application-metering-usage.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

function appMeteringTreeMatchesSearch(node: TreeNode, search: string): boolean {
  const keyword = search.trim().toLowerCase();
  if (!keyword) return true;

  const ownText = [node.label, node.subLabel, node.status, node.type]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return ownText.includes(keyword) || Boolean(node.children?.some((child) => appMeteringTreeMatchesSearch(child, keyword)));
}

function getAppMeteringTreeCount(node: TreeNode): number {
  if (typeof node.count === "number" && Number.isFinite(node.count) && node.count > 0) return node.count;
  if (node.type === "device" || node.type === "package") return 1;
  return (node.children || []).reduce((total, child) => total + getAppMeteringTreeCount(child), 0);
}

function AppMeteringTree({
  nodes,
  selectedId,
  onSelect,
  search = "",
}: {
  nodes: TreeNode[];
  selectedId: string;
  onSelect: (node: TreeNode) => void;
  search?: string;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({ organization: true, "all-packages": true });
  const keyword = search.trim().toLowerCase();

  const renderNode = (node: TreeNode, depth = 0): ReactNode => {
    if (!appMeteringTreeMatchesSearch(node, keyword)) return null;

    const hasChildren = Boolean(node.children?.length);
    const isOpen = keyword ? true : open[node.id] ?? depth < 1;
    const isSelected = selectedId === node.id;
    const isRoot = node.id === "organization" || node.id === "all-packages";
    const isDevice = node.type === "device";
    const isPackage = node.type === "package";
    const Icon = isPackage ? Package : isDevice ? UserRound : isOpen ? FolderOpen : Folder;

    const handleToggle = () => {
      if (!hasChildren) return;
      setOpen((prev) => ({ ...prev, [node.id]: !isOpen }));
    };

    const handleSelect = () => {
      if (hasChildren) handleToggle();
      onSelect(node);
    };

    return (
      <div key={node.id}>
        <div>
          <button
            type="button"
            aria-label={hasChildren ? (isOpen ? `Collapse ${node.label}` : `Expand ${node.label}`) : node.label}
            onClick={(event) => {
              event.stopPropagation();
              handleToggle();
            }}
          >
            {hasChildren ? (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span />}
          </button>

          <button
            type="button"
            title={node.subLabel ? `${node.label} · ${node.subLabel}` : node.label}
            onClick={handleSelect}
          >
            <span><Icon size={15} /></span>
            <span>{node.label}</span>
            {!isRoot && getAppMeteringTreeCount(node) > 0 && <span>{getAppMeteringTreeCount(node).toLocaleString()}</span>}
          </button>
        </div>

        {hasChildren && isOpen ? (
          <div>
            {node.children?.map((child) => renderNode(child, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  return <div>{nodes.map((node) => renderNode(node))}</div>;
}


export default function AppMetering() {
  const [viewMode, setViewMode] = useState<ViewMode>("device");
  const [departmentTree, setDepartmentTree] = useState<TreeNode[]>([emptyNode]);
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [packageFiles, setPackageFiles] = useState<PackageFileRow[]>([]);
  const [selectedNode, setSelectedNode] = useState<TreeNode>(emptyNode);
  const [selectedPackageId, setSelectedPackageId] = useState<number>(0);
  const [usageRows, setUsageRows] = useState<UsageRow[]>([]);
  const [stats, setStats] = useState<AppMeteringStats>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [treeSearch, setTreeSearch] = useState("");
  const [startDate, setStartDate] = useState(defaultStartDate());
  const [endDate, setEndDate] = useState(formatDateInput(new Date()));
  const [oneYearMode, setOneYearMode] = useState(false);
  const [nextPageMode, setNextPageMode] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedRowId, setSelectedRowId] = useState("");
  const [drawerRow, setDrawerRow] = useState<UsageRow | null>(null);
  const [showMeteringModal, setShowMeteringModal] = useState(false);
  const [meteringType, setMeteringType] = useState<"all" | "selected">("all");
  const [modalPackageId, setModalPackageId] = useState<number>(0);
  const [toast, setToast] = useState<ToastState>(null);
  const [loading, setLoading] = useState({ hierarchy: false, packages: false, usage: false, action: false, assets: false, packageFiles: false });
  const [error, setError] = useState("");
  const [appMeteringDevices, setAppMeteringDevices] = useState<TreeNode[]>([]);
  const [scopeDeviceRows, setScopeDeviceRows] = useState<TreeNode[]>([]);
  const [assetCache, setAssetCache] = useState<Record<string, TreeNode[]>>({});
  const [activeMeteringScopes, setActiveMeteringScopes] = useState<MeteringActiveMap>(() => readMeteringActiveMap());

  const packageTree = useMemo(() => buildPackageTree(packages), [packages]);
  const activeTree = viewMode === "device" ? departmentTree : packageTree;
  const treeNodes = useMemo(() => flattenTree(activeTree), [activeTree]);
  const activePackageId = selectedPackageId || (selectedNode.type === "package" ? selectedNode.packageId || 0 : 0);
  const activeMeteringKey = useMemo(() => getMeteringScopeKey(selectedNode, activePackageId), [selectedNode, activePackageId]);
  const selectedScopeMetering = activeMeteringScopes[activeMeteringKey];
  const isSelectedScopeMeteringActive = Boolean(selectedScopeMetering);
  const companyScopeNode = useMemo(() => findTreeNodeById(departmentTree, "organization") || departmentTree[0] || emptyNode, [departmentTree]);
  const isScopeMeteringActive = useCallback((node: TreeNode, packageId = activePackageId) => {
    return Boolean(activeMeteringScopes[getMeteringScopeKey(node, packageId)]);
  }, [activeMeteringScopes, activePackageId]);

  const currentMeteringScopeNode = useMemo(() => {
    if (selectedNode.type === "device") return selectedNode;
    if (selectedNode.id === "organization") return companyScopeNode;
    if (selectedNode.type === "folder") return selectedNode;
    return companyScopeNode;
  }, [companyScopeNode, selectedNode]);

  const currentMeteringScopeType = currentMeteringScopeNode.type === "device"
    ? "Individual"
    : currentMeteringScopeNode.id === "organization"
      ? "Company"
      : "Branch";

  const isCurrentMeteringScopeActive = isScopeMeteringActive(currentMeteringScopeNode, activePackageId);
  const currentMeteringButtonLabel = `${isCurrentMeteringScopeActive ? "Stop" : "Metering"} ${currentMeteringScopeType}`;
  const currentMeteringButtonTitle = currentMeteringScopeType === "Company"
    ? "Create one application metering job for the whole company."
    : currentMeteringScopeType === "Branch"
      ? "Create one application metering job for the selected branch only."
      : "Create one application metering job for the selected individual device.";

  const showToast = useCallback((type: ToastType, title: string, message: string) => {
    setToast({ type, title, message });
    window.setTimeout(() => setToast(null), 4200);
  }, []);

  const loadHierarchy = useCallback(async () => {
    setLoading((prev) => ({ ...prev, hierarchy: true }));
    try {
      const departments = await appMeteringService.getDepartments() as ApiDepartment[];
      const baseTree = buildDepartmentTree(departments);

      // Do not load every /api/assets/:relationID record during initial render.
      // Device targets are loaded on demand when a folder is selected so the page stays fast.
      setDepartmentTree(baseTree);
      setSelectedNode((prev) => findTreeNodeById(baseTree, prev.id) || baseTree[0] || emptyNode);
      setAppMeteringDevices([]);
      setScopeDeviceRows([]);
      setAssetCache({});
    } catch (err) {
      setError("Organization view is not available right now.");
      setAppMeteringDevices([]);
      setScopeDeviceRows([]);
    } finally {
      setLoading((prev) => ({ ...prev, hierarchy: false, assets: false }));
    }
  }, []);


  const loadAssetsForScope = useCallback(async (node: TreeNode) => {
    if (viewMode !== "device" || node.type !== "folder") {
      setScopeDeviceRows([]);
      return;
    }

    if (node.id === "organization" || !node.relationID || node.relationID <= 0) {
      setScopeDeviceRows([]);
      setLoading((prev) => ({ ...prev, assets: false }));
      return;
    }

    const cacheKey = String(node.relationID);
    const cachedRows = assetCache[cacheKey];
    if (cachedRows) {
      setScopeDeviceRows(cachedRows);
      return;
    }

    setLoading((prev) => ({ ...prev, assets: true }));
    try {
      const response = await appMeteringService.getAssetsByRelationID(node.relationID);
      const department = departmentPathFromNode(node);
      const rows = getDataArray<ApiAsset>(response)
        .map((asset, index) => normalizeAssetNode(asset, department, index))
        .filter((item): item is TreeNode => Boolean(item))
        .sort((a, b) => a.label.localeCompare(b.label));

      setScopeDeviceRows(rows);
      setAppMeteringDevices(rows);
      setAssetCache((prev) => ({ ...prev, [cacheKey]: rows }));
    } catch (err) {
      setScopeDeviceRows([]);
      setError("Device list is not available right now.");
    } finally {
      setLoading((prev) => ({ ...prev, assets: false }));
    }
  }, [assetCache, viewMode]);

  const loadPackages = useCallback(async () => {
    setLoading((prev) => ({ ...prev, packages: true }));
    try {
      const payload = await appMeteringService.getPackages();
      const rows = getDataArray<unknown>(payload).map(normalizePackageRow);
      setPackages(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load application packages.");
    } finally {
      setLoading((prev) => ({ ...prev, packages: false }));
    }
  }, []);

  const loadPackageFiles = useCallback(async (packageId: number) => {
    if (!packageId) {
      setPackageFiles([]);
      return;
    }

    setLoading((prev) => ({ ...prev, packageFiles: true }));
    try {
      const payload = await appMeteringService.getPackageFiles(packageId);
      const objectPayload = getDataObject(payload);
      const rows = (Array.isArray(objectPayload.data) ? objectPayload.data : getDataArray<unknown>(payload)).map(normalizePackageFileRow);
      setPackageFiles(rows);
    } catch (err) {
      setPackageFiles([]);
      setError(err instanceof Error ? err.message : "Failed to load application package file group.");
    } finally {
      setLoading((prev) => ({ ...prev, packageFiles: false }));
    }
  }, []);

  const activeFilters = useMemo(() => {
    const params = new URLSearchParams();
    const isDevice = selectedNode.type === "device";
    const packageId = selectedPackageId || (selectedNode.type === "package" ? selectedNode.packageId || 0 : 0);

    if (isDevice && selectedNode.objectRootIdn) {
      params.set("clientID", String(selectedNode.objectRootIdn));
    } else {
      params.set("relationID", String(selectedNode.relationID ?? -1));
    }

    // spGetMeterList4Console treats SW_Idn < 0 as "all software"; 0 filters for SW_Idn = 0 and returns empty.
    params.set("swPkgId", String(packageId > 0 ? packageId : -1));
    params.set("startDate", startDate);
    params.set("endDate", endDate);
    params.set("page", "1");
    params.set("limit", "500");
    if (oneYearMode) params.set("oneYear", "true");
    if (nextPageMode) params.set("nextpage", "true");

    return params;
  }, [selectedNode, selectedPackageId, startDate, endDate, oneYearMode, nextPageMode]);

  const loadUsage = useCallback(async () => {
    setLoading((prev) => ({ ...prev, usage: true }));
    setError("");

    try {
      const usagePayload = await appMeteringService.getUsage(Object.fromEntries(activeFilters.entries()));
      const normalizedUsage = getUsageDataArray<unknown>(usagePayload).map((row, index) => normalizeUsageRow(row, index, selectedNode));
      setUsageRows(normalizedUsage);
      setSelectedRowId((prev) => (normalizedUsage.some((row) => row.id === prev) ? prev : normalizedUsage[0]?.id || ""));

      const statsPayload = await appMeteringService.getStats(Object.fromEntries(activeFilters.entries()));
      const statsData = getEnvelopeData<AppMeteringStats>(statsPayload, {});
      setStats(statsData || {});

      if (normalizedUsage.length === 0) {
        const statsRows = getUsageDataArray<unknown>(statsPayload).map((row, index) => normalizeUsageRow(row, index, selectedNode));
        if (statsRows.length > 0) {
          setUsageRows(statsRows);
          setSelectedRowId((prev) => (statsRows.some((row) => row.id === prev) ? prev : statsRows[0]?.id || ""));
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load application metering usage.";
      setError(message);
      setUsageRows([]);
      setStats({});
    } finally {
      setLoading((prev) => ({ ...prev, usage: false }));
    }
  }, [activeFilters, selectedNode]);

  useEffect(() => {
    loadHierarchy();
    loadPackages();
  }, [loadHierarchy, loadPackages]);


  useEffect(() => {
    if (viewMode !== "device") return;
    setSelectedNode((prev) => findTreeNodeById(departmentTree, prev.id) || prev);
  }, [departmentTree, viewMode]);

  useEffect(() => {
    if (viewMode !== "device") {
      setScopeDeviceRows([]);
      return;
    }
    if (selectedNode.type === "folder") {
      loadAssetsForScope(selectedNode);
    }
  }, [loadAssetsForScope, selectedNode.id, selectedNode.relationID, selectedNode.type, viewMode]);

  useEffect(() => {
    const packageId = selectedPackageId || (selectedNode.type === "package" ? selectedNode.packageId || 0 : 0);
    loadPackageFiles(packageId);
  }, [selectedPackageId, selectedNode.packageId, selectedNode.type, loadPackageFiles]);

  useEffect(() => {
    if (!oneYearMode && nextPageMode) setNextPageMode(false);
  }, [oneYearMode, nextPageMode]);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  const filteredRows = useMemo(() => {
    const text = searchTerm.trim().toLowerCase();

    return usageRows.filter((row) => {
      return !text || [row.application, row.publisher, row.version, row.fileName, row.originalFileName, row.device, row.user, row.site, row.ip, row.filePath]
        .some((value) => value.toLowerCase().includes(text));
    });
  }, [usageRows, searchTerm]);

  const usagePageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const selectedRow = filteredRows.find((row) => row.id === selectedRowId) ?? filteredRows[0] ?? emptyUsageRow;
  const showDeviceRegistry = viewMode === "device" && selectedNode.type !== "device";
  const selectedFolderNode = showDeviceRegistry ? findTreeNodeById(departmentTree, selectedNode.id) || selectedNode : null;
  const filteredDeviceRows = useMemo(() => {
    if (!showDeviceRegistry) return [];
    const text = searchTerm.trim().toLowerCase();
    return scopeDeviceRows.filter((device) => {
      const raw = device.raw || {};
      const searchable = [
        device.label,
        device.subLabel || "",
        getTreeNodeValue(device, ["Object_Full_Name", "Department", "Site", "GroupName"], ""),
        getTreeNodeValue(device, ["PlatformType"], ""),
        getTreeNodeValue(device, ["Model"], ""),
        getTreeNodeValue(device, ["IP", "IPAddress", "DeviceIPAddress", "DeviceLocalIPAddress"], ""),
        getTreeNodeValue(device, ["Object_DeviceID", "DeviceID", "MDM_DeviceID"], ""),
        String(raw.Object_Agent || ""),
      ].join(" ").toLowerCase();
      return !text || searchable.includes(text);
    });
  }, [scopeDeviceRows, searchTerm, showDeviceRegistry]);
  const devicePageCount = Math.max(1, Math.ceil(filteredDeviceRows.length / PAGE_SIZE));
  const pageCount = showDeviceRegistry ? devicePageCount : usagePageCount;
  const safePage = Math.min(Math.max(1, page), pageCount);
  const pagedRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const pagedDeviceRows = filteredDeviceRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedNode.id, selectedPackageId]);

  useEffect(() => {
    setPage((prev) => Math.min(Math.max(1, prev), pageCount));
  }, [pageCount]);

  const summary = useMemo(() => {
    const rowTotalSeconds = usageRows.reduce((sum, row) => sum + row.usedTimeSeconds, 0);
    const totalSeconds = typeof stats.totalUsageSeconds === "number" && stats.totalUsageSeconds > 0 ? stats.totalUsageSeconds : rowTotalSeconds;
    const rowUniqueApplications = new Set(usageRows.map((row) => row.application).filter((value) => value && value !== "-")).size;
    const statsUniqueApplications = typeof stats.uniqueApplications === "number" && stats.uniqueApplications > 0 ? stats.uniqueApplications : 0;
    const uniqueApplications = Math.max(statsUniqueApplications, rowUniqueApplications);
    const launchCount = usageRows.reduce((sum, row) => sum + row.launchCount, 0);

    return {
      uniqueApplications,
      totalSeconds,
      totalHours: secondsToHours(totalSeconds),
      launchCount,
      recordCount: usageRows.length,
    };
  }, [stats, usageRows]);

  const kpiScopeType = selectedNode.type === "package" ? "Package" : selectedNode.type === "device" ? "Device" : "Scope";
  const kpiScopeLabel = selectedNode.label || "Organization";
  const kpiPeriodLabel = oneYearMode ? `One year window${nextPageMode ? " · next page" : ""}` : `${startDate} to ${endDate}`;
  const kpiFilterLabel = "API fields only";

  const handleTreeSearch = (value: string) => {
    setTreeSearch(value);
    const match = treeNodes.find((node) => node.label.toLowerCase().includes(value.trim().toLowerCase()));
    if (value.trim() && match) {
      setSelectedNode(match);
      if (match.type === "package") setSelectedPackageId(match.packageId || 0);
    }
  };

  const handleNodeSelect = (node: TreeNode) => {
    setSelectedNode(node);
    if (node.type === "package") {
      setSelectedPackageId(node.packageId || 0);
      setViewMode("package");
    }
  };

  const getActionPayload = (commandDescription: string, commandPackageId = 0, targetNode: TreeNode = selectedNode) => {
    const packageId = commandPackageId || modalPackageId || selectedPackageId || (targetNode.type === "package" ? targetNode.packageId || 0 : 0);
    const scanMode = getMeteringScanMode(targetNode);
    const rawTarget = targetNode.raw || {};

    return {
      scanMode,
      Object_Rel_Idn: targetNode.relationID ?? (scanMode === "all" ? -1 : -1),
      Object_Root_Idn: targetNode.objectRootIdn ?? 0,
      Object_DeviceID: targetNode.objectDeviceID || "",
      Object_Agent: targetNode.objectAgent || String(rawTarget.Object_Agent || ""),
      MDM_Asset_Idn: targetNode.mdmAssetIdn || Number(rawTarget.MDM_Asset_Idn || 0) || 0,
      MDM_DeviceID: String(rawTarget.MDM_DeviceID || rawTarget.DeviceID || ""),
      ComputerName: targetNode.label || String(rawTarget.ComputerName || rawTarget.DeviceName || ""),
      DeviceName: String(rawTarget.DeviceName || targetNode.label || ""),
      Object_Full_Name: String(rawTarget.Object_Full_Name || rawTarget.Object_Rel_Name || targetNode.label || ""),
      targetNode,
      meteringType: meteringType === "selected" || packageId > 0 ? "selected" : "all",
      swpkg_list: packageId > 0 ? [packageId] : [],
      swpkg_list_details: [],
      startDate,
      endDate,
      oneYear: oneYearMode,
      nextpage: nextPageMode,
      description: commandDescription,
    };
  };

  const updateMeteringScopeState = useCallback((action: "start" | "stop", node: TreeNode, packageId: number, jobIdn = 0, jobCommand = 0) => {
    const key = getMeteringScopeKey(node, packageId);
    setActiveMeteringScopes((prev) => {
      const next: MeteringActiveMap = { ...prev };

      if (action === "start") {
        next[key] = {
          startedAt: new Date().toISOString(),
          scopeLabel: node.label,
          scanMode: getMeteringScanMode(node),
          packageId,
          jobIdn,
          jobCommand,
        };
      } else {
        delete next[key];
      }

      writeMeteringActiveMap(next);
      return next;
    });
  }, []);

  const runMeteringAction = async (action: "start" | "collect" | "stop", packageId = 0, targetNode: TreeNode = selectedNode) => {
    const effectivePackageId = packageId || modalPackageId || selectedPackageId || (targetNode.type === "package" ? targetNode.packageId || 0 : 0);
    const actionNode = targetNode;
    const activeRecord = activeMeteringScopes[getMeteringScopeKey(actionNode, effectivePackageId)];

    // Do not block Hardware Inventory rows on the frontend.
    // Some Windows rows arrive as MDM records but can still be resolved by the backend
    // through TSMDM_TS_OBJECT_MAPPING or ComputerName -> TS_OBJECT_ROOT matching.

    setLoading((prev) => ({ ...prev, action: true }));
    try {
      const title = action === "start" ? "Start Application Metering" : action === "collect" ? "Collect Application Metering Result" : "Stop Application Metering";
      const payload = getActionPayload(`${title} - ${actionNode.label}`, effectivePackageId, actionNode) as Record<string, unknown>;

      if ((action === "stop" || action === "collect") && activeRecord?.jobIdn) {
        payload.Job_Idn = activeRecord.jobIdn;
        payload.jobIndex = activeRecord.jobIdn;
        payload.activeJobIdn = activeRecord.jobIdn;
      }

      if (action === "stop" && !activeRecord?.jobIdn) {
        throw new Error("No active Job_Idn is stored for this scope. Start metering once with the updated UI before stopping, so Stop Metering can update the same Task List job.");
      }

      const response = await appMeteringService.runMeteringAction(action, payload);

      const responseJobIdn = getMeteringJobIdFromResponse(response) || activeRecord?.jobIdn || 0;

      if (action === "start") {
        updateMeteringScopeState("start", actionNode, effectivePackageId, responseJobIdn, 1206);
      } else if (action === "stop") {
        updateMeteringScopeState("stop", actionNode, effectivePackageId);
      }

      showToast("success", `${title} submitted`, String(asRecord(response)?.message || "Job updated successfully."));
      setShowMeteringModal(false);
      setModalPackageId(0);
      await loadUsage();
    } catch (err) {
      showToast("error", "Application metering failed", err instanceof Error ? err.message : "Unable to create application metering job.");
    } finally {
      setLoading((prev) => ({ ...prev, action: false }));
    }
  };

  const handleScopeMeteringToggle = (node: TreeNode = selectedNode) => {
    const packageId = activePackageId || (node.type === "package" ? node.packageId || 0 : 0);
    if (isScopeMeteringActive(node, packageId)) {
      runMeteringAction("stop", packageId, node);
      return;
    }

    setSelectedNode(node);
    setMeteringType(packageId > 0 ? "selected" : "all");
    setModalPackageId(packageId);
    setShowMeteringModal(true);
  };

  const submitScopeMetering = (node: TreeNode) => {
    const packageId = modalPackageId || activePackageId || (node.type === "package" ? node.packageId || 0 : 0);
    runMeteringAction("start", packageId, node);
  };

  useEffect(() => {
    document.documentElement.classList.add("ema-settings-page-active", "appmetering-page-active");
    document.body.classList.add("ema-settings-page-active", "appmetering-page-active");

    return () => {
      document.documentElement.classList.remove("ema-settings-page-active", "appmetering-page-active");
      document.body.classList.remove("ema-settings-page-active", "appmetering-page-active");
    };
  }, []);

  return (
    <main data-section="application-metering">
      <style>{`
        /* App Metering sidebar: mirrors Hardware sidebar panel structure without overriding the global app sidebar. */
        .appmetering-module-root .settings-layout.appmetering-settings-layout {
          grid-template-columns: minmax(300px, 322px) minmax(0, 1fr) !important;
        }

        .appmetering-module-root .settings-menu.appmetering-left-panel {
          min-width: 300px !important;
        }

        .appmetering-module-root .settings-menu > .ema-module-sidebar-switcher {
          flex: 0 0 auto !important;
          margin: 0 !important;
        }

        .appmetering-module-root .settings-menu > .ema-sidebar-content {
          flex: 1 1 auto !important;
          padding-top: 0.65rem !important;
        }

        .appmetering-module-root .ema-sidebar-subpanel {
          justify-content: flex-start !important;
        }

        .appmetering-module-root .ema-sidebar-tree {
          min-height: 0 !important;
        }

        .appmetering-module-root .ema-sidebar-tree-node.is-appmetering-device .ema-sidebar-tree-icon,
        .appmetering-module-root .ema-sidebar-tree-node.is-appmetering-package .ema-sidebar-tree-icon {
          opacity: 0.95 !important;
        }

        /* Device offline state follows Hardware: neutral grey, not danger red. */
        .appmetering-module-root .user-pill.hardware-status-pill.is-offline,
        .appmetering-module-root .user-pill.appm-status-offline {
          color: #64748b !important;
          background: rgba(100, 116, 139, 0.12) !important;
          border: 1px solid rgba(100, 116, 139, 0.22) !important;
        }


        /* Server-safe App Metering table/pagination isolation.
           Hosted builds can load older global table/uam styles after this component.
           Keep Application Metering columns horizontal and scrollable. */
        body.appmetering-page-active .appmetering-module-root {
          min-width: 0 !important;
          height: 100% !important;
          min-height: 0 !important;
          overflow: hidden !important;
        }

        body.appmetering-page-active .appmetering-module-root .appmetering-settings-layout {
          height: 100% !important;
          min-height: 0 !important;
          overflow: hidden !important;
        }

        body.appmetering-page-active .appmetering-module-root .appmetering-settings-content {
          min-width: 0 !important;
          min-height: 0 !important;
          overflow: hidden !important;
        }

        body.appmetering-page-active .appmetering-module-root .content-shell {
          display: flex !important;
          flex-direction: column !important;
          min-width: 0 !important;
          min-height: 0 !important;
          max-height: calc(100dvh - 210px) !important;
          overflow: hidden !important;
        }

        body.appmetering-page-active .appmetering-module-root .content-head,
        body.appmetering-page-active .appmetering-module-root .user-action-bar,
        body.appmetering-page-active .appmetering-module-root .row.g-2,
        body.appmetering-page-active .appmetering-module-root .appmetering-pagination {
          flex: 0 0 auto !important;
        }

        body.appmetering-page-active .appmetering-module-root .content-body {
          display: flex !important;
          flex-direction: column !important;
          flex: 1 1 auto !important;
          min-height: 0 !important;
          overflow: hidden !important;
        }

        body.appmetering-page-active .appmetering-module-root .appmetering-table-card {
          display: block !important;
          flex: 1 1 auto !important;
          width: calc(100% - 0.25rem) !important;
          max-width: calc(100% - 0.25rem) !important;
          min-height: 260px !important;
          max-height: min(52vh, 560px) !important;
          margin: 0 !important;
          overflow-x: auto !important;
          overflow-y: auto !important;
          white-space: normal !important;
          scrollbar-gutter: stable !important;
          -webkit-overflow-scrolling: touch !important;
          contain: layout paint !important;
        }

        body.appmetering-page-active .appmetering-module-root .appmetering-table-card table {
          display: table !important;
          table-layout: fixed !important;
          width: 100% !important;
          min-width: 1040px !important;
          max-width: none !important;
          border-collapse: separate !important;
          border-spacing: 0 !important;
        }

        body.appmetering-page-active .appmetering-module-root .appmetering-table-card thead {
          display: table-header-group !important;
        }

        body.appmetering-page-active .appmetering-module-root .appmetering-table-card tbody {
          display: table-row-group !important;
        }

        body.appmetering-page-active .appmetering-module-root .appmetering-table-card tr {
          display: table-row !important;
          width: auto !important;
          min-width: 0 !important;
        }

        body.appmetering-page-active .appmetering-module-root .appmetering-table-card th,
        body.appmetering-page-active .appmetering-module-root .appmetering-table-card td {
          display: table-cell !important;
          vertical-align: middle !important;
          width: auto !important;
          min-width: 0 !important;
          max-width: none !important;
          padding: 0.85rem 0.8rem !important;
          white-space: nowrap !important;
          word-break: normal !important;
          overflow-wrap: normal !important;
          writing-mode: horizontal-tb !important;
          text-orientation: mixed !important;
          line-height: 1.25 !important;
        }

        body.appmetering-page-active .appmetering-module-root .appmetering-table-card th {
          position: sticky !important;
          top: 0 !important;
          z-index: 4 !important;
          background: #ffffff !important;
          color: #0f172a !important;
          font-size: 0.78rem !important;
          font-weight: 900 !important;
          text-transform: none !important;
          letter-spacing: 0 !important;
        }

        body.appmetering-page-active .appmetering-module-root .appmetering-table-card td small,
        body.appmetering-page-active .appmetering-module-root .appmetering-table-card td .text-muted {
          max-width: 420px !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
          word-break: normal !important;
        }

        body.appmetering-page-active .appmetering-module-root .appmetering-table-card th:nth-child(1),
        body.appmetering-page-active .appmetering-module-root .appmetering-table-card td:nth-child(1) { width: 22% !important; }
        body.appmetering-page-active .appmetering-module-root .appmetering-table-card th:nth-child(2),
        body.appmetering-page-active .appmetering-module-root .appmetering-table-card td:nth-child(2) { width: 34% !important; }
        body.appmetering-page-active .appmetering-module-root .appmetering-table-card th:nth-child(3),
        body.appmetering-page-active .appmetering-module-root .appmetering-table-card td:nth-child(3) { width: 16% !important; }
        body.appmetering-page-active .appmetering-module-root .appmetering-table-card th:nth-child(4),
        body.appmetering-page-active .appmetering-module-root .appmetering-table-card td:nth-child(4) { width: 7% !important; }
        body.appmetering-page-active .appmetering-module-root .appmetering-table-card th:nth-child(5),
        body.appmetering-page-active .appmetering-module-root .appmetering-table-card td:nth-child(5) { width: 7% !important; }
        body.appmetering-page-active .appmetering-module-root .appmetering-table-card th:nth-child(6),
        body.appmetering-page-active .appmetering-module-root .appmetering-table-card td:nth-child(6) { width: 10% !important; }
        body.appmetering-page-active .appmetering-module-root .appmetering-table-card th:nth-child(7),
        body.appmetering-page-active .appmetering-module-root .appmetering-table-card td:nth-child(7) { width: 8% !important; }

        body.appmetering-page-active .appmetering-module-root .appmetering-pagination {
          position: relative !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          gap: 0.75rem !important;
          width: 100% !important;
          min-height: 58px !important;
          padding: 0.75rem 0.4rem 0 !important;
          margin: 0 !important;
          overflow: visible !important;
          transform: none !important;
        }

        body.appmetering-page-active .appmetering-module-root .appmetering-pagination .uam-pagination-controls {
          position: static !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 0.38rem !important;
          width: auto !important;
          min-width: 0 !important;
          height: auto !important;
          margin: 0 !important;
          padding: 0 !important;
          transform: none !important;
        }

        body.appmetering-page-active .appmetering-module-root .appmetering-pagination .uam-page-icon,
        body.appmetering-page-active .appmetering-module-root .appmetering-pagination .uam-page-current {
          position: static !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 34px !important;
          min-width: 34px !important;
          max-width: 34px !important;
          height: 34px !important;
          min-height: 34px !important;
          max-height: 34px !important;
          padding: 0 !important;
          margin: 0 !important;
          border-radius: 10px !important;
          line-height: 1 !important;
          white-space: nowrap !important;
          transform: none !important;
          float: none !important;
        }

        @media (max-width: 1100px) {
          .appmetering-module-root .settings-layout.appmetering-settings-layout {
            grid-template-columns: 1fr !important;
          }

          .appmetering-module-root .settings-menu.appmetering-left-panel {
            min-width: 0 !important;
            max-width: none !important;
          }
        }
      `}</style>
      <input aria-hidden="true" id="globalSearch" type="hidden" />
      <button hidden id="themeBtn" type="button">
        <span id="themeLabel">Dark Mode</span>
      </button>

      <div>
        <aside>
          <div>
            <span>APP METERING</span>
            <strong>Application Metering</strong>
            <small>Manage metering branches and package records.</small>
          </div>

          <nav id="appmeteringMenu" role="tablist" aria-label="Application metering navigation">
            <button
              type="button"
              onClick={() => setViewMode("device")}
            >
              <span><FolderOpen size={16} /></span>
              <span><strong>Branch</strong><small>Branch endpoint scope</small></span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("package")}
            >
              <span><Database size={16} /></span>
              <span><strong>Packages</strong><small>Application package views</small></span>
            </button>
          </nav>

          <div>
            <div>
              <label htmlFor="appmSidebarSearch">
                <Search size={15} />
                <input id="appmSidebarSearch" value={treeSearch} onChange={(event) => handleTreeSearch(event.target.value)} placeholder={viewMode === "device" ? "Search branches..." : "Search packages..."} />
              </label>

              <div role="tree" aria-label="Application metering target tree">
                {loading.hierarchy || loading.packages ? (
                  <div>{viewMode === "device" ? "Preparing branch view..." : "Preparing package list..."}</div>
                ) : activeTree.length > 0 ? (
                  <AppMeteringTree nodes={activeTree} selectedId={selectedNode.id} onSelect={handleNodeSelect} search={treeSearch} />
                ) : (
                  <div>{viewMode === "device" ? "No branch entries found." : "No packages found."}</div>
                )}
              </div>
            </div>
          </div>
        </aside>

        <section>
          <div>
            <div>
              <span>APPLICATION COMMAND CENTER</span>
              <h2>Application Metering</h2>
              {/* <p>{kpiScopeType}: {kpiScopeLabel} · {kpiPeriodLabel} · {kpiFilterLabel}</p>
              {selectedScopeMetering ? <p>Active metering started {formatMeteringStartedAt(selectedScopeMetering.startedAt)} · {selectedScopeMetering.scopeLabel}</p> : null} */}
            </div>
            <div>
              <button type="button" onClick={loadUsage}>
                <span>Apps in Scope</span>
                <strong>{summary.uniqueApplications}</strong>
                <small>Unique metered apps</small>
              </button>
              <button type="button" onClick={loadUsage}>
                <span>Usage Hours</span>
                <strong>{formatUsageDuration(summary.totalSeconds)}</strong>
                <small>Selected date range</small>
              </button>
              <button type="button" onClick={loadUsage}>
                <span>Launch Events</span>
                <strong>{summary.launchCount.toLocaleString()}</strong>
                <small>Total CCount from API</small>
              </button>
              <button type="button" onClick={loadUsage}>
                <span>Records</span>
                <strong>{summary.recordCount.toLocaleString()}</strong>
                <small>Rows returned by API</small>
              </button>
            </div>
          </div>

          <div>
            <div>
              <div>
                <span>{showDeviceRegistry ? "TARGET REGISTRY" : "USAGE REGISTRY"}</span>
                <h3>{showDeviceRegistry ? "Target Device Registry" : "Application Usage Registry"}</h3>
                <p>{showDeviceRegistry ? `${selectedNode.label} scope · ${filteredDeviceRows.length} device${filteredDeviceRows.length === 1 ? "" : "s"}` : `${selectedNode.label} · ${startDate} to ${endDate}`}</p>
              </div>
              <div>
                <button type="button" onClick={loadUsage} title="Refresh usage">
                  <RefreshCw size={14} /> Refresh
                </button>
                <button type="button" onClick={() => showDeviceRegistry ? showToast("info", "Device list", "Device registry uses the same /api/assets/:relationID data as Hardware Inventory.") : exportCsv(filteredRows)} title={showDeviceRegistry ? "Device source info" : "Export CSV"}>
                  <Download size={14} /> {showDeviceRegistry ? "Source" : "Export"}
                </button>
              </div>
            </div>

            <div>
              <div>
                <label htmlFor="appmRegistrySearch">
                  <Search size={15} />
                  <input id="appmRegistrySearch" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={showDeviceRegistry ? "Search devices, IPs, users..." : "Search application, device or user..."} />
                  {searchTerm ? <button type="button" onClick={() => setSearchTerm("")}><X size={14} /></button> : null}
                </label>

                <div>
                  <button type="button" onClick={() => { setSelectedPackageId(0); setSearchTerm(""); setOneYearMode(false); setNextPageMode(false); }}>
                    <Filter size={14} /> Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => handleScopeMeteringToggle(currentMeteringScopeNode)}
                    disabled={loading.action}
                    title={currentMeteringButtonTitle}
                  >
                    {isCurrentMeteringScopeActive ? <StopCircle size={14} /> : <Play size={14} />}
                    <span>{currentMeteringButtonLabel}</span>
                  </button>
                  <button type="button" onClick={() => runMeteringAction("collect", activePackageId, selectedNode)} disabled={loading.action}>
                    <RefreshCw size={14} /> Collect
                  </button>
                </div>
              </div>

              <div aria-label="Application metering filters">
                <label>
                  <span>Start Date</span>
                  <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                </label>
                <label>
                  <span>End Date</span>
                  <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
                </label>
                <label>
                  <span>Package</span>
                  <select value={selectedPackageId} onChange={(event) => setSelectedPackageId(Number(event.target.value))}>
                    <option value={0}>All packages</option>
                    {packages.map((pkg) => <option key={pkg.SW_Pkg_Idn} value={pkg.SW_Pkg_Idn}>{pkg.name}</option>)}
                  </select>
                </label>
                <label>
                  <span>SP Mode</span>
                  <select value={oneYearMode ? "oneYear" : "normal"} onChange={(event) => setOneYearMode(event.target.value === "oneYear")}>
                    <option value="normal">Normal</option>
                    <option value="oneYear">One Year</option>
                  </select>
                </label>
                {/* <label>
                  <span>Page Mode</span>
                  <select value={nextPageMode ? "nextpage" : "first"} onChange={(event) => setNextPageMode(event.target.value === "nextpage")} disabled={!oneYearMode}>
                    <option value="first">First Page</option>
                    <option value="nextpage">Next Page</option>
                  </select>
                </label> */}
              </div>

              {error ? <div><AlertCircle size={15} /> {error}</div> : null}

              <div>
                {showDeviceRegistry ? (
                  <table>
                    <thead>
                      <tr>
                        <th>No</th>
                        <th>Device Name</th>
                        <th>Platform / Model</th>
                        <th>Status</th>
                        <th>Last Connected</th>
                        <th>Group Path</th>
                        <th>Device ID</th>
                        <th>IP Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading.assets ? (
                        <tr><td colSpan={8}><div><strong>Loading devices</strong><span>Loading devices from {selectedNode.relationID}...</span></div></td></tr>
                      ) : pagedDeviceRows.length === 0 ? (
                        <tr><td colSpan={8}><div><strong>No devices found</strong><span>{selectedNode.id === "organization" ? "Company scope selected. Choose a department to browse devices, or run Metering Company directly." : "No devices found in this folder scope."}</span></div></td></tr>
                      ) : pagedDeviceRows.map((device, index) => {
                        const raw = device.raw || {};
                        const isSelected = selectedNode.id === device.id;
                        return (
                          <tr key={device.id} onClick={() => handleNodeSelect(device)}>
                            <td><span>{String((safePage - 1) * PAGE_SIZE + index + 1).padStart(2, "0")}</span></td>
                            <td><div><span><UserRound size={14} /></span><span><strong>{device.label}</strong><small>{device.subLabel || getTreeNodeValue(device, ["Object_Full_Name"], "-")}</small></span></div></td>
                            <td><strong>{getTreeNodeValue(device, ["PlatformType"], "-")}</strong><small>{getTreeNodeValue(device, ["Model"], "-")}</small></td>
                            <td><span>{device.status || "-"}</span></td>
                            <td>{formatApiDate(String(raw.ConnectionTime || ""))}</td>
                            <td>{getTreeNodeValue(device, ["Object_Full_Name", "Department", "Site", "GroupName"], "-")}</td>
                            <td><span>{getTreeNodeValue(device, ["Object_DeviceID", "DeviceID", "MDM_DeviceID"], "-")}</span></td>
                            <td>{getTreeNodeValue(device, ["IP", "IPAddress", "DeviceIPAddress", "DeviceLocalIPAddress"], "-")}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Application</th>
                        <th>Executable</th>
                        <th>Device / User</th>
                        <th>Usage</th>
                        <th>Launch</th>
                        <th>Last Used</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading.usage ? (
                        <tr><td colSpan={7}><div><strong>Loading usage records</strong><span>Please wait while the application metering registry is refreshed.</span></div></td></tr>
                      ) : pagedRows.length === 0 ? (
                        <tr><td colSpan={7}><div><strong>No records found</strong><span>No application metering records found for current filter.</span></div></td></tr>
                      ) : pagedRows.map((row) => (
                        <tr key={`${row.id}-${row.application}-${row.device}`} onClick={() => setSelectedRowId(row.id)}>
                          <td><button type="button" onClick={(event) => { event.stopPropagation(); setDrawerRow(row); }}>{row.application}</button><small>{row.version !== "-" ? `Version ${row.version}` : row.originalFileName}</small></td>
                          <td><span>{row.originalFileName || row.fileName}</span><small title={row.filePath}>{row.filePath !== "-" ? row.filePath : row.fileName}</small></td>
                          <td><strong>{row.device}</strong><small>{row.user !== "-" ? row.user : row.site}{row.ip !== "-" ? ` · ${row.ip}` : ""}</small></td>
                          <td><strong>{formatUsageDuration(row.usedTimeSeconds)}</strong></td>
                          <td>{row.launchCount}</td>
                          <td>{row.lastUsed}</td>
                          <td><button type="button" onClick={(event) => { event.stopPropagation(); setDrawerRow(row); }}>Details</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div aria-label="Application metering pagination">
                <div>
                  <strong>Page {safePage} of {pageCount}</strong>
                </div>
                <div>
                  Showing {showDeviceRegistry ? filteredDeviceRows.length : filteredRows.length} record{(showDeviceRegistry ? filteredDeviceRows.length : filteredRows.length) === 1 ? "" : "s"}
                </div>
                <div aria-label="Pagination controls">
                  <button type="button" aria-label="First page" title="First page" disabled={safePage <= 1} onClick={() => setPage(1)}><ChevronsLeft size={14} /></button>
                  <button type="button" aria-label="Previous page" title="Previous page" disabled={safePage <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}><ChevronLeft size={14} /></button>
                  <b aria-current="page">{safePage}</b>
                  <button type="button" aria-label="Next page" title="Next page" disabled={safePage >= pageCount} onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))}><ChevronRight size={14} /></button>
                  <button type="button" aria-label="Last page" title="Last page" disabled={safePage >= pageCount} onClick={() => setPage(pageCount)}><ChevronsRight size={14} /></button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {drawerRow ? (
        <div onClick={() => setDrawerRow(null)}>
          <section onClick={(event) => event.stopPropagation()}>
            <div>
              <div>
                <span>APPLICATION USAGE DETAIL</span>
                <h3>{drawerRow.application}</h3>
                <p>{drawerRow.fileName} · {drawerRow.device}</p>
              </div>
              <button type="button" onClick={() => setDrawerRow(null)}><X size={16} /></button>
            </div>

            <div>
              <div><span>Usage Time</span><strong>{formatUsageDuration(drawerRow.usedTimeSeconds)}</strong><small>{drawerRow.usedTimeSeconds.toLocaleString()} seconds</small></div>
              <div><span>Launch Count</span><strong>{drawerRow.launchCount}</strong><small>Execution events</small></div>

              <div>Application Information</div>
              <label><span>Application</span><input value={drawerRow.application} readOnly /></label>
              <label><span>Publisher</span><input value={drawerRow.publisher} readOnly /></label>
              <label><span>Version</span><input value={drawerRow.version} readOnly /></label>
              <label><span>Executable</span><input value={drawerRow.fileName} readOnly /></label>
              <label><span>Original File</span><input value={drawerRow.originalFileName} readOnly /></label>
              <label><span>File Path</span><input value={drawerRow.filePath} readOnly /></label>

              <div>Endpoint Context</div>
              <label><span>Device</span><input value={drawerRow.device} readOnly /></label>
              <label><span>User</span><input value={drawerRow.user} readOnly /></label>
              <label><span>Site</span><input value={drawerRow.site} readOnly /></label>
              <label><span>IP Address</span><input value={drawerRow.ip} readOnly /></label>
              <label><span>Start Time</span><input value={drawerRow.appStartTime} readOnly /></label>
              <label><span>End Time / Last Used</span><input value={drawerRow.appEndTime !== "-" ? drawerRow.appEndTime : drawerRow.lastUsed} readOnly /></label>

              <div>Package File Group</div>
              <div>
                {packageFiles.length === 0 ? (
                  <><strong>No package file group loaded</strong><span>Choose a package filter to call for a package file group.</span></>
                ) : (
                  <div>
                    {packageFiles.slice(0, 8).map((file) => (
                      <div key={`${file.id}-${file.fileName}`}>
                        <span>{file.version || "Version"}</span>
                        <strong>{file.fileName}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <button type="button" onClick={loadUsage}><RefreshCw size={14} /> Refresh Meter</button>
              <button type="button" onClick={() => exportCsv([drawerRow])}><Download size={14} /> Export Detail</button>
              <button type="button" onClick={() => handleScopeMeteringToggle()} disabled={loading.action}>{isSelectedScopeMeteringActive ? <StopCircle size={14} /> : <Play size={14} />} {isSelectedScopeMeteringActive ? "Stop Metering" : "Start Metering"}</button>
            </div>
          </section>
        </div>
      ) : null}

      {showMeteringModal ? (
        <div onClick={() => setShowMeteringModal(false)}>
          <section onClick={(event) => event.stopPropagation()}>
            <div>
              <div>
                <span>START APPLICATION METERING</span>
                <h3>Create Metering Job</h3>
                <p>Create a metering job for the selected folder, device or package scope.</p>
              </div>
              <button type="button" onClick={() => setShowMeteringModal(false)}><X size={16} /></button>
            </div>

            <div>
              <label><span>Target Scope</span><input value={selectedNode.label} readOnly /></label>
              <label><span>Metering Type</span><select value={meteringType} onChange={(event) => setMeteringType(event.target.value as "all" | "selected")}><option value="all">All applications</option><option value="selected">Selected package</option></select></label>
              <label><span>Package</span><select value={modalPackageId || selectedPackageId} onChange={(event) => { setModalPackageId(Number(event.target.value)); setMeteringType(Number(event.target.value) > 0 ? "selected" : "all"); }}><option value={0}>All packages</option>{packages.map((pkg) => <option key={pkg.SW_Pkg_Idn} value={pkg.SW_Pkg_Idn}>{pkg.name}</option>)}</select></label>
              <label><span>Reporting Window</span><input value={`${startDate} → ${endDate}`} readOnly /></label>

              <label><input type="checkbox" checked readOnly /><span>Include launch count and active duration</span></label>
              <label><input type="checkbox" checked readOnly /><span>Create job destination automatically by Object_Rel_Idn, Object_Root_Idn or Object_DeviceID.</span></label>
            </div>

            <div>
              <button type="button" onClick={() => setShowMeteringModal(false)}>Cancel</button>
              <button type="button" disabled={loading.action} onClick={() => submitScopeMetering(selectedNode)}>
                {loading.action ? "Submitting..." : "Start Metering"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {toast ? (
        <div>
          <div>
            <div>{toast.type === "success" ? <CheckCircle size={20} /> : toast.type === "error" ? <AlertCircle size={20} /> : <Gauge size={20} />}</div>
            <div><strong>{toast.title}</strong><span>{toast.message}</span></div>
            <button type="button" onClick={() => setToast(null)}><X size={14} /></button>
          </div>
        </div>
      ) : null}
    </main>
  );
}