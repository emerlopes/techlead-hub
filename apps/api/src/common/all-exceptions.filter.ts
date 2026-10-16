import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Logger,
} from "@nestjs/common";
import { apiErrorSchema, type ApiError, type ErrorCode } from "@tlh/shared-contracts";
import type { Response } from "express";

const codeByStatus: Record<number, ErrorCode> = {
  400: "VALIDATION_FAILED",
  401: "UNAUTHENTICATED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  422: "RULE_VIOLATION",
  429: "TOO_MANY_ATTEMPTS",
};

/** Converte qualquer exceção para o formato único `ApiError`, sem vazar detalhes internos. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("Http");

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const body = this.toApiError(exception);
    if (body.retryAfterSeconds) response.setHeader("Retry-After", String(body.retryAfterSeconds));
    response.status(body.statusCode).json(body);
  }

  private toApiError(exception: unknown): ApiError {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const parsed = apiErrorSchema.safeParse(exception.getResponse());
      if (parsed.success) return parsed.data;
      return {
        statusCode: status,
        code: codeByStatus[status] ?? (status >= 500 ? "INTERNAL_ERROR" : "VALIDATION_FAILED"),
        message: status === 404 ? "Recurso não encontrado." : exception.message,
      };
    }
    // Só o tipo e a mensagem vão para o log: nada de corpo de requisição (§44.5).
    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    return { statusCode: 500, code: "INTERNAL_ERROR", message: "Erro interno inesperado." };
  }
}
