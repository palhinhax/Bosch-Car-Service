"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { roleCanApprove, roleCanManageFrontDesk } from "@/lib/auth/session";
import { parseDateKey } from "@/lib/dates";
import { isEmployeeOnHoliday, type VacationLike } from "@/lib/holidays";
import {
  appointmentSchema,
  customerSchema,
  employeeSchema,
  settingsSchema,
  taskSchema,
  vacationSchema,
  vehicleSchema,
  type AppointmentInput,
  type CustomerInput,
  type EmployeeInput,
  type SettingsInput,
  type TaskInput,
  type VacationInput,
  type VehicleInput,
} from "@/lib/schemas";

export type ActionResult = { ok: true } | { ok: false; error: string };

const ok: ActionResult = { ok: true };
const fail = (error: string): ActionResult => ({ ok: false, error });

function revalidateAll() {
  // Cheap, and keeps every view consistent after a mutation.
  revalidatePath("/dashboard", "layout");
}

async function requireManager() {
  const user = await getCurrentUser();
  if (!user || !roleCanApprove(user.role)) {
    throw new Error("Sem permissões (apenas Gestor/Administrador).");
  }
  return user;
}

async function requireFrontDesk() {
  const user = await getCurrentUser();
  if (!user || !roleCanManageFrontDesk(user.role)) {
    throw new Error("Sem permissões.");
  }
  return user;
}

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    throw new Error("Sem permissões (apenas Administrador).");
  }
  return user;
}

function num(v: unknown): number | null {
  if (v === "" || v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------------------
// Colaboradores (== utilizadores)
// Basic fields: Gestor/Admin. Role + password: Admin only.
// ---------------------------------------------------------------------------
function friendlyEmployeeError(e: unknown): string {
  const msg = (e as Error).message;
  if (msg.includes("Unique constraint") && msg.toLowerCase().includes("email")) {
    return "Já existe um colaborador com esse email.";
  }
  return msg;
}

async function countAdmins(excludeId?: string): Promise<number> {
  return prisma.employee.count({
    where: { role: "ADMIN", ...(excludeId ? { id: { not: excludeId } } : {}) },
  });
}

export async function createEmployee(
  input: EmployeeInput
): Promise<ActionResult> {
  try {
    const actor = await requireManager();
    const data = employeeSchema.parse(input);
    const isAdmin = actor.role === "ADMIN";

    await prisma.employee.create({
      data: {
        name: data.name,
        jobRole: data.jobRole,
        department: data.department,
        color: data.color,
        email: data.email,
        phone: data.phone || null,
        active: data.active,
        annualVacationDays: data.annualVacationDays,
        // Only an admin may grant a privileged role or set a password.
        role: isAdmin ? data.role : "EMPLOYEE",
        passwordHash:
          isAdmin && data.password
            ? await bcrypt.hash(data.password, 12)
            : null,
      },
    });
    revalidateAll();
    return ok;
  } catch (e) {
    return fail(friendlyEmployeeError(e));
  }
}

export async function updateEmployee(
  id: string,
  input: EmployeeInput
): Promise<ActionResult> {
  try {
    const actor = await requireManager();
    const data = employeeSchema.parse(input);
    const isAdmin = actor.role === "ADMIN";

    // Guard: never demote the last remaining administrator.
    if (isAdmin && data.role !== "ADMIN") {
      const target = await prisma.employee.findUnique({ where: { id } });
      if (target?.role === "ADMIN" && (await countAdmins(id)) === 0) {
        return fail("Tem de existir pelo menos um Administrador.");
      }
    }

    await prisma.employee.update({
      where: { id },
      data: {
        name: data.name,
        jobRole: data.jobRole,
        department: data.department,
        color: data.color,
        email: data.email,
        phone: data.phone || null,
        active: data.active,
        annualVacationDays: data.annualVacationDays,
        // Role and password are admin-only; managers leave them untouched.
        ...(isAdmin ? { role: data.role } : {}),
        ...(isAdmin && data.password
          ? { passwordHash: await bcrypt.hash(data.password, 12) }
          : {}),
      },
    });
    revalidateAll();
    return ok;
  } catch (e) {
    return fail(friendlyEmployeeError(e));
  }
}

/** Admin-only quick password reset for a colleague who lost theirs. */
export async function setEmployeePassword(
  id: string,
  password: string
): Promise<ActionResult> {
  try {
    await requireAdmin();
    if (!password || password.length < 6) {
      return fail("A palavra-passe deve ter pelo menos 6 caracteres.");
    }
    await prisma.employee.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(password, 12) },
    });
    revalidateAll();
    return ok;
  } catch (e) {
    return fail((e as Error).message);
  }
}

