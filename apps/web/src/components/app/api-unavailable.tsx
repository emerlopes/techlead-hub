import { Alert } from "@/components/ui/alert";
import { RetryButton } from "./retry-button";

/** Estado de falha padrão quando a API não responde (§58, RNF-006). */
export function ApiUnavailable() {
  return (
    <Alert tone="danger" title="API indisponível" action={<RetryButton />}>
      Não foi possível carregar os dados. Confira se a API e o banco estão em execução
      (<code className="font-mono text-xs">docker compose ps</code>).
    </Alert>
  );
}
