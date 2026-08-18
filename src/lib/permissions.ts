import { Role } from "@prisma/client";

export type Permission =
  | "leads:read"
  | "leads:write"
  | "users:read"
  | "users:write"
  | "crm:access"
  | "orders:manage"
  | "marketplace:write"
  | "reviews:manage"
  | "promos:manage"
  | "cta:manage";

const ALL_PERMISSIONS: Permission[] = [
  "leads:read",
  "leads:write",
  "users:read",
  "users:write",
  "crm:access",
  "orders:manage",
  "marketplace:write",
  "reviews:manage",
  "promos:manage",
  "cta:manage",
];

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
  SUPER_ADMIN: ALL_PERMISSIONS,
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role].includes(permission);
}

export function hasRole(role: Role, allowed: Role[]): boolean {
  return allowed.includes(role);
}

export function canAccessCRM(role: Role): boolean {
  return hasRole(role, [Role.STAFF, Role.ADMIN, Role.SUPER_ADMIN]);
}

export function canAccessSuperAdmin(role: Role): boolean {
  return role === Role.SUPER_ADMIN;
}
