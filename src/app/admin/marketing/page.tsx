import { adminMarketingService } from '@/services/admin/marketing.service';
import { createPromoCode, processReferralPayout, togglePromoCode } from '@/actions/admin/marketing';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const dynamic = 'force-dynamic';

export default async function MarketingPage() {
  const [promos, stats, topReferrers] = await Promise.all([
    adminMarketingService.listPromoCodes(),
    adminMarketingService.getReferralStats(),
    adminMarketingService.listTopReferrers(),
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">🎁 Маркетинг</h1>
          <p className="text-slate-500 mt-1">
            Промокоды, ваучеры и партнерская программа.
          </p>
        </div>
      </div>

      <Tabs defaultValue="promocodes" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="promocodes">Промокоды</TabsTrigger>
          <TabsTrigger value="referrals">Партнерская программа</TabsTrigger>
        </TabsList>

        <TabsContent value="promocodes" className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Create Form */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Новый промокод</CardTitle>
                <CardDescription>Сгенерировать скидку или ваучер</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={createPromoCode} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Код (от 5 до 12 символов)</Label>
                    <Input name="code" placeholder="WELCOME2026" required className="uppercase font-mono" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Тип бонуса</Label>
                    <Select name="type" defaultValue="DISCOUNT">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DISCOUNT">Скидка (%)</SelectItem>
                        <SelectItem value="VOUCHER">Пополнение (₽)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Процент (%)</Label>
                      <Input name="discountPercent" type="number" placeholder="10" defaultValue="0" />
                    </div>
                    <div className="space-y-2">
                      <Label>Сумма ваучера (₽)</Label>
                      <Input name="amount" type="number" placeholder="500" defaultValue="0" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Лимит активаций</Label>
                    <Input name="maxUses" type="number" defaultValue="100" required />
                  </div>

                  <div className="space-y-2">
                    <Label>Срок годности (опционально)</Label>
                    <Input name="expiresAt" type="datetime-local" />
                  </div>

                  <Button type="submit" className="w-full">Сгенерировать</Button>
                </form>
              </CardContent>
            </Card>

            {/* List */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Список промокодов</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left">
                        <th className="py-2 px-2 font-medium text-slate-500">Код</th>
                        <th className="py-2 px-2 font-medium text-slate-500">Тип</th>
                        <th className="py-2 px-2 font-medium text-slate-500">Бонус</th>
                        <th className="py-2 px-2 font-medium text-slate-500">Активации</th>
                        <th className="py-2 px-2 font-medium text-slate-500">Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {promos.map(p => (
                        <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-2 px-2 font-mono font-semibold">{p.code}</td>
                          <td className="py-2 px-2">
                            <span className={`inline-flex px-2 py-0.5 text-[10px] rounded uppercase font-semibold ${p.type === 'DISCOUNT' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {p.type}
                            </span>
                          </td>
                          <td className="py-2 px-2">
                            {p.type === 'DISCOUNT' ? `${p.discountPercent}%` : `${p.amount} ₽`}
                          </td>
                          <td className="py-2 px-2 text-slate-500">
                            {p.uses} / {p.maxUses}
                          </td>
                          <td className="py-2 px-2">
                            {p.isActive ? (
                               <span className="text-emerald-600 font-medium">Активен</span>
                            ) : (
                               <span className="text-red-500 font-medium">Откл</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {promos.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400">Нет активных промокодов</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="referrals" className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <Card>
                <CardHeader>
                  <CardTitle>Экономика Партнерки</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-slate-50 p-4 rounded-lg">
                       <p className="text-slate-500 text-sm">Выплачено всего</p>
                       <p className="text-2xl font-bold text-slate-800">{(stats.totalPaidOut / 100).toLocaleString('ru-RU')} ₽</p>
                     </div>
                     <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                       <p className="text-amber-700 text-sm">Ожидает выплат (Pending)</p>
                       <p className="text-2xl font-bold text-amber-900">{(stats.totalPending / 100).toLocaleString('ru-RU')} ₽</p>
                     </div>
                  </div>
                </CardContent>
             </Card>

             <Card>
                <CardHeader>
                  <CardTitle>Топ Партнеров (Рефоводов)</CardTitle>
                  <CardDescription>Пользователи с активным реферальным балансом</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="py-2">Email</th>
                          <th className="py-2">Ref Баланс</th>
                          <th className="py-2">Пригласил</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topReferrers.map(u => (
                          <tr key={u.id} className="border-b border-slate-100">
                            <td className="py-2 text-indigo-600 font-mono text-xs">{u.email}</td>
                            <td className="py-2 font-bold text-emerald-600">{(u.referralBalance / 100).toFixed(2)} ₽</td>
                            <td className="py-2 text-slate-500">{u._count.referrals} чел.</td>
                          </tr>
                        ))}
                        {topReferrers.length === 0 && (
                          <tr><td colSpan={3} className="py-4 text-center text-slate-400">Нет долгов по рефералке</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
             </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
