import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Download,
  Loader2,
  RefreshCw,
  Search,
  Square,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

type AppButtonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "danger"
  | "warning"
  | "info"
  | "light"
  | "dark"
  | "outline-primary"
  | "outline-secondary"
  | "outline-success"
  | "outline-danger"
  | "outline-warning"
  | "outline-info"
  | "outline-light"
  | "outline-dark";

type AppButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: AppButtonVariant;
  loading?: boolean;
  leftIcon?: React.ReactNode;
};

function getGlobalButtonClass(variant: AppButtonVariant) {
  if (variant === "danger" || variant === "outline-danger") return "danger-btn";
  if (variant === "primary" || variant === "success" || variant === "info") return "primary-btn";
  return "soft-btn";
}

function AppButton({
  variant = "primary",
  loading = false,
  leftIcon,
  className = "",
  disabled,
  children,
  type = "button",
  ...props
}: AppButtonProps) {
  return (
    <button
      type={type}
      className={`${getGlobalButtonClass(variant)} ${className}`.trim()}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="task-spin" size={15} /> : leftIcon}
      <span>{children}</span>
    </button>
  );
}

type AppToastProps = {
  show: boolean;
  tone?: "success" | "error" | "info";
  title?: React.ReactNode;
  message: React.ReactNode;
  onClose: () => void;
};

function AppToast({ show, tone = "info", title, message, onClose }: AppToastProps) {
  if (!show) return null;

  const icon = tone === "success" ? "✓" : tone === "error" ? "!" : "i";

  return (
    <div className="settings-toast-layer task-toast-layer">
      <div className={`settings-toast settings-toast-${tone} task-toast task-toast-${tone}`} role="status" aria-live="polite">
        <div className="settings-toast-icon" aria-hidden="true">{icon}</div>
        <div>
          <strong>{title || "Notification"}</strong>
          <span>{message}</span>
        </div>
        <button type="button" className="settings-toast-close" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>
    </div>
  );
}

type AppPaginationProps = {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  showInfo?: boolean;
  showPageSize?: boolean;
  disabled?: boolean;
  className?: string;
  variant?: "compact" | string;
  onPageChange: (page: number) => void;
};

function AppPagination({
  currentPage,
  totalPages,
  totalItems = 0,
  pageSize = 10,
  showInfo = false,
  disabled = false,
  className = "",
  onPageChange,
}: AppPaginationProps) {
  const safeTotalPages = Math.max(totalPages, 1);
  const safeCurrentPage = clampPage(currentPage, safeTotalPages);
  const firstItem = totalItems ? (safeCurrentPage - 1) * pageSize + 1 : 0;
  const lastItem = totalItems ? Math.min(firstItem + pageSize - 1, totalItems) : 0;

  return (
    <div className={`uam-pagination global-style task-settings-pagination ${className}`.trim()}>
      <div className="uam-page-summary">
        {showInfo ? `Showing ${firstItem}-${lastItem} of ${totalItems}` : `Page ${safeCurrentPage} of ${safeTotalPages}`}
      </div>
      <div className="uam-pagination-controls global-style" aria-label="Task List pagination">
        <button className="uam-page-icon" type="button" onClick={() => onPageChange(1)} disabled={disabled || safeCurrentPage === 1} aria-label="First page">«</button>
        <button className="uam-page-icon" type="button" onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))} disabled={disabled || safeCurrentPage === 1} aria-label="Previous page">‹</button>
        <span className="uam-page-current">{safeCurrentPage}</span>
        <button className="uam-page-icon" type="button" onClick={() => onPageChange(Math.min(safeTotalPages, safeCurrentPage + 1))} disabled={disabled || safeCurrentPage === safeTotalPages} aria-label="Next page">›</button>
        <button className="uam-page-icon" type="button" onClick={() => onPageChange(safeTotalPages)} disabled={disabled || safeCurrentPage === safeTotalPages} aria-label="Last page">»</button>
      </div>
    </div>
  );
}

type AppModalProps = {
  show: boolean;
  size?: "sm" | "lg" | "xl";
  onHide: () => void;
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
};

function AppModal({ show, size, onHide, eyebrow, title, footer, children }: AppModalProps) {
  if (!show) return null;

  const sizeClass = size ? `modal-${size}` : "";

  return (
    <>
      <div className="modal-backdrop fade show" />
      <div className="modal fade show d-block app-modal task-confirm-modal" role="dialog" aria-modal="true" tabIndex={-1}>
        <div className={`modal-dialog modal-dialog-centered ${sizeClass}`.trim()}>
          <div className="modal-content">
            <div className="modal-header">
              <div>
                {eyebrow ? <div className="section-tag mb-1">{eyebrow}</div> : null}
                <h5 className="modal-title mb-0">{title}</h5>
              </div>
              <button type="button" className="btn-close" aria-label="Close" onClick={onHide} />
            </div>
            <div className="modal-body">{children}</div>
            {footer ? <div className="modal-footer">{footer}</div> : null}
          </div>
        </div>
      </div>
    </>
  );
}

type TaskState = string;

type SortKey = keyof Pick<
  TaskItem,
  | "id"
  | "classification"
  | "taskType"
  | "commandType"
  | "state"
  | "description"
  | "startTime"
  | "endTime"
  | "scheduledTime"
  | "orderedBy"
>;

type TaskItem = {
  id: number;
  jobId?: number;
  jobType?: number;
  jobStyle?: number;
  jobCommand?: number;
  jobStatus?: number;
  rawJobStatus?: number;
  effectiveJobStatus?: number;
  rawState?: string;
  effectiveStatusReason?: string;
  relatedStopJobId?: number;
  isTerminal?: boolean;
  isStopCommand?: boolean;
  isCancelCommand?: boolean;
  canStop?: boolean;
  canCancel?: boolean;
  canDelete?: boolean;
  actionDisabledReason?: string;
  classification: string;
  taskType: string;
  commandType: string;
  state: TaskState;
  description: string;
  startTime: string;
  endTime: string;
  scheduledTime: string;
  orderedBy: string;
  transferRate: number;
  completionRate: number;
  totalObjects: number;
  commandCompleted: number;
  taskCompleted: number;
  taskRunning: number;
  commandIncomplete: number;
  taskEnd: string;
  raw?: Record<string, unknown>;
};

type TargetItem = {
  id?: number;
  username: string;
  department: string;
  ipAddress: string;
  email: string;
  phoneNumber: string;
  lastConnection: string;
  objectRootIdn?: number;
  objectRelIdn?: number;
  objectDeviceID?: string;
  targetType?: string;
  raw?: Record<string, unknown>;
};

