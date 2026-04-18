"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchExternalServices, importSelectedServices } from "@/actions/admin/providers/import-cherry-pick";
import { adminSyncProviderCatalog } from "@/actions/admin/providers/sync-action";

export function ImportWizard({ categories }: { categories: any[] }) {
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [services, setServices] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [targetCategory, setTargetCategory] = useState<string>(categories[0]?.id || "");
  const [markup, setMarkup] = useState<string>("3.0");

  const [autoSyncLoading, setAutoSyncLoading] = useState(false);

  const loadServices = async () => {
    try {
      setLoading(true);
      setError(null);
      const res: any = await fetchExternalServices();
      if (!res.success) throw new Error(res.error || "Ошибка загрузки");
      setServices(res.services || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
     if (selectedIds.size === services.filter(s => !s.alreadyImported).length) {
         setSelectedIds(new Set());
     } else {
         const newSet = new Set<string>();
         services.forEach(s => {
             if (!s.alreadyImported) newSet.add(String(s.service));
         });
         setSelectedIds(newSet);
     }
  };

  const handleImport = async () => {
     if (selectedIds.size === 0) return setError("Выберите хотя бы 1 услугу");
     if (!targetCategory) return setError("Выберите категорию для импорта");
     
     try {
         setLoading(true);
         setError(null);
         
         const idsArray = Array.from(selectedIds);
         const res = await importSelectedServices(idsArray, targetCategory, parseFloat(markup) || 3.0);
         
         if (res && !res.success) throw new Error(res.error || "Import failed");
         
         setSuccess(`Успешно импортировано ${res.imported || 0} услуг!`);
         setSelectedIds(new Set());
         loadServices(); // Reload to update "alreadyImported" status
         router.refresh();
     } catch (e: any) {
         setError(e.message);
     } finally {
         setLoading(false);
     }
  };

  const handleAutoSync = async () => {
      if (!confirm("Запустить полный Smart Sync? Это может занять несколько секунд, скрипт автоматически проанализирует и создаст все услуги и категории.")) return;
      try {
          setAutoSyncLoading(true);
          setError(null);
          setSuccess(null);
          const res = await adminSyncProviderCatalog();
          if (res && !res.success) throw new Error(res.error || "Sync failed");
          setSuccess((res as any).message || "Smart Sync успешно завершен!");
          loadServices();
      } catch (e: any) {
          setError(e.message);
      } finally {
          setAutoSyncLoading(false);
      }
  };

  return (
    <div className="space-y-6">
       
       <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-md flex justify-between items-center flex-wrap gap-4">
           <div>
               <h3 className="text-indigo-900 font-semibold">Умная Синхронизация (Рекомендуется)</h3>
               <p className="text-sm text-indigo-700">Использует SmartAnalyzer для автоматического распределения всех услуг по категориям, подборки названий и установки наценок.</p>
           </div>
           <button 
              onClick={handleAutoSync} 
              disabled={autoSyncLoading || loading}
              className="bg-indigo-600 text-white px-4 py-2 rounded font-medium shadow-sm hover:bg-indigo-700 text-sm"
           >
              {autoSyncLoading ? "Синхронизация..." : "⚡ Запустить Smart Sync"}
           </button>
       </div>

       <div className="bg-white shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg border border-slate-200 p-6">
           <h2 className="text-lg font-medium text-slate-900 mb-4">Ручной импорт услуг (Cherry-Pick)</h2>
           
           {(error || success) && (
               <div className={`p-4 mb-6 rounded-md ${error ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>
                   {error || success}
               </div>
           )}

           <div className="flex gap-4 items-end mb-6 bg-slate-50 p-4 border rounded-md">
               <div className="flex-1">
                   <label className="block text-xs font-medium text-slate-700 mb-1">Категория для импорта</label>
                   <select 
                      value={targetCategory} 
                      onChange={e => setTargetCategory(e.target.value)}
                      className="block w-full rounded-md border-slate-300 shadow-sm border p-2 text-sm"
                   >
                     <option value="">-- Выберите категорию --</option>
                     {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.platform} • {c.name}</option>
                     ))}
                   </select>
               </div>
               <div className="w-32">
                   <label className="block text-xs font-medium text-slate-700 mb-1">Базовая Наценка</label>
                   <input 
                      type="number" step="0.1" min="1"
                      value={markup}
                      onChange={e => setMarkup(e.target.value)}
                      className="block w-full rounded-md border-slate-300 shadow-sm border p-2 text-sm"
                   />
               </div>
               <div className="w-48">
                    <button 
                       onClick={handleImport} 
                       disabled={loading || selectedIds.size === 0}
                       className="w-full bg-slate-900 text-white px-4 py-2 rounded shadow text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
                    >
                       {loading ? "Импорт..." : `Импорт (${selectedIds.size})`}
                    </button>
               </div>
           </div>

           <div className="h-96 overflow-y-auto border rounded-md">
               <table className="min-w-full divide-y divide-slate-300">
                   <thead className="bg-slate-100 sticky top-0">
                       <tr>
                           <th className="px-4 py-3 text-left">
                               <input type="checkbox" onChange={toggleAll} checked={services.length > 0 && selectedIds.size === services.filter(s=>!s.alreadyImported).length} />
                           </th>
                           <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">ID</th>
                           <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Название провайдера</th>
                           <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Категория провайдера</th>
                           <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Цена (Закуп)</th>
                       </tr>
                   </thead>
                   <tbody className="bg-white divide-y divide-slate-200">
                       {services.map(s => (
                           <tr key={s.service} className={s.alreadyImported ? 'bg-slate-50 opacity-60' : 'hover:bg-slate-50'}>
                               <td className="px-4 py-3">
                                   <input 
                                       type="checkbox" 
                                       disabled={s.alreadyImported}
                                       checked={selectedIds.has(String(s.service))}
                                       onChange={() => toggleSelection(String(s.service))}
                                   />
                               </td>
                               <td className="px-4 py-3 text-sm text-slate-500 font-mono">{s.service}</td>
                               <td className="px-4 py-3 text-sm font-medium text-slate-900 max-w-sm truncate" title={s.name}>{s.name}</td>
                               <td className="px-4 py-3 text-xs text-slate-500">{s.category}</td>
                               <td className="px-4 py-3 text-sm font-mono text-slate-900">${parseFloat(s.rate).toFixed(4)}</td>
                           </tr>
                       ))}
                       {services.length === 0 && !loading && (
                           <tr><td colSpan={5} className="py-8 text-center text-slate-500">Нет доступных услуг</td></tr>
                       )}
                   </tbody>
               </table>
           </div>
       </div>

    </div>
  );
}
