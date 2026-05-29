#!/bin/sh
# Compose DATABASE_URL from the individual DB_* vars (host/port/name are plain
# env; username/password are injected from Secrets Manager by the Fargate task),
# then start the Next.js standalone server. Keeps secrets out of the image.
set -e

if [ -n "$DB_HOST" ] && [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="postgresql://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT:-5432}/${DB_NAME:-vertice}?schema=public"
fi

exec node server.js
