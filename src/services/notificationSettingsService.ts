import api, { unwrapArray, unwrapData } from "./apiClient";

type AnyRecord = Record<string, any>;

export type NotificationEmailProvider = "SMTP" | "Azure" | "Exchange" | "Gmail";

export type NotificationEmailConfig = {
  provider: NotificationEmailProvider;
  host?: string;
  port?: string | number;
  user?: string;
  pass?: string;
  ssl?: boolean;
  isActive?: boolean;
  azureTenantId?: string;
  azureClientId?: string;
  azureClientSecret?: string;
  azureUser?: string;
  azurePass?: string;
  exchangeEndpoint?: string;
  exchangeDomainUser?: string;
  exchangePass?: string;
  gmailUser?: string;
  gmailPass?: string;
};

export type NotificationWhatsappConfig = {
  accountSid: string;
  authToken?: string;
  fromNumber: string;
  isEnabled: boolean;
};

export type NotificationRule = {
  RuleKey: string;
  Enabled: boolean;
  WhatsAppEnabled: boolean;
  Description: string;
  WhatsAppContentSID?: string;
};

export type NotificationRecipient = {
  RecipientID?: number;
  RecipientName: string;
  RecipientRole?: string;
  Email?: string;
  WhatsAppNumber?: string;
  ReceiveIncidentCreated: boolean;
  ReceiveIncidentUpdated: boolean;
  ReceiveIncidentResolved: boolean;
  ReceiveSystemLicense: boolean;
  ReceiveLicenseExceeded: boolean;
  IsEnabled: boolean;
};

export type WhatsappUsage = {
  count: number;
  limit: number;
  remaining: number;
  activeProvider: string;
};

type NotificationSettingsBundle = {
  emailSettings?: NotificationEmailConfig[];
  whatsappSettings?: NotificationWhatsappConfig;
  whatsappUsage?: WhatsappUsage;
  rules?: NotificationRule[];
  notificationRules?: NotificationRule[];
  recipients?: NotificationRecipient[];
  notificationRecipients?: NotificationRecipient[];
};

const WHATSAPP_MONTHLY_LIMIT = 200;
const STORAGE_KEYS = {
  email: "ema.notification.emailSettings",
  whatsapp: "ema.notification.whatsappSettings",
  usage: "ema.notification.whatsappUsage",
  rules: "ema.notification.rules",
  recipients: "ema.notification.recipients",
};

// Backend DB persistence is the default. Set VITE_NOTIFICATION_SETTINGS_API=false only for local UI demo mode.
const USE_BACKEND_NOTIFICATION_API = String((import.meta as any)?.env?.VITE_NOTIFICATION_SETTINGS_API ?? "true").toLowerCase() !== "false";

const DEFAULT_EMAIL_SETTINGS: NotificationEmailConfig[] = [
  { provider: "SMTP", host: "", port: "587", user: "", pass: "", ssl: true, isActive: true },
];

const DEFAULT_WHATSAPP_SETTINGS: NotificationWhatsappConfig = {
  accountSid: "",
  authToken: "",
  fromNumber: "",
  isEnabled: false,
};

const DEFAULT_RULES: NotificationRule[] = [
  { RuleKey: "INCIDENT_CREATED", Enabled: true, WhatsAppEnabled: true, Description: "New incident ticket created" },
  { RuleKey: "INCIDENT_UPDATED", Enabled: true, WhatsAppEnabled: true, Description: "Incident ticket updated" },
  { RuleKey: "INCIDENT_RESOLVED", Enabled: true, WhatsAppEnabled: true, Description: "Incident ticket resolved or closed" },
  { RuleKey: "SYSTEM_LICENSE_EXPIRY_3M", Enabled: true, WhatsAppEnabled: true, Description: "System license expiring in 3 months" },
  { RuleKey: "SYSTEM_LICENSE_EXPIRY_1M", Enabled: true, WhatsAppEnabled: true, Description: "System license expiring in 1 month" },
  { RuleKey: "SYSTEM_LICENSE_EXPIRY_1W", Enabled: true, WhatsAppEnabled: true, Description: "System license expiring in 1 week" },
  { RuleKey: "SYSTEM_LICENSE_EXPIRED", Enabled: true, WhatsAppEnabled: true, Description: "System license has expired" },
  { RuleKey: "LICENSE_EXCEEDED", Enabled: false, WhatsAppEnabled: false, Description: "Installed assets exceed licensed count" },
];