export async function deleteEmployee(id: string): Promise<ActionResult> {
  try {
    const actor = await requireManager();
    if (actor.id === id) return fail("Não pode eliminar a sua própria conta.");
    const target = await prisma.employee.findUnique({ where: { id } });
    if (target?.role === "ADMIN" && (await countAdmins(id)) === 0) {
      return fail("Tem de existir pelo menos um Administrador.");
    }
    await prisma.employee.delete({ where: { id } });
    revalidateAll();
    return ok;
  } catch (e) {
    return fail(friendlyEmployeeError(e));
  }
}

// ---------------------------------------------------------------------------
// Férias
// ---------------------------------------------------------------------------
export async function createVacation(
  input: VacationInput
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sessão inválida.");
    const data = vacationSchema.parse(input);

    // Employees may only request for themselves and never self-approve.
    const isManager = roleCanApprove(user.role);
    if (!isManager) {
      if (user.employeeId && data.employeeId !== user.employeeId) {
        return fail("Só pode pedir férias para si próprio.");
      }
    }

    await prisma.vacation.create({
      data: {
        employeeId: data.employeeId,
        startDate: parseDateKey(data.startDate),
        endDate: parseDateKey(data.endDate),
        type: data.type,
        category: data.category,
        notes: data.notes || null,
        // Managers can create already-approved entries; others stay PENDING.
        status: isManager ? data.status : "PENDING",
        approvedById: isManager && data.status === "APPROVED" ? user.id : null,
      },
    });
    revalidateAll();
    return ok;
  } catch (e) {
    return fail((e as Error).message);
  }
}

export async function updateVacation(
  id: string,
  input: VacationInput
): Promise<ActionResult> {
  try {
    await requireManager();
    const data = vacationSchema.parse(input);
    await prisma.vacation.update({
      where: { id },
      data: {
        employeeId: data.employeeId,
        startDate: parseDateKey(data.startDate),
        endDate: parseDateKey(data.endDate),
        type: data.type,
        category: data.category,
        status: data.status,
        notes: data.notes || null,
      },
    });
    revalidateAll();
    return ok;
  } catch (e) {
    return fail((e as Error).message);
  }
}

export async function setVacationStatus(
  id: string,
  status: "APPROVED" | "REJECTED" | "PENDING"
): Promise<ActionResult> {
  try {
    const user = await requireManager();
    await prisma.vacation.update({
      where: { id },
      data: {
        status,
        approvedById: status === "APPROVED" ? user.id : null,
      },
    });
    revalidateAll();
    return ok;
  } catch (e) {
    return fail((e as Error).message);
  }
}

export async function deleteVacation(id: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sessão inválida.");
    const vac = await prisma.vacation.findUnique({ where: { id } });
    if (!vac) return fail("Registo não encontrado.");
    // Managers can delete anything; an employee can cancel own pending request.
    const isManager = roleCanApprove(user.role);
    const ownPending =
      vac.status === "PENDING" && vac.employeeId === user.employeeId;
    if (!isManager && !ownPending) return fail("Sem permissões.");
    await prisma.vacation.delete({ where: { id } });
    revalidateAll();
    return ok;
  } catch (e) {
    return fail((e as Error).message);
  }
}

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------
export async function createCustomer(
  input: CustomerInput
): Promise<ActionResult> {
  try {
    await requireFrontDesk();
    const data = customerSchema.parse(input);
    await prisma.customer.create({
      data: { ...data, email: data.email || null },
    });
    revalidateAll();
    return ok;
  } catch (e) {
    return fail((e as Error).message);
  }
}

export async function updateCustomer(
  id: string,
  input: CustomerInput
): Promise<ActionResult> {
  try {
    await requireFrontDesk();
    const data = customerSchema.parse(input);
    await prisma.customer.update({
      where: { id },
      data: { ...data, email: data.email || null },
    });
    revalidateAll();
    return ok;
  } catch (e) {
    return fail((e as Error).message);
  }
}

export async function deleteCustomer(id: string): Promise<ActionResult> {
  try {
    await requireFrontDesk();
    await prisma.customer.delete({ where: { id } });
    revalidateAll();
    return ok;
  } catch (e) {
    return fail((e as Error).message);
  }
}

