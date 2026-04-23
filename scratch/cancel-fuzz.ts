import { adminOrderService } from '../src/services/admin/order.service';
import { db } from '../src/lib/db';

async function testDoubleCredit() {
  const userId = `test_user_idemp_${Date.now()}`;
  
  // Create user
  await db.user.create({
    data: { id: userId, email: `${userId}@test.com`, balance: 0, totalSpent: 1000 }
  });

  // Create category and service
  let category = await db.category.findFirst();
  if (!category) {
      category = await db.category.create({ data: { name: 'test_cat' } });
  }

  let service = await db.service.create({
    data: {
      categoryId: category.id,
      name: "Test Service",
      rate: 10,
      minQty: 10,
      maxQty: 1000,
      isActive: true
    }
  });

  const order = await db.order.create({
    data: {
      userId,
      serviceId: service.id,
      quantity: 100,
      charge: 1000,
      providerCost: 10,
      link: "https://test.com",
      status: "PENDING"
    }
  });

  console.log(`Sending concurrent cancelOrder for Order: ${order.id}`);

  const admin = { id: 'admin1', email: 'admin@b.c' };
  
  // Execute 5 concurrent cancels on the same order!
  const promises = [];
  for(let i = 0; i < 5; i++) {
    promises.push(adminOrderService.cancelOrder(order.id, admin).catch(e => `Failed: ${e.message}`));
  }

  const results = await Promise.all(promises);
  console.log('Results:', results);

  const finalUser = await db.user.findUnique({ where: { id: userId } });
  console.log(`Final balance: ${finalUser?.balance}`);
  if (finalUser?.balance !== 1000) { 
     console.log(`[FATAL] Double-credit logic bypassed! Balance is ${finalUser?.balance}, expected 1000.`);
  } else {
     console.log(`[SUCCESS] Double-credit idempotency protected.`);
  }

  // Cleanup
  await db.order.delete({ where: { id: order.id } });
  await db.service.delete({ where: { id: service.id } });
  await db.user.delete({ where: { id: userId } });
}

testDoubleCredit().catch(e => console.error("CRASHED:", e));
