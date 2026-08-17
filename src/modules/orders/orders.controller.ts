import type { Request, Response, NextFunction } from "express";
import { ordersService } from "./orders.service.js";
import { successResponse } from "@/utils/apiResponse.js";
import type {
  CheckoutIntentInput,
  ListOrdersQuery,
  UpdateOrderInput,
  UpdateOrderStatusInput,
} from "./orders.validation.js";

export const ordersController = {
  async checkoutIntent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await ordersService.createCheckoutIntent(
        req.user!.sub,
        req.body as CheckoutIntentInput,
      );
      res.status(201).json(successResponse(data));
    } catch (error) {
      next(error);
    }
  },

  async listMine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await ordersService.listMine(req.user!.sub, req.query as unknown as ListOrdersQuery);
      res.json(successResponse(data));
    } catch (error) {
      next(error);
    }
  },

  async getMine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await ordersService.getMine(req.user!.sub, req.params.id as string);
      res.json(successResponse(data));
    } catch (error) {
      next(error);
    }
  },

  async confirmPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    // PAYMENT DISABLED — restore with Stripe checkout step 2.
    try {
      const data = await ordersService.confirmPaymentFromClient(
        req.user!.sub,
        req.params.id as string,
      );
      res.json(successResponse(data));
    } catch (error) {
      next(error);
    }
  },

  async cancelMine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await ordersService.cancelMine(
        req.user!.sub,
        req.params.id as string,
      );
      res.json(successResponse(data));
    } catch (error) {
      next(error);
    }
  },

  async listAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await ordersService.listAll(req.query as unknown as ListOrdersQuery);
      res.json(successResponse(data));
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await ordersService.getById(req.params.id as string);
      res.json(successResponse(data));
    } catch (error) {
      next(error);
    }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await ordersService.updateStatus(
        req.params.id as string,
        req.user!.sub,
        req.body as UpdateOrderStatusInput,
      );
      res.json(successResponse(data));
    } catch (error) {
      next(error);
    }
  },

  async updateOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await ordersService.updateOrder(
        req.params.id as string,
        req.body as UpdateOrderInput,
      );
      res.json(successResponse(data));
    } catch (error) {
      next(error);
    }
  },

  async stripeWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = req.headers["stripe-signature"] as string | undefined;
      const rawBody = req.body as Buffer;
      const data = await ordersService.handleStripeWebhook(rawBody, signature);
      res.json(data);
    } catch (error) {
      next(error);
    }
  },
};
