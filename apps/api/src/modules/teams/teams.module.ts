import { Module } from "@nestjs/common";
import { AssociationsService } from "./associations.service";
import { TeamDevelopersController, TeamProjectsController, TeamsController } from "./teams.controller";
import { TeamsService } from "./teams.service";

@Module({
  controllers: [TeamsController, TeamProjectsController, TeamDevelopersController],
  providers: [TeamsService, AssociationsService],
})
export class TeamsModule {}
