# SWEAT IT ON

Compete with friends on **calories burned** (the crown) plus walk+run **miles** and average **run/walk pace**. Sync Apple Watch and Garmin through **Strava**.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Supabase (Auth, Postgres, Realtime)
- Strava OAuth + activity sync

## Setup

### 1. Install

```bash
npm install
cp .env.example .env.local
```

### 2. Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Paste **Project URL**, **anon key**, and **service role key** into `.env.local`
3. In the SQL editor, run [`supabase/migrations/001_initial.sql`](supabase/migrations/001_initial.sql)
4. Auth → URL configuration: add `http://localhost:3000/auth/callback`

### 3. Strava

1. Create an API app at [strava.com/settings/api](https://www.strava.com/settings/api)
2. Set **Authorization Callback Domain** to your host (for local: use a tunnel or `localhost` if allowed)
3. Set `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, and `NEXT_PUBLIC_APP_URL` in `.env.local`
4. Callback path used by the app: `{APP_URL}/api/strava/callback`
5. Optional webhook: `{APP_URL}/api/strava/webhook` with verify token `STRAVA_VERIFY_TOKEN`

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How scoring works

| Metric | Rule |
|---|---|
| **Winner** | Most calories from Run + Walk (+ Trail Run) in the period |
| **Miles** | Combined walk + run distance |
| **Run pace** | Distance-weighted average min/mile from runs |
| **Walk pace** | Distance-weighted average min/mile from walks |

Periods: **daily**, **weekly** (Mon–Sun), **monthly**.

## Watch setup for friends

- **Apple Watch:** Strava iOS app + Health permissions, then Connect Strava on SWEAT IT ON
- **Garmin:** Garmin Connect → upload to Strava, then Connect Strava on SWEAT IT ON

## Groups

- **Public** — listed, one-click join
- **Private** — password required to join
