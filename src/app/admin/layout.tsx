import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import Link from 'next/link';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await verifySession();
  
  if (!session) {
    redirect('/login');
  }

  const user = await db.user.findUnique({ where: { id: session.userId } });

  if (!user || !['ADMIN', 'SUPPORT'].includes(user.role)) {
    redirect('/dashboard/new-order'); // Redirect ordinary users to client dashboard
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 text-white flex-shrink-0">
        <div className="p-6">
          <h2 className="text-xl font-bold tracking-tight mb-2 text-indigo-400">Smmplan Admin</h2>
          <p className="text-xs text-slate-400">Logged in as {user.email}</p>
          <span className="inline-block mt-1 px-2 py-0.5 bg-slate-800 text-[10px] rounded uppercase font-semibold text-slate-300">
            {user.role}
          </span>
        </div>
        <nav className="px-4 py-2 space-y-1">
          {user.role === 'ADMIN' && (
            <Link 
              href="/admin/finance"
              className="block px-4 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              Financial Dashboard
            </Link>
          )}
          
          <Link 
            href="/admin/support"
            className="block px-4 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            Support Inbox
          </Link>
          
          {user.role === 'ADMIN' && (
            <>
              <Link 
                href="/admin/pages"
                className="block px-4 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                CMS (Pages)
              </Link>
              <Link 
                href="/admin/settings"
                className="block px-4 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                ⚙ Settings
              </Link>
            </>
          )}
          
          <div className="pt-4 mt-4 border-t border-slate-800">
            <Link 
              href="/dashboard/new-order"
              className="block px-4 py-2 text-sm font-medium rounded-md text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              Return to Client Mode
            </Link>
          </div>
        </nav>
      </aside>
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-6 md:p-10">
        {children}
      </main>
    </div>
  );
}
