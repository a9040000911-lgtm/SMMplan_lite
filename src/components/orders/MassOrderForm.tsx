"use client";

import { useState } from "react";

export function MassOrderForm() {
  const [text, setText] = useState("");

  const placeholder = `Разместите заказы по одному на строку в формате:
ID Услуги | Ссылка | Количество

Пример:
c2 | https://instagram.com/p/123/ | 1000
c1 | https://youtube.com/watch?v=abc | 500
`;

  const rows = text.trim().split('\n').filter(r => r);
  const isValidFormat = rows.every(r => r.split('|').length === 3);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Каждый заказ с новой строки</label>
        <textarea 
          rows={10}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-zinc-300 p-4 font-mono text-sm leading-relaxed"
        />
      </div>

      <div className="flex justify-between items-center text-sm font-medium">
        <span className="text-zinc-500">Заказов распознано: {rows.length}</span>
        {rows.length > 0 && !isValidFormat && (
          <span className="text-red-500">⚠ Неверный формат строк</span>
        )}
      </div>

      <button 
        disabled={rows.length === 0 || !isValidFormat}
        className="w-full py-4 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-zinc-800 disabled:opacity-50 transition-colors"
      >
        Создать массовый заказ
      </button>
    </div>
  );
}
