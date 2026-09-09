import { z } from "zod";
import { resourceIdSchema } from "./common";

export const launchProgramTriggerKindSchema = z.enum(["MANUAL", "SCHEDULED"]);

export type LaunchProgramTriggerKind = z.infer<typeof launchProgramTriggerKindSchema>;

type LaunchProgramRefinementInput = {
  triggerKind?: LaunchProgramTriggerKind | undefined;
  scheduleExpression?: string | undefined;
};

const scheduleExpressionRequiredWhenScheduled = (
  input: LaunchProgramRefinementInput,
  ctx: z.RefinementCtx,
): void => {
  if (input.triggerKind === "SCHEDULED" && input.scheduleExpression === undefined) {
    ctx.addIssue({
      code: "custom",
      path: ["scheduleExpression"],
      message: "L'expression de planification est obligatoire pour un lancement programmé.",
    });
  }
};

const launchProgramFieldsSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Le titre du programme de lancement est obligatoire.")
    .max(120, "Le titre du programme de lancement ne peut pas dépasser 120 caractères."),
  description: z
    .string()
    .trim()
    .max(1000, "La description ne peut pas dépasser 1000 caractères.")
    .optional(),
  triggerKind: launchProgramTriggerKindSchema.default("MANUAL"),
  scheduleExpression: z
    .string()
    .trim()
    .max(200, "L'expression de planification ne peut pas dépasser 200 caractères.")
    .optional(),
  isEnabled: z.boolean().default(false),
});

export const createLaunchProgramInputSchema =
  launchProgramFieldsSchema.superRefine(scheduleExpressionRequiredWhenScheduled);

export const updateLaunchProgramInputSchema =
  launchProgramFieldsSchema.partial().superRefine(scheduleExpressionRequiredWhenScheduled);

export const launchProgramDtoSchema = z.object({
  id: resourceIdSchema,
  title: z.string(),
  description: z.string().nullable(),
  triggerKind: launchProgramTriggerKindSchema,
  scheduleExpression: z.string().nullable(),
  isEnabled: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const launchProgramListResponseSchema = z.object({
  items: z.array(launchProgramDtoSchema),
});

export type CreateLaunchProgramInput = z.infer<typeof createLaunchProgramInputSchema>;
export type UpdateLaunchProgramInput = z.infer<typeof updateLaunchProgramInputSchema>;
export type LaunchProgramDto = z.infer<typeof launchProgramDtoSchema>;
export type LaunchProgramListResponse = z.infer<typeof launchProgramListResponseSchema>;