"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { EMPLOYEE_COLORS } from "@/lib/constants";
import { createEmployee, updateEmployee, deleteEmployee } from "@/lib/actions";
import type { EmployeeInput } from "@/lib/schemas";

export interface EmployeeRow {
  id: string;
  name: string;
  jobRole: string;
  department: string;
  color: string;
  email: string | null;
  phone: string | null;
  active: boolean;
  annualVacationDays: number;
  vacationDaysUsed?: number;
}

const empty: EmployeeInput = {
  name: "",
  jobRole: "Mecânico",
  department: "Oficina",
  color: EMPLOYEE_COLORS[5],
  email: "",
  phone: "",
  active: true,
  annualVacationDays: 22,
};

export function EmployeesManager({
  employees,
  canManage,
}: {
  employees: EmployeeRow[];
  canManage: boolean;
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EmployeeInput>(empty);

  const set = <K extends keyof EmployeeInput>(k: K, v: EmployeeInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const openCreate = () => {
    setEditingId(null);
    setForm(empty);
    setOpen(true);
  };

  const openEdit = (e: EmployeeRow) => {
    setEditingId(e.id);
    setForm({
      name: e.name,
      jobRole: e.jobRole,
      department: e.department,
      color: e.color,
      email: e.email ?? "",
      phone: e.phone ?? "",
      active: e.active,
      annualVacationDays: e.annualVacationDays,
    });
    setOpen(true);
  };

  const submit = () =>
    startTransition(async () => {
      const res = editingId
        ? await updateEmployee(editingId, form)
        : await createEmployee(form);
      if (res.ok) {
        toast({
          title: editingId ? "Colaborador atualizado" : "Colaborador criado",
        });
        setOpen(false);
      } else {
        toast({
          title: "Erro",
          description: res.error,
          variant: "destructive",
        });
      }
    });

  const remove = (id: string, name: string) => {
    if (!confirm(`Eliminar ${name}? Esta ação remove também as suas férias.`))
      return;
    startTransition(async () => {
      const res = await deleteEmployee(id);
      if (res.ok) toast({ title: "Colaborador eliminado" });
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
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" /> Novo colaborador
          </Button>
        </div>
      )}

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Colaborador</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead className="text-center">Férias (usadas/ano)</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              {canManage && <TableHead className="text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-muted-foreground"
                >
                  Sem colaboradores. Adicione o primeiro.
                </TableCell>
              </TableRow>
            )}
            {employees.map((e) => (
              <TableRow key={e.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-5 w-5 shrink-0 rounded-sm border"
                      style={{ backgroundColor: e.color }}
                    />
                    <span className="font-medium">{e.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div>{e.jobRole}</div>
                  <div className="text-xs text-muted-foreground">
                    {e.department}
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {e.email && <div>{e.email}</div>}
                  {e.phone && (
                    <div className="text-muted-foreground">{e.phone}</div>
                  )}
                  {!e.email && !e.phone && (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-center tabular-nums">
                  <span className="font-medium">{e.vacationDaysUsed ?? 0}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    / {e.annualVacationDays}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  {e.active ? (
                    <Badge variant="success">Ativo</Badge>
                  ) : (
                    <Badge variant="neutral">Inativo</Badge>
                  )}
                </TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => openEdit(e)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => remove(e.id, e.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar colaborador" : "Novo colaborador"}
            </DialogTitle>
            <DialogDescription>
              A cor é usada para identificar o colaborador no Mapa de Férias.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Nome</Label>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Função</Label>
                <Input
                  value={form.jobRole}
                  onChange={(e) => set("jobRole", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Departamento</Label>
                <Input
                  value={form.department}
                  onChange={(e) => set("department", e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Cor no mapa</Label>
              <div className="flex flex-wrap items-center gap-2">
                {EMPLOYEE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set("color", c)}
                    className={`h-7 w-7 rounded-md border-2 ${
                      form.color.toLowerCase() === c.toLowerCase()
                        ? "border-foreground"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={c}
                  />
                ))}
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => set("color", e.target.value)}
                  className="h-7 w-10 cursor-pointer rounded border"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email ?? ""}
                  onChange={(e) => set("email", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Telefone</Label>
                <Input
                  value={form.phone ?? ""}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Dias de férias / ano</Label>
                <Input
                  type="number"
                  value={form.annualVacationDays}
                  onChange={(e) =>
                    set("annualVacationDays", Number(e.target.value))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Estado</Label>
                <Select
                  value={form.active ? "1" : "0"}
                  onChange={(e) => set("active", e.target.value === "1")}
                >
                  <option value="1">Ativo</option>
                  <option value="0">Inativo</option>
                </Select>
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
