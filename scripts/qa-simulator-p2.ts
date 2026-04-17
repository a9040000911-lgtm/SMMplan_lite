import { db } from '../src/lib/db';
import crypto from 'crypto';

// Reusable assert utility
function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERT FAILED: ${message}`);
    process.exit(1);
  }
}

async function simulatePillar1Webhooks() {
  console.log('\n--- 🧪 SIMULATING: WEBHOOK & IDEMPOTENCY ---');
  // 1. Create User & Payment
  console.log('1. Setting up User & Pending Payment (500 RUB -> 50000 Cents)');
  const user = await db.user.create({
    data: { email: `webhook_test_${Date.now()}@test.com`, role: 'USER' }
  });
  
  const payment = await db.payment.create({
    data: {
      userId: user.id,
      amount: 50000, // 500.00
      gatewayId: `invoice_${Date.now()}`
    }
  });

  const payload = JSON.stringify({
    update_type: 'invoice_paid',
    payload: { invoice_id: payment.gatewayId }
  });

  // CryptoBot Signature Generation
  const token = process.env.CRYPTO_BOT_TOKEN || 'test_token';
  const secret = crypto.createHash('sha256').update(token).digest();
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  // We invoke the webhook logic (simulate POST)
  const { POST } = require('../src/app/api/webhooks/crypto/route');

  // Attempt 1: Successful webhook
  console.log('2. Firing Webhook Attempt 1...');
  const req1 = new Request('http://localhost:3000/api/webhooks/crypto', {
    method: 'POST',
    headers: { 'crypto-pay-api-signature': signature },
    body: payload
  });
  const res1 = await POST(req1);
  assert(res1.status === 200, 'Webhook Attempt 1 failed');
  
  const uCheck1 = await db.user.findUnique({ where: { id: user.id } });
  assert(uCheck1?.balance === 50000, `Balance should be 50000, got ${uCheck1?.balance}`);
  console.log('✅ Webhook correctly credited 50000 Cents.');

  // Attempt 2: Double-spend attack
  console.log('3. Firing Webhook Attempt 2 (Idempotency Simulation)...');
  const req2 = new Request('http://localhost:3000/api/webhooks/crypto', {
    method: 'POST',
    headers: { 'crypto-pay-api-signature': signature },
    body: payload
  });
  await POST(req2);
  
  const uCheck2 = await db.user.findUnique({ where: { id: user.id } });
  assert(uCheck2?.balance === 50000, `Balance must remain 50000 to prevent double-spending. Got ${uCheck2?.balance}`);
  console.log('✅ Idempotency atomic lock successfully blocked double-spend.');
}

async function simulatePillar2Affiliate() {
  console.log('\n--- 🧪 SIMULATING: AFFILIATE MARGIN CALCULATOR ---');
  
  const referrer = await db.user.create({
    data: { email: `referrer_${Date.now()}@test.com`, role: 'USER' }
  });

  const referral = await db.user.create({
    data: { 
      email: `referral_${Date.now()}@test.com`, 
      role: 'USER',
      balance: 10000, // 100 RUB
      referredById: referrer.id
    }
  });

  const category = await db.category.create({
    data: { name: 'Test', platform: 'TEST' }
  });

  // Create Service with 3.0 Markup (3x)
  // Provider cost is e.g. 5.00 Rubles -> Charge should be 15.00 Rubles
  const service = await db.service.create({
    data: {
      name: 'Affiliate Test Service',
      categoryId: category.id,
      rate: 5.0, // 5 RUB
      markup: 3.0 // 300%
    }
  });

  const { checkoutCore } = require('../src/actions/order/checkout');

  console.log('1. Ordering as a Referred User (1000 quantity)...');
  const orderId = await checkoutCore(referral.id, service.id, 'https://test.com', 1000);

  const order = (await db.order.findUnique({ where: { id: orderId.orderId } }))!;
  
  // Math: 1000 qty
  // Provider Cost (rate = 5.0). 1000 qty / 1000 = 1. Total cost = 5.00 = 500 Cents.
  // Charge (profit = 3.0x). 5.00 * 3.0 = 15.00 = 1500 Cents.
  // Net Profit: 1500 - 500 = 1000 Cents.
  // 5% Commission of Net Profit: 1000 * 0.05 = 50 Cents.
  assert(order.charge === 1500, `Expected charge 1500 cents, got ${order.charge}`);
  assert(order.providerCost === 500, `Expected providerCost 500 cents, got ${order.providerCost}`);

  const commission = await db.commission.findFirst({
    where: { orderId: order.id }
  });

  assert(commission !== null, `Commission was not created`);
  assert(commission?.amount === 50, `Expected commission 50 cents, got ${commission?.amount}`);
  assert(commission?.status === 'PENDING', `Commission should be PENDING`);

  console.log('✅ Affiliate system calculated exactly 50 Cents (5% of 1000 Net Profit).');
}

async function simulatePillar3CatalogSync() {
  console.log('\n--- 🧪 SIMULATING: PROVIDER CATALOG SYNC ---');

  const category = await db.category.create({
    data: { name: 'Catalog Sync', platform: 'SYNC' }
  });

  // Internal matched service (Active in our DB, maps to externalId: "999")
  const localService = await db.service.create({
    data: {
      name: 'Vexboost Fake',
      categoryId: category.id,
      rate: 1.0,
      markup: 2.0,
      externalId: '999',
      isActive: true
    }
  });

  // Mock Provider implementation that SIMULATES externalId 999 being DELETED at the provider
  jestMockProvider(); 

  const { GET } = require('../src/app/api/workers/sync-catalog/route');
  
  const req = new Request('http://localhost:3000/api/workers/sync-catalog', {
    headers: { 'authorization': `Bearer ${process.env.CRON_SECRET || 'dev_secret'}` }
  });
  
  console.log('1. Firing Catalog Sync (Simulating Provider missing ID 999)...');
  const res = await GET(req);
  const data = await res.json();
  
  assert(res.status === 200, 'Sync worker failed');
  assert(data.details.disabledMissingServices === 1, 'Sync worker did not report a disablement');

  const verifyService = await db.service.findUnique({ where: { id: localService.id } });
  assert(verifyService?.isActive === false, 'Service was not disabled in the DB');
  
  console.log('✅ Catalog Sync correctly detected missing service and isolated it by flipping isActive to false.');
}

// Very simple Mock Injector
function jestMockProvider() {
  const { providerService } = require('../src/services/providers/provider.service');
  providerService.getDefaultProvider = async () => {
    return {
      getServices: async () => {
         // Deliberately empty! Service '999' is missing from the provider.
         return [];
      }
    }
  }
}

async function runAudit() {
  console.log('🛡️ INITIATING PHASE 2.3 HOLISTIC QA 🛡️');
  await simulatePillar1Webhooks();
  await simulatePillar2Affiliate();
  await simulatePillar3CatalogSync();
  console.log('\n🏁 ALL TESTS PASSED. BACKEND IS PRODUCTION GRADE.');
  process.exit(0);
}

runAudit().catch(e => {
  console.error(e);
  process.exit(1);
});
