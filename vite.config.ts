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
          <Panel title="Software Compliance Rate (%)" subtitle="Peratusan perisian legal berdasarkan Software Policy. Contoh: 92% Legal." icon={ShieldCheck}>{renderSoftwarePolicyDonut(policyRows, policyTotalSoftware)}</Panel>
          <Panel title="Classification & Distribution" subtitle="Software Category Distribution dan Top 5 Most Installed Software." icon={Layers3}>{renderSoftwareClassificationDistributionPanel(classificationRows.length ? classificationRows : software.topCategories.map((row) => ({ label: row.name, value: row.value, target: row.name, note: 'Software category', tone: 'blue' as CardTone })), totalInstallations, topInstalledRows)}</Panel>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, alignItems: 'stretch' }}>
          <Panel title="Security & Compliance" subtitle="Software Lifecycle Status dan EOL/EOS breakdown." icon={ShieldAlert}>{renderSecurityCompliancePanel(lifecycleStatusRows)}</Panel>
          <Panel title="Major Application EOL/EOS Watch" subtitle="Microsoft Office, Microsoft 365, Adobe, Google Chrome and Firefox coverage with click-through detail." icon={CalendarDays}>{renderSoftwareHorizontalBars(majorRows, totalInstallations)}</Panel>
        </div>`;

      const requestedLayout = `        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, alignItems: 'stretch' }}>
          <Panel title="Software Compliance Rate (%)" subtitle="Peratusan perisian legal berdasarkan Software Policy. Contoh: 92% Legal." icon={ShieldCheck}>{renderSoftwarePolicyDonut(policyRows, policyTotalSoftware)}</Panel>
          <Panel title="Security & Compliance" subtitle="Software Lifecycle Status dan EOL/EOS breakdown." icon={ShieldAlert}>{renderSecurityCompliancePanel(lifecycleStatusRows)}</Panel>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, alignItems: 'stretch' }}>
          <Panel title="Classification & Distribution" subtitle="Software Category Distribution dan Top 5 Most Installed Software." icon={Layers3}>{renderSoftwareClassificationDistributionPanel(classificationRows.length ? classificationRows : software.topCategories.map((row) => ({ label: row.name, value: row.value, target: row.name, note: 'Software category', tone: 'blue' as CardTone })), totalInstallations, topInstalledRows)}</Panel>
          <Panel title="Major Application EOL/EOS Watch" subtitle="Microsoft Office, Microsoft 365, Adobe, Google Chrome and Firefox coverage with click-through detail." icon={CalendarDays}>{renderSoftwareHorizontalBars(majorRows, totalInstallations)}</Panel>
        </div>`;

      const next = code.split(currentLayout).join(requestedLayout);
      return next === code ? null : { code: next, map: null };
    },
  };
}

export default defineConfig({
  plugins: [itopsSoftwareDrilldownTransform(), hardwarePaginationFixTransform(), dashboardUiPatch(), softwareLevel2PanelOrderPatch(), dashboardFocusCardOrderPatch(), dashboardFocusCardColorPatch(), react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
