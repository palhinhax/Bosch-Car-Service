import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "@/features/definicoes/settings-form";
import { ChangePasswordForm } from "@/features/definicoes/change-password-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser, roleCanApprove } from "@/lib/auth/session";
import { getSettings } from "@/lib/data";
import { ROLE_LABELS, type Role } from "@/lib/constants";

export const dynamic = "force-dynamic";

const roleInfo: { role: Role; perms: string }[] = [
  {
    role: "ADMIN",
    perms: "Acesso total: equipa, aprovações, marcações, relatórios.",
  },
  { role: "MANAGER", perms: "Gere a equipa e aprova férias." },
  {
    role: "RECEPTION",
    perms: "Gere marcações, clientes e veículos. Não aprova férias.",
  },
  {
    role: "EMPLOYEE",
    perms: "Consulta as suas férias e pede novas. Vê tarefas atribuídas.",
  },
];

export default async function DefinicoesPage() {
  const [user, settings] = await Promise.all([getCurrentUser(), getSettings()]);
  const canManage = roleCanApprove(user?.role);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Definições"
        description="Configuração da oficina e permissões."
      />

      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">A minha conta</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">Geral</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <SettingsForm
            canManage={canManage}
            initial={{
              name: settings.name,
              minStaffPerDay: settings.minStaffPerDay,
              year: settings.year,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">Perfis de acesso</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="space-y-2">
            {roleInfo.map((r) => (
              <div key={r.role} className="flex items-start gap-3 text-sm">
                <Badge variant="neutral" className="mt-0.5 shrink-0">
                  {ROLE_LABELS[r.role]}
                </Badge>
                <span className="text-muted-foreground">{r.perms}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
