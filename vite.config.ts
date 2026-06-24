import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { itopsSoftwareDrilldownTransform } from './src/utils/itopsSoftwareDrilldownTransform';
import { softwareComplianceSimpleDetailTransform } from './src/utils/softwareComplianceSimpleDetailTransform';
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
      replacements.forEach(([from, to]) => { next = next.split(from).join(to); });
      return next === code ? null : { code: next, map: null };
    },
  };
}

export default defineConfig({
  plugins: [
    itopsSoftwareDrilldownTransform(),
    softwareComplianceSimpleDetailTransform(),
    hardwarePaginationFixTransform(),
    dashboardUiPatch(),
    softwareTrendRowsSafePatch(),
    dashboardEnglishWordingPatch(),
    dashboardFocusCardOrderPatch(),
    dashboardFocusCardColorPatch(),
    react(),
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
