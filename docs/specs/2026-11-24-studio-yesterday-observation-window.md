# Add a Yesterday observation window to Harness Studio

## Traceability

- Spec ID: studio-yesterday-observation-window
- Status: Implemented

## Intent

Studio's shared observation window is the single "when" for every observe View.
It offers Today, the last 7 and 30 days, all time and a custom range, but a
reader reviewing what happened on the previous day has to type that day into a
custom range. The window should name yesterday directly.

A local calendar day is not always 24 hours long: when DST starts or ends it is
23 or 25 hours. The existing window bounds added a fixed 86,400,000 ms to local
midnight, so on a transition day the window either included an hour of the next
day or stopped an hour before the day ended. Yesterday is precisely the preset
that lands on those days, so the bounds calculation is fixed with it.

## Acceptance Scenarios

- AC-1: The sidebar offers `Yesterday` between `Today` and `Last 7 days`, in both
  English and Simplified Chinese. Choosing it resolves to exactly the local
  calendar day before the current local day, across month, year and leap-day
  boundaries, and survives a page reload.
- AC-2: Every preset's resolved window starts at the first instant of its first
  local day and ends at the last instant of its last local day. On a 23-hour day
  the window does not extend into the next day; on a 25-hour day it keeps the
  final hour. Today and Yesterday share the corrected calculation.
- AC-3: Sessions, Commits, Artifacts, Memory, Performance and the embedded
  Inspector all narrow to yesterday through the existing shared filter, with no
  per-view calendar.
- AC-4: Narrowing from a loaded `Last 30 days` / `Last 7 days` scan to Yesterday
  reuses the loaded evidence without a rescan; asking for Yesterday after loading
  Today issues one scan whose `fromMs`/`toMs` are yesterday's local midnight and
  the next local midnight minus one millisecond.

## Non-goals

No server-side timezone resolution, no new API, no Rust/desktop changes, no
timezone picker, no midnight rollover timer, no change to the default window
(still Last 30 days), and no redesign of the bounded-scan omitted-count or
undated-row behaviour.

## Plan and Tasks

1. Add `yesterday` to the preset union, the sidebar preset list and the resolver,
   using calendar-day shifting so month, year, leap-day and DST boundaries are
   handled as days rather than 24-hour spans.
2. Replace the local day-end calculation with "next local midnight minus one
   millisecond" so 23- and 25-hour days are exact; keep the loose treatment of
   unparseable day keys.
3. Add the English and Simplified Chinese labels; the existing i18n parity test
   locks the key trees together.
4. Document the preset in this spec and CHANGELOG.
5. Cover resolution, boundaries, window coverage, artifacts, DST transitions and
   the browser chain with the existing Vitest and Playwright suites.

## Test and Review Evidence

- AC-1/AC-2: `npx vitest run test/date-range.test.ts test/date-range-dst.test.ts`
  passed 22 tests in 2 files. The DST file runs the real module in child
  processes with `TZ=America/New_York` and `TZ=Europe/Berlin`, asserting 23-hour
  and 25-hour windows, that the stored `toMs` stays inside the day, and that the
  final hour of a fall-back day is included. A `TZ=Asia/Tokyo` control stays at
  24 hours.
- AC-1: `npx vitest run test/i18n-resources.test.ts` passed 4 tests; the English
  and Simplified Chinese key trees stay identical.
- AC-3/AC-4: `npx playwright test test/browser/date-range.spec.mjs` passed 2
  tests against the built Studio: the dropdown offers Yesterday, the default
  thirty-day catalog narrows to the single yesterday Session, the choice survives
  a reload, a `Last 30 days` catalog is not re-scanned when narrowing, and a scan
  loaded for Today is re-scanned with yesterday's local midnight boundaries when
  Yesterday is selected. Screenshots are written beside the Playwright output.
- Regression: `npx playwright test test/browser/shared-scope.spec.mjs
  test/browser/artifact-workspace.spec.mjs test/browser/project-shell.spec.mjs`
  passed 23 tests.
- `npm run typecheck -w @qoder-ai/harness-studio` passed after building the core
  package (`npm run harness:build`); an unbuilt workspace otherwise reports
  missing `@qoder-ai/harness/*` declarations unrelated to this change.
- `npm run harness-studio:test` passed 100 test files and 834 tests, including
  the full Studio build.
