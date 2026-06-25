import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  FileArchive,
  FileText,
  FolderClosed,
  FolderOpen,
  HardDrive,
  MoreVertical,
  Package,
  Plus,
  Search,
  Send,
  Server,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import softwareDistributionService from "../services/softwareDistributionService";

type PackageStatus = "Ready" | "Draft" | "Deployed" | "Archived";
type DeliveryMethod = "onprem" | "cloud" | "network";
type SortKey =
  | "name"
  | "version"
  | "status"
  | "lastDeliveryMethod"
  | "registeredDate"
  | "targetCount"
  | "owner";
type SortDirection = "asc" | "desc";

type PackageRecord = {
  id: string;
  name: string;
  version: string;
  description: string;
  status: PackageStatus;
  owner: string;
  destinationDirectory: string;
  registeredDate: string;
  fileCount: number;
  sizeBeforeCompression: string;
  sizeAfterCompression: string;
  excludeOS: number;
  remoteExecuteFile: number;
  lastDeployment: string;
  targetCount: number;
  versions: string[];
  lastDeliveryMethod: DeliveryMethod | "mixed" | "-";
};

type TargetDevice = {
  id: string;
  name: string;
  department: string;
  ip: string;
  os: string;
  status: "Online" | "Offline";
  objectDeviceId?: string;
  objectAgent?: string;
  assetId?: string | number;
};

type ModalState =
  | { type: "new" }
  | { type: "send"; packageIds: string[] }
  | { type: "delete"; packageIds: string[] }
  | { type: "deleteVersion"; packageId: string; version: string }
  | null;

type ToastState = {
  type: "success" | "error" | "info";
  title: string;
  message: string;
} | null;

const PAGE_SIZE = 10;
const TREE_PAGE_SIZE = 10;

const deliveryMethodLabels: Record<DeliveryMethod | "mixed" | "-", string> = {
  onprem: "On-Prem",
  cloud: "Cloud",
  network: "Network",
  mixed: "Mixed",
  "-": "-",
};

type CreatePackagePayload = {
  name: string;
  description: string;
  owner: string;
  destinationDirectory: string;
  osname: string;
  exclude: number;
  keepParentDirectories: number;
  sourcePath: string;
  cmdline: string;
  executionOrder: string;
  fileVersion: string;
  files: File[];
};

function formatBytesFromApi(value: unknown) {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function normalizeApiDate(value: unknown) {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().slice(0, 16).replace("T", " ");
}

function normalizePackageRecord(row: any): PackageRecord {
  const name = row.name || row.pkg_Name || row.Pkg_Name || row.PKG_Name || row.packageName || "-";
  const id = String(row.id || row.pkg_Idn || row.Pkg_Idn || row.PKG_Idn || name);
  const versionValue = row.version || row.pkg_Version || row.Pkg_Version || row.PKG_Version || 1;
  const statusValue = row.status || row.Status || (Number(row.pkg_bDeleted || row.Pkg_bDeleted || 0) === 1 ? "Archived" : "Ready");
  const status: PackageStatus = ["Ready", "Draft", "Deployed", "Archived"].includes(statusValue)
    ? statusValue
    : "Ready";

  const rawVersions = row.versions || row.pkg_AllVersions || row.Pkg_AllVersions || row.allVersions;
  const versions = Array.isArray(rawVersions)
    ? rawVersions.map((item) => String(item).startsWith("VER_") ? String(item) : `VER_${item}`)
    : [`VER_${String(versionValue).replace(/^v/i, "")}`];

  return {
    id,
    name,
    version: String(versionValue).startsWith("v") ? String(versionValue) : `v${versionValue}`,
    description: row.description || row.pkg_Description || row.PKG_Info || row.Pkg_Info || "Software distribution package.",
    status,
    owner: String(row.owner || row.pkg_Owner || row.Pkg_Owner || "system"),
    destinationDirectory: row.destinationDirectory || row.pkg_File_CTDir || row.Pkg_File_CTDir || row.destination_path || "-",
    registeredDate: normalizeApiDate(row.registeredDate || row.pkg_ChangedDate || row.Pkg_ChangedDate || row.Pkg_ChangedDate || row.createdAt),
    fileCount: Number(row.fileCount || row.FileCount || row.file_count || 0),
    sizeBeforeCompression: row.sizeBeforeCompression || formatBytesFromApi(row.sizeBefore || row.SizeBefore || row.Pkg_File_OSize),
    sizeAfterCompression: row.sizeAfterCompression || formatBytesFromApi(row.sizeAfter || row.SizeAfter || row.Pkg_File_ZSize),
    excludeOS: Number(row.excludeOS || row.Exclude || row.exclude || 0),
    remoteExecuteFile: Number(row.remoteExecuteFile || row.RemoteExecuteFile || 0),
    lastDeployment: normalizeApiDate(row.lastDeployment || row.LastDeployment),
    targetCount: Number(row.targetCount || row.TargetCount || 0),
    versions,
    lastDeliveryMethod: row.lastDeliveryMethod || "-",
  };
}

function normalizeTargetDevice(row: any): TargetDevice {
  const objectDeviceId = row.objectDeviceId || row.Object_DeviceID || row.DeviceID || row.deviceID || "";
  const id = String(row.id || row._Idn || row.assetId || objectDeviceId || row.ComputerName || Date.now());
  const statusText = String(row.status || row.ConnectionStatus || row.connectionStatus || "Offline").toLowerCase();

  return {
    id,
    name: row.name || row.ComputerName || row.DeviceName || row.computerName || "-",
    department: row.department || row.Object_Full_Name || row.objectFullName || "-",
    ip: row.ip || row.IP || row.DeviceIPAddress || row.DeviceLocalIPAddress || "-",
    os: row.os || row.PlatformType || row.MachineType || "Unknown",
    status: statusText === "online" || statusText === "1" ? "Online" : "Offline",
    objectDeviceId,
    objectAgent: row.objectAgent || row.Object_Agent,
    assetId: row.assetId || row._Idn,
  };
}

async function fetchPackagesFromApi() {
  const rows = await softwareDistributionService.getPackages();
  return rows.map(normalizePackageRecord);
}

async function fetchTargetsFromApi() {
  const rows = await softwareDistributionService.getTargets();
  return rows.map(normalizeTargetDevice);
}

async function createPackageViaApi(payload: CreatePackagePayload) {
  const formData = new FormData();

  formData.append("pkg_Name", payload.name);
  formData.append("pkg_Description", payload.description || payload.name);
  formData.append("destination_path", payload.destinationDirectory || "C:\\");
  formData.append("osname", payload.osname || "");
  formData.append("exclude", String(payload.exclude));
  formData.append("keep_parent_directories", String(payload.keepParentDirectories));
  formData.append("pkg_Owner", String(Number(payload.owner) || 1));

  payload.files.forEach((file) => {
    formData.append("files", file);
    formData.append("source_paths", payload.sourcePath || "C:\\PackageSource");
    formData.append("cmdlines", payload.cmdline || "");
    formData.append("execution_orders", payload.executionOrder || "0");
    formData.append("pkg_File_Versions", payload.fileVersion || "");
  });

  return softwareDistributionService.createPackage(formData);
}

async function deployPackagesViaApi(
  packages: PackageRecord[],
  targets: TargetDevice[],
  _method: DeliveryMethod,
  scheduleType: "now" | "schedule"
) {
  const validTargets = targets.filter((device) => Boolean(device.objectDeviceId || device.id));

  if (validTargets.length === 0) {
    throw new Error("Please select at least one target device.");
  }

  const target = validTargets.map((device) => ({
    type: 2,
    value: String(device.objectDeviceId || device.id),
  }));

  const results = [];

  for (const packageItem of packages) {
    const owner = Number(packageItem.owner);

    // Keep this payload aligned with the tested Postman /send payload.
    // Path, command line and execution order are already stored when the package is created.
    const body = {
      Pkg_Name: packageItem.name,
      Pkg_Owner: Number.isFinite(owner) ? owner : 0,
      Job_Style: scheduleType === "schedule" ? 3 : 0,
      distribution_option: 0,
      Job_StartTime: "",
      Job_EndTime: "",
      Job_ScheduleTime: "",
      Job_Priority: 0,
      Job_Description: `Software Distribution from EMA UI - ${packageItem.name}`,
      target,
    };

    const response = await softwareDistributionService.sendPackage(body);

    results.push({ packageName: packageItem.name, request: body, response });
  }

  return {
    success: true,
    totalRecords: results.length,
    targetRecords: validTargets.length,
    data: results,
  };
}

async function deletePackageViaApi(packageName: string) {
  return softwareDistributionService.deletePackage(packageName);
}

async function deletePackageVersionViaApi(packageName: string, version: string) {
  const versionNumber = String(version).replace(/^VER_/i, "").replace(/^v/i, "");
  return softwareDistributionService.deletePackageVersion(packageName, versionNumber);
}


function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}


