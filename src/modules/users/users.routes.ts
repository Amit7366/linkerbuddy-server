import { Router } from "express";
import { usersController } from "./users.controller.js";
import { authenticate } from "@/middleware/authenticate.js";

const router = Router();

router.get("/me", authenticate, usersController.getMe);

export { router as usersRouter };
