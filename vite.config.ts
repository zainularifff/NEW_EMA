import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { itopsSoftwareDrilldownTransform } from './src/utils/itopsSoftwareDrilldownTransform';
import { hardwarePaginationFixTransform } from './src/utils/hardwarePaginationFixTransform';
import { dashboardFocusCardColorPatch, dashboardFocusCardOrderPatch, dashboardUiPatch } from './src/utils/dashboardUiPatches';

function softwareLevel2PanelOrderPatch() {
  return {
    name: 'software-level-2-panel-order-patch',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      if (!id.replace(/\\/g, '/').endsWith('/src/pages/Dashboard.tsx')) return null;

      const currentLayout = `        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, alignItems: 'stretch' }}>
          <Panel title="Software Compliance Rate (%)" subtitle="Percentage of legal software based on Software Policy. Example: 92% Legal." icon={ShieldCheck}>{renderSoftwarePolicyDonut(policyRows, policyTotalSoftware)}</Panel>
          <Panel title="Classification & Distribution" subtitle="Software Category Distribution and Top 5 Most Installed Software." icon={Layers3}>{renderSoftwareClassificationDistributionPanel(classificationRows.length ? classificationRows : software.topCategories.map((row) => ({ label: row.name, value: row.value, target: row.name, note: 'Software category', tone: 'blue' as CardTone })), totalInstallations, topInstalledRows)}</Panel>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, alignItems: 'stretch' }}>
          <Panel title="Security & Compliance" subtitle="Software Lifecycle Status and EOL/EOS breakdown." icon={ShieldAlert}>{renderSecurityCompliancePanel(lifecycleStatusRows)}</Panel>
          <Panel title="Major Application EOL/EOS Watch" subtitle="Microsoft Office, Microsoft 365, Adobe, Google Chrome and Firefox coverage with click-through detail." icon={CalendarDays}>{renderSoftwareHorizontalBars(majorRows, totalInstallations)}</Panel>
        </div>`;

      const requestedLayout = `        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, alignItems: 'stretch' }}>
          <Panel title="Software Compliance Rate (%)" subtitle="Percentage of legal software based on Software Policy. Example: 92% Legal." icon={ShieldCheck}>{renderSoftwarePolicyDonut(policyRows, policyTotalSoftware)}</Panel>
          <Panel title="Security & Compliance" subtitle="Software Lifecycle Status and EOL/EOS breakdown." icon={ShieldAlert}>{renderSecurityCompliancePanel(lifecycleStatusRows)}</Panel>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, alignItems: 'stretch' }}>
          <Panel title="Classification & Distribution" subtitle="Software Category Distribution and Top 5 Most Installed Software." icon={Layers3}>{renderSoftwareClassificationDistributionPanel(classificationRows.length ? classificationRows : software.topCategories.map((row) => ({ label: row.name, value: row.value, target: row.name, note: 'Software category', tone: 'blue' as CardTone })), totalInstallations, topInstalledRows)}</Panel>
          <Panel title="Major Application EOL/EOS Watch" subtitle="Microsoft Office, Microsoft 365, Adobe, Google Chrome and Firefox coverage with click-through detail." icon={CalendarDays}>{renderSoftwareHorizontalBars(majorRows, totalInstallations)}</Panel>
        </div>`;

      const next = code.split(currentLayout).join(requestedLayout);
      return next === code ? null : { code: next, map: null };
    },
  };
}

function softwareComplianceDialUiPatch() {
  return {
    name: 'software-compliance-dial-ui-patch',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      if (!id.replace(/\\/g, '/').endsWith('/src/pages/Dashboard.tsx')) return null;

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
      if (!id.replace(/\\/g, '/').endsWith('/src/pages/Dashboard.tsx')) return null;

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

export default defineConfig({
  plugins: [itopsSoftwareDrilldownTransform(), hardwarePaginationFixTransform(), dashboardUiPatch(), softwareLevel2PanelOrderPatch(), softwareComplianceDialUiPatch(), dashboardEnglishWordingPatch(), dashboardFocusCardOrderPatch(), dashboardFocusCardColorPatch(), react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
