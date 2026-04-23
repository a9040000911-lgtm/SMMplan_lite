"use server";

import { db } from "@/lib/db";
import { verifySession } from "@/lib/session";
import { SettingsManager } from "@/lib/settings";

export async function createTopUpPaymentAction(amountRub: number) {
  const session = await verifySession();
  if (!session) throw new Error("Unauthorized");
  
  const amountCents = Math.round(amountRub * 100);
  if (amountCents < 10000) throw new Error("Минимальная сумма пополнения - 100 руб");

  const secrets = await SettingsManager.getPaymentSecrets();
  const shopId = secrets.yookassaShopId;
  const secretKey = secrets.yookassaSecretKey;
  if (!shopId || !secretKey) throw new Error("Шлюз ЮKassa не настроен администратором.");

  const payment = await db.payment.create({
    data: {
      userId: session.userId,
      amount: amountCents,
      currency: "RUB",
      status: "PENDING",
      gateway: "yookassa"
    }
  });

  const authHeader = 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64');
  const successUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/add-funds?success=1`;

  const payload = {
    amount: { value: amountRub.toFixed(2), currency: "RUB" },
    capture: true,
    confirmation: { type: "redirect", return_url: successUrl },
    description: `Пополнение баланса Smmplan (Пользователь: ${session.userId})`,
    metadata: { paymentId: payment.id, userId: session.userId, type: "deposit" }
  };

  const resp = await fetch("https://api.yookassa.ru/v3/payments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": authHeader,
      "Idempotence-Key": payment.id
    },
    body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    console.error("[YooKassa Error]", await resp.text());
    throw new Error("Ошибка создания платежа в шлюзе YooKassa");
  }

  const data = await resp.json();
  
  await db.payment.update({
    where: { id: payment.id },
    data: { gatewayId: data.id }
  });

  return { success: true, paymentUrl: data.confirmation.confirmation_url };
}
