import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import Link from 'next/link';
import { Toaster } from '@/components/ui/sonner';
import { CommandMenu } from '@/components/admin/command-menu';

// RBAC: Allowed roles for admin panel access
const ADMIN_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'SUPPORT'];

// Navigation tabs with role-based visibility
const ADMIN_TABS = [
  { href: '/admin/dashboard', label: '📊 Дашборд',   roles: ['OWNER', 'ADMIN', 'MANAGER'] },
  { href: '/admin/clients',   label: '👥 Клиенты',    roles: ['OWNER', 'ADMIN', 'MANAGER', 'SUPPORT'] },
  { href: '/admin/orders',    label: '📦 Заказы',     roles: ['OWNER', 'ADMIN', 'MANAGER', 'SUPPORT'] },
  { href: '/admin/refills',   label: '🔄 Докрутки',   roles: ['OWNER', 'ADMIN', 'MANAGER', 'SUPPORT'] },
  { href: '/admin/catalog',   label: '🛒 Каталог',    roles: ['OWNER', 'ADMIN', 'MANAGER'] },
  { href: '/admin/tickets',   label: '💬 Тикеты',     roles: ['OWNER', 'ADMIN', 'MANAGER', 'SUPPORT'] },
  { href: '/admin/finance',   label: '💳 Финансы',    roles: ['OWNER', 'ADMIN'] },
  { href: '/admin/providers', label: '🔌 Провайдеры', roles: ['OWNER', 'ADMIN'] },
  { href: '/admin/marketing', label: '🎁 Маркетинг',  roles: ['OWNER', 'ADMIN', 'MANAGER'] },
  { href: '/admin/pages',     label: '📝 Страницы',   roles: ['OWNER', 'ADMIN', 'MANAGER'] },
  { href: '/admin/settings',  label: '⚙ Настройки',  roles: ['OWNER', 'ADMIN'] },
];

// Role display labels (Russian)
const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  OWNER:   { label: 'Владелец',  color: 'bg-amber-100 text-amber-800' },
  ADMIN:   { label: 'Админ',     color: 'bg-indigo-100 text-indigo-800' },
  MANAGER: { label: 'Менеджер',  color: 'bg-emerald-100 text-emerald-800' },
  SUPPORT: { label: 'Саппорт',   color: 'bg-slate-100 text-slate-600' },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await verifySession();
  
  if (!session) {
    redirect('/login');
  }

  const user = await db.user.findUnique({ where: { id: session.userId } });

  if (!user || !ADMIN_ROLES.includes(user.role)) {
    redirect('/dashboard/new-order');
  }

  const visibleTabs = ADMIN_TABS.filter(tab => tab.roles.includes(user.role));
  const roleInfo = ROLE_LABELS[user.role] || { label: user.role, color: 'bg-slate-100 text-slate-800' };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 text-white flex-shrink-0">
        <div className="p-6">
          <h2 className="text-xl font-bold tracking-tight mb-2 text-indigo-400">Smmplan Admin</h2>
          <p className="text-xs text-slate-400">{user.email}</p>
          <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] rounded uppercase font-semibold ${roleInfo.color}`}>
            {roleInfo.label}
          </span>
        </div>
        <nav className="px-4 py-2 space-y-1">
          <CommandMenu />
          {visibleTabs.map(tab => (
            <Link
              key={tab.href}
              href={tab.href}
              className="block px-4 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              {tab.label}
            </Link>
          ))}

          <div className="pt-4 mt-4 border-t border-slate-800">
            <Link
              href="/dashboard/new-order"
              className="block px-4 py-2 text-sm font-medium rounded-md text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              ← Режим клиента
            </Link>
          </div>
        </nav>
      </aside>
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-6 md:p-10">
        {children}
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
}
