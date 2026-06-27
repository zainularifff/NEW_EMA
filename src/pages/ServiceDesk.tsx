import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ButtonHTMLAttributes, CSSProperties, FormEvent, ReactNode } from 'react';

import {
  incidents as incidentsService,
  incidentConfig as incidentConfigService,
  incidentCategories as incidentCategoriesService,
} from '../services/IncidentService';
import { users as usersService, roles as rolesService } from '../services/UserService';
import { assets as assetsService } from '../services/AssetService';
import { knowledgeBase as knowledgeBaseService } from '../services/KnowledgeBaseService';
import { engineerAvailability as engineerAvailabilityService } from '../services/EngineerAvailabilityService';

import {
  ArrowRightLeft,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Eye,
  Filter,
  Loader2,
  Monitor,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldAlert,
  Ticket,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';

import { installServiceDeskUiInjection } from "../utils/serviceDeskUiInjection";

type AppUser = {
  id?: string | number;
  name?: string;
  username?: string;
  userID?: string;
  role?: string;
  email?: string;
  permissions?: {
    incidents?: {
      view?: boolean;
      create?: boolean;
      edit?: boolean;
      delete?: boolean;
    };
  };
};

type ViewMode = 'list' | 'form' | 'kb';
type FormMode = 'create' | 'edit';
type QueueKey =
  | 'all'
  | 'sla-risk'
  | 'awaiting'
  | 'assigned'
  | 'in-progress'
  | 'pending-approval'
  | 'resolved'
  | 'knowledge';

type ToastState = {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
} | null;

type ConfirmDialogState = {
  title: string;
  message: string;
  meta?: string;
  tone?: 'danger' | 'warning' | 'info';
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  requiresReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  minReasonLength?: number;
  onConfirm: (reason?: string) => Promise<void> | void;
} | null;

type SlaConfig = {
  id?: number | string;
  priority: string;
  label?: string;
  responseTimeMin?: number;
  resolutionTimeHrs?: number;
  escalationPolicy?: string;
};

type EngineerOption = {
  id?: string | number;
  userID?: string | number;
  UserID?: string | number;
  userId?: string | number;
  UserId?: string | number;
  name?: string;
  username?: string;
  email?: string;
  role?: string;
  roleName?: string;
  roles?: string[];
  supportLevel?: string;
  department?: string;
  currentStatus?: string;
  status?: string;
  isOnLeave?: boolean;
  leaveStatus?: string;
  leaveReason?: string;
  leaveStartDate?: string;
  leaveEndDate?: string;
  StartDate?: string;
  EndDate?: string;
};

const SERVICE_DESK_SUPPORT_LEVELS = ['L1 Support', 'L2 Support', 'L3 Support'];

function normalizeRoleText(value: any) {
  return String(value || '').trim();
}

function getRoleDisplayName(role: any) {
  return normalizeRoleText(
    role?.RoleName ||
      role?.roleName ||
      role?.name ||
      role?.role ||
      role?.label ||
      role
  );
}

function normalizeSupportLevelName(value: any) {
  const role = normalizeRoleText(value);
  const match = role.match(/\bl\s*([123])\s*support\b/i) || role.match(/\bl([123])support\b/i);

  if (match?.[1]) {
    return `L${match[1]} Support`;
  }

  return role;
}

function getUserRoleNames(user: any) {
  const roleSources: any[] = [];

  if (Array.isArray(user?.roles)) roleSources.push(...user.roles);
  if (Array.isArray(user?.Roles)) roleSources.push(...user.Roles);
  if (Array.isArray(user?.userRoles)) roleSources.push(...user.userRoles);

  roleSources.push(
    user?.roleName,
    user?.RoleName,
    user?.role,
    user?.Role,
    user?.role?.name,
    user?.role?.RoleName,
    user?.supportLevel,
    user?.SupportLevel,
    user?.designation,
    user?.Designation
  );

  return roleSources
    .flatMap((role) => String(getRoleDisplayName(role) || '').split(/[,|;]/))
    .map((role) => normalizeSupportLevelName(role))
    .filter(Boolean);
}

function isSupportRoleName(roleName: any) {
  const role = normalizeRoleText(roleName).toLowerCase();
  return /\bl\s*[123]\s*support\b/i.test(role) || /\bl[123]support\b/i.test(role) || role.includes('support');
}

function getPrimarySupportLevel(user: any) {
  const roles = getUserRoleNames(user);

  return (
    SERVICE_DESK_SUPPORT_LEVELS.find((level) =>
      roles.some((role) => normalizeSupportLevelName(role).toLowerCase() === level.toLowerCase())
    ) ||
    roles.find((role) => /\bl\s*[123]\s*support\b/i.test(role) || /\bl[123]support\b/i.test(role)) ||
    roles.find((role) => /support/i.test(role)) ||
    ''
  );
}

function userMatchesSupportLevel(user: any, supportLevel: string) {
  const selectedLevel = normalizeSupportLevelName(supportLevel).toLowerCase();

  if (!selectedLevel) return false;

  return getUserRoleNames(user).some((role) => normalizeSupportLevelName(role).toLowerCase() === selectedLevel);
}

function getEngineerKey(engineer: EngineerOption) {
  return String(
    engineer.userID ??
      engineer.UserID ??
      engineer.userId ??
      engineer.UserId ??
      engineer.id ??
      engineer.name ??
      engineer.username ??
      engineer.email ??
      ''
  );
}

function isEngineerOnLeave(engineer: EngineerOption | null | undefined) {
  if (!engineer) return false;

  const status = String(engineer.currentStatus || engineer.status || engineer.leaveStatus || '').toLowerCase();
  return Boolean(engineer.isOnLeave) || status.includes('leave') || status.includes('not available') || status.includes('unavailable');
}

function getEngineerLeaveMessage(engineer: EngineerOption) {
  const name = getUserName(engineer) || 'Selected engineer';
  const status = engineer.leaveStatus || engineer.currentStatus || 'on leave';
  const start = normalizeDate(engineer.leaveStartDate || engineer.StartDate);
  const end = normalizeDate(engineer.leaveEndDate || engineer.EndDate);
  const period = start && end ? ` from ${start} to ${end}` : '';
  const reason = engineer.leaveReason ? ` (${engineer.leaveReason})` : '';

  return `${name} is ${status}${period}${reason}. You can still assign this ticket if needed.`;
}

function normalizeLookupKey(value: any) {
  return String(value ?? '').trim().toLowerCase();
}

function getEngineerLookupKeys(engineer: any) {
  return [
    engineer?.id,
    engineer?.ID,
    engineer?.userID,
    engineer?.UserID,
    engineer?.userId,
    engineer?.UserId,
    engineer?.emaUserId,
    engineer?.EMAUserID,
    engineer?.employeeId,
    engineer?.EmployeeID,
    engineer?.email,
    engineer?.Email,
    engineer?.name,
    engineer?.Name,
    engineer?.username,
    engineer?.Username,
    engineer?.engineerName,
    engineer?.EngineerName,
  ]
    .map(normalizeLookupKey)
    .filter(Boolean);
}

function mergeEngineerAvailabilityIntoEmaUsers(emaEngineers: EngineerOption[], availabilityRows: EngineerOption[]) {
  if (!Array.isArray(availabilityRows) || availabilityRows.length === 0) {
    return emaEngineers;
  }

  const availabilityByKey = new Map<string, EngineerOption>();

  availabilityRows.forEach((row) => {
    getEngineerLookupKeys(row).forEach((key) => {
      availabilityByKey.set(key, row);
    });
  });

  return emaEngineers.map((engineer) => {
    const match = getEngineerLookupKeys(engineer)
      .map((key) => availabilityByKey.get(key))
      .find(Boolean);

    if (!match) return engineer;

    return {
      ...engineer,
      currentStatus:
        match.currentStatus ||
        match.status ||
        match.leaveStatus ||
        match.AvailabilityStatus ||
        match.availabilityStatus ||
        engineer.currentStatus,
      status:
        match.currentStatus ||
        match.status ||
        match.leaveStatus ||
        match.AvailabilityStatus ||
        match.availabilityStatus ||
        engineer.status,
      isOnLeave:
        Boolean(match.isOnLeave) ||
        Boolean((match as any).onLeave) ||
        Boolean((match as any).IsOnLeave) ||
        Boolean((match as any).OnLeave) ||
        isEngineerOnLeave(match),
      leaveStatus:
        match.leaveStatus ||
        (match as any).LeaveStatus ||
        match.currentStatus ||
        match.status ||
        engineer.leaveStatus,
      leaveReason:
        match.leaveReason ||
        (match as any).LeaveReason ||
        (match as any).remarks ||
        (match as any).Remarks ||
        engineer.leaveReason,
      leaveStartDate:
        match.leaveStartDate ||
        match.StartDate ||
        (match as any).startDate ||
        (match as any).dateFrom ||
        (match as any).DateFrom ||
        engineer.leaveStartDate,
      leaveEndDate:
        match.leaveEndDate ||
        match.EndDate ||
        (match as any).endDate ||
        (match as any).dateTo ||
        (match as any).DateTo ||
        engineer.leaveEndDate,
    };
  });
}

type AdvancedFilters = {
  reqNo: string;
  requester: string;
  incidentTitle: string;
  assetTag: string;
  category: string;
  subcategory: string;
  detail: string;
  dateFrom: string;
  dateTo: string;
  slaStatus: string;
};

function safeJsonParse(raw: string | null) {
  if (!raw || raw === 'undefined' || raw === 'null') return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readJsonStorage(key: string) {
  const raw = window.localStorage.getItem(key) || window.sessionStorage.getItem(key);
  return safeJsonParse(raw);
}

const STATUS_OPTIONS = [
  'Awaiting',
  'Assigned',
  'In Progress',
  'Resolved',
  'Closed',
];

const PRIORITY_OPTIONS = ['Critical', 'High', 'Medium', 'Low'];
const DEVICE_TYPES = ['Desktop', 'Laptop', 'Tablet', 'Mobile', 'Server', 'Network Device', 'Printer', 'Other'];

const MALAYSIA_TIME_ZONE = 'Asia/Kuala_Lumpur';
const MALAYSIA_UTC_OFFSET = '+08:00';

const urgencyToSlaPriority: Record<string, string> = {
  Critical: 'Critical',
  High: 'High',
  Medium: 'Medium',
  Low: 'Low',
};

function getSlaPriorityCode(priority: string) {
  const value = String(priority || '').trim();
  return urgencyToSlaPriority[value] || value || 'Medium';
}

function formatSlaDuration(totalMinutes: number) {
  const safeMinutes = Math.max(0, Math.floor(Math.abs(totalMinutes)));
  const days = Math.floor(safeMinutes / 1440);
  const hours = Math.floor((safeMinutes % 1440) / 60);
  const minutes = safeMinutes % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatAttachmentSize(size: any) {
  const bytes = Number(size || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getStoredAuthToken() {
  if (typeof window === 'undefined') return '';

  const directKeys = ['token', 'accessToken', 'authToken', 'emaToken', 'ema-token'];
  for (const key of directKeys) {
    const value = window.localStorage.getItem(key) || window.sessionStorage.getItem(key);
    if (value && value !== 'undefined' && value !== 'null') return value.replace(/^Bearer\s+/i, '');
  }

  const objectKeys = ['user', 'authUser', 'currentUser', 'emaUser', 'ema-user', 'userData', 'auth', 'ema-auth', 'authData', 'loginUser'];
  for (const key of objectKeys) {
    const parsed = readJsonStorage(key);
    const token =
      parsed?.token ||
      parsed?.accessToken ||
      parsed?.authToken ||
      parsed?.data?.token ||
      parsed?.data?.accessToken ||
      parsed?.data?.authToken;

    if (token) return String(token).replace(/^Bearer\s+/i, '');
  }

  return '';
}

const INCIDENT_ATTACHMENT_MAX_FILES = 3;
const INCIDENT_ATTACHMENT_MAX_MB = 10;
const INCIDENT_ATTACHMENT_MAX_BYTES = INCIDENT_ATTACHMENT_MAX_MB * 1024 * 1024;
const INCIDENT_ATTACHMENT_TOTAL_MAX_BYTES = INCIDENT_ATTACHMENT_MAX_FILES * INCIDENT_ATTACHMENT_MAX_BYTES;
const INCIDENT_ATTACHMENT_ALLOWED_TYPES = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.png',
  '.jpg',
  '.jpeg',
  '.txt',
].join(',');

function getServiceDeskApiBase() {
  const env = (import.meta as any)?.env || {};
  const configuredBase = String(env.VITE_API_BASE_URL || env.VITE_API_URL || '').trim();

  if (configuredBase) return configuredBase.replace(/\/$/, '');

  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    if (port && port !== '3001') return `${protocol}//${hostname}:3001`;
  }

  return '';
}

function getServiceDeskApiUrl(pathValue: string) {
  const path = String(pathValue || '');
  if (/^https?:\/\//i.test(path)) return path;

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = getServiceDeskApiBase();

  return base ? `${base}${normalizedPath}` : normalizedPath;
}

async function readAttachmentError(response: Response) {
  try {
    const data = await response.clone().json();
    return data?.message || data?.error || '';
  } catch (error) {
    try {
      return await response.clone().text();
    } catch (textError) {
      return '';
    }
  }
}

function getIncidentAttachmentUrl(file: any) {
  const url = file?.url || file?.filePath || file?.FilePath || '';
  if (!url || url === '#') return '#';
  return getServiceDeskApiUrl(String(url));
}

const emptyForm = () => ({
  id: '',
  title: '',
  description: '',
  priority: 'Medium',
  slaPriority: 'P3',
  status: 'Awaiting',
  category: '',
  subcategory: '',
  incidentDetail: '',
  assetId: '',
  assetBrand: '',
  assetModel: '',
  assetOS: '',
  requesterId: '',
  requesterName: '',
  deviceType: '',
  reporterId: '',
  createdAt: new Date().toISOString(),
  slaDue: '',
  assignedTo: '',
  assignedLevel: '',
  firstResponseAt: '',
  resolvedAt: '',
  rootCause: '',
  actionPlan: '',
  additionalMemo: '',
  remarks: '',
});

const emptyAdvancedFilters = (): AdvancedFilters => ({
  reqNo: '',
  requester: '',
  incidentTitle: '',
  assetTag: '',
  category: '',
  subcategory: '',
  detail: '',
  dateFrom: '',
  dateTo: '',
  slaStatus: 'All',
});

function getStoredUser(): AppUser {
  const objectKeys = ['user', 'authUser', 'currentUser', 'emaUser', 'ema-user', 'userData', 'auth', 'ema-auth', 'authData', 'loginUser'];

  for (const key of objectKeys) {
    const parsed = readJsonStorage(key);
    const user = parsed?.user || parsed?.data?.user || parsed?.data || parsed?.profile || parsed;

    if (
      user &&
      typeof user === 'object' &&
      (
        user.name ||
        user.Name ||
        user.fullName ||
        user.FullName ||
        user.displayName ||
        user.DisplayName ||
        user.username ||
        user.Username ||
        user.userName ||
        user.UserName ||
        user.userID ||
        user.UserID ||
        user.email ||
        user.Email
      )
    ) {
      const displayName =
        user.name ||
        user.Name ||
        user.fullName ||
        user.FullName ||
        user.displayName ||
        user.DisplayName ||
        user.username ||
        user.Username ||
        user.userName ||
        user.UserName ||
        user.userID ||
        user.UserID ||
        user.email ||
        user.Email ||
        'Current User';

      return {
        ...user,
        id: user.id || user.ID || user.userID || user.UserID || user.userId || user.UserId || user.email || user.Email || displayName,
        name: displayName,
        username: user.username || user.Username || user.userName || user.UserName || displayName,
        email: user.email || user.Email || '',
        role: user.role || user.Role || user.roleName || user.RoleName || 'Admin',
        permissions: user.permissions || {
          incidents: { view: true, create: true, edit: true, delete: true },
        },
      };
    }
  }

  return {
    name: 'Current User',
    role: 'Admin',
    permissions: {
      incidents: { view: true, create: true, edit: true, delete: true },
    },
  };
}

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

type AppButtonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "light"
  | "outline-primary"
  | "outline-secondary"
  | "outline-danger"
  | "outline-light"
  | string;

type AppButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: AppButtonVariant;
  size?: "sm" | "md" | "lg" | string;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

function mapServiceDeskButtonVariant(variant: AppButtonVariant = "primary") {
  const normalized = String(variant || "primary").toLowerCase();

  if (normalized === "primary") return "primary-btn btn btn-primary";
  if (normalized === "danger") return "danger-btn btn btn-danger";
  if (normalized === "warning") return "soft-btn btn btn-warning";
  if (normalized === "success") return "soft-btn btn btn-success";
  if (normalized === "light") return "soft-btn btn btn-light";
  if (normalized === "secondary") return "soft-btn btn btn-secondary";
  if (normalized === "outline-danger") return "danger-btn btn btn-outline-danger";
  if (normalized === "outline-primary") return "soft-btn btn btn-outline-primary";
  if (normalized === "outline-light") return "soft-btn btn btn-outline-light";

  return "soft-btn btn btn-outline-secondary";
}

function mapServiceDeskButtonSize(size: AppButtonProps["size"] = "md") {
  const normalized = String(size || "md").toLowerCase();

  if (normalized === "sm") return "btn-sm";
  if (normalized === "lg") return "btn-lg";

  return "";
}

function AppButton({
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  leftIcon,
  rightIcon,
  className = "",
  disabled,
  children,
  type = "button",
  ...props
}: AppButtonProps) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      className=""
    >
      {loading ? <Loader2 size={15} /> : leftIcon ? <span className="">{leftIcon}</span> : null}
      <span className="">{children}</span>
      {!loading && rightIcon ? <span className="">{rightIcon}</span> : null}
    </button>
  );
}

type AppIconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  icon: ReactNode;
  label: string;
  variant?: AppButtonVariant;
  size?: "sm" | "md" | "lg" | string;
  loading?: boolean;
};

function AppIconButton({
  icon,
  label,
  variant = "outline-secondary",
  size = "md",
  loading = false,
  className = "",
  disabled,
  type = "button",
  ...props
}: AppIconButtonProps) {
  return (
    <button
      {...props}
      type={type}
      aria-label={label}
      title={props.title || label}
      disabled={disabled || loading}
      className=""
    >
      {loading ? <Loader2 size={15} /> : icon}
    </button>
  );
}

type AppPaginationProps = {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  showPageSize?: boolean;
  className?: string;
  onPageChange: (page: number) => void;
};

function AppPagination({
  currentPage,
  totalPages,
  totalItems = 0,
  pageSize = 10,
  className = "",
  onPageChange,
}: AppPaginationProps) {
  const safeTotalPages = Math.max(1, Number(totalPages) || 1);
  const safeCurrentPage = Math.min(Math.max(1, Number(currentPage) || 1), safeTotalPages);
  const safePageSize = Math.max(1, Number(pageSize) || 10);
  const safeTotalItems = Math.max(0, Number(totalItems) || 0);
  const firstItem = safeTotalItems === 0 ? 0 : (safeCurrentPage - 1) * safePageSize + 1;
  const lastItem = Math.min(safeCurrentPage * safePageSize, safeTotalItems);

  const goToPage = (page: number) => {
    const nextPage = Math.min(Math.max(1, page), safeTotalPages);
    if (nextPage !== safeCurrentPage) {
      onPageChange(nextPage);
    }
  };

  return (
    <div className="">
      <div>Page {safeCurrentPage} / {safeTotalPages}</div>
      <div>
        <button type="button" disabled={safeCurrentPage <= 1} onClick={() => goToPage(1)}>«</button>
        <button type="button" disabled={safeCurrentPage <= 1} onClick={() => goToPage(safeCurrentPage - 1)}>‹</button>
        <span>{safeCurrentPage}</span>
        <button type="button" disabled={safeCurrentPage>= safeTotalPages} onClick={() => goToPage(safeCurrentPage + 1)}>›</button>
        <button type="button" disabled={safeCurrentPage>= safeTotalPages} onClick={() => goToPage(safeTotalPages)}>»</button>
      </div>
    </div>
  );
}

function areFloatingMenuStylesEqual(current: CSSProperties, next: CSSProperties) {
  return (
    current.position === next.position &&
    current.left === next.left &&
    current.top === next.top &&
    current.width === next.width &&
    current.maxHeight === next.maxHeight &&
    current.zIndex === next.zIndex
  );
}

type ServiceDeskSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type ServiceDeskSelectProps = {
  value: string;
  options: ServiceDeskSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
  menuClassName?: string;
  style?: CSSProperties;
  onChange: (value: string) => void;
  onOpen?: () => void;
};

function ServiceDeskSelect({
  value,
  options,
  placeholder = 'Select option',
  disabled = false,
  ariaLabel,
  className = '',
  menuClassName = '',
  style,
  onChange,
  onOpen,
}: ServiceDeskSelectProps) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuScrollFrameRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});

  const selected = options.find((option) => option.value === value);
  const selectedLabel = selected?.label || placeholder;

  const updateMenuPosition = () => {
    const trigger = triggerRef.current;
    if (!trigger || typeof window === 'undefined') return;

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

    const nextStyle: CSSProperties = {
      position: 'fixed',
      left,
      top,
      width: menuWidth,
      maxHeight,
      zIndex: 2147483600,
    };

    setMenuStyle((current) => (areFloatingMenuStylesEqual(current, nextStyle) ? current : nextStyle));
  };

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

    const handleResize = () => updateMenuPosition();
    const handleScroll = (event: Event) => {
      const target = event.target as Node | null;

      // Keep the option list open when the user scrolls inside the dropdown itself.
      // Close it for page/modal scrolling instead of recalculating position every frame;
      // that keeps the create-ticket modal smooth.
      if (target && menuRef.current?.contains(target)) return;

      setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);

      if (menuScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(menuScrollFrameRef.current);
        menuScrollFrameRef.current = null;
      }
    };
  }, [open, value, options.length]);

  const menuNode = open && !disabled && typeof document !== 'undefined'
    ? createPortal(
        <div ref={menuRef} style={{}} role="listbox" aria-label={ariaLabel || placeholder} className="">
          {options.map((option) => {
            const active = option.value === value;

            return (
              <button key={`${option.value}-${option.label}`} type="button" role="option" aria-selected={active} disabled={option.disabled} className="" onClick={() => { if (option.disabled) return; onChange(option.value); setOpen(false); }}>
                <span>{option.label}</span>
                {active && <span>✓</span>}
              </button>
            );
          })}
        </div>,
        document.body
      )
    : null;

  return (
    <div style={{}} className="">
      <button ref={triggerRef} type="button" className="" onClick={() => { if (disabled) return; onOpen?.(); setOpen((current) => !current); }} disabled={disabled} aria-expanded={open} aria-label={ariaLabel || placeholder}>
        <span>{selectedLabel}</span>
        <ChevronDown size={14} />
      </button>
      {menuNode}
    </div>
  );
}

