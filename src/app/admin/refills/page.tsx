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
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">🔄 Докрутки</h1>
        <p className="text-slate-500 mt-1">
          Всего: {stats.total} • Ожидают: {stats.pending} • Выполнены: {stats.completed}
        </p>
      </div>

      {/* Filter */}
      <Card className="rounded-2xl border-slate-100/50 shadow-sm bg-white/60 backdrop-blur-xl">
        <CardContent className="pt-6">
          <form className="flex gap-4">
            <select name="status" defaultValue={statusFilter}
              className="px-4 py-2.5 font-medium text-sm border border-slate-200 rounded-lg bg-slate-50/50 text-slate-700 outline-none focus:border-sky-500 transition-colors">
              <option value="ALL">Все статусы</option>
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <button type="submit" className="px-5 py-2.5 text-sm font-semibold text-white bg-sky-500 rounded-lg hover:bg-sky-600 shadow hover:-translate-y-0.5 transition-all">
              Фильтр
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Refills Table */}
      <Card className="rounded-2xl border-slate-100/50 shadow-sm bg-white/60 backdrop-blur-xl overflow-hidden">
        <CardHeader className="py-4 px-6 border-b border-slate-100/50 bg-slate-50/50 rounded-t-2xl">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-800">Заявки на докрутку <span className="text-slate-400 font-medium ml-2 tabular-nums">({refills.length})</span></CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-medium text-slate-700">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-widest text-slate-400 border-b border-slate-100/60 bg-slate-50/30">
                  <th className="py-3.5 px-6 font-bold">Refill ID</th>
                  <th className="py-3.5 px-4 font-bold">Заказ</th>
                  <th className="py-3.5 px-4 font-bold hidden sm:table-cell">Клиент</th>
                  <th className="py-3.5 px-4 font-bold">Услуга</th>
                  <th className="py-3.5 px-4 font-bold hidden md:table-cell">Ссылка</th>
                  <th className="py-3.5 px-4 font-bold text-right">Статус</th>
                  <th className="py-3.5 px-6 font-bold text-right hidden lg:table-cell">Дата</th>
                </tr>
              </thead>
              <tbody>
                {refills.map(r => (
                  <tr key={r.id} className="border-b border-slate-100/30 hover:bg-slate-50/80 even:bg-slate-50/30 transition-colors last:border-0 group">
                    <td className="py-3.5 px-6 font-mono text-xs font-bold text-slate-900 group-hover:text-sky-700 transition-colors">#{r.numericId}</td>
                    <td className="py-3.5 px-4">
                      <Link href={`/admin/orders?q=${r.order.numericId}`}
                        className="text-sky-600 hover:text-sky-800 text-xs font-mono font-bold tracking-tight">
                        #{r.order.numericId}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono tracking-tight text-slate-500 hidden sm:table-cell">{r.order.user.email}</td>
                    <td className="py-3.5 px-4 text-xs font-semibold truncate max-w-[180px] text-slate-800">{r.order.service.name}</td>
                    <td className="py-3.5 px-4 text-xs truncate max-w-[200px] hidden md:table-cell">
                      <a href={r.order.link} target="_blank" rel="noopener noreferrer"
                        className="text-sky-600 hover:text-sky-800 transition-colors" title={r.order.link}>
                        {r.order.link.replace(/^https?:\/\//, '').slice(0, 35)}
                      </a>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold rounded-md border ${
                        r.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        r.status === 'ERROR' || r.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                        'bg-sky-50 text-sky-700 border-sky-100'
                      }`}>
                        {STATUS_LABELS[r.status] || r.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-[11px] tabular-nums text-slate-500 text-right font-medium tracking-wide hidden lg:table-cell">
                      {r.createdAt.toLocaleDateString('ru-RU')}
                    </td>
                  </tr>
                ))}
                {refills.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-medium tracking-wide">Нет заявок на докрутку</td>
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
