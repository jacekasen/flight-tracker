# Flight Tracker

A personal flight-history app built with Expo Router, React Native, TypeScript, and Supabase. The project is designed as a portfolio-scale flight diary: users can look up flights, build a travel history, and eventually explore routes and statistics.

## Current features

- Timeline-style flights screen with reusable flight cards
- Two-step flight search by flight number and departure date
- Native calendar selection on iOS and Android
- AeroDataBox flight data proxied through a Supabase Edge Function
- Provider-independent flight result normalization
- Supabase schema, generated app types, and row-level security for personal flight records

Search results are currently displayed but are not saved to a user's flight history yet.

Project documentation:

- [`docs/PRODUCT_REQUIREMENTS.md`](docs/PRODUCT_REQUIREMENTS.md) defines the product problem, users, requirements, journeys, success metrics, milestones, and risks.
- [`docs/DESIGN.md`](docs/DESIGN.md) defines the technical architecture, request flows, data model, API contract, engineering decisions, security, testing, and rollout plan.

## Requirements

- Node.js 22 LTS (see `.nvmrc`)
- npm
- Expo Go or an iOS/Android simulator
- A Supabase project

## Start the app

```sh
nvm use
npm install
cp .env.example .env.local
npm start
```

Then add your Supabase project URL and publishable key to `.env.local`. Both values are available from the Supabase project's **Connect** dialog. The publishable key is designed for client apps; never add a `service_role`, provider API key, or other secret to an `EXPO_PUBLIC_` variable.

## Supabase

The app client lives in `src/lib/supabase.ts`. It uses Expo SQLite's local-storage implementation to persist auth sessions and only creates the client after credentials are present.

Apply `supabase/migrations/20260819000000_create_flight_tracker_schema.sql` from the Supabase SQL editor, or with the Supabase CLI after linking the project:

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

The migration creates `profiles` and `flights`, timestamps, indexes, an auth-profile trigger, and row-level security policies that isolate every user's data.

## Flight search

The **Add flight** tab uses this flow:

1. Enter a flight number, such as `UA 120`.
2. Choose the departure date with the native calendar.
3. The app invokes the `search-flights` Supabase Edge Function.
4. The function queries [AeroDataBox](https://aerodatabox.com/) through RapidAPI.
5. Results are normalized and rendered with the app's existing flight cards.

The RapidAPI key remains in Supabase and never ships in the app bundle.

Set it up once:

1. Create a RapidAPI account and subscribe to the AeroDataBox **Basic (free)** plan.
2. Link the local project to Supabase:

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
```

3. Store the RapidAPI key without writing it to shell history:

```sh
read -s "RAPIDAPI_KEY?Paste RapidAPI key: "; echo
npx supabase secrets set AERODATABOX_API_KEY="$RAPIDAPI_KEY"
unset RAPIDAPI_KEY
```

4. Deploy the function:

```sh
npx supabase functions deploy search-flights
```

For local Edge Function development, add `AERODATABOX_API_KEY=your-rapidapi-key` to `supabase/.env.local` (already ignored by Git), then run:

```sh
npx supabase functions serve search-flights --env-file supabase/.env.local
```

The function is intentionally public (`verify_jwt = false` in `supabase/config.toml`) so search works before auth is wired up. It shares the AeroDataBox free quota (~300 searches/month). Add authentication and rate limiting before a broader release.

## Architecture

```text
Expo app
  -> Supabase functions.invoke("search-flights")
  -> Supabase Edge Function
  -> AeroDataBox via RapidAPI
  -> normalized flight results
  -> FlightCard
```

The Edge Function validates flight numbers and dates, handles provider and quota errors, and tolerates incomplete flight records. The client formats airport-local times and prefers revised or actual times when available.

## Current limitations

- Search results cannot yet be added to the user's history.
- Authentication UI is not connected, although the database schema and RLS policies are ready.
- The public search function has no persistent rate limiting.
- AeroDataBox coverage is not uniform, and the free plan has a limited monthly quota.
- Live tracking, notifications, route maps, and flight statistics are future work.

## Project shape

```text
src/app/             Expo Router screens and tabs
src/components/      Reusable UI
src/data/            Temporary preview data
src/lib/             Supabase client and other integrations
src/types/           Database and app-domain types
supabase/functions/  Edge Functions (flight search proxy)
supabase/migrations/ Database schema and RLS
```

## Useful checks

```sh
npm run lint
npx tsc --noEmit
npx expo-doctor
```
