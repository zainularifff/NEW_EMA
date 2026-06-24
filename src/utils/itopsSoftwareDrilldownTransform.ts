import type { Plugin } from 'vite';

const ENHANCED_SOFTWARE_HELPERS = String.raw`
  const getSoftwareRawValues = (row: SoftwareInventoryRow) => Object.values(row as Record<string, unknown>)
    .map((value) => String(value || '').toLowerCase())
    .join(' ');

  const getSoftwareRowSearchText = (row: SoftwareInventoryRow) => [
    row.softwareName,
    row.category,
    row.classification,
    row.productGroup,
    row.deviceName,
    row.deviceId,
    row.branch,
    row.version,
    row.publisher,
    row.lastScan,
    row.lifecycleStatus,
    row.supportStatus,
    row.eolDate,
    row.eosDate,
    row.riskLevel,
    row.recommendation,
    getSoftwareRawValues(row),
  ].map((value) => String(value || '').toLowerCase()).join(' ');

  const softwareMajorFamilyMatches = (row: SoftwareInventoryRow, family: string) => {
    const text = getSoftwareRowSearchText(row);
    if (family === 'Microsoft Office') return /microsoft\s+office|office\s*(standard|professional|pro|plus|2010|2013|2016|2019|2021|2024)|\bword\b|\bexcel\b|powerpoint|outlook|access|visio|project|proofing tools/.test(text) && !/microsoft\s*365|office\s*365/.test(text);
    if (family === 'Microsoft 365') return /microsoft\s*365|office\s*365|m365|teams|onedrive|sharepoint|skype for business/.test(text);
    if (family === 'Adobe') return /adobe|acrobat|creative cloud|photoshop|illustrator|premiere|lightroom|indesign|after effects|audition|dreamweaver/.test(text);
    if (family === 'Google Chrome') return /google chrome|\bchrome\b|google update|chrome update helper/.test(text);
    if (family === 'Firefox') return /mozilla firefox|\bfirefox\b/.test(text);
    return text.includes(family.toLowerCase());
  };

  const deriveSoftwareClassificationLabel = (row: SoftwareInventoryRow) => {
    const text = getSoftwareRowSearchText(row);
    if (/remote|teamviewer|anydesk|vnc|ultravnc|realvnc|tightvnc|rustdesk|dameware|bomgar|beyondtrust|screenconnect|connectwise|radmin|logmein|splashtop|chrome remote desktop|remote utilities|ultraviewer|nomachine|parsec/.test(text)) return 'Remote Control';
    if (/antivirus|anti-virus|anti virus|endpoint protection|endpoint security|windows defender|microsoft defender|defender for endpoint|sophos|symantec|mcafee|trellix|kaspersky|trend micro|crowdstrike|sentinelone|bitdefender|eset|avast|avg antivirus|malwarebytes|cisco secure endpoint|secure endpoint|carbon black|f-secure|withsecure|forticlient/.test(text)) return 'Antivirus';
    if (/browser|google chrome|\bchrome\b|firefox|microsoft edge|\bedge\b|internet explorer|brave|opera|safari|vivaldi|chromium/.test(text)) return 'Web Browser';
    if (/game|gaming|steam|epic games|riot|valorant|league of legends|garena|battle\.net|blizzard|ea app|origin|ubisoft|roblox|minecraft|genshin|geforce experience|xbox/.test(text)) return 'Gaming Software';
    if (/business|productivity|microsoft|office|microsoft\s*365|adobe|acrobat|autocad|sap|oracle|account|finance|hr|payroll|visio|project|power bi|sql server|mysql|postgres|dbeaver|tableau|zoom|webex|slack|notion|pdf/.test(text)) return 'Business Software';
    const existing = String(row.classification || row.category || '').trim();
    return existing || 'Unclassified';
  };

  const getSoftwareEvidenceRows = () => {
    const rows = Array.isArray(software.softwareRows) ? software.softwareRows : [];
    return rows.map((row) => {
      const derivedClassification = deriveSoftwareClassificationLabel(row);
      const currentClassification = String(row.classification || row.category || '').trim();
      const shouldOverride = !currentClassification || /unclassified|unknown|uncategorized|not classified|pending/i.test(currentClassification);
      return {
        ...row,
        classification: shouldOverride ? derivedClassification : row.classification,
        category: shouldOverride ? derivedClassification : row.category,
      } as SoftwareInventoryRow;
    });
  };

  const uniqueSoftwareRows = (rows: SoftwareInventoryRow[]) => {
    const seen = new Set<string>();
    return rows.filter((row) => {
      const key = [row.softwareName, row.publisher, row.version].map((value) => String(value || '').trim().toLowerCase()).join('|');
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const softwareClassificationMatches = (row: SoftwareInventoryRow, selected: string) => {
    const text = getSoftwareRowSearchText(row);
    const derived = deriveSoftwareClassificationLabel(row).toLowerCase();
    if (selected.includes('business')) return derived.includes('business') || /business|productivity|microsoft|office|microsoft\s*365|adobe|acrobat|autocad|sap|oracle|account|finance|hr|payroll|visio|project|power bi/.test(text);
    if (selected.includes('remote')) return derived.includes('remote') || /remote|teamviewer|anydesk|vnc|ultravnc|realvnc|tightvnc|rustdesk|dameware|bomgar|beyondtrust|screenconnect|connectwise|radmin|logmein|splashtop|chrome remote desktop|remote utilities|ultraviewer|nomachine/.test(text);
    if (selected.includes('antivirus') || selected.includes('anti-virus')) return derived.includes('antivirus') || /antivirus|anti-virus|anti virus|endpoint protection|endpoint security|defender|sophos|symantec|mcafee|trellix|kaspersky|trend micro|crowdstrike|sentinelone|bitdefender|eset|avast|malwarebytes|cisco secure endpoint|carbon black|forticlient/.test(text);
    if (selected.includes('browser') || selected.includes('web')) return derived.includes('browser') || /browser|chrome|firefox|edge|internet explorer|brave|opera|safari|vivaldi|chromium/.test(text);
    if (selected.includes('gaming') || selected.includes('game')) return derived.includes('gaming') || /game|gaming|steam|epic games|riot|valorant|garena|battle\.net|blizzard|ea app|origin|ubisoft|roblox|minecraft|genshin|xbox/.test(text);
    if (selected.includes('unclassified')) return derived.includes('unclassified') || /unclassified|unknown|uncategorized|not classified|pending classification/.test(text) || !String(row.classification || row.category || '').trim();
    return false;
  };

  const softwareLifecycleMatches = (row: SoftwareInventoryRow, selected: string) => {
    const text = getSoftwareRowSearchText(row);
    if (selected.includes('unsupported')) return /unsupported|expired|end of life|end of support|eol|eos/.test(text);
    if (selected.includes('eol') || selected.includes('eos') || selected.includes('watch')) return /eol|eos|end of life|end of support|near|expired|unsupported/.test(text);
    if (selected.includes('supported')) return /supported|active|maintained/.test(text) && !/unsupported|not supported|expired|eol|eos/.test(text);
    if (selected.includes('not found') || selected.includes('not mapped') || selected.includes('not checked')) return /not found|not mapped|not checked|unknown|pending|lifecycle not found/.test(text);
    return false;
  };

  const getSoftwareExpectedCount = (item = '') => {
    const selected = String(item || '').trim().toLowerCase();
    if (!selected || selected.includes('install')) return numberOrFallback(software.totalInstallations);
    if (selected.includes('unique software')) return numberOrFallback(software.uniqueSoftware);
    if (selected.includes('business')) return numberOrFallback(software.businessSoftware);
    if (selected.includes('remote')) return numberOrFallback(software.remoteControlSoftware);
    if (selected.includes('antivirus') || selected.includes('anti-virus')) return numberOrFallback(software.antivirusSoftware);
    if (selected.includes('browser') || selected.includes('web')) return numberOrFallback(software.browserSoftware);
    if (selected.includes('gaming') || selected.includes('game')) return numberOrFallback(software.gamingSoftware);
    if (selected.includes('unclassified')) return numberOrFallback(software.unclassifiedSoftware);
    if (selected.includes('unsupported')) return numberOrFallback(software.unsupportedApplications);
    if (selected.includes('eol') || selected.includes('eos') || selected.includes('watch')) return numberOrFallback(software.eolApplications) + numberOrFallback(software.eosApplications);
    const lifecycle = software.lifecycleWatch.find((row) => String(row.name || '').toLowerCase() === selected);
    if (lifecycle) return numberOrFallback(lifecycle.installs);
    const breakdown = [...(software.classificationBreakdown || []), ...(software.topCategories || [])].find((row) => String(row.name || '').toLowerCase() === selected);
    return numberOrFallback(breakdown?.value, 0);
  };

  const resolveSoftwareEvidenceRows = (item = '') => {
    const selected = String(item || '').trim().toLowerCase();
    const rows = getSoftwareEvidenceRows();

    if (!selected || selected.includes('install')) return rows;
    if (selected.includes('unique software')) return uniqueSoftwareRows(rows);

    const majorFamilies = ['Microsoft Office', 'Microsoft 365', 'Adobe', 'Google Chrome', 'Firefox'];
    const matchedFamily = majorFamilies.find((family) => selected.includes(family.toLowerCase()));
    if (matchedFamily) return rows.filter((row) => softwareMajorFamilyMatches(row, matchedFamily));

    return rows.filter((row) => {
      const values = getSoftwareRowSearchText(row);
      if (softwareClassificationMatches(row, selected)) return true;
      if (softwareLifecycleMatches(row, selected)) return true;
      return values.includes(selected);
    });
  };

  const toneGradient = (tone: CardTone) => {
    if (tone === 'red') return 'linear-gradient(90deg,#ef4444,#f97316)';
    if (tone === 'amber') return 'linear-gradient(90deg,#f59e0b,#facc15)';
    if (tone === 'green') return 'linear-gradient(90deg,#14b8a6,#22c55e)';
    if (tone === 'purple') return 'linear-gradient(90deg,#7c3aed,#38bdf8)';
    if (tone === 'cyan') return 'linear-gradient(90deg,#06b6d4,#0ea5e9)';
    if (tone === 'slate') return 'linear-gradient(90deg,#64748b,#94a3b8)';
    return 'linear-gradient(90deg,#2563eb,#38bdf8)';
  };

  const toneSolid = (tone: CardTone) => {
    if (tone === 'red') return '#ef4444';
    if (tone === 'amber') return '#f59e0b';
    if (tone === 'green') return '#14b8a6';
    if (tone === 'purple') return '#7c3aed';
    if (tone === 'cyan') return '#06b6d4';
    if (tone === 'slate') return '#64748b';
    return '#2563eb';
  };

  const toneSoftBg = (tone: CardTone) => {
    if (tone === 'red') return '#fff1f2';
    if (tone === 'amber') return '#fffbeb';
    if (tone === 'green') return '#ecfdf5';
    if (tone === 'purple') return '#f5f3ff';
    if (tone === 'cyan') return '#ecfeff';
    if (tone === 'slate') return '#f8fafc';
    return '#eff6ff';
  };

  const buildSoftwareGraphRows = (rows: SoftwareInventoryRow[], config: { label: string; target: string; note: string; tone: CardTone; value?: number; matcher?: (row: SoftwareInventoryRow) => boolean }[]) => config.map((item) => ({
    ...item,
    value: numberOrFallback(item.value, item.matcher ? rows.filter(item.matcher).length : 0),
  }));

  const renderSoftwareStackedDistribution = (items: { label: string; value: number; target: string; tone: CardTone }[], total: number) => {
    const safeTotal = Math.max(1, total || items.reduce((sum, item) => sum + numberOrFallback(item.value), 0));
    return (
      <div style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', height: 34, overflow: 'hidden', borderRadius: 999, border: '1px solid #dbeafe', background: '#f8fafc', boxShadow: 'inset 0 1px 2px rgba(15,23,42,.06)' }}>
          {items.filter((item) => numberOrFallback(item.value) > 0).map((item) => {
            const share = Math.max(2, (numberOrFallback(item.value) / safeTotal) * 100);
            return <button key={item.label} type="button" title={item.label + ' · ' + formatNumber(item.value)} onClick={() => openLevel3('software', item.target)} style={{ width: String(share) + '%', minWidth: 18, border: 0, borderRight: '1px solid rgba(255,255,255,.55)', background: toneGradient(item.tone), cursor: 'pointer' }} />;
          })}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
          {items.map((item) => {
            const value = numberOrFallback(item.value);
            const share = safeTotal > 0 ? (value / safeTotal) * 100 : 0;
            return (
              <button key={item.label} type="button" onClick={() => openLevel3('software', item.target)} style={{ display: 'grid', gap: 7, padding: 12, border: '1px solid #e2e8f0', borderRadius: 16, background: toneSoftBg(item.tone), textAlign: 'left', color: '#0f172a', cursor: 'pointer' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 10, fontWeight: 950, letterSpacing: '.08em', textTransform: 'uppercase' }}><i style={{ width: 9, height: 9, borderRadius: 999, background: toneSolid(item.tone), boxShadow: '0 0 0 4px rgba(148,163,184,.14)' }} />{item.label}</span>
                <strong style={{ fontSize: 22, lineHeight: 1, fontWeight: 950 }}>{formatNumber(value)}</strong>
                <span style={{ color: '#475569', fontSize: 12, fontWeight: 850 }}>{formatPercent(share, 1)} of estate</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSoftwareHorizontalBars = (items: { label: string; value: number; target: string; note: string; tone: CardTone }[], total: number) => {
    const maxValue = Math.max(1, ...items.map((item) => numberOrFallback(item.value)));
    const safeTotal = Math.max(1, total || maxValue);
    return (
      <div style={{ display: 'grid', gap: 12 }}>
        {items.map((item) => {
          const value = numberOrFallback(item.value);
          const width = Math.max(3, (value / maxValue) * 100);
          const share = (value / safeTotal) * 100;
          return (
            <button type="button" key={item.label} onClick={() => openLevel3('software', item.target)} style={{ display: 'grid', gridTemplateColumns: '160px minmax(0, 1fr) 92px', alignItems: 'center', gap: 12, width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 16, background: '#fff', color: '#0f172a', textAlign: 'left', cursor: 'pointer' }}>
              <div style={{ minWidth: 0 }}><strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 950 }}>{item.label}</strong><span style={{ display: 'block', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64748b', fontSize: 11, fontWeight: 800 }}>{item.note}</span></div>
              <div style={{ position: 'relative', height: 18, overflow: 'hidden', borderRadius: 999, background: '#e2e8f0' }}><i style={{ display: 'block', width: String(width) + '%', height: '100%', borderRadius: 999, background: toneGradient(item.tone), boxShadow: '0 8px 18px rgba(37,99,235,.16)' }} /></div>
              <div style={{ textAlign: 'right' }}><strong style={{ display: 'block', fontSize: 17, fontWeight: 950 }}>{formatNumber(value)}</strong><span style={{ color: '#64748b', fontSize: 10, fontWeight: 850 }}>{formatPercent(share, 1)}</span></div>
            </button>
          );
        })}
      </div>
    );
  };

  const getSoftwareClassificationGraphRows = () => {
    const rows = getSoftwareEvidenceRows();
    return buildSoftwareGraphRows(rows, [
      { label: 'Business', target: 'Business Software', note: 'Microsoft, Adobe and business apps', tone: 'green', value: numberOrFallback(software.businessSoftware), matcher: (row) => softwareClassificationMatches(row, 'business') },
      { label: 'Remote Control', target: 'Remote Control', note: 'AnyDesk, TeamViewer, VNC, remote tools', tone: 'red', value: numberOrFallback(software.remoteControlSoftware), matcher: (row) => softwareClassificationMatches(row, 'remote') },
      { label: 'Antivirus', target: 'Antivirus', note: 'Endpoint protection tools', tone: 'cyan', value: numberOrFallback(software.antivirusSoftware), matcher: (row) => softwareClassificationMatches(row, 'antivirus') },
      { label: 'Web Browser', target: 'Web Browsers', note: 'Chrome, Edge, Firefox and browsers', tone: 'blue', value: numberOrFallback(software.browserSoftware), matcher: (row) => softwareClassificationMatches(row, 'browser') },
      { label: 'Gaming', target: 'Gaming Software', note: 'Non-business games', tone: 'amber', value: numberOrFallback(software.gamingSoftware), matcher: (row) => softwareClassificationMatches(row, 'gaming') },
      { label: 'Unclassified', target: 'Unclassified', note: 'Needs category cleanup', tone: 'slate', value: numberOrFallback(software.unclassifiedSoftware), matcher: (row) => softwareClassificationMatches(row, 'unclassified') },
    ]);
  };

  const renderSoftwareLevel2Analytics = () => {
    const rows = getSoftwareEvidenceRows();
    const totalInstallations = Math.max(numberOrFallback(software.totalInstallations), rows.length, 0);
    const uniqueTitles = Math.max(numberOrFallback(software.uniqueSoftware), uniqueSoftwareRows(rows).length, 0);
    const eolWatch = numberOrFallback(software.eolApplications) + numberOrFallback(software.eosApplications);
    const unsupportedApps = numberOrFallback(software.unsupportedApplications);
    const unclassifiedCount = numberOrFallback(software.unclassifiedSoftware);
    const classifiedCount = Math.max(totalInstallations - unclassifiedCount, 0);
    const classificationRows = getSoftwareClassificationGraphRows();
    const majorRows = buildSoftwareGraphRows(rows, [
      { label: 'Microsoft Office', target: 'Microsoft Office', note: 'Office desktop clients', tone: 'blue', matcher: (row) => softwareMajorFamilyMatches(row, 'Microsoft Office') },
      { label: 'Microsoft 365', target: 'Microsoft 365', note: 'M365, Teams, OneDrive', tone: 'purple', matcher: (row) => softwareMajorFamilyMatches(row, 'Microsoft 365') },
      { label: 'Adobe', target: 'Adobe', note: 'Acrobat and Creative Cloud', tone: 'red', matcher: (row) => softwareMajorFamilyMatches(row, 'Adobe') },
      { label: 'Google Chrome', target: 'Google Chrome', note: 'Chrome browser family', tone: 'green', matcher: (row) => softwareMajorFamilyMatches(row, 'Google Chrome') },
      { label: 'Firefox', target: 'Firefox', note: 'Mozilla Firefox family', tone: 'amber', matcher: (row) => softwareMajorFamilyMatches(row, 'Firefox') },
    ]);
    const overviewCards = [
      { label: 'Installations', value: totalInstallations, note: 'Total software records', target: 'Installations', tone: 'purple' as CardTone, icon: Database },
      { label: 'Unique Software', value: uniqueTitles, note: 'Distinct software titles', target: 'Unique Software', tone: 'blue' as CardTone, icon: BarChart3 },
      { label: 'Business Software', value: numberOrFallback(software.businessSoftware), note: 'Business and productivity tools', target: 'Business Software', tone: 'green' as CardTone, icon: Gauge },
      { label: 'Needs Review', value: unclassifiedCount + eolWatch + unsupportedApps, note: 'Cleanup or lifecycle risk', target: unclassifiedCount > 0 ? 'Unclassified' : 'EOL/EOS Watch', tone: (unclassifiedCount + eolWatch + unsupportedApps) > 0 ? 'amber' as CardTone : 'green' as CardTone, icon: ShieldAlert },
    ];
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
                <span style={{ minWidth: 0 }}><strong style={{ display: 'block', color: '#64748b', fontSize: 10, fontWeight: 950, letterSpacing: '.08em', textTransform: 'uppercase' }}>{item.label}</strong><strong style={{ display: 'block', marginTop: 5, color: '#0f172a', fontSize: 23, lineHeight: 1, fontWeight: 950 }}>{formatNumber(item.value)}</strong><small style={{ display: 'block', marginTop: 6, color: '#64748b', fontSize: 11, fontWeight: 800 }}>{item.note}</small></span>
                <ChevronRight size={16} color="#94a3b8" />
              </button>
            );
          })}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.05fr) minmax(360px, .95fr)', gap: 16, alignItems: 'stretch' }}>
          <Panel title="Classification & Distribution" subtitle="Business tools, remote control, antivirus, browser, gaming and unclassified software. Click any segment to open details." icon={BarChart3}>{renderSoftwareStackedDistribution(classificationRows, Math.max(totalInstallations, 1))}</Panel>
          <Panel title="Software Review Queue" subtitle="Focus on cleanup and application lifecycle risk before it becomes compliance exposure." icon={ShieldAlert}>{renderSoftwareHorizontalBars(governanceRows, Math.max(totalInstallations, 1))}</Panel>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, alignItems: 'stretch' }}>
          <Panel title="Major Software Watch" subtitle="Microsoft Office, Microsoft 365, Adobe, Google Chrome and Firefox. Click any bar to view matching software records." icon={CalendarDays}>{renderSoftwareHorizontalBars(majorRows, Math.max(totalInstallations, 1))}</Panel>
          <Panel title="Software Categories" subtitle="Top software categories from inventory. Click a category to view the matching records." icon={Database}>{renderBreakdownDrillCards(software.topCategories, 'software', 'No software category data yet.')}</Panel>
        </div>
      </div>
    );
  };

  const renderSoftwareInventoryTable`;

