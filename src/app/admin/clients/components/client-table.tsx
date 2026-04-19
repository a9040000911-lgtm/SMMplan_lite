'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DataTable } from '@/components/ui/data-table';
import { columns, ClientColumn } from './columns';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface ClientTableProps {
  data: ClientColumn[];
  children?: React.ReactNode; 
}

export function ClientTable({ data, children }: ClientTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');

  const isOpen = !!userId;

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Remove userId from query params to close the sheet
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('userId');
      router.push(`?${newParams.toString()}`);
    }
  };

  return (
    <>
      <DataTable columns={columns} data={data} searchKey="email" searchPlaceholder="Фильтр таблицы..." />
      
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto sm:max-w-none bg-slate-50">
          <SheetHeader className="mb-6">
            <SheetTitle>Профиль Клиента</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {children}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
