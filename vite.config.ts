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

      const oldSoftwareLevelTwoGrid = `        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(360px, .9fr)', gap: 16, alignItems: 'stretch' }}>
          <Panel title="Software Classification Distribution" subtitle="Portfolio split by business, remote control, antivirus, browser, gaming and unclassified records. Click any segment to open the matching list." icon={BarChart3}>{renderSoftwareStackedDistribution(classificationRows, totalInstallations)}</Panel>
          <Panel title="Lifecycle Exposure" subtitle="Application support posture from lifecycle lookup. The donut highlights EOL/EOS and unsupported exposure." icon={ShieldAlert}>{renderSoftwareLifecycleDonut(lifecycleRows, totalInstallations)}</Panel>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, alignItems: 'stretch' }}>
          <Panel title="Major Application EOL/EOS Watch" subtitle="Microsoft Office, Microsoft 365, Adobe, Google Chrome and Firefox coverage with click-through detail." icon={CalendarDays}>{renderSoftwareHorizontalBars(majorRows, totalInstallations)}</Panel>
          <Panel title="Software Governance Balance" subtitle="Shows the relationship between classified inventory, cleanup backlog and lifecycle risk." icon={Gauge}>{renderSoftwareHorizontalBars(governanceRows, totalInstallations)}</Panel>
        </div>`;

      const newSoftwareLevelTwoGrid = `        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, alignItems: 'stretch' }}>
          <Panel title="Lifecycle Exposure" subtitle="Application support posture from lifecycle lookup. The donut highlights EOL/EOS and unsupported exposure." icon={ShieldAlert}>{renderSoftwareLifecycleDonut(lifecycleRows, totalInstallations)}</Panel>
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
