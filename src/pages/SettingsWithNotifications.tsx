import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Gauge, Plus, RefreshCw, Save, Search, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";

import LegacySettings from "./Settings";
import NotificationChannelsSettings from "../components/settings/NotificationChannelsSettings";
import api, { unwrapArray } from "../services/apiClient";

type SettingsView = "settings" | "management" | "notifications";
type ManagementSection = "aging" | "pricing" | "policy" | "softwarePolicy";
type Classification = "Legal" | "Illegal";

type CategoryRow = { CategoryID: number; CategoryName: string };
type PublisherRow = { Publisher: string; SoftwareCount?: number; InstalledCount?: number };
type SoftwareRow = {
  SWUNI_Idn?: number;
  SoftwareID?: string;
  SoftwareName: string;
  CategoryID?: number;
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
  OpenCountThreshold?: number;
  LicenseKey?: string;
  LicenseCount?: number;
  LicenseStartDate?: string;
  LicenseEndDate?: string;
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
  openCountThreshold: string;
};

type SoftwareForm = {
  classification: Classification;
  licenseCount: string;
  licenseKey: string;
  licenseStartDate: string;
  licenseEndDate: string;
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
  underUtilizedHours: "0.01",
  openCountThreshold: "1",
};

const EMPTY_SOFTWARE_FORM: SoftwareForm = {
  classification: "Legal",
  licenseCount: "",
  licenseKey: "",
  licenseStartDate: "",
  licenseEndDate: "",
};

const MANAGEMENT_ITEMS: Array<{ key: ManagementSection; title: string }> = [
  { key: "pricing", title: "Device Pricing" },
  { key: "aging", title: "Aging PC Rule" },
  { key: "policy", title: "Management Policy" },
  { key: "softwarePolicy", title: "Software Policy" },
];

