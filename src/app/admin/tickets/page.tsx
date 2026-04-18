import { adminTicketService } from '@/services/admin/ticket.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'bg-rose-100 text-rose-800',
  PENDING: 'bg-amber-100 text-amber-800',
  CLOSED: 'bg-slate-100 text-slate-600',
};

const STATUS_LABELS: Record<string, string> = {
  ALL: 'Все',
  OPEN: 'Открыт',
  PENDING: 'Ожидает',
  CLOSED: 'Закрыт',
};

const SOURCE_LABELS: Record<string, string> = {
  ALL: 'Все',
  WEB: '🌐 Веб',
  TELEGRAM: '📱 Telegram',
  EMAIL: '📧 Email',
};

type Props = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    source?: string;
    cursor?: string;
  }>;
};

export default async function AdminTicketsPage({ searchParams }: Props) {
  const params = await searchParams;
  const search = params.q || '';
  const statusFilter = params.status || 'ALL';
  const sourceFilter = params.source || 'ALL';
  const cursor = params.cursor || undefined;

  const { items: tickets, nextCursor, hasMore } = await adminTicketService.listTickets({
    search: search || undefined,
    status: statusFilter,
    source: sourceFilter,
    cursor,
    pageSize: 50,
  });

  const stats = await adminTicketService.getTicketStats();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">💬 Тикеты</h1>
        <p className="text-slate-500 mt-1">
          Всего: {stats.total} •
          <span className="text-rose-600 font-semibold"> Открыто: {stats.open}</span> •
          Ожидает: {stats.pending} •
          Закрыто: {stats.closed}
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <form className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              name="q"
              defaultValue={search}
              placeholder="🔍 Поиск по теме или email..."
              className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
            <select name="status" defaultValue={statusFilter}
              className="px-4 py-2 text-sm border border-slate-200 rounded-md bg-white">
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <select name="source" defaultValue={sourceFilter}
              className="px-4 py-2 text-sm border border-slate-200 rounded-md bg-white">
              {Object.entries(SOURCE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <Button type="submit">Найти</Button>
          </form>
        </CardContent>
      </Card>

      {/* Tickets List */}
      <Card>
        <CardHeader>
          <CardTitle>Результаты ({tickets.length}{hasMore ? '+' : ''})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-slate-100">
            {tickets.map(ticket => {
              const lastMessage = ticket.messages[0];
              const timeSinceUpdate = Math.floor((Date.now() - new Date(ticket.updatedAt).getTime()) / (1000 * 60));
              const isUrgent = ticket.status === 'OPEN' && timeSinceUpdate > 60;

              return (
                <Link
                  key={ticket.id}
                  href={`/admin/support/${ticket.id}`}
                  className={`block hover:bg-slate-50 p-4 transition-colors ${isUrgent ? 'border-l-4 border-red-400' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900 text-sm">{ticket.subject}</h3>
                        <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full ${STATUS_STYLES[ticket.status] || 'bg-slate-100 text-slate-600'}`}>
                          {STATUS_LABELS[ticket.status] || ticket.status}
                        </span>
                        <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                          {ticket.source === 'TELEGRAM' ? '📱' : ticket.source === 'EMAIL' ? '📧' : '🌐'} {ticket.source}
                        </span>
                        {isUrgent && (
                          <span className="text-[10px] text-red-600 font-semibold bg-red-50 px-1.5 py-0.5 rounded">
                            🔴 SLA &gt;1ч
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {ticket.user.email} • {ticket._count.messages} сообщ.
                      </p>
                      {lastMessage && (
                        <p className="text-xs text-slate-400 mt-1 truncate max-w-lg">
                          <span className="font-medium">{lastMessage.sender}:</span> {lastMessage.text?.slice(0, 100)}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 shrink-0 ml-4 text-right">
                      <div>{new Date(ticket.updatedAt).toLocaleDateString('ru-RU')}</div>
                      <div>{new Date(ticket.updatedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
                      {timeSinceUpdate < 60 && (
                        <div className="text-emerald-600 font-semibold">{timeSinceUpdate} мин назад</div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
            {tickets.length === 0 && (
              <div className="py-12 text-center text-slate-400">
                {search ? `Ничего не найдено по "${search}"` : 'Тикетов нет'}
              </div>
            )}
          </div>

          {/* Pagination */}
          {(cursor || hasMore) && (
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-200">
              {cursor ? (
                <Link href={`/admin/tickets?q=${encodeURIComponent(search)}&status=${statusFilter}&source=${sourceFilter}`}
                  className="px-3 py-1.5 text-sm text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">
                  ← В начало
                </Link>
              ) : <div />}
              {hasMore && nextCursor && (
                <Link href={`/admin/tickets?q=${encodeURIComponent(search)}&status=${statusFilter}&source=${sourceFilter}&cursor=${nextCursor}`}
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
