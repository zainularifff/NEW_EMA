import { loadModuleService, type ModuleServiceKey } from "./moduleApiRegistry";

type LoadableModule = {
  default?: {
    loadInitialData?: (...args: any[]) => Promise<any> | any;
    loadSection?: (...args: any[]) => Promise<any> | any;
  };
  loadInitialData?: (...args: any[]) => Promise<any> | any;
  loadSection?: (...args: any[]) => Promise<any> | any;
};

export async function loadModuleInitialData(module: ModuleServiceKey, ...args: any[]) {
  const service = (await loadModuleService(module)) as LoadableModule;
  const loader = service.loadInitialData || service.default?.loadInitialData;
  if (!loader) return null;
  return loader(...args);
}

export async function loadModuleSection(module: ModuleServiceKey, section: string, ...args: any[]) {
  const service = (await loadModuleService(module)) as LoadableModule;
  const loader = service.loadSection || service.default?.loadSection;
  if (!loader) return loadModuleInitialData(module, section, ...args);
  return loader(section, ...args);
}

const moduleDataService = { loadModuleInitialData, loadModuleSection };
export default moduleDataService;
