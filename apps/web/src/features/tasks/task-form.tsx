"use client";

import {
  type ContextRef,
  createTaskSchema,
  type Task,
  taskPriorities,
  taskTypes,
  updateTaskSchema,
  type WorkItemRef,
} from "@tlh/shared-contracts";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormError } from "@/components/app/form-error";
import { RetryButton } from "@/components/app/retry-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckboxGroup } from "@/components/ui/checkbox-group";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { apiMutation } from "@/lib/api/client";
import { useApiForm } from "@/lib/api/use-api-form";
import { hoursInput, hoursOrNull } from "@/lib/form-data";
import { priority, taskType } from "@/lib/design-system/status";

/**
 * Criação e edição de atividade pessoal (§6.2). A situação muda pelas ações dedicadas; aqui ficam
 * os dados e os vínculos com times e projetos (§6.8, RN-023).
 */
export function TaskForm({
  task,
  teams,
  projects,
  workItems,
}: {
  task?: Task;
  /** Contextos que podem ser vinculados (ativos + os já vinculados). */
  teams: ContextRef[];
  projects: ContextRef[];
  /** Itens abertos + os já vinculados. Concluir a atividade não resolve o item (§6.8). */
  workItems: WorkItemRef[];
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
      workItemIds: data.getAll("workItemIds"),
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
  const linkedWorkItems = new Set(task?.workItems.map((w) => w.id));

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
            defaultValue={hoursInput(task?.estimatedHours)}
            aria-invalid={Boolean(err.estimatedHours)}
          />
        </Field>
        {task && (
          <Field label="Esforço realizado (h)" htmlFor="task-actual" error={err.actualHours} hint="Opcional.">
            <Input
              id="task-actual"
              name="actualHours"
              inputMode="decimal"
              defaultValue={hoursInput(task.actualHours)}
              aria-invalid={Boolean(err.actualHours)}
            />
          </Field>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <CheckboxGroup
          legend="Times"
          name="teamIds"
          options={teams.map((t) => ({ id: t.id, code: t.code, label: t.name }))}
          checked={linkedTeams}
          empty="Nenhum time ativo."
          error={err.teamIds}
        />
        <CheckboxGroup
          legend="Projetos"
          name="projectIds"
          options={projects.map((p) => ({ id: p.id, code: p.code, label: p.name }))}
          checked={linkedProjects}
          empty="Nenhum projeto disponível."
          error={err.projectIds}
        />
      </div>

      <CheckboxGroup
        legend="Itens externos acompanhados"
        name="workItemIds"
        options={workItems.map((w) => ({ id: w.id, code: w.externalKey, label: w.title }))}
        checked={linkedWorkItems}
        empty="Nenhum item externo aberto."
        error={err.workItemIds}
      />

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
