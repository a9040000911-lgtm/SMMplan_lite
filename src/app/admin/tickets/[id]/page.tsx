import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import { adminReplyTicket } from '@/actions/support/ticket';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export const dynamic = 'force-dynamic';

export default async function AdminTicketChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const ticket = await db.ticket.findUnique({
    where: { id },
    include: {
      user: true,
      messages: { orderBy: { createdAt: 'asc' } }
    }
  });

  if (!ticket) return notFound();

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-6rem)]">
      <div className="bg-white p-6 border-b border-slate-200">
        <h1 className="text-2xl font-bold">{ticket.subject}</h1>
        <p className="text-sm text-slate-500">
          Client: {ticket.user.email} | Status: <span className="font-semibold text-slate-700">{ticket.status}</span>
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
        {ticket.messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'USER' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[75%] rounded-lg p-4 ${
              msg.sender === 'USER' ? 'bg-white border border-slate-200 text-slate-900' :
              msg.sender === 'INTERNAL' ? 'bg-amber-100 text-amber-900 border border-amber-200' :
              'bg-indigo-600 text-white'
            }`}>
              <div className="text-xs font-semibold mb-1 opacity-70">
                {msg.sender === 'INTERNAL' ? 'INTERNAL NOTE' : msg.sender} • {msg.createdAt.toLocaleString()}
              </div>
              <div className="whitespace-pre-wrap">{msg.text}</div>
            </div>
          </div>
        ))}
        {ticket.messages.length === 0 && (
          <div className="text-center text-slate-500 py-10">No messages yet.</div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-slate-200">
        <form action={adminReplyTicket} className="space-y-4">
          <input type="hidden" name="ticketId" value={ticket.id} />
          <Textarea 
            name="message" 
            placeholder="Type your reply here..." 
            className="min-h-[100px] resize-none"
            required
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox id="isInternal" name="isInternal" value="true" />
              <Label htmlFor="isInternal" className="text-amber-600 font-medium">Save as Internal Note (Hidden from client)</Label>
            </div>
            <Button type="submit">Send Reply</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
