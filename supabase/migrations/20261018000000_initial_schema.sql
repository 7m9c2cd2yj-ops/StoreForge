-- StoreForge AI — initial schema
--
-- Security model
--   * Row Level Security is enabled on every table.
--   * `anon` has no access to any table.
--   * `authenticated` can read its own rows. It can edit its own creative
--     content (projects/products/profile), but only through column-level grants,
--     so it can never change ownership, status or server-managed fields.
--   * Subscriptions, usage, rate limits and Stripe events are written only by
--     the server using the service role (which bypasses RLS). Users can read
--     their own subscription and usage rows, nothing else.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile automatically when a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 80), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  store_name text not null check (char_length(store_name) between 1 and 120),
  niche text not null default '' check (char_length(niche) <= 200),
  status text not null default 'generating'
    check (status in ('generating', 'ready', 'failed')),
  input jsonb not null default '{}'::jsonb,
  content jsonb,
  checklist jsonb not null default '[]'::jsonb,
  error_message text check (error_message is null or char_length(error_message) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_input_is_object check (jsonb_typeof(input) = 'object'),
  constraint projects_content_is_object check (content is null or jsonb_typeof(content) = 'object'),
  constraint projects_checklist_is_array check (jsonb_typeof(checklist) = 'array'),
  constraint projects_content_size check (content is null or pg_column_size(content) < 512000)
);

create index projects_owner_created_idx on public.projects (owner_id, created_at desc);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------

create table public.products (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text not null default '' check (char_length(description) <= 5000),
  price numeric(10, 2) not null default 0 check (price >= 0 and price < 10000000),
  category text not null default '' check (char_length(category) <= 100),
  seo jsonb not null default '{}'::jsonb check (jsonb_typeof(seo) = 'object'),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_project_position_idx on public.products (project_id, position);
create index products_owner_idx on public.products (owner_id);

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- A product must belong to a project owned by the same user, and a project
-- holds at most 200 products. Enforced for every writer, including the server.
create or replace function public.enforce_product_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_owner uuid;
  product_count integer;
begin
  select owner_id into project_owner from public.projects where id = new.project_id;
  if project_owner is null or project_owner <> new.owner_id then
    raise exception 'Product owner must match project owner' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    select count(*) into product_count from public.products where project_id = new.project_id;
    if product_count >= 200 then
      raise exception 'A project can contain at most 200 products' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create trigger products_enforce_rules
  before insert or update on public.products
  for each row execute function public.enforce_product_rules();

-- ---------------------------------------------------------------------------
-- Subscriptions (server-managed, synced from Stripe webhooks)
-- ---------------------------------------------------------------------------

create table public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text not null default 'free' check (plan in ('free', 'pro', 'business')),
  status text not null default 'none',
  price_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Processed Stripe webhook events, for idempotency.
create table public.stripe_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Usage ledger (server-managed)
-- ---------------------------------------------------------------------------

create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  usage_type text not null check (usage_type in ('store_generation', 'ai_tool')),
  credits integer not null check (credits > 0),
  status text not null default 'reserved' check (status in ('reserved', 'consumed', 'refunded')),
  period_start timestamptz not null,
  period_end timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint usage_period_valid check (period_end > period_start)
);

create index usage_events_user_period_idx
  on public.usage_events (user_id, usage_type, period_start);

create trigger usage_events_set_updated_at
  before update on public.usage_events
  for each row execute function public.set_updated_at();

