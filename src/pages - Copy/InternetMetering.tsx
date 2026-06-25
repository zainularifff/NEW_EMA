import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Eye,
  FileText,
  Folder,
  FolderOpen,
  Globe,
  Laptop,
  Loader2,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Send,
  Wifi,
  X,
} from 'lucide-react';
import clsx from 'clsx';

import internetMeteringService from '../services/internetMeteringService';

type NodeKind = 'all' | 'folder' | 'device' | 'url-folder' | 'url';

type TreeNodeType = {
  id: string;
  label: string;
  type: NodeKind;
  children?: TreeNodeType[];
  childrenLoaded?: boolean;
  objectRelIdn?: number;
  objectRootIdn?: number;
  objectDeviceID?: string;
  urlMainIdn?: number;
  url?: string;
  restrict?: number;
  count?: number;
  raw?: unknown;
};

type InternetUsageRow = {
  id: number;
  domainName: string;
  urlMainIdn: number;
  usedTime: number;
  counts: number;
  device: string;
  date: string;
  raw?: unknown;
};

type InternetStats = {
  totalRecords: number;
  totalDomains: number;
  totalUsageSeconds: number;
  totalCounts: number;
  rows?: unknown[];
};

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  error?: string;
  totalRecords?: number;
  data?: T;
  raw?: unknown;
};

type UrlRuleAction = 'restrict' | 'manage' | 'remove';
type PendingUrlAction = { action: UrlRuleAction; node: TreeNodeType };
type MeteringAction = 'start' | 'collect' | 'stop';
type PendingMeteringAction = { action: MeteringAction; node: TreeNodeType };

const WEB_METERING_JOB_TYPE = 10300;
const WEB_METERING_START_COMMAND = 1404;
const WEB_METERING_COLLECT_COMMAND = 1407;
const WEB_METERING_STOP_COMMAND = 1409;

const todayIso = () => new Date().toISOString().slice(0, 10);
const daysAgoIso = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
};

const numberFrom = (row: any, keys: string[], fallback = 0) => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== '') {
      const parsed = Number.parseInt(String(value), 10);
      return Number.isNaN(parsed) ? fallback : parsed;
    }
  }
  const rowKeys = Object.keys(row || {});
  for (const wanted of keys) {
    const match = rowKeys.find((key) => key.toLowerCase() === wanted.toLowerCase());
    const value = match ? row[match] : undefined;
    if (value !== undefined && value !== null && value !== '') {
      const parsed = Number.parseInt(String(value), 10);
      return Number.isNaN(parsed) ? fallback : parsed;
    }
  }
  return fallback;
};

const textFrom = (row: any, keys: string[], fallback = '') => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim();
  }
  const rowKeys = Object.keys(row || {});
  for (const wanted of keys) {
    const match = rowKeys.find((key) => key.toLowerCase() === wanted.toLowerCase());
    const value = match ? row[match] : undefined;
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim();
  }
  return fallback;
};

const extractArray = <T,>(payload: any): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (Array.isArray(payload?.data)) return payload.data as T[];
  if (Array.isArray(payload?.data?.data)) return payload.data.data as T[];
  if (Array.isArray(payload?.result)) return payload.result as T[];
  if (Array.isArray(payload?.recordset)) return payload.recordset as T[];
  return [];
};

const formatDuration = (seconds: number) => {
  const safeSeconds = Math.max(Number(seconds) || 0, 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
};

const formatNumber = (value: number) => new Intl.NumberFormat('en-MY').format(Number(value) || 0);
const formatRowNumber = (value: number) => String(Math.max(Number(value) || 0, 0)).padStart(2, '0');
const URL_RULE_PAGE_SIZE = 10;

const INTERNET_METERING_CACHE_TTL = 5 * 60 * 1000;

const INTERNET_METERING_PAGE_CSS = `
html.internet-metering-page-active,
body.internet-metering-page-active,
body.internet-metering-page-active #root {
  height: 100% !important;
  max-height: 100% !important;
  overflow: hidden !important;
  background: #f4f8fc !important;
}

body.internet-metering-page-active .ema-main,
body.internet-metering-page-active .ema-content,
body.internet-metering-page-active .ema-content-area,
body.internet-metering-page-active .app-main,
body.internet-metering-page-active .app-content,
body.internet-metering-page-active .layout-main,
body.internet-metering-page-active .layout-content,
body.internet-metering-page-active .main,
body.internet-metering-page-active .main-content,
body.internet-metering-page-active main {
  min-height: 0 !important;
  overflow: hidden !important;
  background: #f4f8fc !important;
}

body.internet-metering-page-active .ema-page,
body.internet-metering-page-active .page-content,
body.internet-metering-page-active .content,
body.internet-metering-page-active .content-area,
body.internet-metering-page-active .dashboard-page,
body.internet-metering-page-active .dashboard-content,
body.internet-metering-page-active .page-container,
body.internet-metering-page-active .router-content {
  height: calc(100dvh - 76px) !important;
  max-height: calc(100dvh - 76px) !important;
  min-height: 0 !important;
  overflow: hidden !important;
  padding: 0 !important;
  margin: 0 !important;
  background: #f4f8fc !important;
}

body.internet-metering-page-active .settings-module-root.ema-module-root,
body.internet-metering-page-active .internet-metering-page {
  width: 100% !important;
  max-width: none !important;
  height: 100% !important;
  min-height: 0 !important;
  max-height: 100% !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  margin: 0 !important;
  color: #0f172a !important;
  background:
    radial-gradient(circle at 8% 0%, rgba(37, 99, 235, 0.055), transparent 24rem),
    radial-gradient(circle at 98% 18%, rgba(14, 165, 233, 0.06), transparent 26rem),
    linear-gradient(135deg, #eef4fb 0%, #f8fbff 46%, #e8eff7 100%) !important;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  -webkit-overflow-scrolling: touch;
}

body.internet-metering-page-active .settings-module-root.ema-module-root::before,
body.internet-metering-page-active .internet-metering-page::before {
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

body.internet-metering-page-active .settings-module-root.ema-module-root::-webkit-scrollbar,
body.internet-metering-page-active .internet-metering-page::-webkit-scrollbar {
  width: 6px;
}

body.internet-metering-page-active .settings-module-root.ema-module-root::-webkit-scrollbar-track,
body.internet-metering-page-active .internet-metering-page::-webkit-scrollbar-track {
  background: rgba(226, 232, 240, .55);
  border-radius: 999px;
}

body.internet-metering-page-active .settings-module-root.ema-module-root::-webkit-scrollbar-thumb,
body.internet-metering-page-active .internet-metering-page::-webkit-scrollbar-thumb {
  background: rgba(100, 116, 139, .65);
  border: 1px solid rgba(226, 232, 240, .55);
  border-radius: 999px;
}

body.internet-metering-page-active .settings-layout,
body.internet-metering-page-active .settings-content,
body.internet-metering-page-active .content-shell,
body.internet-metering-page-active .settings-hero {
  position: relative;
  z-index: 1;
}

body.internet-metering-page-active .settings-menu,
body.internet-metering-page-active .settings-hero,
body.internet-metering-page-active .content-shell,
body.internet-metering-page-active .ema-panel-surface,
body.internet-metering-page-active .pricing-table-card,
body.internet-metering-page-active .settings-helper-card {
  background-color: rgba(255, 255, 255, 0.94) !important;
}


.internet-metering-page .settings-layout.internet-settings-layout {
  grid-template-columns: minmax(300px, 322px) minmax(0, 1fr) !important;
}

.internet-metering-page .settings-menu.internet-left-panel {
  min-width: 300px !important;
}

.internet-metering-page .settings-menu > .ema-module-sidebar-switcher {
  flex: 0 0 auto !important;
  margin: 0 !important;
}

.internet-metering-page .settings-menu > .ema-sidebar-content {
  flex: 1 1 auto !important;
  padding-top: 0.65rem !important;
}

.internet-metering-page .ema-sidebar-subpanel {
  justify-content: flex-start !important;
}

.internet-metering-page .ema-sidebar-tree {
  min-height: 0 !important;
}

.internet-metering-page .ema-sidebar-tree-node.is-internet-root {
  grid-template-columns: 24px minmax(0, 1fr) !important;
}

.internet-metering-page .ema-sidebar-tree-node.is-internet-root .ema-sidebar-tree-toggle svg,
.internet-metering-page .ema-sidebar-tree-node.is-internet-root .ema-sidebar-tree-count,
.internet-metering-page .ema-sidebar-tree-node.is-internet-root .ema-sidebar-tree-menu-wrap {
  display: none !important;
}

.internet-metering-page .ema-sidebar-empty {
  border: 1px dashed rgba(148, 163, 184, 0.4);
  border-radius: 14px;
  color: #64748b;
  font-size: 0.82rem;
  padding: 0.75rem;
}


.internet-metering-page .settings-content {
  min-width: 0 !important;
}

.internet-metering-page .internet-metering-hero {
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: nowrap !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 1rem !important;
  overflow: visible !important;
}

.internet-metering-page .internet-metering-hero > .internet-metering-hero-copy {
  flex: 0 1 360px !important;
  min-width: 220px !important;
  max-width: 460px !important;
}

.internet-metering-page .internet-metering-hero-score {
  display: grid !important;
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  grid-auto-flow: column !important;
  grid-auto-columns: minmax(0, 1fr) !important;
  align-items: stretch !important;
  justify-content: end !important;
  gap: 0.75rem !important;
  flex: 1 1 640px !important;
  width: auto !important;
  min-width: 560px !important;
  max-width: 760px !important;
  overflow: visible !important;
}

.internet-metering-page .internet-metering-kpi-card {
  display: block !important;
  width: 100% !important;
  min-width: 0 !important;
  max-width: none !important;
  min-height: 78px !important;
  padding: 0.72rem 0.86rem !important;
  border: 1px solid rgba(148, 163, 184, 0.36) !important;
  border-radius: 16px !important;
  background:
    radial-gradient(circle at 12% 12%, rgba(37, 99, 235, 0.08), transparent 44%),
    linear-gradient(135deg, rgba(255,255,255,0.98), rgba(248,251,255,0.92)) !important;
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.06) !important;
  overflow: hidden !important;
  box-sizing: border-box !important;
}

.internet-metering-page .internet-metering-kpi-content {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) !important;
  align-content: center !important;
  gap: 0.12rem !important;
  min-width: 0 !important;
  height: 100% !important;
}

.internet-metering-page .internet-metering-kpi-label,
.internet-metering-page .internet-metering-kpi-value,
.internet-metering-page .internet-metering-kpi-note {
  display: block !important;
  min-width: 0 !important;
  max-width: 100% !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

.internet-metering-page .internet-metering-kpi-label {
  font-size: 0.63rem !important;
  line-height: 1 !important;
  letter-spacing: 0.075em !important;
  text-transform: uppercase !important;
  font-weight: 900 !important;
  color: #475569 !important;
}

.internet-metering-page .internet-metering-kpi-value {
  font-size: clamp(1.15rem, 1.8vw, 1.52rem) !important;
  line-height: 1.1 !important;
  font-weight: 950 !important;
  color: #0f2748 !important;
}

.internet-metering-page .internet-metering-kpi-note {
  font-size: 0.62rem !important;
  line-height: 1.05 !important;
  font-weight: 800 !important;
  color: #64748b !important;
}

@media (max-width: 1180px) {
  .internet-metering-page .internet-metering-hero > .internet-metering-hero-copy {
    flex-basis: 300px !important;
  }

  .internet-metering-page .internet-metering-hero-score {
    min-width: 520px !important;
    max-width: none !important;
    gap: 0.55rem !important;
  }

  .internet-metering-page .internet-metering-kpi-card {
    padding: 0.62rem 0.68rem !important;
  }
}

@media (max-width: 960px) {
  .internet-metering-page .internet-metering-hero {
    align-items: flex-start !important;
    overflow-x: auto !important;
  }

  .internet-metering-page .internet-metering-hero > .internet-metering-hero-copy {
    flex: 0 0 260px !important;
  }

  .internet-metering-page .internet-metering-hero-score {
    flex: 0 0 560px !important;
    min-width: 560px !important;
  }
}

@media (max-width: 1100px) {
  .internet-metering-page .settings-layout.internet-settings-layout {
    grid-template-columns: 1fr !important;
  }

  .internet-metering-page .settings-menu.internet-left-panel {
    min-width: 0 !important;
    max-width: none !important;
  }
}
`;


function readInternetMeteringCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt?: number; value?: T };
    if (!parsed.savedAt || Date.now() - parsed.savedAt > INTERNET_METERING_CACHE_TTL) return null;
    return parsed.value ?? null;
  } catch {
    return null;
  }
}

