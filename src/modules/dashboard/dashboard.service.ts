import { prisma } from "@/lib/prisma.js";
import type {
  DashboardActivity,
  DashboardOverview,
  DashboardSeverity,
} from "./dashboard.types.js";

const OPEN_ORDER_STATUSES = ["PENDING", "ACCEPTED"] as const;
const EXCLUDED_FULFILLMENT = ["CANCELLED", "REJECTED"] as const;
const REVENUE_STATUSES = ["COMPLETE"] as const;

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
  return date.toLocaleString("en-US", { month: "short" });
}

function changePct(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function isRevenueOrder(status: string, paymentStatus: string) {
  return paymentStatus === "PAID" || REVENUE_STATUSES.includes(status as (typeof REVENUE_STATUSES)[number]);
}

function orderSeverity(status: string): DashboardSeverity {
  if (status === "PENDING" || status === "FAILED") return "high";
  if (status === "ACCEPTED" || status === "PROCESSING") return "medium";
  return "low";
}

function ctaSeverity(status: string): DashboardSeverity {
  if (status === "NEW") return "high";
  if (status === "CONTACTED") return "medium";
  return "low";
}

function callSeverity(status: string): DashboardSeverity {
  if (status === "NO_SHOW") return "high";
  if (status === "SCHEDULED") return "medium";
  return "low";
}

export const dashboardService = {
  async getOverview(): Promise<DashboardOverview> {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const lastMonthStart = addMonths(thisMonthStart, -1);
    const seriesStart = addMonths(thisMonthStart, -11);

    const [
      listingsTotal,
      listingsThisMonth,
      listingsLastMonth,
      countryGroups,
      openOrders,
      openOrdersThisMonth,
      openOrdersLastMonth,
      ordersForRate,
      ordersThisMonth,
      ordersLastMonth,
      seriesOrders,
      topListings,
      pendingOrders,
      pendingCta,
      pendingCalls,
      recentOrders,
      recentCta,
      recentCalls,
    ] = await Promise.all([
      prisma.marketplaceListing.count(),
      prisma.marketplaceListing.count({
        where: { createdAt: { gte: thisMonthStart } },
      }),
      prisma.marketplaceListing.count({
        where: { createdAt: { gte: lastMonthStart, lt: thisMonthStart } },
      }),
      prisma.marketplaceListing.groupBy({
        by: ["country"],
        _count: { _all: true },
      }),
      prisma.order.count({
        where: { status: { in: [...OPEN_ORDER_STATUSES] } },
      }),
      prisma.order.count({
        where: {
          status: { in: [...OPEN_ORDER_STATUSES] },
          createdAt: { gte: thisMonthStart },
        },
      }),
      prisma.order.count({
        where: {
          status: { in: [...OPEN_ORDER_STATUSES] },
          createdAt: { gte: lastMonthStart, lt: thisMonthStart },
        },
      }),
      prisma.order.findMany({
        select: { status: true, createdAt: true },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: thisMonthStart } },
        select: { status: true, paymentStatus: true, totalCents: true },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: lastMonthStart, lt: thisMonthStart } },
        select: { status: true, paymentStatus: true, totalCents: true },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: seriesStart } },
        select: {
          createdAt: true,
          status: true,
          paymentStatus: true,
          totalCents: true,
        },
      }),
      prisma.marketplaceListing.findMany({
        orderBy: { traffic: "desc" },
        take: 5,
        select: { id: true, domain: true, traffic: true },
      }),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.ctaRequest.count({ where: { status: "NEW" } }),
      prisma.scheduledCall.count({ where: { status: "SCHEDULED" } }),
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          billingName: true,
          createdAt: true,
        },
      }),
      prisma.ctaRequest.findMany({
        orderBy: { createdAt: "desc" },
        take: 4,
        select: {
          id: true,
          email: true,
          niche: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.scheduledCall.findMany({
        orderBy: { createdAt: "desc" },
        take: 4,
        include: { lead: { select: { name: true } } },
      }),
    ]);

    const revenueThisMonth = ordersThisMonth
      .filter((order) => isRevenueOrder(order.status, order.paymentStatus))
      .reduce((sum, order) => sum + order.totalCents, 0);
    const revenueLastMonth = ordersLastMonth
      .filter((order) => isRevenueOrder(order.status, order.paymentStatus))
      .reduce((sum, order) => sum + order.totalCents, 0);

    const rateFor = (rows: { status: string }[]) => {
      const eligible = rows.filter(
        (row) =>
          !EXCLUDED_FULFILLMENT.includes(
            row.status as (typeof EXCLUDED_FULFILLMENT)[number],
          ),
      );
      if (eligible.length === 0) return 0;
      const complete = eligible.filter((row) => row.status === "COMPLETE").length;
      return Number(((complete / eligible.length) * 100).toFixed(1));
    };

    const fulfillmentAll = rateFor(ordersForRate);
    const fulfillmentThisMonth = rateFor(ordersThisMonth);
    const fulfillmentLastMonth = rateFor(ordersLastMonth);

    const seriesMap = new Map<string, { label: string; revenueCents: number; orders: number }>();
    for (let i = 0; i < 12; i += 1) {
      const month = addMonths(seriesStart, i);
      seriesMap.set(monthKey(month), {
        label: monthLabel(month),
        revenueCents: 0,
        orders: 0,
      });
    }
    for (const order of seriesOrders) {
      const key = monthKey(order.createdAt);
      const bucket = seriesMap.get(key);
      if (!bucket) continue;
      bucket.orders += 1;
      if (isRevenueOrder(order.status, order.paymentStatus)) {
        bucket.revenueCents += order.totalCents;
      }
    }

    const activity: DashboardActivity[] = [
      ...recentOrders.map((order) => ({
        id: order.id,
        kind: "order" as const,
        ref: order.orderNumber,
        source: order.billingName,
        issue: `Order ${order.status.toLowerCase()}`,
        date: order.createdAt.toISOString(),
        severity: orderSeverity(order.status),
        status: order.status,
        href: `/dashboard/super-admin/orders?order=${encodeURIComponent(order.orderNumber)}`,
      })),
      ...recentCta.map((row) => ({
        id: row.id,
        kind: "cta" as const,
        ref: row.id.slice(-8).toUpperCase(),
        source: row.email,
        issue: `AI shortlist · ${row.niche}`,
        date: row.createdAt.toISOString(),
        severity: ctaSeverity(row.status),
        status: row.status,
        href: "/dashboard/super-admin/cta-requests",
      })),
      ...recentCalls.map((call) => ({
        id: call.id,
        kind: "call" as const,
        ref: call.id.slice(-8).toUpperCase(),
        source: call.lead.name,
        issue: `Strategy call ${call.status.toLowerCase()}`,
        date: call.createdAt.toISOString(),
        severity: callSeverity(call.status),
        status: call.status,
        href: "/dashboard/super-admin/calls",
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);

    return {
      kpis: {
        listings: {
          value: listingsTotal,
          changePct: changePct(listingsThisMonth, listingsLastMonth),
        },
        openOrders: {
          value: openOrders,
          changePct: changePct(openOrdersThisMonth, openOrdersLastMonth),
        },
        revenueCents: {
          value: revenueThisMonth,
          changePct: changePct(revenueThisMonth, revenueLastMonth),
        },
        fulfillmentRate: {
          value: fulfillmentAll,
          changePct: changePct(fulfillmentThisMonth, fulfillmentLastMonth),
        },
      },
      series: [...seriesMap.values()],
      topListings,
      activity,
      pending: {
        orders: pendingOrders,
        cta: pendingCta,
        calls: pendingCalls,
      },
      inventory: {
        total: listingsTotal,
        countries: countryGroups.length,
      },
    };
  },
};
