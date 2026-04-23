import { db } from '../src/lib/db';

async function main() {
  console.log('--- STARTING TELEGRAM BOT TOCTOU TEST ---\n');

  // Setup test user with exactly 100 RUB (10000 cents)
  const user = await db.user.upsert({
    where: { email: 'toctou_bot@example.com' },
    update: { balance: 10000, totalSpent: 0 },
    create: { email: 'toctou_bot@example.com', balance: 10000, totalSpent: 0 }
  });

  const cat = await db.category.findFirst() || await db.category.create({ data: { name: 'TestCat', sort: 0 } });
  const service = await db.service.findFirst({ where: { name: 'Bot Service' } }) || await db.service.create({
    data: { name: 'Bot Service', categoryId: cat.id, rate: 1.0, markup: 3.0, minQty: 10, maxQty: 10000 }
  });

  const orderCostCents = 10000; // 100 RUB

  console.log(`[+] MOCK: User created. Initial Balance: ${user.balance / 100} RUB`);
  console.log(`[+] Order Cost: ${orderCostCents / 100} RUB`);
  console.log(`[!] Simulating 5 CONCURRENT button clicks in Telegram Bot (order.wizard.ts pattern)...\n`);

  // Emulate the bot's TOCTOU logic
  const emulateBotOrder = async (workerId: parseInt) => {
      // 1. Time-Of-Check (TOC): Read balance from DB
      const u = await db.user.findUnique({ where: { id: user.id } });
      if (!u) return { status: 'failed', reason: 'no_user' };

      // 2. Client-side condition
      if (u.balance < orderCostCents) {
          return { status: 'rejected', workerId, reason: 'Insufficient funds at check' };
      }

      // Add a tiny artificial delay to simulate network lag between 5 concurrent workers
      await new Promise(r => setTimeout(r, 50));

      // 3. Time-Of-Use (TOU): Proceed with initiateOrder / deduction
      // We assume initiateOrder just does a standard transaction deduction
      await db.$transaction(async (tx) => {
         await tx.order.create({
            data: {
              userId: user.id, serviceId: service.id, link: 'https://wa.me/1', quantity: 1000,
              status: 'PENDING', charge: orderCostCents, providerCost: 3000, remains: 1000
            }
         });
         await tx.user.update({
            where: { id: user.id },
            data: { balance: { decrement: orderCostCents } }
         });
      });

      return { status: 'success', workerId };
  };

  // Launch 5 workers in parallel
  const workers = [1, 2, 3, 4, 5].map(id => emulateBotOrder(id));
  const results = await Promise.all(workers);

  results.forEach(r => {
      console.log(`   -> Worker ${r.workerId}: ${r.status.toUpperCase()} ${r.reason ? `(${r.reason})` : ''}`);
  });

  // Verify DB state
  const finalUser = await db.user.findUnique({ where: { id: user.id } });
  const totalOrders = await db.order.count({ where: { userId: user.id } });

  console.log(`\n--- POST-TEST VERIFICATION ---`);
  console.log(`Created Orders: ${totalOrders}`);
  console.log(`Final Balance: ${finalUser!.balance / 100} RUB`);

  if (finalUser!.balance < 0) {
      console.error('\n[FAIL] 🚨 CRITICAL VULNERABILITY (TOCTOU) SUCCESSFUL! Multi-spend occurred!');
      console.error('       The user successfully exploited concurrency to order 5 times and went into negative balance.');
  } else if (finalUser!.balance === 0 && totalOrders === 1) {
      console.log('\n[PASS] System protected. Only one order created.');
  } else {
      console.error('\n[?] Unexpected state.');
  }

  // Cleanup
  await db.order.deleteMany({ where: { userId: user.id } });
}

main().catch(console.error).finally(() => process.exit(0));
