import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { itopsSoftwareDrilldownTransform } from './src/utils/itopsSoftwareDrilldownTransform';
import { hardwarePaginationFixTransform } from './src/utils/hardwarePaginationFixTransform';

function dashboardUiPatch() {
  return {
    name: 'dashboard-ui-patch',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      if (!id.replace(/\\/g, '/').endsWith('/src/pages/Dashboard.tsx')) return null;

      const exportStart = code.indexOf('          <button type="button" className="itops-pro-outline-btn"');
      const exportMarker = code.indexOf('<Download size={16} /> Export', exportStart);
      const exportEnd = exportMarker > -1 ? code.indexOf('          </button>', exportMarker) : -1;

      let next = code;
      if (exportStart > -1 && exportMarker > -1 && exportEnd > -1) {
        next = code.slice(0, exportStart) + code.slice(exportEnd + '          </button>'.length);
      }

      next = next.split('const hasSummaryCountWithoutRows = expectedCount > 0 && selectedRows.length === 0;').join('const hasSummaryCountWithoutRows = false;');
      next = next.split("tone: 'amber',\n      progress: softwareMappingPercent,").join("tone: 'purple',\n      progress: softwareMappingPercent,");

      const policyFetchHelperMarker = '\nasync function fetchItOpsDashboardData(forceRefresh = false) {';
      const policyFetchHelper = `
async function fetchSoftwarePolicyDashboardSummary(headers: Headers) {
  try {
    const response = await fetch(buildApiUrl('/api/settings/software-policy/policies'), {
      headers,
      credentials: 'include',
    });

    if (!response.ok) return null;

    const payload = await response.json().catch(() => null) as { success?: boolean; data?: unknown } | null;
    if (payload?.success === false) return null;

    const rows = Array.isArray(payload?.data) ? payload.data as Record<string, unknown>[] : [];
    const policyLegalSoftware = rows.reduce((sum, row) => sum + numberOrFallback(row.LegalCount ?? row.legalCount), 0);
    const explicitIllegalSoftware = rows.reduce((sum, row) => sum + numberOrFallback(row.IllegalCount ?? row.illegalCount), 0);
    const policyTotalSoftware = rows.reduce((sum, row) => sum + numberOrFallback(row.TotalItems ?? row.totalItems), 0) || policyLegalSoftware + explicitIllegalSoftware;
    const policyIllegalSoftware = explicitIllegalSoftware;
    const policyLicenseTotal = rows.reduce((sum, row) => sum + numberOrFallback(row.LicenseTotal ?? row.licenseTotal), 0);

    return {
      policyTotalSoftware,
      policyLegalSoftware,
      policyIllegalSoftware,
      policyLicenseTotal,
    } as Record<string, number>;
  } catch (_) {
    return null;
  }
}
`;
      if (next.includes(policyFetchHelperMarker) && !next.includes('fetchSoftwarePolicyDashboardSummary')) {
        next = next.replace(policyFetchHelperMarker, `${policyFetchHelper}${policyFetchHelperMarker}`);
      }

      const oldDashboardDataReturn = `  const data = normalizeDashboardData(payload.data);
  itopsDashboardClientCache = { at: Date.now(), data };
  return data;`;
      const newDashboardDataReturn = `  let data = normalizeDashboardData(payload.data);
  const softwarePolicySummary = await fetchSoftwarePolicyDashboardSummary(headers);
  if (softwarePolicySummary) {
    data = normalizeDashboardData({
      ...data,
      software: {
        ...data.software,
        ...softwarePolicySummary,
      },
    });
  }
  itopsDashboardClientCache = { at: Date.now(), data };
  return data;`;
      next = next.split(oldDashboardDataReturn).join(newDashboardDataReturn);

      const policyExpectedCountAnchor = "    if (selected.includes('unclassified')) return numberOrFallback(software.unclassifiedSoftware);\n";
      const policyExpectedCountPatch = "    if (selected.includes('unclassified')) return numberOrFallback(software.unclassifiedSoftware);\n    if (selected.includes('illegal')) {\n      const softwarePolicy = software as SoftwareSummary & Record<string, unknown>;\n      const policyLegalSoftware = numberOrFallback(softwarePolicy.policyLegalSoftware ?? softwarePolicy.legalSoftware ?? softwarePolicy.LegalCount, 0);\n      const allSoftwareTotal = Math.max(numberOrFallback(software.uniqueSoftware), numberOrFallback(softwarePolicy.policyTotalSoftware ?? softwarePolicy.totalPolicySoftware, 0), policyLegalSoftware + numberOrFallback(softwarePolicy.policyIllegalSoftware ?? softwarePolicy.illegalSoftware ?? softwarePolicy.IllegalCount, 0));\n      return Math.max(0, allSoftwareTotal - policyLegalSoftware);\n    }\n    if (selected.includes('legal')) return numberOrFallback((software as SoftwareSummary & Record<string, unknown>).policyLegalSoftware, 0);\n";
      next = next.split(policyExpectedCountAnchor).join(policyExpectedCountPatch);

      const policyResolveAnchor = "    if (!selected || selected.includes('install')) return rows;\n    if (selected.includes('unique software')) return uniqueSoftwareRows(rows);\n\n";
      const policyResolvePatch = "    if (!selected || selected.includes('install')) return rows;\n    if (selected.includes('unique software')) return uniqueSoftwareRows(rows);\n    if (selected.includes('illegal')) return uniqueSoftwareRows(rows);\n    if (selected.includes('legal')) return rows.filter((row) => /(^|\\b)legal(\\b|$)|approved|allowed/.test(getSoftwareRowSearchText(row)) && !/(^|\\b)illegal(\\b|$)|blocked|restricted|unauthorized|unapproved/.test(getSoftwareRowSearchText(row)));\n\n";
      next = next.split(policyResolveAnchor).join(policyResolvePatch);

      const policyDonutAnchor = "  const getSoftwareClassificationGraphRows = () => {";
      const policyDonutHelper = `  const renderSoftwarePolicyDonut = (items: { label: string; value: number; target: string; note: string; tone: CardTone }[], total: number) => {
    const displayTotal = Math.max(0, total || items.reduce((sum, item) => sum + numberOrFallback(item.value), 0));
    const safeTotal = Math.max(1, displayTotal);
    let cursor = 0;
    const gradientParts = items.map((item) => {
      const value = numberOrFallback(item.value);
      const start = cursor;
      const end = cursor + ((value / safeTotal) * 360);
      cursor = end;
      return toneSolid(item.tone) + ' ' + start + 'deg ' + end + 'deg';
    }).join(', ');
    const illegalCount = numberOrFallback(items.find((item) => item.target === 'Illegal Software')?.value, 0);

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '180px minmax(0, 1fr)', gap: 18, alignItems: 'center' }}>
        <button type="button" onClick={() => openLevel3('software', illegalCount > 0 ? 'Illegal Software' : 'Legal Software')} style={{ width: 170, height: 170, border: '1px solid #e2e8f0', borderRadius: '50%', background: 'conic-gradient(' + (gradientParts || '#e2e8f0 0deg 360deg') + ')', display: 'grid', placeItems: 'center', cursor: 'pointer', boxShadow: '0 18px 45px rgba(15,23,42,.10)' }}>
          <span style={{ width: 104, height: 104, borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', textAlign: 'center', boxShadow: 'inset 0 0 0 1px #e2e8f0' }}><span><strong style={{ display: 'block', fontSize: 24, lineHeight: 1, fontWeight: 950, color: '#0f172a' }}>{formatNumber(displayTotal)}</strong><small style={{ display: 'block', marginTop: 7, color: '#64748b', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.05em' }}>Total</small></span></span>
        </button>
        <div style={{ display: 'grid', gap: 9 }}>
          {items.map((item) => {
            const value = numberOrFallback(item.value);
            const share = displayTotal > 0 ? (value / safeTotal) * 100 : 0;
            return (
              <button key={item.label} type="button" onClick={() => openLevel3('software', item.target)} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff', padding: '10px 12px', cursor: 'pointer', color: '#0f172a', textAlign: 'left' }}>
                <span style={{ minWidth: 0 }}><strong style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 950 }}><i style={{ width: 9, height: 9, borderRadius: 999, background: toneSolid(item.tone) }} />{item.label}</strong><small style={{ display: 'block', marginTop: 3, color: '#64748b', fontSize: 10, fontWeight: 800 }}>{item.note} · {formatPercent(share, 1)}</small></span>
                <strong style={{ fontSize: 18, fontWeight: 950 }}>{formatNumber(value)}</strong>
              </button>
            );
          })}
        </div>
        <div style={{ gridColumn: '1 / -1', border: '1px solid #dbeafe', borderRadius: 14, background: '#eff6ff', color: '#1d4ed8', padding: '9px 12px', fontSize: 11, fontWeight: 850 }}>Only software listed in Software Policy and classified as Legal is legal. All other discovered software is treated as illegal.</div>
      </div>
    );
  };

`;
      if (next.includes(policyDonutAnchor) && !next.includes('renderSoftwarePolicyDonut')) {
        next = next.replace(policyDonutAnchor, `${policyDonutHelper}${policyDonutAnchor}`);
      }

      const oldLifecycleRows = `    const lifecycleRows = [
      { label: 'Supported', target: 'Supported', note: 'Supported application lifecycle', tone: 'green' as CardTone, value: rows.filter((row) => softwareLifecycleMatches(row, 'supported')).length },
      { label: 'EOL/EOS Watch', target: 'EOL/EOS Watch', note: 'Near EOL/EOS from lifecycle lookup', tone: 'amber' as CardTone, value: numberOrFallback(software.eolApplications) + numberOrFallback(software.eosApplications) },
      { label: 'Unsupported Apps', target: 'Unsupported Apps', note: 'Expired or unsupported applications', tone: 'red' as CardTone, value: numberOrFallback(software.unsupportedApplications) },
      { label: 'Lifecycle Not Found', target: 'Lifecycle Not Found', note: 'No lifecycle mapping returned', tone: 'purple' as CardTone, value: rows.filter((row) => softwareLifecycleMatches(row, 'not found')).length },
    ];`;
      const newPolicyRows = `    const softwarePolicy = software as SoftwareSummary & Record<string, unknown>;
    const uniqueInventorySoftware = uniqueSoftwareRows(rows).length;
    const dashboardUniqueSoftware = numberOrFallback(software.uniqueSoftware, 0);
    const policyLegalSoftware = numberOrFallback(softwarePolicy.policyLegalSoftware ?? softwarePolicy.legalSoftware ?? softwarePolicy.LegalCount, 0);
    const explicitPolicyIllegalSoftware = numberOrFallback(softwarePolicy.policyIllegalSoftware ?? softwarePolicy.illegalSoftware ?? softwarePolicy.IllegalCount, 0);
    const policyItemTotalSoftware = numberOrFallback(softwarePolicy.policyTotalSoftware ?? softwarePolicy.totalPolicySoftware, 0);
    const policyTotalSoftware = Math.max(uniqueInventorySoftware, dashboardUniqueSoftware, policyItemTotalSoftware, policyLegalSoftware + explicitPolicyIllegalSoftware);
    const policyIllegalSoftware = Math.max(0, policyTotalSoftware - policyLegalSoftware);
    const policyRows = [
      { label: 'Legal Software', target: 'Legal Software', note: 'Exists in Software Policy and classified Legal', tone: 'green' as CardTone, value: policyLegalSoftware },
      { label: 'Illegal Software', target: 'Illegal Software', note: 'Not in Software Policy as Legal', tone: 'red' as CardTone, value: policyIllegalSoftware },
    ];`;
      next = next.split(oldLifecycleRows).join(newPolicyRows);

      const oldSoftwareLevelTwoGrid = `        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(360px, .9fr)', gap: 16, alignItems: 'stretch' }}>
          <Panel title="Software Classification Distribution" subtitle="Portfolio split by business, remote control, antivirus, browser, gaming and unclassified records. Click any segment to open the matching list." icon={BarChart3}>{renderSoftwareStackedDistribution(classificationRows, totalInstallations)}</Panel>
          <Panel title="Lifecycle Exposure" subtitle="Application support posture from lifecycle lookup. The donut highlights EOL/EOS and unsupported exposure." icon={ShieldAlert}>{renderSoftwareLifecycleDonut(lifecycleRows, totalInstallations)}</Panel>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, alignItems: 'stretch' }}>
          <Panel title="Major Application EOL/EOS Watch" subtitle="Microsoft Office, Microsoft 365, Adobe, Google Chrome and Firefox coverage with click-through detail." icon={CalendarDays}>{renderSoftwareHorizontalBars(majorRows, totalInstallations)}</Panel>
          <Panel title="Software Governance Balance" subtitle="Shows the relationship between classified inventory, cleanup backlog and lifecycle risk." icon={Gauge}>{renderSoftwareHorizontalBars(governanceRows, totalInstallations)}</Panel>
        </div>`;

      const newSoftwareLevelTwoGrid = `        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, alignItems: 'stretch' }}>
          <Panel title="Software Lifecycle and Policies" subtitle="Only software recorded in Software Policy as Legal is counted legal. All unlisted software is illegal." icon={ShieldCheck}>{renderSoftwarePolicyDonut(policyRows, policyTotalSoftware)}</Panel>
          <Panel title="Software Governance Balance" subtitle="Shows the relationship between classified inventory, cleanup backlog and lifecycle risk." icon={Gauge}>{renderSoftwareHorizontalBars(governanceRows, totalInstallations)}</Panel>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, alignItems: 'stretch' }}>
          <Panel title="Software Classification Distribution" subtitle="Portfolio split by business, remote control, antivirus, browser, gaming and unclassified records. Click any segment to open the matching list." icon={BarChart3}>{renderSoftwareStackedDistribution(classificationRows, totalInstallations)}</Panel>
          <Panel title="Major Application EOL/EOS Watch" subtitle="Microsoft Office, Microsoft 365, Adobe, Google Chrome and Firefox coverage with click-through detail." icon={CalendarDays}>{renderSoftwareHorizontalBars(majorRows, totalInstallations)}</Panel>
        </div>`;

      next = next.split(oldSoftwareLevelTwoGrid).join(newSoftwareLevelTwoGrid);
      next = next.split(`      <Panel title="Application Lifecycle Detail Cards" subtitle="Raw lifecycle signals returned by the service lookup for monitored major applications." icon={CalendarDays}>{renderSoftwareLifecycleCards()}</Panel>\n`).join('');
      next = next.split(`      <Panel title="Software Categories" subtitle="Click a category to open matching software records." icon={Database}>{renderBreakdownDrillCards(software.topCategories, 'software', 'No software category data yet.')}</Panel>\n`).join('');

      return next === code ? null : { code: next, map: null };
    },
  };
}

export default defineConfig({
  plugins: [itopsSoftwareDrilldownTransform(), hardwarePaginationFixTransform(), dashboardUiPatch(), react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
