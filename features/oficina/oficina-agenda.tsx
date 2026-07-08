"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { AppointmentStatusBadge } from "@/components/status-badge";
import {
  SERVICE_TYPES,
  SERVICE_TYPE_LABELS,
  APPOINTMENT_STATUS,
  APPOINTMENT_STATUS_LABELS,
  type ServiceType,
} from "@/lib/constants";
import { formatLongPT, addDays, dateKey, parseDateKey } from "@/lib/dates";
import { isEmployeeOnHoliday, type VacationLike } from "@/lib/holidays";
import {
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from "@/lib/actions";
import type { AppointmentInput } from "@/lib/schemas";

interface AppointmentRow {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  serviceType: string;
  status: string;
  notes: string | null;
  customer: { id: string; name: string; phone: string | null };
  vehicle: { id: string; plateNumber: string; brand: string; model: string };
  assignedEmployee: { id: string; name: string; color: string } | null;
}

interface CustomerWithVehicles {
  id: string;
  name: string;
  vehicles: { id: string; plateNumber: string; brand: string; model: string }[];
}

export function OficinaAgenda({
  appointments,
  customers,
  employees,
  approvedVacations,
  canManage,
  initialDate,
}: {
  appointments: AppointmentRow[];
  customers: CustomerWithVehicles[];
  employees: { id: string; name: string; color: string }[];
  approvedVacations: VacationLike[];
  canManage: boolean;
  initialDate: string;
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [day, setDay] = useState(initialDate);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const emptyForm = (): AppointmentInput => ({
    customerId: customers[0]?.id ?? "",
    vehicleId: customers[0]?.vehicles[0]?.id ?? "",
    assignedEmployeeId: "",
    date: day,
    startTime: "09:00",
    endTime: "10:00",
    serviceType: "GENERAL",
    status: "BOOKED",
    notes: "",
  });
  const [form, setForm] = useState<AppointmentInput>(emptyForm());

  const set = <K extends keyof AppointmentInput>(
    k: K,
    v: AppointmentInput[K]
  ) => setForm((f) => ({ ...f, [k]: v }));

  const dayAppointments = useMemo(
    () =>
      appointments
        .filter((a) => a.date.slice(0, 10) === day)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [appointments, day]
  );

  const selectedCustomer = customers.find((c) => c.id === form.customerId);
  const formDate = form.date;
  const mechanicOnHoliday = (empId: string) =>
    isEmployeeOnHoliday(approvedVacations, empId, parseDateKey(formDate));

  const shift = (delta: number) =>
    setDay(dateKey(addDays(parseDateKey(day), delta)));

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setOpen(true);
  };
  const openEdit = (a: AppointmentRow) => {
    setEditingId(a.id);
    setForm({
      customerId: a.customer.id,
      vehicleId: a.vehicle.id,
      assignedEmployeeId: a.assignedEmployee?.id ?? "",
      date: a.date.slice(0, 10),
      startTime: a.startTime,
      endTime: a.endTime,
      serviceType: a.serviceType as ServiceType,
      status: a.status as AppointmentInput["status"],
      notes: a.notes ?? "",
    });
    setOpen(true);
  };

  const submit = () =>
    startTransition(async () => {
      const res = editingId
        ? await updateAppointment(editingId, form)
        : await createAppointment(form);
      if (res.ok) {
        toast({ title: editingId ? "Marcação atualizada" : "Marcação criada" });
        setOpen(false);
      } else
        toast({
          title: "Erro",
          description: res.error,
          variant: "destructive",
        });
    });

  const remove = (id: string) => {
    if (!confirm("Eliminar esta marcação?")) return;
    startTransition(async () => {
      const res = await deleteAppointment(id);
      if (res.ok) toast({ title: "Marcação eliminada" });
      else
        toast({
          title: "Erro",
          description: res.error,
          variant: "destructive",
        });
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-md border bg-background">
          <Button variant="ghost" size="icon" onClick={() => shift(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="w-auto border-0 focus-visible:ring-0"
          />
          <Button variant="ghost" size="icon" onClick={() => shift(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <span className="hidden text-sm text-muted-foreground sm:inline">
          {formatLongPT(parseDateKey(day))}
        </span>
        {canManage && (
          <Button
            className="ml-auto"
            onClick={openCreate}
            disabled={customers.length === 0}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Nova marcação
          </Button>
        )}
      </div>
      {customers.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Crie clientes e veículos para poder registar marcações.
        </p>
      )}

      <div className="space-y-2">
        {dayAppointments.length === 0 && (
          <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
            Sem marcações neste dia.
          </div>
        )}
        {dayAppointments.map((a) => (
          <div
            key={a.id}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-card p-3"
          >
            <div className="font-mono text-sm font-semibold text-primary">
              {a.startTime}
              <span className="text-muted-foreground">–{a.endTime}</span>
            </div>
            <div className="min-w-0">
              <div className="font-medium">{a.customer.name}</div>
              <div className="text-xs text-muted-foreground">
                {a.vehicle.brand} {a.vehicle.model} · {a.vehicle.plateNumber}
                {a.customer.phone ? ` · ${a.customer.phone}` : ""}
              </div>
            </div>
            <span className="rounded border bg-muted/40 px-2 py-0.5 text-xs">
              {SERVICE_TYPE_LABELS[a.serviceType as ServiceType]}
            </span>
            {a.assignedEmployee && (
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <span
                  className="h-3 w-3 rounded-sm border"
                  style={{ backgroundColor: a.assignedEmployee.color }}
                />
                {a.assignedEmployee.name}
              </span>
            )}
            <div className="ml-auto flex items-center gap-2">
              <AppointmentStatusBadge status={a.status} />
              {canManage && (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => openEdit(a)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive"
                    onClick={() => remove(a.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar marcação" : "Nova marcação"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Cliente</Label>
                <Select
                  value={form.customerId}
                  onChange={(e) => {
                    const c = customers.find((x) => x.id === e.target.value);
                    setForm((f) => ({
                      ...f,
                      customerId: e.target.value,
                      vehicleId: c?.vehicles[0]?.id ?? "",
                    }));
                  }}
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Veículo</Label>
                <Select
                  value={form.vehicleId}
                  onChange={(e) => set("vehicleId", e.target.value)}
                >
                  {selectedCustomer?.vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plateNumber} — {v.brand} {v.model}
                    </option>
                  ))}
                  {selectedCustomer?.vehicles.length === 0 && (
                    <option value="">Sem veículos</option>
                  )}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => set("date", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Início</Label>
                <Input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => set("startTime", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Fim</Label>
                <Input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => set("endTime", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Serviço</Label>
                <Select
                  value={form.serviceType}
                  onChange={(e) =>
                    set("serviceType", e.target.value as ServiceType)
                  }
                >
                  {SERVICE_TYPES.map((s) => (
                    <option key={s} value={s}>
                      {SERVICE_TYPE_LABELS[s]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Estado</Label>
                <Select
                  value={form.status}
                  onChange={(e) =>
                    set("status", e.target.value as AppointmentInput["status"])
                  }
                >
                  {APPOINTMENT_STATUS.map((s) => (
                    <option key={s} value={s}>
                      {APPOINTMENT_STATUS_LABELS[s]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Mecânico</Label>
              <Select
                value={form.assignedEmployeeId}
                onChange={(e) => set("assignedEmployeeId", e.target.value)}
              >
                <option value="">— Sem atribuição —</option>
                {employees.map((emp) => {
                  const off = mechanicOnHoliday(emp.id);
                  return (
                    <option key={emp.id} value={emp.id} disabled={off}>
                      {emp.name}
                      {off ? " (de férias)" : ""}
                    </option>
                  );
                })}
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Observações</Label>
              <Textarea
                rows={2}
                value={form.notes ?? ""}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button onClick={submit} disabled={pending}>
              {pending && <Spinner size="sm" className="mr-2" />}
              {editingId ? "Guardar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
