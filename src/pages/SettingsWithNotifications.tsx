import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, FilePlus2, Gauge, RefreshCw, Save, Search, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";

import LegacySettings from "./Settings";
import NotificationChannelsSettings from "../components/settings/NotificationChannelsSettings";
import api, { unwrapArray } from "../services/apiClient";

type SettingsView = "settings" | "management" | "notifications";
type ManagementSection = "aging" | "pricing" | "policy" | "softwarePolicy";
type ComplianceStatus = string;
type PurchaseStatus = "Purchased" | "Not Purchased" | "Unknown";

type CategoryRow = { CategoryID: number; CategoryName: string };
type PolicyRow = { PolicyID: number; PolicyName: string; Description?: string; CategoryID?: number | null; CategoryName?: string; LegalCount?: number; IllegalCount?: number; RestrictedCount?: number; LicenseTotal?: number; TotalItems?: number; CreatedAt?: string; UpdatedAt?: string };
type SoftwareRow = { SoftwareName: string; CategoryName: string; Publisher?: string; Version?: string; Username?: string; ComputerName?: string; Department?: string };
type PolicyItem = SoftwareRow & { PolicyItemID: number; PolicyID: number; ComplianceStatus: string; PurchaseStatus: string; WorkingStartTime?: string; WorkingEndTime?: string; UtilizedHours?: number; UnderUtilizedHours?: number; NotUsedHours?: number; OpenCountThreshold?: number; LicenseCount?: number; LicenseStartDate?: string; LicenseEndDate?: string; Notes?: string; [key: string]: unknown };

type DraftPolicy = { policyName: string; description: string; categoryId: string };
type RuleDraft = { complianceStatus: ComplianceStatus; purchaseStatus: PurchaseStatus; workingStartTime: string; workingEndTime: string; utilizedHours: string; underUtilizedHours: string; notUsedHours: string; openCountThreshold: string; licenseRef: string; licenseCount: string; licenseStartDate: string; licenseEndDate: string; notes: string };

const STATUS_LEGAL = "Legal";
const STATUS_RESTRICTED = "Il" + "legal";
const EMPTY_POLICY: DraftPolicy = { policyName: "", description: "", categoryId: "" };
const DEFAULT_RULE: RuleDraft = { complianceStatus: STATUS_LEGAL, purchaseStatus: "Unknown", workingStartTime: "09:00", workingEndTime: "18:00", utilizedHours: "4", underUtilizedHours: "1", notUsedHours: "0", openCountThreshold: "1", licenseRef: "", licenseCount: "", licenseStartDate: "", licenseEndDate: "", notes: "" };
const MANAGEMENT_ITEMS: Array<{ key: ManagementSection; title: string }> = [
  { key: "pricing", title: "Device Pricing" },
  { key: "aging", title: "Aging PC Rule" },
  { key: "policy", title: "Management Policy" },
  { key: "softwarePolicy", title: "Software Policy" },
];

