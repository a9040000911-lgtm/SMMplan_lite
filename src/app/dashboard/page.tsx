import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-zinc-50 p-8 pt-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Дашборд</h1>
        <p className="text-zinc-500">Добро пожаловать в панель управления.</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex flex-col items-start hover:shadow-md transition-shadow">
          <h2 className="font-semibold text-lg mb-2">Статистика</h2>
          <p className="text-zinc-500 text-sm mb-4">Раздел в разработке</p>
        </div>
        
        <Link 
          href="/dashboard/referrals"
          className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all group overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
             <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12v10H4V12"/><path d="M2 7h20v5H2z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
          </div>
          <div>
             <h2 className="font-bold text-white text-lg mb-1 relative z-10">Партнёрская программа</h2>
             <p className="text-indigo-100 text-sm relative z-10">Приглашайте друзей и зарабатывайте до 15% с их пополнений</p>
          </div>
          <div className="mt-6 flex items-center text-white text-sm font-medium opacity-90 group-hover:opacity-100 relative z-10">
             <span>Перейти <span className="ml-1 transition-transform inline-block group-hover:translate-x-1">→</span></span>
          </div>
        </Link>
      </div>
    </div>
  );
}
