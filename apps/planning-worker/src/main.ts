import { existsSync } from "node:fs";
import path from "node:path";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { parseWorkerEnv } from "./env";
import { dispatch, PLANNING_QUEUE } from "./jobs/registry";

for (const file of [path.join(process.cwd(), ".env"), path.resolve(process.cwd(), "../../.env")]) {
  if (existsSync(file)) process.loadEnvFile(file);
}

const env = parseWorkerEnv(process.env);
// BullMQ exige `maxRetriesPerRequest: null` em conexões de worker.
const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });

const worker = new Worker(PLANNING_QUEUE, (job) => dispatch(job.name, job.data), {
  connection,
  concurrency: env.WORKER_CONCURRENCY,
});

worker.on("ready", () => console.log(`[planning-worker] ouvindo a fila "${PLANNING_QUEUE}"`));
worker.on("failed", (job, error) =>
  console.error(`[planning-worker] job ${job?.name}#${job?.id} falhou: ${error.message}`),
);

async function shutdown(signal: string): Promise<void> {
  console.log(`[planning-worker] ${signal} recebido, finalizando jobs em andamento…`);
  await worker.close();
  await connection.quit();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
