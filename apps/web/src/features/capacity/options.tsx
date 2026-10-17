export type Option = { id: string; label: string };

export type CapacityOptions = { developers: Option[]; teams: Option[]; projects: Option[] };

/** Percentual digitado ("50" ou "50,5") → fração 0–1; vazio → `undefined` (o schema acusa). */
export function percentToFraction(value: FormDataEntryValue | null): number | undefined {
  const text = String(value ?? "").trim().replace(",", ".");
  return text === "" ? undefined : Number(text) / 100;
}

/** Fração 0–1 → valor inicial do campo de percentual em pt-BR. */
export function fractionToPercentInput(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(Math.round(value * 1000) / 10).replace(".", ",");
}

/** Destino atual continua selecionável mesmo que o contexto tenha sido inativado. */
export function withCurrent(options: readonly Option[], current: { id: string; code: string; name: string } | null | undefined): Option[] {
  if (!current || options.some((o) => o.id === current.id)) return [...options];
  return [{ id: current.id, label: `${current.code} · ${current.name}` }, ...options];
}

/** Lista simples de `<option>`; o primeiro item pode ser vazio. */
export function OptionList({ options, empty }: { options: readonly Option[]; empty?: string }) {
  return (
    <>
      {empty !== undefined && <option value="">{empty}</option>}
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </>
  );
}