// ---------------------------------------------------------------------------
// Veículos
// ---------------------------------------------------------------------------
export async function createVehicle(
  input: VehicleInput
): Promise<ActionResult> {
  try {
    await requireFrontDesk();
    const data = vehicleSchema.parse(input);
    await prisma.vehicle.create({
      data: {
        customerId: data.customerId,
        plateNumber: data.plateNumber.toUpperCase(),
        brand: data.brand,
        model: data.model,
        year: num(data.year),
        mileage: num(data.mileage),
        vin: data.vin || null,
        notes: data.notes || null,
      },
    });
    revalidateAll();
    return ok;
  } catch (e) {
    return fail((e as Error).message);
  }
}

export async function updateVehicle(
  id: string,
  input: VehicleInput
): Promise<ActionResult> {
  try {
    await requireFrontDesk();
    const data = vehicleSchema.parse(input);
    await prisma.vehicle.update({
      where: { id },
      data: {
        customerId: data.customerId,
        plateNumber: data.plateNumber.toUpperCase(),
        brand: data.brand,
        model: data.model,
        year: num(data.year),
        mileage: num(data.mileage),
        vin: data.vin || null,
        notes: data.notes || null,
      },
    });
    revalidateAll();
    return ok;
  } catch (e) {
    return fail((e as Error).message);
  }
}

export async function deleteVehicle(id: string): Promise<ActionResult> {
  try {
    await requireFrontDesk();
    await prisma.vehicle.delete({ where: { id } });
    revalidateAll();
    return ok;
  } catch (e) {
    return fail((e as Error).message);
  }
}

// ---------------------------------------------------------------------------
// Marcações
// ---------------------------------------------------------------------------
async function assertMechanicAvailable(
  assignedEmployeeId: string | undefined,
  dateKeyStr: string
): Promise<string | null> {
  if (!assignedEmployeeId) return null;
  const date = parseDateKey(dateKeyStr);
  const rows = await prisma.vacation.findMany({
    where: { employeeId: assignedEmployeeId, status: "APPROVED" },
    include: { employee: { select: { id: true, name: true, color: true } } },
  });
  const on = isEmployeeOnHoliday(
    rows as unknown as VacationLike[],
    assignedEmployeeId,
    date
  );
  if (on) {
    const name = rows[0]?.employee.name ?? "O colaborador";
    return `${name} está de férias nessa data. Escolha outro mecânico ou data.`;
  }
  return null;
}

export async function createAppointment(
  input: AppointmentInput
): Promise<ActionResult> {
  try {
    await requireFrontDesk();
    const data = appointmentSchema.parse(input);
    const conflict = await assertMechanicAvailable(
      data.assignedEmployeeId || undefined,
      data.date
    );
    if (conflict) return fail(conflict);
    await prisma.appointment.create({
      data: {
        customerId: data.customerId,
        vehicleId: data.vehicleId,
        assignedEmployeeId: data.assignedEmployeeId || null,
        date: parseDateKey(data.date),
        startTime: data.startTime,
        endTime: data.endTime,
        serviceType: data.serviceType,
        status: data.status,
        notes: data.notes || null,
      },
    });
    revalidateAll();
    return ok;
  } catch (e) {
    return fail((e as Error).message);
  }
}

export async function updateAppointment(
  id: string,
  input: AppointmentInput
): Promise<ActionResult> {
  try {
    await requireFrontDesk();
    const data = appointmentSchema.parse(input);
    const conflict = await assertMechanicAvailable(
      data.assignedEmployeeId || undefined,
      data.date
    );
    if (conflict) return fail(conflict);
    await prisma.appointment.update({
      where: { id },
      data: {
        customerId: data.customerId,
        vehicleId: data.vehicleId,
        assignedEmployeeId: data.assignedEmployeeId || null,
        date: parseDateKey(data.date),
        startTime: data.startTime,
        endTime: data.endTime,
        serviceType: data.serviceType,
        status: data.status,
        notes: data.notes || null,
      },
    });
    revalidateAll();
    return ok;
  } catch (e) {
    return fail((e as Error).message);
  }
}

export async function deleteAppointment(id: string): Promise<ActionResult> {
  try {
    await requireFrontDesk();
    await prisma.appointment.delete({ where: { id } });
    revalidateAll();
    return ok;
  } catch (e) {
    return fail((e as Error).message);
  }
}

