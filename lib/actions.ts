"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { putObject, deleteObject } from "@/lib/storage";
import { getCurrentUser } from "@/lib/auth/session";
import { roleCanApprove, roleCanManageFrontDesk } from "@/lib/auth/session";
import { parseDateKey } from "@/lib/dates";
import { isEmployeeOnHoliday, type VacationLike } from "@/lib/holidays";
import {
  appointmentSchema,
  customerSchema,
  employeeSchema,
  myProfileSchema,
  settingsSchema,
  taskSchema,
  vacationSchema,
  vehicleSchema,
  type AppointmentInput,
  type CustomerInput,
  type EmployeeInput,
  type MyProfileInput,
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
  if (
    msg.includes("Unique constraint") &&
    msg.toLowerCase().includes("email")
  ) {
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

/**
 * Self-service password change — any logged-in user changing THEIR OWN password.
 * Requires the current password. Never touches other accounts.
 */
export async function changeOwnPassword(
  currentPassword: string,
  newPassword: string
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sessão inválida.");
    if (!newPassword || newPassword.length < 6) {
      return fail("A nova palavra-passe deve ter pelo menos 6 caracteres.");
    }
    const me = await prisma.employee.findUnique({ where: { id: user.id } });
    if (!me || !me.passwordHash) {
      return fail(
        "A sua conta não tem palavra-passe definida. Contacte o administrador."
      );
    }
    const match = await bcrypt.compare(currentPassword, me.passwordHash);
    if (!match) return fail("A palavra-passe atual está incorreta.");

    await prisma.employee.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(newPassword, 12) },
    });
    return ok;
  } catch (e) {
    return fail((e as Error).message);
  }
}

/** Self-service: the signed-in colaborador updates their own personal profile. */
export async function updateMyProfile(
  input: MyProfileInput
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sessão inválida.");
    const data = myProfileSchema.parse(input);
    await prisma.employee.update({
      where: { id: user.id },
      data: {
        phone: data.phone?.trim() || null,
        personalEmail: data.personalEmail?.trim() || null,
        address: data.address?.trim() || null,
        birthDate: data.birthDate ? parseDateKey(data.birthDate) : null,
        emergencyContactName: data.emergencyContactName?.trim() || null,
        emergencyContactRelation: data.emergencyContactRelation?.trim() || null,
        emergencyContactPhone: data.emergencyContactPhone?.trim() || null,
      },
    });
    revalidateAll();
    return ok;
  } catch (e) {
    return fail((e as Error).message);
  }
}

// ---------------------------------------------------------------------------
// Foto de perfil (Backblaze B2). Self-service: cada colaborador gere a sua.
// ---------------------------------------------------------------------------
const AVATAR_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const AVATAR_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function uploadMyAvatar(
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sessão inválida.");

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return fail("Nenhum ficheiro selecionado.");
    }
    const ext = AVATAR_TYPES[file.type];
    if (!ext) return fail("Formato inválido. Use JPG, PNG ou WebP.");
    if (file.size > AVATAR_MAX_BYTES) {
      return fail("A imagem é demasiado grande (máximo 5 MB).");
    }

    // Random suffix so the object key changes on every upload — this doubles as
    // a cache-buster for the <img> URL and lets us delete the previous file.
    const key = `avatars/${user.id}-${randomUUID()}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    await putObject(key, bytes, file.type);

    const me = await prisma.employee.findUnique({
      where: { id: user.id },
      select: { avatarKey: true },
    });
    await prisma.employee.update({
      where: { id: user.id },
      data: { avatarKey: key },
    });
    if (me?.avatarKey && me.avatarKey !== key) {
      try {
        await deleteObject(me.avatarKey);
      } catch {
        // Orphaned object is harmless — ignore cleanup failures.
      }
    }
    revalidateAll();
    return ok;
  } catch (e) {
    return fail((e as Error).message);
  }
}

export async function removeMyAvatar(): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sessão inválida.");
    const me = await prisma.employee.findUnique({
      where: { id: user.id },
      select: { avatarKey: true },
    });
    await prisma.employee.update({
      where: { id: user.id },
      data: { avatarKey: null },
    });
    if (me?.avatarKey) {
      try {
        await deleteObject(me.avatarKey);
      } catch {
        // ignore
      }
    }
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
