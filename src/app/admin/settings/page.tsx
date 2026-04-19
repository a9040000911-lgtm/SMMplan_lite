import { settingsService } from '@/services/admin/settings.service';
import { updateUserRole, updateGlobalSettings } from '@/actions/admin/settings';
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
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const params = await searchParams;
  const activeTab = params.tab || 'system';
  const searchQuery = params.q || '';

  const [staffUsers, users, settings, recentLogs] = await Promise.all([
    settingsService.listStaffUsers(),
    searchQuery ? settingsService.listUsers(searchQuery) : Promise.resolve([]),
    settingsService.getSystemSettings(),
    db.adminAuditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 15 }),
  ]);

  const regularUsers = users.filter((u) => u.role === 'USER' || u.role === 'BANNED');

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">⚙️ Настройки системы</h1>
        <p className="text-slate-500">Конфигурация инфраструктуры, интеграций и команды.</p>
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
              <CardTitle>Конфигурация системы</CardTitle>
              <CardDescription>Метаданные сайта и операционные переключатели.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={updateGlobalSettings} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Название сайта</Label>
                  <Input id="siteName" name="siteName" defaultValue={settings.siteName} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="siteDescription">Описание сайта (SEO)</Label>
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
                    🚧 Режим обслуживания (отключает доступ клиентов)
                  </Label>
                </div>
                <div className="col-span-full pt-4 border-t border-slate-100">
                  <Button type="submit">Сохранить настройки</Button>
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
              <CardTitle className="text-sky-900">Параметры Telegram-бота</CardTitle>
              <CardDescription>Настройка текстов для омниканального бота.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form action={updateGlobalSettings} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="welcomeMessage">Приветственное сообщение (/start)</Label>
                  <textarea
                    id="welcomeMessage"
                    name="welcomeMessage"
                    defaultValue={settings.welcomeMessage || ''}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <Button type="submit" variant="secondary" className="bg-sky-100 text-sky-800 hover:bg-sky-200">
                  Сохранить контент бота
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Payment Gateways */}
          <Card>
            <CardHeader>
              <CardTitle>Платёжные шлюзы</CardTitle>
              <CardDescription>Ключи шифруются AES-256-GCM в хранилище.</CardDescription>
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
                  <Button type="submit">Сохранить шлюзы</Button>
                </div>
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
              <CardTitle>Команда и лимиты доверия (Escrow Guard)</CardTitle>
              <CardDescription>Дневные лимиты (в копейках) на ручные корректировки баланса.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left">
                      <th className="py-3 px-2 font-medium text-slate-500">Email</th>
                      <th className="py-3 px-2 font-medium text-slate-500">Role</th>
                      <th className="py-3 px-2 font-medium text-slate-500">Дневной лимит (коп.)</th>
                      <th className="py-3 px-2 font-medium text-slate-500 text-right">Действие</th>
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
                            <Button type="submit" variant="secondary" className="h-8 px-3 text-xs border border-slate-300">Сохранить</Button>
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
              <CardTitle>Зарегистрированные пользователи</CardTitle>
              <CardDescription>Назначение ролей персоналу. Воспользуйтесь поиском по Email.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="flex gap-2 mb-4" action="/admin/settings" method="GET">
                <input type="hidden" name="tab" value="team" />
                <Input type="text" name="q" placeholder="Поиск по email..." defaultValue={searchQuery} className="h-9" />
                <Button type="submit" variant="secondary" className="h-9 text-xs">Поиск</Button>
              </form>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left">
                      <th className="py-2 px-2 font-medium text-slate-500">Email</th>
                      <th className="py-2 px-2 font-medium text-slate-500 text-right">Сменить роль</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regularUsers.map((u) => (
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
                            <Button type="submit" variant="outline" className="text-xs h-8 px-3">Назначить</Button>
                          </form>
                        </td>
                      </tr>
                    ))}
                    {regularUsers.length === 0 && searchQuery && (
                      <tr>
                        <td colSpan={2} className="py-4 text-center text-slate-500">Не найдено</td>
                      </tr>
                    )}
                    {regularUsers.length === 0 && !searchQuery && (
                      <tr>
                        <td colSpan={2} className="py-4 text-center text-slate-400">Введите email для поиска</td>
                      </tr>
                    )}
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
              <CardTitle>Журнал аудита</CardTitle>
              <CardDescription>Неизменяемая запись критических действий персонала.</CardDescription>
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
                {recentLogs.length === 0 && <p className="text-slate-500 text-sm py-4">Нет записей аудита.</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}
