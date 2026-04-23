'use client';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, CartesianGrid, Legend } from 'recharts';

export function FinancialChart({ revenue, liability }: { revenue: number, liability: number }) {
  // Use mock historical trend for sparkline effect
  const data = [
    { name: 'Янв', revenue: revenue * 0.4, liability: liability * 0.5 },
    { name: 'Фев', revenue: revenue * 0.55, liability: liability * 0.6 },
    { name: 'Мар', revenue: revenue * 0.5, liability: liability * 0.65 },
    { name: 'Апр', revenue: revenue * 0.8, liability: liability * 0.75 },
    { name: 'Май', revenue: revenue * 0.9, liability: liability * 0.9 },
    { name: 'Сегодня', revenue, liability },
  ];

  return (
    <div className="h-[240px] w-full pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorLiability" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#64748b" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#64748b" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
          <Tooltip 
            cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3', fill: 'transparent' }}
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', padding: '12px' }}
            itemStyle={{ fontSize: '13px', fontWeight: 600, fontFamily: 'monospace' }}
            formatter={(value: any, name: any) => [`${(value / 100).toLocaleString('ru-RU')} ₽`, name]}
          />
          <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 500, paddingTop: '10px' }} iconType="circle" />
          <Area type="monotone" dataKey="revenue" name="Выручка" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
          <Area type="monotone" dataKey="liability" name="Обязательства" stroke="#64748b" strokeWidth={3} fillOpacity={1} fill="url(#colorLiability)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
