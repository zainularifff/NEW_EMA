import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import "../styles/resource-planning.css";

type SectionKey = "roles" | "users" | "modules" | "access" | "audit" | "pricing" | "aging" | "policy" | "risk" | "resources";
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
  Remarks: "",
};

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
    ...(Array.isArray(row.roles) ? row.roles : []),
  ].join(" ").toLowerCase();

  return roleText.includes("support");
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

type IconName = "role" | "matrix" | "access" | "audit" | "price" | "aging" | "risk";

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
  twoFactorEnabled?: boolean;
  twoFactorVerifiedAt?: string | null;
  twoFactorResetAt?: string | null;
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
  RoleNames?: string;
  LegacyUserID?: number | string | null;
  AccessScope?: string;
  Status?: string;
  Department?: string;
  Position?: string;
  PhoneNo?: string;
  RequireMFA?: boolean | number;
  TwoFactorEnabled?: boolean | number;
  TwoFactorSecret?: string | null;
  TwoFactorVerifiedAt?: string | null;
  TwoFactorResetAt?: string | null;
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
    subtitle: "Permission groups",
  },
  users: {
    key: "users",
    title: "User Access Management",
    desc: "Add new users, update existing user access, delete access and control account status.",
    tag: "User Access CRUD",
    icon: "access",
    count: 6,
    scoreOne: "6",
    scoreTwo: "3",
    subtitle: "User accounts",
  },
  modules: {
    key: "modules",
    title: "Module Control by Role",
    desc: "Control module access for each role across dashboard, EMA, service desk, report and setting areas.",
    tag: "Module Governance",
    icon: "matrix",
    count: 8,
    scoreOne: "8",
    scoreTwo: "5",
    subtitle: "Modules",
  },
  access: {
    key: "access",
    title: "Access Control",
    desc: "Define login policy, MFA, session timeout, IP restrictions and approval workflow.",
    tag: "Security Control",
    icon: "access",
    count: 6,
    scoreOne: "6",
    scoreTwo: "2FA",
    subtitle: "Policies",
  },
  audit: {
    key: "audit",
    title: "Audit Log",
    desc: "Track role changes, login activities, setting changes, report generation and admin actions.",
    tag: "Audit Trail",
    icon: "audit",
    count: 128,
    scoreOne: "128",
    scoreTwo: "12",
    subtitle: "Events",
  },
  pricing: {
    key: "pricing",
    title: "Device Pricing",
    desc: "Set device pricing assumptions used for cost impact, asset replacement and risk-driven costing.",
    tag: "Cost Configuration",
    icon: "price",
    count: 4,
    scoreOne: "MYR",
    scoreTwo: "4",
    subtitle: "Pricing groups",
  },
  aging: {
    key: "aging",
    title: "Aging PC Rule",
    desc: "Define how many years before a device is classified as standard, aging, critical or replacement candidate.",
    tag: "Lifecycle Rule",
    icon: "aging",
    count: 5,
    scoreOne: "5",
    scoreTwo: "7",
    subtitle: "Years threshold",
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
    subtitle: "Policy rules",
  },
  risk: {
    key: "risk",
    title: "Risk Identifier & Level",
    desc: "Configure risk identifiers, scoring rules and level boundaries for dashboard and report output.",
    tag: "Risk Engine",
    icon: "risk",
    count: 6,
    scoreOne: "6",
    scoreTwo: "80+",
    subtitle: "Risk rules",
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
    subtitle: "Leave schedules",
  },
};

// Risk Identifier & Level is hidden for now because the module is not functional yet.
const sectionOrder: SectionKey[] = ["roles", "users", "modules", "access", "audit", "pricing", "aging", "policy", "resources"];

const defaultAccessRoles: AccessRole[] = [
  { roleKey: "system_administrator", name: "System Administrator", description: "Full configuration access including roles, settings, pricing and risk rules.", type: "Administrator", defaultAccess: "Full Access", approvalRequired: true, status: "Active", assignedUsers: 0 },
  { roleKey: "it_manager", name: "IT Manager", description: "Management dashboard, report approval and operational oversight.", type: "Management", defaultAccess: "Management Access", approvalRequired: true, status: "Active", assignedUsers: 0 },
  { roleKey: "it_operations", name: "IT Operations", description: "Endpoint monitoring, device registry and action queue operation.", type: "Operation", defaultAccess: "Operational Access", approvalRequired: false, status: "Active", assignedUsers: 0 },
  { roleKey: "service_desk", name: "Service Desk", description: "Ticket handling, remote session support and operational worklist.", type: "Support", defaultAccess: "Operational Access", approvalRequired: false, status: "Review", assignedUsers: 0 },
  { roleKey: "auditor_viewer", name: "Auditor / Viewer", description: "Read-only access for reports, audit log and compliance review.", type: "Audit / Viewer", defaultAccess: "Read Only", approvalRequired: true, status: "Active", assignedUsers: 0 },
];

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
    updatedAt: row.updatedAt ?? row.UpdatedAt ?? null,
  };
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
    sortOrder: Number(row.sortOrder ?? row.SortOrder ?? 0) || 0,
  };
}

function normalizeModulePermission(row: Record<string, unknown> = {}): ModulePermission {
  return {
    roleID: row.roleID as number | string ?? row.RoleID as number | string ?? "",
    moduleID: row.moduleID as number | string ?? row.ModuleID as number | string ?? "",
    canView: boolFromApi(row.canView ?? row.CanView, false),
  };
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
    updatedAt: row.updatedAt ?? row.UpdatedAt ?? null,
  };
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
  { name: "Temporary Access", email: "temp.access@company.com", role: "Service Desk", status: "Locked", scope: "Service Desk + Remote" },
];

const defaultModuleRoles: ModuleRole[] = [
  { key: "admin", name: "Admin", type: "Administrator", desc: "Full system access", defaultAccess: "Full Access", approval: "Yes" },
  { key: "manager", name: "Manager", type: "Management", desc: "Management dashboard and report access", defaultAccess: "Management Access", approval: "Yes" },
  { key: "ops", name: "Ops", type: "Operation", desc: "Operational monitoring and device action", defaultAccess: "Operational Access", approval: "No" },
  { key: "service", name: "Service", type: "Support", desc: "Service desk and remote support access", defaultAccess: "Operational Access", approval: "No" },
  { key: "audit", name: "Audit", type: "Audit / Viewer", desc: "Read-only audit and report access", defaultAccess: "Read Only", approval: "Yes" },
];

const defaultModuleAccess: ModuleAccess[] = [
  { module: "Dashboard", access: [1, 1, 1, 0, 1] },
  { module: "EMA Operations", access: [1, 1, 1, 0, 0] },
  { module: "Service Desk", access: [1, 1, 0, 1, 0] },
  { module: "Report Center", access: [1, 1, 1, 0, 1] },
  { module: "Settings", access: [1, 0, 0, 0, 0] },
  { module: "Remote Control", access: [1, 0, 1, 1, 0] },
  { module: "Geolocation", access: [1, 1, 1, 0, 1] },
  { module: "Audit Log", access: [1, 1, 0, 0, 1] },
];

const policies = [
  ["Multi-Factor Authentication", "Require second factor for admin, manager and security-sensitive actions.", "Enabled", "policy-on"],
  ["Session Timeout", "Automatically end inactive sessions after defined period.", "Enabled", "policy-on"],
  ["IP / VPN Restriction", "Limit system access to approved network, VPN or company IP range.", "Review", "policy-off"],
  ["Approval for Critical Action", "Require reason and approval for lock, wipe, unlock and risk override.", "Enabled", "policy-on"],
  ["Password Rotation", "Force periodic password change or SSO policy alignment.", "Disabled", "policy-off"],
  ["Role Change Approval", "Role updates require approval and audit comment.", "Enabled", "policy-on"],
] as const;



const risks = [
  ["Low", "Informational or minor operational issue.", "0 - 39", "20%", "#2563eb"],
  ["Medium", "Requires operational review or follow-up.", "40 - 59", "48%", "#f59e0b"],
  ["High", "Requires management attention and action.", "60 - 79", "72%", "#fb7185"],
  ["Critical", "Immediate risk, compliance or security concern.", "80 - 100", "92%", "#e11d48"],
] as const;

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

const VITE_ENV = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env || {};
const API_BASE = (VITE_ENV.VITE_API_BASE_URL || VITE_ENV.VITE_API_URL || "http://localhost:3001").replace(/\/$/, "");

function getStoredToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("emaToken") ||
    ""
  );
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

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
      throw new Error(`${hint} [${response.status} ${response.statusText}] ${API_BASE}${path}`);
    }
  }

  if (!response.ok) {
    const message = payload?.message || payload?.error || payload?.errorMessage || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
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

  const roles = normalizeUserRoles(row.roles || row.role || row.roleName || row.RoleNames || row.RoleName || "IT Operations");
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
    twoFactorEnabled: boolFromApi(row.TwoFactorEnabled, false),
    twoFactorVerifiedAt: row.TwoFactorVerifiedAt ?? null,
    twoFactorResetAt: row.TwoFactorResetAt ?? null,
    lockReason: String(row.lockReason ?? row.LockReason ?? "").trim(),
    accessStartDate: row.accessStartDate ?? row.AccessStartDate ?? null,
    accessEndDate: row.accessEndDate ?? row.AccessEndDate ?? null,
    lastLoginAt: row.lastLoginAt ?? row.LastLoginAt ?? null,
    passwordChangedAt: row.passwordChangedAt ?? row.PasswordChangedAt ?? null,
    loginFailCount: Number(row.loginFailCount ?? row.LoginFailCount ?? 0) || 0,
    remarks: String(row.remarks ?? row.Remarks ?? "").trim(),
    createdAt: row.createdAt ?? row.CreatedAt ?? null,
    updatedAt: row.updatedAt ?? row.UpdatedAt ?? row.createdAt ?? row.CreatedAt ?? null,
  };
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
    minute: "2-digit",
  });
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
    minute: "2-digit",
  });
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
    details: String(row.details ?? row.Details ?? "").trim(),
  };
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
    minute: "2-digit",
  });
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
    IsExcluded: Boolean(row?.IsExcluded ?? row?.isExcluded ?? false),
  };
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
  notes: "PC aging rule used for dashboard and replacement planning.",
};


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
  "telemetry.geo.staleDays": 7,
};

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
  { key: "telemetry.geo.staleDays", group: "Evidence Freshness Policy", label: "Geolocation stale after", description: "Days before geolocation evidence is considered stale.", unit: "days", min: 1, max: 365, step: 1 },
];

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
  { value: "ConnectionTime", label: "Last Connection Date" },
];

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
    notes: String(rule.notes ?? DEFAULT_PC_AGING_RULE.notes).trim(),
  };
}

