import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "@/lib/jwt.js";
import { AppError } from "@/utils/appError.js";

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const token = authHeader.slice(7);
    req.user = verifyAccessToken(token);
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    next(new AppError("Invalid or expired token", 401, "UNAUTHORIZED"));
  }
}

export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      req.user = verifyAccessToken(token);
    }

    next();
  } catch {
    next();
  }
}
