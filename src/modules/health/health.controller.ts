import type { Request, Response } from "express";
import { successResponse } from "@/utils/apiResponse.js";
import { prisma } from "@/lib/prisma.js";

export const healthController = {
  async check(_req: Request, res: Response): Promise<void> {
    let dbStatus = "ok";

    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = "error";
    }

    const status = dbStatus === "ok" ? "healthy" : "degraded";

    res.status(dbStatus === "ok" ? 200 : 503).json(
      successResponse({
        status,
        timestamp: new Date().toISOString(),
        services: { database: dbStatus },
      }),
    );
  },
};
