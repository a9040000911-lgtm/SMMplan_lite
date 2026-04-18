import { accountingService } from '@/services/financial/accounting.service';
import { adminOrderService } from '@/services/admin/order.service';
import { adminUserService } from '@/services/admin/user.service';
import { adminTicketService } from '@/services/admin/ticket.service';
import { adminCatalogService } from '@/services/admin/catalog.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

// KPI Card component
function KpiCard({ title, value, subtitle, color = 'indigo', href }: {
  title: string;
  value: string;
  subtitle?: string;
  color?: string;
  href?: string;
}) {
  const colorMap: Record<string, string> = {
    indigo: 'border-l-indigo-500',
    emerald: 'border-l-emerald-500',
    amber: 'border-l-amber-500',
    rose: 'border-l-rose-500',
    purple: 'border-l-purple-500',
    sky: 'border-l-sky-500',
  };

  const content = (
    <div className={`bg-white rounded-lg border border-slate-200 border-l-4 ${colorMap[color] || colorMap.indigo} p-5`}>
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</div>
      <div className="text-2xl font-bold text-slate-900 mt-1">{value}</div>
      {subtitle && <div className="text-xs text-slate-400 mt-1">{subtitle}</div>}
    </div>
  );

  return href ? <Link href={href} className="block hover:shadow-md transition-shadow rounded-lg">{content}</Link> : content;
}

export default async function AdminDashboardPage() {
  // Parallel data loading for performance
  const [metrics, orderStats, userStats, ticketStats, catalogStats, recentAudit] = await Promise.all([
    accountingService.getMetrics(),
    adminOrderService.getOrderStats(),
    adminUserService.getUserStats(),
    adminTicketService.getTicketStats(),
    adminCatalogService.getCatalogStats(),
    db.adminAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  // Alert conditions
  const alerts: { text: string; severity: 'critical' | 'warning' | 'info' }[] = [];

  if (orderStats.error > 0) {
    alerts.push({ text: `❌ ${orderStats.error} заказов с ошибкой — требуется внимание`, severity: 'critical' });
  }
  if (ticketStats.open > 10) {
    alerts.push({ text: `⚠️ ${ticketStats.open} открытых тикетов — очередь растёт`, severity: 'warning' });
  }
  if (metrics.marginPercentage < 20 && metrics.revenueNet > 0) {
    alerts.push({ text: `📉 Маржинальность ${metrics.marginPercentage.toFixed(1)}% — ниже 20% порога`, severity: 'warning' });
  }
  if (userStats.totalLiability > metrics.revenueGross && metrics.revenueGross > 0) {
    alerts.push({ text: `🏦 Liability (${(userStats.totalLiability / 100).toLocaleString('ru-RU')} ₽) > Cash Flow — кассовый разрыв`, severity: 'critical' });
  }
  if (alerts.length === 0) {
    alerts.push({ text: '✅ Все системы работают нормально', severity: 'info' });
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight">📊 Дашборд</h1>

      {/* Alerts */}
      <div className="space-y-2">
        {alerts.map((alert, i) => (
          <div
            key={i}
            className={`px-4 py-3 rounded-lg text-sm font-medium ${
              alert.severity === 'critical' ? 'bg-red-50 text-red-800 border border-red-200' :
              alert.severity === 'warning' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
              'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}
          >
            {alert.text}
          </div>
        ))}
      </div>

      {/* Financial KPIs */}
      <div>
        <h2 className="text-lg font-semibold text-slate-700 mb-3">💰 Финансы</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            title="Cash Flow (Оборот)"
            value={`${(metrics.revenueGross / 100).toLocaleString('ru-RU')} ₽`}
            color="emerald"
            href="/admin/finance"
          />
          <KpiCard
            title="COGS (Провайдеры)"
            value={`${(metrics.cogs / 100).toLocaleString('ru-RU')} ₽`}
            color="rose"
          />
          <KpiCard
            title="Чистая прибыль"
            value={`${(metrics.profitNet / 100).toLocaleString('ru-RU')} ₽`}
            subtitle={`Маржа: ${metrics.marginPercentage.toFixed(1)}%`}
            color={metrics.profitNet > 0 ? 'emerald' : 'rose'}
          />
          <KpiCard
            title="Liability"
            value={`${(userStats.totalLiability / 100).toLocaleString('ru-RU')} ₽`}
            subtitle="Сумма балансов клиентов"
            color="amber"
          />
        </div>
      </div>

      {/* Operational KPIs */}
      <div>
        <h2 className="text-lg font-semibold text-slate-700 mb-3">📈 Операционные показатели</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            title="Заказы"
            value={orderStats.total.toLocaleString('ru-RU')}
            subtitle={`В работе: ${orderStats.inProgress} • В очереди: ${orderStats.pending}`}
            color="indigo"
            href="/admin/orders"
          />
          <KpiCard
            title="Клиенты"
            value={userStats.total.toLocaleString('ru-RU')}
            subtitle={`Активные: ${userStats.active} • Забанены: ${userStats.banned}`}
            color="sky"
            href="/admin/clients"
          />
          <KpiCard
            title="Тикеты"
            value={ticketStats.open.toString()}
            subtitle={`Открытых из ${ticketStats.total}`}
            color={ticketStats.open > 5 ? 'rose' : 'emerald'}
            href="/admin/tickets"
          />
          <KpiCard
            title="Каталог"
            value={`${catalogStats.activeServices}/${catalogStats.totalServices}`}
            subtitle={`Категорий: ${catalogStats.categories}`}
            color="purple"
            href="/admin/catalog"
          />
        </div>
      </div>

      {/* Recent Admin Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🕑 Последние действия персонала</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentAudit.map(log => (
              <div key={log.id} className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded text-xs border border-slate-100">
                <div>
                  <span className="font-semibold text-slate-700">{log.action}</span>
                  <span className="text-slate-500 ml-2">{log.targetType}: {log.target.slice(0, 12)}...</span>
                </div>
                <div className="text-slate-400 text-right shrink-0 ml-4">
                  <div className="font-medium">{log.adminEmail}</div>
                  <div>{log.createdAt.toLocaleString('ru-RU')}</div>
                </div>
              </div>
            ))}
            {recentAudit.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">Нет записей аудита</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
