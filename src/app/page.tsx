import Link from "next/link";
import { SmartOrderForm } from "@/components/orders/SmartOrderForm";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-24 bg-zinc-50">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-zinc-100 p-8 text-center space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">SMMplan Lite</h1>
        <p className="text-zinc-500">Автоматизированная панель SMM услуг 2026 года.</p>
        
        <SmartOrderForm />
      </div>
    </main>
  );
}
