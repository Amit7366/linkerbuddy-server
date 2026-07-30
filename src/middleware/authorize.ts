import type { Request, Response, NextFunction } from "express";
import type { Role } from "@prisma/client";
import type { Permission } from "@/lib/permissions.js";
import { hasPermission, hasRole } from "@/lib/permissions.js";
import { AppError } from "@/utils/appError.js";

export function authorizeRoles(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError("Authentication required", 401, "UNAUTHORIZED"));
      return;
    }

    if (!hasRole(req.user.role, roles)) {
      next(new AppError("Insufficient permissions", 403, "FORBIDDEN"));
      return;
    }

    next();
  };
}

export function authorizePermission(permission: Permission) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError("Authentication required", 401, "UNAUTHORIZED"));
      return;
    }

    if (!hasPermission(req.user.role, permission)) {
      next(new AppError("Insufficient permissions", 403, "FORBIDDEN"));
      return;
    }

    next();
  };
}
