import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticate } from "@/middleware/authenticate.js";
import { authorizeRoles } from "@/middleware/authorize.js";
import { dashboardController } from "./dashboard.controller.js";

const router = Router();

router.get(
  "/overview",
  authenticate,
  authorizeRoles(Role.SUPER_ADMIN),
  dashboardController.getOverview,
);

export { router as dashboardRouter };
