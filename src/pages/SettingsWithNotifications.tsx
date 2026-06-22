import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, FilePlus2, Gauge, RefreshCw, Save, Search, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";

import LegacySettings from "./Settings";
import NotificationChannelsSettings from "../components/settings/NotificationChannelsSettings";
import api, { unwrapArray } from "../services/apiClient";

type SettingsView = "settings" | "management" | "notifications";
type ManagementSection = "aging" | "pricing" | "policy" | "softwarePolicy";

type CategoryRow = { CategoryID: number; CategoryName: string };
type PolicyRow = {
  PolicyID: number;
  PolicyName: string;
  Description?: string;
  CategoryID?: number | null;
  CategoryName?: string;
  LegalCount?: number;
  RestrictedCount?: number;
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
  Notes?: string;
};

type DraftPolicy = { policyName: string; description: string; categoryId: string };
const EMPTY_POLICY: DraftPolicy = { policyName: "", description: "", categoryId: "" };

const MANAGEMENT_ITEMS: Array<{ key: ManagementSection; title: string; desc: string }> = [
  { key: "pricing", title: "Device Pricing", desc: "Set device pricing assumptions used for cost impact, asset replacement and risk-driven costing." },
  { key: "aging", title: "Aging PC Rule", desc: "Define how many years before a device is classified as standard, aging or replacement candidate." },
  { key: "policy", title: "Management Policy", desc: "Configure dashboard risk, exposure, saving and evidence assumptions by policy instead of hardcoded backend values." },
  { key: "softwarePolicy", title: "Software Policy", desc: "Create legal, restricted, purchased or not purchased software policies from software inventory categories." },
];

