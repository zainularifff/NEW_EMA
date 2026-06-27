import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  Clock3,
  DollarSign,
  FileText,
  Grid3X3,
  
  LockKeyhole,ShieldCheck,
  SlidersHorizontal,
  TicketCheck,
  UserCog,
  UsersRound} from "lucide-react";
import NotificationChannelsSettings from "../components/settings/NotificationChannelsSettings";
import SoftwarePolicySettings from "../components/settings/SoftwarePolicySettings";
import EmaModal from "../components/common/EmaModal";
import EmaConfirmModal from "../components/common/EmaConfirmModal";
import { useEmaToast } from "../components/common/EmaToastProvider";
import {
  accessControls as settingsAccessControls,
  auditLogs as settingsAuditLogs,
  devicePricing as settingsDevicePricing,
  incidentSettings as settingsIncidentConfig,
  moduleAccess as settingsModuleAccess,
  pcAgingRule as settingsPcAgingRule,
  resourcePlanning as settingsResourcePlanning,
  settingsRoles,
  settingsUsers} from "../services/settingsService";

type SectionKey = "roles" | "users" | "modules" | "access" | "incident" | "audit" | "pricing" | "aging" | "policy" | "risk" | "resources" | "notifications" | "softwarePolicy";
type RoleStatus = "Active" | "Review" | "Locked" | "Inactive";
type ModalMode = "add" | "edit" | "delete";
type ToastTone = "success" | "info" | "warning" | "error";

type SettingsToastState = {
  id: number;
  tone: ToastTone;
  title: string;
  message: string;
} | null;


type ResourceEngineer = {
  id?: number | string;
  userID?: number | string;
  UserID?: number | string;
  userId?: number | string;
  UserId?: number | string;
  name?: string;
  username?: string;
  email?: string;
  role?: string;
  roleName?: string;
  RoleName?: string;
  roles?: string[];
  supportLevel?: string;
  department?: string;
  Department?: string;
  isOnLeave?: boolean;
  currentStatus?: string;
};

type ResourceSchedule = {
  Id?: number;
  id?: number;
  UserID?: number;
  UserId?: number;
  userID?: number;
  EngineerName?: string;
  engineerName?: string;
  name?: string;
  EngineerRole?: string;
  role?: string;
  Department?: string;
  department?: string;
  StartDate?: string;
  EndDate?: string;
  Status?: string;
  status?: string;
  Remarks?: string;
  remarks?: string;
  CreatedAt?: string | null;
  createdAt?: string | null;
  UpdatedAt?: string | null;
  updatedAt?: string | null;
  IsActive?: boolean;
  isActive?: boolean;
};

type ResourceScheduleForm = {
  UserID: string;
  StartDate: string;
  EndDate: string;
  Status: string;
  Remarks: string;
};

const RESOURCE_EMPTY_FORM: ResourceScheduleForm = {
  UserID: "",
  StartDate: "",
  EndDate: "",
  Status: "On Leave",
  Remarks: ""};

function getResourceScheduleId(row: ResourceSchedule) {
  return Number(row.Id ?? row.id ?? 0);
}

function getResourceScheduleUserId(row: ResourceSchedule) {
  return String(row.UserID ?? row.UserId ?? row.userID ?? "");
}

function getResourceEngineerUserId(row: ResourceEngineer) {
  return String(row.userID ?? row.UserID ?? row.userId ?? row.UserId ?? row.id ?? "");
}

function getResourceEngineerName(row: ResourceEngineer) {
  return String(row.name || row.username || row.email || "").trim();
}

function getResourceEngineerRole(row: ResourceEngineer) {
  const roles = Array.isArray(row.roles) ? row.roles : [];
  return String(row.supportLevel || row.roleName || row.RoleName || row.role || roles[0] || "Support").trim();
}

function getResourceEngineerDepartment(row: ResourceEngineer) {
  return String(row.department || row.Department || "").trim();
}

function getResourceScheduleName(row: ResourceSchedule) {
  return String(row.EngineerName || row.engineerName || row.name || "").trim();
}

function getResourceScheduleRole(row: ResourceSchedule) {
  return String(row.EngineerRole || row.role || "").trim();
}

function getResourceScheduleDepartment(row: ResourceSchedule) {
  return String(row.Department || row.department || "").trim();
}

function getResourceScheduleStatus(row: ResourceSchedule) {
  return String(row.Status || row.status || "On Leave").trim();
}

function getResourceScheduleRemarks(row: ResourceSchedule) {
  return String(row.Remarks || row.remarks || "").trim();
}

function isResourceSupportEngineer(row: ResourceEngineer) {
  const roleText = [
    row.roleName,
    row.RoleName,
    row.role,
    row.supportLevel,
    ...(Array.isArray(row.roles) ? row.roles : [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const statusText = [
    row.status,
    row.Status,
    row.currentStatus
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const explicitInactive =
    statusText.includes("inactive") ||
    statusText.includes("disabled") ||
    statusText.includes("locked") ||
    statusText.includes("deleted") ||
    row.isActive === false ||
    row.IsActive === false ||
    row.active === false ||
    row.isActive === 0 ||
    row.IsActive === 0 ||
    row.active === 0 ||
    row.isDeleted === true ||
    row.IsDeleted === true ||
    row.isDeleted === 1 ||
    row.IsDeleted === 1;

  if (explicitInactive) return false;

  const supportRoles = [
    "support",
    "l1 support",
    "l2 support",
    "service desk",
    "it operation",
    "it operations",
    "it operation manager",
    "it operations manager"
  ];

  return supportRoles.some((role) => roleText.includes(role));
}


type SectionItem = {
  key: SectionKey;
  title: string;
  desc: string;
  tag: string;
  icon: IconName;
  count: number;
  scoreOne: string;
  scoreTwo: string;
  subtitle: string;
};

type IconName = "role" | "user" | "matrix" | "shield" | "ticket" | "audit" | "price" | "aging" | "sliders" | "risk" | "calendar" | "lock" | "guard";

type UserAccess = {
  id?: number | string;
  userID?: number | string;
  username?: string;
  name: string;
  fullName?: string;
  email: string;
  role: string;
  roles?: string[];
  roleName?: string;
  status: RoleStatus;
  scope: string;
  accessScope?: string;
  department?: string;
  position?: string;
  phoneNo?: string;
  isActive?: boolean;
  requireMFA?: boolean;
  mfa?: boolean;
  accountLocked?: boolean;
  lockReason?: string;
  accessStartDate?: string | null;
  accessEndDate?: string | null;
  lastLoginAt?: string | null;
  passwordChangedAt?: string | null;
  password?: string;
  confirmPassword?: string;
  loginFailCount?: number;
  remarks?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type UserApiRow = Partial<UserAccess> & {
  id?: number | string;
  userID?: number | string;
  UserID?: number | string;
  Username?: string;
  FullName?: string;
  Email?: string;
  RoleName?: string;
  AccessScope?: string;
  Status?: string;
  Department?: string;
  Position?: string;
  PhoneNo?: string;
  RequireMFA?: boolean | number;
  AccountLocked?: boolean | number;
  LockReason?: string;
  AccessStartDate?: string | null;
  AccessEndDate?: string | null;
  LastLoginAt?: string | null;
  PasswordChangedAt?: string | null;
  LoginFailCount?: number;
  Remarks?: string;
  CreatedAt?: string | null;
  UpdatedAt?: string | null;
};

type UsersApiResponse = {
  success?: boolean;
  message?: string;
  data?: UserApiRow[];
};

type AccessRole = {
  id?: number | string;
  roleID?: number | string;
  roleKey: string;
  name: string;
  description: string;
  type: string;
  defaultAccess: string;
  approvalRequired: boolean;
  status: RoleStatus;
  isSystemRole?: boolean;
  assignedUsers?: number;
  permissions?: Record<string, unknown>;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type RoleApiRow = Partial<AccessRole> & {
  RoleID?: number | string;
  RoleKey?: string;
  RoleName?: string;
  Name?: string;
  Description?: string;
  RoleType?: string;
  DefaultAccess?: string;
  ApprovalRequired?: boolean | number;
  Status?: string;
  IsSystemRole?: boolean | number;
  AssignedUsers?: number;
  Permissions?: Record<string, unknown> | string;
  CreatedAt?: string | null;
  UpdatedAt?: string | null;
};

type RolesApiResponse = {
  success?: boolean;
  message?: string;
  data?: RoleApiRow[] | RoleApiRow;
};

type ModuleRole = {
  key: string;
  name: string;
  type: string;
  desc: string;
  defaultAccess: string;
  approval: string;
};

type ModuleAccess = {
  module: string;
  access: number[];
};

type ModuleControlModule = {
  id?: number | string;
  moduleID?: number | string;
  parentModuleID?: number | string | null;
  moduleKey: string;
  moduleName: string;
  description: string;
  category?: string;
  routePath?: string;
  isActive?: boolean;
  sortOrder?: number;
};

type ModulePermission = {
  roleID: number | string;
  moduleID: number | string;
  canView: boolean;
};

type ModuleAccessApiResponse = {
  success?: boolean;
  message?: string;
  data?: {
    roles?: RoleApiRow[];
    modules?: Record<string, unknown>[];
    permissions?: Record<string, unknown>[];
  };
};


type AccessPolicy = {
  id?: number | string;
  controlID?: number | string;
  policyKey: string;
  name: string;
  description: string;
  scope: string;
  enforcement: string;
  reviewCycle: string;
  status: "Active" | "Inactive";
  isSystemPolicy?: boolean;
  sortOrder?: number;
  updatedAt?: string | null;
};

type AccessPolicyApiRow = Partial<AccessPolicy> & {
  ControlID?: number | string;
  PolicyKey?: string;
  PolicyName?: string;
  Description?: string;
  Scope?: string;
  Enforcement?: string;
  ReviewCycle?: string;
  Status?: string;
  IsSystemPolicy?: boolean | number;
  SortOrder?: number;
  UpdatedAt?: string | null;
};

type AccessPoliciesApiResponse = {
  success?: boolean;
  message?: string;
  data?: AccessPolicyApiRow[] | AccessPolicyApiRow;
};

type AuditDateFilter = "all" | "today" | "7d" | "30d";

type AuditLog = {
  id?: number | string;
  timestamp: string;
  user: string;
  module: string;
  action: string;
  severity: string;
  details?: string;
};

type AuditLogApiRow = Partial<AuditLog> & {
  LogID?: number | string;
  CreatedAt?: string;
  UserName?: string;
  Module?: string;
  Action?: string;
  Severity?: string;
  Details?: string;
};

type AuditLogsApiResponse = {
  success?: boolean;
  message?: string;
  data?: AuditLogApiRow[];
  totalRecords?: number;
  totalPages?: number;
  page?: number;
  limit?: number;
};

type PricingRow = {
  id: string;
  PricingID?: number | null;
  Category: string;
  Brand: string;
  Model: string;
  Price: number;
  IsExcluded: boolean;
};

type PricingPayloadRow = {
  PricingID?: number | null;
  Category?: string;
  category?: string;
  Brand?: string;
  brand?: string;
  Model?: string;
  model?: string;
  Price?: number | string;
  price?: number | string;
  IsExcluded?: boolean | number;
  isExcluded?: boolean | number;
};

type PricingContentProps = {
  search: string;
  rows: PricingRow[];
  categoryOptions: string[];
  brandOptionsByCategory: Record<string, string[]>;
  modelOptionsByKey: Record<string, string[]>;
  loading: boolean;
  saving: boolean;
  savingRowId: string;
  error: string;
  onAdd: () => void;
  onChange: (id: string, patch: Partial<PricingRow>) => void;
  onSaveRow: (id: string) => void;
  onRequestDelete: (row: PricingRow) => void;
};


type PcAgingRule = {
  enabled: boolean;
  ageSource: string;
  healthyMaxYears: number;
  monitorMaxYears: number;
  agingMinYears: number;
  includeUnknownAge: boolean;
  replacementWindowMonths: number;
  notes: string;
};

type PcAgingApiResponse = {
  success?: boolean;
  message?: string;
  data?: {
    settingKey?: string;
    rule?: Partial<PcAgingRule>;
    updatedAt?: string | null;
  };
};

type SlaConfigRow = {
  id: number | string;
  priority: "P1" | "P2" | "P3" | "P4" | string;
  label: string;
  responseTimeMin: number;
  resolutionTimeHrs: number;
  escalationPolicy: string;
  isActive?: boolean;
};

type WorkingHourRow = {
  id: string;
  day: string;
  enabled: boolean;
  start: string;
  end: string;
  isRestDay?: boolean;
  sortOrder?: number;
};


type IncidentDetailSetupRow = {
  id: number | string;
  name: string;
  sortOrder?: number;
  isActive?: boolean;
};

type IncidentSubcategorySetupRow = {
  id: number | string;
  name: string;
  sortOrder?: number;
  isActive?: boolean;
  details: IncidentDetailSetupRow[];
};

type IncidentCategorySetupRow = {
  id: number | string;
  name: string;
  sortOrder?: number;
  isActive?: boolean;
  subcategories: IncidentSubcategorySetupRow[];
};

type IncidentConfigDeleteTarget =
  | { kind: "category"; category: IncidentCategorySetupRow }
  | { kind: "subcategory"; categoryId: number | string; subcategory: IncidentSubcategorySetupRow }
  | { kind: "detail"; categoryId: number | string; subcategoryId: number | string; detail: IncidentDetailSetupRow };

type ResourceDeleteTarget = { row: ResourceSchedule; scheduleId: number; engineerName: string };

type IncidentConfigMeta = {
  eyebrow: string;
  title: string;
  description: string;
  scoreOneLabel: string;
  scoreOne: string;
  scoreOneCaption: string;
  scoreTwoLabel: string;
  scoreTwo: string;
  scoreTwoCaption: string;
  commandTitle: string;
  commandDescription: string;
  saveLabel: string;
};

type IncidentConfigTab = "sla" | "workingHours" | "categories";

type IncidentConfigContentProps = {
  activeTab: IncidentConfigTab;
  meta: IncidentConfigMeta;
  slaRows: SlaConfigRow[];
  workingHours: WorkingHourRow[];
  categories: IncidentCategorySetupRow[];
  selectedCategoryId: string;
  selectedSubcategoryId: string;
  newCategoryName: string;
  newSubcategoryName: string;
  newDetailName: string;
  categorySavingKey: string;
  loading: boolean;
  saving: boolean;
  error: string;
  onTabChange: (tab: IncidentConfigTab) => void;
  onReload: () => void;
  onSlaChange: (id: number | string, patch: Partial<SlaConfigRow>) => void;
  onWorkingHourChange: (id: string, patch: Partial<WorkingHourRow>) => void;
  onSelectCategory: (id: string) => void;
  onSelectSubcategory: (id: string) => void;
  onNewCategoryNameChange: (value: string) => void;
  onNewSubcategoryNameChange: (value: string) => void;
  onNewDetailNameChange: (value: string) => void;
  onCategoryNameChange: (id: number | string, value: string) => void;
  onSubcategoryNameChange: (categoryId: number | string, subcategoryId: number | string, value: string) => void;
  onDetailNameChange: (categoryId: number | string, subcategoryId: number | string, detailId: number | string, value: string) => void;
  onAddCategory: () => void;
  onUpdateCategory: (category: IncidentCategorySetupRow) => void;
  onDeactivateCategory: (category: IncidentCategorySetupRow) => void;
  onDeleteCategory: (category: IncidentCategorySetupRow) => void;
  onAddSubcategory: () => void;
  onUpdateSubcategory: (categoryId: number | string, subcategory: IncidentSubcategorySetupRow) => void;
  onDeactivateSubcategory: (categoryId: number | string, subcategory: IncidentSubcategorySetupRow) => void;
  onDeleteSubcategory: (categoryId: number | string, subcategory: IncidentSubcategorySetupRow) => void;
  onAddDetail: () => void;
  onUpdateDetail: (categoryId: number | string, subcategoryId: number | string, detail: IncidentDetailSetupRow) => void;
  onDeactivateDetail: (categoryId: number | string, subcategoryId: number | string, detail: IncidentDetailSetupRow) => void;
  onDeleteDetail: (categoryId: number | string, subcategoryId: number | string, detail: IncidentDetailSetupRow) => void;
  onSave: () => void;
};

type AgingContentProps = {
  rule: PcAgingRule;
  loading: boolean;
  saving: boolean;
  error: string;
  onChange: (patch: Partial<PcAgingRule>) => void;
  onReload: () => void;
  onSave: () => void;
  onReset: () => void;
};

type ManagementPolicyValues = Record<string, number>;

type ManagementPolicyProfile = {
  profileID?: number | string;
  profileKey?: string;
  profileName?: string;
  scopeType?: string;
  scopeKey?: string;
  isDefault?: boolean;
  isActive?: boolean;
  updatedAt?: string | null;
};

type ManagementPolicyApiResponse = {
  success?: boolean;
  message?: string;
  data?: {
    profile?: ManagementPolicyProfile;
    values?: ManagementPolicyValues;
    updatedAt?: string | null;
  };
};

type ManagementPolicyField = {
  key: string;
  group: string;
  label: string;
  description: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  displayScale?: number;
};

type ManagementPolicyContentProps = {
  values: ManagementPolicyValues;
  profile: ManagementPolicyProfile | null;
  loading: boolean;
  saving: boolean;
  error: string;
  onChange: (key: string, value: number) => void;
  onReload: () => void;
  onReset: () => void;
  onSave: () => void;
};


const DEFAULT_SLA_CONFIGS: SlaConfigRow[] = [
  { id: 1, priority: "P1", label: "Critical", responseTimeMin: 15, resolutionTimeHrs: 4, escalationPolicy: "Immediate escalation to L2/L3 support and IT manager." },
  { id: 2, priority: "P2", label: "High", responseTimeMin: 30, resolutionTimeHrs: 8, escalationPolicy: "Escalate to L2 support if no progress within response target." },
  { id: 3, priority: "P3", label: "Medium", responseTimeMin: 60, resolutionTimeHrs: 24, escalationPolicy: "Review during operational follow-up and escalate when required." },
  { id: 4, priority: "P4", label: "Low", responseTimeMin: 120, resolutionTimeHrs: 48, escalationPolicy: "Handle during normal support queue review." }];

const DEFAULT_WORKING_HOURS: WorkingHourRow[] = [
  { id: "Monday", day: "Monday", enabled: true, start: "09:00", end: "18:00", sortOrder: 1 },
  { id: "Tuesday", day: "Tuesday", enabled: true, start: "09:00", end: "18:00", sortOrder: 2 },
  { id: "Wednesday", day: "Wednesday", enabled: true, start: "09:00", end: "18:00", sortOrder: 3 },
  { id: "Thursday", day: "Thursday", enabled: true, start: "09:00", end: "18:00", sortOrder: 4 },
  { id: "Friday", day: "Friday", enabled: true, start: "09:00", end: "18:00", sortOrder: 5 },
  { id: "Saturday", day: "Saturday", enabled: false, start: "09:00", end: "18:00", sortOrder: 6 },
  { id: "Sunday", day: "Sunday", enabled: false, start: "09:00", end: "18:00", sortOrder: 7 }];

const sections: Record<SectionKey, SectionItem> = {
  roles: {
    key: "roles",
    title: "Role Based Control",
    desc: "Manage standard permission groups for management, operation, support and audit users.",
    tag: "Access Governance",
    icon: "role",
    count: 5,
    scoreOne: "5",
    scoreTwo: "32",
    subtitle: "Permission groups"},
  users: {
    key: "users",
    title: "User Access Management",
    desc: "Add new users, update existing user access, delete access and control account status.",
    tag: "User Access CRUD",
    icon: "access",
    count: 6,
    scoreOne: "6",
    scoreTwo: "3",
    subtitle: "User accounts"},
  modules: {
    key: "modules",
    title: "Module Control by Role",
    desc: "Control module access for each role across dashboard, EMA, service desk, report and setting areas.",
    tag: "Module Governance",
    icon: "matrix",
    count: 8,
    scoreOne: "8",
    scoreTwo: "5",
    subtitle: "Modules"},
  access: {
    key: "access",
    title: "Access Control",
    desc: "Define login policy, MFA, session timeout, IP restrictions and approval workflow.",
    tag: "Security Control",
    icon: "access",
    count: 6,
    scoreOne: "6",
    scoreTwo: "2FA",
    subtitle: "Policies"},
  incident: {
    key: "incident",
    title: "Incident Config",
    desc: "Configure Service Desk SLA rules and working hours used to calculate incident due dates.",
    tag: "Service Desk Config",
    icon: "matrix",
    count: 2,
    scoreOne: "4",
    scoreTwo: "7",
    subtitle: "SLA rules"},
  audit: {
    key: "audit",
    title: "Audit Log",
    desc: "Track role changes, login activities, setting changes, report generation and admin actions.",
    tag: "Audit Trail",
    icon: "audit",
    count: 128,
    scoreOne: "128",
    scoreTwo: "12",
    subtitle: "Events"},
  pricing: {
    key: "pricing",
    title: "Device Pricing",
    desc: "Set device pricing assumptions used for cost impact, asset replacement and risk-driven costing.",
    tag: "Cost Configuration",
    icon: "price",
    count: 4,
    scoreOne: "MYR",
    scoreTwo: "4",
    subtitle: "Pricing groups"},
  aging: {
    key: "aging",
    title: "Aging PC Rule",
    desc: "Define how many years before a device is classified as standard, aging, critical or replacement candidate.",
    tag: "Lifecycle Rule",
    icon: "aging",
    count: 5,
    scoreOne: "5",
    scoreTwo: "7",
    subtitle: "Years threshold"},
  softwarePolicy: {
    key: "softwarePolicy",
    title: "Software Policy",
    desc: "Register software classification, license count, expiry period and usage policy rules.",
    tag: "SOFTWARE GOVERNANCE",
    icon: "sliders",
    count: 0,
    scoreOne: "Legal",
    scoreTwo: "Expiry",
    subtitle: "Policy Rules"
  },
  policy: {
    key: "policy",
    title: "Management Policy",
    desc: "Configure dashboard risk, exposure, saving and evidence assumptions by policy instead of hardcoded backend values.",
    tag: "Dashboard Policy",
    icon: "risk",
    count: 24,
    scoreOne: "24",
    scoreTwo: "Global",
    subtitle: "Policy rules"},
  risk: {
    key: "risk",
    title: "Risk Identifier & Level",
    desc: "Configure risk identifiers, scoring rules and level boundaries for dashboard and report output.",
    tag: "Risk Engine",
    icon: "risk",
    count: 6,
    scoreOne: "6",
    scoreTwo: "80+",
    subtitle: "Risk rules"},
  notifications: {
      title: "Notification Channels",
      subtitle: "Notification",
      desc: "Manage system notification channels and delivery templates.",
      tag: "Communication Control",
      icon: "notifications"
    },

  resources: {
    key: "resources",
    title: "Resource Planning",
    desc: "Plan engineer leave and keep Service Desk assignment transparent by using EMA user roles only.",
    tag: "Engineer Planning",
    icon: "access",
    count: 3,
    scoreOne: "0",
    scoreTwo: "0",
    subtitle: "Leave schedules"}};

const sectionOrder: SectionKey[] = ["roles", "users", "modules", "access", "incident", "audit", "pricing", "aging", "policy", "softwarePolicy", "notifications", "resources"];

const emaMenuGroups: Array<{ label: string; keys: SectionKey[] }> = [
  { label: "Access & Roles", keys: ["roles", "users", "modules", "access"] },
  { label: "System Configuration", keys: ["incident", "audit", "pricing", "aging"] },
  { label: "Policy & Audit", keys: ["policy", "softwarePolicy", "notifications", "resources"] }
].map((group) => ({
  ...group,
  keys: group.keys.filter((key) => sectionOrder.includes(key))
}));
// const sectionOrder: SectionKey[] = ["roles", "users", "modules", "access", "incident", "audit", "pricing", "aging", "policy", "risk", "resources"];

const defaultAccessRoles: AccessRole[] = [
  { roleKey: "system_administrator", name: "System Administrator", description: "Full configuration access including roles, settings, pricing and risk rules.", type: "Administrator", defaultAccess: "Full Access", approvalRequired: true, status: "Active", assignedUsers: 0 },
  { roleKey: "it_manager", name: "IT Manager", description: "Management dashboard, report approval and operational oversight.", type: "Management", defaultAccess: "Management Access", approvalRequired: true, status: "Active", assignedUsers: 0 },
  { roleKey: "it_operations", name: "IT Operations", description: "Endpoint monitoring, device registry and action queue operation.", type: "Operation", defaultAccess: "Operational Access", approvalRequired: false, status: "Active", assignedUsers: 0 },
  { roleKey: "service_desk", name: "Service Desk", description: "Ticket handling, remote session support and operational worklist.", type: "Support", defaultAccess: "Operational Access", approvalRequired: false, status: "Review", assignedUsers: 0 },
  { roleKey: "auditor_viewer", name: "Auditor / Viewer", description: "Read-only access for reports, audit log and compliance review.", type: "Audit / Viewer", defaultAccess: "Read Only", approvalRequired: true, status: "Active", assignedUsers: 0 }];

const USER_ROLE_OPTIONS = defaultAccessRoles.map((role) => role.name);

function splitUserRoles(value?: string | string[] | null): string[] {
  if (Array.isArray(value)) {
    return value.map((role) => String(role).trim()).filter(Boolean);
  }

  return String(value || "")
    .split(/[,|;]/)
    .map((role) => role.trim())
    .filter(Boolean);
}

function normalizeUserRoles(value?: string | string[] | null): string[] {
  return Array.from(new Set(splitUserRoles(value)));
}

function joinUserRoles(roles?: string[] | string | null): string {
  return normalizeUserRoles(roles).join(", ");
}

function hasUserRole(user: UserAccess, role: string): boolean {
  return normalizeUserRoles(user.roles || user.role || user.roleName).includes(role);
}

function boolFromRoleApi(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") return ["true", "1", "yes", "y", "on"].includes(value.toLowerCase());
  return fallback;
}

function normalizeRoleStatus(value: unknown): RoleStatus {
  const text = String(value || "Active").trim().toLowerCase();
  return text === "inactive" ? "Inactive" : "Active";
}

function normalizeAccessRole(row: RoleApiRow): AccessRole {
  const name = String(row.name ?? row.RoleName ?? row.Name ?? "New Role").trim() || "New Role";
  const permissions = typeof row.permissions === "string" || typeof row.Permissions === "string"
    ? {}
    : (row.permissions ?? row.Permissions ?? {}) as Record<string, unknown>;

  return {
    id: row.id ?? row.RoleID ?? row.roleID,
    roleID: row.roleID ?? row.RoleID ?? row.id,
    roleKey: String(row.roleKey ?? row.RoleKey ?? name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")).trim(),
    name,
    description: String(row.description ?? row.Description ?? "").trim(),
    type: String(row.type ?? row.RoleType ?? "Custom").trim() || "Custom",
    defaultAccess: String(row.defaultAccess ?? row.DefaultAccess ?? "Read Only").trim() || "Read Only",
    approvalRequired: boolFromRoleApi(row.approvalRequired ?? row.ApprovalRequired, false),
    status: normalizeRoleStatus(row.status ?? row.Status),
    isSystemRole: boolFromRoleApi(row.isSystemRole ?? row.IsSystemRole, false),
    assignedUsers: Number(row.assignedUsers ?? row.AssignedUsers ?? 0) || 0,
    permissions,
    createdAt: row.createdAt ?? row.CreatedAt ?? null,
    updatedAt: row.updatedAt ?? row.UpdatedAt ?? null};
}

function normalizeRoleIdentity(role: Partial<AccessRole> | null | undefined): string {
  return `${role?.roleKey || ""} ${role?.name || ""}`.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function isProtectedSuperAdminRole(role: Partial<AccessRole> | null | undefined): boolean {
  const identity = normalizeRoleIdentity(role);
  return identity.includes("super_admin") || identity === "superadmin" || String(role?.name || "").trim().toLowerCase() === "super admin";
}

function getRoleSortPriority(role: AccessRole): number {
  if (isProtectedSuperAdminRole(role)) return 0;
  return 1;
}

function sortAccessRoles(roles: AccessRole[]): AccessRole[] {
  const order: Record<RoleStatus, number> = { Active: 0, Review: 1, Locked: 2, Inactive: 3 };
  return [...roles].sort((a, b) => {
    const protectedDiff = getRoleSortPriority(a) - getRoleSortPriority(b);
    if (protectedDiff !== 0) return protectedDiff;
    const statusDiff = order[a.status] - order[b.status];
    if (statusDiff !== 0) return statusDiff;
    return a.name.localeCompare(b.name);
  });
}

function normalizeModuleRow(row: Record<string, unknown> = {}): ModuleControlModule {
  const moduleName = String(row.moduleName ?? row.ModuleName ?? row.name ?? row.Name ?? "Untitled Module").trim() || "Untitled Module";
  return {
    id: row.id as number | string | undefined ?? row.moduleID as number | string | undefined ?? row.ModuleID as number | string | undefined,
    moduleID: row.moduleID as number | string | undefined ?? row.ModuleID as number | string | undefined ?? row.id as number | string | undefined,
    moduleKey: String(row.moduleKey ?? row.ModuleKey ?? moduleName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")).trim(),
    moduleName,
    description: String(row.description ?? row.Description ?? "").trim(),
    category: String(row.category ?? row.Category ?? row.moduleGroup ?? row.ModuleGroup ?? "").trim(),
    routePath: String(row.routePath ?? row.RoutePath ?? "").trim(),
    parentModuleID: row.parentModuleID as number | string | null | undefined ?? row.ParentModuleID as number | string | null | undefined ?? null,
    isActive: boolFromApi(row.isActive ?? row.IsActive, true),
    sortOrder: Number(row.sortOrder ?? row.SortOrder ?? 0) || 0};
}

function normalizeModulePermission(row: Record<string, unknown> = {}): ModulePermission {
  return {
    roleID: row.roleID as number | string ?? row.RoleID as number | string ?? "",
    moduleID: row.moduleID as number | string ?? row.ModuleID as number | string ?? "",
    canView: boolFromApi(row.canView ?? row.CanView, false)};
}

function normalizeAccessPolicy(row: AccessPolicyApiRow = {}): AccessPolicy {
  const name = String(row.name ?? row.PolicyName ?? "Access Policy").trim() || "Access Policy";
  return {
    id: row.id ?? row.controlID ?? row.ControlID,
    controlID: row.controlID ?? row.ControlID ?? row.id,
    policyKey: String(row.policyKey ?? row.PolicyKey ?? name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")).trim(),
    name,
    description: String(row.description ?? row.Description ?? "").trim(),
    scope: String(row.scope ?? row.Scope ?? "All Users").trim() || "All Users",
    enforcement: String(row.enforcement ?? row.Enforcement ?? "Mandatory").trim() || "Mandatory",
    reviewCycle: String(row.reviewCycle ?? row.ReviewCycle ?? "Quarterly").trim() || "Quarterly",
    status: String(row.status ?? row.Status ?? "Active").trim().toLowerCase() === "inactive" ? "Inactive" : "Active",
    isSystemPolicy: boolFromRoleApi(row.isSystemPolicy ?? row.IsSystemPolicy, false),
    sortOrder: Number(row.sortOrder ?? row.SortOrder ?? 0) || 0,
    updatedAt: row.updatedAt ?? row.UpdatedAt ?? null};
}

function normalizeSlaConfigRow(row: Partial<SlaConfigRow> & Record<string, unknown> = {}, index = 0): SlaConfigRow {
  const fallback = DEFAULT_SLA_CONFIGS[index] || DEFAULT_SLA_CONFIGS[0];
  const priority = String(row.priority ?? row.Priority ?? fallback.priority).trim() || fallback.priority;

  return {
    id: (row.id as number | string | undefined) ?? (row.SlaConfigID as number | string | undefined) ?? (row.ConfigID as number | string | undefined) ?? fallback.id ?? priority,
    priority,
    label: String(row.label ?? row.Label ?? fallback.label).trim() || fallback.label,
    responseTimeMin: Number(row.responseTimeMin ?? row.ResponseTimeMin ?? fallback.responseTimeMin) || 0,
    resolutionTimeHrs: Number(row.resolutionTimeHrs ?? row.ResolutionTimeHrs ?? fallback.resolutionTimeHrs) || 0,
    escalationPolicy: String(row.escalationPolicy ?? row.EscalationPolicy ?? fallback.escalationPolicy ?? "").trim(),
    isActive: boolFromApi(row.isActive ?? row.IsActive, true)};
}

function normalizeWorkingHourRow(row: Partial<WorkingHourRow> & Record<string, unknown> = {}, index = 0): WorkingHourRow {
  const fallback = DEFAULT_WORKING_HOURS[index] || DEFAULT_WORKING_HOURS[0];
  const day = String(row.day ?? row.DayOfWeek ?? row.id ?? fallback.day).trim() || fallback.day;
  const isRestDay = boolFromApi(row.isRestDay ?? row.IsRestDay, !fallback.enabled);
  const enabled = row.enabled !== undefined || row.Enabled !== undefined
    ? boolFromApi(row.enabled ?? row.Enabled, fallback.enabled)
    : !isRestDay;

  return {
    id: String(row.id ?? row.DayOfWeek ?? day),
    day,
    enabled,
    start: String(row.start ?? row.StartTime ?? fallback.start ?? "09:00").slice(0, 5),
    end: String(row.end ?? row.EndTime ?? fallback.end ?? "18:00").slice(0, 5),
    isRestDay: !enabled,
    sortOrder: Number(row.sortOrder ?? row.SortOrder ?? fallback.sortOrder ?? index + 1) || index + 1};
}

function sortSlaConfigs(rows: SlaConfigRow[]): SlaConfigRow[] {
  const order = ["P1", "P2", "P3", "P4"];
  return [...rows].sort((a, b) => order.indexOf(String(a.priority)) - order.indexOf(String(b.priority)));
}

function sortWorkingHours(rows: WorkingHourRow[]): WorkingHourRow[] {
  return [...rows].sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
}


function getIncidentSetupId(row: Record<string, unknown>, fallback: string): string {
  return String(row.id ?? row.categoryID ?? row.CategoryID ?? row.subcategoryID ?? row.SubcategoryID ?? row.detailID ?? row.DetailID ?? fallback);
}

function normalizeIncidentDetailRow(row: Record<string, unknown> = {}, index = 0): IncidentDetailSetupRow {
  const name = String(row.name ?? row.Name ?? row.detailName ?? row.DetailName ?? row.incidentDetail ?? row.IncidentDetail ?? `Incident Detail ${index + 1}`).trim();
  return {
    id: getIncidentSetupId(row, `detail-${index}-${name || Date.now()}`),
    name: name || `Incident Detail ${index + 1}`,
    sortOrder: Number(row.sortOrder ?? row.SortOrder ?? index + 1) || index + 1,
    isActive: boolFromApi(row.isActive ?? row.IsActive, true)};
}

function normalizeIncidentSubcategoryRow(row: Record<string, unknown> = {}, index = 0): IncidentSubcategorySetupRow {
  const name = String(row.name ?? row.Name ?? row.subcategoryName ?? row.SubcategoryName ?? `Subcategory ${index + 1}`).trim();
  const detailsSource = Array.isArray(row.details) ? row.details : Array.isArray(row.Details) ? row.Details : Array.isArray(row.incidentDetails) ? row.incidentDetails : Array.isArray(row.IncidentDetails) ? row.IncidentDetails : [];
  return {
    id: getIncidentSetupId(row, `subcategory-${index}-${name || Date.now()}`),
    name: name || `Subcategory ${index + 1}`,
    sortOrder: Number(row.sortOrder ?? row.SortOrder ?? index + 1) || index + 1,
    isActive: boolFromApi(row.isActive ?? row.IsActive, true),
    details: detailsSource.map((detail, detailIndex) => normalizeIncidentDetailRow((detail || {}) as Record<string, unknown>, detailIndex)).sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))};
}

function normalizeIncidentCategoryRow(row: Record<string, unknown> = {}, index = 0): IncidentCategorySetupRow {
  const name = String(row.name ?? row.Name ?? row.categoryName ?? row.CategoryName ?? `Category ${index + 1}`).trim();
  const subcategoriesSource = Array.isArray(row.subcategories) ? row.subcategories : Array.isArray(row.Subcategories) ? row.Subcategories : Array.isArray(row.children) ? row.children : [];
  return {
    id: getIncidentSetupId(row, `category-${index}-${name || Date.now()}`),
    name: name || `Category ${index + 1}`,
    sortOrder: Number(row.sortOrder ?? row.SortOrder ?? index + 1) || index + 1,
    isActive: boolFromApi(row.isActive ?? row.IsActive, true),
    subcategories: subcategoriesSource.map((subcategory, subcategoryIndex) => normalizeIncidentSubcategoryRow((subcategory || {}) as Record<string, unknown>, subcategoryIndex)).sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))};
}

function normalizeIncidentCategories(rows: unknown[]): IncidentCategorySetupRow[] {
  return rows
    .map((row, index) => normalizeIncidentCategoryRow((row || {}) as Record<string, unknown>, index))
    .filter((category) => category.isActive !== false)
    .sort((a, b) => (Number(a.sortOrder || 0) - Number(b.sortOrder || 0)) || a.name.localeCompare(b.name));
}

function getIncidentCategoryCounts(categories: IncidentCategorySetupRow[]) {
  const subcategoryCount = categories.reduce((total, category) => total + category.subcategories.filter((item) => item.isActive !== false).length, 0);
  const detailCount = categories.reduce((total, category) => total + category.subcategories.reduce((subTotal, subcategory) => subTotal + subcategory.details.filter((item) => item.isActive !== false).length, 0), 0);
  return { categoryCount: categories.length, subcategoryCount, detailCount };
}

function getIncidentConfigMeta(activeTab: IncidentConfigTab, slaRows: SlaConfigRow[], workingHours: WorkingHourRow[], categories: IncidentCategorySetupRow[]): IncidentConfigMeta {
  const workingDayCount = workingHours.filter((day) => day.enabled).length;
  const restDayCount = workingHours.filter((day) => !day.enabled).length;
  const categoryCounts = getIncidentCategoryCounts(categories);

  if (activeTab === "workingHours") {
    return {
      eyebrow: "INCIDENT CONFIG",
      title: "Working Hours Setup",
      description: "Configure the working days and time windows used by Service Desk when calculating SLA due dates.",
      scoreOneLabel: "WORKING DAYS",
      scoreOne: String(workingDayCount),
      scoreOneCaption: "Enabled days",
      scoreTwoLabel: "REST DAYS",
      scoreTwo: String(restDayCount),
      scoreTwoCaption: "Excluded from SLA",
      commandTitle: "Working Hours",
      commandDescription: "These values control when the SLA timer is counted for incident due date calculation.",
      saveLabel: "Save Working Hours"};
  }

  if (activeTab === "categories") {
    return {
      eyebrow: "INCIDENT CONFIG",
      title: "Category Setup",
      description: "Configure the incident category, subcategory and detail options used in the Service Desk form and filters.",
      scoreOneLabel: "CATEGORIES",
      scoreOne: String(categoryCounts.categoryCount),
      scoreOneCaption: "Main groups",
      scoreTwoLabel: "DETAILS",
      scoreTwo: String(categoryCounts.detailCount),
      scoreTwoCaption: `${categoryCounts.subcategoryCount} subcategories`,
      commandTitle: "Category Setup",
      commandDescription: "These values populate the Category, Subcategory and Incident Detail dropdowns in Service Desk.",
      saveLabel: "Saved per item"};
  }

  return {
    eyebrow: "INCIDENT CONFIG",
    title: "SLA Rules Setup",
    description: "Configure priority-based response and resolution targets used by Service Desk to calculate SLA due dates.",
    scoreOneLabel: "SLA RULES",
    scoreOne: String(slaRows.length),
    scoreOneCaption: "Priority rules",
    scoreTwoLabel: "RESOLUTION HRS",
    scoreTwo: String(slaRows.reduce((total, row) => total + Number(row.resolutionTimeHrs || 0), 0)),
    scoreTwoCaption: "Total target hours",
    commandTitle: "SLA Rules",
    commandDescription: "These values define Service Desk SLA priority labels, response time, resolution time and escalation notes.",
    saveLabel: "Save SLA Rules"};
}

function getAccessPolicyId(policy: AccessPolicy) {
  return policy.controlID ?? policy.id ?? policy.policyKey;
}

function sortAccessPolicies(policies: AccessPolicy[]): AccessPolicy[] {
  return [...policies].sort((a, b) => (Number(a.sortOrder || 0) - Number(b.sortOrder || 0)) || a.name.localeCompare(b.name));
}

function getModuleId(module: ModuleControlModule) {
  return module.moduleID ?? module.id ?? module.moduleKey;
}

function getAccessRoleId(role: AccessRole) {
  return role.roleID ?? role.id ?? role.roleKey;
}

function hasModulePermission(permissions: ModulePermission[], module: ModuleControlModule, role: AccessRole) {
  const moduleId = String(getModuleId(module));
  const roleId = String(getAccessRoleId(role));
  return permissions.some((item) => String(item.moduleID) === moduleId && String(item.roleID) === roleId && item.canView);
}

const defaultUsers: UserAccess[] = [
  { name: "Zainul Ariffin", email: "zainul.ariffin@company.com", role: "System Administrator", status: "Active", scope: "All Modules" },
  { name: "Daniel", email: "daniel@company.com", role: "IT Manager", status: "Active", scope: "Dashboard + Reports" },
  { name: "Wani", email: "wani@company.com", role: "IT Operations", status: "Active", scope: "EMA + Dashboard" },
  { name: "Nabil", email: "nabil@company.com", role: "Service Desk", status: "Review", scope: "Service Desk + Remote" },
  { name: "Auditor User", email: "auditor@company.com", role: "Auditor / Viewer", status: "Active", scope: "Read Only" },
  { name: "Temporary Access", email: "temp.access@company.com", role: "Service Desk", status: "Locked", scope: "Service Desk + Remote" }];

const defaultModuleRoles: ModuleRole[] = [
  { key: "admin", name: "Admin", type: "Administrator", desc: "Full system access", defaultAccess: "Full Access", approval: "Yes" },
  { key: "manager", name: "Manager", type: "Management", desc: "Management dashboard and report access", defaultAccess: "Management Access", approval: "Yes" },
  { key: "ops", name: "Ops", type: "Operation", desc: "Operational monitoring and device action", defaultAccess: "Operational Access", approval: "No" },
  { key: "service", name: "Service", type: "Support", desc: "Service desk and remote support access", defaultAccess: "Operational Access", approval: "No" },
  { key: "audit", name: "Audit", type: "Audit / Viewer", desc: "Read-only audit and report access", defaultAccess: "Read Only", approval: "Yes" }];

const defaultModuleAccess: ModuleAccess[] = [
  { module: "Dashboard", access: [1, 1, 1, 0, 1] },
  { module: "EMA Operations", access: [1, 1, 1, 0, 0] },
  { module: "Service Desk", access: [1, 1, 0, 1, 0] },
  { module: "Report Center", access: [1, 1, 1, 0, 1] },
  { module: "Settings", access: [1, 0, 0, 0, 0] },
  { module: "Remote Control", access: [1, 0, 1, 1, 0] },
  { module: "Geolocation", access: [1, 1, 1, 0, 1] },
  { module: "Audit Log", access: [1, 1, 0, 0, 1] }];

const policies = [
  ["Multi-Factor Authentication", "Require second factor for admin, manager and security-sensitive actions.", "Enabled", "policy-on"],
  ["Session Timeout", "Automatically end inactive sessions after defined period.", "Enabled", "policy-on"],
  ["IP / VPN Restriction", "Limit system access to approved network, VPN or company IP range.", "Review", "policy-off"],
  ["Approval for Critical Action", "Require reason and approval for lock, wipe, unlock and risk override.", "Enabled", "policy-on"],
  ["Password Rotation", "Force periodic password change or SSO policy alignment.", "Disabled", "policy-off"],
  ["Role Change Approval", "Role updates require approval and audit comment.", "Enabled", "policy-on"]] as const;


const risks = [
  ["Low", "Informational or minor operational issue.", "0 - 39", "20%", "#2563eb"],
  ["Medium", "Requires operational review or follow-up.", "40 - 59", "48%", "#f59e0b"],
  ["High", "Requires management attention and action.", "60 - 79", "72%", "#fb7185"],
  ["Critical", "Immediate risk, compliance or security concern.", "80 - 100", "92%", "#e11d48"]] as const;

function initials(name: string) {
  return (name || "UA")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function normalizeRoleKey(name: string) {
  return `${(name || "role").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")}_${Date.now().toString().slice(-4)}`;
}

function addAccessForRole(defaultAccess: string) {
  return defaultAccess === "Full Access" || defaultAccess === "Management Access" ? 1 : 0;
}

function readArrayPayload<T = unknown>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const objectPayload = payload as { data?: unknown; rows?: unknown; pricing?: unknown };
    if (Array.isArray(objectPayload.data)) return objectPayload.data as T[];
    if (Array.isArray(objectPayload.rows)) return objectPayload.rows as T[];
    if (Array.isArray(objectPayload.pricing)) return objectPayload.pricing as T[];
  }
  return [];
}

function normalizeUserStatus(value: unknown): RoleStatus {
  const status = String(value || "Active").trim();
  if (status === "Review" || status === "Locked" || status === "Inactive") return status;
  return "Active";
}

function boolFromApi(value: unknown, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const text = String(value).toLowerCase().trim();
  if (["true", "1", "yes", "y", "on"].includes(text)) return true;
  if (["false", "0", "no", "n", "off"].includes(text)) return false;
  return fallback;
}

function mapUserApiRow(row: UserApiRow = {}): UserAccess {
  const id = row.id ?? row.userID ?? row.UserID;
  const username = String(row.username ?? row.Username ?? "").trim();
  const fullName = String(row.fullName ?? row.name ?? row.FullName ?? username).trim();
  const status = normalizeUserStatus(row.status ?? row.Status);
  const requireMFA = boolFromApi(row.requireMFA ?? row.mfa ?? row.RequireMFA, false);
  const accountLocked = boolFromApi(row.accountLocked ?? row.AccountLocked, status === "Locked");

  const roles = normalizeUserRoles(row.roles || row.role || row.roleName || row.RoleName || "IT Operations");
  const roleName = joinUserRoles(roles);

  return {
    id,
    userID: row.userID ?? row.UserID ?? id,
    username,
    name: fullName || username || "Unnamed User",
    fullName: fullName || username || "Unnamed User",
    email: String(row.email ?? row.Email ?? "").trim(),
    role: roleName,
    roles,
    roleName,
    status: accountLocked ? "Locked" : status,
    scope: String(row.scope ?? row.accessScope ?? row.AccessScope ?? "EMA + Dashboard").trim() || "EMA + Dashboard",
    accessScope: String(row.accessScope ?? row.scope ?? row.AccessScope ?? "EMA + Dashboard").trim() || "EMA + Dashboard",
    department: String(row.department ?? row.Department ?? "").trim(),
    position: String(row.position ?? row.Position ?? "").trim(),
    phoneNo: String(row.phoneNo ?? row.PhoneNo ?? "").trim(),
    isActive: boolFromApi(row.isActive, status !== "Inactive"),
    requireMFA,
    mfa: requireMFA,
    accountLocked,
    lockReason: String(row.lockReason ?? row.LockReason ?? "").trim(),
    accessStartDate: row.accessStartDate ?? row.AccessStartDate ?? null,
    accessEndDate: row.accessEndDate ?? row.AccessEndDate ?? null,
    lastLoginAt: row.lastLoginAt ?? row.LastLoginAt ?? null,
    passwordChangedAt: row.passwordChangedAt ?? row.PasswordChangedAt ?? null,
    loginFailCount: Number(row.loginFailCount ?? row.LoginFailCount ?? 0) || 0,
    remarks: String(row.remarks ?? row.Remarks ?? "").trim(),
    createdAt: row.createdAt ?? row.CreatedAt ?? null,
    updatedAt: row.updatedAt ?? row.UpdatedAt ?? row.createdAt ?? row.CreatedAt ?? null};
}

function formatUserUpdatedAt(value?: string | null) {
  if (!value) return "Not updated yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"});
}

function getUserCreatedTime(user: UserAccess) {
  const value = user.createdAt || user.updatedAt || null;
  if (value) {
    const time = new Date(value).getTime();
    if (!Number.isNaN(time)) return time;
  }
  const numericId = Number(user.id || user.userID || 0);
  return Number.isFinite(numericId) ? numericId : 0;
}

function sortUsersByCreatedDate(users: UserAccess[]) {
  return [...users].sort((a, b) => getUserCreatedTime(b) - getUserCreatedTime(a));
}

function formatUserDate(value?: string | null, fallback = "Never") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"});
}

function mapAuditLogApiRow(row: AuditLogApiRow = {}): AuditLog {
  const timestamp = String(row.timestamp ?? row.CreatedAt ?? "").trim();
  return {
    id: row.id ?? row.LogID ?? `${timestamp}-${row.UserName || row.user || "system"}-${row.Action || row.action || "audit"}`,
    timestamp,
    user: String(row.user ?? row.UserName ?? "system").trim() || "system",
    module: String(row.module ?? row.Module ?? "Settings").trim() || "Settings",
    action: String(row.action ?? row.Action ?? "Audit event").trim() || "Audit event",
    severity: String(row.severity ?? row.Severity ?? "Info").trim() || "Info",
    details: String(row.details ?? row.Details ?? "").trim()};
}

function getAuditTimestampMs(row: AuditLog) {
  const time = new Date(row.timestamp).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function formatAuditTimestamp(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"});
}


function formatAuditDetailKey(key: string) {
  return String(key || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function formatAuditDetailValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";

  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => formatAuditDetailKey(key) + ": " + formatAuditDetailValue(item))
      .join(" ? ");
  }

  return String(value);
}

function formatAuditDetails(details?: string) {
  const raw = String(details || "").trim();
  if (!raw) return "";

  if ((raw.startsWith("{") && raw.endsWith("}")) || (raw.startsWith("[") && raw.endsWith("]"))) {
    try {
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        return parsed.map((item) => formatAuditDetailValue(item)).filter(Boolean).join(" ? ");
      }

      if (parsed && typeof parsed === "object") {
        return Object.entries(parsed as Record<string, unknown>)
          .map(([key, value]) => formatAuditDetailKey(key) + ": " + formatAuditDetailValue(value))
          .join(" ? ");
      }
    } catch {
      return raw
        .replace(/[{}"\[\]]/g, "")
        .replace(/,/g, " ? ")
        .replace(/:/g, ": ");
    }
  }

  return raw;
}

const AUDIT_API_BASE = (((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_API_BASE_URL)
  || ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_API_URL)
  || "http://localhost:3001").replace(/\/$/, "");

function getStoredAuditToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("emaToken") ||
    ""
  );
}

async function auditApiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredAuditToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${AUDIT_API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include"});

  const text = await response.text();
  let payload: any = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (parseError) {
      const isHtml = text.trim().toLowerCase().startsWith("<!doctype") || text.trim().toLowerCase().startsWith("<html");
      const hint = isHtml
        ? "Backend returned an HTML page instead of JSON. The API route is missing, the backend was not restarted, or the request is hitting the frontend dev server."
        : "Backend returned a non-JSON response.";
      throw new Error(`${hint} [${response.status} ${response.statusText}] ${AUDIT_API_BASE}${path}`);
    }
  }

  if (!response.ok) {
    const message = payload?.message || payload?.error || payload?.errorMessage || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}


async function managementPolicyApiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  return auditApiRequest<T>(path, options);
}

