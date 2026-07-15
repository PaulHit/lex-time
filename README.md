# Lex Time

A time-tracking tool for a law firm to log employee hours by day, client, and billability.

Built with Next.js (App Router, TypeScript) and a local SQLite database via `better-sqlite3`. No cloud services, no auth provider — data lives in a SQLite file on disk so it survives restarts and refreshes.

## Features

- **List-first layout**: summary stats and the full time-entry list load on open. A **Log time** button opens a modal form; the same modal (pre-filled) is reused for editing an entry.
- **Log time** with date, client, billable/non-billable, and duration — entered either as a start/end time (auto-calculated) or directly in hours.
- **View logged time** in a table showing date, employee, client, duration, and billable status, with live summary stats (total / billable / non-billable hours).
- **Filter** entries by employee, client, billability, and date range (today / this week / this month / all time).
- **Edit and delete** any entry inline.
- **Clients and employees** can be added on the fly from the entry form, or managed in a dedicated **People & clients** dialog (add or remove). Removal is blocked while a person/client still has time entries, so you never orphan data. A few of each are seeded on first run.
- **Long notes** collapse to a preview with a **Show more / Show less** toggle, so the table stays tidy.
- **Mock local user**: the "Logged in as" switcher in the header stands in for real auth (out of scope per the assignment). It sets which employee new entries default to, and is remembered across sessions via `localStorage`. All entries stay visible to everyone — there's no access control, matching the "local/mock user" scope.
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
- **Data model**: `employees`, `clients`, and `time_entries` tables. A time entry stores either `start_time`/`end_time` or a plain `duration_minutes`, plus a `billable` flag and optional notes.
- **UI**: a single client-side page (`src/components/TimeTrackerApp.tsx`) composed of summary stats, a filter bar, a table, and a modal entry form (`src/components/Modal.tsx` + `EntryForm.tsx`), talking to the API routes over `fetch`. Light, bright theme throughout.

## What's out of scope (per the assignment)

- Real authentication — the "logged in as" employee switcher is a mock/local user, not a real auth system.
- A cloud database or hosted backend — persistence is local SQLite.
