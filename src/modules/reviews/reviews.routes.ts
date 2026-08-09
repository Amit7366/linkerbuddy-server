import { Router } from "express";
import { reviewsController } from "./reviews.controller.js";
import {
  createReviewSchema,
  listAdminReviewsQuerySchema,
  listPublicReviewsQuerySchema,
  reviewIdParamSchema,
  updateAdminReviewSchema,
} from "./reviews.validation.js";
import { validate } from "@/middleware/validate.js";
import { authenticate } from "@/middleware/authenticate.js";
import { authorizePermission } from "@/middleware/authorize.js";
import {
  reviewsReadRateLimiter,
  reviewsWriteRateLimiter,
} from "@/middleware/rateLimiter.js";

const router = Router();

router.get(
  "/",
  reviewsReadRateLimiter,
  validate(listPublicReviewsQuerySchema, "query"),
  reviewsController.listPublic,
);

router.get("/me", authenticate, reviewsController.listMine);

router.post(
  "/",
  reviewsWriteRateLimiter,
  authenticate,
  validate(createReviewSchema),
  reviewsController.create,
);

router.get(
  "/admin",
  authenticate,
  authorizePermission("reviews:manage"),
  validate(listAdminReviewsQuerySchema, "query"),
  reviewsController.listAdmin,
);

router.patch(
  "/admin/:id",
  authenticate,
  authorizePermission("reviews:manage"),
  validate(reviewIdParamSchema, "params"),
  validate(updateAdminReviewSchema),
  reviewsController.updateAdmin,
);

router.delete(
  "/admin/:id",
  authenticate,
  authorizePermission("reviews:manage"),
  validate(reviewIdParamSchema, "params"),
  reviewsController.deleteAdmin,
);

export { router as reviewsRouter };
