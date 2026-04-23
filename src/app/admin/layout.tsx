import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import Link from 'next/link';
import { Toaster } from '@/components/ui/sonner';
import { AdminSidebar } from '@/components/admin/sidebar';
import { CommandPalette } from '@/components/admin/command-palette';

// RBAC: Allowed roles for admin panel access
const ADMIN_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'SUPPORT'];

// Navigation tabs with role-based visibility
const ADMIN_TABS = [
  { href: '/admin/dashboard', icon: 'Home',          label: 'Дашборд',   roles: ['OWNER', 'ADMIN', 'MANAGER'] },
  { href: '/admin/clients',   icon: 'Users',         label: 'Клиенты',    roles: ['OWNER', 'ADMIN', 'MANAGER', 'SUPPORT'] },
  { href: '/admin/orders',    icon: 'Package',       label: 'Заказы',     roles: ['OWNER', 'ADMIN', 'MANAGER', 'SUPPORT'] },
  { href: '/admin/refills',   icon: 'RefreshCw',     label: 'Докрутки',   roles: ['OWNER', 'ADMIN', 'MANAGER', 'SUPPORT'] },
  { href: '/admin/catalog',   icon: 'ShoppingCart',  label: 'Каталог',    roles: ['OWNER', 'ADMIN', 'MANAGER'] },
  { href: '/admin/tickets',   icon: 'MessageSquare', label: 'Тикеты',     roles: ['OWNER', 'ADMIN', 'MANAGER', 'SUPPORT'] },
  { href: '/admin/finance',   icon: 'CreditCard',    label: 'Финансы',    roles: ['OWNER', 'ADMIN'] },
  { href: '/admin/providers', icon: 'Link',          label: 'Провайдеры', roles: ['OWNER', 'ADMIN'] },
  { href: '/admin/marketing', icon: 'Gift',          label: 'Маркетинг',  roles: ['OWNER', 'ADMIN', 'MANAGER'] },
  { href: '/admin/pages',     icon: 'FileText',      label: 'Страницы',   roles: ['OWNER', 'ADMIN', 'MANAGER'] },
  { href: '/admin/settings',  icon: 'Settings',      label: 'Настройки',  roles: ['OWNER', 'ADMIN'] },
];

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  OWNER:   { label: 'Владелец',  color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  ADMIN:   { label: 'Админ',     color: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
  MANAGER: { label: 'Менеджер',  color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  SUPPORT: { label: 'Саппорт',   color: 'bg-slate-500/40 text-slate-300 border-slate-500/30' },
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
    <div className="h-screen w-full overflow-hidden bg-slate-50 flex flex-col md:flex-row relative selection:bg-sky-100 selection:text-sky-900">
      {/* Soft Ambient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-sky-50/40 via-slate-50/80 to-blue-50/30 pointer-events-none z-0" />

      <AdminSidebar 
        userEmail={user.email}
        roleInfo={roleInfo}
        visibleTabs={visibleTabs}
      />
      
      {/* Mobile static nav fallback */}
      <aside className="md:hidden w-full bg-slate-900 border-b border-slate-800 text-white p-4 z-10 shadow-md">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-sky-400">
            Smmplan
          </h2>
          <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">{roleInfo.label}</span>
        </div>
      </aside>

      {/* Floating Main Content Area */}
      <div className="flex-1 max-h-screen overflow-hidden p-2 md:p-4 z-10 relative flex flex-col">
        <main className="flex-1 rounded-2xl bg-white/95 backdrop-blur-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/50 overflow-x-hidden overflow-y-auto scrollbar-hide relative transition-all duration-300">
          <div className="min-h-full p-4 md:p-8 lg:p-10">
            {children}
          </div>
        </main>
      </div>

      <CommandPalette />
      <Toaster position="top-right" richColors closeButton className="mt-4 mr-4" />
    </div>
  );
}
