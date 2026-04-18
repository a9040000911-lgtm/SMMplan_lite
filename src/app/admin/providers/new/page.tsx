import { ProviderForm } from "../components/provider-form";

export const dynamic = "force-dynamic";

export default function NewProviderPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Новое подключение</h1>
        <p className="text-slate-500 text-sm">Добавьте новую SMM панель для расширения каталога.</p>
      </div>

      <ProviderForm />
    </div>
  );
}
