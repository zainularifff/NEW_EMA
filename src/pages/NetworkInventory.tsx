import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, FormEvent, MouseEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Database,
  Edit3,
  Eye,
  Folder,
  FolderOpen,
  Loader2,
  Monitor,
  Network,
  Play,
  Plus,
  RefreshCw,
  Router,
  Search,
  ShieldCheck,
  Trash2,
  X,
  Zap,
} from "lucide-react";

import networkService from "../services/networkService";

type CountKey = "registered" | "notRegistered" | "notInstalled" | "otherDevice";
type DeviceStatusTab = "device" | "network";
type NetworkTreeMode = "organization" | "statistics";
type ManualDeviceStatus = "Active" | "Inactive" | "Maintenance";
type ScanMode = "all" | "subnet" | "ip";
type CommandType = "push" | "schedule";

type NetworkCounts = Record<CountKey, number>;

type DeviceDetail = {
  id?: number | string;
  username?: string;
  department?: string;
  ipAddress?: string;
  email?: string;
  phoneNumber?: string;
  lastConnection?: string;
  macAddress?: string;
  computerName?: string;
  workgroup?: string;
  power?: string;
  clientAgent?: string;
  snmp?: string;
  createdTime?: string;
  recentSearchTime?: string;
  responseTime?: string;
  raw?: Record<string, unknown>;
};

type NetworkHierarchyNode = {
  id: string;
  label: string;
  type?: "folder" | "ip" | string;
  counts?: Partial<NetworkCounts>;
  deviceDetails?: Partial<Record<CountKey, DeviceDetail[]>>;
  details?: Array<{ label: string; value: string }>;
  children?: NetworkHierarchyNode[];
};

type ManualNetworkDevice = {
  id: number | string;
  deviceName: string;
  deviceBrand: string;
  deviceStatus: ManualDeviceStatus;
  deviceVersion: string;
  location: string;
  purpose: string;
  patchDate: string;
  remarks: string;
};

type WorkgroupStat = {
  name: string;
  total: number;
  registered: number;
  notRegistered: number;
  notInstalled: number;
  otherDevice: number;
};

type StatusDetailState = {
  type: CountKey;
  title: string;
  rows: DeviceDetail[];
  allRows?: DeviceDetail[];
  page: number;
  totalPages: number;
  totalRecords: number;
  source: string;
  loading: boolean;
  serverPaginated?: boolean;
} | null;

type RecordDetailState = {
  title: string;
  rows: Array<[string, string]>;
  source: string;
} | null;

type IpDetailState = {
  ip: string;
  loading: boolean;
  rows: Array<[string, string]>;
  source: string;
} | null;

type ScanDialogState = {
  mode: ScanMode;
  node?: NetworkHierarchyNode | null;
  ipAddress?: string;
} | null;

type AddFolderDialogState = {
  parentId: string;
  parentLabel: string;
} | null;

const emptyCounts: NetworkCounts = {
  registered: 0,
  notRegistered: 0,
  notInstalled: 0,
  otherDevice: 0,
};

const pageSize = 8;
const statusDetailPageSize = 10;

function cx(...items: Array<string | false | null | undefined>) {
  return items.filter(Boolean).join(" ");
}


type NetworkSelectOption = {
  value: string;
  label: string;
};

function NetworkCustomSelect({
  value,
  options,
  onChange,
  ariaLabel,
  className,
  style,
}: {
  value: string;
  options: NetworkSelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
  style?: CSSProperties;
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const selected = options.find((option) => option.value === value) || options[0];

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 16;
    const gap = 8;
    const width = Math.max(rect.width, 220);
    const estimatedHeight = Math.min(292, Math.max(48, options.length * 38 + 10));
    const availableBelow = window.innerHeight - rect.bottom - viewportPadding;
    const availableAbove = rect.top - viewportPadding;
    const openAbove = availableBelow < estimatedHeight && availableAbove > availableBelow;
    const maxHeight = Math.max(96, Math.min(estimatedHeight, openAbove ? availableAbove : availableBelow));
    const left = Math.min(Math.max(viewportPadding, rect.left), window.innerWidth - width - viewportPadding);
    const top = openAbove
      ? Math.max(viewportPadding, rect.top - maxHeight - gap)
      : Math.min(rect.bottom + gap, window.innerHeight - maxHeight - viewportPadding);

    setMenuStyle({
      position: "fixed",
      left,
      top,
      width,
      maxHeight,
      zIndex: 2147483600,
    });
  }, [options.length]);

  useEffect(() => {
    if (!open) return undefined;

    updateMenuPosition();

    const handleMouseDown = (event: MouseEvent | globalThis.MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleMouseDown as EventListener);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown as EventListener);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, updateMenuPosition]);

  const menuNode = open && typeof document !== "undefined" ? createPortal(
    <div
      ref={menuRef}
      className="uam-filter-menu uam-filter-menu-portal setting-select-menu"
      style={menuStyle}
      role="listbox"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            className={cx("uam-filter-option", isSelected && "selected")}
            role="option"
            aria-selected={isSelected}
            onClick={() => {
              onChange(option.value);
              setOpen(false);
            }}
          >
            <span>{option.label}</span>
            {isSelected && <span className="uam-filter-check">✓</span>}
          </button>
        );
      })}
    </div>,
    document.body,
  ) : null;

  return (
    <div className={cx("uam-filter-dropdown setting-select-dropdown", open && "open", className)} style={style}>
      <button
        ref={triggerRef}
        type="button"
        className="uam-filter-trigger setting-select-trigger"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selected?.label || "Select"}</span>
        <ChevronDown size={15} />
      </button>
      {menuNode}
    </div>
  );
}

function getString(value: unknown, fallback = "-") {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function pick(row: Record<string, unknown> | undefined, keys: string[], fallback = "-") {
  if (!row) return fallback;

  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return String(value);
  }

  const existingKeys = Object.keys(row);
  for (const wantedKey of keys) {
    const found = existingKeys.find((key) => key.toLowerCase() === wantedKey.toLowerCase());
    if (found) {
      const value = row[found];
      if (value !== undefined && value !== null && String(value).trim() !== "") return String(value);
    }
  }

  return fallback;
}

function normalizeCounts(counts?: Partial<NetworkCounts>): NetworkCounts {
  return {
    registered: Number(counts?.registered || 0),
    notRegistered: Number(counts?.notRegistered || 0),
    notInstalled: Number(counts?.notInstalled || 0),
    otherDevice: Number(counts?.otherDevice || 0),
  };
}

function countTotal(counts: Partial<NetworkCounts> | undefined) {
  const safe = normalizeCounts(counts);
  return safe.registered + safe.notRegistered + safe.notInstalled + safe.otherDevice;
}

function normalizeManualStatus(value: unknown): ManualDeviceStatus {
  const text = getString(value, "Active").toLowerCase();
  if (text.includes("inactive") || text.includes("offline")) return "Inactive";
  if (text.includes("maintenance") || text.includes("review")) return "Maintenance";
  return "Active";
}

function normalizeManualDevice(row: Record<string, unknown>, index = 0): ManualNetworkDevice {
  return {
    id: row.id !== undefined ? (row.id as number | string) : row.ID !== undefined ? (row.ID as number | string) : index + 1,
    deviceName: pick(row, ["deviceName", "DeviceName", "name", "Device Name"], "-"),
    deviceBrand: pick(row, ["deviceBrand", "brand", "DeviceBrand", "Device Brand"], "-"),
    deviceStatus: normalizeManualStatus(pick(row, ["deviceStatus", "status", "DeviceStatus", "Device Status"], "Active")),
    deviceVersion: pick(row, ["deviceVersion", "version", "DeviceVersion", "Version"], "-"),
    location: pick(row, ["location", "Location", "workgroup", "Workgroup"], "-"),
    purpose: pick(row, ["purpose", "Purpose", "type", "DeviceType"], "-"),
    patchDate: pick(row, ["patchDate", "PatchDate", "Patch Date", "updatedAt"], "-"),
    remarks: pick(row, ["remarks", "Remarks", "description", "Description"], "-"),
  };
}

function isIpAddress(value?: string) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(String(value || "").trim());
}

function isIpSegment(value?: string) {
  const text = String(value || "").trim();
  return /^\d{1,3}(\.\d{1,3}){0,3}$/.test(text);
}

function displayCountTitle(type: CountKey) {
  const labels: Record<CountKey, string> = {
    registered: "Registered Agent",
    notRegistered: "Not Registered",
    notInstalled: "Not Installed",
    otherDevice: "Other Device",
  };
  return labels[type];
}

function statusTone(status: ManualDeviceStatus) {
  if (status === "Active") return "active";
  if (status === "Maintenance") return "maintenance";
  return "inactive";
}

