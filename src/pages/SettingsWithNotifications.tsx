import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Gauge, Pencil, Plus, RefreshCw, Save, Search, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";

import LegacySettings from "./Settings";
import NotificationChannelsSettings from "../components/settings/NotificationChannelsSettings";
import api, { unwrapArray } from "../services/apiClient";

type SettingsView = "settings" | "management" | "notifications";
type ManagementSection = "aging" | "pricing" | "policy" | "softwarePolicy";
type Classification = "Legal" | "Illegal";

type CategoryRow = { CategoryID: number; CategoryName: string };
type PublisherRow = { Publisher: string; SoftwareCount?: number; InstalledCount?: number };
type SoftwareRow = {
  SWUNI_Idn?: number | null;
  SoftwareID?: string;
  SoftwareName: string;
  CategoryID?: number | null;
  CategoryName?: string;
  Publisher?: string;
  Version?: string;
  InstalledCount?: number;
  InstalledDeviceCount?: number;
};
type PolicyRow = {
  PolicyID: number;
  PolicyName: string;
  Description?: string;
  CategoryID?: number | null;
  CategoryName?: string;
  WorkingStartTime?: string;
  WorkingEndTime?: string;
  WorkDays?: string;
  UtilizedHours?: number;
  UnderUtilizedHours?: number;
  OpenCountThreshold?: number;
  LegalCount?: number;
  IllegalCount?: number;
  TotalItems?: number;
  LicenseTotal?: number;
  UpdatedAt?: string;
  CreatedAt?: string;
};
type PolicyItem = SoftwareRow & {
  PolicyItemID: number;
  PolicyID: number;
  Classification: Classification;
  ComplianceStatus?: Classification;
  WorkingStartTime?: string;
  WorkingEndTime?: string;
  WorkDays?: string;
  UtilizedHours?: number;
  UnderUtilizedHours?: number;
  NotUsedHours?: number;
  OpenCountThreshold?: number;
  LicenseKey?: string;
  LicenseCount?: number;
  LicenseStartDate?: string;
  LicenseEndDate?: string;
  UnitPrice?: number;
  Currency?: string;
  Notes?: string;
};

type RuleForm = {
  policyName: string;
  description: string;
  categoryId: string;
  publisher: string;
  workingStartTime: string;
  workingEndTime: string;
  utilizedHours: string;
  underUtilizedHours: string;
  notUsedHours: string;
  openCountThreshold: string;
};

type SoftwareForm = {
  classification: Classification;
  licenseCount: string;
  licenseKey: string;
  licenseStartDate: string;
  licenseEndDate: string;
  unitPrice: string;
  currency: string;
};

const API_ROOT = "/api/settings/software-policy";

const EMPTY_RULE: RuleForm = {
  policyName: "",
  description: "",
  categoryId: "",
  publisher: "",
  workingStartTime: "09:00",
  workingEndTime: "17:00",
  utilizedHours: "2",
  underUtilizedHours: "1",
  notUsedHours: "0",
  openCountThreshold: "1",
};

const EMPTY_SOFTWARE_FORM: SoftwareForm = {
  classification: "Legal",
  licenseCount: "",
  licenseKey: "",
  licenseStartDate: "",
  licenseEndDate: "",
  unitPrice: "",
  currency: "RM",
};

const MANAGEMENT_ITEMS: Array<{ key: ManagementSection; title: string }> = [
  { key: "pricing", title: "Device Pricing" },
  { key: "aging", title: "Aging PC Rule" },
  { key: "policy", title: "Management Policy" },
  { key: "softwarePolicy", title: "Software Registry" },
];

