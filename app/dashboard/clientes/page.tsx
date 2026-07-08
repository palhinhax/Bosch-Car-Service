import { PageHeader } from "@/components/page-header";
import { ClientesManager } from "@/features/clientes/clientes-manager";
import { getCurrentUser, roleCanManageFrontDesk } from "@/lib/auth/session";
import { listCustomers } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const [user, customers] = await Promise.all([
    getCurrentUser(),
    listCustomers(),
  ]);
  const canManage = roleCanManageFrontDesk(user?.role);

  return (
    <div>
      <PageHeader title="Clientes" description="Base de clientes da oficina." />
      <ClientesManager
        canManage={canManage}
        customers={customers.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          address: c.address,
          notes: c.notes,
          vehicles: c.vehicles.map((v) => ({
            plateNumber: v.plateNumber,
            brand: v.brand,
            model: v.model,
          })),
        }))}
      />
    </div>
  );
}
