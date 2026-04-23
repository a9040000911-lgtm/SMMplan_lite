import { adminUserService, getVolumeTier } from '@/services/admin/user.service';
import { updateBalanceAction, banUserAction, unbanUserAction, loginAsAction } from '@/actions/admin/users';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { AdminPageHeader } from '@/components/admin/page-header';
import { ClientTable } from './components/client-table';
import { Users, Download, Search, Key, Ban, UserCheck, CreditCard, ShoppingBag } from 'lucide-react';

export const dynamic = 'force-dynamic';

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  OWNER:   { label: 'Владелец', color: 'bg-indigo-500/10 text-indigo-700 border-indigo-200' },
  ADMIN:   { label: 'Админ',   color: 'bg-sky-500/10 text-sky-700 border-sky-200' },
  MANAGER: { label: 'Менеджер', color: 'bg-emerald-500/10 text-emerald-700 border-emerald-200' },
  SUPPORT: { label: 'Саппорт', color: 'bg-slate-500/10 text-slate-700 border-slate-200' },
  USER:    { label: 'Клиент',  color: 'bg-white border-slate-200 text-slate-700' },
  BANNED:  { label: 'Забанен', color: 'bg-rose-500/10 text-rose-700 border-rose-200' },
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
    <div className="space-y-6 w-full animate-in fade-in duration-500 ease-out sm:px-2 md:px-0 bg-slate-50/50 min-h-full pb-10">
      <AdminPageHeader
        icon={Users}
        title="Клиенты платформы"
        description={
          <>
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>Всего: {stats.total}</span>
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>Активные: {stats.active}</span>
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-rose-500 rounded-full"></div>Забанены: {stats.banned}</span>
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>Liability: <span className="tabular-nums font-bold">{(stats.totalLiability / 100).toLocaleString('ru-RU')} ₽</span></span>
          </>
        }
        action={(
          <a
            href={`/api/admin/export?type=users&q=${encodeURIComponent(search)}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 shadow-sm rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors"
          >
            <Download className="w-4 h-4" /> Экспорт CSV
          </a>
        )}
      />

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

      <Card>
        <CardContent className="pt-6">
          <ClientTable 
            data={users.map(u => ({
              ...u,
              tier: getVolumeTier(u.totalSpent)
            })) as any}
          >
            {userCard ? (
              <div className="space-y-4">
                {/* Profile Card */}
                <Card className="shadow-none border-none bg-transparent">
                  <CardContent className="p-0 space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                        <div className="text-slate-500 mb-1">Баланс</div>
                        <div className="font-bold text-lg text-slate-900">{(userCard.balance / 100).toFixed(2)} ₽</div>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                        <div className="text-slate-500 mb-1">LTV</div>
                        <div className="font-bold text-lg text-slate-900">{(userCard.totalSpent / 100).toLocaleString('ru-RU')} ₽</div>
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                      <p>Зарегистрирован: {userCard.createdAt.toLocaleDateString('ru-RU')}</p>
                      {userCard.personalDiscount > 0 && (
                        <p className="mt-1 text-indigo-600 font-medium">Скидка: {userCard.personalDiscount}%</p>
                      )}
                      {userCard.telegramId && (
                        <p className="mt-1">Telegram: {userCard.telegramId}</p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <form action={loginAsAction} className="flex-1">
                        <input type="hidden" name="userId" value={userCard.id} />
                        <Button type="submit" variant="outline" className="w-full text-xs h-9">
                          🔑 Войти как
                        </Button>
                      </form>
                      {userCard.role === 'BANNED' ? (
                        <form action={unbanUserAction}>
                          <input type="hidden" name="userId" value={userCard.id} />
                          <Button type="submit" variant="outline" className="text-xs h-9 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50">
                            Разбанить
                          </Button>
                        </form>
                      ) : (
                        <form action={banUserAction}>
                          <input type="hidden" name="userId" value={userCard.id} />
                          <Button type="submit" variant="outline" className="text-xs h-9 text-rose-600 hover:text-rose-700 hover:bg-rose-50">
                            Бан
                          </Button>
                        </form>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Balance Adjustment */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">💰 Корректировка баланса</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form action={updateBalanceAction} className="space-y-3">
                      <input type="hidden" name="userId" value={userCard.id} />
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Сумма (в копейках, − для списания)</label>
                        <Input type="number" name="amount" placeholder="10000 = 100₽" required className="h-9 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Причина / Комментарий</label>
                        <Input type="text" name="reason" placeholder="Например: Компенсация за #1234" required className="h-9 text-sm" />
                      </div>
                      <Button type="submit" className="w-full text-xs h-9">Применить</Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Recent Orders */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">📦 Последние 10 заказов</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {userCard.orders.map(o => (
                        <Link
                          key={o.id}
                          href={`/admin/orders?q=${o.numericId}`}
                          className="flex justify-between items-center py-2 px-3 text-xs bg-slate-50 border border-slate-100 rounded-md hover:border-slate-300 transition-colors"
                        >
                          <span className="font-mono text-slate-600 font-medium">#{o.numericId}</span>
                          <span className="truncate max-w-[150px] text-slate-600 px-2">{o.service.name}</span>
                          <span className="font-semibold text-slate-900 border-l border-slate-200 pl-2">{(o.charge / 100).toFixed(0)} ₽</span>
                        </Link>
                      ))}
                      {userCard.orders.length === 0 && (
                        <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-md">Нет заказов</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center gap-4 justify-center h-full text-slate-400">
                <div className="animate-spin h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                Загрузка профиля...
              </div>
            )}
          </ClientTable>

          {/* Pagination for Server Sync */}
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
  );
}
