import Link from 'next/link';

export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <h2 className="text-4xl font-bold text-slate-900 mb-4">Страница не найдена</h2>
      <p className="text-slate-600 mb-8 max-w-md mx-auto">
        К сожалению, по этому адресу ничего нет. Возможно, ссылка устарела или страница была удалена.
      </p>
      <Link 
        href="/dashboard"
        className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition"
      >
        Вернуться в Личный кабинет
      </Link>
    </div>
  );
}
