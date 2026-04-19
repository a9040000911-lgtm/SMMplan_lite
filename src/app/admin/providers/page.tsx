import { db } from "@/lib/db";
import Link from "next/link";
import { Button as HeroButton } from "@heroui/react";
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">🔌 Провайдеры API</h1>
          <p className="text-slate-500 text-sm">Управление поставщиками услуг (панелями SMM)</p>
        </div>
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
      </div>

      <ProvidersTable providers={providers} />
    </div>
  );
}
