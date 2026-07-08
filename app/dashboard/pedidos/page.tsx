import { PageHeader } from "@/components/page-header";
import { PedidosManager } from "@/features/pedidos/pedidos-manager";
import { getCurrentUser, roleCanApprove } from "@/lib/auth/session";
import {
  getSettings,
  listEmployees,
  listVacations,
  listVacationsForEmployee,
} from "@/lib/data";
import type { VacationLike } from "@/lib/holidays";

export const dynamic = "force-dynamic";

export default async function PedidosPage() {
  const settings = await getSettings();
  const user = await getCurrentUser();
  const canApprove = roleCanApprove(user?.role);

  const employees = await listEmployees({ onlyActive: true });
  const totalActive = employees.length;

  // Managers see everyone; a linked employee sees only their own requests.
  const raw =
    !canApprove && user?.employeeId
      ? await listVacationsForEmployee(user.employeeId)
      : await listVacations(settings.year);

  const vacations: VacationLike[] = raw.map((v) => ({
    id: v.id,
    employeeId: v.employeeId,
    startDate: new Date(v.startDate).toISOString(),
    endDate: new Date(v.endDate).toISOString(),
    type: v.type,
    category: v.category,
    status: v.status,
    employee: v.employee,
  }));

  return (
    <div>
      <PageHeader
        title="Pedidos de Férias"
        description={
          canApprove
            ? "Aprove ou rejeite pedidos. São assinalados conflitos com o mínimo de equipa."
            : "Consulte e submeta os seus pedidos de férias."
        }
      />
      <PedidosManager
        vacations={vacations}
        employees={employees.map((e) => ({ id: e.id, name: e.name }))}
        canApprove={canApprove}
        minStaffPerDay={settings.minStaffPerDay}
        totalActive={totalActive}
        lockedEmployeeId={!canApprove ? (user?.employeeId ?? null) : null}
      />
    </div>
  );
}
