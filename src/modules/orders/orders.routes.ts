import { Router } from "express";
import { ordersController } from "./orders.controller.js";
import {
  checkoutIntentSchema,
  listOrdersQuerySchema,
  orderIdParamSchema,
  updateOrderSchema,
  updateOrderStatusSchema,
} from "./orders.validation.js";
import { validate } from "@/middleware/validate.js";
import { authenticate } from "@/middleware/authenticate.js";
import { authorizePermission } from "@/middleware/authorize.js";

const router = Router();

// Stripe webhook is mounted in app.ts with raw body parser

router.post(
  "/checkout-intent",
  authenticate,
  validate(checkoutIntentSchema),
  ordersController.checkoutIntent,
);

router.get(
  "/me",
  authenticate,
  validate(listOrdersQuerySchema, "query"),
  ordersController.listMine,
);

router.get(
  "/me/:id",
  authenticate,
  validate(orderIdParamSchema, "params"),
  ordersController.getMine,
);

router.post(
  "/me/:id/confirm-payment",
  authenticate,
  validate(orderIdParamSchema, "params"),
  ordersController.confirmPayment,
);

router.post(
  "/me/:id/cancel",
  authenticate,
  validate(orderIdParamSchema, "params"),
  ordersController.cancelMine,
);

router.get(
  "/",
  authenticate,
  authorizePermission("orders:manage"),
  validate(listOrdersQuerySchema, "query"),
  ordersController.listAll,
);

router.get(
  "/:id",
  authenticate,
  authorizePermission("orders:manage"),
  validate(orderIdParamSchema, "params"),
  ordersController.getById,
);

router.patch(
  "/:id/status",
  authenticate,
  authorizePermission("orders:manage"),
  validate(orderIdParamSchema, "params"),
  validate(updateOrderStatusSchema),
  ordersController.updateStatus,
);

router.patch(
  "/:id",
  authenticate,
  authorizePermission("orders:manage"),
  validate(orderIdParamSchema, "params"),
  validate(updateOrderSchema),
  ordersController.updateOrder,
);

export { router as ordersRouter };
