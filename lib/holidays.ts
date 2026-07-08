// Domain logic for the Mapa de Férias: expanding vacation ranges into
// per-day occupancy, detecting overlaps and minimum-staff conflicts.

import { dateKey, eachDayInclusive, isWeekend, toUtcMidnight } from "./dates";
import type {
  VacationCategory,
  VacationStatus,
  VacationType,
} from "./constants";

export interface VacationLike {
  id: string;
  employeeId: string;
  startDate: string | Date;
  endDate: string | Date;
  type: string; // VacationType
  category: string; // VacationCategory
  status: string; // VacationStatus
  employee: {
    id: string;
    name: string;
    color: string;
  };
}

/** One employee's presence on a single day. */
export interface DaySegment {
  vacationId: string;
  employeeId: string;
  name: string;
  color: string;
  type: VacationType;
  category: VacationCategory;
  status: VacationStatus;
}

export type Occupancy = Map<string, DaySegment[]>;

/**
 * Expand a list of vacations into a Map keyed by YYYY-MM-DD, where each entry
 * is the list of employees on holiday that day. This is the backbone of the
 * split-cell rendering — a day with N segments is drawn as N colour bands.
 *
 * By default only APPROVED vacations count; pass includePending to also surface
 * pending requests (rendered with a hatched/faded style in the grid).
 */
export function buildOccupancy(
  vacations: VacationLike[],
  opts: { includePending?: boolean; includeWeekends?: boolean } = {}
): Occupancy {
  const { includePending = true, includeWeekends = true } = opts;
  const map: Occupancy = new Map();

  for (const v of vacations) {
    if (v.status === "REJECTED") continue;
    if (!includePending && v.status !== "APPROVED") continue;

    const days = eachDayInclusive(new Date(v.startDate), new Date(v.endDate));
    for (const day of days) {
      if (!includeWeekends && isWeekend(day)) continue;
      const key = dateKey(day);
      const seg: DaySegment = {
        vacationId: v.id,
        employeeId: v.employeeId,
        name: v.employee.name,
        color: v.employee.color,
        type: v.type as VacationType,
        category: v.category as VacationCategory,
        status: v.status as VacationStatus,
      };
      const existing = map.get(key);
      if (existing) existing.push(seg);
      else map.set(key, [seg]);
    }
  }

  // Keep segments in a stable order (by employee name) for consistent bands.
  for (const segs of Array.from(map.values())) {
    segs.sort((a: DaySegment, b: DaySegment) =>
      a.name.localeCompare(b.name, "pt")
    );
  }

  return map;
}

/** Segments for one day (empty array if none). */
export function segmentsForDay(occ: Occupancy, key: string): DaySegment[] {
  return occ.get(key) ?? [];
}

export interface ConflictDay {
  dateKey: string;
  date: Date;
  absentCount: number; // approved absences that day
  presentCount: number;
  names: string[];
}

/**
 * Days where the number of present staff drops below the minimum-staff rule.
 * Only APPROVED, non-weekend days are considered. `absentCount` counts distinct
 * employees; half-days still count as absent for a conservative estimate.
 */
export function detectStaffConflicts(
  vacations: VacationLike[],
  totalActiveEmployees: number,
  minStaffPerDay: number
): ConflictDay[] {
  const approved = vacations.filter((v) => v.status === "APPROVED");
  const occ = buildOccupancy(approved, {
    includePending: false,
    includeWeekends: false,
  });

  const conflicts: ConflictDay[] = [];
  for (const [key, segs] of Array.from(occ.entries())) {
    // distinct employees absent that day
    const distinct = new Set(segs.map((s: DaySegment) => s.employeeId));
    const absentCount = distinct.size;
    const presentCount = totalActiveEmployees - absentCount;
    if (presentCount < minStaffPerDay) {
      const names = Array.from(
        new Map(
          segs.map((s: DaySegment) => [s.employeeId, s.name] as const)
        ).values()
      );
      conflicts.push({
        dateKey: key,
        date: toUtcMidnight(new Date(key)),
        absentCount,
        presentCount,
        names,
      });
    }
  }
  conflicts.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  return conflicts;
}

/**
 * Whether a new/edited vacation would push any day below the minimum-staff
 * rule. Used before approval to warn the manager.
 */
export function wouldBreachMinStaff(
  existingApproved: VacationLike[],
  candidate: VacationLike,
  totalActiveEmployees: number,
  minStaffPerDay: number
): ConflictDay[] {
  const all = [...existingApproved, { ...candidate, status: "APPROVED" }];
  return detectStaffConflicts(all, totalActiveEmployees, minStaffPerDay);
}

/** Whether an employee already has an approved vacation on a given date. */
export function isEmployeeOnHoliday(
  vacations: VacationLike[],
  employeeId: string,
  date: Date
): boolean {
  const occ = buildOccupancy(
    vacations.filter((v) => v.status === "APPROVED"),
    { includePending: false }
  );
  const segs = occ.get(dateKey(date)) ?? [];
  return segs.some((s) => s.employeeId === employeeId);
}
