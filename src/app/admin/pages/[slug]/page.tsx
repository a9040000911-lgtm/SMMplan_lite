import { db } from '@/lib/db';
import { savePage } from '@/actions/cms/pages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TiptapEditor } from '@/components/cms/TiptapEditorWrapper';

export const dynamic = 'force-dynamic';

export default async function AdminPageEditor({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  let page = null;
  if (slug !== 'new') {
    page = await db.page.findUnique({ where: { slug } });
    if (!page) return notFound();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/admin/pages" className="text-sm font-medium text-indigo-600 hover:text-indigo-900">
          ← Back to Pages
        </Link>
        <h1 className="text-2xl font-bold flex-1">{page ? 'Edit Page' : 'Create New Page'}</h1>
      </div>

      <div className="bg-white p-6 rounded-md shadow-sm border border-slate-200">
        <form action={savePage} className="space-y-6">
          {page && <input type="hidden" name="id" value={page.id} />}
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="title">Page Title</Label>
              <Input id="title" name="title" defaultValue={page?.title} placeholder="e.g. Terms of Service" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <Input id="slug" name="slug" defaultValue={page?.slug} placeholder="e.g. terms" required />
              <p className="text-xs text-slate-500">The url will be /p/your-slug</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Content</Label>
            <TiptapEditor content={page?.content || ''} name="content" />
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <Button type="submit">Save Page</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
