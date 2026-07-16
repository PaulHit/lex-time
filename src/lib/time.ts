export function minutesBetween(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let diff = eh * 60 + em - (sh * 60 + sm);
  if (diff <= 0) diff += 24 * 60; // treat as crossing midnight
  return diff;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatHoursDecimal(minutes: number): string {
  return (minutes / 60).toFixed(2);
}

/**
 * Formats a date as YYYY-MM-DD from its *local* calendar fields.
 *
 * Deliberately avoids toISOString(), which converts to UTC first and so
 * reports the wrong day for anyone whose offset pushes local midnight over
 * the date boundary.
 */
export function toISODate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function rangeToDates(
  range: "all" | "today" | "week" | "month",
): { from?: string; to?: string } {
  if (range === "all") return {};
  const now = new Date();
  const to = toISODate(now);

  if (range === "today") return { from: to, to };

  if (range === "week") {
    const day = now.getDay(); // 0 = Sunday
    const diffToMonday = day === 0 ? 6 : day - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);
    return { from: toISODate(monday), to };
  }

  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: toISODate(firstOfMonth), to };
}

export function formatDateLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
