'use server';

import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import sanitizeHtml from 'sanitize-html';

export async function savePage(formData: FormData) {
  const session = await verifySession();
  if (!session) throw new Error('Unauthorized');

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || user.role !== 'ADMIN') throw new Error('Forbidden'); // Only full ADMIN can edit CMS

  const pageId = formData.get('id') as string;
  const slug = formData.get('slug') as string;
  const title = formData.get('title') as string;
  const rawContent = formData.get('content') as string;

  if (!slug || !title || !rawContent) return;

  // Sanitize HTML to prevent XSS (OWASP A01)
  const content = sanitizeHtml(rawContent, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'h3', 'figure', 'figcaption']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      'img': ['src', 'alt', 'width', 'height', 'loading'],
      '*': ['class', 'style']
    },
    allowedSchemes: ['http', 'https', 'data'],
  });

  if (pageId) {
    await db.page.update({
      where: { id: pageId },
      data: { slug, title, content }
    });
  } else {
    await db.page.create({
      data: { slug, title, content }
    });
  }

  await db.auditLog.create({
    data: {
      userId: session.userId,
      action: 'CMS_PAGE_SAVE',
      details: `Saved page: ${title} (/${slug})`
    }
  });

  revalidatePath('/admin/pages');
  revalidatePath(`/p/${slug}`);
  redirect('/admin/pages');
}
