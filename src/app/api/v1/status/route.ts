import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyB2BKey } from '@/lib/b2b-auth';

// Mapping internal statuses to standard SMM API status strings
const statusMap: Record<string, string> = {
  'AWAITING_PAYMENT': 'Pending',
  'PENDING': 'Pending',
  'IN_PROGRESS': 'In progress',
  'COMPLETED': 'Completed',
  'PARTIAL': 'Partial',
  'CANCELED': 'Canceled',
  'ERROR': 'Fail'
};

function mapInternalStatus(internal: string) {
  return statusMap[internal] || 'Pending';
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const action = formData.get('action');
    const key = formData.get('key');

    if (action !== 'status') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const user = await verifyB2BKey(key?.toString());
    if (!user) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const orderIdStr = formData.get('order')?.toString();
    const ordersStr = formData.get('orders')?.toString(); // Comma separated

    if (orderIdStr) {
      // Single status query
      const order = await db.order.findUnique({
        where: { id: orderIdStr }
      });

      if (!order || order.userId !== user.id) {
        return NextResponse.json({ error: 'Incorrect order ID' });
      }

      return NextResponse.json({
        charge: (order.charge / 100).toFixed(4),    // Back to floating for B2B API specs
        start_count: 0,                             // Not tracked currently internally
        status: mapInternalStatus(order.status),
        remains: order.remains,
        currency: 'RUB'
      });
    }

    if (ordersStr) {
      // Multiple status query
      const ids = ordersStr.split(',').map(s => s.trim()).filter(s => s);
      const orders = await db.order.findMany({
        where: {
          id: { in: ids },
          userId: user.id
        }
      });

      const resultMap: Record<string, any> = {};
      
      // Init missing with err
      for (const id of ids) {
        resultMap[id] = { error: 'Incorrect order ID' };
      }

      for (const order of orders) {
        resultMap[order.id] = {
          charge: (order.charge / 100).toFixed(4),
          start_count: 0,
          status: mapInternalStatus(order.status),
          remains: order.remains,
          currency: 'RUB'
        };
      }

      return NextResponse.json(resultMap);
    }

    return NextResponse.json({ error: 'Missing order parameter' }, { status: 400 });

  } catch (error) {
    console.error('B2B API Status Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
