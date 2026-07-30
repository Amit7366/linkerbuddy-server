import { Router } from "express";
import { authRouter } from "@/modules/auth/index.js";
import { usersRouter } from "@/modules/users/index.js";
import { healthRouter } from "@/modules/health/index.js";
import { leadsRouter } from "@/modules/leads/index.js";

const router = Router();

router.use("/health", healthRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/leads", leadsRouter);

export { router as apiRouter };
