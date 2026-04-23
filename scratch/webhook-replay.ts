import { paymentService } from '../src/services/financial/payment.service';
import { db } from '../src/lib/db';

async function testDoubleCredit() {
  const userId = `test_user_idemp_${Date.now()}`;
  
  // Create mock external user and orphan payment to simulate webhook arriving
  await db.user.create({
    data: { id: userId, email: `${userId}@test.com` }
  });
  
  // Initial
  const userStart = await db.user.findUnique({ where: { id: userId } });
  console.log(`Initial totalSpent: ${userStart?.totalSpent}`);

  const gatewayId = `ext_pay_${Date.now()}`;
  const amount = 1000;

  // Let's create an order and payment first
  const order = await db.order.create({
    data: {
      userId,
      serviceId: "test_service",
      quantity: 100,
      charge: amount,
      providerCost: 10,
      link: "https://test.com",
      status: "AWAITING_PAYMENT"
    }
  });

  const payment = await db.payment.create({
    data: {
      userId,
      orderId: order.id,
      amount,
      currency: "RUB",
      gatewayId,
      status: "PENDING"
    }
  });

  console.log(`Sending concurrent webhooks for Payment: ${payment.id} / Gateway: ${gatewayId}`);

  // We are going to hit confirmPayment twice in parallel natively
  const p1 = paymentService.confirmPayment(gatewayId, amount, userId, true, 'yookassa', payment.id);
  const p2 = paymentService.confirmPayment(gatewayId, amount, userId, true, 'yookassa', payment.id);

  await Promise.all([p1, p2]);

  const finalUser = await db.user.findUnique({ where: { id: userId } });
  console.log(`Final totalSpent: ${finalUser?.totalSpent}`);
  if (finalUser?.totalSpent !== amount) {
     console.log(`[FATAL] Double-credit logic bypassed! Total spent is ${finalUser?.totalSpent}, expected ${amount}.`);
  } else {
     console.log(`[SUCCESS] Double-credit idempotency protected.`);
  }

  // Cleanup
  await db.payment.delete({ where: { id: payment.id } });
  await db.order.delete({ where: { id: order.id } });
  await db.user.delete({ where: { id: userId } });
}

testDoubleCredit().catch(e => console.error("CRASHED:", e));
