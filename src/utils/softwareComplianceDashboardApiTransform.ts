import type { Plugin } from 'vite';

export function softwareComplianceDashboardApiTransform(): Plugin {
  return {
    name: 'software-compliance-dashboard-api-transform',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').endsWith('/src/pages/Dashboard.tsx')) return null;

      let next = code;

      next = next
        .split("buildApiUrl('/api/settings/software-policy/policies')")
        .join("buildApiUrl('/api/dashboard/software-compliance/summary')");

      return next === code ? null : { code: next, map: null };
    },
  };
}