type CompactPaginationProps = {
  currentPage: number;
  totalPages: number;
  className?: string;
  ariaLabel?: string;
  onPageChange: (page: number) => void;
};

function CompactPagination({
  currentPage,
  totalPages,
  className,
  ariaLabel = "Pagination",
  onPageChange,
}: CompactPaginationProps) {
  const safeTotalPages = Math.max(1, totalPages || 1);
  const safeCurrentPage = Math.min(Math.max(1, currentPage || 1), safeTotalPages);

  function goToPage(nextPage: number) {
    if (nextPage < 1 || nextPage > safeTotalPages || nextPage === safeCurrentPage) return;
    onPageChange(nextPage);
  }

  return (
    <footer className={cx("uam-pagination global-style", className)}>
      <div className="uam-page-status" aria-live="polite">
        <span>Page {safeCurrentPage} of {safeTotalPages}</span>
      </div>

      <nav className="uam-pagination-controls global-style" aria-label={ariaLabel}>
        <button
          type="button"
          className="uam-page-icon"
          aria-label="First page"
          disabled={safeCurrentPage === 1}
          onClick={() => goToPage(1)}
        >
          <ChevronsLeft size={14} strokeWidth={2.6} />
        </button>
        <button
          type="button"
          className="uam-page-icon"
          aria-label="Previous page"
          disabled={safeCurrentPage === 1}
          onClick={() => goToPage(safeCurrentPage - 1)}
        >
          <ChevronLeft size={14} strokeWidth={2.8} />
        </button>

        <b className="uam-page-current" aria-current="page">{safeCurrentPage}</b>

        <button
          type="button"
          className="uam-page-icon"
          aria-label="Next page"
          disabled={safeCurrentPage === safeTotalPages}
          onClick={() => goToPage(safeCurrentPage + 1)}
        >
          <ChevronRight size={14} strokeWidth={2.8} />
        </button>
        <button
          type="button"
          className="uam-page-icon"
          aria-label="Last page"
          disabled={safeCurrentPage === safeTotalPages}
          onClick={() => goToPage(safeTotalPages)}
        >
          <ChevronsRight size={14} strokeWidth={2.6} />
        </button>
      </nav>
    </footer>
  );
}

function statusTone(status: PackageStatus) {
  return status.toLowerCase();
}

function statusPillClass(status: PackageStatus) {
  if (status === "Ready") return "active";
  if (status === "Draft") return "review";
  if (status === "Archived") return "inactive";
  return "info";
}

function formatDate(value: string) {
  if (!value || value === "-") return "-";

  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-MY", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isDeployable(item: PackageRecord) {
  return item.status !== "Archived";
}

function NewPackageModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (payload: CreatePackagePayload) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    owner: "1",
    destinationDirectory: "C:\\PackageDestination",
    sourcePath: "C:\\PackageSource",
    cmdline: "",
    executionOrder: "3",
    fileVersion: "",
    osname: "",
    exclude: -1,
    keepParentDirectories: 0,
  });
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canCreate =
    form.name.trim().length > 0 &&
    form.destinationDirectory.trim().length > 0 &&
    files.length > 0;

  const create = () => {
    if (!canCreate) return;

    onCreate({
      name: form.name.trim(),
      description: form.description.trim() || form.name.trim(),
      owner: form.owner.trim() || "1",
      destinationDirectory: form.destinationDirectory.trim() || "C:\\",
      osname: form.osname.trim(),
      exclude: Number(form.exclude),
      keepParentDirectories: Number(form.keepParentDirectories),
      sourcePath: form.sourcePath.trim() || "C:\\PackageSource",
      cmdline: form.cmdline,
      executionOrder: form.executionOrder || "0",
      fileVersion: form.fileVersion,
      files,
    });
  };

  return (
    <div className="user-modal-backdrop open" onMouseDown={onClose}>
      <div className="user-modal advanced w-75" onMouseDown={(event) => event.stopPropagation()}>
        <div className="user-modal-head">
          <div>
            <h3>New Package</h3>
            <p>Create a new software distribution package</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="user-modal-body">
          <label className="form-field">
            <span>Package Name</span>
            <input className="setting-input"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="e.g. Google Chrome Enterprise"
            />
          </label>

          <label className="form-field">
            <span>Description</span>
            <textarea className="setting-textarea"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              rows={3}
              placeholder="Package description"
            />
          </label>

          <label className="form-field wide">
            <span>Destination Directory</span>
            <input className="setting-input"
              value={form.destinationDirectory}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  destinationDirectory: event.target.value,
                }))
              }
              placeholder="C:\\PackageDestination"
            />
            <small>Install path on target device, for example C:\ or C:\Program Files\AppName.</small>
          </label>

          <label className="form-field wide">
            <span>Source Path</span>
            <input className="setting-input"
              value={form.sourcePath}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  sourcePath: event.target.value,
                }))
              }
              placeholder="C:\\PackageSource"
            />
            <small>This value is repeated for every uploaded file unless file-path mapping is expanded.</small>
          </label>

          <div className="form-grid wide">
            <label className="form-field">
              <span>Owner Console ID</span>
              <input className="setting-input"
                value={form.owner}
                onChange={(event) =>
                  setForm((current) => ({ ...current, owner: event.target.value }))
                }
              />
            </label>

            <label className="form-field">
              <span>Execution Order</span>
              <select
                className="setting-select"
                value={form.executionOrder}
                onChange={(event) =>
                  setForm((current) => ({ ...current, executionOrder: event.target.value }))
                }
              >
                <option value="0">0 - No execution</option>
                <option value="1">1 - Execute before distribution</option>
                <option value="3">3 - Execute after distribution</option>
              </select>
            </label>
          </div>

          <div className="form-grid wide">
            <label className="form-field">
              <span>Command Line</span>
              <input className="setting-input"
                value={form.cmdline}
                onChange={(event) =>
                  setForm((current) => ({ ...current, cmdline: event.target.value }))
                }
                placeholder="/quiet"
              />
            </label>

            <label className="form-field">
              <span>File Version</span>
              <input className="setting-input"
                value={form.fileVersion}
                onChange={(event) =>
                  setForm((current) => ({ ...current, fileVersion: event.target.value }))
                }
                placeholder="optional"
              />
            </label>
          </div>

          <div className="form-grid wide">
            <label className="form-field">
              <span>OS Name</span>
              <input className="setting-input"
                value={form.osname}
                onChange={(event) =>
                  setForm((current) => ({ ...current, osname: event.target.value }))
                }
                placeholder="optional"
              />
            </label>

            <label className="form-field">
              <span>Exclude</span>
              <select
                className="setting-select"
                value={form.exclude}
                onChange={(event) =>
                  setForm((current) => ({ ...current, exclude: Number(event.target.value) }))
                }
              >
                <option value={-1}>-1 - Default</option>
                <option value={0}>0 - Include</option>
                <option value={1}>1 - Exclude</option>
              </select>
            </label>
          </div>

          <input className="setting-input"
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={(event) => setFiles(Array.from(event.target.files || []))}
          />

          <button
            type="button"
            className="settings-helper-card wide"
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud size={24} />
            <strong>{files.length ? `${files.length} file(s) selected` : "Select package files"}</strong>
            <span>Click here to choose package files.</span>
          </button>
        </div>

        <div className="user-modal-foot">
          <button type="button" className="soft-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="primary-btn" disabled={!canCreate} onClick={create}>
            Create Package
          </button>
        </div>
      </div>
    </div>
  );
}


