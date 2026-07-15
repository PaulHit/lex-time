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

const inputClass =
  "rounded-lg border border-line bg-surface px-3 py-2 text-sm text-stone-900 shadow-sm outline-none transition focus:border-stone-400 focus:ring-2 focus:ring-stone-200";
const labelClass = "text-xs font-medium text-stone-600";

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <label className={labelClass}>Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className={labelClass}>Billable status</span>
          <label className="flex h-[38px] cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm text-stone-800 shadow-sm">
            <input
              type="checkbox"
              checked={billable}
              onChange={(e) => setBillable(e.target.checked)}
              className="h-4 w-4 rounded border-line accent-stone-700"
            />
            {billable ? "Billable" : "Non-billable"}
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl bg-sand p-4">
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setMode("time")}
            className={`rounded-full px-3 py-1 font-medium transition ${
              mode === "time"
                ? "bg-stone-800 text-white"
                : "bg-surface text-stone-600 ring-1 ring-line"
            }`}
          >
            Start / end time
          </button>
          <button
            type="button"
            onClick={() => setMode("duration")}
            className={`rounded-full px-3 py-1 font-medium transition ${
              mode === "duration"
                ? "bg-stone-800 text-white"
                : "bg-surface text-stone-600 ring-1 ring-line"
            }`}
          >
            Duration
          </button>
        </div>

        {mode === "time" ? (
          <div className="flex gap-4">
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Start</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClass}>End</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1 sm:w-40">
            <label className={labelClass}>Hours</label>
            <input
              type="number"
              step="0.25"
              min="0.25"
              value={durationHours}
              onChange={(e) => setDurationHours(e.target.value)}
              className={inputClass}
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className={labelClass}>Notes (optional)</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Brief description of the work"
          className={inputClass}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-sand"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-stone-900 disabled:opacity-50"
        >
          {submitting ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
