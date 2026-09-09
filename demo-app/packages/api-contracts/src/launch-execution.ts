import { z } from "zod";
import { resourceIdSchema } from "./common";

export const launchExecutionStatusSchema = z.enum(["PENDING", "RUNNING", "SUCCEEDED", "FAILED"]);

export const createLaunchExecutionInputSchema = z.object({
  programId: resourceIdSchema,
  note: z
    .string()
    .trim()
    .max(500, "La note de lancement ne peut pas dépasser 500 caractères.")
    .optional(),
});

export const launchExecutionDtoSchema = z.object({
  id: resourceIdSchema,
  programId: resourceIdSchema,
  status: launchExecutionStatusSchema,
  note: z.string().nullable(),
  triggeredById: resourceIdSchema.nullable(),
  startedAt: z.iso.datetime().nullable(),
  finishedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const launchExecutionListResponseSchema = z.object({
  items: z.array(launchExecutionDtoSchema),
});

export type CreateLaunchExecutionInput = z.infer<typeof createLaunchExecutionInputSchema>;
export type LaunchExecutionDto = z.infer<typeof launchExecutionDtoSchema>;
export type LaunchExecutionListResponse = z.infer<typeof launchExecutionListResponseSchema>;
export type LaunchExecutionStatus = z.infer<typeof launchExecutionStatusSchema>;