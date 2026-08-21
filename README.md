# Flight Tracker

A React Native flight-tracking starter built with Expo Router, TypeScript, and Supabase. The initial interface uses a focused, timeline-first travel layout inspired by best-in-class flight apps while keeping its own visual identity.

## Requirements

- Node.js 22 LTS (see `.nvmrc`)
- npm
- Expo Go or an iOS/Android simulator
- A Supabase project

## Start the app

```sh
nvm use
npm install
cp .env.example .env
npm start
```

Then add your Supabase Project URL and publishable key to `.env`. Both values are available from the Supabase project's **Connect** dialog. The publishable key is designed for client apps; never add a `service_role` or secret key to an `EXPO_PUBLIC_` variable.

## Supabase

The app client lives in `src/lib/supabase.ts`. It uses Expo SQLite's local-storage implementation to persist auth sessions and only creates the client after credentials are present.

Apply `supabase/migrations/20260819000000_create_flight_tracker_schema.sql` from the Supabase SQL editor, or with the Supabase CLI after linking the project:

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

The migration creates `profiles` and `flights`, timestamps, indexes, an auth-profile trigger, and row-level security policies that isolate every user's data.

## Project shape

```text
src/app/             Expo Router screens and tabs
src/components/      Reusable UI
src/data/            Temporary preview data
src/lib/             Supabase client and other integrations
src/types/           Database types
supabase/migrations/ Database schema and RLS
```

## Useful checks

```sh
npm run lint
npx tsc --noEmit
npx expo-doctor
```
