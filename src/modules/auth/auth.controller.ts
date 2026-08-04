import type { Request, Response, NextFunction } from "express";
import { authService } from "./auth.service.js";
import { successResponse } from "@/utils/apiResponse.js";
import { env } from "@/config/env.js";

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 2 * 60 * 60 * 1000, // 2 hours
  path: "/",
};

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(env.REFRESH_COOKIE_NAME, token, REFRESH_COOKIE_OPTIONS);
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(env.REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export const authController = {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.register(req.body);
      setRefreshCookie(res, result.refreshToken);
      res.status(201).json(
        successResponse({
          user: result.user,
          accessToken: result.accessToken,
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login(req.body);
      setRefreshCookie(res, result.refreshToken);
      res.json(
        successResponse({
          user: result.user,
          accessToken: result.accessToken,
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.[env.REFRESH_COOKIE_NAME] as string | undefined;
      if (!refreshToken) {
        res.status(401).json({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Refresh token required" },
        });
        return;
      }

      const result = await authService.refresh(refreshToken);
      setRefreshCookie(res, result.refreshToken);
      res.json(
        successResponse({
          user: result.user,
          accessToken: result.accessToken,
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.[env.REFRESH_COOKIE_NAME] as string | undefined;
      await authService.logout(refreshToken);
      clearRefreshCookie(res);
      res.json(successResponse({ message: "Logged out successfully" }));
    } catch (error) {
      next(error);
    }
  },
};
