import { db } from '@/lib/db';
import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createTicket } from '@/actions/support/ticket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export const dynamic = 'force-dynamic';

export default async function ClientSupportPage() {
  const session = await verifySession();
  if (!session) redirect('/login');

  const tickets = await db.ticket.findMany({
    where: { userId: session.userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { messages: true } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 }
    }
  });

  const openTicket = tickets.find(t => t.status !== 'CLOSED');

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <h1 className="text-2xl font-bold">Support</h1>

      {/* New conversation */}
      {!openTicket && (
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Start a conversation</h2>
          <form action={createTicket} className="space-y-4">
            <Input name="subject" placeholder="Topic (e.g., Order issue, Question)" required />
            <Textarea name="message" placeholder="Describe your issue..." required className="min-h-[100px]" />
            <Button type="submit">Send</Button>
          </form>
        </div>
      )}

      {openTicket && (
        <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl text-sm text-indigo-800">
          You have an active conversation.{' '}
          <Link href={`/dashboard/support/${openTicket.id}`} className="font-bold underline">
            Open it →
          </Link>
        </div>
      )}

      {/* Conversation list */}
      <div className="bg-white border rounded-xl overflow-hidden divide-y divide-slate-100">
        {tickets.map(ticket => (
          <Link
            key={ticket.id}
            href={`/dashboard/support/${ticket.id}`}
            className="block hover:bg-slate-50 p-4 transition-colors"
          >
            <div className="flex justify-between items-center">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-slate-900 truncate">{ticket.subject}</h3>
                <p className="text-xs text-slate-500 mt-1 truncate">
                  {ticket.messages[0]?.text?.slice(0, 80) || 'No messages'}
                </p>
              </div>
              <div className="ml-4 text-right shrink-0">
                <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                  ticket.status === 'OPEN' ? 'bg-rose-100 text-rose-800' :
                  ticket.status === 'PENDING' ? 'bg-emerald-100 text-emerald-800' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {ticket.status === 'PENDING' ? 'Reply received' : ticket.status}
                </span>
                <div className="text-[10px] text-slate-400 mt-1">{ticket._count.messages} msgs</div>
              </div>
            </div>
          </Link>
        ))}
        {tickets.length === 0 && (
          <div className="p-10 text-center text-slate-400">No conversations yet.</div>
        )}
      </div>
    </div>
  );
}