function writeInternetMeteringCache<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), value }));
  } catch {
    // Ignore storage quota/privacy errors.
  }
}

const extractDepartmentRows = (payload: any): any[] => {
  if (Array.isArray(payload?.data?.departments)) return payload.data.departments;
  if (Array.isArray(payload?.departments)) return payload.departments;
  return extractArray<any>(payload);
};

const extractAssetRows = (payload: any): any[] => {
  if (Array.isArray(payload?.data?.assets)) return payload.data.assets;
  if (Array.isArray(payload?.assets)) return payload.assets;
  return extractArray<any>(payload);
};

function mapDepartment(row: any, index: number): TreeNodeType {
  const objectRelIdn = numberFrom(row, ['Object_Rel_Idn', 'relationID', 'relationId', 'id', 'ID'], index + 1);
  const label = textFrom(row, ['Object_Rel_Name', 'RelationName', 'DepartmentName', 'department', 'name', 'label'], `Department ${index + 1}`);
  const nestedDepartments = extractArray<any>(row?.children).map((child, childIndex) => mapDepartment(child, childIndex));
  const explicitCount = numberFrom(row, [
    'TotalDevices',
    'DeviceCount',
    'deviceCount',
    'AssetCount',
    'assetCount',
    'TotalAssets',
    'totalAssets',
    'count',
    'Count',
    'Total',
  ], 0);

  return {
    id: `folder-${objectRelIdn || label}`,
    label,
    type: 'folder',
    objectRelIdn,
    count: explicitCount || undefined,
    children: nestedDepartments,
    childrenLoaded: false,
    raw: row,
  };
}

function mapAsset(row: any, index: number): TreeNodeType {
  const objectRootIdn = numberFrom(row, ['Object_Root_Idn', '_Idn', 'assetId', 'id', 'ID'], index + 1);
  const objectDeviceID = textFrom(row, ['Object_DeviceID', 'DeviceID', 'deviceID', 'deviceId'], '');
  const label = textFrom(row, ['ComputerName', 'Object_Client_Name', 'DeviceName', 'name', 'label'], objectDeviceID || `Device ${index + 1}`);
  return {
    id: `device-${objectRootIdn || objectDeviceID || label}`,
    label,
    type: 'device',
    objectRootIdn,
    objectRelIdn: numberFrom(row, ['Object_Rel_Idn', 'relationID', 'relationId'], 0),
    objectDeviceID,
    childrenLoaded: true,
    raw: row,
  };
}

async function preloadDepartmentNode(row: any, index: number, visited = new Set<number>()): Promise<TreeNodeType> {
  const baseNode = mapDepartment(row, index);

  if (!baseNode.objectRelIdn || visited.has(baseNode.objectRelIdn)) {
    return { ...baseNode, childrenLoaded: true };
  }

  const nextVisited = new Set(visited);
  nextVisited.add(baseNode.objectRelIdn);

  let departmentRows = extractArray<any>(row?.children);
  let assetRows: any[] = [];

  try {
    const folderPayload = await internetMeteringService.getDepartmentChildren(baseNode.objectRelIdn);
    const endpointDepartments = extractDepartmentRows(folderPayload);
    const endpointAssets = extractAssetRows(folderPayload);

    if (endpointDepartments.length > 0) departmentRows = endpointDepartments;
    if (endpointAssets.length > 0) assetRows = endpointAssets;
  } catch {
    // Keep using recursive children from /api/departments if the per-folder endpoint is unavailable.
  }

  if (assetRows.length === 0) {
    try {
      const assetPayload = await internetMeteringService.getAssetsByRelationID(baseNode.objectRelIdn);
      assetRows = extractAssetRows(assetPayload);
    } catch {
      assetRows = [];
    }
  }

  const departments = await Promise.all(
    departmentRows.map((childRow, childIndex) => preloadDepartmentNode(childRow, childIndex, nextVisited))
  );
  const assets = assetRows.map(mapAsset);

  return resolveTreeCounts({
    ...baseNode,
    children: [...departments, ...assets],
    childrenLoaded: true,
  });
}

function mapUsageRow(row: any, index: number): InternetUsageRow {
  return {
    id: numberFrom(row, ['id', 'ID', 'RowNumber', 'No', 'URLMain_Idn'], index + 1),
    domainName: textFrom(row, ['domainName', 'DomainName', 'URLMain', 'URL_Main', 'URL', 'url', 'Website', 'Host'], '-'),
    urlMainIdn: numberFrom(row, ['urlMainIdn', 'URLMain_Idn', 'URLMainID', 'URL_Idn', 'url_id'], 0),
    usedTime: numberFrom(row, ['usedTime', 'UsedTime', 'Used_Time', 'Duration', 'DurationSeconds', 'Seconds', 'TotalSeconds'], 0),
    counts: numberFrom(row, ['counts', 'Counts', 'Count', 'UseCount', 'UsedCount', 'HitCount', 'AccessCount'], 0),
    device: textFrom(row, ['device', 'ComputerName', 'Object_Client_Name', 'DeviceName', 'UserName', 'User'], '-'),
    date: textFrom(row, ['date', 'MeterDate', 'Meter_Date', 'Date', 'SearchDate', 'UseDate'], '').slice(0, 10),
    raw: row.raw || row,
  };
}

function mapUrlNode(row: any, index: number, parentRestrict = -1): TreeNodeType {
  const hasChildren = extractArray<any>(row?.children).length > 0;
  const type = row?.type === 'url' || (!hasChildren && numberFrom(row, ['URLMain_Idn', 'urlMainIdn', 'URLMainID', 'URL_Idn'], 0) > 0) ? 'url' : 'url-folder';
  const urlMainIdn = numberFrom(row, ['URLMain_Idn', 'urlMainIdn', 'URLMainID', 'URL_Idn', 'id'], 0);
  const label = textFrom(row, ['label', 'url', 'URLMain', 'URL_Main', 'DomainName', 'URLParent'], `URL ${index + 1}`);
  const restrict = numberFrom(row, ['restrict', 'nRestrict', 'Restrict', 'restrict_id'], parentRestrict);
  const safeId = String(row?.id || `${type}-${restrict}-${urlMainIdn || label}-${index}`);

  return {
    id: safeId,
    label,
    type,
    urlMainIdn,
    url: textFrom(row, ['url', 'URLMain', 'URL_Main', 'DomainName'], label),
    restrict,
    childrenLoaded: true,
    children: extractArray<any>(row?.children).map((child, childIndex) => mapUrlNode(child, childIndex, restrict)),
    raw: row?.raw || row,
  };
}

