# Flight Tracker Product Requirements Document

**Product:** Flight Tracker  
**Document type:** Product Requirements Document (PRD)  
**Status:** Working draft  
**Owner:** Jace Kasen  
**Last updated:** August 23, 2026

## 1. Product overview and impact

### Introduction

Flight Tracker is a personal flight-history application for recording past and upcoming flights. It is designed for travelers who want a durable, visual record of where they have flown without maintaining a spreadsheet or relying on temporary airline itineraries.

The product begins with a narrow workflow:

1. Find a flight by number and departure date.
2. Confirm or correct the itinerary.
3. Save it to a private personal history.
4. Browse flights chronologically.
5. Review routes and aggregate travel statistics.

### Current state

The application currently supports:

- Flight search by flight number and departure date.
- Native calendar selection on iOS and Android.
- AeroDataBox lookup through a Supabase Edge Function.
- Loading, validation, provider-error, and empty-result states.
- Normalized results rendered as flight cards.
- Email/password authentication with persisted sessions and sign-out.
- Search-result confirmation and duplicate-safe saving.
- Private upcoming and completed flight history.
- Flight details, editing, deletion, and manual entry.
- Airport coordinate and country enrichment for saved routes.
- Private route map, aggregate travel statistics, ranked summaries, and yearly recaps.

The application does not yet support export or account deletion.

### Intended impact

For users:

- Replace fragmented itinerary records with one personal flight archive.
- Reduce the effort required to record a flight.
- Make travel history understandable through a timeline, route map, and summaries.

For the portfolio:

- Demonstrate mobile product design and React Native implementation.
- Demonstrate secure third-party API integration.
- Demonstrate authentication, relational data modeling, RLS, and personal-data isolation.
- Demonstrate thoughtful handling of time zones, incomplete data, and constrained API quotas.

## 2. Problem statement

### Primary issues

1. Flight records are distributed across airline accounts, email, calendars, and booking tools.
2. Airline systems are optimized for upcoming travel, not a durable personal history.
3. Manually maintaining a flight spreadsheet requires repetitive entry and time-zone handling.
4. Free aviation APIs have incomplete historical coverage, so lookup cannot be the only input method.
5. A flight number is reused across dates and may be shared through codeshares, so flight number alone is not a unique record.

### Product opportunity

A focused mobile diary can combine provider-assisted lookup with manual correction and entry. This delivers most of the value of a personal flight log without attempting airline-grade live operations.

### Assumptions to validate

- Users usually know the flight number and approximate departure date.
- Most users add flights individually rather than importing an entire history at once.
- Route maps and yearly summaries are more valuable for retention than continuous aircraft tracking.
- Users accept manual correction when provider coverage is incomplete.

## 3. Target users

### Primary persona: personal travel archivist

A traveler who wants a simple record of past and upcoming flights.

Needs:

- Add a flight quickly.
- See flights in chronological order.
- Correct inaccurate provider data.
- View total flights, distance, time aloft, airlines, and airports.
- Keep seat, notes, and trip details private.

Pain points:

- Old itinerary emails are difficult to find.
- Flight dates and times are easy to enter incorrectly.
- Spreadsheets are functional but not enjoyable or mobile-friendly.

### Secondary persona: aviation enthusiast

A user interested in aircraft, registrations, routes, and travel statistics.

Needs:

- Record aircraft model and registration when available.
- Filter and summarize flights by airline, airport, aircraft, and year.
- See routes geographically.

### Out-of-scope personas

- Airline operations teams requiring guaranteed real-time accuracy.
- Travel agencies managing bookings for multiple customers.
- Social users seeking public profiles or leaderboards.

## 4. Product goals and non-goals

### Goals

- Let a user add a supported flight in under one minute.
- Preserve a durable, private history across sessions and devices.
- Display departure and arrival in the correct airport-local times.
- Provide manual entry when lookup is unavailable.
- Turn saved history into a useful timeline, route map, and summary.
- Clearly communicate missing, estimated, and unavailable data.

### Non-goals for the portfolio MVP

- Ticket booking, payment, check-in, or boarding passes.
- Guaranteed real-time status or operational alerts.
- Continuous aircraft position tracking.
- Predictive delay modeling.
- Email, calendar, or airline-account import.
- Public profiles, social feeds, or competitive leaderboards.

## 5. Success metrics

### MVP launch metrics

- A first-time user can authenticate and save a flight without developer assistance.
- Median supported-flight entry time is under 60 seconds.
- At least 90% of valid, provider-supported searches produce a result or a specific actionable error.
- Saved flights remain available after app restart and sign-in on another session.
- Automated authorization tests verify that one user cannot access another user's flights.
- All required search, save, empty, error, and loading states are implemented.

### Portfolio presentation metrics

