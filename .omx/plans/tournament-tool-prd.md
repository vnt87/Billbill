# Tournament Tool MVP — Product Requirements Document

**Status:** Ready for technical implementation planning  
**Date:** 2026-08-06  
**Working branch:** `experiment/challonge`  
**Product family:** Chiabill  
**Related specifications:** [Technical specification](./tournament-tool-techspec.md) · [Implementation plan](./tournament-tool-implementation-plan.md)

## 1. Executive summary

Build a lightweight, Challonge-like tournament tool as a new product in the Chiabill app family. The MVP will initially appear as a top-level tab in the existing application, reusing its visual language, responsive shell, light/dark themes, and English/Vietnamese localization. Tournament mechanics, storage, API routes, and domain types must remain isolated from bill-splitting logic so the tool can later deploy as a standalone application.

The product deliberately avoids user accounts. Anyone may create a tournament. Creation returns two unguessable capability links: a private administration link that grants full tournament editing, and a distinct public link that exposes a read-only spectator view.

The MVP supports 2–32 individual entrants or teams in single elimination, double elimination, and round-robin tournaments. Organizers can seed entrants, generate brackets, record best-of scores, declare winners or round-robin draws, add private match notes, and see standings. Spectators can view brackets and standings. Updates appear after manual refresh; realtime synchronization is out of scope.

## 2. Product context

The current application is a compact React/Vite SPA with routes registered in `src/App.tsx:42-50` and primary navigation, theme, and language controls in `src/components/Layout.tsx:23-81`. It already provides the product-family conventions this feature must reuse:

- IBM Plex Mono body text and Space Grotesk headings in `src/index.css:1-22` and `tailwind.config.js:7-13`.
- Class-based dark mode and persistent theme selection in `src/App.tsx:16-39`.
- English/Vietnamese dictionaries and a typed language context in `src/contexts/LanguageContext.tsx:1-42`, `src/i18n/en.ts:1-120`, and `src/i18n/vi.ts:1-120`.
- Keyboard focus, touch-target, and reduced-motion conventions in `src/index.css:140-195`.
- Cloudflare Pages Functions as the existing server surface in `functions/api/bills/index.ts:1-84` and `functions/api/bills/[id].ts:1-49`.

The existing bill API and `src/types.ts:1-34` are not reusable tournament-domain contracts. They remain behaviorally unchanged.

## 3. Problem statement

Small clubs and informal groups need a quick way to run a tournament without creating accounts, learning event-management software, or configuring scheduling and venue operations. Existing bracket tools often impose account flows or broader event-management concepts before an organizer can create and share a working tournament.

The opportunity is a focused tool that lets an organizer move from a blank page to a shareable bracket in a few minutes while retaining enough scoring and standings logic to finish the event correctly.

## 4. Goals and success measures

### 4.1 Product goals

1. Let an unauthenticated organizer create, configure, and share a tournament.
2. Correctly model and advance all three supported formats for 2–32 entrants.
3. Provide separate edit and spectator experiences through capability links.
4. Match the Chiabill product family visually and linguistically.
5. Establish a clean extraction boundary for a future standalone deployment.

### 4.2 MVP success measures

- At least 95% of valid 2–32 entrant tournament fixtures in the automated test matrix generate without structural errors.
- 100% of deterministic bracket and standings fixtures pass automated unit tests.
- A first-time organizer can create a four-entrant tournament and copy both links in under three minutes during a moderated usability check.
- All tournament screens pass the defined English/Vietnamese key-parity test and render in light and dark themes.
- No public API response contains an admin capability, private match note, or mutation control. The opaque public identifier may be returned because it resolves only the intended read-only projection.
- Bill calculator, history, and saved-bill routes continue to build and behave as before.

## 5. Users and jobs to be done

### 5.1 Organizer

**Job:** “When I am running a small competition, I want to create a bracket, enter participants and results, and share progress without requiring anyone to register.”

