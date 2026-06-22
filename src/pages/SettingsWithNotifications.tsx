import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, FilePlus2, Gauge, RefreshCw, Save, Search, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";

import LegacySettings from "./Settings";
import NotificationChannelsSettings from "../components/settings/NotificationChannelsSettings";
import api, { unwrapArray } from "../services/apiClient";

type SettingsView = "settings" | "management" | "notifications";
type ManagementSection = "aging" | "pricing" | "policy" | "softwarePolicy";
type PurchaseStatus = "Purchased" | "Not Purchased" | "Unknown";
type WizardStep = 1 | 2 | 3;

type CategoryRow = { CategoryID: number; CategoryName: string };
type PolicyRow = {
  PolicyID: number;
  PolicyName: string;
  Description?: string;
  CategoryID?: number | null;
  CategoryName?: string;
  LegalCount?: number;
  IllegalCount?: number;
  RestrictedCount?: number;
  LicenseTotal?: number;
  TotalItems?: number;
  CreatedAt?: string;
  UpdatedAt?: string;
};
type SoftwareRow = {
  SoftwareName: string;
  CategoryName: string;
  Publisher?: string;
  Version?: string;
  Username?: string;
  ComputerName?: string;
  Department?: string;
};
type PolicyItem = SoftwareRow & {
  PolicyItemID: number;
  PolicyID: number;
  ComplianceStatus: string;
  PurchaseStatus: string;
  WorkingStartTime?: string;
  WorkingEndTime?: string;
  UtilizedHours?: number;
  UnderUtilizedHours?: number;
  NotUsedHours?: number;
  OpenCountThreshold?: number;
  LicenseCount?: number;
  LicenseKey?: string;
  LicenseStartDate?: string;
  LicenseEndDate?: string;
  Notes?: string;
  [key: string]: unknown;
};

type DraftPolicy = { policyName: string; description: string; categoryId: string };
type RuleDraft = {
  complianceStatus: string;
  purchaseStatus: PurchaseStatus;
  workingStartTime: string;
  workingEndTime: string;
  utilizedHours: string;
  underUtilizedHours: string;
  notUsedHours: string;
  openCountThreshold: string;
  licenseRef: string;
  licenseCount: string;
  licenseStartDate: string;
  licenseEndDate: string;
  notes: string;
};

const STATUS_LEGAL = "Legal";
const STATUS_RESTRICTED = "Restricted";
const EMPTY_POLICY: DraftPolicy = { policyName: "", description: "", categoryId: "" };
const DEFAULT_RULE: RuleDraft = {
  complianceStatus: STATUS_LEGAL,
  purchaseStatus: "Unknown",
  workingStartTime: "09:00",
  workingEndTime: "18:00",
  utilizedHours: "4",
  underUtilizedHours: "1",
  notUsedHours: "0",
  openCountThreshold: "1",
  licenseRef: "",
  licenseCount: "",
  licenseStartDate: "",
  licenseEndDate: "",
  notes: "",
};

const MANAGEMENT_ITEMS: Array<{ key: ManagementSection; title: string }> = [
  { key: "pricing", title: "Device Pricing" },
  { key: "aging", title: "Aging PC Rule" },
  { key: "policy", title: "Management Policy" },
  { key: "softwarePolicy", title: "Software Policy" },
];