function findNode(node: NetworkHierarchyNode | null, id: string | null): NetworkHierarchyNode | null {
  if (!node || !id) return null;
  if (node.id === id) return node;
  for (const child of node.children || []) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

function createLocalFolderNode(label: string): NetworkHierarchyNode {
  return {
    id: `local-folder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label,
    type: "folder",
    counts: { ...emptyCounts },
    deviceDetails: {
      registered: [],
      notRegistered: [],
      notInstalled: [],
      otherDevice: [],
    },
    children: [],
  };
}

function insertFolderNode(root: NetworkHierarchyNode, parentId: string, folder: NetworkHierarchyNode): NetworkHierarchyNode {
  if (root.id === parentId) {
    return {
      ...root,
      children: [...(root.children || []), folder],
    };
  }

  return {
    ...root,
    children: (root.children || []).map((child) => insertFolderNode(child, parentId, folder)),
  };
}

function filterHierarchy(node: NetworkHierarchyNode, keyword: string): NetworkHierarchyNode | null {
  const text = keyword.trim().toLowerCase();
  if (!text) return node;

  const childMatches = (node.children || [])
    .map((child) => filterHierarchy(child, text))
    .filter(Boolean) as NetworkHierarchyNode[];

  const ownMatch = node.label.toLowerCase().includes(text);
  if (!ownMatch && childMatches.length === 0) return null;

  return { ...node, children: childMatches };
}

function countIpSegments(node: NetworkHierarchyNode | null, depth = 0) {
  if (!node) return 0;
  let total = depth > 0 && isIpSegment(node.label) && !isIpAddress(node.label) ? 1 : 0;
  for (const child of node.children || []) total += countIpSegments(child, depth + 1);
  return total;
}

function flattenDeviceDetails(root: NetworkHierarchyNode | null) {
  const details: DeviceDetail[] = [];
  if (!root?.deviceDetails) return details;
  (Object.keys(emptyCounts) as CountKey[]).forEach((key) => {
    details.push(...(root.deviceDetails?.[key] || []));
  });
  return details;
}

function deriveWorkgroupStats(root: NetworkHierarchyNode | null, apiRows: Record<string, unknown>[]) {
  const fromDetails = new Map<string, WorkgroupStat>();
  const ensure = (name: string) => {
    const safeName = name && name !== "-" ? name : "Unknown";
    if (!fromDetails.has(safeName)) {
      fromDetails.set(safeName, {
        name: safeName,
        total: 0,
        registered: 0,
        notRegistered: 0,
        notInstalled: 0,
        otherDevice: 0,
      });
    }
    return fromDetails.get(safeName)!;
  };

  if (root?.deviceDetails) {
    (Object.keys(emptyCounts) as CountKey[]).forEach((type) => {
      (root.deviceDetails?.[type] || []).forEach((detail) => {
        const stat = ensure(getString(detail.workgroup || detail.department, "Unknown"));
        stat.total += 1;
        stat[type] += 1;
      });
    });
  }

  apiRows.forEach((row, index) => {
    const name = pick(row, ["WorkGroup", "Workgroup", "Work Group", "Name", "Department"], `Workgroup ${index + 1}`);
    const stat = ensure(name);
    const apiTotal = Number(pick(row, ["Total", "Count", "Cnt", "DeviceCount"], "0"));
    if (apiTotal > stat.total) stat.total = apiTotal;
  });

  return Array.from(fromDetails.values()).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

function collectIpTargets(node?: NetworkHierarchyNode | null): string[] {
  if (!node) return [];
  const ips: string[] = [];

  if (isIpAddress(node.label)) ips.push(node.label);

  (Object.keys(emptyCounts) as CountKey[]).forEach((key) => {
    (node.deviceDetails?.[key] || []).forEach((detail) => {
      if (detail.ipAddress && isIpAddress(detail.ipAddress)) ips.push(detail.ipAddress);
    });
  });

  for (const child of node.children || []) ips.push(...collectIpTargets(child));
  return Array.from(new Set(ips));
}

function rowsFromObject(row: Record<string, unknown> | undefined) {
  if (!row) return [];
  return Object.entries(row).map(([key, value]) => [key, getString(value, "-")] as [string, string]);
}

function getNodeDetailFallback(node: NetworkHierarchyNode | null, label: string) {
  return node?.details?.find((item) => item.label.toLowerCase() === label.toLowerCase())?.value || "-";
}

function buildIpDetailRows(
  ip: string,
  node: NetworkHierarchyNode | null,
  agentRow?: Record<string, unknown>,
  objectRow?: Record<string, unknown>
): Array<[string, string]> {
  const merged = { ...(objectRow || {}), ...(agentRow || {}) };
  return [
    ["Department", pick(merged, ["Department", "Object_Full_Name", "ObjectFullName"], getNodeDetailFallback(node, "Department"))],
    ["Computer Name", pick(merged, ["ComputerName", "Computer Name", "DeviceName", "HostName"], getNodeDetailFallback(node, "Computer Name"))],
    ["Workgroup", pick(merged, ["Workgroup", "WorkGroup", "Work Group"], getNodeDetailFallback(node, "Workgroup"))],
    ["IP Address", ip],
    ["MAC Address", pick(merged, ["MACAddress", "MacAddress", "MAC", "MAC Address"], getNodeDetailFallback(node, "MAC Address"))],
    ["Power", pick(merged, ["Power", "PowerStatus"], getNodeDetailFallback(node, "Power"))],
    ["nPoints Client Agent", pick(merged, ["ClientAgent", "nPoints Client Agent", "Agent", "AgentStatus"], getNodeDetailFallback(node, "nPoints Client Agent"))],
    ["SNMP", pick(merged, ["SNMP", "SNMPStatus"], getNodeDetailFallback(node, "SNMP"))],
    ["Recent Search Time", pick(merged, ["RecentSearchTime", "Recent Search Time", "SearchDate", "Search Date"], getNodeDetailFallback(node, "Recent Search Time"))],
    ["Created Time", pick(merged, ["CreatedTime", "Created Time", "CreationDate"], getNodeDetailFallback(node, "Created Time"))],
    ["Response Time", pick(merged, ["ResponseTime", "Response Time"], getNodeDetailFallback(node, "Response Time"))],
  ];
}

function normalizeStatusRows(data: unknown): DeviceDetail[] {
  if (!Array.isArray(data)) return [];
  return data.map((item, index) => {
    const row = (item || {}) as Record<string, unknown>;
    return {
      id: row.id !== undefined ? (row.id as string | number) : index + 1,
      username: pick(row, ["username", "UserName", "Username", "User", "ComputerName", "DeviceName"], "-"),
      department: pick(row, ["department", "Department", "Object_Full_Name", "ObjectFullName"], "-"),
      ipAddress: pick(row, ["ipAddress", "IPAddress", "IP_Address", "IP", "ClientIP"], "-"),
      email: pick(row, ["email", "Email", "EmailAddress"], "-"),
      phoneNumber: pick(row, ["phoneNumber", "Phone", "PhoneNo", "PhoneNumber"], "-"),
      lastConnection: pick(row, ["lastConnection", "LastConnection", "ConnectionTime", "Last Connection"], "-"),
      macAddress: pick(row, ["macAddress", "MACAddress", "MacAddress", "MAC"], "-"),
      computerName: pick(row, ["computerName", "ComputerName", "Computer Name", "DeviceName", "HostName"], "-"),
      workgroup: pick(row, ["workgroup", "Workgroup", "WorkGroup", "Work Group"], "-"),
      power: pick(row, ["power", "Power", "PowerStatus"], "-"),
      clientAgent: pick(row, ["clientAgent", "ClientAgent", "nPoints Client Agent", "Agent", "AgentStatus"], "-"),
      snmp: pick(row, ["snmp", "SNMP", "SNMPStatus"], "-"),
      createdTime: pick(row, ["createdTime", "CreatedTime", "Created Time", "CreationDate"], "-"),
      recentSearchTime: pick(row, ["recentSearchTime", "RecentSearchTime", "Recent Search Time", "SearchDate", "Search Date"], "-"),
      responseTime: pick(row, ["responseTime", "ResponseTime", "Response Time"], "-"),
      raw: row.raw && typeof row.raw === "object" ? (row.raw as Record<string, unknown>) : row,
    };
  });
}

function formatScheduleTime(value: string) {
  if (!value) return "";
  const normalized = value.replace("T", " ");
  return normalized.length === 16 ? `${normalized}:00` : normalized;
}

export default function NetworkInventory() {
  const [activeTab, setActiveTab] = useState<DeviceStatusTab>("device");
  const [treeMode, setTreeMode] = useState<NetworkTreeMode>("organization");
  const [hierarchy, setHierarchy] = useState<NetworkHierarchyNode | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [treeSearch, setTreeSearch] = useState("");
  const [expandedTreeIds, setExpandedTreeIds] = useState<Set<string>>(() => new Set());
  const [lastSearchDate, setLastSearchDate] = useState("-");
  const [workgroupApiRows, setWorkgroupApiRows] = useState<Record<string, unknown>[]>([]);
  const [selectedWorkgroup, setSelectedWorkgroup] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [manualRows, setManualRows] = useState<ManualNetworkDevice[]>([]);
  const [manualSearch, setManualSearch] = useState("");
  const [manualStatusFilter, setManualStatusFilter] = useState<"All" | ManualDeviceStatus>("All");
  const [manualPage, setManualPage] = useState(1);
  const [manualLoading, setManualLoading] = useState(false);
  const [editingDevice, setEditingDevice] = useState<ManualNetworkDevice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManualNetworkDevice | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [statusDetail, setStatusDetail] = useState<StatusDetailState>(null);
  const [recordDetail, setRecordDetail] = useState<RecordDetailState>(null);
  const [ipDetail, setIpDetail] = useState<IpDetailState>(null);
  const [scanDialog, setScanDialog] = useState<ScanDialogState>(null);
  const [addFolderDialog, setAddFolderDialog] = useState<AddFolderDialogState>(null);
  const [busy, setBusy] = useState(false);

  const selectedNode = useMemo(() => findNode(hierarchy, selectedNodeId) || hierarchy, [hierarchy, selectedNodeId]);
  const selectedCounts = useMemo(() => normalizeCounts(selectedNode?.counts), [selectedNode]);
  const rootCounts = useMemo(() => normalizeCounts(hierarchy?.counts), [hierarchy]);
  const totalNetworkRecords = countTotal(rootCounts);
  const subnetCount = useMemo(() => countIpSegments(hierarchy), [hierarchy]);
  const filteredHierarchy = useMemo(() => (hierarchy ? filterHierarchy(hierarchy, treeSearch) : null), [hierarchy, treeSearch]);
  const workgroupStats = useMemo(() => deriveWorkgroupStats(hierarchy, workgroupApiRows), [hierarchy, workgroupApiRows]);
  const selectedIps = useMemo(() => collectIpTargets(selectedNode), [selectedNode]);

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 4200);
  }, []);

  const loadManualDevices = useCallback(async () => {
    setManualLoading(true);
    try {
      const response = await networkService.getNetworkDeviceStatus({ page: 1, limit: 500, search: manualSearch });
      const payload = response as { data?: Record<string, unknown>[] };
      const rows = Array.isArray(payload.data) ? payload.data : Array.isArray(response) ? response : [];
      setManualRows(rows.map(normalizeManualDevice));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load network device status.");
    } finally {
      setManualLoading(false);
    }
  }, [manualSearch]);

  const loadInventory = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [hierarchyResult, dateResult, workgroupResult] = await Promise.allSettled([
        networkService.getHierarchy(),
        networkService.getSearchDate(),
        networkService.getWorkgroupCount(),
      ]);

      if (hierarchyResult.status === "fulfilled" && hierarchyResult.value) {
        const nextHierarchy = hierarchyResult.value as NetworkHierarchyNode;
        setHierarchy(nextHierarchy);
        setSelectedNodeId(nextHierarchy.id || null);
        setExpandedTreeIds(new Set<string>());
        setTreeSearch("");
      } else if (hierarchyResult.status === "rejected") {
        throw hierarchyResult.reason;
      }

      if (dateResult.status === "fulfilled") {
        const datePayload = dateResult.value as { data?: { LastSearchDateStr?: string }; LastSearchDateStr?: string };
        setLastSearchDate(getString(datePayload.data?.LastSearchDateStr ?? datePayload.LastSearchDateStr, "-"));
      }

      if (workgroupResult.status === "fulfilled") {
        setWorkgroupApiRows(Array.isArray(workgroupResult.value) ? workgroupResult.value : []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load network inventory.");
      setHierarchy(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadInventory(false);
    void loadManualDevices();
  }, [loadInventory, loadManualDevices]);

  useEffect(() => {
    setManualPage(1);
  }, [manualSearch, manualStatusFilter]);

  const loadIpDetail = useCallback(async (node: NetworkHierarchyNode) => {
    const ip = node.label;
    if (!isIpAddress(ip)) {
      setIpDetail(null);
      return;
    }

    setIpDetail({ ip, loading: true, rows: buildIpDetailRows(ip, node), source: "local hierarchy" });

    try {
      const [agentResponse, objectResponse] = await Promise.allSettled([
        networkService.getIpAgent(ip),
        networkService.getIpObject(ip),
      ]);

      const agentRow = agentResponse.status === "fulfilled" && Array.isArray(agentResponse.value) ? agentResponse.value[0] : undefined;
      const objectRow = objectResponse.status === "fulfilled" && Array.isArray(objectResponse.value) ? objectResponse.value[0] : undefined;

      setIpDetail({
        ip,
        loading: false,
        rows: buildIpDetailRows(ip, node, agentRow, objectRow),
        source: agentRow || objectRow ? "spGetSubnetAgent / spGetSubnetObject" : "local hierarchy",
      });
    } catch {
      setIpDetail({ ip, loading: false, rows: buildIpDetailRows(ip, node), source: "local hierarchy" });
    }
  }, []);

  const handleSelectNode = (node: NetworkHierarchyNode) => {
    setSelectedNodeId(node.id);
    setStatusDetail(null);
    setSelectedWorkgroup("");
    if (isIpAddress(node.label)) void loadIpDetail(node);
    else setIpDetail(null);
  };

  const handleToggleTreeNode = (node: NetworkHierarchyNode) => {
    if (!node.children?.length) return;
    setExpandedTreeIds((current) => {
      const next = new Set(current);
      if (next.has(node.id)) next.delete(node.id);
      else next.add(node.id);
      return next;
    });
    handleSelectNode(node);
  };


  const openAddFolderDialog = () => {
    if (!hierarchy) return;
    const target = selectedNode && !isIpAddress(selectedNode.label) ? selectedNode : hierarchy;
    setAddFolderDialog({ parentId: target.id, parentLabel: target.label });
  };

  const handleAddFolder = (folderName: string) => {
    const cleanName = folderName.trim();
    if (!cleanName) {
      setError("Folder name is required.");
      return;
    }
    if (!hierarchy || !addFolderDialog) return;

    const folder = createLocalFolderNode(cleanName);
    setHierarchy((current) => current ? insertFolderNode(current, addFolderDialog.parentId, folder) : current);
    setExpandedTreeIds((current) => {
      const next = new Set(current);
      next.add(addFolderDialog.parentId);
      return next;
    });
    setSelectedNodeId(folder.id);
    setAddFolderDialog(null);
    showNotice(`Folder "${cleanName}" added under ${addFolderDialog.parentLabel}.`);
  };

  const handleSelectWorkgroup = (name: string) => {
    setSelectedWorkgroup(name);
    setTreeMode("statistics");
    setStatusDetail(null);
    setIpDetail(null);
  };

  const openStatusDetails = async (type: CountKey, nextPage = 1) => {
    const title = `${displayCountTitle(type)}${selectedNode?.label ? ` • ${selectedNode.label}` : ""}`;
    setStatusDetail({ type, title, rows: [], page: nextPage, totalPages: 1, totalRecords: 0, source: "loading", loading: true });
    setIpDetail(null);

    const canCallSubnetApi = selectedNode?.label && isIpSegment(selectedNode.label) && selectedNode.label.toLowerCase() !== "organization";

    try {
      if (canCallSubnetApi) {
        const response = await networkService.getSubnetDetails(selectedNode.label, { type, page: nextPage, limit: statusDetailPageSize });
        const payload = response as { data?: DeviceDetail[]; page?: number; totalPages?: number; totalRecords?: number };
        setStatusDetail({
          type,
          title,
          rows: normalizeStatusRows(payload.data),
          page: Number(payload.page || nextPage),
          totalPages: Number(payload.totalPages || 1),
          totalRecords: Number(payload.totalRecords || 0),
          source: "Subnet detail",
          loading: false,
          serverPaginated: true,
        });
        return;
      }

      const localRows = normalizeStatusRows(selectedNode?.deviceDetails?.[type] || []);
      setStatusDetail({
        type,
        title,
        rows: localRows,
        allRows: localRows,
        page: nextPage,
        totalPages: Math.max(1, Math.ceil(localRows.length / statusDetailPageSize)),
        totalRecords: localRows.length,
        source: "hierarchy detail cache",
        loading: false,
        serverPaginated: false,
      });
    } catch (err) {
      setStatusDetail({ type, title, rows: [], page: nextPage, totalPages: 1, totalRecords: 0, source: "error", loading: false });
      setError(err instanceof Error ? err.message : "Failed to load subnet detail.");
    }
  };

  const openBackendRecord = async (detail: DeviceDetail) => {
    const raw = detail.raw || {};
    const clientId = Number(pick(raw, ["Object_Root_Idn", "ObjectRootIdn", "ClientID", "clientID"], "0"));
    const inventoryId = Number(pick(raw, ["InventoryID", "Inventory_Idn", "Object_Inventory_Idn", "id", "ID"], "0"));

    setBusy(true);
    try {
      if (clientId > 0) {
        const response = await networkService.getClient(clientId);
        const row = Array.isArray(response) ? response[0] : undefined;
        setRecordDetail({ title: `Registered Network Client • ${clientId}`, rows: rowsFromObject(row), source: "spGetNIClient" });
      } else if (inventoryId > 0) {
        const response = await networkService.getObject(inventoryId);
        const row = Array.isArray(response) ? response[0] : undefined;
        setRecordDetail({ title: `Network Object • ${inventoryId}`, rows: rowsFromObject(row), source: "spGetNIObject" });
      } else {
        setRecordDetail({ title: detail.computerName || detail.ipAddress || "Network Record", rows: rowsFromObject(raw), source: "current row" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open backend detail.");
    } finally {
      setBusy(false);
    }
  };

  const manualFilteredRows = useMemo(() => {
    const keyword = manualSearch.trim().toLowerCase();
    return manualRows.filter((row) => {
      const matchesStatus = manualStatusFilter === "All" || row.deviceStatus === manualStatusFilter;
      const searchable = Object.values(row).join(" ").toLowerCase();
      const matchesKeyword = !keyword || searchable.includes(keyword);
      return matchesStatus && matchesKeyword;
    });
  }, [manualRows, manualSearch, manualStatusFilter]);

  const manualTotalPages = Math.max(1, Math.ceil(manualFilteredRows.length / pageSize));
  const manualPageRows = manualFilteredRows.slice((manualPage - 1) * pageSize, manualPage * pageSize);

  const resetAll = () => {
    setTreeMode("organization");
    setManualSearch("");
    setManualStatusFilter("All");
    setTreeSearch("");
    setExpandedTreeIds(new Set<string>());
    setStatusDetail(null);
    setIpDetail(null);
    setSelectedWorkgroup("");
    if (hierarchy) setSelectedNodeId(hierarchy.id);
  };

  const handleSaveDevice = async (payload: Omit<ManualNetworkDevice, "id">) => {
    setBusy(true);
    try {
      if (editingDevice) {
        await networkService.updateNetworkDeviceStatus(editingDevice.id, payload);
        showNotice("Network device updated.");
      } else {
        await networkService.createNetworkDeviceStatus(payload);
        showNotice("Network device added.");
      }

      setIsFormOpen(false);
      setEditingDevice(null);
      await loadManualDevices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save network device.");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteDevice = async (device: ManualNetworkDevice) => {
    setBusy(true);
    try {
      await networkService.deleteNetworkDeviceStatus(device.id);
      showNotice("Network device removed.");
      setDeleteTarget(null);
      await loadManualDevices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove network device.");
    } finally {
      setBusy(false);
    }
  };

  const openAddDevice = () => {
    setEditingDevice(null);
    setIsFormOpen(true);
    setActiveTab("network");
  };

  const openEditDevice = (device: ManualNetworkDevice) => {
    setEditingDevice(device);
    setIsFormOpen(true);
    setActiveTab("network");
  };

  const openScanDialog = (mode: ScanMode, node: NetworkHierarchyNode | null = selectedNode) => {
    const ipAddress = mode === "ip" && node?.label && isIpAddress(node.label) ? node.label : undefined;
    setScanDialog({ mode, node, ipAddress });
  };

  const submitScan = async (commandType: CommandType, scheduleTime: string, description: string) => {
    if (!scanDialog) return;

    const mode = scanDialog.mode;
    const node = scanDialog.node;
    const ips = mode === "all" ? [] : collectIpTargets(node);
    const ipAddress = mode === "ip" ? scanDialog.ipAddress || node?.label || ips[0] || "" : "";
    const subnet = mode === "subnet" ? node?.label || "" : "";

    const body = {
      scanMode: mode,
      subnet,
      ipAddress,
      ips: mode === "ip" && ipAddress ? [ipAddress] : ips,
      commandType,
      scheduleTime: commandType === "schedule" ? formatScheduleTime(scheduleTime) : "",
      description: description || `[Network Inventory] Scan - ${mode === "all" ? "All Network IPs" : mode === "subnet" ? subnet || "Selected subnet" : ipAddress}`,
    };

    setBusy(true);
    try {
      const response = await networkService.createNetworkScanJob(body);
      setScanDialog(null);
      showNotice(`Scan job created${response?.Job_Idn ? `: #${response.Job_Idn}` : ""}. Target count: ${response?.targetCount ?? body.ips.length}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create scan job.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="settings-module-root ema-settings-pro ema-module-root container-fluid p-3 p-xl-4" data-section="users">
      {notice && (
        <div className="settings-toast-layer">
          <div className="settings-toast settings-toast-success" role="status" aria-live="polite">
            <span className="settings-toast-icon"><CheckCircle2 size={18} /></span>
            <div>
              <strong>Success</strong>
              <span>{notice}</span>
            </div>
            <button type="button" className="settings-toast-close" onClick={() => setNotice(null)} aria-label="Close notification">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="settings-toast-layer">
          <div className="settings-toast settings-toast-error" role="alert">
            <span className="settings-toast-icon"><AlertCircle size={18} /></span>
            <div>
              <strong>Error</strong>
              <span>{error}</span>
            </div>
            <button type="button" className="settings-toast-close" onClick={() => setError(null)} aria-label="Close error">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="settings-layout d-grid gap-3">
        <aside className="settings-menu ema-panel-surface">
          <div className="panel-head">
            <span>Network Metering</span>
            <strong>Network Control</strong>
            <small>IP/subnet hierarchy and synchronized device records.</small>
          </div>

          <nav className="settings-menu-list ema-module-sidebar-nav ema-module-sidebar-switcher">
            <button
              type="button"
              className={cx("setting-btn", treeMode === "organization" && "active")}
              onClick={() => {
                setTreeMode("organization");
                setTreeSearch("");
                setExpandedTreeIds(new Set<string>());
              }}
            >
              <span className="setting-icon"><Network /></span>
              <span>
                <strong>Organization</strong>
                <small>IP scope</small>
              </span>
            </button>
            <button type="button" className={cx("setting-btn", treeMode === "statistics" && "active")} onClick={() => setTreeMode("statistics")}>
              <span className="setting-icon"><ShieldCheck /></span>
              <span>
                <strong>Statistics</strong>
                <small>Workgroup</small>
              </span>
            </button>
          </nav>

          <div className="p-3 pb-2">
            <label className="section-search">
              <Search size={15} />
              <input
                placeholder={treeMode === "organization" ? "Search IP / subnet..." : "Search workgroup..."}
                value={treeSearch}
                onChange={(event) => setTreeSearch(event.target.value)}
              />
            </label>
          </div>

          <div className="px-3 pb-2">
            <button type="button" className="soft-btn w-100" onClick={openAddFolderDialog} disabled={!hierarchy || treeMode !== "organization" || busy}>
              <Plus size={14} />
              Add Folder
            </button>
          </div>

          <div className="settings-menu-list">
            {loading ? (
              <div className="settings-helper-card"><Loader2 className="me-2" size={14} /> Loading network hierarchy...</div>
            ) : treeMode === "organization" ? (
              filteredHierarchy ? (
                <NetworkTree
                  key={treeSearch.trim() ? `search-${treeSearch.trim()}` : hierarchy?.id || "network-tree"}
                  node={filteredHierarchy}
                  selectedNodeId={selectedNode?.id || null}
                  expandedIds={expandedTreeIds}
                  onToggle={handleToggleTreeNode}
                  onSelect={handleSelectNode}
                  forceOpen={Boolean(treeSearch.trim())}
                />
              ) : (
                <div className="settings-helper-card">No IP segment found.</div>
              )
            ) : (
              <WorkgroupStatisticList
                rows={workgroupStats.filter((row) => row.name.toLowerCase().includes(treeSearch.toLowerCase()))}
                selected={selectedWorkgroup}
                onSelect={handleSelectWorkgroup}
              />
            )}
          </div>

          <div className="settings-helper-card m-3 mt-0">
            <strong>Selected scope</strong>
            <span>{selectedNode?.label || selectedWorkgroup || "Organization"}</span>
            <small>{treeMode === "organization" ? `${selectedIps.length.toLocaleString()} scan target(s)` : "Workgroup statistics"}</small>
          </div>
        </aside>

        <section className="settings-content">
          <section className="settings-hero ema-panel-surface">
            <div>
              <span className="section-tag">Network Operations</span>
              <h2>Network Metering</h2>
              <p>Monitor IP scope status, discover endpoint agents, and maintain network device records.</p>
            </div>

            <div className="settings-score users-hero-score">
              <KpiCard label="Total IPs" value={totalNetworkRecords.toLocaleString()} note="Network records" icon={<Database />} />
              <KpiCard label="Subnets" value={subnetCount.toLocaleString()} note="Network paths" icon={<Network />} />
              <KpiCard label="Registered" value={rootCounts.registered.toLocaleString()} note="Active agents" icon={<CheckCircle2 />} />
              <KpiCard label="Other Devices" value={rootCounts.otherDevice.toLocaleString()} note="SNMP / routers" icon={<Router />} />
            </div>
          </section>

          <main className="content-shell ema-panel-surface content-panel clean">
            <header className="content-head">
              <div>
                <span className="section-tag">{activeTab === "device" ? "Device Status" : "Network Device Status"}</span>
                <h3>{activeTab === "device" ? `Device Status${selectedNode?.label ? `: ${selectedNode.label}` : ""}` : "Network Device Registry"}</h3>
                <p>{activeTab === "device" ? "Registered, not registered, not installed, and other network object counts." : `Showing ${manualFilteredRows.length.toLocaleString()} managed network devices.`}</p>
              </div>

              <div className="content-actions justify-content-center flex-nowrap">
                <button type="button" className={cx("soft-btn", activeTab === "device" && "primary-btn")} onClick={() => setActiveTab("device")}>Device Status</button>
                <button type="button" className={cx("soft-btn", activeTab === "network" && "primary-btn")} onClick={() => setActiveTab("network")}>Network Device Status</button>
              </div>
            </header>

            <div
              className="d-flex align-items-center gap-2 flex-nowrap px-3 py-2"
              style={{ width: "100%", minWidth: 0, overflowX: "auto" }}
            >
              {activeTab === "network" ? (
                <>
                  <label className="section-search flex-grow-1 mb-0" style={{ minWidth: 360 }}>
                    <Search size={15} />
                    <input
                      placeholder="Search device, brand, location..."
                      value={manualSearch}
                      onChange={(event) => setManualSearch(event.target.value)}
                    />
                  </label>

                  <NetworkCustomSelect
                    value={manualStatusFilter}
                    options={[
                      { value: "All", label: "All status" },
                      { value: "Active", label: "Active" },
                      { value: "Inactive", label: "Inactive" },
                      { value: "Maintenance", label: "Maintenance" },
                    ]}
                    ariaLabel="Filter network device status"
                    onChange={(nextValue) => setManualStatusFilter(nextValue as "All" | ManualDeviceStatus)}
                    className="mb-0"
                    style={{ width: 220, flex: "0 0 220px" }}
                  />
                </>
              ) : (
                <div className="d-flex align-items-center flex-grow-1" style={{ minWidth: 260 }}>
                  <strong className="user-pill info">Reference: {lastSearchDate}</strong>
                </div>
              )}

              <button
                type="button"
                className="soft-btn flex-shrink-0"
                onClick={() => activeTab === "device" ? void loadInventory(true) : void loadManualDevices()}
                disabled={refreshing || manualLoading || busy}
              >
                {(refreshing || manualLoading) ? <Loader2 size={15} className="me-1" /> : <RefreshCw size={15} />}
                Refresh
              </button>

              {activeTab === "device" ? (
                <button
                  type="button"
                  className="primary-btn flex-shrink-0"
                  onClick={() => openScanDialog(selectedNode?.id === hierarchy?.id ? "all" : isIpAddress(selectedNode?.label) ? "ip" : "subnet", selectedNode)}
                  disabled={!selectedNode || busy}
                >
                  <Zap size={15} />
                  Scan Scope
                </button>
              ) : (
                <button type="button" className="primary-btn flex-shrink-0" onClick={openAddDevice} disabled={busy}>
                  <Plus size={16} />
                  Add New
                </button>
              )}
            </div>

            <div className="content-body">
              {activeTab === "device" ? (
                ipDetail ? (
                  <NetworkPathDetail detail={ipDetail} onScan={() => openScanDialog("ip", selectedNode)} />
                ) : (
                  <DeviceStatusOverview
                    counts={selectedCounts}
                    total={countTotal(selectedCounts)}
                    selectedLabel={selectedNode?.label || "Organization"}
                    targetCount={selectedIps.length}
                    onOpenStatus={(type) => void openStatusDetails(type)}
                  />
                )
              ) : (
                <>
                  <DeviceRegistryTable
                    rows={manualPageRows}
                    page={manualPage}
                    selectedId={editingDevice?.id || null}
                    loading={manualLoading}
                    onEdit={openEditDevice}
                    onDelete={(device) => setDeleteTarget(device)}
                  />

                  <Pagination page={manualPage} totalPages={manualTotalPages} totalRows={manualFilteredRows.length} pageSize={pageSize} itemLabel="devices" onChange={setManualPage} />
                </>
              )}
            </div>
          </main>
        </section>
      </div>

      {(isFormOpen || editingDevice) && (
        <DeviceFormModal
          mode={editingDevice ? "edit" : "add"}
          device={editingDevice}
          busy={busy}
          onClose={() => {
            setIsFormOpen(false);
            setEditingDevice(null);
          }}
          onSave={(payload) => void handleSaveDevice(payload)}
        />
      )}

      {deleteTarget && (
        <DeleteDeviceConfirmModal
          device={deleteTarget}
          busy={busy}
          onCancel={() => {
            if (!busy) setDeleteTarget(null);
          }}
          onConfirm={() => void handleDeleteDevice(deleteTarget)}
        />
      )}

      {addFolderDialog && (
        <AddFolderModal
          parentLabel={addFolderDialog.parentLabel}
          busy={busy}
          onClose={() => setAddFolderDialog(null)}
          onSave={handleAddFolder}
        />
      )}

      {statusDetail && (
        <StatusDetailModal
          detail={statusDetail}
          onClose={() => setStatusDetail(null)}
          onPage={(nextPage) => void openStatusDetails(statusDetail.type, nextPage)}
          onOpenRecord={(row) => void openBackendRecord(row)}
        />
      )}
      {recordDetail && <RecordDetailModal detail={recordDetail} onClose={() => setRecordDetail(null)} />}
      {scanDialog && <ScanJobModal dialog={scanDialog} busy={busy} targetCount={scanDialog.mode === "all" ? totalNetworkRecords : collectIpTargets(scanDialog.node).length} onClose={() => setScanDialog(null)} onSubmit={(commandType, scheduleTime, description) => void submitScan(commandType, scheduleTime, description)} />}
      {busy && (
        <div className="settings-toast-layer">
          <div className="settings-toast settings-toast-info">
            <span className="settings-toast-icon"><Loader2 size={16} /></span>
            <div><strong>Processing</strong><span>Please wait...</span></div>
          </div>
        </div>
      )}
    </main>
  );
}

function DeleteDeviceConfirmModal({
  device,
  busy,
  onCancel,
  onConfirm,
}: {
  device: ManualNetworkDevice;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="settings-confirm-backdrop" onMouseDown={busy ? undefined : onCancel}>
      <section className="settings-confirm-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="delete-device-title">
        <h3 id="delete-device-title">Remove network device?</h3>
        <p>This action will remove the selected device from Network Device Registry.</p>
        <div className="settings-helper-card my-3">
          <strong>{device.deviceName}</strong>
          <span>{device.deviceBrand || "-"} • {device.location || "-"} • {device.deviceStatus || "-"}</span>
        </div>
        <div className="settings-confirm-actions">
          <button type="button" className="soft-btn" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className="danger-btn" onClick={onConfirm} disabled={busy}>
            {busy ? <Loader2 size={15} /> : <Trash2 size={15} />}
            Remove
          </button>
        </div>
      </section>
    </div>
  );
}

function KpiCard({ label, value, note, icon }: { label: string; value: ReactNode; note: ReactNode; icon: ReactNode }) {
  return (
    <div className="score-box ema-kpi-card text-start" title={`${label}: ${value}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
      <i className="d-none">{icon}</i>
    </div>
  );
}

function NetworkTree({
  node,
  level = 0,
  selectedNodeId,
  expandedIds,
  onToggle,
  onSelect,
  forceOpen = false,
}: {
  node: NetworkHierarchyNode;
  level?: number;
  selectedNodeId: string | null;
  expandedIds: Set<string>;
  onToggle: (node: NetworkHierarchyNode) => void;
  onSelect: (node: NetworkHierarchyNode) => void;
  forceOpen?: boolean;
}) {
  const hasChildren = Boolean(node.children?.length);
  const isOpen = forceOpen || expandedIds.has(node.id);
  const total = countTotal(node.counts);
  const isLeafIp = isIpAddress(node.label);
  const isSelected = selectedNodeId === node.id;
  const Icon = isLeafIp ? Monitor : isOpen ? FolderOpen : Folder;

  return (
    <div className={cx("d-grid gap-2", level > 0 && "ms-3")}>
      <button
        type="button"
        className={cx("setting-btn", isSelected && "active")}
        onClick={() => {
          if (hasChildren) onToggle(node);
          onSelect(node);
        }}
        title={node.label}
      >
        <span className="setting-icon"><Icon /></span>
        <span>
          <strong>{node.label}</strong>
          <small>{isLeafIp ? "IP endpoint" : isOpen ? "Click to collapse scope" : "Click to expand scope"}</small>
        </span>
        {total > 0 && <b>{total.toLocaleString()}</b>}
      </button>

      {hasChildren && isOpen && (
        <div className="d-grid gap-2 ms-3">
          {(node.children || []).map((child) => (
            <NetworkTree
              key={child.id}
              node={child}
              level={level + 1}
              selectedNodeId={selectedNodeId}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onSelect={onSelect}
              forceOpen={forceOpen}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WorkgroupStatisticList({ rows, selected, onSelect }: { rows: WorkgroupStat[]; selected: string; onSelect: (name: string) => void }) {
  if (!rows.length) return <div className="settings-helper-card">No statistics found.</div>;

  return (
    <div className="d-grid gap-2">
      {rows.map((row) => (
        <button key={row.name} type="button" className={cx("setting-btn", selected === row.name && "active")} onClick={() => onSelect(row.name)}>
          <span className="setting-icon"><Database /></span>
          <span>
            <strong>{row.name}</strong>
            <small>{row.registered} registered • {row.notRegistered} not registered</small>
          </span>
          <b>{row.total.toLocaleString()}</b>
        </button>
      ))}
    </div>
  );
}

function DeviceStatusOverview({
  counts,
  total,
  selectedLabel,
  targetCount,
  onOpenStatus,
}: {
  counts: NetworkCounts;
  total: number;
  selectedLabel: string;
  targetCount: number;
  onOpenStatus: (type: CountKey) => void;
}) {
  const rows: Array<{ type: CountKey; label: string; description: string; count: number; tone: string; actionLabel: string; icon: typeof CheckCircle2 }> = [
    { type: "registered", label: "Registered Agent", description: "nPoints client agent exists and is registered for this IP scope.", count: counts.registered, tone: "active", actionLabel: "View registered devices", icon: CheckCircle2 },
    { type: "notRegistered", label: "Not Registered", description: "Client agent exists but registration status is not completed.", count: counts.notRegistered, tone: "locked", actionLabel: "View not registered devices", icon: AlertCircle },
    { type: "notInstalled", label: "Not Installed", description: "Detected network object without nPoints agent installed.", count: counts.notInstalled, tone: "review", actionLabel: "View not installed devices", icon: Activity },
    { type: "otherDevice", label: "Other Device", description: "Router, switch, printer, SNMP or other discovered network device.", count: counts.otherDevice, tone: "info", actionLabel: "View other devices", icon: Router },
  ];

  return (
    <div className="d-grid gap-3">
      <div className="settings-helper-card">
        <strong>Selected Scope</strong>
        <span>{selectedLabel} • {targetCount.toLocaleString()} scan target(s) • {total.toLocaleString()} network object(s)</span>
      </div>

      <div className="pricing-table-card table-responsive">
        <table className="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th>Status</th>
              <th>Description</th>
              <th>Count</th>
              <th className="text-end">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const Icon = row.icon;
              return (
                <tr key={row.type}>
                  <td>
                    <div className="user-name">
                      <span className="user-mini-avatar"><Icon size={14} /></span>
                      <span>
                        <strong>{row.label}</strong>
                        <small>{row.actionLabel}</small>
                      </span>
                    </div>
                  </td>
                  <td>{row.description}</td>
                  <td><span className={cx("user-pill", row.tone)}>{row.count.toLocaleString()}</span></td>
                  <td className="text-end">
                    <button
                      type="button"
                      className="mini-btn icon-only edit"
                      onClick={() => onOpenStatus(row.type)}
                      aria-label={row.actionLabel}
                      title={row.actionLabel}
                    >
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusDetailModal({
  detail,
  onClose,
  onPage,
  onOpenRecord,
}: {
  detail: NonNullable<StatusDetailState>;
  onClose: () => void;
  onPage: (page: number) => void;
  onOpenRecord: (row: DeviceDetail) => void;
}) {
  return (
    <div className="user-modal-backdrop open" onMouseDown={onClose}>
      <section className="user-modal advanced" onMouseDown={(event) => event.stopPropagation()}>
        <div className="user-modal-head">
          <div>
            <span>{detail.source}</span>
            <h2>{detail.title}</h2>
            <p>{detail.totalRecords} record(s) • paginated detail list.</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close status detail">
            <X size={18} />
          </button>
        </div>
        <div className="user-modal-body content-body">
          <div className="wide"><StatusDetailTable detail={detail} onPage={onPage} onOpenRecord={onOpenRecord} /></div>
        </div>
      </section>
    </div>
  );
}

function StatusDetailTable({
  detail,
  onPage,
  onOpenRecord,
}: {
  detail: StatusDetailState;
  onPage: (page: number) => void;
  onOpenRecord: (row: DeviceDetail) => void;
}) {
  const [searchText, setSearchText] = useState("");
  const [agentFilter, setAgentFilter] = useState("All");
  const [workgroupFilter, setWorkgroupFilter] = useState("All");
  const [clientPage, setClientPage] = useState(1);

  const baseRows = useMemo(() => detail?.allRows || detail?.rows || [], [detail?.allRows, detail?.rows]);
  const agentOptions = useMemo(() => buildDetailOptions(baseRows, (row) => row.clientAgent), [baseRows]);
  const workgroupOptions = useMemo(() => buildDetailOptions(baseRows, (row) => row.workgroup), [baseRows]);

  const isFiltering = Boolean(searchText.trim()) || agentFilter !== "All" || workgroupFilter !== "All";
  const filteredRows = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    return baseRows.filter((row) => {
      const searchable = [
        row.computerName,
        row.username,
        row.ipAddress,
        row.department,
        row.workgroup,
        row.clientAgent,
        row.recentSearchTime,
        row.lastConnection,
      ].join(" ").toLowerCase();
      const matchesKeyword = !keyword || searchable.includes(keyword);
      const matchesAgent = agentFilter === "All" || normalizeDetailFilterValue(row.clientAgent) === agentFilter;
      const matchesWorkgroup = workgroupFilter === "All" || normalizeDetailFilterValue(row.workgroup) === workgroupFilter;
      return matchesKeyword && matchesAgent && matchesWorkgroup;
    });
  }, [agentFilter, baseRows, searchText, workgroupFilter]);

  useEffect(() => {
    setClientPage(1);
  }, [agentFilter, detail?.title, detail?.type, searchText, workgroupFilter]);

  useEffect(() => {
    if (!detail?.serverPaginated) setClientPage(detail?.page || 1);
  }, [detail?.page, detail?.serverPaginated, detail?.title, detail?.type]);

  if (!detail) return null;

  const usesServerPaging = Boolean(detail.serverPaginated && !isFiltering);
  const visibleTotalRows = usesServerPaging ? detail.totalRecords : filteredRows.length;
  const visibleTotalPages = usesServerPaging
    ? detail.totalPages
    : Math.max(1, Math.ceil(filteredRows.length / statusDetailPageSize));
  const activePage = usesServerPaging
    ? detail.page
    : Math.min(Math.max(1, clientPage), visibleTotalPages);
  const visibleRows = usesServerPaging
    ? filteredRows
    : filteredRows.slice((activePage - 1) * statusDetailPageSize, activePage * statusDetailPageSize);

  const handlePageChange = (nextPage: number) => {
    const boundedPage = Math.min(Math.max(1, nextPage), visibleTotalPages);
    if (usesServerPaging) {
      onPage(boundedPage);
      return;
    }
    setClientPage(boundedPage);
  };

  const clearFilters = () => {
    setSearchText("");
    setAgentFilter("All");
    setWorkgroupFilter("All");
    setClientPage(1);
  };

  return (
    <div className="d-grid gap-3">
      <div className="content-head">
        <div>
          <h3>{detail.title}</h3>
          <span>{detail.totalRecords} record(s) • source: {detail.source}</span>
        </div>
        {detail.loading && <Loader2 size={17} className="spinner-border spinner-border-sm" />}
      </div>

      <div className="user-access-commandbar">
        <label className="section-search user-search-inline">
          <Search size={16} />
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search computer, user, IP, department..."
          />
          {searchText && (
            <button type="button" onClick={() => setSearchText("")} aria-label="Clear detail search">
              <X size={14} />
            </button>
          )}
        </label>

        <select className="setting-select" value={agentFilter} onChange={(event) => setAgentFilter(event.target.value)}>
          <option value="All">All agents</option>
          {agentOptions.map((option) => (
            <option value={option} key={option}>Agent {option}</option>
          ))}
        </select>

        <select className="setting-select" value={workgroupFilter} onChange={(event) => setWorkgroupFilter(event.target.value)}>
          <option value="All">All workgroups</option>
          {workgroupOptions.map((option) => (
            <option value={option} key={option}>{option}</option>
          ))}
        </select>

        {isFiltering && (
          <button type="button" className="soft-btn" onClick={clearFilters}>
            Clear
          </button>
        )}

        <span className="user-pill info">
          {visibleTotalRows} shown
        </span>
      </div>

      <div className="pricing-table-card table-responsive">
        <table className="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th>#</th>
              <th>Computer / User</th>
              <th>IP Address</th>
              <th>Department</th>
              <th>Workgroup</th>
              <th>Agent</th>
              <th>Last Seen</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, index) => (
              <tr key={`${row.ipAddress || row.computerName || "row"}-${activePage}-${index}`}>
                <td>{String((activePage - 1) * statusDetailPageSize + index + 1).padStart(2, "0")}</td>
                <td>
                  <div className="user-name">
                    <span className="user-mini-avatar"><Monitor size={13} /></span>
                    <div>
                      <strong>{row.computerName || row.username || "-"}</strong>
                      <small>{row.username || row.email || "-"}</small>
                    </div>
                  </div>
                </td>
                <td>{row.ipAddress || "-"}</td>
                <td>{row.department || "-"}</td>
                <td>{row.workgroup || "-"}</td>
                <td>{row.clientAgent || "-"}</td>
                <td>{row.recentSearchTime || row.lastConnection || "-"}</td>
                <td>
                  <button type="button" className="mini-btn" onClick={() => onOpenRecord(row)}>
                    <Eye size={13} />
                    Detail
                  </button>
                </td>
              </tr>
            ))}

            {!detail.loading && !visibleRows.length && (
              <tr>
                <td colSpan={8}>
                  <EmptyState title="No detail record" subtitle="No record matches the current search/filter." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={activePage} totalPages={visibleTotalPages} totalRows={visibleTotalRows} pageSize={statusDetailPageSize} itemLabel="records" onChange={handlePageChange} />
    </div>
  );
}

function normalizeDetailFilterValue(value?: string) {
  const normalized = String(value || "-").trim();
  return normalized && normalized !== "-" ? normalized.toUpperCase() : "-";
}

function buildDetailOptions(rows: DeviceDetail[], pickValue: (row: DeviceDetail) => string | undefined) {
  return Array.from(new Set(rows.map((row) => normalizeDetailFilterValue(pickValue(row))).filter((item) => item !== "-"))).sort();
}

function NetworkPathDetail({ detail, onScan }: { detail: IpDetailState; onScan: () => void }) {
  if (!detail) return null;

  return (
    <div className="d-grid gap-3">
      <div className="content-head">
        <div>
          <h2>DEVICE STATUS : {detail.ip}</h2>
          <span>{detail.loading ? "Loading fresh IP detail..." : `Source: ${detail.source}`}</span>
        </div>
        <button type="button" className="primary-btn" onClick={onScan}>
          <Play size={15} />
          Scan IP
        </button>
      </div>

      <div className="pricing-table-card table-responsive">
        <table className="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th>nPoints Agent</th>
              <th>Content</th>
            </tr>
          </thead>
          <tbody>
            {detail.rows.map(([label, value]) => (
              <tr key={label}>
                <td>{label}</td>
                <td>{value || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DeviceRegistryTable({
  rows,
  page,
  selectedId,
  loading,
  onEdit,
  onDelete,
}: {
  rows: ManualNetworkDevice[];
  page: number;
  selectedId: number | string | null;
  loading: boolean;
  onEdit: (device: ManualNetworkDevice) => void;
  onDelete: (device: ManualNetworkDevice) => void;
}) {
  return (
    <div className="pricing-table-card table-responsive">
      <table className="table table-hover align-middle mb-0">
        <thead>
          <tr>
            <th>#</th>
            <th>Device Name</th>
            <th>Device Brand</th>
            <th>Status</th>
            <th>Version</th>
            <th>Location</th>
            <th>Purpose</th>
            <th>Patch Date</th>
            <th>Remarks</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((device, index) => (
            <tr key={device.id} className={selectedId === device.id ? "selected" : ""}>
              <td>{String((page - 1) * pageSize + index + 1).padStart(2, "0")}</td>
              <td>
                <div className="user-name">
                  <span className="user-mini-avatar"><Router size={13} /></span>
                  <div>
                    <strong>{device.deviceName}</strong>
                    <small>{device.location}</small>
                  </div>
                </div>
              </td>
              <td>{device.deviceBrand}</td>
              <td>
                <span className={cx("user-pill", statusTone(device.deviceStatus) === "inactive" ? "locked" : statusTone(device.deviceStatus) === "maintenance" ? "review" : "active")}>{device.deviceStatus}</span>
              </td>
              <td>{device.deviceVersion}</td>
              <td>{device.location}</td>
              <td>{device.purpose}</td>
              <td>{device.patchDate}</td>
              <td>{device.remarks || "-"}</td>
              <td>
                <div className="user-row-action-wrap clean justify-content-end">
                  <button type="button" className="mini-btn icon-only edit" title="Edit device" aria-label={`Edit ${device.deviceName}`} onClick={() => onEdit(device)}>
                    <Edit3 size={15} aria-hidden="true" />
                  </button>
                  <button type="button" className="mini-btn icon-only delete" title="Remove device" aria-label={`Remove ${device.deviceName}`} onClick={() => onDelete(device)}>
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </div>
              </td>
            </tr>
          ))}

          {!loading && !rows.length && (
            <tr>
              <td colSpan={10}>
                <EmptyState title="No network device found" subtitle="Try another keyword, status, or add a new network device." />
              </td>
            </tr>
          )}

          {loading && (
            <tr>
              <td colSpan={10}>
                <EmptyState icon="loading" title="Loading network devices" subtitle="Preparing network device records." />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  totalRows,
  pageSize,
  itemLabel = "records",
  onChange,
}: {
  page: number;
  totalPages: number;
  totalRows: number;
  pageSize?: number;
  itemLabel?: string;
  onChange: (page: number) => void;
}) {
  const safeTotalPages = Math.max(1, totalPages || 1);
  const safePage = Math.min(Math.max(1, page || 1), safeTotalPages);
  const from = totalRows === 0 || !pageSize ? 0 : (safePage - 1) * pageSize + 1;
  const to = totalRows === 0 || !pageSize ? 0 : Math.min(safePage * pageSize, totalRows);
  const pageText = pageSize ? `${from}-${to} of ${totalRows} ${itemLabel}` : `${totalRows} ${itemLabel}`;

  return (
    <footer className="uam-pagination global-style">
      <span className="uam-page-summary">Page {safePage} of {safeTotalPages}</span>
      <span className="uam-page-status">{pageText}</span>
      <nav className="uam-pagination-controls global-style" aria-label="Network inventory pagination">
        <button className="uam-page-icon" type="button" disabled={safePage <= 1} onClick={() => onChange(1)} aria-label="First page">
          <ChevronsLeft size={14} />
        </button>
        <button className="uam-page-icon" type="button" disabled={safePage <= 1} onClick={() => onChange(Math.max(1, safePage - 1))} aria-label="Previous page">
          <ChevronLeft size={14} />
        </button>
        <b className="uam-page-current">{safePage}</b>
        <button className="uam-page-icon" type="button" disabled={safePage >= safeTotalPages} onClick={() => onChange(Math.min(safeTotalPages, safePage + 1))} aria-label="Next page">
          <ChevronRight size={14} />
        </button>
        <button className="uam-page-icon" type="button" disabled={safePage >= safeTotalPages} onClick={() => onChange(safeTotalPages)} aria-label="Last page">
          <ChevronsRight size={14} />
        </button>
      </nav>
    </footer>
  );
}

function AddFolderModal({
  parentLabel,
  busy,
  onClose,
  onSave,
}: {
  parentLabel: string;
  busy: boolean;
  onClose: () => void;
  onSave: (folderName: string) => void;
}) {
  const [folderName, setFolderName] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave(folderName);
  };

  return (
    <div className="user-modal-backdrop open" onMouseDown={onClose}>
      <form className="user-modal advanced" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="user-modal-head">
          <div>
            <span>Organization Tree</span>
            <h2>Add Folder</h2>
            <p>Add a folder under {parentLabel}. This keeps the hierarchy action separate from network scan jobs.</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close add folder">
            <X size={18} />
          </button>
        </div>

        <div className="user-modal-body content-body">
          <label className="form-field wide">
            <span>Folder Name</span>
            <input required value={folderName} onChange={(event) => setFolderName(event.target.value)} placeholder="Example: Data Centre / Server Room / Branch A" className="setting-input" autoFocus />
          </label>
          <div className="settings-helper-card wide">
            <strong>Parent:</strong>
            <span>{parentLabel}</span>
          </div>
        </div>

        <div className="user-modal-foot">
          <button type="button" className="soft-btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="primary-btn" disabled={busy}>
            {busy ? <Loader2 size={16} className="spinner-border spinner-border-sm" /> : <Plus size={16} />}
            Add Folder
          </button>
        </div>
      </form>
    </div>
  );
}

function DeviceFormModal({
  mode,
  device,
  busy,
  onClose,
  onSave,
}: {
  mode: "add" | "edit";
  device?: ManualNetworkDevice | null;
  busy: boolean;
  onClose: () => void;
  onSave: (payload: Omit<ManualNetworkDevice, "id">) => void;
}) {
  const [form, setForm] = useState<Omit<ManualNetworkDevice, "id">>({
    deviceName: device?.deviceName || "",
    deviceBrand: device?.deviceBrand || "",
    deviceStatus: device?.deviceStatus || "Active",
    deviceVersion: device?.deviceVersion || "",
    location: device?.location || "",
    purpose: device?.purpose || "",
    patchDate: device?.patchDate && device.patchDate !== "-" ? device.patchDate : "",
    remarks: device?.remarks || "-",
  });

  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave(form);
  };

  return (
    <div className="user-modal-backdrop open" onMouseDown={onClose}>
      <form className="user-modal advanced" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="user-modal-head">
          <div>
            <span>{mode === "edit" ? "Edit Network Device" : "Register Network Device"}</span>
            <h2>{mode === "edit" ? device?.deviceName || "Edit Device" : "Add New Device"}</h2>
            <p>{mode === "edit" ? "Update the selected network device record." : "Register a router, switch, access point, firewall or other network device."}</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close form">
            <X size={18} />
          </button>
        </div>

        <div className="user-modal-body content-body">
          <label className="form-field wide">
            <span>Device Name</span>
            <input required value={form.deviceName} onChange={(event) => update("deviceName", event.target.value)} placeholder="Core Router 01" className="setting-input" />
          </label>

          <div className="form-grid wide">
            <label className="form-field">
              <span>Device Brand</span>
              <input value={form.deviceBrand} onChange={(event) => update("deviceBrand", event.target.value)} placeholder="Cisco / ASUS / Fortinet" className="setting-input" />
            </label>
            <label className="form-field">
              <span>Device Status</span>
              <select className="setting-select" value={form.deviceStatus} onChange={(event) => update("deviceStatus", event.target.value)}>
                <option>Active</option>
                <option>Inactive</option>
                <option>Maintenance</option>
              </select>
            </label>
          </div>

          <div className="form-grid wide">
            <label className="form-field">
              <span>Version</span>
              <input value={form.deviceVersion} onChange={(event) => update("deviceVersion", event.target.value)} placeholder="V2.0" className="setting-input" />
            </label>
            <label className="form-field">
              <span>Patch Date</span>
              <input value={form.patchDate} onChange={(event) => update("patchDate", event.target.value)} type="date" className="setting-input" />
            </label>
          </div>

          <div className="form-grid wide">
            <label className="form-field">
              <span>Location</span>
              <input value={form.location} onChange={(event) => update("location", event.target.value)} placeholder="Server Room / HQ" className="setting-input" />
            </label>
            <label className="form-field">
              <span>Purpose</span>
              <input value={form.purpose} onChange={(event) => update("purpose", event.target.value)} placeholder="Router / Switch / Firewall" className="setting-input" />
            </label>
          </div>

          <label className="form-field wide">
            <span>Remarks</span>
            <textarea value={form.remarks} onChange={(event) => update("remarks", event.target.value)} rows={3} placeholder="Operational note or device description" className="setting-textarea" />
          </label>
        </div>

        <div className="user-modal-foot">
          <button type="button" className="soft-btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="primary-btn" disabled={busy}>
            {busy ? <Loader2 size={16} className="spinner-border spinner-border-sm" /> : mode === "edit" ? <Edit3 size={16} /> : <Plus size={16} />}
            {mode === "edit" ? "Save Changes" : "Add Device"}
          </button>
        </div>
      </form>
    </div>
  );
}

function RecordDetailModal({ detail, onClose }: { detail: NonNullable<RecordDetailState>; onClose: () => void }) {
  return (
    <div className="user-modal-backdrop open" onMouseDown={onClose}>
      <section className="user-modal advanced" onMouseDown={(event) => event.stopPropagation()}>
        <div className="user-modal-head">
          <div>
            <span>{detail.source}</span>
            <h2>{detail.title}</h2>
            <p>Detailed network inventory information.</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close detail">
            <X size={18} />
          </button>
        </div>
        <div className="user-modal-body content-body">
          <table className="table table-hover align-middle mb-0">
            <tbody>
              {detail.rows.map(([key, value]) => (
                <tr key={key}>
                  <th>{key}</th>
                  <td>{value}</td>
                </tr>
              ))}
              {!detail.rows.length && (
                <tr>
                  <td colSpan={2}>No backend detail returned.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ScanJobModal({
  dialog,
  busy,
  targetCount,
  onClose,
  onSubmit,
}: {
  dialog: NonNullable<ScanDialogState>;
  busy: boolean;
  targetCount: number;
  onClose: () => void;
  onSubmit: (commandType: CommandType, scheduleTime: string, description: string) => void;
}) {
  const [commandType, setCommandType] = useState<CommandType>("push");
  const [scheduleTime, setScheduleTime] = useState("");
  const defaultDescription = `[Network Inventory] Scan - ${dialog.mode === "all" ? "All Network IPs" : dialog.mode === "subnet" ? dialog.node?.label || "Selected subnet" : dialog.ipAddress || dialog.node?.label || "Selected IP"}`;
  const [description, setDescription] = useState(defaultDescription);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(commandType, scheduleTime, description);
  };

  return (
    <div className="user-modal-backdrop open" onMouseDown={onClose}>
      <form className="user-modal advanced" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="user-modal-head">
          <div>
            <span>Network Inventory Scan Job</span>
            <h2>{dialog.mode === "all" ? "Scan All Network IPs" : dialog.mode === "subnet" ? `Scan Subnet ${dialog.node?.label || ""}` : `Scan IP ${dialog.ipAddress || dialog.node?.label || ""}`}</h2>
            <p>Creates a network scan job for the selected scope.</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close scan modal">
            <X size={18} />
          </button>
        </div>

        <div className="user-modal-body content-body">
          <div className="audit-kpi-strip wide">
            <div>
              <span>Scan Mode</span>
              <strong>{dialog.mode.toUpperCase()}</strong>
            </div>
            <div>
              <span>Target Count</span>
              <strong>{targetCount}</strong>
            </div>
            <div>
              <span>Selected Scope</span>
              <strong>{dialog.node?.label || "All Network"}</strong>
            </div>
          </div>

          <div className="form-grid wide">
            <label className="form-field">
              <span>Command Type</span>
              <select className="setting-select" value={commandType} onChange={(event) => setCommandType(event.target.value as CommandType)}>
                <option value="push">Push Now</option>
                <option value="schedule">Schedule</option>
              </select>
            </label>

            <label className="form-field">
              <span>Schedule Time</span>
              <input type="datetime-local" value={scheduleTime} onChange={(event) => setScheduleTime(event.target.value)} disabled={commandType !== "schedule"} required={commandType === "schedule"} className="setting-input" />
            </label>
          </div>

          <label className="form-field wide">
            <span>Description</span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="setting-textarea" />
          </label>
        </div>

        <div className="user-modal-foot">
          <button type="button" className="soft-btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="primary-btn" disabled={busy}>
            {busy ? <Loader2 size={16} className="spinner-border spinner-border-sm" /> : <Play size={16} />}
            Create Scan Job
          </button>
        </div>
      </form>
    </div>
  );
}

function EmptyState({ icon, title, subtitle }: { icon?: "loading"; title: string; subtitle: string }) {
  return (
    <div className="settings-helper-card text-center py-4">
      {icon === "loading" ? <Loader2 size={28} className="spinner-border spinner-border-sm" /> : <Database size={28} />}
      <strong>{title}</strong>
      <span>{subtitle}</span>
    </div>
  );
}