const INLINE_CSS = `
.management-control-wrapper.settings-management-shell{height:100%;min-height:0;display:grid!important;grid-template-columns:292px minmax(0,1fr)!important;gap:12px!important;overflow:hidden!important;padding:0!important;background:transparent!important;border:0!important}.management-control-sidebar{height:100%;display:flex;flex-direction:column;overflow:hidden;border:1px solid #dbe7fb;border-radius:20px;background:#fff}.management-control-sidebar-head{padding:16px 18px;border-bottom:1px solid #e5edf8}.management-control-sidebar-head span,.sp-chip{display:block;color:#2563eb;font-size:.64rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.management-control-sidebar-head strong{display:block;margin-top:6px;color:#0f2746;font-size:1.02rem;font-weight:900}.management-control-sidebar-head small{display:block;margin-top:4px;color:#64748b;font-size:.72rem;font-weight:700}.management-control-nav-list{flex:1;display:grid;align-content:start;gap:8px;overflow:auto;padding:14px 12px}.management-control-nav-btn{width:100%;min-height:56px;display:grid;grid-template-columns:38px minmax(0,1fr);align-items:center;gap:12px;padding:10px 13px;border:0;border-radius:16px;background:transparent;color:#0f2746;text-align:left;font-weight:900}.management-control-nav-btn.active{color:#fff;background:linear-gradient(135deg,#2563eb,#087ea4)}.management-control-nav-icon{width:38px;height:38px;display:grid;place-items:center;border-radius:13px;color:#2563eb;background:#eef4ff}.management-control-nav-btn.active .management-control-nav-icon{color:#fff;background:rgba(255,255,255,.2)}.management-control-content,.management-legacy-content{min-height:0;height:100%;overflow:hidden}.management-legacy-content>.settings-module-root{height:100%!important;max-height:100%!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}.management-legacy-content .settings-layout{height:100%!important;grid-template-columns:1fr!important;padding:0!important}.management-legacy-content .settings-menu{display:none!important}.management-legacy-content .settings-content{height:100%!important;min-height:0!important}
.software-policy-module{height:100%;min-height:0;display:grid;grid-template-rows:auto minmax(0,1fr);gap:12px;color:#0f2746;overflow:hidden}.software-policy-module *{box-sizing:border-box}.sp-top,.sp-panel{border:1px solid #dbe7fb;border-radius:20px;background:#fff;box-shadow:0 14px 30px rgba(15,23,42,.045)}.sp-top{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:16px 18px}.sp-top h2,.sp-panel h3{margin:3px 0;color:#0f2746;font-weight:900;letter-spacing:-.04em}.sp-top p,.sp-help{margin:0;color:#64748b;font-size:.74rem;font-weight:700;line-height:1.45}.sp-layout{min-height:0;display:grid;grid-template-columns:300px minmax(0,1fr);gap:12px;overflow:hidden}.sp-panel{min-height:0;display:flex;flex-direction:column;overflow:hidden}.sp-panel-head{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px;border-bottom:1px solid #e5edf8}.sp-panel-body{min-height:0;overflow:auto;padding:14px 16px}.sp-rule-list{display:grid;gap:8px}.sp-rule-card{width:100%;display:grid;gap:3px;padding:12px;border:1px solid #dbe7fb;border-radius:15px;background:#f8fbff;color:#0f2746;text-align:left;cursor:pointer}.sp-rule-card.active{background:linear-gradient(135deg,#2563eb,#087ea4);color:#fff;border-color:transparent}.sp-rule-card strong,.sp-rule-card span,.sp-rule-card small{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sp-rule-card small{color:#64748b;font-size:.68rem;font-weight:750}.sp-rule-card.active small{color:rgba(255,255,255,.82)}.sp-work{min-height:0;display:grid;grid-template-rows:auto minmax(0,1fr);gap:12px;overflow:hidden}.sp-setup{display:grid;grid-template-columns:minmax(0,1.14fr) minmax(0,.86fr);gap:12px}.sp-section{border:1px solid #e5edf8;border-radius:18px;background:#fff;overflow:hidden}.sp-section-title{padding:12px 14px;border-bottom:1px solid #eef3fb}.sp-section-title strong{display:block;color:#0f2746;font-size:.84rem;font-weight:900}.sp-section-title small{display:block;margin-top:2px;color:#64748b;font-size:.68rem;font-weight:700}.sp-section-body{padding:14px}.sp-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.sp-field{display:grid;gap:6px}.sp-field.full{grid-column:1/-1}.sp-field span{color:#64748b;font-size:.62rem;font-weight:900;text-transform:uppercase}.sp-field input,.sp-field select,.sp-field textarea,.sp-search input{width:100%;min-height:40px;border:1px solid #d7e3f5;border-radius:12px;background:#fff;color:#0f2746;padding:0 12px;font-size:.78rem;font-weight:750;outline:none}.sp-field textarea{min-height:78px;padding:10px;resize:vertical}.sp-btn,.sp-icon,.sp-danger{min-height:40px;display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:12px;font-size:.76rem;font-weight:900;cursor:pointer}.sp-btn.primary{border:0;color:#fff;background:linear-gradient(135deg,#2563eb,#087ea4);padding:0 16px}.sp-btn.secondary{border:1px solid #d7e3f5;background:#fff;color:#2563eb;padding:0 16px}.sp-icon{width:40px;border:1px solid #d7e3f5;background:#fff;color:#2563eb}.sp-danger{width:40px;border:1px solid #fecaca;background:#fff1f2;color:#dc2626}.sp-btn:disabled,.sp-icon:disabled{opacity:.55;cursor:not-allowed}.sp-action-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:12px}.sp-alert{padding:10px 14px;border-radius:14px;font-size:.74rem;font-weight:850}.sp-alert.error{color:#991b1b;background:#fef2f2;border:1px solid #fecaca}.sp-alert.success{color:#166534;background:#f0fdf4;border:1px solid #bbf7d0}.sp-alert.info{color:#1d4ed8;background:#eff6ff;border:1px solid #bfdbfe}.sp-software-area{min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:12px;overflow:hidden}.sp-software-toolbar{display:grid;grid-template-columns:220px minmax(0,1fr) auto;gap:10px;align-items:end;margin-bottom:12px}.sp-search{min-height:40px;display:flex;align-items:center;gap:8px;border:1px solid #d7e3f5;border-radius:12px;padding:0 11px;background:#fff;color:#64748b}.sp-search input{min-height:0;border:0;padding:0}.sp-table{min-height:0;overflow:auto;border:1px solid #e5edf8;border-radius:16px}.sp-row{min-height:56px;display:grid;grid-template-columns:42px minmax(240px,1.3fr) minmax(145px,.7fr) 86px;gap:12px;align-items:center;padding:0 14px;border-bottom:1px solid #edf2f7;font-size:.74rem;font-weight:740}.sp-row.head{position:sticky;top:0;z-index:2;min-height:42px;background:#f3f7fc;color:#64748b;font-size:.62rem;font-weight:900;text-transform:uppercase}.sp-row.selected{background:#eff6ff}.sp-row strong,.sp-row small{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis}.sp-row strong{color:#0f2746}.sp-row small{color:#64748b;font-size:.64rem;white-space:nowrap}.sp-class-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.sp-class-btn{min-height:70px;padding:12px;border:1px solid #d7e3f5;border-radius:16px;background:#fff;color:#0f2746;text-align:left;font-weight:900}.sp-class-btn.active.legal{border-color:#bbf7d0;background:#f0fdf4;color:#166534}.sp-class-btn.active.illegal{border-color:#fecaca;background:#fef2f2;color:#991b1b}.sp-selected-box{margin:10px 0;padding:10px 12px;border:1px solid #bfdbfe;border-radius:15px;background:#eff6ff;color:#1d4ed8;font-size:.76rem;font-weight:850}.sp-saved{margin-top:12px;border-top:1px solid #e5edf8}.sp-saved-row{min-height:52px;display:grid;grid-template-columns:minmax(0,1fr) 70px 40px;gap:8px;align-items:center;border-bottom:1px solid #edf2f7}.sp-badge{display:inline-flex;justify-content:center;align-items:center;min-height:24px;border-radius:999px;padding:0 8px;font-size:.62rem;font-weight:900}.sp-badge.legal{color:#166534;background:#dcfce7}.sp-badge.illegal{color:#991b1b;background:#fee2e2}.sp-empty{min-height:150px;display:grid;place-items:center;color:#64748b;font-size:.8rem;font-weight:800;text-align:center;padding:18px}@media(max-width:1280px){.management-control-wrapper.settings-management-shell,.sp-layout,.sp-setup,.sp-software-area,.sp-software-toolbar,.sp-form-grid,.sp-class-grid{grid-template-columns:1fr!important}.sp-row{grid-template-columns:42px 1fr}.sp-row.head{display:none}}
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
  if (text.includes("software-policy") || text.includes("softwarepolicy")) return "softwarePolicy";
  if (text.includes("pricing")) return "pricing";
  if (text.includes("policy")) return "policy";
  return "aging";
}

function getManagementHash(section: ManagementSection) {
  return section === "softwarePolicy" ? "#management-control-software-policy" : `#management-control-${section}`;
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