function flattenUrlNodes(node: TreeNodeType): TreeNodeType[] {
  const children = node.children || [];
  return [
    ...(node.type === 'url' ? [node] : []),
    ...children.flatMap((child) => flattenUrlNodes(child)),
  ];
}

function updateNode(node: TreeNodeType, nodeId: string, updater: (node: TreeNodeType) => TreeNodeType): TreeNodeType {
  if (node.id === nodeId) return updater(node);
  return {
    ...node,
    children: node.children?.map((child) => updateNode(child, nodeId, updater)),
  };
}

function treeDisplayCount(node: TreeNodeType): number {
  if (typeof node.count === 'number' && Number.isFinite(node.count) && node.count > 0) return node.count;
  if (node.type === 'device' || node.type === 'url') return 1;
  if (!node.children?.length) return 0;
  return node.children.reduce((sum, child) => sum + treeDisplayCount(child), 0);
}

function resolveTreeCounts(node: TreeNodeType): TreeNodeType {
  const children = node.children?.map(resolveTreeCounts) || [];
  const existingCount = typeof node.count === 'number' && Number.isFinite(node.count) && node.count > 0 ? node.count : 0;
  const computedCount = node.type === 'device' || node.type === 'url'
    ? 1
    : children.reduce((sum, child) => sum + treeDisplayCount(child), 0);
  const count = Math.max(existingCount, computedCount);

  return {
    ...node,
    children,
    count: count > 0 ? count : node.count,
  };
}

function filterTreeNode(node: TreeNodeType, query: string): TreeNodeType | null {
  const search = query.trim().toLowerCase();
  if (!search) return node;
  const filteredChildren = (node.children || [])
    .map((child) => filterTreeNode(child, search))
    .filter(Boolean) as TreeNodeType[];
  const matches = node.label.toLowerCase().includes(search) || String(node.url || '').toLowerCase().includes(search);
  if (!matches && filteredChildren.length === 0) return null;
  return { ...node, children: filteredChildren, childrenLoaded: true };
}

function getScopeStorageKey(node: TreeNodeType): string {
  if (node.type === 'device') return `device:${node.objectRootIdn || node.objectDeviceID || node.id}`;
  if (node.type === 'folder') return `folder:${node.objectRelIdn || node.id}`;
  return 'all:company';
}

function makeResultTarget(selectedUrl: TreeNodeType, restrictFilter: number, selectedUrlLabel: string): TreeNodeType {
  if (selectedUrl.type === 'url') return selectedUrl;
  return {
    id: `results-${restrictFilter}`,
    label: selectedUrlLabel,
    type: 'url-folder',
    restrict: restrictFilter,
    childrenLoaded: true,
  };
}

function getUsageTargetKey(node: TreeNodeType): string {
  if (node.type === 'url') return `url:${node.urlMainIdn || node.url || node.id}`;
  return `folder:${node.restrict ?? 'all'}:${node.id}`;
}

function queryParamsFromSearch(params: URLSearchParams): Record<string, string> {
  const record: Record<string, string> = {};
  params.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

type CompactPaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  label: string;
  className?: string;
};

function CompactPagination({ currentPage, totalPages, onPageChange, label, className }: CompactPaginationProps) {
  const safeTotalPages = Math.max(1, totalPages || 1);
  const safeCurrentPage = Math.min(Math.max(1, currentPage || 1), safeTotalPages);

  const goToPage = (nextPage: number) => {
    const boundedPage = Math.min(Math.max(1, nextPage), safeTotalPages);
    if (boundedPage === safeCurrentPage) return;
    onPageChange(boundedPage);
  };

  return (
    <div className={clsx('uam-pagination global-style', className)}>
      <div className="uam-page-summary">Page {formatNumber(safeCurrentPage)} of {formatNumber(safeTotalPages)}</div>
      <div className="uam-page-status">{label}</div>
      <div className="uam-pagination-controls global-style" aria-label={label}>
        <button type="button" className="uam-page-icon" onClick={() => goToPage(1)} disabled={safeCurrentPage <= 1} aria-label="First page">
          <ChevronsLeft size={14} />
        </button>
        <button type="button" className="uam-page-icon" onClick={() => goToPage(safeCurrentPage - 1)} disabled={safeCurrentPage <= 1} aria-label="Previous page">
          <ChevronLeft size={14} />
        </button>
        <span className="uam-page-current">{formatNumber(safeCurrentPage)}</span>
        <button type="button" className="uam-page-icon" onClick={() => goToPage(safeCurrentPage + 1)} disabled={safeCurrentPage >= safeTotalPages} aria-label="Next page">
          <ChevronRight size={14} />
        </button>
        <button type="button" className="uam-page-icon" onClick={() => goToPage(safeTotalPages)} disabled={safeCurrentPage >= safeTotalPages} aria-label="Last page">
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  );
}


type ImSelectOption = {
  value: string;
  label: string;
  triggerLabel?: string;
};

const formatDateDisplay = (value: string) => {
  if (!value) return '-';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
};

function buildDateOptions(currentValue: string): ImSelectOption[] {
  const baseOptions: ImSelectOption[] = [
    { value: todayIso(), label: `Today · ${formatDateDisplay(todayIso())}`, triggerLabel: formatDateDisplay(todayIso()) },
    { value: daysAgoIso(1), label: `Yesterday · ${formatDateDisplay(daysAgoIso(1))}`, triggerLabel: formatDateDisplay(daysAgoIso(1)) },
    { value: daysAgoIso(7), label: `7 days ago · ${formatDateDisplay(daysAgoIso(7))}`, triggerLabel: formatDateDisplay(daysAgoIso(7)) },
    { value: daysAgoIso(14), label: `14 days ago · ${formatDateDisplay(daysAgoIso(14))}`, triggerLabel: formatDateDisplay(daysAgoIso(14)) },
    { value: daysAgoIso(30), label: `30 days ago · ${formatDateDisplay(daysAgoIso(30))}`, triggerLabel: formatDateDisplay(daysAgoIso(30)) },
    { value: daysAgoIso(60), label: `60 days ago · ${formatDateDisplay(daysAgoIso(60))}`, triggerLabel: formatDateDisplay(daysAgoIso(60)) },
    { value: daysAgoIso(90), label: `90 days ago · ${formatDateDisplay(daysAgoIso(90))}`, triggerLabel: formatDateDisplay(daysAgoIso(90)) },
  ];

  if (currentValue && !baseOptions.some((option) => option.value === currentValue)) {
    baseOptions.unshift({
      value: currentValue,
      label: `Selected · ${formatDateDisplay(currentValue)}`,
      triggerLabel: formatDateDisplay(currentValue),
    });
  }

  return baseOptions;
}

function ImCustomSelect({
  value,
  options,
  onChange,
  className,
  ariaLabel,
  icon,
}: {
  value: string;
  options: ImSelectOption[];
  onChange: (value: string) => void;
  className?: string;
  icon?: ReactNode;
  ariaLabel: string;
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const selected = options.find((option) => option.value === value);
  const selectedLabel = selected?.triggerLabel || selected?.label || options[0]?.label || 'Select';

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 16;
    const gap = 8;
    const menuWidth = Math.max(rect.width, 210);
    const optionHeight = 36;
    const estimatedHeight = Math.min(288, Math.max(44, options.length * optionHeight + 10));
    const availableBelow = window.innerHeight - rect.bottom - viewportPadding;
    const availableAbove = rect.top - viewportPadding;
    const openAbove = availableBelow < estimatedHeight && availableAbove > availableBelow;
    const maxHeight = Math.max(96, Math.min(estimatedHeight, openAbove ? availableAbove : availableBelow));
    const left = Math.min(Math.max(viewportPadding, rect.left), window.innerWidth - menuWidth - viewportPadding);
    const top = openAbove
      ? Math.max(viewportPadding, rect.top - maxHeight - gap)
      : Math.min(rect.bottom + gap, window.innerHeight - maxHeight - viewportPadding);

    setMenuStyle({
      position: 'fixed',
      left,
      top,
      width: menuWidth,
      maxHeight,
      zIndex: 2147483600,
    });
  }, [options.length]);

  useEffect(() => {
    if (!open) return undefined;

    updateMenuPosition();

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [open, updateMenuPosition]);

  const menuNode = open && typeof document !== 'undefined' ? createPortal(
    <div ref={menuRef} className="uam-filter-menu uam-filter-menu-portal setting-select-menu" style={menuStyle} role="listbox" aria-label={ariaLabel}>
      {options.map((option) => {
        const selectedOption = option.value === value;
        return (
          <button
            key={`${option.value}-${option.label}`}
            type="button"
            className={clsx('uam-filter-option', selectedOption && 'selected')}
            role="option"
            aria-selected={selectedOption}
            onClick={() => {
              onChange(option.value);
              setOpen(false);
            }}
          >
            <span>{option.label}</span>
            {selectedOption && <span className="uam-filter-check">✓</span>}
          </button>
        );
      })}
    </div>,
    document.body,
  ) : null;

  return (
    <div className={clsx('uam-filter-dropdown setting-select-dropdown', open && 'open', className)}>
      <button
        ref={triggerRef}
        type="button"
        className="uam-filter-trigger setting-select-trigger"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((current) => !current)}
      >
        {icon}
        <span>{selectedLabel}</span>
        <ChevronDown size={15} />
      </button>
      {menuNode}
    </div>
  );
}

