import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { UsersManager } from "@/features/utilizadores/users-manager";
import { getCurrentUser } from "@/lib/auth/session";
import { listEmployeesWithUser, listUsers } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function UtilizadoresPage() {
  const user = await getCurrentUser();
  // Admin-only area.
  if (!user || user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const [users, employees] = await Promise.all([
    listUsers(),
    listEmployeesWithUser(),
  ]);

  return (
    <div>
      <PageHeader
        title="Utilizadores"
        description="Contas de acesso, perfis e permissões da plataforma."
      />
      <UsersManager
        currentUserId={user.id}
        users={users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          employee: u.employee,
        }))}
        employees={employees.map((e) => ({
          id: e.id,
          name: e.name,
          linkedUserId: e.user?.id ?? null,
        }))}
      />
    </div>
  );
}
