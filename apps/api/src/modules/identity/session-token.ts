import { createHash, randomBytes } from "node:crypto";

/** Token opaco de 256 bits enviado só no cookie HttpOnly. */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/** O banco guarda apenas o SHA-256: um vazamento da tabela não permite sequestrar sessões. */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
