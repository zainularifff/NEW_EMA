import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, FilePlus2, RefreshCw, Save, Search, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";

import api, { unwrapArray, unwrapData } from "../../services/apiClient";
import "../../styles/software-policy-management.css";

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

function getSoftwareKey(row: SoftwareRow) {
  return [row.SoftwareName, row.Publisher || "", row.Version || "", row.CategoryName || ""].join("||");
}

function pickErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function sortPolicies(rows: PolicyRow[]) {
  return [...rows].sort((a, b) => String(b.UpdatedAt || b.CreatedAt || "").localeCompare(String(a.UpdatedAt || a.CreatedAt || "")));
}

export default function SoftwarePolicyManagement() {
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
      <header className="software-policy-hero">
        <div><span className="software-policy-eyebrow">Administration Control</span><h2>Software Policy</h2><p>Create policy records, select category, then mark software as legal or restricted and purchased or not purchased.</p></div>
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
            <div className="software-policy-section-head"><div><span>Identify Software</span><h3>{activePolicy ? activePolicy.PolicyName : "Select or create a software policy"}</h3><p>Select a main software category. The software list below is loaded from inventory mapping.</p></div><div className="software-policy-status-toggle"><button type="button" className={complianceStatus === "Legal" ? "active legal" : ""} onClick={() => setComplianceStatus("Legal")}><ShieldCheck size={15} /> Legal</button><button type="button" className={complianceStatus === "Restricted" ? "active restricted" : ""} onClick={() => setComplianceStatus("Restricted")}><ShieldAlert size={15} /> Restricted</button></div></div>
            <div className="software-policy-toolbar"><label className="software-policy-field compact"><span>Main category</span><select value={categoryId} onChange={(event) => updateActivePolicyCategory(event.target.value)} disabled={!activePolicy}><option value="">Select category</option>{categories.map((category) => <option key={category.CategoryID} value={category.CategoryID}>{category.CategoryName}</option>)}</select></label><label className="software-policy-field compact"><span>Purchase status</span><select value={purchaseStatus} onChange={(event) => setPurchaseStatus(event.target.value as typeof purchaseStatus)}><option value="Unknown">Unknown</option><option value="Purchased">Purchased</option><option value="Not Purchased">Not Purchased</option></select></label><label className="software-policy-search"><Search size={15} /><input value={softwareSearch} onChange={(event) => setSoftwareSearch(event.target.value)} placeholder="Search software or publisher..." /></label><button className="software-policy-primary-btn" type="button" onClick={saveSelectedSoftware} disabled={!activePolicy || selectedRows.length === 0 || saving}><CheckCircle2 size={15} /> Add Selected ({selectedRows.length})</button></div>
            <div className="software-policy-table software-source-table"><div className="software-policy-row head"><span></span><span>Software</span><span>Publisher</span><span>Version</span><span>User</span><span>Computer</span><span>Department</span></div>{softwareLoading ? <div className="software-policy-empty wide">Loading software inventory...</div> : softwareRows.length === 0 ? <div className="software-policy-empty wide">Select category to display mapped software list.</div> : softwareRows.map((row) => { const key = getSoftwareKey(row); return <label key={key} className="software-policy-row selectable"><span><input type="checkbox" checked={selectedKeys.has(key)} onChange={() => toggleSoftware(row)} /></span><span><strong>{row.SoftwareName}</strong><small>{row.CategoryName}</small></span><span>{row.Publisher || "-"}</span><span>{row.Version || "-"}</span><span>{row.Username || "-"}</span><span>{row.ComputerName || "-"}</span><span>{row.Department || "-"}</span></label>; })}</div>
          </section>

          <section className="software-policy-card software-policy-items-card">
            <div className="software-policy-section-head compact-head"><div><span>Selected Policy Items</span><h3>{summary.total} software item(s)</h3><p>Review legal or restricted status and purchase status for the selected policy.</p></div></div>
            <div className="software-policy-table policy-items-table"><div className="software-policy-row policy-head"><span>Software</span><span>Publisher</span><span>Version</span><span>Status</span><span>Purchase</span><span>Action</span></div>{policyItems.length === 0 ? <div className="software-policy-empty wide">No software has been added to this policy.</div> : policyItems.map((item) => <div key={item.PolicyItemID} className="software-policy-row policy-item-row"><span><strong>{item.SoftwareName}</strong><small>{item.CategoryName}</small></span><span>{item.Publisher || "-"}</span><span>{item.Version || "-"}</span><span><select value={item.ComplianceStatus || "Legal"} onChange={(event) => updateItem(item, { ComplianceStatus: event.target.value })}><option value="Legal">Legal</option><option value="Restricted">Restricted</option></select></span><span><select value={item.PurchaseStatus || "Unknown"} onChange={(event) => updateItem(item, { PurchaseStatus: event.target.value })}><option value="Unknown">Unknown</option><option value="Purchased">Purchased</option><option value="Not Purchased">Not Purchased</option></select></span><span><button className="software-policy-danger-btn" type="button" onClick={() => deleteItem(item)}><Trash2 size={14} /></button></span></div>)}</div>
          </section>
        </main>
      </div>
    </section>
  );
}
