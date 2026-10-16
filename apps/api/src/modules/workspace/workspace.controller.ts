import { Body, Controller, Get, Patch } from "@nestjs/common";
import { updateWorkspaceSchema, type UpdateWorkspaceInput, type Workspace } from "@tlh/shared-contracts";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { type AuthContext, CurrentAuth } from "../identity/auth-context";
import { WorkspaceService } from "./workspace.service";

@Controller("workspace")
export class WorkspaceController {
  constructor(private readonly workspaces: WorkspaceService) {}

  @Get()
  get(@CurrentAuth() auth: AuthContext): Promise<Workspace> {
    return this.workspaces.get(auth);
  }

  @Patch()
  update(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(updateWorkspaceSchema)) body: UpdateWorkspaceInput,
  ): Promise<Workspace> {
    return this.workspaces.update(auth, body);
  }
}