const INLINE_CSS = `
.management-control-wrapper.settings-management-shell{height:100%;min-height:0;display:grid!important;grid-template-columns:292px minmax(0,1fr)!important;gap:12px!important;overflow:hidden!important;padding:0!important;background:transparent!important;border:0!important}.management-control-sidebar{height:100%;display:flex;flex-direction:column;overflow:hidden;border:1px solid #dbe7fb;border-radius:20px;background:#fff}.management-control-sidebar-head{padding:16px 18px;border-bottom:1px solid #e5edf8}.management-control-sidebar-head span,.sp-chip{display:block;color:#2563eb;font-size:.64rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.management-control-sidebar-head strong{display:block;margin-top:6px;color:#0f2746;font-size:1.02rem;font-weight:900}.management-control-sidebar-head small{display:block;margin-top:4px;color:#64748b;font-size:.72rem;font-weight:700}.management-control-nav-list{flex:1;display:grid;align-content:start;gap:8px;overflow:auto;padding:14px 12px}.management-control-nav-btn{width:100%;min-height:56px;display:grid;grid-template-columns:38px minmax(0,1fr);align-items:center;gap:12px;padding:10px 13px;border:0;border-radius:16px;background:transparent;color:#0f2746;text-align:left;font-weight:900}.management-control-nav-btn.active{color:#fff;background:linear-gradient(135deg,#2563eb,#087ea4)}.management-control-nav-icon{width:38px;height:38px;display:grid;place-items:center;border-radius:13px;color:#2563eb;background:#eef4ff}.management-control-nav-btn.active .management-control-nav-icon{color:#fff;background:rgba(255,255,255,.2)}.management-control-content,.management-legacy-content{min-height:0;height:100%;overflow:hidden}.management-legacy-content>.settings-module-root{height:100%!important;max-height:100%!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}.management-legacy-content .settings-layout{height:100%!important;grid-template-columns:1fr!important;padding:0!important}.management-legacy-content .settings-menu{display:none!important}.management-legacy-content .settings-content{height:100%!important;min-height:0!important}
.software-policy-module{height:100%;min-height:0;display:grid;grid-template-rows:auto minmax(0,1fr);gap:12px;color:#0f2746;overflow:hidden}.software-policy-module *{box-sizing:border-box}.sp-top,.sp-section{border:1px solid #dbe7fb;border-radius:20px;background:#fff;box-shadow:0 14px 30px rgba(15,23,42,.045)}.sp-top{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:16px 18px}.sp-top h2{margin:3px 0;color:#0f2746;font-weight:950;letter-spacing:-.04em}.sp-top p,.sp-help{margin:0;color:#64748b;font-size:.74rem;font-weight:700;line-height:1.45}.sp-btn,.sp-icon,.sp-danger{min-height:40px;display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:12px;font-size:.76rem;font-weight:900;cursor:pointer}.sp-btn.primary{border:0;color:#fff;background:linear-gradient(135deg,#2563eb,#087ea4);padding:0 16px}.sp-btn.secondary{border:1px solid #d7e3f5;background:#fff;color:#2563eb;padding:0 16px}.sp-icon{width:40px;border:1px solid #d7e3f5;background:#fff;color:#2563eb}.sp-danger{width:40px;border:1px solid #fecaca;background:#fff1f2;color:#dc2626}.sp-btn:disabled,.sp-icon:disabled{opacity:.55;cursor:not-allowed}.sp-work{min-height:0;overflow:auto}.sp-section{overflow:hidden}.sp-section-title{padding:12px 14px;border-bottom:1px solid #eef3fb}.sp-section-title strong{display:block;color:#0f2746;font-size:.84rem;font-weight:900}.sp-section-title small{display:block;margin-top:2px;color:#64748b;font-size:.68rem;font-weight:700}.sp-section-body{padding:14px;min-height:0}.sp-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.sp-field{display:grid;gap:6px}.sp-field.full{grid-column:1/-1}.sp-field span{color:#64748b;font-size:.62rem;font-weight:900;text-transform:uppercase}.sp-field input,.sp-field select,.sp-field textarea,.sp-search input{width:100%;min-height:40px;border:1px solid #d7e3f5;border-radius:12px;background:#fff;color:#0f2746;padding:0 12px;font-size:.78rem;font-weight:750;outline:none}.sp-field textarea{min-height:78px;padding:10px;resize:vertical}.sp-action-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:12px}.sp-alert{padding:10px 14px;border-radius:14px;font-size:.74rem;font-weight:850;margin-bottom:12px}.sp-alert.error{color:#991b1b;background:#fef2f2;border:1px solid #fecaca}.sp-alert.success{color:#166534;background:#f0fdf4;border:1px solid #bbf7d0}.sp-alert.info{color:#1d4ed8;background:#eff6ff;border:1px solid #bfdbfe}.sp-policy-table-screen{min-height:0;overflow:auto}.sp-policy-table-card{height:100%;min-height:0}.sp-policy-table-wrap{display:grid;gap:10px;overflow:auto;padding-bottom:4px}.sp-policy-table-row{width:100%;min-width:1040px;min-height:68px;display:grid;grid-template-columns:minmax(220px,1.45fr) minmax(150px,.85fr) 96px 88px 88px 110px 150px 124px;gap:12px;align-items:center;padding:12px 14px;border:1px solid #e5edf8;border-radius:15px;background:#fff;color:#0f2746;text-align:left}.sp-policy-table-row.head{min-height:42px;background:#f3f7fc;color:#64748b;font-size:.62rem;font-weight:900;text-transform:uppercase}.sp-policy-table-row strong,.sp-policy-table-row small{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sp-policy-table-row small{margin-top:3px;color:#64748b;font-size:.66rem;font-weight:750}.sp-policy-table-row:not(.head):hover{border-color:#bfdbfe;background:#f8fbff}.sp-policy-table-actions{display:flex;justify-content:flex-end;gap:6px}.sp-policy-table-actions .sp-icon,.sp-policy-table-actions .sp-danger{width:34px;min-height:34px;border-radius:10px}.sp-badge{display:inline-flex;justify-content:center;align-items:center;min-height:24px;border-radius:999px;padding:0 8px;font-size:.62rem;font-weight:900}.sp-badge.legal{color:#166534;background:#dcfce7}.sp-badge.illegal{color:#991b1b;background:#fee2e2}.sp-empty{min-height:132px;display:grid;place-items:center;color:#64748b;font-size:.8rem;font-weight:800;text-align:center;padding:18px}.sp-policy-modal-backdrop{position:fixed;inset:0;z-index:3000;display:grid;place-items:center;padding:24px;background:rgba(15,23,42,.46);backdrop-filter:blur(6px)}.sp-policy-modal{width:min(1180px,calc(100vw - 56px));height:min(90vh,920px);display:grid;grid-template-rows:auto minmax(0,1fr);border:1px solid #dbe7fb;border-radius:24px;background:#f8fbff;box-shadow:0 30px 80px rgba(15,23,42,.32);overflow:hidden}.sp-policy-modal-head{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:16px 18px;border-bottom:1px solid #dbe7fb;background:#fff}.sp-policy-modal-head strong{display:block;color:#0f2746;font-size:1rem;font-weight:950}.sp-policy-modal-head small{display:block;margin-top:3px;color:#64748b;font-size:.72rem;font-weight:750}.sp-top-actions{display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-wrap:wrap}.sp-policy-modal-body{min-height:0;overflow:auto;padding:16px;display:grid;gap:12px}.sp-story{padding:10px 12px;border:1px solid #bfdbfe;border-radius:14px;background:#eff6ff;color:#1d4ed8;font-size:.72rem;font-weight:900}.sp-flow-tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.sp-flow-tabs span{min-height:44px;display:flex;align-items:center;gap:8px;border:1px solid #dbe7fb;border-radius:14px;background:#fff;padding:0 12px;color:#64748b;font-size:.7rem;font-weight:900}.sp-flow-tabs b{width:22px;height:22px;display:grid;place-items:center;border-radius:999px;background:#eff6ff;color:#2563eb;font-size:.68rem}.sp-map-panel{margin-top:12px;border:1px solid #dbe7fb;border-radius:16px;background:#f8fbff;overflow:hidden}.sp-map-panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:12px;border-bottom:1px solid #e5edf8}.sp-map-panel-head strong{display:block;font-size:.82rem;font-weight:950;color:#0f2746}.sp-map-panel-head small{display:block;margin-top:2px;color:#64748b;font-size:.68rem;font-weight:740}.sp-search{min-height:40px;display:flex;align-items:center;gap:8px;border:1px solid #d7e3f5;border-radius:12px;padding:0 11px;background:#fff;color:#64748b;min-width:260px}.sp-search input{min-height:0;border:0;padding:0}.sp-table{min-height:220px;max-height:330px;overflow:auto;background:#fff}.sp-row{min-height:56px;display:grid;grid-template-columns:42px minmax(240px,1.3fr) minmax(145px,.7fr) 86px;gap:12px;align-items:center;padding:0 14px;border-bottom:1px solid #edf2f7;font-size:.74rem;font-weight:740}.sp-row.head{position:sticky;top:0;z-index:2;min-height:42px;background:#f3f7fc;color:#64748b;font-size:.62rem;font-weight:900;text-transform:uppercase}.sp-row.selected{background:#eff6ff}.sp-row strong,.sp-row small{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis}.sp-row strong{color:#0f2746}.sp-row small{color:#64748b;font-size:.64rem;white-space:nowrap}.sp-selected-box{margin-top:10px;padding:10px 12px;border:1px solid #bfdbfe;border-radius:15px;background:#eff6ff;color:#1d4ed8;font-size:.76rem;font-weight:850}.sp-selected-box.warning{border-color:#fde68a;background:#fffbeb;color:#92400e}.sp-class-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.sp-class-btn{min-height:70px;padding:12px;border:1px solid #d7e3f5;border-radius:16px;background:#fff;color:#0f2746;text-align:left;font-weight:900}.sp-class-btn.active.legal{border-color:#bbf7d0;background:#f0fdf4;color:#166534}.sp-class-btn.active.illegal{border-color:#fecaca;background:#fef2f2;color:#991b1b}.sp-cost-grid{display:grid;grid-template-columns:1fr .42fr 1fr 1fr;gap:10px}.sp-usage-note{margin-top:10px;padding:11px 12px;border-radius:14px;background:#f8fafc;border:1px dashed #cbd5e1;color:#475569;font-size:.72rem;font-weight:800}.sp-register-stack{display:grid;gap:12px}@media(max-width:1280px){.management-control-wrapper.settings-management-shell,.sp-form-grid,.sp-cost-grid,.sp-flow-tabs{grid-template-columns:1fr!important}.sp-row{grid-template-columns:42px 1fr}.sp-row.head{display:none}.sp-map-panel-head{display:grid}.sp-search{min-width:0}}
`;

