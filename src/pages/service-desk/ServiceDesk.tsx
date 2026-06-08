import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ButtonHTMLAttributes, CSSProperties, FormEvent, ReactNode } from 'react';

import {
  incidents as incidentsService,
  incidentConfig as incidentConfigService,
  incidentCategories as incidentCategoriesService,
} from '../../services/IncidentService';
import { users as usersService, roles as rolesService } from '../../services/UserService';
import { assets as assetsService } from '../../services/AssetService';
import { knowledgeBase as knowledgeBaseService } from '../../services/KnowledgeBaseService';
import { engineerAvailability as engineerAvailabilityService } from '../../services/EngineerAvailabilityService';

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
  | 'my'
  | 'sla-risk'
  | 'unassigned'
  | 'awaiting'
  | 'in-progress'
  | 'pending-user'
  | 'pending-vendor'
  | 'on-site'
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
  'In Progress',
  'Pending Approval',
  'Pending User',
  'Pending Vendor',
  'On Site',
  'Resolved',
  'Rejected',
];

const PRIORITY_OPTIONS = ['Critical', 'High', 'Medium', 'Low'];
const DEVICE_TYPES = ['Desktop', 'Laptop', 'Tablet', 'Mobile', 'Server', 'Network Device', 'Printer', 'Other'];

const MALAYSIA_TIME_ZONE = 'Asia/Kuala_Lumpur';
const MALAYSIA_UTC_OFFSET = '+08:00';

const urgencyToSlaPriority: Record<string, string> = {
  Critical: 'P1',
  High: 'P2',
  Medium: 'P3',
  Low: 'P4',
};

