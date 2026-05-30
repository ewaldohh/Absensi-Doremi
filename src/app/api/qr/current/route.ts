import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hashToken, randomToken } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get("branchId");

  if (!branchId) {
    return NextResponse.json({ ok: false, message: "Cabang tidak valid." }, { status: 400 });
  }

  const branch = await prisma.branch.findUnique({
    where: { id: branchId }
  });

  if (!branch || !branch.isActive) {
    return NextResponse.json({ ok: false, message: "Cabang tidak aktif." }, { status: 404 });
  }

  const token = randomToken(24);
  const validFrom = new Date();
  const validUntil = new Date(validFrom.getTime() + 30_000);

  await prisma.qrToken.create({
    data: {
      branchId: branch.id,
      tokenHash: hashToken(token),
      validFrom,
      validUntil
    }
  });

  const payload = JSON.stringify({
    type: "bimba-attendance",
    branchId: branch.id,
    token
  });

  const dataUrl = await QRCode.toDataURL(payload, {
    margin: 2,
    scale: 8,
    color: {
      dark: "#18211f",
      light: "#ffffff"
    }
  });

  return NextResponse.json({
    ok: true,
    dataUrl,
    payload,
    validUntil: validUntil.toISOString(),
    branchName: branch.name
  });
}
