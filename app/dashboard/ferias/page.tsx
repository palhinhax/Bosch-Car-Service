import { PageHeader } from "@/components/page-header";
import { MapaFerias } from "@/features/ferias/mapa-ferias";
import { getCurrentUser, roleCanApprove } from "@/lib/auth/session";
import { getSettings, listEmployees, listVacations } from "@/lib/data";
import type { VacationLike } from "@/lib/holidays";

export const dynamic = "force-dynamic";

export default async function MapaFeriasPage({
  searchParams,
}: {
  searchParams: { year?: string };
}) {
  const settings = await getSettings();
  const year = Number(searchParams.year) || settings.year;

  const [user, employees, vacations] = await Promise.all([
    getCurrentUser(),
    listEmployees(),
    listVacations(year),
  ]);

  const canApprove = roleCanApprove(user?.role);

  // Serialize dates to ISO strings for the client boundary.
  const vacationsSerialized: VacationLike[] = vacations.map((v) => ({
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
        title="Mapa de Férias"
        description={`Vista anual das férias e ausências da equipa · ${year}`}
      />
      <MapaFerias
        year={year}
        employees={employees.map((e) => ({
          id: e.id,
          name: e.name,
          color: e.color,
          active: e.active,
        }))}
        vacations={vacationsSerialized}
        minStaffPerDay={settings.minStaffPerDay}
        canApprove={canApprove}
        companyName={settings.name}
      />
    </div>
  );
}
