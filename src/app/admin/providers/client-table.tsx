'use client';

import { Table, Button as HeroButton, Chip } from "@heroui/react";
import Link from "next/link";

export function ProvidersTable({ providers }: { providers: any[] }) {
  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content
          aria-label="Провайдеры API"
          className="shadow-sm border border-default-200 overflow-hidden"
        >
          <Table.Header>
            <Table.Column>Название / API</Table.Column>
            <Table.Column>Услуги</Table.Column>
            <Table.Column>Статус</Table.Column>
            <Table.Column className="text-right">Действия</Table.Column>
          </Table.Header>
          <Table.Body 
            renderEmptyState={() => (
              <div className="py-8 text-center">
                <p className="text-slate-500 mb-2">Нет добавленных провайдеров.</p>
                <Link href="/admin/providers/new" className="text-indigo-600 font-medium hover:underline">
                  Подключить первую панель &rarr;
                </Link>
              </div>
            )}
          >
            {providers.map((provider) => (
              <Table.Row key={provider.id}>
                <Table.Cell>
                  <div className="font-medium text-slate-900">{provider.name}</div>
                  <div className="text-slate-500 text-xs mt-1 truncate max-w-xs" title={provider.apiUrl}>
                    {provider.apiUrl}
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <div className="font-medium text-slate-900">{provider._count.services}</div>
                  <div className="text-xs text-slate-400">связано</div>
                </Table.Cell>
                <Table.Cell>
                  <Chip color={provider.isActive ? "success" : "danger"} size="sm" variant="soft">
                    {provider.isActive ? 'Активен' : 'Отключен'}
                  </Chip>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex justify-end pr-2">
                    <Link href={`/admin/providers/${provider.id}`}>
                      <HeroButton size="sm" variant="secondary" className="font-semibold">Настроить</HeroButton>
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
