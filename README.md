# Lex Time

A time-tracking tool for a law firm to log employee hours by day, client, and billability.

Built with Next.js (App Router, TypeScript) and a local SQLite database via `better-sqlite3`. No cloud services, no auth provider — data lives in a SQLite file on disk so it survives restarts and refreshes.

## How it's modelled

Lex Time is a **single, firm-wide timesheet** — an internal tool the firm opens to record and review everyone's hours, rather than a per-person SaaS account. There is deliberately **no login**: real authentication is out of scope for this assessment, and a mock "logged in as" switcher would have been a fiction that changed nothing (any employee could still be picked on any entry). So instead of pretending, each entry simply names the employee it belongs to, and the list, filters, and stats give a firm-wide view.

If this were taken further, real per-user auth would be the natural next step: each employee signs in, entries are attributed to them automatically, and the firm-wide view becomes a partner/admin role.

## Features

- **List-first layout**: summary stats and the full time-entry list load on open. A **Log time** button opens a modal form; the same modal (pre-filled) is reused for editing an entry.
- **Log time** with date, client, billable/non-billable, and duration — entered either as a start/end time (auto-calculated) or directly in hours.
- **View logged time** in a table showing date, employee, client, duration, and billable status, with live summary stats (total / billable / non-billable hours).
- **Filter** entries by employee, client, billability, and date range (today / this week / this month / all time).
- **Pagination** with a configurable page size (10 / 25 / 50 / 100). Paging is done server-side via `limit`/`offset`, and the summary stats are aggregated over the **whole filtered set** rather than the visible page — so the totals stay meaningful as you page.
- **Edit and delete** any entry inline, or **select multiple entries** (checkboxes, with page-level select-all) and delete them in one batch.
- **Trash with restore**: nothing is destroyed on delete. Entries, employees, and clients move to a **Trash tab**, where items can be **ticked and restored or deleted forever in bulk** — so an employee and the entries that were cascaded along with them come back together, or you can restore just the few you want and leave the rest. Restoring an entry auto-restores its employee/client if they were trashed too, so a live entry never points at deleted records.
- **Clients and employees** can be added on the fly from the entry form, or managed in a dedicated **People & clients** dialog. Deleting one that still has logged time shows a confirmation with the exact entry count, then moves the record *and* its entries to the Trash together. Re-adding a trashed name restores it instead of colliding. A few of each are seeded on first run.
- **Long notes** collapse to a preview with a **Show more / Show less** toggle, so the table stays tidy.
- **Local persistence**: all data is stored in `data/timesheet.db` (SQLite), created automatically on first run. Nothing is lost on refresh or restart.

## Getting started

Requires Node.js 18+.

```bash
git clone <this-repo-url>
cd software_vision
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The database is created automatically at `data/timesheet.db` and seeded with a few example employees, clients, and time entries the first time the app runs.

### Production build

```bash
npm run build
npm run start
```

## Tech notes

- **Framework**: Next.js App Router with Route Handlers (`src/app/api/**`) acting as the backend API.
- **Database**: SQLite via `better-sqlite3`, schema and seed data initialized lazily in [src/lib/db.ts](src/lib/db.ts). The `data/` directory is gitignored — it's local, per-machine state, not something to commit.
- **Data model**: `employees`, `clients`, and `time_entries` tables. A time entry stores either `start_time`/`end_time` or a plain `duration_minutes`, plus a `billable` flag and optional notes. Deletion is a **soft delete** (`deleted_at` column) — the Trash is just the set of soft-deleted rows, and "delete forever" is the only hard `DELETE`.
- **UI**: a single client-side page (`src/components/TimeTrackerApp.tsx`) composed of summary stats, a filter bar, a table, and a modal entry form (`src/components/Modal.tsx` + `EntryForm.tsx`), talking to the API routes over `fetch`. Light, bright theme throughout.

## What's out of scope (per the assignment)

- Real authentication — see [How it's modelled](#how-its-modelled): the app is a shared firm-wide timesheet with no login, rather than a mock sign-in that wouldn't actually gate anything.
- A cloud database or hosted backend — persistence is local SQLite.
