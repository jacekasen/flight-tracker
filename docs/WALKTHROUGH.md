# Demo and walkthrough

This checklist produces the final Phase 4 release artifact without exposing provider credentials or personal travel data.

## Hosted web demo

1. Create a dedicated Supabase demo project and apply the checked-in migrations.
2. Set `AERODATABOX_API_KEY` and `RATE_LIMIT_IP_HASH_SECRET` as Supabase Edge Function secrets, then deploy `search-flights`.
3. Configure the hosting provider with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. Build the static web app:

   ```sh
   npx expo export --platform web
   ```

5. Publish `dist/` with a static host and configure all routes to fall back to `index.html`.
6. Add the final URL to the README and verify the signed-out route guard, sign-up, login, password-reset request, search, save, history, insights, export, and sign-out in a private browser window.

Never place the service-role key, AeroDataBox key, or IP-hash secret in an `EXPO_PUBLIC_` variable.

## Three-minute recording

Use a dedicated demo account and fictional notes. Record at a readable mobile viewport.

1. **0:00–0:20 — Authentication:** Start signed out, switch once between the anchored login and sign-up modes, then log in with the dedicated demo account.
2. **0:20–0:40 — Product framing:** Show the globe-first Flights view and its next-flight panel, then briefly open the upcoming/history list.
3. **0:40–1:10 — Search:** Enter a flight number and departure date, submit once, and point out that codes such as `R3`, `F9`, and `3U` are parsed correctly.
4. **1:10–1:35 — Save:** Select a result, add an optional seat or note, confirm it, and show the flight immediately in history.
5. **1:35–1:55 — History:** Open the flight, demonstrate editable personal fields, and return to the timeline.
6. **1:55–2:30 — Insights:** Open Flight insights from Profile, show the full-screen all-time globe and its mapped paths, then open Recap and switch between all time and a year.
7. **2:30–2:50 — Data controls:** Open Profile and demonstrate the JSON export. Explain the two-step cascading account-deletion control without deleting the main demo account.
8. **2:50–3:00 — Engineering close:** Show the CI result and mention protected routing, persistent rate limits, provider caching, automated authorization tests, and manual-entry fallback.

## Release evidence

Before marking the portfolio release complete, replace these placeholders:

- Hosted demo: `TBD`
- Recorded walkthrough: `TBD`
- Passing CI run: `TBD`