Needs:

- Immediate tournament creation without authentication.
- A private link that can be shared with co-organizers.
- Manual seeding plus randomization.
- Clear score validation and automatic progression/standings.
- Protection against silently overwriting a newer edit.
- An obvious way to recover when an upstream edit invalidates downstream results.

### 5.2 Spectator or participant

**Job:** “When I receive a public tournament link, I want to see who plays whom, current scores, and standings without being able to change anything.”

Needs:

- A read-only page that works without authentication.
- Legible bracket navigation on phone and desktop.
- A visible last-updated time and manual refresh action.
- No exposure of organizers’ private notes or edit capability.

## 6. Product principles

1. **Link possession is the permission model.** No account-like behavior will be introduced in MVP.
2. **Tournament correctness outranks convenience.** Invalid scores, impossible draws, and stale edits are rejected explicitly.
3. **Preserve unaffected work.** Edits invalidate only match results whose participants or dependencies actually change.
4. **One family, separate domains.** Reuse presentation infrastructure, never bill-specific business logic or storage contracts.
5. **Manual synchronization is explicit.** Do not imply realtime behavior; show freshness and conflict states honestly.

## 7. Scope

### 7.1 Included in MVP

- Tournament landing page and creation form.
- Formats:
  - Single elimination.
  - Double elimination with one winner-takes-all grand final; no bracket reset.
  - Round-robin.
- Homogeneous entrant modes per tournament:
  - Individuals.
  - Teams with static informational rosters.
- 2–32 entrants.
- Manual seeding, drag/move or numeric seed editing, and randomize action.
- Automatic byes for non-power-of-two elimination fields.
- Deterministic bracket or round-robin schedule generation.
- Tournament-wide default best-of value with per-match override.
- Per-side scores, completion state, winner, round-robin draw, and private match notes.
- Automatic winner/loser advancement for elimination formats.
- Round-robin standings using the policy in section 10.
- Selective downstream result invalidation when entrants, seeds, or upstream results change.
- Private editable capability link and separate public read-only link.
- Manual refresh and last-updated indicator.
- English and Vietnamese UI.
- Light and dark themes.
- Responsive desktop and mobile layouts.
- Initial integration as a new header navigation tab.
- Domain isolation sufficient for later standalone deployment.

### 7.2 Explicitly excluded from MVP

- Accounts, passwords, OAuth, profiles, teams owned by users, or cross-tournament dashboards.
- Realtime updates, polling, WebSockets, presence, or collaborative cursors.
- Scheduling, dates/times per match, venues, stations, tables, or courts.
- Check-in, invitations, email, push notifications, chat, or comments.
- Entry fees, payments, prizes, or any bill-splitting integration.
- Swiss format, group stage followed by playoffs, ladders, leagues, or multi-stage events.
- Mixed individual/team entrant lists.
- Per-match team lineups, substitutions, or member-level statistics.
- Advanced automated seeding, region separation, rating import, CSV import/export, or third-party integrations.
- Public match notes.
- Tournament deletion, admin-link rotation/revocation, cloning, or archival controls.
- Grand-final reset in double elimination.
- Offline-first behavior or installable PWA scope.

## 8. Information architecture and routes

The initial host application adds a third primary navigation item beside Calculator and History, extending the nav pattern at `src/components/Layout.tsx:32-61`.

Proposed user-facing routes:

| Route | Audience | Purpose |
|---|---|---|
| `/tournaments` | Anyone | Product landing page and create form |
| `/tournaments/manage/:adminToken` | Organizer | Private tournament administration |
| `/tournaments/view/:publicToken` | Spectator | Public read-only bracket/standings |

Tokens are opaque and placed in path segments, never query strings. Tournament pages must set a restrictive referrer policy so capability paths are not sent to unrelated sites.

## 9. Core journeys

### 9.1 Create and share

