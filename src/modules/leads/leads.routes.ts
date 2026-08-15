import { Router } from "express";
import { leadsController } from "./leads.controller.js";
import {
  createLeadSchema,
  leadIdParamSchema,
  listLeadsQuerySchema,
  replyLeadSchema,
  updateLeadSchema,
} from "./leads.validation.js";
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

router.get(
  "/:id",
  authenticate,
  authorizePermission("leads:read"),
  validate(leadIdParamSchema, "params"),
  leadsController.get,
);

router.patch(
  "/:id",
  authenticate,
  authorizePermission("leads:write"),
  validate(leadIdParamSchema, "params"),
  validate(updateLeadSchema),
  leadsController.update,
);

router.post(
  "/:id/reply",
  authenticate,
  authorizePermission("leads:write"),
  validate(leadIdParamSchema, "params"),
  validate(replyLeadSchema),
  leadsController.reply,
);

export { router as leadsRouter };
