'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export type ClientColumn = {
  id: string;
  email: string;
  role: string;
  balance: number;
  quarantineBalance: number;
  totalSpent: number;
  _count: { orders: number };
  tier: { name: string; color: string };
};

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  OWNER:   { label: 'Владелец', color: 'bg-amber-100 text-amber-800 border-transparent hover:bg-amber-100' },
  ADMIN:   { label: 'Админ',   color: 'bg-indigo-100 text-indigo-800 border-transparent hover:bg-indigo-100' },
  MANAGER: { label: 'Менеджер', color: 'bg-emerald-100 text-emerald-800 border-transparent hover:bg-emerald-100' },
  SUPPORT: { label: 'Саппорт', color: 'bg-slate-200 text-slate-600 border-transparent hover:bg-slate-200' },
  USER:    { label: 'Клиент',  color: 'bg-sky-100 text-sky-800 border-transparent hover:bg-sky-100' },
  BANNED:  { label: 'Забанен', color: 'bg-red-100 text-red-800 border-transparent hover:bg-red-100' },
};

export const columns: ColumnDef<ClientColumn>[] = [
  {
    accessorKey: 'email',
    header: 'Email / Клиент',
    cell: ({ row }) => {
      const u = row.original;
      return (
        <Link
          href={`?userId=${u.id}`}
          className="text-indigo-600 hover:underline font-mono font-medium text-sm"
        >
          {u.email}
        </Link>
      );
    },
  },
  {
    accessorKey: 'role',
    header: 'Роль',
    cell: ({ row }) => {
      const u = row.original;
      const roleInfo = ROLE_LABELS[u.role] || { label: u.role, color: 'bg-slate-100 text-slate-800 border-transparent' };
      return (
        <Badge variant="outline" className={`shadow-none font-medium px-2 py-0.5 text-[11px] uppercase ${roleInfo.color}`}>
          {roleInfo.label}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'balance',
    header: 'Баланс',
    cell: ({ row }) => {
      const u = row.original;
      return (
        <div className="font-semibold text-xs">
          {(u.balance / 100).toFixed(2)} ₽
          {u.quarantineBalance > 0 && (
            <span className="block text-[10px] text-orange-600 font-medium whitespace-nowrap mt-0.5">
              🔒 {(u.quarantineBalance / 100).toFixed(2)} ₽
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'totalSpent',
    header: 'LTV (Прибыль)',
    cell: ({ row }) => {
      return <div className="text-xs font-medium">{(row.original.totalSpent / 100).toLocaleString('ru-RU')} ₽</div>;
    },
  },
  {
    accessorKey: '_count.orders',
    header: 'Заказы',
    cell: ({ row }) => {
      return <div className="text-xs">{row.original._count.orders}</div>;
    },
  },
  {
    accessorKey: 'tier',
    header: 'Уровень',
    cell: ({ row }) => {
      const tier = row.original.tier;
      return (
        <Badge variant="outline" className={`shadow-none px-2 py-0.5 text-[10px] font-semibold border-transparent ${tier.color}`}>
          {tier.name}
        </Badge>
      );
    },
  },
];
