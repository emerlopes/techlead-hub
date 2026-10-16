import type { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { API_PREFIX } from "@tlh/shared-contracts";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

/** Monta a aplicação com a mesma configuração em produção e nos testes de integração. */
export async function createApp(options: { logger?: false } = {}): Promise<INestApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    ...options,
    bodyParser: true,
  });
  app.setGlobalPrefix(API_PREFIX.replace(/^\//, ""));
  app.use(cookieParser());
  app.disable("x-powered-by");
  // Necessário para `req.secure`/IP corretos atrás do proxy da web.
  app.set("trust proxy", "loopback, uniquelocal");
  app.enableShutdownHooks();
  return app;
}