function readInitialView(): SettingsView {
  if (typeof window === "undefined") return "settings";
  const hash = String(window.location.hash || "").toLowerCase();
  const query = new URLSearchParams(window.location.search);
  const tab = String(query.get("tab") || "").toLowerCase();
  if (hash.includes("notification") || tab.includes("notification")) return "notifications";
  if (hash.includes("management") || tab.includes("management")) return "management";
  return "settings";
}

function readManagementSection(): ManagementSection {
  if (typeof window === "undefined") return "aging";
  const text = `${new URLSearchParams(window.location.search).get("section") || ""} ${window.location.hash || ""}`.toLowerCase();
  if (text.includes("software-registry") || text.includes("software-policy") || text.includes("softwarepolicy")) return "softwarePolicy";
  if (text.includes("pricing")) return "pricing";
  if (text.includes("policy")) return "policy";
  return "aging";
}

function getManagementHash(section: ManagementSection) {
  return section === "softwarePolicy" ? "#management-control-software-registry" : `#management-control-${section}`;
}

function getCategoryName(categories: CategoryRow[], categoryId: string) {
  return categories.find((category) => String(category.CategoryID) === String(categoryId))?.CategoryName || "";
}

function pickErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function normalizeTime(value?: string) {
  return String(value || "").slice(0, 5) || "";
}

function getSoftwareKey(row: SoftwareRow) {
  return [row.SWUNI_Idn || row.SoftwareID || row.SoftwareName, row.Publisher || "", row.Version || ""].join("||");
}

function dateOnly(value?: string) {
  return value ? String(value).slice(0, 10) : "";
}

