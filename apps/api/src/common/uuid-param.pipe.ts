import { Injectable, type PipeTransform } from "@nestjs/common";
import { z } from "zod";
import { ApiException } from "./api-exception";

const uuid = z.uuid();

/** Identificador de rota inválido é tratado como recurso inexistente. */
@Injectable()
export class UuidParamPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!uuid.safeParse(value).success) throw new ApiException(404, "NOT_FOUND", "Recurso não encontrado.");
    return value;
  }
}
