import { accountingService } from '@/services/financial/accounting.service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { updateSystemSettings } from '@/actions/finance/settings';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic'; // Always fresh data

export default async function FinanceDashboard() {
  const metrics = await accountingService.getMetrics();
  const settings = await accountingService.getSettings();

  const formatMoney = (val: number) => 
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(val / 100);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Financial Accounting Dashboard</h1>
        <p className="text-slate-500">Real-time metrics calculated securely from transactions.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Revenue</CardTitle>
            <div className="h-4 w-4 text-emerald-500 rounded-full border-2 border-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(metrics.revenueGross)}</div>
            <p className="text-xs text-muted-foreground">Original payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Refunds</CardTitle>
            <div className="h-4 w-4 text-rose-500 rounded-full border-2 border-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-500">-{formatMoney(metrics.refunds)}</div>
            <p className="text-xs text-muted-foreground">Returned to wallets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">COGS</CardTitle>
            <div className="h-4 w-4 text-amber-500 rounded-full border-2 border-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">-{formatMoney(metrics.cogs)}</div>
            <p className="text-xs text-muted-foreground">Provider cost</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(metrics.marginGross)}</div>
            <p className="text-xs text-slate-400">Margin: {metrics.marginPercentage.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Net Profit Calculation</CardTitle>
            <CardDescription>Subtracting Taxes and OPEX.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm text-slate-500">Gross Margin</span>
              <span className="font-medium">{formatMoney(metrics.marginGross)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100 text-rose-600">
              <span className="text-sm">Taxes ({settings.taxRate}%)</span>
              <span>-{formatMoney(metrics.taxes)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100 text-rose-600">
              <span className="text-sm">OPEX (Fixed)</span>
              <span>-{formatMoney(metrics.opex)}</span>
            </div>
            <div className="flex justify-between items-center py-4 bg-emerald-50 px-4 rounded-md">
              <span className="font-bold text-emerald-900">Net Profit</span>
              <span className="text-xl font-bold text-emerald-700">{formatMoney(metrics.profitNet)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Accounting Settings</CardTitle>
            <CardDescription>Update parameters to recalculate net profit.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateSystemSettings} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input type="number" step="0.1" id="taxRate" name="taxRate" defaultValue={settings.taxRate} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="opexMonthly">Monthly OPEX (RUB)</Label>
                <Input type="number" step="1" id="opexMonthly" name="opexMonthly" defaultValue={Math.floor(settings.opexMonthly / 100)} />
              </div>
              <Button type="submit" className="w-full">Save Settings</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
