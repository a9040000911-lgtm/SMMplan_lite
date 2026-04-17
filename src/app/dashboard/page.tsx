export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Дашборд</h1>
        <p className="text-zinc-500">Добро пожаловать в панель управления.</p>
      </header>
      <div className="grid gap-6">
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <h2 className="font-semibold text-lg">Статистика</h2>
          {/* Stats goes here */}
        </div>
      </div>
    </div>
  );
}
