# Tournament Tool MVP — Implementation Plan

**Status:** Ready for approval  
**Date:** 2026-08-06  
**Complexity:** High  
**Related documents:** [PRD](./tournament-tool-prd.md) · [Technical specification](./tournament-tool-techspec.md)

## 1. Delivery strategy

Deliver the feature in vertical, test-gated increments. Prove the tournament algorithms, capability model, and atomic concurrency behavior before investing in the full UI. Keep every increment deployable on the existing experiment branch and avoid altering existing bill behavior.

Recommended milestone sequence:

1. **Correct core:** contracts, D1 persistence, capabilities, algorithms, and API.
2. **Usable organizer flow:** creation, entrant editor, bracket administration, selective invalidation.
3. **Shareable product:** public experience, localization, accessibility, preview deployment, and regression hardening.

## 2. Planned file impact

### Existing files to modify

- `package.json` — test/local-D1 scripts and development dependencies.
- `package-lock.json` — lockfile updates.
- `tsconfig.json` — mandatory inclusion/project configuration for `shared/tournaments/**` and frontend tests.
- `src/App.tsx` — lazy tournament routes alongside `src/App.tsx:45-48`.
- `src/components/Layout.tsx` — third nav item and active-state behavior extending `src/components/Layout.tsx:15-21` and `:32-61`.
- `src/i18n/en.ts` and `src/i18n/vi.ts` — localized tournament navigation and UI contract.
- `functions/tsconfig.json` — mandatory inclusion/project configuration for `shared/tournaments/**`.
- `index.html` — document-level no-referrer metadata for path capabilities.
- `vite.config.ts` — redact tournament capability segments before development URL notifications leave the page.
- `src/components/Toast.tsx` — add an accessible live-region contract used by tournament status/error feedback.
- `README.md` — local D1 development, migrations, test commands, and deployment.

### New boundaries

- `src/features/tournaments/**` — tournament UI, client, and pure frontend-safe domain.
- `shared/tournaments/**` — required framework-free shared algorithms/contracts included by both TypeScript projects.
- `functions/api/tournaments/**` — transport adapters.
- `functions/_shared/tournaments/**` — access, repository, service, and DTO serialization.
- `migrations/**` — D1 schema.
- `tests/tournament-domain/**`, `tests/tournament-api/**`, `tests/tournament-e2e/**`.
- `wrangler.jsonc` — D1 binding and Pages configuration.
- `public/_headers` and `public/_redirects` — document-level referrer policy and verified SPA fallback.

## 3. Work breakdown

### Phase 0 — Protect existing behavior and establish gates

**Purpose:** Avoid introducing a large feature into an unprotected app shell.

Tasks:

1. Record current `npm run build` and `npm run lint` baselines without changing unrelated user edits.
2. Add the chosen test runners and scripts: unit, component, API integration, and E2E smoke.
3. Add regression smoke coverage for `/`, `/history`, and a bill-detail not-found/load state.
4. Add an import-boundary check that rejects tournament imports from bill-domain modules and vice versa.
5. Document local environment isolation for KV bills and D1 tournaments.

Files:

- `package.json`, `package-lock.json`, test configuration, `tests/regression/**`.

Acceptance:

- Existing build/lint status is documented.
- New test command executes in CI/local mode.
- Regression tests fail if the existing primary routes disappear.
- Boundary check fails on a deliberate tournament-to-bill import fixture.

### Phase 1 — Freeze contracts and pure domain types

**Purpose:** Give frontend and backend one stable vocabulary before parallel work begins.

Tasks:

1. Define format, entrant, tournament, match, match-source, standings, command, admin DTO, public DTO, and API error-code types.
2. Encode validation constants: entrant/name/roster/note/best-of bounds.
3. Separate transport DTOs from internal aggregate types.
4. Add factories for stable IDs/keys and exhaustive format/state switches.
5. Add contract tests proving public DTOs cannot contain private fields at the type and runtime serialization layers.
6. Update both TypeScript project configurations so `shared/tournaments/**` is typechecked once from the same source; use a shared base config or explicit includes/project references, not duplicated files.

Files:

- `shared/tournaments/**` plus frontend API adapters under `src/features/tournaments/api/**`.

