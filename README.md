# StoreForge AI

**Your next store starts with one prompt.**

StoreForge AI is a SaaS application that turns a business idea into a complete Shopify store concept — brand, products, homepage copy, SEO and a launch plan — in an editable workspace with Shopify-compatible exports.

> StoreForge AI does **not** create or publish a live Shopify store. Users export a Shopify product-import CSV and copy content into a store they create themselves. See [Shopify integration](#shopify-integration).

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Route Handlers, Server Actions), React 19, TypeScript |
| Styling | Tailwind CSS v4 with design tokens (`src/app/globals.css`), shadcn-style components on Radix primitives, Lucide icons |
| Auth & DB | Supabase Auth + PostgreSQL with Row Level Security |
| AI | Anthropic Claude via `@anthropic-ai/sdk` (structured JSON output, server-side only) |
| Payments | Stripe Checkout, Billing Portal, signed webhooks |
| Validation | Zod (inputs, AI output, edits) |
| Tests | Vitest (unit + route tests), SQL tests against PostgreSQL |

## Features

- **Landing page**: hero with interactive example preview, features, how it works, config-driven pricing, footer pages (About, Contact, Privacy, Terms templates).
- **Authentication**: email/password sign-up, sign-in, sign-out, password reset, protected `/dashboard/*` routes (proxy + server checks + RLS).
- **Dashboard**: welcome, project count vs. limit, remaining generation and tool credits, subscription status, quick actions, project cards with confirmed delete, empty states.
- **Store generator**: 4-step wizard (only the business idea is required), draft kept in the browser, server-side generation with strict validation, honest loading screen, automatic credit refund on failure, retry for failed projects.
- **Workspace**: Overview, Branding, Products (grouped by category; add/edit/delete), Homepage (all sections + clearly marked testimonial placeholder), SEO (homepage + per-product), Launch checklist, Export. All edits autosave with a save indicator and unsaved-changes guard.
- **AI tools**: Brand names, Product descriptions, Product ideas, Homepage copy, Brand story, SEO assistant.
- **Billing**: Free / Pro / Business, Stripe Checkout, Billing Portal for upgrades/downgrades/cancellation, webhook-synced subscription state, payment-failure warnings.
- **Credits**: monthly allowances per plan, enforced atomically in Postgres, refunded on failed generations, separate allowance for AI tools.
- **Exports**: Shopify product CSV (imported as drafts), simple CSV, Markdown blueprint (Pro+), full JSON blueprint (Business), copy-all homepage text (all plans).

## Project structure

```
src/
  app/
    (marketing)/          landing, about, contact, privacy, terms
    (auth)/               login, signup, forgot-password, reset-password
    auth/callback|confirm email-link handlers
    dashboard/            overview, new (wizard), projects/[id] (workspace), tools, billing, settings
    api/generate          store generation (POST)
    api/tools/[tool]      AI tools (POST)
    api/projects/[id]/export   CSV / Shopify CSV / Markdown / JSON (GET)
    api/stripe/checkout|portal|webhook
  proxy.ts                session refresh + optimistic route protection
  lib/
    config/plans.ts       pricing, limits, features (env-overridable)
    blueprint.ts          AI output schema + strict app schemas + normaliser
    ai/                   Claude client, store generator, tool definitions & prompts
    billing/              Stripe client, sync, entitlements, plan resolution
    credits.ts            reserve / consume / refund (Postgres RPC)
    rate-limit.ts         Postgres-backed rate limiting
    actions/              Server Actions (auth, project edits)
    export/, shopify/     export formats and the publisher integration layer
supabase/migrations/      schema, RLS, grants, credit & rate-limit functions
tests/unit/               Vitest suites
tests/db/                 SQL/RLS/concurrency tests
```

## Setup

### 1. Install

