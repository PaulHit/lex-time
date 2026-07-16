import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "timesheet.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS time_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL REFERENCES employees(id),
    client_id INTEGER NOT NULL REFERENCES clients(id),
    date TEXT NOT NULL,
    start_time TEXT,
    end_time TEXT,
    duration_minutes INTEGER NOT NULL,
    billable INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
  );
`);

// Migrate databases created before soft delete existed.
for (const table of ["employees", "clients", "time_entries"]) {
  const columns = db
    .prepare(`PRAGMA table_info(${table})`)
    .all() as { name: string }[];
  if (!columns.some((c) => c.name === "deleted_at")) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN deleted_at TEXT`);
  }
}

const EMPLOYEE_NAMES = [
  "Alice Nguyen",
  "Ben Carter",
  "Priya Shah",
  "Marcus Feld",
  "Dana Whitfield",
];

const CLIENT_NAMES = [
  "Acme Corp",
  "Initech LLC",
  "Globex Industries",
  "Wayne Enterprises",
  "Stark & Associates",
  "Pro Bono",
];

const BILLABLE_NOTES = [
  "Contract review and redlines",
  "Client call re: settlement terms",
  "Deposition prep",
  "Discovery strategy call",
  "Drafting NDA and MSA",
  "Due diligence review",
  "Regulatory compliance memo",
  "Patent claim analysis",
  "Litigation research",
  "Merger term sheet",
  "Board resolution drafting",
  "Employment agreement review",
  "Trademark filing",
  "Vendor contract dispute",
  "IP portfolio audit",
  "Weekly client update",
  "Reviewing opposing counsel's brief",
  "Preparing exhibits for hearing",
  "Drafting motion to dismiss",
  "Lease agreement negotiation",
  "Privacy policy update",
  "Corporate filing review",
  "Contract negotiation",
  null, // some entries are logged without a note
];

const NON_BILLABLE_NOTES = [
  "Case admin",
  "Internal matter sync",
  "Practice group meeting",
  "CLE training session",
];

const PRO_BONO_NOTES = [
  "Pro bono intake consultation",
  "Community legal clinic",
  "Pro bono case review",
];

// Long enough to exercise the notes Show more / Show less toggle out of the box.
const LONG_NOTE =
  "Full review of the amended master services agreement, including the indemnity and limitation-of-liability clauses. Flagged three provisions that conflict with the client's standard negotiating position, drafted alternative language for each, and summarised the trade-offs in a short memo for the partner ahead of Thursday's call.";

type SeedEntry = {
  employee: string;
  client: string;
  daysAgo: number;
  start: string | null;
  end: string | null;
  durationMinutes: number;
  billable: 0 | 1;
  notes: string | null;
};

/** Deterministic PRNG (LCG) so every fresh clone seeds an identical dataset. */
function makeRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const HHMM = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(
    minutes % 60,
  ).padStart(2, "0")}`;

/**
 * Builds ~70 entries across the last five weeks: a couple of matters per
 * weekday, the odd weekend push, and today always populated so the "Today"
 * filter is never empty.
 */
function buildSeedEntries(): SeedEntry[] {
  const rand = makeRandom(20260716);
  const pick = <T,>(items: readonly T[]): T =>
    items[Math.floor(rand() * items.length)];

  const rows: SeedEntry[] = [];
  const today = new Date();

  for (let daysAgo = 34; daysAgo >= 0; daysAgo--) {
    const day = new Date(today);
    day.setDate(day.getDate() - daysAgo);
    const isWeekend = day.getDay() === 0 || day.getDay() === 6;

    let count: number;
    if (daysAgo === 0) count = 3; // keep "Today" populated whenever it's cloned
    else if (isWeekend) count = rand() < 0.4 ? 1 : 0;
    else count = 2 + Math.floor(rand() * 3);

    for (let i = 0; i < count; i++) {
      const client = pick(CLIENT_NAMES);
      const isProBono = client === "Pro Bono";
      const billable: 0 | 1 = isProBono ? 0 : rand() < 0.85 ? 1 : 0;

      // 15-minute increments, 30 min to 4 h.
      const durationMinutes = (2 + Math.floor(rand() * 15)) * 15;
      const usesClock = rand() < 0.7;
      // 08:00–16:00 start, so the latest possible end lands at 20:00.
      const startMinutes = 8 * 60 + Math.floor(rand() * 33) * 15;

      rows.push({
        employee: pick(EMPLOYEE_NAMES),
        client,
        daysAgo,
        start: usesClock ? HHMM(startMinutes) : null,
        end: usesClock ? HHMM(startMinutes + durationMinutes) : null,
        durationMinutes,
        billable,
        notes: isProBono
          ? pick(PRO_BONO_NOTES)
          : billable
            ? pick(BILLABLE_NOTES)
            : pick(NON_BILLABLE_NOTES),
      });
    }
  }

  // Give one of today's entries a long note so the Show more toggle is
  // discoverable on a fresh clone. Pro bono work stays non-billable.
  const showcase =
    rows.find((r) => r.daysAgo === 0 && r.client !== "Pro Bono") ??
    rows.find((r) => r.daysAgo === 0);
  if (showcase) {
    showcase.notes = LONG_NOTE;
    if (showcase.client !== "Pro Bono") showcase.billable = 1;
  }

  return rows;
}

function seed() {
  const employeeCount = (
    db.prepare("SELECT COUNT(*) as c FROM employees").get() as { c: number }
  ).c;
  if (employeeCount === 0) {
    const insert = db.prepare("INSERT INTO employees (name) VALUES (?)");
    for (const name of EMPLOYEE_NAMES) insert.run(name);
  }

  const clientCount = (
    db.prepare("SELECT COUNT(*) as c FROM clients").get() as { c: number }
  ).c;
  if (clientCount === 0) {
    const insert = db.prepare("INSERT INTO clients (name) VALUES (?)");
    for (const name of CLIENT_NAMES) insert.run(name);
  }

  const entryCount = (
    db.prepare("SELECT COUNT(*) as c FROM time_entries").get() as {
      c: number;
    }
  ).c;
  if (entryCount === 0) {
    const employeeId = new Map(
      (
        db.prepare("SELECT id, name FROM employees").all() as {
          id: number;
          name: string;
        }[]
      ).map((e) => [e.name, e.id]),
    );
    const clientId = new Map(
      (
        db.prepare("SELECT id, name FROM clients").all() as {
          id: number;
          name: string;
        }[]
      ).map((c) => [c.name, c.id]),
    );

    const insert = db.prepare(`
      INSERT INTO time_entries
        (employee_id, client_id, date, start_time, end_time, duration_minutes, billable, notes)
      VALUES (@employee_id, @client_id, @date, @start_time, @end_time, @duration_minutes, @billable, @notes)
    `);
    const today = new Date();
    const iso = (daysAgo: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() - daysAgo);
      const tzOffset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
    };

    const insertMany = db.transaction((entries: SeedEntry[]) => {
      for (const row of entries) {
        insert.run({
          employee_id: employeeId.get(row.employee),
          client_id: clientId.get(row.client),
          date: iso(row.daysAgo),
          start_time: row.start,
          end_time: row.end,
          duration_minutes: row.durationMinutes,
          billable: row.billable,
          notes: row.notes,
        });
      }
    });
    insertMany(buildSeedEntries());
  }
}
seed();

export default db;
