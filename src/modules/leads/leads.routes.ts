import { Router } from "express";
import { leadsController } from "./leads.controller.js";
import { createLeadSchema, listLeadsQuerySchema } from "./leads.validation.js";
import { validate } from "@/middleware/validate.js";
import { optionalAuthenticate, authenticate } from "@/middleware/authenticate.js";
import { authorizePermission } from "@/middleware/authorize.js";
import { leadsRateLimiter } from "@/middleware/rateLimiter.js";

const router = Router();

router.post(
  "/",
  leadsRateLimiter,
  optionalAuthenticate,
  validate(createLeadSchema),
  leadsController.create,
);

router.get(
  "/",
  authenticate,
  authorizePermission("leads:read"),
  validate(listLeadsQuerySchema, "query"),
  leadsController.list,
);

export { router as leadsRouter };