```bash
npm install
cp .env.example .env.local
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Copy **Project URL**, **anon key** and **service_role key** (Project Settings → API) into `.env.local`.
3. Apply the migration — either paste `supabase/migrations/20261018000000_initial_schema.sql` into the SQL editor, or:
   ```bash
   npx supabase link --project-ref <your-ref>
   npx supabase db push
   ```
4. Auth → URL Configuration: set **Site URL** to your app URL and add `http://localhost:3000/**` (and your production URL) to **Redirect URLs**.
5. Email confirmation is recommended in production (Auth → Providers → Email). The default email templates work with `/auth/callback`. For links that must work across browsers, use token-hash templates pointing at `/auth/confirm`, e.g. for password recovery:
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`

A local Supabase stack also works: `npx supabase start` (requires Docker), then use the printed URL/keys.

### 3. Anthropic

Create an API key at [console.anthropic.com](https://console.anthropic.com) and set `ANTHROPIC_API_KEY`. The default model is `claude-opus-5-5`; override with `AI_MODEL`. Effort levels (`AI_STORE_EFFORT`, `AI_TOOL_EFFORT`) trade quality against cost and latency.

### 4. Stripe (test mode)

1. In the Stripe dashboard (test mode), create two products with **monthly recurring prices** (e.g. €19 and €39) and copy the price IDs into `STRIPE_PRICE_PRO` / `STRIPE_PRICE_BUSINESS`. Keep `PLAN_*_PRICE` in sync with these for display.
2. Set `STRIPE_SECRET_KEY` (`sk_test_...`).
3. Configure the **Customer Portal** (Settings → Billing → Customer portal): allow cancellation, payment-method updates, and *switching plans* between the Pro and Business prices — this is how upgrades and downgrades work.
4. Webhooks:
   - Local: `stripe listen --forward-to localhost:3000/api/stripe/webhook` and copy the printed `whsec_...` into `STRIPE_WEBHOOK_SECRET`.
   - Production: add an endpoint `https://<your-domain>/api/stripe/webhook` with events `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`.
5. Test with card `4242 4242 4242 4242`; test failures with `4000 0000 0000 0341`.

Without Stripe variables the app runs normally on the Free plan and the billing page shows that paid checkout requires configuration.

### 5. Run

```bash
npm run dev        # http://localhost:3000
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run lint` | ESLint |
| `npm run typecheck` | Route type generation + `tsc --noEmit` |
| `npm test` | Vitest unit and route tests (no external services needed) |
| `npm run test:db` | Applies the migration to a throwaway PostgreSQL database and runs RLS, credit and concurrency tests. Needs `psql` and a local Postgres: `PGHOST=/tmp PGPORT=5432 PGUSER=postgres npm run test:db` |

## Security model

- **Secrets** live only in server modules (`src/lib/env.server.ts` is guarded by `server-only`); the browser receives only the Supabase URL and anon key.
- **Authentication** is verified server-side (`supabase.auth.getClaims()`) in every page, Server Action and Route Handler; the proxy only refreshes sessions and redirects optimistically.
- **Row Level Security** on every table. Users can read their own rows; column-level grants let them edit only creative content (never ownership, status, subscription or usage). Projects are created only by the server, so project limits can't be bypassed through the API. Products must belong to a project owned by the same user (trigger-enforced).
- **Subscriptions** are written only from Stripe data: signed webhooks (`constructEvent` on the raw body) and server-side `checkout.sessions.retrieve` on the success redirect. Each sync re-reads the subscription from Stripe's API, so out-of-order webhooks can't roll state back. Webhook events are de-duplicated.
- **Credits** are reserved with `reserve_usage()`, which takes a per-user advisory lock — parallel requests can't double-spend (covered by a 20-request concurrency test). Failed generations are refunded exactly once (`finalize_usage()` only transitions `reserved` rows).
- **Rate limiting** is stored in Postgres (works across serverless instances) and fails closed.
- **AI output** is validated and clamped with Zod before it is saved or shown; errors shown to users never include provider details.
- **Honesty guardrails** in every prompt: no invented statistics, market data, supplier claims or reviews. Testimonials are placeholders only.
- No card data is ever handled; no Shopify credentials are requested.

