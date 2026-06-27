import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Clock3, Plus, RefreshCcw, ShieldCheck } from "lucide-react";

type SoftwarePolicyRow = {
  id?: string | number;
  PolicyID?: string | number;
  policyID?: string | number;
  name?: string;
  PolicyName?: string;
  policyName?: string;
  SoftwareName?: string;
  softwareName?: string;
  CategoryName?: string;
  categoryName?: string;
  Classification?: string;
  classification?: string;
  LicenseCount?: number;
  licenseCount?: number;
  EndDate?: string;
  endDate?: string;
  IsActive?: boolean | number | string;
  isActive?: boolean | number | string;
};

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:3001"
).replace(/\/$/, "");

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("emaToken") ||
    ""
  );
}

async function getJson<T>(url: string): Promise<T> {
  const token = getToken();
  const headers = new Headers();

  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${url}`, {
    headers,
    credentials: "include",
  });

  const text = await response.text();
  let payload: any = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error(`Backend returned non JSON response [${response.status}] ${url}`);
    }
  }

  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || `Request failed [${response.status}] ${url}`);
  }

  return payload as T;
}

function readRows(payload: unknown): SoftwarePolicyRow[] {
  if (Array.isArray(payload)) return payload as SoftwarePolicyRow[];

  if (payload && typeof payload === "object") {
    const item = payload as { data?: unknown; rows?: unknown; policies?: unknown; items?: unknown };

    if (Array.isArray(item.data)) return item.data as SoftwarePolicyRow[];
    if (Array.isArray(item.rows)) return item.rows as SoftwarePolicyRow[];
    if (Array.isArray(item.policies)) return item.policies as SoftwarePolicyRow[];
    if (Array.isArray(item.items)) return item.items as SoftwarePolicyRow[];
  }

  return [];
}

function text(value: unknown, fallback = "-") {
  const clean = String(value ?? "").trim();
  return clean || fallback;
}

function rowId(row: SoftwarePolicyRow, index: number) {
  return String(row.id ?? row.PolicyID ?? row.policyID ?? index);
}

function policyName(row: SoftwarePolicyRow) {
  return text(row.PolicyName ?? row.policyName ?? row.name, "Software Policy");
}

function softwareName(row: SoftwarePolicyRow) {
  return text(row.SoftwareName ?? row.softwareName);
}

function categoryName(row: SoftwarePolicyRow) {
  return text(row.CategoryName ?? row.categoryName);
}

function classification(row: SoftwarePolicyRow) {
  return text(row.Classification ?? row.classification);
}

function licenseCount(row: SoftwarePolicyRow) {
  return Number(row.LicenseCount ?? row.licenseCount ?? 0) || 0;
}

function expiry(row: SoftwarePolicyRow) {
  const raw = row.EndDate ?? row.endDate;
  if (!raw) return "-";

  const date = new Date(String(raw));
  if (Number.isNaN(date.getTime())) return String(raw).slice(0, 10);

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isActive(row: SoftwarePolicyRow) {
  const value = row.IsActive ?? row.isActive ?? true;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") return ["true", "1", "yes", "active"].includes(value.toLowerCase());
  return true;
}

export default function SoftwarePolicySettings() {
  const [rows, setRows] = useState<SoftwarePolicyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadPolicies = async () => {
    setLoading(true);
    setError("");

    try {
      const payload = await getJson<unknown>("/api/settings/software-policy/policies");
      setRows(readRows(payload));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load software policy.";
      setError(message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return rows;

    return rows.filter((row) =>
      [policyName(row), softwareName(row), categoryName(row), classification(row), expiry(row)]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [rows, search]);

  const activeCount = rows.filter(isActive).length;
  const legalCount = rows.filter((row) => classification(row).toLowerCase() === "legal").length;
  const illegalCount = rows.filter((row) => classification(row).toLowerCase() === "illegal").length;

  return (
    <section className="ema-software-policy">
      <div className="ema-sp-toolbar">
        <div>
          <span className="ema-sp-eyebrow">SOFTWARE GOVERNANCE</span>
          <h3>Software Policy</h3>
          <p>Manage legal or illegal software classification, license count and expiry policy.</p>
        </div>

        <div className="ema-sp-actions">
          <button type="button" onClick={loadPolicies} disabled={loading}>
            <RefreshCcw size={14} />
            {loading ? "Loading..." : "Refresh"}
          </button>
          <button type="button">
            <Plus size={14} />
            Add Policy
          </button>
        </div>
      </div>

      <div className="ema-sp-cards">
        <article>
          <span className="blue"><ShieldCheck size={15} /></span>
          <div><strong>{rows.length}</strong><small>Total Policies</small></div>
        </article>
        <article>
          <span className="green"><ShieldCheck size={15} /></span>
          <div><strong>{activeCount}</strong><small>Active Policies</small></div>
        </article>
        <article>
          <span className="purple"><Clock3 size={15} /></span>
          <div><strong>{legalCount}</strong><small>Legal Items</small></div>
        </article>
        <article>
          <span className="red"><AlertTriangle size={15} /></span>
          <div><strong>{illegalCount}</strong><small>Illegal Items</small></div>
        </article>
      </div>

      <div className="ema-sp-filter">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search policy, software, category or classification..."
        />
      </div>

      {error && <div className="ema-sp-error">{error}</div>}

      <div className="ema-sp-table-wrap">
        <table className="ema-sp-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>Policy Name</th>
              <th>Software</th>
              <th>Category</th>
              <th>Classification</th>
              <th>License</th>
              <th>Expiry</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="ema-sp-empty">
                  {loading ? "Loading software policies..." : "No software policy records found."}
                </td>
              </tr>
            ) : (
              filteredRows.map((row, index) => (
                <tr key={rowId(row, index)}>
                  <td>{String(index + 1).padStart(2, "0")}</td>
                  <td>{policyName(row)}</td>
                  <td>{softwareName(row)}</td>
                  <td>{categoryName(row)}</td>
                  <td>
                    <span className={`ema-sp-pill ${classification(row).toLowerCase()}`}>
                      {classification(row)}
                    </span>
                  </td>
                  <td>{licenseCount(row)}</td>
                  <td>{expiry(row)}</td>
                  <td>
                    <span className={`ema-sp-status ${isActive(row) ? "active" : "inactive"}`}>
                      {isActive(row) ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
