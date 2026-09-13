export type DashboardKpi = {
  value: number;
  changePct: number;
};

export type DashboardActivityKind = "order" | "cta" | "call";
export type DashboardSeverity = "high" | "medium" | "low";

export type DashboardActivity = {
  id: string;
  kind: DashboardActivityKind;
  ref: string;
  source: string;
  issue: string;
  date: string;
  severity: DashboardSeverity;
  status: string;
  href: string;
};

export type DashboardOverview = {
  kpis: {
    listings: DashboardKpi;
    openOrders: DashboardKpi;
    revenueCents: DashboardKpi;
    fulfillmentRate: DashboardKpi;
  };
  series: { label: string; revenueCents: number; orders: number }[];
  topListings: { id: number; domain: string; traffic: number }[];
  activity: DashboardActivity[];
  pending: { orders: number; cta: number; calls: number };
  inventory: { total: number; countries: number };
};
