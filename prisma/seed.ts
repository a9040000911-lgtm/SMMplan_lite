import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Database...');

  // 1. System Settings Singleton
  const settings = await prisma.systemSettings.upsert({
    where: { id: 'global' },
    update: {},
    create: {
      id: 'global',
      taxRate: 6.0,
      opexMonthly: 0,
      maintenanceMode: false,
      isTestMode: true,
      siteName: 'Smmplan Lite',
      siteDescription: 'Seeded test environment'
    }
  });
  console.log('Upserted SystemSettings');

  // 2. Default Provider
  const provider = await prisma.provider.upsert({
    where: { name: 'Vexboost' },
    update: {},
    create: {
      name: 'Vexboost',
      apiUrl: 'https://vexboost.com/api/v2',
      apiKey: process.env.VEXBOOST_API_KEY || 'dummy_key',
      isActive: true
    }
  });
  console.log('Upserted Provider Vexboost');

  // 3. Admin User
  const adminRawId = 'admin@smmplan-lite.local';
  const adminUser = await prisma.user.upsert({
    where: { email: adminRawId },
    update: {},
    create: {
      email: adminRawId,
      role: 'ADMIN',
      balance: 1000000 // 10000 RUB
    }
  });
  console.log(`Upserted Admin User: ${adminRawId}`);

  // 4. Sample Category and Service
  let category = await prisma.category.findFirst();
  if (!category) {
    category = await prisma.category.create({
      data: {
        name: 'Instagram Likes',
        platform: 'INSTAGRAM',
        sort: 1
      }
    });
    console.log('Created Category');
  }

  const existingService = await prisma.service.findFirst({
    where: { externalId: "1001" } // Matches mock provider ID
  });

  if (!existingService) {
    await prisma.service.create({
      data: {
        name: 'TEST: Instagram Likes [Instant, Fast]',
        categoryId: category.id,
        rate: 5.0, // 5 RUB provider cost per 1000
        markup: 3.0, // Sell for 15 RUB
        minQty: 100,
        maxQty: 10000,
        externalId: "1001",
        isActive: true
      }
    });
    console.log('Created Mock Service 1001');
  }

  console.log('Seeding Complete ✅');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
