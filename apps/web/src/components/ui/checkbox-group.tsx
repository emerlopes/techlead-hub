import { Checkbox, Label } from "./input";

export type CheckboxOption = { id: string; label: string; code?: string };

/**
 * Seleção múltipla com rolagem própria (vínculos de atividades, riscos e diário). Envia um valor por
 * opção marcada com o mesmo `name` — leia com `FormData.getAll(name)`.
 */
export function CheckboxGroup({
  legend,
  name,
  options,
  checked,
  empty,
  error,
  idPrefix = name,
}: {
  legend: string;
  name: string;
  options: CheckboxOption[];
  checked?: ReadonlySet<string>;
  empty: string;
  error?: string;
  /** Prefixo dos ids: obrigatório quando o mesmo grupo aparece mais de uma vez na página. */
  idPrefix?: string;
}) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5">
      <legend className="mb-1.5 text-xs font-medium">{legend}</legend>
      {options.length === 0 ? (
        <p className="text-xs text-muted-foreground">{empty}</p>
      ) : (
        <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-md border border-input bg-surface p-2">
          {options.map((option) => (
            <span key={option.id} className="flex items-center gap-2">
              <Checkbox id={`${idPrefix}-${option.id}`} name={name} value={option.id} defaultChecked={checked?.has(option.id)} />
              <Label htmlFor={`${idPrefix}-${option.id}`} className="flex min-w-0 items-center gap-1.5 font-normal">
                {option.code && <span className="font-mono text-2xs text-muted-foreground">{option.code}</span>}
                <span className="truncate">{option.label}</span>
              </Label>
            </span>
          ))}
        </div>
      )}
      {error && (
        <p className="text-xs text-danger-fg" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
