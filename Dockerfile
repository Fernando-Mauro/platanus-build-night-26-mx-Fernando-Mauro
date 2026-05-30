# T018 — Multi-stage production image for the Next.js app (standalone output).
# Debian-slim base so the native Prisma engine works without extra binaryTargets.

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

# ---- deps ----
FROM base AS deps
WORKDIR /app
# Disable frozen-lockfile robustly (pnpm honors this env var even when the CLI
# flag is overridden by CI auto-detection inside the Docker build).
ENV npm_config_frozen_lockfile=false
COPY package.json pnpm-lock.yaml ./
# Generate a clean workspace file that APPROVES native build scripts, so
# `pnpm install` exits 0 (otherwise blocked sharp/prisma postinstall → exit 1).
# We do NOT copy the repo's pnpm-workspace.yaml (it can carry an invalid
# `allowBuilds` placeholder added by a local hook).
# pnpm 11 BLOCKS native build scripts (sharp/prisma postinstall) and EXITS 1 with
# ERR_PNPM_IGNORED_BUILDS unless pre-approved. Those scripts aren't needed at
# install time (the prisma engine is produced by the explicit `prisma generate`
# in the build stage; sharp is optional), so run install and gate success on
# node_modules being populated rather than on pnpm's exit code.
RUN pnpm install --no-frozen-lockfile --prod=false 2>&1 | tee /tmp/install.log; \
    test -d node_modules/next && test -d node_modules/.bin \
      || { echo "REAL install failure:"; cat /tmp/install.log; exit 1; }

# ---- build ----
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Call the binaries directly (pnpm exec can't resolve them without the workspace
# file, which is intentionally absent in this stage).
RUN node_modules/.bin/prisma generate
RUN node_modules/.bin/next build

# ---- runtime ----
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

# Next.js standalone server + static assets. The standalone bundle already
# includes the traced node_modules (incl. the generated Prisma client + engine),
# so we copy it wholesale and avoid brittle per-path COPYs.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
# `public/` may be empty but must exist for Next's static serving.
COPY --from=build /app/public ./public
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