- A reviewer can complete the core workflow in under three minutes.
- The repository includes setup instructions, product requirements, technical design, and automated checks.
- A deployed demo or recorded walkthrough shows search, persistence, history, and insights.
- Lint, TypeScript, and automated tests pass in CI.

### Long-term product indicators

- Percentage of users who save a second flight.
- Average number of flights saved per active user.
- Percentage of failed searches completed through manual entry.
- Search-provider error and quota-exhaustion rates.
- Time from opening Add Flight to successful save.

## 6. Functional requirements

Requirements are labeled for traceability between product, design, implementation, and tests.

### FR-1: Authentication

- FR-1.1: A user must be able to create an account and sign in.
- FR-1.2: The application must restore a valid session after restart.
- FR-1.3: A user must be able to sign out.
- FR-1.4: A user must authenticate before searching or saving so provider quota and personal history are tied to an account.

Acceptance criteria:

- A valid account can sign in and reach the Flights tab.
- An invalid login displays an actionable error.
- Restarting the app preserves a valid session.
- Signing out removes access to personal records.

### FR-2: Flight search

- FR-2.1: The user must enter a flight number before choosing a date.
- FR-2.2: The app must accept common spacing and capitalization variations such as `UA 120` and `ua120`.
- FR-2.3: The user must choose a departure date through a native calendar on iOS and Android.
- FR-2.4: Search must only occur after explicit submission.
- FR-2.5: Search results must include flight number, route, departure and arrival times, status, duration, and aircraft when available.
- FR-2.6: Missing optional values must display neutral placeholders.

Acceptance criteria:

- Invalid flight numbers do not invoke the provider.
- Valid search input invokes the Edge Function once per submission.
- No-result, quota, configuration, and provider failures display distinct messages.
- The selected flight number and date remain available after recoverable failures.

### FR-3: Flight confirmation and save

- FR-3.1: The user must select a specific result before saving.
- FR-3.2: The confirmation screen must show airline, route, scheduled times, and status.
- FR-3.3: Seat and personal notes must be optional.
- FR-3.4: Saving must associate the record with the authenticated user.
- FR-3.5: Duplicate records must be detected before insertion.

Acceptance criteria:

- A saved flight appears in the user's timeline without requiring app restart.
- Re-saving the same flight does not create an unintentional duplicate.
- Save failure preserves entered personal details and offers retry.

### FR-4: Manual flight entry

- FR-4.1: Users must be able to create a flight when provider lookup fails.
- FR-4.2: Required fields are flight number, airline, origin, destination, departure date/time, and arrival date/time.
- FR-4.3: Arrival must occur after departure when compared in UTC.
- FR-4.4: Manually entered records must be visibly editable.

Acceptance criteria:

- Manual entry can produce a valid saved flight without any provider request.
- Invalid airport codes and time ranges prevent submission with field-level errors.

### FR-5: Flight history

- FR-5.1: The Flights tab must load only the authenticated user's flights.
- FR-5.2: Upcoming and completed flights must be separated.
- FR-5.3: Flights must be ordered chronologically within each section.
- FR-5.4: Users must be able to open flight details.
- FR-5.5: Users must be able to edit personal fields and delete a flight.

Acceptance criteria:

- A user never sees another account's flight.
- The next upcoming flight is easy to identify.
- Deletion requires confirmation and removes the record from the timeline.

### FR-6: Flight insights

- FR-6.1: The app must calculate total flights, distance, and flight time.
- FR-6.2: The app must summarize airlines, airports, countries, and aircraft when data exists.
- FR-6.3: The app must display saved routes on a map.
- FR-6.4: The app should support a yearly recap.

Acceptance criteria:

- Statistics are derived only from the current user's saved flights.
- Missing optional data does not exclude a flight from unrelated totals.
- Route map failures do not block access to the history timeline.

### FR-7: Profile and data controls

- FR-7.1: Users must be able to set name, home airport, time format, and distance unit.
- FR-7.2: Users must be able to export their flight data.
- FR-7.3: Users must be able to delete their account and associated records.

## 7. Product-level technical requirements

### Performance

- Search submission should provide visible feedback within 100 milliseconds.
- Cached history should render within one second on a typical development device.
- Provider requests should time out and return a recoverable error rather than loading indefinitely.
- Duplicate submissions must be disabled while a request is active.

### Scale

- The MVP should support at least 10,000 saved flights per user without changing the data model.
- Timeline queries must use the user-and-departure index.
- Provider calls must not grow with the total number of saved flights.

### Security

- All user-owned tables must enforce RLS.
- Provider secrets must remain server-side.
- The application must never place secrets in `EXPO_PUBLIC_` variables.
- Save operations must verify ownership through the authenticated session.
- Confirmation codes must be removed unless a validated requirement justifies storing them.

### Reliability

- Manual entry must remain available when provider lookup is unavailable.
- Partial provider records must not crash result rendering.
- The system must preserve UTC timestamps and airport-local display semantics.

### Accessibility

