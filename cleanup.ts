import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const SUPPORTED_NETWORKS = ['instagram', 'telegram', 'youtube', 'vk', 'tiktok'];

async function main() {
  console.log('--- Cleaning up VexBoost Garbage Categories ---');
  
  const cats = await prisma.category.findMany({
    include: { network: true, _count: { select: { services: true } } }
  });
  
  const toDelete = cats.filter(c => {
     // Trash terms
     if (c.name.toLowerCase().includes('test')) return true;
     if (c.name.includes('[X]') || c.name.toLowerCase().includes('twitter')) return true;
     if (c.name.toLowerCase().includes('facebook') || c.name.toLowerCase().includes('twitch') || c.name.toLowerCase().includes('kick')) return true;
     if (c.name.toLowerCase().includes('website') || c.name.toLowerCase().includes('traffic')) return true;
     if (c.name.toLowerCase().includes('discord') || c.name.toLowerCase().includes('одноклассники')) return true;
     if (c.name.toLowerCase().includes('wibes')) return true;
     
     // Also delete anything that wasn't mapped to a supported network
     if (!c.networkId || !SUPPORTED_NETWORKS.includes(c.network?.slug || '')) return true;
     
     return false;
  });
  
  console.log(`Found ${toDelete.length} categories to delete.`);
  let deletedServicesCount = 0;
  
  for (const c of toDelete) {
     deletedServicesCount += c._count.services;
     console.log(`Deleting Category: "${c.name}" with ${c._count.services} services.`);
     await prisma.category.delete({ where: { id: c.id } });
  }
  
  console.log(`Cleanup Complete. Deleted ${toDelete.length} categories and ${deletedServicesCount} services.`);
}

main().finally(() => prisma.$disconnect());
