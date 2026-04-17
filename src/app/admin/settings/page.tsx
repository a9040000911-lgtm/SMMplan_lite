import { settingsService } from '@/services/admin/settings.service';
import { updateUserRole, upsertProvider, updateGlobalSettings } from '@/actions/admin/settings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const [users, providers, settings, recentLogs] = await Promise.all([
    settingsService.listUsers(),
    settingsService.listProviders(),
    settingsService.getSystemSettings(),
    db.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 15, include: { user: { select: { email: true } } } })
  ]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Global Control Panel</h1>
        <p className="text-slate-500">Manage users, providers, and system configuration.</p>
      </div>

      {/* ── System Settings ── */}
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
              <Label htmlFor="maintenanceMode" className="text-amber-700 font-semibold">
                🚧 Maintenance Mode (disables client access)
              </Label>
            </div>
            <div className="col-span-full">
              <Button type="submit">Save System Settings</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── User Management ── */}
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>{users.length} registered users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="py-3 px-2 font-medium text-slate-500">Email</th>
                  <th className="py-3 px-2 font-medium text-slate-500">Role</th>
                  <th className="py-3 px-2 font-medium text-slate-500">Balance</th>
                  <th className="py-3 px-2 font-medium text-slate-500">Orders</th>
                  <th className="py-3 px-2 font-medium text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-2 font-mono text-xs">{u.email}</td>
                    <td className="py-3 px-2">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                        u.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-800' :
                        u.role === 'SUPPORT' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-2">{(u.balance / 100).toFixed(2)} ₽</td>
                    <td className="py-3 px-2">{u._count.orders}</td>
                    <td className="py-3 px-2">
                      <form action={updateUserRole} className="flex gap-2 items-center">
                        <input type="hidden" name="userId" value={u.id} />
                        <select name="role" defaultValue={u.role} className="text-xs border border-slate-200 rounded px-2 py-1">
                          <option value="USER">USER</option>
                          <option value="SUPPORT">SUPPORT</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                        <Button type="submit" variant="outline" className="text-xs h-7 px-2">Set</Button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Provider Management ── */}
      <Card>
        <CardHeader>
          <CardTitle>Provider Management</CardTitle>
          <CardDescription>API connections to SMM providers.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {providers.map(p => (
            <form key={p.id} action={upsertProvider} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-lg border border-slate-100">
              <input type="hidden" name="id" value={p.id} />
              <div className="space-y-1">
                <Label className="text-xs">Name</Label>
                <Input name="name" defaultValue={p.name} className="text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">API URL</Label>
                <Input name="apiUrl" defaultValue={p.apiUrl} className="text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">API Key</Label>
                <Input name="apiKey" defaultValue={p.apiKey} type="password" className="text-sm" />
              </div>
              <div className="flex items-end gap-2">
                <input type="hidden" name="isActive" value={p.isActive ? 'true' : 'false'} />
                <Button type="submit" variant="outline" className="text-xs">Update</Button>
                <span className={`text-xs font-semibold ${p.isActive ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {p.isActive ? '● Active' : '○ Inactive'}
                </span>
              </div>
            </form>
          ))}

          {/* New Provider Form */}
          <form action={upsertProvider} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input name="name" placeholder="New Provider" className="text-sm" required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">API URL</Label>
              <Input name="apiUrl" placeholder="https://api.example.com" className="text-sm" required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">API Key</Label>
              <Input name="apiKey" placeholder="secret-key" className="text-sm" required />
            </div>
            <div className="flex items-end">
              <input type="hidden" name="isActive" value="true" />
              <Button type="submit" className="text-xs">Add Provider</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── Audit Log ── */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Audit Log</CardTitle>
          <CardDescription>Last 15 administrative actions.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentLogs.map(log => (
              <div key={log.id} className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded text-xs border border-slate-100">
                <div>
                  <span className="font-semibold text-slate-700">{log.action}</span>
                  <span className="text-slate-500 ml-2">{log.details}</span>
                </div>
                <div className="text-slate-400 text-right shrink-0 ml-4">
                  <div>{log.user.email}</div>
                  <div>{log.createdAt.toLocaleString()}</div>
                </div>
              </div>
            ))}
            {recentLogs.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-4">No audit logs yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
