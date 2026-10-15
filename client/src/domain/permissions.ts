import type { Role } from "./types";

// Lightweight, UI-only role gating for this prototype. There is no backend
// here to actually enforce any of this — it only hides/disables actions so
// the demo reads the way a real RBAC'd app would. A real implementation
// must re-check every one of these server-side.

const OPS_ROLES: Role[] = ["super_admin", "company_admin", "ops_manager", "dispatcher", "load_planner"];
const FLEET_ROLES: Role[] = ["super_admin", "company_admin", "ops_manager", "fleet_manager"];
const BILLING_ROLES: Role[] = ["super_admin", "company_admin", "billing_finance"];
const ADMIN_ROLES: Role[] = ["super_admin", "company_admin"];
const PORTAL_ROLES: Role[] = ["driver", "customer", "carrier_admin"];

export function canManageLoads(role: Role): boolean {
  return OPS_ROLES.includes(role);
}

export function canManageFleet(role: Role): boolean {
  return FLEET_ROLES.includes(role);
}

export function canManageBilling(role: Role): boolean {
  return BILLING_ROLES.includes(role);
}

export function canManageUsers(role: Role): boolean {
  return ADMIN_ROLES.includes(role);
}

export function canResolveExceptions(role: Role): boolean {
  return OPS_ROLES.includes(role) || role === "compliance_manager";
}

export function isPortalRole(role: Role): boolean {
  return PORTAL_ROLES.includes(role);
}

export function isReadOnlyRole(role: Role): boolean {
  return role === "auditor";
}
