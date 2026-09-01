import type { ListingPrices } from "./listing-prices.js";

export interface MarketplaceListingResponse {
  id: number;
  domain: string;
  niche: string;
  da: number;
  dr: number;
  traffic: number;
  country: string;
  maxDofollow: number;
  prices: ListingPrices;
  tat: string;
  owner: "Admin" | "Partner";
  trend: "Rising" | "Stable";
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
