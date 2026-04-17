import { db } from '../src/lib/db';
import { checkoutCore } from '../src/actions/order/checkout';
import { marketingService } from '../src/services/marketing.service';

async function runValidations() {
  console.log("==================================================");
  console.log("🚀 STARTING SMMPLAN LITE BACKEND SIMULATOR");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Arrange Data
  let testUser: any = null;
  let testTierUser: any = null;
  let testCategory: any = null;
  let testService: any = null;

  try {
    testUser = await db.user.create({
      data: {
        email: `test_${Date.now()}@example.com`,
        balance: 100_00, // 100 RUB
      }
    });
    
    testTierUser = await db.user.create({
      data: {
        email: `platinum_${Date.now()}@example.com`,
        balance: 1000_00, // 1000 RUB
        totalSpent: 150_000_00 // Platinum tier (>100k)
      }
    });

    testCategory = await db.category.create({
      data: { name: 'Test Cat', platform: 'INSTAGRAM' }
    });

    testService = await db.service.create({
      data: {
        name: 'Test Service',
        categoryId: testCategory.id,
        rate: 5.0, // 5 RUB provider cost per 1000
        markup: 3.0, // 300% -> 15 RUB base price per 1000
        minQty: 100,
        maxQty: 10000
      }
    });

    console.log("--- 1. Data Arranged ---");

    // 2. Test Marketing & Margin Math
    const priceRes1 = await marketingService.calculatePrice(testUser.id, testService.id, 1000);
    // 5 rate per 1000 * 3.0 markup = 15 RUB original. Quantity 1000 => 15 RUB = 1500 Cents.
    assert(priceRes1.totalCents === 1500, "Base price calculation integer math is precise (1500 Cents).");
    assert(priceRes1.providerCostCents === 500, "Provider cost extracted exactly (500 Cents).");

    const priceRes2 = await marketingService.calculatePrice(testTierUser.id, testService.id, 1000);
    // Platinum = 15% discount. 1500 * 0.15 = 225. 1500 - 225 = 1275 Cents.
    assert(priceRes2.totalCents === 1275, "Volume tier math applied correctly (1275 Cents).");
    
    // 3. Test Checkout Concurrency & Balance Validation
    console.log("--- 2. Simulating Race Condition ---");
    // testUser has 100_00 (100 RUB). We try to buy 10 orders of 1000 quantity (15 RUB each).
    // Total cost = 150 RUB. So the user can afford exactly floor(100/15) = 6 orders.
    // We launch 10 request PROMISES simultaneously.
    const promises = [];
    for(let i=0; i<10; i++) {
        promises.push(checkoutCore(testUser.id, testService.id, "http://test", 1000).catch(e => e.message));
    }
    
    const results = await Promise.all(promises);
    let successCount = 0;
    let nsfCount = 0;
    
    for (const res of results) {
        if (typeof res === 'object' && res.success) successCount++;
        if (res === 'INSUFFICIENT_FUNDS') nsfCount++;
    }
    
    assert(successCount === 6, `Race condition prevented: exactly 6 orders succeeded out of 10 (got ${successCount}).`);
    assert(nsfCount === 4, `NSF caught correctly: exactly 4 failed (got ${nsfCount}).`);
    
    // Check resulting balance
    const userAfter = await db.user.findUnique({ where: { id: testUser.id }});
    // 10000 cents - (6 * 1500) = 10000 - 9000 = 1000
    assert(userAfter?.balance === 1000, `Balance integer math exact: 1000 cents remaining (got ${userAfter?.balance}).`);
    assert(userAfter?.totalSpent === 9000, `Total spent incremented correctly: 9000 (got ${userAfter?.totalSpent}).`);

  } catch (error) {
    console.error("CRITICAL TEST FAILURE:", error);
    failed++;
  } finally {
    // 4. Cleanup
    console.log("--- 3. Cleanup ---");
    if (testService) await db.service.delete({ where: { id: testService.id }});
    if (testCategory) await db.category.delete({ where: { id: testCategory.id }});
    if (testUser) await db.user.delete({ where: { id: testUser.id }});
    if (testTierUser) await db.user.delete({ where: { id: testTierUser.id }});
    // Cleanup generated orders from test user
    if (testUser) await db.order.deleteMany({ where: { userId: testUser.id }});
  }

  console.log("==================================================");
  if (failed === 0) {
    console.log(`✅ ALL ${passed} TESTS PASSED PERFECTLY`);
  } else {
    console.log(`❌ ${failed} TESTS FAILED. ${passed} PASSED.`);
  }
}

runValidations().catch(console.error).finally(() => process.exit(0));
