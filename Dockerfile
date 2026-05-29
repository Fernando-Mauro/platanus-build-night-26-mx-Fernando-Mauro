# T018 — Multi-stage production image for the Next.js app (standalone output).
# Debian-slim base so the native Prisma engine works without extra binaryTargets.

FROM node:20-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

# ---- deps ----
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
# Generate a clean workspace file that APPROVES native build scripts, so
# `pnpm install` exits 0 (otherwise blocked sharp/prisma postinstall → exit 1).
# We do NOT copy the repo's pnpm-workspace.yaml (it can carry an invalid
# `allowBuilds` placeholder added by a local hook).
RUN printf 'onlyBuiltDependencies:\n  - sharp\n  - "@prisma/client"\n  - "@prisma/engines"\n  - prisma\n  - esbuild\n' > pnpm-workspace.yaml
RUN pnpm install --no-frozen-lockfile --prod=false

# ---- build ----
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm exec prisma generate
RUN pnpm exec next build

# ---- runtime ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

# Next.js standalone server + static assets + public dir
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# Ensure the generated Prisma client + native query engine are present (Next.js
# standalone file-tracing can miss the engine binary).
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
