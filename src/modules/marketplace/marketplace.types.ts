import type { ListingPrices } from "./listing-prices.js";

export interface MarketplaceListingResponse {
  id: number;
  domain: string;
  niche: string;
  da: number;
  dr: number;
  traffic: number;
  trafficSources: string[];
  country: string;
  dofollow: boolean;
  maxDofollow: number;
  prices: ListingPrices;
  tat: string;
  samplePostUrls: string[];
  note: string;
  owner: "Admin" | "Partner";
  trend: "Rising" | "Stable";
  isNew?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PaginatedListings {
  listings: MarketplaceListingResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface MarketplaceStatsResponse {
  total: number;
  countries: number;
  maxDofollow: number;
}
