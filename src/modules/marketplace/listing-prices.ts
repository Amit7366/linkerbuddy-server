export const SERVICE_TYPES = [
  "GUEST_POST",
  "LINK_INSERT",
  "BRAND_PROMOTION",
  "PRESS_NEWS",
  "SIDEBAR_LINK",
  "BANNER_ADS",
] as const;

export type ListingServiceType = (typeof SERVICE_TYPES)[number];

export const NICHE_TYPES = ["REGULAR", "GRAY"] as const;
export type ListingNicheType = (typeof NICHE_TYPES)[number];

export const SERVICE_PRICE_KEYS = [
  "guestPost",
  "linkInsert",
  "brandPromotion",
  "pressNews",
  "sidebarLink",
  "bannerAds",
] as const;

export type ServicePriceKey = (typeof SERVICE_PRICE_KEYS)[number];

export const SERVICE_TO_PRICE_KEY: Record<ListingServiceType, ServicePriceKey> = {
  GUEST_POST: "guestPost",
  LINK_INSERT: "linkInsert",
  BRAND_PROMOTION: "brandPromotion",
  PRESS_NEWS: "pressNews",
  SIDEBAR_LINK: "sidebarLink",
  BANNER_ADS: "bannerAds",
};

export const SERVICE_LABELS: Record<ListingServiceType, string> = {
  GUEST_POST: "Guest post",
  LINK_INSERT: "Link insert / Niche edit",
  BRAND_PROMOTION: "Brand promotion",
  PRESS_NEWS: "Press news",
  SIDEBAR_LINK: "Sidebar link",
  BANNER_ADS: "Banner ads",
};

export const NICHE_LABELS: Record<ListingNicheType, string> = {
  REGULAR: "Regular niche",
  GRAY: "Gray niche",
};

export type NichePrices = Record<ServicePriceKey, number>;

export type ListingPrices = {
  regular: NichePrices;
  gray: NichePrices;
};

export type ListingPriceColumns = {
  guestPostRegular: number;
  guestPostGray: number;
  linkInsertRegular: number;
  linkInsertGray: number;
  brandPromotionRegular: number;
  brandPromotionGray: number;
  pressNewsRegular: number;
  pressNewsGray: number;
  sidebarLinkRegular: number;
  sidebarLinkGray: number;
  bannerAdsRegular: number;
  bannerAdsGray: number;
};

export const EMPTY_NICHE_PRICES: NichePrices = {
  guestPost: 0,
  linkInsert: 0,
  brandPromotion: 0,
  pressNews: 0,
  sidebarLink: 0,
  bannerAds: 0,
};

export const EMPTY_LISTING_PRICES: ListingPrices = {
  regular: { ...EMPTY_NICHE_PRICES },
  gray: { ...EMPTY_NICHE_PRICES },
};

export function columnsToPrices(row: ListingPriceColumns): ListingPrices {
  return {
    regular: {
      guestPost: row.guestPostRegular,
      linkInsert: row.linkInsertRegular,
      brandPromotion: row.brandPromotionRegular,
      pressNews: row.pressNewsRegular,
      sidebarLink: row.sidebarLinkRegular,
      bannerAds: row.bannerAdsRegular,
    },
    gray: {
      guestPost: row.guestPostGray,
      linkInsert: row.linkInsertGray,
      brandPromotion: row.brandPromotionGray,
      pressNews: row.pressNewsGray,
      sidebarLink: row.sidebarLinkGray,
      bannerAds: row.bannerAdsGray,
    },
  };
}

export function pricesToColumns(prices: ListingPrices): ListingPriceColumns {
  return {
    guestPostRegular: prices.regular.guestPost,
    guestPostGray: prices.gray.guestPost,
    linkInsertRegular: prices.regular.linkInsert,
    linkInsertGray: prices.gray.linkInsert,
    brandPromotionRegular: prices.regular.brandPromotion,
    brandPromotionGray: prices.gray.brandPromotion,
    pressNewsRegular: prices.regular.pressNews,
    pressNewsGray: prices.gray.pressNews,
    sidebarLinkRegular: prices.regular.sidebarLink,
    sidebarLinkGray: prices.gray.sidebarLink,
    bannerAdsRegular: prices.regular.bannerAds,
    bannerAdsGray: prices.gray.bannerAds,
  };
}

export function priceFor(
  prices: ListingPrices,
  serviceType: ListingServiceType,
  nicheType: ListingNicheType,
): number {
  const branch = nicheType === "GRAY" ? prices.gray : prices.regular;
  return branch[SERVICE_TO_PRICE_KEY[serviceType]] ?? 0;
}

export function hasAnyPrice(prices: ListingPrices): boolean {
  return SERVICE_PRICE_KEYS.some(
    (key) => prices.regular[key] > 0 || prices.gray[key] > 0,
  );
}

export type PriceOption = {
  serviceType: ListingServiceType;
  nicheType: ListingNicheType;
  price: number;
};

export function availableOptions(prices: ListingPrices): PriceOption[] {
  const options: PriceOption[] = [];
  for (const nicheType of NICHE_TYPES) {
    for (const serviceType of SERVICE_TYPES) {
      const price = priceFor(prices, serviceType, nicheType);
      if (price > 0) options.push({ serviceType, nicheType, price });
    }
  }
  return options;
}

export function defaultCartCombo(prices: ListingPrices): PriceOption | null {
  const preferred = priceFor(prices, "GUEST_POST", "REGULAR");
  if (preferred > 0) {
    return { serviceType: "GUEST_POST", nicheType: "REGULAR", price: preferred };
  }
  return availableOptions(prices)[0] ?? null;
}

export function displayPrice(prices: ListingPrices): number {
  const guestRegular = prices.regular.guestPost;
  if (guestRegular > 0) return guestRegular;
  const regularMin = minPositive(prices.regular);
  if (regularMin > 0) return regularMin;
  return minPositive(prices.gray);
}

function minPositive(branch: NichePrices): number {
  const values = SERVICE_PRICE_KEYS.map((key) => branch[key]).filter((n) => n > 0);
  return values.length > 0 ? Math.min(...values) : 0;
}

export function placementLabel(
  serviceType: string,
  nicheType?: string | null,
): string {
  const service =
    SERVICE_LABELS[serviceType as ListingServiceType] ?? serviceType;
  const niche = nicheType
    ? (NICHE_LABELS[nicheType as ListingNicheType] ?? nicheType)
    : null;
  return niche ? `${service} · ${niche}` : service;
}
