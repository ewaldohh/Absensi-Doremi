import { QrPanel } from "@/components/qr-panel";
import { AppShell } from "@/components/app-shell";
import { requireRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function AdminQrPage() {
  const user = await requireUser();
  requireRole(user, ["ADMIN", "OWNER"]);

  const branches = await prisma.branch.findMany({
    where: {
      isActive: true
    },
    orderBy: {
      name: "asc"
    }
  });

  return (
    <AppShell user={user} title="QR Cabang" subtitle="Tampilkan QR ini di laptop atau monitor admin cabang.">
      {branches[0] ? <QrPanel branchId={branches[0].id} /> : <div className="empty-state">Belum ada cabang aktif.</div>}
    </AppShell>
  );
}
