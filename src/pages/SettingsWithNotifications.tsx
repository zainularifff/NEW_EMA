import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, FilePlus2, RefreshCw, Save, Search, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";

import LegacySettings from "./Settings";
import NotificationChannelsSettings from "../components/settings/NotificationChannelsSettings";
import api, { unwrapArray, unwrapData } from "../services/apiClient";

type SettingsView = "settings" | "management" | "notifications";
type ManagementSection = "aging" | "pricing" | "policy";

type CategoryRow = { CategoryID: number; CategoryName: string };
type PolicyRow = {
  PolicyID: number;
  PolicyName: string;
  Description?: string;
  CategoryID?: number | null;
  CategoryName?: string;
  IsActive?: boolean;
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

const SOFTWARE_POLICY_INLINE_CSS = `.software-policy-module{width:100%;height:100%;min-height:0;display:grid;grid-template-rows:auto minmax(0,1fr);gap:12px;color:#0f2746;overflow:hidden}.software-policy-module *{box-sizing:border-box}.software-policy-hero,.software-policy-card{border:1px solid #dbe7fb;border-radius:20px;background:linear-gradient(180deg,#fff,#fbfdff);box-shadow:0 14px 30px rgba(15,23,42,.045)}.software-policy-hero{min-height:96px;display:grid;grid-template-columns:minmax(0,1fr) minmax(420px,.62fr);align-items:center;gap:16px;padding:16px 18px}.software-policy-eyebrow,.software-policy-card-head span,.software-policy-section-head span{display:block;color:#2563eb;font-size:.64rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.software-policy-hero h2,.software-policy-section-head h3{margin:.24rem 0 .18rem;color:#0f2746;line-height:1.04;font-weight:900;letter-spacing:-.055em}.software-policy-hero h2{font-size:clamp(1.55rem,2vw,2.1rem)}.software-policy-section-head h3{font-size:1.25rem}.software-policy-hero p,.software-policy-section-head p{margin:0;color:#64748b;font-size:.72rem;font-weight:700;line-height:1.4}.software-policy-kpi-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.software-policy-kpi{min-width:0;min-height:62px;padding:10px 12px;border:1px solid #dbe7fb;border-radius:14px;background:radial-gradient(circle at 100% 0%,rgba(37,99,235,.075),transparent 6rem),#f8fbff}.software-policy-kpi span{display:block;color:#64748b;font-size:.56rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap}.software-policy-kpi strong{display:block;margin-top:4px;color:#0f2746;font-size:1.25rem;font-weight:900;line-height:1}.software-policy-kpi small{display:block;margin-top:3px;color:#8a9ab1;font-size:.56rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.software-policy-grid{min-height:0;display:grid;grid-template-columns:minmax(270px,320px) minmax(0,1fr);gap:12px;overflow:hidden}.software-policy-sidebar,.software-policy-workspace{min-height:0;overflow:hidden;display:grid;gap:12px}.software-policy-sidebar{grid-template-rows:auto minmax(0,1fr)}.software-policy-workspace{grid-template-rows:auto minmax(0,1.08fr) minmax(0,.92fr)}.software-policy-card{min-width:0;min-height:0;overflow:hidden}.software-policy-create-card,.software-policy-list-card,.software-policy-picker-card,.software-policy-items-card{display:flex;flex-direction:column}.software-policy-card-head,.software-policy-section-head{flex:0 0 auto;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid #e5edf8}.software-policy-card-head strong{display:block;margin-top:4px;color:#0f2746;font-size:.92rem;font-weight:900;line-height:1.1}.software-policy-field{display:grid;gap:6px;padding:0 16px 12px}.software-policy-field.compact{padding:0;min-width:170px}.software-policy-field span{color:#64748b;font-size:.62rem;font-weight:900;letter-spacing:.06em;text-transform:uppercase}.software-policy-field input,.software-policy-field select,.software-policy-field textarea,.software-policy-search input,.software-policy-row select{width:100%;min-height:38px;border:1px solid #d7e3f5;border-radius:12px;background:#fff;color:#0f2746;padding:0 12px;font-size:.76rem;font-weight:750;outline:none}.software-policy-field textarea{min-height:72px;padding:10px 12px;resize:vertical}.software-policy-primary-btn,.software-policy-icon-btn,.software-policy-danger-btn,.software-policy-status-toggle button{min-height:38px;display:inline-flex;align-items:center;justify-content:center;gap:7px;border-radius:12px;font-size:.74rem;font-weight:900;cursor:pointer}.software-policy-primary-btn{margin:0 16px 16px;border:0;color:#fff;background:linear-gradient(135deg,#2563eb,#087ea4);box-shadow:0 12px 24px rgba(37,99,235,.16)}.software-policy-toolbar .software-policy-primary-btn{margin:0;padding:0 14px;white-space:nowrap}.software-policy-icon-btn,.software-policy-danger-btn{width:38px;min-width:38px;border:1px solid #d7e3f5;background:#fff;color:#2563eb}.software-policy-danger-btn{border-color:#fecaca;color:#dc2626;background:#fff1f2}.software-policy-primary-btn:disabled,.software-policy-icon-btn:disabled{opacity:.55;cursor:not-allowed}.software-policy-list{flex:1 1 auto;min-height:0;display:grid;align-content:start;gap:8px;padding:12px;overflow:auto}.software-policy-list-item{width:100%;display:grid;gap:3px;padding:12px;text-align:left;border:1px solid #dbe7fb;border-radius:14px;background:#f8fbff;color:#0f2746}.software-policy-list-item.active{color:#fff;border-color:transparent;background:linear-gradient(135deg,#2563eb,#087ea4);box-shadow:0 12px 24px rgba(37,99,235,.16)}.software-policy-list-item strong,.software-policy-list-item span,.software-policy-list-item small{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.software-policy-list-item strong{font-size:.8rem;font-weight:900}.software-policy-list-item span,.software-policy-list-item small{color:#64748b;font-size:.68rem;font-weight:750}.software-policy-list-item.active span,.software-policy-list-item.active small{color:rgba(255,255,255,.82)}.software-policy-alert{min-height:42px;display:flex;align-items:center;padding:10px 14px;border-radius:14px;font-size:.74rem;font-weight:850}.software-policy-alert.error{color:#991b1b;background:#fef2f2;border:1px solid #fecaca}.software-policy-alert.success{color:#166534;background:#f0fdf4;border:1px solid #bbf7d0}.software-policy-alert.info{color:#1d4ed8;background:#eff6ff;border:1px solid #bfdbfe}.software-policy-toolbar{flex:0 0 auto;display:grid;grid-template-columns:minmax(170px,.38fr) minmax(150px,.28fr) minmax(220px,1fr) auto;align-items:end;gap:10px;padding:12px 16px;border-bottom:1px solid #e5edf8}.software-policy-search{min-height:38px;display:flex;align-items:center;gap:8px;border:1px solid #d7e3f5;border-radius:12px;padding:0 11px;background:#fff;color:#64748b}.software-policy-search input{min-height:0;border:0;padding:0}.software-policy-status-toggle{display:inline-flex;gap:8px;align-items:center}.software-policy-status-toggle button{border:1px solid #d7e3f5;background:#fff;color:#64748b;padding:0 12px}.software-policy-status-toggle button.active.legal{color:#166534;border-color:#bbf7d0;background:#f0fdf4}.software-policy-status-toggle button.active.restricted{color:#9a3412;border-color:#fed7aa;background:#fff7ed}.software-policy-table{flex:1 1 auto;min-height:0;overflow:auto}.software-policy-row{min-width:1000px;display:grid;gap:10px;align-items:center;border-bottom:1px solid #edf2f7;color:#0f2746;font-size:.72rem;font-weight:740}.software-source-table .software-policy-row{grid-template-columns:42px minmax(220px,1.2fr) minmax(150px,.8fr) minmax(110px,.55fr) minmax(130px,.65fr) minmax(140px,.7fr) minmax(190px,1fr);min-height:52px;padding:0 14px}.policy-items-table .software-policy-row{grid-template-columns:minmax(250px,1.4fr) minmax(170px,.8fr) minmax(120px,.55fr) 150px 170px 80px;min-height:54px;padding:0 14px}.software-policy-row.head,.software-policy-row.policy-head{position:sticky;top:0;z-index:2;min-height:44px;background:#f3f7fc;color:#64748b;font-size:.62rem;font-weight:900;letter-spacing:.06em;text-transform:uppercase}.software-policy-row.selectable{cursor:pointer}.software-policy-row.selectable:hover,.software-policy-row.policy-item-row:hover{background:#f8fbff}.software-policy-row strong,.software-policy-row small{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis}.software-policy-row strong{color:#0f2746;font-size:.76rem;font-weight:900;white-space:normal}.software-policy-row small{color:#64748b;font-size:.62rem;font-weight:700;white-space:nowrap}.software-policy-empty{min-height:92px;display:grid;place-items:center;padding:18px;color:#64748b;font-size:.76rem;font-weight:800;text-align:center}.software-policy-empty.wide{min-height:160px}@media (max-width:1280px){.software-policy-hero,.software-policy-grid{grid-template-columns:1fr}.software-policy-sidebar{grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:auto}}`;

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
  if (section.includes("pricing")) return "pricing";
  if (section.includes("policy")) return "policy";
  return "aging";
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
    const category = categories.find((row) => String(row.CategoryID) === categoryId);
    if (!category) {
      setSoftwareRows([]);
      setSelectedKeys(new Set());
      return;
    }

    setSoftwareLoading(true);
    try {
      const payload = await api.get("/api/settings/software-policy/software", {
        params: { categoryName: category.CategoryName, search: softwareSearch, limit: 500 },
        forceRefresh: true,
      });
      setSoftwareRows(unwrapArray<SoftwareRow>(payload));
      setSelectedKeys(new Set());
    } catch (error) {
      setMessage({ type: "error", text: pickErrorMessage(error, "Failed to load mapped software list.") });
    } finally {
      setSoftwareLoading(false);
    }
  }, [categories, categoryId, softwareSearch]);

  useEffect(() => { loadBase(); }, [loadBase]);

  useEffect(() => {
    if (!activePolicyId) {
      setPolicyItems([]);
      return;
    }
    loadPolicyItems(activePolicyId).catch((error) => setMessage({ type: "error", text: pickErrorMessage(error, "Failed to load policy items.") }));
  }, [activePolicyId, loadPolicyItems]);

  useEffect(() => {
    if (activePolicy?.CategoryID) {
      setCategoryId(String(activePolicy.CategoryID));
    } else if (activePolicy?.CategoryName) {
      const matched = categories.find((row) => row.CategoryName === activePolicy.CategoryName);
      setCategoryId(matched ? String(matched.CategoryID) : "");
    }
  }, [activePolicy, categories]);

  useEffect(() => {
    const timer = window.setTimeout(loadSoftwareRows, 250);
    return () => window.clearTimeout(timer);
  }, [loadSoftwareRows]);

  const createPolicy = async () => {
    const category = categories.find((row) => String(row.CategoryID) === draft.categoryId);
    if (!draft.policyName.trim()) return setMessage({ type: "error", text: "Enter policy name first." });
    if (!category) return setMessage({ type: "error", text: "Select software category first." });
    setSaving(true);
    try {
      const created = unwrapData<PolicyRow>(await api.post("/api/settings/software-policy/policies", {
        PolicyName: draft.policyName.trim(),
        Description: draft.description.trim(),
        CategoryID: category.CategoryID,
        CategoryName: category.CategoryName,
        IsActive: true,
      }));
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
    if (!activePolicy) return;
    const category = categories.find((row) => String(row.CategoryID) === nextCategoryId);
    if (!category) return;
    try {
      await api.put(`/api/settings/software-policy/policies/${activePolicy.PolicyID}`, { CategoryID: category.CategoryID, CategoryName: category.CategoryName });
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
    if (!activePolicy) return setMessage({ type: "error", text: "Create or select a policy first." });
    if (selectedRows.length === 0) return setMessage({ type: "error", text: "Select at least one software record." });
    setSaving(true);
    try {
      await api.post(`/api/settings/software-policy/policies/${activePolicy.PolicyID}/items`, {
        items: selectedRows.map((row) => ({ ...row, ComplianceStatus: complianceStatus, PurchaseStatus: purchaseStatus })),
      });
      setSelectedKeys(new Set());
      await Promise.all([loadPolicyItems(activePolicy.PolicyID), loadPolicies()]);
      setMessage({ type: "success", text: `${selectedRows.length} software item(s) added to policy.` });
    } catch (error) {
      setMessage({ type: "error", text: pickErrorMessage(error, "Failed to save software selection.") });
    } finally {
      setSaving(false);
    }
  };

  const updateItem = async (item: PolicyItem, patch: Partial<PolicyItem>) => {
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
      <style>{SOFTWARE_POLICY_INLINE_CSS}</style>
      <header className="software-policy-hero">
        <div>
          <span className="software-policy-eyebrow">Administration Control</span>
          <h2>Software Policy</h2>
          <p>Create policy records, select category, then mark software as legal or restricted and purchased or not purchased.</p>
        </div>
        <div className="software-policy-kpi-strip">
          <div className="software-policy-kpi"><span>Policies</span><strong>{policies.length}</strong><small>Active records</small></div>
          <div className="software-policy-kpi"><span>Legal</span><strong>{summary.legal}</strong><small>Selected items</small></div>
          <div className="software-policy-kpi"><span>Restricted</span><strong>{summary.restricted}</strong><small>Selected items</small></div>
          <div className="software-policy-kpi"><span>Purchased</span><strong>{summary.purchased}</strong><small>Purchase status</small></div>
        </div>
      </header>

      <div className="software-policy-grid">
        <aside className="software-policy-sidebar">
          <div className="software-policy-card software-policy-create-card">
            <div className="software-policy-card-head"><div><span>Create Policy</span><strong>New software policy</strong></div><FilePlus2 size={18} /></div>
            <label className="software-policy-field"><span>Policy name</span><input value={draft.policyName} onChange={(event) => setDraft((current) => ({ ...current, policyName: event.target.value }))} placeholder="Example: Approved office software" /></label>
            <label className="software-policy-field"><span>Main category</span><select value={draft.categoryId} onChange={(event) => setDraft((current) => ({ ...current, categoryId: event.target.value }))}><option value="">Select category</option>{categories.map((category) => <option key={category.CategoryID} value={category.CategoryID}>{category.CategoryName}</option>)}</select></label>
            <label className="software-policy-field"><span>Description</span><textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Short policy note" rows={3} /></label>
            <button className="software-policy-primary-btn" type="button" onClick={createPolicy} disabled={saving || loading}><Save size={15} /> Create Policy</button>
          </div>

          <div className="software-policy-card software-policy-list-card">
            <div className="software-policy-card-head"><div><span>Policy Records</span><strong>{policies.length} record(s)</strong></div><button className="software-policy-icon-btn" type="button" onClick={loadBase} disabled={loading}><RefreshCw size={15} /></button></div>
            <div className="software-policy-list">
              {policies.length === 0 ? <div className="software-policy-empty">No software policy yet.</div> : policies.map((policy) => (
                <button key={policy.PolicyID} type="button" className={`software-policy-list-item ${policy.PolicyID === activePolicyId ? "active" : ""}`} onClick={() => setActivePolicyId(policy.PolicyID)}><strong>{policy.PolicyName}</strong><span>{policy.CategoryName || "No category"}</span><small>{policy.TotalItems || 0} item(s) • {policy.LegalCount || 0} legal • {policy.RestrictedCount || 0} restricted</small></button>
              ))}
            </div>
          </div>
        </aside>

        <main className="software-policy-workspace">
          {message && <div className={`software-policy-alert ${message.type}`}>{message.text}</div>}
          <section className="software-policy-card software-policy-picker-card">
            <div className="software-policy-section-head">
              <div><span>Identify Software</span><h3>{activePolicy ? activePolicy.PolicyName : "Select or create a software policy"}</h3><p>Select a main software category. The software list below is loaded from inventory mapping.</p></div>
              <div className="software-policy-status-toggle"><button type="button" className={complianceStatus === "Legal" ? "active legal" : ""} onClick={() => setComplianceStatus("Legal")}><ShieldCheck size={15} /> Legal</button><button type="button" className={complianceStatus === "Restricted" ? "active restricted" : ""} onClick={() => setComplianceStatus("Restricted")}><ShieldAlert size={15} /> Restricted</button></div>
            </div>
            <div className="software-policy-toolbar">
              <label className="software-policy-field compact"><span>Main category</span><select value={categoryId} onChange={(event) => updateActivePolicyCategory(event.target.value)} disabled={!activePolicy}><option value="">Select category</option>{categories.map((category) => <option key={category.CategoryID} value={category.CategoryID}>{category.CategoryName}</option>)}</select></label>
              <label className="software-policy-field compact"><span>Purchase status</span><select value={purchaseStatus} onChange={(event) => setPurchaseStatus(event.target.value as typeof purchaseStatus)}><option value="Unknown">Unknown</option><option value="Purchased">Purchased</option><option value="Not Purchased">Not Purchased</option></select></label>
              <label className="software-policy-search"><Search size={15} /><input value={softwareSearch} onChange={(event) => setSoftwareSearch(event.target.value)} placeholder="Search software or publisher..." /></label>
              <button className="software-policy-primary-btn" type="button" onClick={saveSelectedSoftware} disabled={!activePolicy || selectedRows.length === 0 || saving}><CheckCircle2 size={15} /> Add Selected ({selectedRows.length})</button>
            </div>
            <div className="software-policy-table software-source-table">
              <div className="software-policy-row head"><span></span><span>Software</span><span>Publisher</span><span>Version</span><span>User</span><span>Computer</span><span>Department</span></div>
              {softwareLoading ? <div className="software-policy-empty wide">Loading software inventory...</div> : softwareRows.length === 0 ? <div className="software-policy-empty wide">Select category to display mapped software list.</div> : softwareRows.map((row) => { const key = getSoftwareKey(row); return <label key={key} className="software-policy-row selectable"><span><input type="checkbox" checked={selectedKeys.has(key)} onChange={() => toggleSoftware(row)} /></span><span><strong>{row.SoftwareName}</strong><small>{row.CategoryName}</small></span><span>{row.Publisher || "-"}</span><span>{row.Version || "-"}</span><span>{row.Username || "-"}</span><span>{row.ComputerName || "-"}</span><span>{row.Department || "-"}</span></label>; })}
            </div>
          </section>

          <section className="software-policy-card software-policy-items-card">
            <div className="software-policy-section-head compact-head"><div><span>Selected Policy Items</span><h3>{summary.total} software item(s)</h3><p>Review legal or restricted status and purchase status for the selected policy.</p></div></div>
            <div className="software-policy-table policy-items-table">
              <div className="software-policy-row policy-head"><span>Software</span><span>Publisher</span><span>Version</span><span>Status</span><span>Purchase</span><span>Action</span></div>
              {policyItems.length === 0 ? <div className="software-policy-empty wide">No software has been added to this policy.</div> : policyItems.map((item) => <div key={item.PolicyItemID} className="software-policy-row policy-item-row"><span><strong>{item.SoftwareName}</strong><small>{item.CategoryName}</small></span><span>{item.Publisher || "-"}</span><span>{item.Version || "-"}</span><span><select value={item.ComplianceStatus || "Legal"} onChange={(event) => updateItem(item, { ComplianceStatus: event.target.value })}><option value="Legal">Legal</option><option value="Restricted">Restricted</option></select></span><span><select value={item.PurchaseStatus || "Unknown"} onChange={(event) => updateItem(item, { PurchaseStatus: event.target.value })}><option value="Unknown">Unknown</option><option value="Purchased">Purchased</option><option value="Not Purchased">Not Purchased</option></select></span><span><button className="software-policy-danger-btn" type="button" onClick={() => deleteItem(item)}><Trash2 size={14} /></button></span></div>)}
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
    if (view !== "management" || managementSection === "policy") return;
    const timer = window.setTimeout(() => {
      const target = document.querySelector<HTMLButtonElement>(`.management-control-wrapper .setting-btn[data-section="${managementSection}"]`);
      target?.click();
    }, 80);
    return () => window.clearTimeout(timer);
  }, [view, managementSection]);

  const switchView = (next: SettingsView) => {
    setView(next);
    if (typeof window !== "undefined") {
      const hash = next === "notifications" ? "#notifications" : next === "management" ? `#management-control-${managementSection}` : "";
      window.history.replaceState(null, "", `${window.location.pathname}${hash}`);
    }
  };

  return (
    <div className={`settings-with-notifications settings-view-${view}`} data-settings-view={view}>
      <div className="settings-notification-page-tabs">
        <button className={`notification-tab ${view === "settings" ? "active" : ""}`} onClick={() => switchView("settings")}>Settings Console</button>
        <button className={`notification-tab ${view === "management" ? "active" : ""}`} onClick={() => switchView("management")}>Management Control</button>
        <button className={`notification-tab ${view === "notifications" ? "active" : ""}`} onClick={() => switchView("notifications")}>Notification Channels</button>
      </div>

      <div className="settings-view-host">
        {view === "notifications" ? (
          <NotificationChannelsSettings />
        ) : view === "management" ? (
          <div className="management-control-wrapper" data-management-section={managementSection}>
            {managementSection === "policy" ? <SoftwarePolicyManagement /> : <LegacySettings key={`management-${managementSection}`} />}
          </div>
        ) : (
          <LegacySettings />
        )}
      </div>
    </div>
  );
}