const INLINE_CSS = `
.management-control-wrapper.settings-management-shell{height:100%;min-height:0;display:grid!important;grid-template-columns:292px minmax(0,1fr)!important;gap:12px!important;overflow:hidden!important;padding:0!important;background:transparent!important;border:0!important}.management-control-sidebar{height:100%;display:flex;flex-direction:column;overflow:hidden;border:1px solid #dbe7fb;border-radius:20px;background:#fff}.management-control-sidebar-head{padding:16px 18px;border-bottom:1px solid #e5edf8}.management-control-sidebar-head span,.sp-chip{display:block;color:#2563eb;font-size:.64rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.management-control-sidebar-head strong{display:block;margin-top:6px;color:#0f2746;font-size:1.02rem;font-weight:900}.management-control-sidebar-head small{display:block;margin-top:4px;color:#64748b;font-size:.72rem;font-weight:700}.management-control-nav-list{flex:1;display:grid;align-content:start;gap:8px;overflow:auto;padding:14px 12px}.management-control-nav-btn{width:100%;min-height:56px;display:grid;grid-template-columns:38px minmax(0,1fr);align-items:center;gap:12px;padding:10px 13px;border:0;border-radius:16px;background:transparent;color:#0f2746;text-align:left;font-weight:900}.management-control-nav-btn.active{color:#fff;background:linear-gradient(135deg,#2563eb,#087ea4)}.management-control-nav-icon{width:38px;height:38px;display:grid;place-items:center;border-radius:13px;color:#2563eb;background:#eef4ff}.management-control-nav-btn.active .management-control-nav-icon{color:#fff;background:rgba(255,255,255,.2)}.management-control-content,.management-legacy-content{min-height:0;height:100%;overflow:hidden}.management-legacy-content>.settings-module-root{height:100%!important;max-height:100%!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}.management-legacy-content .settings-layout{height:100%!important;grid-template-columns:1fr!important;padding:0!important}.management-legacy-content .settings-menu{display:none!important}.management-legacy-content .settings-content{height:100%!important;min-height:0!important}
.software-policy-module{height:100%;min-height:0;display:grid;grid-template-rows:auto auto minmax(0,1fr);gap:12px;color:#0f2746;overflow:hidden}.software-policy-module *{box-sizing:border-box}.sp-card,.sp-hero,.sp-stepbar{border:1px solid #dbe7fb;border-radius:20px;background:#fff;box-shadow:0 14px 30px rgba(15,23,42,.045)}.sp-hero{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:16px 18px}.sp-hero h2,.sp-panel-title{margin:4px 0;color:#0f2746;font-weight:900;letter-spacing:-.05em}.sp-hero p,.sp-panel-subtitle,.sp-muted{margin:0;color:#64748b;font-size:.74rem;font-weight:700;line-height:1.42}.sp-stepbar{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:10px}.sp-step{display:flex;align-items:center;gap:10px;min-height:54px;padding:10px 12px;border:1px solid transparent;border-radius:16px;background:#f8fbff;color:#31517a;text-align:left;font-weight:900}.sp-step.active{color:#fff;background:linear-gradient(135deg,#2563eb,#087ea4);box-shadow:0 12px 24px rgba(37,99,235,.18)}.sp-step-no{width:30px;height:30px;display:grid;place-items:center;border-radius:999px;background:#eef4ff;color:#2563eb}.sp-step.active .sp-step-no{background:rgba(255,255,255,.2);color:#fff}.sp-shell{min-height:0;overflow:hidden}.sp-screen{height:100%;min-height:0;display:grid;grid-template-rows:auto minmax(0,1fr);overflow:hidden}.sp-screen-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:16px 18px;border-bottom:1px solid #e5edf8}.sp-screen-body{min-height:0;overflow:auto;padding:16px 18px}.sp-actions{display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-wrap:wrap}.sp-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.sp-field{display:grid;gap:6px}.sp-field span{color:#64748b;font-size:.62rem;font-weight:900;text-transform:uppercase}.sp-field input,.sp-field select,.sp-field textarea,.sp-search input,.sp-row select{width:100%;min-height:40px;border:1px solid #d7e3f5;border-radius:12px;background:#fff;color:#0f2746;padding:0 12px;font-size:.78rem;font-weight:750}.sp-field textarea{min-height:76px;padding:10px}.sp-primary,.sp-secondary,.sp-danger,.sp-icon{min-height:40px;display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:12px;font-size:.76rem;font-weight:900;cursor:pointer}.sp-primary{border:0;color:#fff;background:linear-gradient(135deg,#2563eb,#087ea4);padding:0 16px}.sp-secondary{border:1px solid #d7e3f5;background:#fff;color:#2563eb;padding:0 16px}.sp-icon{width:40px;border:1px solid #d7e3f5;background:#fff;color:#2563eb}.sp-danger{width:40px;border:1px solid #fecaca;background:#fff1f2;color:#dc2626}.sp-primary:disabled,.sp-secondary:disabled,.sp-icon:disabled{opacity:.55;cursor:not-allowed}.sp-rules{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;margin-top:14px}.sp-rule-card{display:grid;gap:4px;padding:13px;border:1px solid #dbe7fb;border-radius:16px;background:#f8fbff;color:#0f2746;text-align:left}.sp-rule-card.active{color:#fff;background:linear-gradient(135deg,#2563eb,#087ea4)}.sp-rule-card small{color:#64748b;font-size:.68rem;font-weight:750}.sp-rule-card.active small{color:rgba(255,255,255,.82)}.sp-toolbar{display:grid;grid-template-columns:260px minmax(0,1fr) auto;gap:10px;align-items:end;margin-bottom:12px}.sp-search{min-height:40px;display:flex;align-items:center;gap:8px;border:1px solid #d7e3f5;border-radius:12px;padding:0 11px;background:#fff;color:#64748b}.sp-search input{min-height:0;border:0;padding:0}.sp-software-list{min-height:0;max-height:100%;overflow:auto;border:1px solid #e5edf8;border-radius:16px;background:#fff}.sp-row{min-height:58px;display:grid;grid-template-columns:42px minmax(260px,1.4fr) minmax(150px,.75fr) minmax(160px,.75fr);gap:12px;align-items:center;padding:0 14px;border-bottom:1px solid #edf2f7;font-size:.74rem;font-weight:740}.sp-row.head{position:sticky;top:0;z-index:2;min-height:44px;background:#f3f7fc;color:#64748b;font-size:.62rem;font-weight:900;text-transform:uppercase}.sp-row.selected{background:#eff6ff}.sp-row strong,.sp-row small{display:block;overflow:hidden;text-overflow:ellipsis}.sp-row small{color:#64748b;font-size:.64rem}.sp-rule-simple{display:grid;gap:14px}.sp-status-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.sp-status-btn{min-height:84px;padding:14px;border:1px solid #d7e3f5;border-radius:18px;background:#fff;color:#0f2746;text-align:left;font-weight:900}.sp-status-btn.legal{border-color:#bbf7d0;background:#f0fdf4;color:#166534}.sp-status-btn.restricted{border-color:#fecaca;background:#fef2f2;color:#991b1b}.sp-license-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.sp-advanced{border:1px solid #e5edf8;border-radius:16px;background:#f8fbff}.sp-advanced summary{cursor:pointer;padding:12px 14px;color:#31517a;font-size:.74rem;font-weight:900}.sp-advanced-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;padding:0 14px 14px}.sp-saved{margin-top:14px;border:1px solid #e5edf8;border-radius:16px;background:#fff}.sp-saved summary{cursor:pointer;padding:12px 14px;font-weight:900}.sp-saved-list{max-height:220px;overflow:auto;border-top:1px solid #edf2f7}.sp-saved-row{min-height:52px;display:grid;grid-template-columns:minmax(260px,1fr) 120px 140px 48px;gap:10px;align-items:center;padding:0 14px;border-bottom:1px solid #edf2f7}.sp-empty{min-height:160px;display:grid;place-items:center;color:#64748b;font-size:.8rem;font-weight:800;text-align:center}.sp-alert{padding:9px 14px;border-radius:14px;font-size:.74rem;font-weight:850}.sp-alert.error{color:#991b1b;background:#fef2f2;border:1px solid #fecaca}.sp-alert.success{color:#166534;background:#f0fdf4;border:1px solid #bbf7d0}.sp-alert.info{color:#1d4ed8;background:#eff6ff;border:1px solid #bfdbfe}@media(max-width:1280px){.management-control-wrapper.settings-management-shell,.sp-form-grid,.sp-status-grid,.sp-license-grid,.sp-advanced-grid,.sp-toolbar{grid-template-columns:1fr!important}.sp-stepbar{grid-template-columns:1fr}.sp-row,.sp-saved-row{grid-template-columns:42px 1fr}.sp-row.head{display:none}}
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
  const section = `${new URLSearchParams(window.location.search).get("section") || ""} ${window.location.hash || ""}`.toLowerCase();
  if (section.includes("software-policy") || section.includes("softwarepolicy") || section.includes("software_policy")) return "softwarePolicy";
  if (section.includes("pricing")) return "pricing";
  if (section.includes("policy")) return "policy";
  return "aging";
}

function getManagementHash(section: ManagementSection) {
  return section === "softwarePolicy" ? "#management-control-software-policy" : `#management-control-${section}`;
}

