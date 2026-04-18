import { settingsService } from '@/services/admin/settings.service';
import { updateUserRole, upsertProvider, updateGlobalSettings } from '@/actions/admin/settings';
import { updateSupportLimit } from '@/actions/admin/team';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [users, providers, settings, recentLogs] = await Promise.all([
    settingsService.listUsers(),
    settingsService.listProviders(),
    settingsService.getSystemSettings(),
    db.adminAuditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 15 }),
  ]);

  const params = await searchParams;
  const activeTab = params.tab || 'system';

  const staffUsers = users.filter((u) => ['OWNER', 'ADMIN', 'MANAGER', 'SUPPORT'].includes(u.role));
  const regularUsers = users.filter((u) => u.role === 'USER' || u.role === 'BANNED');

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
        <p className="text-slate-500">Configure core infrastructure, providers, and team limits.</p>
      </div>

      {/* ── Custom URL-based Tabs ── */}
      <div className="flex gap-4 border-b border-slate-200">
        {[
          { id: 'system', label: 'Система' },
          { id: 'integrations', label: 'Интеграции & API' },
          { id: 'team', label: 'Команда & Лимиты' },
          { id: 'audit', label: 'Журнал Аудита' },
        ].map((t) => (
          <Link
            key={t.id}
            href={`?tab=${t.id}`}
            className={`py-2 px-4 transition-colors -mb-px text-sm font-medium ${
              activeTab === t.id
                ? 'border-b-2 border-indigo-600 text-indigo-700'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* ── TAB 1: SYSTEM ── */}
      {activeTab === 'system' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <Card>
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
              <CardDescription>Site metadata and operational toggles.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={updateGlobalSettings} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Site Name</Label>
                  <Input id="siteName" name="siteName" defaultValue={settings.siteName} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="siteDescription">Site Description (SEO)</Label>
                  <Input id="siteDescription" name="siteDescription" defaultValue={settings.siteDescription} />
                </div>
                <div className="flex items-center gap-3 col-span-full">
                  <input
                    type="checkbox"
                    id="maintenanceMode"
                    name="maintenanceMode"
                    value="true"
                    defaultChecked={settings.maintenanceMode}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                  />
                  <Label htmlFor="maintenanceMode" className="text-amber-700 font-semibold cursor-pointer">
                    🚧 Maintenance Mode (disables client access)
                  </Label>
                </div>
                <div className="col-span-full pt-4 border-t border-slate-100">
                  <Button type="submit">Save System Settings</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TAB 2: INTEGRATIONS ── */}
      {activeTab === 'integrations' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Telegram Bot */}
          <Card>
            <CardHeader className="bg-sky-50/50">
              <CardTitle className="text-sky-900">Telegram Bot Parameters</CardTitle>
              <CardDescription>Configure user-facing text for the omnichannel bot.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form action={updateGlobalSettings} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="welcomeMessage">Welcome Message (/start)</Label>
                  <textarea
                    id="welcomeMessage"
                    name="welcomeMessage"
                    defaultValue={settings.welcomeMessage || ''}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <Button type="submit" variant="secondary" className="bg-sky-100 text-sky-800 hover:bg-sky-200">
                  Save Bot Content
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Payment Gateways */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Gateways</CardTitle>
              <CardDescription>Keys are AES-256-GCM encrypted at rest.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={updateGlobalSettings} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-full font-semibold text-slate-800 bg-slate-50 px-3 py-2 rounded text-sm">
                  YooKassa (Fiat)
                </div>
                <div className="space-y-2">
                  <Label>Shop ID</Label>
                  <Input name="yookassaShopId" defaultValue={settings.yookassaShopId || ''} />
                </div>
                <div className="space-y-2">
                  <Label>Secret Key</Label>
                  <Input
                    name="yookassaSecretKey"
                    type="password"
                    placeholder={settings.yookassaSecretKey ? '••••••••••••••••' : 'Not configured'}
                  />
                </div>

                <div className="col-span-full font-semibold text-slate-800 bg-slate-50 px-3 py-2 rounded text-sm mt-2">
                  CryptoBot (Crypto)
                </div>
                <div className="space-y-2 col-span-full">
                  <Label>API Token</Label>
                  <Input
                    name="cryptoBotToken"
                    type="password"
                    placeholder={settings.cryptoBotToken ? '••••••••••••••••' : 'Not configured'}
                  />
                </div>
                <div className="col-span-full pt-4 border-t border-slate-100">
                  <Button type="submit">Save Gateways</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Providers */}
          <Card>
            <CardHeader>
              <CardTitle>SMM Providers</CardTitle>
              <CardDescription>Upstream API links.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {providers.map((p) => (
                <form
                  key={p.id}
                  action={upsertProvider}
                  className="flex flex-wrap md:flex-nowrap gap-3 items-end p-4 bg-slate-50 rounded-lg border border-slate-100"
                >
                  <input type="hidden" name="id" value={p.id} />
                  <div className="w-full md:w-1/4 space-y-1">
                    <Label className="text-xs text-slate-500">Name</Label>
                    <Input name="name" defaultValue={p.name} className="h-8 text-sm" />
                  </div>
                  <div className="w-full md:w-1/3 space-y-1">
                    <Label className="text-xs text-slate-500">API URL</Label>
                    <Input name="apiUrl" defaultValue={p.apiUrl} className="h-8 text-sm" />
                  </div>
                  <div className="w-full md:w-1/4 space-y-1">
                    <Label className="text-xs text-slate-500">API Key</Label>
                    <Input name="apiKey" defaultValue={p.apiKey} type="password" className="h-8 text-sm" />
                  </div>
                  <div className="w-full md:w-auto flex items-center gap-2">
                    <input type="hidden" name="isActive" value={p.isActive ? 'true' : 'false'} />
                    <Button type="submit" variant="outline" className="h-8 text-xs">Update</Button>
                  </div>
                </form>
              ))}

              <form action={upsertProvider} className="flex flex-wrap md:flex-nowrap gap-3 items-end p-4 bg-indigo-50/50 rounded-lg border border-indigo-100 border-dashed">
                <div className="w-full md:w-1/4 space-y-1"><Input name="name" placeholder="Name" required className="h-8" /></div>
                <div className="w-full md:w-1/3 space-y-1"><Input name="apiUrl" placeholder="URL" required className="h-8" /></div>
                <div className="w-full md:w-1/4 space-y-1"><Input name="apiKey" placeholder="Key" required className="h-8" /></div>
                <div className="w-full md:w-auto"><input type="hidden" name="isActive" value="true" /><Button type="submit" className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white">Add</Button></div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TAB 3: TEAM & TRUST ── */}
      {activeTab === 'team' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <Card>
            <CardHeader>
              <CardTitle>Staff & Trust Budgets (Escrow Guard)</CardTitle>
              <CardDescription>Set daily limits (in cents) for manual balance adjustments.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left">
                      <th className="py-3 px-2 font-medium text-slate-500">Email</th>
                      <th className="py-3 px-2 font-medium text-slate-500">Role</th>
                      <th className="py-3 px-2 font-medium text-slate-500">Daily Escrow Limit (Cents)</th>
                      <th className="py-3 px-2 font-medium text-slate-500 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffUsers.map((u) => (
                      <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-2 font-mono text-xs">{u.email}</td>
                        <td className="py-3 px-2">
                          <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-2" colSpan={2}>
                          <form action={updateSupportLimit} className="flex gap-2 items-center justify-end">
                            <input type="hidden" name="userId" value={u.id} />
                            <Input 
                              type="number" 
                              name="limit" 
                              defaultValue={u.supportLimitCents || 0} 
                              className="w-32 h-8 text-right font-mono" 
                            />
                            <Button type="submit" variant="secondary" className="h-8 px-3 text-xs border border-slate-300">Save Limit</Button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Registered Users</CardTitle>
              <CardDescription>Grant staff roles here.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left">
                      <th className="py-2 px-2 font-medium text-slate-500">Email</th>
                      <th className="py-2 px-2 font-medium text-slate-500 text-right">Change Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regularUsers.slice(0, 50).map((u) => (
                      <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-2 text-xs">{u.email}</td>
                        <td className="py-3 px-2 flex justify-end">
                          <form action={updateUserRole} className="flex gap-2 items-center">
                            <input type="hidden" name="userId" value={u.id} />
                            <select name="role" defaultValue={u.role} className="text-xs border border-slate-200 rounded px-2 py-1 h-8 bg-white">
                              <option value="USER">USER</option>
                              <option value="SUPPORT">SUPPORT</option>
                              <option value="MANAGER">MANAGER</option>
                            </select>
                            <Button type="submit" variant="outline" className="text-xs h-8 px-3">Set</Button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TAB 4: AUDIT LOG ── */}
      {activeTab === 'audit' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <Card>
            <CardHeader>
              <CardTitle>Administrative Audit Log</CardTitle>
              <CardDescription>Immutable record of critical staff actions.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentLogs.map((log) => (
                  <div key={log.id} className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded text-xs border border-slate-100">
                    <div className="max-w-[70%]">
                      <span className="font-semibold text-slate-700 mr-2">{log.action}</span>
                      <span className="text-slate-500 block truncate" title={log.newValue || undefined}>{log.newValue || log.targetType}</span>
                    </div>
                    <div className="text-slate-400 text-right shrink-0 ml-4 font-mono">
                      <div>{log.adminEmail}</div>
                      <div>{log.createdAt.toLocaleString('ru-RU')}</div>
                    </div>
                  </div>
                ))}
                {recentLogs.length === 0 && <p className="text-slate-500 text-sm py-4">No audit logs found.</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}
