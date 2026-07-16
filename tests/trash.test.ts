import { describe, it, expect, beforeEach } from "vitest";
import { DELETE as DELETE_EMPLOYEE } from "@/app/api/employees/[id]/route";
import { DELETE as DELETE_CLIENT } from "@/app/api/clients/[id]/route";
import { POST as CREATE_EMPLOYEE, GET as LIST_EMPLOYEES } from "@/app/api/employees/route";
import { GET as GET_TRASH } from "@/app/api/trash/route";
import { POST as RESTORE } from "@/app/api/trash/restore/route";
import { POST as PURGE } from "@/app/api/trash/purge/route";
import {
  addClient,
  addEmployee,
  addEntry,
  del,
  isDeleted,
  post,
  resetDb,
  rowExists,
  routeParams,
} from "./helpers";

let alice: number;
let acme: number;
let entryIds: number[];

beforeEach(() => {
  resetDb();
  alice = addEmployee("Alice Nguyen");
  acme = addClient("Acme Corp");
  entryIds = [1, 2, 3].map((i) =>
    addEntry({
      employeeId: alice,
      clientId: acme,
      date: `2026-07-1${i}`,
      durationMinutes: 60,
    }),
  );
});

const trash = async () => (await (await GET_TRASH()).json());

describe("cascade delete", () => {
  it("asks for confirmation and reports the entry count", async () => {
    const res = await DELETE_EMPLOYEE(del("/api/employees/1"), routeParams(alice));
    expect(res.status).toBe(409);

    const body = await res.json();
    expect(body.requiresConfirmation).toBe(true);
    expect(body.entryCount).toBe(3);
    // Nothing was touched — this is a question, not an action.
    expect(isDeleted("employees", alice)).toBe(false);
    entryIds.forEach((id) => expect(isDeleted("time_entries", id)).toBe(false));
  });

  it("trashes the employee and all their entries once confirmed", async () => {
    const res = await DELETE_EMPLOYEE(
      del("/api/employees/1?cascade=1"),
      routeParams(alice),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).trashedEntries).toBe(3);

    expect(isDeleted("employees", alice)).toBe(true);
    entryIds.forEach((id) => expect(isDeleted("time_entries", id)).toBe(true));

    const t = await trash();
    expect(t.entries).toHaveLength(3);
    expect(t.employees).toHaveLength(1);
    expect(t.employees[0].trashedEntryCount).toBe(3);
  });

  it("deletes a record with no entries without asking", async () => {
    const spare = addEmployee("Spare Person");
    const res = await DELETE_EMPLOYEE(del("/api/employees/x"), routeParams(spare));
    expect(res.status).toBe(200);
    expect(isDeleted("employees", spare)).toBe(true);
  });

  it("cascades for clients too", async () => {
    const res = await DELETE_CLIENT(
      del("/api/clients/1?cascade=1"),
      routeParams(acme),
    );
    expect((await res.json()).trashedEntries).toBe(3);
    expect(isDeleted("clients", acme)).toBe(true);
  });
});

describe("restore", () => {
  beforeEach(async () => {
    await DELETE_EMPLOYEE(del("/api/employees/1?cascade=1"), routeParams(alice));
  });

  it("restores an entry together with its employee and client", async () => {
    // A live entry must never point at a trashed record.
    const res = await RESTORE(
      post("/api/trash/restore", { items: [{ type: "entry", id: entryIds[0] }] }),
    );
    expect((await res.json()).restored).toBe(1);

    expect(isDeleted("time_entries", entryIds[0])).toBe(false);
    expect(isDeleted("employees", alice)).toBe(false);
    expect(isDeleted("clients", acme)).toBe(false);
    // The others stay in the trash — restore is granular.
    expect(isDeleted("time_entries", entryIds[1])).toBe(true);
    expect(isDeleted("time_entries", entryIds[2])).toBe(true);
  });

  it("restores an employee without dragging their entries back", async () => {
    await RESTORE(post("/api/trash/restore", { items: [{ type: "employee", id: alice }] }));

    expect(isDeleted("employees", alice)).toBe(false);
    entryIds.forEach((id) => expect(isDeleted("time_entries", id)).toBe(true));
  });

  it("restores a whole selection in one call", async () => {
    const items = [
      { type: "employee", id: alice },
      ...entryIds.map((id) => ({ type: "entry", id })),
    ];
    const res = await RESTORE(post("/api/trash/restore", { items }));
    expect((await res.json()).restored).toBe(4);

    const t = await trash();
    expect(t.entries).toHaveLength(0);
    expect(t.employees).toHaveLength(0);
  });

  it("skips ids that are no longer in the trash rather than failing the batch", async () => {
    const res = await RESTORE(
      post("/api/trash/restore", {
        items: [
          { type: "entry", id: entryIds[0] },
          { type: "entry", id: 9999 },
        ],
      }),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).restored).toBe(1);
  });

  it("rejects an empty selection", async () => {
    const res = await RESTORE(post("/api/trash/restore", { items: [] }));
    expect(res.status).toBe(400);
  });
});

describe("purge", () => {
  beforeEach(async () => {
    await DELETE_EMPLOYEE(del("/api/employees/1?cascade=1"), routeParams(alice));
  });

  it("permanently deletes a single entry", async () => {
    await PURGE(post("/api/trash/purge", { items: [{ type: "entry", id: entryIds[0] }] }));
    expect(rowExists("time_entries", entryIds[0])).toBe(false);
    expect(rowExists("time_entries", entryIds[1])).toBe(true);
  });

  it("purges an employee along with their trashed entries", async () => {
    await PURGE(post("/api/trash/purge", { items: [{ type: "employee", id: alice }] }));

    expect(rowExists("employees", alice)).toBe(false);
    entryIds.forEach((id) => expect(rowExists("time_entries", id)).toBe(false));
  });

  it("never purges a record that still has live entries", async () => {
    // Restore one entry, which brings Alice back to life with it.
    await RESTORE(post("/api/trash/restore", { items: [{ type: "entry", id: entryIds[0] }] }));

    await PURGE(post("/api/trash/purge", { items: [{ type: "employee", id: alice }] }));

    // Guard held: the live entry and its employee survive.
    expect(rowExists("employees", alice)).toBe(true);
    expect(rowExists("time_entries", entryIds[0])).toBe(true);
  });

  it("empties the whole trash", async () => {
    const res = await PURGE(post("/api/trash/purge", { all: true }));
    expect((await res.json()).purged).toBe(4); // 3 entries + 1 employee

    const t = await trash();
    expect(t.entries).toHaveLength(0);
    expect(t.employees).toHaveLength(0);
    expect(t.clients).toHaveLength(0);
  });
});

describe("re-adding a trashed name", () => {
  it("restores the original record instead of colliding", async () => {
    const spare = addEmployee("Spare Person");
    await DELETE_EMPLOYEE(del("/api/employees/x"), routeParams(spare));
    expect(isDeleted("employees", spare)).toBe(true);

    // The name column is UNIQUE, so a naive insert would fail here.
    const res = await CREATE_EMPLOYEE(post("/api/employees", { name: "Spare Person" }));
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe(spare);
    expect(isDeleted("employees", spare)).toBe(false);
  });

  it("hides trashed records from the live list", async () => {
    await DELETE_EMPLOYEE(del("/api/employees/1?cascade=1"), routeParams(alice));
    const employees = await (await LIST_EMPLOYEES()).json();
    expect(employees.map((e: { name: string }) => e.name)).not.toContain("Alice Nguyen");
  });
});