Acceptance:

- TypeScript compiles with exhaustive switches.
- Public contracts contain no admin URL/token/hash or private-note field.
- Domain modules import no React, Cloudflare, D1, or bill-specific module.
- Both frontend and Functions typechecks fail on an intentional error placed in `shared/tournaments/**`.

### Phase 2 — Implement and verify tournament engines

**Purpose:** Eliminate the highest correctness risk before UI/API integration.

Tasks:

1. Implement shared score and best-of validation.
2. Implement deterministic single-elimination seed placement, byes, and advancement.
3. Implement explicit double-elimination winner/loser mapping with one non-reset grand final.
4. Implement round-robin circle scheduling, odd-count byes, results, and standings.
5. Implement mini-table multi-way tie handling and equal-rank fallback.
6. Implement match DAG reconciliation and selective invalidation.
7. Implement exact best-of compatibility: existing matches retain captured values when the tournament default changes; changing a completed match best-of clears its result; changing a draft preserves only scores within the new bound.
8. Add table/property-style fixtures for every entrant count 2–32 and targeted edge cases.
9. Request an independent correctness review of double-elimination mappings and invalidation logic.

Files:

- `shared/tournaments/*.ts`.
- `tests/tournament-domain/**`.

Acceptance:

- Single elimination produces one champion after exactly `n - 1` played matches.
- Double elimination gives every pre-final eliminated entrant two losses, generates exactly one grand final, and permits a one-loss runner-up when the former undefeated finalist loses that final.
- Round robin produces exactly `n(n-1)/2` unique playable pairings.
- Rename/roster edits preserve every result.
- Seed/entrant/result changes clear only matches whose stable source definition, resolved participant pair, or compatible best-of contract changes and their necessary descendants.
- Best-of fixtures cover completed `3→5`, completed `5→3`, round-robin draw changes, valid/invalid draft preservation, unchanged best-of, and tournament-default edits.
- All fixtures pass for 2–32 entrants.

### Phase 3 — Add D1 schema and prove concurrency

**Purpose:** Establish safe persistence before exposing mutation endpoints.

Tasks:

1. Add `wrangler.jsonc` with local/preview/production D1 binding placeholders and a current compatibility date selected during implementation.
2. Create `0001_tournaments.sql` with the versioned JSON snapshot table, JSON validity/uniqueness constraints, and capability indexes from the tech spec.
3. Implement validated snapshot reads plus one bound `UPDATE ... WHERE version = ? RETURNING` compare-and-swap and version increment.
4. Prove conditional optimistic locking with two concurrent same-version mutations.
5. Reject any implementation that uses a separate version check followed by a write or ungated child statements.
6. Add migration and local reset/apply scripts without touching the production database by default.

Files:

- `wrangler.jsonc`, `migrations/0001_tournaments.sql`, `functions/_shared/tournaments/repository.ts`, `package.json`.

Acceptance:

- Migration applies to an empty local D1 database.
- JSON validity and unique public/admin capability constraints reject malformed persistence; repository validation rejects invalid aggregate references/seeds.
- Two same-version writes produce exactly one commit and one stale conflict.
- A stale or failed snapshot replacement leaves the prior aggregate byte-for-byte intact.
- Local scripts cannot target production without an explicit remote flag.

### Phase 4 — Implement capability access and serializers

**Purpose:** Make the no-auth permission model safe and testable.

Tasks:

1. Generate independent 256-bit admin/public identifiers.
2. Base64url-encode both; persist only the SHA-256 admin hash and persist the opaque read-only public identifier for later recovery.
3. Implement admin-hash and public-identifier resolution with generic 404 failures.
4. Implement explicit admin/public serializers.
5. Add API no-store/no-referrer headers, HTML referrer metadata, `public/_headers`, and route-token redaction helpers.
6. Add creation-abuse hooks/rate-limit documentation without introducing CAPTCHA.

Files:

- `functions/_shared/tournaments/access.ts`, `functions/_shared/tournaments/responses.ts`, `functions/_shared/tournaments/serializers.ts`, and serializer/crypto tests.

Acceptance:

