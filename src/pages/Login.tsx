import { type FormEvent, useEffect, useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Moon,
  ShieldCheck,
  Sun,
  User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import authService, { type LoginResponse } from "../services/authService";
import { useAuth } from "../context/AuthContext";
import { getDefaultAccessiblePath, normalizeKey } from "../routes/accessControl";
import loginHero from "../assets/login.png";

type AnyUser = Record<string, any>;

type MfaState = {
  user: AnyUser;
  setupRequired: boolean;
  secret: string;
  qrCode: string;
};

function MicrosoftLogo() {
  return (
    <svg
      viewBox="0 0 23 23"
      aria-hidden="true"
      focusable="false"
    >
      <path fill="#f25022" d="M1 1h10v10H1z" />
      <path fill="#7fba00" d="M12 1h10v10H12z" />
      <path fill="#00a4ef" d="M1 12h10v10H1z" />
      <path fill="#ffb900" d="M12 12h10v10H12z" />
    </svg>
  );
}

function GoogleLogo() {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.72 1.22 9.22 3.6l6.86-6.86C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
      <path fill="none" d="M0 0h48v48H0z" />
    </svg>
  );
}


const loginInlineCss = String.raw`
html,
body,
#root {
  width: 100%;
  height: 100%;
  margin: 0;
}

body:has(.login-page) {
  overflow: hidden;
}

.login-page,
.login-page * {
  box-sizing: border-box;
}

.login-page {
  --login-bg: #f7fbff;
  --login-panel: #ffffff;
  --login-text: #07143f;
  --login-muted: #5d6b89;
  --login-faint: #92a0b8;
  --login-border: #dbe5f4;
  --login-primary: #2563eb;
  --login-soft: #edf5ff;
  --login-shadow: 0 24px 70px rgba(15, 23, 42, 0.14);

  width: 100vw;
  height: 100vh;
  min-height: 100vh;
  padding: 0;
  overflow: hidden;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 12% 8%, rgba(37, 99, 235, 0.11), transparent 28%),
    radial-gradient(circle at 90% 82%, rgba(79, 70, 229, 0.10), transparent 28%),
    linear-gradient(135deg, #fbfdff 0%, var(--login-bg) 100%);
  color: var(--login-text);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.login-page-dark {
  --login-bg: #071225;
  --login-panel: #0d1b33;
  --login-text: #f8fafc;
  --login-muted: #9fb0c8;
  --login-faint: #64748b;
  --login-border: rgba(148, 163, 184, 0.24);
  --login-soft: rgba(37, 99, 235, 0.13);
  --login-shadow: 0 24px 70px rgba(0, 0, 0, 0.30);
}

.login-shell {
  width: min(1360px, calc(100vw - 92px));
  height: min(700px, calc(100vh - 58px));
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 500px;
  overflow: hidden;
  border-radius: 26px;
  border: 1px solid rgba(217, 226, 242, 0.92);
  background: var(--login-panel);
  box-shadow: var(--login-shadow);
}

.login-hero-panel {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  background: #edf5ff;
  overflow: hidden;
}

.login-hero-image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  object-position: center center;
}

.login-form-panel {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  padding: 44px 58px 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--login-panel);
}

.login-theme-toggle {
  position: absolute;
  top: 26px;
  right: 30px;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  border: 1px solid var(--login-border);
  background: var(--login-panel);
  color: var(--login-text);
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
  z-index: 5;
}

.login-theme-toggle svg {
  width: 16px;
  height: 16px;
}

.login-card {
  width: min(390px, 100%);
  margin: 0;
  padding: 0;
  transform: translateY(-16px);
  text-align: center;
  background: transparent;
  border: 0;
  box-shadow: none;
}

.login-card-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
  text-align: center;
}

.login-card-icon {
  width: 46px;
  height: 46px;
  min-width: 46px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.12), rgba(37, 99, 235, 0.20));
  color: var(--login-primary);
  margin: 0 auto;
}

.login-card-icon svg {
  width: 21px;
  height: 21px;
}

.login-card-header h2 {
  margin: 0;
  color: var(--login-text);
  font-size: 25px;
  line-height: 30px;
  font-weight: 900;
  letter-spacing: -0.04em;
  text-align: center;
}

.login-card-header p {
  margin: 4px 0 0;
  color: var(--login-muted);
  font-size: 12px;
  line-height: 16px;
  font-weight: 650;
  text-align: center;
}

.login-alert {
  width: 100%;
  margin: 0 0 14px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(220, 38, 38, 0.22);
  background: rgba(220, 38, 38, 0.08);
  color: #dc2626;
  font-size: 12px;
  line-height: 17px;
  font-weight: 750;
  text-align: left;
}

.login-form {
  width: 100%;
  text-align: left;
}

.login-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
  text-align: left;
}

.login-field label {
  color: var(--login-text);
  font-size: 11px;
  line-height: 14px;
  font-weight: 850;
}

.login-input {
  height: 41px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  border-radius: 9px;
  border: 1px solid var(--login-border);
  background: var(--login-panel);
  color: var(--login-muted);
}

.login-input:focus-within {
  border-color: rgba(37, 99, 235, 0.65);
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.11);
}

.login-input > svg {
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
}

.login-input input {
  width: 100%;
  min-width: 0;
  height: 39px;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--login-text);
  font-size: 12px;
  line-height: 16px;
  font-weight: 750;
}

.login-input input::placeholder {
  color: var(--login-faint);
}

.login-password-toggle {
  width: 28px;
  height: 28px;
  min-width: 28px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--login-muted);
  display: grid;
  place-items: center;
  cursor: pointer;
}

.login-form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 0 14px;
}

.login-check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--login-text);
  font-size: 11px;
  line-height: 14px;
  font-weight: 800;
  cursor: pointer;
}

.login-check input {
  width: 14px;
  height: 14px;
  accent-color: var(--login-primary);
}

.login-link-btn {
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--login-primary);
  font-size: 11px;
  line-height: 14px;
  font-weight: 900;
  cursor: pointer;
}

.login-submit-btn {
  width: 100%;
  height: 42px;
  border: 0;
  border-radius: 9px;
  background: linear-gradient(135deg, #2f6df6 0%, #1d4ed8 100%);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 13px;
  line-height: 17px;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 0 14px 28px rgba(37, 99, 235, 0.25);
}

.login-submit-btn:disabled,
.login-secondary-btn:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.login-secondary-btn {
  width: 100%;
  height: 38px;
  margin-top: 8px;
  border-radius: 9px;
  border: 1px solid var(--login-border);
  background: transparent;
  color: var(--login-text);
  font-size: 11px;
  font-weight: 850;
  cursor: pointer;
}

.login-authenticator-panel {
  margin-top: 16px;
  text-align: center;
}

.login-authenticator-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--login-faint);
  font-size: 9px;
  line-height: 12px;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.login-authenticator-divider::before,
.login-authenticator-divider::after {
  content: "";
  height: 1px;
  flex: 1;
  background: var(--login-border);
}

.login-authenticator-divider span {
  padding: 0 14px;
}

.login-authenticator-row {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 8px;
  align-items: center;
  margin-top: 9px;
}

.login-authenticator-brand {
  min-height: 27px;
  border: 0;
  background: transparent;
  color: var(--login-text);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  opacity: 0.86;
}

.login-authenticator-brand svg {
  width: 16px;
  height: 16px;
}

.login-authenticator-brand span {
  font-size: 9px;
  line-height: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.login-authenticator-separator {
  width: 1px;
  height: 21px;
  background: var(--login-border);
}

.login-authenticator-badge {
  width: max-content;
  max-width: 100%;
  min-height: 22px;
  margin: 8px auto 0;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.08);
  color: var(--login-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 9px;
  line-height: 12px;
  font-weight: 850;
}

.login-security-note {
  margin-top: 12px;
  min-height: 42px;
  padding: 9px 12px;
  border-radius: 12px;
  background: var(--login-soft);
  color: var(--login-text);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 10px;
  line-height: 14px;
  font-weight: 650;
  text-align: center;
}

.login-security-note svg {
  width: 16px;
  height: 16px;
  color: var(--login-text);
  flex: 0 0 auto;
}

.login-2fa-setup {
  margin-bottom: 10px;
  padding: 10px;
  border-radius: 12px;
  border: 1px solid var(--login-border);
  background: var(--login-soft);
}

.login-2fa-text,
.login-2fa-secret {
  margin: 0;
  color: var(--login-muted);
  font-size: 10px;
  line-height: 14px;
  font-weight: 700;
  text-align: center;
  word-break: break-word;
}

.login-2fa-qr {
  display: grid;
  place-items: center;
  margin: 8px 0;
}

.login-2fa-qr img {
  width: 122px;
  height: 122px;
  padding: 6px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid var(--login-border);
}

.login-form-panel:has(.login-2fa-setup) .login-card {
  transform: translateY(-8px) scale(0.9);
  transform-origin: center center;
}

.spinner-border {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #ffffff;
  border-radius: 999px;
  animation: emaLoginSpin 0.75s linear infinite;
}

@keyframes emaLoginSpin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1080px) {
  .login-shell {
    width: min(720px, calc(100vw - 32px));
    height: auto;
    min-height: calc(100vh - 32px);
    grid-template-columns: 1fr;
  }

  .login-hero-panel {
    display: none;
  }

  .login-form-panel {
    min-height: calc(100vh - 32px);
    padding: 58px 24px 34px;
  }
}

@media (max-width: 640px) {
  .login-page {
    display: block;
    overflow: auto;
  }

  .login-shell {
    width: 100vw;
    min-height: 100vh;
    border-radius: 0;
    border: 0;
  }

  .login-form-panel {
    min-height: 100vh;
    padding: 56px 18px 24px;
  }

  .login-card {
    width: 100%;
    transform: none;
  }

  .login-authenticator-row {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .login-authenticator-separator {
    display: none;
  }
}
`;

function toSafeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeApiUser(rawUser: AnyUser, fallbackUsername = "User") {
  const consoleId = toSafeNumber(
    rawUser.console_Idn ?? rawUser.Console_Idn ?? rawUser.id,
    0
  );

  const userID = String(
    rawUser.userID ??
      rawUser.UserID ??
      rawUser.username ??
      rawUser.email ??
      fallbackUsername
  );

  const name = String(rawUser.name ?? rawUser.FullName ?? rawUser.username ?? userID);
  const role = String(rawUser.role ?? rawUser.roleName ?? rawUser.Role ?? "User");

  return {
    id: rawUser.id ?? consoleId,
    username: String(rawUser.username ?? userID),
    name,
    role,
    department: rawUser.department ?? rawUser.Department ?? "",
    console_Idn: consoleId,
    userID,
    email: rawUser.email ?? rawUser.Email ?? "",
    menuIndex: toSafeNumber(rawUser.menuIndex ?? rawUser.MenuIndex, 0),
    permissions: rawUser.permissions ?? {},
    allowedModules: rawUser.allowedModules ?? [],
    allowedRoutes: rawUser.allowedRoutes ?? [],
    moduleAccess: rawUser.moduleAccess ?? {},
    authSource: rawUser.authSource ?? "EMA",
    isSuperAdmin: Boolean(rawUser.isSuperAdmin),
    isSystemAdmin: Boolean(rawUser.isSystemAdmin),
    isActive: rawUser.isActive ?? true,
    ...rawUser,
  };
}

