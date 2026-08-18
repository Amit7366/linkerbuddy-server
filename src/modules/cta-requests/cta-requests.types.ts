export const CTA_NICHES = [
  "General",
  "Food/General",
  "News/General",
  "SaaS/General",
] as const;

export const CTA_BUDGETS = ["$30–$50", "$50–$100", "$100+"] as const;

export type CtaNiche = (typeof CTA_NICHES)[number];
export type CtaBudget = (typeof CTA_BUDGETS)[number];

export type CtaRecommendationSnapshot = {
  siteId: number;
  domain: string;
  niche: string;
  da: number;
  dr: number;
  traffic: number;
  country: string;
  guest: number;
  tat: string;
  owner: string;
  trend: string;
  fitScore: number;
  reason: string;
};

export type CtaRequestPublicCreate = {
  id: string;
  writeToken: string;
};

export type CtaRequestAdmin = {
  id: string;
  email: string;
  niche: string;
  budget: string;
  status: "NEW" | "CONTACTED" | "CONVERTED";
  aiStatus: "PENDING" | "READY" | "FAILED";
  summary: string | null;
  strategy: string | null;
  tips: string[];
  recommendations: CtaRecommendationSnapshot[];
  aiError: string | null;
  pickCount: number;
  createdAt: Date;
  updatedAt: Date;
};
