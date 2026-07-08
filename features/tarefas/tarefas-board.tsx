"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, ArrowRight, Car } from "lucide-react";
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
import { TaskPriorityBadge } from "@/components/status-badge";
import {
  TASK_STATUS,
  TASK_STATUS_LABELS,
  TASK_PRIORITY,
  TASK_PRIORITY_LABELS,
  type TaskStatus,
} from "@/lib/constants";
import { formatDatePT } from "@/lib/dates";
import {
  createTask,
  updateTask,
  setTaskStatus,
  deleteTask,
} from "@/lib/actions";
import type { TaskInput } from "@/lib/schemas";

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  assignedEmployee: { id: string; name: string; color: string } | null;
  relatedVehicle: { id: string; plateNumber: string } | null;
}

const nextStatus: Record<string, TaskStatus | null> = {
  TODO: "IN_PROGRESS",
  IN_PROGRESS: "DONE",
  DONE: null,
};

export function TarefasBoard({
  tasks,
  employees,
  vehicles,
}: {
  tasks: TaskRow[];
  employees: { id: string; name: string }[];
  vehicles: { id: string; plateNumber: string }[];
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const empty: TaskInput = {
    title: "",
    description: "",
    assignedEmployeeId: "",
    relatedVehicleId: "",
    status: "TODO",
    priority: "MEDIUM",
    dueDate: "",
  };
  const [form, setForm] = useState<TaskInput>(empty);
  const set = <K extends keyof TaskInput>(k: K, v: TaskInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const openCreate = () => {
    setEditingId(null);
    setForm(empty);
    setOpen(true);
  };
  const openEdit = (t: TaskRow) => {
    setEditingId(t.id);
    setForm({
      title: t.title,
      description: t.description ?? "",
      assignedEmployeeId: t.assignedEmployee?.id ?? "",
      relatedVehicleId: t.relatedVehicle?.id ?? "",
      status: t.status as TaskStatus,
      priority: t.priority as TaskInput["priority"],
      dueDate: t.dueDate ? t.dueDate.slice(0, 10) : "",
    });
    setOpen(true);
  };

  const submit = () =>
    startTransition(async () => {
      const res = editingId
        ? await updateTask(editingId, form)
        : await createTask(form);
      if (res.ok) {
        toast({ title: editingId ? "Tarefa atualizada" : "Tarefa criada" });
        setOpen(false);
      } else
        toast({
          title: "Erro",
          description: res.error,
          variant: "destructive",
        });
    });

  const advance = (t: TaskRow) => {
    const ns = nextStatus[t.status];
    if (!ns) return;
    startTransition(async () => {
      const res = await setTaskStatus(t.id, ns);
      if (!res.ok)
        toast({
          title: "Erro",
          description: res.error,
          variant: "destructive",
        });
    });
  };

  const remove = (id: string) => {
    if (!confirm("Eliminar tarefa?")) return;
    startTransition(async () => {
      const res = await deleteTask(id);
      if (res.ok) toast({ title: "Tarefa eliminada" });
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
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" /> Nova tarefa
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {TASK_STATUS.map((col) => {
          const items = tasks.filter((t) => t.status === col);
          return (
            <div key={col} className="rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between border-b bg-card px-3 py-2">
                <span className="text-sm font-semibold">
                  {TASK_STATUS_LABELS[col]}
                </span>
                <span className="rounded-full bg-muted px-2 text-xs tabular-nums text-muted-foreground">
                  {items.length}
                </span>
              </div>
              <div className="space-y-2 p-2">
                {items.length === 0 && (
                  <p className="px-1 py-6 text-center text-xs text-muted-foreground">
                    Sem tarefas.
                  </p>
                )}
                {items.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-md border bg-card p-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium leading-snug">{t.title}</p>
                      <TaskPriorityBadge priority={t.priority} />
                    </div>
                    {t.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {t.description}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {t.assignedEmployee && (
                        <span className="inline-flex items-center gap-1">
                          <span
                            className="h-2.5 w-2.5 rounded-sm border"
                            style={{
                              backgroundColor: t.assignedEmployee.color,
                            }}
                          />
                          {t.assignedEmployee.name}
                        </span>
                      )}
                      {t.relatedVehicle && (
                        <span className="inline-flex items-center gap-1">
                          <Car className="h-3 w-3" />
                          {t.relatedVehicle.plateNumber}
                        </span>
                      )}
                      {t.dueDate && (
                        <span>· {formatDatePT(new Date(t.dueDate))}</span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-1 border-t pt-2">
                      {nextStatus[t.status] && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => advance(t)}
                          disabled={pending}
                        >
                          {TASK_STATUS_LABELS[nextStatus[t.status]!]}
                          <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                      )}
                      <div className="ml-auto flex gap-0.5">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => openEdit(t)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          onClick={() => remove(t.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar tarefa" : "Nova tarefa"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Título</Label>
              <Input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Descrição</Label>
              <Textarea
                rows={2}
                value={form.description ?? ""}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Responsável</Label>
                <Select
                  value={form.assignedEmployeeId}
                  onChange={(e) => set("assignedEmployeeId", e.target.value)}
                >
                  <option value="">— Ninguém —</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Veículo</Label>
                <Select
                  value={form.relatedVehicleId}
                  onChange={(e) => set("relatedVehicleId", e.target.value)}
                >
                  <option value="">— Nenhum —</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plateNumber}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-2">
                <Label>Estado</Label>
                <Select
                  value={form.status}
                  onChange={(e) => set("status", e.target.value as TaskStatus)}
                >
                  {TASK_STATUS.map((s) => (
                    <option key={s} value={s}>
                      {TASK_STATUS_LABELS[s]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Prioridade</Label>
                <Select
                  value={form.priority}
                  onChange={(e) =>
                    set("priority", e.target.value as TaskInput["priority"])
                  }
                >
                  {TASK_PRIORITY.map((p) => (
                    <option key={p} value={p}>
                      {TASK_PRIORITY_LABELS[p]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Prazo</Label>
                <Input
                  type="date"
                  value={form.dueDate ?? ""}
                  onChange={(e) => set("dueDate", e.target.value)}
                />
              </div>
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
