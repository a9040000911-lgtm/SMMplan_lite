import { db } from '../src/lib/db';

async function testSyncDoubleRefund() {
  const userId = `test_sync_sync_${Date.now()}`;
  
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
      isActive: true
    }
  });

  const order = await db.order.create({
    data: {
      userId,
      serviceId: service.id,
      quantity: 100,
      charge: 1000, // 10 RUB
      providerCost: 10,
      link: "https://test.com",
      status: "IN_PROGRESS",
      remains: 100
    }
  });

  const externalId = 'ext_123';

  // We write the inner logic of sync-worker directly to simulate 2 concurrent sync workers pulling a CANCELED status from the provider
  
  const workerFire = async (workerId: number) => {
    try {
        await db.$transaction(async (tx) => {
            // Re-read inside transaction
            const freshOrder = await tx.order.findUniqueOrThrow({
                where: { id: order.id }
            });

            // If already refunded skip
            if (freshOrder.status === 'CANCELED' || freshOrder.status === 'PARTIAL' || freshOrder.status === 'ERROR') {
                return `Worker ${workerId} skipped`;
            }

            // Simulate Provider says CANCELED
            const refundAmount = freshOrder.charge;

            // Artificial delay to widen the race condition window for our test to prove susceptibility
            // Since Node is single threaded, Prisma queries are sent to postgres. 
            // In a real scenario with distributed workers this sleep isn't needed, but here it helps guarantee T1 and T2 open tx before T1 commits.
            await new Promise(r => setTimeout(r, 50)); 

            await tx.user.update({
                where: { id: freshOrder.userId },
                data: { balance: { increment: refundAmount }, totalSpent: { decrement: refundAmount } }
            });

            await tx.order.update({
                where: { id: order.id },
                data: { status: 'CANCELED' }
            });
            
        return `Worker ${workerId} refunded ${refundAmount}`;
        }, { isolationLevel: 'Serializable' });
    } catch(e: any) {
        return `Worker ${workerId} error: ${e.message}`;
    }
  };

  console.log(`Firing 2 concurrent sync workers for Order: ${order.id}`);
  
  const p1 = workerFire(1);
  const p2 = workerFire(2);

  const results = await Promise.all([p1, p2]);
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

testSyncDoubleRefund().catch(e => console.error("CRASHED:", e));
