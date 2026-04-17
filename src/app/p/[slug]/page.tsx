import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function PublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  const page = await db.page.findUnique({ where: { slug } });
  
  if (!page) return notFound();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-3xl">
        <div className="mb-8">
          <Link href="/" className="text-indigo-600 font-medium hover:text-indigo-900">
            ← Back to Home
          </Link>
        </div>
        
        <article className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden prose prose-slate max-w-none p-8 md:p-12">
          <h1 className="text-3xl font-extrabold text-slate-900 mb-8 pb-4 border-b border-slate-100">
            {page.title}
          </h1>
          
          <div 
            className="text-slate-700 leading-relaxed space-y-4"
            dangerouslySetInnerHTML={{ __html: page.content }} 
          />
        </article>
      </div>
    </div>
  );
}
