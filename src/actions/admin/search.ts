'use server';

import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/server/rbac';

export type SearchHit = {
  id: string;
  type: 'USER' | 'ORDER' | 'SERVICE';
  title: string;
  subtitle: string;
  href: string;
};

export async function globalOmniSearch(query: string): Promise<SearchHit[]> {
  const result = await requireAdmin(async (admin) => {
    if (!query || query.length < 2) return [];

    const hits: SearchHit[] = [];
    const qLower = query.toLowerCase();
    
    // 1. Search Users by Email
    if (qLower.includes('@') || qLower.length > 3) {
      const users = await db.user.findMany({
        where: { email: { contains: qLower, mode: 'insensitive' } },
        take: 5
      });
      users.forEach(u => hits.push({
        id: u.id,
        type: 'USER',
        title: u.email,
        subtitle: `Баланс: ${(u.balance / 100).toFixed(2)} ₽ | Роль: ${u.role}`,
        href: `/admin/clients?q=${encodeURIComponent(u.email)}`
      }));
    }

    // 2. Search Orders by numeric ID or external ID
    const numId = parseInt(query.trim(), 10);
    if (!isNaN(numId)) {
      const orders = await db.order.findMany({
        where: {
          OR: [
            { numericId: numId },
            { externalId: query.trim() }
          ]
        },
        take: 5,
        include: { user: true, service: { include: { category: true } } }
      });
      
      orders.forEach(o => hits.push({
        id: o.id,
        type: 'ORDER',
        title: `Заказ #${o.numericId} (API: ${o.externalId || 'Нет'})`,
        subtitle: `${o.service.category.name} - ${o.status}`,
        href: `/admin/orders?edit_order_id=${o.id}`
      }));
    }

    // 3. Search Services by Name
    if (isNaN(numId) && qLower.length > 2) {
        const services = await db.service.findMany({
            where: { name: { contains: qLower, mode: 'insensitive' } },
            take: 5,
            include: { category: true }
        });
        services.forEach(s => hits.push({
            id: s.id,
            type: 'SERVICE',
            title: s.name,
            subtitle: `ID: ${s.numericId} | ${s.category.name}`,
            href: `/admin/catalog?service_id=${s.numericId}`
        }));
    }

    return hits;
  });

  return Array.isArray(result) ? result : [];
}
