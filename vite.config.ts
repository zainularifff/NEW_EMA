import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { itopsSoftwareDrilldownTransform } from './src/utils/itopsSoftwareDrilldownTransform';
import { hardwarePaginationFixTransform } from './src/utils/hardwarePaginationFixTransform';
import { dashboardFocusCardColorPatch, dashboardFocusCardOrderPatch, dashboardUiPatch } from './src/utils/dashboardUiPatches';

const isDashboardFile = (id: string) => id.replace(/\\/g, '/').endsWith('/src/pages/Dashboard.tsx');

function softwareTrendRowsSafePatch() {
  return {
    name: 'software-trend-rows-safe-patch',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      if (!isDashboardFile(id)) return null;

      const from = `  const renderSoftwareTrendUtilizationPanel = () => {
    const trendMap`;
      const to = `  const renderSoftwareTrendUtilizationPanel = () => {
    const rows = getSoftwareEvidenceRows();
    const trendMap`;
      const next = code.includes(from) && !code.includes('const rows = getSoftwareEvidenceRows();\n    const trendMap')
        ? code.split(from).join(to)
        : code;

      return next === code ? null : { code: next, map: null };
    },
  };
}

function softwareComplianceDialUiPatch() {
  return {
    name: 'software-compliance-dial-ui-patch',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      if (!isDashboardFile(id)) return null;

      const start = code.indexOf('  const renderSoftwarePolicyDonut = (items: { label: string; value: number; target: string; note: string; tone: CardTone }[], total: number) => {');
      const end = start > -1 ? code.indexOf('\n\n  const renderSecurityCompliancePanel =', start) : -1;
      if (start < 0 || end < 0) return null;

      const replacement = `  const renderSoftwarePolicyDonut = (items: { label: string; value: number; target: string; note: string; tone: CardTone }[], total: number) => {
    const displayTotal = Math.max(0, total || items.reduce((sum, item) => sum + numberOrFallback(item.value), 0));
    const safeTotal = Math.max(1, displayTotal);
    const legalCount = numberOrFallback(items.find((item) => item.target === 'Legal Software')?.value, 0);
    const illegalCount = Math.max(0, displayTotal - legalCount);
    const complianceRate = displayTotal > 0 ? (legalCount / safeTotal) * 100 : 0;
    const illegalShare = displayTotal > 0 ? (illegalCount / safeTotal) * 100 : 0;
    const statusText = displayTotal <= 0 ? 'No Data' : complianceRate >= 90 ? 'Compliant' : complianceRate >= 70 ? 'Review' : 'High Risk';
    const statusColor = displayTotal <= 0 ? '#64748b' : complianceRate >= 90 ? '#16a34a' : complianceRate >= 70 ? '#f59e0b' : '#ef4444';
    const legalDeg = Math.max(0, Math.min(360, (legalCount / safeTotal) * 360));
    const dialGradient = displayTotal > 0
      ? 'conic-gradient(#22c55e 0deg ' + legalDeg + 'deg, #ef4444 ' + legalDeg + 'deg 360deg)'
      : 'conic-gradient(#cbd5e1 0deg 360deg)';

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '190px minmax(0, 1fr)', gap: 18, alignItems: 'stretch' }}>
        <button type="button" onClick={() => openLevel3('software', illegalCount > 0 ? 'Illegal Software' : 'Legal Software')} style={{ minHeight: 202, border: '1px solid #dbeafe', borderRadius: 26, background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)', padding: 16, display: 'grid', placeItems: 'center', cursor: 'pointer', boxShadow: '0 18px 40px rgba(15,23,42,.08)' }}>
          <span style={{ width: 142, height: 142, borderRadius: '50%', background: dialGradient, display: 'grid', placeItems: 'center', boxShadow: '0 18px 36px rgba(15,23,42,.12)' }}>
            <span style={{ width: 96, height: 96, borderRadius: '50%', background: '#ffffff', display: 'grid', placeItems: 'center', textAlign: 'center', boxShadow: '0 0 0 7px #f1f5f9, inset 0 0 0 1px #e2e8f0' }}>
              <span><small style={{ display: 'block', color: '#64748b', fontSize: 9, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '.08em' }}>Compliance</small><strong style={{ display: 'block', marginTop: 5, color: '#0f172a', fontSize: 25, lineHeight: 1, fontWeight: 950 }}>{formatPercent(complianceRate, 0)}</strong><small style={{ display: 'block', marginTop: 7, color: statusColor, fontSize: 9, fontWeight: 950, textTransform: 'uppercase' }}>{statusText}</small></span>
            </span>
          </span>
          <span style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 13 }}>
            <span style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 6, minHeight: 30, borderRadius: 999, background: '#f0fdf4', color: '#065f46', fontSize: 10, fontWeight: 900 }}><i style={{ width: 8, height: 8, borderRadius: 999, background: '#22c55e' }} />{formatNumber(legalCount)} legal</span>
            <span style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 6, minHeight: 30, borderRadius: 999, background: '#fff1f2', color: '#991b1b', fontSize: 10, fontWeight: 900 }}><i style={{ width: 8, height: 8, borderRadius: 999, background: '#ef4444' }} />{formatNumber(illegalCount)} illegal</span>
          </span>
        </button>

        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            <button type="button" onClick={() => openLevel3('software', 'Legal Software')} style={{ minHeight: 98, border: '1px solid #bbf7d0', borderRadius: 18, background: 'linear-gradient(135deg, #f0fdf4, #ffffff)', padding: 14, textAlign: 'left', cursor: 'pointer', color: '#064e3b' }}><span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}><b style={{ fontSize: 12, fontWeight: 950 }}>Legal Software</b><strong style={{ fontSize: 24, fontWeight: 950 }}>{formatNumber(legalCount)}</strong></span><small style={{ display: 'block', marginTop: 4, color: '#047857', fontSize: 10, fontWeight: 850 }}>{formatPercent(complianceRate, 1)} compliant asset</small><em style={{ display: 'block', height: 7, marginTop: 12, borderRadius: 999, overflow: 'hidden', background: '#dcfce7' }}><i style={{ display: 'block', height: '100%', width: String(Math.max(3, complianceRate)) + '%', borderRadius: 999, background: 'linear-gradient(90deg, #14b8a6, #22c55e)' }} /></em></button>
            <button type="button" onClick={() => openLevel3('software', 'Illegal Software')} style={{ minHeight: 98, border: '1px solid #fecaca', borderRadius: 18, background: 'linear-gradient(135deg, #fff1f2, #ffffff)', padding: 14, textAlign: 'left', cursor: 'pointer', color: '#7f1d1d' }}><span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}><b style={{ fontSize: 12, fontWeight: 950 }}>Illegal Software</b><strong style={{ fontSize: 24, fontWeight: 950 }}>{formatNumber(illegalCount)}</strong></span><small style={{ display: 'block', marginTop: 4, color: '#b91c1c', fontSize: 10, fontWeight: 850 }}>{formatPercent(illegalShare, 1)} requires action</small><em style={{ display: 'block', height: 7, marginTop: 12, borderRadius: 999, overflow: 'hidden', background: '#fee2e2' }}><i style={{ display: 'block', height: '100%', width: String(Math.max(3, illegalShare)) + '%', borderRadius: 999, background: 'linear-gradient(90deg, #f97316, #ef4444)' }} /></em></button>
          </div>
          <div style={{ border: '1px solid #dbeafe', borderRadius: 18, background: 'linear-gradient(135deg, #eff6ff, #ffffff)', padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center' }}><div><strong style={{ display: 'block', color: '#1e3a8a', fontSize: 12, fontWeight: 950 }}>Compliance formula</strong><small style={{ display: 'block', marginTop: 3, color: '#475569', fontSize: 11, fontWeight: 800 }}>Legal Software / Total Software Asset. Unlisted software is treated as illegal.</small></div><strong style={{ color: statusColor, fontSize: 20, fontWeight: 950 }}>{formatPercent(complianceRate, 0)}</strong></div>
        </div>
      </div>
    );
  };`;

      const next = code.slice(0, start) + replacement + code.slice(end);
      return next === code ? null : { code: next, map: null };
    },
  };
}

