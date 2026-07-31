export interface MarketplaceListingResponse {
  id: number;
  domain: string;
  niche: string;
  da: number;
  dr: number;
  traffic: number;
  country: string;
  maxDofollow: number;
  guest: number;
  insert: number;
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