function boolValue(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") return ["true", "1", "yes", "on"].includes(value.toLowerCase());
  return fallback;
}

function normalizeProvider(value: unknown): NotificationEmailProvider {
  const text = String(value || "SMTP").trim();
  return (["SMTP", "Azure", "Exchange", "Gmail"] as NotificationEmailProvider[]).includes(text as NotificationEmailProvider)
    ? text as NotificationEmailProvider
    : "SMTP";
}

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local cache is best-effort only. DB persistence is handled by backend API.
  }
}

function readErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error || "Request failed");
}

function getStatus(error: unknown): number | undefined {
  return Number((error as any)?.response?.status || 0) || undefined;
}

function isAuthError(error: unknown) {
  const status = getStatus(error);
  const message = readErrorMessage(error);
  return status === 401 || status === 403 || /401|403|forbidden|unauthori[sz]ed|invalid|expired/i.test(message);
}

function isRouteMissing(error: unknown) {
  const status = getStatus(error);
  const message = readErrorMessage(error);
  return status === 404 || /404|not found/i.test(message);
}

function isNetworkDown(error: unknown) {
  const message = readErrorMessage(error);
  return /failed to fetch|err_connection_refused|networkerror|load failed|unable to connect/i.test(message);
}

function userFacingError(error: unknown, action = "save notification settings") {
  if (isNetworkDown(error)) {
    return new Error("Backend server is offline. Start backend on port 3001, then try again.");
  }
  if (isAuthError(error)) {
    return new Error("Session expired. Please sign in again before saving settings.");
  }
  if (isRouteMissing(error)) {
    return new Error("Notification route is not active in backend. Restart backend and try again.");
  }
  const message = readErrorMessage(error);
  if (/failed to load email settings|failed to load whatsapp settings|failed to load whatsapp usage|failed to load notification/i.test(message)) {
    return new Error("Notification database is not ready. Check backend terminal for the SQL error.");
  }
  if (/failed to save email settings|failed to save whatsapp settings|failed to save notification/i.test(message)) {
    return new Error("Unable to save to database. Check backend terminal for the SQL error.");
  }
  return error instanceof Error ? error : new Error(`Unable to ${action}.`);
}

function currentUsageFallback(): WhatsappUsage {
  const stored = readLocal<Partial<WhatsappUsage>>(STORAGE_KEYS.usage, {});
  const count = Math.max(0, Number(stored.count || 0));
  return {
    count,
    limit: WHATSAPP_MONTHLY_LIMIT,
    remaining: Math.max(0, WHATSAPP_MONTHLY_LIMIT - count),
    activeProvider: String(stored.activeProvider || "Twilio"),
  };
}

function saveUsage(countOrUsage: number | Partial<WhatsappUsage>) {
  const count = typeof countOrUsage === "number" ? countOrUsage : Math.max(0, Number(countOrUsage.count || 0));
  const usage = {
    count: Math.max(0, count),
    limit: WHATSAPP_MONTHLY_LIMIT,
    remaining: Math.max(0, WHATSAPP_MONTHLY_LIMIT - Math.max(0, count)),
    activeProvider: typeof countOrUsage === "number" ? "Twilio" : String(countOrUsage.activeProvider || "Twilio"),
  };
  writeLocal(STORAGE_KEYS.usage, usage);
  return usage;
}

function localWhatsappTestResult(message?: string) {
  const usage = saveUsage(currentUsageFallback().count + 1);
  return {
    simulated: true,
    localOnly: true,
    usage,
    message: message || "WhatsApp test recorded locally. Backend API is disabled.",
  };
}

