import { PrismaClient } from '@prisma/client';
import { VexboostProvider } from './src/services/providers/vexboost.provider';
import { CryptoService } from './src/lib/crypto';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

const API_KEY = 'XIXeUVGftzSXwAg8pbBJERcJpMmrg9qujHHM3y95xYvB3Q9VMnAHGYtpGnta';
const API_URL = 'https://vexboost.ru/api/v2';
const DEFAULT_MARKUP = 3.0; // 300%

// Map VexBoost category keywords to our platforms
const getPlatformFromCategory = (name: string): string | null => {
  const n = name.toLowerCase();
  if (n.includes('instagram')) return 'INSTAGRAM';
  if (n.includes('telegram')) return 'TELEGRAM';
  if (n.includes('youtube')) return 'YOUTUBE';
  if (n.includes('vk') || n.includes('вконтакте')) return 'VK';
  if (n.includes('tiktok')) return 'TIKTOK';
  return null;
};

async function main() {
  console.log('--- VexBoost Seeder Started ---');
  
  // 1. Create or Update Provider
  let provider = await prisma.provider.findUnique({ where: { name: 'VexBoost' } });
  const encryptedKey = CryptoService.encrypt(API_KEY);
  
  if (!provider) {
    provider = await prisma.provider.create({
      data: {
        name: 'VexBoost',
        apiUrl: API_URL,
        apiKey: encryptedKey,
        isActive: true,
      }
    });
    console.log(`Created Provider: VexBoost (ID: ${provider.id})`);
  } else {
    provider = await prisma.provider.update({
      where: { id: provider.id },
      data: { apiUrl: API_URL, apiKey: encryptedKey, isActive: true }
    });
    console.log(`Updated Provider: VexBoost (ID: ${provider.id})`);
  }

  // 2. Fetch Services
  console.log(`Fetching services from ${API_URL}...`);
  const vexboost = new VexboostProvider({
    ...provider,
    apiKey: API_KEY // Use raw key for instantiate since the provider expects it
  });
  
  const services = await vexboost.getServices();
  if (!Array.isArray(services) || services.length === 0) {
    console.error('No services returned or invalid format. Array expected.');
    return;
  }
  
  console.log(`Received ${services.length} services from VexBoost.`);
  
  // 3. Extract Unique Categories and Group
  const categoriesMap = new Map<string, any[]>();
  for (const s of services) {
    if (!categoriesMap.has(s.category)) {
      categoriesMap.set(s.category, []);
    }
    categoriesMap.get(s.category)!.push(s);
  }
  
  console.log(`Found ${categoriesMap.size} unique categories.`);
  
  // 4. Create Categories and Services in DB
  let createdServices = 0;
  
  for (const [catName, catServices] of categoriesMap.entries()) {
    // Upsert Network/Platform if we matched one
    const platformStr = getPlatformFromCategory(catName);
    let networkId: string | undefined;
    
    if (platformStr) {
      let network = await prisma.network.findFirst({ where: { name: platformStr } });
      if (!network) {
         network = await prisma.network.create({
           data: { name: platformStr, slug: platformStr.toLowerCase(), isActive: true }
         });
      }
      networkId = network.id;
    }
    
    // Create or find category
    let category = await prisma.category.findFirst({ where: { name: catName } });
    if (!category) {
      category = await prisma.category.create({
        data: {
          name: catName,
          networkId: networkId || undefined,
          sort: 0,
        }
      });
      console.log(`Created Category: ${catName}`);
    }
    
    // Create services
    for (const s of catServices) {
      const externalId = s.service.toString();
      const rawRate = typeof s.rate === 'string' ? parseFloat(s.rate) : s.rate;
      
      const existingService = await prisma.service.findFirst({
         where: { externalId }
      });
      
      if (!existingService) {
        await prisma.service.create({
          data: {
            name: s.name,
            numericId: parseInt(externalId, 10) + 10000, // offset to avoid conflict with existing local testing ones
            externalId,
            categoryId: category.id,
            providerId: provider.id,
            rate: rawRate || 0,
            markup: DEFAULT_MARKUP,
            minQty: parseInt(s.min, 10) || 10,
            maxQty: parseInt(s.max, 10) || 100000,
            isActive: true,
            lastSeenAt: new Date(),
          }
        });
        createdServices++;
      } else {
        // Update rate just in case
        await prisma.service.update({
           where: { id: existingService.id },
           data: { rate: rawRate || 0, name: s.name }
        });
      }
    }
  }
  
  console.log(`--- Sync Complete! Added ${createdServices} new services. ---`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
