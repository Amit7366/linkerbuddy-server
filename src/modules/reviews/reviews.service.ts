import { AppError } from "@/utils/appError.js";
import { reviewsModel } from "./reviews.model.js";
import type {
  AdminReview,
  PendingReviewOrder,
  PublicReview,
  UserReview,
} from "./reviews.types.js";
import type {
  CreateReviewInput,
  ListAdminReviewsQuery,
  ListPublicReviewsQuery,
  UpdateAdminReviewInput,
} from "./reviews.validation.js";

function toPublicReview(
  review: Awaited<ReturnType<typeof reviewsModel.findPublic>>[number],
): PublicReview {
  return {
    id: review.id,
    rating: review.rating,
    description: review.description,
    createdAt: review.createdAt,
    authorName: reviewsModel.displayName(review.user),
    orderNumber: review.order.orderNumber,
  };
}

function toUserReview(
  review: Awaited<ReturnType<typeof reviewsModel.findByUser>>[number],
): UserReview {
  return {
    id: review.id,
    orderId: review.orderId,
    orderNumber: review.order.orderNumber,
    rating: review.rating,
    description: review.description,
    showOnHome: review.showOnHome,
    createdAt: review.createdAt,
  };
}

function toAdminReview(
  review: NonNullable<Awaited<ReturnType<typeof reviewsModel.findById>>>,
): AdminReview {
  return {
    id: review.id,
    orderId: review.orderId,
    orderNumber: review.order.orderNumber,
    userId: review.userId,
    authorName: reviewsModel.displayName(review.user),
    authorEmail: review.user.email,
    rating: review.rating,
    description: review.description,
    showOnHome: review.showOnHome,
    createdAt: review.createdAt,
  };
}

export const reviewsService = {
  async listPublic(query: ListPublicReviewsQuery) {
    const reviews = await reviewsModel.findPublic(query.limit);
    return { reviews: reviews.map(toPublicReview) };
  },

  async listMine(userId: string) {
    const [reviews, pendingOrders, reviewCount] = await Promise.all([
      reviewsModel.findByUser(userId),
      reviewsModel.findPendingOrders(userId),
      reviewsModel.countByUser(userId),
    ]);

    return {
      reviews: reviews.map(toUserReview),
      pendingOrders: pendingOrders as PendingReviewOrder[],
      reviewCount,
    };
  },

  async create(userId: string, input: CreateReviewInput) {
    const order = await reviewsModel.findOrderForReview(input.orderId);
    if (!order) {
      throw new AppError("Order not found", 404, "NOT_FOUND");
    }
    if (order.userId !== userId) {
      throw new AppError("Order not found", 404, "NOT_FOUND");
    }
    if (order.status !== "COMPLETE") {
      throw new AppError(
        "Only completed orders can be reviewed",
        400,
        "ORDER_NOT_COMPLETE",
      );
    }
    if (order.review) {
      throw new AppError("This order already has a review", 409, "REVIEW_EXISTS");
    }

    const review = await reviewsModel.create(userId, input);
    return toUserReview(review);
  },

  async listAdmin(query: ListAdminReviewsQuery) {
    const result = await reviewsModel.findAdmin(query);
    return {
      reviews: result.reviews.map(toAdminReview),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  },

  async updateAdmin(id: string, input: UpdateAdminReviewInput) {
    const existing = await reviewsModel.findById(id);
    if (!existing) {
      throw new AppError("Review not found", 404, "NOT_FOUND");
    }
    const review = await reviewsModel.updateAdmin(id, input);
    return toAdminReview(review);
  },

  async deleteAdmin(id: string) {
    const existing = await reviewsModel.findById(id);
    if (!existing) {
      throw new AppError("Review not found", 404, "NOT_FOUND");
    }
    await reviewsModel.delete(id);
    return { id };
  },
};
