import { prisma } from "@/lib/prisma";
import { utcDate } from "@/lib/dates";
import type { VacationLike } from "@/lib/holidays";

export async function getSettings() {
  const existing = await prisma.workshopSettings.findUnique({
    where: { id: "default" },
  });
  if (existing) return existing;
  return prisma.workshopSettings.create({ data: { id: "default" } });
}

export function listEmployees(opts: { onlyActive?: boolean } = {}) {
  return prisma.employee.findMany({
    where: opts.onlyActive ? { active: true } : undefined,
    orderBy: { name: "asc" },
  });
}

/** The signed-in user's own editable profile fields. */
export function getMyProfile(id: string) {
  return prisma.employee.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      color: true,
      avatarKey: true,
      phone: true,
      personalEmail: true,
      address: true,
      birthDate: true,
      emergencyContactName: true,
      emergencyContactRelation: true,
      emergencyContactPhone: true,
    },
  });
}

export function getEmployee(id: string) {
  return prisma.employee.findUnique({
    where: { id },
    include: {
      vacations: { orderBy: { startDate: "asc" } },
    },
  });
}

/** Vacations for a given year (any range that intersects the year). */
export async function listVacations(year: number): Promise<VacationLike[]> {
  const from = utcDate(year, 0, 1);
  const to = utcDate(year, 11, 31);
  const rows = await prisma.vacation.findMany({
    where: {
      startDate: { lte: to },
      endDate: { gte: from },
    },
    include: {
      employee: { select: { id: true, name: true, color: true } },
    },
    orderBy: { startDate: "asc" },
  });
  return rows.map((r) => ({
    ...r,
    startDate: r.startDate,
    endDate: r.endDate,
  })) as unknown as VacationLike[];
}

/** All vacations (for a specific employee, e.g. self-service view). */
export function listVacationsForEmployee(employeeId: string) {
  return prisma.vacation.findMany({
    where: { employeeId },
    include: { employee: { select: { id: true, name: true, color: true } } },
    orderBy: { startDate: "desc" },
  });
}

export function listPendingVacations() {
  return prisma.vacation.findMany({
    where: { status: "PENDING" },
    include: { employee: { select: { id: true, name: true, color: true } } },
    orderBy: { startDate: "asc" },
  });
}

export function listCustomers() {
  return prisma.customer.findMany({
    include: { vehicles: true, _count: { select: { appointments: true } } },
    orderBy: { name: "asc" },
  });
}

export function listVehicles() {
  return prisma.vehicle.findMany({
    include: { customer: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export function listAppointments(range?: { from: Date; to: Date }) {
  return prisma.appointment.findMany({
    where: range ? { date: { gte: range.from, lte: range.to } } : undefined,
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      vehicle: {
        select: { id: true, plateNumber: true, brand: true, model: true },
      },
      assignedEmployee: { select: { id: true, name: true, color: true } },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
}

export function listTasks() {
  return prisma.task.findMany({
    include: {
      assignedEmployee: { select: { id: true, name: true, color: true } },
      relatedVehicle: { select: { id: true, plateNumber: true } },
    },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
  });
}