function DeployPackageModal({
  packages,
  targetDevices,
  onClose,
  onDeploy,
}: {
  packages: PackageRecord[];
  targetDevices: TargetDevice[];
  onClose: () => void;
  onDeploy: (
    selectedTargets: TargetDevice[],
    method: DeliveryMethod,
    scheduleType: "now" | "schedule"
  ) => void;
}) {
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [excludedDevices, setExcludedDevices] = useState<Set<string>>(new Set());
  const [selectedScopes, setSelectedScopes] = useState<Set<string>>(new Set());
  const [targetView, setTargetView] = useState<"organization" | "os">("organization");
  const [includeLowerDepartment, setIncludeLowerDepartment] = useState(true);
  const [targetSearch, setTargetSearch] = useState("");
  const [targetStatusFilter, setTargetStatusFilter] = useState<"All" | "Online" | "Offline">("All");
  const [targetOsFilter, setTargetOsFilter] = useState("All");
  const [targetPage, setTargetPage] = useState(1);
  const [scheduleType, setScheduleType] = useState<"now" | "schedule">("now");
  const [method] = useState<DeliveryMethod>("onprem");

  const TARGET_PAGE_SIZE = 10;

  const totalTargetCount = targetDevices.length;

  const scopeGroups = useMemo(() => {
    const groupMap = new Map<string, TargetDevice[]>();

    targetDevices.forEach((device) => {
      const key = targetView === "os" ? device.os : device.department;
      const current = groupMap.get(key) || [];
      current.push(device);
      groupMap.set(key, current);
    });

    return Array.from(groupMap.entries()).map(([name, devices]) => ({
      id: `${targetView}:${name}`,
      name,
      type: targetView === "os" ? "Operating System" : "Department",
      count: devices.length,
      devices,
    }));
  }, [targetDevices, targetView]);

  const selectedScopeDevices = useMemo(() => {
    const scopeDeviceIds = new Set<string>();
    const selectedScopeNames = scopeGroups
      .filter((scope) => selectedScopes.has(scope.id))
      .map((scope) => scope.name);

    if (selectedScopeNames.length === 0) return scopeDeviceIds;

    if (targetView === "organization" && includeLowerDepartment) {
      targetDevices.forEach((device) => {
        const isInSelectedScope = selectedScopeNames.some(
          (scopeName) =>
            device.department === scopeName ||
            device.department.startsWith(`${scopeName}\\`) ||
            device.department.startsWith(`${scopeName}/`)
        );

        if (isInSelectedScope) scopeDeviceIds.add(device.id);
      });

      return scopeDeviceIds;
    }

    scopeGroups.forEach((scope) => {
      if (selectedScopes.has(scope.id)) {
        scope.devices.forEach((device) => scopeDeviceIds.add(device.id));
      }
    });

    return scopeDeviceIds;
  }, [scopeGroups, selectedScopes, targetDevices, targetView, includeLowerDepartment]);

  const includedTargetIds = useMemo(() => {
    const ids = new Set<string>();

    selectedScopeDevices.forEach((id) => ids.add(id));
    selectedDevices.forEach((id) => ids.add(id));
    excludedDevices.forEach((id) => ids.delete(id));

    return ids;
  }, [selectedScopeDevices, selectedDevices, excludedDevices]);

  const includedTargetList = useMemo(
    () => targetDevices.filter((device) => includedTargetIds.has(device.id)),
    [targetDevices, includedTargetIds]
  );

  const excludedTargetList = useMemo(
    () => targetDevices.filter((device) => excludedDevices.has(device.id)),
    [targetDevices, excludedDevices]
  );

  const filteredTargetDevices = useMemo(() => {
    const keyword = targetSearch.trim().toLowerCase();
    const hasScopeFilter = selectedScopes.size > 0;

    return targetDevices.filter((device) => {
      const searchable = [device.name, device.department, device.ip, device.os, device.status]
        .join(" ")
        .toLowerCase();

      const matchesScope = !hasScopeFilter || selectedScopeDevices.has(device.id);
      const matchesSearch = !keyword || searchable.includes(keyword);
      const matchesStatus = targetStatusFilter === "All" || device.status === targetStatusFilter;
      const matchesOs = targetOsFilter === "All" || device.os === targetOsFilter;

      return matchesScope && matchesSearch && matchesStatus && matchesOs;
    });
  }, [targetDevices, targetSearch, targetStatusFilter, targetOsFilter, selectedScopes, selectedScopeDevices]);

  const targetTotalPages = Math.max(1, Math.ceil(filteredTargetDevices.length / TARGET_PAGE_SIZE));
  const targetPageRows = filteredTargetDevices.slice(
    (targetPage - 1) * TARGET_PAGE_SIZE,
    targetPage * TARGET_PAGE_SIZE
  );

  const allTargetPageSelected =
    targetPageRows.length > 0 && targetPageRows.every((device) => selectedDevices.has(device.id));

  const finalTargetCount = includedTargetIds.size;
  const selectedScopeCount = selectedScopes.size;
  const manualUserCount = selectedDevices.size;
  const excludedUserCount = excludedDevices.size;

  const osOptions = useMemo(() => Array.from(new Set(targetDevices.map((device) => device.os))), [targetDevices]);

  const switchTargetView = (view: "organization" | "os") => {
    setTargetView(view);
    setSelectedScopes(new Set());
    setTargetPage(1);
  };

  const toggleScope = (scopeId: string) => {
    setTargetPage(1);
    setSelectedScopes((current) => {
      const next = new Set(current);
      if (next.has(scopeId)) next.delete(scopeId);
      else next.add(scopeId);
      return next;
    });
  };

  const toggleManualUser = (id: string) => {
    setSelectedDevices((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleExcludedUser = (id: string) => {
    setExcludedDevices((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectTargetPage = () => {
    setSelectedDevices((current) => {
      const next = new Set(current);

      if (allTargetPageSelected) {
        targetPageRows.forEach((device) => next.delete(device.id));
      } else {
        targetPageRows.forEach((device) => next.add(device.id));
      }

      return next;
    });
  };

  const clearTargetSelection = () => {
    setSelectedScopes(new Set());
    setSelectedDevices(new Set());
    setExcludedDevices(new Set());
    setTargetSearch("");
    setTargetStatusFilter("All");
    setTargetOsFilter("All");
    setTargetPage(1);
  };

  const hasDeployedPackage = packages.some((item) => item.status === "Deployed");

  const packageStatusSummary = useMemo(() => {
    return packages.reduce(
      (summary, item) => {
        summary.total += 1;
        if (item.status === "Ready") summary.ready += 1;
        if (item.status === "Deployed") summary.deployed += 1;
        if (item.status === "Draft") summary.draft += 1;
        if (item.status === "Archived") summary.archived += 1;
        return summary;
      },
      { total: 0, ready: 0, deployed: 0, draft: 0, archived: 0 }
    );
  }, [packages]);

  const packagePreviewText = useMemo(() => {
    const visibleNames = packages.slice(0, 3).map((item) => item.name).filter(Boolean);
    const hiddenCount = Math.max(packages.length - visibleNames.length, 0);
    return `${visibleNames.join(", ")}${hiddenCount ? ` +${hiddenCount} more` : ""}`;
  }, [packages]);

  const deployModalNode = (
    <div
      className="user-modal-backdrop open"
      style={{ position: "fixed", inset: 0, zIndex: 2147483647 }}
      onMouseDown={onClose}
    >
      <div
        className="user-modal advanced"
        style={{
          width: "min(1840px, calc(100vw - 24px))",
          maxWidth: "calc(100vw - 24px)",
          height: "calc(100vh - 12px)",
          maxHeight: "calc(100vh - 12px)",
          display: "flex",
          flexDirection: "column",
        }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="user-modal-head">
          <div>
            <h3>{packages.length > 1 ? "Deploy Packages" : "Deploy Package"}</h3>
            <p>
              {packages.length > 1
                ? `${packages.length} packages selected`
                : `${packages[0]?.name} • ${packages[0]?.version}`}
            </p>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div
          className="user-modal-body content-body gap-3"
          style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto" }}
        >
          <section className="policy-card wide p-4">
            <div className="policy-top">
              <div>
                <strong>{packages.length > 1 ? "Selected Package Batch" : "Selected Package"}</strong>
                <p>
                  {packages.length > 1
                    ? "Review the package batch before choosing targets."
                    : "Review the package that will be deployed."}
                </p>
              </div>
              <span className="user-pill info">{packages.length} selected</span>
            </div>

            {packages.length > 1 && (
              <div className="settings-helper-card wide p-3 mb-3">
                <div className="policy-top mb-2">
                  <div>
                    <strong>Batch Summary</strong>
                    <span>{packagePreviewText}</span>
                  </div>
                  <span className="user-pill info">{packageStatusSummary.total} packages</span>
                </div>
                <div className="content-actions justify-content-start gap-2">
                  {packageStatusSummary.ready > 0 && <span className="user-pill active">Ready {packageStatusSummary.ready}</span>}
                  {packageStatusSummary.deployed > 0 && <span className="user-pill info">Deployed {packageStatusSummary.deployed}</span>}
                  {packageStatusSummary.draft > 0 && <span className="user-pill review">Draft {packageStatusSummary.draft}</span>}
                  {packageStatusSummary.archived > 0 && <span className="user-pill inactive">Archived {packageStatusSummary.archived}</span>}
                </div>
              </div>
            )}

            <div
              className="policy-list gap-2"
              style={
                packages.length > 1
                  ? { maxHeight: "132px", overflowY: "auto", paddingRight: "4px" }
                  : undefined
              }
            >
              {packages.map((item) => (
                <div key={item.id} className="inline-check">
                  <Package size={16} />
                  <div className="flex-grow-1">
                    <strong>{item.name}</strong>
                    <span>
                      {item.version} • {item.status} • {item.sizeAfterCompression} • {item.destinationDirectory}
                    </span>
                  </div>
                  <em className={cx("user-pill", statusPillClass(item.status))}>{item.status}</em>
                </div>
              ))}
            </div>

            {hasDeployedPackage && (
              <div className="settings-inline-alert wide mt-3">
                <ShieldCheck size={15} />
                <span>Some selected packages are already deployed. This action will redeploy them.</span>
              </div>
            )}
          </section>

          <section className="policy-card wide p-4">
            <div className="policy-top">
              <div>
                <strong>Target User Scope</strong>
                <p>Select departments, operating systems, or individual endpoint targets.</p>
              </div>
              <span className="user-pill info">{finalTargetCount} final target(s)</span>
            </div>

            <div className="row g-3 align-items-stretch">
              <div className="col-12 col-xl-3">
                <section className="resource-form-card p-4 h-100">
                  <div className="resource-card-head mb-3">
                    <div>
                      <h4>Scope Selection</h4>
                      <p>Choose the grouping method and target scope.</p>
                    </div>
                  </div>

                  <div className="content-actions mb-3 justify-content-start">
                    <button
                      type="button"
                      className={cx("soft-btn", targetView === "organization" && "active")}
                      onClick={() => switchTargetView("organization")}
                    >
                      Organization
                    </button>
                    <button
                      type="button"
                      className={cx("soft-btn", targetView === "os" && "active")}
                      onClick={() => switchTargetView("os")}
                    >
                      Operating System
                    </button>
                  </div>

                  {targetView === "organization" && (
                    <label className="inline-check">
                      <input
                        type="checkbox"
                        checked={includeLowerDepartment}
                        onChange={(event) => {
                          setIncludeLowerDepartment(event.target.checked);
                          setTargetPage(1);
                        }}
                      />
                      <span>Include Lower Department</span>
                    </label>
                  )}

                  <div className="policy-list gap-3 mt-3">
                    {scopeGroups.length > 0 ? (
                      scopeGroups.map((scope) => (
                        <label key={scope.id} className="inline-check">
                          <input
                            type="checkbox"
                            checked={selectedScopes.has(scope.id)}
                            onChange={() => toggleScope(scope.id)}
                          />
                          <div className="flex-grow-1">
                            <strong>{scope.name}</strong>
                            <span>{scope.type}</span>
                          </div>
                          <em className="user-pill info">{scope.count}</em>
                        </label>
                      ))
                    ) : (
                      <div className="settings-helper-card">
                        <Search size={20} />
                        <strong>No target scope</strong>
                        <span>No devices are available for this scope.</span>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <div className="col-12 col-xl-6">
                <section className="resource-table-card p-4 h-100">
                  <div className="resource-card-head mb-3">
                    <div>
                      <h4>Endpoint Targets</h4>
                      <p>Refine devices before deployment.</p>
                    </div>
                    <button type="button" className="soft-btn" onClick={clearTargetSelection}>
                      Clear Selection
                    </button>
                  </div>

                  <div className="policy-list gap-3 mb-3">
                    <label className="section-search">
                      <Search size={15} />
                      <input
                        value={targetSearch}
                        onChange={(event) => {
                          setTargetSearch(event.target.value);
                          setTargetPage(1);
                        }}
                        placeholder="Search user, IP, department"
                      />
                      {targetSearch && (
                        <button type="button" className="mini-btn icon-only" onClick={() => setTargetSearch("")}>
                          <X size={13} />
                        </button>
                      )}
                    </label>

                    <div className="uam-filter-grid clean compact">
                      <select
                        className="setting-select"
                        value={targetStatusFilter}
                        onChange={(event) => {
                          setTargetStatusFilter(event.target.value as "All" | "Online" | "Offline");
                          setTargetPage(1);
                        }}
                      >
                        <option value="All">All status</option>
                        <option value="Online">Online</option>
                        <option value="Offline">Offline</option>
                      </select>

                      <select
                        className="setting-select"
                        value={targetOsFilter}
                        onChange={(event) => {
                          setTargetOsFilter(event.target.value);
                          setTargetPage(1);
                        }}
                      >
                        <option value="All">All OS</option>
                        {osOptions.map((os) => (
                          <option key={os} value={os}>
                            {os}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="resource-table-wrap">
                    <table className="resource-table">
                      <thead>
                        <tr>
                          <th>
                            <input
                              type="checkbox"
                              checked={allTargetPageSelected}
                              onChange={toggleSelectTargetPage}
                            />
                          </th>
                          <th>User / Device</th>
                          <th>Department</th>
                          <th>IP Address</th>
                          <th>OS</th>
                          <th>Status</th>
                          <th>Exclude</th>
                        </tr>
                      </thead>

                      <tbody>
                        {targetPageRows.map((device) => (
                          <tr key={device.id} className={includedTargetIds.has(device.id) ? "included" : ""}>
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedDevices.has(device.id)}
                                onChange={() => toggleManualUser(device.id)}
                              />
                            </td>
                            <td>
                              <strong>{device.name}</strong>
                              <small>{device.id} • {device.objectAgent || "-"}</small>
                            </td>
                            <td>{device.department}</td>
                            <td>{device.ip}</td>
                            <td>{device.os}</td>
                            <td>
                              <span className={cx("user-pill", device.status === "Online" ? "active" : "inactive")}>
                                {device.status}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                className={cx("mini-btn", excludedDevices.has(device.id) && "active")}
                                onClick={() => toggleExcludedUser(device.id)}
                              >
                                {excludedDevices.has(device.id) ? "Excluded" : "Exclude"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <CompactPagination
                    currentPage={targetPage}
                    totalPages={targetTotalPages}
                    className="resource-pagination"
                    ariaLabel="Target device pagination"
                    onPageChange={setTargetPage}
                  />
                </section>
              </div>

              <div className="col-12 col-xl-3">
                <section className="policy-card p-4 h-100">
                  <div className="policy-top">
                    <div>
                      <strong>Deployment Review</strong>
                      <p>Confirm targets and deployment options.</p>
                    </div>
                  </div>

                  <div className="pricing-grid gap-3">
                    <div className="score-box is-compact">
                      <span>Final Target</span>
                      <strong>{finalTargetCount}</strong>
                      <small>Ready to receive package</small>
                    </div>
                    <div className="score-box is-compact">
                      <span>Scopes</span>
                      <strong>{selectedScopeCount}</strong>
                      <small>Selected groups</small>
                    </div>
                    <div className="score-box is-compact">
                      <span>Manual</span>
                      <strong>{manualUserCount}</strong>
                      <small>Direct devices</small>
                    </div>
                    <div className="score-box is-compact">
                      <span>Excluded</span>
                      <strong>{excludedUserCount}</strong>
                      <small>Skipped targets</small>
                    </div>
                  </div>

                  <div className="pricing-grid gap-3 mt-3">
                    <div className="settings-helper-card">
                      <strong>Included Preview</strong>
                      <span>
                        {includedTargetList.slice(0, 3).map((device) => device.name).join(", ") ||
                          "No users selected"}
                        {includedTargetList.length > 3 ? ` +${includedTargetList.length - 3} more` : ""}
                      </span>
                    </div>

                    <div className="settings-helper-card">
                      <strong>Excluded Preview</strong>
                      <span>
                        {excludedTargetList.slice(0, 3).map((device) => device.name).join(", ") ||
                          "No excluded users"}
                        {excludedTargetList.length > 3 ? ` +${excludedTargetList.length - 3} more` : ""}
                      </span>
                    </div>
                  </div>

                  <div className="content-actions justify-content-start gap-2 mt-3">
                    <button
                      type="button"
                      className={cx("soft-btn", scheduleType === "now" && "active")}
                      onClick={() => setScheduleType("now")}
                    >
                      Send Now
                    </button>
                    <button
                      type="button"
                      className={cx("soft-btn", scheduleType === "schedule" && "active")}
                      onClick={() => setScheduleType("schedule")}
                    >
                      Schedule
                    </button>
                  </div>

                  {scheduleType === "schedule" && (
                    <label className="form-field mt-3">
                      <span>Schedule Time</span>
                      <input className="setting-input" type="datetime-local" />
                    </label>
                  )}

                  <div className="policy-list gap-3 mt-3">
                    <label className="inline-check">
                      <input type="checkbox" defaultChecked />
                      <span>Force installation</span>
                    </label>
                    <label className="inline-check">
                      <input type="checkbox" />
                      <span>Reboot after installation</span>
                    </label>
                    <label className="inline-check">
                      <input type="checkbox" defaultChecked />
                      <span>Notify user</span>
                    </label>
                  </div>

                  <div className="settings-helper-card p-3 mt-3">
                    <span>Deployment Summary</span>
                    <strong>
                      {packages.length} package(s) • {finalTargetCount} target(s)
                    </strong>
                    <p>
                      Excluded: {excludedUserCount} • {totalTargetCount} available target(s)
                    </p>
                  </div>
                </section>
              </div>
            </div>
          </section>
        </div>

        <div className="user-modal-foot">
          <button type="button" className="soft-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="primary-btn"
            disabled={finalTargetCount === 0}
            onClick={() => onDeploy(includedTargetList, method, scheduleType)}
          >
            Deploy {packages.length > 1 ? "Packages" : "Package"}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return deployModalNode;
  return createPortal(deployModalNode, document.body);
}

function DeletePackageModal({
  packages,
  onClose,
  onDelete,
}: {
  packages: PackageRecord[];
  onClose: () => void;
  onDelete: () => void;
}) {
  const [confirm, setConfirm] = useState("");

  return (
    <div className="user-modal-backdrop open" onMouseDown={onClose}>
      <div className="user-modal role-delete-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="user-modal-head">
          <div>
            <h3>{packages.length > 1 ? "Delete Packages" : "Delete Package"}</h3>
            <p>
              {packages.length > 1
                ? `${packages.length} packages selected`
                : packages[0]?.name}
            </p>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="user-modal-body">
          <div className="settings-inline-alert">
            <Trash2 size={18} />
            <div>
              <strong>Confirm delete action</strong>
              <span>This removes the selected item from Software Distribution.</span>
            </div>
          </div>

          <div className="policy-list wide">
            {packages.map((item) => (
              <div key={item.id}>
                <strong>{item.name}</strong>
                <span>{item.version} • {item.status}</span>
              </div>
            ))}
          </div>

          <label className="form-field">
            <span>Type delete to confirm</span>
            <input className="setting-input" value={confirm} onChange={(event) => setConfirm(event.target.value)} />
          </label>
        </div>

        <div className="user-modal-foot">
          <button type="button" className="soft-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="danger-btn"
            disabled={confirm.toLowerCase() !== "delete"}
            onClick={onDelete}
          >
            Delete {packages.length > 1 ? "Packages" : "Package"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SoftwareDistribution() {
  const [packages, setPackages] = useState<PackageRecord[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | PackageStatus>("all");
  const [sortKey, setSortKey] = useState<SortKey>("registeredDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [treeVisibleCount, setTreeVisibleCount] = useState(TREE_PAGE_SIZE);
  const [modal, setModal] = useState<ModalState>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [targetDevices, setTargetDevices] = useState<TargetDevice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [openTreeMenuId, setOpenTreeMenuId] = useState<string | null>(null);
  const [openVersionMenuId, setOpenVersionMenuId] = useState<string | null>(null);
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);

  const loadSoftwareDistributionData = async () => {
    setIsLoading(true);
    setOpenTreeMenuId(null);
    setOpenVersionMenuId(null);
    setOpenRowMenuId(null);
    try {
      const [apiPackages, apiTargets] = await Promise.all([
        fetchPackagesFromApi(),
        fetchTargetsFromApi(),
      ]);

      setPackages(apiPackages);
      setTargetDevices(apiTargets);
      setApiError(null);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Unable to load Software Distribution data.";
      setPackages([]);
      setTargetDevices([]);
      setApiError(message);
      showToast({
        type: "error",
        title: "Connection failed",
        message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    document.documentElement.classList.add("ema-layout-lock");
    document.body.classList.add("ema-layout-lock");

    return () => {
      document.documentElement.classList.remove("ema-layout-lock");
      document.body.classList.remove("ema-layout-lock");
    };
  }, []);

  useEffect(() => {
    loadSoftwareDistributionData();
  }, []);

  useEffect(() => {
    setTreeVisibleCount(TREE_PAGE_SIZE);
  }, [searchTerm, statusFilter, sortKey, sortDirection, packages.length]);


  const selectedPackage = packages.find((item) => item.id === selectedPackageId) || null;
  const selectedPackages = packages.filter((item) => selectedIds.has(item.id));

  const summary = useMemo(() => {
    return {
      total: packages.length,
      ready: packages.filter((item) => item.status === "Ready").length,
      deployed: packages.filter((item) => item.status === "Deployed").length,
      draft: packages.filter((item) => item.status === "Draft").length,
      targets: packages.reduce((sum, item) => sum + item.targetCount, 0),
    };
  }, [packages]);

  const filteredPackages = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    const rows = packages.filter((item) => {
      const searchable = [
        item.name,
        item.version,
        item.description,
        item.status,
        item.owner,
        item.destinationDirectory,
        item.registeredDate,
        deliveryMethodLabels[item.lastDeliveryMethod],
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !keyword || searchable.includes(keyword);
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    rows.sort((a, b) => {
      const first = String(a[sortKey]).toLowerCase();
      const second = String(b[sortKey]).toLowerCase();

      if (first < second) return sortDirection === "asc" ? -1 : 1;
      if (first > second) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return rows;
  }, [packages, searchTerm, statusFilter, sortKey, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredPackages.length / PAGE_SIZE));
  const pageRows = filteredPackages.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const treePackages = filteredPackages;
  const treeRows = treePackages.slice(0, treeVisibleCount);
  const hasMoreTreeRows = treeVisibleCount < treePackages.length;
  const deployablePageRows = pageRows.filter(isDeployable);
  const allPageSelected =
    deployablePageRows.length > 0 && deployablePageRows.every((item) => selectedIds.has(item.id));
  const somePageSelected = deployablePageRows.some((item) => selectedIds.has(item.id));

  const showToast = (nextToast: ToastState) => {
    setToast(nextToast);
    if (nextToast) {
      window.setTimeout(() => {
        setToast((current) => (current === nextToast ? null : current));
      }, 2400);
    }
  };

  const resetFilters = () => {
    setOpenTreeMenuId(null);
    setOpenVersionMenuId(null);
    setOpenRowMenuId(null);
    setSearchTerm("");
    setStatusFilter("all");
    setSortKey("registeredDate");
    setSortDirection("desc");
    setPage(1);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectPage = () => {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (allPageSelected) {
        deployablePageRows.forEach((item) => next.delete(item.id));
      } else {
        deployablePageRows.forEach((item) => next.add(item.id));
      }

      return next;
    });
  };

  const createPackage = async (payload: CreatePackagePayload) => {
    try {
      await createPackageViaApi(payload);
      await loadSoftwareDistributionData();
      setModal(null);
      showToast({
        type: "success",
        title: "Created successfully",
        message: "Package created successfully.",
      });
    } catch (error) {
      console.error(error);
      showToast({
        type: "error",
        title: "Create failed",
        message: error instanceof Error ? error.message : "Unable to create package.",
      });
    }
  };

  const deployPackages = async (
    selectedTargets: TargetDevice[],
    method: DeliveryMethod,
    scheduleType: "now" | "schedule"
  ) => {
    const packageIds = modal?.type === "send" ? modal.packageIds : [];
    const selectedPackageRows = packages.filter((item) => packageIds.includes(item.id));

    try {
      await deployPackagesViaApi(selectedPackageRows, selectedTargets, method, scheduleType);

      await loadSoftwareDistributionData();

      setSelectedIds(new Set());
      setModal(null);
      showToast({
        type: "success",
        title: "Deployment queued",
        message: `${packageIds.length} package(s) queued to ${selectedTargets.length} target(s).`,
      });
    } catch (error) {
      console.error(error);
      showToast({
        type: "error",
        title: "Deploy failed",
        message: error instanceof Error ? error.message : "Unable to deploy package.",
      });
    }
  };

  const deletePackages = async () => {
    if (modal?.type !== "delete") return;

    const packageIds = modal.packageIds;
    const rowsToDelete = packages.filter((item) => packageIds.includes(item.id));

    if (!rowsToDelete.length) {
      setModal(null);
      return;
    }

    try {
      const deletedNames = new Set(rowsToDelete.map((item) => item.name.toLowerCase()));
      await Promise.all(rowsToDelete.map((item) => deletePackageViaApi(item.name)));
      await loadSoftwareDistributionData();

      setPackages((current) =>
        current.filter(
          (item) => !packageIds.includes(item.id) && !deletedNames.has(item.name.toLowerCase())
        )
      );
      setOpenTreeMenuId(null);
    setOpenVersionMenuId(null);
    setOpenRowMenuId(null);
      setExpandedIds((current) => {
        const next = new Set(current);
        packageIds.forEach((id) => next.delete(id));
        return next;
      });

      if (selectedPackageId && packageIds.includes(selectedPackageId)) setSelectedPackageId(null);
      setSelectedIds(new Set());
      setModal(null);
      showToast({
        type: "success",
        title: "Deleted successfully",
        message: rowsToDelete.length > 1 ? "Packages deleted successfully." : "Package deleted successfully.",
      });
    } catch (error) {
      console.error(error);
      showToast({
        type: "error",
        title: "Delete failed",
        message: error instanceof Error ? error.message : "Unable to delete package.",
      });
    }
  };

  const deletePackageVersion = async () => {
    if (modal?.type !== "deleteVersion") return;

    const row = packages.find((item) => item.id === modal.packageId);
    if (!row) return;

    try {
      await deletePackageVersionViaApi(row.name, modal.version);
      await loadSoftwareDistributionData();

      setPackages((current) => current.filter((item) => {
        if (item.id !== row.id) return true;
        const remainingVersions = item.versions.filter((version) => version !== modal.version);
        return remainingVersions.length > 0;
      }));

      setOpenTreeMenuId(null);
      setOpenVersionMenuId(null);
      setOpenRowMenuId(null);
      if (selectedPackageId === row.id) setSelectedPackageId(null);
      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(row.id);
        return next;
      });
      setModal(null);
      showToast({
        type: "success",
        title: "Deleted successfully",
        message: "Version deleted successfully.",
      });
    } catch (error) {
      console.error(error);
      showToast({
        type: "error",
        title: "Delete failed",
        message: error instanceof Error ? error.message : "Unable to delete version.",
      });
    }
  };

  const exportCsv = () => {
    const headers = [
      "Package Name",
      "Version",
      "Status",
      "Delivery Method",
      "Destination Directory",
      "Owner",
      "Registered Date",
      "Files",
      "Size Before",
      "Size After",
      "Targets",
    ];

    const rows = filteredPackages.map((item) => [
      item.name,
      item.version,
      item.status,
      deliveryMethodLabels[item.lastDeliveryMethod],
      item.destinationDirectory,
      item.owner,
      item.registeredDate,
      item.fileCount,
      item.sizeBeforeCompression,
      item.sizeAfterCompression,
      item.targetCount,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `software-distribution-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const SortButton = ({ label, columnKey }: { label: string; columnKey: SortKey }) => (
    <button type="button" className="resource-sort-button" onClick={() => handleSort(columnKey)}>
      <span>{label}</span>
      <i>{sortKey === columnKey ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</i>
    </button>
  );

  return (
    <div className="settings-module-root ema-settings-pro" data-section="software-distribution">
      {toast && (
        <div className={cx("settings-toast", `settings-toast-${toast.type}`)}>
          <CheckCircle2 className="settings-toast-icon" size={18} />
          <div>
            <strong>{toast.title}</strong>
            <span>{toast.message}</span>
          </div>
          <button type="button" className="settings-toast-close" onClick={() => setToast(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className="settings-layout">
        <aside className="settings-menu ema-panel-surface">
          <div className="panel-head">
            <span>EMA / Software Distribution</span>
            <strong>Package Library</strong>
            <small>Browse packages and available versions.</small>
          </div>

          <div className="settings-menu-list">
            {/* <button
              type="button"
              className="primary-btn"
              onClick={() => {
                setOpenTreeMenuId(null);
                setOpenVersionMenuId(null);
                setOpenRowMenuId(null);
                setModal({ type: "new" });
              }}
            >
              <Plus size={14} />
              New Package
            </button> */}

            <label className="section-search">
              <Search size={15} />
              <input
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setPage(1);
                }}
                placeholder="Search package"
              />
              {searchTerm && (
                <button type="button" className="mini-btn" onClick={() => setSearchTerm("")}>
                  <X size={13} />
                </button>
              )}
            </label>

            {treeRows.map((item) => {
              const isExpanded = expandedIds.has(item.id);
              const isSelected = selectedPackageId === item.id;

              return (
                <div key={item.id}>
                  <button
                    type="button"
                    className={cx("setting-btn", isSelected && "active")}
                    title="Click to expand or collapse versions"
                    onClick={() => {
                      setSelectedPackageId(item.id);
                      setOpenTreeMenuId(null);
                      setOpenVersionMenuId(null);
                      setOpenRowMenuId(null);
                      toggleExpand(item.id);
                    }}
                  >
                    <span className="setting-icon">
                      {isExpanded ? <FolderOpen size={15} /> : <FolderClosed size={15} />}
                    </span>
                    <span>
                      <strong>{item.name}</strong>
                      <small>{isExpanded ? "Versions expanded" : "Click to expand versions"}</small>
                    </span>
                  </button>

                  {openTreeMenuId === item.id && (
                    <div className="settings-helper-card">
                      <div className="content-actions">
                        <button
                          type="button"
                          className="soft-btn"
                          onClick={() => {
                            setOpenTreeMenuId(null);
                            setOpenVersionMenuId(null);
                            setOpenRowMenuId(null);
                            setModal({ type: "new" });
                          }}
                        >
                          <Plus size={13} />
                          New
                        </button>
                        <button
                          type="button"
                          className="primary-btn"
                          onClick={() => {
                            setOpenTreeMenuId(null);
                            setOpenVersionMenuId(null);
                            setOpenRowMenuId(null);
                            setModal({ type: "send", packageIds: [item.id] });
                          }}
                          disabled={!isDeployable(item)}
                        >
                          <Send size={13} />
                          Deploy
                        </button>
                        <button
                          type="button"
                          className="danger-btn"
                          onClick={() => {
                            setOpenTreeMenuId(null);
                            setOpenVersionMenuId(null);
                            setOpenRowMenuId(null);
                            setModal({ type: "delete", packageIds: [item.id] });
                          }}
                        >
                          <Trash2 size={13} />
                          Delete
                        </button>
                      </div>
                    </div>
                  )}

                  {isExpanded && (
                    <div className="policy-list">
                      {item.versions.map((version) => {
                        const versionMenuId = `${item.id}::${version}`;

                        return (
                          <div className="settings-helper-card" key={version}>
                            <div className="content-actions">
                              <button
                                type="button"
                                className={cx("soft-btn", selectedPackageId === item.id && "active")}
                                onClick={() => {
                                  setSelectedPackageId(item.id);
                                  setOpenTreeMenuId(null);
                                  setOpenVersionMenuId(null);
                                  setOpenRowMenuId(null);
                                }}
                              >
                                <FileText size={13} />
                                {version}
                              </button>
                              <button
                                type="button"
                                className="mini-btn"
                                title="Version actions"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setOpenTreeMenuId(null);
                                  setOpenRowMenuId(null);
                                  setOpenVersionMenuId((current) =>
                                    current === versionMenuId ? null : versionMenuId
                                  );
                                }}
                              >
                                <MoreVertical size={14} />
                              </button>
                            </div>

                            {openVersionMenuId === versionMenuId && (
                              <div className="content-actions">
                                <button
                                  type="button"
                                  className="soft-btn"
                                  onClick={() => {
                                    setSelectedPackageId(item.id);
                                    setOpenVersionMenuId(null);
                                    setOpenTreeMenuId(null);
                                    setOpenRowMenuId(null);
                                  }}
                                >
                                  <FileText size={13} />
                                  View details
                                </button>
                                <button
                                  type="button"
                                  className="danger-btn"
                                  onClick={() => {
                                    setOpenVersionMenuId(null);
                                    setOpenTreeMenuId(null);
                                    setOpenRowMenuId(null);
                                    setModal({ type: "deleteVersion", packageId: item.id, version });
                                  }}
                                >
                                  <Trash2 size={13} />
                                  Delete version
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {hasMoreTreeRows && (
              <div className="settings-helper-card">
                <div className="content-actions">
                  <button
                    type="button"
                    className="soft-btn"
                    onClick={() =>
                      setTreeVisibleCount((current) =>
                        Math.min(current + TREE_PAGE_SIZE, treePackages.length)
                      )
                    }
                  >
                    Load more packages
                  </button>
                </div>
              </div>
            )}

            {hasMoreTreeRows && (
              <button
                type="button"
                className="soft-btn"
                onClick={() =>
                  setTreeVisibleCount((current) =>
                    Math.min(current + TREE_PAGE_SIZE, treePackages.length)
                  )
                }
              >
                Load more packages
              </button>
            )}
          </div>
        </aside>

        <section className="settings-content">
          <section className="settings-hero ema-hero-kpi-right">
            <div>
              <span className="eyebrow">Software Distribution</span>
              <h2>Package Registry</h2>
              <p>Prepare, organise and deploy software packages to selected target devices.</p>
            </div>

            <div className="settings-score ema-kpi-right-pair">
              <button type="button" className="score-box is-info" onClick={resetFilters}>
                <span>Total Packages</span>
                <strong>{summary.total}</strong>
                <small>All registered packages</small>
              </button>
              <button
                type="button"
                className="score-box is-success"
                onClick={() => {
                  setStatusFilter("Ready");
                  setPage(1);
                }}
              >
                <span>Ready</span>
                <strong>{summary.ready}</strong>
                <small>Available for deployment</small>
              </button>
              <button
                type="button"
                className="score-box is-info"
                onClick={() => {
                  setStatusFilter("Deployed");
                  setPage(1);
                }}
              >
                <span>Deployed</span>
                <strong>{summary.deployed}</strong>
                <small>Already delivered</small>
              </button>
              <button
                type="button"
                className="score-box is-warning"
                onClick={() => {
                  setStatusFilter("Draft");
                  setPage(1);
                }}
              >
                <span>Draft</span>
                <strong>{summary.draft}</strong>
                <small>Pending completion</small>
              </button>
            </div>
          </section>

          <main className="content-shell content-panel clean">
            <div className="content-head">
              <div>
                <h3>Package Registry</h3>
                <p>
                  Showing {filteredPackages.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}-
                  {Math.min(page * PAGE_SIZE, filteredPackages.length)} of {filteredPackages.length}
                </p>
              </div>

              <div className="content-actions">
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => {
                    setOpenTreeMenuId(null);
                    setOpenVersionMenuId(null);
                    setOpenRowMenuId(null);
                    setModal({ type: "new" });
                  }}
                >
                  <Plus size={14} />
                  New Package
                </button>
                <button type="button" className="soft-btn" onClick={exportCsv} title="Export CSV">
                  <Download size={16} />
                  Export
                </button>
              </div>
            </div>

            <div className="content-toolbar users-toolbar">
              <label className="section-search user-search-inline">
                <Search size={15} />
                <input
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search package or owner"
                />
                {searchTerm && (
                  <button type="button" className="mini-btn" onClick={() => setSearchTerm("")}>
                    <X size={13} />
                  </button>
                )}
              </label>

              <select
                className="setting-select"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value as "all" | PackageStatus);
                  setPage(1);
                }}
              >
                <option value="all">All status</option>
                <option value="Ready">Ready</option>
                <option value="Draft">Draft</option>
                <option value="Deployed">Deployed</option>
                <option value="Archived">Archived</option>
              </select>
            </div>

            {apiError && (
              <div className="settings-inline-alert">
                <Server size={18} />
                <div>
                  <strong>Data unavailable</strong>
                  <span>Please refresh the page or try again later.</span>
                </div>
              </div>
            )}

            {selectedPackages.length > 0 && (
              <div className="settings-helper-card">
                <strong>{selectedPackages.length} package(s) selected</strong>
                <span>Bulk deployment uses one target scope and one schedule.</span>
                <div className="content-actions">
                  <button type="button" className="soft-btn" onClick={() => setSelectedIds(new Set())}>
                    Clear
                  </button>
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() => setModal({ type: "send", packageIds: selectedPackages.map((item) => item.id) })}
                  >
                    <Send size={15} />
                    Deploy Selected
                  </button>
                  <button
                    type="button"
                    className="danger-btn"
                    onClick={() => setModal({ type: "delete", packageIds: selectedPackages.map((item) => item.id) })}
                  >
                    <Trash2 size={15} />
                    Delete Selected
                  </button>
                </div>
              </div>
            )}

            <div className="pricing-table-card">
              <table className="table">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        ref={(input) => {
                          if (input) input.indeterminate = !allPageSelected && somePageSelected;
                        }}
                        onChange={toggleSelectPage}
                        disabled={!deployablePageRows.length}
                      />
                    </th>
                    <th>#</th>
                    <th><SortButton label="Package Name" columnKey="name" /></th>
                    <th><SortButton label="Version" columnKey="version" /></th>
                    <th><SortButton label="Status" columnKey="status" /></th>
                    <th><SortButton label="Targets" columnKey="targetCount" /></th>
                    <th><SortButton label="Owner" columnKey="owner" /></th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {pageRows.map((item, index) => {
                    const canSelect = isDeployable(item);

                    return (
                      <tr
                        key={item.id}
                        onClick={() => {
                          setSelectedPackageId(item.id);
                          setOpenTreeMenuId(null);
                          setOpenVersionMenuId(null);
                          setOpenRowMenuId(null);
                        }}
                      >
                        <td onClick={(event) => event.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(item.id)}
                            disabled={!canSelect}
                            title={canSelect ? "Select package" : "Archived packages cannot be selected"}
                            onChange={() => toggleSelected(item.id)}
                          />
                        </td>
                        <td><span className="row-index-pill">{(page - 1) * PAGE_SIZE + index + 1}</span></td>
                        <td>
                          <div className="user-name">
                            <span className="user-mini-avatar"><Package size={15} /></span>
                            <div>
                              <strong>{item.name}</strong>
                              <small>{item.description}</small>
                            </div>
                          </div>
                        </td>
                        <td>{item.version}</td>
                        <td>
                          <span className={cx("user-pill", statusPillClass(item.status))}>
                            {item.status}
                          </span>
                        </td>
                        <td>{item.targetCount}</td>
                        <td>{item.owner}</td>
                        <td onClick={(event) => event.stopPropagation()}>
                          <button
                            type="button"
                            className="primary-btn"
                            disabled={!canSelect}
                            title={canSelect ? "Deploy package" : "Archived packages cannot be deployed"}
                            onClick={() => {
                              setOpenTreeMenuId(null);
                              setOpenVersionMenuId(null);
                              setOpenRowMenuId(null);
                              setSelectedIds(new Set());
                              setModal({ type: "send", packageIds: [item.id] });
                            }}
                          >
                            <Send size={13} />
                            Deploy
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <CompactPagination
              currentPage={page}
              totalPages={totalPages}
              ariaLabel="Package registry pagination"
              onPageChange={setPage}
            />
          </main>
        </section>
      </div>

      {selectedPackage && (
        <div className="user-modal-backdrop open" onMouseDown={() => setSelectedPackageId(null)}>
          <aside className="user-modal advanced w-75" onMouseDown={(event) => event.stopPropagation()}>
            <div className="user-modal-head">
              <div className="user-name">
                <span className="user-mini-avatar"><Package size={18} /></span>
                <div>
                  <h3>{selectedPackage.name}</h3>
                  <p>{selectedPackage.version} • {selectedPackage.status} • {selectedPackage.owner}</p>
                </div>
              </div>

              <button type="button" className="modal-close" onClick={() => setSelectedPackageId(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="user-modal-body content-body gap-3">
              <section className="wide audit-kpi-strip gap-3">
                <div className="score-box"><span>Status:</span><strong>{selectedPackage.status}</strong><small>Current package state</small></div>
                <div className="score-box"><span>Delivery Method:</span><strong>{deliveryMethodLabels[selectedPackage.lastDeliveryMethod]}</strong><small>Last selected channel</small></div>
                <div className="score-box"><span>Targets:</span><strong>{selectedPackage.targetCount}</strong><small>Total assigned devices</small></div>
                <div className="score-box"><span>Package Size:</span><strong>{selectedPackage.sizeAfterCompression}</strong><small>After compression</small></div>
              </section>

              <section className="policy-card wide p-4">
                <div className="pricing-top"><div><h4>Basic Information</h4><p>Package identity and ownership details</p></div></div>
                <div className="pricing-grid gap-3">
                  <label className="form-field"><span>Package Name:</span><strong>{selectedPackage.name}</strong></label>
                  <label className="form-field"><span>Version:</span><strong>{selectedPackage.version}</strong></label>
                  <label className="form-field"><span>Owner:</span><strong>{selectedPackage.owner}</strong></label>
                  <label className="form-field"><span>Registered Date:</span><strong>{formatDate(selectedPackage.registeredDate)}</strong></label>
                  <label className="form-field wide"><span>Destination Directory:</span><strong>{selectedPackage.destinationDirectory}</strong></label>
                  <label className="form-field wide"><span>Description:</span><strong>{selectedPackage.description}</strong></label>
                </div>
              </section>

              <section className="policy-card wide p-4">
                <div className="pricing-top"><div><h4>Package Details</h4><p>Files, compression and execution scope</p></div></div>
                <div className="pricing-grid gap-3">
                  <label className="form-field"><span>Files:</span><strong>{selectedPackage.fileCount}</strong></label>
                  <label className="form-field"><span>Versions:</span><strong>{selectedPackage.versions.join(", ")}</strong></label>
                  <label className="form-field"><span>Before Compression:</span><strong>{selectedPackage.sizeBeforeCompression}</strong></label>
                  <label className="form-field"><span>After Compression:</span><strong>{selectedPackage.sizeAfterCompression}</strong></label>
                  <label className="form-field"><span>Remote Execute File:</span><strong>{selectedPackage.remoteExecuteFile}</strong></label>
                  <label className="form-field"><span>Exclude OS:</span><strong>{selectedPackage.excludeOS}</strong></label>
                </div>
              </section>

              <section className="policy-card wide p-4">
                <div className="pricing-top"><div><h4>Last Deployment</h4><p>Read-only deployment reference</p></div></div>
                <div className="pricing-grid gap-3">
                  <label className="form-field"><span>Last Method:</span><strong>{deliveryMethodLabels[selectedPackage.lastDeliveryMethod]}</strong></label>
                  <label className="form-field"><span>Last Deployment:</span><strong>{formatDate(selectedPackage.lastDeployment)}</strong></label>
                </div>
              </section>
            </div>

            <div className="user-modal-foot">
              <button type="button" className="soft-btn" onClick={() => setSelectedPackageId(null)}>
                Close
              </button>
              <button
                type="button"
                className="primary-btn"
                disabled={!isDeployable(selectedPackage)}
                onClick={() => {
                  const packageId = selectedPackage.id;
                  setSelectedPackageId(null);
                  setModal({ type: "send", packageIds: [packageId] });
                }}
              >
                <Send size={14} />
                Deploy Package
              </button>
            </div>
          </aside>
        </div>
      )}

      {modal?.type === "new" && (
        <NewPackageModal onClose={() => setModal(null)} onCreate={createPackage} />
      )}

      {modal?.type === "send" && (
        <DeployPackageModal
          packages={packages.filter((item) => modal.packageIds.includes(item.id))}
          targetDevices={targetDevices}
          onClose={() => setModal(null)}
          onDeploy={deployPackages}
        />
      )}

      {modal?.type === "delete" && (
        <DeletePackageModal
          packages={packages.filter((item) => modal.packageIds.includes(item.id))}
          onClose={() => setModal(null)}
          onDelete={deletePackages}
        />
      )}

      {modal?.type === "deleteVersion" && (
        <DeletePackageModal
          packages={packages
            .filter((item) => item.id === modal.packageId)
            .map((item) => ({ ...item, version: modal.version, versions: [modal.version] }))}
          onClose={() => setModal(null)}
          onDelete={deletePackageVersion}
        />
      )}
    </div>
  );
}
