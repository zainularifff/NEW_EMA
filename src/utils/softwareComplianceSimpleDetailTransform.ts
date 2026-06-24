import type { Plugin } from 'vite';

const SOFTWARE_COMPLIANCE_TABLE_COMPONENT = String.raw`
  type SoftwareCompliancePolicyStatus = 'Legal' | 'Illegal';

  type SoftwareCompliancePolicyDetailRow = {
    PolicyID?: number;
    PolicyItemID?: number;
    SoftwareName?: string;
    Publisher?: string;
    CategoryName?: string;
    ComplianceStatus?: string;
    TotalInstall?: number;
    InstalledPC?: number;
    TotalLicense?: number;
    Balance?: number;
    LicenseEndDate?: string | null;
    DaysToExpire?: number | null;
    PositionStatus?: string;
    LicenseStatus?: string;
  };

  const isSoftwareCompliancePolicySelection = (value = '') => {
    const selected = String(value || '').trim().toLowerCase();
    return selected === 'legal software' || selected === 'illegal software';
  };

  const resolveSoftwareCompliancePolicyStatus = (value = ''): SoftwareCompliancePolicyStatus => {
    const selected = String(value || '').trim().toLowerCase();
    return selected.includes('illegal') ? 'Illegal' : 'Legal';
  };

  const formatSoftwareComplianceDate = (value?: string | null) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 10) || '-';
    return date.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' });
  };

  const getSoftwareCompliancePositionTone = (value?: string): StatusTone => {
    const text = String(value || '').toLowerCase();
    if (text.includes('negative') || text.includes('over')) return 'danger';
    if (text.includes('enough')) return 'success';
    if (text.includes('positive') || text.includes('available')) return 'success';
    return 'neutral';
  };

  const getSoftwareComplianceExpiryTone = (value?: string): StatusTone => {
    const text = String(value || '').toLowerCase();
    if (text.includes('expired')) return 'danger';
    if (text.includes('near')) return 'warning';
    if (text.includes('valid')) return 'success';
    return 'neutral';
  };

  const SoftwareCompliancePolicyOnlyTable = ({ status }: { status: SoftwareCompliancePolicyStatus }) => {
    const [rows, setRows] = useState<SoftwareCompliancePolicyDetailRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
      let cancelled = false;
      const token = getStoredAccessToken();
      setLoading(true);
      setError('');

      fetch(buildApiUrl('/api/dashboard/software-compliance/details', { status }), {
        credentials: 'include',
        headers: token ? { Authorization: 'Bearer ' + token } : undefined,
      })
        .then(async (response) => {
          const payload = await response.json().catch(() => ({}));
          if (!response.ok || payload?.success === false) {
            throw new Error(payload?.message || payload?.error || 'Failed to load software compliance list.');
          }
          const data = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
          if (!cancelled) setRows(data as SoftwareCompliancePolicyDetailRow[]);
        })
        .catch((fetchError) => {
          if (!cancelled) {
            setRows([]);
            setError(fetchError?.message || 'Failed to load software compliance list.');
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });

      return () => {
        cancelled = true;
      };
    }, [status]);

    return (
      <div className="itops-pro-table-wrap" style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', boxShadow: '0 16px 38px rgba(15,23,42,.08)' }}>
        <table className="itops-pro-table">
          <thead>
            <tr>
              <th>Software</th>
              <th>Publisher</th>
              <th>Category</th>
              <th>Total Install</th>
              <th>Installed PC</th>
              <th>Total License</th>
              <th>Balance</th>
              <th>Expired Date</th>
              <th>Days Left</th>
              <th>Status</th>
              <th>Expiry</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const totalInstall = numberOrFallback(row.TotalInstall);
              const installedPc = numberOrFallback(row.InstalledPC);
              const totalLicense = numberOrFallback(row.TotalLicense);
              const balance = numberOrFallback(row.Balance, totalLicense - totalInstall);
              const daysLeft = row.DaysToExpire === null || row.DaysToExpire === undefined ? '-' : formatNumber(row.DaysToExpire);
              const statusText = row.PositionStatus || (balance < 0 ? 'Negative - Over installed' : balance === 0 ? 'Enough' : 'Positive - License available');
              const expiryText = row.LicenseStatus || '-';

              return (
                <tr key={String(row.PolicyItemID || row.PolicyID || row.SoftwareName || index)}>
                  <td><strong>{row.SoftwareName || '-'}</strong></td>
                  <td>{row.Publisher || '-'}</td>
                  <td>{row.CategoryName || '-'}</td>
                  <td>{formatNumber(totalInstall)}</td>
                  <td>{formatNumber(installedPc)}</td>
                  <td>{formatNumber(totalLicense)}</td>
                  <td><strong style={{ color: balance < 0 ? '#b91c1c' : '#047857' }}>{formatNumber(balance)}</strong></td>
                  <td>{formatSoftwareComplianceDate(row.LicenseEndDate)}</td>
                  <td>{daysLeft}</td>
                  <td><ToneBadge tone={getSoftwareCompliancePositionTone(statusText)}>{statusText}</ToneBadge></td>
                  <td><ToneBadge tone={getSoftwareComplianceExpiryTone(expiryText)}>{expiryText}</ToneBadge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {loading && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 28, color: '#475569', fontWeight: 850 }}><Loader2 size={18} className="animate-spin" /> Loading software compliance list...</div>}
        {!loading && error && <EmptyState label={error} />}
        {!loading && !error && !rows.length && <EmptyState label={'No ' + status.toLowerCase() + ' software policy records found.'} />}
      </div>
    );
  };

  const renderSoftwareCompliancePolicyOnlyDetail = (item = '') => {
    const status = resolveSoftwareCompliancePolicyStatus(item);
    return (
      <div className="itops-pro-drawer-stack">
        <SoftwareCompliancePolicyOnlyTable status={status} />
      </div>
    );
  };

 `;

export function softwareComplianceSimpleDetailTransform(): Plugin {
  return {
    name: 'software-compliance-simple-detail-transform',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').endsWith('/src/pages/Dashboard.tsx')) return null;

      let next = code;

      if (!next.includes('const SoftwareCompliancePolicyOnlyTable =')) {
        next = next.replace(
          /  const renderSoftwareInventoryTable = \(item = ''\) => \{/,
          `${SOFTWARE_COMPLIANCE_TABLE_COMPONENT}  const renderSoftwareInventoryTable = (item = '') => {`,
        );
      }

      next = next.replace(
        /    if \(view === 'software'\) \{\s*\n\s*const selectedRows = resolveSoftwareEvidenceRows\(item\);/,
        `    if (view === 'software') {\n      if (isSoftwareCompliancePolicySelection(item)) {\n        return renderSoftwareCompliancePolicyOnlyDetail(item);\n      }\n\n      const selectedRows = resolveSoftwareEvidenceRows(item);`,
      );

      if (next === code) return null;
      return { code: next, map: null };
    },
  };
}
