import { describe, it, expect } from "vitest";
import {
  formatDateLabel,
  formatDuration,
  formatHoursDecimal,
  minutesBetween,
  rangeToDates,
  todayISO,
} from "@/lib/time";

describe("minutesBetween", () => {
  it("measures a normal span", () => {
    expect(minutesBetween("09:00", "11:30")).toBe(150);
    expect(minutesBetween("14:30", "17:00")).toBe(150);
  });

  it("handles minute-level precision", () => {
    expect(minutesBetween("09:00", "09:06")).toBe(6);
    expect(minutesBetween("11:15", "15:00")).toBe(225);
  });

  it("treats a backwards span as crossing midnight", () => {
    expect(minutesBetween("23:00", "01:00")).toBe(120);
  });

  it("treats an identical start and end as a full day", () => {
    expect(minutesBetween("09:00", "09:00")).toBe(24 * 60);
  });
});

describe("formatDuration", () => {
  it("formats minutes under an hour", () => {
    expect(formatDuration(6)).toBe("6m");
    expect(formatDuration(45)).toBe("45m");
  });

  it("drops the minutes on a whole hour", () => {
    expect(formatDuration(60)).toBe("1h");
    expect(formatDuration(180)).toBe("3h");
  });

  it("formats hours and minutes together", () => {
    expect(formatDuration(105)).toBe("1h 45m");
    expect(formatDuration(225)).toBe("3h 45m");
  });
});

describe("formatHoursDecimal", () => {
  it("renders billable-style decimal hours", () => {
    expect(formatHoursDecimal(90)).toBe("1.50");
    expect(formatHoursDecimal(6)).toBe("0.10");
    expect(formatHoursDecimal(0)).toBe("0.00");
  });
});

describe("todayISO", () => {
  it("returns the local date, not the UTC one", () => {
    // Guards a real bug: toISOString() would roll to the previous/next day
    // for anyone east or west of UTC at the edges of the day.
    const now = new Date();
    const expected = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");
    expect(todayISO()).toBe(expected);
  });
});

describe("rangeToDates", () => {
  it("returns no bounds for all time", () => {
    expect(rangeToDates("all")).toEqual({});
  });

  it("bounds today to a single day", () => {
    const { from, to } = rangeToDates("today");
    expect(from).toBe(todayISO());
    expect(to).toBe(todayISO());
  });

  it("starts the week on Monday and ends today", () => {
    const { from, to } = rangeToDates("week");
    expect(to).toBe(todayISO());
    expect(from! <= to!).toBe(true);
    const [y, m, d] = from!.split("-").map(Number);
    expect(new Date(y, m - 1, d).getDay()).toBe(1); // Monday
  });

  it("starts the month on the 1st and ends today", () => {
    const { from, to } = rangeToDates("month");
    expect(from!.endsWith("-01")).toBe(true);
    expect(to).toBe(todayISO());
  });
});

describe("formatDateLabel", () => {
  it("renders an ISO date without shifting the day", () => {
    // Parsed as local parts rather than UTC, so the day never slips.
    expect(formatDateLabel("2026-07-16")).toContain("16");
    expect(formatDateLabel("2026-07-16")).toContain("2026");
  });
});