## Plans and limits

Defaults (all overridable via env, see `.env.example`):

| | Free | Pro | Business |
| --- | --- | --- | --- |
| Price / month | €0 | €19 | €39 |
| Store generations / month | 3 | 30 | 100 |
| AI tool runs / month | 15 | 300 | 1000 |
| Saved projects | 1 | 15 | 75 |
| Products per generation | 4 | 10 | 20 |
| Exports | Copy text | CSV, Shopify CSV, Markdown | + JSON |

Allowances reset at 00:00 UTC on the 1st of each month. `past_due` subscriptions keep access while Stripe retries payment; `unpaid`, `canceled` and expired subscriptions fall back to Free.

**Granting a plan manually in development** (e.g. to test exports without Stripe), in the Supabase SQL editor:

```sql
insert into public.subscriptions (user_id, plan, status, current_period_end)
select id, 'pro', 'active', now() + interval '30 days' from auth.users where email = 'you@example.com'
on conflict (user_id) do update set plan = excluded.plan, status = excluded.status, current_period_end = excluded.current_period_end;
```

## Shopify integration

Current version: export-based. The **Shopify product CSV** uses Shopify's product import format with one default variant per product, imported as **drafts** so nothing goes live before images and review.

`src/lib/shopify/index.ts` defines a `StorePublisher` interface; the CSV exporter is the only implementation. To add direct publishing, implement it with Shopify's official Admin GraphQL API via an OAuth app (minimal scopes such as `write_products`), store the offline token encrypted in a service-role-only table, verify HMAC on callbacks/webhooks and handle uninstalls. Never ask for a merchant's Shopify password.

## Deployment (Vercel)

1. Push the repository and import it in Vercel (framework preset: Next.js).
2. Add all variables from `.env.example` in Project Settings → Environment Variables. Set `NEXT_PUBLIC_APP_URL` to the production URL. Use live Stripe keys/prices only when you're ready to charge.
3. Deploy. Generation routes declare `maxDuration = 300` seconds; your Vercel plan must allow this (Fluid compute / Pro). On plans with shorter limits, lower `AI_STORE_EFFORT` and product counts.
4. Update Supabase Auth redirect URLs and the Stripe webhook endpoint to the production domain.
5. Smoke test: sign up → generate a store → edit → export → upgrade with a test card → confirm the plan updates via the webhook.

## Testing status

- `npm test`: 70 tests covering schemas and normalisation, CSV/Shopify/Markdown exports, plan resolution, usage periods, input validation, the Claude client (request shape, refusal/truncation/invalid JSON/rate-limit handling, all with the SDK mocked), the generation route (auth, validation, rate limits, project limits, 402 on exhausted credits, consume on success, refund on every failure path), and the Stripe webhook (missing/forged/tampered signatures, event handling, duplicates, retry on failure).
- `npm run test:db`: migration, RLS isolation between users, column-level grants, anon lockout, credit limits/refunds/period rollover, rate limiting, cascade deletes, and concurrent double-spend protection.

## Known limitations

- No live Shopify publishing (export only, by design for this version).
- Generation is a single long AI request (typically 1–3 minutes). Progress UI shows elapsed time rather than per-step progress, because there is none to report honestly. If the server process dies mid-generation, the project is shown as interrupted after 10 minutes and can be retried; that reservation stays counted (only explicit failures are refunded).
- Monthly allowances follow the calendar month (UTC), not each subscriber's billing anniversary.
- Workspace autosave is last-write-wins; editing the same project in two tabs at once can overwrite changes.
- Legal pages are templates that must be reviewed by counsel.
- `src/lib/database.types.ts` is maintained by hand; regenerate with `supabase gen types` after schema changes.
