import { describe, it, expect, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/entries/route";
import { DELETE as DELETE_ENTRY } from "@/app/api/entries/[id]/route";
import { POST as BULK_DELETE } from "@/app/api/entries/bulk-delete/route";
import {
  addClient,
  addEmployee,
  addEntry,
  del,
  get,
  isDeleted,
  post,
  resetDb,
  routeParams,
} from "./helpers";

let alice: number;
let ben: number;
let acme: number;
let proBono: number;

beforeEach(() => {
  resetDb();
  alice = addEmployee("Alice Nguyen");
  ben = addEmployee("Ben Carter");
  acme = addClient("Acme Corp");
  proBono = addClient("Pro Bono");
});

const list = async (query = "") =>
  (await (await GET(get(`/api/entries${query}`))).json());

describe("POST /api/entries", () => {
  it("creates an entry from an explicit duration", async () => {
    const res = await POST(
      post("/api/entries", {
        employeeId: alice,
        clientId: acme,
        date: "2026-07-16",
        durationMinutes: 6,
        billable: true,
        notes: "Short call",
      }),
    );
    expect(res.status).toBe(201);
    const entry = await res.json();
    // 6 minutes is the standard legal billing increment; it must survive.
    expect(entry.duration_minutes).toBe(6);
    expect(entry.employee_name).toBe("Alice Nguyen");
    expect(entry.client_name).toBe("Acme Corp");
  });

  it("derives the duration from start and end times", async () => {
    const res = await POST(
      post("/api/entries", {
        employeeId: alice,
        clientId: acme,
        date: "2026-07-16",
        startTime: "11:15",
        endTime: "15:00",
        billable: true,
      }),
    );
    const entry = await res.json();
    expect(entry.duration_minutes).toBe(225);
  });

  it("rejects an entry with neither duration nor a time span", async () => {
    const res = await POST(
      post("/api/entries", {
        employeeId: alice,
        clientId: acme,
        date: "2026-07-16",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects missing required fields", async () => {
    const res = await POST(post("/api/entries", { durationMinutes: 60 }));
    expect(res.status).toBe(400);
  });

  it("refuses to attach an entry to a trashed employee", async () => {
    // Restore and purge both assume live entries never reference trashed
    // records, so the API has to enforce it.
    addEntry({ employeeId: ben, clientId: acme, date: "2026-07-16", durationMinutes: 60 });
    await import("@/lib/db").then(({ default: db }) =>
      db.prepare("UPDATE employees SET deleted_at = datetime('now') WHERE id = ?").run(ben),
    );

    const res = await POST(
      post("/api/entries", {
        employeeId: ben,
        clientId: acme,
        date: "2026-07-16",
        durationMinutes: 60,
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/employee/i);
  });
});

describe("GET /api/entries", () => {
  beforeEach(() => {
    // 5 billable (60 min each) + 2 non-billable (30 min each)
    for (let i = 0; i < 5; i++) {
      addEntry({
        employeeId: alice,
        clientId: acme,
        date: `2026-07-1${i}`,
        durationMinutes: 60,
        billable: 1,
      });
    }
    for (let i = 0; i < 2; i++) {
      addEntry({
        employeeId: ben,
        clientId: proBono,
        date: `2026-07-2${i}`,
        durationMinutes: 30,
        billable: 0,
      });
    }
  });

  it("reports totals across the whole filtered set, not just the page", async () => {
    // The summary stats depend on this: paging must not change the totals.
    const full = await list("?limit=100");
    const onePerPage = await list("?limit=1");

    expect(full.entries).toHaveLength(7);
    expect(onePerPage.entries).toHaveLength(1);
    expect(onePerPage.total).toBe(full.total);
    expect(onePerPage.totalMinutes).toBe(full.totalMinutes);
    expect(onePerPage.billableMinutes).toBe(full.billableMinutes);
    expect(full.totalMinutes).toBe(5 * 60 + 2 * 30);
    expect(full.billableMinutes).toBe(5 * 60);
  });

  it("returns disjoint pages via limit and offset", async () => {
    const page1 = await list("?limit=4&offset=0");
    const page2 = await list("?limit=4&offset=4");
    expect(page1.entries).toHaveLength(4);
    expect(page2.entries).toHaveLength(3);

    const ids = [...page1.entries, ...page2.entries].map((e: { id: number }) => e.id);
    expect(new Set(ids).size).toBe(7);
  });

  it("caps the page size", async () => {
    const res = await list("?limit=9999");
    expect(res.entries.length).toBeLessThanOrEqual(100);
  });

  it("composes filters with the totals", async () => {
    const billable = await list("?billable=1&limit=100");
    expect(billable.total).toBe(5);
    expect(billable.billableMinutes).toBe(billable.totalMinutes);

    const byEmployee = await list(`?employeeId=${ben}&limit=100`);
    expect(byEmployee.total).toBe(2);

    const byClient = await list(`?clientId=${proBono}&limit=100`);
    expect(byClient.total).toBe(2);
  });

  it("filters by date range", async () => {
    const res = await list("?from=2026-07-20&to=2026-07-21&limit=100");
    expect(res.total).toBe(2);
  });

  it("excludes soft-deleted entries", async () => {
    const before = await list("?limit=100");
    const victim = before.entries[0].id;

    await DELETE_ENTRY(del(`/api/entries/${victim}`), routeParams(victim));

    const after = await list("?limit=100");
    expect(after.total).toBe(before.total - 1);
    expect(after.entries.map((e: { id: number }) => e.id)).not.toContain(victim);
    // Soft delete: the row survives, flagged.
    expect(isDeleted("time_entries", victim)).toBe(true);
  });
});

describe("DELETE /api/entries/[id]", () => {
  it("is idempotent — deleting twice 404s the second time", async () => {
    const id = addEntry({
      employeeId: alice,
      clientId: acme,
      date: "2026-07-16",
      durationMinutes: 60,
    });
    expect((await DELETE_ENTRY(del(""), routeParams(id))).status).toBe(200);
    expect((await DELETE_ENTRY(del(""), routeParams(id))).status).toBe(404);
  });
});

describe("POST /api/entries/bulk-delete", () => {
  it("trashes every selected entry in one call", async () => {
    const ids = [1, 2, 3].map(() =>
      addEntry({
        employeeId: alice,
        clientId: acme,
        date: "2026-07-16",
        durationMinutes: 60,
      }),
    );
    const keep = addEntry({
      employeeId: alice,
      clientId: acme,
      date: "2026-07-16",
      durationMinutes: 60,
    });

    const res = await BULK_DELETE(post("/api/entries/bulk-delete", { ids }));
    expect((await res.json()).trashed).toBe(3);

    ids.forEach((id) => expect(isDeleted("time_entries", id)).toBe(true));
    expect(isDeleted("time_entries", keep)).toBe(false);
  });

  it("rejects an empty selection", async () => {
    const res = await BULK_DELETE(post("/api/entries/bulk-delete", { ids: [] }));
    expect(res.status).toBe(400);
  });
});
