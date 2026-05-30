#!/bin/sh
# Compose DATABASE_URL from the individual DB_* vars (host/port/name are plain
# env; username/password are injected from Secrets Manager by the Fargate task),
# then start the Next.js standalone server. Keeps secrets out of the image.
set -e

if [ -n "$DB_HOST" ] && [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="postgresql://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT:-5432}/${DB_NAME:-vertice}?schema=public"
fi

# Sync the schema to the DB. `db push` reconciles whatever state prod is in
# (fresh, or skeleton tables from feature 001 with no migration history) to match
# schema.prisma — no migration-history mismatch to trip over. Idempotent.
echo "[entrypoint] Syncing database schema (prisma db push)..."
node_modules/.bin/prisma db push --skip-generate --accept-data-loss || echo "[entrypoint] db push failed (non-fatal), continuing"

# Seed problems/competencies/model-version (idempotent upserts).
echo "[entrypoint] Seeding database..."
node prisma/seed.mjs || echo "[entrypoint] seed failed (non-fatal), continuing"

echo "[entrypoint] Starting server..."
exec node server.js
