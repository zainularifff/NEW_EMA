import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Cpu,
  Eye,
  EyeOff,
  LockKeyhole,
  Monitor,
  Moon,
  Network,
  ShieldCheck,
  Sparkles,
  Sun,
  User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";
import "../../styles/2fa.css";

type AnyUser = Record<string, any>;

type LoginApiResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  accessToken?: string;
  token?: string;
  twoFactorRequired?: boolean;
  twoFactorSetupRequired?: boolean;
  user?: AnyUser;
  data?: {
    accessToken?: string;
    token?: string;
    user?: AnyUser;
    twoFactorRequired?: boolean;
    twoFactorSetupRequired?: boolean;
  };
};

type MfaState = {
  user: AnyUser;
  setupRequired: boolean;
  secret: string;
  qrCode: string;
};

function MicrosoftLogo() {
  return (
    <svg
      className="login-provider-logo"
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
      className="login-provider-logo"
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
  localStorage.setItem(
    "ema-auth",
    JSON.stringify({
      token: accessToken,
      accessToken,
      user,
    })
  );
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

  const finalizeLogin = (accessToken: string, rawUser: AnyUser, fallbackUsername = "User") => {
    const normalizedUser = normalizeApiUser(rawUser, fallbackUsername);

    storeAuthToken(accessToken, normalizedUser);
    login(accessToken, normalizedUser);
    navigate("/dashboard", { replace: true });
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
      try {
        const meResponse = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const mePayload = await meResponse.json().catch(() => null);
        const user =
          mePayload?.data ||
          mePayload?.user ||
          {
            username: email || provider || "SSO User",
            name: email || provider || "SSO User",
            email: email || "",
            role: "User",
            authSource: provider || "SSO",
          };

        finalizeLogin(token, user, email || provider || "SSO User");
      } catch {
        finalizeLogin(
          token,
          {
            username: email || provider || "SSO User",
            name: email || provider || "SSO User",
            email: email || "",
            role: "User",
            authSource: provider || "SSO",
          },
          email || provider || "SSO User"
        );
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
      setError("2FA user ID was not returned by the API.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/2fa/setup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          authSource: user.authSource || "EMA",
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || payload?.success === false) {
        setError(payload?.message || "Failed to start 2FA setup.");
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
      setError("Cannot connect to 2FA setup API.");
    } finally {
      setLoading(false);
    }
  };

  const handleMfaResponse = async (payload: LoginApiResponse) => {
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

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          username: cleanUsername,
          email: cleanUsername,
          password: cleanPassword,
          rememberMe,
        }),
      });

      const payload = (await response.json().catch(() => null)) as LoginApiResponse | null;

      if (!response.ok || payload?.success === false) {
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
        setError("Login API did not return an access token.");
        return;
      }

      const apiUser = payload?.data?.user || payload?.user || {};
      finalizeLogin(accessToken, apiUser, cleanUsername);
    } catch (err) {
      console.error("Login API error:", err);
      setError("Cannot connect to login API. Please check backend server.");
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
      setError("2FA user ID was not returned by the API.");
      return;
    }

    if (!mfaCode.trim()) {
      setError("Please enter your authentication code.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/api/auth/2fa/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          userId,
          token: mfaCode.trim(),
          isSetup: mfaState.setupRequired,
          secret: mfaState.secret,
          authSource: mfaState.user.authSource || "EMA",
        }),
      });

      const payload = (await response.json().catch(() => null)) as LoginApiResponse | null;

      if (!response.ok || payload?.success === false) {
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
        setError("2FA API did not return an access token.");
        return;
      }

      const apiUser = payload?.data?.user || payload?.user || mfaState.user;
      finalizeLogin(accessToken, apiUser, username || "User");
    } catch (err) {
      console.error("2FA verify error:", err);
      setError("Cannot connect to 2FA verification API.");
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
      <div className="login-bg-orb orb-one" />
      <div className="login-bg-orb orb-two" />
      <div className="login-bg-orb orb-three" />
      <div className="login-bg-grid" />
      <div className="login-bg-glass" />

      <button
        type="button"
        className="login-theme-toggle"
        onClick={() =>
          setLoginTheme((current) => (current === "light" ? "dark" : "light"))
        }
        aria-label={`Switch to ${loginTheme === "light" ? "dark" : "light"} mode`}
      >
        {loginTheme === "light" ? <Moon size={18} /> : <Sun size={18} />}
      </button>

      <section className="login-shell">
        <aside className="login-visual-panel">
          <div className="login-visual-frame">
            <div className="login-brand-mark login-brand-mark-premium">
              <span className="login-brand-orbit login-brand-orbit-top">
                <Cpu size={15} />
              </span>

              <Monitor size={30} />

              <span className="login-brand-orbit login-brand-orbit-bottom">
                <Network size={15} />
              </span>
            </div>

            <div className="login-visual-content">
              <span className="login-eyebrow">EMA System</span>

              <h1>Endpoint operations made cleaner.</h1>

              <p>
                A focused workspace for hardware inventory, access control and
                system operations.
              </p>
            </div>

            <div className="login-visual-footer">
              <div>
                <span className="login-footer-icon">
                  <ShieldCheck size={18} />
                </span>
                <strong>Secure</strong>
                <span>Authenticated access</span>
              </div>

              <div>
                <span className="login-footer-icon">
                  <Cpu size={18} />
                </span>
                <strong>Managed</strong>
                <span>Endpoint visibility</span>
              </div>

              <div>
                <span className="login-footer-icon">
                  <Network size={18} />
                </span>
                <strong>Ready</strong>
                <span>Operations console</span>
              </div>
            </div>
          </div>
        </aside>

        <section className="login-form-panel">
          <div className="login-card">
            <div className="login-card-header">
              <div className="login-card-icon login-card-icon-premium">
                <ShieldCheck size={25} />

                <span className="login-card-spark">
                  <Sparkles size={13} />
                </span>
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
              <form onSubmit={handleMfaVerify}>
                {mfaState.setupRequired ? (
                  <div className="login-2fa-setup">
                    <p className="login-2fa-text">
                      Scan this QR code in Microsoft Authenticator, Google
                      Authenticator, or any TOTP authenticator app.
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

                <button
                  type="submit"
                  disabled={loading}
                  className="login-submit-btn"
                >
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

                <button
                  type="button"
                  className="login-secondary-btn"
                  onClick={resetMfa}
                  disabled={loading}
                >
                  Back to password login
                </button>
              </form>
            ) : (
              <>
                <form onSubmit={handleSubmit}>
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

                  <button
                    type="submit"
                    disabled={loading}
                    className="login-submit-btn"
                  >
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
                  <div className="login-authenticator-divider" />

                  <div className="login-authenticator-title">Secured by</div>

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
              <ShieldCheck size={17} />
              <span>Authorized users only. Activity may be monitored.</span>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
