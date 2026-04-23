export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';

const STAFF_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'SUPPORT'];

function toCsv(headers: string[], rows: string[][]): string {
  const escape = (val: string) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const headerLine = headers.map(escape).join(',');
  const dataLines = rows.map(row => row.map(escape).join(','));
  return [headerLine, ...dataLines].join('\n');
}

export async function GET(request: Request) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || !STAFF_ROLES.includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'orders';

  try {
    let csv = '';
    let filename = 'export.csv';

    switch (type) {
      case 'orders': {
        const status = searchParams.get('status');
        const where: Record<string, unknown> = {};
        if (status && status !== 'ALL') where.status = status;

        const orders = await db.order.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: 5000,
          include: {
            user: { select: { email: true } },
            service: { select: { name: true } },
          },
        });

        csv = toCsv(
          ['ID', 'Email', 'Услуга', 'Ссылка', 'Кол-во', 'Остаток', 'Стоимость ₽', 'Себестоимость ₽', 'Статус', 'Дата'],
          orders.map(o => [
            String(o.numericId),
            o.user.email,
            o.service.name,
            o.link,
            String(o.quantity),
            String(o.remains),
            (o.charge / 100).toFixed(2),
            (o.providerCost / 100).toFixed(2),
            o.status,
            o.createdAt.toISOString(),
          ])
        );
        filename = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
        break;
      }

      case 'users': {
        const users = await db.user.findMany({
          orderBy: { createdAt: 'desc' },
          take: 5000,
          include: { _count: { select: { orders: true } } },
        });

        csv = toCsv(
          ['Email', 'Роль', 'Баланс ₽', 'LTV ₽', 'Заказов', 'Telegram ID', 'Регистрация'],
          users.map(u => [
            u.email,
            u.role,
            (u.balance / 100).toFixed(2),
            (u.totalSpent / 100).toFixed(2),
            String(u._count.orders),
            u.telegramId || '',
            u.createdAt.toISOString(),
          ])
        );
        filename = `users_${new Date().toISOString().slice(0, 10)}.csv`;
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown export type: ${type}` }, { status: 400 });
    }

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[CSV Export] Error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}

