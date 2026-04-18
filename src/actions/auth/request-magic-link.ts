"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { sendMagicLink } from "@/lib/smtp";
import crypto from "crypto";

const schema = z.object({
  email: z.string().email("Введите корректный email"),
});

export async function requestMagicLink(prevState: any, formData: FormData) {
  const email = formData.get("email");

  const parsed = schema.safeParse({ email });
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message, success: false };
  }

  const cleanEmail = parsed.data.email.toLowerCase();

  try {
    // Upsert пользователя (Auto-signup)
    let user = await db.user.findUnique({ where: { email: cleanEmail } });
    if (!user) {
      // Авто-bootstrap: Если в базе еще нет ни одного Владельца, этот юзер им станет
      const ownerCount = await db.user.count({ where: { role: "OWNER" } });
      const role = ownerCount === 0 ? "OWNER" : "USER";
      user = await db.user.create({ data: { email: cleanEmail, role } });
    }

    // Генерируем секретный токен (используем crypto для надежности)
    const rawToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 минут

    await db.authToken.create({
      data: {
        userId: user.id,
        token: rawToken,
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
