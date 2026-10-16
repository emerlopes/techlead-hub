# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS base
# OpenSSL é exigido pelo schema engine do Prisma (migrations).
RUN apk add --no-cache openssl && corepack enable
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH COREPACK_ENABLE_DOWNLOAD_PROMPT=0
WORKDIR /repo

# Estágio com todas as dependências; também é usado pelo serviço `migrate`.
FROM base AS build
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter "@tlh/api..." build \
 && pnpm --filter @tlh/api deploy --prod --legacy /out

FROM node:22-alpine AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4000
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 4000
CMD ["node", "dist/main.js"]
