"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { createVehicle, updateVehicle, deleteVehicle } from "@/lib/actions";
import type { VehicleInput } from "@/lib/schemas";

export interface VehicleRow {
  id: string;
  plateNumber: string;
  brand: string;
  model: string;
  year: number | null;
  mileage: number | null;
  vin: string | null;
  notes: string | null;
  customer: { id: string; name: string };
}

export function VeiculosManager({
  vehicles,
  customers,
  canManage,
}: {
  vehicles: VehicleRow[];
  customers: { id: string; name: string }[];
  canManage: boolean;
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const emptyForm = (): VehicleInput => ({
    customerId: customers[0]?.id ?? "",
    plateNumber: "",
    brand: "",
    model: "",
    year: "",
    mileage: "",
    vin: "",
    notes: "",
  });
  const [form, setForm] = useState<VehicleInput>(emptyForm());

  const set = <K extends keyof VehicleInput>(k: K, v: VehicleInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return vehicles;
    return vehicles.filter(
      (v) =>
        v.plateNumber.toLowerCase().includes(s) ||
        `${v.brand} ${v.model}`.toLowerCase().includes(s) ||
        v.customer.name.toLowerCase().includes(s)
    );
  }, [vehicles, q]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setOpen(true);
  };
  const openEdit = (v: VehicleRow) => {
    setEditingId(v.id);
    setForm({
      customerId: v.customer.id,
      plateNumber: v.plateNumber,
      brand: v.brand,
      model: v.model,
      year: v.year ?? "",
      mileage: v.mileage ?? "",
      vin: v.vin ?? "",
      notes: v.notes ?? "",
    });
    setOpen(true);
  };

  const submit = () =>
    startTransition(async () => {
      const res = editingId
        ? await updateVehicle(editingId, form)
        : await createVehicle(form);
      if (res.ok) {
        toast({ title: editingId ? "Veículo atualizado" : "Veículo criado" });
        setOpen(false);
      } else
        toast({
          title: "Erro",
          description: res.error,
          variant: "destructive",
        });
    });

  const remove = (id: string, plate: string) => {
    if (!confirm(`Eliminar o veículo ${plate}?`)) return;
    startTransition(async () => {
      const res = await deleteVehicle(id);
      if (res.ok) toast({ title: "Veículo eliminado" });
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
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Pesquisar matrícula, marca, cliente…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {canManage && (
          <Button
            className="ml-auto"
            onClick={openCreate}
            disabled={customers.length === 0}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Novo veículo
          </Button>
        )}
      </div>
      {customers.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Crie primeiro um cliente para poder associar veículos.
        </p>
      )}

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Matrícula</TableHead>
              <TableHead>Veículo</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Quilómetros</TableHead>
              {canManage && <TableHead className="text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-muted-foreground"
                >
                  Sem veículos.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-mono font-medium">
                  {v.plateNumber}
                </TableCell>
                <TableCell>
                  <div className="font-medium">
                    {v.brand} {v.model}
                  </div>
                  {v.year && (
                    <div className="text-xs text-muted-foreground">
                      {v.year}
                    </div>
                  )}
                </TableCell>
                <TableCell>{v.customer.name}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {v.mileage != null
                    ? `${v.mileage.toLocaleString("pt-PT")} km`
                    : "—"}
                </TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => openEdit(v)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => remove(v.id, v.plateNumber)}
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
              {editingId ? "Editar veículo" : "Novo veículo"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Cliente</Label>
              <Select
                value={form.customerId}
                onChange={(e) => set("customerId", e.target.value)}
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Matrícula</Label>
                <Input
                  value={form.plateNumber}
                  onChange={(e) => set("plateNumber", e.target.value)}
                  placeholder="AA-00-BB"
                />
              </div>
              <div className="grid gap-2">
                <Label>Ano</Label>
                <Input
                  type="number"
                  value={String(form.year ?? "")}
                  onChange={(e) =>
                    set(
                      "year",
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Marca</Label>
                <Input
                  value={form.brand}
                  onChange={(e) => set("brand", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Modelo</Label>
                <Input
                  value={form.model}
                  onChange={(e) => set("model", e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Quilómetros</Label>
                <Input
                  type="number"
                  value={String(form.mileage ?? "")}
                  onChange={(e) =>
                    set(
                      "mileage",
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>VIN</Label>
                <Input
                  value={form.vin ?? ""}
                  onChange={(e) => set("vin", e.target.value)}
                />
              </div>
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
