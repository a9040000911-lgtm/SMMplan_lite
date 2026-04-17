import { db } from '@/lib/db';
import { verifySession } from '@/lib/session';
import { redirect, notFound } from 'next/navigation';
import { addTicketMessage } from '@/actions/support/ticket';
import ChatWindow from '@/components/support/ChatWindow';

export const dynamic = 'force-dynamic';

export default async function ClientChatPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession();
  if (!session) redirect('/login');

  const { id } = await params;

  const ticket = await db.ticket.findUnique({
    where: { id },
    include: {
      messages: {
        where: { sender: { not: 'INTERNAL' } }, // Hide internal notes from client
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!ticket || ticket.userId !== session.userId) return notFound();

  const serializedMessages = ticket.messages.map(m => ({
    id: m.id,
    sender: m.sender,
    text: m.text,
    mediaUrl: m.mediaUrl,
    mediaType: m.mediaType,
    createdAt: m.createdAt.toISOString(),
  }));

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
      <div className="p-4 bg-white border-b border-slate-200 flex items-center gap-3">
        <a href="/dashboard/support" className="text-indigo-600 text-sm font-medium hover:text-indigo-900">← Back</a>
        <div>
          <h1 className="text-lg font-bold">{ticket.subject}</h1>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            ticket.status === 'OPEN' ? 'bg-rose-100 text-rose-800' :
            ticket.status === 'PENDING' ? 'bg-emerald-100 text-emerald-800' :
            'bg-slate-100 text-slate-600'
          }`}>{ticket.status}</span>
        </div>
      </div>
      <ChatWindow
        ticketId={ticket.id}
        initialMessages={serializedMessages}
        isStaff={false}
        onSendMessage={addTicketMessage}
      />
    </div>
  );
}
