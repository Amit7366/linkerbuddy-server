import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { corsOptions } from "@/config/cors.js";
import { env } from "@/config/env.js";
import { apiRouter } from "@/routes/index.js";
import { globalRateLimiter } from "@/middleware/rateLimiter.js";
import { requestLogger } from "@/middleware/requestLogger.js";
import { errorHandler, notFound } from "@/middleware/errorHandler.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(requestLogger);
  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(express.json({ limit: "10kb" }));
  app.use(express.urlencoded({ extended: true, limit: "10kb" }));
  app.use(cookieParser());
  app.use(globalRateLimiter);

  app.get("/", (_req, res) => {
    res.json({
      success: true,
      data: {
        name: "Landing API",
        version: "1.0.0",
        docs: "/api/v1/health",
      },
    });
  });

  app.use("/api/v1", apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export { env };