function TreeNode({
  node,
  selectedId,
  onSelect,
  onLoadChildren,
  level = 0,
  defaultOpen = false,
  rootDisplayLabel,
}: {
  node: TreeNodeType;
  selectedId: string;
  onSelect: (node: TreeNodeType) => void;
  onLoadChildren?: (node: TreeNodeType) => Promise<void>;
  onOpenNodeMenu?: (node: TreeNodeType, position: { x: number; y: number }) => void;
  level?: number;
  defaultOpen?: boolean;
  showCounts?: boolean;
  showActions?: boolean;
  rootDisplayLabel?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const canExpand = node.type === 'all' || node.type === 'folder' || node.type === 'url-folder' || Boolean(node.children?.length);
  const selected = selectedId === node.id;
  const displayLabel = rootDisplayLabel && level === 0 ? rootDisplayLabel : node.label;
  const Icon = node.type === 'device' ? Laptop : node.type === 'url' ? Globe : open ? FolderOpen : Folder;
  const isRootNode = level === 0 || node.type === 'all' || node.id === 'all-devices' || node.id === 'url-sidebar-root' || node.id === 'url-root';
  const count = treeDisplayCount(node);

  const loadAndToggle = async () => {
    if (!canExpand) return;
    if (!node.childrenLoaded && onLoadChildren) await onLoadChildren(node);
    setOpen((value) => !value);
  };

  const handleMainClick = async () => {
    onSelect(node);
    await loadAndToggle();
  };

  return (
    <div className="ema-sidebar-tree-branch">
      <div className={clsx(
        'ema-sidebar-tree-node',
        `depth-${Math.min(level, 8)}`,
        selected && 'is-selected is-active',
        canExpand && 'is-expandable',
        node.type === 'device' && 'is-device-node',
        node.type === 'url' && 'is-url-node',
        isRootNode && 'is-internet-root',
      )}>
        <button
          type="button"
          className="ema-sidebar-tree-toggle"
          onClick={async (event) => {
            event.stopPropagation();
            await loadAndToggle();
          }}
          aria-label={canExpand ? `${open ? 'Collapse' : 'Expand'} ${displayLabel}` : displayLabel}
        >
          {!isRootNode && canExpand ? open ? <ChevronDown size={14} /> : <ChevronRight size={14} /> : <span />}
        </button>

        <button type="button" className="ema-sidebar-tree-main" onClick={handleMainClick} title={node.label}>
          <span className="ema-sidebar-tree-icon">
            <Icon size={15} />
          </span>
          <span className="ema-sidebar-tree-label">{displayLabel}</span>
          {!isRootNode && count > 0 && <span className="ema-sidebar-tree-count">{formatNumber(count)}</span>}
        </button>

        <span />
      </div>

      {open && Boolean(node.children?.length) && (
        <div className="ema-sidebar-tree-children is-nested">
          {node.children?.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
              onLoadChildren={onLoadChildren}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DetailModal({ row, onClose }: { row: InternetUsageRow; onClose: () => void }) {
  const fields = [
    ['Domain', row.domainName],
    ['URL Main ID', row.urlMainIdn ? String(row.urlMainIdn) : '-'],
    ['Device / User', row.device],
    ['Used Time', formatDuration(row.usedTime)],
    ['Access Count', formatNumber(row.counts)],
    ['Meter Date', row.date || '-'],
  ];

  return (
    <div className="user-modal-backdrop open">
      <section className="user-modal advanced">
        <div className="user-modal-head">
          <div>
            <span className="section-tag">Internet Metering</span>
            <h3>Internet Usage Detail</h3>
            <p>{row.domainName}</p>
          </div>
          <button type="button" onClick={onClose} className="modal-close" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="user-modal-body content-body">
          <div className="form-grid wide">
            {fields.map(([label, value]) => (
              <label key={label} className="form-field">
                <span>{label}:</span>
                <strong>{value}</strong>
              </label>
            ))}
          </div>
          <label className="form-field wide">
            <span>Full Record:</span>
            <pre className="settings-helper-card mb-0 text-start overflow-auto">{JSON.stringify(row.raw ?? row, null, 2)}</pre>
          </label>
        </div>
        <div className="user-modal-foot">
          <button type="button" className="soft-btn" onClick={onClose}>Close</button>
        </div>
      </section>
    </div>
  );
}

export default function InternetMetering() {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    document.documentElement.classList.add('internet-metering-page-active');
    document.body.classList.add('internet-metering-page-active');
    document.documentElement.classList.remove('itops-dashboard-page-active', 'md-dashboard-page-active', 'md-management-dashboard-active', 'network-inventory-page-active', 'patch-management-page-active');
    document.body.classList.remove('itops-dashboard-page-active', 'md-dashboard-page-active', 'md-management-dashboard-active', 'network-inventory-page-active', 'patch-management-page-active');

    window.dispatchEvent(new CustomEvent('ema-topbar-meta', {
      detail: {
        path: window.location.pathname,
        title: 'Internet Metering',
        subtitle: 'Manage device scope and URL rules.',
        searchPlaceholder: 'Search domain, URL, device, user or rule ID...',
      },
    }));

    return () => {
      document.documentElement.classList.remove('internet-metering-page-active');
      document.body.classList.remove('internet-metering-page-active');
      window.dispatchEvent(new CustomEvent('ema-topbar-meta', { detail: null }));
    };
  }, []);

  const [orgRoot, setOrgRoot] = useState<TreeNodeType>({ id: 'all-devices', label: 'All Devices', type: 'all', children: [], childrenLoaded: false });
  const [selectedScope, setSelectedScope] = useState<TreeNodeType>({ id: 'all-devices', label: 'All Devices', type: 'all', children: [], childrenLoaded: false });
  const [urlRoot, setUrlRoot] = useState<TreeNodeType>({ id: 'url-root', label: 'Domain Rules', type: 'url-folder', children: [], childrenLoaded: true });
  const [selectedUrl, setSelectedUrl] = useState<TreeNodeType>({ id: 'url-root', label: 'All domains', type: 'url-folder', childrenLoaded: true });

  const [sidebarTab, setSidebarTab] = useState<'organization' | 'filters'>('organization');
  const [sidebarSearch, setSidebarSearch] = useState('');

  const [usageRows, setUsageRows] = useState<InternetUsageRow[]>([]);
  const [stats, setStats] = useState<InternetStats>({ totalRecords: 0, totalDomains: 0, totalUsageSeconds: 0, totalCounts: 0 });
  const [totalRecords, setTotalRecords] = useState(0);
  const [query, setQuery] = useState('');
  const [fromDate, setFromDate] = useState(daysAgoIso(30));
  const [toDate, setToDate] = useState(todayIso());
  const [restrictFilter, setRestrictFilter] = useState(-1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);
  const [loading, setLoading] = useState(false);
  const [treeLoading, setTreeLoading] = useState(false);
  const [urlLoading, setUrlLoading] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [detailRow, setDetailRow] = useState<InternetUsageRow | null>(null);
  const [newUrl, setNewUrl] = useState('');
  const [urlEntryType, setUrlEntryType] = useState<0 | 1>(0);
  const [urlPage, setUrlPage] = useState(1);
  const [urlHasNextPage, setUrlHasNextPage] = useState(false);
  const [urlTotalRecords, setUrlTotalRecords] = useState(0);
  const [actionMenuId, setActionMenuId] = useState<{ node: TreeNodeType; x: number; y: number } | null>(null);
  const [pendingUrlAction, setPendingUrlAction] = useState<PendingUrlAction | null>(null);
  const [usagePanelUrl, setUsagePanelUrl] = useState<TreeNodeType | null>(null);
  const [scopeMenu, setScopeMenu] = useState<{ node: TreeNodeType; x: number; y: number } | null>(null);
  const [pendingMeteringAction, setPendingMeteringAction] = useState<PendingMeteringAction | null>(null);
  const [meteringBusy, setMeteringBusy] = useState(false);
  const urlLoadSeq = useRef(0);
  const meterLoadSeq = useRef(0);
  const orgLoadSeq = useRef(0);
  const [activeMeteringScopes, setActiveMeteringScopes] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('internetMeteringActiveScopes');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const loadOrgChildren = useCallback(async (node: TreeNodeType) => {
    const requestId = ++orgLoadSeq.current;
    const cacheKey = `internet-metering:org-children:${node.type}:${node.objectRelIdn || node.id}`;
    const cachedChildren = readInternetMeteringCache<TreeNodeType[]>(cacheKey);

    if (cachedChildren?.length) {
      setOrgRoot((current) => updateNode(current, node.id, (target) => ({ ...target, children: cachedChildren, childrenLoaded: true })));
      setSelectedScope((current) => (current.id === node.id ? { ...current, children: cachedChildren, childrenLoaded: true } : current));
    }

    try {
      setTreeLoading(true);
      let departments: TreeNodeType[] = [];
      let assets: TreeNodeType[] = [];

      if (node.type === 'all') {
        const payload = await internetMeteringService.getDepartments();
        const departmentRows = extractDepartmentRows(payload);
        departments = await Promise.all(departmentRows.map((row, index) => preloadDepartmentNode(row, index)));
      } else if (node.type === 'folder' && node.objectRelIdn) {
        const folderPayload = await internetMeteringService.getDepartmentChildren(node.objectRelIdn).catch(() => ({ departments: [], assets: [] }));
        const departmentRows = extractDepartmentRows(folderPayload);
        let assetRows = extractAssetRows(folderPayload);

        if (assetRows.length === 0) {
          const assetPayload = await internetMeteringService.getAssetsByRelationID(node.objectRelIdn).catch(() => []);
          assetRows = extractAssetRows(assetPayload);
        }

        departments = await Promise.all(departmentRows.map((row, index) => preloadDepartmentNode(row, index, new Set([node.objectRelIdn!]))));
        assets = assetRows.map(mapAsset);
      }

      if (requestId !== orgLoadSeq.current) return;

      const children = [...departments, ...assets].map(resolveTreeCounts);
      const computedCount = children.reduce((sum, item) => sum + treeDisplayCount(item), 0);
      const nextCount = Math.max(typeof node.count === 'number' && node.count > 0 ? node.count : 0, computedCount);
      writeInternetMeteringCache(cacheKey, children);
      setOrgRoot((current) => updateNode(current, node.id, (target) => ({ ...target, count: nextCount || target.count, children, childrenLoaded: true })));
      setSelectedScope((current) => (current.id === node.id ? { ...current, count: nextCount || current.count, children, childrenLoaded: true } : current));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (requestId === orgLoadSeq.current) setTreeLoading(false);
    }
  }, []);


  const loadRootDeviceCount = useCallback(async () => {
    const cacheKey = 'internet-metering:root-device-count:v1';
    const cachedCount = readInternetMeteringCache<number>(cacheKey);

    if (cachedCount && cachedCount > 0) {
      setOrgRoot((current) => ({ ...current, count: cachedCount }));
      setSelectedScope((current) => (current.id === 'all-devices' ? { ...current, count: cachedCount } : current));
    }

    try {
      const assetPayload = await internetMeteringService.getAssets();
      const assetRows = extractAssetRows(assetPayload);
      const nextCount = assetRows.length;
      if (nextCount > 0) {
        writeInternetMeteringCache(cacheKey, nextCount);
        setOrgRoot((current) => ({ ...current, count: nextCount }));
        setSelectedScope((current) => (current.id === 'all-devices' ? { ...current, count: nextCount } : current));
      }
    } catch {
      // Count is only decorative; do not block the module if this lookup is slow/unavailable.
    }
  }, []);

  const loadUrlTree = useCallback(async () => {
    const requestId = ++urlLoadSeq.current;
    const activeRestrict = restrictFilter === 1 ? 1 : restrictFilter === 0 ? 0 : -1;
    const cacheKey = `internet-metering:url-tree:${activeRestrict}:${urlPage}`;
    const cachedRoot = readInternetMeteringCache<TreeNodeType>(cacheKey);

    if (cachedRoot) {
      const loadedRows = flattenUrlNodes(cachedRoot);
      setUrlHasNextPage(loadedRows.length >= URL_RULE_PAGE_SIZE);
      setUrlTotalRecords(0);
      setUrlRoot(cachedRoot);
      setSelectedUrl((current) => {
        if (current.type === 'url' && loadedRows.some((node) => node.url === current.url)) return current;
        return { id: 'url-root', label: cachedRoot.label, type: 'url-folder', restrict: activeRestrict, childrenLoaded: true };
      });
    }

    try {
      setUrlLoading(true);
      setError('');

      const params = new URLSearchParams({
        restrictID: String(activeRestrict),
        page: String(urlPage),
        limit: String(URL_RULE_PAGE_SIZE),
      });

      const payload = await internetMeteringService.getUrlTreePayload(queryParamsFromSearch(params)) as ApiResponse<unknown[]>;
      if (requestId !== urlLoadSeq.current) return;

      const children = extractArray<any>(payload).map((row, index) => mapUrlNode(row, index, activeRestrict));
      const nextUrlTotalRecords = numberFrom(payload as any, ['totalRecords', 'TotalRecords', 'total', 'count'], 0) || numberFrom((payload as any)?.data, ['totalRecords', 'TotalRecords', 'total', 'count'], 0);
      const rootLabel = activeRestrict === -1 ? 'All Domains' : activeRestrict === 1 ? 'Restricted' : 'Managed';
      const nextRoot: TreeNodeType = {
        id: 'url-root',
        label: rootLabel,
        type: 'url-folder',
        restrict: activeRestrict,
        children,
        childrenLoaded: true,
      };

      const loadedRows = flattenUrlNodes(nextRoot);
      setUrlHasNextPage(loadedRows.length >= URL_RULE_PAGE_SIZE);
      setUrlTotalRecords(nextUrlTotalRecords);
      setUrlRoot(nextRoot);
      writeInternetMeteringCache(cacheKey, nextRoot);
      setSelectedUrl((current) => {
        if (current.type === 'url' && loadedRows.some((node) => node.url === current.url)) return current;
        return { id: 'url-root', label: rootLabel, type: 'url-folder', restrict: activeRestrict, childrenLoaded: true };
      });
    } catch (err) {
      if (requestId !== urlLoadSeq.current) return;
      setError(err instanceof Error ? err.message : String(err));
      setUrlHasNextPage(false);
      setUrlTotalRecords(0);
    } finally {
      if (requestId === urlLoadSeq.current) setUrlLoading(false);
    }
  }, [restrictFilter, urlPage]);

  const activeUsageUrl = usagePanelUrl || selectedUrl;

  const buildUsageParams = useCallback(() => {
    const params = new URLSearchParams({
      startDate: fromDate,
      endDate: toDate,
      page: String(page),
      limit: String(limit),
    });

    if (selectedScope.type === 'device' && selectedScope.objectRootIdn) {
      params.set('clientID', String(selectedScope.objectRootIdn));
    } else if (selectedScope.type === 'folder' && selectedScope.objectRelIdn) {
      params.set('relationID', String(selectedScope.objectRelIdn));
    } else {
      params.set('relationID', '-1');
    }

    const usageUrl = activeUsageUrl;
    if (usageUrl.type === 'url' && usageUrl.urlMainIdn) params.set('urlID', String(usageUrl.urlMainIdn));
    if (usageUrl.restrict === 0 || usageUrl.restrict === 1) params.set('restrict', String(usageUrl.restrict));
    return params;
  }, [activeUsageUrl, fromDate, limit, page, selectedScope, toDate]);

  const loadMetering = useCallback(async (options?: { force?: boolean }) => {
    const requestId = ++meterLoadSeq.current;
    const params = buildUsageParams();
    const cacheKey = `internet-metering:usage:${params.toString()}`;
    const cached = options?.force ? null : readInternetMeteringCache<{ rows: InternetUsageRow[]; stats: InternetStats; totalRecords: number }>(cacheKey);

    if (cached) {
      setUsageRows(cached.rows);
      setStats(cached.stats);
      setTotalRecords(cached.totalRecords);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      setError('');
      const usagePayload = await internetMeteringService.getUsagePayload(queryParamsFromSearch(params)) as ApiResponse<unknown[]>;
      if (requestId !== meterLoadSeq.current) return;

      const normalizedRows = extractArray<any>(usagePayload).map(mapUsageRow);
      const derivedStats = {
        totalRecords: normalizedRows.length,
        totalDomains: new Set(normalizedRows.map((row) => row.domainName)).size,
        totalUsageSeconds: normalizedRows.reduce((sum, row) => sum + row.usedTime, 0),
        totalCounts: normalizedRows.reduce((sum, row) => sum + row.counts, 0),
      };
      const nextTotalRecords = Number(usagePayload.totalRecords || normalizedRows.length || 0);
      const snapshot = { rows: normalizedRows, stats: derivedStats, totalRecords: nextTotalRecords };

      setUsageRows(snapshot.rows);
      setStats(snapshot.stats);
      setTotalRecords(snapshot.totalRecords);
      writeInternetMeteringCache(cacheKey, snapshot);
      setLoading(false);

      (internetMeteringService.getStatsPayload(queryParamsFromSearch(params)) as Promise<ApiResponse<InternetStats>>)
        .then((statsPayload) => {
          if (requestId !== meterLoadSeq.current) return;
          const statsData = statsPayload.data;
          if (!statsData) return;
          const nextStats = {
            totalRecords: Number(statsData.totalRecords || derivedStats.totalRecords || 0),
            totalDomains: Number(statsData.totalDomains || derivedStats.totalDomains || 0),
            totalUsageSeconds: Number(statsData.totalUsageSeconds || derivedStats.totalUsageSeconds || 0),
            totalCounts: Number(statsData.totalCounts || derivedStats.totalCounts || 0),
            rows: statsData.rows,
          };
          setStats(nextStats);
          writeInternetMeteringCache(cacheKey, { ...snapshot, stats: nextStats });
        })
        .catch(() => {
          // The usage table is already usable; keep derived KPI stats if the heavier stats query is slow/unavailable.
        });
    } catch (err) {
      if (requestId !== meterLoadSeq.current) return;
      setError(err instanceof Error ? err.message : String(err));
      if (!cached) {
        setUsageRows([]);
        setStats({ totalRecords: 0, totalDomains: 0, totalUsageSeconds: 0, totalCounts: 0 });
        setTotalRecords(0);
      }
      setLoading(false);
    }
  }, [buildUsageParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadRootDeviceCount();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [loadRootDeviceCount]);

  useEffect(() => {
    void loadOrgChildren({ id: 'all-devices', label: 'All Devices', type: 'all', children: [], childrenLoaded: false });
  }, [loadOrgChildren]);

  useEffect(() => {
    loadUrlTree();
  }, [loadUrlTree]);


  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!usagePanelUrl) return;
    loadMetering();
  }, [usagePanelUrl, loadMetering]);

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return usageRows;
    return usageRows.filter((row) => [row.domainName, row.device, row.date, String(row.urlMainIdn)].some((value) => value.toLowerCase().includes(search)));
  }, [query, usageRows]);

  const selectedScopeLabel = selectedScope.type === 'device'
    ? `Device · ${selectedScope.label}`
    : selectedScope.type === 'folder'
      ? `Folder · ${selectedScope.label}`
      : 'All Devices';

  const selectedUrlLabel = selectedUrl.type === 'url' ? selectedUrl.label : restrictFilter === -1 ? 'All Domains' : restrictFilter === 0 ? 'Managed' : 'Restricted';

  const handleSelectScopeNode = useCallback((node: TreeNodeType) => {
    setSelectedScope(node);
    setPage(1);

    // Sidebar selection should feel like a filter, not just a silent highlight.
    // Open the result panel on first click and reload it when the selected scope changes.
    setUsagePanelUrl((current) => current || makeResultTarget(selectedUrl, restrictFilter, selectedUrlLabel));
  }, [restrictFilter, selectedUrl, selectedUrlLabel]);

  const selectedScopeKey = useMemo(() => getScopeStorageKey(selectedScope), [selectedScope]);
  const selectedScopeRunning = Boolean(activeMeteringScopes[selectedScopeKey]);

  const isScopeRunning = useCallback((node: TreeNodeType) => Boolean(activeMeteringScopes[getScopeStorageKey(node)]), [activeMeteringScopes]);

  const setScopeRunning = useCallback((node: TreeNodeType, running: boolean) => {
    const key = getScopeStorageKey(node);
    setActiveMeteringScopes((current) => {
      const next = { ...current };
      if (running) next[key] = true;
      else delete next[key];
      localStorage.setItem('internetMeteringActiveScopes', JSON.stringify(next));
      return next;
    });
  }, []);

  const sidebarUrlRoot = useMemo<TreeNodeType>(() => ({
    id: 'url-sidebar-root',
    label: 'All Domains',
    type: 'url-folder',
    restrict: -1,
    childrenLoaded: true,
    children: [
      { id: 'url-sidebar-managed', label: 'Managed', type: 'url-folder', restrict: 0, childrenLoaded: true, children: [] },
      { id: 'url-sidebar-restricted', label: 'Restricted', type: 'url-folder', restrict: 1, childrenLoaded: true, children: [] },
    ],
  }), []);

  const sidebarSelectedUrlId = restrictFilter === 0 ? 'url-sidebar-managed' : restrictFilter === 1 ? 'url-sidebar-restricted' : 'url-sidebar-root';

  const sidebarOrgTree = useMemo(() => filterTreeNode(orgRoot, sidebarSearch) || { ...orgRoot, children: [] }, [orgRoot, sidebarSearch]);
  const sidebarDomainTree = useMemo(() => filterTreeNode(sidebarUrlRoot, sidebarSearch) || { ...sidebarUrlRoot, children: [] }, [sidebarUrlRoot, sidebarSearch]);
  const urlRows = useMemo(() => flattenUrlNodes(urlRoot), [urlRoot]);
  const managedUrlRows = useMemo(() => urlRows.filter((node) => node.restrict === 0), [urlRows]);
  const restrictedUrlRows = useMemo(() => urlRows.filter((node) => node.restrict === 1), [urlRows]);
  const visibleUrlRows = useMemo(() => {
    if (restrictFilter === 0) return managedUrlRows;
    if (restrictFilter === 1) return restrictedUrlRows;
    return urlRows;
  }, [managedUrlRows, restrictFilter, restrictedUrlRows, urlRows]);

  const pagedUrlRows = useMemo(() => visibleUrlRows.slice(0, URL_RULE_PAGE_SIZE), [visibleUrlRows]);

  const urlTotalPages = Math.max(1, urlTotalRecords > 0 ? Math.ceil(urlTotalRecords / URL_RULE_PAGE_SIZE) : (urlHasNextPage ? urlPage + 1 : urlPage));
  const resultsTotalPages = Math.max(1, Math.ceil((totalRecords || filteredRows.length || 0) / Math.max(limit, 1)));

  useEffect(() => {
    if (urlPage > urlTotalPages) setUrlPage(urlTotalPages);
  }, [urlPage, urlTotalPages]);

  useEffect(() => {
    setUrlPage(1);
  }, [restrictFilter]);

  const handleSelectUrlNode = (node: TreeNodeType) => {
    setActionMenuId(null);

    if (node.id === 'url-sidebar-root') {
      setUsagePanelUrl(null);
      setRestrictFilter(-1);
      setUrlPage(1);
      setSelectedUrl({ id: 'url-root', label: 'All domains', type: 'url-folder', restrict: -1, childrenLoaded: true });
      return;
    }

    if (node.type === 'url-folder' && (node.restrict === 0 || node.restrict === 1)) {
      setUsagePanelUrl(null);
      setRestrictFilter(node.restrict);
      setUrlEntryType(node.restrict);
      setUrlPage(1);
      setSelectedUrl({ id: node.id, label: node.label, type: 'url-folder', restrict: node.restrict, childrenLoaded: true });
      return;
    }

    setSelectedUrl(node);
  };

  const getScopeTypeLabel = (node: TreeNodeType) => {
    if (node.type === 'device') return 'Individual device';
    if (node.type === 'folder') return 'Branch';
    return 'Whole company';
  };

  const buildMeteringPayload = (node: TreeNodeType, commandID: number, description: string) => {
    const payload: Record<string, unknown> = {
      Job_Type: WEB_METERING_JOB_TYPE,
      Job_Command: commandID,
      commandID,
      Job_Description: description,
    };

    if (node.type === 'device') {
      payload.scanMode = 'device';
      payload.Object_Root_Idn = node.objectRootIdn;
      payload.Object_DeviceID = node.objectDeviceID;
    } else if (node.type === 'folder') {
      payload.scanMode = 'folder';
      payload.Object_Rel_Idn = node.objectRelIdn;
    } else {
      payload.scanMode = 'all';
    }

    return payload;
  };

  const runMeteringAction = async (action: MeteringAction, node: TreeNodeType) => {
    const commandID = action === 'start' ? WEB_METERING_START_COMMAND : action === 'stop' ? WEB_METERING_STOP_COMMAND : WEB_METERING_COLLECT_COMMAND;
    const endpoint = action === 'start' ? '/api/internet-metering/start' : action === 'stop' ? '/api/internet-metering/stop' : '/api/internet-metering/collect';
    const label = action === 'start' ? 'Metering started' : action === 'stop' ? 'Metering stopped' : 'Collection sent';

    const result = await internetMeteringService.runMeteringAction(
      action,
      buildMeteringPayload(node, commandID, `${label} - ${getScopeTypeLabel(node)}`),
    ) as ApiResponse<any> | any;

    if (action === 'start') setScopeRunning(node, true);
    if (action === 'stop') setScopeRunning(node, false);

    const resultData = result?.data ?? result;
    const jobId = resultData?.Job_Idn ? `Job #${resultData.Job_Idn}` : label;
    const targetCount = resultData?.targetCount !== undefined ? ` · ${resultData.targetCount} targets` : '';
    setToast(`${jobId}${targetCount}`);
  };

  const confirmMeteringAction = async () => {
    if (!pendingMeteringAction) return;

    try {
      setMeteringBusy(true);
      setError('');
      await runMeteringAction(pendingMeteringAction.action, pendingMeteringAction.node);
      if (pendingMeteringAction.action === 'collect') {
        setSelectedScope(pendingMeteringAction.node);
        setPage(1);
        setUsagePanelUrl((current) => current || makeResultTarget(selectedUrl, restrictFilter, selectedUrlLabel));
      }
      setPendingMeteringAction(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setMeteringBusy(false);
    }
  };

  const collectResult = async () => {
    try {
      setCollecting(true);
      setError('');
      await runMeteringAction('collect', selectedScope);
      if (!usagePanelUrl) {
        setUsagePanelUrl(makeResultTarget(selectedUrl, restrictFilter, selectedUrlLabel));
      } else {
        await loadMetering({ force: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCollecting(false);
    }
  };

  const saveUrl = async () => {
    const cleanUrl = newUrl.trim();
    if (!cleanUrl) return;

    try {
      setUrlLoading(true);
      await internetMeteringService.createUrl({ urlMain: cleanUrl, restrictID: urlEntryType });
      setNewUrl('');
      setToast(`${urlEntryType === 1 ? 'Restricted' : 'Managed'}: ${cleanUrl}`);
      await loadUrlTree();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUrlLoading(false);
    }
  };

  const applyUrlAction = async () => {
    if (!pendingUrlAction?.node.url) return;

    const { action, node } = pendingUrlAction;
    const targetUrl = node.url;

    try {
      setUrlLoading(true);
      setPendingUrlAction(null);
      setActionMenuId(null);

      if (action === 'remove') {
        await internetMeteringService.deleteUrl({ urlMain: targetUrl });
        setToast(`Removed: ${targetUrl}`);
      } else {
        const restrictID = action === 'restrict' ? 1 : 0;
        await internetMeteringService.createUrl({ urlMain: targetUrl, restrictID });
        setToast(`${restrictID === 1 ? 'Restricted' : 'Managed'}: ${targetUrl}`);
      }

      setSelectedUrl({ id: 'url-root', label: 'All domains', type: 'url-folder', childrenLoaded: true });
      await loadUrlTree();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUrlLoading(false);
    }
  };

  const openResultsLog = (node = makeResultTarget(selectedUrl, restrictFilter, selectedUrlLabel)) => {
    if (node.type === 'url') setSelectedUrl(node);

    const isSameTarget = usagePanelUrl && getUsageTargetKey(usagePanelUrl) === getUsageTargetKey(node);
    if (!isSameTarget) {
      setUsageRows([]);
      setTotalRecords(0);
      setStats({ totalRecords: 0, totalDomains: 0, totalUsageSeconds: 0, totalCounts: 0 });
      setPage(1);
      setUsagePanelUrl(node);
    }

    setActionMenuId(null);
  };

  const exportCsv = () => {
    const headers = ['Domain', 'URL Main ID', 'Device/User', 'Used Time Seconds', 'Used Time', 'Access Count', 'Meter Date'];
    const csv = [
      headers.join(','),
      ...filteredRows.map((row) => [row.domainName, row.urlMainIdn, row.device, row.usedTime, formatDuration(row.usedTime), row.counts, row.date].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `internet-metering-${todayIso()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <style>{INTERNET_METERING_PAGE_CSS}</style>
      <main data-section="internet-metering" className="settings-module-root ema-settings-pro ema-module-root internet-metering-module internet-metering-page container-fluid p-3 p-xl-4">
      {toast && (
        <div className="settings-toast-layer">
          <div className="settings-toast settings-toast-success">
            <div className="settings-toast-icon">✓</div>
            <div>
              <strong>Success</strong>
              <span>{toast}</span>
            </div>
            <button type="button" className="settings-toast-close" onClick={() => setToast('')} aria-label="Dismiss toast"><X size={14} /></button>
          </div>
        </div>
      )}

      <div className="settings-layout internet-settings-layout d-grid gap-3">
        <aside className="settings-menu internet-left-panel ema-panel-surface">
          <div className="panel-head">
            <span>INTERNET METERING</span>
            <strong>Metering Control</strong>
            <small>Device scope and URL rules</small>
          </div>

          <nav
            className="settings-menu-list ema-module-sidebar-nav ema-module-sidebar-switcher"
            role="tablist"
            aria-label="Internet metering navigation"
          >
            <button
              type="button"
              className={clsx('setting-btn', sidebarTab === 'organization' && 'active')}
              title="Scope - Branches and devices"
              onClick={() => {
                setSidebarTab('organization');
                setSidebarSearch('');
              }}
            >
              <span className="setting-icon"><FolderOpen size={16} /></span>
              <span><strong>Scope</strong><small>Branch and device scope</small></span>
            </button>
            <button
              type="button"
              className={clsx('setting-btn', sidebarTab === 'filters' && 'active')}
              title="Rules - Managed and restricted URLs"
              onClick={() => {
                setSidebarTab('filters');
                setSidebarSearch('');
              }}
            >
              <span className="setting-icon"><Globe size={16} /></span>
              <span><strong>Rules</strong><small>Managed and restricted URLs</small></span>
            </button>
          </nav>

          <div className="ema-sidebar-content">
            <div className="ema-sidebar-subpanel">
              <div className="section-search ema-sidebar-field">
                <Search size={15} />
                <input
                  value={sidebarSearch}
                  onChange={(event) => setSidebarSearch(event.target.value)}
                  placeholder={sidebarTab === 'filters' ? 'Search rules...' : 'Search branch / device...'}
                />
              </div>

              <div className="ema-sidebar-tree" aria-label={sidebarTab === 'filters' ? 'Internet rule tree' : 'Internet metering scope tree'}>
                {sidebarTab === 'organization' && (
                  <>
                    <TreeNode
                      node={sidebarOrgTree}
                      selectedId={selectedScope.id}
                      onSelect={handleSelectScopeNode}
                      onLoadChildren={loadOrgChildren}
                      rootDisplayLabel="All Devices"
                      defaultOpen
                    />
                    {sidebarSearch && !sidebarOrgTree.children?.length && sidebarOrgTree.id === orgRoot.id && (
                      <div className="ema-sidebar-empty">No matching scope.</div>
                    )}
                  </>
                )}

                {sidebarTab === 'filters' && (
                  <>
                    <TreeNode node={sidebarDomainTree} selectedId={sidebarSelectedUrlId} onSelect={handleSelectUrlNode} rootDisplayLabel="All Domains" defaultOpen />
                    {urlLoading && <div className="ema-sidebar-empty"><Loader2 className="me-2" size={14} /> Loading URL rules...</div>}
                    {sidebarSearch && !sidebarDomainTree.children?.length && (
                      <div className="ema-sidebar-empty">No matching domain rule.</div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </aside>

        <section className="settings-content d-grid gap-3">
          <div className="settings-hero hardware-hero internet-metering-hero ema-panel-surface">
            <div className="internet-metering-hero-copy">
              <span className="eyebrow">URL MANAGEMENT</span>
              <h2>{usagePanelUrl ? 'Metering Results' : 'Internet Metering'}</h2>
              <p>Scope: {selectedScopeLabel} · Domain: {selectedUrlLabel}</p>
            </div>
            <div className="hardware-hero-score internet-metering-hero-score">
              <div className="hardware-kpi-card internet-metering-kpi-card">
                <div className="hardware-kpi-content internet-metering-kpi-content">
                  <span className="hardware-kpi-label internet-metering-kpi-label">Records</span>
                  <strong className="hardware-kpi-value internet-metering-kpi-value">{formatNumber(stats.totalRecords || totalRecords || filteredRows.length)}</strong>
                  <small className="hardware-kpi-note internet-metering-kpi-note">Usage rows</small>
                </div>
              </div>
              <div className="hardware-kpi-card internet-metering-kpi-card">
                <div className="hardware-kpi-content internet-metering-kpi-content">
                  <span className="hardware-kpi-label internet-metering-kpi-label">Domains</span>
                  <strong className="hardware-kpi-value internet-metering-kpi-value">{formatNumber(stats.totalDomains || visibleUrlRows.length)}</strong>
                  <small className="hardware-kpi-note internet-metering-kpi-note">Monitored rules</small>
                </div>
              </div>
              <div className="hardware-kpi-card internet-metering-kpi-card">
                <div className="hardware-kpi-content internet-metering-kpi-content">
                  <span className="hardware-kpi-label internet-metering-kpi-label">Usage Time</span>
                  <strong className="hardware-kpi-value internet-metering-kpi-value">{formatDuration(stats.totalUsageSeconds)}</strong>
                  <small className="hardware-kpi-note internet-metering-kpi-note">Total duration</small>
                </div>
              </div>
              <div className="hardware-kpi-card internet-metering-kpi-card">
                <div className="hardware-kpi-content internet-metering-kpi-content">
                  <span className="hardware-kpi-label internet-metering-kpi-label">Access Count</span>
                  <strong className="hardware-kpi-value internet-metering-kpi-value">{formatNumber(stats.totalCounts)}</strong>
                  <small className="hardware-kpi-note internet-metering-kpi-note">Total hits</small>
                </div>
              </div>
            </div>
          </div>

          <div className="content-shell ema-panel-surface">
            <div className="content-head d-flex flex-wrap align-items-start justify-content-between gap-3 p-3 pb-2">
              <div>
                <h3>{usagePanelUrl ? 'Metering Results' : 'URL List'}</h3>
                <p>{usagePanelUrl ? `${selectedScopeLabel} · ${usagePanelUrl.label}` : `${urlTotalRecords > 0 ? formatNumber(urlTotalRecords) : formatNumber(visibleUrlRows.length)} rules available`}</p>
              </div>
              <div className="content-actions">
                <button type="button" onClick={() => setPendingMeteringAction({ action: 'start', node: selectedScope })} disabled={meteringBusy || selectedScopeRunning} className="primary-btn">
                  {meteringBusy ? <Loader2 size={14} className="animate-spin" /> : <Wifi size={14} />} Start
                </button>
                <button type="button" onClick={() => setPendingMeteringAction({ action: 'stop', node: selectedScope })} disabled={meteringBusy || !selectedScopeRunning} className="danger-btn">
                  {meteringBusy ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />} Stop
                </button>
                <button type="button" onClick={collectResult} disabled={collecting || meteringBusy} className="soft-btn">
                  {collecting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Collect
                </button>
                <button type="button" onClick={() => usagePanelUrl ? setUsagePanelUrl(null) : openResultsLog()} className="soft-btn">
                  <FileText size={14} /> {usagePanelUrl ? 'URL List' : 'Results'}
                </button>
                <button type="button" onClick={usagePanelUrl ? () => loadMetering({ force: true }) : loadUrlTree} disabled={usagePanelUrl ? loading : urlLoading} className="soft-btn">
                  <RefreshCw size={14} /> Refresh
                </button>
                <button type="button" onClick={exportCsv} disabled={filteredRows.length === 0} className="soft-btn"><Download size={14} /> Export</button>
              </div>
            </div>

            <div className="user-access-commandbar align-items-center">
              <label className="section-search user-search-inline">
                <Search size={15} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search domain, device/user, Rule ID or date..." />
              </label>
              <ImCustomSelect
                value={fromDate}
                onChange={(value) => { setPage(1); setFromDate(value); }}
                options={buildDateOptions(fromDate)}
                icon={<CalendarDays size={15} />}
                ariaLabel="Start date"
              />
              <ImCustomSelect
                value={toDate}
                onChange={(value) => { setPage(1); setToDate(value); }}
                options={buildDateOptions(toDate)}
                icon={<CalendarDays size={15} />}
                ariaLabel="End date"
              />
              {usagePanelUrl ? (
                <ImCustomSelect
                  value={String(limit)}
                  onChange={(value) => { setPage(1); setLimit(Number(value)); }}
                  options={[{ value: '50', label: '50 rows' }, { value: '100', label: '100 rows' }, { value: '250', label: '250 rows' }, { value: '500', label: '500 rows' }]}
                  ariaLabel="Rows per page"
                />
              ) : (
                <ImCustomSelect
                  value={String(restrictFilter)}
                  onChange={(value) => { setRestrictFilter(Number(value)); setUrlPage(1); }}
                  options={[{ value: '-1', label: 'All rules' }, { value: '0', label: 'Managed' }, { value: '1', label: 'Restricted' }]}
                  ariaLabel="URL rule filter"
                />
              )}
            </div>

            <div className="content-body p-3 pt-2">
              {error && (
                <div className="settings-helper-card is-error d-flex align-items-start justify-content-between gap-3 mb-3">
                  <span><AlertCircle size={14} className="me-2" />{error}</span>
                  <button type="button" className="mini-btn icon-only" onClick={() => setError('')}><X size={13} /></button>
                </div>
              )}

              {usagePanelUrl ? (
                <>
                  <div className="pricing-table-card table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead>
                        <tr>
                          <th>No.</th>
                          <th>Domain</th>
                          <th>Device / User</th>
                          <th>Rule ID</th>
                          <th>Used Time</th>
                          <th>Access Count</th>
                          <th>Date</th>
                          <th className="text-end">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading && (
                          <tr><td colSpan={8}><div className="settings-helper-card text-center py-4"><Loader2 size={18} className="me-2 animate-spin" /> Loading records...</div></td></tr>
                        )}
                        {!loading && filteredRows.map((row, index) => (
                          <tr key={`${row.id}-${row.domainName}-${row.device}-${row.date}`}>
                            <td><span className="row-index-pill">{formatRowNumber((page - 1) * limit + index + 1)}</span></td>
                            <td><strong>{row.domainName}</strong></td>
                            <td>{row.device || '-'}</td>
                            <td>{row.urlMainIdn || '-'}</td>
                            <td>{formatDuration(row.usedTime)}</td>
                            <td>{formatNumber(row.counts)}</td>
                            <td>{row.date || '-'}</td>
                            <td className="text-end"><button type="button" onClick={() => setDetailRow(row)} className="mini-btn"><Eye size={13} /> Detail</button></td>
                          </tr>
                        ))}
                        {!loading && filteredRows.length === 0 && (
                          <tr><td colSpan={8}><div className="settings-helper-card text-center py-4"><strong>No metering records found</strong><span>Use Start Metering or Collect Result, then refresh after the job completes.</span></div></td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <CompactPagination currentPage={page} totalPages={resultsTotalPages} onPageChange={setPage} label="Metering results pagination" />
                </>
              ) : (
                <>
                  <div className="form-grid mb-3">
                    <label className="form-field">
                      <span>Rule Type:</span>
                      <ImCustomSelect
                        value={String(urlEntryType)}
                        onChange={(value) => setUrlEntryType(Number(value) as 0 | 1)}
                        options={[{ value: '0', label: 'Managed' }, { value: '1', label: 'Restricted' }]}
                        ariaLabel="URL rule type"
                      />
                    </label>
                    <label className="form-field">
                      <span>URL / Domain:</span>
                      <input value={newUrl} onChange={(event) => setNewUrl(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') saveUrl(); }} placeholder="example.com" className="setting-input" />
                    </label>
                    <label className="form-field justify-content-end">
                      <span>&nbsp;</span>
                      <button type="button" onClick={saveUrl} disabled={urlLoading || !newUrl.trim()} className="primary-btn"><Plus size={14} /> Add URL</button>
                    </label>
                  </div>

                  <div className="pricing-table-card table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead>
                        <tr>
                          <th>No.</th>
                          <th>URL / Domain</th>
                          <th>Status</th>
                          <th className="text-end">Rule ID</th>
                          <th className="text-end">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedUrlRows.map((node, index) => (
                          <tr key={node.id} onClick={() => { handleSelectUrlNode(node); openResultsLog(node); }} className={clsx(selectedUrl.id === node.id && 'table-primary')}>
                            <td><span className="row-index-pill">{formatRowNumber((urlPage - 1) * URL_RULE_PAGE_SIZE + index + 1)}</span></td>
                            <td><strong>{node.label}</strong></td>
                            <td><span className={clsx('user-pill', node.restrict === 1 ? 'locked' : 'active')}>{node.restrict === 1 ? 'Restricted' : 'Managed'}</span></td>
                            <td className="text-end">{node.urlMainIdn || '-'}</td>
                            <td className="text-end" onClick={(event) => event.stopPropagation()}>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  const rect = event.currentTarget.getBoundingClientRect();
                                  const menuWidth = 220;
                                  const menuHeight = 170;
                                  const x = Math.min(Math.max(12, rect.right - menuWidth), window.innerWidth - menuWidth - 12);
                                  const y = Math.min(Math.max(12, rect.bottom + 8), window.innerHeight - menuHeight - 12);
                                  setActionMenuId((value) => value?.node.id === node.id ? null : { node, x, y });
                                }}
                                className="mini-btn icon-only"
                                aria-label="Open URL actions"
                              >
                                <MoreVertical size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {pagedUrlRows.length === 0 && (
                          <tr><td colSpan={5}><div className="settings-helper-card text-center py-4">No URL rule found.</div></td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <CompactPagination currentPage={urlPage} totalPages={urlTotalPages} onPageChange={setUrlPage} label="URL list pagination" />
                </>
              )}
            </div>
          </div>
        </section>
      </div>

      {actionMenuId && (
        <div className="user-modal-backdrop open" onClick={() => setActionMenuId(null)} style={{ background: 'transparent', backdropFilter: 'none', pointerEvents: 'auto' }}>
          <div
            className="settings-confirm-modal"
            style={{ position: 'fixed', left: actionMenuId.x, top: actionMenuId.y, width: 230, padding: '0.75rem' }}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="mb-2">URL Actions</h3>
            <div className="d-grid gap-2">
              <button type="button" className="soft-btn justify-content-start" onClick={() => { openResultsLog(actionMenuId.node); setActionMenuId(null); }}>View Results</button>
              {actionMenuId.node.restrict === 1 ? (
                <button type="button" className="soft-btn justify-content-start" onClick={() => { setPendingUrlAction({ action: 'manage', node: actionMenuId.node }); setActionMenuId(null); }}>Set as Managed</button>
              ) : (
                <button type="button" className="danger-btn justify-content-start" onClick={() => { setPendingUrlAction({ action: 'restrict', node: actionMenuId.node }); setActionMenuId(null); }}>Set as Restricted</button>
              )}
              <button type="button" className="danger-btn justify-content-start" onClick={() => { setPendingUrlAction({ action: 'remove', node: actionMenuId.node }); setActionMenuId(null); }}>Remove</button>
            </div>
          </div>
        </div>
      )}

      {scopeMenu && (
        <div className="user-modal-backdrop open" onClick={() => setScopeMenu(null)} style={{ background: 'transparent', backdropFilter: 'none', pointerEvents: 'auto' }}>
          <div
            className="settings-confirm-modal"
            style={{ position: 'fixed', left: Math.min(Math.max(12, scopeMenu.x), window.innerWidth - 270), top: Math.min(Math.max(12, scopeMenu.y), window.innerHeight - 230), width: 250, padding: '0.75rem' }}
            onClick={(event) => event.stopPropagation()}
          >
            <h3>{scopeMenu.node.label}</h3>
            <p>{getScopeTypeLabel(scopeMenu.node)}</p>
            <div className="d-grid gap-2 mt-3">
              <button type="button" className="primary-btn justify-content-start" onClick={() => { setPendingMeteringAction({ action: 'start', node: scopeMenu.node }); setScopeMenu(null); }} disabled={isScopeRunning(scopeMenu.node)}>Start Metering</button>
              <button type="button" className="soft-btn justify-content-start" onClick={() => { setPendingMeteringAction({ action: 'collect', node: scopeMenu.node }); setScopeMenu(null); }}>Collect Result</button>
              <button type="button" className="danger-btn justify-content-start" onClick={() => { setPendingMeteringAction({ action: 'stop', node: scopeMenu.node }); setScopeMenu(null); }} disabled={!isScopeRunning(scopeMenu.node)}>Stop Metering</button>
            </div>
          </div>
        </div>
      )}

      {pendingMeteringAction && (
        <div className="settings-confirm-backdrop">
          <div className="settings-confirm-modal">
            <h3>Confirm metering action</h3>
            <p>
              {pendingMeteringAction.action === 'start' ? 'Start metering for' : pendingMeteringAction.action === 'stop' ? 'Stop metering for' : 'Collect result for'} <strong>{pendingMeteringAction.node.label}</strong>
            </p>
            <p>{getScopeTypeLabel(pendingMeteringAction.node)}</p>
            <div className="settings-confirm-actions">
              <button type="button" onClick={() => setPendingMeteringAction(null)} disabled={meteringBusy} className="soft-btn">Cancel</button>
              <button type="button" onClick={confirmMeteringAction} disabled={meteringBusy} className={clsx(pendingMeteringAction.action === 'stop' ? 'danger-btn' : 'primary-btn')}>
                {meteringBusy && <Loader2 size={14} className="animate-spin" />} Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingUrlAction && (
        <div className="settings-confirm-backdrop">
          <div className="settings-confirm-modal">
            <h3>Confirm URL action</h3>
            <p>{pendingUrlAction.node.url}</p>
            <div className="settings-confirm-actions">
              <button type="button" onClick={() => setPendingUrlAction(null)} className="soft-btn">Cancel</button>
              <button type="button" onClick={applyUrlAction} className={clsx(pendingUrlAction.action === 'remove' || pendingUrlAction.action === 'restrict' ? 'danger-btn' : 'primary-btn')}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {detailRow && <DetailModal row={detailRow} onClose={() => setDetailRow(null)} />}
      </main>
    </>
  );
}
