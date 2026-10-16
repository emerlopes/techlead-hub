import { Injectable, type PipeTransform } from "@nestjs/common";
import type { z } from "zod";
import { ApiException } from "./api-exception";

/** Valida o corpo com o schema compartilhado de `@tlh/shared-contracts` (RNF-005). */
@Injectable()
export class ZodValidationPipe<T extends z.ZodType> implements PipeTransform<unknown, z.output<T>> {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.output<T> {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;
    throw new ApiException(400, "VALIDATION_FAILED", "Dados inválidos.", {
      details: result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }
}
