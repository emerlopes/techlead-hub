import "server-only";
import { PAGE_SIZE_MAX, paginatedSchema, workItemSchema } from "@tlh/shared-contracts";
import { loadApi } from "./server";

const workItemPage = paginatedSchema(workItemSchema);

/**
 * Itens externos abertos para seleção em formulários (vínculos, escopo de sprint e release). Limitado
 * à primeira página máxima; a busca completa fica na listagem de entregas.
 */
export function loadOpenWorkItems() {
  return loadApi(`/work-items?scope=open&pageSize=${PAGE_SIZE_MAX}`, workItemPage);
}

export { workItemPage };
