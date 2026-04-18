import { db } from "@/lib/db";
import { ProviderForm } from "../components/provider-form";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditProviderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const provider = await db.provider.findUnique({
    where: { id }
  });

  if (!provider) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Настройки Провайдера: {provider.name}</h1>
        <p className="text-slate-500 text-sm">Технические параметры API-подключения.</p>
      </div>

      <ProviderForm initialData={provider} />
    </div>
  );
}
