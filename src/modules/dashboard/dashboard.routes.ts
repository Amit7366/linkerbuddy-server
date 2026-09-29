import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticate } from "@/middleware/authenticate.js";
import { authorizeRoles } from "@/middleware/authorize.js";
import { validate } from "@/middleware/validate.js";
import { dashboardController } from "./dashboard.controller.js";
import { visitorsQuerySchema } from "./dashboard.validation.js";

const router = Router();

router.get(
  "/overview",
  authenticate,
  authorizeRoles(Role.SUPER_ADMIN),
  dashboardController.getOverview,
);

router.get(
  "/visitors/live",
  authenticate,
  authorizeRoles(Role.SUPER_ADMIN),
  dashboardController.getLiveVisitors,
);

router.get(
  "/visitors",
  authenticate,
  authorizeRoles(Role.SUPER_ADMIN),
  validate(visitorsQuerySchema, "query"),
  dashboardController.getVisitors,
);

export { router as dashboardRouter };
