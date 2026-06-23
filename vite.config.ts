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

      const currentLayouts = [
        `        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, alignItems: 'stretch' }}>
          <Panel title="Software Compliance Rate (%)" subtitle="Percentage of legal software based on Software Policy. Example: 92% Legal." icon={ShieldCheck}>{renderSoftwarePolicyDonut(policyRows, policyTotalSoftware)}</Panel>
          <Panel title="Classification & Distribution" subtitle="Software Category Distribution and Top 5 Most Installed Software." icon={Layers3}>{renderSoftwareClassificationDistributionPanel(classificationRows.length ? classificationRows : software.topCategories.map((row) => ({ label: row.name, value: row.value, target: row.name, note: 'Software category', tone: 'blue' as CardTone })), totalInstallations, topInstalledRows)}</Panel>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, alignItems: 'stretch' }}>
          <Panel title="Security & Compliance" subtitle="Software Lifecycle Status and EOL/EOS breakdown." icon={ShieldAlert}>{renderSecurityCompliancePanel(lifecycleStatusRows)}</Panel>
          <Panel title="Major Application EOL/EOS Watch" subtitle="Microsoft Office, Microsoft 365, Adobe, Google Chrome and Firefox coverage with click-through detail." icon={CalendarDays}>{renderSoftwareHorizontalBars(majorRows, totalInstallations)}</Panel>
        </div>`,
        `        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, alignItems: 'stretch' }}>
          <Panel title="Software Compliance Rate (%)" subtitle="Peratusan perisian legal berdasarkan Software Policy. Contoh: 92% Legal." icon={ShieldCheck}>{renderSoftwarePolicyDonut(policyRows, policyTotalSoftware)}</Panel>
          <Panel title="Classification & Distribution" subtitle="Software Category Distribution dan Top 5 Most Installed Software." icon={Layers3}>{renderSoftwareClassificationDistributionPanel(classificationRows.length ? classificationRows : software.topCategories.map((row) => ({ label: row.name, value: row.value, target: row.name, note: 'Software category', tone: 'blue' as CardTone })), totalInstallations, topInstalledRows)}</Panel>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, alignItems: 'stretch' }}>
          <Panel title="Security & Compliance" subtitle="Software Lifecycle Status dan EOL/EOS breakdown." icon={ShieldAlert}>{renderSecurityCompliancePanel(lifecycleStatusRows)}</Panel>
          <Panel title="Major Application EOL/EOS Watch" subtitle="Microsoft Office, Microsoft 365, Adobe, Google Chrome and Firefox coverage with click-through detail." icon={CalendarDays}>{renderSoftwareHorizontalBars(majorRows, totalInstallations)}</Panel>
        </div>`,
      ];

      const requestedLayout = `        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, alignItems: 'stretch' }}>
          <Panel title="Software Compliance Rate (%)" subtitle="Percentage of legal software based on Software Policy. Example: 92% Legal." icon={ShieldCheck}>{renderSoftwarePolicyDonut(policyRows, policyTotalSoftware)}</Panel>
          <Panel title="Security & Compliance" subtitle="Software Lifecycle Status and EOL/EOS breakdown." icon={ShieldAlert}>{renderSecurityCompliancePanel(lifecycleStatusRows)}</Panel>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, alignItems: 'stretch' }}>
          <Panel title="Classification & Distribution" subtitle="Software Category Distribution and Top 5 Most Installed Software." icon={Layers3}>{renderSoftwareClassificationDistributionPanel(classificationRows.length ? classificationRows : software.topCategories.map((row) => ({ label: row.name, value: row.value, target: row.name, note: 'Software category', tone: 'blue' as CardTone })), totalInstallations, topInstalledRows)}</Panel>
          <Panel title="Major Application EOL/EOS Watch" subtitle="Microsoft Office, Microsoft 365, Adobe, Google Chrome and Firefox coverage with click-through detail." icon={CalendarDays}>{renderSoftwareHorizontalBars(majorRows, totalInstallations)}</Panel>
        </div>`;

      let next = code;
      currentLayouts.forEach((layout) => {
        next = next.split(layout).join(requestedLayout);
      });

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