// ---------------------------------------------------------------------------
// Tarefas
// ---------------------------------------------------------------------------
export async function createTask(input: TaskInput): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sessão inválida.");
    const data = taskSchema.parse(input);
    await prisma.task.create({
      data: {
        title: data.title,
        description: data.description || null,
        assignedEmployeeId: data.assignedEmployeeId || null,
        relatedVehicleId: data.relatedVehicleId || null,
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate ? parseDateKey(data.dueDate) : null,
      },
    });
    revalidateAll();
    return ok;
  } catch (e) {
    return fail((e as Error).message);
  }
}

export async function updateTask(
  id: string,
  input: TaskInput
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sessão inválida.");
    const data = taskSchema.parse(input);
    await prisma.task.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description || null,
        assignedEmployeeId: data.assignedEmployeeId || null,
        relatedVehicleId: data.relatedVehicleId || null,
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate ? parseDateKey(data.dueDate) : null,
      },
    });
    revalidateAll();
    return ok;
  } catch (e) {
    return fail((e as Error).message);
  }
}

export async function setTaskStatus(
  id: string,
  status: "TODO" | "IN_PROGRESS" | "DONE"
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sessão inválida.");
    await prisma.task.update({ where: { id }, data: { status } });
    revalidateAll();
    return ok;
  } catch (e) {
    return fail((e as Error).message);
  }
}

export async function deleteTask(id: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sessão inválida.");
    await prisma.task.delete({ where: { id } });
    revalidateAll();
    return ok;
  } catch (e) {
    return fail((e as Error).message);
  }
}

// ---------------------------------------------------------------------------
// Definições
// ---------------------------------------------------------------------------
export async function updateSettings(
  input: SettingsInput
): Promise<ActionResult> {
  try {
    await requireManager();
    const data = settingsSchema.parse(input);
    await prisma.workshopSettings.upsert({
      where: { id: "default" },
      update: data,
      create: { id: "default", ...data },
    });
    revalidateAll();
    return ok;
  } catch (e) {
    return fail((e as Error).message);
  }
}

// ---------------------------------------------------------------------------
// Utilizadores / perfis (apenas Administrador)
// ---------------------------------------------------------------------------
async function countAdmins(excludeId?: string): Promise<number> {
  return prisma.user.count({
    where: { role: "ADMIN", ...(excludeId ? { id: { not: excludeId } } : {}) },
  });
}

export async function createUser(input: UserInput): Promise<ActionResult> {
  try {
    await requireAdmin();
    const data = userSchema.parse(input);
    if (!data.password || data.password.length < 6) {
      return fail("Defina uma palavra-passe (mínimo 6 caracteres).");
    }
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) return fail("Já existe um utilizador com esse email.");

    await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        passwordHash: await bcrypt.hash(data.password, 12),
        employeeId: data.employeeId || null,
      },
    });
    revalidateAll();
    return ok;
  } catch (e) {
    return fail(friendlyUserError(e));
  }
}

export async function updateUser(
  id: string,
  input: UserInput
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const data = userSchema.parse(input);

    // Never leave the workshop without an administrator.
    if (data.role !== "ADMIN") {
      const target = await prisma.user.findUnique({ where: { id } });
      if (target?.role === "ADMIN" && (await countAdmins(id)) === 0) {
        return fail("Tem de existir pelo menos um Administrador.");
      }
    }

    await prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        employeeId: data.employeeId || null,
        // Only rotate the password when a new one is supplied.
        ...(data.password && data.password.length >= 6
          ? { passwordHash: await bcrypt.hash(data.password, 12) }
          : {}),
      },
    });
    revalidateAll();
    return ok;
  } catch (e) {
    return fail(friendlyUserError(e));
  }
}

export async function deleteUser(id: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    if (admin.id === id) return fail("Não pode eliminar a sua própria conta.");
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return fail("Utilizador não encontrado.");
    if (target.role === "ADMIN" && (await countAdmins(id)) === 0) {
      return fail("Tem de existir pelo menos um Administrador.");
    }
    await prisma.user.delete({ where: { id } });
    revalidateAll();
    return ok;
  } catch (e) {
    return fail(friendlyUserError(e));
  }
}

function friendlyUserError(e: unknown): string {
  const msg = (e as Error).message;
  // Prisma unique-constraint on the 1-to-1 employee link.
  if (msg.includes("Unique constraint") && msg.includes("employeeId")) {
    return "Esse colaborador já está associado a outro utilizador.";
  }
  if (msg.includes("Unique constraint") && msg.includes("email")) {
    return "Já existe um utilizador com esse email.";
  }
  return msg;
}