function dateOnly(value?: string) {
  return value ? String(value).slice(0, 10) : "";
}

function getSoftwareKey(row: SoftwareRow) {
  return [row.SWUNI_Idn || row.SoftwareID || row.SoftwareName, row.Publisher || "", row.Version || ""].join("||");
}

function getPolicyClassification(item: PolicyItem): Classification {
  return String(item.Classification || item.ComplianceStatus || "Legal").toLowerCase() === "illegal" ? "Illegal" : "Legal";
}

function SoftwarePolicyManagement() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [publishers, setPublishers] = useState<PublisherRow[]>([]);
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [activePolicyId, setActivePolicyId] = useState<number | null>(null);
  const [ruleForm, setRuleForm] = useState<RuleForm>(EMPTY_RULE);
  const [softwareForm, setSoftwareForm] = useState<SoftwareForm>(EMPTY_SOFTWARE_FORM);
  const [softwareSearch, setSoftwareSearch] = useState("");
  const [softwareRows, setSoftwareRows] = useState<SoftwareRow[]>([]);
  const [policyItems, setPolicyItems] = useState<PolicyItem[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(false);
  const [softwareLoading, setSoftwareLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const activePolicy = useMemo(() => policies.find((policy) => policy.PolicyID === activePolicyId) || null, [activePolicyId, policies]);
  const selectedRows = useMemo(() => softwareRows.filter((row) => selectedKeys.has(getSoftwareKey(row))), [selectedKeys, softwareRows]);

  const loadPolicies = useCallback(async () => {
    const payload = await api.get(`${API_ROOT}/policies`, { forceRefresh: true });
    const rows = unwrapArray<PolicyRow>(payload).sort((a, b) => String(b.UpdatedAt || b.CreatedAt || "").localeCompare(String(a.UpdatedAt || a.CreatedAt || "")));
    setPolicies(rows);
    setActivePolicyId((current) => current ?? rows[0]?.PolicyID ?? null);
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
      setMessage({ type: "error", text: pickErrorMessage(error, "Failed to load software policy setup.") });
    } finally {
      setLoading(false);
    }
  }, [loadPolicies]);

  const loadPolicyItems = useCallback(async (policyId: number) => {
    const payload = await api.get(`${API_ROOT}/policies/${policyId}/items`, { forceRefresh: true });
    setPolicyItems(unwrapArray<PolicyItem>(payload));
  }, []);

  const loadPublishers = useCallback(async (categoryId: string) => {
    if (!categoryId) {
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
    if (!ruleForm.categoryId) {
      setSoftwareRows([]);
      return;
    }
    setSoftwareLoading(true);
    try {
      const query = new URLSearchParams({
        categoryId: ruleForm.categoryId,
        publisher: ruleForm.publisher,
        search: softwareSearch,
        limit: "500",
      });
      const payload = await api.get(`${API_ROOT}/software?${query.toString()}`, { forceRefresh: true });
      setSoftwareRows(unwrapArray<SoftwareRow>(payload));
    } catch (error) {
      setSoftwareRows([]);
      setMessage({ type: "error", text: pickErrorMessage(error, "Failed to load software list.") });
    } finally {
      setSoftwareLoading(false);
    }
  }, [ruleForm.categoryId, ruleForm.publisher, softwareSearch]);

  useEffect(() => { void loadBase(); }, [loadBase]);

  useEffect(() => {
    if (!activePolicy) return;
    const nextCategoryId = activePolicy.CategoryID ? String(activePolicy.CategoryID) : "";
    setRuleForm({
      policyName: activePolicy.PolicyName || "",
      description: activePolicy.Description || "",
      categoryId: nextCategoryId,
      publisher: "",
      workingStartTime: normalizeTime(activePolicy.WorkingStartTime) || "09:00",
      workingEndTime: normalizeTime(activePolicy.WorkingEndTime) || "17:00",
      utilizedHours: String(activePolicy.UtilizedHours ?? 2),
      underUtilizedHours: String(activePolicy.UnderUtilizedHours ?? 0.01),
      openCountThreshold: String(activePolicy.OpenCountThreshold ?? 1),
    });
    void loadPublishers(nextCategoryId);
    void loadPolicyItems(activePolicy.PolicyID);
    setSelectedKeys(new Set());
  }, [activePolicy, loadPolicyItems, loadPublishers]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadSoftwareRows(); }, 250);
    return () => window.clearTimeout(timer);
  }, [loadSoftwareRows]);

  const startNewRule = () => {
    setActivePolicyId(null);
    setRuleForm(EMPTY_RULE);
    setSoftwareForm(EMPTY_SOFTWARE_FORM);
    setPolicyItems([]);
    setSelectedKeys(new Set());
    setSoftwareRows([]);
    setPublishers([]);
    setMessage({ type: "info", text: "Create a rule, choose category, then select software." });
  };

  const buildRulePayload = () => ({
    PolicyName: ruleForm.policyName.trim(),
    Description: ruleForm.description,
    CategoryID: Number(ruleForm.categoryId) || null,
    CategoryName: getCategoryName(categories, ruleForm.categoryId),
    WorkingStartTime: ruleForm.workingStartTime || "09:00",
    WorkingEndTime: ruleForm.workingEndTime || "17:00",
    WorkDays: "Mon-Fri",
    UtilizedHours: Number(ruleForm.utilizedHours) || 2,
    UnderUtilizedHours: Number(ruleForm.underUtilizedHours) || 0.01,
    OpenCountThreshold: Number(ruleForm.openCountThreshold) || 1,
  });

  const saveRule = async () => {
    if (!ruleForm.policyName.trim()) {
      setMessage({ type: "error", text: "Rule name is required." });
      return null;
    }
    setSaving(true);
    try {
      const payload = buildRulePayload();
      if (activePolicy) {
        const updated = await api.put(`${API_ROOT}/policies/${activePolicy.PolicyID}`, payload);
        await loadPolicies();
        setMessage({ type: "success", text: "Software policy rule saved." });
        return activePolicy.PolicyID;
      }
      const createdPayload = await api.post(`${API_ROOT}/policies`, payload);
      const created = unwrapArray<PolicyRow>(createdPayload)[0] || (createdPayload as { data?: PolicyRow })?.data;
      await loadPolicies();
      if (created?.PolicyID) setActivePolicyId(created.PolicyID);
      setMessage({ type: "success", text: "Software policy rule created." });
      return created?.PolicyID || null;
    } catch (error) {
      setMessage({ type: "error", text: pickErrorMessage(error, "Failed to save rule.") });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    setRuleForm((current) => ({ ...current, categoryId, publisher: "" }));
    setSelectedKeys(new Set());
    void loadPublishers(categoryId);
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
    if (selectedRows.length === 0) {
      setMessage({ type: "error", text: "Select at least one software." });
      return;
    }
    const policyId = activePolicy?.PolicyID || await saveRule();
    if (!policyId) return;

    setSaving(true);
    try {
      await api.post(`${API_ROOT}/policies/${policyId}/items`, {
        items: selectedRows.map((row) => ({
          SWUNI_Idn: row.SWUNI_Idn || Number(row.SoftwareID) || null,
          SoftwareName: row.SoftwareName,
          CategoryID: row.CategoryID || Number(ruleForm.categoryId) || null,
          CategoryName: row.CategoryName || getCategoryName(categories, ruleForm.categoryId),
          Publisher: row.Publisher || ruleForm.publisher,
          Version: row.Version,
          Classification: softwareForm.classification,
          WorkingStartTime: ruleForm.workingStartTime || "09:00",
          WorkingEndTime: ruleForm.workingEndTime || "17:00",
          WorkDays: "Mon-Fri",
          UtilizedHours: Number(ruleForm.utilizedHours) || 2,
          UnderUtilizedHours: Number(ruleForm.underUtilizedHours) || 0.01,
          OpenCountThreshold: Number(ruleForm.openCountThreshold) || 1,
          LicenseCount: Number(softwareForm.licenseCount) || 0,
          LicenseKey: softwareForm.licenseKey,
          LicenseStartDate: softwareForm.licenseStartDate || null,
          LicenseEndDate: softwareForm.licenseEndDate || null,
        })),
      });
      setSelectedKeys(new Set());
      setActivePolicyId(policyId);
      await loadPolicyItems(policyId);
      await loadPolicies();
      setMessage({ type: "success", text: `${selectedRows.length} software saved into this rule.` });
    } catch (error) {
      setMessage({ type: "error", text: pickErrorMessage(error, "Failed to save selected software.") });
    } finally {
      setSaving(false);
    }
  };

  const removePolicyItem = async (item: PolicyItem) => {
    try {
      await api.delete(`${API_ROOT}/items/${item.PolicyItemID}`);
      if (activePolicy) await loadPolicyItems(activePolicy.PolicyID);
      await loadPolicies();
      setMessage({ type: "success", text: "Software removed from policy." });
    } catch (error) {
      setMessage({ type: "error", text: pickErrorMessage(error, "Failed to remove software.") });
    }
  };

  return (
    <section className="software-policy-module">
      <header className="sp-top">
        <div>
          <span className="sp-chip">Settings</span>
          <h2>Software Policy</h2>
          <p>Define legal or illegal software, working hour usage rule, and license information.</p>
        </div>
        <button className="sp-btn primary" type="button" onClick={startNewRule}><Plus size={16} /> Create New Rule</button>
      </header>

      <div className="sp-layout">
        <aside className="sp-panel">
          <div className="sp-panel-head">
            <div><h3>Rules</h3><p className="sp-help">Saved software policies</p></div>
            <button className="sp-icon" type="button" onClick={loadBase} disabled={loading}><RefreshCw size={15} /></button>
          </div>
          <div className="sp-panel-body">
            <div className="sp-rule-list">
              {policies.length === 0 ? <div className="sp-empty">No software rule yet.</div> : policies.map((policy) => (
                <button key={policy.PolicyID} type="button" className={`sp-rule-card ${policy.PolicyID === activePolicyId ? "active" : ""}`} onClick={() => setActivePolicyId(policy.PolicyID)}>
                  <strong>{policy.PolicyName}</strong>
                  <small>{policy.CategoryName || "No category"}</small>
                  <small>{policy.TotalItems || 0} software • {policy.LegalCount || 0} legal • {policy.IllegalCount || 0} illegal</small>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className="sp-work">
          {message && <div className={`sp-alert ${message.type}`}>{message.text}</div>}
          <div className="sp-setup">
            <section className="sp-section">
              <div className="sp-section-title"><strong>1. Rule setup</strong><small>Category, office hours and utilization threshold.</small></div>
              <div className="sp-section-body">
                <div className="sp-form-grid">
                  <label className="sp-field"><span>Rule name</span><input value={ruleForm.policyName} onChange={(e) => setRuleForm((c) => ({ ...c, policyName: e.target.value }))} placeholder="Example: Microsoft Office policy" /></label>
                  <label className="sp-field"><span>Category</span><select value={ruleForm.categoryId} onChange={(e) => handleCategoryChange(e.target.value)}><option value="">Select category</option>{categories.map((row) => <option key={row.CategoryID} value={row.CategoryID}>{row.CategoryName}</option>)}</select></label>
                  <label className="sp-field"><span>Work start</span><input type="time" value={ruleForm.workingStartTime} onChange={(e) => setRuleForm((c) => ({ ...c, workingStartTime: e.target.value }))} /></label>
                  <label className="sp-field"><span>Work end</span><input type="time" value={ruleForm.workingEndTime} onChange={(e) => setRuleForm((c) => ({ ...c, workingEndTime: e.target.value }))} /></label>
                  <label className="sp-field"><span>Utilized if at least hour/day</span><input type="number" min="0" step="0.25" value={ruleForm.utilizedHours} onChange={(e) => setRuleForm((c) => ({ ...c, utilizedHours: e.target.value }))} /></label>
                  <label className="sp-field"><span>Open count/day</span><input type="number" min="0" value={ruleForm.openCountThreshold} onChange={(e) => setRuleForm((c) => ({ ...c, openCountThreshold: e.target.value }))} /></label>
                  <label className="sp-field full"><span>Note</span><textarea value={ruleForm.description} onChange={(e) => setRuleForm((c) => ({ ...c, description: e.target.value }))} placeholder="Optional note" /></label>
                </div>
                <div className="sp-action-row">
                  <button className="sp-btn primary" type="button" onClick={saveRule} disabled={saving}><Save size={15} /> Save Rule</button>
                  <span className="sp-help">Monday to Friday. ≥ {ruleForm.utilizedHours || 2} hour/day = utilized, below that = underutilized, no activity = not used.</span>
                </div>
              </div>
            </section>

            <section className="sp-section">
              <div className="sp-section-title"><strong>2. Classification & license</strong><small>Apply this to selected software.</small></div>
              <div className="sp-section-body">
                <div className="sp-class-grid">
                  <button type="button" className={`sp-class-btn ${softwareForm.classification === "Legal" ? "active legal" : ""}`} onClick={() => setSoftwareForm((c) => ({ ...c, classification: "Legal" }))}><ShieldCheck size={18} /> Legal</button>
                  <button type="button" className={`sp-class-btn ${softwareForm.classification === "Illegal" ? "active illegal" : ""}`} onClick={() => setSoftwareForm((c) => ({ ...c, classification: "Illegal" }))}><ShieldAlert size={18} /> Illegal</button>
                </div>
                <div className="sp-selected-box">{selectedRows.length} software selected</div>
                <div className="sp-form-grid">
                  <label className="sp-field"><span>Total license</span><input type="number" min="0" value={softwareForm.licenseCount} onChange={(e) => setSoftwareForm((c) => ({ ...c, licenseCount: e.target.value }))} /></label>
                  <label className="sp-field"><span>License key/ref</span><input value={softwareForm.licenseKey} onChange={(e) => setSoftwareForm((c) => ({ ...c, licenseKey: e.target.value }))} /></label>
                  <label className="sp-field"><span>Start date</span><input type="date" value={softwareForm.licenseStartDate} onChange={(e) => setSoftwareForm((c) => ({ ...c, licenseStartDate: e.target.value }))} /></label>
                  <label className="sp-field"><span>End date</span><input type="date" value={softwareForm.licenseEndDate} onChange={(e) => setSoftwareForm((c) => ({ ...c, licenseEndDate: e.target.value }))} /></label>
                </div>
                <div className="sp-action-row"><button className="sp-btn primary" type="button" onClick={saveSelectedSoftware} disabled={saving || selectedRows.length === 0}><CheckCircle2 size={15} /> Save Selected Software</button></div>
              </div>
            </section>
          </div>

          <div className="sp-software-area">
            <section className="sp-section">
              <div className="sp-section-title"><strong>3. Select software</strong><small>Choose software under selected category.</small></div>
              <div className="sp-section-body" style={{ minHeight: 0, display: "flex", flexDirection: "column" }}>
                <div className="sp-software-toolbar">
                  <label className="sp-field"><span>Publisher</span><select value={ruleForm.publisher} onChange={(e) => setRuleForm((c) => ({ ...c, publisher: e.target.value }))} disabled={!ruleForm.categoryId}><option value="">All publishers</option>{publishers.map((row) => <option key={row.Publisher} value={row.Publisher}>{row.Publisher}</option>)}</select></label>
                  <label className="sp-search"><Search size={15} /><input value={softwareSearch} onChange={(e) => setSoftwareSearch(e.target.value)} placeholder="Search software..." /></label>
                  <button className="sp-btn secondary" type="button" onClick={loadSoftwareRows} disabled={softwareLoading}>Search</button>
                </div>
                <div className="sp-table">
                  <div className="sp-row head"><span></span><span>Software</span><span>Publisher</span><span>Installed</span></div>
                  {softwareLoading ? <div className="sp-empty">Loading software...</div> : softwareRows.length === 0 ? <div className="sp-empty">Select category to display software list.</div> : softwareRows.map((row) => { const key = getSoftwareKey(row); const selected = selectedKeys.has(key); return (
                    <label key={key} className={`sp-row ${selected ? "selected" : ""}`}><span><input type="checkbox" checked={selected} onChange={() => toggleSoftware(row)} /></span><span><strong>{row.SoftwareName}</strong><small>{row.Version || "No version"}</small></span><span>{row.Publisher || "Unknown"}</span><span>{row.InstalledCount ?? row.InstalledDeviceCount ?? 0}</span></label>
                  ); })}
                </div>
              </div>
            </section>

            <section className="sp-section">
              <div className="sp-section-title"><strong>Saved software</strong><small>Software already assigned to this rule.</small></div>
              <div className="sp-section-body">
                {policyItems.length === 0 ? <div className="sp-empty">No software saved yet.</div> : <div className="sp-saved">{policyItems.map((item) => { const classification = getPolicyClassification(item); return (
                  <div key={item.PolicyItemID} className="sp-saved-row"><span><strong>{item.SoftwareName}</strong><small>{item.LicenseCount || 0} license • expires {dateOnly(item.LicenseEndDate) || "-"}</small></span><span className={`sp-badge ${classification.toLowerCase()}`}>{classification}</span><button className="sp-danger" type="button" onClick={() => removePolicyItem(item)}><Trash2 size={14} /></button></div>
                ); })}</div>}
              </div>
            </section>
          </div>
        </main>
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
              {managementSection === "softwarePolicy" ? <SoftwarePolicyManagement /> : <div className="management-legacy-content"><LegacySettings key={`management-${managementSection}`} /></div>}
            </main>
          </div>
        ) : (
          <LegacySettings />
        )}
      </div>
    </div>
  );
}