- Interactive controls must have accessible labels and roles.
- Touch targets must be at least 44 by 44 points.
- Status must not be communicated through color alone.
- Dynamic text sizing must preserve access to critical itinerary information.

## 8. User journeys

### Journey A: Add a supported flight

1. User opens Add Flight.
2. App requires a valid authenticated session.
3. User enters the flight number.
4. App normalizes and validates the number.
5. User chooses the departure date.
6. App displays loading feedback and searches.
7. User selects the matching itinerary.
8. User confirms optional seat and notes.
9. App saves the record and opens the detail view; the timeline refreshes on focus.

### Journey B: Recover from no search result

1. Search returns no matching flight.
2. App preserves the entered flight number and date.
3. User adjusts either value and retries, or selects manual entry.
4. User completes required itinerary fields.
5. App validates the time range and airport codes.
6. App saves the manual record.

### Journey C: Review history

1. User opens Flights.
2. App shows upcoming flights first and completed history below.
3. User selects a flight.
4. Detail view shows itinerary and personal metadata.
5. User edits notes or deletes the record.

### Journey D: Review insights

1. User opens the insights experience.
2. App summarizes totals and top entities.
3. User views routes on a map.
4. User filters or selects a year for recap.

## 9. Dependencies

### Mobile

- Expo and Expo Router
- React Native and React
- React Native Maps
- TypeScript
- Supabase JavaScript client
- Expo SQLite storage adapter
- React Native community date-time picker

### Backend

- Supabase Auth
- Supabase Postgres
- Supabase Edge Functions
- Supabase RLS

### External data

- RapidAPI
- AeroDataBox free plan
- Public-domain OurAirports scheduled-service airport dataset

### Delivery

- GitHub repository
- CI provider, to be selected
- Expo development and distribution workflow

## 10. Milestones and development phases

### Phase 1: Search foundation — complete

- Flight number validation
- Native date selection
- Edge Function proxy
- AeroDataBox integration
- Normalized result cards
- Search error and empty states

Milestone: A user can find a supported flight without exposing the provider key.

### Phase 2: Personal history — complete

- Authentication UI
- Search-result confirmation
- Save flight
- Supabase-backed timeline
- Flight detail, edit, and delete
- Manual entry

Milestone: A user can create and revisit a private flight history.

### Phase 3: Insights — complete

- Airport metadata
- Route map
- Distance and flight-time totals
- Airline, airport, country, and aircraft summaries
- Yearly recap

Milestone: Saved history produces a differentiated visual story.

### Phase 4: Portfolio hardening

- Automated tests
- CI checks
- Persistent search rate limiting
- Provider-result caching
- Data export and account deletion
- Deployed demo and recorded walkthrough

Milestone: The project is safe, testable, documented, and easy for a reviewer to evaluate.

## 11. Risk mitigation

### Product risks

**Risk:** The app appears to duplicate existing flight apps.  
**Mitigation:** Focus on personal history, manual completeness, ownership of data, and portfolio-quality insights rather than operational alerts.

**Risk:** The core experience depends too heavily on provider coverage.  
**Mitigation:** Treat manual entry and correction as required product features.

### Technical risks

**Risk:** Airport-local times are displayed incorrectly.  
**Mitigation:** Store UTC timestamps, retain airport time zones, and test overnight, daylight-saving, and date-line cases.

**Risk:** Codeshares create duplicate or ambiguous matches.  
**Mitigation:** Include operating airline, origin, and scheduled departure in identity and confirmation.

**Risk:** Schema changes become expensive after history accumulates.  
**Mitigation:** Add provider metadata, actual timestamps, distance, and manual-entry flags before broad use.

### External-service risks

**Risk:** The free AeroDataBox quota is exhausted or pricing changes.  
**Mitigation:** Validate before calling, require explicit submission, authenticate, rate-limit, cache, and preserve provider independence.

**Risk:** Provider data is partial or inaccurate.  
**Mitigation:** Show placeholders, expose correction, and preserve manual entry.

### Security and privacy risks

**Risk:** Authenticated users abuse the Edge Function and exhaust shared provider quota.
**Mitigation:** Add persistent per-user and IP rate limits before public distribution.

**Risk:** One user accesses another user's history.  
**Mitigation:** Enforce RLS and add automated cross-user authorization tests.

**Risk:** Sensitive booking information is stored unnecessarily.  
**Mitigation:** Remove confirmation codes unless a validated product requirement requires them.

## 12. Open product decisions

Phase 3 decisions:

- Flight insights use a dedicated tab so map failures and heavier visualization work remain isolated from the history timeline.
- Airport coordinates and country information come from the public-domain OurAirports scheduled-service dataset.
- Insights display kilometers until the profile distance-unit preference in FR-7.1 is implemented.

Remaining open decisions:

- Historical range supported by the free provider.
- Whether bulk CSV import belongs in the portfolio release.
