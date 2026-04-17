"use client";

import { useState } from "react";

export function DripFeedSettings() {
  const [enabled, setEnabled] = useState(false);
  const [runs, setRuns] = useState(2);
  const [interval, setInterval] = useState(60);

  if (!enabled) {
    return (
      <button 
        type="button" 
        onClick={() => setEnabled(true)}
        className="text-sm font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200"
      >
        + Добавить Drip-feed (Плавная накрутка)
      </button>
    );
  }

  return (
    <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 mt-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium text-sm text-zinc-900">Настройки Drip-feed</h3>
        <button 
          onClick={() => setEnabled(false)}
          className="text-xs text-zinc-500 hover:text-red-500"
        >
          Удалить
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">Количество запусков (Runs)</label>
          <input 
            type="number" 
            min={2}
            value={runs}
            onChange={(e) => setRuns(Number(e.target.value))}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">Интервал (в минутах)</label>
          <input 
            type="number" 
            min={5}
            value={interval}
            onChange={(e) => setInterval(Number(e.target.value))}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <p className="text-xs text-zinc-500 mt-3">
        Заказ будет разбит на {runs} частей. Запуски каждые {interval} минут.
      </p>
    </div>
  );
}
