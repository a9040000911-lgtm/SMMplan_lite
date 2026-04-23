import { getFunnelAnalyticsAction } from '@/actions/admin/analytics.action';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminPageHeader } from '@/components/admin/page-header';
import { BarChart, Clock, TrendingDown } from 'lucide-react';
import Link from 'next/link';
import { Table, TableHeader, TableBody, TableColumn, TableRow, TableCell } from "@/components/admin/hero-ui";

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const params = await searchParams;
  const period = params.p === '1' ? 1 : 7;
  
  const { funnel, topServices } = await getFunnelAnalyticsAction(period);

  const maxCount = Math.max(funnel.linkPasted, 1); // Avoid division by zero
  
  // Percentages relative to step 1
  const s1Pct = 100;
  const s2Pct = funnel.linkPasted > 0 ? (funnel.serviceSelected / funnel.linkPasted) * 100 : 0;
  const s3Pct = funnel.linkPasted > 0 ? (funnel.checkoutInitiated / funnel.linkPasted) * 100 : 0;
  const s4Pct = funnel.linkPasted > 0 ? (funnel.paymentClicked / funnel.linkPasted) * 100 : 0;

  // Dropoff calculations (Step N to Step N-1)
  const dropToS2 = funnel.linkPasted > 0 ? (funnel.serviceSelected / funnel.linkPasted) * 100 : 0;
  const dropToS3 = funnel.serviceSelected > 0 ? (funnel.checkoutInitiated / funnel.serviceSelected) * 100 : 0;
  const dropToS4 = funnel.checkoutInitiated > 0 ? (funnel.paymentClicked / funnel.checkoutInitiated) * 100 : 0;

  function getColorClass(pct: number) {
    if (pct === 0 && maxCount === 1) return 'bg-slate-200 text-slate-600'; // No data
    if (pct < 30) return 'bg-rose-500 text-white shadow-rose-500/20';
    if (pct < 50) return 'bg-amber-500 text-white shadow-amber-500/20';
    return 'bg-emerald-500 text-white shadow-emerald-500/20';
  }

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-500 ease-out sm:px-2 md:px-0 bg-slate-50/50 min-h-full pb-10">
      <AdminPageHeader
        icon={BarChart}
        title="Воронка конверсии (Stealth Telemetry)"
        description="Анализ Zero-Scroll Master в реальном времени"
      />

      {/* Controls */}
      <div className="flex gap-2 mb-6">
        <Link 
          href="?p=1" 
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${period === 1 ? 'bg-slate-900 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          <Clock className="w-4 h-4" /> 24 Часа
        </Link>
        <Link 
          href="?p=7" 
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${period === 7 ? 'bg-slate-900 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          <Clock className="w-4 h-4" /> 7 Дней
        </Link>
      </div>

      {/* Funnel Layout */}
      <Card className="border-none shadow-xl shadow-slate-200/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center justify-center gap-2">
            <TrendingDown className="w-5 h-5 text-indigo-500" /> Дроп-офф воронка
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 pb-12 flex flex-col items-center justify-center gap-1">
          
          {/* STEP 1: Link Pasted */}
          <div className="w-full max-w-4xl opacity-100 flex flex-col items-center group">
            <div className={`w-full py-4 text-center rounded-t-xl font-bold transition-all bg-indigo-600 text-white shadow-lg`}>
              1. Вставлено ссылок: {funnel.linkPasted}
            </div>
            <div className="text-xs font-semibold text-slate-400 py-2">
              Базовый трафик ({100}%)
            </div>
          </div>

          <div className="w-[80%] max-w-3xl scale-x-[0.95] h-0 border-t-[0px] border-b-[0px] border-l-[30px] border-r-[30px] border-l-transparent border-r-transparent opacity-0"></div>

          {/* STEP 2: Service Selected */}
          <div className="w-[85%] max-w-3xl flex flex-col items-center group -mt-1">
            <div className={`w-full py-3.5 text-center rounded-sm font-bold transition-all shadow-md ${getColorClass(dropToS2)}`}>
              2. Выбрана(ы) услуга: {funnel.serviceSelected}
            </div>
            <div className="text-xs font-semibold text-slate-400 py-2">
              Конверсия: {dropToS2.toFixed(1)}% {dropToS2 < 30 && "🔥 Узкое горлышко"}
            </div>
          </div>

          {/* STEP 3: Checkout Initiated */}
          <div className="w-[70%] max-w-2xl flex flex-col items-center group -mt-1">
            <div className={`w-full py-3 text-center rounded-sm font-bold transition-all shadow-md ${getColorClass(dropToS3)}`}>
              3. Открыта форма чекаута: {funnel.checkoutInitiated}
            </div>
            <div className="text-xs font-semibold text-slate-400 py-2">
              Конверсия: {dropToS3.toFixed(1)}% {dropToS3 < 30 && "🔥 Отвал на UI чекаута"}
            </div>
          </div>

          {/* STEP 4: Payment Clicked */}
          <div className="w-[50%] max-w-lg flex flex-col items-center group -mt-1">
             <div className={`w-full py-2.5 text-center rounded-b-xl font-bold transition-all shadow-md ${getColorClass(dropToS4)}`}>
              4. Клик "К оплате": {funnel.paymentClicked}
            </div>
            <div className="text-xs font-semibold text-slate-400 mt-2">
              Конверсия в оплату: {dropToS4.toFixed(1)}%
            </div>
            <div className="text-sm font-black text-slate-900 mt-2">
              OVERALL CONVERSION: {s4Pct.toFixed(1)}%
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Top Services Table */}
      <Card className="border-none shadow-xl shadow-slate-200/50 mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Топ 5 Популярных Услуг (по кликам)</CardTitle>
        </CardHeader>
        <CardContent>
           <Table aria-label="Топ услуг">
             <TableHeader>
               <TableColumn>НАЗВАНИЕ УСЛУГИ</TableColumn>
               <TableColumn className="text-right">КЛИКОВ</TableColumn>
             </TableHeader>
             <TableBody>
               {topServices.map((srv, idx) => (
                 <TableRow key={idx}>
                   <TableCell className="font-semibold">{srv.name}</TableCell>
                   <TableCell className="tabular-nums font-mono text-slate-600">{srv.clicks}</TableCell>
                 </TableRow>
               ))}
               {topServices.length === 0 && (
                 <TableRow key="empty">
                    <TableCell>Нет данных</TableCell>
                    <TableCell>-</TableCell>
                 </TableRow>
               )}
             </TableBody>
           </Table>
        </CardContent>
      </Card>
    </div>
  );
}
