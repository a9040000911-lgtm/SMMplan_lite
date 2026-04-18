import { db } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-red-100 text-red-800',
  ERROR: 'bg-rose-100 text-rose-700',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ожидает',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Выполнен',
  REJECTED: 'Отклонён',
  ERROR: 'Ошибка',
};

type Props = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminRefillsPage({ searchParams }: Props) {
  const params = await searchParams;
  const statusFilter = params.status || 'ALL';

  const where: Record<string, unknown> = {};
  if (statusFilter !== 'ALL') {
    where.status = statusFilter;
  }

  const refills = await db.refill.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      order: {
        select: {
          numericId: true,
          link: true,
          quantity: true,
          user: { select: { email: true } },
          service: { select: { name: true } },
        },
      },
    },
  });

  const stats = {
    total: await db.refill.count(),
    pending: await db.refill.count({ where: { status: 'PENDING' } }),
    completed: await db.refill.count({ where: { status: 'COMPLETED' } }),
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">🔄 Докрутки</h1>
        <p className="text-slate-500 mt-1">
          Всего: {stats.total} • Ожидают: {stats.pending} • Выполнены: {stats.completed}
        </p>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-6">
          <form className="flex gap-4">
            <select name="status" defaultValue={statusFilter}
              className="px-4 py-2 text-sm border border-slate-200 rounded-md bg-white">
              <option value="ALL">Все статусы</option>
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
              Фильтр
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Refills Table */}
      <Card>
        <CardHeader>
          <CardTitle>Заявки на докрутку ({refills.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="py-3 px-2 font-medium text-slate-500">Refill ID</th>
                  <th className="py-3 px-2 font-medium text-slate-500">Заказ</th>
                  <th className="py-3 px-2 font-medium text-slate-500">Клиент</th>
                  <th className="py-3 px-2 font-medium text-slate-500">Услуга</th>
                  <th className="py-3 px-2 font-medium text-slate-500">Ссылка</th>
                  <th className="py-3 px-2 font-medium text-slate-500">Статус</th>
                  <th className="py-3 px-2 font-medium text-slate-500">Дата</th>
                </tr>
              </thead>
              <tbody>
                {refills.map(r => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-2 font-mono text-xs text-slate-600">#{r.numericId}</td>
                    <td className="py-3 px-2">
                      <Link href={`/admin/orders?q=${r.order.numericId}`}
                        className="text-indigo-600 hover:underline text-xs font-mono">
                        #{r.order.numericId}
                      </Link>
                    </td>
                    <td className="py-3 px-2 text-xs">{r.order.user.email}</td>
                    <td className="py-3 px-2 text-xs truncate max-w-[180px]">{r.order.service.name}</td>
                    <td className="py-3 px-2 text-xs truncate max-w-[200px]">
                      <a href={r.order.link} target="_blank" rel="noopener noreferrer"
                        className="text-blue-600 hover:underline" title={r.order.link}>
                        {r.order.link.replace(/^https?:\/\//, '').slice(0, 35)}
                      </a>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-full ${STATUS_STYLES[r.status] || 'bg-slate-100'}`}>
                        {STATUS_LABELS[r.status] || r.status}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-xs text-slate-500">
                      {r.createdAt.toLocaleDateString('ru-RU')}
                    </td>
                  </tr>
                ))}
                {refills.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">Нет заявок на докрутку</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