- Database inspection finds no plaintext admin token; the only recoverable capability is the intended read-only public identifier.
- Admin and public identifiers cannot substitute for one another.
- Unknown and malformed identifiers return indistinguishable 404 responses.
- Recursive public-payload test finds no private keys or values.
- Logs contain route templates rather than token-bearing URLs.

### Phase 5 — Build the tournament service and API

**Purpose:** Expose command-oriented, conflict-aware server behavior.

Tasks:

1. Implement create plus admin/public read endpoints.
2. Implement metadata/entrant update commands with invalidation preview/confirmation.
3. Implement generate endpoint.
4. Implement draft score, completion, clear, note, and best-of match commands.
5. Derive standings and completion state on response.
6. Add ETag/version headers and conditional GET handling.
7. Normalize error envelopes and stable error codes.
8. Cover malformed inputs, stale versions, invalid match states, and simulated D1 failure.

Files:

- `functions/api/tournaments/**`, `functions/_shared/tournaments/service.ts`, `shared/tournaments/contracts.ts`, and `tests/tournament-api/**`.

Acceptance:

- API contract in the tech spec is implemented exactly or versioned with documented deviation.
- Every successful mutation increments aggregate version once.
- Every stale mutation returns 409 and commits nothing.
- Invalidation preview is required before any completed result is cleared.
- Public/admin conditional GET returns 304 when unchanged.
- Integration suite passes against isolated local D1.

### Phase 6 — Integrate the app-family shell

**Purpose:** Add discoverability while retaining an extraction boundary.

Tasks:

1. Register lazy-loaded landing/admin/public routes in `src/App.tsx`.
2. Add localized Tournament nav item and robust active-state matching in `src/components/Layout.tsx`.
3. Extend English/Vietnamese translation contracts with key parity.
4. Reuse current typography, color, focus, touch, reduced-motion, and theme conventions.
5. Validate that the third nav item fits 320 px width using the existing icon-first/hidden-label pattern.
6. Add document-level referrer metadata in `index.html`, Cloudflare header rules, and capability-safe redaction in the Vite development URL reporter.

Files:

- `src/App.tsx`, `src/components/Layout.tsx`, `src/i18n/en.ts`, `src/i18n/vi.ts`, feature routes.

Acceptance:

- Tournament route is reachable from the header and active on every tournament subroute.
- Calculator/History active states remain correct.
- No missing translation keys in either language.
- Light/dark mode persists across bill and tournament routes.
- Tournament chunk is lazy loaded and bill landing bundle remains within 10% of its pre-feature gzip size.
- Parent-frame URL notifications and server logs contain route templates, never real admin/public capability segments.

### Phase 7 — Build creation and sharing UX

**Purpose:** Complete the first organizer journey.

Tasks:

1. Build tournament metadata/format/entrant-type/default-best-of form.
2. Build individual entrant and team/roster editors with bounds and duplicate warnings.
3. Build seed ordering and randomize action.
4. Submit creation and route to the private admin view without persisting the admin token outside the URL.
5. Present both links with labelled copy controls and a warning that anyone with the admin link can edit; later admin reads return the recoverable public URL and derive the current admin URL from `location`.
6. Handle create loading, retry, validation, copy failure, and token-link loss messaging.

Files:

- `src/features/tournaments/pages/TournamentLanding.tsx`, `components/EntrantEditor.tsx`, `ShareLinks.tsx`, `api/client.ts`.

Acceptance:

- A keyboard-only user can create individual and team tournaments.
- Invalid 0/1/33 entrant, blank-name, empty-roster, and invalid-best-of submissions never call the API.
- Successful creation visibly distinguishes private edit and public view links.
- Capability links are not persisted to localStorage or analytics.

### Phase 8 — Build admin operation UX

**Purpose:** Let organizers run and correct the entire event.

Tasks:

1. Render elimination rounds and round-robin rounds/standings.
2. Build match editor for draft scores, best-of override, completion/draw, and private notes.
3. Add entrant/seed edit controls after generation.
4. Show invalidation preview with affected-match count/list and explicit confirmation.
5. Add manual refresh, last-updated version/time, unsaved-draft guard, and 409 recovery.
6. Add tournament state and champion/completion presentation.
7. Ensure result correction preserves unaffected work as specified.
8. Upgrade `src/components/Toast.tsx` with polite status and assertive error live-region behavior, or introduce a tested tournament wrapper only if shared-component regression evidence requires it.

