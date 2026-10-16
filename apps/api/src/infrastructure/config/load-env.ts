import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Carrega `.env` do diretório atual e, em seguida, da raiz do monorepo.
 * Variáveis já definidas no processo (Docker, CI) têm precedência (§44.4, RNF-013).
 */
export function loadEnvFiles(cwd: string = process.cwd()): void {
  const candidates = [path.join(cwd, ".env"), path.resolve(cwd, "../../.env")];
  for (const file of candidates) {
    if (existsSync(file)) process.loadEnvFile(file);
  }
}
