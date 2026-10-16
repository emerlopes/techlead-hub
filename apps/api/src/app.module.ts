import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { AllExceptionsFilter } from "./common/all-exceptions.filter";
import { ConfigModule } from "./infrastructure/config/config.module";
import { PrismaModule } from "./infrastructure/prisma/prisma.module";
import { AuditModule } from "./modules/audit/audit.module";
import { HealthModule } from "./modules/health/health.module";
import { IdentityModule } from "./modules/identity/identity.module";
import { WorkspaceModule } from "./modules/workspace/workspace.module";

@Module({
  imports: [ConfigModule, PrismaModule, AuditModule, IdentityModule, WorkspaceModule, HealthModule],
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class AppModule {}
