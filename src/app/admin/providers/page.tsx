import { db } from "@/lib/db";
import Link from "next/link";

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
          <Link
            href="/admin/providers/import"
            className="inline-flex justify-center items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            ⏬ Импорт Услуг
          </Link>
          <Link
            href="/admin/providers/new"
            className="inline-flex justify-center items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            + Подключить Панель
          </Link>
        </div>
      </div>

      <div className="bg-white shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-slate-300">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 sm:pl-6">Название / API</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Услуги</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Статус</th>
              <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                <span className="sr-only">Действия</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {providers.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center">
                  <p className="text-slate-500 mb-2">Нет добавленных провайдеров.</p>
                  <Link href="/admin/providers/new" className="text-indigo-600 font-medium hover:underline">
                    Подключить первую панель &rarr;
                  </Link>
                </td>
              </tr>
            ) : providers.map((provider) => (
              <tr key={provider.id}>
                <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6">
                  <div className="font-medium text-slate-900">{provider.name}</div>
                  <div className="text-slate-500 text-xs mt-1 truncate max-w-xs" title={provider.apiUrl}>
                    {provider.apiUrl}
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                  <div className="font-medium text-slate-900">{provider._count.services}</div>
                  <div className="text-xs text-slate-400">связано</div>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                  <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${provider.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {provider.isActive ? 'Активен' : 'Отключен'}
                  </span>
                </td>
                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 flex justify-end gap-3 items-center">
                   <Link href={`/admin/providers/${provider.id}`} className="text-indigo-600 hover:text-indigo-900 font-semibold bg-indigo-50 px-3 py-1 rounded">
                      Настроить
                   </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
