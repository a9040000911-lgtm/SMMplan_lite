import { db } from '@/lib/db';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function AdminPagesList() {
  const pages = await db.page.findMany({ orderBy: { updatedAt: 'desc' } });

  return (
    <div className="space-y-6 w-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CMS Pages</h1>
          <p className="text-slate-500">Manage textual content for the public website.</p>
        </div>
        <Link href="/admin/pages/new" className="px-4 py-2 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800 transition-colors">
          Create New Page
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-100/50 shadow-sm bg-white/60 backdrop-blur-xl overflow-hidden">
        <table className="min-w-full text-sm font-medium text-slate-700">
          <thead className="bg-slate-50/50 text-[11px] uppercase tracking-widest text-slate-400 border-b border-slate-100/60">
            <tr>
              <th className="px-6 py-3.5 text-left font-bold">Title</th>
              <th className="px-6 py-3.5 text-left font-bold">Slug</th>
              <th className="px-6 py-3.5 text-left font-bold">Updated At</th>
              <th className="px-6 py-3.5 text-right font-bold">Action</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => (
              <tr key={page.id} className="hover:bg-slate-50/80 even:bg-slate-50/30 transition-colors border-b border-slate-100/30 last:border-0 group">
                <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900 group-hover:text-sky-700 transition-colors">{page.title}</td>
                <td className="px-6 py-4 whitespace-nowrap font-mono text-slate-500 text-xs">/{page.slug}</td>
                <td className="px-6 py-4 whitespace-nowrap text-slate-500 tabular-nums text-xs">
                  {page.updatedAt.toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right font-medium space-x-4">
                  <Link href={`/p/${page.slug}`} target="_blank" className="text-slate-400 hover:text-slate-900 transition-colors">
                    Preview
                  </Link>
                  <Link href={`/admin/pages/${page.slug}`} className="text-sky-600 hover:text-sky-800 transition-colors">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {pages.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium">
                  No pages found. Click "Create New Page".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
