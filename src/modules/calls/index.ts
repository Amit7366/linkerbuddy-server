import { Router } from "express";
import { callsController } from "./calls.controller.js";
import {
  callIdParamSchema,
  createCallSchema,
  listCallsQuerySchema,
  listSlotsQuerySchema,
  manageTokenParamSchema,
  putAvailabilitySchema,
  rescheduleCallSchema,
  updateCallSchema,
} from "./calls.validation.js";
import { validate } from "@/middleware/validate.js";
import { optionalAuthenticate, authenticate } from "@/middleware/authenticate.js";
import { authorizePermission } from "@/middleware/authorize.js";
import { callsReadRateLimiter, leadsRateLimiter } from "@/middleware/rateLimiter.js";

const router = Router();

router.get(
  "/slots",
  callsReadRateLimiter,
  validate(listSlotsQuerySchema, "query"),
  callsController.slots,
);

router.post(
  "/",
  leadsRateLimiter,
  optionalAuthenticate,
  validate(createCallSchema),
  callsController.create,
);

router.get(
  "/manage/:token",
  callsReadRateLimiter,
  validate(manageTokenParamSchema, "params"),
  callsController.getManage,
);

router.post(
  "/manage/:token/cancel",
  leadsRateLimiter,
  validate(manageTokenParamSchema, "params"),
  callsController.cancel,
);

router.post(
  "/manage/:token/reschedule",
  leadsRateLimiter,
  validate(manageTokenParamSchema, "params"),
  validate(rescheduleCallSchema),
  callsController.reschedule,
);

router.get(
  "/availability",
  authenticate,
  authorizePermission("crm:access"),
  callsController.getAvailability,
);

router.put(
  "/availability",
  authenticate,
  authorizePermission("leads:write"),
  validate(putAvailabilitySchema),
  callsController.putAvailability,
);

router.get(
  "/",
  authenticate,
  authorizePermission("leads:read"),
  validate(listCallsQuerySchema, "query"),
  callsController.list,
);

router.patch(
  "/:id",
  authenticate,
  authorizePermission("leads:write"),
  validate(callIdParamSchema, "params"),
  validate(updateCallSchema),
  callsController.update,
);

export { router as callsRouter };
