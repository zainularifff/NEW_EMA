import { loadModuleService, type ModuleServiceKey } from "./moduleApiRegistry";

type LoadableModule = {
  default?: {
    loadInitialData?: (...args: any[]) => Promise<any> | any;
    loadSection?: (...args: any[]) => Promise<any> | any;
    getData?: (...args: any[]) => Promise<any> | any;
  };
  loadInitialData?: (...args: any[]) => Promise<any> | any;
  loadSection?: (...args: any[]) => Promise<any> | any;
  getData?: (...args: any[]) => Promise<any> | any;
};

export type ModuleDataResult<T = Record<string, unknown>> = T;

type LoadModuleDataOptions = {
  params?: Record<string, unknown>;
  force?: boolean;
  signal?: AbortSignal;
};

const moduleDataCache = new Map<string, unknown>();

function cacheKey(module: ModuleServiceKey, params?: Record<string, unknown>) {
  return `${module}:${JSON.stringify(params || {})}`;
}

export function clearModuleCache(module?: ModuleServiceKey) {
  if (!module) {
    moduleDataCache.clear();
    return;
  }

  const prefix = `${module}:`;
  Array.from(moduleDataCache.keys()).forEach((key) => {
    if (key.startsWith(prefix)) moduleDataCache.delete(key);
  });
}

export async function loadModuleInitialData(module: ModuleServiceKey, ...args: any[]) {
  const service = (await loadModuleService(module)) as LoadableModule;
  const loader = service.loadInitialData || service.getData || service.default?.loadInitialData || service.default?.getData;
  if (!loader) return null;
  return loader(...args);
}

export async function loadModuleSection(module: ModuleServiceKey, section: string, ...args: any[]) {
  const service = (await loadModuleService(module)) as LoadableModule;
  const loader = service.loadSection || service.default?.loadSection;
  if (!loader) return loadModuleInitialData(module, section, ...args);
  return loader(section, ...args);
}

export async function loadModuleData<T = Record<string, unknown>>(
  module: ModuleServiceKey,
  options: LoadModuleDataOptions = {},
): Promise<ModuleDataResult<T>> {
  if (options.signal?.aborted) throw new DOMException("Request cancelled", "CanceledError");

  const key = cacheKey(module, options.params);
  if (!options.force && moduleDataCache.has(key)) {
    return moduleDataCache.get(key) as ModuleDataResult<T>;
  }

  const result = await loadModuleInitialData(module, options.params || {});
  if (options.signal?.aborted) throw new DOMException("Request cancelled", "CanceledError");
  moduleDataCache.set(key, result);
  return result as ModuleDataResult<T>;
}

const moduleDataService = {
  clearModuleCache,
  loadModuleData,
  loadModuleInitialData,
  loadModuleSection,
};

export default moduleDataService;
