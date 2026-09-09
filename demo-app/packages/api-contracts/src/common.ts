import { z } from "zod";

export const resourceIdSchema = z.cuid({
  message: "Identifiant de ressource invalide.",
});

export const apiErrorResponseSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
});

export type ResourceId = z.infer<typeof resourceIdSchema>;
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;