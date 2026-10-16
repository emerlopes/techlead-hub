import { HttpException } from "@nestjs/common";
import type { ApiError, ErrorCode } from "@tlh/shared-contracts";

/** Exceção de domínio já no formato público de erro (RNF-006). */
export class ApiException extends HttpException {
  constructor(
    statusCode: number,
    code: ErrorCode,
    message: string,
    extra: Pick<ApiError, "details" | "retryAfterSeconds"> = {},
  ) {
    const body: ApiError = { statusCode, code, message, ...extra };
    super(body, statusCode);
  }
}
