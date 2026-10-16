import { z } from "zod";

export const errorCodes = [
  "VALIDATION_FAILED",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "CSRF_REJECTED",
  "NOT_FOUND",
  "CONFLICT",
  "SETUP_ALREADY_DONE",
  "SETUP_REQUIRED",
  "INVALID_CREDENTIALS",
  "TOO_MANY_ATTEMPTS",
  "INTERNAL_ERROR",
] as const;

export type ErrorCode = (typeof errorCodes)[number];

/** Formato único de erro devolvido pela API (RNF-006). */
export const apiErrorSchema = z.object({
  statusCode: z.number().int(),
  code: z.enum(errorCodes),
  message: z.string(),
  details: z
    .array(z.object({ path: z.string(), message: z.string() }))
    .optional(),
  retryAfterSeconds: z.number().int().optional(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;