function storeAuthToken(accessToken: string, user: AnyUser) {
  localStorage.setItem("ema-access-token", accessToken);
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("token", accessToken);
  localStorage.setItem("user", JSON.stringify(user));
  localStorage.setItem("currentUser", JSON.stringify(user));
  localStorage.setItem(
    "ema-auth",
    JSON.stringify({
      token: accessToken,
      accessToken,
      user,
    })
  );
}

function firstValue(row: AnyUser, keys: string[]) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
}

function arrayFromPayload(payload: AnyUser, key: string) {
  const data = payload?.data || payload || {};
  const value = data?.[key] || payload?.[key];

  if (Array.isArray(value)) return value;

  if (key === "permissions") {
    return (
      data?.permissions ||
      data?.rolePermissions ||
      data?.modulePermissions ||
      data?.RoleModulePermissions ||
      payload?.permissions ||
      payload?.rolePermissions ||
      payload?.modulePermissions ||
      []
    );
  }

  return [];
}

function moduleRoute(row: AnyUser) {
  const explicit = String(firstValue(row, ["routePath", "RoutePath", "path", "Path", "url", "Url"])).trim();

  if (explicit) {
    const cleanedExplicit = explicit.split("/").filter(Boolean).join("/");
    return cleanedExplicit ? "/" + cleanedExplicit : "/";
  }

  const text = normalizeKey([
    firstValue(row, ["moduleKey", "ModuleKey", "key", "Key"]),
    firstValue(row, ["moduleName", "ModuleName", "name", "Name", "label", "Label"]),
  ].join(" "));

  if (text.includes("management_dashboard")) return "/management-dashboard";
  if (text.includes("it_operation") || text.includes("it_operations") || text.includes("operation_dashboard")) return "/dashboard";
  if (text.includes("service_desk") || text.includes("incident") || text.includes("ticket")) return "/service-desk";
  if (text.includes("hardware")) return "/hardware";
  if (text.includes("software_distribution")) return "/software-distribution";
  if (text.includes("software")) return "/software";
  if (text.includes("network")) return "/network-inventory";
  if (text.includes("app_metering") || text.includes("application_metering")) return "/appmetering";
  if (text.includes("internet")) return "/internet-metering";
  if (text.includes("app_restriction")) return "/app-restriction";
  if (text.includes("web_restriction")) return "/web-restriction";
  if (text.includes("patch")) return "/patch-management";
  if (text.includes("task")) return "/tasklist";
  if (text.includes("report")) return "/report";
  if (text.includes("setting") || text.includes("user_access")) return "/settings";

  return "";
}