1. User opens Tournament from the primary navigation.
2. User enters tournament name, format, entrant type, and default best-of.
3. User adds 2–32 individuals or teams; every team has at least one roster member.
4. User orders seeds manually or selects randomize.
5. User creates the tournament.
6. The app displays and permits copying both the admin and public links.
7. The user enters the admin view; the public link opens a read-only view.

### 9.2 Generate and operate an elimination bracket

1. Organizer reviews entrants/seeds and generates the bracket.
2. The engine creates byes and automatically advances them without treating them as played matches.
3. Organizer opens a ready match, selects or overrides best-of, enters scores and optional private notes, and confirms the result.
4. The result advances the winner; double elimination also routes the loser into the correct lower-bracket match.
5. A participant is normally eliminated after one loss in single elimination and two losses in double elimination. With the chosen no-reset grand final, the undefeated winners-bracket finalist may finish runner-up with only the grand-final loss.
6. The tournament completes when the final has a valid winner.

### 9.3 Operate a round-robin tournament

1. Organizer generates every required pairing exactly once.
2. Odd entrant counts produce one bye per round, which does not count as a match.
3. Organizer enters a win/loss or draw result.
4. Standings recompute from completed match results.
5. Tournament is complete after all playable matches have completed.

### 9.4 Edit after generation

1. Organizer may rename entrants, edit team rosters, reorder seeds, replace entrants, or correct prior results.
2. Cosmetic entrant changes that retain the entrant identity preserve all results.
3. Structural changes recompute resolved match participants.
4. Results whose participants and upstream outcome dependencies are unchanged remain intact.
5. A result whose participants change is cleared, and affected descendants are recursively re-evaluated.
6. Before saving an edit that clears results, the UI previews the number of affected matches and requires confirmation.

### 9.5 Handle stale edits

1. Every admin read includes a tournament version.
2. Every mutation submits the version the organizer edited.
3. If a newer mutation already exists, the API rejects the stale write.
4. The UI keeps the attempted input, explains the conflict, and offers refresh/reapply rather than silently overwriting data.

## 10. Competition rules

### 10.1 Shared rules

- Minimum 2 and maximum 32 entrants.
- Names are trimmed, must contain 1–80 visible characters, and may be duplicated with a warning.
- Team rosters require 1–32 member names; member names use the same 1–80 character bound.
- Tournament name is required and limited to 120 visible characters.
- Match notes are private, plain text, and limited to 1,000 characters.
- Default and per-match best-of values are positive odd integers from 1 through 15.
- The tournament default initializes newly generated matches and does not retroactively modify existing matches.
- Changing a completed match’s best-of clears its scores/outcome and selectively invalidates dependencies; changing a draft preserves scores only when they fit the new bound.
- A completed best-of match requires one side to reach `floor(bestOf / 2) + 1` game wins; the other side must have fewer wins.
- Draws are rejected in both elimination formats.
- An unfinished match can hold draft scores but cannot advance an entrant or affect standings.

### 10.2 Single elimination

- The engine builds the next power-of-two bracket and assigns deterministic byes.
- Each completed match advances exactly one winner.
- A loss eliminates the entrant.
- The final winner becomes champion.

### 10.3 Double elimination

- Each entrant begins in the winners bracket.
- First loss routes the entrant to the deterministic losers-bracket slot.
- Second loss eliminates the entrant.
- Winners- and losers-bracket champions meet in one winner-takes-all grand final.
- The grand final is never reset, regardless of which entrant wins.

### 10.4 Round-robin

- Every pair of entrants plays exactly once.
- Points: win = 3, draw = 1, loss = 0.
- Sort by points descending.
- For tied entrants, calculate a mini-table using only matches among the tied entrants and apply: mini-table points, mini-table score differential, then mini-table total score.
- If still tied, apply overall score differential, then overall total score.
- If still tied, display the entrants as tied with the same rank; do not add randomness to persisted results.

## 11. Functional requirements

### Creation and capabilities

