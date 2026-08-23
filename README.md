# Flight Tracker

A personal flight-history app built with Expo Router, React Native, TypeScript, and Supabase. The project is designed as a portfolio-scale flight diary: users can look up flights, build a travel history, and explore routes and statistics.

Phase 1 (flight search), Phase 2 (authenticated personal history), and Phase 3 (travel insights) are implemented. Phase 4 portfolio hardening remains.

## Current features

- Timeline-style flights screen with reusable flight cards
- Two-step flight search by flight number and departure date
- Native calendar selection on iOS and Android
- AeroDataBox flight data proxied through a Supabase Edge Function
- Provider-independent flight result normalization
- Email/password authentication with persisted sessions
- Search-result confirmation with optional seat and notes
- Private Supabase-backed history split into upcoming and completed flights
- Flight details, personal-field editing, manual-itinerary editing, and confirmed deletion
- Manual flight entry when provider lookup is unavailable
- Row-level security for all personal flight records
- Global airport coordinate and country metadata from OurAirports
- Private route map with distance and flight-time totals
- Airline, airport, country, and aircraft summaries
- All-time insights and selectable yearly recaps

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

Apply all migrations with the Supabase CLI after linking the project:

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

The migrations create `profiles`, `flights`, and the read-only airport reference table; import 4,134 scheduled-service airports; backfill coordinates, countries, and missing route distances; create indexes and enrichment triggers; and enforce row-level security that isolates every user's data.

The airport import is generated from the public-domain [OurAirports dataset](https://ourairports.com/data/). Before this migration is deployed for the first time, its checked-in snapshot can be refreshed with:

```sh
node scripts/generate-airport-migration.mjs
```

After the import migration has been deployed, do not rewrite it. Generate a new timestamped migration for later dataset refreshes.

## Authentication and history

The **Profile** tab supports email/password account creation, sign-in, persisted sessions, and sign-out. Search and all history operations require an authenticated session.

After selecting a search result, the confirmation screen:

1. Displays the airline, route, scheduled times, and status.
2. Accepts optional seat and personal notes.
3. Saves through the Supabase Data API with the authenticated user's ID.
4. Treats the database uniqueness constraint as duplicate protection.

The **Flights** tab queries only records visible through RLS, separates upcoming and completed flights, and refreshes whenever it regains focus. A saved flight can be opened to edit seat or notes, edit a manually entered itinerary, or delete the record after confirmation.

When lookup fails or returns no matches, **Enter flight manually** creates a record without a provider request. Manual entry validates required fields, three-letter airport codes, and arrival-after-departure ordering.

## Travel insights

The **Insights** tab derives every recap from the signed-in user's RLS-protected flight rows. It includes:

- All-time or year-specific flight, distance, and time-aloft totals
- A native iOS and Android route map, with a web-safe fallback
- Ranked airline, airport, country, and aircraft summaries
- Partial-data handling so a missing distance, aircraft, or airport match does not remove the flight from unrelated totals

Airport metadata is optional on each flight during rollout. Applying the Phase 3 migrations backfills existing rows and enriches future inserts automatically.

The native map works in Expo Go. Before producing a standalone Android build, configure a Google Maps SDK for Android key through Expo's `android.config.googleMaps.apiKey`. Restrict the key to the Android application and the Maps SDK rather than treating it as a server-side secret.

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

The function requires a valid Supabase user token (`verify_jwt = true` in `supabase/config.toml`) and the app requires sign-in before search. It still shares the AeroDataBox free quota (~300 searches/month), so persistent rate limiting and response caching are required before a broader release.

## Architecture

```text
Expo app
  ├─> Supabase Auth session
  ├─> search-flights Edge Function -> AeroDataBox via RapidAPI
  │     -> normalized result -> confirmation
  └─> private Postgres history protected by RLS
        -> airport enrichment trigger
        -> timeline and client-side insights
              ├─> native route map
              └─> totals, rankings, and yearly recaps
```

The Edge Function validates flight numbers and dates, handles provider and quota errors, and tolerates incomplete flight records. The client formats airport-local times, prefers revised or actual times when available, paginates history, and computes insights only from rows visible to the authenticated user.

## Delivery status

- Complete: search foundation, authenticated personal history, and travel insights.
- Later: automated tests, CI, rate limiting, provider-result caching, data export, and account deletion.

## Current limitations

- Search has no persistent per-user rate limiting or provider-result cache.
- AeroDataBox coverage is not uniform, and the free plan has a limited monthly quota.
- Manual-entry date pickers currently interpret times in the device time zone.
- Live tracking and notifications are out of scope for the portfolio MVP.

## Project shape

```text
src/app/             Expo Router screens and tabs
src/components/      Reusable UI
src/lib/             Supabase client and other integrations
src/providers/       Persisted authentication state
src/types/           Database and app-domain types
scripts/             Repeatable data-generation utilities
supabase/functions/  Edge Functions (flight search proxy)
supabase/migrations/ Database schema, RLS, airport import, and backfill
```

## Useful checks

```sh
npm run lint
npx tsc --noEmit
npx expo-doctor
```