function getSoftwareKey(row: SoftwareRow) {
  return [row.SoftwareName, row.Publisher || "", row.Version || "", row.CategoryName || ""].join("||");
}

function getCategoryName(categories: CategoryRow[], categoryId: string) {
  return categories.find((category) => String(category.CategoryID) === String(categoryId))?.CategoryName || "";
}

function pickErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function sortPolicies(rows: PolicyRow[]) {
  return [...rows].sort((a, b) => String(b.UpdatedAt || b.CreatedAt || "").localeCompare(String(a.UpdatedAt || a.CreatedAt || "")));
}

function unwrapOne<T>(payload: unknown): T | null {
  const rows = unwrapArray<T>(payload);
  return rows[0] || (payload as { data?: T })?.data || null;
}

function makeRulePayload(rule: RuleDraft) {
  return {
    ComplianceStatus: rule.complianceStatus,
    PurchaseStatus: rule.purchaseStatus,
    WorkingStartTime: rule.workingStartTime,
    WorkingEndTime: rule.workingEndTime,
    UtilizedHours: Number(rule.utilizedHours) || 0,
    UnderUtilizedHours: Number(rule.underUtilizedHours) || 0,
    NotUsedHours: Number(rule.notUsedHours) || 0,
    OpenCountThreshold: Number(rule.openCountThreshold) || 0,
    LicenseKey: rule.licenseRef,
    LicenseCount: Number(rule.licenseCount) || 0,
    LicenseStartDate: rule.licenseStartDate || null,
    LicenseEndDate: rule.licenseEndDate || null,
    Notes: rule.notes,
  };
}

