import { randomBytes } from "crypto";
import type { OrderStatus, ServiceType } from "@prisma/client";
import { prisma } from "@/lib/prisma.js";
import { getStripe } from "@/lib/stripe.js";
import { AppError } from "@/utils/appError.js";
import { sendClientAndBusinessEmails } from "@/lib/mailer.js";
import { orderClientEmail, orderInternalEmail } from "@/lib/email-templates.js";
import { promosModel } from "@/modules/promos/promos.model.js";
import {
  assertPromoUsable,
  computePromoDiscount,
} from "@/modules/promos/promos.service.js";
import { ordersModel } from "./orders.model.js";
import type {
  CheckoutIntentInput,
  ListOrdersQuery,
  UpdateOrderInput,
  UpdateOrderStatusInput,
} from "./orders.validation.js";

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["ACCEPTED", "REJECTED", "CANCELLED"],
  ACCEPTED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPING"],
  SHIPPING: ["DELIVERING"],
  DELIVERING: ["COMPLETE", "FAILED"],
  FAILED: ["PENDING"],
  REJECTED: ["PENDING"],
  CANCELLED: ["PENDING"],
  COMPLETE: [],
};

function generateOrderNumber() {
  const date = new Date();
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const suffix = randomBytes(2).toString("hex").toUpperCase();
  return `LB-${y}${m}${d}-${suffix}`;
}

function dollarsToCents(dollars: number) {
  return Math.round(dollars * 100);
}

