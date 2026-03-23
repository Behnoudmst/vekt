#!/bin/sh
set -e

if [ -z "$AUTH_SECRET" ]; then
	echo "❌ AUTH_SECRET is required." >&2
	exit 1
fi

if [ -z "$INNGEST_EVENT_KEY" ] || [ -z "$INNGEST_SIGNING_KEY" ]; then
	echo "❌ INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY are required." >&2
	exit 1
fi

echo "→ Running database migrations…"
npx prisma migrate deploy

if [ "${SEED_ON_START:-false}" = "true" ]; then
	if [ -z "$SEED_ADMIN_PASSWORD" ]; then
		echo "❌ SEED_ADMIN_PASSWORD is required when SEED_ON_START=true." >&2
		exit 1
	fi

	echo "→ Seeding database…"
	./node_modules/.bin/tsx scripts/seed.ts
else
	echo "→ Skipping seed (set SEED_ON_START=true for first-time bootstrap)…"
fi

echo "→ Starting Next.js…"
exec node server.js
