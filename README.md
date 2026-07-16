# Lex Time

A time-tracking tool for a law firm: log employee hours by day, client, and billability.

Next.js (App Router, TypeScript) with a local SQLite database. No cloud services, no auth provider — data lives in a file on disk and survives restarts.

## Quick start

Requires **Node 20+** (developed on Node 26).

```bash
git clone https://github.com/PaulHit/lex-time.git
cd lex-time
npm install
npm run dev
```

Open <http://localhost:3000>. The database is created at `data/timesheet.db` on first run and seeded with five weeks of example entries, so the filters and pagination have something real to work against.

| Command | |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build and serve |
| `npm test` | Test suite |
| `npm run lint` | ESLint |

## Features

**Logging time**

- Date, client, employee, billable/non-billable, and optional notes.
- Duration entered as **hours + minutes**, or as **start/end times** with the duration derived. Both resolve to the same stored minutes, so a 6-minute call — the standard legal billing increment — logs as easily as a 3-hour one.

**Reviewing time**

- All entries in one table, with live summary stats: total, billable, and non-billable hours.
- Filter by employee, client, billability, and date range; one click to clear.
- Server-side pagination at 10 / 25 / 50 / 100 per page. **Totals always describe the whole filtered set, never just the visible page.**
- Long notes collapse behind a Show more toggle.

**Editing and deleting**

- Edit any entry, or tick several and delete them in one batch.
- **Nothing is destroyed on delete.** Entries, employees, and clients move to a **Trash** tab.
- Deleting an employee or client that still has logged time asks first — naming the exact entry count — then moves the record *and* its entries to the trash together.
- In the trash, tick items to restore or delete forever in bulk. Restore is granular: bring a person back with all their entries, or just the few you want and leave the rest.
- Employees and clients can be added inline from the entry form, or managed in a **People & clients** dialog.

## Design decisions

**No login, deliberately.** Real authentication is out of scope for this assessment. Rather than ship a mock "logged in as" switcher that gates nothing — any employee could still be picked on any entry — Lex Time is modelled as a single **firm-wide timesheet**: an internal tool for recording and reviewing everyone's hours, where each entry simply names the employee it belongs to. Real per-user auth is the natural next step; entries would attribute automatically and the firm-wide view would become a partner/admin role.

**Soft delete over hard delete.** A timesheet is billing data, so an accidental delete is expensive. Every delete sets `deleted_at`, the Trash is just the set of soft-deleted rows, and "delete forever" is the only hard `DELETE`. One invariant holds throughout: **a live entry never references a trashed employee or client.** Restoring an entry restores its records, and the API refuses to attach an entry to a trashed one.

**Totals are aggregated in SQL, not in the browser.** Paging the table must not change what the stats mean, so `GET /api/entries` returns the requested page *and* aggregates over the full filtered set in the same request.

## Architecture

```
src/
  app/api/…        Route handlers — the backend
  lib/db.ts        Schema, migration, seed data
  lib/time.ts      Duration and date helpers (pure)
  components/      UI; one client-side page
tests/             Vitest suite
```

- **Database**: SQLite via `better-sqlite3`. Three tables — `employees`, `clients`, `time_entries` — each carrying a `deleted_at`. Schema and migrations run on import; `data/` is gitignored as local, per-machine state.
- **Entries** store either `start_time`/`end_time` or a plain `duration_minutes`. Minutes are the unit of record end to end, so durations never round-trip through a float.
- **UI**: a single client page (`TimeTrackerApp.tsx`) talking to the API over `fetch`, styled with Tailwind v4.

## Tests

```bash
npm test
```

43 tests covering the logic worth guarding rather than the framework:

- **Duration and date maths** — spans crossing midnight, and local-vs-UTC date handling. This caught a real bug where the "This month" filter started on the wrong day for anyone east of UTC.
- **The pagination contract** — totals stay correct regardless of `limit`/`offset`, and pages are disjoint.
- **Soft-delete invariants** — cascade asks before it acts, restoring an entry revives its employee and client, and a purge never orphans live data.

Tests run against an in-memory database and never touch `data/timesheet.db`.

## Out of scope (per the assignment)

- **Real authentication** — see [Design decisions](#design-decisions).
- **Cloud database or hosted backend** — persistence is local SQLite.