function dashboardEnglishWordingPatch() {
  return {
    name: 'dashboard-english-wording-patch',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      if (!isDashboardFile(id)) return null;

      let next = code;
      const replacements: Array<[string, string]> = [
        ['Peratusan perisian legal berdasarkan Software Policy. Contoh: 92% Legal.', 'Percentage of legal software based on Software Policy. Example: 92% Legal.'],
        ['Software Category Distribution dan Top 5 Most Installed Software.', 'Software Category Distribution and Top 5 Most Installed Software.'],
        ['Software Lifecycle Status dan EOL/EOS breakdown.', 'Software Lifecycle Status and EOL/EOS breakdown.'],
        ['Masih selamat', 'Supported and safe'],
        ['Akan tamat dalam masa 6/12 bulan', 'Ending within 6/12 months'],
        ['Sudah tamat tempoh', 'Expired / unsupported'],
      ];

      replacements.forEach(([from, to]) => {
        next = next.split(from).join(to);
      });

      return next === code ? null : { code: next, map: null };
    },
  };
}

function softwarePolicyListFirstPatch() {
  return {
    name: 'software-policy-list-first-patch',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      if (!id.replace(/\\/g, '/').endsWith('/src/pages/SettingsWithNotifications.tsx')) return null;

      let next = code;

      next = next.replace(
        '  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);',
        '  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);\n  const [policyUiMode, setPolicyUiMode] = useState<"list" | "form">("list");'
      );

      next = next.replace(
        '    setMessage({ type: "info", text: "Create a rule, choose category, then select software." });\n  };',
        '    setPolicyUiMode("form");\n    setMessage({ type: "info", text: "Create a rule, choose category, then select software." });\n  };'
      );

      next = next.replace(
        '  const removePolicyItem = async (item: PolicyItem) => {',
        '  const savePolicy = async () => {\n    if (selectedRows.length > 0) {\n      await saveSelectedSoftware();\n      return;\n    }\n    await saveRule();\n  };\n\n  const removePolicyItem = async (item: PolicyItem) => {'
      );

      next = next.replace(
        '.sp-empty{min-height:150px;display:grid;place-items:center;color:#64748b;font-size:.8rem;font-weight:800;text-align:center;padding:18px}@media',
        '.sp-empty{min-height:150px;display:grid;place-items:center;color:#64748b;font-size:.8rem;font-weight:800;text-align:center;padding:18px}.sp-top-actions{display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-wrap:wrap}.sp-policy-table-screen{min-height:0;overflow:auto}.sp-policy-table-card{height:100%;min-height:0}.sp-policy-table-wrap{display:grid;gap:10px;overflow:auto;padding-bottom:4px}.sp-policy-table-row{width:100%;min-width:980px;min-height:68px;display:grid;grid-template-columns:minmax(220px,1.45fr) minmax(150px,.85fr) 96px 88px 88px 110px 150px 96px;gap:12px;align-items:center;padding:12px 14px;border:1px solid #e5edf8;border-radius:15px;background:#fff;color:#0f2746;text-align:left}.sp-policy-table-row.head{min-height:42px;background:#f3f7fc;color:#64748b;font-size:.62rem;font-weight:900;text-transform:uppercase}.sp-policy-table-row strong,.sp-policy-table-row small{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sp-policy-table-row small{margin-top:3px;color:#64748b;font-size:.66rem;font-weight:750}.sp-policy-table-row:not(.head):hover{border-color:#bfdbfe;background:#f8fbff}.sp-policy-table-actions{display:flex;justify-content:flex-end}.sp-layout{grid-template-columns:1fr!important;overflow:auto!important}.sp-layout>aside.sp-panel{display:none!important}.sp-work{height:auto!important;overflow:visible!important;padding-right:0!important}.sp-setup{grid-template-columns:1fr!important}.sp-software-area{grid-template-columns:1fr!important;min-height:0!important}.sp-software-area>.sp-section,.sp-setup>.sp-section{width:100%!important}.sp-table{max-height:520px}.software-policy-module{overflow:auto!important}@media'
      );

      next = next.replace(
        '        <button className="sp-btn primary" type="button" onClick={startNewRule}><Plus size={16} /> Create New Rule</button>',
        '        {policyUiMode === "form" ? <div className="sp-top-actions"><button className="sp-btn secondary" type="button" onClick={() => setPolicyUiMode("list")}>Back to List</button><button className="sp-btn primary" type="button" onClick={savePolicy} disabled={saving}><Save size={15} /> Save Policy</button></div> : <button className="sp-btn primary" type="button" onClick={startNewRule}><Plus size={16} /> Add New</button>}'
      );

      next = next.replace(
        '                  <button className="sp-btn primary" type="button" onClick={saveRule} disabled={saving}><Save size={15} /> Save Rule</button>',
        '                  <span className="sp-help">Use the Save Policy button at the top to save rule and selected software.</span>'
      );

      next = next.replace(
        '                <div className="sp-action-row"><button className="sp-btn primary" type="button" onClick={saveSelectedSoftware} disabled={saving || selectedRows.length === 0}><CheckCircle2 size={15} /> Save Selected Software</button></div>',
        '                <div className="sp-action-row"><span className="sp-help">Select software and click Save Policy at the top.</span></div>'
      );

      const openMarker = '      <div className="sp-layout">';
      const closePattern = /        <\/main>\r?\n      <\/div>\r?\n    <\/section>/;
      if (!next.includes(openMarker) || !closePattern.test(next) || code.includes('<div className="sp-policy-table-screen">')) {
        return next === code ? null : { code: next, map: null };
      }

      const listView = `      {policyUiMode === "list" ? (
        <div className="sp-policy-table-screen">
          {message && <div className={"sp-alert " + message.type}>{message.text}</div>}
          <section className="sp-section sp-policy-table-card">
            <div className="sp-section-title">
              <strong>Software Policy Rules</strong>
              <small>Review existing policy rules first. Click Add New to create a new software policy.</small>
            </div>
            <div className="sp-section-body">
              <div className="sp-action-row" style={{ marginTop: 0, marginBottom: 12, justifyContent: "space-between" }}>
                <span className="sp-help">{policies.length} rule(s) configured</span>
                <button className="sp-icon" type="button" onClick={loadBase} disabled={loading} title="Refresh"><RefreshCw size={15} /></button>
              </div>
              <div className="sp-policy-table-wrap">
                <div className="sp-policy-table-row head"><span>Rule</span><span>Category</span><span>Software</span><span>Legal</span><span>Illegal</span><span>License</span><span>Work hours</span><span>Action</span></div>
                {policies.length === 0 ? <div className="sp-empty">No software policy yet. Click Add New to create the first rule.</div> : policies.map((policy) => (
                  <div key={policy.PolicyID} className="sp-policy-table-row">
                    <span><strong>{policy.PolicyName}</strong><small>{policy.Description || "No note"}</small></span>
                    <span>{policy.CategoryName || "No category"}</span>
                    <span>{policy.TotalItems || 0}</span>
                    <span><b className="sp-badge legal">{policy.LegalCount || 0}</b></span>
                    <span><b className="sp-badge illegal">{policy.IllegalCount || 0}</b></span>
                    <span>{policy.LicenseTotal || 0}</span>
                    <span>{normalizeTime(policy.WorkingStartTime) || "09:00"} - {normalizeTime(policy.WorkingEndTime) || "17:00"}</span>
                    <span className="sp-policy-table-actions"><button className="sp-btn secondary" type="button" onClick={() => { setActivePolicyId(policy.PolicyID); setPolicyUiMode("form"); }}>Open</button></span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      ) : (
`;

      next = next.replace(openMarker, listView + openMarker);
      next = next.replace(closePattern, '        </main>\n      </div>\n      )}\n    </section>');

      return next === code ? null : { code: next, map: null };
    },
  };
}

export default defineConfig({
  plugins: [
    itopsSoftwareDrilldownTransform(),
    hardwarePaginationFixTransform(),
    dashboardUiPatch(),
    softwareTrendRowsSafePatch(),
    softwareComplianceDialUiPatch(),
    dashboardEnglishWordingPatch(),
    softwarePolicyListFirstPatch(),
    dashboardFocusCardOrderPatch(),
    dashboardFocusCardColorPatch(),
    react(),
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
