import { z } from "zod";
import {
  APPOINTMENT_STATUS,
  ROLES,
  SERVICE_TYPES,
  TASK_PRIORITY,
  TASK_STATUS,
  VACATION_CATEGORIES,
  VACATION_STATUS,
  VACATION_TYPES,
} from "./constants";

const hex = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida (formato #RRGGBB)");

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");

export const employeeSchema = z.object({
  name: z.string().min(2, "Nome demasiado curto"),
  jobRole: z.string().min(1, "Função obrigatória").default("Mecânico"),
  department: z.string().min(1).default("Oficina"),
  color: hex,
  email: z.string().email("Email inválido").or(z.literal("")).optional(),
  phone: z.string().optional(),
  active: z.boolean().default(true),
  annualVacationDays: z.coerce.number().int().min(0).max(60).default(22),
});
export type EmployeeInput = z.infer<typeof employeeSchema>;

export const vacationSchema = z
  .object({
    employeeId: z.string().min(1, "Selecione um colaborador"),
    startDate: dateKey,
    endDate: dateKey,
    type: z.enum(VACATION_TYPES).default("FULL"),
    category: z.enum(VACATION_CATEGORIES).default("FERIAS"),
    status: z.enum(VACATION_STATUS).default("PENDING"),
    notes: z.string().optional(),
  })
  .refine((v) => v.startDate <= v.endDate, {
    message: "A data de fim não pode ser anterior à data de início",
    path: ["endDate"],
  });
export type VacationInput = z.infer<typeof vacationSchema>;

export const customerSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").or(z.literal("")).optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});
export type CustomerInput = z.infer<typeof customerSchema>;

export const vehicleSchema = z.object({
  customerId: z.string().min(1, "Selecione o cliente"),
  plateNumber: z.string().min(2, "Matrícula obrigatória"),
  brand: z.string().min(1, "Marca obrigatória"),
  model: z.string().min(1, "Modelo obrigatório"),
  // Accept string (from form inputs) or number; coerced to Int | null server-side.
  year: z.union([z.string(), z.number()]).optional(),
  mileage: z.union([z.string(), z.number()]).optional(),
  vin: z.string().optional(),
  notes: z.string().optional(),
});
export type VehicleInput = z.infer<typeof vehicleSchema>;

export const appointmentSchema = z.object({
  customerId: z.string().min(1, "Selecione o cliente"),
  vehicleId: z.string().min(1, "Selecione o veículo"),
  assignedEmployeeId: z.string().optional(),
  date: dateKey,
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Hora inválida")
    .default("09:00"),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Hora inválida")
    .default("10:00"),
  serviceType: z.enum(SERVICE_TYPES).default("GENERAL"),
  status: z.enum(APPOINTMENT_STATUS).default("BOOKED"),
  notes: z.string().optional(),
});
export type AppointmentInput = z.infer<typeof appointmentSchema>;

export const taskSchema = z.object({
  title: z.string().min(2, "Título obrigatório"),
  description: z.string().optional(),
  assignedEmployeeId: z.string().optional(),
  relatedVehicleId: z.string().optional(),
  status: z.enum(TASK_STATUS).default("TODO"),
  priority: z.enum(TASK_PRIORITY).default("MEDIUM"),
  dueDate: dateKey.optional().or(z.literal("")),
});
export type TaskInput = z.infer<typeof taskSchema>;

export const settingsSchema = z.object({
  name: z.string().min(2),
  minStaffPerDay: z.coerce.number().int().min(0).max(50),
  year: z.coerce.number().int().min(2020).max(2100),
});
export type SettingsInput = z.infer<typeof settingsSchema>;

export const userSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  email: z.string().email("Email inválido"),
  role: z.enum(ROLES).default("EMPLOYEE"),
  password: z.string().min(6, "Mínimo 6 caracteres").optional(),
  employeeId: z.string().optional(),
});
export type UserInput = z.infer<typeof userSchema>;