Files:

- `src/features/tournaments/pages/TournamentAdmin.tsx`, `components/BracketBoard.tsx`, `MatchCard.tsx`, `StandingsTable.tsx`, edit dialogs/hooks.

Acceptance:

- Organizer can run each format from creation to completion.
- Impossible scores/draws are rejected with localized messages.
- Stale write preserves local input and offers refresh/reapply.
- Seed change confirmation accurately previews cleared results.
- A winner-preserving score correction preserves downstream matches.
- A winner-changing correction invalidates only participant-changed descendants.
- Save, conflict, validation, and invalidation notifications are announced by assistive technology without duplicating messages.

### Phase 9 — Build public spectator UX

**Purpose:** Make tournament state safely shareable.

Tasks:

1. Render read-only metadata, entrant list, bracket/matches, standings, champion, and last-updated time.
2. Add explicit manual refresh with conditional GET behavior.
3. Optimize bracket navigation for desktop and 320 px mobile.
4. Remove all edit affordances and private-note rendering paths.
5. Add not-found, empty/draft, loading, stale/offline, and completed states.

Files:

- `src/features/tournaments/pages/TournamentPublic.tsx`, shared display components.

Acceptance:

- Public route never calls a mutation endpoint.
- No private note/admin capability appears in DOM, network response, copied URL, or error output.
- All rounds/matches remain navigable at 320 px without shrinking controls below 44 px.
- Refresh updates state and indicates when nothing changed.

### Phase 10 — Localization, accessibility, and visual QA

**Purpose:** Reach product-family quality rather than shipping a functional prototype.

Tasks:

1. Complete EN/VI tournament terminology and validation/error mappings.
2. Test both themes at 320, 768, and 1200 px.
3. Run keyboard, focus-order, screen-reader-name, reduced-motion, zoom, and contrast checks.
4. Verify semantic round/match/table structures without depending on connector lines.
5. Validate long Vietnamese strings, 80-character entrant names, duplicate names, and 32-entrant density.
6. Run the workspace visual-verdict workflow for every visual iteration, persisting its required verdict state.

Files:

- Tournament components, `src/i18n/en.ts`, `src/i18n/vi.ts`, and minimal shared CSS only when Tailwind utilities are insufficient.

Acceptance:

- Translation parity test passes.
- No critical WCAG 2.2 AA automated finding in core journeys.
- Full keyboard journeys pass with visible focus.
- No clipped core action or unreadable match state at target widths/languages/themes.
- Reduced-motion mode removes nonessential transition/motion effects.

### Phase 11 — Deployment, observability, and release verification

**Purpose:** Prove the complete system in its actual Cloudflare environment.

Tasks:

1. Create and bind an isolated preview D1 database.
2. Apply migrations to preview and deploy the experiment branch.
3. Run full E2E journeys against preview.
4. Validate redacted logs, error metrics, D1 latency, and 409 visibility.
5. Verify direct reloads for both capability routes through an explicit `public/_redirects` SPA fallback and verify document-level no-referrer behavior from `public/_headers`/HTML metadata.
6. Run bill regression, lint, typecheck/build, unit, integration, component, and E2E suites.
7. Update README with local D1, migrations, deployment, capability-link warning, and recovery instructions.
8. Prepare a rollout/rollback checklist before enabling the production nav item.

Files:

- `README.md`, Cloudflare/Wrangler config, CI configuration if present/added.

Acceptance:

- Preview passes every PRD acceptance criterion.
- Production data is never used by automated tests.
- Server logs contain no token, entrant, roster, or note content.
- Migration/rollback runbook has been dry-run against preview.
- All quality commands exit zero or pre-existing exceptions are explicitly documented and accepted.

## 4. Test matrix

