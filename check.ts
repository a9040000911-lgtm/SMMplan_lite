import { PrismaClient } from '@prisma/client';
import { providerService } from './src/services/providers/provider.service';

const prisma = new PrismaClient();
async function main() {
  const p = await prisma.provider.findFirst();
  if(!p) return;
  const vi = await providerService.getProviderInstance(p);
  const s = await vi.getServices();
  console.log('Sample service:', s[0]);
  
  // also check if "desc", "description" or "details" exist.
  const hasDesc = s.some(x => (x as any).desc || (x as any).description);
  console.log('Has Description field somehow?', hasDesc);
  
}
main().finally(() => prisma.$disconnect());
