import { Router } from "express";
import { authRouter } from "@/modules/auth/index.js";
import { usersRouter } from "@/modules/users/index.js";
import { healthRouter } from "@/modules/health/index.js";
import { leadsRouter } from "@/modules/leads/index.js";
import { callsRouter } from "@/modules/calls/index.js";
import { marketplaceRouter } from "@/modules/marketplace/index.js";
import { ordersRouter } from "@/modules/orders/index.js";
import { promosRouter } from "@/modules/promos/index.js";
import { reviewsRouter } from "@/modules/reviews/index.js";
import { ctaRequestsRouter } from "@/modules/cta-requests/index.js";

const router = Router();

router.use("/health", healthRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/leads", leadsRouter);
router.use("/calls", callsRouter);
router.use("/marketplace", marketplaceRouter);
router.use("/orders", ordersRouter);
router.use("/promos", promosRouter);
router.use("/reviews", reviewsRouter);
router.use("/cta-requests", ctaRequestsRouter);

export { router as apiRouter };
