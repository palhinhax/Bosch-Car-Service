"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Check, X, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { VacationStatusBadge } from "@/components/status-badge";
import { VacationFormDialog } from "@/features/ferias/vacation-form";
import {
  VACATION_CATEGORY_LABELS,
  type VacationCategory,
} from "@/lib/constants";
import { wouldBreachMinStaff, type VacationLike } from "@/lib/holidays";
import { countWorkingDays, formatDatePT } from "@/lib/dates";
import { setVacationStatus, deleteVacation } from "@/lib/actions";

export function PedidosManager({
  vacations,
  employees,
  canApprove,
  minStaffPerDay,
  totalActive,
  lockedEmployeeId,
}: {
  vacations: VacationLike[];
  employees: { id: string; name: string }[];
  canApprove: boolean;
  minStaffPerDay: number;
  totalActive: number;
  lockedEmployeeId?: string | null;
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [statusFilter, setStatusFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  const approvedOthers = useMemo(
    () => vacations.filter((v) => v.status === "APPROVED"),
    [vacations]
  );

  const rows = useMemo(() => {
    const list = statusFilter
      ? vacations.filter((v) => v.status === statusFilter)
      : vacations;
    return [...list].sort((a, b) => {
      // pending first, then by start date
      if (a.status === "PENDING" && b.status !== "PENDING") return -1;
      if (b.status === "PENDING" && a.status !== "PENDING") return 1;
      return String(a.startDate).localeCompare(String(b.startDate));
    });
  }, [vacations, statusFilter]);

  const act = (id: string, status: "APPROVED" | "REJECTED") =>
    startTransition(async () => {
      const res = await setVacationStatus(id, status);
      if (!res.ok)
        toast({
          title: "Erro",
          description: res.error,
          variant: "destructive",
        });
      else toast({ title: status === "APPROVED" ? "Aprovado" : "Rejeitado" });
    });

  const remove = (id: string) =>
    startTransition(async () => {
      const res = await deleteVacation(id);
      if (!res.ok)
        toast({
          title: "Erro",
          description: res.error,
          variant: "destructive",
        });
      else toast({ title: "Pedido eliminado" });
    });

  const breachesFor = (v: VacationLike) => {
    if (v.status !== "PENDING") return [];
    const others = approvedOthers.filter((o) => o.id !== v.id);
    return wouldBreachMinStaff(others, v, totalActive, minStaffPerDay);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {canApprove && (
          <Select
            className="w-auto min-w-[10rem]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Todos os estados</option>
            <option value="PENDING">Pendentes</option>
            <option value="APPROVED">Aprovados</option>
            <option value="REJECTED">Rejeitados</option>
          </Select>
        )}
        <div className="ml-auto">
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            {canApprove ? "Registar férias" : "Pedir férias"}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Colaborador</TableHead>
              <TableHead>Período</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-center">Dias úteis</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-muted-foreground"
                >
                  Sem pedidos para mostrar.
                </TableCell>
              </TableRow>
            )}
            {rows.map((v) => {
              const breaches = breachesFor(v);
              const days = countWorkingDays(
                new Date(v.startDate),
                new Date(v.endDate)
              );
              return (
                <TableRow key={v.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-4 w-4 shrink-0 rounded-sm border"
                        style={{ backgroundColor: v.employee.color }}
                      />
                      <span className="font-medium">{v.employee.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {formatDatePT(new Date(v.startDate))} –{" "}
                    {formatDatePT(new Date(v.endDate))}
                  </TableCell>
                  <TableCell className="text-sm">
                    {VACATION_CATEGORY_LABELS[v.category as VacationCategory]}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {days}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      <VacationStatusBadge status={v.status} />
                      {breaches.length > 0 && (
                        <span
                          className="inline-flex items-center gap-1 text-xs text-amber-700"
                          title={`Fica abaixo do mínimo em: ${breaches
                            .map((b) => formatDatePT(b.date))
                            .join(", ")}`}
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Conflito de equipa
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {canApprove && v.status !== "APPROVED" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-emerald-600"
                          disabled={pending}
                          onClick={() => act(v.id, "APPROVED")}
                          title="Aprovar"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      {canApprove && v.status !== "REJECTED" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-amber-600"
                          disabled={pending}
                          onClick={() => act(v.id, "REJECTED")}
                          title="Rejeitar"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      {(canApprove || v.status === "PENDING") && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          disabled={pending}
                          onClick={() => remove(v.id)}
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {!canApprove && (
        <p className="text-sm text-muted-foreground">
          Os pedidos ficam pendentes até aprovação do gestor.
        </p>
      )}

      {formOpen && (
        <VacationFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          employees={employees}
          canApprove={canApprove}
          lockedEmployeeId={lockedEmployeeId}
        />
      )}
    </div>
  );
}
