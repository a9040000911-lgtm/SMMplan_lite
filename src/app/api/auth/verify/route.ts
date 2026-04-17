import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=InvalidToken", request.url));
  }

  const authToken = await db.authToken.findUnique({
    where: { token },
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

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
