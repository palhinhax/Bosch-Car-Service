import { auth } from "./config";
import { MANAGER_ROLES, type Role } from "@/lib/constants";

export async function getCurrentUser() {
  const session = await auth();
  return session?.user;
}

/** True when the current user can manage staff / approve holidays. */
export async function isManager() {
  const user = await getCurrentUser();
  return !!user && MANAGER_ROLES.includes(user.role as Role);
}

export function roleCanApprove(role?: string | null): boolean {
  return !!role && MANAGER_ROLES.includes(role as Role);
}

/** Reception can manage the front-desk (customers/vehicles/appointments). */
export function roleCanManageFrontDesk(role?: string | null): boolean {
  return role === "ADMIN" || role === "MANAGER" || role === "RECEPTION";
}
