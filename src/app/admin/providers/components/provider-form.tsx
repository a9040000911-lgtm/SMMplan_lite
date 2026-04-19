"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProvider, updateProvider, checkProviderConnection } from "@/actions/admin/providers/crud";
import { Provider } from "@prisma/client";

interface ProviderFormProps {
  initialData?: Provider;
}

export function ProviderForm({ initialData }: ProviderFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; error: boolean } | null>(null);

  // default to config if present, else empty/default values
  const meta = initialData?.metadata as any || {};
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    apiUrl: initialData?.apiUrl || "",
    apiKey: "", // Always empty by default for security, only update if filled
    isActive: initialData?.isActive ?? true,
    balanceCurrency: initialData?.balanceCurrency || "USD",
    httpMethod: meta.httpMethod || "POST",
    requestType: meta.requestType || "form",
    headersText: meta.headers ? JSON.stringify(meta.headers, null, 2) : "{\n  \"User-Agent\": \"Smmplan-Legacy/1.0\"\n}",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setStatusMsg(null);
      
      let headersParsed = {};
      try {
        headersParsed = JSON.parse(formData.headersText || "{}");
      } catch (e) {
        throw new Error("HTTP Заголовки должны быть в формате валидного JSON.", { cause: e });
      }

      if (!initialData && !formData.apiKey) {
         throw new Error("API Ключ обязателен при создании провайдера.");
      }

      const payload = {
        name: formData.name,
        apiUrl: formData.apiUrl,
        apiKey: formData.apiKey,
        isActive: formData.isActive,
        balanceCurrency: formData.balanceCurrency,
        httpMethod: formData.httpMethod,
        requestType: formData.requestType,
        headers: headersParsed
      };

      if (initialData) {
        await updateProvider(initialData.id, payload);
        setStatusMsg({ text: "Настройки провайдера сохранены.", error: false });
      } else {
        await createProvider(payload);
        setStatusMsg({ text: "Провайдер успешно добавлен.", error: false });
        router.push("/admin/providers");
      }
      
      router.refresh();
    } catch (err: any) {
      setStatusMsg({ text: err.message, error: true });
    } finally {
      setLoading(false);
    }
  };

  const handleCheck = async () => {
     if (!initialData) return;
     setCheckLoading(true);
     setStatusMsg(null);
     try {
        const res = await checkProviderConnection(initialData.id);
        if (res.success && res.balance !== undefined) {
           setStatusMsg({ text: `Успешно! Баланс на счете: ${(res.balance / 100).toFixed(2)} ${res.currency}`, error: false });
        } else {
           setStatusMsg({ text: `Ошибка соединения: ${res.error || "Неизвестная ошибка"}`, error: true });
        }
     } catch (err: any) {
        setStatusMsg({ text: `Ошибка: ${err.message}`, error: true });
     } finally {
        setCheckLoading(false);
     }
  };

  return (
    <div className="bg-white shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg p-6 max-w-4xl">
      {statusMsg && (
        <div className={`p-4 mb-6 rounded-md ${statusMsg.error ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"}`}>
          {statusMsg.text}
        </div>
      )}

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <div className="sm:col-span-3">
            <label className="block text-sm font-medium text-slate-700">Название панели (пр. VexBoost)</label>
            <div className="mt-1">
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              />
            </div>
          </div>

          <div className="sm:col-span-3">
            <label className="block text-sm font-medium text-slate-700">Валюта баланса API</label>
            <div className="mt-1">
              <select
                name="balanceCurrency"
                value={formData.balanceCurrency}
                onChange={handleChange}
                className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              >
                <option value="USD">USD ($)</option>
                <option value="RUB">RUB (₽)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>

          <div className="sm:col-span-6">
            <label className="block text-sm font-medium text-slate-700">API URL-адрес</label>
            <div className="mt-1">
              <input
                type="url"
                name="apiUrl"
                placeholder="https://example.com/api/v2"
                value={formData.apiUrl}
                onChange={handleChange}
                className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border font-mono"
              />
            </div>
          </div>

          <div className="sm:col-span-6 border border-amber-200 bg-amber-50 rounded-md p-4">
            <label className="block text-sm font-medium text-amber-900">API Key / Secret</label>
            <p className="text-xs text-amber-700 mb-2">
              Ключ будет зашифрован (AES-256-GCM) перед сохранением в БД.
              {initialData && " Оставьте поле пустым, чтобы не менять текущий ключ."}
            </p>
            <div className="mt-1">
              <input
                type="password"
                name="apiKey"
                placeholder={initialData ? "******** (Скрыто)" : "Введите API ключ..."}
                value={formData.apiKey}
                onChange={handleChange}
                className="block w-full rounded-md border-amber-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border font-mono"
              />
            </div>
          </div>
          
          <div className="sm:col-span-6 pt-4 border-t border-slate-200">
             <h3 className="text-lg font-medium text-slate-900">Регистр технических настроек API</h3>
             <p className="text-sm text-slate-500 mt-1 mb-4">Тонкая настройка сетевых параметров для подключения к проприетарным панелям (PerfectPanel, N1Panel).</p>
          </div>

          <div className="sm:col-span-3">
            <label className="block text-sm font-medium text-slate-700">Метод (HTTP Method)</label>
            <div className="mt-1">
              <select
                name="httpMethod"
                value={formData.httpMethod}
                onChange={handleChange}
                className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              >
                <option value="POST">POST (Стандарт для API v2)</option>
                <option value="GET">GET (Как у VexBoost)</option>
              </select>
            </div>
          </div>

          <div className="sm:col-span-3">
            <label className="block text-sm font-medium text-slate-700">Формат Payload</label>
            <div className="mt-1">
              <select
                name="requestType"
                value={formData.requestType}
                onChange={handleChange}
                className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              >
                <option value="form">x-www-form-urlencoded (Часто)</option>
                <option value="json">application/json</option>
              </select>
            </div>
          </div>

          <div className="sm:col-span-6">
            <label className="block text-sm font-medium text-slate-700">Кастомные Заголовки (JSON)</label>
            <div className="mt-1">
              <textarea
                name="headersText"
                rows={4}
                value={formData.headersText}
                onChange={handleChange}
                className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border font-mono text-xs"
              />
            </div>
          </div>

          <div className="sm:col-span-6 flex items-center pt-2">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label className="ml-2 block text-sm text-slate-900">
              Включить провайдера: принимать заказы и разрешить синхронизацию каталога
            </label>
          </div>
        </div>

        <div className="pt-5 border-t border-slate-200 flex justify-between">
          <div>
            {initialData && (
               <button
                 type="button"
                 onClick={handleCheck}
                 disabled={checkLoading}
                 className="inline-flex justify-center rounded-md border border-slate-300 bg-white py-2 px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
               >
                 {checkLoading ? "Проверка..." : "Протестировать API Connection"}
               </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push("/admin/providers")}
              className="inline-flex justify-center rounded-md border border-slate-300 bg-white py-2 px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? "Сохранение..." : initialData ? "Сохранить Изменения" : "Создать Подключение"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
