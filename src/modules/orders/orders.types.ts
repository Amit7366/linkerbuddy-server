import type { OrderStatus, PaymentStatus, ServiceType } from "@prisma/client";

export type OrderItemDto = {
  id: string;
  listingId: number;
  domain: string;
  niche: string;
  serviceType: ServiceType;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
};

export type OrderStatusEventDto = {
  id: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  note: string | null;
  changedById: string | null;
  createdAt: Date;
};

export type OrderDto = {
  id: string;
  orderNumber: string;
  userId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  currency: string;
  subtotalCents: number;
  totalCents: number;
  notes: string | null;
  billingName: string;
  billingEmail: string;
  billingPhone: string;
  billingCompany: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  items: OrderItemDto[];
  statusEvents: OrderStatusEventDto[];
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    email: string;
    name: string | null;
  };
};

export type CheckoutIntentResponse = {
  orderId: string;
  orderNumber: string;
  clientSecret: string;
  totalCents: number;
  currency: string;
};