export function normalizeEmailConfig(row: AnyRecord = {}): NotificationEmailConfig {
  const provider = normalizeProvider(row.provider ?? row.Provider);
  return {
    provider,
    host: String(row.host ?? row.SmtpHost ?? ""),
    port: row.port ?? row.SmtpPort ?? "587",
    user: String(row.user ?? row.SmtpUser ?? row.AzureUser ?? row.GmailUser ?? ""),
    pass: String(row.pass ?? ""),
    ssl: boolValue(row.ssl ?? row.SslTls ?? row.UseTLS, provider === "SMTP"),
    isActive: boolValue(row.isActive ?? row.IsActive, provider === "SMTP"),
    azureTenantId: String(row.azureTenantId ?? row.AzureTenantId ?? ""),
    azureClientId: String(row.azureClientId ?? row.AzureClientId ?? ""),
    azureClientSecret: String(row.azureClientSecret ?? ""),
    azureUser: String(row.azureUser ?? row.AzureUser ?? ""),
    azurePass: String(row.azurePass ?? ""),
    exchangeEndpoint: String(row.exchangeEndpoint ?? row.ExchangeEndpoint ?? ""),
    exchangeDomainUser: String(row.exchangeDomainUser ?? row.ExchangeDomainUser ?? ""),
    exchangePass: String(row.exchangePass ?? ""),
    gmailUser: String(row.gmailUser ?? row.GmailUser ?? ""),
    gmailPass: String(row.gmailPass ?? ""),
  };
}

export function normalizeWhatsappConfig(row: AnyRecord = {}): NotificationWhatsappConfig {
  return {
    accountSid: String(row.accountSid ?? row.AccountSID ?? ""),
    authToken: String(row.authToken ?? row.AuthToken ?? ""),
    fromNumber: String(row.fromNumber ?? row.FromNumber ?? ""),
    isEnabled: boolValue(row.isEnabled ?? row.IsEnabled, false),
  };
}

export function normalizeNotificationRule(row: AnyRecord = {}): NotificationRule {
  return {
    RuleKey: String(row.RuleKey ?? row.ruleKey ?? ""),
    Enabled: boolValue(row.Enabled ?? row.enabled ?? row.EmailEnabled, false),
    WhatsAppEnabled: boolValue(row.WhatsAppEnabled ?? row.whatsAppEnabled ?? row.whatsappEnabled, false),
    Description: String(row.Description ?? row.description ?? ""),
    WhatsAppContentSID: String(row.WhatsAppContentSID ?? row.whatsAppContentSID ?? row.contentSid ?? ""),
  };
}

export function normalizeNotificationRecipient(row: AnyRecord = {}): NotificationRecipient {
  return {
    RecipientID: Number(row.RecipientID ?? row.recipientID ?? row.id ?? 0) || undefined,
    RecipientName: String(row.RecipientName ?? row.recipientName ?? row.name ?? ""),
    RecipientRole: String(row.RecipientRole ?? row.recipientRole ?? row.role ?? ""),
    Email: String(row.Email ?? row.email ?? ""),
    WhatsAppNumber: String(row.WhatsAppNumber ?? row.whatsAppNumber ?? row.whatsappNumber ?? row.phone ?? ""),
    ReceiveIncidentCreated: boolValue(row.ReceiveIncidentCreated ?? row.receiveIncidentCreated, true),
    ReceiveIncidentUpdated: boolValue(row.ReceiveIncidentUpdated ?? row.receiveIncidentUpdated, true),
    ReceiveIncidentResolved: boolValue(row.ReceiveIncidentResolved ?? row.receiveIncidentResolved, true),
    ReceiveSystemLicense: boolValue(row.ReceiveSystemLicense ?? row.receiveSystemLicense, true),
    ReceiveLicenseExceeded: boolValue(row.ReceiveLicenseExceeded ?? row.receiveLicenseExceeded, false),
    IsEnabled: boolValue(row.IsEnabled ?? row.isEnabled, true),
  };
}

function localBundle(): NotificationSettingsBundle {
  return {
    emailSettings: readLocal<NotificationEmailConfig[]>(STORAGE_KEYS.email, DEFAULT_EMAIL_SETTINGS).map(normalizeEmailConfig),
    whatsappSettings: normalizeWhatsappConfig(readLocal<NotificationWhatsappConfig>(STORAGE_KEYS.whatsapp, DEFAULT_WHATSAPP_SETTINGS)),
    whatsappUsage: currentUsageFallback(),
    rules: readLocal<NotificationRule[]>(STORAGE_KEYS.rules, DEFAULT_RULES).map(normalizeNotificationRule).filter((rule) => rule.RuleKey),
    recipients: readLocal<NotificationRecipient[]>(STORAGE_KEYS.recipients, []).map(normalizeNotificationRecipient),
  };
}

async function getLegacyBundle(): Promise<NotificationSettingsBundle> {
  const payload = unwrapData<AnyRecord>(await api.get("/api/settings/notifications", { forceRefresh: true, cacheTtlMs: 0 }), {});
  const raw = payload?.settings ?? payload?.notificationSettings ?? payload;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as NotificationSettingsBundle;
    } catch {
      return {};
    }
  }
  return (raw || {}) as NotificationSettingsBundle;
}

