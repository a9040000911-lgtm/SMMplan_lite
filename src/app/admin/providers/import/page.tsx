import { db } from "@/lib/db";
import { ImportWizard } from "./components/import-wizard";
import Link from "next/link";
import { providerService } from "@/services/providers/provider.service";

export const dynamic = "force-dynamic";

export default async function ImportProvidersPage() {
  const categories = await db.category.findMany({
      orderBy: [{ platform: 'asc' }, { sort: 'asc' }]
  });

  // Verify we have an active default provider
  let errorMsg = null;
  try {
     await providerService.getDefaultProvider();
  } catch (e: any) {
     errorMsg = e.message;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Импорт Услуг</h1>
          <p className="text-slate-500 text-sm">Синхронизация и виш-лист услуг от провайдера.</p>
        </div>
        <Link href="/admin/providers" className="text-sm font-medium text-indigo-600 hover:text-indigo-900 border border-slate-300 py-2 px-4 rounded-md">
          ← К списку провайдеров
        </Link>
      </div>

      {errorMsg ? (
         <div className="bg-amber-50 border border-amber-200 text-amber-800 p-6 rounded-md">
            <h2 className="text-lg font-semibold mb-2">Провайдер не настроен</h2>
            <p className="text-sm mb-4">{errorMsg}</p>
            <Link href="/admin/providers/new" className="bg-amber-600 text-white px-4 py-2 rounded shadow-sm text-sm hover:bg-amber-700">
               Добавить провайдера
            </Link>
         </div>
      ) : (
         <ImportWizard categories={categories} />
      )}
    </div>
  );
}