- **FR-001:** Any visitor can create a tournament without authentication.
- **FR-002:** Creation returns one admin URL and one distinct public URL exactly once in the response.
- **FR-003:** The persisted database stores only a cryptographic hash of the admin token. The separate opaque public identifier is recoverable because it grants access only to the deliberately public projection.
- **FR-004:** An unknown or malformed token returns a generic not-found response without revealing whether a tournament exists.

### Entrants and generation

- **FR-010:** Organizer can add, edit, reorder, replace, and remove entrants subject to the 2–32 bounds.
- **FR-011:** Team entrants require a static roster and expose no lineup or member scoring controls.
- **FR-012:** All entrants within a tournament use the selected entrant type.
- **FR-013:** Organizer can randomize seeding; the resulting explicit seed order is persisted.
- **FR-014:** Generation is deterministic for the same format, entrant IDs, and seed order.
- **FR-015:** Structural changes after generation preserve unaffected results and preview invalidations before commit.

### Matches and progression

- **FR-020:** Organizer can save draft scores without completing a match.
- **FR-021:** Organizer can complete only a ready match whose entrant slots are resolved.
- **FR-022:** Best-of and score validation follow section 10.1.
- **FR-023:** Only round-robin matches may complete as draws.
- **FR-024:** Completing or correcting a match deterministically updates dependent slots.
- **FR-025:** Private notes appear in admin responses and never in public responses.
- **FR-026:** Completed dependent matches are invalidated when their source definitions, resolved participants, or compatible best-of contract changes; structurally identical matches are preserved.

### Views and refresh

- **FR-030:** Admin view exposes settings, entrants, matches, private notes, mutation controls, the recoverable public link, and the current admin URL derived from the browser location.
- **FR-031:** Public view exposes tournament metadata, entrants, brackets/matches, standings, completion state, and last-updated time only.
- **FR-032:** Public view contains no enabled or hidden mutation endpoint credentials.
- **FR-033:** Both views have an explicit refresh action; neither polls automatically.
- **FR-034:** On narrow screens, brackets may scroll horizontally while the page and match cards retain usable touch targets.

### Localization and family consistency

- **FR-040:** Every tournament UI string exists in English and Vietnamese.
- **FR-041:** Tournament routes reuse the current language context and theme controls.
- **FR-042:** The header adds a localized Tournament item with a correct active state for all tournament routes.
- **FR-043:** Tournament code does not import bill types, bill API functions, or bill page components.

## 12. Non-functional requirements

### Performance

- For a 32-entrant tournament, bracket generation and standings calculation complete within 100 ms at p95 in unit benchmarks on the project’s CI runner.
- Public and admin GET API handlers return within 500 ms at p95 excluding network transit under a 20-request smoke load against the preview environment.
- Initial tournament route JavaScript should add no more than 150 kB gzip to the route-specific lazy-loaded chunk.

### Reliability and consistency

- Multi-row mutations are atomic.
- Every write uses optimistic concurrency and returns `409 Conflict` for a stale version.
- Algorithms are pure and deterministic; persisted match state can be reconstructed from source data.
- Public read state becomes visible on the next manual refresh after a successful admin write.

### Security and privacy

- Admin tokens and opaque public identifiers each contain at least 256 bits of cryptographically random entropy.
- Admin and public identifiers are independent.
- Only a SHA-256 hash of the admin token is persisted; the read-only public identifier is stored so organizers can recover its link later.
- Capability tokens and full capability URLs are excluded from server logs, client telemetry, error messages, and referrer headers.
- All SQL uses bound prepared statements.
- Public serialization uses an explicit allowlist and excludes private notes and all token fields.
- Mutation endpoints accept only admin capabilities.

### Accessibility and responsiveness