export const ordersService = {
  async createCheckoutIntent(userId: string, input: CheckoutIntentInput) {
    const listingIds = [...new Set(input.items.map((i) => i.listingId))];
    const listings = await prisma.marketplaceListing.findMany({
      where: { id: { in: listingIds } },
    });
    const byId = new Map(listings.map((l) => [l.id, l]));

    for (const id of listingIds) {
      if (!byId.has(id)) {
        throw new AppError(`Listing ${id} not found`, 400, "LISTING_NOT_FOUND");
      }
    }

    const resolvedItems = input.items.map((item) => {
      const listing = byId.get(item.listingId)!;
      const unitDollars = item.serviceType === "GUEST" ? listing.guest : listing.insert;
      const unitPriceCents = dollarsToCents(unitDollars);
      const lineTotalCents = unitPriceCents * item.quantity;
      return {
        listingId: listing.id,
        domain: listing.domain,
        niche: listing.niche,
        serviceType: item.serviceType as ServiceType,
        unitPriceCents,
        quantity: item.quantity,
        lineTotalCents,
      };
    });

    const subtotalCents = resolvedItems.reduce((sum, i) => sum + i.lineTotalCents, 0);
    if (subtotalCents <= 0) {
      throw new AppError("Order total must be greater than zero", 400, "INVALID_TOTAL");
    }

    const billing = input.billing;

    if (input.saveBillingToProfile) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          name: billing.billingName,
          phone: billing.billingPhone,
          company: billing.billingCompany ?? null,
          addressLine1: billing.addressLine1,
          addressLine2: billing.addressLine2 ?? null,
          city: billing.city,
          state: billing.state,
          postalCode: billing.postalCode,
          country: billing.country,
        },
      });
    }

    const orderNumber = generateOrderNumber();
    const order = await ordersModel.create({
      orderNumber,
      userId,
      status: "PENDING",
      paymentStatus: "UNPAID",
      currency: "usd",
      subtotalCents,
      totalCents: subtotalCents,
      notes: billing.notes ?? null,
      billingName: billing.billingName,
      billingEmail: billing.billingEmail,
      billingPhone: billing.billingPhone,
      billingCompany: billing.billingCompany ?? null,
      addressLine1: billing.addressLine1,
      addressLine2: billing.addressLine2 ?? null,
      city: billing.city,
      state: billing.state,
      postalCode: billing.postalCode,
      country: billing.country,
      items: resolvedItems,
      initialEvent: {
        toStatus: "PENDING",
        changedById: userId,
        note: "Order created",
      },
    });

    // --- Stripe payment (checkout step 2) — temporarily disabled ---
    // Restore this block to create a PaymentIntent and return clientSecret.
    // const stripe = getStripe();
    // const paymentIntent = await stripe.paymentIntents.create({
    //   amount: subtotalCents,
    //   currency: "usd",
    //   automatic_payment_methods: { enabled: true },
    //   metadata: {
    //     orderId: order.id,
    //     orderNumber: order.orderNumber,
    //     userId,
    //   },
    //   receipt_email: billing.billingEmail,
    // });
    //
    // await ordersModel.updatePayment(order.id, {
    //   paymentStatus: "UNPAID",
    //   stripePaymentIntentId: paymentIntent.id,
    // });
    //
    // if (!paymentIntent.client_secret) {
    //   throw new AppError("Failed to create payment", 500, "STRIPE_ERROR");
    // }
    //
    // return {
    //   orderId: order.id,
    //   orderNumber: order.orderNumber,
    //   clientSecret: paymentIntent.client_secret,
    //   totalCents: subtotalCents,
    //   currency: "usd",
    // };

    const orderFields = {
      orderNumber: order.orderNumber,
      billingName: order.billingName,
      billingEmail: order.billingEmail,
      billingPhone: order.billingPhone,
      billingCompany: order.billingCompany,
      addressLine1: order.addressLine1,
      addressLine2: order.addressLine2,
      city: order.city,
      state: order.state,
      postalCode: order.postalCode,
      country: order.country,
      notes: order.notes,
      paymentStatus: order.paymentStatus,
      status: order.status,
      totalCents: order.totalCents,
      currency: order.currency,
      items: order.items,
    };

    void sendClientAndBusinessEmails({
      clientEmail: order.billingEmail,
      client: orderClientEmail(orderFields),
      business: orderInternalEmail(orderFields),
    });

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      clientSecret: "",
      totalCents: subtotalCents,
      currency: "usd",
    };
  },

  async listMine(userId: string, query: ListOrdersQuery) {
    return ordersModel.listForUser(userId, query);
  },

  async getMine(userId: string, id: string) {
    const order = await ordersModel.findById(id);
    if (!order || order.userId !== userId) {
      throw new AppError("Order not found", 404, "NOT_FOUND");
    }
    return order;
  },

  async getMineByNumber(userId: string, orderNumber: string) {
    const order = await ordersModel.findByOrderNumber(orderNumber);
    if (!order || order.userId !== userId) {
      throw new AppError("Order not found", 404, "NOT_FOUND");
    }
    return order;
  },

  async listAll(query: ListOrdersQuery) {
    return ordersModel.listAll(query);
  },

  async getById(id: string) {
    const order = await ordersModel.findById(id);
    if (!order) {
      throw new AppError("Order not found", 404, "NOT_FOUND");
    }
    return order;
  },

  async updateStatus(id: string, adminId: string, input: UpdateOrderStatusInput) {
    const order = await ordersModel.findById(id);
    if (!order) {
      throw new AppError("Order not found", 404, "NOT_FOUND");
    }
    if (order.status === "COMPLETE") {
      throw new AppError("Completed orders cannot be modified", 400, "ORDER_LOCKED");
    }

    const allowed = ALLOWED_TRANSITIONS[order.status];
    if (!allowed.includes(input.status)) {
      throw new AppError(
        `Cannot change status from ${order.status} to ${input.status}`,
        400,
        "INVALID_STATUS_TRANSITION",
      );
    }

    if (input.status === "REJECTED" && order.status !== "PENDING") {
      throw new AppError("Orders can only be rejected from PENDING", 400, "INVALID_STATUS_TRANSITION");
    }

    return ordersModel.updateStatus(id, {
      status: input.status,
      fromStatus: order.status,
      note: input.note,
      changedById: adminId,
    });
  },

  async cancelMine(userId: string, id: string) {
    const order = await ordersModel.findById(id);
    if (!order || order.userId !== userId) {
      throw new AppError("Order not found", 404, "NOT_FOUND");
    }
    if (order.status !== "PENDING" && order.status !== "ACCEPTED") {
      throw new AppError(
        "Orders can only be cancelled while Pending or Accepted",
        400,
        "INVALID_STATUS_TRANSITION",
      );
    }
    return ordersModel.updateStatus(id, {
      status: "CANCELLED",
      fromStatus: order.status,
      note: "Cancelled by customer",
      changedById: userId,
    });
  },

  async updateOrder(id: string, input: UpdateOrderInput) {
    const order = await ordersModel.findById(id);
    if (!order) {
      throw new AppError("Order not found", 404, "NOT_FOUND");
    }
    if (order.status === "COMPLETE") {
      throw new AppError("Completed orders cannot be modified", 400, "ORDER_LOCKED");
    }
    if (order.status === "REJECTED" || order.status === "CANCELLED") {
      throw new AppError(
        "This order is locked until reset to PENDING",
        400,
        "ORDER_LOCKED",
      );
    }

    let replaceItems:
      | Array<{
          listingId: number;
          domain: string;
          niche: string;
          serviceType: ServiceType;
          unitPriceCents: number;
          quantity: number;
          lineTotalCents: number;
        }>
      | undefined;

    let subtotalCents = order.subtotalCents;

    if (input.items) {
      const listingIds = [...new Set(input.items.map((i) => i.listingId))];
      const listings = await prisma.marketplaceListing.findMany({
        where: { id: { in: listingIds } },
      });
      const byId = new Map(listings.map((l) => [l.id, l]));

      replaceItems = input.items.map((item) => {
        const listing = byId.get(item.listingId);
        const domain = item.domain ?? listing?.domain;
        const niche = item.niche ?? listing?.niche ?? "";
        if (!domain) {
          throw new AppError(`Listing ${item.listingId} not found`, 400, "LISTING_NOT_FOUND");
        }
        const unitPriceCents =
          item.unitPriceCents ??
          dollarsToCents(
            item.serviceType === "GUEST" ? (listing?.guest ?? 0) : (listing?.insert ?? 0),
          );
        const lineTotalCents = unitPriceCents * item.quantity;
        return {
          listingId: item.listingId,
          domain,
          niche,
          serviceType: item.serviceType,
          unitPriceCents,
          quantity: item.quantity,
          lineTotalCents,
        };
      });
      subtotalCents = replaceItems.reduce((sum, i) => sum + i.lineTotalCents, 0);
    }

    let nextPromo = order.promoCode ?? null;
    if (input.promoCode !== undefined) {
      const raw = input.promoCode?.trim();
      if (!raw) {
        nextPromo = null;
      } else {
        const found = await promosModel.findByCode(raw);
        if (!found) {
          throw new AppError("Promo code not found", 404, "PROMO_NOT_FOUND");
        }
        nextPromo = found;
      }
    }

    if (nextPromo) {
      try {
        assertPromoUsable(nextPromo, nextPromo.id === order.promoCodeId);
        computePromoDiscount(subtotalCents, nextPromo);
      } catch (error) {
        if (input.promoCode !== undefined) throw error;
        nextPromo = null;
      }
    }

    const discountCents = nextPromo ? computePromoDiscount(subtotalCents, nextPromo) : 0;
    const discountedTotal = Math.max(0, subtotalCents - discountCents);

    let manualTotalCents =
      input.manualTotalCents !== undefined
        ? input.manualTotalCents
        : order.manualTotalCents;

    if (manualTotalCents != null && manualTotalCents > subtotalCents) {
      throw new AppError(
        "Manual total cannot exceed the order subtotal",
        400,
        "INVALID_TOTAL",
      );
    }

    const totalCents =
      manualTotalCents != null ? manualTotalCents : discountedTotal;

    if (nextPromo?.id !== order.promoCodeId) {
      if (order.promoCodeId) await promosModel.decrementUsed(order.promoCodeId);
      if (nextPromo) await promosModel.incrementUsed(nextPromo.id);
    }

    return ordersModel.updateOrder(
      id,
      {
        ...(input.billingName !== undefined ? { billingName: input.billingName } : {}),
        ...(input.billingEmail !== undefined ? { billingEmail: input.billingEmail } : {}),
        ...(input.billingPhone !== undefined ? { billingPhone: input.billingPhone } : {}),
        ...(input.billingCompany !== undefined ? { billingCompany: input.billingCompany } : {}),
        ...(input.addressLine1 !== undefined ? { addressLine1: input.addressLine1 } : {}),
        ...(input.addressLine2 !== undefined ? { addressLine2: input.addressLine2 } : {}),
        ...(input.city !== undefined ? { city: input.city } : {}),
        ...(input.state !== undefined ? { state: input.state } : {}),
        ...(input.postalCode !== undefined ? { postalCode: input.postalCode } : {}),
        ...(input.country !== undefined ? { country: input.country } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        subtotalCents,
        discountCents,
        totalCents,
        manualTotalCents,
        promoCodeLabel: nextPromo?.code ?? null,
        promoCode: nextPromo
          ? { connect: { id: nextPromo.id } }
          : { disconnect: true },
      },
      replaceItems,
    );
  },

  async handleStripeWebhook(rawBody: Buffer, signature: string | undefined) {
    const { env } = await import("@/config/env.js");
    if (!env.STRIPE_WEBHOOK_SECRET) {
      throw new AppError("Stripe webhook secret not configured", 503, "STRIPE_NOT_CONFIGURED");
    }
    if (!signature) {
      throw new AppError("Missing Stripe signature", 400, "INVALID_SIGNATURE");
    }

    const stripe = getStripe();
    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch {
      throw new AppError("Invalid Stripe signature", 400, "INVALID_SIGNATURE");
    }

    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object;
      const order =
        (await ordersModel.findByPaymentIntentId(intent.id)) ||
        (intent.metadata?.orderId
          ? await ordersModel.findById(intent.metadata.orderId)
          : null);
      if (order && order.paymentStatus !== "PAID") {
        await ordersModel.updatePayment(order.id, {
          paymentStatus: "PAID",
          stripePaymentIntentId: intent.id,
        });
      }
    }

    if (event.type === "payment_intent.payment_failed") {
      const intent = event.data.object;
      const order =
        (await ordersModel.findByPaymentIntentId(intent.id)) ||
        (intent.metadata?.orderId
          ? await ordersModel.findById(intent.metadata.orderId)
          : null);
      if (order && order.paymentStatus === "UNPAID") {
        await ordersModel.updatePayment(order.id, {
          paymentStatus: "FAILED",
          stripePaymentIntentId: intent.id,
        });
      }
    }

    return { received: true };
  },

  async confirmPaymentFromClient(userId: string, orderId: string) {
    const order = await ordersModel.findById(orderId);
    if (!order || order.userId !== userId) {
      throw new AppError("Order not found", 404, "NOT_FOUND");
    }
    if (!order.stripePaymentIntentId) {
      throw new AppError("No payment intent on order", 400, "NO_PAYMENT");
    }

    const stripe = getStripe();
    const intent = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
    if (intent.status === "succeeded" && order.paymentStatus !== "PAID") {
      return ordersModel.updatePayment(order.id, {
        paymentStatus: "PAID",
        stripePaymentIntentId: intent.id,
      });
    }
    return order;
  },
};
