'use client';

import dynamic from 'next/dynamic';

// Next.js requires dynamic imports with ssr: false to be Client Components themselves 
// when they include components that rely on browser global variables (like window)
export const TiptapEditor = dynamic(() => import('@/components/cms/TiptapEditor'), { 
  ssr: false,
  loading: () => <div className="animate-pulse bg-slate-100 rounded-md min-h-[400px] w-full" />
});
