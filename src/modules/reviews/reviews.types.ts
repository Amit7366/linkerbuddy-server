export interface PublicReview {
  id: string;
  rating: number;
  description: string;
  createdAt: Date;
  authorName: string;
  orderNumber: string;
}

export interface UserReview {
  id: string;
  orderId: string;
  orderNumber: string;
  rating: number;
  description: string;
  showOnHome: boolean;
  createdAt: Date;
}

export interface PendingReviewOrder {
  id: string;
  orderNumber: string;
  totalCents: number;
  currency: string;
  createdAt: Date;
}

export interface AdminReview {
  id: string;
  orderId: string;
  orderNumber: string;
  userId: string;
  authorName: string;
  authorEmail: string;
  rating: number;
  description: string;
  showOnHome: boolean;
  createdAt: Date;
}
