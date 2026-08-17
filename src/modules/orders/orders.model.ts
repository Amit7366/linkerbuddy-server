import type { OrderStatus, PaymentStatus, Prisma, ServiceType } from "@prisma/client";
import { prisma } from "@/lib/prisma.js";
import type { ListOrdersQuery } from "./orders.validation.js";

const orderInclude = {
  items: { orderBy: { createdAt: "asc" as const } },
  statusEvents: { orderBy: { createdAt: "asc" as const } },
  user: { select: { id: true, email: true, name: true } },
  promoCode: true,
} satisfies Prisma.OrderInclude;

export const ordersModel = {
  async findById(id: string) {
    return prisma.order.findUnique({
      where: { id },
      include: orderInclude,
    });
  },

  async findByOrderNumber(orderNumber: string) {
    return prisma.order.findUnique({
      where: { orderNumber },
      include: orderInclude,
    });
  },

  async findByPaymentIntentId(stripePaymentIntentId: string) {
    return prisma.order.findUnique({
      where: { stripePaymentIntentId },
      include: orderInclude,
    });
  },

  async listForUser(userId: string, query: ListOrdersQuery) {
    const where: Prisma.OrderWhereInput = {
      userId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? {
            OR: [
              { orderNumber: { contains: query.q, mode: "insensitive" } },
              { billingName: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.order.count({ where }),
    ]);

    return { orders, total, page: query.page, limit: query.limit };
  },

  async listAll(query: ListOrdersQuery) {
    const where: Prisma.OrderWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? {
            OR: [
              { orderNumber: { contains: query.q, mode: "insensitive" } },
              { billingName: { contains: query.q, mode: "insensitive" } },
              { billingEmail: { contains: query.q, mode: "insensitive" } },
              { user: { email: { contains: query.q, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.order.count({ where }),
    ]);

    return { orders, total, page: query.page, limit: query.limit };
  },

  async create(data: {
    orderNumber: string;
    userId: string;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    stripePaymentIntentId?: string | null;
    currency: string;
    subtotalCents: number;
    totalCents: number;
    notes?: string | null;
    billingName: string;
    billingEmail: string;
    billingPhone: string;
    billingCompany?: string | null;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    items: Array<{
      listingId: number;
      domain: string;
      niche: string;
      serviceType: ServiceType;
      unitPriceCents: number;
      quantity: number;
      lineTotalCents: number;
    }>;
    initialEvent: {
      toStatus: OrderStatus;
      changedById?: string | null;
      note?: string | null;
    };
  }) {
    return prisma.order.create({
      data: {
        orderNumber: data.orderNumber,
        userId: data.userId,
        status: data.status,
        paymentStatus: data.paymentStatus,
        stripePaymentIntentId: data.stripePaymentIntentId ?? null,
        currency: data.currency,
        subtotalCents: data.subtotalCents,
        totalCents: data.totalCents,
        notes: data.notes ?? null,
        billingName: data.billingName,
        billingEmail: data.billingEmail,
        billingPhone: data.billingPhone,
        billingCompany: data.billingCompany ?? null,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2 ?? null,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        country: data.country,
        items: { create: data.items },
        statusEvents: {
          create: {
            fromStatus: null,
            toStatus: data.initialEvent.toStatus,
            changedById: data.initialEvent.changedById ?? null,
            note: data.initialEvent.note ?? null,
          },
        },
      },
      include: orderInclude,
    });
  },

  async updatePayment(
    id: string,
    data: {
      paymentStatus: PaymentStatus;
      stripePaymentIntentId?: string | null;
    },
  ) {
    return prisma.order.update({
      where: { id },
      data: {
        paymentStatus: data.paymentStatus,
        ...(data.stripePaymentIntentId !== undefined
          ? { stripePaymentIntentId: data.stripePaymentIntentId }
          : {}),
      },
      include: orderInclude,
    });
  },

  async updateStatus(
    id: string,
    data: {
      status: OrderStatus;
      fromStatus: OrderStatus;
      note?: string | null;
      changedById?: string | null;
    },
  ) {
    return prisma.order.update({
      where: { id },
      data: {
        status: data.status,
        statusEvents: {
          create: {
            fromStatus: data.fromStatus,
            toStatus: data.status,
            note: data.note ?? null,
            changedById: data.changedById ?? null,
          },
        },
      },
      include: orderInclude,
    });
  },

  async updateOrder(
    id: string,
    data: Prisma.OrderUpdateInput,
    replaceItems?: Array<{
      listingId: number;
      domain: string;
      niche: string;
      serviceType: ServiceType;
      unitPriceCents: number;
      quantity: number;
      lineTotalCents: number;
    }>,
  ) {
    return prisma.$transaction(async (tx) => {
      if (replaceItems) {
        await tx.orderItem.deleteMany({ where: { orderId: id } });
        await tx.orderItem.createMany({
          data: replaceItems.map((item) => ({ ...item, orderId: id })),
        });
      }
      return tx.order.update({
        where: { id },
        data,
        include: orderInclude,
      });
    });
  },
};
