"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { sendMagicLink } from "@/lib/smtp";
import crypto from "crypto";
import { cookies } from "next/headers";

const schema = z.object({
  email: z.string().email("Введите корректный email"),
});

export async function requestMagicLink(prevState: any, formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message, success: false };
  }

  const cleanEmail = parsed.data.email.toLowerCase();

  try {
    // [SAFE BYPASS] Только для локальной разработки! 
    if (
      process.env.NODE_ENV !== "production" &&
      process.env.DEV_BYPASS_EMAIL &&
      cleanEmail === process.env.DEV_BYPASS_EMAIL.toLowerCase()
    ) {
      let user = await db.user.findUnique({ where: { email: cleanEmail } });
      if (!user) {
        user = await db.user.create({ data: { email: cleanEmail, role: "OWNER" } });
      } else if (user.role !== "OWNER") {
        user = await db.user.update({ where: { id: user.id }, data: { role: "OWNER" } });
      }
      
      const { createSession } = await import("@/lib/session");
      await createSession(user.id);

      const { redirect } = await import("next/navigation");
      redirect("/admin/dashboard");
    }

    // Узнаем, существует ли пользователь (или авто-создаем)
    let user = await db.user.findUnique({ where: { email: cleanEmail } });
    if (!user) {
      // Пытаемся получить реферальный код из куки
      const cookieStore = await cookies();
      const refCode = cookieStore.get("ref")?.value;
      let referredById = null;

      if (refCode) {
        const referrer = await db.user.findUnique({ where: { referralCode: refCode } });
        if (referrer) referredById = referrer.id;
      }

      // Авто-bootstrap: Если в базе еще нет ни одного Владельца, этот юзер им станет
      const ownerCount = await db.user.count({ where: { role: "OWNER" } });
      const role = ownerCount === 0 ? "OWNER" : "USER";
      user = await db.user.create({ data: { email: cleanEmail, role, referredById } });
    }

    // Rate Limiting (Anti-Spam)
    const recentToken = await db.authToken.findFirst({
      where: { 
        userId: user.id, 
        createdAt: { gt: new Date(Date.now() - 60 * 1000) } 
      }
    });

    if (recentToken) {
      return { error: "Ссылка уже отправлена. Пожалуйста, подождите 1 минуту перед новым запросом.", success: false };
    }

    // Генерируем секретный токен (используем crypto для надежности)
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 минут

    await db.authToken.create({
      data: {
        userId: user.id,
        token: hashedToken, // Безопасное хранение хэша в БД
        expiresAt,
      },
    });

    // Отправляем линк
    await sendMagicLink(cleanEmail, rawToken);

    return { success: true, error: null };
  } catch (error) {
    console.error(error);
    return { error: "Что-то пошло не так. Попробуйте еще раз.", success: false };
  }
}
