'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CommandMenu } from '@/components/admin/command-menu';
import { 
  Home, Users, Package, RefreshCw, ShoppingCart, 
  MessageSquare, CreditCard, Link as LinkIcon, Gift, FileText, Settings,
  PanelLeftClose, PanelLeftOpen, ArrowLeft 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  userEmail: string;
  roleInfo: { label: string; color: string };
  visibleTabs: { href: string; label: string; icon: string; roles: string[] }[];
}

const ICON_MAP: Record<string, React.ElementType> = {
  Home, Users, Package, RefreshCw, ShoppingCart, 
  MessageSquare, CreditCard, Link: LinkIcon, Gift, FileText, Settings
};

export function AdminSidebar({ userEmail, roleInfo, visibleTabs }: SidebarProps) {
  const [collapsed, setCollapsed] = React.useState(false);
  const pathname = usePathname();

  return (
    <aside 
      className={cn(
        "relative z-20 flex-shrink-0 transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] group hidden md:flex flex-col",
        "rounded-none bg-[#0B1120]/95 backdrop-blur-3xl border-r border-white/5 overflow-hidden",
        collapsed ? "w-20" : "w-[280px]"
      )}
    >
      {/* Collapse Toggle */}
      <div className={cn("absolute z-50 transition-all duration-500", collapsed ? "top-6 left-1/2 -translate-x-1/2" : "top-7 right-4")}>
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-8 h-8 rounded-sm bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-indigo-500/20 hover:border-indigo-500/30 opacity-0 group-hover:opacity-100 transition-all duration-300 transform hover:scale-110"
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4 ml-0.5" /> : <PanelLeftClose className="w-4 h-4 mr-0.5" />}
        </button>
      </div>

      {/* Header Profile Area */}
      <div className={cn("pt-8 pb-6 px-6 transition-all duration-300 relative", collapsed ? "opacity-0 invisible h-0 p-0" : "opacity-100")}>
        {/* Subtle glow behind logo */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />
        
        <h2 className="text-xl font-extrabold tracking-tight mb-1 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
          Smmplan
        </h2>
        <p className="text-[11px] text-slate-400 font-medium truncate mb-3 tracking-wide">{userEmail}</p>
        <div className="flex items-center gap-2">
          <span className={cn(
            "inline-flex items-center px-2.5 py-1 text-[10px] rounded-sm uppercase font-bold tracking-wider shadow-sm border border-white/5",
            roleInfo.color.replace('bg-', 'bg-').replace('text-', 'text-') /* Colors are already passed, keep mapping but modernize if necessary */
          )}>
            <div className="w-1.5 h-1.5 rounded-none bg-current opacity-70 mr-1.5 animate-pulse" />
            {roleInfo.label}
          </span>
        </div>
      </div>

      <nav className={cn(
        "flex-1 px-3 py-4 space-y-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
        collapsed && "pt-20"
      )}>
        <div className={cn("mb-4 px-1", collapsed && "hidden")}>
          <CommandMenu />
        </div>
        
        {visibleTabs.map(tab => {
          const isActive = pathname?.startsWith(tab.href);
          const IconComponent = ICON_MAP[tab.icon] || Home;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              title={collapsed ? tab.label : undefined}
              className={cn(
                "relative flex items-center px-3 py-2.5 mb-1 text-sm font-medium rounded-sm transition-all duration-300 whitespace-nowrap overflow-hidden group",
                isActive 
                  ? "bg-indigo-500/10 text-indigo-400" 
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
                collapsed && "justify-center px-0 w-12 h-12 mx-auto"
              )}
            >
              {/* Active Indicator Line */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/4 bg-indigo-500 rounded-r-sm shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
              )}
              
              <span className={cn(
                "transition-transform duration-300 group-hover:scale-110", 
                collapsed ? "" : "mr-3.5 w-5 text-center flex justify-center",
                isActive && "drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]"
              )}>
                <IconComponent className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={isActive ? 2.5 : 2} />
              </span>
              {!collapsed && <span className={cn("tracking-wide transition-all", isActive && "font-semibold")}>{tab.label}</span>}
              
              {/* Hover Glow Behind */}
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/0 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-sm" />
            </Link>
          );
        })}

        <div className="pt-4 mt-2 border-t border-white/5 mx-2">
          <Link
            href="/dashboard/new-order"
            title={collapsed ? "Клиент" : undefined}
            className={cn(
              "flex items-center px-4 py-2.5 text-sm font-medium rounded-sm text-slate-400 hover:bg-white/5 hover:text-white transition-colors whitespace-nowrap border border-transparent hover:border-white/10 group",
              collapsed && "justify-center px-0 w-12 h-12 mx-auto"
            )}
          >
            <ArrowLeft className="w-[18px] h-[18px] flex-shrink-0 transition-transform group-hover:-translate-x-1" />
            {!collapsed && <span className="ml-3 tracking-wide">В кабинет клиента</span>}
          </Link>
        </div>
      </nav>
    </aside>
  );
}