function normalizeAuditSeverity(value: string) {
  const text = String(value || "Info").trim();
  const lower = text.toLowerCase();
  if (["success", "updated", "created", "exported", "info"].includes(lower)) return lower === "info" ? "Info" : text;
  if (["warning", "review", "locked"].includes(lower)) return text;
  if (["error", "failed", "critical", "danger"].includes(lower)) return text;
  return text || "Info";
}

function getAuditSeverityClass(value: string) {
  const key = String(value || "").toLowerCase();
  if (["success", "updated", "created", "exported"].some((item) => key.includes(item))) return "active";
  if (["warning", "review", "locked"].some((item) => key.includes(item))) return "review";
  if (["error", "failed", "critical", "danger"].some((item) => key.includes(item))) return "locked";
  return "info";
}

function filterAuditLogs(logs: AuditLog[], search: string, moduleFilter: string, severityFilter: string, dateFilter: AuditDateFilter) {
  const term = search.trim().toLowerCase();
  const moduleValue = moduleFilter.toLowerCase();
  const severityValue = severityFilter.toLowerCase();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;

  return logs.filter((log) => {
    const haystack = `${log.timestamp} ${log.user} ${log.module} ${log.action} ${log.severity} ${log.details || ""}`.toLowerCase();
    if (term && !haystack.includes(term)) return false;
    if (moduleValue !== "all" && log.module.toLowerCase() !== moduleValue) return false;
    if (severityValue !== "all" && log.severity.toLowerCase() !== severityValue) return false;

    if (dateFilter !== "all") {
      const time = getAuditTimestampMs(log);
      if (!time) return false;
      if (dateFilter === "today" && time < startOfToday) return false;
      if (dateFilter === "7d" && time < sevenDaysAgo) return false;
      if (dateFilter === "30d" && time < thirtyDaysAgo) return false;
    }

    return true;
  });
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function toDateInputValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function makePricingRow(row?: PricingPayloadRow, index = 0): PricingRow {
  const pricingId = row?.PricingID ?? null;
  return {
    id: pricingId ? `pricing-${pricingId}` : `pricing-new-${Date.now()}-${index}`,
    PricingID: pricingId,
    Category: String(row?.Category ?? row?.category ?? "").trim(),
    Brand: String(row?.Brand ?? row?.brand ?? "").trim(),
    Model: String(row?.Model ?? row?.model ?? "").trim(),
    Price: Number(row?.Price ?? row?.price ?? 0) || 0,
    IsExcluded: Boolean(row?.IsExcluded ?? row?.isExcluded ?? false)};
}

function pricingModelKey(category: string, brand: string) {
  return `${category || "_"}::${brand || "_"}`;
}


const DEFAULT_PC_AGING_RULE: PcAgingRule = {
  enabled: true,
  ageSource: "RegDate",
  healthyMaxYears: 3,
  monitorMaxYears: 5,
  agingMinYears: 7,
  includeUnknownAge: false,
  replacementWindowMonths: 6,
  notes: "PC aging rule used for dashboard and replacement planning."};

const DEFAULT_MANAGEMENT_POLICY_VALUES: ManagementPolicyValues = {
  "risk.software.itemExposure": 150,
  "risk.network.itemExposure": 300,
  "risk.geo.itemExposure": 200,
  "saving.reuse.percent": 0.25,
  "saving.staleRecovery.perDevice": 250,
  "saving.pricingCleanup.perAsset": 250,
  "saving.identityCleanup.perAsset": 150,
  "saving.slaProductivity.perBreach": 500,
  "score.penalty.aging": 38,
  "score.penalty.monitor": 18,
  "score.penalty.offline": 22,
  "score.penalty.stale": 22,
  "score.penalty.missingIdentity": 12,
  "score.penalty.unpriced": 6,
  "score.risk.endpointThreshold": 35,
  "score.risk.mediumThreshold": 40,
  "score.risk.highThreshold": 70,
  "score.software.sensitive": 55,
  "score.software.unclassified": 30,
  "score.software.stale": 18,
  "score.network.unregistered": 42,
  "score.network.inactive": 16,
  "score.network.missingIp": 20,
  "score.geo.unknown": 35,
  "score.geo.stale": 32,
  "score.geo.missingCoordinate": 15,
  "telemetry.endpoint.staleDays": 14,
  "telemetry.software.staleDays": 45,
  "telemetry.geo.staleDays": 7};

const MANAGEMENT_POLICY_FIELDS: ManagementPolicyField[] = [
  { key: "risk.software.itemExposure", group: "Cost & Saving Assumptions", label: "Software risk exposure", description: "Estimated exposure for each risky software signal.", unit: "RM", min: 0, max: 100000, step: 10 },
  { key: "risk.network.itemExposure", group: "Cost & Saving Assumptions", label: "Network risk exposure", description: "Estimated exposure for each unmanaged or duplicate network signal.", unit: "RM", min: 0, max: 100000, step: 10 },
  { key: "risk.geo.itemExposure", group: "Cost & Saving Assumptions", label: "Geo risk exposure", description: "Estimated exposure for each stale, missing or unknown geolocation signal.", unit: "RM", min: 0, max: 100000, step: 10 },
  { key: "saving.reuse.percent", group: "Cost & Saving Assumptions", label: "Reuse saving percentage", description: "Percent of monitor-stage device value counted as avoidable spend.", unit: "%", min: 0, max: 100, step: 1, displayScale: 100 },
  { key: "saving.staleRecovery.perDevice", group: "Cost & Saving Assumptions", label: "Stale recovery estimate", description: "Estimated recovery opportunity for each stale endpoint record.", unit: "RM", min: 0, max: 100000, step: 10 },
  { key: "saving.pricingCleanup.perAsset", group: "Cost & Saving Assumptions", label: "Pricing cleanup estimate", description: "Estimated value for each asset missing pricing evidence.", unit: "RM", min: 0, max: 100000, step: 10 },
  { key: "saving.identityCleanup.perAsset", group: "Cost & Saving Assumptions", label: "Identity cleanup estimate", description: "Estimated value for each endpoint missing ownership/model/IP evidence.", unit: "RM", min: 0, max: 100000, step: 10 },
  { key: "saving.slaProductivity.perBreach", group: "Cost & Saving Assumptions", label: "SLA productivity cost", description: "Estimated service productivity loss per SLA breach candidate.", unit: "RM", min: 0, max: 100000, step: 10 },

  { key: "score.penalty.aging", group: "Endpoint Risk Scoring", label: "Aging device penalty", description: "Risk points added when a device crosses the aging threshold.", unit: "pts", min: 0, max: 100, step: 1 },
  { key: "score.penalty.monitor", group: "Endpoint Risk Scoring", label: "Monitor-stage penalty", description: "Risk points added when a device is in refresh watch / monitor stage.", unit: "pts", min: 0, max: 100, step: 1 },
  { key: "score.penalty.offline", group: "Endpoint Risk Scoring", label: "Offline penalty", description: "Risk points added when a device is currently offline.", unit: "pts", min: 0, max: 100, step: 1 },
  { key: "score.penalty.stale", group: "Endpoint Risk Scoring", label: "Stale telemetry penalty", description: "Risk points added when endpoint telemetry is older than policy freshness.", unit: "pts", min: 0, max: 100, step: 1 },
  { key: "score.penalty.missingIdentity", group: "Endpoint Risk Scoring", label: "Missing identity penalty", description: "Risk points added when name, owner, model or IP evidence is incomplete.", unit: "pts", min: 0, max: 100, step: 1 },
  { key: "score.penalty.unpriced", group: "Endpoint Risk Scoring", label: "Unpriced asset penalty", description: "Risk points added when no device pricing rule is available.", unit: "pts", min: 0, max: 100, step: 1 },
  { key: "score.risk.endpointThreshold", group: "Endpoint Risk Scoring", label: "Endpoint risk threshold", description: "Minimum endpoint score counted as management risk.", unit: "pts", min: 1, max: 100, step: 1 },
  { key: "score.risk.mediumThreshold", group: "Endpoint Risk Scoring", label: "Medium severity threshold", description: "Endpoint risk score where severity becomes medium.", unit: "pts", min: 1, max: 100, step: 1 },
  { key: "score.risk.highThreshold", group: "Endpoint Risk Scoring", label: "High severity threshold", description: "Endpoint risk score where severity becomes high.", unit: "pts", min: 1, max: 100, step: 1 },

  { key: "score.software.sensitive", group: "Domain Risk Scoring", label: "Sensitive software penalty", description: "Risk points for risky software names/categories such as remote admin or unauthorized tools.", unit: "pts", min: 0, max: 100, step: 1 },
  { key: "score.software.unclassified", group: "Domain Risk Scoring", label: "Unclassified software penalty", description: "Risk points for software without usable category evidence.", unit: "pts", min: 0, max: 100, step: 1 },
  { key: "score.software.stale", group: "Domain Risk Scoring", label: "Stale software penalty", description: "Risk points for old software inventory evidence.", unit: "pts", min: 0, max: 100, step: 1 },
  { key: "score.network.unregistered", group: "Domain Risk Scoring", label: "Unregistered network penalty", description: "Risk points for active network evidence not mapped to managed asset ownership.", unit: "pts", min: 0, max: 100, step: 1 },
  { key: "score.network.inactive", group: "Domain Risk Scoring", label: "Inactive network penalty", description: "Risk points for registered but inactive network evidence.", unit: "pts", min: 0, max: 100, step: 1 },
  { key: "score.network.missingIp", group: "Domain Risk Scoring", label: "Missing IP penalty", description: "Risk points when network row has weak IP evidence.", unit: "pts", min: 0, max: 100, step: 1 },
  { key: "score.geo.unknown", group: "Domain Risk Scoring", label: "Unknown location penalty", description: "Risk points for unknown or unable-to-fetch location evidence.", unit: "pts", min: 0, max: 100, step: 1 },
  { key: "score.geo.stale", group: "Domain Risk Scoring", label: "Stale location penalty", description: "Risk points for old geolocation evidence.", unit: "pts", min: 0, max: 100, step: 1 },
  { key: "score.geo.missingCoordinate", group: "Domain Risk Scoring", label: "Missing coordinate penalty", description: "Risk points when location exists but coordinates are missing.", unit: "pts", min: 0, max: 100, step: 1 },

  { key: "telemetry.endpoint.staleDays", group: "Evidence Freshness Policy", label: "Endpoint stale after", description: "Days before endpoint last connection is considered stale.", unit: "days", min: 1, max: 365, step: 1 },
  { key: "telemetry.software.staleDays", group: "Evidence Freshness Policy", label: "Software inventory stale after", description: "Days before software inventory evidence is considered stale.", unit: "days", min: 1, max: 365, step: 1 },
  { key: "telemetry.geo.staleDays", group: "Evidence Freshness Policy", label: "Geolocation stale after", description: "Days before geolocation evidence is considered stale.", unit: "days", min: 1, max: 365, step: 1 }];

const MANAGEMENT_POLICY_GROUPS = Array.from(new Set(MANAGEMENT_POLICY_FIELDS.map((field) => field.group)));

function clampManagementPolicyValue(value: unknown, field: ManagementPolicyField) {
  const parsed = Number(value);
  const fallback = DEFAULT_MANAGEMENT_POLICY_VALUES[field.key] ?? 0;
  const normalized = Number.isFinite(parsed) ? parsed : fallback;
  return Math.min(field.max / (field.displayScale || 1), Math.max(field.min / (field.displayScale || 1), normalized));
}

function normalizeManagementPolicyValues(values: Partial<ManagementPolicyValues> = {}): ManagementPolicyValues {
  const normalized: ManagementPolicyValues = { ...DEFAULT_MANAGEMENT_POLICY_VALUES };
  for (const field of MANAGEMENT_POLICY_FIELDS) {
    normalized[field.key] = clampManagementPolicyValue(values[field.key], field);
  }
  return normalized;
}

function managementPolicyInputValue(values: ManagementPolicyValues, field: ManagementPolicyField) {
  const value = values[field.key] ?? DEFAULT_MANAGEMENT_POLICY_VALUES[field.key] ?? 0;
  const scaled = value * (field.displayScale || 1);
  return Number.isFinite(scaled) ? String(Number(scaled.toFixed(2)).toString()) : "0";
}

function formatManagementPolicyValue(values: ManagementPolicyValues, field: ManagementPolicyField) {
  const value = values[field.key] ?? DEFAULT_MANAGEMENT_POLICY_VALUES[field.key] ?? 0;
  const scaled = value * (field.displayScale || 1);
  const display = field.unit === "RM" ? Math.round(scaled).toLocaleString() : Number(scaled.toFixed(2)).toLocaleString();
  return field.unit === "RM" ? `RM ${display}` : `${display} ${field.unit}`;
}

const AGE_SOURCE_OPTIONS = [
  { value: "RegDate", label: "Registration Date" },
  { value: "HIUpdateTime", label: "Hardware Update Date" },
  { value: "ConnectionTime", label: "Last Connection Date" }];

function clampPcAgingNumber(value: unknown, fallback: number, min = 1, max = 20) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function normalizePcAgingRule(rule: Partial<PcAgingRule> = {}): PcAgingRule {
  const allowedSources = new Set(AGE_SOURCE_OPTIONS.map((item) => item.value));
  const ageSource = allowedSources.has(String(rule.ageSource || "")) ? String(rule.ageSource) : DEFAULT_PC_AGING_RULE.ageSource;

  const healthyMaxYears = clampPcAgingNumber(rule.healthyMaxYears, DEFAULT_PC_AGING_RULE.healthyMaxYears);
  const monitorMaxYears = clampPcAgingNumber(rule.monitorMaxYears, DEFAULT_PC_AGING_RULE.monitorMaxYears);
  const agingMinYears = clampPcAgingNumber(rule.agingMinYears, DEFAULT_PC_AGING_RULE.agingMinYears);

  return {
    enabled: Boolean(rule.enabled ?? DEFAULT_PC_AGING_RULE.enabled),
    ageSource,
    healthyMaxYears,
    monitorMaxYears: Math.max(monitorMaxYears, healthyMaxYears),
    agingMinYears: Math.max(agingMinYears, monitorMaxYears),
    includeUnknownAge: Boolean(rule.includeUnknownAge ?? DEFAULT_PC_AGING_RULE.includeUnknownAge),
    replacementWindowMonths: clampPcAgingNumber(rule.replacementWindowMonths, DEFAULT_PC_AGING_RULE.replacementWindowMonths, 0, 36),
    notes: String(rule.notes ?? DEFAULT_PC_AGING_RULE.notes).trim()};
}

function formatAgeSourceLabel(value: string) {
  return AGE_SOURCE_OPTIONS.find((item) => item.value === value)?.label || value || "Registration Date";
}

function SettingsMenuIcon({ name }: { name: IconName }) {
  const size = 16;

  if (name === "role") return <UsersRound size={size} strokeWidth={2.35} />;
  if (name === "user") return <UserCog size={size} strokeWidth={2.35} />;
  if (name === "matrix") return <Grid3X3 size={size} strokeWidth={2.35} />;
  if (name === "lock") return <LockKeyhole size={size} strokeWidth={2.35} />;
  if (name === "shield") return <ShieldCheck size={size} strokeWidth={2.35} />;
  if (name === "guard") return <ShieldCheck size={size} strokeWidth={2.35} />;
  if (name === "ticket") return <TicketCheck size={size} strokeWidth={2.35} />;
  if (name === "audit") return <FileText size={size} strokeWidth={2.35} />;
  if (name === "price") return <DollarSign size={size} strokeWidth={2.35} />;
  if (name === "aging") return <Clock3 size={size} strokeWidth={2.35} />;
  if (name === "sliders") return <SlidersHorizontal size={size} strokeWidth={2.35} />;
  if (name === "calendar") return <CalendarDays size={size} strokeWidth={2.35} />;

  return <ShieldCheck size={size} strokeWidth={2.35} />;
}

function FilterDropdown({ label, value, options, open, onToggle, onSelect, onClose }: { label: string; value: string; options: string[]; open: boolean; onToggle: () => void; onSelect: (value: string) => void; onClose: () => void }) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});

  const updateMenuPosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const menuWidth = Math.max(rect.width, 220);
    const safeGap = 12;
    const viewportPadding = 16;
    const optionHeight = 44;
    const estimatedMenuHeight = Math.min(360, Math.max(56, options.length * optionHeight + 12));
    const availableBelow = window.innerHeight - rect.bottom - viewportPadding;
    const availableAbove = rect.top - viewportPadding;
    const shouldOpenAbove = availableBelow < estimatedMenuHeight && availableAbove > availableBelow;
    const availableSpace = shouldOpenAbove ? availableAbove : availableBelow;
    const finalMenuHeight = Math.max(120, Math.min(estimatedMenuHeight, availableSpace));
    const left = Math.min(rect.left, window.innerWidth - menuWidth - viewportPadding);
    const top = shouldOpenAbove
      ? Math.max(viewportPadding, rect.top - finalMenuHeight - safeGap)
      : Math.min(rect.bottom + safeGap, window.innerHeight - finalMenuHeight - viewportPadding);

    setMenuStyle({
      position: "fixed",
      left: Math.max(viewportPadding, left),
      top,
      width: menuWidth,
      maxHeight: finalMenuHeight,
      zIndex: 2147483600
    });
  };

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();

    const handleReposition = () => updateMenuPosition();
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, value, options.length]);

  const menuNode = open && typeof document !== "undefined" ? createPortal(
    <div ref={menuRef}   role="listbox" aria-label={`${label} filter`}>
      {options.map((option) => (
        <button
          key={option} 
          type="button"
          onClick={() => onSelect(option)}
        >
          <span>{option}</span>
          {option === value && <span >✓</span>}
        </button>
      ))}
    </div>,
    document.body
  ) : null;

  return (
    <div >
      <button ref={triggerRef}  type="button" onClick={onToggle} aria-expanded={open}>
        <span>{value}</span>
        <ChevronDownSvg />
      </button>
      {menuNode}
    </div>
  );
}

