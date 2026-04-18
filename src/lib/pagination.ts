/**
 * Universal cursor-based pagination helper for Prisma.
 * 
 * Pattern: take N+1 rows, if got N+1 → hasMore=true, slice to N.
 * Avoids expensive COUNT(*) on large tables.
 */

export type PaginatedResult<T> = {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
};

type PaginationInput = {
  cursor?: string | null;
  pageSize?: number;
};

/**
 * Wraps a Prisma findMany call with cursor-based pagination.
 * 
 * Usage:
 * ```ts
 * const result = await paginatedQuery(db.user, {
 *   cursor: searchParams.cursor,
 *   pageSize: 50,
 *   where: { role: 'USER' },
 *   orderBy: { createdAt: 'desc' },
 *   select: { id: true, email: true },
 * });
 * ```
 */
export async function paginatedQuery<T extends { id: string }>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: any,
  options: PaginationInput & {
    where?: Record<string, unknown>;
    orderBy?: Record<string, string> | Record<string, string>[];
    select?: Record<string, unknown>;
    include?: Record<string, unknown>;
  }
): Promise<PaginatedResult<T>> {
  const take = options.pageSize || 50;

  const items: T[] = await model.findMany({
    take: take + 1,
    cursor: options.cursor ? { id: options.cursor } : undefined,
    skip: options.cursor ? 1 : 0, // skip the cursor item itself
    where: options.where,
    orderBy: options.orderBy || { createdAt: 'desc' },
    select: options.select,
    include: options.select ? undefined : options.include, // select and include are mutually exclusive
  });

  const hasMore = items.length > take;
  const data = hasMore ? items.slice(0, -1) : items;
  const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null;

  return {
    items: data,
    nextCursor,
    hasMore,
  };
}
