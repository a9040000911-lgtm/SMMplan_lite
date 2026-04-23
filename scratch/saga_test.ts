import { db } from '../src/lib/db';

async function testSagaLimbo() {
   console.log('--- START SAGA LIMBO TEST ---');
   
   // Create a dummy user and order
   const user = await db.user.create({ data: { email: 'saga_test_' + Date.now() + '@test.com', balance: 100 } });
   const category = await db.category.create({ data: { name: 'Test Category' } });
   const service = await db.service.create({ 
      data: { name: 'Test Service', numericId: Math.floor(Math.random() * 100000), categoryId: category.id, minQty: 10, maxQty: 1000, rate: 0.1 }
   });

   const order = await db.order.create({
      data: {
         userId: user.id,
         serviceId: service.id,
         link: 'https://test.com',
         quantity: 100,
         charge: 10,
         providerCost: 5,
         status: 'PENDING' // Starts as PENDING
      }
   });

   console.log(`[Before] Order Status: ${order.status}, User Balance: ${user.balance}`);

   // Simulate Worker loop
   try {
      // 1. ATOMIC LOCK
      await db.order.updateMany({
         where: { id: order.id, status: 'PENDING' },
         data: { status: 'PROVISIONING' }
      });

      console.log(`[Lock Acquired] State transitioned to PROVISIONING`);

      // 2. Simulate Provider API Call CRASH (e.g. Network timeout or provider library throw)
      throw new Error('ECONNRESET: External Provider API Timeout');

   } catch (e: any) {
      console.error(`[Worker try/catch block] Caught error: ${e.message}`);
      // In the current code, the catch block just increments 'failed' and does nothing to the DB!
   }

   // Let's check the state in the DB after the worker crashes/exits
   const stuckOrder = await db.order.findUnique({ where: { id: order.id } });
   const stuckUser = await db.user.findUnique({ where: { id: user.id } });

   console.log(`[After] Order Status: ${stuckOrder?.status}, User Balance: ${stuckUser?.balance}`);
   if (stuckOrder?.status === 'PROVISIONING') {
       console.log('--- EXPLOIT/BUG CONFIRMED: Order is in Limbo state! No refund issued, worker will never re-process it! ---');
   }
}

testSagaLimbo().then(() => process.exit(0)).catch(console.error);