const ENHANCED_SOFTWARE_LEVEL2 = String.raw`    if (view === 'software') {
      return renderSoftwareLevel2Analytics();
    }

    if (view === 'network') {`;

const ENHANCED_SOFTWARE_LEVEL3 = String.raw`    if (view === 'software') {
      const selectedRows = resolveSoftwareEvidenceRows(item);
      const selectedLifecycle = software.lifecycleWatch.find((row) => String(row.name || '').toLowerCase() === String(item || '').toLowerCase());
      const expectedCount = getSoftwareExpectedCount(item);

      return (
        <div className="itops-pro-drawer-stack">
          <DrilldownTrace domain="Software" stage="evidence" selected={selectedLabel} />
          {selectedLifecycle && (
            <Panel title={selectedLifecycle.name + ' Lifecycle'} subtitle="Application lifecycle signal from backend lookup." icon={CalendarDays}>
              <div className="itops-pro-summary-row four">
                <MiniMetric label="Installs" value={formatNumber(selectedLifecycle.installs)} tone="purple" />
                <MiniMetric label="Unique Titles" value={formatNumber(selectedLifecycle.uniqueTitles)} tone="blue" />
                <MiniMetric label="Status" value={selectedLifecycle.lifecycleStatus || '-'} tone={getSoftwareLifecycleTone(selectedLifecycle)} />
                <MiniMetric label="EOL/EOS Date" value={selectedLifecycle.eolDate || selectedLifecycle.eosDate || '-'} tone="amber" />
              </div>
            </Panel>
          )}
          {expectedCount > 0 && selectedRows.length === 0 && (
            <div className="itops-pro-story-panel level3" style={{ borderColor: '#fbbf24', background: '#fffbeb' }}>
              <strong>Summary count exists but detail rows were not included in the current dashboard payload.</strong>
              <p>The selected software type has {formatNumber(expectedCount)} record(s). Backend needs to return matching softwareRows for this selected group.</p>
            </div>
          )}
          <Panel title="Software Records" subtitle="Filtered rows for the selected software statistic." icon={Database}>{renderSoftwareInventoryTable(item)}</Panel>
        </div>
      );
    }

    if (view === 'network') {`;

export function itopsSoftwareDrilldownTransform(): Plugin {
  return {
    name: 'itops-software-drilldown-transform',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').endsWith('/src/pages/Dashboard.tsx')) return null;

      let next = code;

      next = next.replace(
        /  const resolveSoftwareEvidenceRows = \(item = ''\) => \{[\s\S]*?\n  \};\n\n  const renderSoftwareInventoryTable/,
        ENHANCED_SOFTWARE_HELPERS,
      );

      next = next.replace(
        /    if \(view === 'software'\) \{[\s\S]*?\n    \}\n\n    if \(view === 'network'\) \{/,
        ENHANCED_SOFTWARE_LEVEL2,
      );

      next = next.replace(
        /    if \(view === 'software'\) \{\n      const selectedRows = resolveSoftwareEvidenceRows\(item\);[\s\S]*?\n    \}\n\n    if \(view === 'network'\) \{/,
        ENHANCED_SOFTWARE_LEVEL3,
      );

      if (next === code) return null;
      return { code: next, map: null };
    },
  };
}