function SettingSelect({
  value,
  options,
  onChange,
  disabled = false,
  placeholder = "Select option",
  ariaLabel}: {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});

  const selected = options.find((option) => dropdownOptionValue(option) === value);
  const selectedLabel = selected ? dropdownOptionLabel(selected) : placeholder;

  const updateMenuPosition = () => {
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
      position: "fixed",
      left,
      top,
      width: menuWidth,
      maxHeight,
      zIndex: 2147483600});
  };

  useEffect(() => {
    if (!open) return;

    updateMenuPosition();

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    const handleResize = () => updateMenuPosition();

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [open, value, options.length]);

  const menuNode = open && typeof document !== "undefined" ? createPortal(
    <div ref={menuRef}   role="listbox" aria-label={ariaLabel || placeholder}>
      {options.map((option) => {
        const optionValue = dropdownOptionValue(option);
        const optionLabel = dropdownOptionLabel(option);
        const selectedOption = optionValue === value;

        return (
          <button
            key={`${optionValue}-${optionLabel}`} 
            type="button"
            role="option"
            aria-selected={selectedOption}
            onClick={() => {
              onChange(optionValue);
              setOpen(false);
            }}
          >
            <span>{optionLabel}</span>
            {selectedOption && <span >✓</span>}
          </button>
        );
      })}
    </div>,
    document.body
  ) : null;

  return (
    <div >
      <button
        ref={triggerRef} 
        type="button"
        onClick={() => {
          if (!disabled) setOpen((current) => !current);
        }}
        disabled={disabled}
        aria-expanded={open}
        aria-label={ariaLabel || placeholder}
      >
        <span>{selectedLabel}</span>
        <ChevronDownSvg />
      </button>
      {menuNode}
    </div>
  );
}

function SettingsMoreSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="5" r="1.8" fill="currentColor" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" />
      <circle cx="12" cy="19" r="1.8" fill="currentColor" />
    </svg>
  );
}

function dropdownOptionLabel(option: DropdownOption) {
  return typeof option === "string" ? option : option.label;
}

function dropdownOptionValue(option: DropdownOption) {
  return typeof option === "string" ? option : option.value;
}

export default function Settings() {
  const [activeSection, setActiveSection] = useState<SectionKey>("roles");
  const [sectionSearch, setSectionSearch] = useState("");
  const [users, setUsers] = useState<UserAccess[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [accessRoles, setAccessRoles] = useState<AccessRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState("");
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const [accessRoleModalOpen, setAccessRoleModalOpen] = useState(false);
  const [editingAccessRoleIndex, setEditingAccessRoleIndex] = useState<number | null>(null);
  const emptyAccessRoleForm: AccessRole = { roleKey: "", name: "", description: "", type: "", defaultAccess: "", approvalRequired: false, status: "Active", assignedUsers: 0 };
  const [accessRoleForm, setAccessRoleForm] = useState<AccessRole>(emptyAccessRoleForm);
  const [roleDeleteTarget, setRoleDeleteTarget] = useState<{ role: AccessRole; index: number } | null>(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUserIndex, setEditingUserIndex] = useState<number | null>(null);
  const emptyUserForm: UserAccess = { name: "", username: "", email: "", role: "", roles: [], status: "Active", scope: "Role Based", department: "", position: "", phoneNo: "", requireMFA: false, mfa: false, accountLocked: false, lockReason: "", accessStartDate: "", accessEndDate: "", remarks: "", password: "", confirmPassword: "" };
  const [userForm, setUserForm] = useState<UserAccess>(emptyUserForm);

  const [moduleCatalog, setModuleCatalog] = useState<ModuleControlModule[]>([]);
  const [modulePermissions, setModulePermissions] = useState<ModulePermission[]>([]);
  const [moduleLoading, setModuleLoading] = useState(false);
  const [moduleError, setModuleError] = useState("");
  const [moduleLoaded, setModuleLoaded] = useState(false);
  const [moduleSavingKey, setModuleSavingKey] = useState("");
  const [accessPolicies, setAccessPolicies] = useState<AccessPolicy[]>([]);
  const [accessPoliciesLoading, setAccessPoliciesLoading] = useState(false);
  const [accessPoliciesError, setAccessPoliciesError] = useState("");
  const [accessPoliciesLoaded, setAccessPoliciesLoaded] = useState(false);
  const [accessPolicyModalOpen, setAccessPolicyModalOpen] = useState(false);
  const [editingAccessPolicyIndex, setEditingAccessPolicyIndex] = useState<number | null>(null);
  const emptyAccessPolicyForm: AccessPolicy = { policyKey: "", name: "", description: "", scope: "All Users", enforcement: "Mandatory", reviewCycle: "Quarterly", status: "Active", sortOrder: 0 };
  const [accessPolicyForm, setAccessPolicyForm] = useState<AccessPolicy>(emptyAccessPolicyForm);
  const [accessPolicyDeleteTarget, setAccessPolicyDeleteTarget] = useState<{ policy: AccessPolicy; index: number } | null>(null);
  const usersLoadInFlightRef = useRef(false);
  const rolesLoadInFlightRef = useRef(false);
  const moduleLoadInFlightRef = useRef(false);
  const accessPoliciesLoadInFlightRef = useRef(false);
  const auditLoadInFlightRef = useRef(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditExporting, setAuditExporting] = useState(false);
  const [auditError, setAuditError] = useState("");
  const [auditLoaded, setAuditLoaded] = useState(false);
  const [auditModuleFilter, setAuditModuleFilter] = useState("all");
  const [auditSeverityFilter, setAuditSeverityFilter] = useState("all");
  const [auditDateFilter, setAuditDateFilter] = useState<AuditDateFilter>("30d");
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalRecords, setAuditTotalRecords] = useState(0);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const auditLimit = 10;

  const [pcAgingRule, setPcAgingRule] = useState<PcAgingRule>(DEFAULT_PC_AGING_RULE);
  const [pcAgingLoaded, setPcAgingLoaded] = useState(false);
  const [pcAgingLoading, setPcAgingLoading] = useState(false);
  const [pcAgingSaving, setPcAgingSaving] = useState(false);
  const [pcAgingError, setPcAgingError] = useState("");
  const [managementPolicyValues, setManagementPolicyValues] = useState<ManagementPolicyValues>(DEFAULT_MANAGEMENT_POLICY_VALUES);
  const [managementPolicyProfile, setManagementPolicyProfile] = useState<ManagementPolicyProfile | null>(null);
  const [managementPolicyLoaded, setManagementPolicyLoaded] = useState(false);
  const [managementPolicyLoading, setManagementPolicyLoading] = useState(false);
  const [managementPolicySaving, setManagementPolicySaving] = useState(false);
  const [managementPolicyError, setManagementPolicyError] = useState("");
  const [pricingRows, setPricingRows] = useState<PricingRow[]>([]);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingSaving, setPricingSaving] = useState(false);
  const [pricingRowSavingId, setPricingRowSavingId] = useState("");
  const [pricingError, setPricingError] = useState("");
  const [pricingDeleteTarget, setPricingDeleteTarget] = useState<PricingRow | null>(null);
  const [resourceEngineers, setResourceEngineers] = useState<ResourceEngineer[]>([]);
  const [resourceSchedules, setResourceSchedules] = useState<ResourceSchedule[]>([]);
  const [resourceForm, setResourceForm] = useState<ResourceScheduleForm>(RESOURCE_EMPTY_FORM);
  const [resourceEditingId, setResourceEditingId] = useState<number | null>(null);
  const [resourceLoading, setResourceLoading] = useState(false);
  const [resourceSaving, setResourceSaving] = useState(false);
  const [resourceError, setResourceError] = useState("");
  const [resourceLoaded, setResourceLoaded] = useState(false);
  const [incidentConfigTab, setIncidentConfigTab] = useState<IncidentConfigTab>("sla");
  const [slaConfigs, setSlaConfigs] = useState<SlaConfigRow[]>(DEFAULT_SLA_CONFIGS);
  const [workingHours, setWorkingHours] = useState<WorkingHourRow[]>(DEFAULT_WORKING_HOURS);
  const [incidentConfigLoading, setIncidentConfigLoading] = useState(false);
  const [incidentConfigSaving, setIncidentConfigSaving] = useState(false);
  const [incidentConfigError, setIncidentConfigError] = useState("");
  const [incidentConfigLoaded, setIncidentConfigLoaded] = useState(false);
  const [incidentCategories, setIncidentCategories] = useState<IncidentCategorySetupRow[]>([]);
  const [selectedIncidentCategoryId, setSelectedIncidentCategoryId] = useState("");
  const [selectedIncidentSubcategoryId, setSelectedIncidentSubcategoryId] = useState("");
  const [newIncidentCategoryName, setNewIncidentCategoryName] = useState("");
  const [newIncidentSubcategoryName, setNewIncidentSubcategoryName] = useState("");
  const [newIncidentDetailName, setNewIncidentDetailName] = useState("");
  const [categorySavingKey, setCategorySavingKey] = useState("");
  const [incidentDeleteTarget, setIncidentDeleteTarget] = useState<IncidentConfigDeleteTarget | null>(null);
  const [resourceDeleteTarget, setResourceDeleteTarget] = useState<ResourceDeleteTarget | null>(null);
  const [userDeleteTarget, setUserDeleteTarget] = useState<{ user: UserAccess; index: number } | null>(null);
  const [settingsToast, setSettingsToast] = useState<SettingsToastState>(null);
  const settingsToastTimerRef = useRef<number | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [brandOptionsByCategory, setBrandOptionsByCategory] = useState<Record<string, string[]>>({});
  const [modelOptionsByKey, setModelOptionsByKey] = useState<Record<string, string[]>>({});
  const active = sections[activeSection];
  const usersTotalCount = users.length;
  const usersActiveCount = users.filter((user) => user.status === "Active" && user.isActive !== false).length;
  const usersLockedCount = users.filter((user) => user.accountLocked || user.status === "Locked").length;
  const usersMfaCount = users.filter((user) => user.requireMFA || user.mfa).length;
  
  const emaToast = useEmaToast();

  const [emaRoleModalOpen, setEmaRoleModalOpen] = useState(false);
  const [emaRoleEditingIndex, setEmaRoleEditingIndex] = useState<number | null>(null);
  const [emaRoleDeleteTarget, setEmaRoleDeleteTarget] = useState<{ index: number; name: string } | null>(null);
  const [emaRoleForm, setEmaRoleForm] = useState<{
    name: string;
    description: string;
    status: "Active" | "Inactive";
    approvalRequired: boolean;
  }>({
    name: "",
    description: "",
    status: "Active",
    approvalRequired: false,
  });

  const emaOpenRoleModal = (index: number | null) => {
    const role = index === null ? null : accessRoles[index];

    if (role && isProtectedSuperAdminRole(role)) {
      emaToast.warning("Protected role", "Super Admin role cannot be edited.");
      return;
    }

    setEmaRoleEditingIndex(index);
    setEmaRoleForm({
      name: role?.name || "",
      description: role?.description || "",
      status: role?.status === "Inactive" ? "Inactive" : "Active",
      approvalRequired: Boolean(role?.approvalRequired),
    });
    setEmaRoleModalOpen(true);
  };

  const emaCloseRoleModal = () => {
    setEmaRoleModalOpen(false);
    setEmaRoleEditingIndex(null);
  };

  const emaSaveRole = () => {
    const name = emaRoleForm.name.trim();
    const description = emaRoleForm.description.trim();

    if (!name) {
      emaToast.error("Role name required", "Please enter a role name before saving.");
      return;
    }

    setAccessRoles((current) => {
      if (emaRoleEditingIndex !== null) {
        return current.map((role, index) => {
          if (index !== emaRoleEditingIndex) return role;

          return {
            ...role,
            name,
            description,
            status: emaRoleForm.status,
            approvalRequired: emaRoleForm.approvalRequired,
          } as AccessRole;
        });
      }

      const roleKey = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");

      const newRole = {
        id: "role-" + Date.now(),
        roleKey: roleKey || "custom_role_" + Date.now(),
        name,
        description,
        status: emaRoleForm.status,
        approvalRequired: emaRoleForm.approvalRequired,
      } as AccessRole;

      return [...current, newRole];
    });

    emaToast.success(
      emaRoleEditingIndex === null ? "Role added" : "Role updated",
      emaRoleEditingIndex === null ? "New role has been added successfully." : "Role details have been updated successfully."
    );

    emaCloseRoleModal();
  };

  const emaRequestDeleteRole = (index: number) => {
    const role = accessRoles[index];

    if (!role) {
      emaToast.error("Role not found", "The selected role could not be found.");
      return;
    }

    if (isProtectedSuperAdminRole(role)) {
      emaToast.warning("Protected role", "Super Admin role cannot be edited or deleted.");
      return;
    }

    setEmaRoleDeleteTarget({
      index,
      name: role.name || "this role",
    });
  };

  const emaConfirmDeleteRole = () => {
    if (!emaRoleDeleteTarget) return;

    setAccessRoles((current) => current.filter((_, index) => index !== emaRoleDeleteTarget.index));
    emaToast.success("Role deleted", emaRoleDeleteTarget.name + " has been removed.");
    setEmaRoleDeleteTarget(null);
  };

