import { db } from '@/lib/db';
import { adminTicketService } from '@/services/admin/ticket.service';
import { adminReplyTicket, editTicketMessage } from '@/actions/support/ticket';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { MessageSquare, Mail, Wallet, Search } from 'lucide-react';
import ChatWindow from '@/components/support/ChatWindow';
import TicketActionsDropdown from '@/components/support/TicketActionsDropdown';
import ClientProfileSidebar from '@/components/support/ClientProfileSidebar';
import { getTemplates } from '@/actions/support/template';

import { verifySession } from '@/lib/session';

export const dynamic = 'force-dynamic';

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'bg-rose-100 text-rose-800',
  PENDING: 'bg-amber-100 text-amber-800',
  CLOSED: 'bg-slate-100 text-slate-600',
};

const STATUS_LABELS: Record<string, string> = {
  ALL: 'Все',
  OPEN: 'Открытые',
  PENDING: 'В ожидании',
  CLOSED: 'Закрытые',
};

type Props = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    source?: string;
    chatId?: string;
    page?: string;
  }>;
};

export default async function AdminTicketsPage({ searchParams }: Props) {
  const params = await searchParams;
  const search = params.q || '';
  const statusFilter = params.status || 'ALL';
  const chatId = params.chatId || null;
  const currentPage = parseInt(params.page || '1', 10);

  // 1. Fetch tickets for sidebar
  const { items: tickets, totalPages } = await adminTicketService.listTickets({
    search: search || undefined,
    status: statusFilter,
    pageSize: 50,
    page: currentPage,
  });

  const stats = await adminTicketService.getTicketStats();
  
  // Fetch dynamic templates
  const templates = await getTemplates();

  // Fetch admin support limit
  const session = await verifySession();
  let supportLimitCents = 0;
  if (session?.userId) {
    const admin = await db.user.findUnique({ where: { id: session.userId }, select: { supportLimitCents: true } });
    if (admin) supportLimitCents = admin.supportLimitCents;
  }

  // 2. Fetch active chat if exists
  // We use db directly here as adminTicketService currently doesn't have a specific `getTicketDetails` method.
  let activeTicket = null;
  let serializedMessages: any[] = [];
  
  if (chatId) {
    const rawTicket = await db.ticket.findUnique({
      where: { id: chatId },
      include: {
        user: { 
          select: { 
            email: true, balance: true, id: true, 
            createdAt: true, totalSpent: true,
            orders: { take: 3, orderBy: { createdAt: 'desc' }, include: { service: { select: { name: true } } } },
            payments: { take: 3, orderBy: { createdAt: 'desc' } }
          } 
        },
        messages: { orderBy: { createdAt: 'asc' } }
      }
    });

    if (rawTicket) {
      activeTicket = rawTicket;
      serializedMessages = rawTicket.messages.map(m => ({
        id: m.id,
        sender: m.sender,
        text: m.text,
        mediaUrl: m.mediaUrl,
        mediaType: m.mediaType,
        createdAt: m.createdAt.toISOString(),
      }));
    }
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-4 animate-in fade-in duration-500 ease-out">
      
      {/* ⬅️ Левая панель (Список диалогов) */}
      <Card className="w-[380px] flex flex-col shrink-0 border-slate-200 overflow-hidden shadow-[0_4px_20px_rgb(0,0,0,0.03)] bg-white">
        
        {/* Шапка списка */}
        <div className="p-4 border-b border-slate-100 bg-white">
          <h2 className="font-bold text-lg text-slate-900 mb-3 flex items-center justify-between">
            Список диалогов
            <span className="text-xs bg-slate-100 text-slate-500 px-2 flex items-center rounded-md font-semibold">
              Всего: {stats.total}
            </span>
          </h2>

          <div className="flex gap-1.5 text-[10px] mb-4 overflow-x-auto custom-scrollbar pb-1">
             <Link href={`/admin/tickets?status=ALL&q=${search}`} className={`px-2 py-1 rounded border font-semibold whitespace-nowrap ${statusFilter === 'ALL' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                Все <span className="opacity-50 ml-1">{stats.total}</span>
             </Link>
             <Link href={`/admin/tickets?status=OPEN&q=${search}`} className={`px-2 py-1 rounded border font-semibold whitespace-nowrap ${statusFilter === 'OPEN' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                Открытые <span className="opacity-50 ml-1">{stats.open}</span>
             </Link>
             <Link href={`/admin/tickets?status=PENDING&q=${search}`} className={`px-2 py-1 rounded border font-semibold whitespace-nowrap ${statusFilter === 'PENDING' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                В ожидании <span className="opacity-50 ml-1">{stats.pending}</span>
             </Link>
             <Link href={`/admin/tickets?status=CLOSED&q=${search}`} className={`px-2 py-1 rounded border font-semibold whitespace-nowrap ${statusFilter === 'CLOSED' ? 'bg-slate-100 border-slate-300 text-slate-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                Закрытые <span className="opacity-50 ml-1">{stats.closed}</span>
             </Link>
          </div>

          <form className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              name="q"
              defaultValue={search}
              placeholder="Поиск по теме или email..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400"
            />
            <input type="hidden" name="status" value={statusFilter} />
          </form>
        </div>

        {/* Список (Scrollable) */}
        <div className="flex-1 overflow-y-auto bg-white divide-y divide-slate-50 custom-scrollbar">
          {tickets.map(ticket => {
            const isActive = ticket.id === chatId;
            const lastMsg = ticket.messages[0];
            const timeSinceUpdate = Math.floor((Date.now() - new Date(ticket.updatedAt).getTime()) / (1000 * 60));
            const isUrgent = ticket.status === 'OPEN' && timeSinceUpdate > 60;
            
            return (
              <Link
                key={ticket.id}
                href={`/admin/tickets?chatId=${ticket.id}&status=${statusFilter}&q=${encodeURIComponent(search)}`}
                className={`block relative p-4 transition-colors ${
                  isActive ? 'bg-indigo-50/50' : 'hover:bg-slate-50/80'
                }`}
              >
                {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-r"></div>}
                
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-3 max-w-[70%]">
                    <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200">
                       <span className="font-bold text-xs uppercase">{ticket.user.email.substring(0,2)}</span>
                    </div>
                    <div className="truncate">
                      <div className="font-semibold text-slate-900 text-[13px] truncate">{ticket.user.email}</div>
                      <div className="text-[10px] pb-0.5 text-slate-500 flex items-center gap-1 mt-0.5">
                         {ticket.source === 'TELEGRAM' && '✈️ Telegram'}
                         {ticket.source === 'EMAIL' && '📧 Email'}
                         {ticket.source === 'WEB' && '🌐 Сайт'}
                         {ticket._count.messages > 0 && <span className="bg-slate-200 text-slate-500 font-bold rounded-full px-1.5">{ticket._count.messages}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] text-slate-400 font-medium">
                      {new Date(ticket.updatedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {isUrgent && <div className="text-[9px] text-rose-500 font-bold uppercase mt-1 text-right">🔥 SLA &gt;1ч</div>}
                  </div>
                </div>

                <div className="pl-12 mt-1 -mr-2">
                   <div className="text-xs font-semibold text-slate-700 truncate">{ticket.subject}</div>
                   {lastMsg && (
                      <p className="text-[11px] text-slate-500 truncate mt-0.5 max-w-full">
                        {lastMsg.sender === 'USER' ? '' : <span className="text-indigo-500 font-medium">Вы: </span>}
                        {lastMsg.text}
                      </p>
                   )}
                </div>
              </Link>
            );
          })}

          {tickets.length === 0 && (
            <div className="py-16 text-center">
              <span className="text-4xl mb-2 block">📭</span>
              <p className="text-sm text-slate-400">Диалоги не найдены</p>
            </div>
          )}
        </div>

        {/* Пагинация */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between shadow-inner">
            <Link 
              href={`/admin/tickets?status=${statusFilter}&q=${encodeURIComponent(search)}${currentPage > 1 ? `&page=${currentPage - 1}` : ''}`} 
              className={`px-3 py-1 text-xs font-bold uppercase rounded border transition-colors ${currentPage > 1 ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100' : 'opacity-50 pointer-events-none cursor-not-allowed bg-transparent border-transparent text-slate-400'}`}
            >
              Пред
            </Link>
            <span className="text-xs font-semibold text-slate-500">Стр. {currentPage} из {totalPages}</span>
            <Link 
              href={`/admin/tickets?status=${statusFilter}&q=${encodeURIComponent(search)}&page=${currentPage + 1}`} 
              className={`px-3 py-1 text-xs font-bold uppercase rounded border transition-colors ${currentPage < totalPages ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100' : 'opacity-50 pointer-events-none cursor-not-allowed bg-transparent border-transparent text-slate-400'}`}
            >
              След
            </Link>
          </div>
        )}
      </Card>

      {/* ➡️ Правая панель (Окно чата) */}
      <Card className="flex-1 flex flex-col overflow-hidden border-slate-200 shadow-[0_4px_20px_rgb(0,0,0,0.03)] relative bg-white">
        {activeTicket ? (
          <>
            {/* Шапка чата */}
            <div className="p-4 border-b border-slate-100 bg-white flex justify-between items-start shrink-0 z-10 relative">
              <div className="flex items-start gap-3 min-w-0 pr-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 shadow-sm mt-1">
                  <span className="font-bold text-slate-500">{activeTicket.user.email.substring(0, 2).toUpperCase()}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold text-lg lg:text-xl text-slate-900 leading-tight mb-2 break-words line-clamp-2" title={activeTicket.subject}>
                    {activeTicket.subject}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 text-xs lg:text-sm">
                    <span className="text-slate-500 flex items-center gap-1 min-w-0 truncate" title={activeTicket.user.email}>
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{activeTicket.user.email}</span>
                    </span>
                    <span className="text-emerald-600 font-medium flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-md whitespace-nowrap shrink-0">
                      <Wallet className="w-3.5 h-3.5" />
                      {(activeTicket.user.balance / 100).toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 items-center">
                 <TicketActionsDropdown 
                   ticketId={activeTicket.id} 
                   currentStatus={activeTicket.status}
                   templates={templates}
                   supportLimitCents={supportLimitCents}
                 />
              </div>
            </div>

            {/* Тело чата */}
            <div className="flex-1 bg-slate-50 relative overflow-hidden flex flex-col">
               <ChatWindow
                 ticketId={activeTicket.id}
                 initialMessages={serializedMessages}
                 isStaff={true}
                 initialTemplates={templates}
                 onSendMessage={adminReplyTicket}
                 editTicketMessage={editTicketMessage}
               />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/30">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mb-6 relative">
              <MessageSquare className="w-10 h-10 text-indigo-200" />
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                 {stats.open}
              </div>
            </div>
            <h2 className="text-xl font-bold text-slate-700 mb-2">Общение с клиентами</h2>
            <p className="text-sm max-w-sm text-center">Выберите диалог слева для просмотра истории и ответа клиентам. Тикеты обновляются во вкладке.</p>
          </div>
        )}
      </Card>

      {/* ➡️ Прайд панель (Профиль клиента) */}
      {activeTicket && (
         <ClientProfileSidebar user={activeTicket.user as any} />
      )}

    </div>
  );
}
