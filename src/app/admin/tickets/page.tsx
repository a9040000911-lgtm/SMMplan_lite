import { db } from '@/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminTicketsPage() {
  const tickets = await db.ticket.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { user: true, _count: { select: { messages: true } } }
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Support Tickets</h1>
        <p className="text-slate-500">Manage user inquiries and issues.</p>
      </div>

      <div className="bg-white border rounded-md shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-slate-500 uppercase tracking-wider">Subject</th>
              <th className="px-6 py-3 text-left font-medium text-slate-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left font-medium text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left font-medium text-slate-500 uppercase tracking-wider">Messages</th>
              <th className="px-6 py-3 text-left font-medium text-slate-500 uppercase tracking-wider">Updated</th>
              <th className="px-6 py-3 text-right font-medium text-slate-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{ticket.subject}</td>
                <td className="px-6 py-4 whitespace-nowrap text-slate-500">{ticket.user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 text-xs font-semibold rounded-full ${
                    ticket.status === 'OPEN' ? 'bg-rose-100 text-rose-800' :
                    ticket.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {ticket.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-slate-500">{ticket._count.messages}</td>
                <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                  {ticket.updatedAt.toLocaleDateString()} {ticket.updatedAt.toLocaleTimeString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                  <Link href={`/admin/tickets/${ticket.id}`} className="text-indigo-600 hover:text-indigo-900">
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {tickets.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  No tickets found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