const rolesTotalCount = accessRoles.length;
  const rolesActiveCount = accessRoles.filter((role) => role.status === "Active").length;
  const moduleTotalCount = moduleCatalog.length;
  const moduleActiveRoleCount = accessRoles.filter((role) => role.status === "Active").length;
  const accessPolicyTotalCount = accessPolicies.length;
  const accessPolicyActiveCount = accessPolicies.filter((policy) => policy.status === "Active").length;
  const incidentConfigMeta = getIncidentConfigMeta(incidentConfigTab, slaConfigs, workingHours, incidentCategories);
  const activeHeroTitle = activeSection === "incident" ? incidentConfigMeta.title : active.title;
  const activeHeroDesc = activeSection === "incident" ? incidentConfigMeta.description : active.desc;
  const auditTodayStart = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime();
  const auditTotalCount = auditTotalRecords || auditLogs.length;
  const auditTodayCount = auditLogs.filter((log) => getAuditTimestampMs(log) >= auditTodayStart).length;
  const roleOptionsForUsers = accessRoles.filter((role) => role.status !== "Inactive").map((role) => role.name);
  const filteredContentTerm = sectionSearch.trim().toLowerCase();

  // Server-side pagination is used for Audit Log, so do not filter the current page again on the client.
  const auditBaseModuleOptions = [
    "User Access Management",
    "Role Based Control",
    "Module Control by Role",
    "Access Control",
    "Device Pricing",
    "PC Aging Rule",
    "Audit Logs",
    "Settings",
    "Notification Channels",
    "Security & Auth"];
  const auditModuleOptions = Array.from(new Set([...auditBaseModuleOptions, ...auditLogs.map((log) => log.module).filter(Boolean)])).sort((a, b) => a.localeCompare(b));
  const auditSeverityOptions = ["Success", "Info", "Warning", "Error"];
  const filteredAuditLogs = auditLogs;
  const heroScoreOne = activeSection === "users" ? String(usersTotalCount) : activeSection === "roles" ? String(rolesTotalCount) : activeSection === "modules" ? String(moduleTotalCount) : activeSection === "access" ? String(accessPolicyTotalCount) : activeSection === "audit" ? String(auditTotalCount) : activeSection === "incident" ? incidentConfigMeta.scoreOne : activeSection === "aging" ? String(pcAgingRule.monitorMaxYears) : activeSection === "policy" ? String(MANAGEMENT_POLICY_FIELDS.length) : activeSection === "resources" ? String(resourceSchedules.length) : active.scoreOne;
  const heroScoreTwo = activeSection === "users" ? String(usersLockedCount) : activeSection === "roles" ? String(rolesActiveCount) : activeSection === "modules" ? String(moduleActiveRoleCount) : activeSection === "access" ? String(accessPolicyActiveCount) : activeSection === "audit" ? String(auditTodayCount) : activeSection === "incident" ? incidentConfigMeta.scoreTwo : activeSection === "aging" ? String(pcAgingRule.agingMinYears) : activeSection === "policy" ? (managementPolicyProfile?.profileName || "Global") : activeSection === "resources" ? String(resourceEngineers.length) : active.scoreTwo;

  /* EMA HERO KPI DATA START */
  const emaHeroCards: Array<{
    label: string;
    value: string | number;
    helper: string;
    icon: IconName;
    tone: "blue" | "green" | "red" | "purple";
  }> =
    activeSection === "users"
      ? [
          { label: "Total Users", value: usersTotalCount, helper: "Users records", icon: "user", tone: "blue" },
          { label: "Active Users", value: usersActiveCount, helper: "Can access system", icon: "role", tone: "green" },
          { label: "Locked Users", value: usersLockedCount, helper: "Blocked accounts", icon: "lock", tone: "red" },
          { label: "MFA Enabled", value: usersMfaCount, helper: "Second Factor Required", icon: "guard", tone: "purple" }
        ]
      : activeSection === "roles"
      ? [
          { label: "Total Roles", value: rolesTotalCount, helper: "Roles records", icon: "role", tone: "blue" },
          { label: "Active Roles", value: rolesActiveCount, helper: "Assigned to users", icon: "user", tone: "green" },
          { label: "Locked Roles", value: heroScoreTwo, helper: "Blocked access", icon: "lock", tone: "red" },
          { label: "Approval Flow", value: "On", helper: "Protected actions", icon: "guard", tone: "purple" }
        ]
      : activeSection === "modules"
      ? [
          { label: "Total Modules", value: moduleTotalCount, helper: "Module records", icon: "matrix", tone: "blue" },
          { label: "Active Roles", value: moduleActiveRoleCount, helper: "Controlled by RBAC", icon: "role", tone: "green" },
          { label: "Hidden Modules", value: heroScoreTwo, helper: "Disabled modules", icon: "shield", tone: "red" },
          { label: "RBAC Enabled", value: "On", helper: "Role based access", icon: "shield", tone: "purple" }
        ]
      : activeSection === "access"
      ? [
          { label: "Total Controls", value: accessPolicyTotalCount, helper: "Access controls records", icon: "shield", tone: "blue" },
          { label: "Active Controls", value: accessPolicyActiveCount, helper: "Security rules enabled", icon: "shield", tone: "green" },
          { label: "Review Items", value: heroScoreTwo, helper: "Need attention", icon: "audit", tone: "red" },
          { label: "Policy Ready", value: "On", helper: "Control active", icon: "shield", tone: "purple" }
        ]
      : [
          { label: activeSection === "incident" ? incidentConfigMeta.scoreOneLabel : "Total Items", value: heroScoreOne, helper: activeSection === "incident" ? incidentConfigMeta.scoreOneCaption : "Records", icon: active.icon, tone: "blue" },
          { label: activeSection === "incident" ? incidentConfigMeta.scoreTwoLabel : "Active Items", value: heroScoreTwo, helper: activeSection === "incident" ? incidentConfigMeta.scoreTwoCaption : "Available", icon: active.icon, tone: "green" },
          { label: "Review Items", value: activeSection === "audit" ? auditTodayCount : "0", helper: "Need attention", icon: "audit", tone: "red" },
          { label: "Control", value: "On", helper: "System ready", icon: "shield", tone: "purple" }
        ];
  /* EMA HERO KPI DATA END */

  const showToast = (tone: ToastTone, title: string, message: string) => {
    const toastId = Date.now();
    const safeTitle = String(title || "Update completed").trim();
    const safeMessage = String(message || "")
      .replace(/\s+/g, " ")
      .replace(/\.+$/, ".")
      .trim();

    if (settingsToastTimerRef.current) {
      window.clearTimeout(settingsToastTimerRef.current);
    }

    setSettingsToast({
      id: toastId,
      tone,
      title: safeTitle,
      message: safeMessage || (tone === "success" ? "Changes saved successfully." : "Please review the latest update.")});

    settingsToastTimerRef.current = window.setTimeout(() => {
      setSettingsToast((current) => (current?.id === toastId ? null : current));
      settingsToastTimerRef.current = null;
    }, tone === "error" ? 5200 : 3200);
  };

  const loadUsers = async () => {
    if (usersLoadInFlightRef.current) return;
    usersLoadInFlightRef.current = true;
    setUsersLoading(true);
    setUsersError("");

    try {
      const rows = await settingsUsers.getAll() as UserApiRow[];
      const activeRows = rows
        .map(mapUserApiRow)
        .filter((user) => user.isActive !== false && user.status !== "Inactive");
      setUsers(sortUsersByCreatedDate(activeRows));
      setUsersLoaded(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load user access records.";
      setUsersError(message);
      showToast("error", "User access load failed", message);
    } finally {
      usersLoadInFlightRef.current = false;
      setUsersLoading(false);
    }
  };


  const loadAccessRoles = async () => {
    if (rolesLoadInFlightRef.current) return;
    rolesLoadInFlightRef.current = true;
    setRolesLoading(true);
    setRolesError("");

    try {
      const rows = await settingsRoles.getAll() as RoleApiRow[];
      setAccessRoles(sortAccessRoles(rows.map(normalizeAccessRole)));
      setRolesLoaded(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load role based control records.";
      setRolesError(message);
      showToast("error", "Role load failed", message);
    } finally {
      rolesLoadInFlightRef.current = false;
      setRolesLoading(false);
    }
  };


  const loadModuleAccess = async () => {
    if (moduleLoadInFlightRef.current) return;
    moduleLoadInFlightRef.current = true;
    setModuleLoading(true);
    setModuleError("");

    try {
      const payload = await settingsModuleAccess.get() as NonNullable<ModuleAccessApiResponse["data"]>;
      const modules = (payload.modules || []).map((row) => normalizeModuleRow(row));
      const permissions = (payload.permissions || []).map((row) => normalizeModulePermission(row));
setModuleCatalog([...modules].sort((a, b) => (Number(a.sortOrder || 0) - Number(b.sortOrder || 0)) || a.moduleName.localeCompare(b.moduleName)));
      setModulePermissions(permissions);

      // Do not overwrite Role Based Control state with roles from Module Control.
      // Module Control can return active roles only, so inactive roles disappeared
      // from Role Based Control until Refresh was clicked.
setModuleLoaded(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load module role access.";
      setModuleError(message);
      showToast("error", "Module access load failed", message);
    } finally {
      moduleLoadInFlightRef.current = false;
      setModuleLoading(false);
    }
  };

  const loadAccessPolicies = async () => {
    if (accessPoliciesLoadInFlightRef.current) return;
    accessPoliciesLoadInFlightRef.current = true;
    setAccessPoliciesLoading(true);
    setAccessPoliciesError("");

    try {
      const rows = await settingsAccessControls.getAll() as AccessPolicyApiRow[];
      setAccessPolicies(sortAccessPolicies(rows.map(normalizeAccessPolicy)));
      setAccessPoliciesLoaded(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load access control records.";
      setAccessPoliciesError(message);
      showToast("error", "Access control load failed", message);
    } finally {
      accessPoliciesLoadInFlightRef.current = false;
      setAccessPoliciesLoading(false);
    }
  };

  const buildAuditQueryString = (page = auditPage, limit = auditLimit) => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));

    if (filteredContentTerm) params.set("search", filteredContentTerm);
    if (auditModuleFilter !== "all") params.set("module", auditModuleFilter);
    if (auditSeverityFilter !== "all") params.set("severity", auditSeverityFilter);
    if (auditDateFilter !== "all") params.set("dateRange", auditDateFilter);

    return params.toString();
  };

  const loadAuditLogs = async (page = auditPage) => {
    if (auditLoadInFlightRef.current) return;
    auditLoadInFlightRef.current = true;
    setAuditLoading(true);
    setAuditError("");

    try {
      const payload = await auditApiRequest<AuditLogsApiResponse>(`/api/settings/audit-logs?${buildAuditQueryString(page)}`);
      const rows = Array.isArray(payload.data) ? payload.data : [];
      setAuditLogs(rows.map(mapAuditLogApiRow).sort((a, b) => getAuditTimestampMs(b) - getAuditTimestampMs(a)));
      setAuditTotalRecords(Number(payload.totalRecords || rows.length || 0));
      setAuditTotalPages(Math.max(1, Number(payload.totalPages || 1)));
      setAuditPage(Math.max(1, Number(payload.page || page || 1)));
      setAuditLoaded(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load audit logs.";
      setAuditError(message);
      showToast("error", "Audit log load failed", message);
    } finally {
      auditLoadInFlightRef.current = false;
      setAuditLoading(false);
    }
  };

  const logIncidentConfigAudit = async (action: string, details: string, entityType = "", entityID: number | string = "") => {
    try {
      await settingsAuditLogs.create({
        module: "Incident Config",
        action,
        severity: "Success",
        details,
        entityType,
        entityID: String(entityID || "")});
      setAuditLoaded(false);
    } catch (error) {
      console.warn("Incident Config audit logging skipped:", error);
    }
  };

  const exportAuditLogs = async () => {
    if (auditExporting) return;

    setAuditExporting(true);

    try {
      const exportPageSize = 500;
      const maxExportRecords = 50000;
      let currentPage = 1;
      let totalPagesToRead = 1;
      const exportRows: AuditLog[] = [];

      do {
        const payload = await auditApiRequest<AuditLogsApiResponse>(`/api/settings/audit-logs?${buildAuditQueryString(currentPage, exportPageSize)}`);
        const rows = Array.isArray(payload.data) ? payload.data : [];
        exportRows.push(...rows.map(mapAuditLogApiRow));
        totalPagesToRead = Math.max(1, Number(payload.totalPages || 1));
        currentPage += 1;
      } while (currentPage <= totalPagesToRead && exportRows.length < maxExportRecords);

      const rows = exportRows
        .slice(0, maxExportRecords)
        .sort((a, b) => getAuditTimestampMs(b) - getAuditTimestampMs(a));

      if (rows.length === 0) {
        showToast("warning", "No audit records", "There are no audit logs to export with the current filters.");
        return;
      }

      const header = ["Time", "User", "Module", "Action", "Severity", "Details"];
      const csvRows = [header, ...rows.map((row) => [formatAuditTimestamp(row.timestamp), row.user, row.module, row.action, row.severity, row.details || ""])];
      const csv = csvRows.map((row) => row.map(csvCell).join(",")).join("\n");
      const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      const filterName = [
        auditModuleFilter !== "all" ? auditModuleFilter : "all-modules",
        auditSeverityFilter !== "all" ? auditSeverityFilter : "all-statuses",
        auditDateFilter]
        .join("-")
        .replace(/[^a-z0-9-]+/gi, "-")
        .toLowerCase();

      link.href = url;
      link.download = `ema-audit-log-${filterName}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      try {
        await auditApiRequest("/api/settings/audit-logs/export-event", {
          method: "POST",
          body: JSON.stringify({
            recordCount: rows.length,
            filters: {
              search: filteredContentTerm,
              module: auditModuleFilter,
              severity: auditSeverityFilter,
              dateRange: auditDateFilter,
              exportMode: "all-filtered-records",
              maxExportRecords}})});
      } catch (error) {
        console.warn("Audit export event logging skipped:", error);
      }

      showToast("success", "Audit exported", `${rows.length} filtered audit log record${rows.length === 1 ? "" : "s"} exported to CSV.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to export audit logs.";
      showToast("error", "Audit export failed", message);
    } finally {
      setAuditExporting(false);
    }
  };

  const openAccessPolicyModal = (index: number | null = null) => {
    setEditingAccessPolicyIndex(index);
    setAccessPolicyForm(index === null ? emptyAccessPolicyForm : accessPolicies[index]);
    setAccessPolicyModalOpen(true);
  };

  const saveAccessPolicy = async () => {
    const name = accessPolicyForm.name.trim();
    if (!name) {
      showToast("warning", "Policy name required", "Please enter an access control policy name.");
      return;
    }

    const payload = {
      policyName: name,
      description: accessPolicyForm.description || "",
      scope: accessPolicyForm.scope || "All Users",
      enforcement: accessPolicyForm.enforcement || "Mandatory",
      reviewCycle: accessPolicyForm.reviewCycle || "Quarterly",
      status: accessPolicyForm.status === "Inactive" ? "Inactive" : "Active",
      sortOrder: Number(accessPolicyForm.sortOrder || 0) || 0};

    try {
      if (editingAccessPolicyIndex === null) {
        const created = await settingsAccessControls.create(payload) as AccessPolicyApiRow;
        setAccessPolicies((current) => sortAccessPolicies([...current, normalizeAccessPolicy(created || payload)]));
        showToast("success", "Access control added", `${name} has been added.`);
      } else {
        const policyId = getAccessPolicyId(accessPolicyForm);
        const updated = await settingsAccessControls.update(policyId, payload) as AccessPolicyApiRow;
        setAccessPolicies((current) => sortAccessPolicies(current.map((item, index) => index === editingAccessPolicyIndex ? normalizeAccessPolicy(updated || { ...item, ...payload }) : item)));
        showToast("success", "Access control updated", `${name} has been updated.`);
      }
      setAccessPolicyModalOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save access control policy.";
      showToast("error", "Access control save failed", message);
    }
  };

  const requestDeleteAccessPolicy = (index: number) => {
    setAccessPolicyDeleteTarget({ policy: accessPolicies[index], index });
  };

  const confirmDeleteAccessPolicy = async () => {
    if (!accessPolicyDeleteTarget) return;
    const { policy, index } = accessPolicyDeleteTarget;

    try {
      await settingsAccessControls.remove(getAccessPolicyId(policy));
      setAccessPolicies((current) => current.filter((_, itemIndex) => itemIndex !== index));
      setAccessPolicyDeleteTarget(null);
      showToast("success", "Access control deleted", `${policy.name} has been deleted.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete access control policy.";
      showToast("error", "Access control delete failed", message);
    }
  };

  const toggleRoleModuleAccess = async (module: ModuleControlModule, role: AccessRole) => {
    const moduleId = getModuleId(module);
    const roleId = getAccessRoleId(role);
    if (!moduleId || !roleId) {
      showToast("error", "Module access not saved", "Missing module or role ID. Reload Module Control and try again.");
      return;
    }

    const key = `${moduleId}:${roleId}`;
    const nextCanView = !hasModulePermission(modulePermissions, module, role);
    setModuleSavingKey(key);

    setModulePermissions((current) => {
      const existing = current.some((item) => String(item.moduleID) === String(moduleId) && String(item.roleID) === String(roleId));
      if (existing) {
        return current.map((item) => String(item.moduleID) === String(moduleId) && String(item.roleID) === String(roleId) ? { ...item, canView: nextCanView } : item);
      }
      return [...current, { moduleID: moduleId, roleID: roleId, canView: nextCanView }];
    });

    try {
      await settingsModuleAccess.save({ moduleId, roleId, canView: nextCanView });
      showToast("success", "Module access updated", `${role.name} ${nextCanView ? "can access" : "cannot access"} ${module.moduleName}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save module access.";
      showToast("error", "Module access save failed", message);
      void loadModuleAccess();
    } finally {
      setModuleSavingKey("");
    }
  };

  const openAccessRoleModal = (index: number | null = null) => {
    setEditingAccessRoleIndex(index);
    if (index === null) {
      setAccessRoleForm(emptyAccessRoleForm);
    } else {
      setAccessRoleForm(accessRoles[index]);
    }
    setAccessRoleModalOpen(true);
  };

  const saveAccessRole = async () => {
    const roleName = accessRoleForm.name.trim();
    if (!roleName) {
      showToast("warning", "Role name required", "Please enter a role name before saving.");
      return;
    }

    const payload = {
      name: roleName,
      roleName,
      description: accessRoleForm.description || "",
      approvalRequired: Boolean(accessRoleForm.approvalRequired),
      status: accessRoleForm.status === "Inactive" ? "Inactive" : "Active"};

    try {
      if (editingAccessRoleIndex === null) {
        await settingsRoles.create(payload);
        showToast("success", "Role created", `${roleName} has been added to Role Based Control.`);
      } else {
        const roleId = accessRoleForm.id || accessRoleForm.roleID;
        if (!roleId) throw new Error("Role ID is missing. Please reload the role list.");
        await settingsRoles.update(roleId, payload);
        showToast("success", "Role updated", `${roleName} has been updated.`);
      }

      setAccessRoleModalOpen(false);
      setEditingAccessRoleIndex(null);
      await loadAccessRoles();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save role.";
      showToast("error", "Role save failed", message);
    }
  };

  const requestDeleteAccessRole = (index: number) => {
    const role = accessRoles[index];
    if (!role) return;
    if (isProtectedSuperAdminRole(role)) {
      showToast("warning", "Role locked", "Super Admin is a protected system role and cannot be deleted.");
      return;
    }
    setRoleDeleteTarget({ role, index });
  };

  const confirmDeleteAccessRole = async () => {
    if (!roleDeleteTarget) return;
    const roleId = roleDeleteTarget.role.id || roleDeleteTarget.role.roleID;

    try {
      if (isProtectedSuperAdminRole(roleDeleteTarget.role)) throw new Error("Super Admin is a protected system role and cannot be deleted.");
      if (!roleId) throw new Error("Role ID is missing. Please reload the role list.");
      await settingsRoles.remove(roleId);
      setRoleDeleteTarget(null);
      showToast("success", "Role deleted", `${roleDeleteTarget.role.name} has been deleted.`);
      await loadAccessRoles();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete role.";
      showToast("error", "Role delete failed", message);
    }
  };


  const loadPcAgingRule = async () => {
    setPcAgingLoading(true);
    setPcAgingError("");

    try {
      const payload = await settingsPcAgingRule.get() as PcAgingApiResponse;
      setPcAgingRule(normalizePcAgingRule(payload.data?.rule || DEFAULT_PC_AGING_RULE));
      setPcAgingLoaded(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load PC aging rule.";
      setPcAgingError(message);
      showToast("error", "Aging rule load failed", message);
    } finally {
      setPcAgingLoading(false);
    }
  };

  const savePcAgingRule = async () => {
    const normalizedRule = normalizePcAgingRule(pcAgingRule);
    setPcAgingRule(normalizedRule);
    setPcAgingSaving(true);
    setPcAgingError("");

    try {
      await settingsPcAgingRule.save(normalizedRule);
      setPcAgingLoaded(true);
      addActivity("Saved PC aging rule", `Aging threshold set to ${normalizedRule.monitorMaxYears} years · just now`);
      showToast("success", "Aging rule saved", "PC aging rule has been applied successfully.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save PC aging rule.";
      setPcAgingError(message);
      showToast("error", "Aging rule save failed", message);
    } finally {
      setPcAgingSaving(false);
    }
  };

  const pricingPayload = (rows: PricingRow[]) =>
    rows.map((row) => ({
      PricingID: row.PricingID,
      Category: row.Category,
      Brand: row.Brand,
      Model: row.Model,
      Price: Number(row.Price) || 0,
      IsExcluded: row.IsExcluded}));

  const validatePricingRow = (row: PricingRow) => {
    if (!row.Category) return "Please select a device category before saving.";
    if (Number(row.Price) < 0) return "Market price cannot be negative.";
    return "";
  };

  const loadPricingCategories = async () => {
    try {
      const options = (await settingsDevicePricing.getCategories()).filter(Boolean);
      setCategoryOptions(options.length ? options : ["Others"]);
    } catch (error) {
      console.error("Failed to load pricing categories:", error);
      setCategoryOptions((current) => (current.length ? current : ["Others"]));
    }
  };

  const loadBrandsForCategory = async (category: string) => {
    const cleanCategory = category.trim();
    if (!cleanCategory || brandOptionsByCategory[cleanCategory]) return;

    try {
      const options = (await settingsDevicePricing.getBrands(cleanCategory)).filter(Boolean);
      setBrandOptionsByCategory((current) => ({ ...current, [cleanCategory]: options }));
    } catch (error) {
      console.error("Failed to load pricing brands:", error);
      setBrandOptionsByCategory((current) => ({ ...current, [cleanCategory]: [] }));
    }
  };

  const loadModelsForCategoryBrand = async (category: string, brand: string) => {
    const cleanCategory = category.trim();
    const cleanBrand = brand.trim();
    const key = pricingModelKey(cleanCategory, cleanBrand);
    if (!cleanCategory || !cleanBrand || modelOptionsByKey[key]) return;

    try {
      const options = (await settingsDevicePricing.getModels(cleanCategory, cleanBrand)).filter(Boolean);
      setModelOptionsByKey((current) => ({ ...current, [key]: options }));
    } catch (error) {
      console.error("Failed to load pricing models:", error);
      setModelOptionsByKey((current) => ({ ...current, [key]: [] }));
    }
  };

  const loadDevicePricing = async () => {
    setPricingLoading(true);
    setPricingError("");

    try {
      const rows = (await settingsDevicePricing.getAll() as PricingPayloadRow[]).map((row, index) => makePricingRow(row, index));
      setPricingRows(rows);
      rows.forEach((row) => {
        if (row.Category) void loadBrandsForCategory(row.Category);
        if (row.Category && row.Brand) void loadModelsForCategoryBrand(row.Category, row.Brand);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load device pricing.";
      setPricingError(message);
    } finally {
      setPricingLoading(false);
    }
  };

  const addPricingRow = () => {
    const category = categoryOptions[0] || "Others";
    const row = makePricingRow({ Category: category, Brand: "", Model: "", Price: 0, IsExcluded: false });
    setPricingRows((current) => [...current, row]);
    setPricingError("");
    showToast("info", "Pricing row added", "Complete the row details, then click Save on that row.");
    if (category) void loadBrandsForCategory(category);
  };

  const updatePricingRow = (id: string, patch: Partial<PricingRow>) => {
    setPricingRows((current) =>
      current.map((row) => {
        if (row.id !== id) return row;

        const next = { ...row, ...patch };

        if (patch.Category !== undefined) {
          next.Brand = "";
          next.Model = "";
          if (next.Category) void loadBrandsForCategory(next.Category);
        }

        if (patch.Brand !== undefined) {
          next.Model = "";
          if (next.Category && next.Brand) void loadModelsForCategoryBrand(next.Category, next.Brand);
        }

        return next;
      })
    );
  };

  const savePricingRow = async (id: string) => {
    const row = pricingRows.find((item) => item.id === id);
    if (!row) return;

    const validationMessage = validatePricingRow(row);
    if (validationMessage) {
      setPricingError(validationMessage);
      showToast("warning", "Pricing not saved", validationMessage);
      return;
    }

    setPricingRowSavingId(id);
    setPricingError("");

    try {
      const payload = await settingsDevicePricing.saveRow(row) as PricingPayloadRow;

      const savedRow = payload ? makePricingRow(payload) : row;
      setPricingRows((current) => current.map((item) => (item.id === id ? { ...savedRow, id: savedRow.PricingID ? `pricing-${savedRow.PricingID}` : item.id } : item)));
      showToast("success", "Pricing saved", `${row.Category}${row.Brand ? ` • ${row.Brand}` : ""}${row.Model ? ` • ${row.Model}` : ""} has been saved.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save pricing row.";
      setPricingError(message);
      showToast("error", "Save failed", message);
    } finally {
      setPricingRowSavingId("");
    }
  };

  const requestDeletePricingRow = (row: PricingRow) => {
    setPricingDeleteTarget(row);
  };

  const confirmDeletePricingRow = async () => {
    if (!pricingDeleteTarget) return;

    const row = pricingDeleteTarget;
    setPricingRowSavingId(row.id);
    setPricingError("");

    try {
      if (row.PricingID) {
        await settingsDevicePricing.remove(row.PricingID);
      }

      setPricingRows((current) => current.filter((item) => item.id !== row.id));
      setPricingDeleteTarget(null);
      showToast("success", "Pricing deleted", `${row.Category || "Pricing row"}${row.Brand ? ` • ${row.Brand}` : ""}${row.Model ? ` • ${row.Model}` : ""} has been removed.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete pricing row.";
      setPricingError(message);
      showToast("error", "Delete failed", message);
    } finally {
      setPricingRowSavingId("");
    }
  };

  const saveDevicePricing = async () => {
    const invalidRow = pricingRows.find((row) => validatePricingRow(row));

    if (invalidRow) {
      const message = validatePricingRow(invalidRow) || "Every pricing row needs a valid setup.";
      setPricingError(message);
      showToast("warning", "Pricing not saved", message);
      return;
    }

    setPricingSaving(true);
    setPricingError("");

    try {
      await settingsDevicePricing.saveAll({
        pricing: pricingPayload(pricingRows)});

      await loadDevicePricing();
      showToast("success", "Pricing saved", "All device pricing rows have been saved.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save device pricing.";
      setPricingError(message);
      showToast("error", "Save failed", message);
    } finally {
      setPricingSaving(false);
    }
  };


  const loadManagementPolicy = async () => {
    setManagementPolicyLoading(true);
    setManagementPolicyError("");

    try {
      const payload = await managementPolicyApiRequest<ManagementPolicyApiResponse>("/api/settings/management-policy");
      const values = normalizeManagementPolicyValues(payload.data?.values || DEFAULT_MANAGEMENT_POLICY_VALUES);
      setManagementPolicyValues(values);
      setManagementPolicyProfile(payload.data?.profile || null);
      setManagementPolicyLoaded(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load management policy.";
      setManagementPolicyError(message);
      showToast("error", "Management policy load failed", message);
    } finally {
      setManagementPolicyLoading(false);
    }
  };

  const saveManagementPolicy = async () => {
    const normalizedValues = normalizeManagementPolicyValues(managementPolicyValues);
    setManagementPolicyValues(normalizedValues);
    setManagementPolicySaving(true);
    setManagementPolicyError("");

    try {
      const payload = await managementPolicyApiRequest<ManagementPolicyApiResponse>("/api/settings/management-policy", {
        method: "PUT",
        body: JSON.stringify({ values: normalizedValues })});
      setManagementPolicyValues(normalizeManagementPolicyValues(payload.data?.values || normalizedValues));
      setManagementPolicyProfile(payload.data?.profile || managementPolicyProfile);
      setManagementPolicyLoaded(true);
      addActivity("Saved management policy", `${MANAGEMENT_POLICY_FIELDS.length} dashboard assumption value(s) updated · just now`);
      showToast("success", "Management policy saved", "Dashboard risk, exposure and saving assumptions have been updated.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save management policy.";
      setManagementPolicyError(message);
      showToast("error", "Management policy save failed", message);
    } finally {
      setManagementPolicySaving(false);
    }
  };

  const loadIncidentConfig = async () => {
    if (incidentConfigLoading) return;

    setIncidentConfigLoading(true);
    setIncidentConfigError("");

    try {
      const [slaPayload, workingPayload, categoryPayload] = await Promise.all([
        settingsIncidentConfig.getSla(),
        settingsIncidentConfig.getWorkingHours(),
        settingsIncidentConfig.getCategories()]);

      const slaRows = readArrayPayload<Record<string, unknown>>(slaPayload).map(normalizeSlaConfigRow);
      const workingRows = readArrayPayload<Record<string, unknown>>(workingPayload).map(normalizeWorkingHourRow);
      const categoryRows = normalizeIncidentCategories(readArrayPayload<Record<string, unknown>>(categoryPayload));

      setSlaConfigs(sortSlaConfigs(slaRows.length ? slaRows : DEFAULT_SLA_CONFIGS));
      setWorkingHours(sortWorkingHours(workingRows.length ? workingRows : DEFAULT_WORKING_HOURS));
      setIncidentCategories(categoryRows);
      setSelectedIncidentCategoryId((current) => current && categoryRows.some((category) => String(category.id) === current) ? current : String(categoryRows[0]?.id ?? ""));
      setSelectedIncidentSubcategoryId((current) => {
        const baseCategory = categoryRows.find((category) => String(category.id) === selectedIncidentCategoryId) || categoryRows[0];
        return current && baseCategory?.subcategories.some((subcategory) => String(subcategory.id) === current) ? current : String(baseCategory?.subcategories[0]?.id ?? "");
      });
      setIncidentConfigLoaded(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load incident configuration.";
      setIncidentConfigError(message);
      showToast("error", "Incident config load failed", message);
    } finally {
      setIncidentConfigLoading(false);
    }
  };

  const updateSlaConfig = (id: number | string, patch: Partial<SlaConfigRow>) => {
    setSlaConfigs((current) => current.map((row) => (String(row.id) === String(id) ? { ...row, ...patch } : row)));
  };

  const updateWorkingHour = (id: string, patch: Partial<WorkingHourRow>) => {
    setWorkingHours((current) => current.map((row) => (String(row.id) === String(id) ? { ...row, ...patch, isRestDay: patch.enabled === undefined ? row.isRestDay : !patch.enabled } : row)));
  };

  const updateCategoryNameLocal = (id: number | string, value: string) => {
    setIncidentCategories((rows) => rows.map((category) => String(category.id) === String(id) ? { ...category, name: value } : category));
  };

  const updateSubcategoryNameLocal = (categoryId: number | string, subcategoryId: number | string, value: string) => {
    setIncidentCategories((rows) => rows.map((category) => String(category.id) === String(categoryId)
      ? { ...category, subcategories: category.subcategories.map((subcategory) => String(subcategory.id) === String(subcategoryId) ? { ...subcategory, name: value } : subcategory) }
      : category));
  };

  const updateDetailNameLocal = (categoryId: number | string, subcategoryId: number | string, detailId: number | string, value: string) => {
    setIncidentCategories((rows) => rows.map((category) => String(category.id) === String(categoryId)
      ? {
          ...category,
          subcategories: category.subcategories.map((subcategory) => String(subcategory.id) === String(subcategoryId)
            ? { ...subcategory, details: subcategory.details.map((detail) => String(detail.id) === String(detailId) ? { ...detail, name: value } : detail) }
            : subcategory)}
      : category));
  };

  const saveIncidentConfig = async () => {
    if (incidentConfigTab === "categories") {
      showToast("info", "Category setup", "Category, subcategory and detail changes are saved per item.");
      return;
    }

    const invalidSla = slaConfigs.find((row) => !row.priority || !row.label || Number(row.responseTimeMin) < 0 || Number(row.resolutionTimeHrs) <= 0);
    if (invalidSla) {
      const message = "Every SLA rule needs a priority, label, response time and resolution time greater than zero.";
      setIncidentConfigError(message);
      showToast("warning", "SLA config not saved", message);
      return;
    }

    const invalidWorkingHour = workingHours.find((row) => row.enabled && (!row.start || !row.end || row.end <= row.start));
    if (invalidWorkingHour) {
      const message = `${invalidWorkingHour.day} working hours are invalid. End time must be later than start time.`;
      setIncidentConfigError(message);
      showToast("warning", "Working hours not saved", message);
      return;
    }

    setIncidentConfigSaving(true);
    setIncidentConfigError("");

    try {
      await Promise.all([
        settingsIncidentConfig.saveSla(slaConfigs),
        settingsIncidentConfig.saveWorkingHours(workingHours)]);

      const auditAction = incidentConfigTab === "sla"
        ? "Updated SLA rules"
        : incidentConfigTab === "workingHours"
          ? "Updated working hours"
          : "Updated category setup";
      const auditDetails = incidentConfigTab === "sla"
        ? `Saved ${slaConfigs.length} SLA rule configuration(s).`
        : incidentConfigTab === "workingHours"
          ? `Saved ${workingHours.length} working hour configuration(s).`
          : `Saved category setup containing ${incidentCategories.length} categor${incidentCategories.length === 1 ? "y" : "ies"}.`;
      await logIncidentConfigAudit(auditAction, auditDetails, "IncidentConfig", incidentConfigTab);
      showToast("success", "Incident config saved", "SLA rules and working hours have been updated.");
      await loadIncidentConfig();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save incident configuration.";
      setIncidentConfigError(message);
      showToast("error", "Incident config save failed", message);
    } finally {
      setIncidentConfigSaving(false);
    }
  };


  const reloadIncidentCategories = async () => {
    const payload = await settingsIncidentConfig.getCategories();
    const rows = normalizeIncidentCategories(readArrayPayload<Record<string, unknown>>(payload));
    setIncidentCategories(rows);
    setSelectedIncidentCategoryId((current) => current && rows.some((category) => String(category.id) === current) ? current : String(rows[0]?.id ?? ""));
    setSelectedIncidentSubcategoryId((current) => {
      const nextCategory = rows.find((category) => String(category.id) === selectedIncidentCategoryId) || rows[0];
      return current && nextCategory?.subcategories.some((subcategory) => String(subcategory.id) === current) ? current : String(nextCategory?.subcategories[0]?.id ?? "");
    });
  };

  const runCategoryAction = async (
    key: string,
    action: () => Promise<void>,
    successTitle: string,
    successMessage: string,
    auditAction = successTitle,
    entityType = "IncidentCategorySetup",
    entityID: number | string = ""
  ) => {
    setCategorySavingKey(key);
    setIncidentConfigError("");
    try {
      await action();
      await logIncidentConfigAudit(auditAction, successMessage, entityType, entityID);
      await reloadIncidentCategories();
      showToast("success", successTitle, successMessage);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update category setup.";
      setIncidentConfigError(message);
      showToast("error", "Category setup failed", message);
    } finally {
      setCategorySavingKey("");
    }
  };

  const addIncidentCategory = () => {
    const name = newIncidentCategoryName.trim();
    if (!name) {
      showToast("warning", "Category name required", "Enter a category name before adding it.");
      return;
    }
    void runCategoryAction("category:add", async () => {
      await settingsIncidentConfig.createCategory({ name });
      setNewIncidentCategoryName("");
    }, "Category added", `${name} has been added.`, "Added incident category", "HD_IncidentCategories");
  };

  const updateIncidentCategory = (category: IncidentCategorySetupRow) => {
    const name = category.name.trim();
    if (!name) {
      showToast("warning", "Category name required", "Category name cannot be empty.");
      return;
    }
    void runCategoryAction(`category:${category.id}:save`, async () => {
      await settingsIncidentConfig.updateCategory(category.id, { name, isActive: category.isActive !== false } as never);
    }, "Category saved", `${name} has been saved.`, "Updated incident category", "EMA_IncidentCategories", category.id);
  };

  const deactivateIncidentCategory = (category: IncidentCategorySetupRow) => {
    const name = category.name.trim();
    if (!name) {
      showToast("warning", "Category name required", "Category name cannot be empty.");
      return;
    }
    void runCategoryAction(`category:${category.id}:deactivate`, async () => {
      await settingsIncidentConfig.updateCategory(category.id, { name, isActive: false } as never);
    }, "Category deactivated", `${name} has been hidden from new Service Desk tickets. Old tickets will keep their saved category.`, "Deactivated incident category", "EMA_IncidentCategories", category.id);
  };

  const requestDeleteIncidentCategory = (category: IncidentCategorySetupRow) => {
    setIncidentDeleteTarget({ kind: "category", category });
  };

  const confirmDeleteIncidentCategory = (category: IncidentCategorySetupRow) => {
    void runCategoryAction(`category:${category.id}:delete`, async () => {
      await settingsIncidentConfig.deleteCategory(category.id);
      setIncidentDeleteTarget(null);
    }, "Category deleted", `${category.name} has been removed.`, "Deleted incident category", "HD_IncidentCategories", category.id);
  };

  const addIncidentSubcategory = () => {
    const categoryId = selectedIncidentCategoryId;
    const name = newIncidentSubcategoryName.trim();
    if (!categoryId || !name) {
      showToast("warning", "Subcategory required", "Select a category and enter a subcategory name.");
      return;
    }
    void runCategoryAction(`category:${categoryId}:subcategory:add`, async () => {
      await settingsIncidentConfig.createSubcategory(categoryId, { name });
      setNewIncidentSubcategoryName("");
    }, "Subcategory added", `${name} has been added.`, "Added incident subcategory", "HD_IncidentSubcategories", categoryId);
  };

  const updateIncidentSubcategory = (_categoryId: number | string, subcategory: IncidentSubcategorySetupRow) => {
    const name = subcategory.name.trim();
    if (!name) {
      showToast("warning", "Subcategory name required", "Subcategory name cannot be empty.");
      return;
    }
    void runCategoryAction(`subcategory:${subcategory.id}:save`, async () => {
      await settingsIncidentConfig.updateSubcategory(subcategory.id, { name, isActive: subcategory.isActive !== false } as never);
    }, "Subcategory saved", `${name} has been saved.`, "Updated incident subcategory", "EMA_IncidentSubcategories", subcategory.id);
  };

  const deactivateIncidentSubcategory = (_categoryId: number | string, subcategory: IncidentSubcategorySetupRow) => {
    const name = subcategory.name.trim();
    if (!name) {
      showToast("warning", "Subcategory name required", "Subcategory name cannot be empty.");
      return;
    }
    void runCategoryAction(`subcategory:${subcategory.id}:deactivate`, async () => {
      await settingsIncidentConfig.updateSubcategory(subcategory.id, { name, isActive: false } as never);
    }, "Subcategory deactivated", `${name} has been hidden from new Service Desk tickets. Old tickets will keep their saved subcategory.`, "Deactivated incident subcategory", "EMA_IncidentSubcategories", subcategory.id);
  };

  const requestDeleteIncidentSubcategory = (categoryId: number | string, subcategory: IncidentSubcategorySetupRow) => {
    setIncidentDeleteTarget({ kind: "subcategory", categoryId, subcategory });
  };

  const confirmDeleteIncidentSubcategory = (categoryId: number | string, subcategory: IncidentSubcategorySetupRow) => {
    void runCategoryAction(`subcategory:${subcategory.id}:delete`, async () => {
      await settingsIncidentConfig.deleteSubcategory(subcategory.id);
      setIncidentDeleteTarget(null);
    }, "Subcategory deleted", `${subcategory.name} has been removed.`, "Deleted incident subcategory", "HD_IncidentSubcategories", subcategory.id);
  };

  const addIncidentDetail = () => {
    const subcategoryId = selectedIncidentSubcategoryId;
    const name = newIncidentDetailName.trim();
    if (!subcategoryId || !name) {
      showToast("warning", "Incident detail required", "Select a subcategory and enter an incident detail name.");
      return;
    }
    void runCategoryAction(`subcategory:${subcategoryId}:detail:add`, async () => {
      await settingsIncidentConfig.createDetail(subcategoryId, { name });
      setNewIncidentDetailName("");
    }, "Incident detail added", `${name} has been added.`, "Added incident detail", "HD_IncidentDetails", subcategoryId);
  };

  const updateIncidentDetail = (_categoryId: number | string, _subcategoryId: number | string, detail: IncidentDetailSetupRow) => {
    const name = detail.name.trim();
    if (!name) {
      showToast("warning", "Incident detail required", "Incident detail name cannot be empty.");
      return;
    }
    void runCategoryAction(`detail:${detail.id}:save`, async () => {
      await settingsIncidentConfig.updateDetail(detail.id, { name, isActive: detail.isActive !== false } as never);
    }, "Incident detail saved", `${name} has been saved.`, "Updated incident detail", "EMA_IncidentDetails", detail.id);
  };

  const deactivateIncidentDetail = (_categoryId: number | string, _subcategoryId: number | string, detail: IncidentDetailSetupRow) => {
    const name = detail.name.trim();
    if (!name) {
      showToast("warning", "Incident detail required", "Incident detail name cannot be empty.");
      return;
    }
    void runCategoryAction(`detail:${detail.id}:deactivate`, async () => {
      await settingsIncidentConfig.updateDetail(detail.id, { name, isActive: false } as never);
    }, "Incident detail deactivated", `${name} has been hidden from new Service Desk tickets. Old tickets will keep their saved problem detail.`, "Deactivated incident detail", "EMA_IncidentDetails", detail.id);
  };

  const requestDeleteIncidentDetail = (categoryId: number | string, subcategoryId: number | string, detail: IncidentDetailSetupRow) => {
    setIncidentDeleteTarget({ kind: "detail", categoryId, subcategoryId, detail });
  };

  const confirmDeleteIncidentDetail = (categoryId: number | string, subcategoryId: number | string, detail: IncidentDetailSetupRow) => {
    void runCategoryAction(`detail:${detail.id}:delete`, async () => {
      await settingsIncidentConfig.deleteDetail(detail.id);
      setIncidentDeleteTarget(null);
    }, "Incident detail deleted", `${detail.name} has been removed.`, "Deleted incident detail", "HD_IncidentDetails", detail.id);
  };

  const loadResourcePlanning = async () => {
    if (resourceLoading) return;

    setResourceLoading(true);
    setResourceError("");

    try {
      const [schedules, engineerPayload] = await Promise.all([
        settingsResourcePlanning.getSchedules() as Promise<ResourceSchedule[]>,
        settingsResourcePlanning.getEngineers() as Promise<ResourceEngineer[]>]);

      const engineers = engineerPayload.filter(isResourceSupportEngineer);

      setResourceSchedules(schedules);
      setResourceEngineers(engineers);
      setResourceLoaded(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load resource planning.";
      setResourceError(message);
      showToast("error", "Resource planning failed", message);
    } finally {
      setResourceLoading(false);
    }
  };

  const resetResourcePlanningForm = () => {
    setResourceForm(RESOURCE_EMPTY_FORM);
    setResourceEditingId(null);
    setResourceError("");
  };

  const editResourceSchedule = (row: ResourceSchedule) => {
    setResourceEditingId(getResourceScheduleId(row));
    setResourceForm({
      UserID: getResourceScheduleUserId(row),
      StartDate: String(row.StartDate || "").slice(0, 10),
      EndDate: String(row.EndDate || "").slice(0, 10),
      Status: getResourceScheduleStatus(row) || "On Leave",
      Remarks: getResourceScheduleRemarks(row)});
  };

  const saveResourceSchedule = async () => {
    if (!resourceForm.UserID) {
      showToast("warning", "Engineer required", "Please select an engineer before saving leave schedule.");
      return;
    }

    if (!resourceForm.StartDate || !resourceForm.EndDate) {
      showToast("warning", "Date required", "Please choose start date and end date.");
      return;
    }

    if (resourceForm.EndDate < resourceForm.StartDate) {
      showToast("warning", "Invalid date range", "End date cannot be earlier than start date.");
      return;
    }

    setResourceSaving(true);

    try {
      if (resourceEditingId) {
        await settingsResourcePlanning.update(resourceEditingId, resourceForm);
      } else {
        await settingsResourcePlanning.create(resourceForm);
      }

      showToast("success", "Resource planning saved", resourceEditingId ? "Engineer leave schedule updated." : "Engineer leave schedule created.");
      resetResourcePlanningForm();
      await loadResourcePlanning();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save engineer leave schedule.";
      showToast("error", "Save failed", message);
    } finally {
      setResourceSaving(false);
    }
  };

  const requestDeleteResourceSchedule = (row: ResourceSchedule) => {
    const scheduleId = getResourceScheduleId(row);
    if (!scheduleId) return;
    setResourceDeleteTarget({ row, scheduleId, engineerName: getResourceScheduleName(row) || "this engineer" });
  };

  const confirmDeleteResourceSchedule = async () => {
    if (!resourceDeleteTarget) return;

    const { scheduleId } = resourceDeleteTarget;
    setResourceSaving(true);

    try {
      await settingsResourcePlanning.remove(scheduleId);

      showToast("success", "Leave removed", "Engineer leave schedule removed.");
      setResourceDeleteTarget(null);
      if (resourceEditingId === scheduleId) resetResourcePlanningForm();
      await loadResourcePlanning();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to remove engineer leave schedule.";
      showToast("error", "Remove failed", message);
    } finally {
      setResourceSaving(false);
    }
  };





  useEffect(() => {
    // Load user and role records immediately when Settings opens so sidebar badges and
    // KPI values do not show stale/static config numbers.
    if (!usersLoaded && !usersLoading) void loadUsers();
    if (!rolesLoaded && !rolesLoading) void loadAccessRoles();
  }, [usersLoaded, usersLoading, rolesLoaded, rolesLoading]);

  useEffect(() => {
    if (activeSection !== "pricing") return;
    void loadPricingCategories();
    void loadDevicePricing();
  }, [activeSection]);


  useEffect(() => {
    if (activeSection !== "modules" || moduleLoaded || moduleLoading) return;
    void loadModuleAccess();
  }, [activeSection, moduleLoaded, moduleLoading]);

  useEffect(() => {
    if (activeSection !== "access" || accessPoliciesLoaded || accessPoliciesLoading) return;
    void loadAccessPolicies();
  }, [activeSection, accessPoliciesLoaded, accessPoliciesLoading]);

  useEffect(() => {
    if (activeSection !== "audit") return;
    setAuditPage(1);
  }, [activeSection, filteredContentTerm, auditModuleFilter, auditSeverityFilter, auditDateFilter]);

  useEffect(() => {
    if (activeSection !== "audit") return;

    const timer = window.setTimeout(() => {
      void loadAuditLogs(auditPage);
    }, filteredContentTerm ? 250 : 0);

    return () => window.clearTimeout(timer);
  }, [activeSection, auditPage, filteredContentTerm, auditModuleFilter, auditSeverityFilter, auditDateFilter]);

  useEffect(() => {
    if (activeSection !== "aging" || pcAgingLoaded || pcAgingLoading) return;
    void loadPcAgingRule();
  }, [activeSection, pcAgingLoaded, pcAgingLoading]);

  useEffect(() => {
    if (activeSection !== "policy" || managementPolicyLoaded || managementPolicyLoading) return;
    void loadManagementPolicy();
  }, [activeSection, managementPolicyLoaded, managementPolicyLoading]);

  useEffect(() => {
    if (activeSection !== "incident" || incidentConfigLoaded || incidentConfigLoading) return;
    void loadIncidentConfig();
  }, [activeSection, incidentConfigLoaded, incidentConfigLoading]);

  useEffect(() => {
    if (activeSection !== "resources" || resourceLoaded || resourceLoading) return;
    void loadResourcePlanning();
  }, [activeSection, resourceLoaded, resourceLoading]);

  const addActivity = (_title: string, _desc: string) => {
    // Right-side audit snapshot panel was removed from the Settings screen.
    // Keep this no-op so existing save/user/role handlers remain stable.
  };





  useEffect(() => {
    if (activeSection !== "incident") return;
    const selectedCategory = incidentCategories.find((category) => String(category.id) === selectedIncidentCategoryId);
    if (!selectedCategory) return;
    if (selectedIncidentSubcategoryId && selectedCategory.subcategories.some((subcategory) => String(subcategory.id) === selectedIncidentSubcategoryId)) return;
    setSelectedIncidentSubcategoryId(String(selectedCategory.subcategories[0]?.id ?? ""));
  }, [activeSection, incidentCategories, selectedIncidentCategoryId, selectedIncidentSubcategoryId]);

  const resetSection = () => {
    setSectionSearch("");

    if (activeSection === "users") {
      void loadUsers();
      return;
    }

    if (activeSection === "modules") {
      void loadModuleAccess();
      return;
    }

    if (activeSection === "access") {
      void loadAccessPolicies();
      return;
    }

    if (activeSection === "audit") {
      setAuditModuleFilter("all");
      setAuditSeverityFilter("all");
      setAuditDateFilter("30d");
      setAuditPage(1);
      void loadAuditLogs(1);
      return;
    }

    if (activeSection === "pricing") {
      void loadDevicePricing();
      return;
    }

    if (activeSection === "incident") {
      void loadIncidentConfig();
      return;
    }

    if (activeSection === "aging") {
      setPcAgingRule(DEFAULT_PC_AGING_RULE);
      setPcAgingError("");
      showToast("info", "Aging rule reset", "Default PC aging rule is ready. Click Save Changes to store it.");
      return;
    }

    if (activeSection === "policy") {
      setManagementPolicyValues(DEFAULT_MANAGEMENT_POLICY_VALUES);
      setManagementPolicyError("");
      showToast("info", "Management policy reset", "Default EMA management policy is ready. Click Save Policy to store it.");
      return;
    }

    if (activeSection === "resources") {
      resetResourcePlanningForm();
      void loadResourcePlanning();
      return;
    }
  };

  const saveSection = () => {
    if (activeSection === "audit") {
      void exportAuditLogs();
      return;
    }

    if (activeSection === "pricing") {
      void saveDevicePricing();
      return;
    }

    if (activeSection === "incident") {
      void saveIncidentConfig();
      return;
    }

    if (activeSection === "aging") {
      void savePcAgingRule();
      return;
    }

    if (activeSection === "policy") {
      void saveManagementPolicy();
      return;
    }

    if (activeSection === "resources") {
      void saveResourceSchedule();
      return;
    }

    addActivity(`Saved ${active.title}`, "Configuration saved to prototype audit log · just now");
  };

  const openUserModal = (index: number | null = null) => {
    setEditingUserIndex(index);
    if (index === null) {
      setUserForm(emptyUserForm);
    } else {
      setUserForm({ ...users[index], password: "", confirmPassword: "" });
    }
    setUserModalOpen(true);
  };

  const saveUserAccess = async () => {
    const selectedRoles = normalizeUserRoles(userForm.roles || userForm.role);
    const selectedRoleName = joinUserRoles(selectedRoles);

    if (selectedRoles.length === 0) {
      showToast("warning", "Role required", "Please assign at least one active role to this user.");
      return;
    }

    const passwordValue = String(userForm.password || "");
    const confirmPasswordValue = String(userForm.confirmPassword || "");
    const passwordProvided = passwordValue.trim().length > 0 || confirmPasswordValue.trim().length > 0;

    if (editingUserIndex === null && passwordValue.trim().length === 0) {
      showToast("warning", "Password required", "Create an initial password so this user can log in from EMA_Users.");
      return;
    }

    if (passwordProvided && passwordValue.length < 8) {
      showToast("warning", "Password too short", "Password must be at least 8 characters.");
      return;
    }

    if (passwordProvided && passwordValue !== confirmPasswordValue) {
      showToast("warning", "Password mismatch", "Password and confirm password must match.");
      return;
    }

    const nextUser: UserAccess = {
      ...userForm,
      name: userForm.name.trim() || "New User",
      fullName: userForm.name.trim() || userForm.fullName || "New User",
      username: String(userForm.username || "").trim(),
      email: userForm.email.trim(),
      role: selectedRoleName,
      roles: selectedRoles,
      roleName: selectedRoleName,
      status: userForm.accountLocked ? "Locked" : userForm.status,
      scope: userForm.scope,
      accessScope: userForm.scope,
      requireMFA: Boolean(userForm.requireMFA || userForm.mfa),
      mfa: Boolean(userForm.requireMFA || userForm.mfa),
      accountLocked: Boolean(userForm.accountLocked),
      department: userForm.department || "",
      position: userForm.position || "",
      phoneNo: userForm.phoneNo || "",
      lockReason: userForm.lockReason || "",
      accessStartDate: userForm.accessStartDate || null,
      accessEndDate: userForm.accessEndDate || null,
      remarks: userForm.remarks || ""};

    const payload = {
      username: nextUser.username,
      name: nextUser.name,
      fullName: nextUser.fullName || nextUser.name,
      email: nextUser.email,
      role: nextUser.role,
      roleName: nextUser.role,
      roles: selectedRoles,
      roleNames: selectedRoles,
      status: nextUser.status,
      scope: nextUser.scope,
      accessScope: nextUser.scope,
      department: nextUser.department || "",
      position: nextUser.position || "",
      phoneNo: nextUser.phoneNo || "",
      requireMFA: Boolean(nextUser.requireMFA || nextUser.mfa),
      mfa: Boolean(nextUser.requireMFA || nextUser.mfa),
      accountLocked: Boolean(nextUser.accountLocked),
      lockReason: nextUser.lockReason || "",
      accessStartDate: nextUser.accessStartDate || null,
      accessEndDate: nextUser.accessEndDate || null,
      remarks: nextUser.remarks || "",
      password: passwordProvided ? passwordValue : undefined};

    try {
      if (editingUserIndex === null) {
        const response = await settingsUsers.create(payload) as UserApiRow;
        const createdUser = mapUserApiRow(response || payload);
        setUsers((current) => sortUsersByCreatedDate([createdUser, ...current]));
        addActivity("Added user access", `${createdUser.name} · ${createdUser.role} · just now`);
        showToast("success", "User access added", `${createdUser.name} has been added.`);
      } else {
        const existingUser = users[editingUserIndex];
        const userId = existingUser?.id || existingUser?.userID;
        if (!userId) throw new Error("User ID is missing. Please reload the user list.");

        const { password, ...updatePayload } = payload;
        const response = await settingsUsers.update(userId, updatePayload) as UserApiRow;
        let updatedUser = mapUserApiRow(response || { ...existingUser, ...updatePayload });
        if (passwordProvided) {
          const resetResponse = await settingsUsers.resetPassword(userId, { password: passwordValue }) as UserApiRow;
          updatedUser = mapUserApiRow(resetResponse || updatedUser);
        }
        setUsers((current) => sortUsersByCreatedDate(current.map((user, index) => (index === editingUserIndex ? updatedUser : user))));
        addActivity("Updated user access", `${updatedUser.name} · ${updatedUser.role} · just now`);
        showToast("success", passwordProvided ? "User access and password updated" : "User access updated", passwordProvided ? `${updatedUser.name} has been updated and password has been reset.` : `${updatedUser.name} has been updated.`);
      }

      setUserModalOpen(false);
      setEditingUserIndex(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save user access.";
      showToast("error", "User access save failed", message);
    }
  };

  const requestDeleteUser = (index: number) => {
    const user = users[index];
    if (!user) return;
    setUserDeleteTarget({ user, index });
  };

  const confirmDeleteUser = async () => {
    if (!userDeleteTarget) return;
    const { user, index } = userDeleteTarget;

    try {
      const userId = user.id || user.userID;
      if (!userId) throw new Error("User ID is missing. Please reload the user list.");

      await settingsUsers.remove(userId);
      setUsers((current) => current.filter((item, itemIndex) => {
        const itemId = item.id || item.userID;
        if (itemId && userId) return String(itemId) !== String(userId);
        return itemIndex !== index;
      }));
      setUserDeleteTarget(null);
      addActivity("Deleted user access", `${user.name} permanently deleted from EMA_Users · just now`);
      showToast("success", "User deleted", `${user.name} has been deleted from EMA_Users.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete user access.";
      showToast("error", "User access delete failed", message);
    }
  };







  // Module Control by Role uses EMA_Roles from Role Based Control.
  // Roles are created in Role Based Control, then access is toggled here per module.


  useEffect(() => {
    document.documentElement.classList.add("ema-ui-page-active");
    document.body.classList.add("ema-ui-page-active");

    return () => {
      document.documentElement.classList.remove("ema-ui-page-active");
      document.body.classList.remove("ema-ui-page-active");
    };
  }, []);

  useEffect(() => {
    if (activeSection !== "roles") return;
    void loadAccessRoles();
  }, [activeSection]);

  const visibleUsers = users.filter((user) => !filteredContentTerm || `${user.name} ${user.username || ""} ${user.email} ${user.role} ${user.status}`.toLowerCase().includes(filteredContentTerm));

  return (
    <main className="ema-inner ema-screen" data-section={activeSection}>
      <input aria-hidden="true" id="globalSearch" type="hidden" />
      <button hidden id="themeBtn" type="button">
        <span id="themeLabel">Dark Mode</span>
      </button>

      <div className="ema-layout">
        <aside className="ema-side-panel">
          <div className="ema-side-head">
            <span>SETTINGS CENTER</span>
          </div>

          <div className="ema-menu" id="settingsMenu" role="tablist" aria-label="Settings navigation">
            {emaMenuGroups.map((group) => (
              <div className="ema-menu-group" key={group.label}>
                <div className="ema-menu-group-title">{group.label}</div>

                <div className="ema-menu-group-list">
                  {group.keys.map((key) => {
                    const item = sections[key];

                    return (
                      <button
                        key={key}
                        className={`ema-menu-item ${activeSection === key ? "active" : ""}`}
                        type="button"
                        data-section={key}
                        onClick={() => {
                          setActiveSection(key);
                          setSectionSearch("");
                        }}
                      >
                        <span className="ema-menu-icon">
                          <SettingsMenuIcon name={item.icon} />
                        </span>
                        <span className="ema-menu-text">
                          <strong>{item.title}</strong>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="ema-main-panel">
          <div className="ema-hero-shell">
            <div className="ema-hero-info">
              <span className="ema-eyebrow">ADMINISTRATION CONTROL</span>
              <h2 id="heroTitle">{activeHeroTitle}</h2>
              <p id="heroDesc">{activeHeroDesc}</p>
            </div>
            <div className="ema-score-grid">
              {emaHeroCards.map((card) => (
                <div className="ema-kpi-card" data-tone={card.tone} key={card.label}>
                  <span className={"ema-kpi-icon " + card.tone}>
                    <SettingsMenuIcon name={card.icon} />
                  </span>
                  <span className="ema-kpi-label">{card.label}</span>
                  <strong className="ema-kpi-value">{card.value}</strong>
                  <small className="ema-kpi-helper">{card.helper}</small>
                </div>
              ))}
            </div>
          </div>

          <div className="ema-settings-content-card">
            {false && (
              <div >
                {activeSection !== "audit" && (
                  <div>
                    <span  id="sectionTag">{active.tag}</span>
                    <h3 id="sectionTitle">{active.title}</h3>
                    <p id="sectionDesc">{active.desc}</p>
                  </div>
                )}
                <div >
                  {activeSection === "roles" ? (
                    <>
                      <button  type="button" onClick={loadAccessRoles} disabled={rolesLoading}>{rolesLoading ? "Loading..." : "Refresh"}</button>
                      <button type="button" onClick={() => openAccessRoleModal(null)}>Add Role</button>
                    </>
                  ) : activeSection === "audit" ? (
                    <button  type="button" onClick={exportAuditLogs} disabled={auditLoading || filteredAuditLogs.length === 0}>Export CSV</button>
                  ) : (
                    <>
                      <button  id="resetBtn" type="button" onClick={resetSection} disabled={(activeSection === "pricing" && pricingSaving) || (activeSection === "aging" && pcAgingSaving) || (activeSection === "policy" && managementPolicySaving) || (activeSection === "incident" && incidentConfigSaving)}>Reset</button>
                      {activeSection === "pricing" && (
                        <button  type="button" onClick={addPricingRow}>+ Add Custom Pricing</button>
                      )}
                      <button  id="saveBtn" type="button" onClick={saveSection} disabled={(activeSection === "pricing" && pricingSaving) || (activeSection === "aging" && pcAgingSaving) || (activeSection === "policy" && managementPolicySaving) || (activeSection === "incident" && incidentConfigSaving)}>
                        {activeSection === "pricing" ? (pricingSaving ? "Saving..." : "Save Pricing") : activeSection === "aging" ? (pcAgingSaving ? "Saving..." : "Save Changes") : activeSection === "incident" ? (incidentConfigSaving ? "Saving..." : "Save Incident Config") : activeSection === "policy" ? (managementPolicySaving ? "Saving..." : "Save Policy") : "Save Changes"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {activeSection !== "roles" && activeSection !== "users" && activeSection !== "access" && activeSection !== "audit" && activeSection !== "incident" && activeSection !== "aging" && activeSection !== "policy" && activeSection !== "resources" && activeSection !== "softwarePolicy" && activeSection !== "notifications" && (
              <div className="ema-settings-toolbar">
                <label className="ema-settings-search">
                  <SearchSvg />
                  <input
                    id="sectionSearch"
                    placeholder={activeSection === "users" ? "Search users by name, email or role..." : activeSection === "roles" ? "Search roles by name or description..." : activeSection === "modules" ? "Search modules by name or description..." : activeSection === "resources" ? "Search engineer, role, date or remarks..." : activeSection === "audit" ? "Search audit logs by user, module or action..." : "Search current settings..."}
                    value={sectionSearch}
                    onChange={(event) => setSectionSearch(event.target.value)}
                  />
                </label>
                {activeSection === "roles" && (
                  <div className="ema-settings-actions">
                    <button type="button" onClick={loadAccessRoles} disabled={rolesLoading}>{rolesLoading ? "Loading..." : "Refresh"}</button>
                    <button  type="button" onClick={() => openAccessRoleModal(null)}>Add Role</button>
                  </div>
                )}
                {activeSection === "modules" && (
                  <div className="ema-settings-actions">
                    <button  type="button" onClick={loadModuleAccess} disabled={moduleLoading}>{moduleLoading ? "Loading..." : "Refresh"}</button>
                  </div>
                )}
                {activeSection !== "users" && activeSection !== "roles" && activeSection !== "modules" && activeSection !== "audit" && activeSection !== "incident" && activeSection !== "softwarePolicy" && activeSection !== "resources" && (
                  <div >
                    <SettingSelect 
                      value="all"
                      options={[
                        { value: "all", label: "All Status" },
                        { value: "active", label: "Active" },
                        { value: "review", label: "Review" },
                        { value: "locked", label: "Locked" }]}
                      onChange={() => undefined}
                      ariaLabel="Section filter"
                    />

                    {(activeSection === "pricing" || activeSection === "aging" || activeSection === "policy") && (
                      <div >
                        <button  id="resetBtn" type="button" onClick={resetSection} disabled={(activeSection === "pricing" && pricingSaving) || (activeSection === "aging" && pcAgingSaving) || (activeSection === "policy" && managementPolicySaving) || (activeSection === "incident" && incidentConfigSaving)}>Reset</button>
                        {activeSection === "pricing" && (
                          <button  type="button" onClick={addPricingRow}>+ Add Custom Pricing</button>
                        )}
                        <button  id="saveBtn" type="button" onClick={saveSection} disabled={(activeSection === "pricing" && pricingSaving) || (activeSection === "aging" && pcAgingSaving) || (activeSection === "policy" && managementPolicySaving) || (activeSection === "incident" && incidentConfigSaving)}>
                          {activeSection === "pricing" ? (pricingSaving ? "Saving..." : "Save Pricing") : activeSection === "aging" ? (pcAgingSaving ? "Saving..." : "Save Changes") : activeSection === "incident" ? (incidentConfigSaving ? "Saving..." : "Save Incident Config") : activeSection === "policy" ? (managementPolicySaving ? "Saving..." : "Save Policy") : "Save Changes"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="ema-settings-content-body" id="contentBody">
              {activeSection === "roles" && <RoleContent roles={accessRoles} loading={rolesLoading} error={rolesError} search={sectionSearch} onSearchChange={setSectionSearch} onReload={loadAccessRoles} onAdd={() => openAccessRoleModal(null)} onEdit={openAccessRoleModal} onDelete={requestDeleteAccessRole} />}
              {activeSection === "users" && <UserAccessContent users={visibleUsers} sourceUsers={users} loading={usersLoading} error={usersError} search={sectionSearch} onSearchChange={setSectionSearch} onReload={loadUsers} onAdd={() => openUserModal(null)} onEdit={openUserModal} onDelete={requestDeleteUser} />}
              {activeSection === "modules" && <ModuleMatrixContent roles={accessRoles.filter((role) => role.status === "Active")} modules={moduleCatalog} permissions={modulePermissions} loading={moduleLoading} error={moduleError} search={filteredContentTerm} savingKey={moduleSavingKey} onReload={loadModuleAccess} onToggle={toggleRoleModuleAccess} />}
              {activeSection === "access" && <AccessControlContent policies={accessPolicies} loading={accessPoliciesLoading} error={accessPoliciesError} onReload={loadAccessPolicies} onAdd={() => openAccessPolicyModal(null)} onEdit={openAccessPolicyModal} />}
              {activeSection === "audit" && (
                <AuditContent
                  logs={filteredAuditLogs}
                  allLogs={auditLogs}
                  loading={auditLoading}
                  error={auditError}
                  moduleOptions={auditModuleOptions}
                  severityOptions={auditSeverityOptions}
                  moduleFilter={auditModuleFilter}
                  severityFilter={auditSeverityFilter}
                  dateFilter={auditDateFilter}
                  page={auditPage}
                  limit={auditLimit}
                  totalRecords={auditTotalRecords}
                  totalPages={auditTotalPages}
                  onModuleFilterChange={setAuditModuleFilter}
                  onSeverityFilterChange={setAuditSeverityFilter}
                  onDateFilterChange={setAuditDateFilter}
                  onPageChange={setAuditPage}
                  onReload={() => loadAuditLogs(auditPage)}
                  onExport={exportAuditLogs}
                  exporting={auditExporting}
                  exportDisabled={auditLoading || auditExporting || auditTotalRecords === 0}
                />
              )}
              {activeSection === "incident" && (
                <IncidentConfigContent
                  activeTab={incidentConfigTab}
                  meta={incidentConfigMeta}
                  slaRows={slaConfigs}
                  workingHours={workingHours}
                  categories={incidentCategories}
                  selectedCategoryId={selectedIncidentCategoryId}
                  selectedSubcategoryId={selectedIncidentSubcategoryId}
                  newCategoryName={newIncidentCategoryName}
                  newSubcategoryName={newIncidentSubcategoryName}
                  newDetailName={newIncidentDetailName}
                  categorySavingKey={categorySavingKey}
                  loading={incidentConfigLoading}
                  saving={incidentConfigSaving}
                  error={incidentConfigError}
                  onTabChange={setIncidentConfigTab}
                  onReload={loadIncidentConfig}
                  onSlaChange={updateSlaConfig}
                  onWorkingHourChange={updateWorkingHour}
                  onSelectCategory={(id) => {
                    setSelectedIncidentCategoryId(id);
                    const nextCategory = incidentCategories.find((category) => String(category.id) === id);
                    setSelectedIncidentSubcategoryId(String(nextCategory?.subcategories[0]?.id ?? ""));
                  }}
                  onSelectSubcategory={setSelectedIncidentSubcategoryId}
                  onNewCategoryNameChange={setNewIncidentCategoryName}
                  onNewSubcategoryNameChange={setNewIncidentSubcategoryName}
                  onNewDetailNameChange={setNewIncidentDetailName}
                  onCategoryNameChange={updateCategoryNameLocal}
                  onSubcategoryNameChange={updateSubcategoryNameLocal}
                  onDetailNameChange={updateDetailNameLocal}
                  onAddCategory={addIncidentCategory}
                  onUpdateCategory={updateIncidentCategory}
                  onDeactivateCategory={deactivateIncidentCategory}
                  onDeleteCategory={requestDeleteIncidentCategory}
                  onAddSubcategory={addIncidentSubcategory}
                  onUpdateSubcategory={updateIncidentSubcategory}
                  onDeactivateSubcategory={deactivateIncidentSubcategory}
                  onDeleteSubcategory={requestDeleteIncidentSubcategory}
                  onAddDetail={addIncidentDetail}
                  onUpdateDetail={updateIncidentDetail}
                  onDeactivateDetail={deactivateIncidentDetail}
                  onDeleteDetail={requestDeleteIncidentDetail}
                  onSave={saveIncidentConfig}
                />
              )}
              {activeSection === "pricing" && <PricingContent search={filteredContentTerm} rows={pricingRows} categoryOptions={categoryOptions} brandOptionsByCategory={brandOptionsByCategory} modelOptionsByKey={modelOptionsByKey} loading={pricingLoading} saving={pricingSaving} savingRowId={pricingRowSavingId} error={pricingError} onAdd={() => openUserModal(null)} onChange={updatePricingRow} onSaveRow={savePricingRow} onRequestDelete={requestDeletePricingRow} />}
              {activeSection === "aging" && (
                <AgingContent
                  rule={pcAgingRule}
                  loading={pcAgingLoading}
                  saving={pcAgingSaving}
                  error={pcAgingError}
                  onChange={(patch) => setPcAgingRule((current) => normalizePcAgingRule({ ...current, ...patch }))}
                  onReload={loadPcAgingRule}
                  onSave={savePcAgingRule}
                  onReset={resetSection}
                />
              )}
              {activeSection === "policy" && (
                <ManagementPolicyContent
                  values={managementPolicyValues}
                  profile={managementPolicyProfile}
                  loading={managementPolicyLoading}
                  saving={managementPolicySaving}
                  error={managementPolicyError}
                  onChange={(key, value) => setManagementPolicyValues((current) => normalizeManagementPolicyValues({ ...current, [key]: value }))}
                  onReload={loadManagementPolicy}
                  onReset={resetSection}
                  onSave={saveManagementPolicy}
                />
              )}
              {activeSection === "softwarePolicy" && <SoftwarePolicySettings />}
              {activeSection === "risk" && <RiskContent search={filteredContentTerm} />}
              {activeSection === "notifications" && <NotificationChannelsSettings />}
              {activeSection === "resources" && (
                <ResourcePlanningContent
                  search={filteredContentTerm}
                  engineers={resourceEngineers}
                  schedules={resourceSchedules}
                  form={resourceForm}
                  editingId={resourceEditingId}
                  loading={resourceLoading}
                  saving={resourceSaving}
                  error={resourceError}
                  onFormChange={(patch) => setResourceForm((current) => ({ ...current, ...patch }))}
                  onSave={saveResourceSchedule}
                  onEdit={openUserModal}
                  onDelete={requestDeleteUser}
                  onReset={resetResourcePlanningForm}
                  onReload={loadResourcePlanning}
                />
              )}
            </div>
          </div>
        </section>

      </div>

      <UserModal
        open={userModalOpen}
        mode={editingUserIndex === null ? "ADD NEW USER ACCESS" : "UPDATE USER ACCESS"}
        title={editingUserIndex === null ? "Add New User" : "Update User Access"}
        form={userForm}
        setForm={setUserForm}
        onClose={() => setUserModalOpen(false)}
        onSave={saveUserAccess}
        roleOptions={roleOptionsForUsers}
      />

      <AccessRoleModal
        open={accessRoleModalOpen}
        mode={editingAccessRoleIndex === null ? "ADD ROLE" : "UPDATE ROLE"}
        form={accessRoleForm}
        setForm={setAccessRoleForm}
        onClose={() => setAccessRoleModalOpen(false)}
        onSave={saveAccessRole}
      />

      <ConfirmDeleteRoleModal
        role={roleDeleteTarget?.role || null}
        onClose={() => setRoleDeleteTarget(null)}
        onConfirm={confirmDeleteAccessRole}
      />

      <AccessPolicyModal
        open={accessPolicyModalOpen}
        mode={editingAccessPolicyIndex === null ? "ADD ACCESS CONTROL" : "UPDATE ACCESS CONTROL"}
        title={editingAccessPolicyIndex === null ? "Add Access Control" : "Update Access Control"}
        form={accessPolicyForm}
        setForm={setAccessPolicyForm}
        onClose={() => setAccessPolicyModalOpen(false)}
        onSave={saveAccessPolicy}
      />

      <AccessPolicyDeleteConfirmModal
        target={accessPolicyDeleteTarget}
        onCancel={() => setAccessPolicyDeleteTarget(null)}
        onConfirm={confirmDeleteAccessPolicy}
      />

      <UserDeleteModal
        target={userDeleteTarget}
        onClose={() => setUserDeleteTarget(null)}
        onConfirm={confirmDeleteUser}
      />
      <PricingDeleteModal
        row={pricingDeleteTarget}
        loading={Boolean(pricingRowSavingId && pricingDeleteTarget?.id === pricingRowSavingId)}
        onClose={() => setPricingDeleteTarget(null)}
        onConfirm={confirmDeletePricingRow}
      />
      <IncidentConfigDeleteModal
        target={incidentDeleteTarget}
        loading={Boolean(categorySavingKey)}
        onClose={() => setIncidentDeleteTarget(null)}
        onConfirm={() => {
          if (!incidentDeleteTarget) return;
          if (incidentDeleteTarget.kind === "category") confirmDeleteIncidentCategory(incidentDeleteTarget.category);
          if (incidentDeleteTarget.kind === "subcategory") confirmDeleteIncidentSubcategory(incidentDeleteTarget.categoryId, incidentDeleteTarget.subcategory);
          if (incidentDeleteTarget.kind === "detail") confirmDeleteIncidentDetail(incidentDeleteTarget.categoryId, incidentDeleteTarget.subcategoryId, incidentDeleteTarget.detail);
        }}
      />
      <ResourceDeleteModal
        target={resourceDeleteTarget}
        loading={resourceSaving}
        onClose={() => setResourceDeleteTarget(null)}
        onConfirm={confirmDeleteResourceSchedule}
      />

      <SettingsToast toast={settingsToast} onClose={() => setSettingsToast(null)} />
</main>
  );
}


function IncidentConfigContent(props: IncidentConfigContentProps) {
  const {
    activeTab,
    meta,
    slaRows,
    workingHours,
    categories,
    selectedCategoryId,
    selectedSubcategoryId,
    newCategoryName,
    newSubcategoryName,
    newDetailName,
    categorySavingKey,
    loading,
    saving,
    error,
    onTabChange,
    onReload,
    onSlaChange,
    onWorkingHourChange,
    onSelectCategory,
    onSelectSubcategory,
    onNewCategoryNameChange,
    onNewSubcategoryNameChange,
    onNewDetailNameChange,
    onCategoryNameChange,
    onSubcategoryNameChange,
    onDetailNameChange,
    onAddCategory,
    onUpdateCategory,
    onDeactivateCategory,
    onDeleteCategory,
    onAddSubcategory,
    onUpdateSubcategory,
    onDeactivateSubcategory,
    onDeleteSubcategory,
    onAddDetail,
    onUpdateDetail,
    onDeactivateDetail,
    onDeleteDetail,
    onSave
  } = props;

  const selectedCategory = categories.find((category) => String(category.id) === selectedCategoryId) || categories[0];
  const selectedSubcategory = selectedCategory?.subcategories.find((subcategory) => String(subcategory.id) === selectedSubcategoryId) || selectedCategory?.subcategories[0];
  const categoryCounts = getIncidentCategoryCounts(categories);
  const categoriesDisabled = loading || Boolean(categorySavingKey);
  const enabledWorkingDays = workingHours.filter((row) => row.enabled).length;

  return (
    <div>
      <div>
        <div>
          <span>{meta.eyebrow}</span>
          <strong>{meta.commandTitle}</strong>
          <small>{meta.commandDescription}</small>
        </div>

        <div>
          <div><span>SLA Rules</span><strong>{slaRows.length}</strong></div>
          <div><span>Working Days</span><strong>{enabledWorkingDays}</strong></div>
          <div><span>Categories</span><strong>{categoryCounts.categoryCount}</strong></div>
          <div><span>Details</span><strong>{categoryCounts.detailCount}</strong></div>
        </div>

        <div>
          <button type="button" onClick={onReload} disabled={loading || saving || Boolean(categorySavingKey)}>
            {loading ? "Loading..." : "Refresh"}
          </button>
          <button type="button" onClick={onSave} disabled={activeTab === "sla" || loading || saving || Boolean(categorySavingKey)}>
            {activeTab === "sla" ? "Default Setting" : saving ? "Saving..." : meta.saveLabel}
          </button>
        </div>
      </div>

      {error && (
        <div>
          <strong>Incident Config load error</strong>
          <span>{error}</span>
        </div>
      )}

      <div>
        <button type="button" onClick={() => onTabChange("sla")}>SLA Rules</button>
        <button type="button" onClick={() => onTabChange("workingHours")}>Working Hours</button>
        <button type="button" onClick={() => onTabChange("categories")}>Category Setup</button>
      </div>

      <div>
        {activeTab === "sla" && (
          <section>
            <div>
              <div>
                <span>SLA Configuration</span>
                <strong>Priority-based SLA Rules</strong>
                <small>Resolution time is the main SLA due date source. Response time is stored for future first-response tracking.</small>
              </div>
            </div>

            <div>
              <div>
                <div>Priority</div>
                <div>Label</div>
                <div>Response Min</div>
                <div>Resolution Hrs</div>
                <div>Escalation Note</div>
              </div>

              {slaRows.map((row) => (
                <div key={String(row.id)}>
                  <div><span>{row.priority}</span></div>
                  <div><input value={row.label} readOnly disabled /></div>
                  <div><input value={row.responseTimeMin} readOnly disabled /></div>
                  <div><input value={row.resolutionTimeHrs} readOnly disabled /></div>
                  <div><textarea value={row.escalationPolicy} readOnly disabled /></div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === "workingHours" && (
          <section>
            <div>
              <div>
                <span>Working Hours</span>
                <strong>SLA Counting Window</strong>
                <small>SLA timer should only count inside enabled working days and configured time range.</small>
              </div>
            </div>

            <div>
              <div>
                <div>Day</div>
                <div>Status</div>
                <div>Start Time</div>
                <div>End Time</div>
                <div>Summary</div>
              </div>

              {workingHours.map((row) => (
                <div key={row.id}>
                  <div><span>{row.day}</span></div>
                  <div>
                    <select
                     
                      value={row.enabled ? "enabled" : "rest"}
                      onChange={(event) => onWorkingHourChange(row.id, { enabled: event.target.value === "enabled" })}
                      aria-label={`${row.day} working status`}
                    >
                      <option value="enabled">Enabled</option>
                      <option value="rest">Rest Day</option>
                    </select>
                  </div>
                  <div><input type="time" value={row.start} disabled={!row.enabled} onChange={(event) => onWorkingHourChange(row.id, { start: event.target.value })} /></div>
                  <div><input type="time" value={row.end} disabled={!row.enabled} onChange={(event) => onWorkingHourChange(row.id, { end: event.target.value })} /></div>
                  <div><span><span />{row.enabled ? "Working Day" : "Rest Day"}</span></div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === "categories" && (
          <section>
            <div>
              <div>
                <span>Category Setup</span>
                <strong>Incident Category Hierarchy</strong>
                <small>Maintain Category, Subcategory and Incident Detail options used by Service Desk.</small>
              </div>

              <div>
                <span><strong>{categoryCounts.categoryCount}</strong> Categories</span>
                <span><strong>{categoryCounts.subcategoryCount}</strong> Subcategories</span>
                <span><strong>{categoryCounts.detailCount}</strong> Details</span>
              </div>
            </div>

            <div>
              <aside>
                <div>
                  <input value={newCategoryName} onChange={(event) => onNewCategoryNameChange(event.target.value)} placeholder="New category name" disabled={categoriesDisabled} />
                  <button type="button" onClick={onAddCategory} disabled={categoriesDisabled || !newCategoryName.trim()}>
                    {categorySavingKey === "category:add" ? "Adding..." : "+ Add"}
                  </button>
                </div>

                <div>
                  {categories.length === 0 ? (
                    <div>No category yet. Add the first incident category.</div>
                  ) : categories.map((category) => (
                    <button
                     
                      key={String(category.id)}
                      type="button"
                      onClick={() => onSelectCategory(String(category.id))}
                    >
                      <span>{category.name || "Untitled Category"}</span>
                      <small>{category.subcategories.length} subcategories</small>
                    </button>
                  ))}
                </div>
              </aside>

              <div>
                {selectedCategory ? (
                  <>
                    <section>
                      <div>
                        <div><span>Category</span><strong>Edit Selected Category</strong></div>
                        <div>
                          <button type="button" onClick={() => onUpdateCategory(selectedCategory)} disabled={categoriesDisabled || !selectedCategory.name.trim()} title="Save category"><PencilSvg /></button>
                          <button type="button" onClick={() => onDeleteCategory(selectedCategory)} disabled={categoriesDisabled} title="Delete category"><TrashSvg /></button>
                        </div>
                      </div>
                      <input value={selectedCategory.name} onChange={(event) => onCategoryNameChange(selectedCategory.id, event.target.value)} placeholder="Category name" disabled={categoriesDisabled} />
                    </section>

                    <section>
                      <div>
                        <div><span>Subcategory</span><strong>Subcategories under {selectedCategory.name || "selected category"}</strong></div>
                      </div>

                      <div>
                        <input value={newSubcategoryName} onChange={(event) => onNewSubcategoryNameChange(event.target.value)} placeholder="New subcategory name" disabled={categoriesDisabled} />
                        <button type="button" onClick={onAddSubcategory} disabled={categoriesDisabled || !newSubcategoryName.trim()}>
                          {categorySavingKey === `category:${selectedCategory.id}:subcategory:add` ? "Adding..." : "+ Add Subcategory"}
                        </button>
                      </div>

                      <div>
                        {selectedCategory.subcategories.length === 0 ? (
                          <div>No subcategory yet for this category.</div>
                        ) : selectedCategory.subcategories.map((subcategory) => (
                          <div key={String(subcategory.id)}>
                            <button type="button" onClick={() => onSelectSubcategory(String(subcategory.id))}>
                              <strong>{subcategory.name || "Untitled Subcategory"}</strong>
                              <small>{subcategory.details.length} details</small>
                            </button>
                            <input value={subcategory.name} onChange={(event) => onSubcategoryNameChange(selectedCategory.id, subcategory.id, event.target.value)} disabled={categoriesDisabled} />
                            <div>
                              <button type="button" onClick={() => onUpdateSubcategory(selectedCategory.id, subcategory)} disabled={categoriesDisabled || !subcategory.name.trim()} title="Save subcategory"><PencilSvg /></button>
                              <button type="button" onClick={() => onDeleteSubcategory(selectedCategory.id, subcategory)} disabled={categoriesDisabled} title="Delete subcategory"><TrashSvg /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section>
                      <div>
                        <div><span>Incident Detail</span><strong>{selectedSubcategory ? `Details under ${selectedSubcategory.name}` : "Select a subcategory"}</strong></div>
                      </div>

                      {selectedSubcategory ? (
                        <>
                          <div>
                            <input value={newDetailName} onChange={(event) => onNewDetailNameChange(event.target.value)} placeholder="New incident detail" disabled={categoriesDisabled} />
                            <button type="button" onClick={onAddDetail} disabled={categoriesDisabled || !newDetailName.trim()}>
                              {categorySavingKey === `subcategory:${selectedSubcategory.id}:detail:add` ? "Adding..." : "+ Add Detail"}
                            </button>
                          </div>

                          <div>
                            {selectedSubcategory.details.length === 0 ? (
                              <div>No incident detail yet for this subcategory.</div>
                            ) : selectedSubcategory.details.map((detail) => (
                              <div key={String(detail.id)}>
                                <input value={detail.name} onChange={(event) => onDetailNameChange(selectedCategory.id, selectedSubcategory.id, detail.id, event.target.value)} disabled={categoriesDisabled} />
                                <div>
                                  <button type="button" onClick={() => onUpdateDetail(selectedCategory.id, selectedSubcategory.id, detail)} disabled={categoriesDisabled || !detail.name.trim()} title="Save detail"><PencilSvg /></button>
                                  <button type="button" onClick={() => onDeleteDetail(selectedCategory.id, selectedSubcategory.id, detail)} disabled={categoriesDisabled} title="Delete detail"><TrashSvg /></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div>Select or add a subcategory before adding incident details.</div>
                      )}
                    </section>
                  </>
                ) : (
                  <div>Add a category first to start configuring Service Desk category setup.</div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}


function ResourcePlanningContent(props: any) {
  const {
    search = "",
    supportEngineers: supportEngineersProp = [],
    engineers: engineersProp = [],
    schedules = [],
    form = {},
    editingId,
    loading,
    saving,
    error,
    onReload,
    onFormChange,
    onSave,
    onReset,
    onEdit,
    onDelete
  } = props;

  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortKey, setSortKey] = useState<"engineer" | "role" | "period" | "status" | "created">("created");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const resourceEngineerMap = new Map<string, any>();

  [...(Array.isArray(supportEngineersProp) ? supportEngineersProp : []), ...(Array.isArray(engineersProp) ? engineersProp : [])]
    .filter((engineer: any) => isResourceSupportEngineer(engineer))
    .forEach((engineer: any) => {
      const key = String(getResourceEngineerUserId(engineer) || engineer.UserID || engineer.id || getResourceEngineerName(engineer) || "").trim();
      if (key && !resourceEngineerMap.has(key)) resourceEngineerMap.set(key, engineer);
    });

  const supportEngineers = resourceEngineerMap.size
    ? Array.from(resourceEngineerMap.values())
    : [...(Array.isArray(supportEngineersProp) ? supportEngineersProp : []), ...(Array.isArray(engineersProp) ? engineersProp : [])];

  const query = String(search || "").trim().toLowerCase();

  const fallbackEngineers = schedules
    .map((row: any) => {
      const scheduleId = getResourceScheduleId(row);
      const name = getResourceScheduleName(row);
      const role = getResourceScheduleRole(row);
      const department = getResourceScheduleDepartment(row);

      return {
        UserID: row.UserID || row.userID || row.UserId || row.EngineerUserID || row.EngineerID || scheduleId || name,
        id: row.UserID || row.userID || row.UserId || row.EngineerUserID || row.EngineerID || scheduleId || name,
        username: name,
        name,
        fullName: name,
        role,
        RoleName: role,
        department,
        Department: department
      };
    })
    .filter((engineer: any) => String(engineer.UserID || engineer.id || engineer.name || "").trim());

  const engineerMap = new Map<string, any>();

  [...supportEngineers, ...fallbackEngineers].forEach((engineer: any) => {
    const key = String(getResourceEngineerUserId(engineer) || engineer.UserID || engineer.id || getResourceEngineerName(engineer) || "").trim();
    if (key && !engineerMap.has(key)) engineerMap.set(key, engineer);
  });

  const engineerOptionsList = Array.from(engineerMap.values());

  const selectedEngineer = engineerOptionsList.find((engineer: any) => {
    return String(getResourceEngineerUserId(engineer) || engineer.UserID || engineer.id || getResourceEngineerName(engineer)) === String(form.UserID || "");
  });

  const selectedRole = selectedEngineer ? getResourceEngineerRole(selectedEngineer) : "";

  const statusOptions = Array.from(new Set(
    schedules.map((row: any) => getResourceScheduleStatus(row)).filter(Boolean)
  )).sort().map((status) => ({ value: String(status), label: String(status) }));

  const roleOptions = Array.from(new Set([
    ...supportEngineers.map((engineer: any) => getResourceEngineerRole(engineer)).filter(Boolean),
    ...schedules.map((row: any) => getResourceScheduleRole(row)).filter(Boolean)
  ])).sort().map((role) => ({ value: String(role), label: String(role) }));

  const filteredSchedules = schedules.filter((row: any) => {
    const status = getResourceScheduleStatus(row);
    const role = getResourceScheduleRole(row);

    if (statusFilter !== "all" && status !== statusFilter) return false;
    if (roleFilter !== "all" && role !== roleFilter) return false;

    const haystack = [
      getResourceScheduleName(row),
      getResourceScheduleDepartment(row),
      getResourceScheduleRole(row),
      getResourceScheduleStatus(row),
      getResourceScheduleRemarks(row),
      row.StartDate,
      row.EndDate,
      row.createdAt
    ].join(" ").toLowerCase();

    return !query || haystack.includes(query);
  });

  const sortedSchedules = [...filteredSchedules].sort((left: any, right: any) => {
    const direction = sortDirection === "asc" ? 1 : -1;

    if (sortKey === "created") {
      return (getCreatedSortValue(left) - getCreatedSortValue(right)) * direction;
    }

    if (sortKey === "period") {
      return (getPeriodSortValue(left) - getPeriodSortValue(right)) * direction;
    }

    const leftValue =
      sortKey === "engineer"
        ? getResourceScheduleName(left)
        : sortKey === "role"
          ? getResourceScheduleRole(left)
          : getResourceScheduleStatus(left);

    const rightValue =
      sortKey === "engineer"
        ? getResourceScheduleName(right)
        : sortKey === "role"
          ? getResourceScheduleRole(right)
          : getResourceScheduleStatus(right);

    return String(leftValue || "").localeCompare(String(rightValue || "")) * direction;
  });

  const totalPages = Math.max(1, Math.ceil(sortedSchedules.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedSchedules = sortedSchedules.slice(pageStartIndex, pageStartIndex + pageSize);
  const showingFrom = sortedSchedules.length ? pageStartIndex + 1 : 0;
  const showingTo = Math.min(pageStartIndex + paginatedSchedules.length, sortedSchedules.length);

  const activeSchedules = schedules.filter((row: any) => {
    const status = String(getResourceScheduleStatus(row) || "").toLowerCase();
    return status.includes("leave") || status.includes("training") || status.includes("site") || status.includes("unavailable");
  }).length;

  const filterActive = statusFilter !== "all" || roleFilter !== "all";

  useEffect(() => {
    setCurrentPage(1);
  }, [query, statusFilter, roleFilter, sortKey, sortDirection, schedules.length]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const updateSort = (nextSortKey: "engineer" | "role" | "period" | "status" | "created") => {
    if (sortKey === nextSortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection(nextSortKey === "created" || nextSortKey === "period" ? "desc" : "asc");
  };

  const sortIndicator = (targetKey: "engineer" | "role" | "period" | "status" | "created") => {
    if (sortKey !== targetKey) return "?";
    return sortDirection === "asc" ? "?" : "?";
  };

  const resetTableFilters = () => {
    setStatusFilter("all");
    setRoleFilter("all");
    setSortKey("created");
    setSortDirection("desc");
    setCurrentPage(1);
  };

  return (
    <div>
      <div>
        <div>
          <span>Resource Planning</span>
          <strong>Engineer Leave & Assignment Visibility</strong>
          <small>Manage engineer leave using EMA users. Service Desk assignment will warn when an engineer is on leave.</small>
        </div>

        <div>
          <div><span>Engineers</span><strong>{engineerOptionsList.length}</strong></div>
          <div><span>Schedules</span><strong>{schedules.length}</strong></div>
          <div><span>Active</span><strong>{activeSchedules}</strong></div>
          <div><span>Filtered</span><strong>{sortedSchedules.length}</strong></div>
        </div>

        <div>
          <button type="button" onClick={onReload} disabled={loading || saving}>
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div>
          <strong>Resource Planning load error</strong>
          <span>{error}</span>
        </div>
      )}

      <div>
        <section>
          <div>
            <div>
              <span>{editingId ? "Update Schedule" : "New Schedule"}</span>
              <strong>{editingId ? "Edit Engineer Leave" : "Add Engineer Leave"}</strong>
              <small>Leave only creates a warning. It does not block ticket assignment.</small>
            </div>
          </div>

          <div>
            <label>
              <span>Engineer</span>
              <select
                value={form.UserID || ""}
                onChange={(event) => onFormChange({ UserID: event.target.value })}
                aria-label="Resource planning engineer"
              >
                <option value="">Select support engineer</option>
                {engineerOptionsList.map((engineer: any) => {
                  const userId = getResourceEngineerUserId(engineer) || engineer.UserID || engineer.id || getResourceEngineerName(engineer);
                  const engineerRole = getResourceEngineerRole(engineer);
                  const department = getResourceEngineerDepartment(engineer);
                  const label = String(getResourceEngineerName(engineer) || "Unknown engineer") + " ? " + String(engineerRole || "Support") + (department ? " ? " + department : "");

                  return <option key={String(userId)} value={String(userId)}>{label}</option>;
                })}
              </select>
            </label>

            <label>
              <span>Leave Status</span>
              <select
                value={form.Status || "On Leave"}
                onChange={(event) => onFormChange({ Status: event.target.value })}
                aria-label="Resource planning leave status"
              >
                <option value="On Leave">On Leave</option>
                <option value="Training">Training</option>
                <option value="On Site">On Site</option>
                <option value="Unavailable">Unavailable</option>
              </select>
            </label>

            <label>
              <span>Start Date</span>
              <input
                type="date"
                value={form.StartDate || ""}
                onChange={(event) => onFormChange({ StartDate: event.target.value })}
              />
            </label>

            <label>
              <span>End Date</span>
              <input
                type="date"
                value={form.EndDate || ""}
                onChange={(event) => onFormChange({ EndDate: event.target.value })}
              />
            </label>

            <label>
              <span>Remarks</span>
              <textarea
                value={form.Remarks || ""}
                onChange={(event) => onFormChange({ Remarks: event.target.value })}
                placeholder="Example: Annual leave / site visit / training day"
              />
            </label>
          </div>

          {selectedEngineer && (
            <div>
              <div>
                <strong>{getResourceEngineerName(selectedEngineer)}</strong>
                <span>{selectedRole || "Support"}{getResourceEngineerDepartment(selectedEngineer) ? " ? " + getResourceEngineerDepartment(selectedEngineer) : ""}</span>
              </div>
            </div>
          )}

          <div>
            <button type="button" onClick={onReset} disabled={saving}>Clear</button>
            <button type="button" onClick={onSave} disabled={saving || loading}>
              {saving ? "Saving..." : editingId ? "Update Leave" : "Add Leave"}
            </button>
          </div>
        </section>

        <section>
          <div>
            <div>
              <span>Schedules</span>
              <strong>Active & Upcoming Leave</strong>
              <small>Latest leave schedules are shown first. Click a table title to sort.</small>
            </div>

            <div>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter leave status">
                <option value="all">All statuses</option>
                {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>

              <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} aria-label="Filter support role">
                <option value="all">All roles</option>
                {roleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>

              {filterActive && <button type="button" onClick={resetTableFilters}>Reset</button>}
            </div>
          </div>

          <div>
            <div>
              <button type="button" onClick={() => updateSort("engineer")}>Engineer <span>{sortIndicator("engineer")}</span></button>
              <button type="button" onClick={() => updateSort("role")}>Role <span>{sortIndicator("role")}</span></button>
              <button type="button" onClick={() => updateSort("period")}>Period <span>{sortIndicator("period")}</span></button>
              <button type="button" onClick={() => updateSort("status")}>Status <span>{sortIndicator("status")}</span></button>
              <div>Remarks</div>
              <div>Action</div>
            </div>

            {loading && <div>Loading resource planning...</div>}
            {!loading && sortedSchedules.length === 0 && <div>No engineer leave schedule found.</div>}

            {!loading && paginatedSchedules.map((row: any) => {
              const scheduleId = getResourceScheduleId(row);
              const status = getResourceScheduleStatus(row);

              return (
                <div key={scheduleId || String(getResourceScheduleName(row)) + "-" + String(row.StartDate) + "-" + String(row.EndDate)}>
                  <div>
                    <strong>{getResourceScheduleName(row) || "Unknown engineer"}</strong>
                    <small>{getResourceScheduleDepartment(row) || "No department"}</small>
                  </div>

                  <div><span>{getResourceScheduleRole(row) || "Support"}</span></div>

                  <div>
                    <strong>{String(row.StartDate || "").slice(0, 10)}</strong>
                    <small>to {String(row.EndDate || "").slice(0, 10)}</small>
                  </div>

                  <div><span>{status}</span></div>

                  <div><span>{getResourceScheduleRemarks(row) || "-"}</span></div>

                  <div>
                    <div>
                      <button type="button" onClick={() => onEdit(row)} aria-label="Edit leave schedule" title="Edit">
                        <PencilSvg />
                      </button>
                      <button type="button" onClick={() => onDelete(row)} aria-label="Delete leave schedule" title="Delete">
                        <TrashSvg />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {!loading && sortedSchedules.length > 0 && (
            <div>
              <div>Showing {showingFrom} to {showingTo} of {sortedSchedules.length} leave records</div>

              <div aria-label="Resource planning pagination">
                <button type="button" onClick={() => setCurrentPage(1)} disabled={safeCurrentPage === 1} aria-label="First page"><EmaPageFirstIcon /></button>
                <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={safeCurrentPage === 1} aria-label="Previous page"><EmaPagePrevIcon /></button>
                <span>{safeCurrentPage}</span>
                <button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={safeCurrentPage === totalPages} aria-label="Next page"><EmaPageNextIcon /></button>
                <button type="button" onClick={() => setCurrentPage(totalPages)} disabled={safeCurrentPage === totalPages} aria-label="Last page"><EmaPageLastIcon /></button>
              </div>

              <div>{pageSize} / page</div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}


/* SETTINGS_V2_ROLE_HELPERS_START */
function getSettingsRolePageSize() {
  if (typeof window === "undefined") return 8;
  const height = window.innerHeight || 900;

  if (height < 760) return 6;
  if (height < 900) return 8;
  if (height < 1080) return 10;
  return 12;
}

function getSettingsRoleTone(role: AccessRole, index: number) {
  const name = String(role.name || "").toLowerCase();
  if (name.includes("super")) return "purple";
  if (name.includes("client")) return "blue";
  if (name.includes("dashboard")) return "indigo";
  if (name.includes("guest")) return "gray";
  if (name.includes("operation")) return "green";
  if (name.includes("l1")) return "sky";
  if (name.includes("l2")) return "blue";
  if (name.includes("l3")) return "purple";
  return ["purple", "blue", "indigo", "green"][index % 4];
}

function EmaPageFirstIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M18 6l-6 6 6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 6l-6 6 6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EmaPagePrevIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EmaPageNextIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EmaPageLastIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l6 6-6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 6l6 6-6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}


function SettingsRoleIcon() {
  return <UsersRound size={14} strokeWidth={2.35} />;
}


function RoleContent({
  roles,
  loading,
  error,
  search,
  onSearchChange,
  onReload,
  onAdd,
  onEdit,
  onDelete,
}: {
  roles: AccessRole[];
  loading: boolean;
  error: string;
  search: string;
  onSearchChange: (value: string) => void;
  onReload: () => void;
  onAdd: () => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
}) {
  const pageSize = 10;
  const roleGrid = "64px minmax(360px, 1fr) 140px 110px";
  const [currentPage, setCurrentPage] = useState(1);

  const filteredRows = roles.filter((role) => {
    const term = search.trim().toLowerCase();
    const haystack = [role.name, role.description, role.status, role.type, role.defaultAccess].join(" ").toLowerCase();
    return !term || haystack.includes(term);
  });

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const start = (safePage - 1) * pageSize;
  const rows = filteredRows.slice(start, start + pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, roles.length]);

  const getActualIndex = (role: AccessRole) => {
    const roleId = role.id || role.roleID;

    if (roleId !== undefined && roleId !== null) {
      const found = roles.findIndex((item) => String(item.id || item.roleID) === String(roleId));
      if (found >= 0) return found;
    }

    const byKey = roles.findIndex((item) => String(item.roleKey || item.name) === String(role.roleKey || role.name));
    return byKey >= 0 ? byKey : roles.indexOf(role);
  };

  return (
    <section className="ema-settings-table">

          <style>{`
            .ema-settings-table {
              width: 100% !important;
              height: auto !important;
              min-height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              display: block !important;
              position: relative !important;
              border: 1px solid #d9e5f5 !important;
              border-radius: 16px !important;
              background: #fff !important;
              overflow: hidden !important;
            }
            .ema-settings-table .ema-data-toolbar {
              width: 100% !important;
              min-height: 66px !important;
              height: 66px !important;
              margin: 0 !important;
              padding: 0 16px !important;
              display: flex !important;
              align-items: center !important;
              justify-content: space-between !important;
              gap: 12px !important;
              border: 0 !important;
              border-bottom: 1px solid #d9e5f5 !important;
              border-radius: 0 !important;
              background: #fff !important;
              position: relative !important;
              top: auto !important;
              bottom: auto !important;
              transform: none !important;
              z-index: 2 !important;
            }
            .ema-settings-table .ema-data-search {
              width: min(420px, 42vw) !important;
              height: 42px !important;
              margin: 0 !important;
            }
            .ema-settings-table .ema-data-actions {
              margin-left: auto !important;
              display: flex !important;
              align-items: center !important;
              justify-content: flex-end !important;
              gap: 10px !important;
            }
            .ema-settings-table .ema-data-actions select,
            .ema-settings-table .ema-data-actions button {
              height: 38px !important;
            }
            .ema-settings-table .ema-data-card {
              width: 100% !important;
              height: auto !important;
              min-height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              display: grid !important;
              grid-template-rows: 48px minmax(0, auto) 64px !important;
              align-content: start !important;
              border: 0 !important;
              border-radius: 0 !important;
              background: #fff !important;
              overflow: hidden !important;
              position: relative !important;
              top: auto !important;
              bottom: auto !important;
              transform: none !important;
              z-index: 1 !important;
            }
            .ema-settings-table .ema-data-head {
              height: 48px !important;
              min-height: 48px !important;
              display: grid !important;
              align-items: center !important;
              border-bottom: 1px solid #d9e5f5 !important;
              background: #fbfdff !important;
            }
            .ema-settings-table .ema-data-body {
              min-height: 0 !important;
              height: auto !important;
              max-height: calc(100vh - 430px) !important;
              display: block !important;
              overflow-y: auto !important;
              overflow-x: hidden !important;
              background: #fff !important;
              position: relative !important;
              top: auto !important;
              bottom: auto !important;
              transform: none !important;
            }
            .ema-settings-table .ema-data-row {
              height: 58px !important;
              min-height: 58px !important;
              display: grid !important;
              align-items: center !important;
              border-bottom: 1px solid #d9e5f5 !important;
              background: #fff !important;
            }
            .ema-settings-table .ema-data-footer {
              height: 64px !important;
              min-height: 64px !important;
              padding: 0 16px !important;
              display: grid !important;
              grid-template-columns: minmax(0, 1fr) auto auto !important;
              align-items: center !important;
              gap: 14px !important;
              border-top: 1px solid #d9e5f5 !important;
              background: #fff !important;
            }
            .ema-settings-table .ema-pagination-controls,
            .ema-settings-table .ema-row-actions {
              display: flex !important;
              align-items: center !important;
              gap: 8px !important;
            }
            .ema-settings-table .ema-row-actions { justify-content: flex-end !important; }
            .ema-settings-table .ema-page-btn,
            .ema-settings-table .ema-page-current,
            .ema-settings-table .ema-action-btn {
              width: 34px !important;
              height: 34px !important;
              border-radius: 10px !important;
            }
          `}</style>
      <div className="ema-data-toolbar">
        <label className="ema-data-search">
          <SearchSvg />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search roles by name or description..."
          />
        </label>

        <div className="ema-data-actions">
          <button type="button" onClick={onReload} disabled={loading}>{loading ? "Loading..." : "Refresh"}</button>
          <button type="button" onClick={onAdd}>Add Role</button>
        </div>
      </div>

      {error && (
        <div className="ema-settings-alert">
          <strong>Role load error</strong>
          <span>{error}</span>
        </div>
      )}

      <div className="ema-data-card">
        <div className="ema-data-head" style={{ gridTemplateColumns: roleGrid }}>
          <div>No.</div>
          <div>Role</div>
          <div>Status</div>
          <div>Action</div>
        </div>

        <div className="ema-data-body">
          {loading && <div className="ema-data-empty">Loading role records...</div>}
          {!loading && filteredRows.length === 0 && <div className="ema-data-empty">No role record found.</div>}

          {!loading && rows.map((role, index) => {
            const actualIndex = getActualIndex(role);
            const protectedRole = isProtectedSuperAdminRole(role);
            const tone = role.status === "Inactive" || role.status === "Locked" ? "inactive" : role.status === "Review" ? "required" : "active";

            return (
              <div className="ema-data-row" style={{ gridTemplateColumns: roleGrid }} key={String(role.id || role.roleID || role.roleKey || role.name) + "-" + actualIndex}>
                <div><span className="ema-data-no">{String(start + index + 1).padStart(2, "0")}</span></div>
                <div>
                  <div className="ema-data-profile">
                    <i>{initials(role.name || "R")}</i>
                    <div>
                      <strong>{role.name || "Unnamed Role"}</strong>
                      <small>{role.description || "No description set"}</small>
                    </div>
                  </div>
                </div>
                <div>
                  <span className={"ema-data-pill " + tone}>
                    <span className="ema-data-pill-dot" />
                    {role.status || "Active"}
                  </span>
                </div>
                <div>
                  <div className="ema-row-actions">
                    <button className="ema-action-btn ema-action-btn-edit" type="button" onClick={() => onEdit(actualIndex)} disabled={protectedRole} title={protectedRole ? "Super Admin role is protected" : "Edit"}><PencilSvg /></button>
                    <button className="ema-action-btn ema-action-btn-delete" type="button" onClick={() => onDelete(actualIndex)} disabled={protectedRole} title={protectedRole ? "Super Admin role is protected" : "Delete"}><TrashSvg /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!loading && filteredRows.length > 0 && (
          <footer className="ema-data-footer">
            <div className="ema-pagination-summary">Showing {filteredRows.length ? start + 1 : 0} to {Math.min(start + rows.length, filteredRows.length)} of {filteredRows.length} roles</div>
            <div className="ema-pagination-controls">
              <button className="ema-page-btn" type="button" onClick={() => setCurrentPage(1)} disabled={safePage === 1}><EmaPageFirstIcon /></button>
              <button className="ema-page-btn" type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={safePage === 1}><EmaPagePrevIcon /></button>
              <span className="ema-page-current">{safePage}</span>
              <button className="ema-page-btn" type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={safePage === totalPages}><EmaPageNextIcon /></button>
              <button className="ema-page-btn" type="button" onClick={() => setCurrentPage(totalPages)} disabled={safePage === totalPages}><EmaPageLastIcon /></button>
            </div>
            <div className="ema-page-size">{pageSize} / page</div>
          </footer>
        )}
      </div>
    </section>
  );
}

function UserAccessContent({
  users,
  sourceUsers,
  loading,
  error,
  search,
  onSearchChange,
  onReload,
  onAdd,
  onEdit,
  onDelete,
}: {
  users: UserAccess[];
  sourceUsers: UserAccess[];
  loading: boolean;
  error: string;
  search: string;
  onSearchChange: (value: string) => void;
  onReload: () => void;
  onAdd: () => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
}) {
  const pageSize = 10;
  const userGrid = "64px minmax(260px, 1.2fr) minmax(220px, 1fr) 92px 120px 170px 110px";
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [currentPage, setCurrentPage] = useState(1);

  const roleOptions = Array.from(new Set(sourceUsers.flatMap((user) => normalizeUserRoles(user.roles || user.role || user.roleName)))).filter(Boolean).sort();

  const getDisplayStatus = (user: UserAccess) => {
    if (user.accountLocked || user.status === "Locked") return "Locked";
    return user.status || (user.isActive === false ? "Inactive" : "Active");
  };

  const filteredRows = users.filter((user) => {
    const roles = normalizeUserRoles(user.roles || user.role || user.roleName);
    const status = getDisplayStatus(user);
    const term = search.trim().toLowerCase();
    const haystack = [user.name, user.username, user.email, roles.join(" "), status].join(" ").toLowerCase();
    return (!term || haystack.includes(term)) && (statusFilter === "All Status" || status === statusFilter) && (roleFilter === "All Roles" || hasUserRole(user, roleFilter));
  });

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const start = (safePage - 1) * pageSize;
  const rows = filteredRows.slice(start, start + pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, roleFilter, search, users.length]);

  const getActualIndex = (user: UserAccess) => {
    const userId = user.id || user.userID;
    if (userId !== undefined && userId !== null) {
      const found = sourceUsers.findIndex((item) => String(item.id || item.userID) === String(userId));
      if (found >= 0) return found;
    }
    const byEmail = sourceUsers.findIndex((item) => String(item.email || "").toLowerCase() === String(user.email || "").toLowerCase());
    return byEmail >= 0 ? byEmail : sourceUsers.indexOf(user);
  };

  return (
    <section className="ema-settings-table">

          <style>{`
            .ema-settings-table {
              width: 100% !important;
              height: auto !important;
              min-height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              display: block !important;
              position: relative !important;
              border: 1px solid #d9e5f5 !important;
              border-radius: 16px !important;
              background: #fff !important;
              overflow: hidden !important;
            }
            .ema-settings-table .ema-data-toolbar {
              width: 100% !important;
              min-height: 66px !important;
              height: 66px !important;
              margin: 0 !important;
              padding: 0 16px !important;
              display: flex !important;
              align-items: center !important;
              justify-content: space-between !important;
              gap: 12px !important;
              border: 0 !important;
              border-bottom: 1px solid #d9e5f5 !important;
              border-radius: 0 !important;
              background: #fff !important;
              position: relative !important;
              top: auto !important;
              bottom: auto !important;
              transform: none !important;
              z-index: 2 !important;
            }
            .ema-settings-table .ema-data-search {
              width: min(420px, 42vw) !important;
              height: 42px !important;
              margin: 0 !important;
            }
            .ema-settings-table .ema-data-actions {
              margin-left: auto !important;
              display: flex !important;
              align-items: center !important;
              justify-content: flex-end !important;
              gap: 10px !important;
            }
            .ema-settings-table .ema-data-actions select,
            .ema-settings-table .ema-data-actions button {
              height: 38px !important;
            }
            .ema-settings-table .ema-data-card {
              width: 100% !important;
              height: auto !important;
              min-height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              display: grid !important;
              grid-template-rows: 48px minmax(0, auto) 64px !important;
              align-content: start !important;
              border: 0 !important;
              border-radius: 0 !important;
              background: #fff !important;
              overflow: hidden !important;
              position: relative !important;
              top: auto !important;
              bottom: auto !important;
              transform: none !important;
              z-index: 1 !important;
            }
            .ema-settings-table .ema-data-head {
              height: 48px !important;
              min-height: 48px !important;
              display: grid !important;
              align-items: center !important;
              border-bottom: 1px solid #d9e5f5 !important;
              background: #fbfdff !important;
            }
            .ema-settings-table .ema-data-body {
              min-height: 0 !important;
              height: auto !important;
              max-height: calc(100vh - 430px) !important;
              display: block !important;
              overflow-y: auto !important;
              overflow-x: hidden !important;
              background: #fff !important;
              position: relative !important;
              top: auto !important;
              bottom: auto !important;
              transform: none !important;
            }
            .ema-settings-table .ema-data-row {
              height: 58px !important;
              min-height: 58px !important;
              display: grid !important;
              align-items: center !important;
              border-bottom: 1px solid #d9e5f5 !important;
              background: #fff !important;
            }
            .ema-settings-table .ema-data-footer {
              height: 64px !important;
              min-height: 64px !important;
              padding: 0 16px !important;
              display: grid !important;
              grid-template-columns: minmax(0, 1fr) auto auto !important;
              align-items: center !important;
              gap: 14px !important;
              border-top: 1px solid #d9e5f5 !important;
              background: #fff !important;
            }
            .ema-settings-table .ema-pagination-controls,
            .ema-settings-table .ema-row-actions {
              display: flex !important;
              align-items: center !important;
              gap: 8px !important;
            }
            .ema-settings-table .ema-row-actions { justify-content: flex-end !important; }
            .ema-settings-table .ema-page-btn,
            .ema-settings-table .ema-page-current,
            .ema-settings-table .ema-action-btn {
              width: 34px !important;
              height: 34px !important;
              border-radius: 10px !important;
            }
          `}</style>
      <div className="ema-data-toolbar">
        <label className="ema-data-search">
          <SearchSvg />
          <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search users by username, email or role..." />
        </label>
        <div className="ema-data-actions">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option>All Status</option>
            <option>Active</option>
            <option>Review</option>
            <option>Locked</option>
            <option>Inactive</option>
          </select>
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            <option>All Roles</option>
            {roleOptions.map((role) => <option key={role}>{role}</option>)}
          </select>
          <button type="button" onClick={onReload} disabled={loading}>{loading ? "Loading..." : "Refresh"}</button>
          <button type="button" onClick={onAdd}>Add New User</button>
        </div>
      </div>

      {error && (<div className="ema-settings-alert"><strong>User access load error</strong><span>{error}</span></div>)}

      <div className="ema-data-card">
        <div className="ema-data-head" style={{ gridTemplateColumns: userGrid }}>
          <div>No.</div><div>User</div><div>Roles</div><div>MFA</div><div>Status</div><div>Last Login</div><div>Action</div>
        </div>
        <div className="ema-data-body">
          {loading && <div className="ema-data-empty">Loading user access records...</div>}
          {!loading && filteredRows.length === 0 && <div className="ema-data-empty">No user access record found.</div>}
          {!loading && rows.map((user, index) => {
            const actualIndex = getActualIndex(user);
            const roles = normalizeUserRoles(user.roles || user.role || user.roleName);
            const visibleRoles = roles.slice(0, 2);
            const hiddenRoleCount = Math.max(roles.length - visibleRoles.length, 0);
            const status = getDisplayStatus(user);
            const tone = String(status).toLowerCase().includes("inactive") || String(status).toLowerCase().includes("locked") ? "inactive" : String(status).toLowerCase().includes("review") ? "required" : "active";
            const isMfa = Boolean(user.requireMFA || user.mfa);
            return (
              <div className="ema-data-row" style={{ gridTemplateColumns: userGrid }} key={String(user.id || user.userID || user.email) + "-" + actualIndex}>
                <div><span className="ema-data-no">{String(start + index + 1).padStart(2, "0")}</span></div>
                <div><div className="ema-data-profile"><i>{initials(user.name || user.username || user.email || "U")}</i><div><strong>{user.name || user.username || "Unnamed User"}</strong><small>{user.email || user.username || "No email set"}</small></div></div></div>
                <div><div className="ema-data-chip-list">{visibleRoles.length === 0 && <span className="ema-data-pill standard">No Role</span>}{visibleRoles.map((role) => <span className="ema-data-pill" key={role}>{role}</span>)}{hiddenRoleCount > 0 && <span className="ema-data-pill standard">+{hiddenRoleCount}</span>}</div></div>
                <div><span className={"ema-data-pill " + (isMfa ? "active" : "standard")}>{isMfa ? "On" : "Off"}</span></div>
                <div><span className={"ema-data-pill " + tone}><span className="ema-data-pill-dot" />{status}</span></div>
                <div><span className="ema-data-date">{formatUserDate(user.lastLoginAt)}</span></div>
                <div><div className="ema-row-actions"><button className="ema-action-btn ema-action-btn-edit" type="button" onClick={() => onEdit(actualIndex)} title="Edit"><PencilSvg /></button><button className="ema-action-btn ema-action-btn-delete" type="button" onClick={() => onDelete(actualIndex)} title="Delete"><TrashSvg /></button></div></div>
              </div>
            );
          })}
        </div>
        {!loading && filteredRows.length > 0 && (
          <footer className="ema-data-footer">
            <div className="ema-pagination-summary">Showing {filteredRows.length ? start + 1 : 0} to {Math.min(start + rows.length, filteredRows.length)} of {filteredRows.length} users</div>
            <div className="ema-pagination-controls"><button className="ema-page-btn" type="button" onClick={() => setCurrentPage(1)} disabled={safePage === 1}><EmaPageFirstIcon /></button><button className="ema-page-btn" type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={safePage === 1}><EmaPagePrevIcon /></button><span className="ema-page-current">{safePage}</span><button className="ema-page-btn" type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={safePage === totalPages}><EmaPageNextIcon /></button><button className="ema-page-btn" type="button" onClick={() => setCurrentPage(totalPages)} disabled={safePage === totalPages}><EmaPageLastIcon /></button></div>
            <div className="ema-page-size">{pageSize} / page</div>
          </footer>
        )}
      </div>
    </section>
  );
}

function ModuleMatrixContent({ roles, modules, permissions, loading, error, search, savingKey, onReload, onToggle }: { roles: AccessRole[]; modules: ModuleControlModule[]; permissions: ModulePermission[]; loading: boolean; error: string; search: string; savingKey: string; onReload: () => void; onToggle: (module: ModuleControlModule, role: AccessRole) => void }) {
  const getPageSize = () => {
    if (typeof window === "undefined") return 8;
    const height = window.innerHeight || 900;
    if (height < 760) return 6;
    if (height < 900) return 8;
    if (height < 1080) return 10;
    return 12;
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(getPageSize);

  useEffect(() => {
    const syncPageSize = () => setPageSize(getPageSize());
    syncPageSize();
    window.addEventListener("resize", syncPageSize);
    return () => window.removeEventListener("resize", syncPageSize);
  }, []);

  const term = search.trim().toLowerCase();

  const sortedModules = [...modules].sort((a, b) => {
    const aOrder = Number(a.sortOrder || 0);
    const bOrder = Number(b.sortOrder || 0);
    return aOrder - bOrder || String(a.moduleName || "").localeCompare(String(b.moduleName || ""));
  });

  const moduleById = new Map(sortedModules.map((module) => [String(getModuleId(module)), module]));
  const childrenByParent = new Map<string, ModuleControlModule[]>();

  sortedModules.forEach((module) => {
    const parentId = module.parentModuleID == null ? "" : String(module.parentModuleID);
    if (parentId && parentId !== "0" && moduleById.has(parentId)) {
      const list = childrenByParent.get(parentId) || [];
      list.push(module);
      childrenByParent.set(parentId, list);
    }
  });

  const getGroupName = (module: ModuleControlModule) => {
    const parentId = module.parentModuleID == null ? "" : String(module.parentModuleID);
    const parent = parentId && parentId !== "0" ? moduleById.get(parentId) : null;
    if (parent) return parent.moduleName;
    const moduleId = String(getModuleId(module));
    if (childrenByParent.has(moduleId)) return module.moduleName;
    return module.category || "Other Modules";
  };

  const getGroupOrder = (module: ModuleControlModule) => {
    const parentId = module.parentModuleID == null ? "" : String(module.parentModuleID);
    const parent = parentId && parentId !== "0" ? moduleById.get(parentId) : null;
    return Number(parent?.sortOrder ?? module.sortOrder ?? 0) || 0;
  };

  const moduleMatches = (module: ModuleControlModule) => {
    const parent = moduleById.get(String(module.parentModuleID ?? ""));
    const haystack = `${module.moduleName} ${module.description} ${module.category || ""} ${module.routePath || ""} ${parent?.moduleName || ""}`.toLowerCase();
    return !term || haystack.includes(term);
  };

  const grouped = new Map<string, { groupName: string; order: number; modules: ModuleControlModule[] }>();

  sortedModules.forEach((module) => {
    const groupName = getGroupName(module);
    const key = groupName.toLowerCase();
    const current = grouped.get(key) || { groupName, order: getGroupOrder(module), modules: [] };
    current.order = Math.min(current.order, getGroupOrder(module));
    current.modules.push(module);
    grouped.set(key, current);
  });

  const groupedRows = Array.from(grouped.values())
    .sort((a, b) => a.order - b.order || a.groupName.localeCompare(b.groupName))
    .flatMap((group) => {
      const groupMatches = !term || group.groupName.toLowerCase().includes(term);
      const visibleModules = group.modules.filter((module) => groupMatches || moduleMatches(module));
      if (visibleModules.length === 0) return [] as Array<{ type: "group"; groupName: string } | { type: "module"; module: ModuleControlModule; isSubmodule: boolean }>;

      return [
        { type: "group" as const, groupName: group.groupName },
        ...visibleModules.map((module) => ({
          type: "module" as const,
          module,
          isSubmodule: Boolean(module.parentModuleID && String(module.parentModuleID) !== "0" && moduleById.has(String(module.parentModuleID))) || group.groupName !== module.moduleName
        }))
      ];
    });

  const moduleRows = groupedRows.filter((row) => row.type === "module");
  const totalPages = Math.max(1, Math.ceil(moduleRows.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartModuleIndex = (safeCurrentPage - 1) * pageSize;
  const pageEndModuleIndex = pageStartModuleIndex + pageSize;

  let moduleCounter = 0;
  let displayCounter = 0;
  const pageRows = groupedRows.filter((row) => {
    if (row.type === "group") {
      return true;
    }

    const include = moduleCounter >= pageStartModuleIndex && moduleCounter < pageEndModuleIndex;
    moduleCounter += 1;
    return include;
  }).filter((row, index, arr) => {
    if (row.type === "module") return true;
    return arr[index + 1]?.type === "module";
  });

  const showingFrom = moduleRows.length ? pageStartModuleIndex + 1 : 0;
  const showingTo = Math.min(pageEndModuleIndex, moduleRows.length);
  const roleCount = Math.max(roles.length, 1);
  const matrixStyle = { "--module-role-count": roleCount } as CSSProperties;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, modules.length, roles.length]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const enabledCount = modules.reduce((total, module) => {
    return total + roles.reduce((roleTotal, role) => roleTotal + (hasModulePermission(permissions, module, role) ? 1 : 0), 0);
  }, 0);

  const totalPossible = modules.length * Math.max(roles.length, 1);
  const coverage = totalPossible ? Math.round((enabledCount / totalPossible) * 100) : 0;

  return (
    <div className="settings-v2-module-content">
      <div className="settings-v2-module-toolbar">
        <div className="settings-v2-module-info">
          <strong>Module Permission Matrix</strong>
          <span>Turn module and submodule access on or off for each active role.</span>
        </div>

        <div className="settings-v2-module-stats">
          <div><span>Modules</span><strong>{modules.length}</strong></div>
          <div><span>Roles</span><strong>{roles.length}</strong></div>
          <div><span>Coverage</span><strong>{coverage}%</strong></div>
        </div>

        <button type="button" onClick={onReload} disabled={loading}>{loading ? "Loading..." : "Refresh"}</button>
      </div>

      {error && (
        <div className="settings-v2-alert">
          <strong>Module access load error</strong>
          <span>{error}</span>
        </div>
      )}

      <div className="settings-v2-module-matrix" style={matrixStyle}>
        <div className="settings-v2-module-head">
          <div>No</div>
          <div>Module</div>
          {roles.length > 0 ? roles.map((role) => (
            <div className="settings-v2-module-role-head" key={String(getAccessRoleId(role))}>
              <span>{role.name}</span>
            </div>
          )) : <div className="settings-v2-module-role-head"><span>Roles</span></div>}
        </div>

        {loading && <div className="settings-v2-loading">Loading module access from EMA_Modules...</div>}
        {!loading && moduleRows.length === 0 && <div className="settings-v2-empty">No module records found.</div>}
        {!loading && roles.length === 0 && moduleRows.length > 0 && <div className="settings-v2-empty">No active roles found. Create active roles in Role Based Control first.</div>}

        {!loading && roles.length > 0 && pageRows.map((row) => {
          if (row.type === "group") {
            return (
              <div className="settings-v2-module-group" key={`group-${row.groupName}`}>
                <span>{row.groupName}</span>
              </div>
            );
          }

          displayCounter += 1;
          const module = row.module;
          const rowNumber = pageStartModuleIndex + displayCounter;

          return (
            <div className={`settings-v2-module-row ${row.isSubmodule ? "submodule" : ""}`} key={String(getModuleId(module))}>
              <div><span className="settings-v2-row-no">{String(rowNumber).padStart(2, "0")}</span></div>

              <div>
                <div className="settings-v2-module-name">
                  <i>{row.isSubmodule ? "S" : "M"}</i>
                  <div>
                    <strong>{module.moduleName}</strong>
                    <small>{module.description || module.routePath || (row.isSubmodule ? "Submodule" : "Main module")}</small>
                  </div>
                </div>
              </div>

              {roles.map((role) => {
                const moduleId = String(getModuleId(module));
                const roleId = String(getAccessRoleId(role));
                const key = `${moduleId}:${roleId}`;
                const enabled = hasModulePermission(permissions, module, role);

                return (
                  <div className="settings-v2-module-toggle-cell" key={key}>
                    <button
                      className={`settings-v2-module-toggle ${enabled ? "enabled" : "disabled"}`}
                      type="button"
                      disabled={savingKey === key}
                      title={`${enabled ? "Disable" : "Enable"} ${module.moduleName} for ${role.name}`}
                      aria-label={`${enabled ? "Disable" : "Enable"} ${module.moduleName} for ${role.name}`}
                      onClick={() => onToggle(module, role)}
                    >
                      <span />
                      <b>{enabled ? "On" : "Off"}</b>
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {!loading && moduleRows.length > 0 && (
        <div className="ema-pagination">
          <div className="ema-pagination-summary">Showing {showingFrom} to {showingTo} of {moduleRows.length} modules</div>

          <div className="ema-pagination-controls" aria-label="Module control pagination">
            <button className="ema-page-btn" type="button" onClick={() => setCurrentPage(1)} disabled={safeCurrentPage === 1} aria-label="First page"><EmaPageFirstIcon /></button>
            <button className="ema-page-btn" type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={safeCurrentPage === 1} aria-label="Previous page"><EmaPagePrevIcon /></button>
            <span className="ema-page-current">{safeCurrentPage}</span>
            <button className="ema-page-btn" type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={safeCurrentPage === totalPages} aria-label="Next page"><EmaPageNextIcon /></button>
            <button className="ema-page-btn" type="button" onClick={() => setCurrentPage(totalPages)} disabled={safeCurrentPage === totalPages} aria-label="Last page"><EmaPageLastIcon /></button>
          </div>

          <div className="ema-page-size">{pageSize} / page</div>
        </div>
      )}
    </div>
  );
}



function AccessControlContent({ policies, loading, error, onReload, onAdd, onEdit }: { policies: AccessPolicy[]; loading: boolean; error: string; onReload: () => void; onAdd: () => void; onEdit: (index: number) => void }) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filteredPolicies = policies;
  const totalPages = Math.max(1, Math.ceil(filteredPolicies.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedPolicies = filteredPolicies.slice(pageStartIndex, pageStartIndex + pageSize);
  const showingFrom = filteredPolicies.length ? pageStartIndex + 1 : 0;
  const showingTo = Math.min(pageStartIndex + paginatedPolicies.length, filteredPolicies.length);

  const activeCount = policies.filter((policy) => String(policy.status || "").toLowerCase() === "active").length;
  const mfaCount = policies.filter((policy) => {
    const haystack = `${policy.name} ${policy.description} ${policy.enforcement} ${policy.scope}`.toLowerCase();
    return haystack.includes("mfa") || haystack.includes("multi") || haystack.includes("factor");
  }).length;

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const getPolicyTone = (policy: AccessPolicy) => {
    const text = `${policy.name} ${policy.enforcement} ${policy.scope}`.toLowerCase();

    if (text.includes("mfa") || text.includes("factor")) return "purple";
    if (text.includes("session") || text.includes("timeout")) return "blue";
    if (text.includes("ip") || text.includes("vpn") || text.includes("network")) return "green";
    if (text.includes("approval")) return "orange";
    return "slate";
  };

  const getStatusTone = (status: string) => {
    const value = String(status || "").toLowerCase();
    if (value.includes("inactive")) return "inactive";
    if (value.includes("review")) return "review";
    if (value.includes("draft")) return "draft";
    return "active";
  };

  return (
    <div>
      <div>
        <div>
          <strong>Access Control Rules</strong>
          <span>Manage MFA, session, IP/VPN and approval enforcement rules from EMA_AccessControls.</span>
        </div>

        <div>
          <div><span>Total Policies</span><strong>{policies.length}</strong></div>
          <div><span>Active</span><strong>{activeCount}</strong></div>
          <div><span>MFA Rules</span><strong>{mfaCount}</strong></div>
        </div>

        <div>
          <button type="button" onClick={onReload} disabled={loading}>{loading ? "Loading..." : "Refresh"}</button>
          <button type="button" onClick={onAdd}>Add Control</button>
        </div>
      </div>

      {error && (
        <div>
          <strong>Access control load error</strong>
          <span>{error}</span>
        </div>
      )}

      <div>
        <div>
          <div>No</div>
          <div>Control</div>
          <div>Scope</div>
          <div>Enforcement</div>
          <div>Review</div>
          <div>Status</div>
          <div>Action</div>
        </div>

        {loading && <div>Loading access controls from EMA_AccessControls...</div>}
        {!loading && filteredPolicies.length === 0 && <div>No access control records found.</div>}

        {!loading && paginatedPolicies.map((policy, index) => {
          const actualIndex = policies.findIndex((item) => String(getAccessPolicyId(item)) === String(getAccessPolicyId(policy)));
          const tone = getPolicyTone(policy);
          const statusTone = getStatusTone(policy.status);

          return (
            <div key={String(getAccessPolicyId(policy))}>
              <div><span>{String(pageStartIndex + index + 1).padStart(2, "0")}</span></div>

              <div>
                <div>
                  <i>{String(policy.name || "A").slice(0, 2).toUpperCase()}</i>
                  <div>
                    <strong>{policy.name}</strong>
                    <small>{policy.description || "Access control policy"}</small>
                  </div>
                </div>
              </div>

              <div><span>{policy.scope || "Global"}</span></div>
              <div><span>{policy.enforcement || "Standard"}</span></div>
              <div><span>{policy.reviewCycle || "Monthly"}</span></div>

              <div>
                <span>
                  <span />
                  {policy.status || "Active"}
                </span>
              </div>

              <div>
                <div>
                  <button type="button" onClick={() => onEdit(actualIndex)} aria-label="Edit access control" title="Edit">
                    <PencilSvg />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!loading && filteredPolicies.length > 0 && (
        <div>
          <div>Showing {showingFrom} to {showingTo} of {filteredPolicies.length} access controls</div>

          <div aria-label="Access control pagination">
            <button type="button" onClick={() => setCurrentPage(1)} disabled={safeCurrentPage === 1} aria-label="First page"><EmaPageFirstIcon /></button>
            <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={safeCurrentPage === 1} aria-label="Previous page"><EmaPagePrevIcon /></button>
            <span>{safeCurrentPage}</span>
            <button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={safeCurrentPage === totalPages} aria-label="Next page"><EmaPageNextIcon /></button>
            <button type="button" onClick={() => setCurrentPage(totalPages)} disabled={safeCurrentPage === totalPages} aria-label="Last page"><EmaPageLastIcon /></button>
          </div>

          <div>{pageSize} / page</div>
        </div>
      )}
    </div>
  );
}


function AuditContent(props: any) {
  const {
    logs,
    allLogs,
    loading,
    error,
    moduleOptions,
    severityOptions,
    moduleFilter,
    severityFilter,
    dateFilter,
    page,
    limit,
    totalRecords,
    totalPages,
    onModuleFilterChange,
    onSeverityFilterChange,
    onDateFilterChange,
    onPageChange,
    onReload,
    onExport,
    exporting,
    exportDisabled
  } = props;

  const safeTotalPages = Math.max(1, totalPages || 1);
  const safePage = Math.min(Math.max(1, page || 1), safeTotalPages);
  const startIndex = (safePage - 1) * limit;
  const pageRows = logs || [];
  const shownStart = totalRecords > 0 && pageRows.length ? startIndex + 1 : 0;
  const shownEnd = totalRecords > 0 ? Math.min(startIndex + pageRows.length, totalRecords) : 0;

  const getSeverityTone = (value: string) => {
    const text = String(value || "").toLowerCase();
    if (text.includes("success") || text.includes("active") || text.includes("completed")) return "active";
    if (text.includes("fail") || text.includes("error") || text.includes("delete")) return "danger";
    if (text.includes("warn") || text.includes("review")) return "review";
    return "draft";
  };

  const latestDate = allLogs?.[0] ? formatAuditTimestamp(allLogs[0].timestamp).split(",")[0] : "-";

  return (
    <div>
      <div>
        <div>
          <span>Audit Log</span>
          <h3>System Activity Trail</h3>
          <p>Review user activity, module changes and system events recorded in EMA_AuditLogs.</p>
        </div>

        <div>
          <div><span>Total Logs</span><strong>{totalRecords}</strong></div>
          <div><span>This Page</span><strong>{pageRows.length}</strong></div>
          <div><span>Modules</span><strong>{moduleOptions.length}</strong></div>
          <div><span>Latest</span><strong>{latestDate}</strong></div>
        </div>

        <div>
          <button type="button" onClick={onReload} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
          <button type="button" onClick={() => void onExport()} disabled={exportDisabled || loading || exporting}>
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
        </div>
      </div>

      {error && (
        <div>
          <strong>Audit log load error</strong>
          <span>{error}</span>
        </div>
      )}

      <div>
        <label>
          <span>Main Module</span>
          <select value={moduleFilter} onChange={(event) => onModuleFilterChange(event.target.value)}>
            <option value="all">All modules</option>
            {moduleOptions.map((moduleName: string) => (
              <option key={moduleName} value={moduleName}>{moduleName}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Severity / Status</span>
          <select value={severityFilter} onChange={(event) => onSeverityFilterChange(event.target.value)}>
            <option value="all">All statuses</option>
            {severityOptions.map((severity: string) => (
              <option key={severity} value={severity}>{severity}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Date Range</span>
          <select value={dateFilter} onChange={(event) => onDateFilterChange(event.target.value)}>
            <option value="30d">Last 30 days</option>
            <option value="7d">Last 7 days</option>
            <option value="today">Today</option>
            <option value="all">All time</option>
          </select>
        </label>
      </div>

      <div>
        <div>
          <div>No</div>
          <div>Time</div>
          <div>User</div>
          <div>Module</div>
          <div>Activity</div>
          <div>Status</div>
        </div>

        {loading && <div>Loading audit logs from EMA_AuditLogs...</div>}
        {!loading && pageRows.length === 0 && <div>No audit log records found.</div>}

        {!loading && pageRows.map((row: any, index: number) => {
          const tone = getSeverityTone(row.severity);

          return (
            <div key={String(row.id || `${row.timestamp}-${row.user}-${row.action}-${index}`)}>
              <div><span>{String(startIndex + index + 1).padStart(2, "0")}</span></div>

              <div>
                <span>{formatAuditTimestamp(row.timestamp)}</span>
              </div>

              <div>
                <span>{row.user || "-"}</span>
              </div>

              <div>
                <span>{row.module || "-"}</span>
              </div>

              <div>
                <div>
                  <span>{row.action || "-"}</span>
                  {row.details && <small>{formatAuditDetails(row.details)}</small>}
                </div>
              </div>

              <div>
                <span>
                  <span />
                  {row.severity || "Info"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <div>Showing {shownStart} to {shownEnd} of {totalRecords} audit logs</div>

        <div aria-label="Audit log pagination">
          <button type="button" disabled={safePage <= 1 || loading} onClick={() => onPageChange(1)} aria-label="First page"><EmaPageFirstIcon /></button>
          <button type="button" disabled={safePage <= 1 || loading} onClick={() => onPageChange(Math.max(1, safePage - 1))} aria-label="Previous page"><EmaPagePrevIcon /></button>
          <span>{safePage}</span>
          <button type="button" disabled={safePage >= safeTotalPages || loading} onClick={() => onPageChange(Math.min(safeTotalPages, safePage + 1))} aria-label="Next page"><EmaPageNextIcon /></button>
          <button type="button" disabled={safePage >= safeTotalPages || loading} onClick={() => onPageChange(safeTotalPages)} aria-label="Last page"><EmaPageLastIcon /></button>
        </div>

        <div>{limit} / page</div>
      </div>
    </div>
  );
}


function PricingContent(props: PricingContentProps) {
  const {
    search,
    rows,
    categoryOptions,
    brandOptionsByCategory,
    modelOptionsByKey,
    loading,
    saving,
    savingRowId,
    error,
    onAdd,
    onChange,
    onSaveRow,
    onRequestDelete
  } = props;

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const term = search.trim().toLowerCase();

  const visibleRows = rows.filter((row) => {
    const haystack = `${row.Category} ${row.Brand} ${row.Model} ${row.Price} ${row.IsExcluded ? "excluded" : "capex"}`.toLowerCase();
    return !term || haystack.includes(term);
  });

  const totalPages = Math.max(1, Math.ceil(visibleRows.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedRows = visibleRows.slice(pageStartIndex, pageStartIndex + pageSize);
  const showingFrom = visibleRows.length ? pageStartIndex + 1 : 0;
  const showingTo = Math.min(pageStartIndex + paginatedRows.length, visibleRows.length);

  const excludedCount = rows.filter((row) => row.IsExcluded).length;
  const activeCount = Math.max(0, rows.length - excludedCount);
  const averagePrice = rows.length
    ? Math.round(rows.reduce((total, row) => total + (Number(row.Price) || 0), 0) / rows.length)
    : 0;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, rows.length]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const formatMoney = (value: number) => {
    const safe = Number(value) || 0;
    return safe.toLocaleString("en-MY", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  return (
    <div>
      <div>
        <div>
          <span>Device Pricing</span>
          <strong>Brand & Model Pricing Control</strong>
          <small>Maintain replacement price references used by Management Dashboard CAPEX estimation.</small>
        </div>

        <div>
          <div><span>Total Rules</span><strong>{rows.length}</strong></div>
          <div><span>CAPEX Active</span><strong>{activeCount}</strong></div>
          <div><span>Excluded</span><strong>{excludedCount}</strong></div>
          <div><span>Average RM</span><strong>{formatMoney(averagePrice)}</strong></div>
        </div>

        <div>
          <button type="button" onClick={onAdd} disabled={loading || saving}>+ Add Pricing</button>
        </div>
      </div>

      {error && (
        <div>
          <strong>Device pricing load error</strong>
          <span>{error}</span>
        </div>
      )}

      <div>
        <div>
          <span>Planning Reference</span>
          <p>Market price and replacement-cost values are estimates. Confirm final procurement values with Finance or Procurement before approval.</p>
        </div>
      </div>

      <div>
        <div>
          <div>No</div>
          <div>Device Category</div>
          <div>Brand</div>
          <div>Model</div>
          <div>Market Price</div>
          <div>CAPEX</div>
          <div>Action</div>
        </div>

        {loading && <div>Loading device pricing...</div>}

        {!loading && visibleRows.length === 0 && (
          <div>
            <strong>No pricing rules found.</strong>
            <span>Add a custom pricing row, select category, brand and model, then save pricing.</span>
            <button type="button" onClick={onAdd}>+ Add Custom Pricing</button>
          </div>
        )}

        {!loading && paginatedRows.map((row, index) => {
          const brandOptions = brandOptionsByCategory[row.Category] || [];
          const modelOptions = modelOptionsByKey[pricingModelKey(row.Category, row.Brand)] || [];
          const rowSaving = saving || savingRowId === row.id;

          return (
            <div key={row.id}>
              <div><span>{String(pageStartIndex + index + 1).padStart(2, "0")}</span></div>

              <div>
                <select
                  value={row.Category}
                  onChange={(event) => onChange(row.id, { Category: event.target.value })}
                  aria-label="Device category"
                >
                  {!row.Category && <option value="">Select category</option>}
                  {categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
                  {!categoryOptions.includes("Others") && <option value="Others">Others</option>}
                </select>
              </div>

              <div>
                <select
                  value={row.Brand}
                  disabled={!row.Category}
                  onChange={(event) => onChange(row.id, { Brand: event.target.value })}
                  aria-label="Device brand"
                >
                  <option value="">General / All Brands</option>
                  {brandOptions.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
                </select>
              </div>

              <div>
                <select
                  value={row.Model}
                  disabled={!row.Category || !row.Brand}
                  onChange={(event) => onChange(row.id, { Model: event.target.value })}
                  aria-label="Device model"
                >
                  <option value="">General / All Models</option>
                  {modelOptions.map((model) => <option key={model} value={model}>{model}</option>)}
                </select>
              </div>

              <div>
                <div>
                  <span>RM</span>
                  <input
                    min={0}
                    step="0.01"
                    type="number"
                    value={row.Price}
                    onChange={(event) => onChange(row.id, { Price: Number(event.target.value) || 0 })}
                  />
                </div>
              </div>

              <div>
                <button
                 
                  type="button"
                  aria-label="Toggle exclude from CAPEX"
                  onClick={() => onChange(row.id, { IsExcluded: !row.IsExcluded })}
                >
                  <span />
                  {row.IsExcluded ? "Excluded" : "Included"}
                </button>
              </div>

              <div>
                <div>
                  <button
                   
                    type="button"
                    onClick={() => onSaveRow(row.id)}
                    disabled={rowSaving}
                    title="Save pricing row"
                    aria-label="Save pricing row"
                  >
                    {savingRowId === row.id ? "..." : <PencilSvg />}
                  </button>

                  <button
                   
                    type="button"
                    title="Delete pricing row"
                    onClick={() => onRequestDelete(row)}
                    disabled={rowSaving}
                    aria-label="Delete pricing row"
                  >
                    <TrashSvg />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!loading && visibleRows.length > 0 && (
        <div>
          <div>Showing {showingFrom} to {showingTo} of {visibleRows.length} pricing records</div>

          <div aria-label="Device pricing pagination">
            <button type="button" onClick={() => setCurrentPage(1)} disabled={safeCurrentPage === 1} aria-label="First page"><EmaPageFirstIcon /></button>
            <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={safeCurrentPage === 1} aria-label="Previous page"><EmaPagePrevIcon /></button>
            <span>{safeCurrentPage}</span>
            <button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={safeCurrentPage === totalPages} aria-label="Next page"><EmaPageNextIcon /></button>
            <button type="button" onClick={() => setCurrentPage(totalPages)} disabled={safeCurrentPage === totalPages} aria-label="Last page"><EmaPageLastIcon /></button>
          </div>

          <div>{pageSize} / page</div>
        </div>
      )}
    </div>
  );
}


function ManagementPolicyContent({ values, profile, loading, saving, error, onChange, onReload, onReset, onSave }: ManagementPolicyContentProps) {
  const normalizedValues = normalizeManagementPolicyValues(values);
  const updatedAt = profile?.updatedAt ? new Date(profile.updatedAt).toLocaleString() : "Not saved yet";
  const groupedFields = MANAGEMENT_POLICY_GROUPS.map((group) => ({
    group,
    fields: MANAGEMENT_POLICY_FIELDS.filter((field) => field.group === group)
  }));

  const totalRules = MANAGEMENT_POLICY_FIELDS.length;
  const costRules = MANAGEMENT_POLICY_FIELDS.filter((field) => field.group === "Cost & Saving Assumptions").length;
  const freshnessRules = MANAGEMENT_POLICY_FIELDS.filter((field) => field.group === "Evidence Freshness Policy").length;
  const riskRules = Math.max(0, totalRules - costRules - freshnessRules);

  const getGroupDescription = (group: string) => {
    if (group === "Cost & Saving Assumptions") return "Money values used to estimate exposure and saving opportunity.";
    if (group === "Evidence Freshness Policy") return "Freshness limits used to mark endpoint and inventory evidence as stale.";
    return "Risk score weights and thresholds used by dashboard evidence rows.";
  };

  const getGroupTone = (group: string) => {
    if (group === "Cost & Saving Assumptions") return "green";
    if (group === "Evidence Freshness Policy") return "blue";
    return "orange";
  };

  return (
    <div>
      <div>
        <div>
          <span>Management Policy</span>
          <strong>{profile?.profileName || "Default EMA Management Policy"}</strong>
          <small>Manage assumptions used by Management Dashboard calculation engine without hardcoding values.</small>
        </div>

        <div>
          <div><span>Total Rules</span><strong>{totalRules}</strong></div>
          <div><span>Cost Rules</span><strong>{costRules}</strong></div>
          <div><span>Freshness</span><strong>{freshnessRules}</strong></div>
          <div><span>Risk Rules</span><strong>{riskRules}</strong></div>
        </div>

        <div>
          <button type="button" onClick={onReload} disabled={loading || saving}>{loading ? "Loading..." : "Reload"}</button>
          <button type="button" onClick={onReset} disabled={loading || saving}>Reset</button>
          <button type="button" onClick={onSave} disabled={loading || saving}>{saving ? "Saving..." : "Save Policy"}</button>
        </div>
      </div>

      {loading && <div>Loading Management Policy...</div>}

      {error && (
        <div>
          <strong>Management Policy load error</strong>
          <span>{error}</span>
        </div>
      )}

      <div>
        <section>
          <div>
            <span>Policy Profile</span>
            <strong>{profile?.profileName || "Default EMA Management Policy"}</strong>
            <small>These assumptions feed ROI, CAPEX, stale evidence and risk exposure calculation.</small>
          </div>

          <div>
            <span>{profile?.scopeType || "GLOBAL"}</span>
            <span>{totalRules} rule values</span>
            <span>Updated: {updatedAt}</span>
          </div>
        </section>

        <section>
          {groupedFields.map(({ group, fields }) => {
            const tone = getGroupTone(group);

            return (
              <article key={group}>
                <div>
                  <div>
                    <span>{group}</span>
                    <strong>{fields.length} Rules</strong>
                    <small>{getGroupDescription(group)}</small>
                  </div>
                </div>

                <div>
                  {fields.map((field) => {
                    const inputValue = managementPolicyInputValue(normalizedValues, field);

                    return (
                      <label key={field.key}>
                        <div>
                          <span>{field.label}</span>
                          <small>{field.description}</small>
                        </div>

                        <div>
                          <input
                            type="number"
                            min={field.min}
                            max={field.max}
                            step={field.step}
                            value={inputValue}
                            onChange={(event) => {
                              const parsed = Number(event.target.value);
                              const scaled = Number.isFinite(parsed)
                                ? parsed / (field.displayScale || 1)
                                : DEFAULT_MANAGEMENT_POLICY_VALUES[field.key] || 0;
                              onChange(field.key, scaled);
                            }}
                          />
                          <em>{field.unit}</em>
                        </div>

                        <b>{formatManagementPolicyValue(normalizedValues, field)}</b>
                      </label>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}


function AgingContent({
  rule,
  loading,
  saving,
  error,
  onChange,
  onReload,
  onSave,
  onReset
}: AgingContentProps) {
  const statusText = rule.enabled ? "Enabled" : "Disabled";
  const unknownText = rule.includeUnknownAge ? "Included" : "Flag as data gap";

  return (
    <div>
      <div>
        <div>
          <span>PC Aging Rule</span>
          <strong>Endpoint Lifecycle Configuration</strong>
          <small>Configure lifecycle thresholds, replacement planning and calculation basis for hardware aging.</small>
        </div>

        <div>
          <div><span>Status</span><strong>{statusText}</strong></div>
          <div><span>Review</span><strong>{rule.monitorMaxYears} yrs</strong></div>
          <div><span>Critical</span><strong>{rule.agingMinYears} yrs</strong></div>
          <div><span>Window</span><strong>{rule.replacementWindowMonths} mo</strong></div>
        </div>

        <div>
          <button type="button" onClick={onReload} disabled={loading || saving}>{loading ? "Loading..." : "Reload"}</button>
          <button type="button" onClick={onReset} disabled={saving}>Reset</button>
          <button type="button" onClick={onSave} disabled={saving || loading}>{saving ? "Saving..." : "Save Changes"}</button>
        </div>
      </div>

      {loading && <div>Loading PC aging rule from AssetSettings...</div>}

      {error && (
        <div>
          <strong>PC Aging load error</strong>
          <span>{error}</span>
        </div>
      )}

      <div>
        <section>
          <article>
            <div>
              <div>
                <span>Rule Status</span>
                <strong>{rule.enabled ? "Active lifecycle rule" : "Lifecycle rule paused"}</strong>
                <small>Turn lifecycle calculation on or off without deleting the saved configuration.</small>
              </div>

              <button
               
                aria-label="Toggle PC aging rule"
                type="button"
                onClick={() => onChange({ enabled: !rule.enabled })}
              >
                <span />
              </button>
            </div>

            <div>
              <span>{formatAgeSourceLabel(rule.ageSource)}</span>
              <b>{statusText}</b>
            </div>
          </article>

          <article>
            <div>
              <div>
                <span>Decision Guide</span>
                <strong>Lifecycle Actions</strong>
                <small>Operational action generated from the current threshold rule.</small>
              </div>
            </div>

            <div>
              <AgingActionRow status="Standard" condition={"< " + rule.healthyMaxYears + " years"} action="Monitor" tone="blue" />
              <AgingActionRow status="Aging" condition={">= " + rule.monitorMaxYears + " years"} action="Review" tone="amber" />
              <AgingActionRow status="Critical" condition={">= " + rule.agingMinYears + " years"} action="Replace" tone="red" />
            </div>
          </article>
        </section>

        <section>
          <div>
            <div>
              <span>Lifecycle Age Bands</span>
              <strong>Threshold Configuration</strong>
              <small>Set the year thresholds used to classify every endpoint into standard, aging and critical groups.</small>
            </div>
          </div>

          <div>
            <AgingThresholdLine
              label="Standard Device"
              help="Healthy lifecycle window before review is required."
              value={rule.healthyMaxYears}
              display={"< " + rule.healthyMaxYears + " years"}
              tone="blue"
              onChange={(value) => onChange({ healthyMaxYears: value })}
            />

            <AgingThresholdLine
              label="Aging Device"
              help="Device should be reviewed and considered for refresh planning."
              value={rule.monitorMaxYears}
              display={">= " + rule.monitorMaxYears + " years"}
              tone="amber"
              onChange={(value) => onChange({ monitorMaxYears: value })}
            />

            <AgingThresholdLine
              label="Critical Aging"
              help="Device is a high-priority replacement candidate."
              value={rule.agingMinYears}
              display={">= " + rule.agingMinYears + " years"}
              tone="red"
              onChange={(value) => onChange({ agingMinYears: value })}
            />
          </div>
        </section>

        <section>
          <article>
            <div>
              <div>
                <span>Calculation Basis</span>
                <strong>Aging Reference</strong>
                <small>Choose how the system determines device age when generating lifecycle results.</small>
              </div>
            </div>

            <div>
              <label>
                <span>Primary Date</span>
                <select
                  value={rule.ageSource}
                  onChange={(event) => onChange({ ageSource: event.target.value })}
                  aria-label="PC aging primary date source"
                >
                  {AGE_SOURCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>Missing Date</span>
                <select
                  value={rule.includeUnknownAge ? "include" : "exclude"}
                  onChange={(event) => onChange({ includeUnknownAge: event.target.value === "include" })}
                  aria-label="PC aging missing date handling"
                >
                  <option value="exclude">Flag as data gap</option>
                  <option value="include">Include in aging report</option>
                </select>
              </label>

              <label>
                <span>Replacement Window</span>
                <div>
                  <input
                    type="number"
                    min="0"
                    max="36"
                    value={rule.replacementWindowMonths}
                    onChange={(event) => onChange({ replacementWindowMonths: Number(event.target.value) })}
                  />
                  <em>months</em>
                </div>
              </label>
            </div>

            <div>
              <span>{formatAgeSourceLabel(rule.ageSource)}</span>
              <small>Primary age reference ? Missing date: {unknownText}</small>
            </div>
          </article>

          <article>
            <div>
              <div>
                <span>Admin Note</span>
                <strong>Operational Note</strong>
                <small>Store an internal note with this lifecycle configuration.</small>
              </div>
            </div>

            <textarea
              value={rule.notes}
              onChange={(event) => onChange({ notes: event.target.value })}
              placeholder="Example: This lifecycle rule is used for annual endpoint refresh planning."
            />
          </article>
        </section>
      </div>
    </div>
  );
}


function AgingThresholdLine({ label, help, value, display, tone, onChange }: { label: string; help: string; value: number; display: string; tone?: "blue" | "amber" | "red"; onChange: (value: number) => void }) {
  const safeTone = tone || "blue";

  return (
    <div>
      <div>
        <span>{label}</span>
        <small>{help}</small>
      </div>

      <input
        type="range"
        min="1"
        max="15"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />

      <div>
        <input
          type="number"
          min="1"
          max="15"
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <b>{display}</b>
      </div>
    </div>
  );
}


function AgingActionRow({ status, condition, action, tone }: { status: string; condition: string; action: string; tone: "blue" | "amber" | "red" }) {
  return (
    <div>
      <div>
        <span>{status}</span>
        <small>{condition}</small>
      </div>
      <b>{action}</b>
    </div>
  );
}


function RiskContent({ search }: { search: string }) {
  const rows = risks.filter((risk) => !search || risk.join(" ").toLowerCase().includes(search));

  return (
    <div >
      <div >
        {rows.map((risk) => (
          <article  key={risk[0]} >
            <div >
              <span  />
              <div>
                <h4>{risk[0]} Risk</h4>
                <p>{risk[1]}</p>
              </div>
              <span >{risk[2]}</span>
            </div>

            <div >
              <i  />
            </div>

            <div >
              <FormSelect label="Action" options={["Monitor", "Review", "Escalate", "Block"]} />
              <FormSelect label="Owner" options={["IT Ops", "Security", "Management"]} />
              <FormSelect label="SLA" options={["7 days", "3 days", "24 hours"]} />
            </div>
          </article>
        ))}
      </div>

      <article >
        <div >
          <div>
            <h4>Risk Scoring Signals</h4>
            <p>Signals used to calculate endpoint risk score.</p>
          </div>
          <button  type="button">Add Rule</button>
        </div>

        <div >
          <SummaryRow label="Unsupported OS" value="+30" />
          <SummaryRow label="Stale Sync > 30 days" value="+20" />
          <SummaryRow label="Locked Device" value="+25" />
          <SummaryRow label="Duplicate IP" value="+15" />
          <SummaryRow label="Aging > 5 years" value="+15" />
        </div>
      </article>
    </div>
  );
}


function UserDeleteModal({ target, onClose, onConfirm }: { target: { user: UserAccess; index: number } | null; onClose: () => void; onConfirm: () => void }) {
  if (!target) return null;
  const user = target.user;
  const label = user.name || user.username || user.email || "this user";

  return createPortal(
    <div  onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div  role="dialog" aria-modal="true" aria-labelledby="userDeleteTitle">
        <div >!</div>
        <div >
          <span >CONFIRM DELETE</span>
          <h3 id="userDeleteTitle">Delete user access?</h3>
          <p>Are you sure you want to delete <b>{label}</b>? This will permanently delete this user from EMA_Users.</p>
        </div>
        <div >
          <button  type="button" onClick={onClose}>Cancel</button>
          <button  type="button" onClick={onConfirm}>Delete User</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function PricingDeleteModal({ row, loading, onClose, onConfirm }: { row: PricingRow | null; loading: boolean; onClose: () => void; onConfirm: () => void }) {
  if (!row) return null;

  const label = [row.Category, row.Brand || "All Brands", row.Model || "All Models"].filter(Boolean).join(" • ");

  return (
    <div  onClick={(event) => { if (event.target === event.currentTarget && !loading) onClose(); }}>
      <div >
        <div >!</div>
        <div>
          <span >DELETE PRICING RULE</span>
          <h3>Confirm delete?</h3>
          <p>This will remove the pricing rule for <b>{label}</b>. This action cannot be reversed after confirmation.</p>
        </div>
        <div >
          <button  type="button" onClick={onClose} disabled={loading}>Cancel</button>
          <button  type="button" onClick={onConfirm} disabled={loading}>{loading ? "Deleting..." : "Delete"}</button>
        </div>
      </div>
    </div>
  );
}

function IncidentConfigDeleteModal({ target, loading, onClose, onConfirm }: { target: IncidentConfigDeleteTarget | null; loading: boolean; onClose: () => void; onConfirm: () => void }) {
  if (!target) return null;

  const label = target.kind === "category"
    ? target.category.name
    : target.kind === "subcategory"
      ? target.subcategory.name
      : target.detail.name;
  const title = target.kind === "category"
    ? "Delete category?"
    : target.kind === "subcategory"
      ? "Delete subcategory?"
      : "Delete incident detail?";
  const message = target.kind === "category"
    ? "This will permanently remove the category only if it has never been used in Service Desk tickets. If it is already used, the system will block deletion and you can deactivate it instead."
    : target.kind === "subcategory"
      ? "This will permanently remove the subcategory only if it has never been used in Service Desk tickets. If it is already used, the system will block deletion and you can deactivate it instead."
      : "This will permanently remove the incident detail only if it has never been used in Service Desk tickets. If it is already used, the system will block deletion and you can deactivate it instead.";
  const buttonLabel = target.kind === "category"
    ? "Delete Category"
    : target.kind === "subcategory"
      ? "Delete Subcategory"
      : "Delete Detail";

  return (
    <div  onClick={(event) => { if (event.target === event.currentTarget && !loading) onClose(); }}>
      <div  role="dialog" aria-modal="true" aria-labelledby="incidentConfigDeleteTitle">
        <div >!</div>
        <div >
          <h3 id="incidentConfigDeleteTitle">{title}</h3>
          <p>Are you sure you want to delete <b>{label}</b>? {message}</p>
        </div>
        <div >
          <button  type="button" onClick={onClose} disabled={loading}>Cancel</button>
          <button  type="button" onClick={onConfirm} disabled={loading}>{loading ? "Deleting..." : buttonLabel}</button>
        </div>
      </div>
    </div>
  );
}

function ResourceDeleteModal({ target, loading, onClose, onConfirm }: { target: ResourceDeleteTarget | null; loading: boolean; onClose: () => void; onConfirm: () => void }) {
  if (!target) return null;

  return (
    <div  onClick={(event) => { if (event.target === event.currentTarget && !loading) onClose(); }}>
      <div  role="dialog" aria-modal="true" aria-labelledby="resourceDeleteTitle">
        <div >!</div>
        <div >
          <h3 id="resourceDeleteTitle">Remove leave schedule?</h3>
          <p>Are you sure you want to remove the leave schedule for <b>{target.engineerName}</b>? Service Desk assignment will stop showing this leave warning after removal.</p>
        </div>
        <div >
          <button  type="button" onClick={onClose} disabled={loading}>Cancel</button>
          <button  type="button" onClick={onConfirm} disabled={loading}>{loading ? "Removing..." : "Remove Leave"}</button>
        </div>
      </div>
    </div>
  );
}

function SettingsToast({ toast, onClose }: { toast: SettingsToastState; onClose: () => void }) {
  if (!toast) return null;

  const icon =
    toast.tone === "success"
      ? "\u2713"
      : toast.tone === "error"
        ? "!"
        : toast.tone === "warning"
          ? "!"
          : "i";

  const toastNode = (
    <div  role="status" aria-live="polite">
      <div >
        <div >{icon}</div>

        <div >
          <strong>{toast.title}</strong>
          <span>{toast.message}</span>
        </div>

        <button  type="button" onClick={onClose} aria-label="Close notification">
          x
        </button>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(toastNode, document.body) : toastNode;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div ><span>{label}</span><b>{value}</b></div>;
}

function FormSelect({ label, options }: { label: string; options: string[] }) {
  const [value, setValue] = useState(options[0] || "");
  return <label >{label}<SettingSelect value={value} options={options} onChange={setValue} ariaLabel={label} /></label>;
}


function UserModal({ open, mode, title, form, setForm, onClose, onSave, roleOptions }: { open: boolean; mode: string; title: string; form: UserAccess; setForm: (form: UserAccess) => void; onClose: () => void; onSave: () => void; roleOptions: string[] }) {
  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  const [roleSearchTerm, setRoleSearchTerm] = useState("");

  useEffect(() => {
    if (!open) {
      setRolePickerOpen(false);
      setRoleSearchTerm("");
    }
  }, [open]);

  if (!open) return null;

  const selectedRoles = normalizeUserRoles(form.roles || form.role || form.roleName);
  const unassignedRoles = roleOptions.filter((role) => !selectedRoles.includes(role));
  const filteredRoleOptions = unassignedRoles.filter((role) =>
    role.toLowerCase().includes(roleSearchTerm.trim().toLowerCase())
  );
  const isCreateMode = mode.toLowerCase().includes("add");

  const updateSelectedRoles = (nextRoles: string[]) => {
    const cleanRoles = Array.from(new Set(nextRoles.filter(Boolean)));
    const joinedRoles = joinUserRoles(cleanRoles);
    setForm({ ...form, roles: cleanRoles, role: joinedRoles, roleName: joinedRoles });
  };

  const addSelectedRole = (role: string) => {
    updateSelectedRoles([...selectedRoles, role]);
    setRoleSearchTerm("");
    setRolePickerOpen(false);
  };

  const removeSelectedRole = (role: string) => {
    updateSelectedRoles(selectedRoles.filter((item) => item !== role));
  };

  const modalNode = (
    <div id="userModalBackdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="userModalTitle">
        <header>
          <div>
            <span id="userModalMode">{mode}</span>
            <h3 id="userModalTitle">{title}</h3>
            <p>Configure identity profile and assign one or more RBAC roles from EMA_Roles.</p>
          </div>
          <button id="closeUserModal" type="button" onClick={onClose} aria-label="Close user modal">?</button>
        </header>

        <div>
          <section>
            <div>
              <span>Profile</span>
              <small>Basic identity information for this user.</small>
            </div>

            <div>
              <label>Full Name<input id="userFullName" placeholder="Example: Zainul Ariffin" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
              <label>Username<input id="userUsername" placeholder="Example: zainul" value={form.username || ""} onChange={(event) => setForm({ ...form, username: event.target.value })} /></label>
              <label>Email<input id="userEmail" placeholder="user@company.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
              <label>Phone No<input id="userPhoneNo" placeholder="Optional" value={form.phoneNo || ""} onChange={(event) => setForm({ ...form, phoneNo: event.target.value })} /></label>
            </div>
          </section>

          <section>
            <div>
              <span>Access</span>
              <small>Assign one or more RBAC roles. Module access follows the combined role permissions.</small>
            </div>

            <div>
              <div>
                <strong>Assigned Roles</strong>
                <button
                  type="button"
                  onClick={() => setRolePickerOpen((current) => !current)}
                  disabled={roleOptions.length === 0}
                >
                  + Assign Role
                </button>
              </div>

              <div>
                {selectedRoles.length === 0 && (
                  <div>No role assigned yet</div>
                )}

                {selectedRoles.map((role) => (
                  <span key={role}>
                    {role}
                    <button type="button" onClick={() => removeSelectedRole(role)} aria-label={`Remove ${role}`}>?</button>
                  </span>
                ))}
              </div>

              {rolePickerOpen && (
                <div>
                  <label>
                    <SearchSvg />
                    <input
                      value={roleSearchTerm}
                      onChange={(event) => setRoleSearchTerm(event.target.value)}
                      placeholder="Search role by name..."
                      autoFocus
                    />
                  </label>

                  <div>
                    {roleOptions.length === 0 && (
                      <div>No active roles available. Create a role in Role Based Control first.</div>
                    )}

                    {roleOptions.length > 0 && filteredRoleOptions.length === 0 && (
                      <div>No matching unassigned roles.</div>
                    )}

                    {filteredRoleOptions.map((role) => (
                      <button type="button" key={role} onClick={() => addSelectedRole(role)}>
                        <span>{role}</span>
                        <b>Assign</b>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label>Department<input id="userDepartment" placeholder="Example: IT Operation" value={form.department || ""} onChange={(event) => setForm({ ...form, department: event.target.value })} /></label>
              <label>Position<input id="userPosition" placeholder="Example: Support Engineer" value={form.position || ""} onChange={(event) => setForm({ ...form, position: event.target.value })} /></label>
              <label>Status
                <SettingSelect
                  value={form.status}
                  options={["Active", "Review", "Locked", "Inactive"]}
                  onChange={(value) => setForm({ ...form, status: value as RoleStatus, accountLocked: value === "Locked" })}
                  ariaLabel="User status"
                />
              </label>
            </div>
          </section>

          <section>
            <div>
              <span>Password</span>
              <small>{isCreateMode ? "Create a login password for immediate testing." : "Fill only when resetting password."}</small>
            </div>

            <div>
              <label>{isCreateMode ? "Initial Password" : "New Password"}<input type="password" id="userPassword" placeholder={isCreateMode ? "Create login password" : "Leave blank to keep current password"} value={form.password || ""} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
              <label>Confirm Password<input type="password" id="userConfirmPassword" placeholder="Re-enter password" value={form.confirmPassword || ""} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} /></label>
            </div>
          </section>

          <section>
            <div>
              <span>Security</span>
              <small>Set MFA, lock status, access dates and notes.</small>
            </div>

            <div>
              <label><input type="checkbox" checked={Boolean(form.requireMFA || form.mfa)} onChange={(event) => setForm({ ...form, requireMFA: event.target.checked, mfa: event.target.checked })} /><span>Require MFA</span></label>
              <label><input type="checkbox" checked={Boolean(form.accountLocked)} onChange={(event) => setForm({ ...form, accountLocked: event.target.checked, status: event.target.checked ? "Locked" : form.status === "Locked" ? "Active" : form.status })} /><span>Account Locked</span></label>
              <label>Lock Reason<input id="userLockReason" placeholder="Optional reason shown in audit" value={form.lockReason || ""} onChange={(event) => setForm({ ...form, lockReason: event.target.value })} /></label>
              <label>Access Start<input type="date" id="userAccessStart" value={toDateInputValue(form.accessStartDate)} onChange={(event) => setForm({ ...form, accessStartDate: event.target.value })} /></label>
              <label>Access End<input type="date" id="userAccessEnd" value={toDateInputValue(form.accessEndDate)} onChange={(event) => setForm({ ...form, accessEndDate: event.target.value })} /></label>
              <label>Remarks<textarea id="userRemarks" placeholder="Optional access notes" value={form.remarks || ""} onChange={(event) => setForm({ ...form, remarks: event.target.value })} /></label>
            </div>
          </section>
        </div>

        <footer>
          <button id="cancelUserModal" type="button" onClick={onClose}>Cancel</button>
          <button id="saveUserAccess" type="button" onClick={onSave}>Save User</button>
        </footer>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalNode, document.body) : modalNode;
}

function AccessRoleModal({ open, mode, form, setForm, onClose, onSave }: { open: boolean; mode: string; form: AccessRole; setForm: (form: AccessRole) => void; onClose: () => void; onSave: () => void }) {
  if (!open) return null;

  const modalNode = (
    <div onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="roleModalTitle">
        <header>
          <div>
            <span>{mode}</span>
            <h3 id="roleModalTitle">{mode === "ADD ROLE" ? "Add New Role" : "Update Role"}</h3>
            <p>Create or update role name, status and approval requirement for EMA_Roles.</p>
          </div>

          <button type="button" onClick={onClose} aria-label="Close role modal">?</button>
        </header>

        <div>
          <div>
            <label>
              <span>Role Name</span>
              <input
                placeholder="Example: L1 Support"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </label>

            <label>
              <span>Status</span>
              <select
                value={form.status === "Inactive" ? "Inactive" : "Active"}
                onChange={(event) => setForm({ ...form, status: event.target.value as RoleStatus })}
                aria-label="Role status"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </label>

            <label>
              <span>Description</span>
              <input
                placeholder="Describe this role"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </label>

            <label>
              <input
                type="checkbox"
                checked={Boolean(form.approvalRequired)}
                onChange={(event) => setForm({ ...form, approvalRequired: event.target.checked })}
              />
              <span>
                <strong>Require approval</strong>
                <small>For sensitive actions</small>
              </span>
            </label>
          </div>
        </div>

        <footer>
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="button" onClick={onSave}>Save Role</button>
        </footer>
      </section>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalNode, document.body) : modalNode;
}

function ConfirmDeleteRoleModal({ role, onClose, onConfirm }: { role: AccessRole | null; onClose: () => void; onConfirm: () => void }) {
  if (!role) return null;

  const modalNode = (
    <div  onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div  role="dialog" aria-modal="true" aria-labelledby="roleDeleteTitle">
        <div >!</div>
        <div >
          <span >CONFIRM DELETE</span>
          <h3 id="roleDeleteTitle">Delete role access?</h3>
          <p>Are you sure you want to delete <b>{role.name}</b>? This will permanently delete this role from EMA_Roles.</p>
        </div>
        <div >
          <button  type="button" onClick={onClose}>Cancel</button>
          <button  type="button" onClick={onConfirm}>Delete Role</button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalNode, document.body) : modalNode;
}

function AccessPolicyModal(props: any) {
  const open = props.open ?? props.isOpen ?? props.visible ?? true;
  const mode = props.mode || props.title || "ADD CONTROL";
  const form = props.form || props.policy || props.accessForm || props.policyForm || props.accessPolicyForm || props.value || {};
  const setForm =
    props.setForm ||
    props.setPolicy ||
    props.setAccessForm ||
    props.setPolicyForm ||
    props.setAccessPolicyForm ||
    props.onFormChange ||
    (() => {});
  const onClose = props.onClose || props.close || (() => {});
  const onSave = props.onSave || props.onSubmit || props.onApply || (() => {});

  if (!open) return null;

  const patchForm = (patch: any) => setForm({ ...form, ...patch });
  const isEditMode = String(mode).toUpperCase().includes("EDIT") || String(mode).toUpperCase().includes("UPDATE");

  const modalNode = (
    <div onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="accessPolicyModalTitle">
        <header>
          <div>
            <span>{mode}</span>
            <h3 id="accessPolicyModalTitle">{isEditMode ? "Update Access Control" : "Add New Access Control"}</h3>
            <p>Configure MFA, session, IP or approval enforcement rules for EMA_AccessControls.</p>
          </div>

          <button type="button" onClick={onClose} aria-label="Close access control modal">?</button>
        </header>

        <div>
          <div>
            <label>
              <span>Control Name</span>
              <input
                placeholder="Example: MFA Enforcement"
                value={form.name || ""}
                onChange={(event) => patchForm({ name: event.target.value })}
              />
            </label>

            <label>
              <span>Description</span>
              <input
                placeholder="Describe this access control rule"
                value={form.description || ""}
                onChange={(event) => patchForm({ description: event.target.value })}
              />
            </label>

            <label>
              <span>Scope</span>
              <select
                value={form.scope || "Global"}
                onChange={(event) => patchForm({ scope: event.target.value })}
              >
                <option value="Global">Global</option>
                <option value="Role">Role</option>
                <option value="User">User</option>
                <option value="Branch">Branch</option>
                <option value="Department">Department</option>
              </select>
            </label>

            <label>
              <span>Enforcement</span>
              <select
                value={form.enforcement || "Standard"}
                onChange={(event) => patchForm({ enforcement: event.target.value })}
              >
                <option value="Standard">Standard</option>
                <option value="Strict">Strict</option>
                <option value="MFA Required">MFA Required</option>
                <option value="Approval Required">Approval Required</option>
                <option value="IP/VPN Restricted">IP/VPN Restricted</option>
              </select>
            </label>

            <label>
              <span>Review Cycle</span>
              <select
                value={form.reviewCycle || "Monthly"}
                onChange={(event) => patchForm({ reviewCycle: event.target.value })}
              >
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Half Yearly">Half Yearly</option>
                <option value="Yearly">Yearly</option>
              </select>
            </label>

            <label>
              <span>Status</span>
              <select
                value={form.status || "Active"}
                onChange={(event) => patchForm({ status: event.target.value })}
              >
                <option value="Active">Active</option>
                <option value="Review">Review</option>
                <option value="Inactive">Inactive</option>
              </select>
            </label>
          </div>
        </div>

        <footer>
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="button" onClick={onSave}>Save Control</button>
        </footer>
      </section>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalNode, document.body) : modalNode;
}


function AccessPolicyDeleteConfirmModal({ target, onCancel, onConfirm }: { target: { policy: AccessPolicy; index: number } | null; onCancel: () => void; onConfirm: () => void }) {
  if (!target) return null;

  const modalNode = (
    <div  role="dialog" aria-modal="true" onClick={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <div >
        <div >!</div>
        <div >
          <span >CONFIRM DELETE</span>
          <h3>Delete access control?</h3>
          <p>Are you sure you want to delete <b>{target.policy.name}</b>? This will remove the control from EMA_AccessControls.</p>
        </div>
        <div >
          <button  type="button" onClick={onCancel}>Cancel</button>
          <button  type="button" onClick={onConfirm}>Delete Control</button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalNode, document.body) : modalNode;
}

function RoleModal({ open, mode, form, setForm, onClose, onSave, onDelete }: { open: boolean; mode: ModalMode; form: ModuleRole; setForm: (form: ModuleRole) => void; onClose: () => void; onSave: () => void; onDelete: () => void }) {
  const isDelete = mode === "delete";
  const title = mode === "add" ? "Add Module Role" : mode === "edit" ? "Update Module Role" : "Delete Module Role";
  const modeText = mode === "add" ? "ADD NEW ROLE" : mode === "edit" ? "UPDATE ROLE" : "DELETE ROLE";
  return <div  id="roleModalBackdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}><div ><div ><div><span  id="roleModalMode">{modeText}</span><h3 id="roleModalTitle">{title}</h3><p>Create, update or delete roles used in the Module Control matrix.</p></div><button  id="closeRoleModal" type="button" onClick={onClose}>×</button></div><div ><label >Role Name<input  id="moduleRoleName" placeholder="Example: Security Reviewer" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label >Role Type<SettingSelect value={form.type} options={["Administrator", "Management", "Operation", "Support", "Audit / Viewer", "Custom"]} onChange={(value) => setForm({ ...form, type: value })} ariaLabel="Module role type" /></label><label >Description<input  id="moduleRoleDesc" placeholder="Describe access purpose for this role" value={form.desc} onChange={(event) => setForm({ ...form, desc: event.target.value })} /></label><label >Default Access<SettingSelect value={form.defaultAccess} options={["Read Only", "Operational Access", "Management Access", "Full Access", "No Access"]} onChange={(value) => setForm({ ...form, defaultAccess: value })} ariaLabel="Default access" /></label><label >Approval Required<SettingSelect value={form.approval} options={["Yes", "No"]} onChange={(value) => setForm({ ...form, approval: value })} ariaLabel="Approval required" /></label></div><p  id="roleDeleteWarning">Delete role will remove this role column from the module access matrix. Existing users assigned to this role should be reviewed before deletion.</p><div ><button  id="cancelRoleModal" type="button" onClick={onClose}>Cancel</button>{isDelete && <button  id="deleteRoleConfirm" type="button" onClick={onDelete}>Delete Role</button>}{!isDelete && <button  id="saveModuleRole" type="button" onClick={onSave}>Save Role</button>}</div></div></div>;
}

function Icon({ name }: { name: IconName }) {
  if (name === "role") return <svg viewBox="0 0 24 24" fill="none"><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  if (name === "matrix") return <svg viewBox="0 0 24 24" fill="none"><path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z" stroke="currentColor" strokeWidth="1.9" /></svg>;
  if (name === "access") return <svg viewBox="0 0 24 24" fill="none"><path d="M7 10V8a5 5 0 0 1 10 0v2M6 10h12v11H6V10Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" /></svg>;
  if (name === "audit") return <svg viewBox="0 0 24 24" fill="none"><path d="M7 3h7l4 4v14H7V3Zm7 0v5h5M9 13h6M9 17h6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "price") return <svg viewBox="0 0 24 24" fill="none"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  if (name === "aging") return <svg viewBox="0 0 24 24" fill="none"><path d="M12 8v5l3 2M21 12a9 9 0 1 1-3-6.7M21 4v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  return <svg viewBox="0 0 24 24" fill="none"><path d="M12 3 21 20H3L12 3Zm0 6v5m0 3h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function PencilSvg() {
  return <svg fill="none" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4.2L18.7 9.5a2.1 2.1 0 0 0 0-3l-1.2-1.2a2.1 2.1 0 0 0-3 0L4 15.8V20Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /><path d="m13.6 6.4 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="2" /></svg>;
}

function TrashSvg() {
  return <svg fill="none" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>;
}

function SearchSvg() {
  return <svg fill="none" viewBox="0 0 24 24"><path d="m21 21-4.3-4.3M10.8 18.2a7.4 7.4 0 1 1 0-14.8 7.4 7.4 0 0 1 0 14.8Z" stroke="currentColor" strokeLinecap="round" strokeWidth="2" /></svg>;
}

function ChevronDownSvg() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5.5 7.5l4.5 4.5 4.5-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
