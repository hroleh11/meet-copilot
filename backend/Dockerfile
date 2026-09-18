FROM node:24-bookworm-slim AS base
ENV PNPM_HOME="/pnpm" PATH="/pnpm:$PATH" CI=true
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/package.json

FROM base AS build
RUN pnpm install --frozen-lockfile --filter backend
COPY backend backend
RUN pnpm --filter backend exec prisma generate && pnpm --filter backend build
WORKDIR /app/backend
CMD ["pnpm", "exec", "prisma", "migrate", "deploy"]

FROM base AS production-modules
RUN pnpm install --frozen-lockfile --filter backend --prod --no-optional

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=production-modules --chown=node:node /app/node_modules ./node_modules
COPY --from=production-modules --chown=node:node /app/backend/node_modules ./backend/node_modules
COPY --from=build --chown=node:node /app/backend/dist ./backend/dist
USER node
WORKDIR /app/backend
EXPOSE 5070
CMD ["node", "dist/main"]