async function enrichUserWithModuleAccess(accessToken: string, user: AnyUser) {
  try {
    const payload = await authService.getRoleModuleAccess(accessToken);

    const roles = arrayFromPayload(payload, "roles");
    const modules = arrayFromPayload(payload, "modules");
    const permissions = arrayFromPayload(payload, "permissions");

    const userRoleIds = new Set(
      [
        user.roleID,
        user.RoleID,
        user.roleId,
        user.RoleId,
      ]
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    );

    const userRoleNames = new Set(
      [
        user.role,
        user.Role,
        user.roleName,
        user.RoleName,
        ...(Array.isArray(user.roles) ? user.roles : []),
      ]
        .map((value) => normalizeKey(value))
        .filter(Boolean)
    );

    const matchedRoleIds = new Set<string>();

    roles.forEach((role: AnyUser) => {
      const roleId = String(firstValue(role, ["roleID", "RoleID", "roleId", "RoleId", "id"])).trim();
      const roleName = normalizeKey(firstValue(role, ["roleName", "RoleName", "name", "Name", "role", "Role"]));

      if ((roleId && userRoleIds.has(roleId)) || (roleName && userRoleNames.has(roleName))) {
        matchedRoleIds.add(roleId);
      }
    });

    userRoleIds.forEach((id) => matchedRoleIds.add(id));

    const allowedModuleIds = new Set<string>();

    permissions.forEach((permission: AnyUser) => {
      const roleId = String(firstValue(permission, ["roleID", "RoleID", "roleId", "RoleId"])).trim();
      const roleName = normalizeKey(firstValue(permission, ["roleName", "RoleName", "role", "Role"]));
      const canView = Boolean(
        permission.canView ??
        permission.CanView ??
        permission.view ??
        permission.View ??
        permission.allowed ??
        permission.Allowed ??
        permission.isAllowed ??
        permission.IsAllowed
      );

      const matchRole = (roleId && matchedRoleIds.has(roleId)) || (roleName && userRoleNames.has(roleName));

      if (matchRole && canView) {
        const moduleId = String(firstValue(permission, ["moduleID", "ModuleID", "moduleId", "ModuleId"])).trim();
        if (moduleId) allowedModuleIds.add(moduleId);
      }
    });

    const allowedRoutes = new Set<string>();
    const allowedModules = new Set<string>();
    const moduleAccess: Record<string, boolean> = {};

    modules.forEach((module: AnyUser) => {
      const moduleId = String(firstValue(module, ["moduleID", "ModuleID", "moduleId", "ModuleId", "id"])).trim();
      if (!moduleId || !allowedModuleIds.has(moduleId)) return;

      const route = moduleRoute(module);
      if (route) allowedRoutes.add(route);

      [
        firstValue(module, ["moduleKey", "ModuleKey", "key", "Key"]),
        firstValue(module, ["moduleName", "ModuleName", "name", "Name", "label", "Label"]),
      ].forEach((key) => {
        const normalized = normalizeKey(key);
        if (normalized) {
          allowedModules.add(normalized);
          moduleAccess[normalized] = true;
        }
      });

      if (route === "/management-dashboard") moduleAccess.management_dashboard = true;
      if (route === "/dashboard") moduleAccess.it_operation_dashboard = true;
    });

    return {
      ...user,
      allowedRoutes: Array.from(allowedRoutes),
      allowedModules: Array.from(allowedModules),
      moduleAccess,
    };
  } catch (error) {
    console.warn("Module access could not be loaded during login.", error);
    return user;
  }
}

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginTheme, setLoginTheme] = useState<"light" | "dark">("light");

  const [mfaState, setMfaState] = useState<MfaState | null>(null);
  const [mfaCode, setMfaCode] = useState("");

  useEffect(() => {
    const savedTheme = localStorage.getItem("ema-login-theme");

    if (savedTheme === "dark" || savedTheme === "light") {
      setLoginTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("ema-login-theme", loginTheme);
  }, [loginTheme]);

  const finalizeLogin = async (accessToken: string, rawUser: AnyUser, fallbackUsername = "User") => {
    const normalizedUser = normalizeApiUser(rawUser, fallbackUsername);
    const accessUser = await enrichUserWithModuleAccess(accessToken, normalizedUser);

    storeAuthToken(accessToken, accessUser);
    login(accessToken, accessUser);
    navigate(getDefaultAccessiblePath(accessUser), { replace: true });
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("sso_token") || params.get("token");
    const provider = params.get("provider") || params.get("sso_provider");
    const email = params.get("email");
    const callbackError = params.get("error");
    const callbackMessage = params.get("message");

    if (callbackError) {
      const errorMap: Record<string, string> = {
        google_auth_failed: "Google authentication failed.",
        microsoft_auth_failed: "Microsoft authentication failed.",
        google_not_configured: "Google login is not configured yet.",
        microsoft_not_configured: "Microsoft login is not configured yet.",
        google_access_denied: "Google access denied.",
        microsoft_access_denied: "Microsoft access denied.",
        google_missing_email: "Google did not return an email address.",
        microsoft_missing_email: "Microsoft did not return an email address.",
      };

      setError(callbackMessage || errorMap[callbackError] || "Authentication failed.");
      window.history.replaceState({}, "", "/login");
      return;
    }

    if (!token) return;

    const loadUserAndLogin = async () => {
      const fallbackUser = {
        username: email || provider || "SSO User",
        name: email || provider || "SSO User",
        email: email || "",
        role: "User",
        authSource: provider || "SSO",
      };

      try {
        const mePayload = await authService.getCurrentUser(token);
        const user = mePayload?.data || mePayload?.user || mePayload || fallbackUser;
        await finalizeLogin(token, user, email || provider || "SSO User");
      } catch {
        await finalizeLogin(token, fallbackUser, email || provider || "SSO User");
      } finally {
        window.history.replaceState({}, "", "/login");
      }
    };

    void loadUserAndLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const startMfaSetup = async (user: AnyUser) => {
    const userId = user.emaUserID || user.id || user.UserID || user.userID;

    if (!userId) {
      setError("User profile is missing required verification details.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = await authService.setupTwoFactor({
        userId,
        authSource: user.authSource || "EMA",
      });

      if (payload?.success === false) {
        setError(payload?.message || "Unable to prepare 2FA setup.");
        return;
      }

      setMfaState({
        user,
        setupRequired: true,
        secret: payload.secret || "",
        qrCode: payload.qrCode || "",
      });
      setMfaCode("");
    } catch (err) {
      console.error("2FA setup error:", err);
      setError("2FA setup is unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleMfaResponse = async (payload: LoginResponse) => {
    const user = payload?.data?.user || payload?.user || {};
    const requiresMfa = Boolean(payload.twoFactorRequired || payload.data?.twoFactorRequired);
    const requiresSetup = Boolean(
      payload.twoFactorSetupRequired || payload.data?.twoFactorSetupRequired
    );

    if (requiresSetup) {
      await startMfaSetup(user);
      return true;
    }

    if (requiresMfa) {
      setMfaState({
        user,
        setupRequired: false,
        secret: "",
        qrCode: "",
      });
      setMfaCode("");
      return true;
    }

    return false;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const cleanUsername = username.trim();
    const cleanPassword = password;

    if (!cleanUsername || !cleanPassword) {
      setError("Please enter username and password.");
      return;
    }

    try {
      setLoading(true);

      const payload = await authService.login({
        username: cleanUsername,
        email: cleanUsername,
        password: cleanPassword,
        rememberMe,
      });

      if (payload?.success === false) {
        setError(payload?.message || payload?.error || "Invalid username or password.");
        return;
      }

      if (payload && (await handleMfaResponse(payload))) {
        return;
      }

      const accessToken =
        payload?.data?.token ||
        payload?.data?.accessToken ||
        payload?.accessToken ||
        payload?.token ||
        "";

      if (!accessToken) {
        setError("Sign-in completed but your session could not be created.");
        return;
      }

      const apiUser = payload?.data?.user || payload?.user || {};
      await finalizeLogin(accessToken, apiUser, cleanUsername);
    } catch (err) {
      console.error("Sign-in error:", err);
      setError("Sign-in service is unavailable. Please try again or contact support.");
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!mfaState) return;

    const userId =
      mfaState.user.emaUserID ||
      mfaState.user.id ||
      mfaState.user.UserID ||
      mfaState.user.userID;

    if (!userId) {
      setError("User profile is missing required verification details.");
      return;
    }

    if (!mfaCode.trim()) {
      setError("Please enter your authentication code.");
      return;
    }

    try {
      setLoading(true);

      const payload = await authService.verifyTwoFactor({
        userId,
        token: mfaCode.trim(),
        isSetup: mfaState.setupRequired,
        secret: mfaState.secret,
        authSource: mfaState.user.authSource || "EMA",
      });

      if (payload?.success === false) {
        setError(payload?.message || payload?.error || "Invalid authentication code.");
        return;
      }

      const accessToken =
        payload?.data?.token ||
        payload?.data?.accessToken ||
        payload?.accessToken ||
        payload?.token ||
        "";

      if (!accessToken) {
        setError("Verification completed but your session could not be created.");
        return;
      }

      const apiUser = payload?.data?.user || payload?.user || mfaState.user;
      await finalizeLogin(accessToken, apiUser, username || "User");
    } catch (err) {
      console.error("2FA verify error:", err);
      setError("Verification service is unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetMfa = () => {
    setMfaState(null);
    setMfaCode("");
    setError("");
  };

  
    return (
    <main className={`login-page login-page-${loginTheme}`}>
      <style>{loginInlineCss}</style>
      <section className="login-shell" aria-label="EMA login">
        <aside className="login-hero-panel">
          <img className="login-hero-image" src={loginHero} alt="EMA endpoint operations overview" />
        </aside>

        <section className="login-form-panel">
          <button
            type="button"
            className="login-theme-toggle"
            onClick={() => setLoginTheme((current) => (current === "light" ? "dark" : "light"))}
            aria-label={`Switch to ${loginTheme === "light" ? "dark" : "light"} mode`}
          >
            {loginTheme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          <div className="login-card">
            <div className="login-card-header">
              <div className="login-card-icon">
                <User size={25} />
              </div>

              <div>
                <h2>{mfaState ? "Verify access" : "Welcome back"}</h2>
                <p>
                  {mfaState
                    ? "Enter your authenticator code to continue."
                    : "Sign in to continue to EMA System."}
                </p>
              </div>
            </div>

            {error ? (
              <div className="alert alert-danger login-alert" role="alert">
                {error}
              </div>
            ) : null}

            {mfaState ? (
              <form className="login-form" onSubmit={handleMfaVerify}>
                {mfaState.setupRequired ? (
                  <div className="login-2fa-setup">
                    <p className="login-2fa-text">
                      Scan this QR code in Microsoft Authenticator, Google Authenticator, or any TOTP authenticator app.
                    </p>

                    {mfaState.qrCode ? (
                      <div className="login-2fa-qr">
                        <img src={mfaState.qrCode} alt="2FA QR code" />
                      </div>
                    ) : null}

                    {mfaState.secret ? (
                      <p className="login-2fa-secret">
                        Manual key: <strong>{mfaState.secret}</strong>
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className="login-field">
                  <label htmlFor="mfaCode">Authentication code</label>
                  <div className="login-input">
                    <ShieldCheck size={18} />
                    <input
                      id="mfaCode"
                      type="text"
                      inputMode="numeric"
                      value={mfaCode}
                      onChange={(event) => setMfaCode(event.target.value)}
                      placeholder="Enter 6-digit code"
                      autoComplete="one-time-code"
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="login-submit-btn">
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm" />
                      Verifying
                    </>
                  ) : (
                    <>
                      Verify and continue
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                <button type="button" className="login-secondary-btn" onClick={resetMfa} disabled={loading}>
                  Back to password login
                </button>
              </form>
            ) : (
              <>
                <form className="login-form" onSubmit={handleSubmit}>
                  <div className="login-field">
                    <label htmlFor="username">Username</label>
                    <div className="login-input">
                      <User size={18} />
                      <input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        placeholder="Enter username"
                        autoComplete="username"
                      />
                    </div>
                  </div>

                  <div className="login-field">
                    <label htmlFor="password">Password</label>
                    <div className="login-input">
                      <LockKeyhole size={18} />
                      <input
                        id="password"
                        type={showPass ? "text" : "password"}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Enter password"
                        autoComplete="current-password"
                      />

                      <button
                        type="button"
                        className="login-password-toggle"
                        onClick={() => setShowPass((current) => !current)}
                        aria-label={showPass ? "Hide password" : "Show password"}
                      >
                        {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="login-form-row">
                    <label className="login-check">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(event) => setRememberMe(event.target.checked)}
                      />
                      <span>Remember me</span>
                    </label>

                    <button type="button" className="login-link-btn">
                      Forgot password?
                    </button>
                  </div>

                  <button type="submit" disabled={loading} className="login-submit-btn">
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm" />
                        Signing in
                      </>
                    ) : (
                      <>
                        Sign in
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>

                <div className="login-authenticator-panel">
                  <div className="login-authenticator-divider">
                    <span>SECURED BY</span>
                  </div>

                  <div className="login-authenticator-row">
                    <button type="button" className="login-authenticator-brand" disabled>
                      <MicrosoftLogo />
                      <span>Microsoft Authenticator</span>
                    </button>

                    <span className="login-authenticator-separator" />

                    <button type="button" className="login-authenticator-brand" disabled>
                      <GoogleLogo />
                      <span>Google Authenticator</span>
                    </button>
                  </div>

                  <div className="login-authenticator-badge">
                    <ShieldCheck size={13} />
                    <span>Required for enabled users</span>
                  </div>
                </div>
              </>
            )}

            <div className="login-security-note">
              <LockKeyhole size={18} />
              <span>Authorized users only. All access is logged and activity may be monitored for security purposes.</span>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

