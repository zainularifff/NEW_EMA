import { useEffect, useMemo, useState } from "react";
import { RefreshCcw, Plus, ShieldCheck, AlertTriangle, Clock3 } from "lucide-react";

type SoftwarePolicyRow = {
  id?: string | number;
  policyID?: string | number;
  PolicyID?: string | number;
  name?: string;
  policyName?: string;
  PolicyName?: string;
  classification?: string;
  Classification?: string;
  licenseCount?: number;
  LicenseCount?: number;
  startDate?: string;
  StartDate?: string;
  endDate?: string;
  EndDate?: string;
  isActive?: boolean;
  IsActive?: boolean;
  softwareName?: string;
  SoftwareName?: string;
  categoryName?: string;
  CategoryName?: string;
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

async function apiGet<T>(path: string): Promise<T> {
  const token = getToken();
  const headers = new Headers();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    headers,
    credentials: "include",
  });

  const text = await response.text();

  let payload: any = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error(`Backend returned non JSON response [${response.status}] ${path}`);
    }
  }

  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || `Request failed [${response.status}] ${path}`);
  }

  return payload as T;
}

function readRows(payload: unknown): SoftwarePolicyRow[] {
  if (Array.isArray(payload)) return payload as SoftwarePolicyRow[];

  if (payload && typeof payload === "object") {
    const objectPayload = payload as {
      data?: unknown;
      rows?: unknown;
      policies?: unknown;
      items?: unknown;
    };

    if (Array.isArray(objectPayload.data)) return objectPayload.data as SoftwarePolicyRow[];
    if (Array.isArray(objectPayload.rows)) return objectPayload.rows as SoftwarePolicyRow[];
    if (Array.isArray(objectPayload.policies)) return objectPayload.policies as SoftwarePolicyRow[];
    if (Array.isArray(objectPayload.items)) return objectPayload.items as SoftwarePolicyRow[];
  }

  return [];
}

function getRowId(row: SoftwarePolicyRow, index: number) {
  return String(row.id ?? row.policyID ?? row.PolicyID ?? index + 1);
}

function getPolicyName(row: SoftwarePolicyRow) {
  return String(row.policyName ?? row.PolicyName ?? row.name ?? "Software Policy").trim();
}

function getSoftwareName(row: SoftwarePolicyRow) {
  return String(row.softwareName ?? row.SoftwareName ?? "-").trim();
}

function getCategoryName(row: SoftwarePolicyRow) {
  return String(row.categoryName ?? row.CategoryName ?? "-").trim();
}

function getClassification(row: SoftwarePolicyRow) {
  return String(row.classification ?? row.Classification ?? "-").trim();
}

function getLicenseCount(row: SoftwarePolicyRow) {
  return Number(row.licenseCount ?? row.LicenseCount ?? 0) || 0;
}

function getExpiry(row: SoftwarePolicyRow) {
  const value = row.endDate ?? row.EndDate ?? "";
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isActive(row: SoftwarePolicyRow) {
  const value = row.isActive ?? row.IsActive ?? true;
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
      const payload = await apiGet<unknown>("/api/settings/software-policy/policies");
      setRows(readRows(payload));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load software policy.";
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

    return rows.filter((row) => {
      const text = [
        getPolicyName(row),
        getSoftwareName(row),
        getCategoryName(row),
        getClassification(row),
        getExpiry(row),
      ].join(" ").toLowerCase();

      return text.includes(term);
    });
  }, [rows, search]);

  const activeCount = rows.filter(isActive).length;
  const legalCount = rows.filter((row) => getClassification(row).toLowerCase() === "legal").length;
  const illegalCount = rows.filter((row) => getClassification(row).toLowerCase() === "illegal").length;

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
          <div>
            <strong>{rows.length}</strong>
            <small>Total Policies</small>
          </div>
        </article>
        <article>
          <span className="green"><ShieldCheck size={15} /></span>
          <div>
            <strong>{activeCount}</strong>
            <small>Active Policies</small>
          </div>
        </article>
        <article>
          <span className="purple"><Clock3 size={15} /></span>
          <div>
            <strong>{legalCount}</strong>
            <small>Legal Items</small>
          </div>
        </article>
        <article>
          <span className="red"><AlertTriangle size={15} /></span>
          <div>
            <strong>{illegalCount}</strong>
            <small>Illegal Items</small>
          </div>
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
                <tr key={getRowId(row, index)}>
                  <td>{String(index + 1).padStart(2, "0")}</td>
                  <td>{getPolicyName(row)}</td>
                  <td>{getSoftwareName(row)}</td>
                  <td>{getCategoryName(row)}</td>
                  <td>
                    <span className={`ema-sp-pill ${getClassification(row).toLowerCase() === "legal" ? "legal" : getClassification(row).toLowerCase() === "illegal" ? "illegal" : ""}`}>
                      {getClassification(row)}
                    </span>
                  </td>
                  <td>{getLicenseCount(row)}</td>
                  <td>{getExpiry(row)}</td>
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