const INLINE_CSS = `
.management-control-wrapper.settings-management-shell{height:100%;min-height:0;display:grid!important;grid-template-columns:minmax(250px,292px) minmax(0,1fr)!important;gap:12px!important;overflow:hidden!important;padding:0!important;background:transparent!important;border:0!important;box-shadow:none!important}.management-control-sidebar{min-height:0;height:100%;display:flex;flex-direction:column;overflow:hidden;border:1px solid #dbe7fb;border-radius:20px;background:#fff;box-shadow:0 14px 30px rgba(15,23,42,.045)}.management-control-sidebar-head{padding:16px 18px 14px;border-bottom:1px solid #e5edf8}.management-control-sidebar-head span,.software-policy-eyebrow,.sp-card-head span,.sp-head span{display:block;color:#2563eb;font-size:.64rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.management-control-sidebar-head strong{display:block;margin-top:6px;color:#0f2746;font-size:1.02rem;font-weight:900}.management-control-sidebar-head small{display:block;margin-top:4px;color:#64748b;font-size:.72rem;font-weight:700}.management-control-nav-list{flex:1 1 auto;min-height:0;display:grid;align-content:start;gap:8px;overflow:auto;padding:14px 12px 22px}.management-control-nav-btn{width:100%;display:grid;grid-template-columns:38px minmax(0,1fr);align-items:start;gap:12px;padding:12px 13px;border:1px solid transparent;border-radius:16px;background:transparent;color:#0f2746;text-align:left;cursor:pointer}.management-control-nav-btn:hover{border-color:#dbe7fb;background:#f8fbff}.management-control-nav-btn.active{color:#fff;border-color:transparent;background:linear-gradient(135deg,#2563eb,#087ea4);box-shadow:0 14px 28px rgba(37,99,235,.18)}.management-control-nav-icon{width:38px;height:38px;display:grid;place-items:center;border-radius:13px;color:#2563eb;background:#eef4ff}.management-control-nav-btn.active .management-control-nav-icon{color:#fff;background:rgba(255,255,255,.2)}.management-control-nav-text{min-width:0}.management-control-nav-text strong,.management-control-nav-text small{display:block;white-space:normal;overflow-wrap:anywhere}.management-control-nav-text strong{font-size:.77rem;font-weight:900;line-height:1.14}.management-control-nav-text small{margin-top:3px;color:#64748b;font-size:.64rem;font-weight:700;line-height:1.25}.management-control-nav-btn.active small{color:rgba(255,255,255,.84)}.management-control-content{min-width:0;min-height:0;height:100%;overflow:hidden}.management-legacy-content{height:100%;min-height:0;overflow:hidden}.management-legacy-content>.settings-module-root{height:100%!important;max-height:100%!important;min-height:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}.management-legacy-content .settings-layout{height:100%!important;max-height:100%!important;grid-template-columns:minmax(0,1fr)!important;padding:0!important;gap:0!important;background:transparent!important}.management-legacy-content .settings-menu{display:none!important}.management-legacy-content .settings-content{height:100%!important;max-height:100%!important;min-height:0!important}.management-legacy-content .settings-hero,.management-legacy-content .content-shell{border-radius:20px!important}
.software-policy-module{width:100%;height:100%;min-height:0;display:grid;grid-template-rows:auto minmax(0,1fr);gap:12px;color:#0f2746;overflow:hidden}.software-policy-module *{box-sizing:border-box}.sp-hero,.sp-card{border:1px solid #dbe7fb;border-radius:20px;background:#fff;box-shadow:0 14px 30px rgba(15,23,42,.045)}.sp-hero{min-height:96px;display:grid;grid-template-columns:minmax(0,1fr) minmax(360px,.55fr);align-items:center;gap:14px;padding:16px 18px}.sp-hero h2,.sp-head h3{margin:.22rem 0;color:#0f2746;line-height:1.04;font-weight:900;letter-spacing:-.055em}.sp-hero p,.sp-head p{margin:0;color:#64748b;font-size:.72rem;font-weight:700;line-height:1.4}.sp-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.sp-kpi{min-width:0;min-height:62px;padding:10px 12px;border:1px solid #dbe7fb;border-radius:14px;background:#f8fbff}.sp-kpi span{display:block;color:#64748b;font-size:.56rem;font-weight:900;text-transform:uppercase}.sp-kpi strong{display:block;margin-top:4px;color:#0f2746;font-size:1.25rem;font-weight:900;line-height:1}.sp-kpi small{display:block;margin-top:3px;color:#8a9ab1;font-size:.56rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sp-grid{min-height:0;display:grid;grid-template-columns:minmax(270px,320px) minmax(0,1fr);gap:12px;overflow:hidden}.sp-sidebar,.sp-workspace{min-height:0;overflow:hidden;display:grid;gap:12px}.sp-sidebar{grid-template-rows:auto minmax(0,1fr)}.sp-workspace{grid-template-rows:auto minmax(0,1.08fr) minmax(0,.92fr)}.sp-card{min-width:0;min-height:0;overflow:hidden;display:flex;flex-direction:column}.sp-card-head,.sp-head{flex:0 0 auto;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid #e5edf8}.sp-card-head strong{display:block;margin-top:4px;color:#0f2746;font-size:.92rem;font-weight:900}.sp-field{display:grid;gap:6px;padding:0 16px 12px}.sp-field.compact{padding:0;min-width:170px}.sp-field span{color:#64748b;font-size:.62rem;font-weight:900;text-transform:uppercase}.sp-field input,.sp-field select,.sp-field textarea,.sp-search input,.sp-row select{width:100%;min-height:38px;border:1px solid #d7e3f5;border-radius:12px;background:#fff;color:#0f2746;padding:0 12px;font-size:.76rem;font-weight:750;outline:none}.sp-field textarea{min-height:72px;padding:10px 12px}.sp-primary,.sp-icon,.sp-danger,.sp-toggle button{min-height:38px;display:inline-flex;align-items:center;justify-content:center;gap:7px;border-radius:12px;font-size:.74rem;font-weight:900;cursor:pointer}.sp-primary{margin:0 16px 16px;border:0;color:#fff;background:linear-gradient(135deg,#2563eb,#087ea4)}.sp-toolbar .sp-primary{margin:0;padding:0 14px;white-space:nowrap}.sp-icon,.sp-danger{width:38px;min-width:38px;border:1px solid #d7e3f5;background:#fff;color:#2563eb}.sp-danger{border-color:#fecaca;color:#dc2626;background:#fff1f2}.sp-list{flex:1 1 auto;min-height:0;display:grid;align-content:start;gap:8px;padding:12px;overflow:auto}.sp-list-item{width:100%;display:grid;gap:3px;padding:12px;text-align:left;border:1px solid #dbe7fb;border-radius:14px;background:#f8fbff;color:#0f2746}.sp-list-item.active{color:#fff;border-color:transparent;background:linear-gradient(135deg,#2563eb,#087ea4)}.sp-list-item strong,.sp-list-item span,.sp-list-item small{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sp-list-item span,.sp-list-item small{color:#64748b;font-size:.68rem;font-weight:750}.sp-list-item.active span,.sp-list-item.active small{color:rgba(255,255,255,.82)}.sp-alert{min-height:42px;display:flex;align-items:center;padding:10px 14px;border-radius:14px;font-size:.74rem;font-weight:850}.sp-alert.error{color:#991b1b;background:#fef2f2;border:1px solid #fecaca}.sp-alert.success{color:#166534;background:#f0fdf4;border:1px solid #bbf7d0}.sp-alert.info{color:#1d4ed8;background:#eff6ff;border:1px solid #bfdbfe}.sp-toolbar{display:grid;grid-template-columns:minmax(170px,.38fr) minmax(150px,.28fr) minmax(220px,1fr) auto;align-items:end;gap:10px;padding:12px 16px;border-bottom:1px solid #e5edf8}.sp-search{min-height:38px;display:flex;align-items:center;gap:8px;border:1px solid #d7e3f5;border-radius:12px;padding:0 11px;background:#fff;color:#64748b}.sp-search input{min-height:0;border:0;padding:0}.sp-toggle{display:inline-flex;gap:8px;align-items:center}.sp-toggle button{border:1px solid #d7e3f5;background:#fff;color:#64748b;padding:0 12px}.sp-toggle button.active.legal{color:#166534;border-color:#bbf7d0;background:#f0fdf4}.sp-toggle button.active.restricted{color:#9a3412;border-color:#fed7aa;background:#fff7ed}.sp-table{flex:1 1 auto;min-height:0;overflow:auto}.sp-row{min-width:1000px;display:grid;gap:10px;align-items:center;border-bottom:1px solid #edf2f7;color:#0f2746;font-size:.72rem;font-weight:740}.sp-source .sp-row{grid-template-columns:42px minmax(220px,1.2fr) minmax(150px,.8fr) minmax(110px,.55fr) minmax(130px,.65fr) minmax(140px,.7fr) minmax(190px,1fr);min-height:52px;padding:0 14px}.sp-items .sp-row{grid-template-columns:minmax(250px,1.4fr) minmax(170px,.8fr) minmax(120px,.55fr) 150px 170px 80px;min-height:54px;padding:0 14px}.sp-row.head{position:sticky;top:0;z-index:2;min-height:44px;background:#f3f7fc;color:#64748b;font-size:.62rem;font-weight:900;text-transform:uppercase}.sp-row.selectable{cursor:pointer}.sp-row strong,.sp-row small{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis}.sp-row strong{color:#0f2746;font-size:.76rem;font-weight:900;white-space:normal}.sp-row small{color:#64748b;font-size:.62rem;font-weight:700;white-space:nowrap}.sp-empty{min-height:92px;display:grid;place-items:center;padding:18px;color:#64748b;font-size:.76rem;font-weight:800;text-align:center}.sp-empty.wide{min-height:160px}@media (max-width:1280px){.management-control-wrapper.settings-management-shell{grid-template-columns:1fr!important}.management-control-nav-list{display:flex;overflow-x:auto;overflow-y:hidden}.management-control-nav-btn{min-width:220px}.sp-hero,.sp-grid{grid-template-columns:1fr}.sp-sidebar{grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:auto}}
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
  const hash = String(window.location.hash || "").toLowerCase();
  const query = new URLSearchParams(window.location.search);
  const section = `${query.get("section") || ""} ${hash}`.toLowerCase();
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

function pickErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function sortPolicies(rows: PolicyRow[]) {
  return [...rows].sort((a, b) => String(b.UpdatedAt || b.CreatedAt || "").localeCompare(String(a.UpdatedAt || a.CreatedAt || "")));
}

function getCategoryName(categories: CategoryRow[], categoryId: string) {
  return categories.find((category) => String(category.CategoryID) === String(categoryId))?.CategoryName || "";
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
  const [complianceStatus, setComplianceStatus] = useState<"Legal" | "Restricted">("Legal");
  const [purchaseStatus, setPurchaseStatus] = useState<"Purchased" | "Not Purchased" | "Unknown">("Unknown");
  const [loading, setLoading] = useState(false);
  const [softwareLoading, setSoftwareLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const activePolicy = useMemo(() => policies.find((policy) => policy.PolicyID === activePolicyId) || null, [activePolicyId, policies]);
  const selectedRows = useMemo(() => softwareRows.filter((row) => selectedKeys.has(getSoftwareKey(row))), [selectedKeys, softwareRows]);
  const summary = useMemo(() => {
    const legal = policyItems.filter((item) => String(item.ComplianceStatus).toLowerCase() === "legal").length;
    const restricted = policyItems.filter((item) => String(item.ComplianceStatus).toLowerCase() === "restricted").length;
    const purchased = policyItems.filter((item) => String(item.PurchaseStatus).toLowerCase() === "purchased").length;
    return { legal, restricted, purchased, total: policyItems.length };
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

  const createPolicy = async () => {
    const policyName = draft.policyName.trim();
    if (!policyName) {
      setMessage({ type: "error", text: "Policy name is required." });
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
      const created = unwrapArray<PolicyRow>(payload)[0] || (payload as { data?: PolicyRow })?.data;
      setDraft(EMPTY_POLICY);
      await loadPolicies();
      if (created?.PolicyID) setActivePolicyId(created.PolicyID);
      setMessage({ type: "success", text: "Software policy created." });
    } catch (error) {
      setMessage({ type: "error", text: pickErrorMessage(error, "Failed to create software policy.") });
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
      await api.post(`/api/settings/software-policy/policies/${activePolicy.PolicyID}/items`, {
        items: selectedRows.map((row) => ({ ...row, ComplianceStatus: complianceStatus, PurchaseStatus: purchaseStatus })),
      });
      setSelectedKeys(new Set());
      await loadPolicyItems(activePolicy.PolicyID);
      await loadPolicies();
      setMessage({ type: "success", text: `${selectedRows.length} software item(s) added to policy.` });
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
        <div>
          <span className="software-policy-eyebrow">Administration Control</span>
          <h2>Software Policy</h2>
          <p>Create policy records, select category, then mark software as legal or restricted and purchased or not purchased.</p>
        </div>
        <div className="sp-kpis">
          <div className="sp-kpi"><span>Policies</span><strong>{policies.length}</strong><small>Active records</small></div>
          <div className="sp-kpi"><span>Legal</span><strong>{summary.legal}</strong><small>Selected items</small></div>
          <div className="sp-kpi"><span>Restricted</span><strong>{summary.restricted}</strong><small>Selected items</small></div>
          <div className="sp-kpi"><span>Purchased</span><strong>{summary.purchased}</strong><small>Purchase status</small></div>
        </div>
      </header>

      <div className="sp-grid">
        <aside className="sp-sidebar">
          <div className="sp-card">
            <div className="sp-card-head"><div><span>Create Policy</span><strong>New software policy</strong></div><FilePlus2 size={18} /></div>
            <label className="sp-field"><span>Policy name</span><input value={draft.policyName} onChange={(event) => setDraft((current) => ({ ...current, policyName: event.target.value }))} placeholder="Example: Approved office software" /></label>
            <label className="sp-field"><span>Main category</span><select value={draft.categoryId} onChange={(event) => setDraft((current) => ({ ...current, categoryId: event.target.value }))}><option value="">Select category</option>{categories.map((category) => <option key={category.CategoryID} value={category.CategoryID}>{category.CategoryName}</option>)}</select></label>
            <label className="sp-field"><span>Description</span><textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Short policy note" rows={3} /></label>
            <button className="sp-primary" type="button" onClick={createPolicy} disabled={saving || loading}><Save size={15} /> Create Policy</button>
          </div>

          <div className="sp-card">
            <div className="sp-card-head"><div><span>Policy Records</span><strong>{policies.length} record(s)</strong></div><button className="sp-icon" type="button" onClick={loadBase} disabled={loading}><RefreshCw size={15} /></button></div>
            <div className="sp-list">
              {policies.length === 0 ? <div className="sp-empty">No software policy yet.</div> : policies.map((policy) => (
                <button key={policy.PolicyID} type="button" className={`sp-list-item ${policy.PolicyID === activePolicyId ? "active" : ""}`} onClick={() => setActivePolicyId(policy.PolicyID)}><strong>{policy.PolicyName}</strong><span>{policy.CategoryName || "No category"}</span><small>{policy.TotalItems || 0} item(s) • {policy.LegalCount || 0} legal • {policy.RestrictedCount || 0} restricted</small></button>
              ))}
            </div>
          </div>
        </aside>

        <main className="sp-workspace">
          {message && <div className={`sp-alert ${message.type}`}>{message.text}</div>}
          <section className="sp-card">
            <div className="sp-head">
              <div><span>Identify Software</span><h3>{activePolicy ? activePolicy.PolicyName : "Select or create a software policy"}</h3><p>Select a main software category. The software list below is loaded from inventory mapping.</p></div>
              <div className="sp-toggle"><button type="button" className={complianceStatus === "Legal" ? "active legal" : ""} onClick={() => setComplianceStatus("Legal")}><ShieldCheck size={15} /> Legal</button><button type="button" className={complianceStatus === "Restricted" ? "active restricted" : ""} onClick={() => setComplianceStatus("Restricted")}><ShieldAlert size={15} /> Restricted</button></div>
            </div>
            <div className="sp-toolbar">
              <label className="sp-field compact"><span>Main category</span><select value={categoryId} onChange={(event) => updateActivePolicyCategory(event.target.value)} disabled={!activePolicy}><option value="">Select category</option>{categories.map((category) => <option key={category.CategoryID} value={category.CategoryID}>{category.CategoryName}</option>)}</select></label>
              <label className="sp-field compact"><span>Purchase status</span><select value={purchaseStatus} onChange={(event) => setPurchaseStatus(event.target.value as typeof purchaseStatus)}><option value="Unknown">Unknown</option><option value="Purchased">Purchased</option><option value="Not Purchased">Not Purchased</option></select></label>
              <label className="sp-search"><Search size={15} /><input value={softwareSearch} onChange={(event) => setSoftwareSearch(event.target.value)} placeholder="Search software or publisher..." /></label>
              <button className="sp-primary" type="button" onClick={saveSelectedSoftware} disabled={!activePolicy || selectedRows.length === 0 || saving}><CheckCircle2 size={15} /> Add Selected ({selectedRows.length})</button>
            </div>
            <div className="sp-table sp-source">
              <div className="sp-row head"><span></span><span>Software</span><span>Publisher</span><span>Version</span><span>User</span><span>Computer</span><span>Department</span></div>
              {softwareLoading ? <div className="sp-empty wide">Loading software inventory...</div> : softwareRows.length === 0 ? <div className="sp-empty wide">Select category to display mapped software list.</div> : softwareRows.map((row) => { const key = getSoftwareKey(row); return <label key={key} className="sp-row selectable"><span><input type="checkbox" checked={selectedKeys.has(key)} onChange={() => toggleSoftware(row)} /></span><span><strong>{row.SoftwareName}</strong><small>{row.CategoryName}</small></span><span>{row.Publisher || "-"}</span><span>{row.Version || "-"}</span><span>{row.Username || "-"}</span><span>{row.ComputerName || "-"}</span><span>{row.Department || "-"}</span></label>; })}
            </div>
          </section>

          <section className="sp-card">
            <div className="sp-head"><div><span>Selected Policy Items</span><h3>{summary.total} software item(s)</h3><p>Review legal or restricted status and purchase status for the selected policy.</p></div></div>
            <div className="sp-table sp-items">
              <div className="sp-row head"><span>Software</span><span>Publisher</span><span>Version</span><span>Status</span><span>Purchase</span><span>Action</span></div>
              {policyItems.length === 0 ? <div className="sp-empty wide">No software has been added to this policy.</div> : policyItems.map((item) => <div key={item.PolicyItemID} className="sp-row"><span><strong>{item.SoftwareName}</strong><small>{item.CategoryName}</small></span><span>{item.Publisher || "-"}</span><span>{item.Version || "-"}</span><span><select value={item.ComplianceStatus || "Legal"} onChange={(event) => updateItem(item, { ComplianceStatus: event.target.value })}><option value="Legal">Legal</option><option value="Restricted">Restricted</option></select></span><span><select value={item.PurchaseStatus || "Unknown"} onChange={(event) => updateItem(item, { PurchaseStatus: event.target.value })}><option value="Unknown">Unknown</option><option value="Purchased">Purchased</option><option value="Not Purchased">Not Purchased</option></select></span><span><button className="sp-danger" type="button" onClick={() => deleteItem(item)}><Trash2 size={14} /></button></span></div>)}
            </div>
          </section>
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
    if (typeof document === "undefined") return;
    document.body.dataset.settingsView = view;
    document.documentElement.dataset.settingsView = view;
    return () => {
      if (document.body.dataset.settingsView === view) delete document.body.dataset.settingsView;
      if (document.documentElement.dataset.settingsView === view) delete document.documentElement.dataset.settingsView;
    };
  }, [view]);

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
                  <button
                    key={item.key}
                    type="button"
                    className={`management-control-nav-btn ${managementSection === item.key ? "active" : ""}`}
                    onClick={() => switchManagementSection(item.key)}
                    data-section={item.key}
                  >
                    <span className="management-control-nav-icon"><Gauge size={17} /></span>
                    <span className="management-control-nav-text">
                      <strong>{item.title}</strong>
                      <small>{item.desc}</small>
                    </span>
                  </button>
                ))}
              </div>
            </aside>
            <main className="management-control-content">
              {managementSection === "softwarePolicy" ? (
                <SoftwarePolicyManagement />
              ) : (
                <div className="management-legacy-content">
                  <LegacySettings key={`management-${managementSection}`} />
                </div>
              )}
            </main>
          </div>
        ) : (
          <LegacySettings />
        )}
      </div>
    </div>
  );
}