function formatMoney(value: string, currency: string) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return `${currency || "RM"} 0.00`;
  return `${currency || "RM"} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function SoftwareRegistryManagement() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [publishers, setPublishers] = useState<PublisherRow[]>([]);
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [activePolicyId, setActivePolicyId] = useState<number | null>(null);
  const [ruleForm, setRuleForm] = useState<RuleForm>(EMPTY_RULE);
  const [softwareForm, setSoftwareForm] = useState<SoftwareForm>(EMPTY_SOFTWARE_FORM);
  const [softwareSearch, setSoftwareSearch] = useState("");
  const [softwareRows, setSoftwareRows] = useState<SoftwareRow[]>([]);
  const [policyItems, setPolicyItems] = useState<PolicyItem[]>([]);
  const [selectedSoftware, setSelectedSoftware] = useState<SoftwareRow | null>(null);
  const [uiMode, setUiMode] = useState<"list" | "form">("list");
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [subSoftwareName, setSubSoftwareName] = useState("");
  const [loading, setLoading] = useState(false);
  const [softwareLoading, setSoftwareLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const activePolicy = useMemo(() => policies.find((policy) => policy.PolicyID === activePolicyId) || null, [activePolicyId, policies]);
  const selectedSoftwareKey = selectedSoftware ? getSoftwareKey(selectedSoftware) : "";
  const licenseTotalCost = useMemo(() => {
    const license = Number(softwareForm.licenseCount || 0);
    const unitPrice = Number(softwareForm.unitPrice || 0);
    if (!Number.isFinite(license) || !Number.isFinite(unitPrice)) return 0;
    return license * unitPrice;
  }, [softwareForm.licenseCount, softwareForm.unitPrice]);

  const currentCategoryName = ruleForm.categoryId === "__other__" ? customCategoryName.trim() : getCategoryName(categories, ruleForm.categoryId);
  const resolvedRegistrySoftware: SoftwareRow | null = useMemo(() => {
    const policyName = ruleForm.policyName.trim();
    if (!policyName) return null;
    if (selectedSoftware) return selectedSoftware;
    const edition = subSoftwareName.trim();
    return {
      SWUNI_Idn: null,
      SoftwareID: `manual-${policyName}-${ruleForm.publisher || "publisher"}`,
      SoftwareName: edition || policyName,
      CategoryID: ruleForm.categoryId === "__other__" ? null : Number(ruleForm.categoryId) || null,
      CategoryName: currentCategoryName,
      Publisher: ruleForm.publisher,
      Version: edition || undefined,
      InstalledCount: 0,
      InstalledDeviceCount: 0,
    };
  }, [currentCategoryName, ruleForm.categoryId, ruleForm.policyName, ruleForm.publisher, selectedSoftware, subSoftwareName]);

  const loadPolicies = useCallback(async () => {
    const payload = await api.get(`${API_ROOT}/policies`, { forceRefresh: true });
    const rows = unwrapArray<PolicyRow>(payload).sort((a, b) => String(b.UpdatedAt || b.CreatedAt || "").localeCompare(String(a.UpdatedAt || a.CreatedAt || "")));
    setPolicies(rows);
    setActivePolicyId((current) => (rows.some((row) => row.PolicyID === current) ? current : null));
  }, []);

  const loadBase = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [categoryPayload] = await Promise.all([
        api.get(`${API_ROOT}/categories`, { forceRefresh: true }),
        loadPolicies(),
      ]);
      setCategories(unwrapArray<CategoryRow>(categoryPayload));
    } catch (error) {
      setMessage({ type: "error", text: pickErrorMessage(error, "Failed to load software registry setup.") });
    } finally {
      setLoading(false);
    }
  }, [loadPolicies]);

  const loadPolicyItems = useCallback(async (policyId: number) => {
    const payload = await api.get(`${API_ROOT}/policies/${policyId}/items`, { forceRefresh: true });
    setPolicyItems(unwrapArray<PolicyItem>(payload).slice(0, 1));
  }, []);

  const loadPublishers = useCallback(async (categoryId: string) => {
    if (!categoryId || categoryId === "__other__") {
      setPublishers([]);
      return;
    }
    try {
      const payload = await api.get(`${API_ROOT}/publishers?categoryId=${encodeURIComponent(categoryId)}`, { forceRefresh: true });
      setPublishers(unwrapArray<PublisherRow>(payload));
    } catch (error) {
      setPublishers([]);
      setMessage({ type: "error", text: pickErrorMessage(error, "Failed to load publisher list.") });
    }
  }, []);

  const loadSoftwareRows = useCallback(async () => {
    if (uiMode !== "form" || !ruleForm.categoryId || ruleForm.categoryId === "__other__" || !ruleForm.publisher) {
      setSoftwareRows([]);
      return;
    }
    setSoftwareLoading(true);
    try {
      const query = new URLSearchParams({
        categoryId: ruleForm.categoryId,
        publisher: ruleForm.publisher,
        search: softwareSearch,
        limit: "200",
      });
      const payload = await api.get(`${API_ROOT}/software?${query.toString()}`, { forceRefresh: true });
      setSoftwareRows(unwrapArray<SoftwareRow>(payload));
    } catch (error) {
      setSoftwareRows([]);
      setMessage({ type: "error", text: pickErrorMessage(error, "Failed to load software list.") });
    } finally {
      setSoftwareLoading(false);
    }
  }, [uiMode, ruleForm.categoryId, ruleForm.publisher, softwareSearch]);

  useEffect(() => { void loadBase(); }, [loadBase]);

  useEffect(() => {
    if (uiMode !== "form" || !activePolicy) return;
    const nextCategoryId = activePolicy.CategoryID ? String(activePolicy.CategoryID) : "";
    setRuleForm({
      ...EMPTY_RULE,
      policyName: activePolicy.PolicyName || "",
      description: activePolicy.Description || "",
      categoryId: nextCategoryId,
      workingStartTime: normalizeTime(activePolicy.WorkingStartTime) || "09:00",
      workingEndTime: normalizeTime(activePolicy.WorkingEndTime) || "17:00",
      utilizedHours: String(activePolicy.UtilizedHours ?? 2),
      underUtilizedHours: String(activePolicy.UnderUtilizedHours ?? 1),
      openCountThreshold: String(activePolicy.OpenCountThreshold ?? 1),
    });
    setCustomCategoryName(activePolicy.CategoryID ? "" : activePolicy.CategoryName || "");
    setSubSoftwareName("");
    setSelectedSoftware(null);
    void loadPublishers(nextCategoryId);
    void loadPolicyItems(activePolicy.PolicyID);
  }, [uiMode, activePolicy, loadPolicyItems, loadPublishers]);

  useEffect(() => {
    if (uiMode !== "form") return;
    const item = policyItems[0];
    if (!item) return;
    setSelectedSoftware({
      SWUNI_Idn: item.SWUNI_Idn,
      SoftwareID: item.SoftwareID,
      SoftwareName: item.SoftwareName,
      CategoryID: item.CategoryID,
      CategoryName: item.CategoryName,
      Publisher: item.Publisher,
      Version: item.Version,
      InstalledCount: item.InstalledCount,
      InstalledDeviceCount: item.InstalledDeviceCount,
    });
    setSoftwareForm({
      classification: item.ComplianceStatus || item.Classification || "Legal",
      licenseCount: String(item.LicenseCount ?? ""),
      licenseKey: item.LicenseKey || "",
      licenseStartDate: dateOnly(item.LicenseStartDate),
      licenseEndDate: dateOnly(item.LicenseEndDate),
      unitPrice: String(item.UnitPrice ?? ""),
      currency: item.Currency || "RM",
    });
    setRuleForm((current) => ({
      ...current,
      categoryId: item.CategoryID ? String(item.CategoryID) : current.categoryId,
      publisher: item.Publisher || current.publisher,
      workingStartTime: normalizeTime(item.WorkingStartTime) || current.workingStartTime,
      workingEndTime: normalizeTime(item.WorkingEndTime) || current.workingEndTime,
      utilizedHours: String(item.UtilizedHours ?? current.utilizedHours),
      underUtilizedHours: String(item.UnderUtilizedHours ?? current.underUtilizedHours),
      notUsedHours: String(item.NotUsedHours ?? current.notUsedHours),
      openCountThreshold: String(item.OpenCountThreshold ?? current.openCountThreshold),
      description: item.Notes || current.description,
    }));
  }, [uiMode, policyItems]);

  useEffect(() => {
    if (uiMode !== "form") return;
    const timer = window.setTimeout(() => { void loadSoftwareRows(); }, 250);
    return () => window.clearTimeout(timer);
  }, [uiMode, loadSoftwareRows]);

  const startNewRegistry = () => {
    setActivePolicyId(null);
    setRuleForm(EMPTY_RULE);
    setSoftwareForm(EMPTY_SOFTWARE_FORM);
    setPolicyItems([]);
    setSelectedSoftware(null);
    setSoftwareRows([]);
    setPublishers([]);
    setCustomCategoryName("");
    setSubSoftwareName("");
    setSoftwareSearch("");
    setUiMode("form");
    setMessage({ type: "info", text: "Register purchased software. Inventory child selection is optional when no child software exists." });
  };

  const openRegistry = (policyId: number) => {
    setActivePolicyId(policyId);
    setPolicyItems([]);
    setSelectedSoftware(null);
    setUiMode("form");
  };

  const buildRulePayload = () => ({
    PolicyName: ruleForm.policyName.trim(),
    Description: ruleForm.description.trim(),
    CategoryID: ruleForm.categoryId === "__other__" ? null : Number(ruleForm.categoryId) || null,
    CategoryName: ruleForm.categoryId === "__other__" ? customCategoryName.trim() : getCategoryName(categories, ruleForm.categoryId),
    WorkingStartTime: ruleForm.workingStartTime || "09:00",
    WorkingEndTime: ruleForm.workingEndTime || "17:00",
    WorkDays: "Mon-Fri",
    UtilizedHours: Number(ruleForm.utilizedHours) || 2,
    UnderUtilizedHours: Number(ruleForm.underUtilizedHours) || 1,
    OpenCountThreshold: Number(ruleForm.openCountThreshold) || 1,
  });

  const validateRegistry = () => {
    if (!ruleForm.policyName.trim()) return "Software name is required.";
    if (!ruleForm.categoryId) return "Software category is required.";
    if (ruleForm.categoryId === "__other__" && !customCategoryName.trim()) return "Custom category name is required.";
    if (!ruleForm.publisher) return "Publisher is required.";
    return "";
  };

  const saveRule = async () => {
    const policyId = activePolicy?.PolicyID;
    setSaving(true);
    try {
      const payload = buildRulePayload();
      if (policyId) {
        await api.put(`${API_ROOT}/policies/${policyId}`, payload);
        await loadPolicies();
        return policyId;
      }
      const createdPayload = await api.post(`${API_ROOT}/policies`, payload);
      const created = unwrapArray<PolicyRow>(createdPayload)[0] || (createdPayload as { data?: PolicyRow })?.data;
      await loadPolicies();
      if (created?.PolicyID) setActivePolicyId(created.PolicyID);
      return created?.PolicyID || null;
    } catch (error) {
      setMessage({ type: "error", text: pickErrorMessage(error, "Failed to save software registry.") });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    setRuleForm((current) => ({ ...current, categoryId, publisher: "" }));
    setSelectedSoftware(null);
    setSoftwareRows([]);
    if (categoryId === "__other__") {
      setPublishers([]);
      return;
    }
    void loadPublishers(categoryId);
  };

  const handlePublisherChange = (publisher: string) => {
    setRuleForm((current) => ({ ...current, publisher }));
    setSelectedSoftware(null);
    setSoftwareRows([]);
  };

  const saveRegistry = async () => {
    const validation = validateRegistry();
    if (validation) {
      setMessage({ type: "error", text: validation });
      return;
    }

    const effectiveSoftware = resolvedRegistrySoftware;
    if (!effectiveSoftware) {
      setMessage({ type: "error", text: "Software name is required." });
      return;
    }

    const policyId = await saveRule();
    if (!policyId) return;

    setSaving(true);
    try {
      await api.post(`${API_ROOT}/policies/${policyId}/items`, {
        items: [{
          SWUNI_Idn: effectiveSoftware.SWUNI_Idn || null,
          SoftwareName: effectiveSoftware.SoftwareName || ruleForm.policyName.trim(),
          CategoryID: effectiveSoftware.CategoryID || (ruleForm.categoryId === "__other__" ? null : Number(ruleForm.categoryId) || null),
          CategoryName: effectiveSoftware.CategoryName || currentCategoryName,
          Publisher: effectiveSoftware.Publisher || ruleForm.publisher,
          Version: effectiveSoftware.Version || subSoftwareName.trim(),
          Classification: softwareForm.classification,
          ComplianceStatus: softwareForm.classification,
          WorkingStartTime: ruleForm.workingStartTime || "09:00",
          WorkingEndTime: ruleForm.workingEndTime || "17:00",
          WorkDays: "Mon-Fri",
          UtilizedHours: Number(ruleForm.utilizedHours) || 2,
          UnderUtilizedHours: Number(ruleForm.underUtilizedHours) || 1,
          NotUsedHours: Number(ruleForm.notUsedHours) || 0,
          OpenCountThreshold: Number(ruleForm.openCountThreshold) || 1,
          LicenseCount: Number(softwareForm.licenseCount) || 0,
          LicenseKey: softwareForm.licenseKey,
          LicenseStartDate: softwareForm.licenseStartDate || null,
          LicenseEndDate: softwareForm.licenseEndDate || null,
          UnitPrice: Number(softwareForm.unitPrice) || 0,
          Currency: softwareForm.currency || "RM",
          Notes: ruleForm.description,
        }],
      });
      await loadPolicyItems(policyId);
      await loadPolicies();
      setUiMode("list");
      setMessage({ type: "success", text: "Software registry saved." });
    } catch (error) {
      setMessage({ type: "error", text: pickErrorMessage(error, "Failed to save software registry item.") });
    } finally {
      setSaving(false);
    }
  };

  const deleteRegistryPolicy = async (policy: PolicyRow) => {
    if (!window.confirm(`Delete ${policy.PolicyName}?`)) return;
    try {
      await api.delete(`${API_ROOT}/policies/${policy.PolicyID}`);
      if (activePolicyId === policy.PolicyID) setActivePolicyId(null);
      await loadPolicies();
      setUiMode("list");
      setMessage({ type: "success", text: "Software registry deleted." });
    } catch (error) {
      setMessage({ type: "error", text: pickErrorMessage(error, "Failed to delete software registry.") });
    }
  };

  return (
    <section className="software-policy-module">
      <header className="sp-top">
        <div>
          <span className="sp-chip">Settings</span>
          <h2>Software Registry</h2>
          <p>Register purchased software, classify legal status, license cost and usage rules.</p>
        </div>
        {uiMode === "list" ? <button className="sp-btn primary" type="button" onClick={startNewRegistry}><Plus size={16} /> Register Software</button> : null}
      </header>

      <main className="sp-work">
        {uiMode === "list" ? (
          <div className="sp-policy-table-screen">
            {message && <div className={`sp-alert ${message.type}`}>{message.text}</div>}
            <section className="sp-section sp-policy-table-card">
              <div className="sp-section-title">
                <strong>Software Registry</strong>
                <small>Each registration can apply to a parent software or one inventory child software.</small>
              </div>
              <div className="sp-section-body">
                <div className="sp-action-row" style={{ marginTop: 0, marginBottom: 12, justifyContent: "space-between" }}>
                  <span className="sp-help">{loading ? "Loading entries..." : `${policies.length} registry entrie(s) configured`}</span>
                  <button className="sp-icon" type="button" onClick={loadBase} disabled={loading} title="Refresh"><RefreshCw size={15} /></button>
                </div>
                <div className="sp-policy-table-wrap">
                  <div className="sp-policy-table-row head"><span>Registry Name</span><span>Category</span><span>Software</span><span>Legal</span><span>Illegal</span><span>License</span><span>Work hours</span><span>Action</span></div>
                  {loading ? <div className="sp-empty">Loading software registry...</div> : policies.length === 0 ? <div className="sp-empty">No software registry found. Click Register Software to create the first entry.</div> : policies.map((policy) => (
                    <div key={policy.PolicyID} className="sp-policy-table-row">
                      <span><strong>{policy.PolicyName}</strong><small>{policy.Description || "No note"}</small></span>
                      <span>{policy.CategoryName || "No category"}</span>
                      <span>{policy.TotalItems || 0}</span>
                      <span><b className="sp-badge legal">{policy.LegalCount || 0}</b></span>
                      <span><b className="sp-badge illegal">{policy.IllegalCount || 0}</b></span>
                      <span>{policy.LicenseTotal || 0}</span>
                      <span>{normalizeTime(policy.WorkingStartTime) || "09:00"} - {normalizeTime(policy.WorkingEndTime) || "17:00"}</span>
                      <span className="sp-policy-table-actions">
                        <button className="sp-icon" type="button" title="View" aria-label="View registry" onClick={() => openRegistry(policy.PolicyID)}><Eye size={14} /></button>
                        <button className="sp-icon" type="button" title="Edit" aria-label="Edit registry" onClick={() => openRegistry(policy.PolicyID)}><Pencil size={14} /></button>
                        <button className="sp-danger" type="button" title="Delete" aria-label="Delete registry" onClick={() => deleteRegistryPolicy(policy)}><Trash2 size={14} /></button>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div className="sp-policy-modal-backdrop">
            <div className="sp-policy-modal">
              <div className="sp-policy-modal-head">
                <div><strong>{activePolicy ? "Edit Software Registry" : "Register Software"}</strong><small>Inventory child selection is optional.</small></div>
                <div className="sp-top-actions"><button className="sp-btn secondary" type="button" onClick={() => setUiMode("list")}>Back to List</button><button className="sp-btn primary" type="button" onClick={saveRegistry} disabled={saving}><Save size={15} /> Save Registry</button></div>
              </div>
              <div className="sp-policy-modal-body">
                {message && <div className={`sp-alert ${message.type}`}>{message.text}</div>}
                <div className="sp-story">Flow: key in software name → choose category → choose publisher → choose inventory child only when available → set license, price and usage rules.</div>
                <div className="sp-flow-tabs"><span><b>1</b> Software name</span><span><b>2</b> Category & publisher</span><span><b>3</b> Optional inventory child</span><span><b>4</b> License & usage</span></div>

                <div className="sp-register-stack">
                  <section className="sp-section">
                    <div className="sp-section-title"><strong>1. Software registration</strong><small>Start with purchased software name, then choose category and publisher.</small></div>
                    <div className="sp-section-body">
                      <div className="sp-form-grid">
                        <label className="sp-field full"><span>Software name</span><input value={ruleForm.policyName} onChange={(e) => setRuleForm((c) => ({ ...c, policyName: e.target.value }))} placeholder="Example: Microsoft Office" /></label>
                        <label className="sp-field"><span>Software category</span><select value={ruleForm.categoryId} onChange={(e) => handleCategoryChange(e.target.value)}><option value="">Select category</option>{categories.map((row) => <option key={row.CategoryID} value={row.CategoryID}>{row.CategoryName}</option>)}<option value="__other__">Other / create custom category</option></select></label>
                        {ruleForm.categoryId === "__other__" && <label className="sp-field"><span>Custom category name</span><input value={customCategoryName} onChange={(e) => setCustomCategoryName(e.target.value)} placeholder="Example: Design Tool" /></label>}
                        <label className="sp-field"><span>Sub software / edition</span><input value={subSoftwareName} onChange={(e) => setSubSoftwareName(e.target.value)} placeholder="Optional, example: Pro / Enterprise / Add-on" /></label>
                        <label className="sp-field"><span>Publisher</span><select value={ruleForm.publisher} onChange={(e) => handlePublisherChange(e.target.value)} disabled={!ruleForm.categoryId || ruleForm.categoryId === "__other__"}><option value="">Select publisher after category</option>{publishers.map((row) => <option key={row.Publisher} value={row.Publisher}>{row.Publisher}</option>)}</select></label>
                      </div>

                      <div className="sp-map-panel">
                        <div className="sp-map-panel-head">
                          <div><strong>Inventory software list</strong><small>If this publisher has child software, select one. If not, save as parent software only.</small></div>
                          <label className="sp-search"><Search size={15} /><input value={softwareSearch} onChange={(e) => setSoftwareSearch(e.target.value)} placeholder="Search software..." disabled={!ruleForm.publisher} /></label>
                        </div>
                        <div className="sp-table">
                          <div className="sp-row head"><span></span><span>Software</span><span>Publisher</span><span>Installed</span></div>
                          {!ruleForm.categoryId ? <div className="sp-empty">Select software category first.</div> : !ruleForm.publisher ? <div className="sp-empty">Select publisher to display available child software.</div> : softwareLoading ? <div className="sp-empty">Loading software...</div> : softwareRows.length === 0 ? <div className="sp-empty">No child software found for this category and publisher. This registry can still be saved as parent software.</div> : softwareRows.map((row) => { const key = getSoftwareKey(row); const selected = selectedSoftwareKey === key; return (
                            <label key={key} className={`sp-row ${selected ? "selected" : ""}`}><span><input type="radio" name="software-registry-map" checked={selected} onChange={() => setSelectedSoftware(row)} /></span><span><strong>{row.SoftwareName}</strong><small>{row.Version || "No version"}</small></span><span>{row.Publisher || "Unknown"}</span><span>{row.InstalledCount ?? row.InstalledDeviceCount ?? 0}</span></label>
                          ); })}
                        </div>
                        <div className={`sp-selected-box ${!selectedSoftware ? "warning" : ""}`}>{selectedSoftware ? `Selected child software: ${selectedSoftware.SoftwareName}` : `No child selected. Registry will apply to parent software: ${subSoftwareName.trim() || ruleForm.policyName.trim() || "software name above"}`}</div>
                      </div>
                    </div>
                  </section>

                  <section className="sp-section">
                    <div className="sp-section-title"><strong>2. Classification, license & cost</strong><small>Classify the software and enter license cost for ROI calculation.</small></div>
                    <div className="sp-section-body">
                      <div className="sp-class-grid">
                        <button type="button" className={`sp-class-btn ${softwareForm.classification === "Legal" ? "active legal" : ""}`} onClick={() => setSoftwareForm((c) => ({ ...c, classification: "Legal" }))}><ShieldCheck size={18} /> Legal</button>
                        <button type="button" className={`sp-class-btn ${softwareForm.classification === "Illegal" ? "active illegal" : ""}`} onClick={() => setSoftwareForm((c) => ({ ...c, classification: "Illegal" }))}><ShieldAlert size={18} /> Illegal</button>
                      </div>
                      <div className="sp-selected-box">This registry applies to: {resolvedRegistrySoftware?.SoftwareName || "software name above"}</div>
                      <div className="sp-cost-grid">
                        <label className="sp-field"><span>Total license</span><input type="number" min="0" value={softwareForm.licenseCount} onChange={(e) => setSoftwareForm((c) => ({ ...c, licenseCount: e.target.value }))} /></label>
                        <label className="sp-field"><span>Currency</span><select value={softwareForm.currency} onChange={(e) => setSoftwareForm((c) => ({ ...c, currency: e.target.value }))}><option value="RM">RM</option><option value="USD">USD</option><option value="SGD">SGD</option></select></label>
                        <label className="sp-field"><span>Price per license</span><input type="number" min="0" step="0.01" value={softwareForm.unitPrice} onChange={(e) => setSoftwareForm((c) => ({ ...c, unitPrice: e.target.value }))} placeholder="0.00" /></label>
                        <label className="sp-field"><span>Total cost</span><input value={formatMoney(String(licenseTotalCost), softwareForm.currency)} readOnly /></label>
                        <label className="sp-field"><span>License key/ref</span><input value={softwareForm.licenseKey} onChange={(e) => setSoftwareForm((c) => ({ ...c, licenseKey: e.target.value }))} /></label>
                        <label className="sp-field"><span>Start date</span><input type="date" value={softwareForm.licenseStartDate} onChange={(e) => setSoftwareForm((c) => ({ ...c, licenseStartDate: e.target.value }))} /></label>
                        <label className="sp-field"><span>Expiry date</span><input type="date" value={softwareForm.licenseEndDate} onChange={(e) => setSoftwareForm((c) => ({ ...c, licenseEndDate: e.target.value }))} /></label>
                      </div>
                    </div>
                  </section>

                  <section className="sp-section">
                    <div className="sp-section-title"><strong>3. Usage rule</strong><small>Set working hours and usage thresholds for utilization analysis.</small></div>
                    <div className="sp-section-body">
                      <div className="sp-form-grid">
                        <label className="sp-field"><span>Work start</span><input type="time" value={ruleForm.workingStartTime} onChange={(e) => setRuleForm((c) => ({ ...c, workingStartTime: e.target.value }))} /></label>
                        <label className="sp-field"><span>Work end</span><input type="time" value={ruleForm.workingEndTime} onChange={(e) => setRuleForm((c) => ({ ...c, workingEndTime: e.target.value }))} /></label>
                        <label className="sp-field"><span>Utilized if at least hour/day</span><input type="number" min="0" step="0.25" value={ruleForm.utilizedHours} onChange={(e) => setRuleForm((c) => ({ ...c, utilizedHours: e.target.value }))} /></label>
                        <label className="sp-field"><span>Underutilized if below hour/day</span><input type="number" min="0" step="0.25" value={ruleForm.underUtilizedHours} onChange={(e) => setRuleForm((c) => ({ ...c, underUtilizedHours: e.target.value }))} /></label>
                        <label className="sp-field"><span>Not used if hour/day</span><input type="number" min="0" step="0.25" value={ruleForm.notUsedHours} onChange={(e) => setRuleForm((c) => ({ ...c, notUsedHours: e.target.value }))} /></label>
                        <label className="sp-field"><span>Open count/day</span><input type="number" min="0" value={ruleForm.openCountThreshold} onChange={(e) => setRuleForm((c) => ({ ...c, openCountThreshold: e.target.value }))} /></label>
                        <label className="sp-field full"><span>Note</span><textarea value={ruleForm.description} onChange={(e) => setRuleForm((c) => ({ ...c, description: e.target.value }))} placeholder="Optional note" /></label>
                      </div>
                      <div className="sp-usage-note">Monday to Friday. ≥ {ruleForm.utilizedHours || 2} hour/day = utilized. Below {ruleForm.underUtilizedHours || 1} hour/day = underutilized. ≤ {ruleForm.notUsedHours || 0} hour/day = not used.</div>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </section>
  );
}

export default function SettingsWithNotifications() {
  const [view, setView] = useState<SettingsView>(readInitialView);
  const [managementSection, setManagementSection] = useState<ManagementSection>(readManagementSection);

  useEffect(() => {
    document.documentElement.classList.add("ema-settings-page-active");
    document.body.classList.add("ema-settings-page-active");
    return () => {
      document.documentElement.classList.remove("ema-settings-page-active");
      document.body.classList.remove("ema-settings-page-active");
    };
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      setView(readInitialView());
      setManagementSection(readManagementSection());
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (view !== "management" || managementSection === "softwarePolicy") return;
    const timer = window.setTimeout(() => {
      const target = document.querySelector<HTMLButtonElement>(`.management-legacy-content .setting-btn[data-section="${managementSection}"]`);
      target?.click();
    }, 80);
    return () => window.clearTimeout(timer);
  }, [view, managementSection]);

  const switchView = (next: SettingsView) => {
    setView(next);
    if (typeof window !== "undefined") {
      const hash = next === "notifications" ? "#notifications" : next === "management" ? getManagementHash(managementSection) : "";
      window.history.replaceState(null, "", `${window.location.pathname}${hash}`);
    }
  };

  const switchManagementSection = (next: ManagementSection) => {
    setView("management");
    setManagementSection(next);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `${window.location.pathname}${getManagementHash(next)}`);
    }
  };

  return (
    <div className={`settings-with-notifications settings-view-${view}`} data-settings-view={view}>
      <style>{INLINE_CSS}</style>
      <div className="settings-notification-page-tabs">
        <button className={`notification-tab ${view === "settings" ? "active" : ""}`} onClick={() => switchView("settings")}>Settings Console</button>
        <button className={`notification-tab ${view === "management" ? "active" : ""}`} onClick={() => switchView("management")}>Management Control</button>
        <button className={`notification-tab ${view === "notifications" ? "active" : ""}`} onClick={() => switchView("notifications")}>Notification Channels</button>
      </div>

      <div className="settings-view-host">
        {view === "notifications" ? (
          <NotificationChannelsSettings />
        ) : view === "management" ? (
          <div className="management-control-wrapper settings-management-shell" data-management-section={managementSection}>
            <aside className="management-control-sidebar">
              <div className="management-control-sidebar-head">
                <span>Settings Center</span>
                <strong>Configuration Area</strong>
                <small>Select system setup domain</small>
              </div>
              <div className="management-control-nav-list">
                {MANAGEMENT_ITEMS.map((item) => (
                  <button key={item.key} type="button" className={`management-control-nav-btn ${managementSection === item.key ? "active" : ""}`} onClick={() => switchManagementSection(item.key)} data-section={item.key}>
                    <span className="management-control-nav-icon"><Gauge size={17} /></span>
                    <span>{item.title}</span>
                  </button>
                ))}
              </div>
            </aside>
            <main className="management-control-content">
              {managementSection === "softwarePolicy" ? <SoftwareRegistryManagement /> : <div className="management-legacy-content"><LegacySettings key={`management-${managementSection}`} /></div>}
            </main>
          </div>
        ) : (
          <LegacySettings />
        )}
      </div>
    </div>
  );
}
