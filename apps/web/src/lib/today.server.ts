import "server-only";
import { todayIn } from "@tlh/shared-contracts";
import { connection } from "next/server";

/**
 * Hoje no fuso do workspace (§35.3), lido no momento da requisição: com Cache Components a data atual
 * não pode entrar na pré-renderização.
 */
export async function requestToday(timeZone: string): Promise<string> {
  await connection();
  return todayIn(timeZone);
}
