import type { ApiError } from "@tlh/shared-contracts";
import { Alert } from "@/components/ui/alert";

/** Erro geral de formulário. Bloqueio e conflito são situações esperadas: tom de aviso. */
export function FormError({ error, action }: { error: ApiError | null; action?: React.ReactNode }) {
  if (!error) return null;
  const expected = error.code === "TOO_MANY_ATTEMPTS" || error.code === "CONFLICT";
  return <Alert tone={expected ? "warning" : "danger"} title={error.message} action={action} />;
}
