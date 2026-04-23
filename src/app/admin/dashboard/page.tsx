import { accountingService } from '@/services/financial/accounting.service';
import { adminOrderService } from '@/services/admin/order.service';
import { adminUserService } from '@/services/admin/user.service';
import { adminTicketService } from '@/services/admin/ticket.service';
import { adminCatalogService } from '@/services/admin/catalog.service';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { FinancialChart } from './financial-chart';
import { Check, Clock, ChevronDown, Bell, Search, Settings, Home } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/admin/hero-ui';
import { AdminPageHeader } from '@/components/admin/page-header';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const session = await verifySession();
  const user = session ? await db.user.findUnique({ where: { id: session.userId } }) : null;

  const [metrics, orderStats, userStats, ticketStats, catalogStats, recentAudit] = await Promise.all([
    accountingService.getMetrics(),
    adminOrderService.getOrderStats(),
    adminUserService.getUserStats(),
    adminTicketService.getTicketStats(),
    adminCatalogService.getCatalogStats(),
    db.adminAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  let revenueGross = metrics.revenueGross;
  let profitNet = metrics.profitNet;
  let marginPercentage = metrics.marginPercentage;
  let totalLiability = userStats.totalLiability;
  
  const oStats = { ...orderStats };
  const uStats = { ...userStats };
  const cStats = { ...catalogStats };
  const tStats = { ...ticketStats };

  // Если БД пустая (выручка 0), подставляем демо-данные для визуализации
  if (revenueGross === 0) {
     revenueGross = 184500000;       // 1,845,000 RUB
     totalLiability = 42000000;      // 420,000 RUB
     profitNet = 61200000;           // 612,000 RUB
     marginPercentage = 33.1;
     
     oStats.inProgress = 142;
     oStats.pending = 51;
     oStats.error = 3;
     
     uStats.total = 3280;
     uStats.active = 412;
     
     cStats.totalServices = 1450;
     cStats.activeServices = 860;
     
     tStats.total = 345;
     tStats.open = 4;
  }

  const netPosition = revenueGross - totalLiability;
  const netPositionStr = (netPosition / 100).toLocaleString('ru-RU');
  
  return (
    <div className="space-y-6 w-full animate-in fade-in duration-500 ease-out sm:px-2 md:px-0 bg-background min-h-full pb-10">
      
      <AdminPageHeader
        icon={Home}
        title={`Доброе утро, ${user?.email?.split('@')[0] || 'Администратор'}`}
        description="Отслеживайте финансовые потоки, заказы и нагрузку платформы."
      />

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Total Balance Card */}
        <div className="bg-card text-card-foreground rounded-2xl p-6 lg:p-7 shadow-sm border border-border/60 flex flex-col justify-between transition-all hover:shadow-md">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-500 text-sm font-semibold tracking-wide">Чистые активы</span>
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 text-xs font-bold text-slate-700">
                <span className="w-3 h-3 rounded-full overflow-hidden bg-sky-200 border border-sky-300"></span> RUB <ChevronDown className="w-3 h-3 text-slate-400" />
              </div>
            </div>
            <div className="text-4xl font-extrabold text-slate-900 tabular-nums">
              {netPositionStr} ₽
            </div>
            <div className="mt-2 text-xs font-medium text-emerald-600 bg-emerald-50 w-max px-2 py-1 rounded-md mb-8">
              Капитал за вычетом балансов юзеров
            </div>
            
            <div className="flex gap-3 mb-8 w-full">
               <Link href="/admin/finance" className="flex-1">
                 <Button className="w-full bg-slate-900 text-white font-semibold rounded-xl text-sm h-11 shadow-sm hover:!bg-slate-800">
                    Финансы
                 </Button>
               </Link>
               <Link href="/admin/settings" className="flex-1">
                 <Button className="w-full bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl text-sm h-11 hover:!bg-slate-50">
                    Настройки
                 </Button>
               </Link>
            </div>
          </div>
          
          <div>
            <div className="text-xs font-semibold text-slate-400 mb-3">ФИНАНСОВЫЙ БАЛАНС</div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                <div className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex items-center justify-between">Все пополнения <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span></div>
                <div className="font-bold text-slate-700 text-sm tabular-nums">{(revenueGross / 100).toLocaleString('ru-RU')} ₽</div>
              </div>
              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                <div className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex items-center justify-between">Обязательства <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span></div>
                <div className="font-bold text-slate-700 text-sm tabular-nums">{(totalLiability / 100).toLocaleString('ru-RU')} ₽</div>
              </div>
              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 opacity-70">
                <div className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex items-center justify-between">Чистая прибыль <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span></div>
                <div className="font-bold text-slate-700 text-sm tabular-nums">{(profitNet / 100).toLocaleString('ru-RU')} ₽</div>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 2x2 Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/admin/orders?status=IN_PROGRESS" className="bg-orange-500 text-white rounded-xl p-5 shadow-[0_8px_20px_rgb(234,88,12,0.2)] flex flex-col hover:scale-[1.02] transition-transform">
            <div className="flex justify-between items-start mb-6">
              <span className="text-orange-100 text-sm font-medium">Заказы в работе</span>
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Clock className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="mt-auto">
              <div className="text-3xl font-bold mb-1">{oStats.inProgress.toLocaleString('ru-RU')}</div>
              <div className="text-[11px] font-medium text-orange-100">ещё {oStats.pending} в очереди (pending)</div>
            </div>
          </Link>
          
          <Link href="/admin/orders?status=ERROR" className="bg-card text-card-foreground rounded-2xl p-5 shadow-sm border border-border/60 flex flex-col hover:border-rose-300 hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-6">
              <span className="text-slate-500 text-sm font-medium">Заказы с ошибкой</span>
              <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center">
                <Settings className="w-4 h-4 text-rose-500" />
              </div>
            </div>
            <div className="mt-auto">
              <div className="text-3xl font-bold text-slate-900 mb-1">{oStats.error}</div>
              <div className="text-[11px] font-medium text-rose-500">требуется ручное вмешательство</div>
            </div>
          </Link>

          <Link href="/admin/clients" className="bg-card text-card-foreground rounded-2xl p-5 shadow-sm border border-border/60 flex flex-col hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-6">
              <span className="text-slate-500 text-sm font-medium">Пользователи</span>
              <div className="w-8 h-8 rounded-full bg-sky-50 flex items-center justify-center">
                <span className="text-sky-500 font-bold">👤</span>
              </div>
            </div>
            <div className="mt-auto">
              <div className="text-3xl font-bold text-slate-900 mb-1">{uStats.total.toLocaleString('ru-RU')}</div>
              <div className="text-[11px] font-medium text-emerald-500">из них {uStats.active} активных</div>
            </div>
          </Link>

          <Link href="/admin/catalog" className="bg-card text-card-foreground rounded-2xl p-5 shadow-sm border border-border/60 flex flex-col hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-6">
              <span className="text-slate-500 text-sm font-medium">Услуги в каталоге</span>
              <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center">
                <span className="text-indigo-500 font-bold">📦</span>
              </div>
            </div>
            <div className="mt-auto">
              <div className="text-3xl font-bold text-slate-900 mb-1">{cStats.activeServices}</div>
              <div className="text-[11px] font-medium text-slate-400">из {cStats.totalServices} загруженных от провайдеров</div>
            </div>
          </Link>
        </div>

        {/* Total Income Chart */}
        <div className="bg-card text-card-foreground rounded-2xl p-6 lg:p-7 shadow-sm border border-border/60 transition-all hover:shadow-md">
          <div className="flex justify-between items-start mb-1">
            <h3 className="font-bold text-slate-900">Финансовая динамика</h3>
          </div>
          <p className="text-xs text-slate-400 font-medium mb-4">Соотношение выручки и обязательств</p>
          <FinancialChart revenue={revenueGross} liability={totalLiability} />
        </div>

        {/* Limits & Cards */}
        <div className="flex flex-col gap-6">
          <div className="bg-card text-card-foreground rounded-2xl p-6 shadow-sm border border-border/60 transition-all hover:shadow-md">
            <h3 className="font-bold text-slate-900 mb-1">Средняя маржинальность</h3>
            <p className="text-xs text-slate-400 mb-6 font-medium">Отношение чистой прибыли к реализованной выручке</p>
            
            <div className="flex justify-between text-sm font-bold text-slate-700 mb-3">
              <span>{marginPercentage.toFixed(1)}%</span>
              <span className="text-slate-400 font-medium">Целевой показатель: 35.0%</span>
            </div>
            
            <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2 overflow-hidden">
              <div 
                className="bg-orange-500 h-2.5 rounded-full" 
                style={{ width: `${Math.min(100, Math.max(0, marginPercentage))}%` }}
              ></div>
            </div>
            
            <div className="flex justify-between text-[11px] text-slate-400 font-semibold mb-1">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>

          <Link href="/admin/tickets" className="bg-card text-card-foreground hover:border-sky-200 transition-all rounded-2xl p-6 shadow-sm border border-border/60 flex-1 flex flex-col justify-between hover:shadow-md">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-slate-900 flex items-center gap-2"><Bell className="w-4 h-4 text-sky-500"/> Служба поддержки</h3>
              {tStats.open > 0 && <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-md">{tStats.open} ждут ответа</span>}
            </div>
            <div className="flex gap-4">
              <div className="flex flex-col justify-between flex-1 bg-slate-900 text-white rounded-2xl p-4 shadow-lg overflow-hidden relative">
                 <div className="w-16 h-16 bg-white/5 rounded-full absolute -top-4 -right-4 blur-xl"></div>
                 <div className="flex justify-between items-center mb-6">
                   <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400">ВСЕГО ТИКЕТОВ</div>
                   <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                 </div>
                 <div>
                   <div className="font-mono text-xl opacity-90">{tStats.total}</div>
                   <div className="flex justify-between mt-3 text-[10px] text-slate-400 uppercase font-bold">
                     <span>База знаний</span><span>Online</span>
                   </div>
                 </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Recent Activities Table */}
        <div className="bg-card text-card-foreground rounded-2xl p-6 shadow-sm border border-border/60 lg:col-span-2 transition-all hover:shadow-md">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-900">Журнал безопасности (Audit Log)</h3>
            <Link href="/admin/settings?tab=audit" className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-full border border-slate-100 text-xs font-bold text-slate-600 transition-colors">
              Полный журнал
            </Link>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="text-[11px] text-slate-400 uppercase font-bold tracking-wider border-b border-slate-100">
                <tr>
                  <th className="pb-3 px-2 font-medium"><div className="w-3 h-3 rounded-[3px] border border-slate-300"></div></th>
                  <th className="pb-3 px-4 font-medium">Log ID</th>
                  <th className="pb-3 px-4 font-medium">Тип действия</th>
                  <th className="pb-3 px-4 font-medium">Идентификатор цели</th>
                  <th className="pb-3 px-4 font-medium">Сотрудник</th>
                  <th className="pb-3 px-4 font-medium">Статус</th>
                  <th className="pb-3 px-4 font-medium">Дата и время</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentAudit.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-3 px-2"><div className="w-3 h-3 rounded-[3px] border border-slate-200 group-hover:border-slate-300 bg-white"></div></td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">LOG_{log.id.slice(0,6).toUpperCase()}</td>
                    <td className="py-3 px-4 flex items-center gap-3">
                      <div className="w-6 h-6 rounded-md bg-sky-50 flex items-center justify-center text-sky-500 font-bold leading-none text-xs">
                        A
                      </div>
                      <span className="font-bold text-slate-800 text-[13px]">{log.action}</span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-600 text-[13px]">{log.target.slice(0,20)}</td>
                    <td className="py-3 px-4 font-medium text-slate-800 text-[13px]">{log.adminEmail.split('@')[0]}</td>
                    <td className="py-3 px-4 flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                       <span className="text-xs font-semibold text-slate-600 tracking-wide">Зафиксировано</span>
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-slate-400">{log.createdAt.toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                  </tr>
                ))}
                {recentAudit.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-slate-400 text-sm">В журнале пусто</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
