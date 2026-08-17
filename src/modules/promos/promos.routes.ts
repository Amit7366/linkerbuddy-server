import { Router } from "express";
import { authenticate } from "@/middleware/authenticate.js";
import { authorizePermission } from "@/middleware/authorize.js";
import { validate } from "@/middleware/validate.js";
import { promosController } from "./promos.controller.js";
import {
  createPromoSchema,
  listPromosQuerySchema,
  promoIdParamSchema,
  updatePromoSchema,
} from "./promos.validation.js";

const router = Router();

router.use(authenticate, authorizePermission("promos:manage"));

router.get("/", validate(listPromosQuerySchema, "query"), promosController.list);
router.post("/", validate(createPromoSchema), promosController.create);
router.patch(
  "/:id",
  validate(promoIdParamSchema, "params"),
  validate(updatePromoSchema),
  promosController.update,
);
router.delete(
  "/:id",
  validate(promoIdParamSchema, "params"),
  promosController.remove,
);

export { router as promosRouter };
