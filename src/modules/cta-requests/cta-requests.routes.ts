import { Router } from "express";
import { ctaRequestsController } from "./cta-requests.controller.js";
import {
  attachCtaAnalysisSchema,
  createCtaRequestSchema,
  ctaRequestIdParamSchema,
  listCtaRequestsQuerySchema,
  updateCtaRequestSchema,
} from "./cta-requests.validation.js";
import { validate } from "@/middleware/validate.js";
import { authenticate } from "@/middleware/authenticate.js";
import { authorizePermission } from "@/middleware/authorize.js";
import { ctaRequestsRateLimiter } from "@/middleware/rateLimiter.js";

const router = Router();

router.post(
  "/",
  ctaRequestsRateLimiter,
  validate(createCtaRequestSchema),
  ctaRequestsController.create,
);

router.patch(
  "/:id/analysis",
  validate(ctaRequestIdParamSchema, "params"),
  validate(attachCtaAnalysisSchema),
  ctaRequestsController.attachAnalysis,
);

router.get(
  "/",
  authenticate,
  authorizePermission("cta:manage"),
  validate(listCtaRequestsQuerySchema, "query"),
  ctaRequestsController.listAdmin,
);

router.get(
  "/:id",
  authenticate,
  authorizePermission("cta:manage"),
  validate(ctaRequestIdParamSchema, "params"),
  ctaRequestsController.getAdmin,
);

router.patch(
  "/:id",
  authenticate,
  authorizePermission("cta:manage"),
  validate(ctaRequestIdParamSchema, "params"),
  validate(updateCtaRequestSchema),
  ctaRequestsController.updateStatus,
);

export { router as ctaRequestsRouter };
