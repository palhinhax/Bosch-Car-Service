// Central catalogue of value-sets used across the app.
// Kept as plain string unions (not Prisma enums) so the schema stays portable
// between SQLite and PostgreSQL. Portuguese labels live here too.

// ---------------------------------------------------------------------------
// Roles / access control
// ---------------------------------------------------------------------------
export const ROLES = ["ADMIN", "MANAGER", "RECEPTION", "EMPLOYEE"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrador",
  MANAGER: "Gestor",
  RECEPTION: "Receção",
  EMPLOYEE: "Colaborador",
};

// Roles allowed to approve vacations / manage staff
export const MANAGER_ROLES: Role[] = ["ADMIN", "MANAGER"];

// ---------------------------------------------------------------------------
// Vacation / absence
// ---------------------------------------------------------------------------
export const VACATION_STATUS = ["PENDING", "APPROVED", "REJECTED"] as const;
export type VacationStatus = (typeof VACATION_STATUS)[number];

export const VACATION_STATUS_LABELS: Record<VacationStatus, string> = {
  PENDING: "Pendente",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
};

export const VACATION_TYPES = ["FULL", "HALF_AM", "HALF_PM"] as const;
export type VacationType = (typeof VACATION_TYPES)[number];

export const VACATION_TYPE_LABELS: Record<VacationType, string> = {
  FULL: "Dia completo",
  HALF_AM: "Meio-dia (manhã)",
  HALF_PM: "Meio-dia (tarde)",
};

export const VACATION_CATEGORIES = [
  "FERIAS",
  "AUSENCIA",
  "BAIXA",
  "FORMACAO",
  "FERIADO",
] as const;
export type VacationCategory = (typeof VACATION_CATEGORIES)[number];

export const VACATION_CATEGORY_LABELS: Record<VacationCategory, string> = {
  FERIAS: "Férias",
  AUSENCIA: "Ausência",
  BAIXA: "Baixa médica",
  FORMACAO: "Formação",
  FERIADO: "Feriado",
};

// ---------------------------------------------------------------------------
// Appointments / oficina
// ---------------------------------------------------------------------------
export const SERVICE_TYPES = [
  "INSPECTION",
  "OIL_CHANGE",
  "BRAKES",
  "TYRES",
  "DIAGNOSTICS",
  "AC",
  "BATTERY",
  "GENERAL",
] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  INSPECTION: "Inspeção",
  OIL_CHANGE: "Mudança de óleo",
  BRAKES: "Travões",
  TYRES: "Pneus",
  DIAGNOSTICS: "Diagnóstico",
  AC: "Ar condicionado",
  BATTERY: "Bateria",
  GENERAL: "Reparação geral",
};

export const APPOINTMENT_STATUS = [
  "BOOKED",
  "IN_PROGRESS",
  "WAITING_PARTS",
  "COMPLETED",
  "CANCELLED",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUS)[number];

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  BOOKED: "Marcado",
  IN_PROGRESS: "Em curso",
  WAITING_PARTS: "Aguarda peças",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------
export const TASK_STATUS = ["TODO", "IN_PROGRESS", "DONE"] as const;
export type TaskStatus = (typeof TASK_STATUS)[number];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "Por fazer",
  IN_PROGRESS: "Em curso",
  DONE: "Concluída",
};

export const TASK_PRIORITY = ["LOW", "MEDIUM", "HIGH"] as const;
export type TaskPriority = (typeof TASK_PRIORITY)[number];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
};

// ---------------------------------------------------------------------------
// Suggested colour palette for new colaboradores (Mapa de Férias)
// Mirrors the traditional paper map's vivid colours.
// ---------------------------------------------------------------------------
export const EMPLOYEE_COLORS = [
  "#00e5ff", // ciano (Rodrigo)
  "#ff8ad8", // rosa (David)
  "#8de06a", // verde (Carlos)
  "#ffe500", // amarelo (Sandro)
  "#9b6ede", // roxo (Mauro)
  "#e2001a", // vermelho Bosch
  "#ff9800", // laranja
  "#3f7fff", // azul
  "#00b894", // verde-água
  "#c0392b", // bordô
];

// Portuguese month names
export const MONTHS_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

// Portuguese weekday initials (Domingo..Sábado) — matches the paper map header
export const WEEKDAY_INITIALS_PT = ["D", "S", "T", "Q", "Q", "S", "S"];
