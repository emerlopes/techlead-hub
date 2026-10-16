/** Horas digitadas em pt-BR ("1,5") → número; vazio → `null` (§3.4). */
export function hoursOrNull(value: FormDataEntryValue | null): number | null {
  const text = String(value ?? "").trim().replace(",", ".");
  return text === "" ? null : Number(text);
}

/** Valor inicial de um campo de horas em pt-BR. */
export function hoursInput(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : value.toString().replace(".", ",");
}

/** Valor de `<select>` opcional: vazio → `null` (limpa o campo). */
export function optionalValue(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "");
  return text === "" ? null : text;
}
