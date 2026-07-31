import { Router } from "express";
import { marketplaceController } from "./marketplace.controller.js";
import {
  createListingSchema,
  updateListingSchema,
  listListingsQuerySchema,
  listingIdParamSchema,
} from "./marketplace.validation.js";
import { validate } from "@/middleware/validate.js";
import { authenticate } from "@/middleware/authenticate.js";
import { authorizePermission } from "@/middleware/authorize.js";
import { marketplaceWriteRateLimiter, marketplaceReadRateLimiter } from "@/middleware/rateLimiter.js";

const router = Router();

router.get(
  "/",
  marketplaceReadRateLimiter,
  validate(listListingsQuerySchema, "query"),
  marketplaceController.list,
);

router.get(
  "/:id",
  marketplaceReadRateLimiter,
  validate(listingIdParamSchema, "params"),
  marketplaceController.getById,
);

router.post(
  "/",
  marketplaceWriteRateLimiter,
  authenticate,
  authorizePermission("marketplace:write"),
  validate(createListingSchema),
  marketplaceController.create,
);

router.patch(
  "/:id",
  marketplaceWriteRateLimiter,
  authenticate,
  authorizePermission("marketplace:write"),
  validate(listingIdParamSchema, "params"),
  validate(updateListingSchema),
  marketplaceController.update,
);

router.delete(
  "/:id",
  marketplaceWriteRateLimiter,
  authenticate,
  authorizePermission("marketplace:write"),
  validate(listingIdParamSchema, "params"),
  marketplaceController.remove,
);

export { router as marketplaceRouter };
