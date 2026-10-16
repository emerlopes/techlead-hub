"use client";

import {
  type ContextRef,
  createTaskSchema,
  type Task,
  taskPriorities,
  taskTypes,
  updateTaskSchema,
} from "@tlh/shared-contracts";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormError } from "@/components/app/form-error";
import { RetryButton } from "@/components/app/retry-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Label, Select, Textarea } from "@/components/ui/input";
import { apiMutation } from "@/lib/api/client";
import { useApiForm } from "@/lib/api/use-api-form";
import { priority, taskType } from "@/lib/design-system/status";

function hoursOrNull(value: FormDataEntryValue | null): number | null {
  const text = String(value ?? "").trim().replace(",", ".");
  return text === "" ? null : Number(text);
}

/**
 * Criação e edição de atividade pessoal (§6.2). A situação muda pelas ações dedicadas; aqui ficam
 * os dados e os vínculos com times e projetos (§6.8, RN-023).
 */
export function TaskForm({
  task,
  teams,
  projects,
}: {
  task?: Task;
  /** Contextos que podem ser vinculados (ativos + os já vinculados). */
  teams: ContextRef[];
  projects: ContextRef[];
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const form = useApiForm({
    schema: task ? updateTaskSchema : createTaskSchema,
    read: (data) => ({
      title: data.get("title"),
      type: data.get("type"),
      priority: data.get("priority"),
      dueDate: data.get("dueDate"),
      nextAction: data.get("nextAction"),
      description: data.get("description"),
      estimatedHours: hoursOrNull(data.get("estimatedHours")),
      ...(task && { actualHours: hoursOrNull(data.get("actualHours")) }),
      ...(task?.status === "BLOCKED" && { blockedReason: data.get("blockedReason") }),
      teamIds: data.getAll("teamIds"),
      projectIds: data.getAll("projectIds"),
      ...(task && { version: task.version }),
    }),
    submit: (input) => {
      setSaved(false);
      return task ? apiMutation<Task>("PATCH", `/tasks/${task.id}`, input) : apiMutation<Task>("POST", "/tasks", input);
    },
    onSuccess: (result) => {
      if (task) {
        setSaved(true);
        router.refresh();
      } else {
        router.push(`/tasks/${result.id}`);
      }
    },
  });
  const err = form.fieldErrors;
  const linkedTeams = new Set(task?.teams.map((t) => t.id));
  const linkedProjects = new Set(task?.projects.map((p) => p.id));

  return (
    <form key={task?.version} onSubmit={form.onSubmit} noValidate className="flex flex-col gap-4">
      <FormError error={form.error} action={form.error?.code === "CONFLICT" ? <RetryButton label="Recarregar" /> : undefined} />
      {saved && !form.error && <Alert tone="success" title="Atividade atualizada." />}

      <Field label="Título" htmlFor="task-title" required error={err.title}>
        <Input id="task-title" name="title" defaultValue={task?.title} maxLength={200} aria-invalid={Boolean(err.title)} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Tipo" htmlFor="task-type" error={err.type}>
          <Select id="task-type" name="type" defaultValue={task?.type ?? "OTHER"}>
            {taskTypes.map((value) => (
              <option key={value} value={value}>
                {taskType[value].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Prioridade" htmlFor="task-priority" error={err.priority} hint="Pessoal, manual (RN-004).">
          <Select id="task-priority" name="priority" defaultValue={task?.priority ?? "MEDIUM"}>
            {taskPriorities.map((value) => (
              <option key={value} value={value}>
                {priority[value].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Prazo" htmlFor="task-due" error={err.dueDate}>
          <Input id="task-due" name="dueDate" type="date" defaultValue={task?.dueDate ?? ""} aria-invalid={Boolean(err.dueDate)} />
        </Field>
      </div>

      <Field label="Próxima ação" htmlFor="task-next" error={err.nextAction} hint="O passo concreto seguinte.">
        <Input id="task-next" name="nextAction" defaultValue={task?.nextAction ?? ""} maxLength={300} />
      </Field>

      {task?.status === "BLOCKED" && (
        <Field label="Motivo do bloqueio" htmlFor="task-blocked" error={err.blockedReason}>
          <Input id="task-blocked" name="blockedReason" defaultValue={task.blockedReason ?? ""} maxLength={500} />
        </Field>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Esforço estimado (h)" htmlFor="task-estimate" error={err.estimatedHours}>
          <Input
            id="task-estimate"
            name="estimatedHours"
            inputMode="decimal"
            defaultValue={task?.estimatedHours?.toString().replace(".", ",") ?? ""}
            aria-invalid={Boolean(err.estimatedHours)}
          />
        </Field>
        {task && (
          <Field label="Esforço realizado (h)" htmlFor="task-actual" error={err.actualHours} hint="Opcional.">
            <Input
              id="task-actual"
              name="actualHours"
              inputMode="decimal"
              defaultValue={task.actualHours?.toString().replace(".", ",") ?? ""}
              aria-invalid={Boolean(err.actualHours)}
            />
          </Field>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ContextChecklist
          legend="Times"
          name="teamIds"
          options={teams}
          checked={linkedTeams}
          empty="Nenhum time ativo."
          error={err.teamIds}
        />
        <ContextChecklist
          legend="Projetos"
          name="projectIds"
          options={projects}
          checked={linkedProjects}
          empty="Nenhum projeto disponível."
          error={err.projectIds}
        />
      </div>

      <Field label="Descrição" htmlFor="task-description" error={err.description}>
        <Textarea id="task-description" name="description" defaultValue={task?.description ?? ""} maxLength={5000} />
      </Field>

      <div className="flex justify-end">
        <Button type="submit" disabled={form.pending}>
          <Save aria-hidden />
          {form.pending ? "Salvando…" : task ? "Salvar" : "Criar atividade"}
        </Button>
      </div>
    </form>
  );
}

function ContextChecklist({
  legend,
  name,
  options,
  checked,
  empty,
  error,
}: {
  legend: string;
  name: string;
  options: ContextRef[];
  checked: Set<string>;
  empty: string;
  error?: string;
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
              <Checkbox id={`${name}-${option.id}`} name={name} value={option.id} defaultChecked={checked.has(option.id)} />
              <Label htmlFor={`${name}-${option.id}`} className="flex min-w-0 items-center gap-1.5 font-normal">
                <span className="font-mono text-2xs text-muted-foreground">{option.code}</span>
                <span className="truncate">{option.name}</span>
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
