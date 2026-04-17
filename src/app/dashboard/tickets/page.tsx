import { db } from '@/lib/db';
import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createTicket } from '@/actions/support/ticket';

export const dynamic = 'force-dynamic';

export default async function ClientTicketsPage() {
  const session = await verifySession();
  if (!session) redirect('/login');

  const tickets = await db.ticket.findMany({
    where: { userId: session.userId },
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { messages: true } } }
  });

  // Check if open ticket exists to prevent spam
  const openTicket = tickets.find(t => t.status !== 'CLOSED');

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">My Support Tickets</h1>
      </div>

      {!openTicket && (
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h2 className="text-lg font-medium mb-4">Create New Ticket</h2>
          <form action={createTicket} className="space-y-4">
            <div>
              <Input name="subject" placeholder="Ticket Subject (e.g., Order #123 issue)" required />
            </div>
            <div>
              <Textarea name="message" placeholder="Describe your issue in detail..." required className="min-h-[100px]" />
            </div>
            <Button type="submit">Submit Ticket</Button>
          </form>
        </div>
      )}

      {openTicket && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-md text-amber-800 text-sm">
          You have an active ticket. Please resolve or close it before opening a new one.
        </div>
      )}

      <div className="bg-white border rounded-lg overflow-hidden">
        <ul className="divide-y divide-slate-200">
          {tickets.map(ticket => (
            <li key={ticket.id}>
              <Link href={`/dashboard/tickets/${ticket.id}`} className="block hover:bg-slate-50 p-4 transition-colors">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-md font-semibold text-slate-900">{ticket.subject}</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {ticket.updatedAt.toLocaleDateString()} • {ticket._count.messages} messages
                    </p>
                  </div>
                  <div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      ticket.status === 'OPEN' ? 'bg-rose-100 text-rose-800' :
                      ticket.status === 'PENDING' ? 'bg-emerald-100 text-emerald-800' :
                      'bg-slate-100 text-slate-800'
                    }`}>
                      {ticket.status === 'PENDING' ? 'WAITING FOR YOU' : ticket.status}
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
          {tickets.length === 0 && (
            <li className="p-8 text-center text-slate-500">You haven't opened any support tickets yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
