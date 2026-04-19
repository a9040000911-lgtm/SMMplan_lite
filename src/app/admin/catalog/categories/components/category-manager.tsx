"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCategory, updateCategory, deleteCategory } from "@/actions/admin/catalog/categories";

export function CategoryManager({ categories, networks }: { categories: any[], networks: any[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [networkId, setNetworkId] = useState(networks[0]?.id || "");
  const [sort, setSort] = useState("0");

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setNetworkId(networks[0]?.id || "");
    setSort("0");
    setError(null);
  };

  const handleEdit = (cat: any) => {
    setEditingId(cat.id);
    setName(cat.name);
    setNetworkId(cat.networkId);
    setSort(String(cat.sort));
    setError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !networkId) return setError("Заполните все поля");
    
    try {
      setLoading(true);
      setError(null);
      const payload = { name, networkId, sort: parseInt(sort, 10) || 0 };
      
      if (editingId) {
        await updateCategory(editingId, payload);
      } else {
        await createCategory(payload);
      }
      
      resetForm();
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
     if (!confirm("Удалить эту категорию?")) return;
     try {
       setLoading(true);
       const res = await deleteCategory(id);
       if (!res.success) throw new Error(res.error);
       router.refresh();
     } catch(err: any) {
       setError(err.message);
     } finally {
       setLoading(false);
     }
  };

  return (
    <div className="space-y-6">
       {/* Editor Form */}
       <div className="bg-white p-4 shadow sm:rounded-lg border border-slate-200">
          <h2 className="text-lg font-medium mb-3">{editingId ? "Редактировать категорию" : "Добавить категорию"}</h2>
          {error && <div className="text-red-600 text-sm mb-3 bg-red-50 p-2 rounded">{error}</div>}
          <form onSubmit={handleSave} className="flex flex-wrap gap-4 items-end">
             <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-slate-700">Название (с префиксом платформы)</label>
                <input 
                   type="text" 
                   value={name} onChange={e => setName(e.target.value)}
                   className="mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-sm border p-2"
                   placeholder="Например: INSTAGRAM | Лайки"
                />
             </div>
             <div className="w-48">
                <label className="block text-xs font-medium text-slate-700">Сеть (Network)</label>
                <select 
                   value={networkId} onChange={e => setNetworkId(e.target.value)}
                   className="mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-sm border p-2"
                >
                   {networks.map(n => (
                     <option key={n.id} value={n.id}>{n.name.toUpperCase()}</option>
                   ))}
                </select>
             </div>
             <div className="w-24">
                <label className="block text-xs font-medium text-slate-700">Сорт.</label>
                <input 
                   type="number" 
                   value={sort} onChange={e => setSort(e.target.value)}
                   className="mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-sm border p-2"
                />
             </div>
             <div className="flex gap-2">
                 <button 
                    type="submit" 
                    disabled={loading}
                    className="inline-flex justify-center bg-indigo-600 text-white rounded py-2 px-4 shadow-sm text-sm font-medium hover:bg-indigo-700"
                 >
                    {editingId ? "Сохранить" : "Добавить"}
                 </button>
                 {editingId && (
                     <button type="button" onClick={resetForm} className="text-slate-500 text-sm hover:underline ml-2">
                        Отмена
                     </button>
                 )}
             </div>
          </form>
       </div>

       {/* List display */}
       <div className="bg-white shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-slate-300">
          <thead className="bg-slate-50">
            <tr>
              <th className="py-3 pl-4 pr-3 text-left text-sm font-semibold text-slate-900">Название</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-slate-900">Платформа</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-slate-900">Сортировка</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-slate-900">Услуг</th>
              <th className="relative py-3 pl-3 pr-4"><span className="sr-only">Действия</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {categories.map((c) => (
              <tr key={c.id}>
                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-slate-900">{c.name}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 font-mono">{c.network?.slug?.toUpperCase() || '-'}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{c.sort}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{c._count.services}</td>
                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium">
                  <button onClick={() => handleEdit(c)} className="text-indigo-600 hover:text-indigo-900 mr-4">Изменить</button>
                  <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:text-red-900">Удалить</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
