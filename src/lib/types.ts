export type Employee = {
  id: number;
  name: string;
};

export type Client = {
  id: number;
  name: string;
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