| Area | Required coverage |
|---|---|
| Entrant counts | Every integer 2–32 for each format |
| Entrant modes | Individual and team; empty/large rosters |
| Elimination byes | 3, 5, 6, 7, 9, 17, 31 entrants plus powers of two |
| Double elimination | Winners/losers routing, rematch avoidance where defined, no reset final |
| Round robin | Even/odd counts, draw, two-way tie, three-way tie, total unresolved tie |
| Score validation | Best-of 1/3/5/15, draft, invalid threshold, elimination draw |
| Mutation | Rename, roster edit, seed swap, replacement, removal/addition, score correction |
| Concurrency | Same version collision, refresh, reapply |
| Capabilities | Admin/public/unknown/malformed/wrong role; public projection leakage |
| UI matrix | EN/VI × light/dark × 320/768/1200 px |
| Existing app | Calculator, history, bill detail, language, theme |

## 5. Parallelization guidance

After phases 0–1 freeze contracts:

- The domain engine lane and D1 capability/repository lane may proceed in parallel.
- Admin and public UI component scaffolding may proceed after DTO contracts stabilize, but mutation wiring waits for service/API completion.
- Localization can run alongside component development, with parity verification after merges.
- E2E automation can begin once creation plus one format works, then expand format by format.

Do not parallelize changes to the same routing, dictionary, or shared contract files without explicit ownership; they are merge-conflict hotspots.

## 6. Recommended execution staffing

If implemented with Codex native agents:

- **Executor, high reasoning:** domain algorithms and invalidation; highest correctness lane.
- **Executor, high reasoning:** D1 repository, capabilities, and API service.
- **Executor or designer, high reasoning:** responsive organizer/public UI after contracts stabilize.
- **Test engineer, medium/high reasoning:** fixture matrix, integration race test, E2E.
- **Security reviewer, medium reasoning:** capability leakage and mutation authorization review.
- **Verifier, high reasoning:** final criteria trace and preview evidence.

Keep one owner for shared contracts and one integrator for `App.tsx`, `Layout.tsx`, and dictionaries.

## 7. Delivery estimate

Indicative effort for one experienced engineer, excluding review latency:

| Milestone | Effort |
|---|---|
| Correct core (phases 0–5) | 10–15 focused engineering days |
| Organizer/public product (phases 6–9) | 8–12 days |
| Quality and rollout (phases 10–11) | 4–7 days |
| Total | 22–34 focused engineering days |

Parallel ownership can reduce elapsed time but should not compress engine correctness, concurrency proof, or capability security reviews.

## 8. Risks and stop gates

| Gate | Stop condition | Required resolution |
|---|---|---|
| Engine | Any 2–32 fixture produces duplicate/missing entrant progression | Fix algorithm and add regression before API work continues |
| D1 concurrency | Race test permits two commits for one expected version | Repair the single-statement snapshot compare-and-swap before mutations continue |
| Security | Token/private field appears in logs or public payload | Block release and repair serializer/logging boundary |
| Invalidation | Unrelated completed branch is cleared or affected result retained | Repair DAG reconciliation and expand fixture |
| Extraction | Tournament imports bill-domain code | Move shared primitive or invert dependency before merge |
| Accessibility | Core journey is keyboard-blocked | Fix before preview approval |

## 9. Definition of done

- Every PRD acceptance criterion has a passing automated test or documented manual evidence.
- Bracket/standings engines pass the full 2–32 matrix.
- Capability security and public serialization receive an independent review.
- Optimistic concurrency has a reproducible race-test result.
- All tournament strings exist in English and Vietnamese.
- Core flows pass light/dark and target viewport checks.
- Existing bill routes pass regression tests.
- Lint, build/typecheck, unit, component, API integration, and E2E smoke commands pass.
- Preview deployment and D1 migration are verified.
- README/runbook explains local setup, migration, deployment, and capability-link risk.
- No source implementation begins from assumptions that contradict the PRD or tech spec; deviations are recorded in an ADR before merge.

## 10. Remaining risks after MVP

- Possession-based admin access cannot recover a lost link or identify malicious edits.
- Stable links cannot be revoked in MVP.
- Manual refresh permits temporary stale views, although optimistic locking prevents silent write loss.
- No audit trail exists for who changed a result.
- Standalone extraction will still require a new shell and deployment configuration, even though tournament domain code is isolated.
