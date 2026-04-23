import { db } from "@/lib/db";
import { verifySession } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const session = await verifySession();
  if (!session) redirect("/login");

  const orders = await db.order.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { service: true }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'ERROR':
      case 'CANCELED': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'PENDING':
      case 'AWAITING_PAYMENT': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'IN_PROGRESS':
      case 'PROVISIONING': return 'bg-sky-50 text-sky-700 border-sky-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Мои заказы</h1>
        <p className="text-zinc-500 mt-1">История ваших заказов и их текущий статус.</p>
      </div>

      <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-sm font-medium text-slate-700">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-widest text-slate-400 bg-slate-50/50 border-b border-zinc-200">
              <th className="py-3.5 px-4 font-bold">ID</th>
              <th className="py-3.5 px-4 font-bold">Услуга</th>
              <th className="py-3.5 px-4 font-bold">Ссылка / Кол-во</th>
              <th className="py-3.5 px-4 font-bold text-right">Сумма (₽)</th>
              <th className="py-3.5 px-4 font-bold">Статус</th>
              <th className="py-3.5 px-4 font-bold text-right">Дата</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-slate-100/30 hover:bg-slate-50/50 transition-colors last:border-0">
                <td className="py-3 px-4 font-mono text-xs text-slate-500">#{order.numericId}</td>
                <td className="py-3 px-4">
                  <div className="font-semibold text-slate-900 line-clamp-2 max-w-[200px]" title={order.service.name}>
                    {order.service.name}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex flex-col gap-1">
                    <a href={order.link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs max-w-[150px] truncate" title={order.link}>
                      {order.link}
                    </a>
                    <span className="text-xs text-slate-500">{order.quantity.toLocaleString('ru-RU')} шт.</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right font-semibold text-slate-900">
                  {(order.charge / 100).toFixed(2)}
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold rounded-md border ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                  {order.error && (
                    <div className="text-[10px] text-rose-500 mt-1 max-w-[150px] line-clamp-1" title={order.error}>{order.error}</div>
                  )}
                </td>
                <td className="py-3 px-4 text-right text-xs text-slate-500 whitespace-nowrap">
                  {order.createdAt.toLocaleDateString("ru-RU", { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && (
          <div className="p-12 text-center text-zinc-500 text-sm">
            У вас пока нет заказов. Выберите услугу во вкладке "Новый заказ".
          </div>
        )}
      </div>
    </div>
  );
}