- Core flows are operable by keyboard and have visible focus states consistent with `src/index.css:147-162`.
- Interactive controls meet a 44×44 CSS-pixel minimum on small screens, following `src/index.css:170-176`.
- Color is not the only indication of match state or winner.
- Screen-reader labels exist for bracket rounds, match status, score inputs, copy buttons, and refresh.
- Motion respects `prefers-reduced-motion` as established in `src/index.css:187-195`.

## 13. Lifecycle states

| State | Entry condition | Allowed actions | Exit condition |
|---|---|---|---|
| `draft` | Tournament created | Edit settings/entrants, seed, generate | Bracket generated |
| `active` | Structure exists with incomplete playable matches | Edit metadata, entrants/seeds with selective invalidation, enter/correct results | All required matches complete |
| `completed` | Champion or final standings resolved | View, correct results/entrants with selective invalidation | Correction reopens required match, or no-op remains complete |

Format and entrant type are immutable after initial creation in MVP. A user who chose incorrectly creates a new tournament.

## 14. Acceptance criteria

1. A visitor creates each supported format with both entrant types and receives distinct working admin/public links.
2. Creation rejects 0, 1, or more than 32 entrants, mixed entrant types, blank names, and teams with empty rosters.
3. Single-elimination fixtures for every entrant count from 2 through 32 produce one champion, correct bye behavior, and exactly `n - 1` played matches.
4. Double-elimination fixtures for 2 through 32 entrants require two losses for pre-final elimination, generate exactly one grand final with no reset, and allow the former undefeated finalist to become runner-up with one total loss.
5. Round-robin fixtures generate exactly `n(n-1)/2` playable pairings and no duplicate pair.
6. Round-robin ranking matches the complete tie-break policy, including multi-way ties and unresolved final ties.
7. Invalid best-of scores and elimination draws return localized validation errors and never mutate progression.
7a. Completed best-of changes clear that result; draft best-of changes preserve only scores valid under the new threshold; tournament-default changes leave existing matches unchanged.
8. Correcting an upstream result clears only completed matches whose source definition, resolved participant set, or compatible best-of contract changes; unrelated completed branches remain unchanged.
9. Renaming an entrant or editing a static roster preserves all results.
10. Two admin clients writing the same version produce one success and one `409`; no silent overwrite occurs.
11. Public responses and rendered pages expose no private note, admin token, admin URL, or mutation control.
12. Manual refresh shows the latest successful version and updated timestamp.
13. Tournament flows work at 320 px, 768 px, and 1200 px viewport widths in both themes and languages.
14. Existing calculator, history, and bill-detail routes still build and pass regression smoke tests.
15. A dependency check confirms the tournament feature imports shared presentation infrastructure but no bill-domain module.

## 15. Analytics and observability

MVP does not add user-tracking analytics. Operational telemetry may record only non-sensitive aggregates:

- API route identifier without token path segments.
- Response status, latency, format, entrant-count bucket, and tournament version.
- Bracket-generation or validation error code.
- D1 query failure category.

Never record names, rosters, notes, capability tokens, or complete request URLs.

## 16. Rollout

1. Ship behind the new Tournament navigation route on the experiment branch.
2. Validate locally with D1 migrations and deterministic fixtures.
3. Deploy a Cloudflare Pages preview with a separate preview D1 database.
4. Run full admin/public journeys in EN/VI, light/dark, mobile/desktop.
5. Enable the header tab in production after bill-flow regression checks pass.
6. Treat standalone deployment/extraction as a post-MVP project using the established feature boundary.

## 17. Assumptions and deferred decisions

- Capability links are stable for MVP; revocation/rotation is post-MVP.
- Tournament deletion and retention controls are post-MVP.
- Public notes are post-MVP; all MVP notes are private.
- Duplicate entrant names are allowed with a warning because stable IDs—not names—define identity.
- If a multi-way round-robin tie remains unresolved after every defined comparison, equal ranks are intentional.
- Browser back/forward is supported. Direct-link reload support must be added and verified with an explicit Cloudflare Pages SPA fallback before release; it is not assumed from the current repository.
