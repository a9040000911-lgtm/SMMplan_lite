'use client';
export function FinancialChart({ revenue, liability }: { revenue: number, liability: number }) {
  return (
    <div className="h-[240px] w-full pt-4 flex items-center justify-center bg-slate-50 border border-dashed rounded-lg">
      <span className="text-slate-400 font-medium">Чарты временно отключены</span>
    </div>
  );
}
