import type { Plugin } from 'vite';

const MODERN_SOFTWARE_BREAKDOWN = String.raw`  const renderSoftwareLevel2Analytics = () => {
    const rows = getSoftwareEvidenceRows();
    const totalInstallations = Math.max(numberOrFallback(software.totalInstallations), rows.length, 0);
    const uniqueTitles = Math.max(numberOrFallback(software.uniqueSoftware), uniqueSoftwareRows(rows).length, 0);
    const classificationRows = getSoftwareClassificationGraphRows();
    const eolWatch = numberOrFallback(software.eolApplications) + numberOrFallback(software.eosApplications);
    const unsupportedApps = numberOrFallback(software.unsupportedApplications);
    const unclassifiedCount = numberOrFallback(software.unclassifiedSoftware);
    const classifiedCount = Math.max(totalInstallations - unclassifiedCount, 0);

    const overviewCards = [
      { label: 'Installations', value: totalInstallations, note: 'Total software usage records', target: 'Installations', tone: 'purple' as CardTone, icon: Database },
      { label: 'Unique Software', value: uniqueTitles, note: 'Distinct software titles', target: 'Unique Software', tone: 'blue' as CardTone, icon: BarChart3 },
      { label: 'Business Software', value: numberOrFallback(software.businessSoftware), note: 'Microsoft, Adobe and business apps', target: 'Business Software', tone: 'green' as CardTone, icon: Gauge },
      { label: 'Needs Review', value: unclassifiedCount + eolWatch + unsupportedApps, note: 'Unclassified or lifecycle risk', target: unclassifiedCount > 0 ? 'Unclassified' : 'EOL/EOS Watch', tone: (unclassifiedCount + eolWatch + unsupportedApps) > 0 ? 'amber' as CardTone : 'green' as CardTone, icon: ShieldAlert },
    ];

    const classificationFocusRows = [
      { label: 'Business', value: numberOrFallback(software.businessSoftware), target: 'Business Software', note: 'Approved business tools', tone: 'green' as CardTone },
      { label: 'Remote Control', value: numberOrFallback(software.remoteControlSoftware), target: 'Remote Control', note: 'Remote access tools', tone: 'red' as CardTone },
      { label: 'Antivirus', value: numberOrFallback(software.antivirusSoftware), target: 'Antivirus', note: 'Endpoint protection', tone: 'cyan' as CardTone },
      { label: 'Web Browsers', value: numberOrFallback(software.browserSoftware), target: 'Web Browsers', note: 'Chrome, Edge, Firefox', tone: 'blue' as CardTone },
      { label: 'Gaming', value: numberOrFallback(software.gamingSoftware), target: 'Gaming Software', note: 'Non-business games', tone: 'amber' as CardTone },
      { label: 'Unclassified', value: unclassifiedCount, target: 'Unclassified', note: 'Needs cleanup', tone: 'slate' as CardTone },
    ];

    const majorRows = buildSoftwareGraphRows(rows, [
      { label: 'Microsoft Office', target: 'Microsoft Office', note: 'Office desktop clients', tone: 'blue', matcher: (row) => softwareMajorFamilyMatches(row, 'Microsoft Office') },
      { label: 'Microsoft 365', target: 'Microsoft 365', note: 'M365, Teams, OneDrive', tone: 'purple', matcher: (row) => softwareMajorFamilyMatches(row, 'Microsoft 365') },
      { label: 'Adobe', target: 'Adobe', note: 'Acrobat and Creative Cloud', tone: 'red', matcher: (row) => softwareMajorFamilyMatches(row, 'Adobe') },
      { label: 'Google Chrome', target: 'Google Chrome', note: 'Chrome browser family', tone: 'green', matcher: (row) => softwareMajorFamilyMatches(row, 'Google Chrome') },
      { label: 'Firefox', target: 'Firefox', note: 'Mozilla Firefox family', tone: 'amber', matcher: (row) => softwareMajorFamilyMatches(row, 'Firefox') },
    ]);

    const governanceRows = [
      { label: 'Classified', value: classifiedCount, target: 'Business Software', note: 'Records with usable classification', tone: 'green' as CardTone },
      { label: 'Unclassified', value: unclassifiedCount, target: 'Unclassified', note: 'Needs category cleanup', tone: 'amber' as CardTone },
      { label: 'EOL/EOS Watch', value: eolWatch, target: 'EOL/EOS Watch', note: 'Lifecycle dates require review', tone: 'red' as CardTone },
      { label: 'Unsupported', value: unsupportedApps, target: 'Unsupported Apps', note: 'Expired or unsupported apps', tone: 'purple' as CardTone },
    ];

    return (
      <div className="itops-pro-drawer-stack">
        <DrilldownTrace domain="Software" stage="breakdown" />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
          {overviewCards.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.label} type="button" onClick={() => openLevel3('software', item.target)} style={{ display: 'grid', gridTemplateColumns: '48px minmax(0, 1fr) auto', gap: 12, alignItems: 'center', padding: 15, border: '1px solid #dbeafe', borderRadius: 18, background: '#fff', color: '#0f172a', cursor: 'pointer', boxShadow: '0 12px 30px rgba(15,23,42,.06)', textAlign: 'left' }}>
                <span style={{ width: 42, height: 42, borderRadius: 14, display: 'grid', placeItems: 'center', color: '#fff', background: toneGradient(item.tone), boxShadow: '0 12px 24px rgba(37,99,235,.16)' }}><Icon size={19} /></span>
                <span style={{ minWidth: 0 }}>
                  <strong style={{ display: 'block', color: '#64748b', fontSize: 10, fontWeight: 950, letterSpacing: '.08em', textTransform: 'uppercase' }}>{item.label}</strong>
                  <strong style={{ display: 'block', marginTop: 5, color: '#0f172a', fontSize: 23, lineHeight: 1, fontWeight: 950 }}>{formatNumber(item.value)}</strong>
                  <small style={{ display: 'block', marginTop: 6, color: '#64748b', fontSize: 11, fontWeight: 800 }}>{item.note}</small>
                </span>
                <ChevronRight size={16} color="#94a3b8" />
              </button>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.05fr) minmax(360px, .95fr)', gap: 16, alignItems: 'stretch' }}>
          <Panel title="Classification & Distribution" subtitle="Business tools, remote control, antivirus, browser, gaming and unclassified software. Click any segment to open details." icon={BarChart3}>
            {renderSoftwareStackedDistribution(classificationFocusRows, Math.max(totalInstallations, 1))}
          </Panel>
          <Panel title="Software Review Queue" subtitle="Focus on cleanup and application lifecycle risk before it becomes compliance exposure." icon={ShieldAlert}>
            {renderSoftwareHorizontalBars(governanceRows, Math.max(totalInstallations, 1))}
          </Panel>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, alignItems: 'stretch' }}>
          <Panel title="Major Software Watch" subtitle="Microsoft Office, Microsoft 365, Adobe, Google Chrome and Firefox. Click any bar to view matching software records." icon={CalendarDays}>
            {renderSoftwareHorizontalBars(majorRows, Math.max(totalInstallations, 1))}
          </Panel>
          <Panel title="Software Categories" subtitle="Top software categories from inventory. Click a category to view the matching records." icon={Database}>
            {renderBreakdownDrillCards(software.topCategories, 'software', 'No software category data yet.')}
          </Panel>
        </div>
      </div>
    );
  };

  const renderSoftwareInventoryTable`;

export function softwareBreakdownModernUiTransform(): Plugin {
  return {
    name: 'software-breakdown-modern-ui-transform',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').endsWith('/src/pages/Dashboard.tsx')) return null;

      const next = code.replace(
        /  const renderSoftwareLevel2Analytics = \(\) => \([\s\S]*?\n  \);\n\n  const renderSoftwareInventoryTable/,
        MODERN_SOFTWARE_BREAKDOWN,
      );

      if (next === code) return null;
      return { code: next, map: null };
    },
  };
}
