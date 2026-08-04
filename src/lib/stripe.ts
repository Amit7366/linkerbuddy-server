import Stripe from "stripe";
import { env } from "@/config/env.js";
import { AppError } from "@/utils/appError.js";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new AppError(
      "Stripe is not configured. Set STRIPE_SECRET_KEY.",
      503,
      "STRIPE_NOT_CONFIGURED",
    );
  }
  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-07-29.dahlia",
    });
  }
  return stripeClient;
}