async function safeApi<T>(
  label: string,
  request: Promise<T>,
  fallback: T,
  required = false
): Promise<T> {
  try {
    return await request;
  } catch (error) {
    console.error(`Service Desk API failed: ${label}`, error);

    if (required) {
      throw error;
    }

    return fallback;
  }
}

function getId(row: any) {
  return String(row?.id ?? row?.IncidentID ?? row?.incidentId ?? '');
}

function makeIncidentId() {
  const timePart = Date.now().toString().slice(-6);
  const randomPart = Math.floor(Math.random() * 90 + 10);
  return `INC-${timePart}${randomPart}`;
}

function getClientName(client: any) {
  return client?.companyName || client?.requesterName || client?.RequesterName || client?.customerName || client?.CustomerName || client?.name || client?.username || client?.userID || client?.UserID || client?.Username || '';
}

function getClientId(client: any) {
  return String(client?.id ?? client?.userID ?? client?.UserID ?? client?.requesterId ?? client?.RequesterID ?? client?.customerId ?? client?.CustomerID ?? getClientName(client));
}

function cleanAssetText(value: any, fallback = '') {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  if (!text || text === '-' || text.toLowerCase() === 'null' || text.toLowerCase() === 'undefined') return fallback;
  return text;
}

function inferAssetBrand(...values: any[]) {
  const text = values.map((value) => cleanAssetText(value)).filter(Boolean).join(' ').toLowerCase();
  if (!text) return '';

  const rules = [
    { brand: 'Dell', keys: ['dell', 'latitude', 'optiplex', 'precision', 'vostro', 'inspiron', 'xps'] },
    { brand: 'HP', keys: ['hewlett', 'hp ', 'probook', 'elitebook', 'zbook', 'pavilion', 'compaq'] },
    { brand: 'Lenovo', keys: ['lenovo', 'thinkpad', 'thinkcentre', 'ideapad', 'legion'] },
    { brand: 'Apple', keys: ['apple', 'macbook', 'imac', 'mac mini', 'mac pro'] },
    { brand: 'Microsoft', keys: ['surface'] },
    { brand: 'Acer', keys: ['acer', 'aspire', 'travelmate', 'predator'] },
    { brand: 'ASUS', keys: ['asus', 'zenbook', 'vivobook', 'rog '] },
    { brand: 'Samsung', keys: ['samsung', 'galaxy'] },
    { brand: 'Huawei', keys: ['huawei', 'matebook'] },
    { brand: 'Toshiba', keys: ['toshiba', 'dynabook'] },
  ];

  return rules.find((rule) => rule.keys.some((key) => text.includes(key)))?.brand || '';
}

function getAssetValue(asset: any) {
  return cleanAssetText(
    asset?.assetTag ||
      asset?.name ||
      asset?.computerName ||
      asset?.ComputerName ||
      asset?.DeviceName ||
      asset?.Object_DeviceID ||
      asset?.DeviceID ||
      asset?.assetId ||
      asset?.id ||
      asset?.AssetTag ||
      asset?.AssetID
  );
}

function getAssetBrand(asset: any) {
  return cleanAssetText(
    asset?.brand ||
      asset?.Brand ||
      asset?.manufacturer ||
      asset?.Manufacturer ||
      inferAssetBrand(getAssetModel(asset), getAssetValue(asset), asset?.deviceType, asset?.DeviceType)
  );
}

function getAssetModel(asset: any) {
  return cleanAssetText(asset?.model || asset?.Model || asset?.DeviceModelName || asset?.machineType || asset?.MachineType);
}

function getAssetOS(asset: any) {
  return cleanAssetText(asset?.osName || asset?.os || asset?.OS || asset?.PlatformType || asset?.operatingSystem || asset?.OperatingSystem);
}


function normalizeAssetLookupKey(value: any) {
  return cleanAssetText(value).toLowerCase();
}

function getAssetLookupValues(asset: any) {
  return [
    asset?.id,
    asset?.ID,
    asset?.assetId,
    asset?.AssetID,
    asset?.assetTag,
    asset?.AssetTag,
    asset?.name,
    asset?.computerName,
    asset?.ComputerName,
    asset?.DeviceName,
    asset?.Object_DeviceID,
    asset?.DeviceID,
    getAssetValue(asset),
  ]
    .map(normalizeAssetLookupKey)
    .filter(Boolean);
}

function findMatchingAsset(assets: any[], assetId: any) {
  const target = normalizeAssetLookupKey(assetId);
  if (!target) return null;

  return (assets || []).find((asset) => getAssetLookupValues(asset).includes(target)) || null;
}

function buildHydratedAssetFields(incident: any, asset: any) {
  if (!asset) return {};

  const assetOS = getAssetOS(asset);

  return {
    assetId: cleanAssetText(incident?.assetId || incident?.AssetID || getAssetValue(asset)),
    assetBrand: cleanAssetText(incident?.assetBrand || incident?.AssetBrand || getAssetBrand(asset)),
    assetModel: cleanAssetText(incident?.assetModel || incident?.AssetModel || getAssetModel(asset)),
    assetOS: cleanAssetText(incident?.assetOS || incident?.AssetOS || assetOS),
    deviceType: cleanAssetText(incident?.deviceType || incident?.DeviceType || asset?.deviceType || asset?.DeviceType || assetOS),
  };
}

async function hydrateIncidentAssetFields(incident: any) {
  const assetId = cleanAssetText(incident?.assetId || incident?.AssetID);
  if (!assetId) return {};

  const requesterName = cleanAssetText(incident?.requesterName || incident?.RequesterName);
  const assetRequests: Promise<any[]>[] = [
    safeApi('GET /api/assets search for edit asset hydration', assetsService.search(assetId), []),
    safeApi('GET /api/assets all for edit asset hydration', assetsService.getAll(), []),
  ];

  if (requesterName) {
    assetRequests.unshift(
      safeApi('GET /api/assets by requester for edit asset hydration', assetsService.getByCustomer(requesterName), [])
    );
  }

  const results = await Promise.all(assetRequests);
  const mergedAssets = mergeAssetRows(...results.filter(Array.isArray));
  const matchedAsset = findMatchingAsset(mergedAssets, assetId);

  return buildHydratedAssetFields(incident, matchedAsset);
}

function getAssetSearchText(asset: any) {
  return [
    getAssetValue(asset),
    getAssetBrand(asset),
    getAssetModel(asset),
    getAssetOS(asset),
    asset?.deviceType || asset?.DeviceType || '',
    asset?.requesterName || asset?.RequesterName || asset?.customerName || asset?.CustomerName || asset?.department || '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function getUserName(user: any) {
  return (
    user?.name ||
    user?.Name ||
    user?.fullName ||
    user?.FullName ||
    user?.displayName ||
    user?.DisplayName ||
    user?.username ||
    user?.Username ||
    user?.userName ||
    user?.UserName ||
    user?.email ||
    user?.Email ||
    ''
  );
}

function getCurrentLoginName(user: any) {
  return (
    getUserName(user) ||
    user?.userID ||
    user?.UserID ||
    user?.id ||
    user?.ID ||
    user?.email ||
    user?.Email ||
    'Current User'
  );
}

function normalizeServiceDeskMatchValue(value: any) {
  return String(value || '').trim().toLowerCase();
}

function getServiceDeskUserIdentityValues(user: any) {
  return [
    getUserName(user),
    getCurrentLoginName(user),
    user?.name,
    user?.Name,
    user?.fullName,
    user?.FullName,
    user?.username,
    user?.Username,
    user?.userID,
    user?.UserID,
    user?.email,
    user?.Email,
    user?.id,
    user?.ID,
  ]
    .map(normalizeServiceDeskMatchValue)
    .filter(Boolean);
}

function getServiceDeskRoleText(user: any) {
  return getUserRoleNames(user).join(' ').toLowerCase();
}

function getCurrentLoginId(user: any) {
  return String(
    user?.emaUserID ||
      user?.EMAUserID ||
      user?.EmaUserID ||
      user?.id ||
      user?.ID ||
      user?.userID ||
      user?.UserID ||
      user?.userId ||
      user?.UserId ||
      user?.email ||
      user?.Email ||
      getCurrentLoginName(user)
  );
}

function normalizeAssetKey(asset: any) {
  return String(
    asset?.id ||
      asset?.ID ||
      asset?.assetId ||
      asset?.AssetID ||
      asset?.assetTag ||
      asset?.AssetTag ||
      asset?.computerName ||
      asset?.ComputerName ||
      asset?.DeviceID ||
      asset?.Object_DeviceID ||
      getAssetValue(asset) ||
      JSON.stringify(asset)
  )
    .trim()
    .toLowerCase();
}

function mergeAssetRows(...groups: any[][]) {
  const map = new Map<string, any>();

  groups.flat().forEach((asset) => {
    if (!asset || typeof asset !== 'object') return;
    const key = normalizeAssetKey(asset);
    if (!key || map.has(key)) return;
    map.set(key, asset);
  });

  return Array.from(map.values());
}

function getCategoryName(row: any) {
  return row?.name || row?.categoryName || row?.CategoryName || row?.label || row?.Category || '';
}

function getChildren(row: any, key: 'subcategories' | 'details') {
  if (!row) return [];
  if (Array.isArray(row[key])) return row[key];
  if (Array.isArray(row.children)) return row.children;
  if (Array.isArray(row.items)) return row.items;
  return [];
}

function parseApiDate(value: any) {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  // Backend SQL datetime often comes as "2026-05-24T10:17:00.000"
  // without timezone. That value is UTC from DB, but browser treats it
  // as local time. Force no-offset ISO/SQL values to UTC before formatting
  // to Malaysia time.
  const hasExplicitTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw);
  const looksLikeSqlDateTime = /^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,7})?)?)?$/.test(raw);

  const normalized = raw.includes(' ') && looksLikeSqlDateTime ? raw.replace(' ', 'T') : raw;
  const valueToParse = looksLikeSqlDateTime && !hasExplicitTimezone ? `${normalized}Z` : normalized;

  const date = new Date(valueToParse);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeDate(value: any) {
  if (!value) return '';

  const date = parseApiDate(value);
  if (!date) return String(value);

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: MALAYSIA_TIME_ZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function normalizeDateTime(value: any) {
  if (!value) return '—';

  const date = parseApiDate(value);
  if (!date) return String(value);

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: MALAYSIA_TIME_ZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace(',', '');
}

function initialText(value: string) {
  if (!value) return 'NA';
  const words = value.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join('') || 'NA';
}

function statusClass(status: string) {
  return status.toLowerCase().replace(/\s+/g, '-');
}

function normalizeStatus(value: any) {
  return String(value || '').trim().toLowerCase();
}


function standardizeIncidentStatus(value: any) {
  const text = String(value || '').trim();
  const normalized = text.toLowerCase();
  if (normalized === 'solved') return 'Closed';
  if (normalized === 'pending approval') return 'Resolved';
  if (normalized === 're-open' || normalized === 'reopen') return 'In Progress';
  return text;
}

function isDeleteLockedStatus(status: any) {
  const normalized = normalizeStatus(status);
  return normalized === 'closed';
}

function getOperationalReason(data: any) {
  const reasonFields = [data?.additionalMemo, data?.remarks];

  for (const value of reasonFields) {
    const reason = String(value ?? '').trim();
    if (reason) return reason;
  }

  return '';
}

function priorityClass(priority: string) {
  return priority.toLowerCase();
}

function statusRank(status: string) {
  const map: Record<string, number> = {
    Awaiting: 1,
    Assigned: 2,
    'In Progress': 3,
    Resolved: 4,
    Closed: 6,
  };
  return map[status] || 99;
}

function getWorkflowStatusOptions(status: any, isEngineerUser = false, isAdminUser = false) {
  const normalized = normalizeStatus(status);

  if (isEngineerUser) {
    if (normalized === 'in progress') return ['In Progress', 'Resolved'];
    if (normalized === 'resolved') return ['Resolved'];
    if (normalized === 'closed') return ['Closed'];
    if (normalized === 'assigned') return ['Assigned'];
    return ['Awaiting'];
  }

  if (isAdminUser) {
    if (normalized === 'assigned') return ['Assigned'];
    if (normalized === 'in progress') return ['In Progress', 'Resolved'];
    if (normalized === 'resolved') return ['Resolved', 'Closed', 'Re-open'];
    if (normalized === 'closed') return ['Closed'];
  }

  return [standardizeIncidentStatus(status || 'Awaiting')];
}

function priorityRank(priority: string) {
  const map: Record<string, number> = {
    Critical: 4,
    High: 3,
    Medium: 2,
    Low: 1,
  };
  return map[priority] || 0;
}

function getSlaMeta(incident: any, now: Date) {
  const normalizedStatus = normalizeStatus(incident?.status);

  if (normalizedStatus === 'closed' || normalizedStatus === 'rejected') {
    return {
      label: normalizedStatus === 'closed' ? 'Closed' : 'Rejected',
      detail: incident?.resolvedAt ? normalizeDateTime(incident.resolvedAt) : 'Completed',
      className: 'resolved',
      statusKey: normalizedStatus === 'closed' ? 'Closed' : 'Rejected',
      minutes: 0,
      dueText: incident?.slaDue ? normalizeDateTime(incident.slaDue) : '—',
    };
  }


  if (!incident?.slaDue) {
    return { label: 'No SLA', detail: 'Not calculated', className: 'unknown', statusKey: 'Unknown', minutes: Infinity, dueText: '—' };
  }

  const due = parseApiDate(incident.slaDue);
  if (!due) {
    return { label: 'Invalid', detail: String(incident.slaDue), className: 'unknown', statusKey: 'Unknown', minutes: Infinity, dueText: String(incident.slaDue) };
  }

  const diffMinutes = Math.floor((due.getTime() - now.getTime()) / 60000);
  const duration = formatSlaDuration(diffMinutes);
  const dueText = normalizeDateTime(incident.slaDue);

  if (diffMinutes < 0) {
    return { label: 'Overdue', detail: `${duration} overdue`, className: 'overdue', statusKey: 'Overdue', minutes: diffMinutes, dueText };
  }

  if (diffMinutes <= 24 * 60) {
    return { label: 'Near Due', detail: `Due in ${duration}`, className: 'near', statusKey: 'Near Due', minutes: diffMinutes, dueText };
  }

  return { label: 'On Time', detail: `Due in ${duration}`, className: 'ontrack', statusKey: 'On Time', minutes: diffMinutes, dueText };
}

function isTicketSlaOverdue(incident: any, now: Date) {
  return getSlaMeta(incident, now).className === 'overdue';
}


function isActiveUser(user: any) {
  if (user?.isActive === false) return false;
  if (String(user?.status || '').toLowerCase() === 'inactive') return false;
  return true;
}

function isEngineer(user: any) {
  return isActiveUser(user) && getUserRoleNames(user).some((role) => isSupportRoleName(role));
}

function splitKnowledgeSteps(value: any) {
  const text = String(value || '').trim();
  if (!text) return [];

  const normalized = text.replace(/\s+/g, ' ').trim();
  const parts = normalized
    .split(/\s+(?=\d+\.\s+)/g)
    .map((item) => item.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean);

  return parts.length > 1 ? parts : [text];
}

function toIsoDateOrEmpty(value: any) {
  const date = parseApiDate(value);
  return date ? date.toISOString() : '';
}

function getMalaysiaDateTimeParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: MALAYSIA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const pick = (type: string) => parts.find((part) => part.type === type)?.value || '';

  return {
    year: pick('year'),
    month: pick('month'),
    day: pick('day'),
    hour: pick('hour'),
    minute: pick('minute'),
  };
}

function toDateTimeLocalInput(value: any) {
  const date = parseApiDate(value);

  if (!date) {
    return '';
  }

  const malaysia = getMalaysiaDateTimeParts(date);
  return `${malaysia.year}-${malaysia.month}-${malaysia.day}T${malaysia.hour}:${malaysia.minute}`;
}

function fromMalaysiaDateTimeLocalInput(value: string) {
  if (!value) return '';

  const date = new Date(`${value}:00${MALAYSIA_UTC_OFFSET}`);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString();
}

