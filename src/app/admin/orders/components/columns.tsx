'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Chip, Checkbox } from '@heroui/react';
import Link from 'next/link';

export type OrderColumn = {
  id: string;
  numericId: number;
  externalId: string | null;
  link: string;
  quantity: number;
  remains: number;
  status: string;
  charge: number;
  providerCost: number;
  createdAt: Date;
  isDripFeed: boolean;
  runs: number | null;
  interval: number | null;
  currentRun: number;
  error: string | null;
  user: { email: string };
  service: { 
    name: string;
    category: {
      name: string;
      network: { name: string } | null;
    };
  };
};

const STATUS_STYLES: Record<string, "default" | "primary" | "secondary" | "success" | "warning" | "danger"> = {
  AWAITING_PAYMENT: 'warning',
  PENDING: 'default',
  IN_PROGRESS: 'primary',
  COMPLETED: 'success',
  PARTIAL: 'warning',
  CANCELED: 'default',
  ERROR: 'danger',
};

const STATUS_LABELS: Record<string, string> = {
  ALL: 'Все',
  AWAITING_PAYMENT: 'Ожидает',
  PENDING: 'В очереди',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Выполнен',
  PARTIAL: 'Частичный',
  CANCELED: 'Отменён',
  ERROR: 'Ошибка',
};

export const columns: ColumnDef<OrderColumn>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <input
        type="checkbox"
        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
        checked={table.getIsAllPageRowsSelected()}
        onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
        checked={row.getIsSelected()}
        onChange={(e) => row.toggleSelected(e.target.checked)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'numericId',
    header: 'ID',
    cell: ({ row }) => (
      <div className="flex flex-col text-xs leading-snug tabular-nums tracking-tight">
        <span className="font-bold text-slate-800 whitespace-nowrap">
          {row.original.numericId}
        </span>
        {row.original.externalId && (
          <span className="text-slate-400 font-normal whitespace-nowrap">
            ({row.original.externalId})
          </span>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'user.email',
    header: 'Клиент',
    cell: ({ row }) => {
      const email = row.original.user.email;
      return (
        <Link
          href={`/admin/clients?q=${encodeURIComponent(email)}`}
          className="text-sky-600 hover:text-sky-800 hover:underline text-xs whitespace-nowrap"
        >
          {email}
        </Link>
      );
    },
  },
  {
    id: 'info',
    header: 'Информация',
    cell: ({ row }) => {
      const order = row.original;
      return (
        <div className="flex flex-col text-xs py-1 leading-snug">
          <div>
            <span className="text-slate-600">Соцсеть: </span>
            <span className="text-sky-600">{order.service.category.network?.name || 'Без сети'}</span>
          </div>
          <div>
            <span className="text-slate-600">Категория: </span>
            <span className="text-sky-600">{order.service.category.name}</span>
          </div>
          <div>
            <span className="text-slate-600">Тариф: </span>
            <span className="text-sky-600">{order.service.name}</span>
          </div>
          <div className="flex gap-1 border-b border-slate-100 pb-2 mb-2">
            <span className="text-slate-600 whitespace-nowrap">Ссылка: </span>
            <a
              href={order.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-600 hover:underline break-all"
            >
              {order.link}
            </a>
          </div>
          <div>
            <span className="text-slate-600">Кол-во: </span>
            <span className="text-slate-900 tabular-nums font-medium">{order.quantity.toLocaleString('ru-RU')}</span>
          </div>
          <div>
            <span className="text-slate-600">Дата создания: </span>
            <span className="text-slate-900">
              {new Date(order.createdAt).getFullYear()}-{String(new Date(order.createdAt).getMonth() + 1).padStart(2, '0')}-{String(new Date(order.createdAt).getDate()).padStart(2, '0')} {String(new Date(order.createdAt).getHours()).padStart(2, '0')}:{String(new Date(order.createdAt).getMinutes()).padStart(2, '0')}:{String(new Date(order.createdAt).getSeconds()).padStart(2, '0')}
            </span>
          </div>
          
          <details className="mt-2 group">
            <summary className="text-slate-500 hover:text-slate-800 cursor-pointer text-[11px] font-medium select-none list-none inline-flex items-center gap-1 transition-colors">
              <span className="group-open:hidden">▶ Детали</span>
              <span className="hidden group-open:block">▼ Скрыть детали</span>
            </summary>
            <div className="mt-2 bg-slate-50 p-2 border border-slate-100 rounded-md space-y-1">
              <div className="flex gap-2">
                <span className="text-slate-500 min-w-[100px]">ID Провайдера:</span>
                <span className="text-slate-700 font-mono">{order.externalId || '—'}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-slate-500 min-w-[100px]">Себестоимость:</span>
                <span className="text-slate-700">{(order.providerCost / 100).toFixed(2)} ₽</span>
              </div>
              <div className="flex gap-2">
                <span className="text-slate-500 min-w-[100px]">Ошибка API:</span>
                <span className={order.error ? "text-red-600 font-medium" : "text-emerald-600"}>{order.error || 'Нет ошибок'}</span>
              </div>
            </div>
          </details>
        </div>
      );
    },
  },
  {
    accessorKey: 'charge',
    header: 'Цена',
    cell: ({ row }) => (
      <div className="text-xs font-semibold whitespace-nowrap text-slate-800 tabular-nums">
        {(row.original.charge / 100).toFixed(2)} ₽
      </div>
    ),
  },
  // Removed individual providerCost column since it's now in Details
  {
    accessorKey: 'status',
    header: 'Статус',
    cell: ({ row }) => {
      const order = row.original;
      const rawColor = STATUS_STYLES[order.status] || 'default';
      let chipColor = rawColor as any;
      if (['primary', 'secondary'].includes(chipColor)) chipColor = 'default';
      else if (!['warning', 'success', 'danger', 'accent', 'default'].includes(chipColor)) chipColor = 'default';
      return (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Chip color={chipColor as any} size="sm" variant="soft" className="font-semibold text-[10px] uppercase">
            {STATUS_LABELS[order.status] || order.status}
          </Chip>
          {order.isDripFeed && (
            <span className="text-[10px] text-purple-600 font-medium">
              Drip ({order.currentRun}/{order.runs})
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Создан',
    cell: ({ row }) => {
      const date = new Date(row.original.createdAt);
      return (
        <div className="text-xs text-slate-500 whitespace-nowrap">
          {date.toLocaleDateString('ru-RU')} {date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
        </div>
      );
    },
  },
  {
    id: 'actions',
    header: 'Действия',
    cell: ({ row }) => {
      return (
        <Link
          href={`?edit_order_id=${row.original.id}`}
          className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-md transition-colors"
          title="Редактировать заказ"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </Link>
      );
    },
  },
];
