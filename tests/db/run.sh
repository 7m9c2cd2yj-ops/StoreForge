#!/usr/bin/env bash
# Applies the shim + all migrations to a throwaway database and runs the tests.
# Usage: PGHOST=... PGPORT=... PGUSER=postgres npm run test:db
set -euo pipefail
cd "$(dirname "$0")/../.."
DB=storeforge_test
psql -v ON_ERROR_STOP=1 -q -d postgres -c "drop database if exists $DB" -c "create database $DB"
export DATABASE_URL="postgresql:///$DB?host=${PGHOST:-/tmp}&port=${PGPORT:-5432}&user=${PGUSER:-postgres}"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f tests/db/supabase-shim.sql
for f in supabase/migrations/*.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$f"
done
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f tests/db/rls.test.sql
bash tests/db/concurrency.sh
