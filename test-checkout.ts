import { PrismaClient } from '@prisma/client';
import { checkoutAction } from './src/actions/order/checkout';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Executing Checkout Auto-Auth Flow Test ---');
  
  // 1. Get any active service
  const service = await prisma.service.findFirst({ where: { isActive: true } });
  if (!service) {
      console.error('No service found.');
      return;
  }
  
  console.log(`Selected Service: ${service.name} (Min: ${service.minQty})`);
  
  // 2. Mock inputs
  const payload = {
      serviceId: service.id,
      link: 'https://t.me/durov',
      quantity: service.minQty || 100,
      email: 'test_auto_auth@smmplan.ru',
      gateway: 'test_gateway' // We might get a provider error but the user creation happens first!
  };
  
  // 3. Run action
  console.log(`Running checkoutAction for ${payload.email}...`);
  try {
     const result = await checkoutAction(payload);
     console.log('--- Checkout Result ---');
     console.log(JSON.stringify(result, null, 2));
     
     // 4. Verify user was created in DB
     const user = await prisma.user.findUnique({ where: { email: payload.email } });
     console.log('--- DB Verification ---');
     if (user) {
         console.log(`SUCCESS! User created automatically. ID: ${user.id}`);
     } else {
         console.log('FAILURE! User was not created.');
     }
     
  } catch (err: any) {
     console.error('Checkout failed exception:', err.message);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
