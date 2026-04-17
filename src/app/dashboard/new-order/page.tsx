"use client";

import { useState } from "react";
import { SmartOrderForm } from "@/components/orders/SmartOrderForm";
import { MassOrderForm } from "@/components/orders/MassOrderForm";

export default function NewOrderPage() {
  const [activeTab, setActiveTab] = useState<"smart" | "mass">("smart");

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Новый заказ</h1>
        <p className="text-zinc-500 mt-1">Оформите заказ с умным авто-определением соцсети или используйте массовый ввод.</p>
      </div>

      <div className="bg-white rounded-3xl sm:p-8 p-4 border border-zinc-200 shadow-sm">
        <div className="flex space-x-2 bg-zinc-100/50 p-1 rounded-2xl mb-8 w-fit mx-auto border border-zinc-200">
          <button
            onClick={() => setActiveTab("smart")}
            className={`px-6 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === "smart" 
                ? "bg-white text-zinc-900 shadow-sm border border-zinc-200/60" 
                : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            Умный Заказ
          </button>
          <button
            onClick={() => setActiveTab("mass")}
            className={`px-6 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === "mass" 
                ? "bg-white text-zinc-900 shadow-sm border border-zinc-200/60" 
                : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            Массовый заказ
          </button>
        </div>

        <div>
          {activeTab === "smart" ? <SmartOrderForm /> : <MassOrderForm />}
        </div>
      </div>
    </div>
  );
}
