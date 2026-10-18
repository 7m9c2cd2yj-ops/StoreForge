#!/usr/bin/env bash
# Fires 20 parallel reservations against a limit of 3 and checks exactly 3 win.
set -euo pipefail
PSQL=(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -qtA)
"${PSQL[@]}" -c "insert into auth.users (id, email) values ('33333333-3333-3333-3333-333333333333', 'race@example.test') on conflict do nothing"
for i in $(seq 1 20); do
  "${PSQL[@]}" -c "set role service_role; select public.reserve_usage('33333333-3333-3333-3333-333333333333', 'store_generation', 1, 3, '2026-10-01T00:00:00Z', '2026-11-01T00:00:00Z')" >/dev/null &
done
wait
count=$("${PSQL[@]}" -c "select count(*) from public.usage_events where user_id = '33333333-3333-3333-3333-333333333333'")
if [ "$count" != "3" ]; then
  echo "CONCURRENCY TEST FAILED: $count reservations granted (expected 3)"; exit 1
fi
echo "CONCURRENCY TEST PASSED: 20 parallel requests, exactly 3 reservations granted"
