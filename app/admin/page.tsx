import { requireAdminPageAccess } from "@/lib/auth/server-guards";
import { AdminControlCentre } from "@/components/admin/AdminControlCentre";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdminPageAccess();
  return <AdminControlCentre />;
}