export default function ServiceDesk() {
  useEffect(() => {
    return installServiceDeskUiInjection();
  }, []);

  const [currentUser] = useState<AppUser>(() => getStoredUser());
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingLookups, setIsLoadingLookups] = useState(false);
  const [hasLoadedLookups, setHasLoadedLookups] = useState(false);
  const [hasLoadedKb, setHasLoadedKb] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(null);
  const [confirmReason, setConfirmReason] = useState('');
  const [acknowledgedUnavailableEngineerKey, setAcknowledgedUnavailableEngineerKey] = useState('');
  const [acknowledgedSlaOverdueTicketKey, setAcknowledgedSlaOverdueTicketKey] = useState('');

  const [incidents, setIncidents] = useState<any[]>([]);
  const [slaConfigs, setSlaConfigs] = useState<SlaConfig[]>([]);
  const [workingHoursConfigs, setWorkingHoursConfigs] = useState<any[]>([]);
  const [visibilityConfig, setVisibilityConfig] = useState<Record<string, boolean>>({});
  const [roles, setRoles] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [engineersForLevel, setEngineersForLevel] = useState<EngineerOption[]>([]);
  const [isLoadingEngineers, setIsLoadingEngineers] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [knowledgeBaseEntries, setKnowledgeBaseEntries] = useState<any[]>([]);
  const [selectedKbArticle, setSelectedKbArticle] = useState<any | null>(null);

  const [activeQueue, setActiveQueue] = useState<QueueKey>('all');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterAssignedTo, setFilterAssignedTo] = useState('All');
  const [filterSlaStatus, setFilterSlaStatus] = useState('All');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'createdAt',
    direction: 'desc',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(emptyAdvancedFilters());
  const [now, setNow] = useState(new Date());
  const serviceDeskIsScrollingRef = useRef(false);
  const serviceDeskScrollTimerRef = useRef<number | null>(null);
  const serviceDeskScrollFrameRef = useRef<number | null>(null);

  const [formData, setFormData] = useState<any>(emptyForm());
  const [clientAssets, setClientAssets] = useState<any[]>([]);
  const [incidentAttachments, setIncidentAttachments] = useState<any[]>([]);
  const [approvalFeedbackUploaded, setApprovalFeedbackUploaded] = useState(false);
  const [generateApprovalJobsheet, setGenerateApprovalJobsheet] = useState(false);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [assetSearchTerm, setAssetSearchTerm] = useState('');
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [assetDropdownStyle, setAssetDropdownStyle] = useState<CSSProperties>({});
  const assetComboRef = useRef<HTMLDivElement>(null);
  const assetDropdownPortalRef = useRef<HTMLDivElement>(null);
  const assetDropdownFrameRef = useRef<number | null>(null);
  const detailPanelRef = useRef<HTMLElement>(null);
  const rejectReasonRef = useRef<HTMLTextAreaElement>(null);
  const rootCauseRef = useRef<HTMLTextAreaElement>(null);
  const actionPlanRef = useRef<HTMLTextAreaElement>(null);

  const [kbFormOpen, setKbFormOpen] = useState(false);
  const [kbFormData, setKbFormData] = useState<any>({ id: '', title: '', incidentDetails: '', resolution: '' });
  const [kbSearch, setKbSearch] = useState('');
  const [kbSortDirection, setKbSortDirection] = useState<'asc' | 'desc'>('asc');

  const incidentPermissions = currentUser?.permissions?.incidents;
  const hasIncidentPermissionProfile = Boolean(incidentPermissions);
  const moduleCanEdit = !hasIncidentPermissionProfile || Boolean(incidentPermissions?.edit);
  const moduleCanCreate = !hasIncidentPermissionProfile || moduleCanEdit || Boolean(incidentPermissions?.create);
  const moduleCanDelete = !hasIncidentPermissionProfile || moduleCanEdit || Boolean(incidentPermissions?.delete);
  const serviceDeskRoleText = getServiceDeskRoleText(currentUser);
  const isSuperadminWssb = /super\s*admin|superadmin/i.test(serviceDeskRoleText);
  const isServiceDeskAdminRole = serviceDeskRoleText.includes('admin') || serviceDeskRoleText.includes('service desk');
  const isCurrentUserEngineer = serviceDeskRoleText.includes('support');
  const canAdminManageTickets = moduleCanEdit && isServiceDeskAdminRole;
  const canEngineerWorkTickets = moduleCanEdit && isCurrentUserEngineer && !canAdminManageTickets;
  const canEdit = canAdminManageTickets || canEngineerWorkTickets;
  const canCreate = moduleCanCreate && canAdminManageTickets;
  const canDelete = moduleCanDelete && isSuperadminWssb;
  const canViewAssignedTicketsOnly = isCurrentUserEngineer && !canAdminManageTickets;
  const canEditMainTicketFields = canAdminManageTickets;
  const canUpdateStatus = canAdminManageTickets;
  const canAssignEngineer = canAdminManageTickets;
  const canEditResolutionFields = canAdminManageTickets || canEngineerWorkTickets;
  const canUploadIncidentAttachments = canEditResolutionFields;
  const currentUserIdentityValues = getServiceDeskUserIdentityValues(currentUser);
  const isRequesterAssetLocked = formMode === 'edit';
  const savedWorkflowStatus = formData._originalStatus || formData.status;
  const savedWorkflowStatusKey = normalizeStatus(savedWorkflowStatus);
  const statusWorkflowOptions = useMemo(
    () => getWorkflowStatusOptions(savedWorkflowStatus, canEngineerWorkTickets, canAdminManageTickets),
    [savedWorkflowStatus, canEngineerWorkTickets, canAdminManageTickets]
  );
  const canChangeTicketStatus = canUpdateStatus || (canEngineerWorkTickets && ['in progress', 'resolved'].includes(savedWorkflowStatusKey));
  const requiresEngineerResolutionFields = formMode === 'edit' && canEngineerWorkTickets && ['in progress', 'resolved'].includes(normalizeStatus(formData.status));

  const supportRoles = useMemo(() => {
    const roleNames = new Set<string>();

    users.forEach((user) => {
      getUserRoleNames(user).forEach((roleName) => {
        const normalized = normalizeSupportLevelName(roleName);
        if (SERVICE_DESK_SUPPORT_LEVELS.some((level) => level.toLowerCase() === normalized.toLowerCase())) {
          roleNames.add(normalized);
        }
      });
    });

    roles.forEach((role) => {
      const normalized = normalizeSupportLevelName(getRoleDisplayName(role));
      if (SERVICE_DESK_SUPPORT_LEVELS.some((level) => level.toLowerCase() === normalized.toLowerCase())) {
        roleNames.add(normalized);
      }
    });

    // Keep the dropdown predictable even if the role API returns no rows yet.
    SERVICE_DESK_SUPPORT_LEVELS.forEach((level) => roleNames.add(level));

    return SERVICE_DESK_SUPPORT_LEVELS.filter((level) => roleNames.has(level)).map((name) => ({ id: name, name, role: name }));
  }, [roles, users]);

  const engineers = useMemo(() => users.filter(isEngineer), [users]);

  const assignableEngineers = useMemo(() => {
    if (!formData.assignedLevel) return [];

    const source = engineersForLevel.length > 0 ? engineersForLevel : engineers;
    const selectedLevel = String(formData.assignedLevel || '');

    return source.filter((engineer) => userMatchesSupportLevel(engineer, selectedLevel));
  }, [engineers, engineersForLevel, formData.assignedLevel]);

  const selectedIncident = useMemo(
    () => incidents.find((incident) => getId(incident) === selectedIncidentId) || null,
    [incidents, selectedIncidentId]
  );

  const selectedCategory = useMemo(() => {
    return categories.find((category) => getCategoryName(category) === formData.category) || null;
  }, [categories, formData.category]);

  const selectedSubcategory = useMemo(() => {
    const subs = getChildren(selectedCategory, 'subcategories');
    return subs.find((sub: any) => getCategoryName(sub) === formData.subcategory) || null;
  }, [selectedCategory, formData.subcategory]);

  const subcategoryOptions = useMemo(() => getChildren(selectedCategory, 'subcategories'), [selectedCategory]);
  const detailOptions = useMemo(() => getChildren(selectedSubcategory, 'details'), [selectedSubcategory]);

  const requesterOptions = useMemo(() => {
    const seen = new Set<string>();
    const list = (Array.isArray(users) ? users : [])
      .filter((user: any) => {
        const status = String(user?.status || user?.Status || 'Active').toLowerCase();
        return status !== 'inactive' && status !== 'disabled';
      })
      .map((user: any) => ({
        ...user,
        id: getClientId(user),
        name: getUserName(user) || getClientName(user),
      }))
      .filter((user: any) => {
        const id = getClientId(user);
        const name = getClientName(user);
        const key = `${id}::${name}`.toLowerCase();
        if (!name || seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    const currentName = currentUser?.name || currentUser?.username || currentUser?.userID || '';
    if (currentName && !list.some((user: any) => getClientName(user) === currentName)) {
      list.unshift({ id: String(currentUser?.id || currentName), name: currentName });
    }

    return list;
  }, [users, currentUser]);

  const filteredClientAssets = useMemo(() => {
    const term = assetSearchTerm.trim().toLowerCase();
    return clientAssets
      .filter((asset) => !term || getAssetSearchText(asset).includes(term))
      .slice(0, 40);
  }, [clientAssets, assetSearchTerm]);

  useEffect(() => {
    void loadData();
    void ensureKnowledgeBaseLoaded(true);
  }, []);

  useEffect(() => {
    const activeAttachmentIncidentId = viewMode === 'form' ? getId(formData) : selectedIncidentId;

    if (!activeAttachmentIncidentId) {
      setIncidentAttachments([]);
      return;
    }

    void loadIncidentAttachments(activeAttachmentIncidentId);
  }, [selectedIncidentId, viewMode, formData.id, formData.IncidentID]);


  useEffect(() => {
    const timer = window.setInterval(() => {
      // Do not refresh SLA timer while the user is scrolling.
      // This prevents full Service Desk re-render during scroll.
      if (!serviceDeskIsScrollingRef.current) {
        setNow(new Date());
      }
    }, 120000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const markScrolling = (event: Event) => {
      const target = event.target as HTMLElement | null;

      // Internal modal/dropdown scrolling should not toggle a global HTML class on every frame.
      // That class is only needed for the ticket registry/table area.
      if (
        target?.closest?.('.service-desk-ticket-form-body') ||
        target?.closest?.('.setting-select-menu') ||
        target?.closest?.('.service-desk-asset-dropdown')
      ) {
        return;
      }

      if (serviceDeskScrollFrameRef.current !== null) return;

      serviceDeskScrollFrameRef.current = window.requestAnimationFrame(() => {
        serviceDeskScrollFrameRef.current = null;

        if (!serviceDeskIsScrollingRef.current) {
          serviceDeskIsScrollingRef.current = true;
          document.documentElement.classList.add('service-desk-is-scrolling');
        }

        if (serviceDeskScrollTimerRef.current) {
          window.clearTimeout(serviceDeskScrollTimerRef.current);
        }

        serviceDeskScrollTimerRef.current = window.setTimeout(() => {
          serviceDeskIsScrollingRef.current = false;
          document.documentElement.classList.remove('service-desk-is-scrolling');
          serviceDeskScrollTimerRef.current = null;
        }, 260);
      });
    };

    window.addEventListener('scroll', markScrolling, { passive: true, capture: true });

    return () => {
      window.removeEventListener('scroll', markScrolling, true);

      if (serviceDeskScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(serviceDeskScrollFrameRef.current);
        serviceDeskScrollFrameRef.current = null;
      }

      if (serviceDeskScrollTimerRef.current) {
        window.clearTimeout(serviceDeskScrollTimerRef.current);
      }

      serviceDeskIsScrollingRef.current = false;
      document.documentElement.classList.remove('service-desk-is-scrolling');
    };
  }, []);


  useEffect(() => {
    let cancelled = false;

    async function loadEngineersBySupportLevel() {
      const selectedLevel = String(formData.assignedLevel || '').trim();

      if (!selectedLevel) {
        setEngineersForLevel([]);
        setIsLoadingEngineers(false);
        return;
      }

      const emaEngineersForLevel = engineers.filter((engineer) => userMatchesSupportLevel(engineer, selectedLevel));

      // Dropdown source of truth is EMA_User. Resource Planning only adds leave/availability warning metadata.
      setEngineersForLevel(emaEngineersForLevel);

      if (emaEngineersForLevel.length === 0) {
        setIsLoadingEngineers(false);
        return;
      }

      setIsLoadingEngineers(true);

      try {
        const ticketDate =
          toIsoDateOrEmpty(formData.createdAt)?.slice(0, 10) ||
          new Date().toISOString().slice(0, 10);

        const rows = await engineerAvailabilityService.getAvailableEngineers(ticketDate, selectedLevel);
        const mergedRows = mergeEngineerAvailabilityIntoEmaUsers(
          emaEngineersForLevel,
          Array.isArray(rows) ? rows : []
        );

        if (!cancelled) {
          setEngineersForLevel(mergedRows);
        }
      } catch (error) {
        console.error('Failed to load engineer leave schedule from Resource Planning', error);

        if (!cancelled) {
          setEngineersForLevel(emaEngineersForLevel);
          setToast({
            message: 'Engineer list is loaded from EMA_User, but leave schedule could not be checked.',
            type: 'warning',
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoadingEngineers(false);
        }
      }
    }

    void loadEngineersBySupportLevel();

    return () => {
      cancelled = true;
    };
  }, [formData.assignedLevel, formData.createdAt, engineers]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;

      if (assetComboRef.current?.contains(target)) return;
      if (assetDropdownPortalRef.current?.contains(target)) return;

      setShowAssetDropdown(false);
    }

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!showAssetDropdown) return undefined;

    updateAssetDropdownPosition();

    const handleResize = () => updateAssetDropdownPosition();
    const handleScroll = (event: Event) => {
      const target = event.target as Node | null;

      // Keep the asset list open when scrolling inside the list, but close it when
      // the page/modal scrolls. This avoids heavy position recalculation during form scroll.
      if (target && assetDropdownPortalRef.current?.contains(target)) return;

      setShowAssetDropdown(false);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);

      if (assetDropdownFrameRef.current !== null) {
        window.cancelAnimationFrame(assetDropdownFrameRef.current);
        assetDropdownFrameRef.current = null;
      }
    };
  }, [showAssetDropdown]);

  useEffect(() => {
    if (!selectedIncidentId) return undefined;

    function closeDetailOnOutsideClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      if (detailPanelRef.current?.contains(target)) return;
      if (target.closest('[data-ticket-row="true"]')) return;
      if (target.closest('.settings-confirm-backdrop')) return;
      if (target.closest('.settings-confirm-modal')) return;
      if (target.closest('.setting-select-menu')) return;
      if (target.closest('.uam-filter-menu')) return;
      if (target.closest('.service-desk-asset-dropdown')) return;
      if (target.closest('.settings-toast')) return;

      setSelectedIncidentId('');
    }

    function closeDetailOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSelectedIncidentId('');
      }
    }

    document.addEventListener('mousedown', closeDetailOnOutsideClick);
    document.addEventListener('keydown', closeDetailOnEscape);

    return () => {
      document.removeEventListener('mousedown', closeDetailOnOutsideClick);
      document.removeEventListener('keydown', closeDetailOnEscape);
    };
  }, [selectedIncidentId]);

  useEffect(() => {
    if (viewMode === 'form') {
      void ensureLookupsLoaded();
    }
    if (viewMode === 'kb') {
      void ensureKnowledgeBaseLoaded();
    }
  }, [viewMode]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeQueue, searchTerm, filterStatus, filterPriority, filterAssignedTo, filterSlaStatus, showAdvanced, advancedFilters]);

  async function loadData(silent = false) {
    if (!silent) setIsLoading(true);

    try {
      const incidentsData = await safeApi('GET /api/incidents', incidentsService.getAll(), [], true);
      const nextIncidents = Array.isArray(incidentsData)
        ? incidentsData.map((incident: any) => ({ ...incident, status: standardizeIncidentStatus(incident.status) }))
        : [];

      setIncidents(nextIncidents);
      setSelectedIncidentId((current) => {
        if (!current) return '';
        return nextIncidents.some((incident) => getId(incident) === current) ? current : '';
      });

      if (!silent && nextIncidents.length === 0) {
        setToast({
          message: 'Connected to API, but /api/incidents returned 0 records.',
          type: 'info',
        });
      }

      void loadEssentialConfig();
    } catch (error) {
      console.error('Failed to load Service Desk incidents', error);
      setToast({
        message: error instanceof Error ? error.message : 'Failed to load service desk incidents.',
        type: 'error',
      });
    } finally {
      if (!silent) setIsLoading(false);
    }
  }

  async function loadEssentialConfig() {
    try {
      const [slaData, workingHoursData, visibilityData] = await Promise.all([
        safeApi('GET /api/incident-config', incidentConfigService.getAll(), []),
        safeApi('GET /api/incident-config/working-hours', incidentConfigService.getWorkingHours(), []),
        safeApi('GET /api/incident-config/visibility', incidentConfigService.getVisibilityConfig(), {}),
      ]);

      setSlaConfigs(Array.isArray(slaData) ? slaData : []);
      setWorkingHoursConfigs(Array.isArray(workingHoursData) ? workingHoursData : []);
      setVisibilityConfig(visibilityData || {});
    } catch (error) {
      console.warn('Service Desk essential config load failed', error);
    }
  }

  async function ensureLookupsLoaded() {
    if (hasLoadedLookups || isLoadingLookups) return;

    setIsLoadingLookups(true);

    try {
      const [rolesData, usersData, catsData] = await Promise.all([
        safeApi('GET /api/roles', rolesService.getAll(), []),
        safeApi('GET /api/users', usersService.getAll(), []),
        safeApi('GET /api/incident-categories', incidentCategoriesService.getAll(), []),
      ]);

      setRoles(Array.isArray(rolesData) ? rolesData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setCategories(Array.isArray(catsData) ? catsData : []);
      setHasLoadedLookups(true);
    } catch (error) {
      console.error('Failed to load service desk lookup data', error);
      setToast({
        message: 'Failed to load form lookup data.',
        type: 'error',
      });
    } finally {
      setIsLoadingLookups(false);
    }
  }

  async function ensureKnowledgeBaseLoaded(force = false) {
    if (hasLoadedKb && !force) return;

    setHasLoadedKb(false);

    try {
      const kbData = await safeApi('GET /api/knowledge-base', knowledgeBaseService.getAll(), []);
      setKnowledgeBaseEntries(Array.isArray(kbData) ? kbData : []);
    } catch (error) {
      console.error('Failed to load knowledge base', error);
      setToast({
        message: 'Failed to load knowledge base.',
        type: 'error',
      });
    } finally {
      setHasLoadedKb(true);
    }
  }

  async function refreshData() {
    setIsRefreshing(true);
    try {
      await loadData(true);

      if (hasLoadedLookups) {
        setHasLoadedLookups(false);
        await ensureLookupsLoaded();
      }

      if (hasLoadedKb) {
        setHasLoadedKb(false);
        await ensureKnowledgeBaseLoaded(true);
      }

      setToast({ message: 'Service desk refreshed.', type: 'success' });
    } finally {
      setIsRefreshing(false);
    }
  }

  function fieldVisible(key: string) {
    if (visibilityConfig && Object.prototype.hasOwnProperty.call(visibilityConfig, key)) {
      return visibilityConfig[key] !== false;
    }
    return true;
  }

  function closeConfirmDialog() {
    setConfirmDialog(null);
    setConfirmReason('');
  }

  async function runConfirmAction() {
    if (!confirmDialog || confirmDialog.loading) return;

    const reason = confirmReason.trim();
    const minReasonLength = confirmDialog.minReasonLength ?? 1;

    if (confirmDialog.requiresReason && reason.length < minReasonLength) {
      setToast({ message: 'Reason is required. Please enter the reason before continuing.', type: 'error' });
      return;
    }

    const action = confirmDialog.onConfirm;
    setConfirmDialog((current) => (current ? { ...current, loading: true } : current));

    try {
      await action(reason);
      closeConfirmDialog();
    } catch (error) {
      console.error('Confirm action failed', error);
      setConfirmDialog((current) => (current ? { ...current, loading: false } : current));
    }
  }

  function updateFormField(field: string, value: any) {
    if (field === 'rootCause') {
      rootCauseRef.current?.setCustomValidity('');
    }
    if (field === 'actionPlan') {
      actionPlanRef.current?.setCustomValidity('');
    }

    setFormData((prev: any) => {
      if (field === 'assignedLevel') {
        return { ...prev, assignedLevel: value, assignedTo: '' };
      }

      if (field === 'priority') {
        return {
          ...prev,
          priority: value,
          slaPriority: getSlaPriorityCode(value),
          slaDue: calculateSlaDue({ ...prev, priority: value, slaPriority: getSlaPriorityCode(value), slaDue: '' }, { force: true }),
        };
      }

      if (field === 'createdAt') {
        return {
          ...prev,
          createdAt: value,
          slaDue: calculateSlaDue({ ...prev, createdAt: value, slaDue: '' }, { force: true }),
        };
      }

      return { ...prev, [field]: value };
    });
  }

  function addWorkingHours(startDate: Date, hoursToAdd: number) {
    if (!workingHoursConfigs || workingHoursConfigs.length === 0) {
      return new Date(startDate.getTime() + hoursToAdd * 60 * 60 * 1000);
    }

    const daysMap: Record<number, any> = {
      1: workingHoursConfigs.find((c) => c.dayOfWeek === 'Monday'),
      2: workingHoursConfigs.find((c) => c.dayOfWeek === 'Tuesday'),
      3: workingHoursConfigs.find((c) => c.dayOfWeek === 'Wednesday'),
      4: workingHoursConfigs.find((c) => c.dayOfWeek === 'Thursday'),
      5: workingHoursConfigs.find((c) => c.dayOfWeek === 'Friday'),
      6: workingHoursConfigs.find((c) => c.dayOfWeek === 'Saturday'),
      0: workingHoursConfigs.find((c) => c.dayOfWeek === 'Sunday'),
    };

    let current = new Date(startDate);
    let minutesToAdd = hoursToAdd * 60;
    let safety = 0;

    while (minutesToAdd > 0 && safety < 60) {
      safety += 1;
      const config = daysMap[current.getDay()];

      if (!config || config.isRestDay) {
        current.setDate(current.getDate() + 1);
        current.setHours(0, 0, 0, 0);
        continue;
      }

      if (config.is24Hours) {
        current = new Date(current.getTime() + minutesToAdd * 60000);
        minutesToAdd = 0;
        break;
      }

      const [startH, startM] = String(config.startTime || '09:00').split(':').map(Number);
      const [endH, endM] = String(config.endTime || '18:00').split(':').map(Number);
      const dayStart = new Date(current);
      dayStart.setHours(startH || 9, startM || 0, 0, 0);
      const dayEnd = new Date(current);
      dayEnd.setHours(endH || 18, endM || 0, 0, 0);

      if (current < dayStart) current = new Date(dayStart);
      if (current >= dayEnd) {
        current.setDate(current.getDate() + 1);
        current.setHours(0, 0, 0, 0);
        continue;
      }

      const available = Math.floor((dayEnd.getTime() - current.getTime()) / 60000);
      const used = Math.min(available, minutesToAdd);
      current = new Date(current.getTime() + used * 60000);
      minutesToAdd -= used;

      if (minutesToAdd > 0) {
        current.setDate(current.getDate() + 1);
        current.setHours(0, 0, 0, 0);
      }
    }

    return current;
  }

  function getSlaConfigForPriority(priority: string) {
    const slaCode = getSlaPriorityCode(priority).toLowerCase();

    return slaConfigs.find((item) =>
      String(item.priority || '').trim().toLowerCase() === slaCode
    );
  }

  function calculateSlaDue(data: any, options: { force?: boolean } = {}) {
    const existingSlaDue = toIsoDateOrEmpty(data.slaDue);

    if (existingSlaDue && !options.force) {
      return existingSlaDue;
    }

    const config = getSlaConfigForPriority(data.priority);

    if (!config?.resolutionTimeHrs) {
      return '';
    }

    const createdAt = toIsoDateOrEmpty(data.createdAt) || new Date().toISOString();
    const calculatedDue = addWorkingHours(parseApiDate(createdAt) || new Date(), Number(config.resolutionTimeHrs));

    return calculatedDue.toISOString();
  }

  function getSlaPreview(data: any) {
    const config = getSlaConfigForPriority(data.priority);
    const due = calculateSlaDue(data);

    return {
      code: getSlaPriorityCode(data.priority),
      config,
      due,
      meta: getSlaMeta({ ...data, slaDue: due }, now),
    };
  }

  function showEngineerAvailabilityReminder(engineer: EngineerOption) {
    const engineerKey = getEngineerKey(engineer) || getUserName(engineer);
    const engineerName = getUserName(engineer) || 'Selected engineer';

    setConfirmReason('');
    setConfirmDialog({
      tone: 'warning',
      title: 'Engineer not available',
      message: getEngineerLeaveMessage(engineer),
      meta: `${engineerName} is still assigned to this ticket. You can continue if this assignment is intentional.`,
      confirmLabel: 'OK, Continue',
      cancelLabel: 'Close',
      onConfirm: () => {
        setAcknowledgedUnavailableEngineerKey(engineerKey);
      },
    });
  }

  async function checkEngineerAvailability(assignedTo: string) {
    if (!assignedTo) return true;

    const selectedEngineer =
      assignableEngineers.find((engineer) => getUserName(engineer) === assignedTo || getEngineerKey(engineer) === assignedTo) || null;

    if (selectedEngineer && isEngineerOnLeave(selectedEngineer)) {
      const engineerKey = getEngineerKey(selectedEngineer) || getUserName(selectedEngineer);
      if (engineerKey !== acknowledgedUnavailableEngineerKey) {
        showEngineerAvailabilityReminder(selectedEngineer);
      }
    }

    return true;
  }

  function handleAssignedEngineerChange(value: string) {
    updateFormField('assignedTo', value);

    if (!value) {
      setAcknowledgedUnavailableEngineerKey('');
      return;
    }

    const selectedEngineer = assignableEngineers.find(
      (engineer) => getUserName(engineer) === value || getEngineerKey(engineer) === value
    );

    if (selectedEngineer && isEngineerOnLeave(selectedEngineer)) {
      setAcknowledgedUnavailableEngineerKey('');
      showEngineerAvailabilityReminder(selectedEngineer);
    } else {
      setAcknowledgedUnavailableEngineerKey('');
    }
  }

  function updateAssetDropdownPosition() {
    if (typeof window === 'undefined') return;

    const rect = assetComboRef.current?.getBoundingClientRect();
    if (!rect) return;

    const viewportPadding = 16;
    const dropdownWidth = Math.max(rect.width, 420);
    const left = Math.min(
      Math.max(viewportPadding, rect.left),
      Math.max(viewportPadding, window.innerWidth - dropdownWidth - viewportPadding)
    );

    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const spaceAbove = rect.top - viewportPadding;
    const openBelow = spaceBelow >= 220 || spaceBelow >= spaceAbove;
    const maxHeight = Math.max(180, Math.min(360, openBelow ? spaceBelow : spaceAbove));
    const top = openBelow
      ? rect.bottom + 8
      : Math.max(viewportPadding, rect.top - maxHeight - 8);

    const nextStyle: CSSProperties = {
      position: 'fixed',
      left,
      top,
      width: dropdownWidth,
      maxHeight,
      zIndex: 2147483647,
    };

    setAssetDropdownStyle((current) => (areFloatingMenuStylesEqual(current, nextStyle) ? current : nextStyle));
  }

  function openAssetDropdown() {
    if (isRequesterAssetLocked) return;

    setShowAssetDropdown(true);

    if (typeof window !== 'undefined' && assetDropdownFrameRef.current === null) {
      assetDropdownFrameRef.current = window.requestAnimationFrame(() => {
        assetDropdownFrameRef.current = null;
        updateAssetDropdownPosition();
      });
    }
  }

  async function loadIncidentAttachments(incidentId: string) {
    const id = String(incidentId || '').trim();
    if (!id) {
      setIncidentAttachments([]);
      return;
    }

    setIsLoadingAttachments(true);
    try {
      const token = getStoredAuthToken();
      const response = await fetch(getServiceDeskApiUrl(`/api/incidents/${encodeURIComponent(id)}/attachments`), {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!response.ok) throw new Error((await readAttachmentError(response)) || `Attachment list failed with status ${response.status}`);

      const data = await response.json();
      const activeAttachmentIncidentId = viewMode === 'form' ? getId(formData) : selectedIncidentId;
      if (activeAttachmentIncidentId !== id) return;
      setIncidentAttachments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load incident attachments', error);
      setIncidentAttachments([]);
    } finally {
      setIsLoadingAttachments(false);
    }
  }

  async function uploadIncidentAttachment(event: any) {
    const file = event?.target?.files?.[0];
    const incidentId = viewMode === 'form' ? getId(formData) : selectedIncidentId;

    if (!file) return;

    if (!incidentId) {
      setToast({ message: 'Please save the ticket first before uploading attachment.', type: 'warning' });
      if (event?.target) event.target.value = '';
      return;
    }

    const existingAttachmentCount = incidentAttachments.length;
    const existingAttachmentTotalSize = incidentAttachments.reduce(
      (total, attachment) => total + Number(attachment?.size || attachment?.fileSize || attachment?.FileSize || 0),
      0
    );

    if (existingAttachmentCount >= INCIDENT_ATTACHMENT_MAX_FILES) {
      setToast({ message: `Maximum ${INCIDENT_ATTACHMENT_MAX_FILES} attachments are allowed per ticket.`, type: 'error' });
      if (event?.target) event.target.value = '';
      return;
    }

    if (file.size > INCIDENT_ATTACHMENT_MAX_BYTES) {
      setToast({ message: `Attachment file is too large. Maximum allowed size is ${INCIDENT_ATTACHMENT_MAX_MB}MB per file.`, type: 'error' });
      if (event?.target) event.target.value = '';
      return;
    }

    if (existingAttachmentTotalSize + file.size > INCIDENT_ATTACHMENT_TOTAL_MAX_BYTES) {
      setToast({
        message: `Total attachment size cannot exceed ${INCIDENT_ATTACHMENT_MAX_FILES * INCIDENT_ATTACHMENT_MAX_MB}MB per ticket.`,
        type: 'error',
      });
      if (event?.target) event.target.value = '';
      return;
    }

    setIsUploadingAttachment(true);
    try {
      const body = new FormData();
      body.append('file', file);

      const token = getStoredAuthToken();
      const response = await fetch(getServiceDeskApiUrl(`/api/incidents/${encodeURIComponent(incidentId)}/attachments`), {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body,
      });

      if (!response.ok) {
        const errorMessage = await readAttachmentError(response);
        throw new Error(errorMessage || `Attachment upload failed with status ${response.status}`);
      }

      await loadIncidentAttachments(incidentId);
      await createServiceDeskAuditLog({
        action: 'Upload attachment',
        details: `Attachment ${file.name} uploaded to ticket ${incidentId} by ${getCurrentLoginName(currentUser)}.`,
        entityID: incidentId,
      });
      if (viewMode === 'form' && normalizeStatus(formData.status) === 'resolved') {
        setApprovalFeedbackUploaded(true);
      }
      setToast({ message: 'Attachment uploaded successfully.', type: 'success' });
    } catch (error: any) {
      console.error('Failed to upload incident attachment', error);
      setToast({ message: error?.message || 'Failed to upload attachment.', type: 'error' });
    } finally {
      setIsUploadingAttachment(false);
      if (event?.target) event.target.value = '';
    }
  }

  async function deleteIncidentAttachment(filename: string) {
    const incidentId = viewMode === 'form' ? getId(formData) : selectedIncidentId;
    const safeFilename = String(filename || '').trim();

    if (!incidentId || !safeFilename) return;

    try {
      const token = getStoredAuthToken();
      const response = await fetch(getServiceDeskApiUrl(`/api/incidents/${encodeURIComponent(incidentId)}/attachments/${encodeURIComponent(safeFilename)}`), {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!response.ok) throw new Error(`Attachment delete failed with status ${response.status}`);

      await loadIncidentAttachments(incidentId);
      await createServiceDeskAuditLog({
        action: 'Delete attachment',
        severity: 'Warning',
        details: `Attachment ${safeFilename} deleted from ticket ${incidentId} by ${getCurrentLoginName(currentUser)}.`,
        entityID: incidentId,
      });
      setToast({ message: 'Attachment deleted.', type: 'success' });
    } catch (error) {
      console.error('Failed to delete incident attachment', error);
      setToast({ message: 'Failed to delete attachment.', type: 'error' });
    }
  }

  async function loadClientAssets(requesterName: string, shouldOpenDropdown = false) {
    const queryName = requesterName.trim();

    setIsLoadingAssets(true);

    if (shouldOpenDropdown) {
      openAssetDropdown();
    }

    try {
      const requests: Promise<any[]>[] = [
        safeApi('GET /api/assets all', assetsService.getAll(), []),
      ];

      if (queryName && queryName.toLowerCase() !== 'all') {
        requests.unshift(safeApi('GET /api/assets by requester', assetsService.getByCustomer(queryName), []));
      }

      const results = await Promise.all(requests);
      const mergedAssets = mergeAssetRows(...results.filter(Array.isArray));

      setClientAssets(mergedAssets);

      if (shouldOpenDropdown) {
        openAssetDropdown();
      }
    } catch (error) {
      console.error('Failed to load assets from DB', error);
      setClientAssets([]);

      if (shouldOpenDropdown) {
        openAssetDropdown();
      }

      setToast({
        message: 'Asset lookup failed to load from /api/assets.',
        type: 'warning',
      });
    } finally {
      setIsLoadingAssets(false);
    }
  }

  async function searchAssets(keyword: string) {
    const term = keyword.trim();

    openAssetDropdown();

    if (term.length < 2) {
      if (clientAssets.length === 0) {
        void loadClientAssets('all', true);
      }
      return;
    }

    setIsLoadingAssets(true);

    try {
      const [globalResults, allAssets] = await Promise.all([
        safeApi('GET /api/assets search global', assetsService.search(term), []),
        clientAssets.length > 0 ? Promise.resolve(clientAssets) : safeApi('GET /api/assets all fallback', assetsService.getAll(), []),
      ]);

      const mergedAssets = mergeAssetRows(
        Array.isArray(globalResults) ? globalResults : [],
        Array.isArray(allAssets) ? allAssets.filter((asset) => getAssetSearchText(asset).includes(term.toLowerCase())) : []
      );

      setClientAssets(mergedAssets);
      openAssetDropdown();
    } catch (error) {
      console.error('Asset search failed', error);
      setClientAssets([]);
      openAssetDropdown();
      setToast({
        message: 'Asset lookup search failed. Check /api/assets search response.',
        type: 'warning',
      });
    } finally {
      setIsLoadingAssets(false);
    }
  }

  function handleClientSelect(clientId: string) {
    const client = requesterOptions.find((item) => getClientId(item) === clientId);

    if (!client) {
      setFormData((prev: any) => ({
        ...prev,
        requesterId: '',
        requesterName: '',
        assetId: '',
        assetBrand: '',
        assetModel: '',
        assetOS: '',
      }));
      setAssetSearchTerm('');
      setClientAssets([]);
      return;
    }

    const alias = client.databaseAlias || client.DatabaseAlias || getClientName(client);
    setFormData((prev: any) => ({
      ...prev,
      requesterId: getClientId(client),
      requesterName: getClientName(client),
      assetId: '',
      assetBrand: '',
      assetModel: '',
      assetOS: '',
    }));
    setAssetSearchTerm('');
    setShowAssetDropdown(false);
    void loadClientAssets(alias);
  }

  function handleAssetSelect(asset: any) {
    const assetLabel = getAssetValue(asset);
    const assetBrand = getAssetBrand(asset);
    const assetModel = getAssetModel(asset);
    const assetOS = getAssetOS(asset);

    setFormData((prev: any) => ({
      ...prev,
      assetId: assetLabel,
      assetBrand,
      assetModel,
      assetOS,
      deviceType: prev.deviceType || asset.deviceType || asset.DeviceType || assetOS || '',
    }));

    // Selected asset details already populate Asset Brand / Asset Model / Asset OS below.
    // Do not keep the search result/card visible under Asset Lookup after selection.
    setAssetSearchTerm('');
    setClientAssets([]);
    setShowAssetDropdown(false);

    if (typeof window !== 'undefined') {
      window.setTimeout(() => setShowAssetDropdown(false), 0);
    }
  }

  function showSlaOverdueWarning(incident: any) {
    const incidentId = getId(incident);
    if (!incidentId || acknowledgedSlaOverdueTicketKey === incidentId) return;
    if (!isTicketSlaOverdue(incident, now)) return;

    setAcknowledgedSlaOverdueTicketKey(incidentId);
    setConfirmDialog({
      tone: 'warning',
      title: 'SLA Overdue',
      message: 'This ticket has exceeded the SLA due time. Please review and take the required action.',
      meta: `Ticket ${incidentId}`,
      confirmLabel: 'OK',
      cancelLabel: 'Close',
      onConfirm: () => undefined,
    });
  }

  async function openCreateForm() {
    if (!canCreate) {
      setToast({ message: 'You do not have permission to create a ticket.', type: 'warning' });
      return;
    }

    await ensureLookupsLoaded();

    const currentRequesterName = getCurrentLoginName(currentUser);
    const currentRequesterId = getCurrentLoginId(currentUser);

    setSelectedIncidentId('');
    setFormMode('create');
    setFormData({
      ...emptyForm(),
      requesterId: currentRequesterId,
      requesterName: currentRequesterName,
      reporterId: currentRequesterId,
    });
    setClientAssets([]);
    setIncidentAttachments([]);
    setApprovalFeedbackUploaded(false);
    setGenerateApprovalJobsheet(false);
    setAssetSearchTerm('');
    setShowAssetDropdown(false);
    void loadClientAssets('all');
    setViewMode('form');
  }

  async function openEditForm(incident: any) {
    if (!canEditIncident(incident)) {
      setToast({ message: 'You do not have permission to edit this ticket.', type: 'warning' });
      return;
    }

    const incidentStatus = normalizeStatus(incident?.status);
    showSlaOverdueWarning(incident);
    if (canEngineerWorkTickets && incidentStatus === 'assigned' && isIncidentAssignedToCurrentUser(incident)) {
      const incidentId = getId(incident);
      setConfirmReason('');
      setConfirmDialog({
        tone: 'info',
        title: 'Assigned Ticket',
        message: `You have been assigned to Ticket ${incidentId || ''}. Click "Respond" to proceed.`,
        meta: incidentId ? `Ticket ${incidentId}` : undefined,
        confirmLabel: 'Respond',
        cancelLabel: 'Cancel',
        onConfirm: async () => {
          const nowIso = new Date().toISOString();
          const startedIncident = {
            ...incident,
            id: incidentId,
            IncidentID: incidentId,
            status: 'In Progress',
            firstResponseAt: toIsoDateOrEmpty(incident.firstResponseAt) || nowIso,
            createdAt: toIsoDateOrEmpty(incident.createdAt) || nowIso,
            slaDue: toIsoDateOrEmpty(incident.slaDue),
            resolvedAt: toIsoDateOrEmpty(incident.resolvedAt),
          };

          await incidentsService.update(startedIncident);
          await createServiceDeskAuditLog({
            action: 'Engineer respond',
            details: `Ticket ${incidentId} changed from Assigned to In Progress by ${getCurrentLoginName(currentUser)}.`,
            entityID: incidentId,
          });
          await loadData(true);
          await openEditForm(startedIncident);
        },
      });
      return;
    }

    await ensureLookupsLoaded();

    const normalizedIncident = {
      ...incident,
      id: getId(incident),
      status: standardizeIncidentStatus(incident.status),
      _originalStatus: standardizeIncidentStatus(incident.status),
      _originalAssignedTo: incident.assignedTo || '',
      createdAt: toIsoDateOrEmpty(incident.createdAt) || new Date().toISOString(),
      slaPriority: incident.slaPriority || incident.SlaPriority || getSlaPriorityCode(incident.priority || 'Medium'),
      slaDue: toIsoDateOrEmpty(incident.slaDue),
      firstResponseAt: toIsoDateOrEmpty(incident.firstResponseAt),
      resolvedAt: toIsoDateOrEmpty(incident.resolvedAt),
    };

    const hydratedAssetFields: any = await hydrateIncidentAssetFields(normalizedIncident);

    setSelectedIncidentId('');
    setFormMode('edit');
    setFormData({ ...emptyForm(), ...normalizedIncident, ...hydratedAssetFields });
    setAssetSearchTerm(hydratedAssetFields.assetId || incident.assetId || '');
    setClientAssets([]);
    setApprovalFeedbackUploaded(false);
    setGenerateApprovalJobsheet(false);
    setShowAssetDropdown(false);

    if (incident.requesterName) {
      void loadClientAssets(incident.requesterName);
    }

    void loadIncidentAttachments(getId(incident));
    setViewMode('form');
  }

  function closeForm() {
    setViewMode('list');
    setFormData(emptyForm());
    setClientAssets([]);
    setIncidentAttachments([]);
    setApprovalFeedbackUploaded(false);
    setGenerateApprovalJobsheet(false);
    setAssetSearchTerm('');
    setShowAssetDropdown(false);
  }

  async function createServiceDeskAuditLog(params: {
    action: string;
    severity?: 'Success' | 'Info' | 'Warning' | 'Error';
    details: string;
    entityID?: string;
    entityType?: string;
  }) {
    try {
      const token = getStoredAuthToken();
      const response = await fetch(getServiceDeskApiUrl('/api/settings/audit-logs'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          module: 'Service Desk',
          action: params.action,
          severity: params.severity || 'Success',
          details: params.details,
          entityType: params.entityType || 'Incident',
          entityID: params.entityID || '',
        }),
      });

      if (!response.ok) {
        const message = await response.text().catch(() => '');
        throw new Error(message || `Audit log failed with status ${response.status}`);
      }
    } catch (error) {
      console.warn('Service Desk audit log failed', error);
    }
  }

  function isIncidentAssignedToCurrentUser(incident: any) {
    const assignedTo = normalizeServiceDeskMatchValue(incident?.assignedTo || incident?.AssignedTo);
    return Boolean(assignedTo && currentUserIdentityValues.includes(assignedTo));
  }

  function canEditIncident(incident: any) {
    if (!incident || !canEdit) return false;
    if (canAdminManageTickets) return true;

    if (canEngineerWorkTickets) {
      if (isIncidentAssignedToCurrentUser(incident)) return true;

      const originalAssignedTo = normalizeServiceDeskMatchValue(incident?._originalAssignedTo || incident?.OriginalAssignedTo);
      return Boolean(originalAssignedTo && currentUserIdentityValues.includes(originalAssignedTo));
    }

    return false;
  }

  function requestCloseForm() {
    if (isSaving) return;

    setConfirmReason('');
    setConfirmDialog({
      tone: 'warning',
      title: formMode === 'create' ? 'Cancel ticket creation?' : 'Cancel ticket update?',
      message:
        formMode === 'create'
          ? 'Are you sure you want to cancel creating this ticket? Any information entered in this form will be discarded.'
          : 'Are you sure you want to cancel editing this ticket? Unsaved changes will be discarded.',
      confirmLabel: 'Yes, Cancel',
      cancelLabel: 'Continue Editing',
      onConfirm: () => {
        closeForm();
      },
    });
  }

  async function saveIncident(event: FormEvent) {
    event.preventDefault();

    if (formMode === 'create' && !canCreate) {
      setToast({ message: 'You do not have permission to create tickets.', type: 'warning' });
      return;
    }

    const permissionCheckIncident =
      formMode === 'edit' && canEngineerWorkTickets
        ? { ...formData, assignedTo: formData.assignedTo || formData._originalAssignedTo }
        : formData;

    if (formMode === 'edit' && !canEditIncident(permissionCheckIncident)) {
      setToast({ message: 'You do not have permission to update this ticket.', type: 'warning' });
      return;
    }

    const requiredFields = [
      ...(formMode === 'create'
        ? [
            { value: formData.deviceType, message: 'Device Type is required.' },
            { value: formData.assetId, message: 'Asset Lookup is required.' },
          ]
        : []),
      ...(formMode === 'create' || canEditMainTicketFields
        ? [
            { value: formData.category, message: 'Category is required.' },
            ...(subcategoryOptions.length > 0
              ? [{ value: formData.subcategory, message: 'Subcategory is required.' }]
              : []),
            ...(detailOptions.length > 0
              ? [{ value: formData.incidentDetail, message: 'Problem Detail is required.' }]
              : []),
            { value: formData.priority, message: 'Urgency Level is required.' },
            { value: formData.title, message: 'Title / Problem Description is required.' },
            { value: formData.description, message: 'Description is required.' },
          ]
        : []),
      ...(formMode === 'edit' && canUpdateStatus
        ? [{ value: formData.status, message: 'Status is required.' }]
        : []),
      ...(formMode === 'edit' && canAssignEngineer
        ? [
            { value: formData.assignedLevel, message: 'Assigned Level is required.' },
            { value: formData.assignedTo, message: 'Assigned To is required.' },
          ]
        : []),
      ...(requiresEngineerResolutionFields
        ? [
            { value: formData.rootCause, message: 'Root Cause is required.' },
            { value: formData.actionPlan, message: 'Action Plan is required.' },
          ]
        : []),
    ];

    if (requiresEngineerResolutionFields && (!String(formData.rootCause || '').trim() || !String(formData.actionPlan || '').trim())) {
      const missingResolutionField = !String(formData.rootCause || '').trim()
        ? {
            label: 'Root Cause',
            ref: rootCauseRef,
            message: 'Please fill in Root Cause before updating this ticket.',
          }
        : {
            label: 'Action Plan',
            ref: actionPlanRef,
            message: 'Please fill in Action Plan before updating this ticket.',
          };

      const fieldElement = missingResolutionField.ref.current;
      fieldElement?.setCustomValidity(missingResolutionField.message);
      fieldElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      fieldElement?.focus();
      fieldElement?.reportValidity();

      setToast({ message: missingResolutionField.message, type: 'error' });

      return;
    }

    const missingField = requiredFields.find((field) => !String(field.value || '').trim());
    if (missingField) {
      setToast({ message: missingField.message, type: 'error' });
      return;
    }

    if ((formMode === 'create' || canAssignEngineer) && ((formData.assignedLevel && !formData.assignedTo) || (!formData.assignedLevel && formData.assignedTo))) {
      setToast({ message: 'Assigned Level and Assigned To must be completed together.', type: 'error' });
      return;
    }

    if (normalizeStatus(formData.status) === 're-open' && !getOperationalReason(formData)) {
      rejectReasonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      rejectReasonRef.current?.focus();
      setToast({
        message: 'Re-open reason is required. Fill in the highlighted Re-open Reason / Remarks field.',
        type: 'error',
      });
      return;
    }

    const shouldGenerateApprovalJobsheet =
      formMode === 'edit' &&
      generateApprovalJobsheet &&
      normalizeStatus(formData.status) === 'resolved';

    if (formData.assignedTo) {
      await checkEngineerAvailability(formData.assignedTo);
    }

    setIsSaving(true);
    try {
      const operationalReason = getOperationalReason(formData);
      const currentRequesterName = getCurrentLoginName(currentUser);
      const currentRequesterId = getCurrentLoginId(currentUser);
      const previousAssignedTo = String(selectedIncident?.assignedTo || formData._originalAssignedTo || '').trim();
      const previousStatus = selectedIncident?.status || formData._originalStatus || formData.status;

      const saveData = {
        ...formData,
        status: standardizeIncidentStatus(formData.status),
        requesterId: formMode === 'create' ? currentRequesterId : formData.requesterId,
        requesterName: formMode === 'create' ? currentRequesterName : formData.requesterName,
        reporterId: formMode === 'create' ? currentRequesterId : formData.reporterId,
        id: getId(formData) || makeIncidentId(),
        createdAt: toIsoDateOrEmpty(formData.createdAt) || new Date().toISOString(),
        slaPriority: getSlaPriorityCode(formData.priority),
        slaDue: calculateSlaDue(formData, { force: formMode === 'create' || selectedIncident?.priority !== formData.priority }),
        firstResponseAt: toIsoDateOrEmpty(formData.firstResponseAt),
        resolvedAt: toIsoDateOrEmpty(formData.resolvedAt),
        additionalMemo: operationalReason || formData.additionalMemo || '',
        remarks: operationalReason || formData.remarks || '',
      };

      if (formMode === 'create') {
        saveData.status = String(saveData.assignedTo || '').trim() ? 'Assigned' : 'Awaiting';
        saveData.createdAt = new Date().toISOString();
        await incidentsService.create(saveData);
        await createServiceDeskAuditLog({
          action: 'Ticket created',
          details: `Ticket ${saveData.id} created by ${getCurrentLoginName(currentUser)} with status ${saveData.status}.`,
          entityID: saveData.id,
        });
        if (String(saveData.assignedTo || '').trim()) {
          await createServiceDeskAuditLog({
            action: 'Assign engineer',
            details: `Ticket ${saveData.id} assigned to ${saveData.assignedTo} during ticket creation by ${getCurrentLoginName(currentUser)}.`,
            entityID: saveData.id,
          });
        }
        setToast({ message: `Ticket ${saveData.id} created successfully.`, type: 'success' });
      } else {
        const engineerRequestedPendingApproval =
          canEngineerWorkTickets &&
          normalizeStatus(previousStatus) === 'in progress' &&
          normalizeStatus(saveData.status) === 'resolved';

        const lockedSourceIncident = selectedIncident || formData;

        if (!canEditMainTicketFields && canEditResolutionFields && lockedSourceIncident) {
          saveData.status = engineerRequestedPendingApproval ? 'Resolved' : (lockedSourceIncident.status || saveData.status);
          saveData.category = lockedSourceIncident.category || saveData.category;
          saveData.subcategory = lockedSourceIncident.subcategory || saveData.subcategory;
          saveData.incidentDetail = lockedSourceIncident.incidentDetail || saveData.incidentDetail;
          saveData.priority = lockedSourceIncident.priority || saveData.priority;
          saveData.title = lockedSourceIncident.title || saveData.title;
          saveData.description = lockedSourceIncident.description || saveData.description;
          saveData.deviceType = lockedSourceIncident.deviceType || saveData.deviceType;
          saveData.assetId = lockedSourceIncident.assetId || saveData.assetId;
          saveData.assignedLevel = lockedSourceIncident.assignedLevel || saveData.assignedLevel;
          saveData.assignedTo = lockedSourceIncident.assignedTo || lockedSourceIncident._originalAssignedTo || saveData.assignedTo;
          saveData.slaDue = toIsoDateOrEmpty(lockedSourceIncident.slaDue) || saveData.slaDue;
        }
        if (saveData.status === 'Solved') saveData.status = 'Closed';
        saveData.status = standardizeIncidentStatus(saveData.status);
        if (canAssignEngineer && !previousAssignedTo && String(saveData.assignedTo || '').trim() && normalizeStatus(previousStatus) === 'awaiting') saveData.status = 'Assigned';
        if (saveData.status === 'In Progress' && !saveData.firstResponseAt) saveData.firstResponseAt = new Date().toISOString();
        if (['Resolved', 'Closed'].includes(saveData.status) && !saveData.resolvedAt) saveData.resolvedAt = new Date().toISOString();
        await incidentsService.update(saveData);

        const previousStatusText = standardizeIncidentStatus(previousStatus);
        const newStatusText = standardizeIncidentStatus(saveData.status);
        if (normalizeStatus(previousStatusText) === 'resolved' && normalizeStatus(formData.status) === 're-open') {
          await createServiceDeskAuditLog({
            action: 'Re-open ticket',
            severity: 'Warning',
            details: `Ticket ${saveData.id} re-opened from Resolved to In Progress by ${getCurrentLoginName(currentUser)}. Reason: ${operationalReason || '-'}`,
            entityID: saveData.id,
          });
        } else if (normalizeStatus(previousStatusText) === 'resolved' && normalizeStatus(newStatusText) === 'closed') {
          await createServiceDeskAuditLog({
            action: 'Close ticket',
            details: `Ticket ${saveData.id} closed by ${getCurrentLoginName(currentUser)}.`,
            entityID: saveData.id,
          });
        } else if (canAssignEngineer && previousAssignedTo !== String(saveData.assignedTo || '').trim() && String(saveData.assignedTo || '').trim()) {
          await createServiceDeskAuditLog({
            action: 'Assign engineer',
            details: `Ticket ${saveData.id} assigned to ${saveData.assignedTo} by ${getCurrentLoginName(currentUser)}.`,
            entityID: saveData.id,
          });
        } else if (canEngineerWorkTickets && normalizeStatus(previousStatusText) === 'in progress' && normalizeStatus(newStatusText) === 'resolved') {
          await createServiceDeskAuditLog({
            action: 'Submit as Resolved',
            details: `Ticket ${saveData.id} submitted as Resolved by ${getCurrentLoginName(currentUser)}.`,
            entityID: saveData.id,
          });
        } else if (normalizeStatus(previousStatusText) !== normalizeStatus(newStatusText)) {
          await createServiceDeskAuditLog({
            action: 'Ticket status changed',
            details: `Ticket ${saveData.id} status changed from ${previousStatusText || '-'} to ${newStatusText || '-'} by ${getCurrentLoginName(currentUser)}.`,
            entityID: saveData.id,
          });
        } else {
          await createServiceDeskAuditLog({
            action: 'Ticket updated',
            details: `Ticket ${saveData.id} updated by ${getCurrentLoginName(currentUser)}.`,
            entityID: saveData.id,
          });
        }

        if (shouldGenerateApprovalJobsheet && normalizeStatus(saveData.status) === 'resolved') {
          try {
            await downloadApprovalJobsheetPdf({ ...saveData });
            await createServiceDeskAuditLog({
              action: 'Generate jobsheet',
              details: `Approval jobsheet PDF generated for ticket ${saveData.id} by ${getCurrentLoginName(currentUser)}.`,
              entityID: saveData.id,
            });
          } catch (pdfError) {
            console.error('Jobsheet PDF download failed', pdfError);
            setToast({ message: 'Ticket updated, but the jobsheet PDF could not be downloaded. Please ensure jsPDF is installed.', type: 'warning' });
          }
        }
        setToast({ message: `Ticket ${saveData.id} updated successfully.`, type: 'success' });
      }

      await loadData(true);
      closeForm();
    } catch (error) {
      console.error('Save failed', error);
      setToast({ message: 'Failed to save incident.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  }

  async function resolveIncident(incident: any) {
    if (!canEditIncident(incident)) return;

    const incidentId = getId(incident);

    if (!incidentId) {
      setToast({ message: 'Cannot resolve incident because ticket ID is missing.', type: 'error' });
      return;
    }

    setIsSaving(true);

    try {
      const nowIso = new Date().toISOString();
      const resolvedData = {
        ...incident,
        id: incidentId,
        IncidentID: incidentId,
        status: 'Closed',
        resolvedAt: nowIso,
        firstResponseAt: toIsoDateOrEmpty(incident.firstResponseAt) || nowIso,
        createdAt: toIsoDateOrEmpty(incident.createdAt) || nowIso,
        slaDue: toIsoDateOrEmpty(incident.slaDue),
      };

      await incidentsService.update(resolvedData);
      await createServiceDeskAuditLog({
        action: 'Close ticket',
        details: `Ticket ${incidentId} closed by ${getCurrentLoginName(currentUser)}.`,
        entityID: incidentId,
      });
      await loadData(true);

      // Close any open edit drawer and right-side detail panel after resolve.
      // The success toast is enough confirmation; reopening the closed detail
      // panel makes the UI feel stuck behind the overlay.
      closeForm();
      setSelectedIncidentId('');

      setToast({ message: `Ticket ${incidentId} closed successfully.`, type: 'success' });
    } catch (error) {
      console.error('Resolve failed', error);
      setToast({ message: 'Failed to resolve incident.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteIncident(incident: any) {
    if (!canDelete || !incident) return;

    const incidentId = getId(incident);

    if (!incidentId) {
      setToast({ message: 'Cannot delete incident because ticket ID is missing.', type: 'error' });
      return;
    }

    if (isDeleteLockedStatus(incident.status)) {
      setToast({ message: `Ticket ${incidentId} is ${incident.status}. Delete is disabled for closed tickets.`, type: 'warning' });
      return;
    }

    setConfirmReason('');
    setConfirmDialog({
      tone: 'danger',
      title: `Delete ticket ${incidentId}?`,
      message: 'Please enter a deletion reason before removing this ticket from the service queue.',
      meta: incident.title || incident.description || 'No ticket description available.',
      confirmLabel: 'Delete Ticket',
      cancelLabel: 'Keep Ticket',
      requiresReason: true,
      reasonLabel: 'Deletion Reason',
      reasonPlaceholder: 'Example: Duplicate ticket created by requester / invalid request / test record cleanup',
      minReasonLength: 1,
      onConfirm: async (reason = '') => {
        try {
          // Reason is required at UI level. Backend delete currently removes the ticket record;
          // keep this reason ready for backend audit logging if/when /api/incidents DELETE supports request body.
          console.info(`Deleting ticket ${incidentId}. Reason:`, reason);
          await incidentsService.delete(incidentId);
          await createServiceDeskAuditLog({
            action: 'Delete ticket',
            severity: 'Warning',
            details: `Ticket ${incidentId} deleted by ${getCurrentLoginName(currentUser)}. Reason: ${reason || '-'}`,
            entityID: incidentId,
          });
          await loadData(true);
          setSelectedIncidentId((current) => (current === incidentId ? '' : current));
          if (getId(formData) === incidentId) closeForm();
          setIncidentAttachments([]);
          setToast({ message: `Ticket ${incidentId} and related attachments deleted successfully.`, type: 'success' });
        } catch (error) {
          console.error('Delete failed', error);
          setToast({ message: `Failed to delete ticket ${incidentId}.`, type: 'error' });
          throw error;
        }
      },
    });
  }

  function requestSort(key: string) {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }

  const scopedIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      if (canViewAssignedTicketsOnly && !isIncidentAssignedToCurrentUser(incident)) return false;
      return true;
    });
  }, [incidents, canViewAssignedTicketsOnly, currentUserIdentityValues.join('|')]);

  const queueCounts = useMemo(() => {
    const open = scopedIncidents.filter((item) => standardizeIncidentStatus(item.status) !== 'Closed');
    return {
      all: scopedIncidents.length,
      slaRisk: scopedIncidents.filter((item) => {
        const sla = getSlaMeta(item, now);
        return ['overdue', 'near'].includes(sla.className) && standardizeIncidentStatus(item.status) !== 'Closed';
      }).length,
      awaiting: scopedIncidents.filter((item) => item.status === 'Awaiting').length,
      assigned: open.filter((item) => Boolean(item.assignedTo) && standardizeIncidentStatus(item.status) === 'Assigned').length,
      inProgress: scopedIncidents.filter((item) => item.status === 'In Progress').length,
      pendingApproval: scopedIncidents.filter((item) => standardizeIncidentStatus(item.status) === 'Resolved').length,
      resolved: scopedIncidents.filter((item) => standardizeIncidentStatus(item.status) === 'Closed').length,
      kb: knowledgeBaseEntries.length,
      open: open.length,
    };
  }, [scopedIncidents, currentUserIdentityValues.join('|'), now, knowledgeBaseEntries.length]);

  const filteredIncidents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return scopedIncidents.filter((incident) => {
      const sla = getSlaMeta(incident, now);

      const queueMatch =
        activeQueue === 'all' ||
        (activeQueue === 'sla-risk' && ['overdue', 'near'].includes(sla.className) && standardizeIncidentStatus(incident.status) !== 'Closed') ||
        (activeQueue === 'awaiting' && incident.status === 'Awaiting') ||
        (activeQueue === 'assigned' && Boolean(incident.assignedTo) && standardizeIncidentStatus(incident.status) === 'Assigned') ||
        (activeQueue === 'in-progress' && incident.status === 'In Progress') ||
        (activeQueue === 'pending-approval' && standardizeIncidentStatus(incident.status) === 'Resolved') ||
        (activeQueue === 'resolved' && standardizeIncidentStatus(incident.status) === 'Closed') ||
        activeQueue === 'knowledge';

      if (!queueMatch) return false;
      if (activeQueue === 'knowledge') return false;
      if (filterStatus !== 'All' && incident.status !== filterStatus) return false;
      if (filterPriority !== 'All' && incident.priority !== filterPriority) return false;
      if (filterAssignedTo !== 'All' && (incident.assignedTo || '') !== filterAssignedTo) return false;
      if (filterSlaStatus !== 'All' && sla.statusKey !== filterSlaStatus) return false;

      const haystack = [
        getId(incident),
        incident.title,
        incident.description,
        incident.requesterName,
        incident.assetId,
        incident.category,
        incident.subcategory,
        incident.incidentDetail,
        incident.assignedTo,
        incident.status,
      ]
        .join(' ')
        .toLowerCase();

      if (q && !haystack.includes(q)) return false;

      if (showAdvanced) {
        const adv = advancedFilters;
        if (adv.reqNo && !getId(incident).toLowerCase().includes(adv.reqNo.toLowerCase())) return false;
        if (adv.requester && !String(incident.requesterName || '').toLowerCase().includes(adv.requester.toLowerCase())) return false;

        if (adv.incidentTitle) {
          const incidentText = `${incident.title || ''} ${incident.description || ''}`.toLowerCase();
          if (!incidentText.includes(adv.incidentTitle.toLowerCase())) return false;
        }

        if (adv.assetTag && !String(incident.assetId || '').toLowerCase().includes(adv.assetTag.toLowerCase())) return false;
        if (adv.category && incident.category !== adv.category) return false;
        if (adv.subcategory && incident.subcategory !== adv.subcategory) return false;
        if (adv.detail && incident.incidentDetail !== adv.detail) return false;
        const createdDate = parseApiDate(incident.createdAt);
        if (adv.dateFrom && createdDate && createdDate < new Date(`${adv.dateFrom}T00:00:00${MALAYSIA_UTC_OFFSET}`)) return false;
        if (adv.dateTo && createdDate && createdDate > new Date(`${adv.dateTo}T23:59:59${MALAYSIA_UTC_OFFSET}`)) return false;

        if (adv.slaStatus !== 'All' && sla.statusKey !== adv.slaStatus) return false;
      }

      return true;
    });
  }, [
    activeQueue,
    advancedFilters,
    currentUserIdentityValues.join('|'),
    filterAssignedTo,
    filterSlaStatus,
    filterPriority,
    filterStatus,
    now,
    scopedIncidents,
    searchTerm,
    showAdvanced,
  ]);

  const sortedIncidents = useMemo(() => {
    return [...filteredIncidents].sort((a, b) => {
      let aValue: any = a[sortConfig.key];
      let bValue: any = b[sortConfig.key];

      if (sortConfig.key === 'priority') {
        aValue = priorityRank(a.priority);
        bValue = priorityRank(b.priority);
      } else if (sortConfig.key === 'status') {
        aValue = statusRank(a.status);
        bValue = statusRank(b.status);
      } else if (sortConfig.key === 'slaDue' || sortConfig.key === 'createdAt') {
        aValue = aValue ? parseApiDate(aValue)?.getTime() || 0 : 0;
        bValue = bValue ? parseApiDate(bValue)?.getTime() || 0 : 0;
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = String(bValue || '').toLowerCase();
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredIncidents, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedIncidents.length / itemsPerPage));
  const paginatedIncidents = sortedIncidents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const filteredKb = useMemo(() => {
    const q = kbSearch.trim().toLowerCase();

    return knowledgeBaseEntries
      .filter((kb) => {
        if (!q) return true;
        return String(kb.title || '').toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const firstTitle = String(a.title || '').toLowerCase();
        const secondTitle = String(b.title || '').toLowerCase();

        if (firstTitle < secondTitle) return kbSortDirection === 'asc' ? -1 : 1;
        if (firstTitle > secondTitle) return kbSortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [knowledgeBaseEntries, kbSearch, kbSortDirection]);

  function toggleKbTitleSort() {
    setKbSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
  }

  function exportCsv() {
    const headers = ['Req No', 'Submitted', 'Requester', 'Asset Tag', 'Incident', 'Urgency Level', 'Assigned To', 'Status', 'SLA Time'];
    const rows = filteredIncidents.map((incident) => {
      const sla = getSlaMeta(incident, now);
      return [
        getId(incident),
        normalizeDate(incident.createdAt),
        incident.requesterName || 'N/A',
        incident.assetId || '-',
        incident.title || '',
        incident.priority || '',
        incident.assignedTo || 'Unassigned',
        incident.status || '',
        sla.label,
      ].map((value) => `"${String(value).replace(/"/g, '""')}"`);
    });

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `Incident_Report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  async function saveKb(event: FormEvent) {
    event.preventDefault();
    if (!kbFormData.title?.trim()) {
      setToast({ message: 'KB title is required.', type: 'error' });
      return;
    }

    setIsSaving(true);
    try {
      if (kbFormData.id) await knowledgeBaseService.update(kbFormData);
      else await knowledgeBaseService.create(kbFormData);

      await ensureKnowledgeBaseLoaded(true);

      setKbFormOpen(false);
      setKbFormData({ id: '', title: '', incidentDetails: '', resolution: '' });
      setToast({ message: `Knowledge article "${kbFormData.title}" saved successfully.`, type: 'success' });
    } catch (error) {
      console.error('KB save failed', error);
      setToast({ message: 'Failed to save knowledge base.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteKb(kb: any) {
    if (!canDelete || !kb) return;

    const kbTitle = kb.title || `KB-${kb.id}`;

    setConfirmDialog({
      tone: 'danger',
      title: 'Delete knowledge article?',
      message: 'This will remove the selected resolution article from the Knowledge Base.',
      meta: kbTitle,
      confirmLabel: 'Delete Article',
      cancelLabel: 'Keep Article',
      onConfirm: async () => {
        try {
          await knowledgeBaseService.delete(kb.id);
          setKnowledgeBaseEntries((current) => current.filter((item) => String(item.id) !== String(kb.id)));
          setToast({ message: `Knowledge article "${kbTitle}" deleted successfully.`, type: 'success' });
        } catch (error) {
          console.error('KB delete failed', error);
          setToast({ message: 'Failed to delete knowledge base article.', type: 'error' });
          throw error;
        }
      },
    });
  }

  function printTicket(incident: any) {
    if (!incident) return;

    const sla = getSlaMeta(incident, now);
    const safe = (value: any) =>
      String(value ?? '—')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const rows = [
      ['Request No', getId(incident)],
      ['Submitted Date', normalizeDateTime(incident.createdAt)],
      ['Requester', incident.requesterName || 'N/A'],
      ['Asset Tag', incident.assetId || '—'],
      ['Asset Brand', incident.assetBrand || '—'],
      ['Asset Model', incident.assetModel || '—'],
      ['Asset OS', incident.assetOS || '—'],
      ['Category', incident.category || '—'],
      ['Subcategory', incident.subcategory || '—'],
      ['Problem Detail', incident.incidentDetail || '—'],
      ['Priority', incident.priority || 'Medium'],
      ['Status', incident.status || 'Awaiting'],
      ['Assigned To', incident.assignedTo || 'Unassigned'],
      ['Assigned Level', incident.assignedLevel || 'No level'],
      ['SLA Due', normalizeDateTime(incident.slaDue)],
      ['SLA Status', `${sla.label} (${sla.detail})`],
      ['First Response', normalizeDateTime(incident.firstResponseAt)],
      ['Closed/Resolved At', normalizeDateTime(incident.resolvedAt)],
    ];

    const printHtml = `
      <!doctype html>
      <html>
        <head>
          <title>Ticket ${safe(getId(incident))}</title>
</head>
        <body>
          <main class="ticket-print">
            <header class="print-head">
              <div>
                <span>EMA Unified System — Service Desk Ticket</span>
                <h1>${safe(incident.title || 'Untitled incident')}</h1>
                <p>${safe(incident.description || 'No description provided.')}</p>
              </div>
              <div class="print-badge">${safe(getId(incident))}</div>
            </header>

            <section class="section">
              <h2>Ticket Information</h2>
              <table>
                ${rows.map(([label, value]) => `<tr><td>${safe(label)}</td><td>${safe(value)}</td></tr>`).join('')}
              </table>
            </section>

            <section class="section">
              <h2>Root Cause</h2>
              <div class="text-block">${safe(incident.rootCause || '—')}</div>
            </section>

            <section class="section">
              <h2>Action Plan / Resolution</h2>
              <div class="text-block">${safe(incident.actionPlan || '—')}</div>
            </section>

            <section class="section">
              <h2>Operational Note / Remarks</h2>
              <div class="text-block">${safe(incident.additionalMemo || incident.remarks || '—')}</div>
            </section>

            <footer class="footer">
              <span>Printed from EMA Unified System</span>
              <span>${safe(new Date().toLocaleString('en-GB'))}</span>
            </footer>
          </main>
          <script>
            window.onload = function () {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=900,height=720');
    if (!printWindow) {
      setToast({ message: 'Popup blocked. Allow popups to print ticket details.', type: 'warning' });
      return;
    }

    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
  }


  async function downloadApprovalJobsheetPdf(incident: any) {
    const { default: JsPDF } = await import('jspdf');
    const doc = new JsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    const incidentId = getId(incident) || incident.id || incident.IncidentID || 'ticket';
    const safeIncidentId = String(incidentId).replace(/[^a-z0-9_-]+/gi, '_');
    const generatedAt = normalizeDateTime(new Date().toISOString());
    const primaryColor = [15, 38, 77] as [number, number, number];
    const accentColor = [46, 99, 240] as [number, number, number];
    const lightBlue = [239, 246, 255] as [number, number, number];
    const lineColor = [210, 224, 245] as [number, number, number];
    let y = 14;

    const ensureSpace = (height: number) => {
      if (y + height <= pageHeight - 16) return;
      doc.addPage();
      y = 16;
    };

    const safeText = (value: any) => String(value || '-');
    const drawSectionTitle = (title: string) => {
      ensureSpace(14);
      doc.setFillColor(...lightBlue);
      doc.setDrawColor(...lineColor);
      doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...primaryColor);
      doc.text(title, margin + 4, y + 6.5);
      y += 12;
    };

    const drawKeyValueRows = (rows: Array<[string, any]>) => {
      rows.forEach(([label, rawValue]) => {
        const value = safeText(rawValue);
        const wrappedValue = doc.splitTextToSize(value, contentWidth - 58);
        const rowHeight = Math.max(10, wrappedValue.length * 5 + 4);
        ensureSpace(rowHeight + 2);
        doc.setDrawColor(231, 238, 249);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(margin, y, contentWidth, rowHeight, 1.5, 1.5, 'S');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(96, 121, 166);
        doc.text(String(label).toUpperCase(), margin + 4, y + 6);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...primaryColor);
        doc.text(wrappedValue, margin + 58, y + 6);
        y += rowHeight + 2;
      });
    };

    const drawTextBox = (title: string, value: any, minHeight = 24) => {
      drawSectionTitle(title);
      const wrappedValue = doc.splitTextToSize(safeText(value), contentWidth - 8);
      const boxHeight = Math.max(minHeight, wrappedValue.length * 5 + 10);
      ensureSpace(boxHeight + 2);
      doc.setDrawColor(...lineColor);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, y, contentWidth, boxHeight, 3, 3, 'S');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...primaryColor);
      doc.text(wrappedValue, margin + 4, y + 7);
      y += boxHeight + 4;
    };

    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 34, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('EMA Unified System', margin, 12);
    doc.setFontSize(20);
    doc.text('Approval Jobsheet', margin, 23);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Service Desk ticket resolution approval record', margin, 30);

    doc.setFillColor(...accentColor);
    doc.roundedRect(pageWidth - margin - 45, 10, 45, 14, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(String(incidentId), pageWidth - margin - 42, 19);

    y = 44;
    drawSectionTitle('Ticket Information');
    drawKeyValueRows([
      ['Ticket ID', incidentId],
      ['Status', standardizeIncidentStatus(incident.status || 'Resolved')],
      ['Requester / PIC', incident.requesterName || incident.requesterId || incident.reporterId || '-'],
      ['Submitted Date', normalizeDateTime(incident.createdAt)],
      ['Generated At', generatedAt],
    ]);

    drawSectionTitle('Asset & Classification');
    drawKeyValueRows([
      ['Asset ID', incident.assetId || '-'],
      ['Device Type', incident.deviceType || '-'],
      ['Category', incident.category || '-'],
      ['Subcategory', incident.subcategory || '-'],
      ['Problem Detail', incident.incidentDetail || '-'],
      ['Urgency / Priority', incident.priority || '-'],
      ['Engineer', incident.assignedTo || '-'],
    ]);

    drawTextBox('Issue Description', incident.description || '-', 24);
    drawTextBox('Root Cause', incident.rootCause || '-', 24);
    drawTextBox('Action Plan / Resolution', incident.actionPlan || '-', 28);

    drawSectionTitle('Approval & Sign-Off');
    ensureSpace(52);
    const boxGap = 8;
    const boxWidth = (contentWidth - boxGap) / 2;
    doc.setDrawColor(159, 180, 216);
    doc.setFillColor(252, 254, 255);
    doc.roundedRect(margin, y, boxWidth, 42, 3, 3, 'S');
    doc.roundedRect(margin + boxWidth + boxGap, y, boxWidth, 42, 3, 3, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...primaryColor);
    doc.text('Requester / PIC Approval', margin + 5, y + 8);
    doc.text('Engineer Confirmation', margin + boxWidth + boxGap + 5, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(96, 121, 166);
    doc.line(margin + 5, y + 28, margin + boxWidth - 5, y + 28);
    doc.line(margin + boxWidth + boxGap + 5, y + 28, margin + contentWidth - 5, y + 28);
    doc.text('Name, Signature & Date', margin + 5, y + 34);
    doc.text('Name, Signature & Date', margin + boxWidth + boxGap + 5, y + 34);

    doc.setFontSize(8);
    doc.setTextColor(120, 140, 170);
    doc.text('Generated from EMA Unified System', margin, pageHeight - 8);
    doc.text(generatedAt, pageWidth - margin - 38, pageHeight - 8);

    doc.save(`Approval_Jobsheet_${safeIncidentId}.pdf`);
  }

  function printApprovalJobsheet(incident: any, targetWindow?: Window | null) {
    if (!incident) return;

    const safe = (value: any) =>
      String(value ?? '—')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const rows = [
      ['Ticket No', getId(incident)],
      ['Requester / PIC', incident.requesterName || 'N/A'],
      ['Submitted Date', normalizeDateTime(incident.createdAt)],
      ['Asset ID', incident.assetId || '—'],
      ['Device Type', incident.deviceType || '—'],
      ['Category', incident.category || '—'],
      ['Subcategory', incident.subcategory || '—'],
      ['Problem Detail', incident.incidentDetail || '—'],
      ['Urgency Level', incident.priority || 'Medium'],
      ['Engineer', incident.assignedTo || getCurrentLoginName(currentUser) || '—'],
      ['Status', standardizeIncidentStatus(incident.status || 'Resolved')],
      ['Generated At', new Date().toLocaleString('en-GB')],
    ];

    const printHtml = `
      <!doctype html>
      <html>
        <head>
          <title>Approval Jobsheet ${safe(getId(incident))}</title>
</head>
        <body>
          <main class="jobsheet">
            <header class="head">
              <div>
                <span>EMA Unified System — Approval Jobsheet</span>
                <h1>${safe(incident.title || 'Service Desk Approval')}</h1>
                <p>This jobsheet is generated for requester/PIC verification after support action has been completed.</p>
              </div>
              <div class="badge">${safe(getId(incident))}</div>
            </header>

            <section class="section">
              <h2>Ticket Details</h2>
              <table>${rows.map(([label, value]) => `<tr><td>${safe(label)}</td><td>${safe(value)}</td></tr>`).join('')}</table>
            </section>

            <section class="section">
              <h2>Issue Description</h2>
              <div class="text-block">${safe(incident.description || '—')}</div>
            </section>

            <section class="section">
              <h2>Root Cause</h2>
              <div class="text-block">${safe(incident.rootCause || '—')}</div>
            </section>

            <section class="section">
              <h2>Action Plan / Resolution</h2>
              <div class="text-block">${safe(incident.actionPlan || '—')}</div>
            </section>

            <section class="section">
              <h2>Approval & Sign-Off</h2>
              <div class="signature-grid">
                <div class="signature-box">
                  <strong>Requester / PIC Approval</strong>
                  <div class="signature-line">Name, Signature & Date</div>
                </div>
                <div class="signature-box">
                  <strong>Engineer Confirmation</strong>
                  <div class="signature-line">Name, Signature & Date</div>
                </div>
              </div>
            </section>

            <footer class="footer">
              <span>Printed from EMA Unified System</span>
              <span>${safe(new Date().toLocaleString('en-GB'))}</span>
            </footer>
          </main>
          <script>
            window.onload = function () {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    const printWindow = targetWindow || window.open('', '_blank', 'width=900,height=720');
    if (!printWindow) {
      setToast({ message: 'Popup blocked. Allow popups to print or save the approval jobsheet PDF.', type: 'warning' });
      return;
    }

    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
  }

  function printTicketRegistry() {
    const safe = (value: any) =>
      String(value ?? '—')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const queueLabel = activeQueue === 'all' ? 'All operational tickets' : queueItems.find((item) => item.key === activeQueue)?.label || 'Ticket Registry';
    const statusLabel = filterStatus === 'All' ? 'All statuses' : filterStatus;
    const urgencyLabel = filterPriority === 'All' ? 'All urgencies' : filterPriority;
    const assigneeLabel = filterAssignedTo === 'All' ? 'All assignees' : filterAssignedTo || 'Unassigned';
    const slaFilterLabel = filterSlaStatus === 'All' ? 'All SLA statuses' : filterSlaStatus;

    const rows = sortedIncidents.map((incident, index) => {
      const sla = getSlaMeta(incident, now);
      return `
        <tr>
          <td>${safe(index + 1)}</td>
          <td><strong>${safe(getId(incident))}</strong></td>
          <td>${safe(normalizeDateTime(incident.createdAt))}</td>
          <td>
            <strong>${safe(incident.requesterName || 'N/A')}</strong>
          </td>
          <td>${safe(incident.assetId || '—')}</td>
          <td>
            <strong>${safe(incident.title || 'Untitled incident')}</strong>
            <small>${safe([incident.category, incident.subcategory, incident.incidentDetail].filter(Boolean).join(' / ') || incident.description || 'No classification')}</small>
          </td>
          <td>${safe(incident.priority || 'Medium')}</td>
          <td>
            <strong>${safe(incident.assignedTo || 'Unassigned')}</strong>
            <small>${safe(incident.assignedLevel || 'No level')}</small>
          </td>
          <td>
            <strong>${safe(sla.label)}</strong>
            <small>${safe(sla.detail)}</small>
          </td>
          <td>${safe(incident.status || 'Awaiting')}</td>
        </tr>
      `;
    });

    const printHtml = `
      <!doctype html>
      <html>
        <head>
          <title>Service Desk Ticket Registry</title>
</head>
        <body>
          <main class="registry-print">
            <header class="print-head">
              <div>
                <span>EMA Unified System — Service Desk Registry</span>
                <h1>Ticket Registry</h1>
                <p>Table-only print view. Header, sidebar, filters, buttons and detail panel are excluded.</p>
              </div>
              <div class="print-meta">
                <span>Total Tickets</span>
                <strong>${safe(sortedIncidents.length)}</strong>
                <span>${safe(new Date().toLocaleString('en-GB'))}</span>
              </div>
            </header>

            <div class="filter-line">
              <span>${safe(queueLabel)}</span>
              <span>Status: ${safe(statusLabel)}</span>
              <span>Urgency: ${safe(urgencyLabel)}</span>
              <span>Assignee: ${safe(assigneeLabel)}</span>
              ${searchTerm.trim() ? `<span>Search: ${safe(searchTerm.trim())}</span>` : ''}
            </div>

            ${
              rows.length
                ? `<table>
                    <colgroup>
                      <col class="col-no" />
                      <col class="col-req" />
                      <col class="col-date" />
                      <col class="col-requester" />
                      <col class="col-asset" />
                      <col class="col-incident" />
                      <col class="col-urgency" />
                      <col class="col-assigned" />
                      <col class="col-sla" />
                      <col class="col-status" />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>No</th>
                        <th>Req No</th>
                        <th>Submitted</th>
                        <th>Requester</th>
                        <th>Asset</th>
                        <th>Incident</th>
                        <th>Urgency</th>
                        <th>Assigned</th>
                        <th>SLA</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>${rows.join('')}</tbody>
                  </table>`
                : '<div class="empty">No ticket found for the current queue or filter.</div>'
            }

            <footer class="footer">
              <span>Printed from EMA Unified System</span>
              <span>Service Desk Ticket Registry</span>
            </footer>
          </main>
          <script>
            window.onload = function () {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=1120,height=760');
    if (!printWindow) {
      setToast({ message: 'Popup blocked. Allow popups to print ticket registry.', type: 'warning' });
      return;
    }

    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
  }

  const hasAdvancedFilter =
    Object.entries(advancedFilters).some(([key, value]) =>
      key === 'slaStatus' ? value !== 'All' : Boolean(String(value || '').trim())
    );

  const hasActiveFilters =
    Boolean(searchTerm.trim()) ||
    filterStatus !== 'All' ||
    filterPriority !== 'All' ||
    filterAssignedTo !== 'All' ||
    filterSlaStatus !== 'All' ||
    hasAdvancedFilter;

  function resetRegistryFilters() {
    setSearchTerm('');
    setFilterStatus('All');
    setFilterPriority('All');
    setFilterAssignedTo('All');
    setFilterSlaStatus('All');
    setAdvancedFilters(emptyAdvancedFilters());
    setShowAdvanced(false);
    setCurrentPage(1);
  }

  const queueItems = [
    { key: 'all' as QueueKey, label: 'All Tickets', sub: 'Complete service queue', count: queueCounts.all, icon: Ticket },
    { key: 'sla-risk' as QueueKey, label: 'SLA Risk', sub: 'Near due or breached', count: queueCounts.slaRisk, icon: ShieldAlert },
    { key: 'awaiting' as QueueKey, label: 'Awaiting', sub: 'New requests', count: queueCounts.awaiting, icon: Clock },
    { key: 'assigned' as QueueKey, label: 'Assigned', sub: 'Assigned tickets', count: queueCounts.assigned, icon: User },
    { key: 'in-progress' as QueueKey, label: 'In Progress', sub: 'Active work', count: queueCounts.inProgress, icon: ArrowRightLeft },
    { key: 'pending-approval' as QueueKey, label: 'Resolved', sub: 'Waiting closure', count: queueCounts.pendingApproval, icon: Settings },
    { key: 'resolved' as QueueKey, label: 'Closed', sub: 'Completed tickets', count: queueCounts.resolved, icon: CheckCircle2 },
    { key: 'knowledge' as QueueKey, label: 'Knowledge Base', sub: hasLoadedKb ? 'Resolution articles' : 'Loading articles...', count: queueCounts.kb, icon: BookOpen },
  ];

  const kpis = [
    { label: 'Open Tickets', value: queueCounts.open, note: 'support workload', className: 'open', icon: Ticket },
    { label: 'SLA Risk', value: queueCounts.slaRisk, note: 'near due / breached', className: 'risk', icon: ShieldAlert },
    { label: 'Awaiting', value: queueCounts.awaiting, note: 'new request queue', className: 'awaiting', icon: Clock },
    { label: 'In Progress', value: queueCounts.inProgress, note: 'active handling', className: 'progress', icon: ArrowRightLeft },
    { label: 'Closed', value: queueCounts.resolved, note: 'completed records', className: 'resolved', icon: CheckCircle2 },
    { label: 'Assigned', value: queueCounts.assigned, note: 'assigned tickets', className: 'assigned', icon: User },
  ];

  useEffect(() => {
    document.documentElement.classList.add('ema-settings-page-active');
    document.body.classList.add('ema-settings-page-active');

    return () => {
      document.documentElement.classList.remove('ema-settings-page-active');
      document.body.classList.remove('ema-settings-page-active');
    };
  }, []);

  const ticketTableColumns =
    '52px minmax(112px, .86fr) 106px minmax(132px, 1fr) minmax(96px, .72fr) minmax(220px, 1.55fr) 102px minmax(118px, .92fr) 104px 108px 104px';
  const ticketTableMinWidth = '100%';

  if (isLoading) {
    return (
      <div>
        <Loader2 size={28} />
        <strong>Loading Service Desk</strong>
        <span>Loading incident queue...</span>
      </div>
    );
  }

  // Service Desk uses the existing Settings layout/classes.
  return (
    <main className="" data-section="service-desk">
{toast && (
        <div role="status" aria-live="polite">
          <i>
            {toast.type === 'success' ? <CheckCircle2 size={18} /> : toast.type === 'error' ? <ShieldAlert size={18} /> : <Clock size={18} />}
          </i>
          <div>
            <strong>
              {toast.type === 'success'
                ? 'Success'
                : toast.type === 'error'
                  ? 'Action failed'
                  : toast.type === 'warning'
                    ? 'Attention'
                    : 'Information'}
            </strong>
            <span>{toast.message}</span>
          </div>
          <button type="button" onClick={() => setToast(null)} aria-label="Dismiss notification">
            <X size={14} />
          </button>
        </div>
      )}

      {confirmDialog && typeof document !== 'undefined' && createPortal(
        <main data-section="service-desk">
          <div onClick={(event) => event.stopPropagation()}>
          <section role="dialog" aria-modal="true" aria-labelledby="service-desk-confirm-title" onClick={(event) => event.stopPropagation()}>
            <AppIconButton type="button" variant="outline-secondary" label="Close confirmation" icon={<X size={16} />} onClick={closeConfirmDialog} disabled={confirmDialog.loading} />

            <div>
              {confirmDialog.tone === 'warning' ? <ShieldAlert size={24} /> : <Trash2 size={24} />}
            </div>

            <span>Confirmation required</span>
            <h2 id="service-desk-confirm-title">{confirmDialog.title}</h2>
            <p>{confirmDialog.message}</p>

            {confirmDialog.meta && <div>{confirmDialog.meta}</div>}

            {confirmDialog.requiresReason && (
              <label style={{}}>
                <span style={{}}>
                  {confirmDialog.reasonLabel || 'Reason'}
                </span>
                <textarea value={confirmReason} onChange={(event) => setConfirmReason(event.target.value)} disabled={confirmDialog.loading} placeholder={confirmDialog.reasonPlaceholder || 'Enter reason'} rows={4} style={{}} />
                <small style={{}}>
                  Reason is required before this action can continue.
                </small>
              </label>
            )}

            <footer>
              <AppButton type="button" variant="outline-secondary" onClick={closeConfirmDialog} disabled={confirmDialog.loading}>
                {confirmDialog.cancelLabel || 'Cancel'}
              </AppButton>

              <AppButton type="button" variant={confirmDialog.tone === 'danger' ? 'danger' : 'primary'} onClick={runConfirmAction} loading={confirmDialog.loading}>
                {confirmDialog.confirmLabel || 'Confirm'}
              </AppButton>
            </footer>
          </section>
        </div>
        </main>,
        document.body
      )}

      <div>
      <aside>
        <div>
          <div>
            <span>SERVICE CENTER</span>
            <strong>Service Desk</strong>
            <small>Ticket queue and support operation</small>
          </div>
        </div>
        <nav id="serviceDeskMenu" role="tablist" aria-label="Service Desk navigation">
          {queueItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.key} type="button" onClick={() => { setActiveQueue(item.key); if (item.key === 'knowledge') { setViewMode('kb'); void ensureKnowledgeBaseLoaded(); } else { setViewMode('list'); } }}>
                <i>
                  <Icon size={16} />
                </i>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.sub}</small>
                </span>
                <b>{item.count}</b>
              </button>
            );
          })}
        </nav>
      </aside>

      <section>
        <div style={{}}>
          <div>
            <span>INCIDENT COMMAND CENTER</span>
            <h2>Service Desk</h2>
            <p>Manage tickets, assignments, SLA risk and support activity.</p>
          </div>
          <div style={{}}>
            {kpis.slice(0, 4).map((kpi) => (
              <div data-service-desk-kpi="true" key={kpi.label} style={{}}>
                <span>{kpi.label}</span>
                <strong>{kpi.value}</strong>
                <small>{kpi.note}</small>
              </div>
            ))}
          </div>
        </div>

        <div>

        {viewMode === 'list' && (
          <section style={{}}>
            <div style={{}}>
              <label>
                <Search size={15} />
                <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search request no, requester, asset, incident..." />
              </label>

              <ServiceDeskSelect style={{}} value={filterStatus} ariaLabel="Filter tickets by status" placeholder="Status: All" onChange={setFilterStatus} options={[ { value: 'All', label: 'Status: All' }, ...STATUS_OPTIONS.map((status) => ({ value: status, label: `Status: ${status}` })), ]} />

              <ServiceDeskSelect style={{}} value={filterPriority} ariaLabel="Filter tickets by urgency" placeholder="Urgency: All" onChange={setFilterPriority} options={[ { value: 'All', label: 'Urgency: All' }, ...PRIORITY_OPTIONS.map((priority) => ({ value: priority, label: `Urgency: ${priority}` })), ]} />

              <ServiceDeskSelect style={{}} value={filterAssignedTo} ariaLabel="Filter tickets by assigned engineer" placeholder="Assignee: All" onOpen={() => void ensureLookupsLoaded()} onChange={setFilterAssignedTo} options={[ { value: 'All', label: 'Assignee: All' }, { value: '', label: 'Assignee: Unassigned' }, ...engineers.map((user) => ({ value: getUserName(user), label: `Assignee: ${getUserName(user)}` })), ]} />

              <div style={{}}>
                <button type="button" disabled={!hasActiveFilters} onClick={resetRegistryFilters}>
                  <X size={14} />
                  <span>Reset</span>
                </button>

                <button type="button" disabled={!canCreate} title={!canCreate ? 'Create ticket is not available for this role.' : 'Create Ticket'} onClick={openCreateForm}>
                  <Plus size={15} />
                  <span>Create Ticket</span>
                </button>

                <button type="button" aria-label="Refresh" title="Refresh" disabled={isRefreshing} onClick={refreshData}>
                  {isRefreshing ? <Loader2 size={15} /> : <RefreshCw size={15} />}
                </button>

                <button type="button" aria-label="Advanced filter" title="Advanced filter" onClick={() => { setShowAdvanced((prev) => !prev); void ensureLookupsLoaded(); }}>
                  <Filter size={15} />
                </button>

                <button type="button" aria-label="Export CSV" title="Export CSV" onClick={exportCsv}>
                  <Download size={15} />
                </button>

                <button type="button" aria-label="Print ticket table" title="Print ticket table" onClick={printTicketRegistry}>
                  <Printer size={15} />
                </button>
              </div>
            </div>

            {showAdvanced && (
              <div style={{}}>
                <div>
                  <i>
                    <Filter size={16} />
                  </i>
                  <div>
                    <strong>Find Incident</strong>
                    <span>Use specific ticket fields to narrow the Service Desk registry.</span>
                  </div>
                  <AppButton type="button" variant="outline-secondary" size="sm" leftIcon={<X size={14} />} onClick={() => setAdvancedFilters(emptyAdvancedFilters())}>
                    Reset Advanced
                  </AppButton>
                </div>

                <div>
                  <div>
                    <label>Request No</label>
                    <input value={advancedFilters.reqNo} onChange={(e) => setAdvancedFilters((p) => ({ ...p, reqNo: e.target.value }))} placeholder="Example: INC-0001" />
                  </div>

                  <div>
                    <label>Requester</label>
                    <input value={advancedFilters.requester} onChange={(e) => setAdvancedFilters((p) => ({ ...p, requester: e.target.value }))} placeholder="Requester name" />
                  </div>

                  <div>
                    <label>Incident</label>
                    <input value={advancedFilters.incidentTitle} onChange={(e) => setAdvancedFilters((p) => ({ ...p, incidentTitle: e.target.value }))} placeholder="Title or description" />
                  </div>

                  <div>
                    <label>Asset Tag</label>
                    <input value={advancedFilters.assetTag} onChange={(e) => setAdvancedFilters((p) => ({ ...p, assetTag: e.target.value }))} placeholder="Asset tag" />
                  </div>

                  <div>
                    <label>Category</label>
                    <ServiceDeskSelect value={advancedFilters.category} placeholder="All Categories" onChange={(value) => setAdvancedFilters((p) => ({ ...p, category: value, subcategory: '', detail: '' }))} options={[ { value: '', label: 'All Categories' }, ...categories.map((category) => ({ value: getCategoryName(category), label: getCategoryName(category) })), ]} />
                  </div>

                  <div>
                    <label>SLA Status</label>
                    <ServiceDeskSelect value={advancedFilters.slaStatus} placeholder="All SLA Status" onChange={(value) => setAdvancedFilters((p) => ({ ...p, slaStatus: value }))} options={['All', 'On Time', 'Near Due', 'Overdue', 'Closed'].map((status) => ({ value: status, label: status }))} />
                  </div>

                  <div>
                    <label>Date From</label>
                    <input type="date" value={advancedFilters.dateFrom} onChange={(e) => setAdvancedFilters((p) => ({ ...p, dateFrom: e.target.value }))} />
                  </div>

                  <div>
                    <label>Date To</label>
                    <input type="date" value={advancedFilters.dateTo} onChange={(e) => setAdvancedFilters((p) => ({ ...p, dateTo: e.target.value }))} />
                  </div>
                </div>
              </div>
            )}

            <div style={{}}>
              {paginatedIncidents.length === 0 ? (
                <div>
                  <div>
                    <Ticket size={26} />
                  </div>
                  <strong>No incident found</strong>
                  <span>
                    There is no ticket for this queue or selected filter.
                    Try All Tickets, reset filter, or create a new request.
                  </span>
                  {canCreate && (
                    <div>
                      <button type="button" onClick={openCreateForm}>
                        <Plus size={14} />
                        <span>New Ticket</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{}}>
                  <div style={{}}>
                    <div>No</div>
                    <div>
                      <button type="button" onClick={() => requestSort('id')}>
                        <span>Req No</span>
                        <i>{sortConfig.key === 'id' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</i>
                      </button>
                    </div>
                    <div>
                      <button type="button" onClick={() => requestSort('createdAt')}>
                        <span>Submitted</span>
                        <i>{sortConfig.key === 'createdAt' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</i>
                      </button>
                    </div>
                    <div>
                      <button type="button" onClick={() => requestSort('requesterName')}>
                        <span>Requester</span>
                        <i>{sortConfig.key === 'requesterName' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</i>
                      </button>
                    </div>
                    <div>Asset</div>
                    <div>
                      <button type="button" onClick={() => requestSort('title')}>
                        <span>Incident</span>
                        <i>{sortConfig.key === 'title' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</i>
                      </button>
                    </div>
                    <div>
                      <button type="button" onClick={() => requestSort('priority')}>
                        <span>Urgency</span>
                        <i>{sortConfig.key === 'priority' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</i>
                      </button>
                    </div>
                    <div>
                      <button type="button" onClick={() => requestSort('assignedTo')}>
                        <span>Assigned</span>
                        <i>{sortConfig.key === 'assignedTo' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</i>
                      </button>
                    </div>
                    <div>
                      <button type="button" onClick={() => requestSort('slaDue')}>
                        <span>SLA</span>
                        <i>{sortConfig.key === 'slaDue' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</i>
                      </button>
                    </div>
                    <div>
                      <button type="button" onClick={() => requestSort('status')}>
                        <span>Status</span>
                        <i>{sortConfig.key === 'status' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</i>
                      </button>
                    </div>
                    <div>Action</div>
                  </div>

                  {paginatedIncidents.map((incident, index) => {
                    const runningNo = (currentPage - 1) * itemsPerPage + index + 1;
                    const sla = getSlaMeta(incident, now);
                    const isSelected = getId(incident) === getId(selectedIncident || {});

                    return (
                      <div key={getId(incident)} data-ticket-row="true" style={{}} onClick={() => { setSelectedIncidentId(getId(incident)); showSlaOverdueWarning(incident); }}>
                        <div>
                          <span>{String(runningNo).padStart(2, '0')}</span>
                        </div>

                        <div>
                          <strong>{getId(incident)}</strong>
                        </div>

                        <div>{normalizeDate(incident.createdAt)}</div>

                        <div>
                          <div>
                            <span>{initialText(incident.requesterName || incident.reporterId)}</span>
                            <span>
                              <strong>{incident.requesterName || 'N/A'}</strong>
                            </span>
                          </div>
                        </div>

                        <div>
                          <span>
                            <Monitor size={13} />
                            {incident.assetId || '—'}
                          </span>
                        </div>

                        <div>
                          <strong>{incident.title || 'Untitled incident'}</strong>
                          <small>
                            {[incident.category, incident.subcategory, incident.incidentDetail].filter(Boolean).join(' / ') ||
                              incident.description ||
                              'No classification'}
                          </small>
                        </div>

                        <div>
                          <span>
                            {incident.priority || 'Medium'}
                          </span>
                        </div>

                        <div>
                          <strong>{incident.assignedTo || 'Unassigned'}</strong>
                          <small>{incident.assignedLevel || 'No level'}</small>
                        </div>

                        <div>
                          <strong>{sla.label}</strong>
                          <small>{sla.detail}</small>
                          <small>Due: {sla.dueText}</small>
                        </div>

                        <div>
                          <span>
                            {incident.status || 'Awaiting'}
                          </span>
                        </div>

                        <div onClick={(event) => event.stopPropagation()}>
                          <div style={{}}>
                            {canEditIncident(incident) && (
                              <button type="button" title="Edit ticket" aria-label="Edit ticket" onClick={() => openEditForm(incident)}>
                                <Pencil size={14} />
                              </button>
                            )}

                            {canDelete && (
                              <button type="button" title={isDeleteLockedStatus(incident.status) ? 'Delete disabled for closed tickets' : 'Delete ticket'} aria-label={isDeleteLockedStatus(incident.status) ? 'Delete disabled for closed tickets' : 'Delete ticket'} disabled={isDeleteLockedStatus(incident.status)} onClick={() => deleteIncident(incident)}>
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <AppPagination currentPage={currentPage} totalPages={totalPages} totalItems={sortedIncidents.length} pageSize={itemsPerPage} showPageSize={false} onPageChange={setCurrentPage} />
          </section>
        )}

        {viewMode === 'kb' && (
          <section>
            <header>
              <div>
                <h2>Knowledge Base</h2>
                <p>Manage and reference previous incident resolutions</p>
              </div>
              <div>
                {canCreate && (
                  <button type="button" onClick={() => { setKbFormData({ id: '', title: '', incidentDetails: '', resolution: '' }); setKbFormOpen(true); }}>
                    <Plus size={16} />
                  </button>
                )}
                <button type="button" onClick={() => { setViewMode('list'); setActiveQueue('all'); }}>
                  <Ticket size={16} />
                </button>
              </div>
            </header>

            {!hasLoadedKb && (
              <div>
                <Loader2 size={14} />
                <span>Loading knowledge base...</span>
              </div>
            )}

            <div>
              <label>
                <Search size={16} />
                <input value={kbSearch} onChange={(event) => setKbSearch(event.target.value)} placeholder="Search article title..." />
              </label>
            </div>

            <div>
              <span>
                Showing <strong>{filteredKb.length}</strong> knowledge article
              </span>
              <span>Title only. Use eye icon to view details.</span>
            </div>

            <div>
              <table>
                <colgroup>
                  <col />
                  <col />
                  <col />
                </colgroup>

                <thead>
                  <tr>
                    <th>No</th>
                    <th onClick={() => handleKbSort('title')}>Knowledge Base</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredKb.length === 0 && (
                    <tr>
                      <td colSpan={3}>
                        No knowledge base article found.
                      </td>
                    </tr>
                  )}

                  {filteredKb.map((kb, index) => (
                    <tr key={kb.id || kb.title}>
                      <td>
                        <span>{index + 1}</span>
                      </td>

                      <td>
                        <div>
                          <strong>{kb.title || 'Untitled article'}</strong>
                        </div>
                      </td>

                      <td>
                        <div>
                          <button type="button" title="View resolution" onClick={() => setSelectedKbArticle(kb)}>
                            <Eye size={14} />
                          </button>

                          {canAdminManageTickets && (
                            <button type="button" title="Edit article" onClick={() => { setKbFormData(kb); setKbFormOpen(true); }}>
                              <Pencil size={14} />
                            </button>
                          )}

                          {canDelete && (
                            <button type="button" title="Delete article" onClick={() => deleteKb(kb)}>
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        </div>
      </section>
      </div>

      {selectedKbArticle && (
        <div onClick={() => setSelectedKbArticle(null)}>
          <section onClick={(event) => event.stopPropagation()}>
            <header>
              <div>
                <span>Knowledge Article</span>
                <h2>{selectedKbArticle.title || 'Untitled article'}</h2>
                <p>{selectedKbArticle.incidentDetails || 'No incident details provided.'}</p>
              </div>
              <button type="button" onClick={() => setSelectedKbArticle(null)} aria-label="Close knowledge article">
                <X size={18} />
              </button>
            </header>

            <div>
              <section>
                <span>Incident Details</span>
                <p>{selectedKbArticle.incidentDetails || 'No incident details provided.'}</p>
              </section>

              <section>
                <span>Resolution</span>
                {splitKnowledgeSteps(selectedKbArticle.resolution).length > 1 ? (
                  <div>
                    {splitKnowledgeSteps(selectedKbArticle.resolution).map((step, index) => (
                      <div key={`selected-kb-step-${index}`}>
                        <p>{step}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>{selectedKbArticle.resolution || 'No resolution provided.'}</p>
                )}
              </section>
            </div>

            <footer>
              <AppButton type="button" variant="outline-secondary" onClick={() => setSelectedKbArticle(null)}>
                Close
              </AppButton>

              {canAdminManageTickets && (
                <AppButton type="button" variant="primary" leftIcon={<Pencil size={15} />} onClick={() => { setKbFormData(selectedKbArticle); setSelectedKbArticle(null); setKbFormOpen(true); }}>
                  Edit Article
                </AppButton>
              )}
            </footer>
          </section>
        </div>
      )}

      {selectedIncident && (
        <aside ref={detailPanelRef}>
          <>
            <div>
              <div>
                <Ticket size={24} />
              </div>
              <div>
                <span>{getId(selectedIncident)}</span>
                <h2>{selectedIncident.title || 'Untitled incident'}</h2>
                <p>{selectedIncident.description || 'No description provided.'}</p>
              </div>
              <AppIconButton type="button" variant="outline-light" label="Close ticket detail" icon={<X size={16} />} onClick={() => setSelectedIncidentId('')} />
            </div>

            <div>
              <div>
                <span>Requester</span>
                <strong>{selectedIncident.requesterName || 'N/A'}</strong>
              </div>
              <div>
                <span>Priority</span>
                <strong>{selectedIncident.priority || 'Medium'}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{selectedIncident.status || 'Awaiting'}</strong>
              </div>
              <div>
                <span>Assigned</span>
                <strong>{selectedIncident.assignedTo || 'Unassigned'}</strong>
              </div>
              <div>
                <span>Asset</span>
                <strong>{selectedIncident.assetId || '—'}</strong>
              </div>
              <div>
                <span>SLA Due</span>
                <strong>{normalizeDateTime(selectedIncident.slaDue)}</strong>
              </div>
              <div>
                <span>SLA Status</span>
                <strong>{getSlaMeta(selectedIncident, now).label}</strong>
              </div>
              <div>
                <span>SLA Timer</span>
                <strong>{getSlaMeta(selectedIncident, now).detail}</strong>
              </div>
            </div>

            <div>
              <strong>Operational Note</strong>
              <p>{selectedIncident.additionalMemo || selectedIncident.remarks || 'Service desk queue ready.'}</p>
            </div>

            <div>
              <div>
                <span>
                  <Download size={16} />
                </span>
                <div>
                  <strong>Incident Attachments</strong>
                  <p>Files linked to this service request.</p>
                </div>
              </div>

              {isLoadingAttachments ? (
                <div>
                  <Loader2 size={14} />
                  Loading attachments...
                </div>
              ) : incidentAttachments.length === 0 ? (
                <div>No attachments uploaded.</div>
              ) : (
                <div>
                  {incidentAttachments.map((file) => (
                    <div key={file.filename || file.id}>
                      <span />
                      <div>
                        <strong>
                          <a href={getIncidentAttachmentUrl(file)} target="_blank" rel="noreferrer">
                            {file.originalName || file.filename || 'Attachment'}
                          </a>
                        </strong>
                        <p>{formatAttachmentSize(file.size || file.fileSize) || 'Uploaded file'}</p>
                      </div>
                      {canUploadIncidentAttachments && canEditIncident(selectedIncident) && (
                        <button type="button" onClick={() => deleteIncidentAttachment(file.filename)}>
                          <Trash2 size={14} /> Delete
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              {canEditIncident(selectedIncident) && (
                <button type="button" onClick={() => resolveIncident(selectedIncident)} disabled={isDeleteLockedStatus(selectedIncident.status)} title={isDeleteLockedStatus(selectedIncident.status) ? 'Ticket already closed' : 'Submit and close ticket'}>
                  <CheckCircle2 size={15} /> Submit & Close
                </button>
              )}
              <button type="button" onClick={() => printTicket(selectedIncident)}>
                <Printer size={15} /> Print Ticket
              </button>
            </div>

            <div>
              <div>
                <Clock size={16} />
                <strong>Ticket Timeline</strong>
              </div>

              <div>
                <i />
                <div>
                  <strong>Created</strong>
                  <p>{selectedIncident.title || 'Incident submitted'}</p>
                  <span>{normalizeDateTime(selectedIncident.createdAt)}</span>
                </div>
              </div>

              {selectedIncident.firstResponseAt && (
                <div>
                  <i />
                  <div>
                    <strong>First Response</strong>
                    <p>{selectedIncident.assignedTo || 'Support team'} started handling this ticket.</p>
                    <span>{normalizeDateTime(selectedIncident.firstResponseAt)}</span>
                  </div>
                </div>
              )}

              {selectedIncident.resolvedAt && (
                <div>
                  <i />
                  <div>
                    <strong>Closed</strong>
                    <p>{selectedIncident.rootCause || selectedIncident.actionPlan || 'Resolution completed.'}</p>
                    <span>{normalizeDateTime(selectedIncident.resolvedAt)}</span>
                  </div>
                </div>
              )}
            </div>
          </>
        </aside>
      )}

      {viewMode === 'form' && typeof document !== 'undefined' && createPortal(
        <main data-section="service-desk">
          <div aria-modal="true" role="dialog">
          <form onSubmit={saveIncident} onClick={(event) => event.stopPropagation()}>
            <header>
              <div>
                <span>{formMode === 'create' ? 'New Incident' : formData.id || 'Edit Incident'}</span>
                <h2>{formMode === 'create' ? 'Create Service Request' : 'Update Service Request'}</h2>
                <p>Lookup data loads only when this form is opened.</p>
              </div>
              <button type="button" onClick={requestCloseForm} aria-label="Cancel ticket form">
                <X size={18} />
              </button>
            </header>

            <div>
              {isLoadingLookups && (
                <div>
                  <Loader2 size={14} />
                  <span>Loading creator, category and assignment options...</span>
                </div>
              )}

              <section>
                <h3 style={{}}>
                  <span>Created By & Asset</span>
                  {isRequesterAssetLocked && (
                    <em style={{}}>
                      Locked after creation
                    </em>
                  )}
                </h3>
                {isRequesterAssetLocked && (
                  <p style={{}}>
                    Created by and asset identity are locked for audit accuracy. Update assignment, status and resolution fields only.
                  </p>
                )}
                <div>
                  <label>
                    <span>Created By</span>
                    <input value={formData.requesterName || getCurrentLoginName(currentUser)} readOnly disabled aria-label="Created by current logged-in user" />
                    <small>
                      Auto-filled from current login. This field is not manually selectable.
                    </small>
                  </label>

                  <label>
                    <span>Submitted At</span>
                    <input value={normalizeDateTime(formData.createdAt)} readOnly disabled aria-label="Submitted at system generated timestamp" />
                  </label>

                  <label>
                    <span>
                      Device Type
                      {formMode === 'create' && <em>*</em>}
                    </span>
                    <ServiceDeskSelect value={formData.deviceType || ''} disabled={isRequesterAssetLocked || !canEditMainTicketFields} placeholder="Select Device Type" onChange={(value) => updateFormField('deviceType', value)} options={[ { value: '', label: 'Select Device Type', disabled: true }, ...DEVICE_TYPES.map((type) => ({ value: type, label: type })), ]} />
                  </label>

                  <label>
                    <span>
                      Asset Lookup
                      {formMode === 'create' && <em>*</em>}
                    </span>
                    <div ref={assetComboRef}>
                      <div>
                        <Search size={15} />
                        <input value={assetSearchTerm} disabled={isRequesterAssetLocked || !canEditMainTicketFields} onChange={(e) => { const value = e.target.value; setAssetSearchTerm(value); updateFormField('assetId', value); openAssetDropdown(); void searchAssets(value); }} onFocus={() => { if (isRequesterAssetLocked) return; openAssetDropdown(); if (clientAssets.length === 0) { void loadClientAssets('all', true); } }} placeholder={ isRequesterAssetLocked ? 'Locked after ticket creation' : isLoadingAssets ? 'Loading assets...' : 'Search asset tag, username, brand or model' } />
                      </div>
                      <button type="button" disabled={isRequesterAssetLocked || !canEditMainTicketFields} onClick={() => { if (showAssetDropdown) { setShowAssetDropdown(false); return; } openAssetDropdown(); if (clientAssets.length === 0) { void loadClientAssets('all'); } }}>
                        Choose asset
                      </button>

                      {showAssetDropdown && !isRequesterAssetLocked && typeof document !== 'undefined' && createPortal(
                        <div ref={assetDropdownPortalRef} style={{}}>
                          {isLoadingAssets ? (
                            <div>
                              <Loader2 size={14} />
                              Loading assets...
                            </div>
                          ) : filteredClientAssets.length === 0 ? (
                            <div>No asset found from API. Check /api/assets response or try another keyword.</div>
                          ) : (
                            filteredClientAssets.map((asset) => {
                              const value = getAssetValue(asset);
                              const meta = [asset.requesterName || asset.RequesterName, getAssetBrand(asset), getAssetModel(asset), getAssetOS(asset)].filter(Boolean).join(' • ');
                              return (
                                <button key={value || JSON.stringify(asset)} type="button" onClick={() => handleAssetSelect(asset)}>
                                  <strong>{value || 'Unnamed asset'}</strong>
                                  <span>{meta || asset.requesterName || 'No asset details'}</span>
                                </button>
                              );
                            })
                          )}
                        </div>,
                        document.body
                      )}
                    </div>

                    {formData.assetId && (formData.assetBrand || formData.assetModel || formData.assetOS) && (
                      <div>
                        {formData.assetBrand && <span>{formData.assetBrand}</span>}
                        {formData.assetModel && <span>{formData.assetModel}</span>}
                        {formData.assetOS && <span>{formData.assetOS}</span>}
                      </div>
                    )}
                  </label>

                  <label>
                    <span>Asset Brand</span>
                    <input value={formData.assetBrand || ''} disabled={isRequesterAssetLocked || !canEditMainTicketFields} onChange={(e) => updateFormField('assetBrand', e.target.value)} placeholder="Brand" />
                  </label>

                  <label>
                    <span>Asset Model</span>
                    <input value={formData.assetModel || ''} disabled={isRequesterAssetLocked || !canEditMainTicketFields} onChange={(e) => updateFormField('assetModel', e.target.value)} placeholder="Model" />
                  </label>

                  <label>
                    <span>Asset OS</span>
                    <input value={formData.assetOS || ''} disabled={isRequesterAssetLocked || !canEditMainTicketFields} onChange={(e) => updateFormField('assetOS', e.target.value)} placeholder="Operating system" />
                  </label>
                </div>
              </section>

              <section>
                <h3>Incident Classification</h3>
                <div>
                  <label>
                    <span>
                      Category
                      <em>*</em>
                    </span>
                    <ServiceDeskSelect value={formData.category || ''} disabled={!canEditMainTicketFields} placeholder="Select Category" onChange={(value) => setFormData((prev: any) => ({ ...prev, category: value, subcategory: '', incidentDetail: '' }))} options={[ { value: '', label: 'Select Category', disabled: true }, ...categories.map((category) => ({ value: getCategoryName(category), label: getCategoryName(category) })), ]} />
                  </label>

                  <label>
                    <span>
                      Subcategory
                      <em>*</em>
                    </span>
                    <ServiceDeskSelect value={formData.subcategory || ''} disabled={!canEditMainTicketFields} placeholder="Select Subcategory" onChange={(value) => setFormData((prev: any) => ({ ...prev, subcategory: value, incidentDetail: '' }))} options={[ { value: '', label: 'Select Subcategory', disabled: true }, ...subcategoryOptions.map((sub: any) => ({ value: getCategoryName(sub), label: getCategoryName(sub) })), ]} />
                  </label>

                  <label>
                    <span>
                      Problem Detail
                      <em>*</em>
                    </span>
                    <ServiceDeskSelect value={formData.incidentDetail || ''} disabled={!canEditMainTicketFields} placeholder="Select Detail" onChange={(value) => updateFormField('incidentDetail', value)} options={[ { value: '', label: 'Select Detail', disabled: true }, ...detailOptions.map((detail: any) => ({ value: getCategoryName(detail), label: getCategoryName(detail) })), ]} />
                  </label>

                  <label>
                    <span>
                      Urgency Level
                      <em>*</em>
                    </span>
                    <ServiceDeskSelect value={formData.priority || 'Medium'} disabled={!canEditMainTicketFields} placeholder="Select Urgency" onChange={(value) => updateFormField('priority', value)} options={PRIORITY_OPTIONS.map((priority) => ({ value: priority, label: priority }))} />
                  </label>

                  <label>
                    <span>
                      Title / Problem Description
                      <em>*</em>
                    </span>
                    <input value={formData.title || ''} disabled={!canEditMainTicketFields} onChange={(e) => updateFormField('title', e.target.value)} placeholder="Example: Unable to access internal HR portal" required />
                  </label>

                  <label>
                    <span>
                      Description
                      <em>*</em>
                    </span>
                    <textarea value={formData.description || ''} disabled={!canEditMainTicketFields} onChange={(e) => updateFormField('description', e.target.value)} placeholder="Describe issue, impact, error message and troubleshooting done." required />
                  </label>
                </div>
              </section>

              <section>
                <h3>Assignment & Resolution</h3>
                <div>
                  <label>
                    <span>
                      Status
                      {formMode === 'edit' && <em>*</em>}
                      {normalizeStatus(formData.status) === 're-open' && (
                        <em style={{}}>
                          Re-open reason required
                        </em>
                      )}
                    </span>
                    <ServiceDeskSelect value={formData.status || 'Awaiting'} disabled={formMode === 'create' || !canChangeTicketStatus || statusWorkflowOptions.length <= 1} placeholder="Select Status" onChange={(value) => { updateFormField('status', value); if (normalizeStatus(value) !== 'resolved') setGenerateApprovalJobsheet(false); }} options={statusWorkflowOptions.map((status) => ({ value: status, label: status }))} />
                    {formMode === 'edit' && (canUpdateStatus || canEngineerWorkTickets) && normalizeStatus(formData.status) === 'resolved' && normalizeStatus(formData._originalStatus || '') !== 'resolved' && (
                      <div>
                        <input type="checkbox" checked={generateApprovalJobsheet} onChange={(event) => setGenerateApprovalJobsheet(event.target.checked)} />
                        <span>Generate approval jobsheet</span>
                      </div>
                    )}
                    {formMode === 'edit' && normalizeStatus(formData._originalStatus || '') === 'resolved' && (
                      <button type="button" onClick={async () => { try { await downloadApprovalJobsheetPdf(formData); } catch (pdfError) { console.error('Jobsheet PDF download failed', pdfError); setToast({ message: 'Jobsheet PDF could not be downloaded. Please ensure jsPDF is installed.', type: 'warning' }); } }} style={{}}>
                        Generate approval jobsheet
                      </button>
                    )}
                  </label>

                  <label>
                    <span>
                      Assigned Level
                      {formMode === 'edit' && <em>*</em>}
                    </span>
                    <ServiceDeskSelect value={formData.assignedLevel || ''} disabled={!canAssignEngineer} placeholder={isLoadingLookups ? 'Loading support levels...' : 'Select Support Level'} onOpen={() => void ensureLookupsLoaded()} onChange={(value) => updateFormField('assignedLevel', value)} options={[ { value: '', label: isLoadingLookups ? 'Loading support levels...' : 'Select Support Level', disabled: true }, ...supportRoles.map((role) => ({ value: role.name || role.role, label: role.name || role.role })), ]} />
                  </label>

                  <label>
                    <span>
                      Assigned To
                      {formMode === 'edit' && <em>*</em>}
                    </span>
                    <ServiceDeskSelect value={formData.assignedTo || ''} placeholder={formData.assignedLevel ? 'Unassigned' : 'Select support level first'} disabled={!canAssignEngineer || !formData.assignedLevel || isLoadingEngineers} onChange={handleAssignedEngineerChange} options={[ { value: '', label: formData.assignedLevel ? isLoadingEngineers ? 'Loading engineers...' : 'Unassigned' : 'Select support level first', disabled: !formData.assignedLevel || isLoadingEngineers, }, ...assignableEngineers.map((engineer) => { const name = getUserName(engineer); const supportLevel = getPrimarySupportLevel(engineer) || formData.assignedLevel; const leaveLabel = isEngineerOnLeave(engineer) ? 'On leave' : 'Available'; return { value: name, label: `${name} · ${supportLevel} · ${leaveLabel}`, }; }), ]} />
                    {formData.assignedLevel && !isLoadingEngineers && assignableEngineers.length === 0 && (
                      <small>
                        No EMA_User found with role {formData.assignedLevel}.
                      </small>
                    )}
                  </label>

                  <label>
                    <span>SLA Due</span>
                    <input type="datetime-local" value={toDateTimeLocalInput(getSlaPreview(formData).due || formData.slaDue)} readOnly disabled aria-readonly="true" title="SLA due date is calculated automatically from Settings SLA rules and working hours." />
                    <small>
                      Auto-calculated from Settings SLA rules and working hours.
                    </small>
                  </label>

                  <div>
                    <strong>SLA Preview</strong>
                    <p>
                      {getSlaPreview(formData).code} · {getSlaPreview(formData).config?.label || formData.priority || 'Medium'} · {getSlaPreview(formData).meta.label}
                    </p>
                    <small>
                      Due: {getSlaPreview(formData).due ? normalizeDateTime(getSlaPreview(formData).due) : 'Not calculated'} · {getSlaPreview(formData).meta.detail}
                    </small>
                  </div>

                  <label>
                    <span>
                      Root Cause
                      {requiresEngineerResolutionFields && <em>*</em>}
                    </span>
                    <textarea ref={rootCauseRef} value={formData.rootCause || ''} disabled={!canEditResolutionFields} onChange={(e) => updateFormField('rootCause', e.target.value)} placeholder="Root cause analysis" />
                  </label>

                  <label>
                    <span>
                      Action Plan
                      {requiresEngineerResolutionFields && <em>*</em>}
                    </span>
                    <textarea ref={actionPlanRef} value={formData.actionPlan || ''} disabled={!canEditResolutionFields} onChange={(e) => updateFormField('actionPlan', e.target.value)} placeholder="Resolution steps / action plan" />
                  </label>

                  <label style={{}}>
                    <span style={{}}>
                      {normalizeStatus(formData.status) === 're-open'
                        ? 'Re-open Reason / Remarks *'
                        : 'Additional Memo / Remarks'}

                      {normalizeStatus(formData.status) === 're-open' && (
                        <em style={{}}>
                          Mandatory
                        </em>
                      )}
                    </span>

                    <textarea ref={rejectReasonRef} disabled={!canEditResolutionFields} aria-required={normalizeStatus(formData.status) === 're-open'} aria-invalid={normalizeStatus(formData.status) === 're-open' && !getOperationalReason(formData)} value={formData.additionalMemo || formData.remarks || ''} onChange={(e) => { updateFormField('additionalMemo', e.target.value); updateFormField('remarks', e.target.value); }} placeholder={ normalizeStatus(formData.status) === 're-open' ? 'Required: explain why this ticket is re-opened' : 'Internal note or requester remarks' } style={{}} />

                    {normalizeStatus(formData.status) === 're-open' && (
                      <small style={{}}>
                        {getOperationalReason(formData)
                          ? 'Re-open reason captured.'
                          : 'This field is required before a ticket can be re-opened.'}
                      </small>
                    )}
                  </label>
                </div>
              </section>

              {formMode === 'edit' && canUploadIncidentAttachments && (
              <section>
                <div>
                  <div>
                    <h3>Incident Attachments</h3>
                    <p>Upload supporting screenshot, document or log file for this ticket.</p>
                  </div>
                  <span>
                    {incidentAttachments.length}/{INCIDENT_ATTACHMENT_MAX_FILES} file{incidentAttachments.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div>
                  <label>
                    <input type="file" accept={INCIDENT_ATTACHMENT_ALLOWED_TYPES} disabled={!canUploadIncidentAttachments || isUploadingAttachment || !getId(formData) || incidentAttachments.length>= INCIDENT_ATTACHMENT_MAX_FILES} onChange={uploadIncidentAttachment} />
                    <span>
                      {isUploadingAttachment ? <Loader2 size={19} /> : <Download size={19} />}
                    </span>
                    <strong>{isUploadingAttachment ? 'Uploading attachment...' : 'Choose attachment'}</strong>
                    <small>
                      Maximum {INCIDENT_ATTACHMENT_MAX_FILES} files per ticket. Max {INCIDENT_ATTACHMENT_MAX_MB}MB per file. Total max {INCIDENT_ATTACHMENT_MAX_FILES * INCIDENT_ATTACHMENT_MAX_MB}MB.
                    </small>
                  </label>

                  <div>
                    <span>Uploaded Files</span>
                    {isLoadingAttachments ? (
                      <div>
                        <Loader2 size={14} />
                        Loading attachments...
                      </div>
                    ) : incidentAttachments.length === 0 ? (
                      <div>No attachments uploaded.</div>
                    ) : (
                      <div>
                        {incidentAttachments.map((file) => (
                          <div key={file.filename || file.id}>
                            <span />
                            <div>
                              <strong>
                                <a href={getIncidentAttachmentUrl(file)} target="_blank" rel="noreferrer">
                                  {file.originalName || file.filename || 'Attachment'}
                                </a>
                              </strong>
                              <p>{formatAttachmentSize(file.size || file.fileSize) || 'Uploaded file'}</p>
                            </div>
                            {canUploadIncidentAttachments && (
                              <button type="button" onClick={() => deleteIncidentAttachment(file.filename)}>
                                <Trash2 size={14} /> Delete
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

              {formMode === 'edit' && normalizeStatus(standardizeIncidentStatus(formData._originalStatus || selectedIncident?.status || '')) === 'resolved' && canUploadIncidentAttachments && (
                <section>
                  <div>
                    <div>
                      <h3>Approval Feedback</h3>
                      <p>Attach the signed approval jobsheet or user feedback while the ticket is Resolved. Admin can review it and close the ticket manually.</p>
                    </div>
                    <span>{approvalFeedbackUploaded ? 'Feedback attached' : 'Awaiting feedback attachment'}</span>
                  </div>
                  <div>
                    Use the Incident Attachments upload above to add the signed approval jobsheet or feedback file before admin review.
                  </div>
                </section>
              )}
            </div>

            <footer>
              <AppButton type="button" variant="outline-secondary" onClick={requestCloseForm}>
                Cancel
              </AppButton>

              {formMode === 'edit' && canAdminManageTickets && canEditIncident(formData) && (
                <AppButton type="button" variant="warning" onClick={() => resolveIncident(formData)} disabled={isSaving || isDeleteLockedStatus(formData.status)} title={isDeleteLockedStatus(formData.status) ? 'Ticket already closed' : 'Submit and close ticket'}>
                  Submit & Close
                </AppButton>
              )}

              <AppButton type="submit" variant="primary" loading={isSaving} leftIcon={<Send size={16} />}>
                {formMode === 'create' ? 'Submit Ticket' : 'Update Ticket'}
              </AppButton>
            </footer>
          </form>
        </div>
        </main>,
        document.body
      )}

      {kbFormOpen && (
        <div onClick={() => setKbFormOpen(false)}>
          <form onSubmit={saveKb} onClick={(event) => event.stopPropagation()}>
            <header>
              <div>
                <span>Knowledge Base</span>
                <h2>{kbFormData.id ? 'Edit Resolution Article' : 'New Resolution Article'}</h2>
                <p>Knowledge base records use the existing KnowledgeBaseService API.</p>
              </div>
              <button type="button" onClick={() => setKbFormOpen(false)}>
                <X size={18} />
              </button>
            </header>

            <div>
              <section>
                <div>
                  <label>
                    <span>Title</span>
                    <input value={kbFormData.title || ''} onChange={(e) => setKbFormData((prev: any) => ({ ...prev, title: e.target.value }))} />
                  </label>
                  <label>
                    <span>Incident Details</span>
                    <textarea value={kbFormData.incidentDetails || ''} onChange={(e) => setKbFormData((prev: any) => ({ ...prev, incidentDetails: e.target.value }))} />
                  </label>
                  <label>
                    <span>Resolution</span>
                    <textarea value={kbFormData.resolution || ''} onChange={(e) => setKbFormData((prev: any) => ({ ...prev, resolution: e.target.value }))} />
                  </label>
                </div>
              </section>
            </div>

            <footer>
              <AppButton type="button" variant="outline-secondary" onClick={() => setKbFormOpen(false)}>
                Cancel
              </AppButton>

              <AppButton type="submit" variant="primary" loading={isSaving} leftIcon={<Send size={16} />}>
                Save Article
              </AppButton>
            </footer>
          </form>
        </div>
      )}
    </main>
  );
}
