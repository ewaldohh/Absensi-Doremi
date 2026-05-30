import { NextResponse } from "next/server";
import { createSession, SESSION_COOKIE } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.redirect(new URL("/login?error=Email atau password tidak sesuai.", request.url), 303);
  }

  const session = await createSession(user.id);
  const response = NextResponse.redirect(new URL("/dashboard", request.url), 303);
  response.cookies.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "lax",
    expires: session.expiresAt,
    path: "/"
  });

  return response;
}
