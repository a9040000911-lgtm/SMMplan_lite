import { accountingService } from '@/services/financial/accounting.service';
import { escrowService } from '@/services/admin/escrow.service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { updateSystemSettings } from '@/actions/finance/settings';
import { approveQuarantineAction, rejectQuarantineAction } from '@/actions/admin/users';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';

export const dynamic = 'force-dynamic'; // Always fresh data

export default async function FinanceDashboard() {
  const metrics = await accountingService.getMetrics();
  const settings = await accountingService.getSettings();
  const quarantineList = await escrowService.getQuarantineEntries();

  const formatMoney = (val: number) => 
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(val / 100);

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">💰 Финансовый учёт</h1>
        <p className="text-slate-500">Метрики в реальном времени и одобрение карантинных транзакций.</p>
      </div>

      {quarantineList.length > 0 && (
        <Card className="border-rose-200 shadow-sm border-2">
          <CardHeader className="bg-rose-50/50">
            <CardTitle className="text-rose-900 flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                {quarantineList.length} ожидает
              </span>
              Карантин Escrow
            </CardTitle>
            <CardDescription className="text-rose-700">
              Транзакции, превысившие дневной лимит доверия саппорта. Одобрите их для зачисления на баланс клиента.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-rose-100">
              {quarantineList.map((entry) => (
                <div key={entry.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-900">{formatMoney(entry.amount)}</span>
                      <span className="text-sm text-slate-500">→</span>
                      <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{entry.userEmail}</code>
                    </div>
                    <div className="text-sm text-slate-600 mb-1">
                      <strong>Причина:</strong> {entry.reason}
                    </div>
                    <div className="text-xs text-slate-400">
                       Инициатор: <code className="bg-slate-50 px-1 rounded">{entry.adminId}</code> 
                      {' • '} {entry.createdAt.toLocaleString('ru-RU')}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <form action={rejectQuarantineAction}>
                      <input type="hidden" name="entryId" value={entry.id} />
                      <Button size="sm" variant="outline" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200">
                        <X className="w-4 h-4 mr-2" /> Отклонить
                      </Button>
                    </form>
                    <form action={approveQuarantineAction}>
                      <input type="hidden" name="entryId" value={entry.id} />
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                        <Check className="w-4 h-4 mr-2" /> Одобрить
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Выручка (Gross)</CardTitle>
            <div className="h-4 w-4 text-emerald-500 rounded-full border-2 border-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(metrics.revenueGross)}</div>
            <p className="text-xs text-muted-foreground">Все поступления</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Возвраты</CardTitle>
            <div className="h-4 w-4 text-rose-500 rounded-full border-2 border-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-500">-{formatMoney(metrics.refunds)}</div>
            <p className="text-xs text-muted-foreground">Возвращено на балансы</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Себестоимость</CardTitle>
            <div className="h-4 w-4 text-amber-500 rounded-full border-2 border-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">-{formatMoney(metrics.cogs)}</div>
            <p className="text-xs text-muted-foreground">Расходы на провайдеров</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Валовая маржа</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(metrics.marginGross)}</div>
            <p className="text-xs text-slate-400">Маржа: {metrics.marginPercentage.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Расчёт чистой прибыли</CardTitle>
            <CardDescription>С учётом налогов и операционных расходов.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm text-slate-500">Валовая маржа</span>
              <span className="font-medium">{formatMoney(metrics.marginGross)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100 text-rose-600">
              <span className="text-sm">Налоги ({settings.taxRate}%)</span>
              <span>-{formatMoney(metrics.taxes)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100 text-rose-600">
              <span className="text-sm">OPEX (постоянные)</span>
              <span>-{formatMoney(metrics.opex)}</span>
            </div>
            <div className="flex justify-between items-center py-4 bg-emerald-50 px-4 rounded-md">
              <span className="font-bold text-emerald-900">Чистая прибыль</span>
              <span className="text-xl font-bold text-emerald-700">{formatMoney(metrics.profitNet)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Параметры учёта</CardTitle>
            <CardDescription>Обновите параметры для пересчёта чистой прибыли.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateSystemSettings} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="taxRate">Ставка налога (%)</Label>
                <Input type="number" step="0.1" id="taxRate" name="taxRate" defaultValue={settings.taxRate} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="opexMonthly">Ежемесячный OPEX (₽)</Label>
                <Input type="number" step="1" id="opexMonthly" name="opexMonthly" defaultValue={Math.floor(settings.opexMonthly / 100)} />
              </div>
              <Button type="submit" className="w-full">Сохранить</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
