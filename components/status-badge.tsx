import { Badge } from "@/components/ui/badge";
import {
  APPOINTMENT_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  VACATION_STATUS_LABELS,
  type AppointmentStatus,
  type TaskPriority,
  type TaskStatus,
  type VacationStatus,
} from "@/lib/constants";

type Variant = React.ComponentProps<typeof Badge>["variant"];

export function VacationStatusBadge({ status }: { status: string }) {
  const map: Record<VacationStatus, Variant> = {
    PENDING: "warning",
    APPROVED: "success",
    REJECTED: "danger",
  };
  const s = status as VacationStatus;
  return (
    <Badge variant={map[s] ?? "neutral"}>
      {VACATION_STATUS_LABELS[s] ?? status}
    </Badge>
  );
}

export function AppointmentStatusBadge({ status }: { status: string }) {
  const map: Record<AppointmentStatus, Variant> = {
    BOOKED: "info",
    IN_PROGRESS: "warning",
    WAITING_PARTS: "neutral",
    COMPLETED: "success",
    CANCELLED: "danger",
  };
  const s = status as AppointmentStatus;
  return (
    <Badge variant={map[s] ?? "neutral"}>
      {APPOINTMENT_STATUS_LABELS[s] ?? status}
    </Badge>
  );
}

export function TaskStatusBadge({ status }: { status: string }) {
  const map: Record<TaskStatus, Variant> = {
    TODO: "neutral",
    IN_PROGRESS: "warning",
    DONE: "success",
  };
  const s = status as TaskStatus;
  return (
    <Badge variant={map[s] ?? "neutral"}>
      {TASK_STATUS_LABELS[s] ?? status}
    </Badge>
  );
}

export function TaskPriorityBadge({ priority }: { priority: string }) {
  const map: Record<TaskPriority, Variant> = {
    LOW: "neutral",
    MEDIUM: "info",
    HIGH: "danger",
  };
  const p = priority as TaskPriority;
  return (
    <Badge variant={map[p] ?? "neutral"}>
      {TASK_PRIORITY_LABELS[p] ?? priority}
    </Badge>
  );
}
