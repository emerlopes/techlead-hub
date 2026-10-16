import { Body, Controller, Get, HttpCode, Inject, Post, Res } from "@nestjs/common";
import {
  type AuthStatus,
  loginSchema,
  type LoginInput,
  type Me,
  setupSchema,
} from "@tlh/shared-contracts";
import type { Response } from "express";
import type { z } from "zod";
import { Public } from "../../common/public.decorator";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { ENV } from "../../infrastructure/config/config.module";
import type { Env } from "../../infrastructure/config/env";
import { type AuthContext, CurrentAuth } from "./auth-context";
import { AuthService } from "./auth.service";
import { clearSessionCookie, setSessionCookie } from "./session-cookie";

/** Contratos de autenticação (§36.2). `GET /auth/status` informa se o setup inicial é necessário. */
@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @Public()
  @Get("status")
  status(): Promise<AuthStatus> {
    return this.auth.status();
  }

  @Public()
  @Post("setup")
  async setup(
    @Body(new ZodValidationPipe(setupSchema)) body: z.output<typeof setupSchema>,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Me> {
    const { me, token, expiresAt } = await this.auth.setup(body);
    setSessionCookie(res, this.env, token, expiresAt);
    return me;
  }

  @Public()
  @Post("login")
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Me> {
    const { me, token, expiresAt } = await this.auth.login(body);
    setSessionCookie(res, this.env, token, expiresAt);
    return me;
  }

  @Post("logout")
  @HttpCode(204)
  async logout(
    @CurrentAuth() auth: AuthContext,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.logout(auth);
    clearSessionCookie(res, this.env);
  }

  @Get("me")
  me(@CurrentAuth() auth: AuthContext): Promise<Me> {
    return this.auth.me(auth);
  }
}
