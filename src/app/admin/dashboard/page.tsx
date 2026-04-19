import { accountingService } from '@/services/financial/accounting.service';
import { adminOrderService } from '@/services/admin/order.service';
import { adminUserService } from '@/services/admin/user.service';
import { adminTicketService } from '@/services/admin/ticket.service';
import { adminCatalogService } from '@/services/admin/catalog.service';
import { Card, CardHeader, CardContent } from '@heroui/react';
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
  const colorConfigs: Record<string, { bg: string, text: string, decoration: string, shadow: string }> = {
    indigo: { bg: 'from-indigo-500/5 to-transparent', text: 'text-indigo-600', decoration: 'bg-indigo-500', shadow: 'shadow-indigo-500/10' },
    emerald: { bg: 'from-emerald-500/5 to-transparent', text: 'text-emerald-600', decoration: 'bg-emerald-500', shadow: 'shadow-emerald-500/10' },
    amber: { bg: 'from-amber-500/5 to-transparent', text: 'text-amber-600', decoration: 'bg-amber-500', shadow: 'shadow-amber-500/10' },
    rose: { bg: 'from-rose-500/5 to-transparent', text: 'text-rose-600', decoration: 'bg-rose-500', shadow: 'shadow-rose-500/10' },
    purple: { bg: 'from-purple-500/5 to-transparent', text: 'text-purple-600', decoration: 'bg-purple-500', shadow: 'shadow-purple-500/10' },
    sky: { bg: 'from-sky-500/5 to-transparent', text: 'text-sky-600', decoration: 'bg-sky-500', shadow: 'shadow-sky-500/10' },
  };

  const config = colorConfigs[color] || colorConfigs.indigo;

  const content = (
    <Card className={`rounded-none relative overflow-hidden border border-slate-100 shadow-sm ${config.shadow} hover:shadow-md transition-all duration-300 group`}>
      {/* Soft gradient blob */}
      <div className={`absolute -inset-1 bg-gradient-to-br ${config.bg} opacity-50 group-hover:opacity-100 transition-opacity duration-500`} />
      {/* Top accent line */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${config.decoration}`} />
      
      <div className="p-6 relative z-10 flex flex-col h-full bg-white/40 backdrop-blur-3xl">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</div>
        <div className={`text-2xl lg:text-3xl font-extrabold tracking-tight tabular-nums ${config.text} mb-2 mt-auto`}>{value}</div>
        {subtitle && <div className="text-xs font-medium text-slate-500 truncate">{subtitle}</div>}
      </div>
    </Card>
  );

  return href ? <Link href={href} className="block group cursor-pointer">{content}</Link> : content;
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
    <div className="space-y-8 max-w-[1400px] mx-auto animate-in fade-in zoom-in-95 duration-500 ease-out">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500">
            Дашборд
          </h1>
          <p className="text-slate-500 text-sm mt-1">Организация и мониторинг платформы</p>
        </div>
      </div>

      {/* Alerts */}
      <div className="space-y-3">
        {alerts.map((alert, i) => (
          <div
            key={i}
            className={`px-5 py-4 rounded-none text-sm font-medium flex items-center gap-3 backdrop-blur-md transition-all ${
              alert.severity === 'critical' ? 'bg-rose-50/80 text-rose-800 border-l-4 border-rose-500 shadow-[0_4px_20px_-4px_rgba(225,29,72,0.1)]' :
              alert.severity === 'warning' ? 'bg-amber-50/80 text-amber-800 border-l-4 border-amber-500 shadow-[0_4px_20px_-4px_rgba(217,119,6,0.1)]' :
              'bg-emerald-50/50 text-emerald-800 border-l-4 border-emerald-500'
            }`}
          >
            {alert.severity === 'critical' ? <span className="text-lg">❌</span> : alert.severity === 'warning' ? <span className="text-lg">⚠️</span> : <span className="text-lg">✅</span>}
            <span className="tracking-wide">{alert.text.replace(/^(?:❌|⚠️|✅)\s?/, '')}</span>
          </div>
        ))}
      </div>

      {/* Financial KPIs */}
      <div>
        <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span className="p-1 px-2 bg-indigo-100 text-indigo-700 rounded-md text-xs">A</span>
          Финансовая аналитика
        </h2>
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
        <h2 className="text-base font-bold text-slate-800 mb-4 mt-8 flex items-center gap-2">
          <span className="p-1 px-2 bg-sky-100 text-sky-700 rounded-md text-xs">B</span>
          Развитие платформы
        </h2>
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
      <div className="pt-4">
        <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span className="p-1 px-2 bg-rose-100 text-rose-700 rounded-md text-xs">C</span>
          Журнал аудита
        </h2>
        <Card className="rounded-none border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] bg-white/50 backdrop-blur-xl">
          <CardHeader className="py-4 px-6 border-b border-slate-100/50 bg-slate-50/30">
            <h3 className="text-sm font-bold text-slate-700">🕑 Последние действия персонала</h3>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {recentAudit.map(log => (
                <div key={log.id} className="flex justify-between items-center py-3 px-6 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold font-mono border border-slate-200">
                      {log.adminEmail.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 text-sm mb-0.5">{log.action}</div>
                      <div className="text-slate-500 text-xs">
                        <span className="font-medium">{log.targetType}</span>: {log.target.slice(0, 15)}...
                      </div>
                    </div>
                  </div>
                  <div className="text-slate-400 text-right shrink-0">
                    <div className="font-medium text-xs text-slate-600">{log.adminEmail}</div>
                    <div className="text-[10px] uppercase tracking-wider">{log.createdAt.toLocaleString('ru-RU')}</div>
                  </div>
                </div>
              ))}
              {recentAudit.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-8">Нет записей аудита</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