async function saveLegacyBundle(patch: NotificationSettingsBundle) {
  const current = { ...localBundle(), ...(await getLegacyBundle().catch(() => ({} as NotificationSettingsBundle))) };
  const next: NotificationSettingsBundle = {
    ...current,
    ...patch,
    emailSettings: patch.emailSettings || current.emailSettings || DEFAULT_EMAIL_SETTINGS,
    whatsappSettings: patch.whatsappSettings || current.whatsappSettings || DEFAULT_WHATSAPP_SETTINGS,
    whatsappUsage: patch.whatsappUsage || current.whatsappUsage || currentUsageFallback(),
    rules: patch.rules || patch.notificationRules || current.rules || DEFAULT_RULES,
    recipients: patch.recipients || patch.notificationRecipients || current.recipients || [],
  };
  const result = unwrapData(await api.put("/api/settings/notifications", next));
  return { ...(typeof result === "object" && result ? result as AnyRecord : {}), saved: true, fallback: true };
}

export const notificationSettingsService = {
  async getEmailSettings() {
    if (!USE_BACKEND_NOTIFICATION_API) {
      return readLocal<NotificationEmailConfig[]>(STORAGE_KEYS.email, DEFAULT_EMAIL_SETTINGS).map(normalizeEmailConfig);
    }
    try {
      const rows = unwrapArray<AnyRecord>(await api.get("/api/settings/email", { forceRefresh: true, cacheTtlMs: 0 })).map(normalizeEmailConfig);
      writeLocal(STORAGE_KEYS.email, rows);
      return rows;
    } catch (error) {
      try {
        const legacy = await getLegacyBundle();
        const rows = (legacy.emailSettings || DEFAULT_EMAIL_SETTINGS).map(normalizeEmailConfig);
        writeLocal(STORAGE_KEYS.email, rows);
        return rows;
      } catch {
        return readLocal<NotificationEmailConfig[]>(STORAGE_KEYS.email, DEFAULT_EMAIL_SETTINGS).map(normalizeEmailConfig);
      }
    }
  },

  async saveEmailSettings(payload: NotificationEmailConfig) {
    const current = readLocal<NotificationEmailConfig[]>(STORAGE_KEYS.email, DEFAULT_EMAIL_SETTINGS);
    const next = current.filter((item) => item.provider !== payload.provider);
    next.push({ ...payload });
    writeLocal(STORAGE_KEYS.email, next);

    if (!USE_BACKEND_NOTIFICATION_API) return { saved: true, localOnly: true };

    try {
      return unwrapData(await api.post("/api/settings/email", payload));
    } catch (error) {
      if (!isAuthError(error) && !isNetworkDown(error) && !isRouteMissing(error)) {
        try {
          return await saveLegacyBundle({ emailSettings: next });
        } catch (legacyError) {
          throw userFacingError(legacyError, "save email settings");
        }
      }
      throw userFacingError(error, "save email settings");
    }
  },

  async testEmail(payload: NotificationEmailConfig) {
    if (!USE_BACKEND_NOTIFICATION_API) return { simulated: true, provider: payload.provider };
    try {
      return unwrapData(await api.post("/api/settings/email/test", payload));
    } catch (error) {
      throw userFacingError(error, "test email settings");
    }
  },

  async getWhatsappSettings() {
    if (!USE_BACKEND_NOTIFICATION_API) {
      return normalizeWhatsappConfig(readLocal<NotificationWhatsappConfig>(STORAGE_KEYS.whatsapp, DEFAULT_WHATSAPP_SETTINGS));
    }
    try {
      const row = normalizeWhatsappConfig(unwrapData<AnyRecord>(await api.get("/api/settings/whatsapp", { forceRefresh: true, cacheTtlMs: 0 }), {}));
      const current = normalizeWhatsappConfig(readLocal<NotificationWhatsappConfig>(STORAGE_KEYS.whatsapp, DEFAULT_WHATSAPP_SETTINGS));
      const merged = normalizeWhatsappConfig({ ...current, ...row, authToken: current.authToken || row.authToken || "" });
      writeLocal(STORAGE_KEYS.whatsapp, merged);
      return merged;
    } catch {
      try {
        const legacy = await getLegacyBundle();
        const current = normalizeWhatsappConfig(readLocal<NotificationWhatsappConfig>(STORAGE_KEYS.whatsapp, DEFAULT_WHATSAPP_SETTINGS));
        const legacyRow = normalizeWhatsappConfig(legacy.whatsappSettings || {});
        const merged = normalizeWhatsappConfig({ ...current, ...legacyRow, authToken: current.authToken || legacyRow.authToken || "" });
        writeLocal(STORAGE_KEYS.whatsapp, merged);
        return merged;
      } catch {
        return normalizeWhatsappConfig(readLocal<NotificationWhatsappConfig>(STORAGE_KEYS.whatsapp, DEFAULT_WHATSAPP_SETTINGS));
      }
    }
  },

  async saveWhatsappSettings(payload: NotificationWhatsappConfig) {
    const current = normalizeWhatsappConfig(readLocal<NotificationWhatsappConfig>(STORAGE_KEYS.whatsapp, DEFAULT_WHATSAPP_SETTINGS));
    const localPayload = normalizeWhatsappConfig({
      ...current,
      ...payload,
      authToken: String(payload.authToken || current.authToken || ""),
    });
    writeLocal(STORAGE_KEYS.whatsapp, localPayload);

    if (!USE_BACKEND_NOTIFICATION_API) return { saved: true, localOnly: true };

    try {
      return unwrapData(await api.post("/api/settings/whatsapp", localPayload));
    } catch (error) {
      if (!isAuthError(error) && !isNetworkDown(error) && !isRouteMissing(error)) {
        try {
          return await saveLegacyBundle({ whatsappSettings: localPayload });
        } catch (legacyError) {
          throw userFacingError(legacyError, "save WhatsApp settings");
        }
      }
      throw userFacingError(error, "save WhatsApp settings");
    }
  },

  async testWhatsapp(payload: NotificationWhatsappConfig & { testNumber: string }) {
    if (!String(payload.testNumber || "").trim()) throw new Error("Recipient phone number is required.");
    if (!payload.isEnabled) throw new Error("Enable WhatsApp channel before sending test.");

    if (!USE_BACKEND_NOTIFICATION_API) return localWhatsappTestResult();

    try {
      const stored = normalizeWhatsappConfig(readLocal<NotificationWhatsappConfig>(STORAGE_KEYS.whatsapp, DEFAULT_WHATSAPP_SETTINGS));
      const result = unwrapData<AnyRecord>(await api.post("/api/settings/whatsapp/test", { ...stored, ...payload, authToken: payload.authToken || stored.authToken }), {});
      if (result?.usage) saveUsage(result.usage);
      return result;
    } catch (error) {
      throw userFacingError(error, "send WhatsApp test");
    }
  },

  async getWhatsappUsage() {
    if (!USE_BACKEND_NOTIFICATION_API) return currentUsageFallback();
    try {
      const payload = await api.get("/api/settings/whatsapp/usage", { forceRefresh: true, cacheTtlMs: 0 });
      const data = unwrapData<WhatsappUsage>(payload, currentUsageFallback());
      const count = Math.max(0, Number(data.count || 0));
      const usage = { ...data, count, limit: WHATSAPP_MONTHLY_LIMIT, remaining: Math.max(0, WHATSAPP_MONTHLY_LIMIT - count), activeProvider: data.activeProvider || "Twilio" };
      saveUsage(usage);
      return usage;
    } catch {
      try {
        const legacy = await getLegacyBundle();
        const usage = legacy.whatsappUsage ? saveUsage(legacy.whatsappUsage) : currentUsageFallback();
        return usage;
      } catch {
        return currentUsageFallback();
      }
    }
  },

  async getRules() {
    if (!USE_BACKEND_NOTIFICATION_API) {
      return readLocal<NotificationRule[]>(STORAGE_KEYS.rules, DEFAULT_RULES).map(normalizeNotificationRule).filter((rule) => rule.RuleKey);
    }
    try {
      const rules = unwrapArray<AnyRecord>(await api.get("/api/settings/notification-rules", { forceRefresh: true, cacheTtlMs: 0 })).map(normalizeNotificationRule).filter((rule) => rule.RuleKey);
      writeLocal(STORAGE_KEYS.rules, rules);
      return rules;
    } catch {
      try {
        const legacy = await getLegacyBundle();
        const rules = (legacy.rules || legacy.notificationRules || DEFAULT_RULES).map(normalizeNotificationRule).filter((rule) => rule.RuleKey);
        writeLocal(STORAGE_KEYS.rules, rules);
        return rules;
      } catch {
        return readLocal<NotificationRule[]>(STORAGE_KEYS.rules, DEFAULT_RULES).map(normalizeNotificationRule).filter((rule) => rule.RuleKey);
      }
    }
  },

  async saveRules(rules: NotificationRule[]) {
    writeLocal(STORAGE_KEYS.rules, rules);
    if (!USE_BACKEND_NOTIFICATION_API) return { saved: true, localOnly: true };
    try {
      return unwrapData(await api.put("/api/settings/notification-rules", rules));
    } catch (error) {
      if (!isAuthError(error) && !isNetworkDown(error) && !isRouteMissing(error)) {
        try {
          return await saveLegacyBundle({ rules });
        } catch (legacyError) {
          throw userFacingError(legacyError, "save notification rules");
        }
      }
      throw userFacingError(error, "save notification rules");
    }
  },

  async getRecipients() {
    if (!USE_BACKEND_NOTIFICATION_API) {
      return readLocal<NotificationRecipient[]>(STORAGE_KEYS.recipients, []).map(normalizeNotificationRecipient);
    }
    try {
      const rows = unwrapArray<AnyRecord>(await api.get("/api/settings/notification-recipients", { forceRefresh: true, cacheTtlMs: 0 })).map(normalizeNotificationRecipient);
      writeLocal(STORAGE_KEYS.recipients, rows);
      return rows;
    } catch (error) {
      try {
        const legacy = await getLegacyBundle();
        const rows = (legacy.recipients || legacy.notificationRecipients || []).map(normalizeNotificationRecipient);
        writeLocal(STORAGE_KEYS.recipients, rows);
        return rows;
      } catch {
        if (isRouteMissing(error)) throw userFacingError(error, "load notification receivers");
        return readLocal<NotificationRecipient[]>(STORAGE_KEYS.recipients, []).map(normalizeNotificationRecipient);
      }
    }
  },

  async saveRecipient(payload: NotificationRecipient) {
    const normalized = normalizeNotificationRecipient(payload);
    if (!String(normalized.RecipientName || "").trim()) throw new Error("Receiver name is required.");
    if (!String(normalized.Email || "").trim() && !String(normalized.WhatsAppNumber || "").trim()) {
      throw new Error("Add at least one Email or WhatsApp number for this receiver.");
    }

    const current = readLocal<NotificationRecipient[]>(STORAGE_KEYS.recipients, []).map(normalizeNotificationRecipient);
    const next = current.filter((item) => item.RecipientID !== normalized.RecipientID);
    next.push(normalized);
    writeLocal(STORAGE_KEYS.recipients, next);

    if (!USE_BACKEND_NOTIFICATION_API) return { saved: true, localOnly: true };

    try {
      const id = normalized.RecipientID;
      return id
        ? unwrapData(await api.put(`/api/settings/notification-recipients/${id}`, normalized))
        : unwrapData(await api.post("/api/settings/notification-recipients", normalized));
    } catch (error) {
      if (!isAuthError(error) && !isNetworkDown(error) && !isRouteMissing(error)) {
        try {
          return await saveLegacyBundle({ recipients: next });
        } catch (legacyError) {
          throw userFacingError(legacyError, "save notification receiver");
        }
      }
      throw userFacingError(error, "save notification receiver");
    }
  },

  async deleteRecipient(recipientID: number) {
    const current = readLocal<NotificationRecipient[]>(STORAGE_KEYS.recipients, []).map(normalizeNotificationRecipient);
    const next = current.filter((item) => Number(item.RecipientID) !== Number(recipientID));
    writeLocal(STORAGE_KEYS.recipients, next);

    if (!USE_BACKEND_NOTIFICATION_API) return { deleted: true, localOnly: true };

    try {
      return unwrapData(await api.delete(`/api/settings/notification-recipients/${recipientID}`));
    } catch (error) {
      if (!isAuthError(error) && !isNetworkDown(error) && !isRouteMissing(error)) {
        try {
          return await saveLegacyBundle({ recipients: next });
        } catch (legacyError) {
          throw userFacingError(legacyError, "delete notification receiver");
        }
      }
      throw userFacingError(error, "delete notification receiver");
    }
  },
};

export default notificationSettingsService;