type TaskProgress = Pick<
  TaskItem,
  | "classification"
  | "startTime"
  | "transferRate"
  | "completionRate"
  | "totalObjects"
  | "commandCompleted"
  | "taskCompleted"
  | "taskRunning"
  | "commandIncomplete"
  | "taskEnd"
> & {
  jobId?: number;
  raw?: Record<string, unknown>;
};

type ProgressDetailItem = Record<string, unknown>;

type SelectOption = {
  code: number;
  label: string;
};

type TaskDetailPayload = {
  task: TaskItem;
  progress: TaskProgress;
  targets: TargetItem[];
  progressDetails: ProgressDetailItem[];
};

type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  totalRecords?: number;
  data: T;
  error?: string;
};

type ToastState = {
  type: "success" | "error" | "info";
  title: string;
  message: string;
} | null;

type TaskAction = "stop" | "cancel" | "delete";
type PendingAction = {
  action: TaskAction;
  task: TaskItem;
} | null;

const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || "http://localhost:3001").replace(/\/$/, "");

const fallbackClassifications: SelectOption[] = [
  { code: -1, label: "All" },
  { code: 10100, label: "Hardware Inventory" },
  { code: 10200, label: "Software Inventory" },
  { code: 10600, label: "Network Inventory" },
  { code: 10500, label: "Software Distribution" },
  { code: 10700, label: "Patching" },
  { code: 10300, label: "Application Metering" },
  { code: 11200, label: "Send Message" },
];

const fallbackStates: SelectOption[] = [
  { code: -1, label: "All" },
  { code: 2200, label: "Transferring" },
  { code: 2201, label: "Running" },
  { code: 2202, label: "Transferred" },
  { code: 2203, label: "Stop" },
  { code: 2204, label: "Cancelled" },
];

function getAuthToken() {
  return (
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("ema_access_token") ||
    ""
  );
}

async function requestJson<T>(path: string, options: Omit<RequestInit, "body"> & { body?: unknown } = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  let body = options.body as BodyInit | null | undefined;

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (body && typeof body !== "string" && !(body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body,
    credentials: "include",
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || payload?.error || `Request failed with status ${response.status}`);
  }

  return payload as T;
}

function normalizeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeString(value: unknown, fallback = "-") {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
}

function getStateClass(state: TaskState) {
  return `is-${String(state || "unknown").toLowerCase().replace(/\s+/g, "-")}`;
}


function normalizeBoolean(value: unknown, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const text = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y"].includes(text)) return true;
  if (["0", "false", "no", "n"].includes(text)) return false;
  return fallback;
}

function isTerminalState(state: unknown) {
  return ["transferred", "stop", "cancelled"].includes(String(state || "").trim().toLowerCase());
}

function canRunTaskAction(action: TaskAction, task: TaskItem | null) {
  if (!task) return false;
  if (action === "stop") return task.canStop !== false;
  if (action === "cancel") return task.canCancel !== false;
  if (action === "delete") return task.canDelete !== false;
  return false;
}

function getTaskActionDisabledTitle(action: TaskAction, task: TaskItem) {
  if (canRunTaskAction(action, task)) {
    if (action === "stop") return "Stop task";
    if (action === "cancel") return "Cancel task";
    return "Delete task";
  }

  return task.actionDisabledReason || "Action disabled because this task is already completed, stopped, or cancelled.";
}


function getSortValue(task: TaskItem, key: SortKey) {
  if (key === "id") return task.id;
  return String(task[key] ?? "").toLowerCase();
}

function normalizeTask(input: Partial<TaskItem> & Record<string, unknown>): TaskItem {
  const rawJobStatus = normalizeNumber(input.rawJobStatus ?? input.Raw_Job_Status ?? input.jobStatus ?? input.Job_Status, 0);
  const effectiveJobStatus = normalizeNumber(input.effectiveJobStatus ?? input.EffectiveJob_Status ?? input.jobStatus ?? input.Job_Status, rawJobStatus);
  const state = normalizeString(input.state);
  const isTerminal = normalizeBoolean(input.isTerminal, isTerminalState(state));
  const actionDisabledReason = normalizeString(
    input.actionDisabledReason ?? input.ActionDisabledReason,
    isTerminal ? "Action disabled because this task is already completed, stopped, or cancelled." : ""
  );

  return {
    id: normalizeNumber(input.id ?? input.jobId ?? input.Job_Idn, 0),
    jobId: normalizeNumber(input.jobId ?? input.id ?? input.Job_Idn, 0),
    jobType: normalizeNumber(input.jobType ?? input.Job_Type, 0),
    jobStyle: normalizeNumber(input.jobStyle ?? input.Job_Style, 0),
    jobCommand: normalizeNumber(input.jobCommand ?? input.Job_Command, 0),
    rawJobStatus,
    effectiveJobStatus,
    jobStatus: effectiveJobStatus,
    rawState: normalizeString(input.rawState ?? input.RawState, state),
    effectiveStatusReason: normalizeString(input.effectiveStatusReason ?? input.EffectiveStatusReason, ""),
    relatedStopJobId: normalizeNumber(input.relatedStopJobId ?? input.RelatedStopJob_Idn, 0),
    isTerminal,
    isStopCommand: normalizeBoolean(input.isStopCommand, false),
    isCancelCommand: normalizeBoolean(input.isCancelCommand, false),
    canStop: normalizeBoolean(input.canStop ?? input.CanStop, !isTerminal),
    canCancel: normalizeBoolean(input.canCancel ?? input.CanCancel, !isTerminal),
    canDelete: normalizeBoolean(input.canDelete ?? input.CanDelete, true),
    actionDisabledReason,
    classification: normalizeString(input.classification),
    taskType: normalizeString(input.taskType),
    commandType: normalizeString(input.commandType),
    state,
    description: normalizeString(input.description),
    startTime: normalizeString(input.startTime),
    endTime: normalizeString(input.endTime),
    scheduledTime: normalizeString(input.scheduledTime),
    orderedBy: normalizeString(input.orderedBy),
    transferRate: normalizeNumber(input.transferRate, 0),
    completionRate: normalizeNumber(input.completionRate, 0),
    totalObjects: normalizeNumber(input.totalObjects, 0),
    commandCompleted: normalizeNumber(input.commandCompleted, 0),
    taskCompleted: normalizeNumber(input.taskCompleted, 0),
    taskRunning: normalizeNumber(input.taskRunning, 0),
    commandIncomplete: normalizeNumber(input.commandIncomplete, 0),
    taskEnd: normalizeString(input.taskEnd),
    raw: input.raw as Record<string, unknown> | undefined,
  };
}

