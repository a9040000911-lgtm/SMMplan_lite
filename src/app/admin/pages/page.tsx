import { db } from '@/lib/db';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function AdminPagesList() {
  const pages = await db.page.findMany({ orderBy: { updatedAt: 'desc' } });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CMS Pages</h1>
          <p className="text-slate-500">Manage textual content for the public website.</p>
        </div>
        <Link href="/admin/pages/new" className="px-4 py-2 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800 transition-colors">
          Create New Page
        </Link>
      </div>

      <div className="bg-white border rounded-md shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-slate-500 uppercase tracking-wider">Title</th>
              <th className="px-6 py-3 text-left font-medium text-slate-500 uppercase tracking-wider">Slug</th>
              <th className="px-6 py-3 text-left font-medium text-slate-500 uppercase tracking-wider">Updated At</th>
              <th className="px-6 py-3 text-right font-medium text-slate-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {pages.map((page) => (
              <tr key={page.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{page.title}</td>
                <td className="px-6 py-4 whitespace-nowrap text-slate-500">/{page.slug}</td>
                <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                  {page.updatedAt.toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right font-medium space-x-4">
                  <Link href={`/p/${page.slug}`} target="_blank" className="text-slate-600 hover:text-slate-900">
                    Preview
                  </Link>
                  <Link href={`/admin/pages/${page.slug}`} className="text-indigo-600 hover:text-indigo-900">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {pages.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
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
