import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import { adminReplyTicket } from '@/actions/support/ticket';
import ChatWindow from '@/components/support/ChatWindow';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const ticket = await db.ticket.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, balance: true, id: true } },
      messages: { orderBy: { createdAt: 'asc' } }
    }
  });

  if (!ticket) return notFound();

  // Load user order context for support staff
  const userOrders = await db.order.findMany({
    where: { userId: ticket.user.id },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { service: { select: { name: true } } }
  });

  const serializedMessages = ticket.messages.map(m => ({
    id: m.id,
    sender: m.sender,
    text: m.text,
    mediaUrl: m.mediaUrl,
    mediaType: m.mediaType,
    createdAt: m.createdAt.toISOString(),
  }));

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-6rem)] flex gap-4">
      {/* Chat */}
      <div className="flex-1 flex flex-col bg-white rounded-xl border overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center gap-3">
          <Link href="/admin/support" className="text-indigo-600 text-sm font-medium hover:text-indigo-900">← Inbox</Link>
          <div>
            <h1 className="text-lg font-bold">{ticket.subject}</h1>
            <p className="text-xs text-slate-500">{ticket.user.email}</p>
          </div>
          <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            ticket.status === 'OPEN' ? 'bg-rose-100 text-rose-800' :
            ticket.status === 'PENDING' ? 'bg-emerald-100 text-emerald-800' :
            'bg-slate-100 text-slate-600'
          }`}>{ticket.status}</span>
        </div>
        <ChatWindow
          ticketId={ticket.id}
          initialMessages={serializedMessages}
          isStaff={true}
          onSendMessage={adminReplyTicket}
        />
      </div>

      {/* Client Context Sidebar */}
      <div className="w-72 shrink-0 space-y-4">
        <div className="bg-white rounded-xl border p-4">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Client Info</h3>
          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Email</span>
              <span className="font-mono">{ticket.user.email}</span>
            </div>
            <div className="flex justify-between">
              <span>Balance</span>
              <span className="font-semibold">{(ticket.user.balance / 100).toFixed(2)} ₽</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Recent Orders</h3>
          <div className="space-y-2">
            {userOrders.map(order => (
              <div key={order.id} className="text-xs p-2 bg-slate-50 rounded-lg border border-slate-100">
                <div className="font-medium truncate">{order.service.name}</div>
                <div className="flex justify-between mt-1 text-slate-500">
                  <span>{order.quantity} pcs</span>
                  <span className={`font-semibold ${
                    order.status === 'COMPLETED' ? 'text-emerald-600' :
                    order.status === 'CANCELED' ? 'text-rose-600' :
                    'text-amber-600'
                  }`}>{order.status}</span>
                </div>
              </div>
            ))}
            {userOrders.length === 0 && (
              <p className="text-xs text-slate-400">No orders.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