function formatAgeSourceLabel(value: string) {
  return AGE_SOURCE_OPTIONS.find((item) => item.value === value)?.label || value || "Registration Date";
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
  const [userDeleteTarget, setUserDeleteTarget] = useState<{ user: UserAccess; index: number } | null>(null);
  const [settingsToast, setSettingsToast] = useState<SettingsToastState>(null);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [brandOptionsByCategory, setBrandOptionsByCategory] = useState<Record<string, string[]>>({});
  const [modelOptionsByKey, setModelOptionsByKey] = useState<Record<string, string[]>>({});
  const active = sections[activeSection];
  const usersTotalCount = users.length;
  const usersActiveCount = users.filter((user) => user.status === "Active" && user.isActive !== false).length;
  const usersLockedCount = users.filter((user) => user.accountLocked || user.status === "Locked").length;
  const usersMfaCount = users.filter((user) => user.requireMFA || user.mfa).length;
  const rolesTotalCount = accessRoles.length;
  const rolesActiveCount = accessRoles.filter((role) => role.status === "Active").length;
  const moduleTotalCount = moduleCatalog.length;
  const moduleActiveRoleCount = accessRoles.filter((role) => role.status === "Active").length;
  const accessPolicyTotalCount = accessPolicies.length;
  const accessPolicyActiveCount = accessPolicies.filter((policy) => policy.status === "Active").length;
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
    "Security & Auth",
  ];
  const auditModuleOptions = Array.from(new Set([...auditBaseModuleOptions, ...auditLogs.map((log) => log.module).filter(Boolean)])).sort((a, b) => a.localeCompare(b));
  const auditSeverityOptions = ["Success", "Info", "Warning", "Error"];
  const filteredAuditLogs = auditLogs;
  const heroScoreOne = activeSection === "users" ? String(usersTotalCount) : activeSection === "roles" ? String(rolesTotalCount) : activeSection === "modules" ? String(moduleTotalCount) : activeSection === "access" ? String(accessPolicyTotalCount) : activeSection === "audit" ? String(auditTotalCount) : activeSection === "aging" ? String(pcAgingRule.monitorMaxYears) : activeSection === "policy" ? String(MANAGEMENT_POLICY_FIELDS.length) : activeSection === "resources" ? String(resourceSchedules.length) : active.scoreOne;
  const heroScoreTwo = activeSection === "users" ? String(usersLockedCount) : activeSection === "roles" ? String(rolesActiveCount) : activeSection === "modules" ? String(moduleActiveRoleCount) : activeSection === "access" ? String(accessPolicyActiveCount) : activeSection === "audit" ? String(auditTodayCount) : activeSection === "aging" ? String(pcAgingRule.agingMinYears) : activeSection === "policy" ? (managementPolicyProfile?.profileName || "Global") : activeSection === "resources" ? String(resourceEngineers.length) : active.scoreTwo;

  const showToast = (tone: ToastTone, title: string, message: string) => {
    const toastId = Date.now();
    setSettingsToast({ id: toastId, tone, title, message });
    window.setTimeout(() => {
      setSettingsToast((current) => (current?.id === toastId ? null : current));
    }, 3600);
  };

  const loadUsers = async () => {
    if (usersLoadInFlightRef.current) return;
    usersLoadInFlightRef.current = true;
    setUsersLoading(true);
    setUsersError("");

    try {
      const payload = await apiRequest<UsersApiResponse>("/api/settings/users");
      const rows = Array.isArray(payload.data) ? payload.data : [];
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
      const payload = await apiRequest<RolesApiResponse>("/api/settings/roles");
      const rows = Array.isArray(payload.data) ? payload.data : [];
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
      const payload = await apiRequest<ModuleAccessApiResponse>("/api/settings/module-access");
      const modules = (payload.data?.modules || []).map((row) => normalizeModuleRow(row));
      const permissions = (payload.data?.permissions || []).map((row) => normalizeModulePermission(row));
      const roles = payload.data?.roles;

      setModuleCatalog([...modules].sort((a, b) => (Number(a.sortOrder || 0) - Number(b.sortOrder || 0)) || a.moduleName.localeCompare(b.moduleName)));
      setModulePermissions(permissions);
      if (Array.isArray(roles) && roles.length) {
        setAccessRoles(sortAccessRoles(roles.map(normalizeAccessRole)));
        setRolesLoaded(true);
      }
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
      const payload = await apiRequest<AccessPoliciesApiResponse>("/api/settings/access-controls");
      const rows = Array.isArray(payload.data) ? payload.data : [];
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
      const payload = await apiRequest<AuditLogsApiResponse>(`/api/settings/audit-logs?${buildAuditQueryString(page)}`);
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
        const payload = await apiRequest<AuditLogsApiResponse>(`/api/settings/audit-logs?${buildAuditQueryString(currentPage, exportPageSize)}`);
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
        auditDateFilter,
      ]
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
        await apiRequest("/api/settings/audit-logs/export-event", {
          method: "POST",
          body: JSON.stringify({
            recordCount: rows.length,
            filters: {
              search: filteredContentTerm,
              module: auditModuleFilter,
              severity: auditSeverityFilter,
              dateRange: auditDateFilter,
              exportMode: "all-filtered-records",
              maxExportRecords,
            },
          }),
        });
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
      sortOrder: Number(accessPolicyForm.sortOrder || 0) || 0,
    };

    try {
      if (editingAccessPolicyIndex === null) {
        const response = await apiRequest<AccessPoliciesApiResponse>("/api/settings/access-controls", { method: "POST", body: JSON.stringify(payload) });
        const created = Array.isArray(response.data) ? response.data[0] : response.data;
        setAccessPolicies((current) => sortAccessPolicies([...current, normalizeAccessPolicy(created || payload)]));
        showToast("success", "Access control added", `${name} has been added.`);
      } else {
        const policyId = getAccessPolicyId(accessPolicyForm);
        const response = await apiRequest<AccessPoliciesApiResponse>(`/api/settings/access-controls/${policyId}`, { method: "PUT", body: JSON.stringify(payload) });
        const updated = Array.isArray(response.data) ? response.data[0] : response.data;
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
      await apiRequest(`/api/settings/access-controls/${getAccessPolicyId(policy)}`, { method: "DELETE" });
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
      await apiRequest("/api/settings/module-access", {
        method: "PUT",
        body: JSON.stringify({ moduleId, roleId, canView: nextCanView }),
      });
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
      status: accessRoleForm.status === "Inactive" ? "Inactive" : "Active",
    };

    try {
      if (editingAccessRoleIndex === null) {
        await apiRequest<RolesApiResponse>("/api/settings/roles", { method: "POST", body: JSON.stringify(payload) });
        showToast("success", "Role created", `${roleName} has been added to Role Based Control.`);
      } else {
        const roleId = accessRoleForm.id || accessRoleForm.roleID;
        if (!roleId) throw new Error("Role ID is missing. Please reload the role list.");
        await apiRequest<RolesApiResponse>(`/api/settings/roles/${roleId}`, { method: "PUT", body: JSON.stringify(payload) });
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
      await apiRequest(`/api/settings/roles/${roleId}`, { method: "DELETE" });
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
      const payload = await apiRequest<PcAgingApiResponse>("/api/settings/pc-aging-rule");
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
      await apiRequest<PcAgingApiResponse>("/api/settings/pc-aging-rule", {
        method: "POST",
        body: JSON.stringify(normalizedRule),
      });
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

  const loadManagementPolicy = async () => {
    setManagementPolicyLoading(true);
    setManagementPolicyError("");

    try {
      const payload = await apiRequest<ManagementPolicyApiResponse>("/api/settings/management-policy");
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
      const payload = await apiRequest<ManagementPolicyApiResponse>("/api/settings/management-policy", {
        method: "POST",
        body: JSON.stringify({ values: normalizedValues }),
      });
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

  const pricingPayload = (rows: PricingRow[]) =>
    rows.map((row) => ({
      PricingID: row.PricingID,
      Category: row.Category,
      Brand: row.Brand,
      Model: row.Model,
      Price: Number(row.Price) || 0,
      IsExcluded: row.IsExcluded,
    }));

  const validatePricingRow = (row: PricingRow) => {
    if (!row.Category) return "Please select a device category before saving.";
    if (Number(row.Price) < 0) return "Market price cannot be negative.";
    return "";
  };

  const loadPricingCategories = async () => {
    try {
      const payload = await apiRequest<unknown>("/api/settings/device-pricing/categories");
      const options = readArrayPayload<string>(payload).filter(Boolean);
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
      const payload = await apiRequest<unknown>(`/api/settings/device-pricing/brands?category=${encodeURIComponent(cleanCategory)}`);
      const options = readArrayPayload<string>(payload).filter(Boolean);
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
      const payload = await apiRequest<unknown>(`/api/settings/device-pricing/models?category=${encodeURIComponent(cleanCategory)}&brand=${encodeURIComponent(cleanBrand)}`);
      const options = readArrayPayload<string>(payload).filter(Boolean);
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
      const payload = await apiRequest<unknown>("/api/settings/device-pricing");
      const rows = readArrayPayload<PricingPayloadRow>(payload).map((row, index) => makePricingRow(row, index));
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
      const payload = await apiRequest<{ success?: boolean; data?: PricingPayloadRow }>("/api/settings/device-pricing/row", {
        method: "POST",
        body: JSON.stringify(row),
      });

      const savedRow = payload?.data ? makePricingRow(payload.data) : row;
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
        await apiRequest(`/api/settings/device-pricing/${row.PricingID}`, { method: "DELETE" });
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
      await apiRequest("/api/settings/device-pricing", {
        method: "POST",
        body: JSON.stringify({
          pricing: pricingPayload(pricingRows),
        }),
      });

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

  const loadResourcePlanning = async () => {
    if (resourceLoading) return;

    setResourceLoading(true);
    setResourceError("");

    try {
      const [schedulePayload, engineerPayload] = await Promise.all([
        apiRequest<unknown>("/api/engineer-availability"),
        apiRequest<unknown>("/api/engineers"),
      ]);

      const schedules = readArrayPayload<ResourceSchedule>(schedulePayload);
      const engineers = readArrayPayload<ResourceEngineer>(engineerPayload).filter(isResourceSupportEngineer);

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
      Remarks: getResourceScheduleRemarks(row),
    });
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
      const path = resourceEditingId
        ? `/api/engineer-availability/${resourceEditingId}`
        : "/api/engineer-availability";

      await apiRequest(path, {
        method: resourceEditingId ? "PUT" : "POST",
        body: JSON.stringify(resourceForm),
      });

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

  const deleteResourceSchedule = async (row: ResourceSchedule) => {
    const scheduleId = getResourceScheduleId(row);
    if (!scheduleId) return;

    const engineerName = getResourceScheduleName(row) || "this engineer";
    const confirmed = window.confirm(`Remove leave schedule for ${engineerName}?`);
    if (!confirmed) return;

    setResourceSaving(true);

    try {
      await apiRequest(`/api/engineer-availability/${scheduleId}`, {
        method: "DELETE",
      });

      showToast("success", "Leave removed", "Engineer leave schedule removed.");
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
    if (activeSection !== "resources" || resourceLoaded || resourceLoading) return;
    void loadResourcePlanning();
  }, [activeSection, resourceLoaded, resourceLoading]);

  const addActivity = (_title: string, _desc: string) => {
    // Right-side audit snapshot panel was removed from the Settings screen.
    // Keep this no-op so existing save/user/role handlers remain stable.
  };

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
      remarks: userForm.remarks || "",
    };

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
      password: passwordProvided ? passwordValue : undefined,
    };

    try {
      if (editingUserIndex === null) {
        const response = await apiRequest<{ success?: boolean; data?: UserApiRow }>("/api/settings/users", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        const createdUser = mapUserApiRow(response.data || payload);
        setUsers((current) => sortUsersByCreatedDate([createdUser, ...current]));
        addActivity("Added user access", `${createdUser.name} · ${createdUser.role} · just now`);
        showToast("success", "User access added", `${createdUser.name} has been added.`);
      } else {
        const existingUser = users[editingUserIndex];
        const userId = existingUser?.id || existingUser?.userID;
        if (!userId) throw new Error("User ID is missing. Please reload the user list.");

        const response = await apiRequest<{ success?: boolean; data?: UserApiRow }>(`/api/settings/users/${userId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        let updatedUser = mapUserApiRow(response.data || { ...existingUser, ...payload });
        if (passwordProvided) {
          const resetResponse = await apiRequest<{ success?: boolean; data?: UserApiRow }>(`/api/settings/users/${userId}/reset-password`, {
            method: "PUT",
            body: JSON.stringify({ password: passwordValue }),
          });
          updatedUser = mapUserApiRow(resetResponse.data || updatedUser);
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

      await apiRequest(`/api/settings/users/${userId}`, { method: "DELETE" });
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
    document.documentElement.classList.add("ema-settings-page-active");
    document.body.classList.add("ema-settings-page-active");

    return () => {
      document.documentElement.classList.remove("ema-settings-page-active");
      document.body.classList.remove("ema-settings-page-active");
    };
  }, []);

  const visibleUsers = users.filter((user) => !filteredContentTerm || `${user.name} ${user.username || ""} ${user.email} ${user.role} ${user.status}`.toLowerCase().includes(filteredContentTerm));

  return (
    <main className="settings-module-root ema-settings-pro container-fluid p-3 p-xl-4" data-section={activeSection}>
      <input aria-hidden="true" id="globalSearch" type="hidden" />
      <button hidden id="themeBtn" type="button">
        <span id="themeLabel">Dark Mode</span>
      </button>

      <div className="settings-layout d-grid gap-3">
        <aside className="settings-menu ema-panel-surface">
          <div className="panel-head">
            <span>SETTINGS CENTER</span>
            <strong>Configuration Area</strong>
            <small>Select system setup domain</small>
          </div>

          <div className="settings-menu-list" id="settingsMenu" role="tablist" aria-label="Settings navigation">
            {sectionOrder.map((key) => {
              const item = sections[key];
              return (
                <button
                  key={key}
                  className={`setting-btn ${key === activeSection ? "active" : ""}`}
                  type="button"
                  data-section={key}
                  onClick={() => {
                    setActiveSection(key);
                    setSectionSearch("");
                  }}
                >
                  <span className="setting-icon"><Icon name={item.icon} /></span>
                  <span><strong>{item.title}</strong><small>{item.desc}</small></span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="settings-content d-grid gap-3">
          <div className={`settings-hero ema-panel-surface ${active.key === "users" ? "users-hero" : ""}`}>
            <div>
              <span className="eyebrow">ADMINISTRATION CONTROL</span>
              <h2 id="heroTitle">{active.title}</h2>
              <p id="heroDesc">{active.desc}</p>
            </div>
            <div className={`settings-score ${active.key === "users" ? "users-hero-score" : ""}`}>
              {active.key === "users" ? (
                <>
                  <div className="score-box">
                    <span>Total Users</span>
                    <strong>{usersTotalCount}</strong>
                    <small>Users records</small>
                  </div>
                  <div className="score-box">
                    <span>Active Users</span>
                    <strong>{usersActiveCount}</strong>
                    <small>Can access system</small>
                  </div>
                  <div className="score-box">
                    <span>Locked Users</span>
                    <strong>{usersLockedCount}</strong>
                    <small>Blocked accounts</small>
                  </div>
                  <div className="score-box">
                    <span>MFA Enabled</span>
                    <strong>{usersMfaCount}</strong>
                    <small>Second Factor Required</small>
                  </div>
                </>
              ) : active.key === "roles" ? (
                <>
                  <div className="score-box">
                    <span>Total Roles</span>
                    <strong>{rolesTotalCount}</strong>
                    <small>Roles Records</small>
                  </div>
                  <div className="score-box">
                    <span>Active Roles</span>
                    <strong>{rolesActiveCount}</strong>
                    <small>Assigned To Users</small>
                  </div>
                </>
              ) : active.key === "modules" ? (
                <>
                  <div className="score-box">
                    <span>Total Modules</span>
                    <strong>{moduleTotalCount}</strong>
                    <small>Modules Records</small>
                  </div>
                  <div className="score-box">
                    <span>Active Roles</span>
                    <strong>{moduleActiveRoleCount}</strong>
                    <small>Controlled by RBAC</small>
                  </div>
                </>
              ) : active.key === "access" ? (
                <>
                  <div className="score-box">
                    <span>Total Controls</span>
                    <strong>{accessPolicyTotalCount}</strong>
                    <small>Access Controls Records</small>
                  </div>
                  <div className="score-box">
                    <span>Active Controls</span>
                    <strong>{accessPolicyActiveCount}</strong>
                    <small>Security Rules Enabled</small>
                  </div>
                </>
              ) : (
                <>
                  <div className="score-box">
                    <span>{active.subtitle}</span>
                    <strong id="scoreOne">{heroScoreOne}</strong>
                    <small>{active.subtitle}</small>
                  </div>
                  <div className="score-box">
                    <span>Reference</span>
                    <strong id="scoreTwo">{heroScoreTwo}</strong>
                    <small>Control Value</small>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className={`content-shell ema-panel-surface ${activeSection === "users" ? "users-content-shell" : activeSection === "roles" ? "roles-content-shell" : activeSection === "modules" ? "modules-content-shell" : activeSection === "access" ? "access-content-shell" : activeSection === "audit" ? "audit-content-shell" : ""}`}>
            {false && (
              <div className={`content-head ${activeSection === "audit" ? "audit-export-only-head" : ""}`}>
                {activeSection !== "audit" && (
                  <div>
                    <span className="section-tag" id="sectionTag">{active.tag}</span>
                    <h3 id="sectionTitle">{active.title}</h3>
                    <p id="sectionDesc">{active.desc}</p>
                  </div>
                )}
                <div className="content-actions">
                  {activeSection === "roles" ? (
                    <>
                      <button className="soft-btn" type="button" onClick={loadAccessRoles} disabled={rolesLoading}>{rolesLoading ? "Loading..." : "Refresh"}</button>
                      <button className="primary-btn" type="button" onClick={() => openAccessRoleModal(null)}>Add Role</button>
                    </>
                  ) : activeSection === "audit" ? (
                    <button className="primary-btn" type="button" onClick={exportAuditLogs} disabled={auditLoading || filteredAuditLogs.length === 0}>Export CSV</button>
                  ) : (
                    <>
                      <button className="soft-btn" id="resetBtn" type="button" onClick={resetSection} disabled={(activeSection === "pricing" && pricingSaving) || (activeSection === "aging" && pcAgingSaving)}>Reset</button>
                      {activeSection === "pricing" && (
                        <button className="soft-btn" type="button" onClick={addPricingRow}>+ Add Custom Pricing</button>
                      )}
                      <button className="primary-btn" id="saveBtn" type="button" onClick={saveSection} disabled={(activeSection === "pricing" && pricingSaving) || (activeSection === "aging" && pcAgingSaving)}>
                        {activeSection === "pricing" ? (pricingSaving ? "Saving..." : "Save Pricing") : activeSection === "aging" ? (pcAgingSaving ? "Saving..." : "Save Changes") : "Save Changes"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {activeSection !== "users" && activeSection !== "access" && activeSection !== "audit" && activeSection !== "aging" && activeSection !== "policy" && activeSection !== "resources" && (
              <div className={`content-toolbar ${activeSection === "users" ? "users-toolbar" : activeSection === "roles" ? "roles-toolbar" : activeSection === "modules" ? "modules-toolbar" : ""}`}>
                <label className="section-search">
                  <SearchSvg />
                  <input
                    id="sectionSearch"
                    placeholder={activeSection === "users" ? "Search users by name, email or role..." : activeSection === "roles" ? "Search roles by name or description..." : activeSection === "modules" ? "Search modules by name or description..." : activeSection === "resources" ? "Search engineer, role, date or remarks..." : activeSection === "audit" ? "Search audit logs by user, module or action..." : "Search current settings..."}
                    value={sectionSearch}
                    onChange={(event) => setSectionSearch(event.target.value)}
                  />
                </label>
                {activeSection === "roles" && (
                  <div className="content-actions toolbar-actions">
                    <button className="soft-btn" type="button" onClick={loadAccessRoles} disabled={rolesLoading}>{rolesLoading ? "Loading..." : "Refresh"}</button>
                    <button className="primary-btn" type="button" onClick={() => openAccessRoleModal(null)}>Add Role</button>
                  </div>
                )}
                {activeSection === "modules" && (
                  <div className="content-actions toolbar-actions">
                    <button className="soft-btn" type="button" onClick={loadModuleAccess} disabled={moduleLoading}>{moduleLoading ? "Loading..." : "Refresh"}</button>
                  </div>
                )}
                {activeSection !== "users" && activeSection !== "roles" && activeSection !== "modules" && activeSection !== "audit" && activeSection !== "resources" && (
                  <div className="settings-toolbar-right">
                    <SettingSelect
                      className="section-filter-select"
                      value="all"
                      options={[
                        { value: "all", label: "All Status" },
                        { value: "active", label: "Active" },
                        { value: "review", label: "Review" },
                        { value: "locked", label: "Locked" },
                      ]}
                      onChange={() => undefined}
                      ariaLabel="Section filter"
                    />

                    {(activeSection === "pricing" || activeSection === "aging") && (
                      <div className="content-actions toolbar-actions settings-primary-actions">
                        <button className="soft-btn" id="resetBtn" type="button" onClick={resetSection} disabled={(activeSection === "pricing" && pricingSaving) || (activeSection === "aging" && pcAgingSaving)}>Reset</button>
                        {activeSection === "pricing" && (
                          <button className="soft-btn" type="button" onClick={addPricingRow}>+ Add Custom Pricing</button>
                        )}
                        <button className="primary-btn" id="saveBtn" type="button" onClick={saveSection} disabled={(activeSection === "pricing" && pricingSaving) || (activeSection === "aging" && pcAgingSaving)}>
                          {activeSection === "pricing" ? (pricingSaving ? "Saving..." : "Save Pricing") : activeSection === "aging" ? (pcAgingSaving ? "Saving..." : "Save Changes") : "Save Changes"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="content-body" id="contentBody">
              {activeSection === "roles" && <RoleContent roles={accessRoles} loading={rolesLoading} error={rolesError} search={filteredContentTerm} onEdit={openAccessRoleModal} onDelete={requestDeleteAccessRole} />}
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
              {activeSection === "pricing" && <PricingContent search={filteredContentTerm} rows={pricingRows} categoryOptions={categoryOptions} brandOptionsByCategory={brandOptionsByCategory} modelOptionsByKey={modelOptionsByKey} loading={pricingLoading} saving={pricingSaving} savingRowId={pricingRowSavingId} error={pricingError} onAdd={addPricingRow} onChange={updatePricingRow} onSaveRow={savePricingRow} onRequestDelete={requestDeletePricingRow} />}
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
              {activeSection === "risk" && <RiskContent search={filteredContentTerm} />}
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
                  onEdit={editResourceSchedule}
                  onDelete={deleteResourceSchedule}
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

      <SettingsToast toast={settingsToast} onClose={() => setSettingsToast(null)} />
    </main>
  );
}


function ResourcePlanningContent({
  search,
  engineers,
  schedules,
  form,
  editingId,
  loading,
  saving,
  error,
  onFormChange,
  onSave,
  onEdit,
  onDelete,
  onReset,
  onReload,
}: {
  search: string;
  engineers: ResourceEngineer[];
  schedules: ResourceSchedule[];
  form: ResourceScheduleForm;
  editingId: number | null;
  loading: boolean;
  saving: boolean;
  error: string;
  onFormChange: (patch: Partial<ResourceScheduleForm>) => void;
  onSave: () => void;
  onEdit: (row: ResourceSchedule) => void;
  onDelete: (row: ResourceSchedule) => void;
  onReset: () => void;
  onReload: () => void;
}) {
  type ResourceSortKey = "created" | "engineer" | "role" | "period" | "status";
  type ResourceSortDirection = "asc" | "desc";

  const pageSize = 5;
  const query = search.trim().toLowerCase();

  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortKey, setSortKey] = useState<ResourceSortKey>("created");
  const [sortDirection, setSortDirection] = useState<ResourceSortDirection>("desc");

  const supportEngineers = engineers.filter(isResourceSupportEngineer);
  const selectedEngineer = supportEngineers.find((engineer) => getResourceEngineerUserId(engineer) === form.UserID);

  const getCreatedSortValue = (row: ResourceSchedule) => {
    const createdValue = String(row.CreatedAt ?? row.createdAt ?? row.UpdatedAt ?? row.updatedAt ?? row.StartDate ?? row.EndDate ?? "").trim();
    const createdTime = createdValue ? new Date(createdValue).getTime() : Number.NaN;

    if (Number.isFinite(createdTime)) return createdTime;

    const fallbackId = getResourceScheduleId(row);
    return Number.isFinite(fallbackId) ? fallbackId : 0;
  };

  const getPeriodSortValue = (row: ResourceSchedule) => {
    const startValue = String(row.StartDate || "").trim();
    const startTime = startValue ? new Date(startValue).getTime() : Number.NaN;
    return Number.isFinite(startTime) ? startTime : 0;
  };

  const roleOptions: DropdownOption[] = [
    { value: "all", label: "All Roles" },
    ...Array.from(new Set(schedules.map((row) => getResourceScheduleRole(row) || "Support").filter(Boolean)))
      .sort((a, b) => a.localeCompare(b))
      .map((role) => ({ value: role, label: role })),
  ];

  const statusOptions: DropdownOption[] = [
    { value: "all", label: "All Statuses" },
    ...Array.from(new Set(schedules.map((row) => getResourceScheduleStatus(row) || "On Leave").filter(Boolean)))
      .sort((a, b) => a.localeCompare(b))
      .map((status) => ({ value: status, label: status })),
  ];

  const filteredSchedules = schedules.filter((row) => {
    const rowStatus = getResourceScheduleStatus(row) || "On Leave";
    const rowRole = getResourceScheduleRole(row) || "Support";

    if (statusFilter !== "all" && rowStatus !== statusFilter) return false;
    if (roleFilter !== "all" && rowRole !== roleFilter) return false;

    if (!query) return true;

    return [
      getResourceScheduleName(row),
      rowRole,
      getResourceScheduleDepartment(row),
      rowStatus,
      getResourceScheduleRemarks(row),
      row.StartDate,
      row.EndDate,
      row.CreatedAt,
      row.createdAt,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  const sortedSchedules = [...filteredSchedules].sort((left, right) => {
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

    return leftValue.localeCompare(rightValue) * direction;
  });

  const totalPages = Math.max(1, Math.ceil(sortedSchedules.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedSchedules = sortedSchedules.slice(pageStartIndex, pageStartIndex + pageSize);
  const showingFrom = sortedSchedules.length === 0 ? 0 : pageStartIndex + 1;
  const showingTo = Math.min(pageStartIndex + pageSize, sortedSchedules.length);
  const selectedRole = selectedEngineer ? getResourceEngineerRole(selectedEngineer) : "";
  const filterActive = statusFilter !== "all" || roleFilter !== "all";

  useEffect(() => {
    setCurrentPage(1);
  }, [query, statusFilter, roleFilter, sortKey, sortDirection, schedules.length]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const updateSort = (nextSortKey: ResourceSortKey) => {
    if (sortKey === nextSortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection(nextSortKey === "created" || nextSortKey === "period" ? "desc" : "asc");
  };

  const sortIndicator = (targetKey: ResourceSortKey) => {
    if (sortKey !== targetKey) return "↕";
    return sortDirection === "asc" ? "↑" : "↓";
  };

  const resetTableFilters = () => {
    setStatusFilter("all");
    setRoleFilter("all");
    setSortKey("created");
    setSortDirection("desc");
    setCurrentPage(1);
  };

  return (
    <div className="resource-planning-module">
      {error && (
        <div className="settings-inline-alert error">
          <strong>Resource Planning API error</strong>
          <span>{error}</span>
        </div>
      )}

      <section className="resource-command-card">
        <div>
          <span className="section-tag">RESOURCE PLANNING</span>
          <h3>Engineer Leave & Assignment Visibility</h3>
          <p>
            Manage engineer leave using EMA users only. Service Desk assignment will still allow selection,
            but will warn users when an engineer is on leave.
          </p>
        </div>

        <div className="resource-command-actions">
          <button className="soft-btn" type="button" onClick={onReload} disabled={loading || saving}>
            {loading ? "Loading..." : "Refresh"}
          </button>
          <button className="soft-btn" type="button" onClick={onReset} disabled={saving}>
            Clear
          </button>
          <button className="primary-btn" type="button" onClick={onSave} disabled={saving || loading}>
            {saving ? "Saving..." : editingId ? "Update Leave" : "Add Leave"}
          </button>
        </div>
      </section>

      <section className="resource-workbench">
        <article className="resource-form-card">
          <div className="resource-card-head">
            <div>
              <span className="section-tag">{editingId ? "UPDATE SCHEDULE" : "NEW SCHEDULE"}</span>
              <h4>{editingId ? "Edit Engineer Leave" : "Add Engineer Leave"}</h4>
              <p>Leave only creates a warning. It does not block ticket assignment.</p>
            </div>
          </div>

          <div className="resource-form-grid">
            <label className="form-field">
              Engineer
              <SettingSelect
                value={form.UserID}
                placeholder="Select support engineer"
                ariaLabel="Resource planning engineer"
                className="resource-setting-select"
                onChange={(value) => onFormChange({ UserID: value })}
                options={[
                  { value: "", label: "Select support engineer" },
                  ...supportEngineers.map((engineer) => {
                    const userId = getResourceEngineerUserId(engineer);
                    const engineerRole = getResourceEngineerRole(engineer);
                    const department = getResourceEngineerDepartment(engineer);
                    const label = `${getResourceEngineerName(engineer)} · ${engineerRole}${department ? ` · ${department}` : ""}`;

                    return {
                      value: userId,
                      label,
                    };
                  }),
                ]}
              />
            </label>

            <label className="form-field">
              Leave Status
              <SettingSelect
                value={form.Status}
                placeholder="Select leave status"
                ariaLabel="Resource planning leave status"
                className="resource-setting-select"
                onChange={(value) => onFormChange({ Status: value })}
                options={[
                  { value: "On Leave", label: "On Leave" },
                  { value: "Training", label: "Training" },
                  { value: "On Site", label: "On Site" },
                  { value: "Unavailable", label: "Unavailable" },
                ]}
              />
            </label>

            <label className="form-field">
              Start Date
              <input
                className="setting-input"
                type="date"
                value={form.StartDate}
                onChange={(event) => onFormChange({ StartDate: event.target.value })}
              />
            </label>

            <label className="form-field">
              End Date
              <input
                className="setting-input"
                type="date"
                value={form.EndDate}
                onChange={(event) => onFormChange({ EndDate: event.target.value })}
              />
            </label>

            <label className="form-field resource-wide">
              Remarks
              <textarea
                className="setting-input resource-textarea"
                value={form.Remarks}
                onChange={(event) => onFormChange({ Remarks: event.target.value })}
                placeholder="Example: Annual leave / site visit / training day"
              />
            </label>
          </div>

          {selectedEngineer && (
            <div className="resource-selected-engineer">
              <strong>{getResourceEngineerName(selectedEngineer)}</strong>
              <span>{selectedRole || "Support"}{getResourceEngineerDepartment(selectedEngineer) ? ` · ${getResourceEngineerDepartment(selectedEngineer)}` : ""}</span>
            </div>
          )}
        </article>

        <article className="resource-table-card">
          <div className="resource-card-head resource-table-head">
            <div>
              <span className="section-tag">SCHEDULES</span>
              <h4>Active & Upcoming Leave</h4>
              <p>Latest leave schedules are shown first. Click a table title to sort.</p>
            </div>

            <div className="resource-table-filters">
              <SettingSelect
                value={statusFilter}
                placeholder="All Statuses"
                ariaLabel="Filter leave status"
                className="resource-filter-select"
                onChange={setStatusFilter}
                options={statusOptions}
              />
              <SettingSelect
                value={roleFilter}
                placeholder="All Roles"
                ariaLabel="Filter support role"
                className="resource-filter-select"
                onChange={setRoleFilter}
                options={roleOptions}
              />
              {filterActive && (
                <button className="soft-btn" type="button" onClick={resetTableFilters}>
                  Reset
                </button>
              )}
            </div>
          </div>

          <div className="resource-table-wrap">
            <table className="resource-table">
              <thead>
                <tr>
                  <th>
                    <button className="resource-sort-button" type="button" onClick={() => updateSort("engineer")}>
                      Engineer <span>{sortIndicator("engineer")}</span>
                    </button>
                  </th>
                  <th>
                    <button className="resource-sort-button" type="button" onClick={() => updateSort("role")}>
                      Role <span>{sortIndicator("role")}</span>
                    </button>
                  </th>
                  <th>
                    <button className="resource-sort-button" type="button" onClick={() => updateSort("period")}>
                      Period <span>{sortIndicator("period")}</span>
                    </button>
                  </th>
                  <th>
                    <button className="resource-sort-button" type="button" onClick={() => updateSort("status")}>
                      Status <span>{sortIndicator("status")}</span>
                    </button>
                  </th>
                  <th>Remarks</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6}>Loading resource planning...</td>
                  </tr>
                )}

                {!loading && sortedSchedules.length === 0 && (
                  <tr>
                    <td colSpan={6}>No engineer leave schedule found.</td>
                  </tr>
                )}

                {!loading && paginatedSchedules.map((row) => {
                  const scheduleId = getResourceScheduleId(row);

                  return (
                    <tr key={scheduleId || `${getResourceScheduleName(row)}-${row.StartDate}-${row.EndDate}`}>
                      <td>
                        <strong>{getResourceScheduleName(row) || "Unknown engineer"}</strong>
                        <small>{getResourceScheduleDepartment(row) || "No department"}</small>
                      </td>
                      <td>{getResourceScheduleRole(row) || "Support"}</td>
                      <td>
                        <strong>{String(row.StartDate || "").slice(0, 10)}</strong>
                        <small>to {String(row.EndDate || "").slice(0, 10)}</small>
                      </td>
                      <td><span className="resource-status-pill">{getResourceScheduleStatus(row)}</span></td>
                      <td>{getResourceScheduleRemarks(row) || "-"}</td>
                      <td>
                        <div className="resource-row-actions">
                          <button className="soft-btn" type="button" onClick={() => onEdit(row)}>Edit</button>
                          <button className="danger-btn" type="button" onClick={() => onDelete(row)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!loading && sortedSchedules.length > 0 && (
            <div className="uam-pagination global-style resource-pagination">
              <div className="uam-page-summary">Page {safeCurrentPage} / {totalPages}</div>
              <div className="uam-pagination-info">Showing {showingFrom}-{showingTo} of {sortedSchedules.length} leave records</div>
              <div className="uam-pagination-controls global-style" aria-label="Resource planning pagination">
                <button className="uam-page-icon" type="button" onClick={() => setCurrentPage(1)} disabled={safeCurrentPage === 1} aria-label="First page">«</button>
                <button className="uam-page-icon" type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={safeCurrentPage === 1} aria-label="Previous page">‹</button>
                <span className="uam-page-current">{safeCurrentPage}</span>
                <button className="uam-page-icon" type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={safeCurrentPage === totalPages} aria-label="Next page">›</button>
                <button className="uam-page-icon" type="button" onClick={() => setCurrentPage(totalPages)} disabled={safeCurrentPage === totalPages} aria-label="Last page">»</button>
              </div>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}

function RoleContent({ roles, loading, error, search, onEdit, onDelete }: { roles: AccessRole[]; loading: boolean; error: string; search: string; onEdit: (index: number) => void; onDelete: (index: number) => void }) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filteredRoles = roles.filter((role) => !search || `${role.name} ${role.description} ${role.status} ${role.approvalRequired ? "approval required" : "standard"}`.toLowerCase().includes(search));
  const totalPages = Math.max(1, Math.ceil(filteredRoles.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedRoles = filteredRoles.slice(pageStartIndex, pageStartIndex + pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, roles.length]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const getActualIndex = (role: AccessRole) => {
    const roleId = role.id || role.roleID;
    if (roleId !== undefined && roleId !== null) {
      const byId = roles.findIndex((item) => String(item.id || item.roleID) === String(roleId));
      if (byId >= 0) return byId;
    }
    return roles.indexOf(role);
  };

  return (
    <div className="uam-panel clean">
      {error && (
        <div className="settings-inline-alert error">
          <strong>Role API error</strong>
          <span>{error}</span>
        </div>
      )}

      <div className="user-access-table advanced clean-table role-standard-table">
        <div className="user-row head advanced clean-table-row role-standard-row">
          <div className="user-cell">No</div>
          <div className="user-cell">Role</div>
          <div className="user-cell">Approval</div>
          <div className="user-cell">Status</div>
          <div className="user-cell">Action</div>
        </div>

        {loading && <div className="settings-empty-state">Loading role records from EMA_Roles...</div>}
        {!loading && filteredRoles.length === 0 && <div className="settings-empty-state">No data available.</div>}

        {!loading && paginatedRoles.map((role, index) => {
          const actualIndex = getActualIndex(role);
          return (
            <div className="user-row advanced clean-table-row role-standard-row" key={`${role.id || role.roleKey}-${actualIndex}`}>
              <div className="user-cell row-number"><span className="row-index-pill">{String(pageStartIndex + index + 1).padStart(2, "0")}</span></div>
              <div className="user-cell">
                <div className="role-info-cell">
                  <strong>{role.name}</strong>
                  <small>{role.description || "No description set"}</small>
                </div>
              </div>
              <div className="user-cell"><span className={`approval-chip ${role.approvalRequired ? "required" : "standard"}`}>{role.approvalRequired ? "Required" : "Standard"}</span></div>
              <div className="user-cell"><span className={`user-pill ${role.status === "Active" ? "active" : role.status === "Inactive" ? "inactive" : "review"}`}>{role.status === "Inactive" ? "Inactive" : "Active"}</span></div>
              <div className="user-cell">
                <div className="row-actions user-row-action-wrap clean">
                  <button className="mini-btn icon-only edit" type="button" title="Edit role" aria-label="Edit role" onClick={() => onEdit(actualIndex)}>
                    <PencilSvg />
                  </button>
                  <button
                    className="mini-btn icon-only delete"
                    type="button"
                    title={isProtectedSuperAdminRole(role) ? "Super Admin is protected and cannot be deleted" : "Delete role"}
                    aria-label={isProtectedSuperAdminRole(role) ? "Protected role" : "Delete role"}
                    disabled={isProtectedSuperAdminRole(role)}
                    onClick={() => onDelete(actualIndex)}
                  >
                    <TrashSvg />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!loading && filteredRoles.length > 0 && (
        <div className="uam-pagination global-style">
          <div className="uam-page-summary">Page {safeCurrentPage} of {totalPages}</div>
          <div className="uam-pagination-controls global-style" aria-label="Role based control pagination">
            <button className="uam-page-icon" type="button" onClick={() => setCurrentPage(1)} disabled={safeCurrentPage === 1} aria-label="First page">«</button>
            <button className="uam-page-icon" type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={safeCurrentPage === 1} aria-label="Previous page">‹</button>
            <span className="uam-page-current">{safeCurrentPage}</span>
            <button className="uam-page-icon" type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={safeCurrentPage === totalPages} aria-label="Next page">›</button>
            <button className="uam-page-icon" type="button" onClick={() => setCurrentPage(totalPages)} disabled={safeCurrentPage === totalPages} aria-label="Last page">»</button>
          </div>
        </div>
      )}
    </div>
  );
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
    <div ref={menuRef} className="uam-filter-menu uam-filter-menu-portal" style={menuStyle} role="listbox" aria-label={`${label} filter`}>
      {options.map((option) => (
        <button
          key={option}
          className={`uam-filter-option ${option === value ? "selected" : ""}`}
          type="button"
          onClick={() => onSelect(option)}
        >
          <span>{option}</span>
          {option === value && <span className="uam-filter-check">✓</span>}
        </button>
      ))}
    </div>,
    document.body
  ) : null;

  return (
    <div className={`uam-filter-dropdown ${open ? "open" : ""}`}>
      <button ref={triggerRef} className="uam-filter-trigger" type="button" onClick={onToggle} aria-expanded={open}>
        <span>{value}</span>
        <ChevronDownSvg />
      </button>
      {menuNode}
    </div>
  );
}


type DropdownOption = string | { value: string; label: string };

function dropdownOptionValue(option: DropdownOption) {
  return typeof option === "string" ? option : option.value;
}

function dropdownOptionLabel(option: DropdownOption) {
  return typeof option === "string" ? option : option.label;
}

function SettingSelect({
  value,
  options,
  onChange,
  disabled = false,
  placeholder = "Select option",
  className = "",
  ariaLabel,
}: {
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
      zIndex: 2147483600,
    });
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
    <div ref={menuRef} className="uam-filter-menu uam-filter-menu-portal setting-select-menu" style={menuStyle} role="listbox" aria-label={ariaLabel || placeholder}>
      {options.map((option) => {
        const optionValue = dropdownOptionValue(option);
        const optionLabel = dropdownOptionLabel(option);
        const selectedOption = optionValue === value;

        return (
          <button
            key={`${optionValue}-${optionLabel}`}
            className={`uam-filter-option ${selectedOption ? "selected" : ""}`}
            type="button"
            role="option"
            aria-selected={selectedOption}
            onClick={() => {
              onChange(optionValue);
              setOpen(false);
            }}
          >
            <span>{optionLabel}</span>
            {selectedOption && <span className="uam-filter-check">✓</span>}
          </button>
        );
      })}
    </div>,
    document.body
  ) : null;

  return (
    <div className={`uam-filter-dropdown setting-select-dropdown ${open ? "open" : ""} ${disabled ? "disabled" : ""} ${className}`}>
      <button
        ref={triggerRef}
        className="uam-filter-trigger setting-select-trigger"
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


function UserAccessContent({ users, sourceUsers, loading, error, search, onSearchChange, onReload, onAdd, onEdit, onDelete }: { users: UserAccess[]; sourceUsers: UserAccess[]; loading: boolean; error: string; search: string; onSearchChange: (value: string) => void; onReload: () => void; onAdd: () => void; onEdit: (index: number) => void; onDelete: (index: number) => void }) {
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [openFilter, setOpenFilter] = useState<"status" | "role" | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const roleOptions = Array.from(new Set(sourceUsers.flatMap((user) => normalizeUserRoles(user.roles || user.role || user.roleName)))).sort();
  const filteredUsers = users.filter((user) => {
    const matchesStatus = statusFilter === "All Status" || user.status === statusFilter;
    const matchesRole = roleFilter === "All Roles" || hasUserRole(user, roleFilter);
    return matchesStatus && matchesRole;
  });
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedUsers = filteredUsers.slice(pageStartIndex, pageStartIndex + pageSize);
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, roleFilter, users.length]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const getActualIndex = (user: UserAccess) => {
    const userId = user.id || user.userID;
    if (userId !== undefined && userId !== null) {
      const byId = sourceUsers.findIndex((item) => String(item.id || item.userID) === String(userId));
      if (byId >= 0) return byId;
    }
    return sourceUsers.indexOf(user);
  };

  return (
    <div className="uam-panel clean">
      <div className="user-access-commandbar">
        <label className="section-search user-search-inline">
          <SearchSvg />
          <input
            placeholder="Search users by name, email or role..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>

        <div className="uam-filter-grid clean compact">
          <FilterDropdown
            label="Status"
            value={statusFilter}
            options={["All Status", "Active", "Review", "Locked", "Inactive"]}
            open={openFilter === "status"}
            onToggle={() => setOpenFilter((current) => current === "status" ? null : "status")}
            onSelect={(value) => { setStatusFilter(value); setOpenFilter(null); }}
            onClose={() => setOpenFilter(null)}
          />
          <FilterDropdown
            label="Role"
            value={roleFilter}
            options={["All Roles", ...roleOptions]}
            open={openFilter === "role"}
            onToggle={() => setOpenFilter((current) => current === "role" ? null : "role")}
            onSelect={(value) => { setRoleFilter(value); setOpenFilter(null); }}
            onClose={() => setOpenFilter(null)}
          />
        </div>

        <div className="uam-actions-right">
          <button className="soft-btn" type="button" onClick={onReload} disabled={loading}>{loading ? "Loading..." : "Refresh"}</button>
          <button className="primary-btn" type="button" onClick={onAdd}>Add New User</button>
        </div>
      </div>

      {error && (
        <div className="settings-inline-alert error">
          <strong>User API error</strong>
          <span>{error}</span>
        </div>
      )}

      <div className="user-access-table advanced clean-table">
        <div className="user-row head advanced clean-table-row">
          <div className="user-cell">No</div>
          <div className="user-cell">User</div>
          <div className="user-cell">Roles</div>
          <div className="user-cell">MFA</div>
          <div className="user-cell">Status</div>
          <div className="user-cell">Last Login</div>
          <div className="user-cell">Action</div>
        </div>

        {loading && (
          <div className="settings-empty-state">Loading user access records from EMA_Users...</div>
        )}

        {!loading && filteredUsers.length === 0 && (
          <div className="settings-empty-state">No data available.</div>
        )}

        {!loading && paginatedUsers.map((user, index) => {
          const actualIndex = getActualIndex(user);
          const isMfa = Boolean(user.requireMFA || user.mfa);
          const roles = normalizeUserRoles(user.roles || user.role || user.roleName);
          const visibleRoles = roles.slice(0, 2);
          const hiddenRoleCount = Math.max(roles.length - visibleRoles.length, 0);
          return (
            <div className="user-row advanced clean-table-row" data-user-index={actualIndex} key={`${user.id || user.email}-${actualIndex}`}>
              <div className="user-cell row-number"><span className="row-index-pill">{String(pageStartIndex + index + 1).padStart(2, "0")}</span></div>
              <div className="user-cell">
                <div className="user-name"><i className="user-mini-avatar">{initials(user.name)}</i><div><strong>{user.name}</strong><small>{user.email || user.username || "No email set"}</small></div></div>
              </div>
              <div className="user-cell">
                <div className="role-chip-stack">
                  {visibleRoles.map((role) => <span className="role-soft-chip" key={role}>{role}</span>)}
                  {hiddenRoleCount > 0 && <span className="role-more-chip">+{hiddenRoleCount}</span>}
                </div>
              </div>
              <div className="user-cell"><span className={`mfa-pill ${isMfa ? "on" : "off"}`}>{isMfa ? "On" : "Off"}</span></div>
              <div className="user-cell"><span className={`user-pill ${user.status === "Active" ? "active" : user.status === "Locked" ? "locked" : user.status === "Inactive" ? "inactive" : "review"}`}>{user.status}</span></div>
              <div className="user-cell"><span className="muted-cell">{formatUserDate(user.lastLoginAt)}</span></div>
              <div className="user-cell">
                <div className="row-actions user-row-action-wrap clean">
                  <button className="mini-btn icon-only edit" type="button" onClick={() => onEdit(actualIndex)} aria-label="Edit user access" title="Edit">
                    <PencilSvg />
                  </button>
                  <button className="mini-btn icon-only delete" type="button" onClick={() => onDelete(actualIndex)} aria-label="Delete user access" title="Delete">
                    <TrashSvg />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!loading && filteredUsers.length > 0 && (
        <div className="uam-pagination global-style">
          <div className="uam-page-summary">Page {safeCurrentPage} of {totalPages}</div>
          <div className="uam-pagination-controls global-style" aria-label="User access pagination">
            <button className="uam-page-icon" type="button" onClick={() => setCurrentPage(1)} disabled={safeCurrentPage === 1} aria-label="First page">«</button>
            <button className="uam-page-icon" type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={safeCurrentPage === 1} aria-label="Previous page">‹</button>
            <span className="uam-page-current">{safeCurrentPage}</span>
            <button className="uam-page-icon" type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={safeCurrentPage === totalPages} aria-label="Next page">›</button>
            <button className="uam-page-icon" type="button" onClick={() => setCurrentPage(totalPages)} disabled={safeCurrentPage === totalPages} aria-label="Last page">»</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ModuleMatrixContent({ roles, modules, permissions, loading, error, search, savingKey, onReload, onToggle }: { roles: AccessRole[]; modules: ModuleControlModule[]; permissions: ModulePermission[]; loading: boolean; error: string; search: string; savingKey: string; onReload: () => void; onToggle: (module: ModuleControlModule, role: AccessRole) => void }) {
  const term = search.trim().toLowerCase();

  const sortedModules = [...modules].sort((a, b) => {
    const aOrder = Number(a.sortOrder || 0);
    const bOrder = Number(b.sortOrder || 0);
    return aOrder - bOrder || a.moduleName.localeCompare(b.moduleName);
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

  const moduleMatches = (module: ModuleControlModule) => {
    const parent = moduleById.get(String(module.parentModuleID ?? ""));
    const haystack = `${module.moduleName} ${module.description} ${module.category || ""} ${module.routePath || ""} ${parent?.moduleName || ""}`.toLowerCase();
    return !term || haystack.includes(term);
  };

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
        { type: "group", groupName: group.groupName },
        ...visibleModules.map((module) => ({
          type: "module" as const,
          module,
          isSubmodule: Boolean(module.parentModuleID && String(module.parentModuleID) !== "0" && moduleById.has(String(module.parentModuleID))) || group.groupName !== module.moduleName,
        })),
      ];
    });

  const visibleModuleCount = groupedRows.filter((row) => row.type === "module").length;
  let displayIndex = 0;

  return (
    <div className="uam-panel clean module-control-panel">
      {error && (
        <div className="settings-inline-alert error">
          <strong>Module access API error</strong>
          <span>{error}</span>
        </div>
      )}

      <div className="settings-helper-card compact">
        <strong>Role permissions are managed from Role Based Control.</strong>
        <span>Use this page to turn module and submodule access on or off for each active role.</span>
      </div>

      <div className="user-access-table advanced clean-table module-control-table" style={{ "--module-role-count": Math.max(roles.length, 1) } as CSSProperties}>
        <div className="user-row head advanced clean-table-row module-control-row">
          <div className="user-cell">No</div>
          <div className="user-cell">Module</div>
          {roles.length > 0 ? roles.map((role) => (
            <div className="user-cell module-role-head" key={String(getAccessRoleId(role))}>{role.name}</div>
          )) : <div className="user-cell module-role-head">Roles</div>}
        </div>

        {loading && <div className="settings-empty-state">Loading module access from EMA_Modules...</div>}
        {!loading && visibleModuleCount === 0 && <div className="settings-empty-state">No data available.</div>}
        {!loading && roles.length === 0 && visibleModuleCount > 0 && <div className="settings-empty-state">No active roles found. Create active roles in Role Based Control first.</div>}

        {!loading && roles.length > 0 && groupedRows.map((row) => {
          if (row.type === "group") {
            return (
              <div className="module-control-group-row compact" key={`group-${row.groupName}`}>
                <span>{row.groupName}</span>
              </div>
            );
          }

          displayIndex += 1;
          const module = row.module;
          return (
            <div className={`user-row advanced clean-table-row module-control-row ${row.isSubmodule ? "submodule-row" : "parent-module-row"}`} key={String(getModuleId(module))}>
              <div className="user-cell row-number"><span className="row-index-pill">{String(displayIndex).padStart(2, "0")}</span></div>
              <div className="user-cell">
                <div className={`role-info-cell module-info-cell ${row.isSubmodule ? "submodule-info" : ""}`}>
                  <strong>{module.moduleName}</strong>
                  <small>{module.description || module.routePath || (row.isSubmodule ? "Submodule" : "Main module")}</small>
                </div>
              </div>
              {roles.map((role) => {
                const moduleId = String(getModuleId(module));
                const roleId = String(getAccessRoleId(role));
                const key = `${moduleId}:${roleId}`;
                const enabled = hasModulePermission(permissions, module, role);
                return (
                  <div className="user-cell module-toggle-cell" key={key}>
                    <button
                      className={`toggle ${enabled ? "on" : ""}`}
                      type="button"
                      disabled={savingKey === key}
                      title={`${enabled ? "Disable" : "Enable"} ${module.moduleName} for ${role.name}`}
                      aria-label={`${enabled ? "Disable" : "Enable"} ${module.moduleName} for ${role.name}`}
                      onClick={() => onToggle(module, role)}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AccessControlContent({ policies, loading, error, onReload, onAdd, onEdit }: { policies: AccessPolicy[]; loading: boolean; error: string; onReload: () => void; onAdd: () => void; onEdit: (index: number) => void }) {
  const filteredPolicies = policies;

  return (
    <div className="uam-panel clean access-control-panel">
      {error && (
        <div className="settings-inline-alert error">
          <strong>Access control API error</strong>
          <span>{error}</span>
        </div>
      )}

      <div className="settings-helper-card compact">
        <strong>Access controls define login and security enforcement.</strong>
        <span>Manage MFA, session, IP/VPN and approval rules from EMA_AccessControls.</span>
      </div>

      <div className="user-access-table advanced clean-table role-standard-table access-standard-table">
        <div className="user-row head advanced clean-table-row role-standard-row access-standard-row">
          <div className="user-cell">No</div>
          <div className="user-cell">Control</div>
          <div className="user-cell">Scope</div>
          <div className="user-cell">Enforcement</div>
          <div className="user-cell">Review</div>
          <div className="user-cell">Status</div>
          <div className="user-cell">Action</div>
        </div>

        {loading && <div className="settings-empty-state">Loading access controls from EMA_AccessControls...</div>}
        {!loading && filteredPolicies.length === 0 && <div className="settings-empty-state">No data available.</div>}

        {!loading && filteredPolicies.map((policy, index) => {
          const actualIndex = policies.findIndex((item) => String(getAccessPolicyId(item)) === String(getAccessPolicyId(policy)));
          return (
            <div className="user-row advanced clean-table-row role-standard-row access-standard-row" key={String(getAccessPolicyId(policy))}>
              <div className="user-cell row-number"><span className="row-index-pill">{String(index + 1).padStart(2, "0")}</span></div>
              <div className="user-cell"><div className="role-info-cell"><strong>{policy.name}</strong><small>{policy.description || "Access control policy"}</small></div></div>
              <div className="user-cell"><span className="muted-cell">{policy.scope}</span></div>
              <div className="user-cell"><span className="approval-chip standard">{policy.enforcement}</span></div>
              <div className="user-cell"><span className="muted-cell">{policy.reviewCycle}</span></div>
              <div className="user-cell"><span className={`user-pill ${policy.status === "Active" ? "active" : "inactive"}`}>{policy.status}</span></div>
              <div className="user-cell">
                <div className="row-actions user-row-action-wrap clean">
                  <button className="mini-btn icon-only edit" type="button" onClick={() => onEdit(actualIndex)} aria-label="Edit access control" title="Edit">
                    <PencilSvg />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AuditContent({
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
  exportDisabled,
}: {
  logs: AuditLog[];
  allLogs: AuditLog[];
  loading: boolean;
  error: string;
  moduleOptions: string[];
  severityOptions: string[];
  moduleFilter: string;
  severityFilter: string;
  dateFilter: AuditDateFilter;
  page: number;
  limit: number;
  totalRecords: number;
  totalPages: number;
  onModuleFilterChange: (value: string) => void;
  onSeverityFilterChange: (value: string) => void;
  onDateFilterChange: (value: AuditDateFilter) => void;
  onPageChange: (page: number) => void;
  onReload: () => void;
  onExport: () => void | Promise<void>;
  exporting: boolean;
  exportDisabled: boolean;
}) {
  const safeTotalPages = Math.max(1, totalPages || 1);
  const safePage = Math.min(Math.max(1, page || 1), safeTotalPages);
  const startIndex = (safePage - 1) * limit;
  const pageRows = logs;
  const shownStart = totalRecords > 0 && pageRows.length ? startIndex + 1 : 0;
  const shownEnd = totalRecords > 0 ? Math.min(startIndex + pageRows.length, totalRecords) : 0;

  return (
    <div className="audit-log-panel">
      {error && (
        <div className="settings-inline-alert error">
          <strong>Audit log API error</strong>
          <span>{error}</span>
        </div>
      )}

      <div className="audit-commandbar">
        <div className="audit-filter-grid">
          <label className="form-field">
            Main Module
            <SettingSelect
              value={moduleFilter}
              options={[{ value: "all", label: "All modules" }, ...moduleOptions.map((moduleName) => ({ value: moduleName, label: moduleName }))]}
              onChange={onModuleFilterChange}
              ariaLabel="Audit module filter"
            />
          </label>
          <label className="form-field">
            Severity / Status
            <SettingSelect
              value={severityFilter}
              options={[{ value: "all", label: "All statuses" }, ...severityOptions.map((severity) => ({ value: severity, label: severity }))]}
              onChange={onSeverityFilterChange}
              ariaLabel="Audit status filter"
            />
          </label>
          <label className="form-field">
            Date Range
            <SettingSelect
              value={dateFilter}
              options={[
                { value: "30d", label: "Last 30 days" },
                { value: "7d", label: "Last 7 days" },
                { value: "today", label: "Today" },
                { value: "all", label: "All time" },
              ]}
              onChange={(value) => onDateFilterChange(value as AuditDateFilter)}
              ariaLabel="Audit date range filter"
            />
          </label>
        </div>

        <div className="audit-command-actions">
          <button className="soft-btn" type="button" onClick={onReload} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
          <button className="primary-btn audit-export-btn" type="button" onClick={() => void onExport()} disabled={exportDisabled || loading || exporting}>
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
        </div>
      </div>

      <div className="audit-kpi-strip">
        <div><span>Total Matching Logs</span><strong>{totalRecords}</strong></div>
        <div><span>This Page</span><strong>{pageRows.length}</strong></div>
        <div><span>Modules</span><strong>{moduleOptions.length}</strong></div>
        <div><span>Latest</span><strong>{allLogs[0] ? formatAuditTimestamp(allLogs[0].timestamp).split(",")[0] : "-"}</strong></div>
      </div>

      <div className="user-access-table advanced clean-table audit-standard-table">
        <div className="user-row head advanced clean-table-row audit-standard-row">
          <div className="user-cell">No</div>
          <div className="user-cell">Time</div>
          <div className="user-cell">User</div>
          <div className="user-cell">Module</div>
          <div className="user-cell">Activity</div>
          <div className="user-cell">Status</div>
        </div>

        {loading && <div className="settings-empty-state">Loading audit logs from EMA_AuditLogs...</div>}
        {!loading && pageRows.length === 0 && <div className="settings-empty-state">No audit log records found.</div>}

        {!loading && pageRows.map((row, index) => (
          <div className="user-row advanced clean-table-row audit-standard-row" key={String(row.id || `${row.timestamp}-${row.user}-${row.action}-${index}`)}>
            <div className="user-cell row-number"><span className="row-index-pill">{String(startIndex + index + 1).padStart(2, "0")}</span></div>
            <div className="user-cell audit-time-cell">
              <strong>{formatAuditTimestamp(row.timestamp)}</strong>
            </div>
            <div className="user-cell"><span className="muted-cell audit-user-chip">{row.user}</span></div>
            <div className="user-cell"><span className="role-soft-chip audit-module-chip">{row.module}</span></div>
            <div className="user-cell audit-action-cell">
              <strong>{row.action}</strong>
              {row.details && <small>{row.details}</small>}
            </div>
            <div className="user-cell"><span className={`user-pill ${getAuditSeverityClass(row.severity)}`}>{row.severity}</span></div>
          </div>
        ))}
      </div>

      <div className="uam-pagination global-style audit-pagination">
        <div className="uam-page-summary">Page {safePage} / {safeTotalPages}</div>
        <div className="uam-pagination-info">
          Showing <strong>{shownStart}-{shownEnd}</strong> of <strong>{totalRecords}</strong> matching records
        </div>
        <div className="uam-pagination-controls global-style">
          <button className="uam-page-icon" type="button" disabled={safePage <= 1 || loading} onClick={() => onPageChange(1)}>«</button>
          <button className="uam-page-icon" type="button" disabled={safePage <= 1 || loading} onClick={() => onPageChange(Math.max(1, safePage - 1))}>‹</button>
          <span className="uam-page-current">{safePage}</span>
          <button className="uam-page-icon" type="button" disabled={safePage >= safeTotalPages || loading} onClick={() => onPageChange(Math.min(safeTotalPages, safePage + 1))}>›</button>
          <button className="uam-page-icon" type="button" disabled={safePage >= safeTotalPages || loading} onClick={() => onPageChange(safeTotalPages)}>»</button>
        </div>
      </div>
    </div>
  );
}

function PricingContent({
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
  onRequestDelete,
}: PricingContentProps) {
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

  useEffect(() => {
    setCurrentPage(1);
  }, [search, rows.length]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  return (
    <div className="pricing-editor">
      {error && <div className="settings-inline-alert">{error}</div>}

      <div className="pricing-top-insights">
        <article className="pricing-info-card blue">
          <span className="pricing-info-icon">BM</span>
          <div>
            <strong>Brand and Model Pricing</strong>
            <p>Set pricing by device category, brand and exact model. The system prioritises the most specific match when estimating replacement cost.</p>
          </div>
        </article>

        <article className="pricing-info-card green">
          <span className="pricing-info-icon">CX</span>
          <div>
            <strong>CAPEX Exposure Control</strong>
            <p>Exclude selected rows from CAPEX replacement exposure while keeping them available as asset reference data.</p>
          </div>
        </article>

        <article className="pricing-disclaimer-card">
          <strong>Planning disclaimer</strong>
          <p>Market price and replacement-cost values are estimates based on current pricing, asset age and lifecycle assumptions. Use them for planning guidance and confirm final procurement values with Finance or Procurement before approval.</p>
        </article>
      </div>

      <div className="pricing-table-card pricing-modern-table">
        <div className="pricing-row pricing-head-row">
          <div>Device Category</div>
          <div>Brand</div>
          <div>Model Optional</div>
          <div>Market Price (RM)</div>
          <div>Exclude from CAPEX</div>
          <div>Actions</div>
        </div>

        {loading && <div className="pricing-empty-row">Loading device pricing...</div>}

        {!loading && visibleRows.length === 0 && (
          <div className="pricing-empty-row">
            <strong>No pricing rules yet.</strong>
            <span>Add a custom pricing row, select category, brand and model, then save pricing.</span>
            <button className="primary-btn" type="button" onClick={onAdd}>+ Add Custom Pricing</button>
          </div>
        )}

        {!loading && paginatedRows.map((row) => {
          const brandOptions = brandOptionsByCategory[row.Category] || [];
          const modelOptions = modelOptionsByKey[pricingModelKey(row.Category, row.Brand)] || [];

          return (
            <div className="pricing-row pricing-data-row" key={row.id}>
              <label className="pricing-field-label">Device Category</label>
              <SettingSelect
                className="pricing-select"
                value={row.Category}
                placeholder="Select category"
                options={[
                  ...(!row.Category ? [{ value: "", label: "Select category" }] : []),
                  ...categoryOptions.map((category) => ({ value: category, label: category })),
                  ...(!categoryOptions.includes("Others") ? [{ value: "Others", label: "Others" }] : []),
                ]}
                onChange={(value) => onChange(row.id, { Category: value })}
                ariaLabel="Device category"
              />

              <label className="pricing-field-label">Brand</label>
              <SettingSelect
                className="pricing-select"
                value={row.Brand}
                placeholder="General / All Brands"
                disabled={!row.Category}
                options={[
                  { value: "", label: "General / All Brands" },
                  ...brandOptions.map((brand) => ({ value: brand, label: brand })),
                ]}
                onChange={(value) => onChange(row.id, { Brand: value })}
                ariaLabel="Device brand"
              />

              <label className="pricing-field-label">Model Optional</label>
              <SettingSelect
                className="pricing-select"
                value={row.Model}
                placeholder="General / All Models"
                disabled={!row.Category || !row.Brand}
                options={[
                  { value: "", label: "General / All Models" },
                  ...modelOptions.map((model) => ({ value: model, label: model })),
                ]}
                onChange={(value) => onChange(row.id, { Model: value })}
                ariaLabel="Device model"
              />

              <label className="pricing-field-label">Market Price</label>
              <div className="price-input-shell">
                <span>RM</span>
                <input
                  className="setting-input pricing-price-input"
                  min={0}
                  step="0.01"
                  type="number"
                  value={row.Price}
                  onChange={(event) => onChange(row.id, { Price: Number(event.target.value) || 0 })}
                />
              </div>

              <label className="pricing-field-label">Exclude CAPEX</label>
              <button
                className={`toggle pricing-toggle ${row.IsExcluded ? "on danger" : ""}`}
                type="button"
                aria-label="Toggle exclude from CAPEX"
                onClick={() => onChange(row.id, { IsExcluded: !row.IsExcluded })}
              />

              <label className="pricing-field-label">Actions</label>
              <div className="pricing-row-actions">
                <button
                  className="pricing-save-btn"
                  type="button"
                  onClick={() => onSaveRow(row.id)}
                  disabled={saving || savingRowId === row.id}
                >
                  {savingRowId === row.id ? "Saving..." : "Save"}
                </button>
                <button className="icon-delete-btn" type="button" title="Delete pricing row" onClick={() => onRequestDelete(row)} disabled={saving || savingRowId === row.id}>
                  <TrashSvg />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {!loading && visibleRows.length > 0 && (
        <div className="uam-pagination global-style pricing-pagination">
          <div className="uam-page-summary">Page {safeCurrentPage} of {totalPages}</div>
          <div className="uam-page-status">Showing {visibleRows.length === 0 ? 0 : pageStartIndex + 1}-{Math.min(pageStartIndex + pageSize, visibleRows.length)} of {visibleRows.length} pricing records</div>
          <div className="uam-pagination-controls global-style" aria-label="Device pricing pagination">
            <button className="uam-page-icon" type="button" onClick={() => setCurrentPage(1)} disabled={safeCurrentPage === 1} aria-label="First page">«</button>
            <button className="uam-page-icon" type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={safeCurrentPage === 1} aria-label="Previous page">‹</button>
            <span className="uam-page-current">{safeCurrentPage}</span>
            <button className="uam-page-icon" type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={safeCurrentPage === totalPages} aria-label="Next page">›</button>
            <button className="uam-page-icon" type="button" onClick={() => setCurrentPage(totalPages)} disabled={safeCurrentPage === totalPages} aria-label="Last page">»</button>
          </div>
        </div>
      )}


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
  onReset,
}: AgingContentProps) {
  return (
    <div className="pc-aging-revamp">
      {loading && (
        <div className="settings-inline-alert aging-info-alert">
          Loading PC aging rule from AssetSettings...
        </div>
      )}
      {error && <div className="settings-inline-alert">{error}</div>}

      <section className="pc-aging-command-card">
        <div className="pc-aging-command-copy">
          <span className="section-tag">LIFECYCLE CONTROL</span>
          <h3>PC Aging Configuration</h3>
          <p>
            Configure endpoint lifecycle thresholds, replacement planning and calculation basis.
            These settings are saved as the master rule for future hardware aging and refresh reporting.
          </p>
        </div>

        <div className="pc-aging-command-actions">
          <button className="soft-btn" type="button" onClick={onReload} disabled={loading || saving}>
            Reload
          </button>
          <button className="soft-btn" type="button" onClick={onReset} disabled={saving}>
            Reset
          </button>
          <button className="primary-btn" type="button" onClick={onSave} disabled={saving || loading}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </section>

      <section className="pc-aging-overview-grid">
        <article className="pc-aging-overview-card pc-aging-status-card">
          <div className="pc-aging-card-head">
            <div>
              <span className="pc-aging-kicker">Rule Status</span>
              <h4>{rule.enabled ? "Enabled" : "Disabled"}</h4>
              <p>Turn lifecycle calculation on or off without deleting the saved configuration.</p>
            </div>

            <button
              className={`toggle aging-toggle ${rule.enabled ? "on" : ""}`}
              aria-label="Toggle PC aging rule"
              type="button"
              onClick={() => onChange({ enabled: !rule.enabled })}
            />
          </div>

          <div className="pc-aging-status-strip">
            <span>{rule.enabled ? "Active lifecycle rule" : "Lifecycle rule paused"}</span>
            <b>{formatAgeSourceLabel(rule.ageSource)}</b>
          </div>
        </article>

        <article className="pc-aging-overview-card">
          <span className="pc-aging-kicker">Review Threshold</span>
          <h4>{rule.monitorMaxYears} years</h4>
          <p>Devices at or above this age are marked for lifecycle review.</p>
        </article>

        <article className="pc-aging-overview-card">
          <span className="pc-aging-kicker">Critical Reference</span>
          <h4>{rule.agingMinYears} years</h4>
          <p>Devices at or above this age become replacement candidates.</p>
        </article>

        <article className="pc-aging-overview-card">
          <span className="pc-aging-kicker">Refresh Window</span>
          <h4>{rule.replacementWindowMonths} months</h4>
          <p>Planning window used for refresh forecast and CAPEX preparation.</p>
        </article>
      </section>

      <section className="pc-aging-main-grid">
        <article className="pc-aging-panel pc-aging-threshold-panel">
          <div className="pc-aging-panel-head">
            <div>
              <span className="section-tag">THRESHOLD BUILDER</span>
              <h4>Lifecycle Age Bands</h4>
              <p>Set the year thresholds used to classify every endpoint into standard, aging and critical groups.</p>
            </div>
          </div>

          <div className="pc-aging-threshold-stack">
            <AgingThresholdLine
              label="Standard Device"
              help="Healthy lifecycle window before review is required."
              value={rule.healthyMaxYears}
              display={`< ${rule.healthyMaxYears} years`}
              onChange={(value) => onChange({ healthyMaxYears: value })}
            />

            <AgingThresholdLine
              label="Aging Device"
              help="Device should be reviewed and considered for refresh planning."
              value={rule.monitorMaxYears}
              display={`≥ ${rule.monitorMaxYears} years`}
              onChange={(value) => onChange({ monitorMaxYears: value })}
            />

            <AgingThresholdLine
              label="Critical Aging"
              help="Device is a high-priority replacement candidate."
              value={rule.agingMinYears}
              display={`≥ ${rule.agingMinYears} years`}
              onChange={(value) => onChange({ agingMinYears: value })}
            />
          </div>
        </article>

        <aside className="pc-aging-panel pc-aging-decision-panel">
          <div className="pc-aging-panel-head">
            <div>
              <span className="section-tag">DECISION GUIDE</span>
              <h4>Lifecycle Actions</h4>
              <p>Operational action generated from the current threshold rule.</p>
            </div>
          </div>

          <div className="aging-action-list pc-aging-action-list">
            <AgingActionRow
              status="Standard"
              condition={`< ${rule.healthyMaxYears} years`}
              action="Monitor"
              tone="blue"
            />
            <AgingActionRow
              status="Aging"
              condition={`≥ ${rule.monitorMaxYears} years`}
              action="Review"
              tone="amber"
            />
            <AgingActionRow
              status="Critical"
              condition={`≥ ${rule.agingMinYears} years`}
              action="Replace"
              tone="red"
            />
          </div>
        </aside>
      </section>

      <section className="pc-aging-secondary-grid">
        <article className="pc-aging-panel">
          <div className="pc-aging-panel-head">
            <div>
              <span className="section-tag">CALCULATION BASIS</span>
              <h4>Aging Reference</h4>
              <p>Choose how the system determines device age when generating lifecycle results.</p>
            </div>
          </div>

          <div className="pc-aging-form-grid">
            <label className="form-field">
              Primary Date
              <SettingSelect
                value={rule.ageSource}
                options={AGE_SOURCE_OPTIONS}
                onChange={(value) => onChange({ ageSource: value })}
                ariaLabel="PC aging primary date source"
              />
            </label>

            <label className="form-field">
              Missing Date
              <SettingSelect
                value={rule.includeUnknownAge ? "include" : "exclude"}
                options={[
                  { value: "exclude", label: "Flag as data gap" },
                  { value: "include", label: "Include in aging report" },
                ]}
                onChange={(value) => onChange({ includeUnknownAge: value === "include" })}
                ariaLabel="PC aging missing date handling"
              />
            </label>

            <label className="form-field">
              Replacement Window
              <input
                className="setting-input"
                type="number"
                min="0"
                max="36"
                value={rule.replacementWindowMonths}
                onChange={(event) => onChange({ replacementWindowMonths: Number(event.target.value) })}
              />
            </label>
          </div>

          <div className="aging-basis-note pc-aging-basis-note">
            <strong>{formatAgeSourceLabel(rule.ageSource)}</strong>
            <span>is currently used as the main lifecycle reference date.</span>
          </div>
        </article>

        <article className="pc-aging-panel pc-aging-notes-panel">
          <div className="pc-aging-panel-head">
            <div>
              <span className="section-tag">ADMIN NOTE</span>
              <h4>Operational Note</h4>
              <p>Store an internal note with this lifecycle configuration.</p>
            </div>
          </div>

          <textarea
            className="aging-notes-input"
            value={rule.notes}
            onChange={(event) => onChange({ notes: event.target.value })}
            placeholder="Example: This lifecycle rule is used for annual endpoint refresh planning."
          />
        </article>
      </section>
    </div>
  );
}


function AgingThresholdLine({ label, help, value, display, onChange }: { label: string; help: string; value: number; display: string; onChange: (value: number) => void }) {
  return (
    <div className="threshold-line aging-threshold-line">
      <div className="threshold-label-block">
        <span>{label}</span>
        <small>{help}</small>
      </div>
      <input type="range" min="1" max="15" value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <div className="threshold-number-wrap">
        <input type="number" min="1" max="15" value={value} onChange={(event) => onChange(Number(event.target.value))} />
        <b>{display}</b>
      </div>
    </div>
  );
}

function AgingActionRow({ status, condition, action, tone }: { status: string; condition: string; action: string; tone: "blue" | "amber" | "red" }) {
  return (
    <div className={`aging-action-row aging-action-${tone}`}>
      <span>{status}</span>
      <small>{condition}</small>
      <b>{action}</b>
    </div>
  );
}

function ManagementPolicyContent({ values, profile, loading, saving, error, onChange, onReload, onReset, onSave }: ManagementPolicyContentProps) {
  const normalizedValues = normalizeManagementPolicyValues(values);
  const updatedAt = profile?.updatedAt ? new Date(profile.updatedAt).toLocaleString() : "Not saved yet";
  const groupedFields = MANAGEMENT_POLICY_GROUPS.map((group) => ({
    group,
    fields: MANAGEMENT_POLICY_FIELDS.filter((field) => field.group === group),
  }));

  return (
    <section className="management-policy-editor">
      <article className="policy-card management-policy-command">
        <div>
          <span className="section-tag">Policy profile</span>
          <h4>{profile?.profileName || "Default EMA Management Policy"}</h4>
          <p>
            These assumptions feed the Management Dashboard calculation engine. Change them here instead of editing hardcoded numbers in the backend.
          </p>
          <div className="management-policy-meta">
            <span>{profile?.scopeType || "GLOBAL"}</span>
            <span>{MANAGEMENT_POLICY_FIELDS.length} rule value(s)</span>
            <span>Updated: {updatedAt}</span>
          </div>
        </div>
        <div className="content-actions management-policy-actions">
          <button className="soft-btn" type="button" onClick={onReload} disabled={loading || saving}>{loading ? "Loading..." : "Reload"}</button>
          <button className="soft-btn" type="button" onClick={onReset} disabled={loading || saving}>Reset defaults</button>
          <button className="primary-btn" type="button" onClick={onSave} disabled={loading || saving}>{saving ? "Saving..." : "Save Policy"}</button>
        </div>
      </article>

      {error && <div className="settings-inline-alert">{error}</div>}

      <div className="management-policy-grid">
        {groupedFields.map(({ group, fields }) => (
          <article className="policy-card management-policy-group" key={group}>
            <div className="policy-top">
              <div>
                <h4>{group}</h4>
                <p>{group === "Cost & Saving Assumptions" ? "Money values used to estimate exposure and opportunity." : group === "Evidence Freshness Policy" ? "Freshness limits used to mark endpoint and inventory evidence as stale." : "Risk score weights and thresholds used by dashboard evidence rows."}</p>
              </div>
              <span className="role-soft-chip">{fields.length} rules</span>
            </div>

            <div className="management-policy-field-list">
              {fields.map((field) => {
                const inputValue = managementPolicyInputValue(normalizedValues, field);
                return (
                  <label className="management-policy-field" key={field.key}>
                    <span>
                      <strong>{field.label}</strong>
                      <small>{field.description}</small>
                    </span>
                    <div className="management-policy-input-wrap">
                      <input
                        className="setting-input"
                        type="number"
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        value={inputValue}
                        onChange={(event) => {
                          const parsed = Number(event.target.value);
                          const scaled = Number.isFinite(parsed) ? parsed / (field.displayScale || 1) : DEFAULT_MANAGEMENT_POLICY_VALUES[field.key] || 0;
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
        ))}
      </div>
    </section>
  );
}

function RiskContent({ search }: { search: string }) {
  const rows = risks.filter((risk) => !search || risk.join(" ").toLowerCase().includes(search));

  return (
    <div className="risk-simple-layout">
      <div className="risk-simple-grid">
        {rows.map((risk) => (
          <article className="risk-simple-card" key={risk[0]} style={{ "--risk-color": risk[4] } as CSSProperties}>
            <div className="risk-simple-head">
              <span className="risk-color-dot" />
              <div>
                <h4>{risk[0]} Risk</h4>
                <p>{risk[1]}</p>
              </div>
              <span className="risk-level-pill">{risk[2]}</span>
            </div>

            <div className="risk-mini-meter">
              <i style={{ "--w": risk[3] } as CSSProperties} />
            </div>

            <div className="risk-simple-controls">
              <FormSelect label="Action" options={["Monitor", "Review", "Escalate", "Block"]} />
              <FormSelect label="Owner" options={["IT Ops", "Security", "Management"]} />
              <FormSelect label="SLA" options={["7 days", "3 days", "24 hours"]} />
            </div>
          </article>
        ))}
      </div>

      <article className="risk-rule-panel">
        <div className="risk-rule-head">
          <div>
            <h4>Risk Scoring Signals</h4>
            <p>Signals used to calculate endpoint risk score.</p>
          </div>
          <button className="soft-btn" type="button">Add Rule</button>
        </div>

        <div className="risk-rule-list">
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
    <div className="user-delete-backdrop open" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="user-delete-modal" role="dialog" aria-modal="true" aria-labelledby="userDeleteTitle">
        <div className="user-delete-icon">!</div>
        <div className="user-delete-copy">
          <span className="eyebrow">CONFIRM DELETE</span>
          <h3 id="userDeleteTitle">Delete user access?</h3>
          <p>Are you sure you want to delete <b>{label}</b>? This will permanently delete this user from EMA_Users.</p>
        </div>
        <div className="user-delete-actions">
          <button className="soft-btn" type="button" onClick={onClose}>Cancel</button>
          <button className="danger-btn" type="button" onClick={onConfirm}>Delete User</button>
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
    <div className="pricing-confirm-backdrop open" onClick={(event) => { if (event.target === event.currentTarget && !loading) onClose(); }}>
      <div className="pricing-confirm-modal">
        <div className="pricing-confirm-icon">!</div>
        <div>
          <span className="eyebrow">DELETE PRICING RULE</span>
          <h3>Confirm delete?</h3>
          <p>This will remove the pricing rule for <b>{label}</b>. This action cannot be reversed after confirmation.</p>
        </div>
        <div className="pricing-confirm-actions">
          <button className="soft-btn" type="button" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="danger-btn" type="button" onClick={onConfirm} disabled={loading}>{loading ? "Deleting..." : "Delete"}</button>
        </div>
      </div>
    </div>
  );
}

function SettingsToast({ toast, onClose }: { toast: SettingsToastState; onClose: () => void }) {
  if (!toast) return null;

  const toastNode = (
    <div
      className="settings-toast-layer"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        pointerEvents: "none"
      }}
    >
      <div className={`settings-toast settings-toast-${toast.tone}`}>
        <div className="settings-toast-icon">{toast.tone === "success" ? "✓" : toast.tone === "error" ? "!" : toast.tone === "warning" ? "!" : "i"}</div>
        <div>
          <strong>{toast.title}</strong>
          <span>{toast.message}</span>
        </div>
        <button type="button" onClick={onClose} aria-label="Close notification">×</button>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(toastNode, document.body) : toastNode;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div className="summary-row"><span>{label}</span><b>{value}</b></div>;
}

function FormSelect({ label, options }: { label: string; options: string[] }) {
  const [value, setValue] = useState(options[0] || "");
  return <label className="form-field">{label}<SettingSelect value={value} options={options} onChange={setValue} ariaLabel={label} /></label>;
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
    <div className={`user-modal-backdrop ${open ? "open" : ""}`} id="userModalBackdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="user-modal advanced">
        <div className="user-modal-head">
          <div>
            <span className="eyebrow" id="userModalMode">{mode}</span>
            <h3 id="userModalTitle">{title}</h3>
            <p>Configure identity profile and assign one or more RBAC roles from EMA_Roles.</p>
          </div>
          <button className="modal-close" id="closeUserModal" type="button" onClick={onClose}>×</button>
        </div>

        <div className="user-modal-body advanced">
          <div className="modal-section-title">Profile</div>
          <label className="form-field">Full Name<input className="setting-input" id="userFullName" placeholder="Example: Zainul Ariffin" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label className="form-field">Username<input className="setting-input" id="userUsername" placeholder="Example: zainul" value={form.username || ""} onChange={(event) => setForm({ ...form, username: event.target.value })} /></label>
          <label className="form-field">Email<input className="setting-input" id="userEmail" placeholder="user@company.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
          <label className="form-field">Phone No<input className="setting-input" id="userPhoneNo" placeholder="Optional" value={form.phoneNo || ""} onChange={(event) => setForm({ ...form, phoneNo: event.target.value })} /></label>

          <div className="modal-section-title">Access</div>
          <div className="form-field wide">
            <div className="role-assignment-head">
              <span className="form-field-label">Assigned Roles</span>
              <button
                className="role-picker-trigger"
                type="button"
                onClick={() => setRolePickerOpen((current) => !current)}
                disabled={roleOptions.length === 0}
              >
                + Assign Role
              </button>
            </div>

            <div className="selected-role-box">
              {selectedRoles.length === 0 && (
                <div className="selected-role-empty">No role assigned yet</div>
              )}

              {selectedRoles.map((role) => (
                <span className="selected-role-chip" key={role}>
                  {role}
                  <button type="button" onClick={() => removeSelectedRole(role)} aria-label={`Remove ${role}`}>×</button>
                </span>
              ))}
            </div>

            {rolePickerOpen && (
              <div className="role-picker-panel">
                <div className="role-picker-search-wrap">
                  <SearchSvg />
                  <input
                    className="role-picker-search"
                    value={roleSearchTerm}
                    onChange={(event) => setRoleSearchTerm(event.target.value)}
                    placeholder="Search role by name..."
                    autoFocus
                  />
                </div>

                <div className="role-picker-list">
                  {roleOptions.length === 0 && (
                    <div className="role-picker-empty">No active roles available. Create a role in Role Based Control first.</div>
                  )}

                  {roleOptions.length > 0 && filteredRoleOptions.length === 0 && (
                    <div className="role-picker-empty">No matching unassigned roles.</div>
                  )}

                  {filteredRoleOptions.map((role) => (
                    <button className="role-picker-option" type="button" key={role} onClick={() => addSelectedRole(role)}>
                      <span>{role}</span>
                      <b>Assign</b>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <small className="form-helper-text">Assign one or more roles. Module access will follow the combined RBAC permissions.</small>
          </div>
          <label className="form-field">Department<input className="setting-input" id="userDepartment" placeholder="Example: IT Operation" value={form.department || ""} onChange={(event) => setForm({ ...form, department: event.target.value })} /></label>
          <label className="form-field">Position<input className="setting-input" id="userPosition" placeholder="Example: Support Engineer" value={form.position || ""} onChange={(event) => setForm({ ...form, position: event.target.value })} /></label>
          <label className="form-field">Status
            <SettingSelect
              value={form.status}
              options={["Active", "Review", "Locked", "Inactive"]}
              onChange={(value) => setForm({ ...form, status: value as RoleStatus, accountLocked: value === "Locked" })}
              ariaLabel="User status"
            />
          </label>

          <div className="modal-section-title">Password</div>
          <label className="form-field">{isCreateMode ? "Initial Password" : "New Password"}<input className="setting-input" type="password" id="userPassword" placeholder={isCreateMode ? "Create login password" : "Leave blank to keep current password"} value={form.password || ""} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
          <label className="form-field">Confirm Password<input className="setting-input" type="password" id="userConfirmPassword" placeholder="Re-enter password" value={form.confirmPassword || ""} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} /></label>
          <small className="form-helper-text wide password-helper-text">{isCreateMode ? "This password is saved to EMA_Users and can be used to test login immediately." : "Fill this only when you want to reset the user password."}</small>

          <div className="modal-section-title">Security</div>
          <label className="form-field inline-check"><input type="checkbox" checked={Boolean(form.requireMFA || form.mfa)} onChange={(event) => setForm({ ...form, requireMFA: event.target.checked, mfa: event.target.checked })} /><span>Require MFA</span></label>
          <label className="form-field inline-check"><input type="checkbox" checked={Boolean(form.accountLocked)} onChange={(event) => setForm({ ...form, accountLocked: event.target.checked, status: event.target.checked ? "Locked" : form.status === "Locked" ? "Active" : form.status })} /><span>Account Locked</span></label>
          <label className="form-field wide">Lock Reason<input className="setting-input" id="userLockReason" placeholder="Optional reason shown in audit" value={form.lockReason || ""} onChange={(event) => setForm({ ...form, lockReason: event.target.value })} /></label>
          <label className="form-field">Access Start<input className="setting-input" type="date" id="userAccessStart" value={toDateInputValue(form.accessStartDate)} onChange={(event) => setForm({ ...form, accessStartDate: event.target.value })} /></label>
          <label className="form-field">Access End<input className="setting-input" type="date" id="userAccessEnd" value={toDateInputValue(form.accessEndDate)} onChange={(event) => setForm({ ...form, accessEndDate: event.target.value })} /></label>
          <label className="form-field wide">Remarks<textarea className="setting-textarea" id="userRemarks" placeholder="Optional access notes" value={form.remarks || ""} onChange={(event) => setForm({ ...form, remarks: event.target.value })} /></label>
        </div>

        <div className="user-modal-foot">
          <button className="soft-btn" id="cancelUserModal" type="button" onClick={onClose}>Cancel</button>
          <button className="primary-btn" id="saveUserAccess" type="button" onClick={onSave}>Save User</button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalNode, document.body) : modalNode;
}

function AccessRoleModal({ open, mode, form, setForm, onClose, onSave }: { open: boolean; mode: string; form: AccessRole; setForm: (form: AccessRole) => void; onClose: () => void; onSave: () => void }) {
  if (!open) return null;

  const modalNode = (
    <div className="role-modal-backdrop open" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="role-modal access-role-modal simple-role-modal">
        <div className="role-modal-head">
          <div>
            <span className="eyebrow">{mode}</span>
            <h3>{mode === "ADD ROLE" ? "Add New Role" : "Update Role"}</h3>
            <p>Create or update a role name, status and approval requirement for EMA_Roles.</p>
          </div>
          <button className="modal-close" type="button" onClick={onClose}>×</button>
        </div>

        <div className="role-modal-body access-role-modal-body simple-role-modal-body">
          <label className="form-field">Role Name<input className="setting-input" placeholder="Example: L1 Support" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label className="form-field">Status
            <SettingSelect
              value={form.status === "Inactive" ? "Inactive" : "Active"}
              options={["Active", "Inactive"]}
              onChange={(value) => setForm({ ...form, status: value as RoleStatus })}
              ariaLabel="Role status"
            />
          </label>
          <label className="form-field wide">Description<input className="setting-input" placeholder="Describe this role" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <label className="form-field inline-check wide"><input type="checkbox" checked={Boolean(form.approvalRequired)} onChange={(event) => setForm({ ...form, approvalRequired: event.target.checked })} /><span>Require approval for sensitive actions</span></label>
        </div>

        <div className="role-modal-foot">
          <button className="soft-btn" type="button" onClick={onClose}>Cancel</button>
          <button className="primary-btn" type="button" onClick={onSave}>Save Role</button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalNode, document.body) : modalNode;
}

function ConfirmDeleteRoleModal({ role, onClose, onConfirm }: { role: AccessRole | null; onClose: () => void; onConfirm: () => void }) {
  if (!role) return null;

  const modalNode = (
    <div className="user-delete-backdrop open" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="user-delete-modal" role="dialog" aria-modal="true" aria-labelledby="roleDeleteTitle">
        <div className="user-delete-icon">!</div>
        <div className="user-delete-copy">
          <span className="eyebrow">CONFIRM DELETE</span>
          <h3 id="roleDeleteTitle">Delete role access?</h3>
          <p>Are you sure you want to delete <b>{role.name}</b>? This will permanently delete this role from EMA_Roles.</p>
        </div>
        <div className="user-delete-actions">
          <button className="soft-btn" type="button" onClick={onClose}>Cancel</button>
          <button className="danger-btn" type="button" onClick={onConfirm}>Delete Role</button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalNode, document.body) : modalNode;
}

function AccessPolicyModal({ open, mode, title, form, setForm, onClose, onSave }: { open: boolean; mode: string; title: string; form: AccessPolicy; setForm: (form: AccessPolicy) => void; onClose: () => void; onSave: () => void }) {
  if (!open) return null;

  const modalNode = (
    <div className="role-modal-backdrop open" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="role-modal access-role-modal simple-role-modal">
        <div className="role-modal-head">
          <div>
            <span className="eyebrow">{mode}</span>
            <h3>{title}</h3>
            <p>Configure login, session and security access control behaviour.</p>
          </div>
          <button className="modal-close" type="button" onClick={onClose}>×</button>
        </div>

        <div className="role-modal-body access-role-modal-body simple-role-modal-body">
          <label className="form-field">Control Name<input className="setting-input" placeholder="Example: Multi-Factor Authentication" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label className="form-field">Status
            <SettingSelect
              value={form.status}
              options={["Active", "Inactive"]}
              onChange={(value) => setForm({ ...form, status: value === "Inactive" ? "Inactive" : "Active" })}
              ariaLabel="Access control status"
            />
          </label>
          <label className="form-field wide">Description<input className="setting-input" placeholder="Describe this control" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <label className="form-field">Scope
            <SettingSelect
              value={form.scope}
              options={["All Users", "Admin Only", "Selected Role", "Service Desk"]}
              onChange={(value) => setForm({ ...form, scope: value })}
              ariaLabel="Access control scope"
            />
          </label>
          <label className="form-field">Enforcement
            <SettingSelect
              value={form.enforcement}
              options={["Mandatory", "Optional", "Approval Based", "Disabled"]}
              onChange={(value) => setForm({ ...form, enforcement: value })}
              ariaLabel="Access control enforcement"
            />
          </label>
          <label className="form-field">Review Cycle
            <SettingSelect
              value={form.reviewCycle}
              options={["Monthly", "Quarterly", "Yearly", "Ad Hoc"]}
              onChange={(value) => setForm({ ...form, reviewCycle: value })}
              ariaLabel="Access control review cycle"
            />
          </label>
        </div>

        <div className="role-modal-foot">
          <button className="soft-btn" type="button" onClick={onClose}>Cancel</button>
          <button className="primary-btn" type="button" onClick={onSave}>Save Control</button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalNode, document.body) : modalNode;
}

function AccessPolicyDeleteConfirmModal({ target, onCancel, onConfirm }: { target: { policy: AccessPolicy; index: number } | null; onCancel: () => void; onConfirm: () => void }) {
  if (!target) return null;

  const modalNode = (
    <div className="user-delete-backdrop open" role="dialog" aria-modal="true" onClick={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <div className="user-delete-modal">
        <div className="user-delete-icon">!</div>
        <div className="user-delete-copy">
          <span className="eyebrow">CONFIRM DELETE</span>
          <h3>Delete access control?</h3>
          <p>Are you sure you want to delete <b>{target.policy.name}</b>? This will remove the control from EMA_AccessControls.</p>
        </div>
        <div className="user-delete-actions">
          <button className="soft-btn" type="button" onClick={onCancel}>Cancel</button>
          <button className="danger-btn" type="button" onClick={onConfirm}>Delete Control</button>
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
  return <div className={`role-modal-backdrop ${open ? "open" : ""}`} id="roleModalBackdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="role-modal"><div className="role-modal-head"><div><span className="eyebrow" id="roleModalMode">{modeText}</span><h3 id="roleModalTitle">{title}</h3><p>Create, update or delete roles used in the Module Control matrix.</p></div><button className="modal-close" id="closeRoleModal" type="button" onClick={onClose}>×</button></div><div className="role-modal-body"><label className="form-field">Role Name<input className="setting-input" id="moduleRoleName" placeholder="Example: Security Reviewer" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label className="form-field">Role Type<SettingSelect value={form.type} options={["Administrator", "Management", "Operation", "Support", "Audit / Viewer", "Custom"]} onChange={(value) => setForm({ ...form, type: value })} ariaLabel="Module role type" /></label><label className="form-field wide">Description<input className="setting-input" id="moduleRoleDesc" placeholder="Describe access purpose for this role" value={form.desc} onChange={(event) => setForm({ ...form, desc: event.target.value })} /></label><label className="form-field">Default Access<SettingSelect value={form.defaultAccess} options={["Read Only", "Operational Access", "Management Access", "Full Access", "No Access"]} onChange={(value) => setForm({ ...form, defaultAccess: value })} ariaLabel="Default access" /></label><label className="form-field">Approval Required<SettingSelect value={form.approval} options={["Yes", "No"]} onChange={(value) => setForm({ ...form, approval: value })} ariaLabel="Approval required" /></label></div><p className={`role-delete-warning ${isDelete ? "show" : ""}`} id="roleDeleteWarning">Delete role will remove this role column from the module access matrix. Existing users assigned to this role should be reviewed before deletion.</p><div className="role-modal-foot"><button className="soft-btn" id="cancelRoleModal" type="button" onClick={onClose}>Cancel</button>{isDelete && <button className="danger-btn" id="deleteRoleConfirm" type="button" onClick={onDelete}>Delete Role</button>}{!isDelete && <button className="primary-btn" id="saveModuleRole" type="button" onClick={onSave}>Save Role</button>}</div></div></div>;
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
