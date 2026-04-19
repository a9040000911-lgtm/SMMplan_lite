import { adminOrderService } from '@/services/admin/order.service';
import { cancelOrderAction, restartOrderAction } from '@/actions/admin/orders';
import { Card, CardHeader, CardContent, Button as HeroButton } from '@heroui/react';
import Link from 'next/link';
import { OrderClient } from './components/order-client';

export const dynamic = 'force-dynamic';

// Status color mapping
const STATUS_STYLES: Record<string, string> = {
  AWAITING_PAYMENT: 'bg-yellow-100 text-yellow-800',
  PENDING: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  PARTIAL: 'bg-orange-100 text-orange-800',
  CANCELED: 'bg-slate-100 text-slate-500',
  ERROR: 'bg-red-100 text-red-800',
};

const STATUS_LABELS: Record<string, string> = {
  ALL: 'Все',
  AWAITING_PAYMENT: 'Ожидает оплату',
  PENDING: 'В очереди',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Выполнен',
  PARTIAL: 'Частичный',
  CANCELED: 'Отменён',
  ERROR: 'Ошибка',
};

type Props = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    cursor?: string;
  }>;
};

export default async function AdminOrdersPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = params.q || '';
  const statusFilter = params.status || 'ALL';
  const cursor = params.cursor || undefined;

  const { items: orders, nextCursor, hasMore } = await adminOrderService.searchOrders({
    query: query || undefined,
    status: statusFilter,
    cursor,
    pageSize: 50,
  });

  const stats = await adminOrderService.getOrderStats();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">📦 Заказы</h1>
          <p className="text-slate-500 mt-1">
            Всего: {stats.total} • В очереди: {stats.pending} • В работе: {stats.inProgress} • Ошибки: {stats.error}
          </p>
        </div>
        <a
          href={`/api/admin/export?type=orders&status=${statusFilter}&q=${encodeURIComponent(query)}`}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors shadow-sm"
        >
          📥 Экспорт CSV
        </a>
      </div>

      {/* Search + Filters */}
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <form className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="🔍 Поиск: email, ссылка, ID заказа..."
              className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            />
            <select
              name="status"
              defaultValue={statusFilter}
              className="px-4 py-2 text-sm border border-slate-200 rounded-md bg-white"
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <HeroButton type="submit" variant="primary" className="font-medium text-white">Найти</HeroButton>
          </form>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="shadow-sm">
        <CardHeader>
          <h3 className="text-lg font-bold">
            Результаты{query ? ` по запросу "${query}"` : ''} ({orders.length}{hasMore ? '+' : ''})
          </h3>
        </CardHeader>
        <CardContent>
          <OrderClient data={orders as any} />

          {/* Pagination */}
          {(cursor || hasMore) && (
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-200">
              {cursor ? (
                <Link
                  href={`/admin/orders?q=${encodeURIComponent(query)}&status=${statusFilter}`}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
                >
                  ← В начало
                </Link>
              ) : <div />}
              {hasMore && nextCursor && (
                <Link
                  href={`/admin/orders?q=${encodeURIComponent(query)}&status=${statusFilter}&cursor=${nextCursor}`}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors"
                >
                  Следующая →
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