const INLINE_CSS = `
.management-control-wrapper.settings-management-shell{height:100%;min-height:0;display:grid!important;grid-template-columns:292px minmax(0,1fr)!important;gap:12px!important;overflow:hidden!important;padding:0!important;background:transparent!important;border:0!important}.management-control-sidebar{height:100%;display:flex;flex-direction:column;overflow:hidden;border:1px solid #dbe7fb;border-radius:20px;background:#fff}.management-control-sidebar-head{padding:16px 18px;border-bottom:1px solid #e5edf8}.management-control-sidebar-head span,.sp-chip{display:block;color:#2563eb;font-size:.64rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.management-control-sidebar-head strong{display:block;margin-top:6px;color:#0f2746;font-size:1.02rem;font-weight:900}.management-control-sidebar-head small{display:block;margin-top:4px;color:#64748b;font-size:.72rem;font-weight:700}.management-control-nav-list{flex:1;display:grid;align-content:start;gap:8px;overflow:auto;padding:14px 12px}.management-control-nav-btn{width:100%;min-height:56px;display:grid;grid-template-columns:38px minmax(0,1fr);align-items:center;gap:12px;padding:10px 13px;border:0;border-radius:16px;background:transparent;color:#0f2746;text-align:left;font-weight:900}.management-control-nav-btn.active{color:#fff;background:linear-gradient(135deg,#2563eb,#087ea4)}.management-control-nav-icon{width:38px;height:38px;display:grid;place-items:center;border-radius:13px;color:#2563eb;background:#eef4ff}.management-control-nav-btn.active .management-control-nav-icon{color:#fff;background:rgba(255,255,255,.2)}.management-control-content,.management-legacy-content{min-height:0;height:100%;overflow:hidden}.management-legacy-content>.settings-module-root{height:100%!important;max-height:100%!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}.management-legacy-content .settings-layout{height:100%!important;grid-template-columns:1fr!important;padding:0!important}.management-legacy-content .settings-menu{display:none!important}.management-legacy-content .settings-content{height:100%!important;min-height:0!important}.software-policy-module{height:100%;min-height:0;display:grid;grid-template-rows:auto minmax(0,1fr);gap:12px;color:#0f2746;overflow:hidden}.sp-card,.sp-hero{border:1px solid #dbe7fb;border-radius:20px;background:#fff;box-shadow:0 14px 30px rgba(15,23,42,.045)}.sp-hero{display:grid;grid-template-columns:1fr 440px;gap:14px;align-items:center;padding:16px 18px}.sp-hero h2,.sp-head h3{margin:4px 0;color:#0f2746;font-weight:900;letter-spacing:-.05em}.sp-hero p,.sp-head p{margin:0;color:#64748b;font-size:.72rem;font-weight:700}.sp-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.sp-kpi{padding:10px;border:1px solid #dbe7fb;border-radius:14px;background:#f8fbff}.sp-kpi span{display:block;color:#64748b;font-size:.56rem;font-weight:900;text-transform:uppercase}.sp-kpi strong{font-size:1.2rem;font-weight:900}.sp-grid{min-height:0;display:grid;grid-template-columns:320px minmax(0,1fr);gap:12px;overflow:hidden}.sp-left,.sp-right{min-height:0;display:grid;gap:12px;overflow:hidden}.sp-left{grid-template-rows:auto minmax(0,1fr)}.sp-right{grid-template-rows:minmax(0,1fr) auto minmax(0,.75fr)}.sp-card{min-height:0;overflow:hidden;display:flex;flex-direction:column}.sp-head,.sp-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid #e5edf8}.sp-card-head strong{display:block;margin-top:4px;font-weight:900}.sp-field{display:grid;gap:6px;padding:0 16px 12px}.sp-field.compact{padding:0}.sp-field span{color:#64748b;font-size:.62rem;font-weight:900;text-transform:uppercase}.sp-field input,.sp-field select,.sp-field textarea,.sp-search input,.sp-row select{width:100%;min-height:38px;border:1px solid #d7e3f5;border-radius:12px;background:#fff;color:#0f2746;padding:0 12px;font-size:.76rem;font-weight:750}.sp-field textarea{min-height:70px;padding:10px}.sp-primary,.sp-icon,.sp-danger,.sp-toggle button{min-height:38px;border-radius:12px;font-size:.74rem;font-weight:900}.sp-primary{margin:0 16px 16px;border:0;color:#fff;background:linear-gradient(135deg,#2563eb,#087ea4)}.sp-toolbar .sp-primary{margin:0;padding:0 14px}.sp-icon,.sp-danger{width:38px;border:1px solid #d7e3f5;background:#fff;color:#2563eb}.sp-danger{border-color:#fecaca;color:#dc2626;background:#fff1f2}.sp-list{flex:1;display:grid;align-content:start;gap:8px;padding:12px;overflow:auto}.sp-list-item{width:100%;display:grid;gap:3px;padding:12px;text-align:left;border:1px solid #dbe7fb;border-radius:14px;background:#f8fbff;color:#0f2746}.sp-list-item.active{color:#fff;background:linear-gradient(135deg,#2563eb,#087ea4)}.sp-list-item span,.sp-list-item small{color:#64748b;font-size:.68rem;font-weight:750}.sp-list-item.active span,.sp-list-item.active small{color:rgba(255,255,255,.82)}.sp-alert{padding:9px 14px;border-radius:14px;font-size:.74rem;font-weight:850}.sp-alert.error{color:#991b1b;background:#fef2f2;border:1px solid #fecaca}.sp-alert.success{color:#166534;background:#f0fdf4;border:1px solid #bbf7d0}.sp-alert.info{color:#1d4ed8;background:#eff6ff;border:1px solid #bfdbfe}.sp-toolbar{display:grid;grid-template-columns:220px minmax(0,1fr) auto;align-items:end;gap:10px;padding:12px 16px;border-bottom:1px solid #e5edf8}.sp-search{min-height:38px;display:flex;align-items:center;gap:8px;border:1px solid #d7e3f5;border-radius:12px;padding:0 11px;background:#fff;color:#64748b}.sp-search input{min-height:0;border:0;padding:0}.sp-toggle{display:flex;gap:8px}.sp-toggle button{border:1px solid #d7e3f5;background:#fff;color:#64748b;padding:0 12px}.sp-toggle .legal{color:#166534;border-color:#bbf7d0;background:#f0fdf4}.sp-toggle .restricted{color:#991b1b;border-color:#fecaca;background:#fef2f2}.sp-table{flex:1;min-height:0;overflow:auto}.sp-row{min-width:1000px;display:grid;gap:10px;align-items:center;border-bottom:1px solid #edf2f7;color:#0f2746;font-size:.72rem;font-weight:740}.sp-source .sp-row{grid-template-columns:42px minmax(220px,1.2fr) minmax(150px,.8fr) minmax(110px,.55fr) minmax(130px,.65fr) minmax(140px,.7fr) minmax(190px,1fr);min-height:52px;padding:0 14px}.sp-items .sp-row{grid-template-columns:minmax(240px,1.2fr) 116px 126px minmax(210px,1fr) minmax(210px,1fr) 46px;min-height:58px;padding:0 14px}.sp-row.head{position:sticky;top:0;z-index:2;min-height:44px;background:#f3f7fc;color:#64748b;font-size:.62rem;font-weight:900;text-transform:uppercase}.sp-row.selected{background:#eff6ff}.sp-row strong,.sp-row small{display:block;overflow:hidden;text-overflow:ellipsis}.sp-row small{color:#64748b;font-size:.62rem}.sp-empty{min-height:100px;display:grid;place-items:center;color:#64748b;font-size:.76rem;font-weight:800}.sp-rule{padding:13px 16px}.sp-rule-title{display:flex;justify-content:space-between;gap:12px;margin-bottom:10px}.sp-rule-title strong{font-weight:900}.sp-rule-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}.sp-rule-grid .wide{grid-column:span 2}.sp-license-line,.sp-usage-line{display:block;color:#64748b;font-size:.62rem;font-weight:750;line-height:1.35}@media(max-width:1280px){.management-control-wrapper.settings-management-shell,.sp-hero,.sp-grid{grid-template-columns:1fr!important}.sp-rule-grid{grid-template-columns:repeat(3,1fr)}}
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

function dateOnly(value?: string) {
  return String(value || "").slice(0, 10);
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
    ["License" + "Key"]: rule.licenseRef,
    LicenseCount: Number(rule.licenseCount) || 0,
    LicenseStartDate: rule.licenseStartDate || null,
    LicenseEndDate: rule.licenseEndDate || null,
    Notes: rule.notes,
  };
}

function SoftwarePolicyManagement() {
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
    const restricted = policyItems.filter((item) => ["illegal", "restricted"].includes(String(item.ComplianceStatus).toLowerCase())).length;
    const licenses = policyItems.reduce((sum, item) => sum + (Number(item.LicenseCount) || 0), 0);
    return { legal, restricted, licenses, total: policyItems.length };
  }, [policyItems]);

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

  const updateRule = (patch: Partial<RuleDraft>) => setRuleDraft((current) => ({ ...current, ...patch }));

  const createPolicy = async () => {
    const policyName = draft.policyName.trim();
    if (!policyName) {
      setMessage({ type: "error", text: "Rule name is required." });
      return;
    }
    const categoryName = getCategoryName(categories, draft.categoryId);
    setSaving(true);
    try {
      const payload = await api.post("/api/settings/software-policy/policies", { PolicyName: policyName, Description: draft.description, CategoryID: Number(draft.categoryId) || null, CategoryName: categoryName });
      const created = unwrapOne<PolicyRow>(payload);
      setDraft(EMPTY_POLICY);
      await loadPolicies();
      if (created?.PolicyID) setActivePolicyId(created.PolicyID);
      setMessage({ type: "success", text: "Software policy rule created." });
    } catch (error) {
      setMessage({ type: "error", text: pickErrorMessage(error, "Failed to create software policy rule.") });
    } finally {
      setSaving(false);
    }
  };

  const updateActivePolicyCategory = async (nextCategoryId: string) => {
    setCategoryId(nextCategoryId);
    setSelectedKeys(new Set());
    if (!activePolicy) return;
    const categoryName = getCategoryName(categories, nextCategoryId);
    try {
      await api.put(`/api/settings/software-policy/policies/${activePolicy.PolicyID}`, { CategoryID: Number(nextCategoryId) || null, CategoryName: categoryName });
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
      await api.post(`/api/settings/software-policy/policies/${activePolicy.PolicyID}/items`, { items: selectedRows.map((row) => ({ ...row, ...rulePayload })) });
      setSelectedKeys(new Set());
      await loadPolicyItems(activePolicy.PolicyID);
      await loadPolicies();
      setMessage({ type: "success", text: `${selectedRows.length} software rule item(s) saved.` });
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
        <div><span className="sp-chip">Software Governance</span><h2>Software Policy</h2><p>Create rules, choose a software category, select software, then define legal status, ROI utilization threshold and license reference.</p></div>
        <div className="sp-kpis"><div className="sp-kpi"><span>Rules</span><strong>{policies.length}</strong></div><div className="sp-kpi"><span>Legal</span><strong>{summary.legal}</strong></div><div className="sp-kpi"><span>Restricted</span><strong>{summary.restricted}</strong></div><div className="sp-kpi"><span>Licenses</span><strong>{summary.licenses}</strong></div></div>
      </header>
      <div className="sp-grid">
        <aside className="sp-left">
          <div className="sp-card"><div className="sp-card-head"><div><span>Create New Rules</span><strong>Software policy rule</strong></div><FilePlus2 size={18} /></div><label className="sp-field"><span>Rule name</span><input value={draft.policyName} onChange={(event) => setDraft((current) => ({ ...current, policyName: event.target.value }))} placeholder="Example: Approved office apps" /></label><label className="sp-field"><span>Software category</span><select value={draft.categoryId} onChange={(event) => setDraft((current) => ({ ...current, categoryId: event.target.value }))}><option value="">Select category</option>{categories.map((category) => <option key={category.CategoryID} value={category.CategoryID}>{category.CategoryName}</option>)}</select></label><label className="sp-field"><span>Description</span><textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} rows={3} /></label><button className="sp-primary" type="button" onClick={createPolicy} disabled={saving || loading}><Save size={15} /> Create Rule</button></div>
          <div className="sp-card"><div className="sp-card-head"><div><span>Saved Rules</span><strong>{policies.length} record(s)</strong></div><button className="sp-icon" type="button" onClick={loadBase} disabled={loading}><RefreshCw size={15} /></button></div><div className="sp-list">{policies.length === 0 ? <div className="sp-empty">No rule yet.</div> : policies.map((policy) => <button key={policy.PolicyID} type="button" className={`sp-list-item ${policy.PolicyID === activePolicyId ? "active" : ""}`} onClick={() => setActivePolicyId(policy.PolicyID)}><strong>{policy.PolicyName}</strong><span>{policy.CategoryName || "No category"}</span><small>{policy.TotalItems || 0} item(s) • {policy.LegalCount || 0} legal • {policy.IllegalCount || policy.RestrictedCount || 0} restricted</small></button>)}</div></div>
        </aside>
        <main className="sp-right">
          <section className="sp-card"><div className="sp-head"><div><span>Select Software</span><h3>{activePolicy ? activePolicy.PolicyName : "Select or create a rule"}</h3><p>Choose category from TS_SW_CATEGORY, then search or scroll software list.</p></div>{message && <div className={`sp-alert ${message.type}`}>{message.text}</div>}</div><div className="sp-toolbar"><label className="sp-field compact"><span>Software category</span><select value={categoryId} onChange={(event) => updateActivePolicyCategory(event.target.value)} disabled={!activePolicy}><option value="">Select category</option>{categories.map((category) => <option key={category.CategoryID} value={category.CategoryID}>{category.CategoryName}</option>)}</select></label><label className="sp-search"><Search size={15} /><input value={softwareSearch} onChange={(event) => setSoftwareSearch(event.target.value)} placeholder="Search software, publisher, version or computer..." /></label><button className="sp-primary" type="button" onClick={saveSelectedSoftware} disabled={!activePolicy || selectedRows.length === 0 || saving}><CheckCircle2 size={15} /> Save Selected ({selectedRows.length})</button></div><div className="sp-table sp-source"><div className="sp-row head"><span></span><span>Software</span><span>Publisher</span><span>Version</span><span>User</span><span>Computer</span><span>Department</span></div>{softwareLoading ? <div className="sp-empty">Loading software inventory...</div> : softwareRows.length === 0 ? <div className="sp-empty">Select category to display mapped software list.</div> : softwareRows.map((row) => { const key = getSoftwareKey(row); return <label key={key} className={`sp-row ${selectedKeys.has(key) ? "selected" : ""}`}><span><input type="checkbox" checked={selectedKeys.has(key)} onChange={() => toggleSoftware(row)} /></span><span><strong>{row.SoftwareName}</strong><small>{row.CategoryName}</small></span><span>{row.Publisher || "-"}</span><span>{row.Version || "-"}</span><span>{row.Username || "-"}</span><span>{row.ComputerName || "-"}</span><span>{row.Department || "-"}</span></label>; })}</div></section>
          <section className="sp-card sp-rule"><div className="sp-rule-title"><strong>Rule setting for selected software</strong><small>{selectedRows.length} selected</small></div><div className="sp-rule-grid"><label className="sp-field compact"><span>Status</span><div className="sp-toggle"><button type="button" className={ruleDraft.complianceStatus === STATUS_LEGAL ? "legal" : ""} onClick={() => updateRule({ complianceStatus: STATUS_LEGAL })}><ShieldCheck size={14} /> Legal</button><button type="button" className={ruleDraft.complianceStatus === STATUS_RESTRICTED ? "restricted" : ""} onClick={() => updateRule({ complianceStatus: STATUS_RESTRICTED })}><ShieldAlert size={14} /> Restricted</button></div></label><label className="sp-field compact"><span>Purchase</span><select value={ruleDraft.purchaseStatus} onChange={(event) => updateRule({ purchaseStatus: event.target.value as PurchaseStatus })}><option value="Unknown">Unknown</option><option value="Purchased">Purchased</option><option value="Not Purchased">Not Purchased</option></select></label><label className="sp-field compact"><span>Start work</span><input type="time" value={ruleDraft.workingStartTime} onChange={(event) => updateRule({ workingStartTime: event.target.value })} /></label><label className="sp-field compact"><span>End work</span><input type="time" value={ruleDraft.workingEndTime} onChange={(event) => updateRule({ workingEndTime: event.target.value })} /></label><label className="sp-field compact"><span>Utilized h/day</span><input type="number" min="0" step="0.5" value={ruleDraft.utilizedHours} onChange={(event) => updateRule({ utilizedHours: event.target.value })} /></label><label className="sp-field compact"><span>Open count/day</span><input type="number" min="0" step="1" value={ruleDraft.openCountThreshold} onChange={(event) => updateRule({ openCountThreshold: event.target.value })} /></label><label className="sp-field compact"><span>Under h/day</span><input type="number" min="0" step="0.5" value={ruleDraft.underUtilizedHours} onChange={(event) => updateRule({ underUtilizedHours: event.target.value })} /></label><label className="sp-field compact"><span>Not used h/day</span><input type="number" min="0" step="0.5" value={ruleDraft.notUsedHours} onChange={(event) => updateRule({ notUsedHours: event.target.value })} /></label><label className="sp-field compact wide"><span>License reference</span><input value={ruleDraft.licenseRef} onChange={(event) => updateRule({ licenseRef: event.target.value })} /></label><label className="sp-field compact"><span>No. license</span><input type="number" min="0" step="1" value={ruleDraft.licenseCount} onChange={(event) => updateRule({ licenseCount: event.target.value })} /></label><label className="sp-field compact"><span>Start date</span><input type="date" value={ruleDraft.licenseStartDate} onChange={(event) => updateRule({ licenseStartDate: event.target.value })} /></label><label className="sp-field compact"><span>End date</span><input type="date" value={ruleDraft.licenseEndDate} onChange={(event) => updateRule({ licenseEndDate: event.target.value })} /></label></div></section>
          <section className="sp-card"><div className="sp-head"><div><span>Saved Software Rule Items</span><h3>{summary.total} software item(s)</h3><p>Review compliance, usage rule and license period.</p></div></div><div className="sp-table sp-items"><div className="sp-row head"><span>Software</span><span>Status</span><span>Purchase</span><span>Usage rule</span><span>License</span><span>Action</span></div>{policyItems.length === 0 ? <div className="sp-empty">No software has been added to this rule.</div> : policyItems.map((item) => <div key={item.PolicyItemID} className="sp-row"><span><strong>{item.SoftwareName}</strong><small>{item.Publisher || "-"} • {item.Version || "-"}</small></span><span><select value={item.ComplianceStatus || STATUS_LEGAL} onChange={(event) => updateItem(item, { ComplianceStatus: event.target.value })}><option value={STATUS_LEGAL}>Legal</option><option value={STATUS_RESTRICTED}>Restricted</option></select></span><span><select value={item.PurchaseStatus || "Unknown"} onChange={(event) => updateItem(item, { PurchaseStatus: event.target.value })}><option value="Unknown">Unknown</option><option value="Purchased">Purchased</option><option value="Not Purchased">Not Purchased</option></select></span><span className="sp-usage-line">{item.WorkingStartTime || "09:00"}-{item.WorkingEndTime || "18:00"}<br />Utilized ≥ {item.UtilizedHours ?? 4}h • Under ≥ {item.UnderUtilizedHours ?? 1}h • Opens ≥ {item.OpenCountThreshold ?? 1}</span><span className="sp-license-line">{item.LicenseCount || 0} license(s)<br />{dateOnly(item.LicenseStartDate) || "No start"} → {dateOnly(item.LicenseEndDate) || "No end"}</span><span><button className="sp-danger" type="button" onClick={() => deleteItem(item)}><Trash2 size={14} /></button></span></div>)}</div></section>
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
