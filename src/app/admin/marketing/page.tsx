import { adminMarketingService } from '@/services/admin/marketing.service';
import { createPromoCode, processReferralPayout, togglePromoCode } from '@/actions/admin/marketing';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Gift } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/page-header';
import { MarketingTabs } from './client-tabs';

import { ReferralEconomicsChart } from './referral-chart';

export const dynamic = 'force-dynamic';

export default async function MarketingPage() {
  const [promos, stats, topReferrers] = await Promise.all([
    adminMarketingService.listPromoCodes(),
    adminMarketingService.getReferralStats(),
    adminMarketingService.listTopReferrers(),
  ]);

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-500 ease-out sm:px-2 md:px-0 bg-slate-50/50 min-h-full pb-10">
      <AdminPageHeader
        icon={Gift}
        title="Маркетинг"
        description="Управление промокодами и аналитика программы лояльности"
      />

      <MarketingTabs
        promocodesContent={
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create Form */}
            <Card className="lg:col-span-1 rounded-2xl border-slate-100/50 shadow-sm bg-white/60 backdrop-blur-xl">
              <CardHeader className="border-b border-slate-100/50 bg-slate-50/50 rounded-t-2xl pb-4">
                <CardTitle className="text-slate-800 text-sm font-bold uppercase tracking-widest">Новый промокод</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <form action={createPromoCode} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Код (от 5 до 12 символов)</Label>
                    <Input name="code" placeholder="WELCOME2026" required className="uppercase font-mono tracking-widest text-slate-900 bg-slate-50/50 border-slate-200" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Тип бонуса</Label>
                    <Select name="type" defaultValue="DISCOUNT">
                      <SelectTrigger className="bg-slate-50/50 border-slate-200 text-slate-800 font-medium tracking-wide">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DISCOUNT" className="font-medium text-slate-700">Скидка (%)</SelectItem>
                        <SelectItem value="VOUCHER" className="font-medium text-slate-700">Пополнение (₽)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Процент (%)</Label>
                      <Input name="discountPercent" type="number" placeholder="10" defaultValue="0" className="bg-slate-50/50 font-mono tracking-widest" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Сумма (₽)</Label>
                      <Input name="amount" type="number" placeholder="500" defaultValue="0" className="bg-slate-50/50 font-mono tracking-widest" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Лимит активаций</Label>
                    <Input name="maxUses" type="number" defaultValue="100" required className="bg-slate-50/50 font-mono tracking-widest" />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Срок годности (опционально)</Label>
                    <Input name="expiresAt" type="datetime-local" className="bg-slate-50/50 text-slate-700" />
                  </div>

                  <Button type="submit" className="w-full bg-sky-500 hover:bg-sky-600 text-white shadow hover:-translate-y-0.5 transition-all">Сгенерировать</Button>
                </form>
              </CardContent>
            </Card>

            {/* List */}
            <Card className="lg:col-span-2 rounded-2xl border-slate-100/50 shadow-sm bg-white/60 backdrop-blur-xl">
              <CardHeader className="border-b border-slate-100/50 bg-slate-50/50 rounded-t-2xl pb-4">
                <CardTitle className="text-slate-800 text-sm font-bold uppercase tracking-widest">Список промокодов</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm font-medium text-slate-700">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-widest text-slate-400 border-b border-slate-100/60">
                        <th className="py-3 px-2 font-bold">Код</th>
                        <th className="py-3 px-2 font-bold">Тип</th>
                        <th className="py-3 px-2 font-bold text-right">Бонус</th>
                        <th className="py-3 px-2 font-bold text-right">Активации</th>
                        <th className="py-3 px-2 font-bold text-right">Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {promos.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/80 even:bg-slate-50/30 transition-colors border-b border-slate-100/30 font-medium">
                          <td className="py-2.5 px-2 font-mono font-bold text-slate-900">{p.code}</td>
                          <td className="py-2.5 px-2">
                            <span className={`inline-flex items-center px-2 py-0.5 text-[10px] rounded-md uppercase font-bold tracking-wider border ${p.type === 'DISCOUNT' ? 'bg-sky-50 text-sky-700 border-sky-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                              {p.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-right tabular-nums text-slate-800">
                            {p.type === 'DISCOUNT' ? `${p.discountPercent}%` : `${p.amount} ₽`}
                          </td>
                          <td className="py-2.5 px-2 text-right text-slate-500 tabular-nums">
                            {p.uses} / {p.maxUses}
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            {p.isActive ? (
                               <span className="text-emerald-500 font-bold text-[11px] uppercase tracking-widest flex justify-end items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>Active</span>
                            ) : (
                               <span className="text-slate-400 font-bold text-[11px] uppercase tracking-widest">Off</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {promos.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 text-sm font-medium">Нет активных промокодов</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        }
        referralsContent={
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
             <Card className="rounded-2xl border-slate-100/50 shadow-[0_4px_25px_rgb(0,0,0,0.02)] bg-white/60 backdrop-blur-xl">
                <CardHeader className="border-b border-slate-100/50 bg-slate-50/50 rounded-t-2xl pb-4">
                  <CardTitle className="text-slate-800 text-sm font-bold uppercase tracking-widest flex gap-2"><span className="p-1 px-2.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px]">A</span>Экономика Лояльности</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4 mb-2">
                     <div className="bg-emerald-50/80 p-5 rounded-2xl border border-emerald-100/50 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
                       <p className="text-emerald-700 text-[10px] font-bold uppercase tracking-widest mb-1 opacity-80">Выплачено всего</p>
                       <p className="text-3xl font-extrabold text-emerald-900 tracking-tighter tabular-nums">{(stats.totalPaidOut / 100).toLocaleString('ru-RU')} ₽</p>
                     </div>
                     <div className="bg-amber-50/80 p-5 rounded-2xl border border-amber-100/50 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
                       <p className="text-amber-700 text-[10px] font-bold uppercase tracking-widest mb-1 opacity-80">В ожидании выплат</p>
                       <p className="text-3xl font-extrabold text-amber-900 tracking-tighter tabular-nums">{(stats.totalPending / 100).toLocaleString('ru-RU')} ₽</p>
                     </div>
                  </div>
                  <ReferralEconomicsChart paidOut={stats.totalPaidOut} pending={stats.totalPending} />
                </CardContent>
             </Card>

             <Card className="rounded-2xl border-slate-100/50 shadow-[0_4px_25px_rgb(0,0,0,0.02)] bg-white/60 backdrop-blur-xl flex flex-col">
                <CardHeader className="border-b border-slate-100/50 bg-slate-50/50 rounded-t-2xl pb-4">
                  <CardTitle className="text-slate-800 text-sm font-bold uppercase tracking-widest flex gap-2"><span className="p-1 px-2.5 bg-sky-100 text-sky-800 rounded-md text-[10px]">B</span>Аудит рефоводов</CardTitle>
                  <CardDescription className="text-xs text-slate-500 font-medium tracking-wide mt-1">Клиенты с накопившимся партнерским балансом</CardDescription>
                </CardHeader>
                <CardContent className="pt-2 flex-grow overflow-y-auto">
                  <div className="overflow-x-auto mt-2">
                    <table className="w-full text-sm font-medium text-slate-700">
                      <thead>
                        <tr className="text-left text-[11px] uppercase tracking-widest text-slate-400 border-b border-slate-100/60">
                          <th className="py-2.5 px-2 font-bold">Email (Учетная запись)</th>
                          <th className="py-2.5 px-2 font-bold text-right text-emerald-600">Pending Баланс</th>
                          <th className="py-2.5 px-2 font-bold text-right">Рефералы</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topReferrers.map(u => (
                          <tr key={u.id} className="hover:bg-slate-50/80 even:bg-slate-50/30 transition-colors border-b border-slate-100/30 group">
                            <td className="py-3 px-2 text-sky-600 font-mono text-xs font-semibold tracking-tight">{u.email}</td>
                            <td className="py-3 px-2 text-right font-extrabold text-emerald-600 tabular-nums text-[13px] group-hover:scale-105 transition-transform origin-right">{(u.referralBalance / 100).toFixed(2)} ₽</td>
                            <td className="py-3 px-2 text-right text-slate-500 tabular-nums">
                                <span className="inline-flex items-center gap-1.5"><span className="text-slate-400 text-xs font-semibold">{u._count.referrals}</span> чел.</span>
                            </td>
                          </tr>
                        ))}
                        {topReferrers.length === 0 && (
                          <tr><td colSpan={3} className="py-12 text-center text-slate-400 font-medium text-sm">Нет аккаунтов с невыплаченным холдом</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
             </Card>
          </div>
        }
      />
    </div>
  );
}
