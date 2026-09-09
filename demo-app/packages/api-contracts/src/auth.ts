import { z } from "zod";
import { resourceIdSchema } from "./common";

export const sessionUserDtoSchema = z.object({
  id: resourceIdSchema,
  email: z.email(),
  name: z.string().nullable(),
  image: z.url().nullable(),
});

export const sessionDtoSchema = z.object({
  user: sessionUserDtoSchema,
  expires: z.iso.datetime(),
});

export type SessionUserDto = z.infer<typeof sessionUserDtoSchema>;
export type SessionDto = z.infer<typeof sessionDtoSchema>;