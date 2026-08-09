import { Router } from "express";
import { authRouter } from "@/modules/auth/index.js";
import { usersRouter } from "@/modules/users/index.js";
import { healthRouter } from "@/modules/health/index.js";
import { leadsRouter } from "@/modules/leads/index.js";
import { marketplaceRouter } from "@/modules/marketplace/index.js";
import { ordersRouter } from "@/modules/orders/index.js";
import { reviewsRouter } from "@/modules/reviews/index.js";

const router = Router();

router.use("/health", healthRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/leads", leadsRouter);
router.use("/marketplace", marketplaceRouter);
router.use("/orders", ordersRouter);
router.use("/reviews", reviewsRouter);

export { router as apiRouter };
