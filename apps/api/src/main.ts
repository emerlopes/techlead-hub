import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { createApp } from "./app.factory";
import { parseEnv } from "./infrastructure/config/env";
import { loadEnvFiles } from "./infrastructure/config/load-env";

async function bootstrap(): Promise<void> {
  loadEnvFiles();
  const env = parseEnv(process.env);
  const app = await createApp();
  await app.listen(env.PORT, env.HOST);
  Logger.log(`API ouvindo em http://${env.HOST}:${env.PORT}/api/v1`, "Bootstrap");
}

void bootstrap();
