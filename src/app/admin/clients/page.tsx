import { adminUserService, getVolumeTier } from '@/services/admin/user.service';
import { updateBalanceAction, banUserAction, unbanUserAction, loginAsAction } from '@/actions/admin/users';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  OWNER:   { label: 'Владелец', color: 'bg-amber-100 text-amber-800' },
  ADMIN:   { label: 'Админ',   color: 'bg-indigo-100 text-indigo-800' },
  MANAGER: { label: 'Менеджер', color: 'bg-emerald-100 text-emerald-800' },
  SUPPORT: { label: 'Саппорт', color: 'bg-slate-200 text-slate-600' },
  USER:    { label: 'Клиент',  color: 'bg-sky-100 text-sky-800' },
  BANNED:  { label: 'Забанен', color: 'bg-red-100 text-red-800' },
};

type Props = {
  searchParams: Promise<{
    q?: string;
    cursor?: string;
    userId?: string;
  }>;
};

export default async function AdminClientsPage({ searchParams }: Props) {
  const params = await searchParams;
  const search = params.q || '';
  const cursor = params.cursor || undefined;
  const selectedUserId = params.userId;

  const { items: users, nextCursor, hasMore } = await adminUserService.listUsers({
    search: search || undefined,
    cursor,
    pageSize: 50,
  });

  const stats = await adminUserService.getUserStats();

  // If a user is selected, load their full card
  const userCard = selectedUserId ? await adminUserService.getUserCard(selectedUserId).catch(() => null) : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">👥 Клиенты</h1>
          <p className="text-slate-500 mt-1">
            Всего: {stats.total} • Активные: {stats.active} • Забанены: {stats.banned} • Liability: {(stats.totalLiability / 100).toLocaleString('ru-RU')} ₽
          </p>
        </div>
        <a
          href={`/api/admin/export?type=users&q=${encodeURIComponent(search)}`}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
        >
          📥 Экспорт CSV
        </a>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <form className="flex gap-4">
            <input
              type="text"
              name="q"
              defaultValue={search}
              placeholder="🔍 Поиск по email..."
              className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
            <Button type="submit">Найти</Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Table (Left Side) */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Результаты ({users.length}{hasMore ? '+' : ''})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left">
                      <th className="py-3 px-2 font-medium text-slate-500">Email</th>
                      <th className="py-3 px-2 font-medium text-slate-500">Роль</th>
                      <th className="py-3 px-2 font-medium text-slate-500">Баланс</th>
                      <th className="py-3 px-2 font-medium text-slate-500">LTV</th>
                      <th className="py-3 px-2 font-medium text-slate-500">Заказы</th>
                      <th className="py-3 px-2 font-medium text-slate-500">Tier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => {
                      const tier = getVolumeTier(u.totalSpent);
                      const roleInfo = ROLE_LABELS[u.role] || { label: u.role, color: 'bg-slate-100 text-slate-800' };
                      const isSelected = selectedUserId === u.id;

                      return (
                        <tr key={u.id} className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${isSelected ? 'bg-indigo-50 ring-1 ring-indigo-200' : ''}`}>
                          <td className="py-3 px-2">
                            <Link
                              href={`/admin/clients?q=${encodeURIComponent(search)}&userId=${u.id}`}
                              className="text-indigo-600 hover:underline text-xs font-mono"
                            >
                              {u.email}
                            </Link>
                          </td>
                          <td className="py-3 px-2">
                            <span className={`inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-full ${roleInfo.color}`}>
                              {roleInfo.label}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-xs font-semibold">
                            {(u.balance / 100).toFixed(2)} ₽
                            {u.quarantineBalance > 0 && (
                              <span className="block text-[10px] text-orange-600">
                                🔒 {(u.quarantineBalance / 100).toFixed(2)} ₽
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-xs">
                            {(u.totalSpent / 100).toLocaleString('ru-RU')} ₽
                          </td>
                          <td className="py-3 px-2 text-xs">{u._count.orders}</td>
                          <td className="py-3 px-2">
                            <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full ${tier.color}`}>
                              {tier.name}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          {search ? `Ничего не найдено по "${search}"` : 'Клиентов нет'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {(cursor || hasMore) && (
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-200">
                  {cursor ? (
                    <Link href={`/admin/clients?q=${encodeURIComponent(search)}`}
                      className="px-3 py-1.5 text-sm text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">
                      ← В начало
                    </Link>
                  ) : <div />}
                  {hasMore && nextCursor && (
                    <Link href={`/admin/clients?q=${encodeURIComponent(search)}&cursor=${nextCursor}`}
                      className="px-3 py-1.5 text-sm text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
                      Следующая →
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* User Card (Right Side) */}
        <div className="lg:col-span-1">
          {userCard ? (
            <div className="space-y-4 sticky top-6">
              {/* Profile Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{userCard.email}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 rounded p-2">
                      <div className="text-slate-500">Баланс</div>
                      <div className="font-bold text-lg">{(userCard.balance / 100).toFixed(2)} ₽</div>
                    </div>
                    <div className="bg-slate-50 rounded p-2">
                      <div className="text-slate-500">LTV</div>
                      <div className="font-bold text-lg">{(userCard.totalSpent / 100).toLocaleString('ru-RU')} ₽</div>
                    </div>
                    <div className="bg-slate-50 rounded p-2">
                      <div className="text-slate-500">Заказы</div>
                      <div className="font-bold">{userCard._count.orders}</div>
                    </div>
                    <div className="bg-slate-50 rounded p-2">
                      <div className="text-slate-500">Тикеты</div>
                      <div className="font-bold">{userCard._count.tickets}</div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-400">
                    Регистрация: {userCard.createdAt.toLocaleDateString('ru-RU')}
                    {userCard.personalDiscount > 0 && (
                      <span className="block">Персональная скидка: {userCard.personalDiscount}%</span>
                    )}
                    {userCard.telegramId && (
                      <span className="block">Telegram: {userCard.telegramId}</span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2 border-t border-slate-200">
                    <form action={loginAsAction} className="flex-1">
                      <input type="hidden" name="userId" value={userCard.id} />
                      <Button type="submit" variant="outline" className="w-full text-xs">
                        🔑 Войти как клиент
                      </Button>
                    </form>
                    {userCard.role === 'BANNED' ? (
                      <form action={unbanUserAction}>
                        <input type="hidden" name="userId" value={userCard.id} />
                        <Button type="submit" variant="outline" className="text-xs text-emerald-700 border-emerald-300">
                          Разбанить
                        </Button>
                      </form>
                    ) : (
                      <form action={banUserAction}>
                        <input type="hidden" name="userId" value={userCard.id} />
                        <Button type="submit" variant="outline" className="text-xs text-red-700 border-red-300">
                          Бан
                        </Button>
                      </form>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Balance Adjustment */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">💰 Изменить баланс</CardTitle>
                </CardHeader>
                <CardContent>
                  <form action={updateBalanceAction} className="space-y-3">
                    <input type="hidden" name="userId" value={userCard.id} />
                    <div>
                      <label className="text-xs text-slate-500">Сумма (копейки, − для списания)</label>
                      <Input type="number" name="amount" placeholder="10000 = 100₽" required className="text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Причина (обязательно)</label>
                      <Input type="text" name="reason" placeholder="Компенсация за #1234" required className="text-sm" />
                    </div>
                    <Button type="submit" className="w-full text-xs">Применить</Button>
                  </form>
                </CardContent>
              </Card>

              {/* Recent Orders */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">📦 Последние заказы</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {userCard.orders.map(o => (
                      <Link
                        key={o.id}
                        href={`/admin/orders?q=${o.numericId}`}
                        className="flex justify-between items-center py-1.5 px-2 text-xs bg-slate-50 rounded hover:bg-slate-100"
                      >
                        <span className="font-mono text-slate-600">#{o.numericId}</span>
                        <span className="truncate max-w-[120px] text-slate-500">{o.service.name}</span>
                        <span className="font-semibold">{(o.charge / 100).toFixed(0)} ₽</span>
                      </Link>
                    ))}
                    {userCard.orders.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-2">Нет заказов</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-slate-400 text-sm">
                ← Выберите клиента из таблицы
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
