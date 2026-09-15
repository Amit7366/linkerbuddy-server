#!/bin/sh
set -e

echo "Syncing Prisma schema..."
npx prisma db push --skip-generate

echo "Starting API..."
exec node dist/server.js