const emptyForm = () => ({
  id: '',
  userType: 'Internal User',
  title: '',
  description: '',
  priority: 'Medium',
  status: 'Awaiting',
  category: '',
  subcategory: '',
  incidentDetail: '',
  assetId: '',
  assetBrand: '',
  assetModel: '',
  assetOS: '',
  customerId: '',
  customerName: '',
  sector: '',
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
      className={cn(
        mapServiceDeskButtonVariant(variant),
        mapServiceDeskButtonSize(size),
        fullWidth && "w-100",
        loading && "is-loading",
        className
      )}
    >
      {loading ? <Loader2 size={15} className="ema-spin" /> : leftIcon ? <span className="btn-icon">{leftIcon}</span> : null}
      <span>{children}</span>
      {!loading && rightIcon ? <span className="btn-icon">{rightIcon}</span> : null}
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
      className={cn(
        mapServiceDeskButtonVariant(variant),
        mapServiceDeskButtonSize(size),
        "mini-btn icon-only",
        loading && "is-loading",
        className
      )}
    >
      {loading ? <Loader2 size={15} className="ema-spin" /> : icon}
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
    <div className={cn("uam-pagination global-style", className)}>
      <div className="uam-page-summary">Page {safeCurrentPage} / {safeTotalPages}</div>
      <div className="uam-page-status">
        Showing {firstItem}-{lastItem} of {safeTotalItems}
      </div>
      <div className="uam-pagination-controls global-style">
        <button className="uam-page-icon" type="button" disabled={safeCurrentPage <= 1} onClick={() => goToPage(1)}>«</button>
        <button className="uam-page-icon" type="button" disabled={safeCurrentPage <= 1} onClick={() => goToPage(safeCurrentPage - 1)}>‹</button>
        <span className="uam-page-current">{safeCurrentPage}</span>
        <button className="uam-page-icon" type="button" disabled={safeCurrentPage >= safeTotalPages} onClick={() => goToPage(safeCurrentPage + 1)}>›</button>
        <button className="uam-page-icon" type="button" disabled={safeCurrentPage >= safeTotalPages} onClick={() => goToPage(safeTotalPages)}>»</button>
      </div>
    </div>
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
  onChange,
  onOpen,
}: ServiceDeskSelectProps) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
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

    setMenuStyle({
      position: 'fixed',
      left,
      top,
      width: menuWidth,
      maxHeight,
      zIndex: 2147483600,
    });
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

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [open, value, options.length]);

  const menuNode = open && !disabled && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={menuRef}
          className={cn('uam-filter-menu uam-filter-menu-portal setting-select-menu', menuClassName)}
          style={menuStyle}
          role="listbox"
          aria-label={ariaLabel || placeholder}
        >
          {options.map((option) => {
            const active = option.value === value;

            return (
              <button
                key={`${option.value}-${option.label}`}
                className={cn('uam-filter-option', active && 'selected')}
                type="button"
                role="option"
                aria-selected={active}
                disabled={option.disabled}
                onClick={() => {
                  if (option.disabled) return;
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span>{option.label}</span>
                {active && <span className="uam-filter-check">✓</span>}
              </button>
            );
          })}
        </div>,
        document.body
      )
    : null;

  return (
    <div className={cn('uam-filter-dropdown setting-select-dropdown', open && 'open', disabled && 'disabled', className)}>
      <button
        ref={triggerRef}
        className="uam-filter-trigger setting-select-trigger"
        type="button"
        onClick={() => {
          if (disabled) return;
          onOpen?.();
          setOpen((current) => !current);
        }}
        disabled={disabled}
        aria-expanded={open}
        aria-label={ariaLabel || placeholder}
      >
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
  return client?.companyName || client?.customerName || client?.name || client?.username || client?.userID || client?.UserID || client?.CustomerName || client?.Username || '';
}

function getClientId(client: any) {
  return String(client?.id ?? client?.userID ?? client?.UserID ?? client?.customerId ?? client?.CustomerID ?? getClientName(client));
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

function getAssetSearchText(asset: any) {
  return [
    getAssetValue(asset),
    getAssetBrand(asset),
    getAssetModel(asset),
    getAssetOS(asset),
    asset?.deviceType || asset?.DeviceType || '',
    asset?.customerName || asset?.CustomerName || asset?.department || '',
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

function getCurrentLoginId(user: any) {
  return String(
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

function isDeleteLockedStatus(status: any) {
  const normalized = normalizeStatus(status);
  return normalized === 'closed' || normalized === 'resolved';
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
    'In Progress': 2,
    'Pending User': 3,
    'Pending Vendor': 4,
    'On Site': 5,
    Resolved: 6,
    Rejected: 7,
  };
  return map[status] || 99;
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
  if (incident?.status === 'Resolved' || incident?.status === 'Rejected') {
    return {
      label: 'Closed',
      detail: incident?.resolvedAt ? normalizeDateTime(incident.resolvedAt) : 'Completed',
      className: 'resolved',
      minutes: 0,
    };
  }

  if (!incident?.slaDue) {
    return { label: 'No SLA', detail: 'Not calculated', className: 'unknown', minutes: Infinity };
  }

  const due = parseApiDate(incident.slaDue);
  if (!due) {
    return { label: 'Invalid', detail: String(incident.slaDue), className: 'unknown', minutes: Infinity };
  }

  const diffMs = due.getTime() - now.getTime();
  const totalMinutes = Math.floor(Math.abs(diffMs) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const label = `${diffMs < 0 ? '-' : ''}${hours}h ${mins}m`;

  if (diffMs < 0) return { label, detail: 'Overdue', className: 'overdue', minutes: diffMs / 60000 };
  if (diffMs <= 240 * 60000) return { label, detail: 'Near due', className: 'near', minutes: diffMs / 60000 };
  return { label, detail: 'On track', className: 'ontrack', minutes: diffMs / 60000 };
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
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'createdAt',
    direction: 'desc',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(emptyAdvancedFilters());
  const [now, setNow] = useState(new Date());

  const [formData, setFormData] = useState<any>(emptyForm());
  const [clientAssets, setClientAssets] = useState<any[]>([]);
  const [assetSearchTerm, setAssetSearchTerm] = useState('');
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [assetDropdownStyle, setAssetDropdownStyle] = useState<CSSProperties>({});
  const assetComboRef = useRef<HTMLDivElement>(null);
  const assetDropdownPortalRef = useRef<HTMLDivElement>(null);
  const detailPanelRef = useRef<HTMLElement>(null);
  const rejectReasonRef = useRef<HTMLTextAreaElement>(null);

  const [kbFormOpen, setKbFormOpen] = useState(false);
  const [kbFormData, setKbFormData] = useState<any>({ id: '', title: '', incidentDetails: '', resolution: '' });
  const [kbSearch, setKbSearch] = useState('');
  const [kbSortDirection, setKbSortDirection] = useState<'asc' | 'desc'>('asc');

  const incidentPermissions = currentUser?.permissions?.incidents;
  const hasIncidentPermissionProfile = Boolean(incidentPermissions);
  const canEdit = !hasIncidentPermissionProfile || Boolean(incidentPermissions?.edit);
  const canCreate = !hasIncidentPermissionProfile || canEdit || Boolean(incidentPermissions?.create);
  const canDelete = !hasIncidentPermissionProfile || canEdit || Boolean(incidentPermissions?.delete);
  const isRequesterAssetLocked = formMode === 'edit';
  const isSupportUser = /L[123]/i.test(currentUser?.role || '') || /support/i.test(currentUser?.role || '');

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
        sector: '',
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
      list.unshift({ id: String(currentUser?.id || currentName), name: currentName, sector: '' });
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
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
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

    const handlePositionUpdate = () => updateAssetDropdownPosition();

    window.addEventListener('resize', handlePositionUpdate);
    window.addEventListener('scroll', handlePositionUpdate, true);

    return () => {
      window.removeEventListener('resize', handlePositionUpdate);
      window.removeEventListener('scroll', handlePositionUpdate, true);
    };
  }, [showAssetDropdown, assetSearchTerm, clientAssets.length]);

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
  }, [activeQueue, searchTerm, filterStatus, filterPriority, filterAssignedTo, showAdvanced, advancedFilters]);

  async function loadData(silent = false) {
    if (!silent) setIsLoading(true);

    try {
      const incidentsData = await safeApi('GET /api/incidents', incidentsService.getAll(), [], true);
      const nextIncidents = Array.isArray(incidentsData) ? incidentsData : [];

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
    setFormData((prev: any) => {
      if (field === 'assignedLevel') {
        return { ...prev, assignedLevel: value, assignedTo: '' };
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

  function calculateSlaDue(data: any) {
    const existingSlaDue = toIsoDateOrEmpty(data.slaDue);

    if (existingSlaDue) {
      return existingSlaDue;
    }

    const slaCode = urgencyToSlaPriority[data.priority];
    const config = slaConfigs.find((item) => item.priority === slaCode || item.label === data.priority);

    if (!config?.resolutionTimeHrs) {
      return '';
    }

    const createdAt = toIsoDateOrEmpty(data.createdAt) || new Date().toISOString();
    const calculatedDue = addWorkingHours(parseApiDate(createdAt) || new Date(), Number(config.resolutionTimeHrs));

    return calculatedDue.toISOString();
  }

  async function checkEngineerAvailability(assignedTo: string) {
    if (!assignedTo) return true;

    const selectedEngineer =
      assignableEngineers.find((engineer) => getUserName(engineer) === assignedTo || getEngineerKey(engineer) === assignedTo) || null;

    if (selectedEngineer && isEngineerOnLeave(selectedEngineer)) {
      setToast({
        message: getEngineerLeaveMessage(selectedEngineer),
        type: 'warning',
      });
    }

    return true;
  }

  function handleAssignedEngineerChange(value: string) {
    updateFormField('assignedTo', value);

    if (!value) return;

    const selectedEngineer = assignableEngineers.find(
      (engineer) => getUserName(engineer) === value || getEngineerKey(engineer) === value
    );

    if (selectedEngineer && isEngineerOnLeave(selectedEngineer)) {
      setToast({
        message: getEngineerLeaveMessage(selectedEngineer),
        type: 'warning',
      });
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

    setAssetDropdownStyle({
      position: 'fixed',
      left,
      top,
      width: dropdownWidth,
      maxHeight,
      zIndex: 2147483647,
    });
  }

  function openAssetDropdown() {
    if (isRequesterAssetLocked) return;

    setShowAssetDropdown(true);

    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(updateAssetDropdownPosition);
    }
  }

  async function loadClientAssets(customerName: string) {
    const queryName = customerName.trim();

    setIsLoadingAssets(true);
    openAssetDropdown();

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
      openAssetDropdown();
    } catch (error) {
      console.error('Failed to load assets from DB', error);
      setClientAssets([]);
      openAssetDropdown();
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
        void loadClientAssets('all');
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
        customerId: '',
        customerName: '',
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
      customerId: getClientId(client),
      customerName: getClientName(client),
      sector: '',
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

  async function openCreateForm() {
    if (!canCreate) {
      setToast({ message: 'You do not have permission to create a ticket.', type: 'warning' });
      return;
    }

    await ensureLookupsLoaded();

    const currentRequesterName = getCurrentLoginName(currentUser);
    const currentRequesterId = getCurrentLoginId(currentUser);

    setFormMode('create');
    setFormData({
      ...emptyForm(),
      customerId: currentRequesterId,
      customerName: currentRequesterName,
      reporterId: currentRequesterId,
      userType: 'Internal User',
      sector: '',
    });
    setClientAssets([]);
    setAssetSearchTerm('');
    setShowAssetDropdown(false);
    void loadClientAssets('all');
    setViewMode('form');
  }

  async function openEditForm(incident: any) {
    if (!canEdit || !incident) return;

    await ensureLookupsLoaded();

    const normalizedIncident = {
      ...incident,
      id: getId(incident),
      createdAt: toIsoDateOrEmpty(incident.createdAt) || new Date().toISOString(),
      slaDue: toIsoDateOrEmpty(incident.slaDue),
      firstResponseAt: toIsoDateOrEmpty(incident.firstResponseAt),
      resolvedAt: toIsoDateOrEmpty(incident.resolvedAt),
    };

    setFormMode('edit');
    setFormData({ ...emptyForm(), ...normalizedIncident });
    setAssetSearchTerm(incident.assetId || '');
    setClientAssets([]);
    setShowAssetDropdown(false);

    if (incident.customerName) {
      void loadClientAssets(incident.customerName);
    }

    setViewMode('form');
  }

  function closeForm() {
    setViewMode('list');
    setFormData(emptyForm());
    setClientAssets([]);
    setAssetSearchTerm('');
    setShowAssetDropdown(false);
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
    if (formMode === 'create' && !canCreate) return;
    if (formMode === 'edit' && !canEdit) return;

    if (!formData.title?.trim()) {
      setToast({ message: 'Title / Problem Description is required.', type: 'error' });
      return;
    }

    if (!formData.description?.trim()) {
      setToast({ message: 'Description is required.', type: 'error' });
      return;
    }

    if (normalizeStatus(formData.status) === 'rejected' && !getOperationalReason(formData)) {
      rejectReasonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      rejectReasonRef.current?.focus();
      setToast({
        message: 'Reject reason is required. Fill in the highlighted Reject Reason / Remarks field.',
        type: 'error',
      });
      return;
    }

    if (formData.assignedTo) {
      await checkEngineerAvailability(formData.assignedTo);
    }

    setIsSaving(true);
    try {
      const operationalReason = getOperationalReason(formData);
      const currentRequesterName = getCurrentLoginName(currentUser);
      const currentRequesterId = getCurrentLoginId(currentUser);

      const saveData = {
        ...formData,
        userType: 'Internal User',
        sector: '',
        customerId: formMode === 'create' ? currentRequesterId : formData.customerId,
        customerName: formMode === 'create' ? currentRequesterName : formData.customerName,
        reporterId: formMode === 'create' ? currentRequesterId : formData.reporterId,
        id: getId(formData) || makeIncidentId(),
        createdAt: toIsoDateOrEmpty(formData.createdAt) || new Date().toISOString(),
        slaDue: calculateSlaDue(formData),
        firstResponseAt: toIsoDateOrEmpty(formData.firstResponseAt),
        resolvedAt: toIsoDateOrEmpty(formData.resolvedAt),
        additionalMemo: operationalReason || formData.additionalMemo || '',
        remarks: operationalReason || formData.remarks || '',
      };

      if (formMode === 'create') {
        saveData.status = 'Awaiting';
        saveData.createdAt = new Date().toISOString();
        await incidentsService.create(saveData);
        setToast({ message: `Ticket ${saveData.id} created successfully.`, type: 'success' });
      } else {
        if (saveData.status === 'Awaiting') saveData.status = 'In Progress';
        if (!saveData.firstResponseAt) saveData.firstResponseAt = new Date().toISOString();
        if (saveData.status === 'Resolved' && !saveData.resolvedAt) saveData.resolvedAt = new Date().toISOString();
        await incidentsService.update(saveData);
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
    if (!canEdit || !incident) return;

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
        status: 'Resolved',
        resolvedAt: nowIso,
        firstResponseAt: toIsoDateOrEmpty(incident.firstResponseAt) || nowIso,
        createdAt: toIsoDateOrEmpty(incident.createdAt) || nowIso,
        slaDue: toIsoDateOrEmpty(incident.slaDue),
      };

      await incidentsService.update(resolvedData);
      await loadData(true);

      // Close any open edit drawer and right-side detail panel after resolve.
      // The success toast is enough confirmation; reopening the resolved detail
      // panel makes the UI feel stuck behind the overlay.
      closeForm();
      setSelectedIncidentId('');

      setToast({ message: `Ticket ${incidentId} resolved successfully.`, type: 'success' });
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
      setToast({ message: `Ticket ${incidentId} is ${incident.status}. Delete is disabled for closed or resolved tickets.`, type: 'warning' });
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
          await loadData(true);
          setSelectedIncidentId((current) => (current === incidentId ? '' : current));
          setToast({ message: `Ticket ${incidentId} deleted successfully.`, type: 'success' });
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
      if (isSupportUser && incident.assignedTo !== currentUser?.name) return false;
      return true;
    });
  }, [incidents, isSupportUser, currentUser?.name]);

  const queueCounts = useMemo(() => {
    const open = scopedIncidents.filter((item) => !['Resolved', 'Rejected'].includes(item.status));
    return {
      all: scopedIncidents.length,
      my: scopedIncidents.filter((item) => item.assignedTo === currentUser?.name).length,
      slaRisk: scopedIncidents.filter((item) => {
        const sla = getSlaMeta(item, now);
        return ['overdue', 'near'].includes(sla.className) && !['Resolved', 'Rejected'].includes(item.status);
      }).length,
      unassigned: open.filter((item) => !item.assignedTo).length,
      awaiting: scopedIncidents.filter((item) => item.status === 'Awaiting').length,
      inProgress: scopedIncidents.filter((item) => item.status === 'In Progress').length,
      pendingUser: scopedIncidents.filter((item) => item.status === 'Pending User').length,
      pendingVendor: scopedIncidents.filter((item) => item.status === 'Pending Vendor').length,
      onSite: scopedIncidents.filter((item) => item.status === 'On Site').length,
      resolved: scopedIncidents.filter((item) => item.status === 'Resolved').length,
      kb: knowledgeBaseEntries.length,
      open: open.length,
    };
  }, [scopedIncidents, currentUser?.name, now, knowledgeBaseEntries.length]);

  const filteredIncidents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return scopedIncidents.filter((incident) => {
      const sla = getSlaMeta(incident, now);

      const queueMatch =
        activeQueue === 'all' ||
        (activeQueue === 'my' && incident.assignedTo === currentUser?.name) ||
        (activeQueue === 'sla-risk' && ['overdue', 'near'].includes(sla.className) && !['Resolved', 'Rejected'].includes(incident.status)) ||
        (activeQueue === 'unassigned' && !incident.assignedTo && !['Resolved', 'Rejected'].includes(incident.status)) ||
        (activeQueue === 'awaiting' && incident.status === 'Awaiting') ||
        (activeQueue === 'in-progress' && incident.status === 'In Progress') ||
        (activeQueue === 'pending-user' && incident.status === 'Pending User') ||
        (activeQueue === 'pending-vendor' && incident.status === 'Pending Vendor') ||
        (activeQueue === 'on-site' && incident.status === 'On Site') ||
        (activeQueue === 'resolved' && incident.status === 'Resolved') ||
        activeQueue === 'knowledge';

      if (!queueMatch) return false;
      if (activeQueue === 'knowledge') return false;
      if (filterStatus !== 'All' && incident.status !== filterStatus) return false;
      if (filterPriority !== 'All' && incident.priority !== filterPriority) return false;
      if (filterAssignedTo !== 'All' && (incident.assignedTo || '') !== filterAssignedTo) return false;

      const haystack = [
        getId(incident),
        incident.title,
        incident.description,
        incident.customerName,
        incident.assetId,
        incident.sector,
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
        if (adv.requester && !String(incident.customerName || '').toLowerCase().includes(adv.requester.toLowerCase())) return false;

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

        if (adv.slaStatus !== 'All') {
          if (adv.slaStatus === 'Overdue' && sla.className !== 'overdue') return false;
          if (adv.slaStatus === 'Near Due' && sla.className !== 'near') return false;
          if (adv.slaStatus === 'On Track' && sla.className !== 'ontrack') return false;
        }
      }

      return true;
    });
  }, [
    activeQueue,
    advancedFilters,
    currentUser?.name,
    filterAssignedTo,
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
    const headers = ['Req No', 'Submitted Date', 'Requester', 'Asset Tag', 'Sector', 'Incident', 'Urgency Level', 'Assigned To', 'Status', 'SLA Time'];
    const rows = filteredIncidents.map((incident) => {
      const sla = getSlaMeta(incident, now);
      return [
        getId(incident),
        normalizeDate(incident.createdAt),
        incident.customerName || 'N/A',
        incident.assetId || '-',
        incident.sector || 'N/A',
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
      ['Requester', incident.customerName || 'N/A'],
      ['Sector', incident.sector || 'N/A'],
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
      ['Resolved At', normalizeDateTime(incident.resolvedAt)],
    ];

    const printHtml = `
      <!doctype html>
      <html>
        <head>
          <title>Ticket ${safe(getId(incident))}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

            @page { size: A4; margin: 14mm; }
            * { box-sizing: border-box; }
            html,
            body,
            table,
            td,
            th,
            button,
            input,
            textarea {
              font-family: "Plus Jakarta Sans", "Segoe UI", Arial, sans-serif;
            }
            body {
              margin: 0;
              background: #ffffff;
              color: #10254d;
              font-size: 12px;
              line-height: 1.45;
              -webkit-font-smoothing: antialiased;
              text-rendering: geometricPrecision;
            }
            .ticket-print {
              width: 100%;
              max-width: 780px;
              margin: 0 auto;
            }
            .print-head {
              display: flex;
              justify-content: space-between;
              gap: 18px;
              padding-bottom: 16px;
              border-bottom: 2px solid #dbe6f5;
            }
            .print-head span {
              display: block;
              color: #2e63f0;
              font-size: 10px;
              font-weight: 900;
              letter-spacing: .12em;
              text-transform: uppercase;
            }
            .print-head h1 {
              margin: 5px 0 6px;
              color: #10254d;
              font-size: 22px;
              line-height: 1.15;
              font-weight: 850;
              letter-spacing: -0.035em;
            }
            .print-head p {
              margin: 0;
              color: #6079a6;
              font-size: 12px;
              font-weight: 650;
              line-height: 1.5;
            }
            .print-badge {
              min-width: 120px;
              height: 42px;
              padding: 0 14px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              border-radius: 14px;
              background: #eef5ff;
              border: 1px solid #c8d9ff;
              color: #2e63f0;
              font-weight: 900;
            }
            .section {
              margin-top: 18px;
              border: 1px solid #dbe6f5;
              border-radius: 16px;
              overflow: hidden;
            }
            .section h2 {
              margin: 0;
              padding: 11px 14px;
              background: #f7fbff;
              border-bottom: 1px solid #dbe6f5;
              color: #17345f;
              font-size: 13px;
              font-weight: 850;
              letter-spacing: -0.015em;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            td {
              padding: 10px 14px;
              border-bottom: 1px solid #edf2f8;
              vertical-align: top;
            }
            tr:last-child td { border-bottom: 0; }
            td:first-child {
              width: 180px;
              color: #6f85ad;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: .06em;
              font-size: 10px;
            }
            td:last-child {
              color: #10254d;
              font-weight: 650;
              letter-spacing: -0.01em;
            }
            .text-block {
              padding: 14px;
              min-height: 64px;
              color: #10254d;
              line-height: 1.55;
              white-space: pre-wrap;
            }
            .footer {
              margin-top: 20px;
              padding-top: 12px;
              border-top: 1px solid #dbe6f5;
              color: #7b91b6;
              font-size: 10px;
              display: flex;
              justify-content: space-between;
            }
          </style>
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

    const rows = sortedIncidents.map((incident, index) => {
      const sla = getSlaMeta(incident, now);
      return `
        <tr>
          <td>${safe(index + 1)}</td>
          <td><strong>${safe(getId(incident))}</strong></td>
          <td>${safe(normalizeDateTime(incident.createdAt))}</td>
          <td>
            <strong>${safe(incident.customerName || 'N/A')}</strong>
            <small>${safe(incident.sector || 'No sector')}</small>
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
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

            @page { size: A4 landscape; margin: 10mm; }
            * { box-sizing: border-box; }

            html,
            body,
            table,
            td,
            th {
              font-family: "Plus Jakarta Sans", "Segoe UI", Arial, sans-serif;
            }

            body {
              margin: 0;
              background: #ffffff;
              color: #10254d;
              font-size: 10px;
              line-height: 1.35;
              -webkit-font-smoothing: antialiased;
              text-rendering: geometricPrecision;
            }

            .registry-print {
              width: 100%;
            }

            .print-head {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 18px;
              padding-bottom: 12px;
              border-bottom: 2px solid #dbe6f5;
              margin-bottom: 12px;
            }

            .print-head span {
              display: block;
              color: #2e63f0;
              font-size: 9px;
              font-weight: 900;
              letter-spacing: .13em;
              text-transform: uppercase;
            }

            .print-head h1 {
              margin: 4px 0 5px;
              color: #10254d;
              font-size: 19px;
              line-height: 1.15;
              font-weight: 850;
              letter-spacing: -0.035em;
            }

            .print-head p {
              margin: 0;
              color: #6079a6;
              font-size: 10px;
              font-weight: 650;
            }

            .print-meta {
              min-width: 180px;
              padding: 10px 12px;
              border: 1px solid #dbe6f5;
              border-radius: 14px;
              background: #f7fbff;
              color: #6079a6;
              font-size: 9px;
              font-weight: 800;
              display: grid;
              gap: 4px;
            }

            .print-meta strong {
              color: #10254d;
              font-size: 18px;
              font-weight: 900;
              letter-spacing: -0.035em;
            }

            .filter-line {
              margin-bottom: 10px;
              display: flex;
              gap: 6px;
              flex-wrap: wrap;
            }

            .filter-line span {
              padding: 5px 8px;
              border: 1px solid #dbe6f5;
              border-radius: 999px;
              background: #f8fbff;
              color: #526d99;
              font-size: 9px;
              font-weight: 800;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }

            thead {
              display: table-header-group;
            }

            th {
              padding: 8px 8px;
              border: 1px solid #dbe6f5;
              background: #f7fbff;
              color: #6f85ad;
              font-size: 8.5px;
              font-weight: 900;
              letter-spacing: .08em;
              text-transform: uppercase;
              text-align: left;
              white-space: nowrap;
            }

            td {
              padding: 8px 8px;
              border: 1px solid #e5edf8;
              vertical-align: top;
              color: #10254d;
              font-weight: 650;
              word-break: break-word;
            }

            td strong {
              display: block;
              font-size: 10px;
              font-weight: 850;
              color: #10254d;
            }

            td small {
              display: block;
              margin-top: 2px;
              color: #6f85ad;
              font-size: 8.7px;
              font-weight: 650;
              line-height: 1.35;
            }

            .col-no { width: 42px; }
            .col-req { width: 78px; }
            .col-date { width: 96px; }
            .col-requester { width: 130px; }
            .col-asset { width: 90px; }
            .col-incident { width: 230px; }
            .col-urgency { width: 76px; }
            .col-assigned { width: 110px; }
            .col-sla { width: 90px; }
            .col-status { width: 82px; }

            .empty {
              margin-top: 20px;
              padding: 18px;
              border: 1px solid #dbe6f5;
              border-radius: 16px;
              background: #f8fbff;
              color: #6079a6;
              font-weight: 800;
              text-align: center;
            }

            .footer {
              margin-top: 12px;
              padding-top: 10px;
              border-top: 1px solid #dbe6f5;
              color: #7b91b6;
              font-size: 9px;
              display: flex;
              justify-content: space-between;
            }
          </style>
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
    hasAdvancedFilter;

  function resetRegistryFilters() {
    setSearchTerm('');
    setFilterStatus('All');
    setFilterPriority('All');
    setFilterAssignedTo('All');
    setAdvancedFilters(emptyAdvancedFilters());
    setShowAdvanced(false);
    setCurrentPage(1);
  }

  const queueItems = [
    { key: 'all' as QueueKey, label: 'All Tickets', sub: 'Complete service queue', count: queueCounts.all, icon: Ticket },
    { key: 'my' as QueueKey, label: 'My Assigned', sub: 'Owned by current agent', count: queueCounts.my, icon: User },
    { key: 'sla-risk' as QueueKey, label: 'SLA Risk', sub: 'Near due or breached', count: queueCounts.slaRisk, icon: ShieldAlert },
    { key: 'unassigned' as QueueKey, label: 'Unassigned', sub: 'Needs ownership', count: queueCounts.unassigned, icon: Users },
    { key: 'awaiting' as QueueKey, label: 'Awaiting', sub: 'New requests', count: queueCounts.awaiting, icon: Clock },
    { key: 'in-progress' as QueueKey, label: 'In Progress', sub: 'Active work', count: queueCounts.inProgress, icon: ArrowRightLeft },
    { key: 'pending-user' as QueueKey, label: 'Pending User', sub: 'Waiting requester', count: queueCounts.pendingUser, icon: User },
    { key: 'pending-vendor' as QueueKey, label: 'Pending Vendor', sub: 'External action', count: queueCounts.pendingVendor, icon: Settings },
    { key: 'on-site' as QueueKey, label: 'On Site', sub: 'Field support', count: queueCounts.onSite, icon: Monitor },
    { key: 'resolved' as QueueKey, label: 'Resolved', sub: 'Completed tickets', count: queueCounts.resolved, icon: CheckCircle2 },
    { key: 'knowledge' as QueueKey, label: 'Knowledge Base', sub: hasLoadedKb ? 'Resolution articles' : 'Loading articles...', count: queueCounts.kb, icon: BookOpen },
  ];

  const kpis = [
    { label: 'Open Tickets', value: queueCounts.open, note: 'support workload', className: 'open', icon: Ticket },
    { label: 'SLA Risk', value: queueCounts.slaRisk, note: 'near due / breached', className: 'risk', icon: ShieldAlert },
    { label: 'Awaiting', value: queueCounts.awaiting, note: 'new request queue', className: 'awaiting', icon: Clock },
    { label: 'In Progress', value: queueCounts.inProgress, note: 'active handling', className: 'progress', icon: ArrowRightLeft },
    { label: 'Resolved', value: queueCounts.resolved, note: 'completed records', className: 'resolved', icon: CheckCircle2 },
    { label: 'Unassigned', value: queueCounts.unassigned, note: 'needs ownership', className: 'unassigned', icon: Users },
  ];

  useEffect(() => {
    document.documentElement.classList.add('ema-settings-page-active');
    document.body.classList.add('ema-settings-page-active');

    return () => {
      document.documentElement.classList.remove('ema-settings-page-active');
      document.body.classList.remove('ema-settings-page-active');
    };
  }, []);

  if (isLoading) {
    return (
      <div className="settings-module-root ema-settings-pro container-fluid p-3 p-xl-4 d-grid place-items-center text-center">
        <Loader2 className="ema-spin" size={28} />
        <strong>Loading Service Desk</strong>
        <span>Loading incident queue...</span>
      </div>
    );
  }

  // Service Desk uses the existing Settings layout/classes.
  return (
    <main className="settings-module-root ema-module-root ema-settings-pro container-fluid p-3 p-xl-4" data-section="service-desk">
      {toast && typeof document !== 'undefined' && createPortal(
        <div className="settings-toast-layer" aria-live="polite" aria-atomic="true">
          <div
            className={cn('settings-toast', `settings-toast-${toast.type}`, `is-${toast.type}`, 'service-desk-toast')}
            role="status"
          >
            <i className="settings-toast-icon">
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
            <button
              type="button"
              className="settings-toast-close"
              onClick={() => setToast(null)}
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        </div>,
        document.body
      )}

      {confirmDialog && typeof document !== 'undefined' && createPortal(
        <main
          data-section="service-desk"
          className="settings-module-root ema-settings-pro service-desk-confirm-portal-root"
        >
          <div
            className="settings-confirm-backdrop open service-desk-confirm-backdrop"
            onClick={(event) => event.stopPropagation()}
          >
          <section
            className={cn('settings-confirm-modal', `is-${confirmDialog.tone || 'danger'}`)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="service-desk-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <AppIconButton
              type="button"
              variant="outline-secondary"
              className="modal-close"
              label="Close confirmation"
              icon={<X size={16} />}
              onClick={closeConfirmDialog}
              disabled={confirmDialog.loading}
            />

            <div className="settings-toast-icon">
              {confirmDialog.tone === 'warning' ? <ShieldAlert size={24} /> : <Trash2 size={24} />}
            </div>

            <span className="section-tag">Confirmation required</span>
            <h2 id="service-desk-confirm-title">{confirmDialog.title}</h2>
            <p>{confirmDialog.message}</p>

            {confirmDialog.meta && <div className="settings-inline-alert">{confirmDialog.meta}</div>}

            {confirmDialog.requiresReason && (
              <label className="form-field service-desk-confirm-reason-field">
                <span>{confirmDialog.reasonLabel || 'Reason'}</span>
                <textarea
                  className="setting-textarea service-desk-confirm-reason-textarea"
                  value={confirmReason}
                  onChange={(event) => setConfirmReason(event.target.value)}
                  disabled={confirmDialog.loading}
                  placeholder={confirmDialog.reasonPlaceholder || 'Enter reason'}
                  rows={4}
                />
                <small className="form-helper-text">
                  Reason is required before this action can continue.
                </small>
              </label>
            )}

            <footer className="content-actions service-desk-row-actions">
              <AppButton
                type="button"
                variant="outline-secondary"
                onClick={closeConfirmDialog}
                disabled={confirmDialog.loading}
              >
                {confirmDialog.cancelLabel || 'Cancel'}
              </AppButton>

              <AppButton
                type="button"
                variant={confirmDialog.tone === 'danger' ? 'danger' : 'primary'}
                onClick={runConfirmAction}
                loading={confirmDialog.loading}
              >
                {confirmDialog.confirmLabel || 'Confirm'}
              </AppButton>
            </footer>
          </section>
        </div>
        </main>,
        document.body
      )}

      <div className="settings-layout d-grid gap-3">
      <aside className="settings-menu ema-panel-surface">
        <div className="panel-head">
          <div>
            <span>SERVICE CENTER</span>
            <strong>Service Desk</strong>
            <small>Ticket queue and support operation</small>
          </div>
        </div>
        <nav className="settings-menu-list" id="serviceDeskMenu" role="tablist" aria-label="Service Desk navigation">
          {queueItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                className={cn('setting-btn', activeQueue === item.key && 'active')}
                onClick={() => {
                  setActiveQueue(item.key);

                  if (item.key === 'knowledge') {
                    setViewMode('kb');
                    void ensureKnowledgeBaseLoaded();
                  } else {
                    setViewMode('list');
                  }
                }}
              >
                <i className="setting-icon">
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

      <section className="settings-content d-grid gap-3">
        <div className="settings-hero ema-panel-surface service-desk-hero">
          <div>
            <span className="eyebrow">INCIDENT COMMAND CENTER</span>
            <h2>Service Desk</h2>
            <p>Manage tickets, assignments, SLA risk and support activity.</p>
          </div>
          <div className="settings-score users-hero-score service-desk-kpi-row service-desk-kpi-force-row">
            {kpis.slice(0, 4).map((kpi) => (
              <div
                className="score-box ema-kpi-card is-compact service-desk-kpi-card"
                data-service-desk-kpi="true"
                key={kpi.label}
              >
                <span>{kpi.label}</span>
                <strong>{kpi.value}</strong>
                <small>{kpi.note}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="content-shell ema-panel-surface roles-content-shell">

        {viewMode === 'list' && (
          <section className="content-panel clean service-desk-registry-panel">
            <header className="content-head service-desk-registry-head">
              <div>
                <span className="eyebrow">Ticket Registry</span>
                <h3>Support Requests</h3>
                <p>Search, filter and manage active service desk tickets in one clean table.</p>
              </div>

              <div className="content-actions service-desk-command-actions service-desk-header-actions">
                <button type="button" className="primary-btn" onClick={openCreateForm}>
                  <Plus size={15} />
                  <span>Create Ticket</span>
                </button>

                <button
                  type="button"
                  className="mini-btn icon-only"
                  aria-label="Refresh"
                  title="Refresh"
                  disabled={isRefreshing}
                  onClick={refreshData}
                >
                  {isRefreshing ? <Loader2 size={15} className="ema-spin" /> : <RefreshCw size={15} />}
                </button>

                <button
                  type="button"
                  className={cn('mini-btn icon-only', showAdvanced && 'edit')}
                  aria-label="Advanced filter"
                  title="Advanced filter"
                  onClick={() => {
                    setShowAdvanced((prev) => !prev);
                    void ensureLookupsLoaded();
                  }}
                >
                  <Filter size={15} />
                </button>

                <button type="button" className="mini-btn icon-only" aria-label="Export CSV" title="Export CSV" onClick={exportCsv}>
                  <Download size={15} />
                </button>

                <button type="button" className="mini-btn icon-only" aria-label="Print ticket table" title="Print ticket table" onClick={printTicketRegistry}>
                  <Printer size={15} />
                </button>
              </div>
            </header>

            <div className="content-toolbar users-toolbar service-desk-commandbar">
              <label className="section-search user-search-inline">
                <Search size={15} />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search request no, requester, asset, incident..."
                />
              </label>

              <div className="service-desk-filter-grid">
                <ServiceDeskSelect
                  className="service-desk-filter-select"
                  value={filterStatus}
                  ariaLabel="Filter tickets by status"
                  placeholder="Status: All"
                  onChange={setFilterStatus}
                  options={[
                    { value: 'All', label: 'Status: All' },
                    ...STATUS_OPTIONS.map((status) => ({ value: status, label: `Status: ${status}` })),
                  ]}
                />

                <ServiceDeskSelect
                  className="service-desk-filter-select"
                  value={filterPriority}
                  ariaLabel="Filter tickets by urgency"
                  placeholder="Urgency: All"
                  onChange={setFilterPriority}
                  options={[
                    { value: 'All', label: 'Urgency: All' },
                    ...PRIORITY_OPTIONS.map((priority) => ({ value: priority, label: `Urgency: ${priority}` })),
                  ]}
                />

                <ServiceDeskSelect
                  className="service-desk-filter-select"
                  value={filterAssignedTo}
                  ariaLabel="Filter tickets by assigned engineer"
                  placeholder="Assignee: All"
                  onOpen={() => void ensureLookupsLoaded()}
                  onChange={setFilterAssignedTo}
                  options={[
                    { value: 'All', label: 'Assignee: All' },
                    { value: '', label: 'Assignee: Unassigned' },
                    ...engineers.map((user) => ({ value: getUserName(user), label: `Assignee: ${getUserName(user)}` })),
                  ]}
                />
              </div>

              <button
                type="button"
                className="soft-btn service-desk-reset-btn"
                disabled={!hasActiveFilters}
                onClick={resetRegistryFilters}
              >
                <X size={14} />
                <span>Reset</span>
              </button>
            </div>

            {showAdvanced && (
              <div className="settings-helper-card">
                <div className="content-head">
                  <i>
                    <Filter size={16} />
                  </i>
                  <div>
                    <strong>Find Incident</strong>
                    <span>Advanced search using fields already supported by the incident record.</span>
                  </div>
                  <AppButton
                    type="button"
                    variant="outline-secondary"
                    size="sm"
                    leftIcon={<X size={14} />}
                    onClick={() => setAdvancedFilters(emptyAdvancedFilters())}
                  >
                    Reset Advanced
                  </AppButton>
                </div>
                <div className="form-grid">
                  <input
                    value={advancedFilters.reqNo}
                    onChange={(e) => setAdvancedFilters((p) => ({ ...p, reqNo: e.target.value }))}
                    placeholder="Req No"
                  />
                  <input
                    value={advancedFilters.requester}
                    onChange={(e) => setAdvancedFilters((p) => ({ ...p, requester: e.target.value }))}
                    placeholder="Requester"
                  />
                  <input
                    value={advancedFilters.incidentTitle}
                    onChange={(e) => setAdvancedFilters((p) => ({ ...p, incidentTitle: e.target.value }))}
                    placeholder="Incident title / description"
                  />
                  <input
                    value={advancedFilters.assetTag}
                    onChange={(e) => setAdvancedFilters((p) => ({ ...p, assetTag: e.target.value }))}
                    placeholder="Asset tag"
                  />
                  <ServiceDeskSelect
                    value={advancedFilters.category}
                    placeholder="All Categories"
                    onChange={(value) => setAdvancedFilters((p) => ({ ...p, category: value, subcategory: '', detail: '' }))}
                    options={[
                      { value: '', label: 'All Categories' },
                      ...categories.map((category) => ({ value: getCategoryName(category), label: getCategoryName(category) })),
                    ]}
                  />
                  <ServiceDeskSelect
                    value={advancedFilters.slaStatus}
                    placeholder="All SLA Status"
                    onChange={(value) => setAdvancedFilters((p) => ({ ...p, slaStatus: value }))}
                    options={['All', 'Overdue', 'Near Due', 'On Track'].map((status) => ({ value: status, label: status }))}
                  />
                  <input
                    type="date"
                    value={advancedFilters.dateFrom}
                    onChange={(e) => setAdvancedFilters((p) => ({ ...p, dateFrom: e.target.value }))}
                  />
                  <input
                    type="date"
                    value={advancedFilters.dateTo}
                    onChange={(e) => setAdvancedFilters((p) => ({ ...p, dateTo: e.target.value }))}
                  />
                </div>

              </div>
            )}

            <div className="content-body">
              {paginatedIncidents.length === 0 ? (
                <div className="settings-empty-state">
                  <div className="setting-icon mx-auto">
                    <Ticket size={26} />
                  </div>
                  <strong>No incident found</strong>
                  <span>
                    There is no ticket for this queue or selected filter.
                    Try All Tickets, reset filter, or create a new request.
                  </span>
                  <div className="content-actions justify-content-center">
                    <button type="button" className="primary-btn" onClick={openCreateForm}>
                      <Plus size={14} />
                      <span>New Ticket</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="user-access-table advanced clean-table service-desk-table-wrap">
                  <div className="user-row head advanced clean-table-row">
                    <div className="user-cell">No</div>
                    <div className="user-cell">
                      <button
                        type="button"
                        className={cn('soft-btn', sortConfig.key === 'id' && 'is-active')}
                        onClick={() => requestSort('id')}
                      >
                        <span>Req No</span>
                        <i>{sortConfig.key === 'id' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</i>
                      </button>
                    </div>
                    <div className="user-cell">
                      <button
                        type="button"
                        className={cn('soft-btn', sortConfig.key === 'createdAt' && 'is-active')}
                        onClick={() => requestSort('createdAt')}
                      >
                        <span>Submitted</span>
                        <i>{sortConfig.key === 'createdAt' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</i>
                      </button>
                    </div>
                    <div className="user-cell">
                      <button
                        type="button"
                        className={cn('soft-btn', sortConfig.key === 'customerName' && 'is-active')}
                        onClick={() => requestSort('customerName')}
                      >
                        <span>Requester</span>
                        <i>{sortConfig.key === 'customerName' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</i>
                      </button>
                    </div>
                    <div className="user-cell">Asset</div>
                    <div className="user-cell">
                      <button
                        type="button"
                        className={cn('soft-btn', sortConfig.key === 'title' && 'is-active')}
                        onClick={() => requestSort('title')}
                      >
                        <span>Incident</span>
                        <i>{sortConfig.key === 'title' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</i>
                      </button>
                    </div>
                    <div className="user-cell">
                      <button
                        type="button"
                        className={cn('soft-btn', sortConfig.key === 'priority' && 'is-active')}
                        onClick={() => requestSort('priority')}
                      >
                        <span>Urgency</span>
                        <i>{sortConfig.key === 'priority' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</i>
                      </button>
                    </div>
                    <div className="user-cell">
                      <button
                        type="button"
                        className={cn('soft-btn', sortConfig.key === 'assignedTo' && 'is-active')}
                        onClick={() => requestSort('assignedTo')}
                      >
                        <span>Assigned</span>
                        <i>{sortConfig.key === 'assignedTo' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</i>
                      </button>
                    </div>
                    <div className="user-cell">
                      <button
                        type="button"
                        className={cn('soft-btn', sortConfig.key === 'slaDue' && 'is-active')}
                        onClick={() => requestSort('slaDue')}
                      >
                        <span>SLA</span>
                        <i>{sortConfig.key === 'slaDue' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</i>
                      </button>
                    </div>
                    <div className="user-cell">
                      <button
                        type="button"
                        className={cn('soft-btn', sortConfig.key === 'status' && 'is-active')}
                        onClick={() => requestSort('status')}
                      >
                        <span>Status</span>
                        <i>{sortConfig.key === 'status' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</i>
                      </button>
                    </div>
                    <div className="user-cell">Action</div>
                  </div>

                  {paginatedIncidents.map((incident, index) => {
                    const runningNo = (currentPage - 1) * itemsPerPage + index + 1;
                    const sla = getSlaMeta(incident, now);
                    const isSelected = getId(incident) === getId(selectedIncident || {});

                    return (
                      <div
                        key={getId(incident)}
                        data-ticket-row="true"
                        className={cn('user-row advanced clean-table-row', isSelected && 'is-selected')}
                        onClick={() => setSelectedIncidentId(getId(incident))}
                      >
                        <div className="user-cell row-number">
                          <span className="row-index-pill">{String(runningNo).padStart(2, '0')}</span>
                        </div>

                        <div className="user-cell">
                          <strong>{getId(incident)}</strong>
                        </div>

                        <div className="user-cell">{normalizeDate(incident.createdAt)}</div>

                        <div className="user-cell">
                          <div className="user-name">
                            <span className="user-mini-avatar">{initialText(incident.customerName || incident.reporterId)}</span>
                            <span>
                              <strong>{incident.customerName || 'N/A'}</strong>
                              <small>{incident.sector || 'No sector'}</small>
                            </span>
                          </div>
                        </div>

                        <div className="user-cell">
                          <span className="muted-cell">
                            <Monitor size={13} />
                            {incident.assetId || '—'}
                          </span>
                        </div>

                        <div className="user-cell role-info-cell">
                          <strong>{incident.title || 'Untitled incident'}</strong>
                          <small>
                            {[incident.category, incident.subcategory, incident.incidentDetail].filter(Boolean).join(' / ') ||
                              incident.description ||
                              'No classification'}
                          </small>
                        </div>

                        <div className="user-cell">
                          <span className={cn('user-pill', priorityClass(incident.priority || 'Medium'))}>
                            {incident.priority || 'Medium'}
                          </span>
                        </div>

                        <div className="user-cell role-info-cell">
                          <strong>{incident.assignedTo || 'Unassigned'}</strong>
                          <small>{incident.assignedLevel || 'No level'}</small>
                        </div>

                        <div className={cn('user-cell role-info-cell', sla.className)}>
                          <strong>{sla.label}</strong>
                          <small>{sla.detail}</small>
                        </div>

                        <div className="user-cell">
                          <span className={cn('user-pill', statusClass(incident.status || 'Awaiting'))}>
                            {incident.status || 'Awaiting'}
                          </span>
                        </div>

                        <div className="user-cell" onClick={(event) => event.stopPropagation()}>
                          <div className="row-actions user-row-action-wrap clean service-desk-row-actions">
                            <button
                              type="button"
                              className="mini-btn icon-only edit"
                              title="Edit ticket"
                              aria-label="Edit ticket"
                              onClick={() => openEditForm(incident)}
                            >
                              <Pencil size={14} />
                            </button>

                            <button
                              type="button"
                              className="mini-btn icon-only delete"
                              title={isDeleteLockedStatus(incident.status) ? 'Delete disabled for closed or resolved tickets' : 'Delete ticket'}
                              aria-label={isDeleteLockedStatus(incident.status) ? 'Delete disabled for closed or resolved tickets' : 'Delete ticket'}
                              disabled={isDeleteLockedStatus(incident.status)}
                              onClick={() => deleteIncident(incident)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <AppPagination
              className="uam-pagination global-style"
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={sortedIncidents.length}
              pageSize={itemsPerPage}
              showPageSize={false}
              onPageChange={setCurrentPage}
            />
          </section>
        )}

        {viewMode === 'kb' && (
          <section className="uam-panel clean service-desk-kb-panel">
            <header className="content-head service-desk-kb-head">
              <div>
                <h2>Knowledge Base</h2>
                <p>Manage and reference previous incident resolutions</p>
              </div>
              <div className="content-actions service-desk-kb-actions">
                {canCreate && (
                  <button
                    type="button"
                    className="primary-btn service-desk-kb-create-btn"
                    onClick={() => {
                      setKbFormData({ id: '', title: '', incidentDetails: '', resolution: '' });
                      setKbFormOpen(true);
                    }}
                  >
                    <Plus size={15} />
                    <span>New Article</span>
                  </button>
                )}
                <button
                  type="button"
                  className="soft-btn service-desk-kb-back-btn"
                  onClick={() => {
                    setViewMode('list');
                    setActiveQueue('all');
                  }}
                >
                  <Ticket size={15} />
                  <span>Ticket Registry</span>
                </button>
              </div>
            </header>

            {!hasLoadedKb && (
              <div className="settings-inline-alert">
                <Loader2 size={14} className="ema-spin" />
                <span>Loading knowledge base...</span>
              </div>
            )}

            <div className="ema-toolbar content-toolbar users-toolbar service-desk-kb-toolbar">
              <label className="section-search user-search-inline service-desk-kb-search">
                <Search size={15} />
                <input
                  value={kbSearch}
                  onChange={(event) => setKbSearch(event.target.value)}
                  placeholder="Search article title..."
                />
              </label>
            </div>

            <div className="summary-row service-desk-kb-summary">
              <span>
                Showing <strong>{filteredKb.length}</strong> knowledge article
              </span>
              <span>Title only. Use eye icon to view details.</span>
            </div>

            <div className="pricing-table-card table-responsive service-desk-kb-table-card">
              <table className="table table-hover align-middle mb-0 service-desk-kb-table">
                <colgroup>
                  <col className="col-kb-no-simple" />
                  <col className="col-kb-title-simple" />
                  <col className="col-kb-actions-simple" />
                </colgroup>

                <thead>
                  <tr>
                    <th>No</th>
                    <th>
                      <button
                        type="button"
                        className="resource-sort-button"
                        onClick={toggleKbTitleSort}
                      >
                        <span>Knowledge Base</span>
                        <i>{kbSortDirection === 'asc' ? '↑' : '↓'}</i>
                      </button>
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredKb.length === 0 && (
                    <tr>
                      <td colSpan={3} className="settings-empty-state">
                        No knowledge base article found.
                      </td>
                    </tr>
                  )}

                  {filteredKb.map((kb, index) => (
                    <tr key={kb.id || kb.title}>
                      <td>
                        <span className="row-index-pill">{index + 1}</span>
                      </td>

                      <td>
                        <div>
                          <strong>{kb.title || 'Untitled article'}</strong>
                        </div>
                      </td>

                      <td>
                        <div className="row-actions user-row-action-wrap clean">
                          <button
                            type="button"
                            className="mini-btn icon-only view"
                            title="View resolution"
                            aria-label="View resolution"
                            onClick={() => setSelectedKbArticle(kb)}
                          >
                            <Eye size={14} />
                          </button>

                          {canEdit && (
                            <button
                              type="button"
                              className="mini-btn icon-only edit"
                              title="Edit article"
                              aria-label="Edit article"
                              onClick={() => {
                                setKbFormData(kb);
                                setKbFormOpen(true);
                              }}
                            >
                              <Pencil size={14} />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              type="button"
                              className="mini-btn icon-only delete"
                              title="Delete article"
                              aria-label="Delete article"
                              onClick={() => deleteKb(kb)}
                            >
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
        <div className="settings-confirm-backdrop open" onClick={() => setSelectedKbArticle(null)}>
          <section className="settings-confirm-modal" onClick={(event) => event.stopPropagation()}>
            <header className="content-head">
              <div>
                <span>Knowledge Article</span>
                <h2>{selectedKbArticle.title || 'Untitled article'}</h2>
                <p>{selectedKbArticle.incidentDetails || 'No incident details provided.'}</p>
              </div>
              <button type="button" onClick={() => setSelectedKbArticle(null)} aria-label="Close knowledge article">
                <X size={18} />
              </button>
            </header>

            <div className="content-body">
              <section>
                <span className="section-tag">Incident Details</span>
                <p>{selectedKbArticle.incidentDetails || 'No incident details provided.'}</p>
              </section>

              <section>
                <span className="section-tag">Resolution</span>
                {splitKnowledgeSteps(selectedKbArticle.resolution).length > 1 ? (
                  <div className="policy-list">
                    {splitKnowledgeSteps(selectedKbArticle.resolution).map((step, index) => (
                      <div className="policy-card" key={`selected-kb-step-${index}`}>
                        <p>{step}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>{selectedKbArticle.resolution || 'No resolution provided.'}</p>
                )}
              </section>
            </div>

            <footer className="content-actions service-desk-row-actions">
              <AppButton
                type="button"
                variant="outline-secondary"
                onClick={() => setSelectedKbArticle(null)}
              >
                Close
              </AppButton>

              {canEdit && (
                <AppButton
                  type="button"
                  variant="primary"
                  leftIcon={<Pencil size={15} />}
                  onClick={() => {
                    setKbFormData(selectedKbArticle);
                    setSelectedKbArticle(null);
                    setKbFormOpen(true);
                  }}
                >
                  Edit Article
                </AppButton>
              )}
            </footer>
          </section>
        </div>
      )}

      {selectedIncident && (
        <aside ref={detailPanelRef} className="side-card">
          <>
            <div className="panel-head">
              <div className="setting-icon">
                <Ticket size={24} />
              </div>
              <div>
                <span>{getId(selectedIncident)}</span>
                <h2>{selectedIncident.title || 'Untitled incident'}</h2>
                <p>{selectedIncident.description || 'No description provided.'}</p>
              </div>
              <AppIconButton
                type="button"
                variant="outline-light"
                className="modal-close"
                label="Close ticket detail"
                icon={<X size={16} />}
                onClick={() => setSelectedIncidentId('')}
              />
            </div>

            <div className="form-grid">
              <div>
                <span>Requester</span>
                <strong>{selectedIncident.customerName || 'N/A'}</strong>
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
            </div>

            <div className="settings-helper-card">
              <strong>Operational Note</strong>
              <p>{selectedIncident.additionalMemo || selectedIncident.remarks || 'Service desk queue ready.'}</p>
            </div>

            <div className="content-actions service-desk-row-actions">
              {canEdit && (
                <button
                  type="button"
                  onClick={() => resolveIncident(selectedIncident)}
                  disabled={isDeleteLockedStatus(selectedIncident.status)}
                  title={isDeleteLockedStatus(selectedIncident.status) ? 'Ticket already closed or resolved' : 'Submit and resolve ticket'}
                >
                  <CheckCircle2 size={15} /> Submit & Resolve
                </button>
              )}
              <button type="button" onClick={() => printTicket(selectedIncident)}>
                <Printer size={15} /> Print Ticket
              </button>
            </div>

            <div className="settings-helper-card">
              <div className="content-head">
                <Clock size={16} />
                <strong>Ticket Timeline</strong>
              </div>

              <div className="summary-row is-active">
                <i />
                <div>
                  <strong>Created</strong>
                  <p>{selectedIncident.title || 'Incident submitted'}</p>
                  <span>{normalizeDateTime(selectedIncident.createdAt)}</span>
                </div>
              </div>

              {selectedIncident.firstResponseAt && (
                <div className="summary-row is-active">
                  <i />
                  <div>
                    <strong>First Response</strong>
                    <p>{selectedIncident.assignedTo || 'Support team'} started handling this ticket.</p>
                    <span>{normalizeDateTime(selectedIncident.firstResponseAt)}</span>
                  </div>
                </div>
              )}

              {selectedIncident.resolvedAt && (
                <div className="summary-row is-active">
                  <i />
                  <div>
                    <strong>Resolved</strong>
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
        <main
          data-section="service-desk"
          className="settings-module-root ema-settings-pro service-desk-modal-portal-root"
        >
          <div className="settings-confirm-backdrop open" aria-modal="true" role="dialog">
          <form className="settings-confirm-modal user-modal service-desk-ticket-modal" onSubmit={saveIncident} onClick={(event) => event.stopPropagation()}>
            <header className="content-head">
              <div>
                <span>{formMode === 'create' ? 'New Incident' : formData.id || 'Edit Incident'}</span>
                <h2>{formMode === 'create' ? 'Create Service Request' : 'Update Service Request'}</h2>
                <p>Lookup data loads only when this form is opened.</p>
              </div>
              <button type="button" onClick={requestCloseForm} aria-label="Cancel ticket form">
                <X size={18} />
              </button>
            </header>

            <div className="content-body service-desk-ticket-form-body">
              {isLoadingLookups && (
                <div className="settings-inline-alert">
                  <Loader2 size={14} className="ema-spin" />
                  <span>Loading creator, category and assignment options...</span>
                </div>
              )}

              <section className="settings-helper-card">
                <h3
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <span>Created By & Asset</span>
                  {isRequesterAssetLocked && (
                    <em
                      style={{
                        padding: '5px 9px',
                        borderRadius: 999,
                        background: '#eef5ff',
                        border: '1px solid #d7e6ff',
                        color: '#2e63f0',
                        fontSize: 10,
                        fontStyle: 'normal',
                        fontWeight: 950,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                      }}
                    >
                      Locked after creation
                    </em>
                  )}
                </h3>
                {isRequesterAssetLocked && (
                  <p
                    style={{
                      margin: '-4px 0 14px',
                      color: '#7188ae',
                      fontSize: 11,
                      fontWeight: 800,
                      lineHeight: 1.45,
                    }}
                  >
                    Created by and asset identity are locked for audit accuracy. Update assignment, status and resolution fields only.
                  </p>
                )}
                <div className="form-grid">
                  <label className="service-desk-created-by-field">
                    <span>Created By</span>
                    <input
                      value={formData.customerName || getCurrentLoginName(currentUser)}
                      readOnly
                      disabled
                      aria-label="Created by current logged-in user"
                    />
                    <small className="service-desk-field-hint">
                      Auto-filled from current login. This field is not manually selectable.
                    </small>
                  </label>

                  <label>
                    <span>Device Type</span>
                    <ServiceDeskSelect
                      value={formData.deviceType || ''}
                      disabled={isRequesterAssetLocked}
                      placeholder="Select Device Type"
                      onChange={(value) => updateFormField('deviceType', value)}
                      options={[
                        { value: '', label: 'Select Device Type', disabled: true },
                        ...DEVICE_TYPES.map((type) => ({ value: type, label: type })),
                      ]}
                    />
                  </label>

                  <label className="form-field">
                    <span>Asset Lookup</span>
                    <div className="price-input-shell service-desk-asset-lookup" ref={assetComboRef}>
                      <div className="price-input-shell service-desk-asset-search">
                        <Search size={15} />
                        <input
                          value={assetSearchTerm}
                          disabled={isRequesterAssetLocked}
                          onChange={(e) => {
                            const value = e.target.value;
                            setAssetSearchTerm(value);
                            updateFormField('assetId', value);
                            openAssetDropdown();
                            void searchAssets(value);
                          }}
                          onFocus={() => {
                            if (isRequesterAssetLocked) return;
                            openAssetDropdown();
                            if (clientAssets.length === 0) {
                              void loadClientAssets('all');
                            }
                          }}
                          placeholder={
                            isRequesterAssetLocked
                              ? 'Locked after ticket creation'
                              : isLoadingAssets
                                ? 'Loading assets...'
                                : 'Search asset tag, username, brand or model'
                          }
                        />
                      </div>
                      <button
                        type="button"
                        className="service-desk-asset-choose-btn"
                        disabled={isRequesterAssetLocked}
                        onClick={() => {
                          if (showAssetDropdown) {
                            setShowAssetDropdown(false);
                            return;
                          }

                          openAssetDropdown();

                          if (clientAssets.length === 0) {
                            void loadClientAssets('all');
                          }
                        }}
                      >
                        Choose asset
                      </button>

                      {showAssetDropdown && !isRequesterAssetLocked && typeof document !== 'undefined' && createPortal(
                        <div
                          ref={assetDropdownPortalRef}
                          className="setting-select-dropdown service-desk-asset-dropdown"
                          style={assetDropdownStyle}
                        >
                          {isLoadingAssets ? (
                            <div className="settings-inline-alert">
                              <Loader2 size={14} className="ema-spin" />
                              Loading assets...
                            </div>
                          ) : filteredClientAssets.length === 0 ? (
                            <div className="settings-inline-alert">No asset found from API. Check /api/assets response or try another keyword.</div>
                          ) : (
                            filteredClientAssets.map((asset) => {
                              const value = getAssetValue(asset);
                              const meta = [asset.customerName || asset.CustomerName, getAssetBrand(asset), getAssetModel(asset), getAssetOS(asset)].filter(Boolean).join(' • ');
                              return (
                                <button key={value || JSON.stringify(asset)} type="button" onClick={() => handleAssetSelect(asset)}>
                                  <strong>{value || 'Unnamed asset'}</strong>
                                  <span>{meta || asset.customerName || 'No asset details'}</span>
                                </button>
                              );
                            })
                          )}
                        </div>,
                        document.body
                      )}
                    </div>

                    {formData.assetId && (formData.assetBrand || formData.assetModel || formData.assetOS) && (
                      <div className="settings-helper-card">
                        {formData.assetBrand && <span>{formData.assetBrand}</span>}
                        {formData.assetModel && <span>{formData.assetModel}</span>}
                        {formData.assetOS && <span>{formData.assetOS}</span>}
                      </div>
                    )}
                  </label>

                  <label>
                    <span>Asset Brand</span>
                    <input
                      value={formData.assetBrand || ''}
                      disabled={isRequesterAssetLocked}
                      onChange={(e) => updateFormField('assetBrand', e.target.value)}
                      placeholder="Brand"
                    />
                  </label>

                  <label>
                    <span>Asset Model</span>
                    <input
                      value={formData.assetModel || ''}
                      disabled={isRequesterAssetLocked}
                      onChange={(e) => updateFormField('assetModel', e.target.value)}
                      placeholder="Model"
                    />
                  </label>

                  <label>
                    <span>Asset OS</span>
                    <input
                      value={formData.assetOS || ''}
                      disabled={isRequesterAssetLocked}
                      onChange={(e) => updateFormField('assetOS', e.target.value)}
                      placeholder="Operating system"
                    />
                  </label>
                </div>
              </section>

              <section className="settings-helper-card">
                <h3>Incident Classification</h3>
                <div className="form-grid">
                  <label>
                    <span>Category</span>
                    <ServiceDeskSelect
                      value={formData.category || ''}
                      placeholder="Select Category"
                      onChange={(value) => setFormData((prev: any) => ({ ...prev, category: value, subcategory: '', incidentDetail: '' }))}
                      options={[
                        { value: '', label: 'Select Category', disabled: true },
                        ...categories.map((category) => ({ value: getCategoryName(category), label: getCategoryName(category) })),
                      ]}
                    />
                  </label>

                  <label>
                    <span>Subcategory</span>
                    <ServiceDeskSelect
                      value={formData.subcategory || ''}
                      placeholder="Select Subcategory"
                      onChange={(value) => setFormData((prev: any) => ({ ...prev, subcategory: value, incidentDetail: '' }))}
                      options={[
                        { value: '', label: 'Select Subcategory', disabled: true },
                        ...subcategoryOptions.map((sub: any) => ({ value: getCategoryName(sub), label: getCategoryName(sub) })),
                      ]}
                    />
                  </label>

                  <label>
                    <span>Problem Detail</span>
                    <ServiceDeskSelect
                      value={formData.incidentDetail || ''}
                      placeholder="Select Detail"
                      onChange={(value) => updateFormField('incidentDetail', value)}
                      options={[
                        { value: '', label: 'Select Detail', disabled: true },
                        ...detailOptions.map((detail: any) => ({ value: getCategoryName(detail), label: getCategoryName(detail) })),
                      ]}
                    />
                  </label>

                  <label>
                    <span>Urgency Level</span>
                    <ServiceDeskSelect
                      value={formData.priority || 'Medium'}
                      placeholder="Select Urgency"
                      onChange={(value) => updateFormField('priority', value)}
                      options={PRIORITY_OPTIONS.map((priority) => ({ value: priority, label: priority }))}
                    />
                  </label>

                  <label className="form-field">
                    <span>
                      Title / Problem Description
                      <em className="service-desk-required-mark">*</em>
                    </span>
                    <input
                      value={formData.title || ''}
                      onChange={(e) => updateFormField('title', e.target.value)}
                      placeholder="Example: Unable to access internal HR portal"
                      required
                    />
                  </label>

                  <label className="form-field">
                    <span>
                      Description
                      <em className="service-desk-required-mark">*</em>
                    </span>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => updateFormField('description', e.target.value)}
                      placeholder="Describe issue, impact, error message and troubleshooting done."
                      required
                    />
                  </label>
                </div>
              </section>

              <section className="settings-helper-card">
                <h3>Assignment & Resolution</h3>
                <div className="form-grid">
                  <label>
                    <span>
                      Status
                      {normalizeStatus(formData.status) === 'rejected' && (
                        <em
                          style={{
                            color: '#dc2626',
                            fontSize: 10,
                            fontStyle: 'normal',
                            fontWeight: 950,
                          }}
                        >
                          Reject reason required
                        </em>
                      )}
                    </span>
                    <ServiceDeskSelect
                      value={formData.status || 'Awaiting'}
                      disabled={formMode === 'create'}
                      placeholder="Select Status"
                      onChange={(value) => updateFormField('status', value)}
                      options={STATUS_OPTIONS.map((status) => ({ value: status, label: status }))}
                    />
                  </label>

                  <label>
                    <span>Assigned Level</span>
                    <ServiceDeskSelect
                      value={formData.assignedLevel || ''}
                      placeholder={isLoadingLookups ? 'Loading support levels...' : 'Select Support Level'}
                      onOpen={() => void ensureLookupsLoaded()}
                      onChange={(value) => updateFormField('assignedLevel', value)}
                      options={[
                        { value: '', label: isLoadingLookups ? 'Loading support levels...' : 'Select Support Level', disabled: true },
                        ...supportRoles.map((role) => ({ value: role.name || role.role, label: role.name || role.role })),
                      ]}
                    />
                  </label>

                  <label>
                    <span>Assigned To</span>
                    <ServiceDeskSelect
                      value={formData.assignedTo || ''}
                      placeholder={formData.assignedLevel ? 'Unassigned' : 'Select support level first'}
                      disabled={!formData.assignedLevel || isLoadingEngineers}
                      onChange={handleAssignedEngineerChange}
                      options={[
                        {
                          value: '',
                          label: formData.assignedLevel
                            ? isLoadingEngineers
                              ? 'Loading engineers...'
                              : 'Unassigned'
                            : 'Select support level first',
                          disabled: !formData.assignedLevel || isLoadingEngineers,
                        },
                        ...assignableEngineers.map((engineer) => {
                          const name = getUserName(engineer);
                          const supportLevel = getPrimarySupportLevel(engineer) || formData.assignedLevel;
                          const leaveLabel = isEngineerOnLeave(engineer) ? 'On leave' : 'Available';

                          return {
                            value: name,
                            label: `${name} · ${supportLevel} · ${leaveLabel}`,
                          };
                        }),
                      ]}
                    />
                    {formData.assignedLevel && !isLoadingEngineers && assignableEngineers.length === 0 && (
                      <small className="service-desk-field-hint">
                        No EMA_User found with role {formData.assignedLevel}.
                      </small>
                    )}
                  </label>

                  <label>
                    <span>SLA Due</span>
                    <input
                      type="datetime-local"
                      value={toDateTimeLocalInput(formData.slaDue)}
                      onChange={(e) => updateFormField('slaDue', fromMalaysiaDateTimeLocalInput(e.target.value))}
                    />
                  </label>

                  <label className="form-field">
                    <span>Root Cause</span>
                    <textarea value={formData.rootCause || ''} onChange={(e) => updateFormField('rootCause', e.target.value)} placeholder="Root cause analysis" />
                  </label>

                  <label className="form-field">
                    <span>Action Plan</span>
                    <textarea value={formData.actionPlan || ''} onChange={(e) => updateFormField('actionPlan', e.target.value)} placeholder="Resolution steps / action plan" />
                  </label>

                  <label
                    className="form-field"
                    style={
                      normalizeStatus(formData.status) === 'rejected'
                        ? {
                            padding: 12,
                            borderRadius: 18,
                            border: getOperationalReason(formData) ? '1px solid #fecaca' : '1px solid #ef4444',
                            background: getOperationalReason(formData)
                              ? 'linear-gradient(180deg, #fff7f7 0%, #ffffff 100%)'
                              : 'linear-gradient(180deg, #fff1f2 0%, #ffffff 100%)',
                            boxShadow: getOperationalReason(formData)
                              ? '0 10px 24px rgba(239, 68, 68, 0.08)'
                              : '0 0 0 4px rgba(239, 68, 68, 0.10), 0 14px 30px rgba(239, 68, 68, 0.12)',
                          }
                        : undefined
                    }
                  >
                    <span
                      style={
                        normalizeStatus(formData.status) === 'rejected'
                          ? {
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 10,
                              color: '#b91c1c',
                            }
                          : undefined
                      }
                    >
                      {normalizeStatus(formData.status) === 'rejected'
                        ? 'Reject Reason / Remarks *'
                        : 'Additional Memo / Remarks'}

                      {normalizeStatus(formData.status) === 'rejected' && (
                        <em
                          style={{
                            color: '#dc2626',
                            fontSize: 10,
                            fontStyle: 'normal',
                            fontWeight: 950,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                          }}
                        >
                          Mandatory
                        </em>
                      )}
                    </span>

                    <textarea
                      ref={rejectReasonRef}
                      aria-required={normalizeStatus(formData.status) === 'rejected'}
                      aria-invalid={normalizeStatus(formData.status) === 'rejected' && !getOperationalReason(formData)}
                      value={formData.additionalMemo || formData.remarks || ''}
                      onChange={(e) => {
                        updateFormField('additionalMemo', e.target.value);
                        updateFormField('remarks', e.target.value);
                      }}
                      placeholder={
                        normalizeStatus(formData.status) === 'rejected'
                          ? 'Required: explain why this ticket is rejected'
                          : 'Internal note or requester remarks'
                      }
                      style={
                        normalizeStatus(formData.status) === 'rejected' && !getOperationalReason(formData)
                          ? {
                              borderColor: '#ef4444',
                              boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.12)',
                            }
                          : undefined
                      }
                    />

                    {normalizeStatus(formData.status) === 'rejected' && (
                      <small
                        style={{
                          marginTop: 8,
                          display: 'block',
                          color: getOperationalReason(formData) ? '#15803d' : '#dc2626',
                          fontSize: 11,
                          fontWeight: 850,
                        }}
                      >
                        {getOperationalReason(formData)
                          ? 'Reject reason captured.'
                          : 'This field is required before a ticket can be saved as Rejected.'}
                      </small>
                    )}
                  </label>
                </div>
              </section>
            </div>

            <footer className="content-actions service-desk-row-actions">
              <AppButton
                type="button"
                variant="outline-secondary"
                onClick={requestCloseForm}
              >
                Cancel
              </AppButton>

              {formMode === 'edit' && canEdit && (
                <AppButton
                  type="button"
                  variant="warning"
                  onClick={() => resolveIncident(formData)}
                  disabled={isSaving || isDeleteLockedStatus(formData.status)}
                  title={isDeleteLockedStatus(formData.status) ? 'Ticket already closed or resolved' : 'Submit and resolve ticket'}
                >
                  Submit & Resolve
                </AppButton>
              )}

              <AppButton
                type="submit"
                variant="primary"
                loading={isSaving}
                leftIcon={<Send size={16} />}
              >
                {formMode === 'create' ? 'Submit Ticket' : 'Update Ticket'}
              </AppButton>
            </footer>
          </form>
        </div>
        </main>,
        document.body
      )}

      {kbFormOpen && (
        <div className="settings-confirm-backdrop open" onClick={() => setKbFormOpen(false)}>
          <form className="settings-confirm-modal user-modal" onSubmit={saveKb} onClick={(event) => event.stopPropagation()}>
            <header className="content-head">
              <div>
                <span>Knowledge Base</span>
                <h2>{kbFormData.id ? 'Edit Resolution Article' : 'New Resolution Article'}</h2>
                <p>Knowledge base records use the existing KnowledgeBaseService API.</p>
              </div>
              <button type="button" onClick={() => setKbFormOpen(false)}>
                <X size={18} />
              </button>
            </header>

            <div className="content-body">
              <section className="settings-helper-card">
                <div className="form-grid single">
                  <label>
                    <span>Title</span>
                    <input value={kbFormData.title || ''} onChange={(e) => setKbFormData((prev: any) => ({ ...prev, title: e.target.value }))} />
                  </label>
                  <label>
                    <span>Incident Details</span>
                    <textarea
                      value={kbFormData.incidentDetails || ''}
                      onChange={(e) => setKbFormData((prev: any) => ({ ...prev, incidentDetails: e.target.value }))}
                    />
                  </label>
                  <label>
                    <span>Resolution</span>
                    <textarea value={kbFormData.resolution || ''} onChange={(e) => setKbFormData((prev: any) => ({ ...prev, resolution: e.target.value }))} />
                  </label>
                </div>
              </section>
            </div>

            <footer className="content-actions service-desk-row-actions">
              <AppButton
                type="button"
                variant="outline-secondary"
                onClick={() => setKbFormOpen(false)}
              >
                Cancel
              </AppButton>

              <AppButton
                type="submit"
                variant="primary"
                loading={isSaving}
                leftIcon={<Send size={16} />}
              >
                Save Article
              </AppButton>
            </footer>
          </form>
        </div>
      )}
    </main>
  );
}
