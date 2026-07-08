"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, ShieldCheck } from "lucide-react";
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
import { ROLES, ROLE_LABELS, type Role } from "@/lib/constants";
import { createUser, updateUser, deleteUser } from "@/lib/actions";
import type { UserInput } from "@/lib/schemas";

export interface UserRow {
  id: string;
  name: string | null;
  email: string;
  role: string;
  employee: { id: string; name: string; color: string } | null;
}

export interface EmployeeOption {
  id: string;
  name: string;
  linkedUserId: string | null;
}

const ROLE_PERMS: Record<Role, string> = {
  ADMIN: "Acesso total, incluindo gestão de utilizadores.",
  MANAGER: "Gere colaboradores e aprova férias.",
  RECEPTION: "Gere marcações, clientes e veículos.",
  EMPLOYEE: "Consulta e pede as suas férias.",
};

export function UsersManager({
  users,
  employees,
  currentUserId,
}: {
  users: UserRow[];
  employees: EmployeeOption[];
  currentUserId: string;
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const empty: UserInput = {
    name: "",
    email: "",
    role: "EMPLOYEE",
    password: "",
    employeeId: "",
  };
  const [form, setForm] = useState<UserInput>(empty);
  const set = <K extends keyof UserInput>(k: K, v: UserInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const openCreate = () => {
    setEditingId(null);
    setForm(empty);
    setOpen(true);
  };
  const openEdit = (u: UserRow) => {
    setEditingId(u.id);
    setForm({
      name: u.name ?? "",
      email: u.email,
      role: u.role as Role,
      password: "",
      employeeId: u.employee?.id ?? "",
    });
    setOpen(true);
  };

  const submit = () =>
    startTransition(async () => {
      const res = editingId
        ? await updateUser(editingId, form)
        : await createUser(form);
      if (res.ok) {
        toast({
          title: editingId ? "Utilizador atualizado" : "Utilizador criado",
        });
        setOpen(false);
      } else
        toast({
          title: "Erro",
          description: res.error,
          variant: "destructive",
        });
    });

  const remove = (u: UserRow) => {
    if (!confirm(`Eliminar o utilizador ${u.name || u.email}?`)) return;
    startTransition(async () => {
      const res = await deleteUser(u.id);
      if (res.ok) toast({ title: "Utilizador eliminado" });
      else
        toast({
          title: "Erro",
          description: res.error,
          variant: "destructive",
        });
    });
  };

  const roleVariant = (role: string) =>
    role === "ADMIN" ? "danger" : role === "MANAGER" ? "info" : "neutral";

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" /> Novo utilizador
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Utilizador</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Colaborador associado</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="font-medium">
                    {u.name || "—"}
                    {u.id === currentUserId && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (você)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={roleVariant(u.role)}>
                    {ROLE_LABELS[u.role as Role] ?? u.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  {u.employee ? (
                    <span className="inline-flex items-center gap-2 text-sm">
                      <span
                        className="h-3.5 w-3.5 rounded-sm border"
                        style={{ backgroundColor: u.employee.color }}
                      />
                      {u.employee.name}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => openEdit(u)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      disabled={u.id === currentUserId}
                      onClick={() => remove(u)}
                      title={
                        u.id === currentUserId
                          ? "Não pode eliminar a sua conta"
                          : "Eliminar"
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar utilizador" : "Novo utilizador"}
            </DialogTitle>
            <DialogDescription>
              O perfil define as permissões de acesso à plataforma.
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
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Palavra-passe</Label>
              <Input
                type="password"
                value={form.password ?? ""}
                onChange={(e) => set("password", e.target.value)}
                placeholder={
                  editingId ? "Deixe vazio para manter" : "Mínimo 6 caracteres"
                }
              />
            </div>

            <div className="grid gap-2">
              <Label>Perfil</Label>
              <Select
                value={form.role}
                onChange={(e) => set("role", e.target.value as Role)}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </Select>
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {ROLE_PERMS[form.role as Role]}
              </p>
            </div>

            <div className="grid gap-2">
              <Label>Colaborador associado (opcional)</Label>
              <Select
                value={form.employeeId ?? ""}
                onChange={(e) => set("employeeId", e.target.value)}
              >
                <option value="">— Sem associação —</option>
                {employees.map((emp) => {
                  const takenByOther =
                    emp.linkedUserId !== null && emp.linkedUserId !== editingId;
                  return (
                    <option key={emp.id} value={emp.id} disabled={takenByOther}>
                      {emp.name}
                      {takenByOther ? " (já associado)" : ""}
                    </option>
                  );
                })}
              </Select>
              <p className="text-xs text-muted-foreground">
                Associe a um colaborador para ligar as férias e tarefas à conta.
              </p>
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
