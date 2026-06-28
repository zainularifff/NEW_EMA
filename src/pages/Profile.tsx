import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import {
  Building2,
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  UserCircle,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { getStoredAccessUser, saveAccessUser, type AccessUser } from "../routes/accessControl";

type ProfileFormState = {
  name: string;
  username: string;
  email: string;
  phone: string;
  department: string;
  position: string;
};

type PasswordFormState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type NoticeState = {
  tone: "success" | "error" | "info";
  text: string;
};

function firstValue(source: Record<string, unknown> | null | undefined, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = source?.[key];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }

  return fallback;
}

function splitRoles(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  return String(value || "")
    .split(/[,|;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getRoleLabel(user: AccessUser | null) {
  const roles = [
    ...splitRoles(user?.roles),
    ...splitRoles(user?.roleName),
    ...splitRoles(user?.role),
  ];

  return roles.length ? roles.join(" ? ") : "User";
}

function getInitials(name: string) {
  const text = String(name || "User").trim();

  const parts = text
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) return "U";

  return parts.map((part) => part[0]?.toUpperCase()).join("");
}

function getStoredToken() {
  try {
    return (
      localStorage.getItem("ema-access-token") ||
      localStorage.getItem("accessToken") ||
      localStorage.getItem("token") ||
      ""
    );
  } catch {
    return "";
  }
}

function updateStoredUser(user: AccessUser) {
  try {
    saveAccessUser(user);

    const rawAuth = localStorage.getItem("ema-auth");
    const parsed = rawAuth ? JSON.parse(rawAuth) : {};

    localStorage.setItem(
      "ema-auth",
      JSON.stringify({
        ...parsed,
        user,
      })
    );

    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("currentUser", JSON.stringify(user));
    localStorage.setItem("emaUser", JSON.stringify(user));
    localStorage.setItem("loggedInUser", JSON.stringify(user));
  } catch {
    // Ignore storage write issue.
  }
}

export default function Profile() {
  const auth = useAuth();
  const storedUser = getStoredAccessUser();

  const accessUser = useMemo<AccessUser | null>(() => {
    const contextUser = (auth.user || {}) as AccessUser;

    return {
      ...(storedUser || {}),
      ...(contextUser || {}),
      roles: contextUser.roles || storedUser?.roles,
      role: contextUser.role || storedUser?.role,
      roleName: contextUser.roleName || storedUser?.roleName,
    };
  }, [auth.user, storedUser]);

  const roleLabel = getRoleLabel(accessUser);

  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  const [profileForm, setProfileForm] = useState<ProfileFormState>(() => ({
    name: firstValue(accessUser, ["name", "fullName", "displayName"], "Current User"),
    username: firstValue(accessUser, ["username", "userID", "loginID"], ""),
    email: firstValue(accessUser, ["email", "emailAddress"], ""),
    phone: firstValue(accessUser, ["phone", "phoneNo", "mobileNo", "mobile"], ""),
    department: firstValue(accessUser, ["department", "departmentName", "branch", "clientName"], ""),
    position: firstValue(accessUser, ["position", "designation", "jobTitle"], ""),
  }));

  const [passwordForm, setPasswordForm] = useState<PasswordFormState>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const initials = getInitials(profileForm.name || profileForm.username || "User");
  const accountId = firstValue(accessUser, ["id", "userID", "UserID", "username"], "-");
  const lastLogin = firstValue(accessUser, ["lastLoginAt", "lastLogin", "LastLogin"], "-");
  const accountStatus = firstValue(accessUser, ["status", "accountStatus", "isActive"], "Active");

  const handleProfileChange = (field: keyof ProfileFormState) => (event: ChangeEvent<HTMLInputElement>) => {
    setProfileForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handlePasswordChange = (field: keyof PasswordFormState) => (event: ChangeEvent<HTMLInputElement>) => {
    setPasswordForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setNotice(null);

    try {
      const updatedUser: AccessUser = {
        ...(accessUser || {}),
        name: profileForm.name.trim(),
        username: profileForm.username.trim(),
        email: profileForm.email.trim(),
        phone: profileForm.phone.trim(),
        department: profileForm.department.trim(),
        position: profileForm.position.trim(),
      };

      updateStoredUser(updatedUser);

      const token = auth.token || getStoredToken();

      if (token && auth.login) {
        auth.login(token, updatedUser as any);
      }

      setNotice({
        tone: "success",
        text: "Profile information updated for current session.",
      });
    } catch {
      setNotice({
        tone: "error",
        text: "Profile update failed. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setChangingPassword(true);
    setNotice(null);

    try {
      if (!passwordForm.currentPassword.trim()) {
        throw new Error("Current password is required.");
      }

      if (passwordForm.newPassword.length < 8) {
        throw new Error("New password must be at least 8 characters.");
      }

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        throw new Error("New password and confirmation password do not match.");
      }

      const token = auth.token || getStoredToken();

      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: "Bearer " + token } : {}),
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      if (!response.ok) {
        throw new Error("Password API is not ready or request was rejected.");
      }

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setNotice({
        tone: "success",
        text: "Password updated successfully.",
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Password update failed.",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <main>
      <section>
        <div>
          <span>USER PROFILE</span>
          <h2>My Profile</h2>
          <p>
            Manage personal information, account details and password security for the current EMA login session.
          </p>
        </div>

        <div>
          <div>
            <span>ROLE</span>
            <strong>{roleLabel}</strong>
            <small>Current access level</small>
          </div>
          <div>
            <span>USERNAME</span>
            <strong>{profileForm.username || "-"}</strong>
            <small>Login identity</small>
          </div>
          <div>
            <span>STATUS</span>
            <strong>{accountStatus}</strong>
            <small>Account state</small>
          </div>
          <div>
            <span>SECURITY</span>
            <strong>Protected</strong>
            <small>Password management</small>
          </div>
        </div>
      </section>

      <section>
        <aside>
          <div>{initials}</div>

          <div>
            <h3>{profileForm.name || profileForm.username || "Current User"}</h3>
            <p>{roleLabel}</p>
          </div>

          <div>
            <div>
              <UserCircle size={16} />
              <span>Account ID</span>
              <strong>{accountId}</strong>
            </div>
            <div>
              <Mail size={16} />
              <span>Email</span>
              <strong>{profileForm.email || "-"}</strong>
            </div>
            <div>
              <Building2 size={16} />
              <span>Department</span>
              <strong>{profileForm.department || "-"}</strong>
            </div>
            <div>
              <ShieldCheck size={16} />
              <span>Last Login</span>
              <strong>{lastLogin}</strong>
            </div>
          </div>
        </aside>

        <section>
          <div>
            <div>
              <span>ACCOUNT CENTER</span>
              <h3>Profile Management</h3>
              <p>Update personal information or manage account password.</p>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setActiveTab("profile")}
              >
                <UserCircle size={15} />
                Profile
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("security")}
              >
                <Lock size={15} />
                Security
              </button>
            </div>
          </div>

          {notice && (
            <div>
              {notice.tone === "success" ? <CheckCircle2 size={16} /> : <ShieldCheck size={16} />}
              <span>{notice.text}</span>
            </div>
          )}

          {activeTab === "profile" ? (
            <form onSubmit={handleSaveProfile}>
              <div>
                <label>
                  <span>Full Name</span>
                  <input value={profileForm.name} onChange={handleProfileChange("name")} />
                </label>

                <label>
                  <span>Username</span>
                  <input value={profileForm.username} onChange={handleProfileChange("username")} />
                </label>

                <label>
                  <span>Email</span>
                  <input type="email" value={profileForm.email} onChange={handleProfileChange("email")} />
                </label>

                <label>
                  <span>Phone No</span>
                  <input value={profileForm.phone} onChange={handleProfileChange("phone")} />
                </label>

                <label>
                  <span>Department / Branch</span>
                  <input value={profileForm.department} onChange={handleProfileChange("department")} />
                </label>

                <label>
                  <span>Position</span>
                  <input value={profileForm.position} onChange={handleProfileChange("position")} />
                </label>
              </div>

              <div>
                <button type="submit" disabled={saving}>
                  <Save size={15} />
                  {saving ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleChangePassword}>
              <div>
                <label>
                  <span>Current Password</span>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange("currentPassword")}
                    autoComplete="current-password"
                  />
                </label>

                <label>
                  <span>New Password</span>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange("newPassword")}
                    autoComplete="new-password"
                  />
                </label>

                <label>
                  <span>Confirm New Password</span>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange("confirmPassword")}
                    autoComplete="new-password"
                  />
                </label>
              </div>

              <div>
                <KeyRound size={16} />
                <span>Password update uses /api/auth/change-password. Frontend validation requires minimum 8 characters.</span>
              </div>

              <div>
                <button type="submit" disabled={changingPassword}>
                  <Lock size={15} />
                  {changingPassword ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          )}
        </section>
      </section>
    </main>
  );
}