function normalizeTarget(input: Partial<TargetItem> & Record<string, unknown>, index: number): TargetItem {
  return {
    id: normalizeNumber(input.id ?? input.Object_Root_Idn ?? index + 1, index + 1),
    username: normalizeString(input.username ?? input.ComputerName ?? input.Object_DeviceID, `Target ${index + 1}`),
    department: normalizeString(input.department ?? input.Object_Full_Name ?? input.Object_Rel_Name),
    ipAddress: normalizeString(input.ipAddress ?? input.IP),
    email: normalizeString(input.email ?? input.Email),
    phoneNumber: normalizeString(input.phoneNumber ?? input.Phone),
    lastConnection: normalizeString(input.lastConnection ?? input.ConnectionTime),
    objectRootIdn: normalizeNumber(input.objectRootIdn ?? input.Object_Root_Idn, 0),
    objectRelIdn: normalizeNumber(input.objectRelIdn ?? input.Object_Rel_Idn, 0),
    objectDeviceID: normalizeString(input.objectDeviceID ?? input.Object_DeviceID, ""),
    targetType: normalizeString(input.targetType ?? input.TargetType, "client"),
    raw: input.raw as Record<string, unknown> | undefined,
  };
}

function normalizeProgress(input: Partial<TaskProgress> & Record<string, unknown>, fallbackTask?: TaskItem | null): TaskProgress {
  return {
    jobId: normalizeNumber(input.jobId ?? input.Job_Idn ?? fallbackTask?.id, fallbackTask?.id || 0),
    classification: normalizeString(input.classification, fallbackTask?.classification || "-"),
    startTime: normalizeString(input.startTime, fallbackTask?.startTime || "-"),
    transferRate: normalizeNumber(input.transferRate, fallbackTask?.transferRate || 0),
    completionRate: normalizeNumber(input.completionRate, fallbackTask?.completionRate || 0),
    totalObjects: normalizeNumber(input.totalObjects, fallbackTask?.totalObjects || 0),
    commandCompleted: normalizeNumber(input.commandCompleted, fallbackTask?.commandCompleted || 0),
    taskCompleted: normalizeNumber(input.taskCompleted, fallbackTask?.taskCompleted || 0),
    taskRunning: normalizeNumber(input.taskRunning, fallbackTask?.taskRunning || 0),
    commandIncomplete: normalizeNumber(input.commandIncomplete, fallbackTask?.commandIncomplete || 0),
    taskEnd: normalizeString(input.taskEnd, fallbackTask?.taskEnd || "-"),
    raw: input.raw as Record<string, unknown> | undefined,
  };
}

function readDetailValue(row: ProgressDetailItem, keys: string[], fallback = "-") {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== "") return String(value);
  }
  return fallback;
}

function resolveProgressStatus(row: ProgressDetailItem, states: SelectOption[]) {
  const raw = readDetailValue(row, ["statusLabel", "StatusLabel", "State", "state", "status"], "");
  if (raw) return raw;

  const code = Number(readDetailValue(row, ["EffectiveJob_Status", "effectiveJobStatus", "rowStatus", "Job_Status", "jobStatus"], "0"));
  return states.find((item) => item.code === code)?.label || (code ? `Status ${code}` : "-");
}

