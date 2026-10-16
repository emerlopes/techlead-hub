import { Controller, Get, HttpCode } from "@nestjs/common";
import { ApiException } from "../../common/api-exception";
import { Public } from "../../common/public.decorator";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Usado pelo healthcheck do Docker Compose e pelo CI: confirma API e banco. */
  @Public()
  @Get()
  @HttpCode(200)
  async check(): Promise<{ status: "ok"; database: "ok" }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ApiException(503, "INTERNAL_ERROR", "Banco de dados indisponível.");
    }
    return { status: "ok", database: "ok" };
  }
}
