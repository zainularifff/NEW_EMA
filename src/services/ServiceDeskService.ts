export * from "./IncidentService";
export * from "./UserService";
export * from "./AssetService";
export * from "./KnowledgeBaseService";
export * from "./EngineerAvailabilityService";

import { incidents, incidentConfig, incidentCategories } from "./IncidentService";
import { users, roles } from "./UserService";
import { assets } from "./AssetService";
import { knowledgeBase } from "./KnowledgeBaseService";
import { engineerAvailability } from "./EngineerAvailabilityService";

export async function loadInitialData() {
  const [incidentRows, config, workingHours, visibility, roleRows, userRows, categoryRows, kbRows] = await Promise.all([
    incidents.getAll(),
    incidentConfig.getAll(),
    incidentConfig.getWorkingHours(),
    incidentConfig.getVisibilityConfig(),
    roles.getAll(),
    users.getAll(),
    incidentCategories.getAll(),
    knowledgeBase.getAll(),
  ]);

  return {
    incidents: incidentRows,
    config,
    workingHours,
    visibility,
    roles: roleRows,
    users: userRows,
    categories: categoryRows,
    knowledgeBase: kbRows,
  };
}

export default { incidents, incidentConfig, incidentCategories, users, roles, assets, knowledgeBase, engineerAvailability, loadInitialData };