function buildQuery(params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== "All") {
      searchParams.set(key, String(value));
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

const pageSizeOptions = [10, 25, 50, 100];

function clampPage(page: number, totalPages: number) {
  return Math.min(Math.max(page, 1), Math.max(totalPages, 1));
}

function getTaskStateInsight(task: TaskItem | null) {
  if (!task) return "";

  if (task.effectiveStatusReason === "matched_later_stop_metering_job") {
    return `State is synced from stop metering command${task.relatedStopJobId ? ` #${task.relatedStopJobId}` : ""}. The original raw state can remain ${task.rawState || "Transferring"}, but Task List displays the final operational state.`;
  }

  if (task.rawState && task.rawState !== task.state) {
    return `Displayed state is ${task.state}. Raw database state is ${task.rawState}.`;
  }

  if (task.isTerminal) {
    return task.actionDisabledReason || "This task is already in a final state. Stop and cancel actions are locked.";
  }

  return "Task is still actionable based on the latest state returned by the API.";
}

const TaskList = () => {
  const [classification, setClassification] = useState("All");
  const [state, setState] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [taskDetail, setTaskDetail] = useState<TaskDetailPayload | null>(null);
  const [progressDetails, setProgressDetails] = useState<ProgressDetailItem[]>([]);
  const [targets, setTargets] = useState<TargetItem[]>([]);
  const [classificationOptions, setClassificationOptions] = useState<SelectOption[]>(fallbackClassifications);
  const [stateOptions, setStateOptions] = useState<SelectOption[]>(fallbackStates);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isProgressLoading, setIsProgressLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: "asc" | "desc" }>({
    key: "id",
    direction: "desc",
  });
  const [toast, setToast] = useState<ToastState>(null);
  const selectedTaskIdRef = useRef<number | null>(null);

  useEffect(() => {
    selectedTaskIdRef.current = selectedTaskId;
  }, [selectedTaskId]);

  useEffect(() => {
    document.documentElement.classList.add("ema-layout-lock", "ema-settings-page-active");
    document.body.classList.add("ema-layout-lock", "ema-settings-page-active");

    return () => {
      document.documentElement.classList.remove("ema-layout-lock", "ema-settings-page-active");
      document.body.classList.remove("ema-layout-lock", "ema-settings-page-active");
    };
  }, []);

  const showToast = useCallback((nextToast: NonNullable<ToastState>) => {
    setToast(nextToast);
    window.setTimeout(() => {
      setToast((current) => (current === nextToast ? null : current));
    }, 3200);
  }, []);

  const loadOptions = useCallback(async () => {
    try {
      const response = await requestJson<ApiEnvelope<{
        classifications: SelectOption[];
        states: SelectOption[];
      }>>("/api/task-list/options");

      setClassificationOptions(response.data.classifications?.length ? response.data.classifications : fallbackClassifications);
      setStateOptions(response.data.states?.length ? response.data.states : fallbackStates);
    } catch (error) {
      console.warn("Task options fallback loaded:", error);
      setClassificationOptions(fallbackClassifications);
      setStateOptions(fallbackStates);
    }
  }, []);

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await requestJson<ApiEnvelope<TaskItem[]>>("/api/task-list/search", {
        method: "POST",
        body: {
          classification,
          state,
          fromDate,
          job_starttime: fromDate,
          limit: 1000,
        },
      });

      const normalized = (response.data || []).map((task) => normalizeTask(task));
      setTasks(normalized);

      const currentSelectedTaskId = selectedTaskIdRef.current;
      if (currentSelectedTaskId && !normalized.some((task) => task.id === currentSelectedTaskId)) {
        setSelectedTaskId(null);
        setTaskDetail(null);
        setTargets([]);
        setProgressDetails([]);
        setIsDetailOpen(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load task list.";
      setErrorMessage(message);
      showToast({ type: "error", title: "Task API Error", message });
    } finally {
      setIsLoading(false);
    }
  }, [classification, fromDate, showToast, state]);

  const loadTaskDetail = useCallback(async (taskId: number) => {
    setIsDetailLoading(true);
    setErrorMessage("");

    try {
      const response = await requestJson<ApiEnvelope<TaskDetailPayload>>(`/api/task-list/${taskId}/detail`);
      const detail = response.data;
      const normalizedTask = normalizeTask(detail.task || {});
      const normalizedProgress = normalizeProgress(detail.progress || {}, normalizedTask);
      const normalizedTargets = (detail.targets || []).map((target, index) => normalizeTarget(target, index));
      const normalizedProgressDetails = detail.progressDetails || [];

      setTaskDetail({
        task: normalizedTask,
        progress: normalizedProgress,
        targets: normalizedTargets,
        progressDetails: normalizedProgressDetails,
      });
      setTargets(normalizedTargets);
      setProgressDetails(normalizedProgressDetails);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load task detail.";
      setErrorMessage(message);
      showToast({ type: "error", title: "Detail API Error", message });
    } finally {
      setIsDetailLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    setCurrentPage(1);
  }, [classification, state, fromDate, searchTerm, pageSize]);

  const taskStats = useMemo(() => {
    const running = tasks.filter((task) => task.state === "Running").length;
    const transferring = tasks.filter((task) => task.state === "Transferring").length;
    const transferred = tasks.filter((task) => task.state === "Transferred").length;
    const stopped = tasks.filter((task) => task.state === "Stop").length;
    const cancelled = tasks.filter((task) => task.state === "Cancelled").length;
    const completion = tasks.length
      ? Math.round(tasks.reduce((sum, task) => sum + task.completionRate, 0) / tasks.length)
      : 0;

    return {
      total: tasks.length,
      running,
      transferring,
      transferred,
      stopped,
      cancelled,
      completion,
    };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return [...tasks]
      .filter((task) => {
        const matchSearch =
          !keyword ||
          String(task.id).includes(keyword) ||
          task.classification.toLowerCase().includes(keyword) ||
          task.taskType.toLowerCase().includes(keyword) ||
          task.commandType.toLowerCase().includes(keyword) ||
          task.state.toLowerCase().includes(keyword) ||
          task.description.toLowerCase().includes(keyword) ||
          task.orderedBy.toLowerCase().includes(keyword);

        return matchSearch;
      })
      .sort((a, b) => {
        const valueA = getSortValue(a, sortConfig.key);
        const valueB = getSortValue(b, sortConfig.key);

        if (valueA < valueB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valueA > valueB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
  }, [searchTerm, sortConfig, tasks]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredTasks.length / pageSize)), [filteredTasks.length, pageSize]);

  useEffect(() => {
    setCurrentPage((page) => clampPage(page, totalPages));
  }, [totalPages]);

  const paginatedTasks = useMemo(() => {
    const safePage = clampPage(currentPage, totalPages);
    const start = (safePage - 1) * pageSize;
    return filteredTasks.slice(start, start + pageSize);
  }, [currentPage, filteredTasks, pageSize, totalPages]);

  const pageStart = filteredTasks.length ? (clampPage(currentPage, totalPages) - 1) * pageSize + 1 : 0;
  const pageEnd = filteredTasks.length ? Math.min(pageStart + paginatedTasks.length - 1, filteredTasks.length) : 0;

  const selectedTask = useMemo(() => {
    return taskDetail?.task || tasks.find((task) => task.id === selectedTaskId) || null;
  }, [selectedTaskId, taskDetail, tasks]);

  const selectedProgress = useMemo(() => {
    if (taskDetail?.progress) return taskDetail.progress;
    return selectedTask ? normalizeProgress({}, selectedTask) : null;
  }, [selectedTask, taskDetail]);

  const handleSort = (key: SortKey) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const openTaskDetails = async (taskId: number) => {
    setIsDetailOpen(true);

    if (selectedTaskId === taskId && taskDetail?.task?.id === taskId) {
      return;
    }

    setSelectedTaskId(taskId);
    await loadTaskDetail(taskId);
  };

  const closeTaskDetails = () => {
    setIsDetailOpen(false);
  };

  const resetFilters = () => {
    setClassification("All");
    setState("All");
    setSearchTerm("");
    setFromDate("");
    setCurrentPage(1);
  };

  const requestTaskAction = (action: TaskAction, task: TaskItem) => {
    if (!canRunTaskAction(action, task)) {
      showToast({
        type: "info",
        title: "Action Disabled",
        message: task.actionDisabledReason || "This task action is disabled because the task state is already final.",
      });
      return;
    }

    setPendingAction({ action, task });
  };

  const confirmTaskAction = async () => {
    if (!pendingAction) return;

    setIsActionLoading(true);
    try {
      const response = await requestJson<ApiEnvelope<Record<string, unknown>>>(`/api/task-list/${pendingAction.task.id}/action`, {
        method: "POST",
        body: { action: pendingAction.action },
      });

      showToast({
        type: pendingAction.action === "delete" ? "error" : "success",
        title: `Task ${pendingAction.action}`,
        message: response.message || `Task #${pendingAction.task.id} ${pendingAction.action} successful.`,
      });

      const affectedTaskId = pendingAction.task.id;
      const action = pendingAction.action;
      setPendingAction(null);
      await loadTasks();

      if (action === "delete") {
        setIsDetailOpen(false);
        setSelectedTaskId(null);
        setTaskDetail(null);
        setTargets([]);
        setProgressDetails([]);
      } else if (isDetailOpen) {
        await loadTaskDetail(affectedTaskId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to perform task action.";
      showToast({ type: "error", title: "Action Failed", message });
    } finally {
      setIsActionLoading(false);
    }
  };

  const exportTasks = () => {
    const headers = [
      "Job ID",
      "Classification",
      "Task Type",
      "Command",
      "State",
      "Description",
      "Start Time",
      "End Time",
      "Scheduled Time",
      "Ordered By",
      "Transfer Rate",
      "Completion Rate",
      "Total Objects",
    ];

    const rows = filteredTasks.map((task) => [
      task.id,
      task.classification,
      task.taskType,
      task.commandType,
      task.state,
      task.description,
      task.startTime,
      task.endTime,
      task.scheduledTime,
      task.orderedBy,
      `${task.transferRate}%`,
      `${task.completionRate}%`,
      task.totalObjects,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `task-list-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const hasFilters = classification !== "All" || state !== "All" || searchTerm || fromDate;

  const renderSortIndicator = (key: SortKey) => {
    if (sortConfig.key !== key) return "↕";
    return sortConfig.direction === "asc" ? "↑" : "↓";
  };

  const sortButton = (label: string, key: SortKey) => (
    <button type="button" className="task-clean-sort" onClick={() => handleSort(key)}>
      <span>{label}</span>
      <i aria-hidden="true">{renderSortIndicator(key)}</i>
    </button>
  );

  return (
    <>
      <AppToast
        show={Boolean(toast)}
        tone={toast?.type || "info"}
        title={toast?.title}
        message={toast?.message || ""}
        onClose={() => setToast(null)}
      />

      <main className="settings-module-root ema-settings-pro ema-module-root task-list-module container-fluid p-3 p-xl-4" data-section="task-list">
        <input aria-hidden="true" id="globalSearch" type="hidden" />
        <button hidden id="themeBtn" type="button">
          <span id="themeLabel">Dark Mode</span>
        </button>

        <div className="settings-layout task-list-layout d-grid gap-3">
          <section className="settings-content d-grid gap-3 task-list-settings-content">
            <div className="settings-hero task-list-hero ema-panel-surface">
              <div>
                <span className="eyebrow">OPERATIONS CONTROL</span>
                <h2>Task List</h2>
                <p>Monitor command jobs, task execution state, endpoint delivery status and operational controls in one Settings-style workspace.</p>
              </div>

              <div className="settings-score task-hero-score task-hero-score-balanced" aria-label="Task summary">
                <button type="button" className={`score-box task-score-box ${state === "All" ? "active" : ""}`} onClick={() => setState("All")}>
                  <span>Total Tasks</span>
                  <strong>{taskStats.total}</strong>
                  <small>{filteredTasks.length} visible records</small>
                </button>
                <button type="button" className={`score-box task-score-box ${state === "Running" ? "active" : ""}`} onClick={() => setState("Running")}>
                  <span>Running</span>
                  <strong>{taskStats.running}</strong>
                  <small>Active execution</small>
                </button>
              </div>
            </div>

            <section className="content-shell task-list-content-shell task-list-settings-table-shell ema-panel-surface">
              <div className="content-toolbar task-list-settings-toolbar">
                <label className="section-search task-list-search">
                  <Search size={15} />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search job ID, command, task, state or ordered by..."
                  />
                  {searchTerm ? (
                    <button type="button" className="task-search-clear" onClick={() => setSearchTerm("")} aria-label="Clear search">
                      <X size={14} />
                    </button>
                  ) : null}
                </label>

                <div className="content-actions toolbar-actions task-list-settings-actions">
                  <button className="soft-btn task-inline-button" type="button" onClick={loadTasks} disabled={isLoading}>
                    {isLoading ? <Loader2 className="task-spin" size={15} /> : <RefreshCw size={15} />}
                    <span>{isLoading ? "Loading..." : "Refresh"}</span>
                  </button>
                  <button className="primary-btn task-inline-button" type="button" onClick={exportTasks} disabled={!filteredTasks.length}>
                    <Download size={15} />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              <div className="task-list-filter-strip">
                <label className="form-field">
                  <span>Classification</span>
                  <select className="setting-select form-select" value={classification} onChange={(event) => setClassification(event.target.value)}>
                    {classificationOptions.map((item) => <option key={item.code} value={item.label}>{item.label}</option>)}
                  </select>
                </label>

                <label className="form-field">
                  <span>State</span>
                  <select className="setting-select form-select" value={state} onChange={(event) => setState(event.target.value)}>
                    {stateOptions.map((item) => <option key={item.code} value={item.label}>{item.label}</option>)}
                  </select>
                </label>

                <label className="form-field">
                  <span>From</span>
                  <input className="setting-input form-control" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
                </label>

                <label className="form-field task-page-size-control compact">
                  <span>Rows</span>
                  <select className="setting-select form-select" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                    {pageSizeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </label>

                <div className="task-toolbar-actions settings-task-filter-actions">
                  <button className="soft-btn task-inline-button" type="button" onClick={resetFilters} disabled={!hasFilters}>
                    <X size={14} />
                    <span>Reset</span>
                  </button>
                  <button className="primary-btn task-inline-button" type="button" onClick={loadTasks} disabled={isLoading}>
                    {isLoading ? <Loader2 className="task-spin" size={15} /> : <RefreshCw size={15} />}
                    <span>Apply</span>
                  </button>
                </div>
              </div>

              <div className="content-body task-list-content-body settings-task-body">
                {errorMessage && (
                  <div className="settings-inline-alert error task-api-error">
                    <AlertCircle size={18} />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="task-table-utility-row">
                  <div className="uam-pagination-info">
                    Showing <strong>{pageStart}-{pageEnd}</strong> of <strong>{filteredTasks.length}</strong> Task List records
                  </div>
                  <div className="task-table-state-summary" aria-label="Task quick summary">
                    <span>Completed <strong>{taskStats.transferred}</strong></span>
                    <span>Transferring <strong>{taskStats.transferring}</strong></span>
                    <span>Stopped <strong>{taskStats.stopped}</strong></span>
                  </div>
                </div>

                <div className="user-access-table advanced clean-table task-standard-table">
                  <div className="user-row head advanced clean-table-row task-standard-row">
                    <div className="user-cell">No</div>
                    <div className="user-cell">{sortButton("Job", "id")}</div>
                    <div className="user-cell">{sortButton("Classification", "classification")}</div>
                    <div className="user-cell">{sortButton("State", "state")}</div>
                    <div className="user-cell">{sortButton("Schedule", "startTime")}</div>
                    <div className="user-cell">{sortButton("Ordered By", "orderedBy")}</div>
                    <div className="user-cell">Action</div>
                  </div>

                  {isLoading && <div className="settings-empty-state task-empty-state"><Loader2 className="task-spin" size={18} /> Loading task records...</div>}
                  {!isLoading && filteredTasks.length === 0 && <div className="settings-empty-state task-empty-state">No task records available.</div>}

                  {!isLoading && paginatedTasks.map((task, index) => (
                    <div
                      className={`user-row advanced clean-table-row task-standard-row ${selectedTask?.id === task.id ? "is-selected" : ""}`}
                      key={task.id}
                      onClick={() => openTaskDetails(task.id)}
                    >
                      <div className="user-cell row-number">
                        <span className="row-index-pill">{String(pageStart + index).padStart(2, "0")}</span>
                      </div>
                      <div className="user-cell">
                        <div className="task-job-cell">
                          <button
                            type="button"
                            className="task-job-id-pill"
                            onClick={(event) => {
                              event.stopPropagation();
                              openTaskDetails(task.id);
                            }}
                            title="Open task detail"
                          >
                            #{task.id}
                          </button>
                          <div>
                            <strong>{task.commandType || task.taskType || "Task command"}</strong>
                            <small>{task.description || "No description set"}</small>
                          </div>
                        </div>
                      </div>
                      <div className="user-cell">
                        <div className="task-classification-cell">
                          <strong>{task.classification}</strong>
                          <small>{task.taskType}</small>
                        </div>
                      </div>
                      <div className="user-cell">
                        <div className="task-state-stack clean">
                          <span className={`task-status-pill ${getStateClass(task.state)}`}>{task.state}</span>
                          {task.rawState && task.rawState !== task.state ? <small>raw: {task.rawState}</small> : null}
                          <div className="task-mini-progress" aria-label={`Completion ${task.completionRate}%`}>
                            <progress className="task-progress-native" value={Math.min(100, Math.max(0, task.completionRate))} max={100} />
                          </div>
                        </div>
                      </div>
                      <div className="user-cell">
                        <div className="task-schedule-cell">
                          <strong>{task.startTime || "-"}</strong>
                          <small>{task.endTime && task.endTime !== "-" ? task.endTime : "No end time"}</small>
                        </div>
                      </div>
                      <div className="user-cell">
                        <span className="muted-cell">{task.orderedBy || "-"}</span>
                      </div>
                      <div className="user-cell">
                        <div className="row-actions user-row-action-wrap clean task-clean-actions" onClick={(event) => event.stopPropagation()}>
                          <button
                            className="mini-btn icon-only task-action stop"
                            type="button"
                            title={getTaskActionDisabledTitle("stop", task)}
                            aria-label={getTaskActionDisabledTitle("stop", task)}
                            disabled={!canRunTaskAction("stop", task)}
                            onClick={() => requestTaskAction("stop", task)}
                          >
                            <Square size={14} />
                          </button>
                          <button
                            className="mini-btn icon-only task-action cancel"
                            type="button"
                            title={getTaskActionDisabledTitle("cancel", task)}
                            aria-label={getTaskActionDisabledTitle("cancel", task)}
                            disabled={!canRunTaskAction("cancel", task)}
                            onClick={() => requestTaskAction("cancel", task)}
                          >
                            <X size={14} />
                          </button>
                          <button
                            className="mini-btn icon-only delete task-action delete"
                            type="button"
                            title={getTaskActionDisabledTitle("delete", task)}
                            aria-label={getTaskActionDisabledTitle("delete", task)}
                            disabled={!canRunTaskAction("delete", task)}
                            onClick={() => requestTaskAction("delete", task)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {!isLoading && filteredTasks.length > 0 && (
                  <AppPagination
                    currentPage={clampPage(currentPage, totalPages)}
                    totalPages={totalPages}
                    totalItems={filteredTasks.length}
                    pageSize={pageSize}
                    disabled={isLoading}
                    onPageChange={(page) => setCurrentPage(clampPage(page, totalPages))}
                  />
                )}
              </div>
            </section>
          </section>
        </div>
      </main>

      {isDetailOpen && selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          progress={selectedProgress}
          targets={targets}
          progressDetails={progressDetails}
          stateOptions={stateOptions}
          isLoading={isDetailLoading}
          isProgressLoading={isProgressLoading}
          onClose={closeTaskDetails}
          onRefresh={() => selectedTaskId && loadTaskDetail(selectedTaskId)}
          onAction={requestTaskAction}
        />
      )}

      {pendingAction && (
        <TaskActionModal
          pendingAction={pendingAction}
          isLoading={isActionLoading}
          onCancel={() => setPendingAction(null)}
          onConfirm={confirmTaskAction}
        />
      )}
    </>
  );
};

function TaskProcedureStatus({ task, progress }: { task: TaskItem | null; progress: TaskProgress | null }) {
  const display = progress || (task ? normalizeProgress({}, task) : null);

  return (
    <section className="task-card task-procedure-card">
      <div className="task-panel-head">
        <div className="task-panel-title">
          <div className="task-panel-icon"><CheckCircle2 size={19} /></div>
          <div>
            <h3>Task Procedure Status</h3>
            <p>Live progress returned by /status and /detail</p>
          </div>
        </div>
      </div>

      <div className="task-status-body">
        {display ? (
          <>
            {task ? (
              <div className={`task-procedure-alert ${task.isTerminal ? "is-locked" : "is-live"}`}>
                <span className={`task-status-pill ${getStateClass(task.state)}`}>{task.state}</span>
                <p>{getTaskStateInsight(task)}</p>
              </div>
            ) : null}
            <StatusField label="Classification" value={display.classification} />
            <StatusField label="Start Time" value={display.startTime} />
            <StatusField label="Task Transfer Rate" value={`${display.transferRate}%`} />
            <ProgressBar value={display.transferRate} />
            <StatusField label="Task Completion Rate" value={`${display.completionRate}%`} />
            <ProgressBar value={display.completionRate} />

            <div className="task-divider" />

            <StatusField label="Total Objects" value={display.totalObjects} />
            <StatusField label="Command Completed" value={display.commandCompleted} />
            <StatusField label="Task Completed" value={display.taskCompleted} />
            <StatusField label="Task Running" value={display.taskRunning} />
            <StatusField label="Command Incomplete" value={display.commandIncomplete} />
            <StatusField label="Task End" value={display.taskEnd} />
          </>
        ) : (
          <div className="task-empty-state compact">Select one task to view procedure status.</div>
        )}
      </div>
    </section>
  );
}

function TaskTargetList({
  task,
  targets,
  progressDetails,
  stateOptions,
  isLoading,
  isProgressLoading,
  compactHeader = false,
  sidePanel = false,
}: {
  task: TaskItem | null;
  targets: TargetItem[];
  progressDetails: ProgressDetailItem[];
  stateOptions: SelectOption[];
  isLoading: boolean;
  isProgressLoading: boolean;
  compactHeader?: boolean;
  sidePanel?: boolean;
}) {
  const hasExecutionRows = progressDetails.length > 0;
  const isBusy = isLoading || isProgressLoading;

  const targetLookup = useMemo(() => {
    const lookup = new Map<string, TargetItem>();

    targets.forEach((target) => {
      if (target.objectRootIdn) lookup.set(String(target.objectRootIdn), target);
      if (target.username) lookup.set(target.username.toLowerCase(), target);
      if (target.objectDeviceID) lookup.set(target.objectDeviceID.toLowerCase(), target);
    });

    return lookup;
  }, [targets]);

  const displayRows = useMemo(() => {
    const rows = hasExecutionRows
      ? progressDetails.map((row, index) => {
          const status = resolveProgressStatus(row, stateOptions);
          const objectRoot = readDetailValue(row, ["Object_Root_Idn", "objectRootIdn"]);
          const deviceName = readDetailValue(row, ["ComputerName", "DeviceName", "Object_Client_Name", "TargetName", "Object_DeviceID", "DeviceID"], `Target ${index + 1}`);
          const deviceId = readDetailValue(row, ["Object_DeviceID", "objectDeviceID", "DeviceID", "deviceID", "deviceId"]);
          const matchedTarget =
            targetLookup.get(objectRoot) ||
            targetLookup.get(deviceName.toLowerCase()) ||
            targetLookup.get(deviceId.toLowerCase());

          return {
            key: `progress-${objectRoot}-${deviceId}-${index}`,
            name: deviceName,
            department: readDetailValue(row, ["Object_Full_Name", "Department", "department", "Object_Rel_Name"], matchedTarget?.department || "-"),
            ipAddress: readDetailValue(row, ["IP", "IPAddress", "ipAddress", "DeviceIPAddress", "DeviceLocalIPAddress"], matchedTarget?.ipAddress || "-"),
            type: matchedTarget?.targetType || "endpoint",
            status,
            lastActivity: readDetailValue(row, ["LastChangedTime", "lastChangedTime", "History_LastChangedTime", "ConnectionTime"], matchedTarget?.lastConnection || "-"),
            deviceId: deviceId || matchedTarget?.objectDeviceID || "-",
          };
        })
      : targets.map((target, index) => ({
          key: `target-${target.username}-${target.objectRootIdn || index}`,
          name: target.username,
          department: target.department,
          ipAddress: target.ipAddress,
          type: target.targetType || "client",
          status: task?.state || "-",
          lastActivity: target.lastConnection,
          deviceId: target.objectDeviceID || "-",
        }));

    return rows;
  }, [hasExecutionRows, progressDetails, stateOptions, targetLookup, targets, task?.state]);

  const totalRows = displayRows.length;
  const emptyMessage = "No target endpoint returned for this task.";
  const [targetSearch, setTargetSearch] = useState("");

  const filteredTargetRows = useMemo(() => {
    const query = targetSearch.trim().toLowerCase();
    if (!query) return displayRows;

    return displayRows.filter((row) =>
      [row.name, row.department, row.ipAddress, row.type, row.status, row.lastActivity, row.deviceId]
        .some((value) => String(value || "").toLowerCase().includes(query))
    );
  }, [displayRows, targetSearch]);

  if (sidePanel) {
    const visibleRows = filteredTargetRows;

    return (
      <section className="task-card task-target-card task-target-side-card task-target-density-card">
        <div className="task-panel-head task-panel-head-between task-target-side-head">
          <div className="task-panel-title">
            <div className="task-panel-icon"><UserRound size={19} /></div>
            <div>
              <h3>Target Endpoint List</h3>
              <p>Compact endpoint registry for large target batches.</p>
            </div>
          </div>
          <span className="task-badge-outline">{totalRows} target{totalRows === 1 ? "" : "s"}</span>
        </div>

        <div className="task-target-side-toolbar" aria-label="Target endpoint filters">
          <label className="section-search task-target-side-search">
            <Search size={15} />
            <input
              type="search"
              value={targetSearch}
              onChange={(event) => setTargetSearch(event.target.value)}
              placeholder="Search target, IP, status, device ID..."
              aria-label="Search target endpoints"
            />
          </label>
          {targetSearch ? (
            <button type="button" onClick={() => setTargetSearch("")} className="soft-btn task-target-clear-btn">Clear</button>
          ) : null}
        </div>

        <div className="task-target-side-body task-target-compact-list" role="list" aria-label="Target endpoint compact list">
          {isBusy ? (
            <div className="task-empty-state compact"><Loader2 size={20} className="task-spin" /> Loading target status...</div>
          ) : task && visibleRows.length ? visibleRows.map((row, index) => (
            <article className="task-target-compact-row" key={row.key} role="listitem">
              <div className="task-target-compact-index">{String(index + 1).padStart(2, "0")}</div>
              <div className="task-target-compact-main">
                <div className="task-target-compact-titleline">
                  <strong title={row.name}>{row.name}</strong>
                  <span className={`task-status-pill ${getStateClass(row.status)}`}>{row.status}</span>
                </div>
                <div className="task-target-compact-meta">
                  <span title={row.department}><b>Dept</b>{row.department}</span>
                  <span title={row.ipAddress}><b>IP</b>{row.ipAddress}</span>
                  <span title={row.type}><b>Type</b>{row.type}</span>
                  <span title={row.lastActivity}><b>{hasExecutionRows ? "Changed" : "Connected"}</b>{row.lastActivity}</span>
                </div>
                <div className="task-target-device-line" title={row.deviceId}>
                  <b>Device ID</b>
                  <code>{row.deviceId}</code>
                </div>
              </div>
            </article>
          )) : (
            <div className="task-empty-state compact">{targetSearch ? "No target matches your search." : emptyMessage}</div>
          )}
        </div>

        <div className="task-combined-table-foot task-target-side-foot">
          <span>
            Showing {visibleRows.length} of {totalRows} endpoint row{totalRows === 1 ? "" : "s"}.
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className={`task-card task-target-card task-combined-target-card ${compactHeader ? "is-compact-table-card" : ""}`}>
      {!compactHeader ? (
        <div className="task-panel-head task-panel-head-between">
          <div className="task-panel-title">
            <div className="task-panel-icon"><UserRound size={19} /></div>
            <div>
              <h3>Target Endpoint List</h3>
              <p>Assigned scope with endpoint delivery status</p>
            </div>
          </div>
          {task && <span className="task-badge-outline">Task #{task.id}</span>}
        </div>
      ) : null}

      <div className="task-target-table-wrap">
        <table className="task-target-table task-combined-target-table task-target-status-table">
          <thead>
            <tr>
              <th>{hasExecutionRows ? "Device / Target" : "Assigned Scope"}</th>
              <th>Department</th>
              <th>IP Address</th>
              <th>Type</th>
              <th>Status</th>
              <th>{hasExecutionRows ? "Last Changed" : "Last Connection"}</th>
              <th>Device ID</th>
            </tr>
          </thead>
          <tbody>
            {isBusy ? (
              <tr>
                <td colSpan={7}>
                  <div className="task-empty-state compact"><Loader2 size={20} className="task-spin" /> Loading target status...</div>
                </td>
              </tr>
            ) : task && displayRows.length ? displayRows.map((row) => (
              <tr key={row.key}>
                <td><strong>{row.name}</strong></td>
                <td>{row.department}</td>
                <td>{row.ipAddress}</td>
                <td>{row.type}</td>
                <td><span className={`task-status-pill ${getStateClass(row.status)}`}>{row.status}</span></td>
                <td>{row.lastActivity}</td>
                <td className="task-device-id-cell">{row.deviceId}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7}>
                  <div className="task-empty-state compact">{emptyMessage}</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="task-combined-table-foot">
        <span>
          Showing {totalRows} {hasExecutionRows ? "endpoint status row" : "assigned scope row"}{totalRows === 1 ? "" : "s"}.
        </span>
      </div>
    </section>
  );
}

function TaskDetailModal({
  task,
  progress,
  targets,
  progressDetails,
  stateOptions,
  isLoading,
  isProgressLoading,
  onClose,
  onRefresh,
  onAction,
}: {
  task: TaskItem;
  progress: TaskProgress | null;
  targets: TargetItem[];
  progressDetails: ProgressDetailItem[];
  stateOptions: SelectOption[];
  isLoading: boolean;
  isProgressLoading: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onAction: (action: TaskAction, task: TaskItem) => void;
}) {
  return (
    <div className="task-detail-modal-layer" onClick={onClose} role="presentation">
      <section className="task-detail-modal ema-panel-surface" role="dialog" aria-modal="true" aria-label={`Task ${task.id} detail`} onClick={(event) => event.stopPropagation()}>
        <div className="task-detail-modal-toolbar">
          <div>
            <span className="section-tag">TASK DETAIL</span>
            <h3>Task #{task.id}</h3>
            <p>Command summary, target endpoints and execution progress.</p>
          </div>
          <div className="task-row-actions">
            <button type="button" onClick={onRefresh} title="Refresh task detail" disabled={isLoading}>
              {isLoading ? <Loader2 size={16} className="task-spin" /> : <RefreshCw size={16} />}
            </button>
            <button type="button" onClick={onClose} aria-label="Close task details">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="task-detail-modal-body task-detail-workspace task-detail-side-workspace">
          <section className="task-card task-detail-action-card task-detail-left-column">
            <TaskRightPanel task={task} onAction={onAction} />
          </section>

          <TaskProcedureStatus task={task} progress={progress} />

          <TaskTargetList
            task={task}
            targets={targets}
            progressDetails={progressDetails}
            stateOptions={stateOptions}
            isLoading={isLoading}
            isProgressLoading={isProgressLoading}
            sidePanel
          />
        </div>
      </section>
    </div>
  );
}

function TaskRightPanel({
  task,
  onAction,
}: {
  task: TaskItem | null;
  onAction: (action: TaskAction, task: TaskItem) => void;
}) {
  if (!task) {
    return (
      <div className="task-right-empty">
        <ClipboardList size={34} />
        <strong>No task selected</strong>
        <span>Select a task from registry to view details.</span>
      </div>
    );
  }

  return (
    <div className="task-right-content">
      <div className="task-right-header">
        <div className="task-right-icon"><ClipboardList size={22} /></div>
        <div>
          <h3>Task #{task.id}</h3>
          <p>{task.classification} • {task.commandType}</p>
        </div>
      </div>

      <div className="task-right-info">
        <div><span>State</span><strong>{task.state}</strong></div>
        {task.rawState && task.rawState !== task.state ? <div><span>Raw State</span><strong>{task.rawState}</strong></div> : null}
        <div><span>Task Type</span><strong>{task.taskType}</strong></div>
        <div><span>Ordered By</span><strong>{task.orderedBy}</strong></div>
        <div><span>Start</span><strong>{task.startTime}</strong></div>
        <div><span>End</span><strong>{task.endTime}</strong></div>
        <div><span>Targets</span><strong>{task.totalObjects}</strong></div>
      </div>

      <div className={`task-note-box ${task.isTerminal ? "is-terminal" : "is-active"}`}>
        <h4>{task.isTerminal ? "Operational Lock" : "Operational Note"}</h4>
        <p>{task.description}</p>
        <span className="task-lock-note">{getTaskStateInsight(task)}</span>
      </div>

      <div className="task-action-list">
        <button type="button" className="task-action-item" title={getTaskActionDisabledTitle("stop", task)} disabled={!canRunTaskAction("stop", task)} onClick={() => onAction("stop", task)}>
          <div className="task-action-icon"><Square size={16} /></div>
          <div><strong>Stop Command</strong><span>{canRunTaskAction("stop", task) ? "Update task state to Stop" : getTaskActionDisabledTitle("stop", task)}</span></div>
        </button>
        <button type="button" className="task-action-item" title={getTaskActionDisabledTitle("cancel", task)} disabled={!canRunTaskAction("cancel", task)} onClick={() => onAction("cancel", task)}>
          <div className="task-action-icon"><X size={16} /></div>
          <div><strong>Cancel Task</strong><span>{canRunTaskAction("cancel", task) ? "Update task state to Cancelled" : getTaskActionDisabledTitle("cancel", task)}</span></div>
        </button>
        <button type="button" className="task-action-item" title={getTaskActionDisabledTitle("delete", task)} disabled={!canRunTaskAction("delete", task)} onClick={() => onAction("delete", task)}>
          <div className="task-action-icon danger"><Trash2 size={16} /></div>
          <div><strong>Delete Task</strong><span>Archive and remove active task rows</span></div>
        </button>
      </div>
    </div>
  );
}

function TaskActionModal({
  pendingAction,
  isLoading,
  onCancel,
  onConfirm,
}: {
  pendingAction: NonNullable<PendingAction>;
  isLoading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const title = pendingAction.action === "delete" ? "Delete Task" : pendingAction.action === "cancel" ? "Cancel Task" : "Stop Task";
  const description = pendingAction.action === "delete"
    ? "This will archive TS_JOB and TS_JOB_DEST into delete history tables, then remove the active rows. TS_JOB_HISTORY will remain untouched."
    : pendingAction.action === "cancel"
      ? "This will update the selected job status to Cancelled."
      : "This will update the selected job status to Stop.";

  return (
    <AppModal
      show
      size="sm"
      onHide={onCancel}
      eyebrow="Confirmation"
      title={
        <span className="task-modal-title-inline">
          <AlertCircle size={18} /> {title}
        </span>
      }
      footer={
        <>
          <AppButton variant="outline-secondary" onClick={onCancel} disabled={isLoading}>Cancel</AppButton>
          <AppButton variant={pendingAction.action === "delete" ? "danger" : "primary"} onClick={onConfirm} loading={isLoading}>
            Confirm {title}
          </AppButton>
        </>
      }
    >
      <p className="task-confirm-copy">{description}</p>
      <div className="task-note-box">
        <h4>{pendingAction.task.classification}</h4>
        <p>{pendingAction.task.description}</p>
      </div>
    </AppModal>
  );
}

function StatusField({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="task-status-field">
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  const progressValue = Math.min(Math.max(value, 0), 100);

  return (
    <div className="task-progress-bar">
      <progress className="task-progress-native" value={progressValue} max={100} aria-label={`Progress ${progressValue}%`} />
    </div>
  );
}

export default TaskList;