function SoftwarePolicyManagement() {
  const [step, setStep] = useState<WizardStep>(1);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [activePolicyId, setActivePolicyId] = useState<number | null>(null);
  const [draft, setDraft] = useState<DraftPolicy>(EMPTY_POLICY);
  const [categoryId, setCategoryId] = useState("");
  const [softwareSearch, setSoftwareSearch] = useState("");
  const [softwareRows, setSoftwareRows] = useState<SoftwareRow[]>([]);
  const [policyItems, setPolicyItems] = useState<PolicyItem[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
  const [ruleDraft, setRuleDraft] = useState<RuleDraft>(DEFAULT_RULE);
  const [loading, setLoading] = useState(false);
  const [softwareLoading, setSoftwareLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const activePolicy = useMemo(() => policies.find((policy) => policy.PolicyID === activePolicyId) || null, [activePolicyId, policies]);
  const selectedRows = useMemo(() => softwareRows.filter((row) => selectedKeys.has(getSoftwareKey(row))), [selectedKeys, softwareRows]);
  const summary = useMemo(() => {
    const legal = policyItems.filter((item) => String(item.ComplianceStatus).toLowerCase() === "legal").length;
    const restricted = policyItems.filter((item) => String(item.ComplianceStatus).toLowerCase() === "restricted").length;
    return { legal, restricted, total: policyItems.length };
  }, [policyItems]);

  const updateRule = (patch: Partial<RuleDraft>) => setRuleDraft((current) => ({ ...current, ...patch }));

  const loadPolicies = useCallback(async () => {
    const payload = await api.get("/api/settings/software-policy/policies", { forceRefresh: true });
    const rows = sortPolicies(unwrapArray<PolicyRow>(payload));
    setPolicies(rows);
    setActivePolicyId((current) => current ?? rows[0]?.PolicyID ?? null);
  }, []);

  const loadBase = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [categoryPayload] = await Promise.all([
        api.get("/api/settings/software-policy/categories", { forceRefresh: true }),
        loadPolicies(),
      ]);
      setCategories(unwrapArray<CategoryRow>(categoryPayload).filter((row) => row.CategoryName));
    } catch (error) {
      setMessage({ type: "error", text: pickErrorMessage(error, "Failed to load software policy setup.") });
    } finally {
      setLoading(false);
    }
  }, [loadPolicies]);

  const loadPolicyItems = useCallback(async (policyId: number) => {
    const payload = await api.get(`/api/settings/software-policy/policies/${policyId}/items`, { forceRefresh: true });
    setPolicyItems(unwrapArray<PolicyItem>(payload));
  }, []);

  const loadSoftwareRows = useCallback(async () => {
    const categoryName = getCategoryName(categories, categoryId);
    if (!categoryName) {
      setSoftwareRows([]);
      return;
    }
    setSoftwareLoading(true);
    try {
      const query = new URLSearchParams({ categoryName, search: softwareSearch, limit: "500" });
      const payload = await api.get(`/api/settings/software-policy/software?${query.toString()}`, { forceRefresh: true });
      setSoftwareRows(unwrapArray<SoftwareRow>(payload));
    } catch (error) {
      setMessage({ type: "error", text: pickErrorMessage(error, "Failed to load mapped software list.") });
      setSoftwareRows([]);
    } finally {
      setSoftwareLoading(false);
    }
  }, [categories, categoryId, softwareSearch]);

  useEffect(() => { void loadBase(); }, [loadBase]);

  useEffect(() => {
    if (!activePolicy) {
      setCategoryId("");
      setPolicyItems([]);
      return;
    }
    setCategoryId(activePolicy.CategoryID ? String(activePolicy.CategoryID) : "");
    void loadPolicyItems(activePolicy.PolicyID);
  }, [activePolicy, loadPolicyItems]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadSoftwareRows(); }, 250);
    return () => window.clearTimeout(timer);
  }, [loadSoftwareRows]);

  const createPolicy = async () => {
    const policyName = draft.policyName.trim();
    if (!policyName) {
      setMessage({ type: "error", text: "Rule name is required." });
      return;
    }
    const categoryName = getCategoryName(categories, draft.categoryId);
    setSaving(true);
    try {
      const payload = await api.post("/api/settings/software-policy/policies", {
        PolicyName: policyName,
        Description: draft.description,
        CategoryID: Number(draft.categoryId) || null,
        CategoryName: categoryName,
      });
      const created = unwrapOne<PolicyRow>(payload);
      setDraft(EMPTY_POLICY);
      await loadPolicies();
      if (created?.PolicyID) {
        setActivePolicyId(created.PolicyID);
        setCategoryId(created.CategoryID ? String(created.CategoryID) : draft.categoryId);
      }
      setStep(2);
      setMessage({ type: "success", text: "Rule created. Now choose the software." });
    } catch (error) {
      setMessage({ type: "error", text: pickErrorMessage(error, "Failed to create software policy rule.") });
    } finally {
      setSaving(false);
    }
  };

  const selectPolicy = (policy: PolicyRow) => {
    setActivePolicyId(policy.PolicyID);
    setCategoryId(policy.CategoryID ? String(policy.CategoryID) : "");
    setSelectedKeys(new Set());
    setStep(2);
  };

  const updateActivePolicyCategory = async (nextCategoryId: string) => {
    setCategoryId(nextCategoryId);
    setSelectedKeys(new Set());
    if (!activePolicy) return;
    const categoryName = getCategoryName(categories, nextCategoryId);
    try {
      await api.put(`/api/settings/software-policy/policies/${activePolicy.PolicyID}`, {
        CategoryID: Number(nextCategoryId) || null,
        CategoryName: categoryName,
      });
      await loadPolicies();
    } catch (error) {
      setMessage({ type: "error", text: pickErrorMessage(error, "Failed to update policy category.") });
    }
  };

  const toggleSoftware = (row: SoftwareRow) => {
    const key = getSoftwareKey(row);
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const saveSelectedSoftware = async () => {
    if (!activePolicy || selectedRows.length === 0) return;
    setSaving(true);
    try {
      const rulePayload = makeRulePayload(ruleDraft);
      await api.post(`/api/settings/software-policy/policies/${activePolicy.PolicyID}/items`, {
        items: selectedRows.map((row) => ({ ...row, ...rulePayload })),
      });
      setSelectedKeys(new Set());
      await loadPolicyItems(activePolicy.PolicyID);
      await loadPolicies();
      setMessage({ type: "success", text: `${selectedRows.length} software saved into this rule.` });
    } catch (error) {
      setMessage({ type: "error", text: pickErrorMessage(error, "Failed to save selected software.") });
    } finally {
      setSaving(false);
    }
  };

  const updateItem = async (item: PolicyItem, patch: Partial<PolicyItem>) => {
    setPolicyItems((current) => current.map((row) => row.PolicyItemID === item.PolicyItemID ? { ...row, ...patch } : row));
    try {
      await api.put(`/api/settings/software-policy/items/${item.PolicyItemID}`, patch);
      if (activePolicy) await loadPolicyItems(activePolicy.PolicyID);
      await loadPolicies();
    } catch (error) {
      setMessage({ type: "error", text: pickErrorMessage(error, "Failed to update policy item.") });
    }
  };

  const deleteItem = async (item: PolicyItem) => {
    try {
      await api.delete(`/api/settings/software-policy/items/${item.PolicyItemID}`);
      if (activePolicy) await loadPolicyItems(activePolicy.PolicyID);
      await loadPolicies();
      setMessage({ type: "success", text: "Software item removed from policy." });
    } catch (error) {
      setMessage({ type: "error", text: pickErrorMessage(error, "Failed to remove policy item.") });
    }
  };

  return (
    <section className="software-policy-module">
      <header className="sp-hero">
        <div><span className="sp-chip">Software Governance</span><h2>Software Policy</h2><p>One screen at a time. Create rule, choose software, then set legal and license details.</p></div>
        {message && <div className={`sp-alert ${message.type}`}>{message.text}</div>}
      </header>

      <nav className="sp-stepbar" aria-label="Software policy steps">
        <button type="button" className={`sp-step ${step === 1 ? "active" : ""}`} onClick={() => setStep(1)}><span className="sp-step-no">1</span><span>Create rule</span></button>
        <button type="button" className={`sp-step ${step === 2 ? "active" : ""}`} onClick={() => setStep(2)} disabled={!activePolicy}><span className="sp-step-no">2</span><span>Select software</span></button>
        <button type="button" className={`sp-step ${step === 3 ? "active" : ""}`} onClick={() => setStep(3)} disabled={selectedRows.length === 0 && policyItems.length === 0}><span className="sp-step-no">3</span><span>Set rule details</span></button>
      </nav>

      <div className="sp-shell sp-card">
        {step === 1 && (
          <section className="sp-screen">
            <div className="sp-screen-head"><div><span className="sp-chip">Step 1</span><h3 className="sp-panel-title">Create or choose a rule</h3><p className="sp-panel-subtitle">Start with a simple rule name. Existing rules are below.</p></div><button className="sp-icon" type="button" onClick={loadBase} disabled={loading}><RefreshCw size={15} /></button></div>
            <div className="sp-screen-body">
              <div className="sp-form-grid">
                <label className="sp-field"><span>Rule name</span><input value={draft.policyName} onChange={(event) => setDraft((current) => ({ ...current, policyName: event.target.value }))} placeholder="Example: Office Apps Rule" /></label>
                <label className="sp-field"><span>Default category</span><select value={draft.categoryId} onChange={(event) => setDraft((current) => ({ ...current, categoryId: event.target.value }))}><option value="">Select category</option>{categories.map((category) => <option key={category.CategoryID} value={category.CategoryID}>{category.CategoryName}</option>)}</select></label>
                <label className="sp-field"><span>Note</span><textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} rows={2} /></label>
                <div className="sp-actions"><button className="sp-primary" type="button" onClick={createPolicy} disabled={saving || loading}><Save size={15} /> Create Rule</button></div>
              </div>
              <div className="sp-rules">
                {policies.length === 0 ? <div className="sp-empty">No rule yet.</div> : policies.map((policy) => (
                  <button key={policy.PolicyID} type="button" className={`sp-rule-card ${policy.PolicyID === activePolicyId ? "active" : ""}`} onClick={() => selectPolicy(policy)}>
                    <strong>{policy.PolicyName}</strong><small>{policy.CategoryName || "No category"}</small><small>{policy.TotalItems || 0} software • {policy.LegalCount || 0} legal • {policy.IllegalCount || policy.RestrictedCount || 0} restricted</small>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="sp-screen">
            <div className="sp-screen-head"><div><span className="sp-chip">Step 2</span><h3 className="sp-panel-title">Select software</h3><p className="sp-panel-subtitle">Pick a category, search if needed, then tick software from the list.</p></div><div className="sp-actions"><button className="sp-secondary" type="button" onClick={() => setStep(1)}>Back</button><button className="sp-primary" type="button" onClick={() => setStep(3)} disabled={selectedRows.length === 0}>Next <ArrowRight size={15} /></button></div></div>
            <div className="sp-screen-body">
              <div className="sp-toolbar">
                <label className="sp-field"><span>Category</span><select value={categoryId} onChange={(event) => updateActivePolicyCategory(event.target.value)} disabled={!activePolicy}><option value="">Select category</option>{categories.map((category) => <option key={category.CategoryID} value={category.CategoryID}>{category.CategoryName}</option>)}</select></label>
                <label className="sp-search"><Search size={15} /><input value={softwareSearch} onChange={(event) => setSoftwareSearch(event.target.value)} placeholder="Search software, publisher or computer..." /></label>
                <button className="sp-secondary" type="button" disabled>{selectedRows.length} selected</button>
              </div>
              <div className="sp-software-list">
                <div className="sp-row head"><span></span><span>Software</span><span>Publisher</span><span>Computer / Department</span></div>
                {softwareLoading ? <div className="sp-empty">Loading software inventory...</div> : softwareRows.length === 0 ? <div className="sp-empty">Select category to display software list.</div> : softwareRows.map((row) => {
                  const key = getSoftwareKey(row);
                  return <label key={key} className={`sp-row ${selectedKeys.has(key) ? "selected" : ""}`}><span><input type="checkbox" checked={selectedKeys.has(key)} onChange={() => toggleSoftware(row)} /></span><span><strong>{row.SoftwareName}</strong><small>{row.CategoryName} • {row.Version || "No version"}</small></span><span>{row.Publisher || "-"}</span><span><strong>{row.ComputerName || "-"}</strong><small>{row.Department || row.Username || "-"}</small></span></label>;
                })}
              </div>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="sp-screen">
            <div className="sp-screen-head"><div><span className="sp-chip">Step 3</span><h3 className="sp-panel-title">Set rule details</h3><p className="sp-panel-subtitle">Basic fields only. Usage threshold and license dates stay under Advanced.</p></div><div className="sp-actions"><button className="sp-secondary" type="button" onClick={() => setStep(2)}>Back</button><button className="sp-primary" type="button" onClick={saveSelectedSoftware} disabled={!activePolicy || selectedRows.length === 0 || saving}><CheckCircle2 size={15} /> Save {selectedRows.length} software</button></div></div>
            <div className="sp-screen-body sp-rule-simple">
              <div className="sp-status-grid">
                <button type="button" className={`sp-status-btn ${ruleDraft.complianceStatus === STATUS_LEGAL ? "legal" : ""}`} onClick={() => updateRule({ complianceStatus: STATUS_LEGAL })}><ShieldCheck size={18} /> Legal / allowed software</button>
                <button type="button" className={`sp-status-btn ${ruleDraft.complianceStatus === STATUS_RESTRICTED ? "restricted" : ""}`} onClick={() => updateRule({ complianceStatus: STATUS_RESTRICTED })}><ShieldAlert size={18} /> Restricted / illegal software</button>
              </div>
              <div className="sp-license-grid">
                <label className="sp-field"><span>Purchase</span><select value={ruleDraft.purchaseStatus} onChange={(event) => updateRule({ purchaseStatus: event.target.value as PurchaseStatus })}><option value="Unknown">Unknown</option><option value="Purchased">Purchased</option><option value="Not Purchased">Not Purchased</option></select></label>
                <label className="sp-field"><span>No. license</span><input type="number" min="0" step="1" value={ruleDraft.licenseCount} onChange={(event) => updateRule({ licenseCount: event.target.value })} /></label>
                <label className="sp-field"><span>License key / reference</span><input value={ruleDraft.licenseRef} onChange={(event) => updateRule({ licenseRef: event.target.value })} /></label>
                <label className="sp-field"><span>Note</span><input value={ruleDraft.notes} onChange={(event) => updateRule({ notes: event.target.value })} /></label>
              </div>
              <details className="sp-advanced">
                <summary>Advanced usage and license period</summary>
                <div className="sp-advanced-grid">
                  <label className="sp-field"><span>Work start</span><input type="time" value={ruleDraft.workingStartTime} onChange={(event) => updateRule({ workingStartTime: event.target.value })} /></label>
                  <label className="sp-field"><span>Work end</span><input type="time" value={ruleDraft.workingEndTime} onChange={(event) => updateRule({ workingEndTime: event.target.value })} /></label>
                  <label className="sp-field"><span>Utilized h/day</span><input type="number" min="0" step="0.5" value={ruleDraft.utilizedHours} onChange={(event) => updateRule({ utilizedHours: event.target.value })} /></label>
                  <label className="sp-field"><span>Under h/day</span><input type="number" min="0" step="0.5" value={ruleDraft.underUtilizedHours} onChange={(event) => updateRule({ underUtilizedHours: event.target.value })} /></label>
                  <label className="sp-field"><span>Not used h/day</span><input type="number" min="0" step="0.5" value={ruleDraft.notUsedHours} onChange={(event) => updateRule({ notUsedHours: event.target.value })} /></label>
                  <label className="sp-field"><span>Open count/day</span><input type="number" min="0" step="1" value={ruleDraft.openCountThreshold} onChange={(event) => updateRule({ openCountThreshold: event.target.value })} /></label>
                  <label className="sp-field"><span>License start</span><input type="date" value={ruleDraft.licenseStartDate} onChange={(event) => updateRule({ licenseStartDate: event.target.value })} /></label>
                  <label className="sp-field"><span>License end</span><input type="date" value={ruleDraft.licenseEndDate} onChange={(event) => updateRule({ licenseEndDate: event.target.value })} /></label>
                </div>
              </details>
              <details className="sp-saved">
                <summary>Saved software in this rule ({summary.total})</summary>
                <div className="sp-saved-list">
                  {policyItems.length === 0 ? <div className="sp-empty">No saved software yet.</div> : policyItems.map((item) => (
                    <div key={item.PolicyItemID} className="sp-saved-row"><span><strong>{item.SoftwareName}</strong><small>{item.Publisher || "-"} • {item.Version || "-"}</small></span><span>{item.ComplianceStatus || STATUS_LEGAL}</span><span>{item.PurchaseStatus || "Unknown"}</span><span><button className="sp-danger" type="button" onClick={() => deleteItem(item)}><Trash2 size={14} /></button></span></div>
                  ))}
                </div>
              </details>
            </div>
          </section>
        )}
      </div>
    </section>
  );
}

export default function SettingsWithNotifications() {
  const [view, setView] = useState<SettingsView>(readInitialView);
  const [managementSection, setManagementSection] = useState<ManagementSection>(readManagementSection);

  useEffect(() => {
    document.documentElement.classList.add("ema-settings-page-active");
    document.body.classList.add("ema-settings-page-active");
    return () => { document.documentElement.classList.remove("ema-settings-page-active"); document.body.classList.remove("ema-settings-page-active"); };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.dataset.settingsView = view;
    document.documentElement.dataset.settingsView = view;
    return () => { if (document.body.dataset.settingsView === view) delete document.body.dataset.settingsView; if (document.documentElement.dataset.settingsView === view) delete document.documentElement.dataset.settingsView; };
  }, [view]);

  useEffect(() => {
    const onHashChange = () => { setView(readInitialView()); setManagementSection(readManagementSection()); };
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
    if (typeof window !== "undefined") window.history.replaceState(null, "", `${window.location.pathname}${getManagementHash(next)}`);
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
        {view === "notifications" ? <NotificationChannelsSettings /> : view === "management" ? (
          <div className="management-control-wrapper settings-management-shell" data-management-section={managementSection}>
            <aside className="management-control-sidebar"><div className="management-control-sidebar-head"><span>Settings Center</span><strong>Configuration Area</strong><small>Select system setup domain</small></div><div className="management-control-nav-list">{MANAGEMENT_ITEMS.map((item) => <button key={item.key} type="button" className={`management-control-nav-btn ${managementSection === item.key ? "active" : ""}`} onClick={() => switchManagementSection(item.key)} data-section={item.key}><span className="management-control-nav-icon"><Gauge size={17} /></span><span className="management-control-nav-text"><strong>{item.title}</strong></span></button>)}</div></aside>
            <main className="management-control-content">{managementSection === "softwarePolicy" ? <SoftwarePolicyManagement /> : <div className="management-legacy-content"><LegacySettings key={`management-${managementSection}`} /></div>}</main>
          </div>
        ) : <LegacySettings />}
      </div>
    </div>
  );
}
