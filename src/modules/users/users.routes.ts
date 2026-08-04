import { Router } from "express";
import { usersController } from "./users.controller.js";
import { authenticate } from "@/middleware/authenticate.js";
import { validate } from "@/middleware/validate.js";
import { updateProfileSchema } from "@/modules/orders/orders.validation.js";

const router = Router();

router.get("/me", authenticate, usersController.getMe);
router.patch(
  "/me",
  authenticate,
  validate(updateProfileSchema),
  usersController.updateMe,
);

export { router as usersRouter };
