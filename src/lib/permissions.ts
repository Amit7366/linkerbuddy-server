import { Role } from "@prisma/client";

export type Permission =
  | "leads:read"
  | "leads:write"
  | "users:read"
  | "users:write"
  | "crm:access"
  | "orders:manage";

const rolePermissions: Record<Role, Permission[]> = {
  CUSTOMER: [],
  STAFF: ["leads:read", "leads:write", "crm:access", "users:read"],
  ADMIN: [
    "leads:read",
    "leads:write",
    "crm:access",
    "users:read",
    "users:write",
    "orders:manage",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role].includes(permission);
}

export function hasRole(role: Role, allowed: Role[]): boolean {
  return allowed.includes(role);
}

export function canAccessCRM(role: Role): boolean {
  return hasRole(role, [Role.STAFF, Role.ADMIN]);
}