function softwareClassificationDistributionUiPatch() {
  return {
    name: 'software-classification-distribution-ui-patch',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      if (!id.replace(/\\/g, '/').endsWith('/src/pages/Dashboard.tsx')) return null;

      const start = code.indexOf('  const renderSoftwareClassificationDistributionPanel = (categoryItems:');
      const end = start > -1 ? code.indexOf('\n\n  const getSoftwareClassificationGraphRows = () => {', start) : -1;
      if (start < 0 || end < 0) return null;

      const replacement = `  const renderSoftwareClassificationDistributionPanel = (categoryItems: { label: string; value: number; target: string; note: string; tone: CardTone }[], total: number, topInstalledItems: { label: string; value: number; target: string; note: string; tone: CardTone }[]) => {
    const categoryTotal = Math.max(1, total || categoryItems.reduce((sum, item) => sum + numberOrFallback(item.value), 0));
    const visibleCategories = categoryItems.slice(0, 6);
    const topCategory = visibleCategories[0];
    const topInstallMax = Math.max(1, ...topInstalledItems.map((item) => numberOrFallback(item.value)));
    let categoryCursor = 0;
    const categoryGradient = visibleCategories.length
      ? visibleCategories.map((item) => {
          const value = numberOrFallback(item.value);
          const startDeg = categoryCursor;
          const endDeg = categoryCursor + ((value / categoryTotal) * 360);
          categoryCursor = endDeg;
          return toneSolid(item.tone || 'blue') + ' ' + startDeg + 'deg ' + endDeg + 'deg';
        }).join(', ')
      : '#e2e8f0 0deg 360deg';

    return (
      <div style={{ display: 'grid', gap: 16 }}>
        <section style={{ border: '1px solid #dbeafe', borderRadius: 22, padding: 16, background: 'linear-gradient(180deg, #ffffff, #f8fafc)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}><div><strong style={{ display: 'block', color: '#0f172a', fontSize: 13, fontWeight: 950 }}>Software Category Distribution</strong><small style={{ display: 'block', marginTop: 3, color: '#64748b', fontWeight: 800 }}>Installation volume by category, such as Web Browser, Remote Control and Developer Tools.</small></div><span style={{ flex: '0 0 auto', borderRadius: 999, padding: '6px 10px', background: '#eff6ff', color: '#1d4ed8', fontSize: 10, fontWeight: 900 }}>{formatNumber(categoryTotal)} installs</span></div>
          {visibleCategories.length ? (
            <div style={{ display: 'grid', gridTemplateColumns: '138px minmax(0, 1fr)', gap: 16, alignItems: 'center' }}>
              <button type="button" onClick={() => openLevel3('software', topCategory?.target || topCategory?.label || '')} style={{ width: 136, height: 136, border: '1px solid #e2e8f0', borderRadius: '50%', background: 'conic-gradient(' + categoryGradient + ')', display: 'grid', placeItems: 'center', cursor: 'pointer', boxShadow: '0 14px 34px rgba(15,23,42,.10)' }}>
                <span style={{ width: 82, height: 82, borderRadius: '50%', background: '#ffffff', display: 'grid', placeItems: 'center', textAlign: 'center', boxShadow: 'inset 0 0 0 1px #e2e8f0' }}><span><strong style={{ display: 'block', color: '#0f172a', fontSize: 20, fontWeight: 950 }}>{formatNumber(visibleCategories.length)}</strong><small style={{ display: 'block', marginTop: 4, color: '#64748b', fontSize: 9, fontWeight: 900, textTransform: 'uppercase' }}>Category</small></span></span>
              </button>
              <div style={{ display: 'grid', gap: 9 }}>
                {visibleCategories.map((item) => {
                  const value = numberOrFallback(item.value);
                  const percent = (value / categoryTotal) * 100;
                  return <button key={item.label} type="button" onClick={() => openLevel3('software', item.target || item.label)} style={{ border: '1px solid #e2e8f0', borderRadius: 14, background: '#ffffff', padding: '9px 11px', cursor: 'pointer', textAlign: 'left', color: '#0f172a' }}><span style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 10 }}><strong style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11, fontWeight: 950 }}><i style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 999, marginRight: 7, background: toneSolid(item.tone || 'blue') }} />{item.label}</strong><b style={{ fontSize: 12, fontWeight: 950 }}>{formatNumber(value)}</b></span><em style={{ display: 'block', height: 6, marginTop: 7, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden' }}><i style={{ display: 'block', height: '100%', width: String(Math.max(4, percent)) + '%', borderRadius: 999, background: toneSolid(item.tone || 'blue') }} /></em></button>;
                })}
              </div>
            </div>
          ) : <EmptyState label="No software category distribution yet." />}
        </section>

        <section style={{ border: '1px solid #e2e8f0', borderRadius: 22, padding: 16, background: 'linear-gradient(180deg, #ffffff, #f8fafc)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}><div><strong style={{ display: 'block', color: '#0f172a', fontSize: 13, fontWeight: 950 }}>Top 5 Most Installed Software</strong><small style={{ display: 'block', marginTop: 3, color: '#64748b', fontWeight: 800 }}>Most common software titles installed across the environment.</small></div><span style={{ flex: '0 0 auto', borderRadius: 999, padding: '6px 10px', background: '#f8fafc', color: '#475569', fontSize: 10, fontWeight: 900 }}>Top 5</span></div>
          {topInstalledItems.length ? (
            <div style={{ display: 'grid', gap: 9 }}>
              {topInstalledItems.slice(0, 5).map((item, index) => {
                const value = numberOrFallback(item.value);
                const percent = (value / topInstallMax) * 100;
                return <button key={item.label} type="button" onClick={() => openLevel3('software', item.target || item.label)} style={{ display: 'grid', gridTemplateColumns: '34px minmax(0, 1fr) auto', alignItems: 'center', gap: 11, border: '1px solid #e2e8f0', borderRadius: 15, background: '#ffffff', padding: '10px 12px', cursor: 'pointer', color: '#0f172a', textAlign: 'left' }}><span style={{ width: 28, height: 28, borderRadius: 10, background: '#eff6ff', color: '#1d4ed8', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 950 }}>#{index + 1}</span><span style={{ minWidth: 0 }}><strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, fontWeight: 950 }}>{item.label}</strong><em style={{ display: 'block', height: 7, marginTop: 8, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden' }}><i style={{ display: 'block', height: '100%', width: String(Math.max(5, percent)) + '%', borderRadius: 999, background: 'linear-gradient(90deg, #2563eb, #06b6d4)' }} /></em></span><strong style={{ color: '#0f172a', fontSize: 15, fontWeight: 950 }}>{formatNumber(value)}</strong></button>;
              })}
            </div>
          ) : <EmptyState label="No installed software ranking yet." />}
        </section>
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
  plugins: [itopsSoftwareDrilldownTransform(), hardwarePaginationFixTransform(), dashboardUiPatch(), softwareComplianceDialUiPatch(), softwareClassificationDistributionUiPatch(), dashboardEnglishWordingPatch(), softwareLevel2PanelOrderPatch(), dashboardFocusCardOrderPatch(), dashboardFocusCardColorPatch(), react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
