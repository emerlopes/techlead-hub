import { Injectable } from "@nestjs/common";
import {
  buildReleaseReport,
  buildSprintDraft,
  buildSprintReport,
  type CapacityReport,
  type capacityReportQuerySchema,
  type generateReportSchema,
  OPEN_RISK_STATUSES,
  type ReleaseReport,
  type ReportDraft,
  type SprintReport,
} from "@tlh/shared-contracts";
import type { z } from "zod";
import type { AuthContext } from "../identity/auth-context";
import { CapacityService } from "../capacity/capacity.service";
import { JournalService } from "../journal/journal.service";
import { DependenciesService } from "../planning/dependencies.service";
import { ReleasesService } from "../releases/releases.service";
import { RisksService } from "../risks/risks.service";
import { SprintsService } from "../sprints/sprints.service";

const OPEN_RISKS: readonly string[] = OPEN_RISK_STATUSES;

/**
 * Relatórios (§31, §34.17): reúnem o que os módulos já registram e delegam a montagem às regras puras
 * de `report-rules`. Nada é persistido; a previsão da release é só a manual até a Etapa 6 (PEND-9-01).
 */
@Injectable()
export class ReportsService {
  constructor(
    private readonly sprints: SprintsService,
    private readonly releases: ReleasesService,
    private readonly capacity: CapacityService,
    private readonly risks: RisksService,
    private readonly journal: JournalService,
    private readonly dependencies: DependenciesService,
  ) {}

  async sprint(auth: AuthContext, id: string): Promise<SprintReport> {
    const detail = await this.sprints.get(auth, id);
    const workItemIds = [...detail.items, ...detail.departed].map((e) => e.workItem.id);
    const [risks, journal] = await Promise.all([
      this.risks.listForContexts(auth, { sprintId: id, workItemIds }),
      this.journal.listForContexts(auth, { sprintId: id, workItemIds, from: detail.startDate, to: detail.endDate }),
    ]);
    return buildSprintReport({ detail, risks, journal, generatedAt: new Date().toISOString() });
  }

  async release(auth: AuthContext, id: string): Promise<ReleaseReport> {
    const detail = await this.releases.get(auth, id);
    const workItemIds = detail.items.map((i) => i.workItem.id);
    const [dependencies, risks, journal] = await Promise.all([
      this.dependencies.listForSuccessors(auth, workItemIds),
      this.risks.listForContexts(auth, { releaseId: id, workItemIds }),
      // Só o que foi registrado na release: o diário de cada item continua no próprio item.
      this.journal.listForContexts(auth, { releaseId: id, workItemIds: [] }),
    ]);
    return buildReleaseReport({
      detail,
      dependencies,
      risks: risks.filter((r) => OPEN_RISKS.includes(r.status)),
      journal,
      generatedAt: new Date().toISOString(),
    });
  }

  async capacityReport(auth: AuthContext, query: z.output<typeof capacityReportQuerySchema>): Promise<CapacityReport> {
    const overview = await this.capacity.overview(auth, query);
    return { ...overview, generatedAt: new Date().toISOString() };
  }

  /** `POST /reports/generate`: rascunho de demo ou retrospectiva da sprint, gerado na hora (§31.4, §31.5). */
  async generate(auth: AuthContext, input: z.output<typeof generateReportSchema>): Promise<ReportDraft> {
    const report = await this.sprint(auth, input.sprintId);
    return buildSprintDraft(input.type, report, report.generatedAt);
  }
}
