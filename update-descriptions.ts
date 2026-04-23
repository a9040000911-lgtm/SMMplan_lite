import { PrismaClient } from '@prisma/client';
import { providerService } from './src/services/providers/provider.service';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Updating Descriptions from VexBoost ---');
  
  const p = await prisma.provider.findFirst();
  if(!p) return;
  const vi = await providerService.getProviderInstance(p);
  const services = await vi.getServices();
  
  let updatedCount = 0;
  
  for(const s of services) {
     const desc = (s as any).description || null;
     if(desc) {
        const externalId = s.service.toString();
        const res = await prisma.service.updateMany({
           where: { externalId },
           data: { description: desc }
        });
        if(res.count > 0) updatedCount++;
     }
  }
  
  console.log(`Updated descriptions for ${updatedCount} services.`);
}

main().finally(() => prisma.$disconnect());
