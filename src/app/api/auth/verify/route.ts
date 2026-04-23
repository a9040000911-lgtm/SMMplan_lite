import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import crypto from "crypto";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=InvalidToken", request.url));
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const authToken = await db.authToken.findUnique({
    where: { token: hashedToken },
  });

  if (!authToken || authToken.used || authToken.expiresAt < new Date()) {
    return NextResponse.redirect(new URL("/login?error=ExpiredToken", request.url));
  }

  // Помечаем как использованный
  await db.authToken.update({
    where: { id: authToken.id },
    data: { used: true },
  });

  // Устанавливаем куку сессии
  await createSession(authToken.userId);

  const user = await db.user.findUnique({ where: { id: authToken.userId } });
  
  if (user && ["OWNER", "ADMIN", "MANAGER", "SUPPORT"].includes(user.role)) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
