import { db } from "@/lib/db";
import Link from "next/link";
import { Button as HeroButton } from "@heroui/react";
import { Plug } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/page-header';
import { ProvidersTable } from "./client-table";

// Make it a dynamic route
export const dynamic = "force-dynamic";

export default async function ProvidersAdminPage() {
  const providers = await db.provider.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { services: true } }
    }
  });

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-500 ease-out sm:px-2 md:px-0 bg-slate-50/50 min-h-full pb-10">
      <AdminPageHeader
        icon={Plug}
        title="Провайдеры API"
        description="Управление поставщиками услуг (панелями SMM)"
        action={(
          <div className="flex gap-3">
            <Link href="/admin/providers/import">
              <HeroButton variant="outline" className="font-medium bg-white">
                ⏬ Импорт Услуг
              </HeroButton>
            </Link>
            <Link href="/admin/providers/new">
              <HeroButton variant="primary" className="font-medium shadow-sm">
                + Подключить Панель
              </HeroButton>
            </Link>
          </div>
        )}
      />

      <ProvidersTable providers={providers} />
    </div>
  );
}
