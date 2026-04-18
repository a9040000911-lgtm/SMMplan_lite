import { adminOrderService } from '@/services/admin/order.service';
import { cancelOrderAction, restartOrderAction } from '@/actions/admin/orders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

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
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
        >
          📥 Экспорт CSV
        </a>
      </div>

      {/* Search + Filters */}
      <Card>
        <CardContent className="pt-6">
          <form className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="🔍 Поиск: email, ссылка, ID заказа..."
              className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
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
            <Button type="submit">Найти</Button>
          </form>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Результаты{query ? ` по запросу "${query}"` : ''} ({orders.length}{hasMore ? '+' : ''})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="py-3 px-2 font-medium text-slate-500">ID</th>
                  <th className="py-3 px-2 font-medium text-slate-500">Клиент</th>
                  <th className="py-3 px-2 font-medium text-slate-500">Услуга</th>
                  <th className="py-3 px-2 font-medium text-slate-500">Ссылка</th>
                  <th className="py-3 px-2 font-medium text-slate-500">Кол-во</th>
                  <th className="py-3 px-2 font-medium text-slate-500">Стоимость</th>
                  <th className="py-3 px-2 font-medium text-slate-500">Статус</th>
                  <th className="py-3 px-2 font-medium text-slate-500">Дата</th>
                  <th className="py-3 px-2 font-medium text-slate-500">Действия</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-2 font-mono text-xs text-slate-600">
                      #{order.numericId}
                      {order.externalId && (
                        <span className="block text-[10px] text-slate-400">ext: {order.externalId}</span>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <Link
                        href={`/admin/clients?q=${encodeURIComponent(order.user.email)}`}
                        className="text-indigo-600 hover:underline text-xs"
                      >
                        {order.user.email}
                      </Link>
                    </td>
                    <td className="py-3 px-2 text-xs max-w-[180px] truncate" title={order.service.name}>
                      {order.service.name}
                    </td>
                    <td className="py-3 px-2 text-xs max-w-[200px] truncate">
                      <a
                        href={order.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                        title={order.link}
                      >
                        {order.link.replace(/^https?:\/\//, '').slice(0, 40)}
                      </a>
                    </td>
                    <td className="py-3 px-2 text-xs">
                      {order.quantity.toLocaleString('ru-RU')}
                      {order.remains > 0 && order.status !== 'PENDING' && (
                        <span className="block text-[10px] text-orange-600">
                          ост: {order.remains.toLocaleString('ru-RU')}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-xs">
                      <span className="font-semibold">{(order.charge / 100).toFixed(2)} ₽</span>
                      <span className="block text-[10px] text-slate-400">
                        себ: {(order.providerCost / 100).toFixed(2)} ₽
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-full ${STATUS_STYLES[order.status] || 'bg-slate-100 text-slate-800'}`}>
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                      {order.isDripFeed && (
                        <span className="block text-[10px] text-purple-600 mt-0.5">
                          Drip: {order.currentRun}/{order.runs}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-[11px] text-slate-500 whitespace-nowrap">
                      {order.createdAt.toLocaleDateString('ru-RU')}
                      <br/>
                      {order.createdAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex gap-1">
                        {/* Cancel Button */}
                        {!['COMPLETED', 'CANCELED'].includes(order.status) && (
                          <form action={cancelOrderAction}>
                            <input type="hidden" name="orderId" value={order.id} />
                            <button
                              type="submit"
                              className="px-2 py-1 text-[11px] font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition-colors"
                              title="Отменить и вернуть средства"
                            >
                              ✕
                            </button>
                          </form>
                        )}
                        {/* Restart Button */}
                        {['ERROR', 'CANCELED'].includes(order.status) && (
                          <form action={restartOrderAction}>
                            <input type="hidden" name="orderId" value={order.id} />
                            <button
                              type="submit"
                              className="px-2 py-1 text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                              title="Перезапустить заказ"
                            >
                              ↻
                            </button>
                          </form>
                        )}
                      </div>
                      {order.error && (
                        <p className="text-[10px] text-red-500 mt-1 max-w-[120px] truncate" title={order.error}>
                          {order.error}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      {query ? `Ничего не найдено по запросу "${query}"` : 'Заказов пока нет'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

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
