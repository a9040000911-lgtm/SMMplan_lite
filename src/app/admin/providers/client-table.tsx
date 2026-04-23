'use client';

import { Table, Button as HeroButton, Chip } from "@heroui/react";
import Link from "next/link";

export function ProvidersTable({ providers }: { providers: any[] }) {
  return (
    <Table className="rounded-2xl border border-slate-100/50 shadow-sm bg-white/60 backdrop-blur-xl overflow-hidden">
      <Table.ScrollContainer>
        <Table.Content
          aria-label="Провайдеры API"
          className="border-none shadow-none"
        >
          <Table.Header className="bg-slate-50/50 text-[11px] uppercase tracking-widest text-slate-400 border-b border-slate-100/60">
            <Table.Column isRowHeader className="py-3.5 px-4 font-bold">Название / API</Table.Column>
            <Table.Column className="py-3.5 px-4 font-bold">Услуги</Table.Column>
            <Table.Column className="py-3.5 px-4 font-bold">Статус</Table.Column>
            <Table.Column className="py-3.5 px-4 font-bold text-right">Действия</Table.Column>
          </Table.Header>
          <Table.Body 
            renderEmptyState={() => (
              <div className="py-12 text-center">
                <p className="text-slate-400 font-medium tracking-wide mb-2 mt-2">Нет добавленных провайдеров.</p>
                <Link href="/admin/providers/new" className="text-sky-600 font-bold hover:underline transition-colors mt-2 inline-block">
                  Подключить первую панель &rarr;
                </Link>
              </div>
            )}
          >
            {providers.map((provider) => (
              <Table.Row key={provider.id} className="border-b border-slate-100/30 hover:bg-slate-50/80 even:bg-slate-50/30 transition-colors last:border-0 group">
                <Table.Cell className="py-3.5 px-4">
                  <div className="font-bold text-slate-900 group-hover:text-sky-700 transition-colors">{provider.name}</div>
                  <div className="text-slate-500 font-mono text-xs mt-1 truncate max-w-xs" title={provider.apiUrl}>
                    {provider.apiUrl}
                  </div>
                </Table.Cell>
                <Table.Cell className="py-3.5 px-4">
                  <div className="font-bold text-slate-900 tabular-nums">{provider._count.services}</div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">связано</div>
                </Table.Cell>
                <Table.Cell className="py-3.5 px-4">
                  <Chip color={provider.isActive ? "success" : "danger"} size="sm" variant="soft" className="font-bold text-[10px] uppercase tracking-widest">
                    {provider.isActive ? 'Активен' : 'Отключен'}
                  </Chip>
                </Table.Cell>
                <Table.Cell className="py-3.5 px-4">
                  <div className="flex justify-end pr-2">
                    <Link href={`/admin/providers/${provider.id}`}>
                      <HeroButton size="sm" variant="secondary" className="font-semibold shadow-sm hover:-translate-y-0.5 transition-transform bg-white border border-slate-200">Настроить</HeroButton>
                    </Link>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}
