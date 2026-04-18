#!/bin/sh
set -e

echo "Starting deployment checks..."

# Run database migrations
# This will safely apply any pending migrations to the PostgreSQL database
echo "Executing Prisma migrations..."
npx prisma migrate deploy

echo "Starting Next.js application..."
exec "$@"
