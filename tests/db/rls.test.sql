-- Database tests: run with `npm run test:db` (requires a local PostgreSQL).
-- Every block raises an exception on failure, aborting the run (ON_ERROR_STOP).
\set ON_ERROR_STOP on
set client_min_messages = warning;

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.test', '{"display_name":"Alice"}'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.test', '{}');

-- Profiles are created by trigger.
do $$ begin
  if (select count(*) from public.profiles) <> 2 then raise exception 'profiles not auto-created'; end if;
  if (select display_name from public.profiles where id = '11111111-1111-1111-1111-111111111111') <> 'Alice' then
    raise exception 'display_name not copied'; end if;
end $$;

-- Server (service role) creates projects and products.
set role service_role;
insert into public.projects (id, owner_id, store_name, niche, status) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Alice Store', 'candles', 'ready'),
  ('bbbbbbbb-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Bob Store', 'coffee', 'ready');
insert into public.products (project_id, owner_id, title, price) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Amber Candle', 24.00),
  ('bbbbbbbb-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Dark Roast', 14.00);
insert into public.subscriptions (user_id, plan, status) values
  ('22222222-2222-2222-2222-222222222222', 'pro', 'active');

-- Product owner must match project owner, even for the service role.
do $$ begin
  begin
    insert into public.products (project_id, owner_id, title) values
      ('aaaaaaaa-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Hijack');
    raise exception 'mismatched owner insert should fail';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- ---- As Alice --------------------------------------------------------------
set role authenticated;
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

do $$ begin
  if (select count(*) from public.projects) <> 1 then raise exception 'alice should see exactly 1 project'; end if;
  if (select count(*) from public.products) <> 1 then raise exception 'alice should see exactly 1 product'; end if;
  if (select count(*) from public.subscriptions) <> 0 then raise exception 'alice should not see bob subscription'; end if;
  if (select count(*) from public.profiles) <> 1 then raise exception 'alice should see only her profile'; end if;
end $$;

-- Alice can edit her own content.
update public.projects set store_name = 'Alice Renamed' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
update public.products set price = 30 where project_id = 'aaaaaaaa-0000-0000-0000-000000000001';
insert into public.products (project_id, owner_id, title) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Manual product');

-- Updating someone else's rows affects nothing.
update public.projects set store_name = 'pwned' where id = 'bbbbbbbb-0000-0000-0000-000000000001';
delete from public.products where project_id = 'bbbbbbbb-0000-0000-0000-000000000001';

-- Forbidden operations raise permission errors.
do $$ begin
  begin
    update public.projects set status = 'ready', owner_id = '22222222-2222-2222-2222-222222222222'
      where id = 'aaaaaaaa-0000-0000-0000-000000000001';
    raise exception 'changing owner/status should be denied';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.projects (owner_id, store_name) values ('11111111-1111-1111-1111-111111111111', 'Direct');
    raise exception 'direct project insert should be denied';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.subscriptions (user_id, plan, status) values ('11111111-1111-1111-1111-111111111111', 'business', 'active');
    raise exception 'self-granting a subscription should be denied';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.usage_events (user_id, usage_type, credits, period_start, period_end)
      values ('11111111-1111-1111-1111-111111111111', 'ai_tool', 1, now(), now() + interval '1 day');
    raise exception 'writing usage should be denied';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.reserve_usage('11111111-1111-1111-1111-111111111111', 'ai_tool', 1, 100, now(), now() + interval '1 day');
    raise exception 'calling reserve_usage should be denied';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.products (project_id, owner_id, title) values
      ('bbbbbbbb-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Into bob project');
    raise exception 'inserting into another user project should be denied';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

do $$ begin
  if (select store_name from public.projects where id = 'bbbbbbbb-0000-0000-0000-000000000001') <> 'Bob Store' then
    raise exception 'bob project was modified by alice'; end if;
  if (select count(*) from public.products where project_id = 'bbbbbbbb-0000-0000-0000-000000000001') <> 1 then
    raise exception 'bob product was deleted by alice'; end if;
  if (select store_name from public.projects where id = 'aaaaaaaa-0000-0000-0000-000000000001') <> 'Alice Renamed' then
    raise exception 'alice could not edit her project'; end if;
end $$;

-- ---- Anonymous has no access -------------------------------------------------
set role anon;
do $$ begin
  begin
    perform 1 from public.projects;
    raise exception 'anon should not read projects';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- ---- Credits ----------------------------------------------------------------
set role service_role;
do $$
declare
  r1 uuid; r2 uuid; r3 uuid; r4 uuid;
  p_start timestamptz := '2026-10-01T00:00:00Z';
  p_end timestamptz := '2026-11-01T00:00:00Z';
begin
  r1 := public.reserve_usage('11111111-1111-1111-1111-111111111111', 'store_generation', 1, 2, p_start, p_end);
  r2 := public.reserve_usage('11111111-1111-1111-1111-111111111111', 'store_generation', 1, 2, p_start, p_end);
  r3 := public.reserve_usage('11111111-1111-1111-1111-111111111111', 'store_generation', 1, 2, p_start, p_end);
  if r1 is null or r2 is null then raise exception 'reservations within limit should succeed'; end if;
  if r3 is not null then raise exception 'reservation over limit should fail'; end if;

  -- Refund frees the credit; a second refund / consume is a no-op.
  if not public.finalize_usage(r2, 'refunded') then raise exception 'refund failed'; end if;
  if public.finalize_usage(r2, 'refunded') then raise exception 'double refund should be a no-op'; end if;
  if public.finalize_usage(r2, 'consumed') then raise exception 'consume after refund should be a no-op'; end if;

  r4 := public.reserve_usage('11111111-1111-1111-1111-111111111111', 'store_generation', 1, 2, p_start, p_end);
  if r4 is null then raise exception 'reservation after refund should succeed'; end if;

  -- A new period starts with a fresh allowance.
  if public.reserve_usage('11111111-1111-1111-1111-111111111111', 'store_generation', 1, 2,
       '2026-11-01T00:00:00Z', '2026-12-01T00:00:00Z') is null then
    raise exception 'new period should have a fresh allowance';
  end if;

  -- Separate usage types have separate allowances.
  if public.reserve_usage('11111111-1111-1111-1111-111111111111', 'ai_tool', 1, 2, p_start, p_end) is null then
    raise exception 'ai_tool allowance should be independent';
  end if;
end $$;

-- ---- Rate limit -------------------------------------------------------------
do $$
declare allowed int := 0;
begin
  for i in 1..5 loop
    if public.check_rate_limit('test:key', 3, 60) then allowed := allowed + 1; end if;
  end loop;
  if allowed <> 3 then raise exception 'rate limit allowed % of 5 (expected 3)', allowed; end if;
end $$;
reset role;

-- Cascade: deleting a user removes their data.
delete from auth.users where id = '22222222-2222-2222-2222-222222222222';
do $$ begin
  if exists (select 1 from public.projects where owner_id = '22222222-2222-2222-2222-222222222222')
     or exists (select 1 from public.subscriptions where user_id = '22222222-2222-2222-2222-222222222222') then
    raise exception 'user deletion did not cascade';
  end if;
end $$;

select 'ALL DATABASE TESTS PASSED' as result;
