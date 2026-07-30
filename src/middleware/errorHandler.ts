import type { Request, Response, NextFunction } from "express";
import { AppError } from "@/utils/appError.js";
import { errorResponse } from "@/utils/apiResponse.js";
import { env } from "@/config/env.js";
import { logger } from "@/lib/logger.js";

export function notFound(_req: Request, res: Response): void {
  res.status(404).json(errorResponse("NOT_FOUND", "Resource not found"));
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json(errorResponse(err.code, err.message));
    return;
  }

  logger.error({ err }, "Unhandled error");

  const message =
    env.NODE_ENV === "production" ? "Internal server error" : err.message;

  res.status(500).json(errorResponse("INTERNAL_ERROR", message));
}
