import { db } from '@/lib/db';
import { verifySession } from '@/lib/session';
import { notFound, redirect } from 'next/navigation';
import { addTicketMessage } from '@/actions/support/ticket';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ClientTicketChatPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession();
  if (!session) redirect('/login');

  const { id } = await params;
  
  const ticket = await db.ticket.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: 'asc' } }
    }
  });

  if (!ticket || ticket.userId !== session.userId) return notFound();

  // Filter out internal messages for the client
  const visibleMessages = ticket.messages.filter(m => m.sender !== 'INTERNAL');

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-6rem)] py-6 px-4">
      <div className="flex items-center space-x-4 mb-4">
        <Link href="/dashboard/tickets" className="text-sm font-medium text-indigo-600 hover:text-indigo-900">
          ← Back to Tickets
        </Link>
        <h1 className="text-xl font-bold flex-1">{ticket.subject}</h1>
      </div>

      <div className="flex-1 overflow-y-auto bg-white rounded-t-xl border border-slate-200 p-6 space-y-6">
        {visibleMessages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'USER' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-5 py-3 ${
              msg.sender === 'USER' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-100 text-slate-800 rounded-bl-none'
            }`}>
              <div className="whitespace-pre-wrap">{msg.text}</div>
              <div className={`text-[10px] mt-2 font-medium opacity-60 ${msg.sender === 'USER' ? 'text-right' : 'text-left'}`}>
                {msg.sender === 'STAFF' ? 'Support Team' : 'You'} • {msg.createdAt.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-50 border-x border-b border-slate-200 rounded-b-xl p-4">
        {ticket.status === 'CLOSED' ? (
          <div className="text-center text-slate-500 font-medium">This ticket has been closed.</div>
        ) : (
          <form action={addTicketMessage} className="flex flex-col space-y-3">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <Textarea 
              name="message" 
              placeholder="Write a message..." 
              required 
              className="resize-none min-h-[80px]"
            />
            <div className="flex justify-end">
              <Button type="submit">Send Message</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
