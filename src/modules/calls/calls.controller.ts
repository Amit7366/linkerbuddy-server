import type { Request, Response, NextFunction } from "express";
import { callsService } from "./calls.service.js";
import { successResponse } from "@/utils/apiResponse.js";
import type {
  CreateCallInput,
  ListCallsQuery,
  ListSlotsQuery,
  PutAvailabilityInput,
  RescheduleCallInput,
  UpdateCallInput,
} from "./calls.validation.js";

export const callsController = {
  async slots(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as unknown as ListSlotsQuery;
      const slots = await callsService.listSlots(query.date, query.timezone, query.duration);
      res.json(successResponse({ slots }));
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const call = await callsService.createCall(req.body as CreateCallInput, req.user?.sub);
      res.status(201).json(successResponse(call));
    } catch (error) {
      next(error);
    }
  },

  async getManage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const call = await callsService.getByToken(req.params.token as string);
      res.json(successResponse(call));
    } catch (error) {
      next(error);
    }
  },

  async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const call = await callsService.cancelByToken(req.params.token as string);
      res.json(successResponse(call));
    } catch (error) {
      next(error);
    }
  },

  async reschedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = req.body as RescheduleCallInput;
      const call = await callsService.rescheduleByToken(
        req.params.token as string,
        body.startsAt,
        body.timezone,
      );
      res.json(successResponse(call));
    } catch (error) {
      next(error);
    }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as unknown as ListCallsQuery;
      const result = await callsService.listCalls(query);
      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const call = await callsService.updateCall(
        req.params.id as string,
        req.body as UpdateCallInput,
      );
      res.json(successResponse(call));
    } catch (error) {
      next(error);
    }
  },

  async getAvailability(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const availability = await callsService.getAvailability();
      res.json(successResponse(availability));
    } catch (error) {
      next(error);
    }
  },

  async putAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const availability = await callsService.putAvailability(req.body as PutAvailabilityInput);
      res.json(successResponse(availability));
    } catch (error) {
      next(error);
    }
  },
};