-- Atomically reserve credits if the user is under their limit for the period.
-- A per-user/per-type transaction advisory lock serialises concurrent calls, so
-- parallel requests can never double-spend the same allowance.
-- Returns the reservation id, or null when the limit would be exceeded.
create or replace function public.reserve_usage(
  p_user_id uuid,
  p_usage_type text,
  p_credits integer,
  p_limit integer,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  used integer;
  reservation_id uuid;
begin
  if p_credits <= 0 then
    raise exception 'p_credits must be positive';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_usage_type, 0));

  select coalesce(sum(credits), 0) into used
  from public.usage_events
  where user_id = p_user_id
    and usage_type = p_usage_type
    and period_start = p_period_start
    and status <> 'refunded';

  if used + p_credits > p_limit then
    return null;
  end if;

  insert into public.usage_events (user_id, usage_type, credits, status, period_start, period_end, metadata)
  values (p_user_id, p_usage_type, p_credits, 'reserved', p_period_start, p_period_end, coalesce(p_metadata, '{}'::jsonb))
  returning id into reservation_id;

  return reservation_id;
end;
$$;

-- Finalise a reservation: 'consumed' on success, 'refunded' on eligible failure.
-- Only reservations still in 'reserved' state can transition, so a refund can
-- never be applied twice.
create or replace function public.finalize_usage(p_reservation_id uuid, p_status text)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  updated_count integer;
begin
  if p_status not in ('consumed', 'refunded') then
    raise exception 'Invalid status %', p_status;
  end if;

  update public.usage_events
  set status = p_status
  where id = p_reservation_id and status = 'reserved';

  get diagnostics updated_count = row_count;
  return updated_count = 1;
end;
$$;

-- ---------------------------------------------------------------------------
-- Rate limiting (fixed window, server-managed)
-- ---------------------------------------------------------------------------

create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key, window_start)
);

-- Increments the counter for the current window and returns true when the
-- request is allowed. Works across serverless instances because state lives in
-- Postgres.
create or replace function public.check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  bucket timestamptz;
  current_count integer;
begin
  bucket := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.rate_limits (key, window_start, count)
  values (p_key, bucket, 1)
  on conflict (key, window_start)
  do update set count = public.rate_limits.count + 1
  returning count into current_count;

  -- Opportunistic cleanup of old windows for this key.
  delete from public.rate_limits
  where key = p_key and window_start < bucket - make_interval(secs => p_window_seconds * 2);

  return current_count <= p_limit;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.products enable row level security;
alter table public.subscriptions enable row level security;
alter table public.stripe_events enable row level security;
alter table public.usage_events enable row level security;
alter table public.rate_limits enable row level security;

-- Profiles
create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Projects (creation happens server-side so plan limits are enforced)
create policy "Users can read their own projects"
  on public.projects for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Users can update their own projects"
  on public.projects for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Users can delete their own projects"
  on public.projects for delete to authenticated
  using ((select auth.uid()) = owner_id);

-- Products
create policy "Users can read their own products"
  on public.products for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Users can add products to their own projects"
  on public.products for insert to authenticated
  with check (
    (select auth.uid()) = owner_id
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = (select auth.uid())
    )
  );

create policy "Users can update their own products"
  on public.products for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Users can delete their own products"
  on public.products for delete to authenticated
  using ((select auth.uid()) = owner_id);

-- Subscriptions & usage: read-only for the owner
create policy "Users can read their own subscription"
  on public.subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can read their own usage"
  on public.usage_events for select to authenticated
  using ((select auth.uid()) = user_id);

-- stripe_events and rate_limits: no policies => no access except service role.

-- ---------------------------------------------------------------------------
-- Privileges (defence in depth on top of RLS)
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

grant select, delete on public.projects to authenticated;
grant update (store_name, niche, content, checklist) on public.projects to authenticated;

grant select, insert, delete on public.products to authenticated;
grant update (title, description, price, category, seo, position) on public.products to authenticated;

grant select on public.subscriptions to authenticated;
grant select on public.usage_events to authenticated;

grant all on all tables in schema public to service_role;
grant execute on function public.reserve_usage(uuid, text, integer, integer, timestamptz, timestamptz, jsonb) to service_role;
grant execute on function public.finalize_usage(uuid, text) to service_role;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

-- Trigger functions run as triggers, never called directly.
-- (set_updated_at / handle_new_user / enforce_product_rules have no grants.)
