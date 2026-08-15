import type { Request, Response, NextFunction } from "express";
import { leadsService } from "./leads.service.js";
import { successResponse } from "@/utils/apiResponse.js";
import type { CreateLeadInput } from "./leads.types.js";
import type { ListLeadsQuery, ReplyLeadInput, UpdateLeadInput } from "./leads.validation.js";

export const leadsController = {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input: CreateLeadInput = {
        ...req.body,
        userId: req.user?.sub,
      };
      const lead = await leadsService.createLead(input);
      res.status(201).json(successResponse(lead));
    } catch (error) {
      next(error);
    }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as unknown as ListLeadsQuery;
      const result = await leadsService.listLeads(query);
      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  },

  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const lead = await leadsService.getLead(req.params.id as string);
      res.json(successResponse(lead));
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = req.body as UpdateLeadInput;
      const lead = await leadsService.updateLead(req.params.id as string, body.status);
      res.json(successResponse(lead));
    } catch (error) {
      next(error);
    }
  },

  async reply(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = req.body as ReplyLeadInput;
      const reply = await leadsService.replyToLead(req.params.id as string, body, req.user?.sub);
      res.status(201).json(successResponse(reply));
    } catch (error) {
      next(error);
    }
  },
};
