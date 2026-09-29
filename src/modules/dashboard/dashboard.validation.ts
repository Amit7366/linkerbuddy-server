import { z } from "zod";

export const visitorsQuerySchema = z.object({
  range: z.enum(["today", "7d", "30d"]).default("today"),
});
