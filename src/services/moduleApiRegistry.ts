export type ModuleServiceKey =
  | "auth"
  | "dashboard"
  | "managementDashboard"
  | "itOperations"
  | "hardware"
  | "software"
  | "softwareDistribution"
  | "network"
  | "appMetering"
  | "internetMetering"
  | "restriction"
  | "patch"
  | "report"
  | "serviceDesk"
  | "settings"
  | "taskList";

export type ModuleKey = ModuleServiceKey;

export const moduleApiRegistry = {
  auth: () => import("./authService"),
  dashboard: () => import("./dashboardService"),
  managementDashboard: () => import("./managementDashboardService"),
  itOperations: () => import("./itOperationService"),
  hardware: () => import("./hardwareService"),
  software: () => import("./softwareService"),
  softwareDistribution: () => import("./softwareDistributionService"),
  network: () => import("./networkService"),
  appMetering: () => import("./appMeteringService"),
  internetMetering: () => import("./internetMeteringService"),
  restriction: () => import("./restrictionService"),
  patch: () => import("./patchService"),
  report: () => import("./reportService"),
  serviceDesk: () => import("./ServiceDeskService"),
  settings: () => import("./settingsService"),
  taskList: () => import("./taskListService"),
} satisfies Record<ModuleServiceKey, () => Promise<any>>;

export async function loadModuleService(module: ModuleServiceKey) {
  const loader = moduleApiRegistry[module];
  if (!loader) throw new Error(`Unknown module service: ${module}`);
  return loader();
}

export default moduleApiRegistry;
