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

/**
 * Marca o conteúdo como dependente do instante da requisição. Necessário antes de renderizar o que lê
 * o relógio (ex.: idade da verificação em `WorkItemRow`): com Cache Components e prefetch parcial,
 * cookies e parâmetros não bastam para tirar a página da pré-renderização.
 */
export async function atRequestTime(): Promise<void> {
  await connection();
}
