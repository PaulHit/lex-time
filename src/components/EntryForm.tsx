"use client";

import { useState } from "react";
import CreatableSelect from "./CreatableSelect";
import { todayISO } from "@/lib/time";
import { Client, Employee, TimeEntry } from "@/lib/types";

export type EntryPayload = {
  employeeId: number;
  clientId: number;
  date: string;
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number | null;
  billable: boolean;
  notes: string | null;
};

export default function EntryForm({
  employees,
  clients,
  defaultEmployeeId,
  initial,
  onSubmit,
  onCancel,
  onCreateEmployee,
  onCreateClient,
  submitLabel = "Log time",
}: {
  employees: Employee[];
  clients: Client[];
  defaultEmployeeId: number | null;
  initial?: TimeEntry;
  onSubmit: (payload: EntryPayload) => Promise<void>;
  onCancel?: () => void;
  onCreateEmployee: (name: string) => Promise<Employee>;
  onCreateClient: (name: string) => Promise<Client>;
  submitLabel?: string;
}) {
  const [mode, setMode] = useState<"time" | "duration">(
    initial?.start_time && initial?.end_time ? "time" : "duration",
  );
  const [employeeId, setEmployeeId] = useState<number | null>(
    initial?.employee_id ?? defaultEmployeeId,
  );
  const [clientId, setClientId] = useState<number | null>(
    initial?.client_id ?? null,
  );
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [startTime, setStartTime] = useState(initial?.start_time ?? "09:00");
  const [endTime, setEndTime] = useState(initial?.end_time ?? "10:00");
  const [durationHours, setDurationHours] = useState(
    initial ? (initial.duration_minutes / 60).toFixed(2) : "1.00",
  );
  const [billable, setBillable] = useState(initial ? !!initial.billable : true);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!employeeId) return setError("Choose an employee.");
    if (!clientId) return setError("Choose a client.");
    if (!date) return setError("Choose a date.");
    if (mode === "time" && (!startTime || !endTime)) {
      return setError("Enter both a start and end time.");
    }
    if (mode === "duration" && !(Number(durationHours) > 0)) {
      return setError("Duration must be greater than zero.");
    }

    setSubmitting(true);
    try {
      await onSubmit({
        employeeId,
        clientId,
        date,
        startTime: mode === "time" ? startTime : null,
        endTime: mode === "time" ? endTime : null,
        durationMinutes:
          mode === "duration" ? Math.round(Number(durationHours) * 60) : null,
        billable,
        notes: notes.trim() || null,
      });
      if (!initial) {
        // reset for the next entry, keep employee/client/date sticky
        setNotes("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <CreatableSelect
          label="Employee"
          items={employees}
          value={employeeId}
          onChange={setEmployeeId}
          onCreate={onCreateEmployee}
          addLabel="New employee name"
        />
        <CreatableSelect
          label="Client"
          items={clients}
          value={clientId}
          onChange={setClientId}
          onCreate={onCreateClient}
          addLabel="New client name"
        />
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Billable
          </span>
          <label className="flex h-[34px] items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={billable}
              onChange={(e) => setBillable(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            {billable ? "Billable" : "Non-billable"}
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setMode("time")}
            className={`rounded-full px-3 py-1 font-medium ${
              mode === "time"
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "border border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-400"
            }`}
          >
            Start / end time
          </button>
          <button
            type="button"
            onClick={() => setMode("duration")}
            className={`rounded-full px-3 py-1 font-medium ${
              mode === "duration"
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "border border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-400"
            }`}
          >
            Duration
          </button>
        </div>

        {mode === "time" ? (
          <div className="flex gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Start
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                End
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1 sm:w-40">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Hours
            </label>
            <input
              type="number"
              step="0.25"
              min="0.25"
              value={durationHours}
              onChange={(e) => setDurationHours(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
          Notes (optional)
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Brief description of the work"
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
        >
          {submitting ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm dark:border-slate-700"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
