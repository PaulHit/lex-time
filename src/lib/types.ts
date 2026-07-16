export type Employee = {
  id: number;
  name: string;
};

export type Client = {
  id: number;
  name: string;
};

export type TrashItem = {
  type: "entry" | "employee" | "client";
  id: number;
};

export type TrashedEntry = TimeEntry & { deleted_at: string };

export type TrashedRecord = {
  id: number;
  name: string;
  deleted_at: string;
  /** How many of this record's entries are also in the trash. */
  trashedEntryCount: number;
};

export type TrashResponse = {
  entries: TrashedEntry[];
  employees: TrashedRecord[];
  clients: TrashedRecord[];
};

export type EntriesResponse = {
  entries: TimeEntry[];
  /** Counts/sums span the whole filtered set, not just the returned page. */
  total: number;
  totalMinutes: number;
  billableMinutes: number;
};

export type TimeEntry = {
  id: number;
  employee_id: number;
  employee_name: string;
  client_id: number;
  client_name: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number;
  billable: number;
  notes: string | null;
  created_at: string;
};
