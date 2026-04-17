import { db } from '@/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminSupportPage() {
  const tickets = await db.ticket.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      user: { select: { email: true } },
      _count: { select: { messages: true } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 }
    }
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Support Inbox</h1>
        <p className="text-slate-500">{tickets.length} conversations</p>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden divide-y divide-slate-100">
        {tickets.map(ticket => (
          <Link
            key={ticket.id}
            href={`/admin/support/${ticket.id}`}
            className="block hover:bg-slate-50 p-5 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-slate-900">{ticket.subject}</h3>
                  <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                    ticket.status === 'OPEN' ? 'bg-rose-100 text-rose-800' :
                    ticket.status === 'PENDING' ? 'bg-emerald-100 text-emerald-800' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {ticket.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {ticket.user.email} • {ticket._count.messages} messages
                </p>
                <p className="text-xs text-slate-400 mt-1 truncate">
                  {ticket.messages[0]?.text?.slice(0, 100) || 'No messages'}
                </p>
              </div>
              <div className="text-xs text-slate-400 shrink-0 ml-4">
                {ticket.updatedAt.toLocaleDateString('ru-RU')}
              </div>
            </div>
          </Link>
        ))}
        {tickets.length === 0 && (
          <div className="p-12 text-center text-slate-400">No support conversations yet.</div>
        )}
      </div>
    </div>
  );
}
