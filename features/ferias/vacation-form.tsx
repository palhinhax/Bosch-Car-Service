"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/use-toast";
import { createVacation, updateVacation } from "@/lib/actions";
import {
  VACATION_CATEGORIES,
  VACATION_CATEGORY_LABELS,
  VACATION_TYPES,
  VACATION_TYPE_LABELS,
  VACATION_STATUS,
  VACATION_STATUS_LABELS,
} from "@/lib/constants";
import type { VacationInput } from "@/lib/schemas";

export interface VacationFormValues extends Partial<VacationInput> {
  id?: string;
}

export function VacationFormDialog({
  open,
  onOpenChange,
  employees,
  initial,
  canApprove,
  lockedEmployeeId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  employees: { id: string; name: string }[];
  initial?: VacationFormValues;
  canApprove: boolean;
  lockedEmployeeId?: string | null;
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const editing = !!initial?.id;

  const [form, setForm] = useState<VacationInput>({
    employeeId:
      initial?.employeeId ?? lockedEmployeeId ?? employees[0]?.id ?? "",
    startDate: initial?.startDate ?? "",
    endDate: initial?.endDate ?? "",
    type: initial?.type ?? "FULL",
    category: initial?.category ?? "FERIAS",
    status: initial?.status ?? (canApprove ? "APPROVED" : "PENDING"),
    notes: initial?.notes ?? "",
  });

  const set = <K extends keyof VacationInput>(k: K, v: VacationInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    startTransition(async () => {
      const res = editing
        ? await updateVacation(initial!.id!, form)
        : await createVacation(form);
      if (res.ok) {
        toast({
          title: editing ? "Férias atualizadas" : "Pedido registado",
          description: canApprove
            ? "O mapa foi atualizado."
            : "O seu pedido ficou pendente de aprovação.",
        });
        onOpenChange(false);
      } else {
        toast({
          title: "Erro",
          description: res.error,
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar férias" : "Registar férias / ausência"}
          </DialogTitle>
          <DialogDescription>
            {canApprove
              ? "Defina o período e o estado do registo."
              : "O pedido será enviado para aprovação do gestor."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Colaborador</Label>
            <Select
              value={form.employeeId}
              disabled={!!lockedEmployeeId}
              onChange={(e) => set("employeeId", e.target.value)}
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Data de início</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Data de fim</Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => set("endDate", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Tipo</Label>
              <Select
                value={form.category}
                onChange={(e) =>
                  set("category", e.target.value as VacationInput["category"])
                }
              >
                {VACATION_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {VACATION_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Duração</Label>
              <Select
                value={form.type}
                onChange={(e) =>
                  set("type", e.target.value as VacationInput["type"])
                }
              >
                {VACATION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {VACATION_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {canApprove && (
            <div className="grid gap-2">
              <Label>Estado</Label>
              <Select
                value={form.status}
                onChange={(e) =>
                  set("status", e.target.value as VacationInput["status"])
                }
              >
                {VACATION_STATUS.map((s) => (
                  <option key={s} value={s}>
                    {VACATION_STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="grid gap-2">
            <Label>Observações</Label>
            <Textarea
              rows={2}
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Notas opcionais…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending && <Spinner size="sm" className="mr-2" />}
            {editing ? "Guardar" : "Registar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
