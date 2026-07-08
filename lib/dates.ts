// Date helpers using UTC-only semantics so "date-only" values never drift
// across timezones. All vacation dates are stored at 00:00 UTC.

import { MONTHS_PT } from "./constants";

/** Build a UTC date at midnight from year/month(0-based)/day. */
export function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day));
}

/** Normalise any Date to midnight UTC (strips the time component). */
export function toUtcMidnight(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
}

/** Stable YYYY-MM-DD key for a date (UTC). */
export function dateKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse a YYYY-MM-DD string into a UTC-midnight Date. */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return utcDate(y, m - 1, d);
}

/** Number of days in a given month (0-based month). */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/** Weekday index 0=Sunday..6=Saturday (UTC). */
export function weekdayIndex(d: Date): number {
  return d.getUTCDay();
}

/** Portuguese-style short date, e.g. 03/08/2026. */
export function formatDatePT(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getUTCFullYear()}`;
}

/** Long Portuguese date, e.g. 3 de Agosto de 2026. */
export function formatLongPT(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${date.getUTCDate()} de ${MONTHS_PT[date.getUTCMonth()]} de ${date.getUTCFullYear()}`;
}

/** Inclusive list of UTC-midnight dates between start and end. */
export function eachDayInclusive(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cur = toUtcMidnight(start);
  const last = toUtcMidnight(end);
  while (cur.getTime() <= last.getTime()) {
    days.push(new Date(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

/** Whether a date is a weekend (Sat/Sun). */
export function isWeekend(d: Date): boolean {
  const wd = d.getUTCDay();
  return wd === 0 || wd === 6;
}

/** Count working days (Mon-Fri) in an inclusive range. */
export function countWorkingDays(start: Date, end: Date): number {
  return eachDayInclusive(start, end).filter((d) => !isWeekend(d)).length;
}

/** Add days to a date (UTC). */
export function addDays(d: Date, n: number): Date {
  const r = toUtcMidnight(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

/** Whether two inclusive date ranges overlap. */
export function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): boolean {
  return (
    toUtcMidnight(aStart).getTime() <= toUtcMidnight(bEnd).getTime() &&
    toUtcMidnight(bStart).getTime() <= toUtcMidnight(aEnd).getTime()
  );
}
