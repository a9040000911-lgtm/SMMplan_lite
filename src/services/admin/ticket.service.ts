import { db } from '@/lib/db';
import { paginatedQuery, type PaginatedResult } from '@/lib/pagination';

// ── Types ──

export type AdminTicketRow = {
  id: string;
  subject: string;
  status: string;
  source: string;
  updatedAt: Date;
  createdAt: Date;
  user: { id: string; email: string };
  _count: { messages: number };
  messages: { text: string; createdAt: Date; sender: string }[];
};

type TicketSearchParams = {
  cursor?: string;
  status?: string;
  source?: string;
  search?: string;
  pageSize?: number;
};

// ── Service ──

export class AdminTicketService {

  /**
   * Paginated ticket list with filters.
   */
  async listTickets(params: TicketSearchParams): Promise<PaginatedResult<AdminTicketRow>> {
    const where: Record<string, unknown> = {};

    if (params.status && params.status !== 'ALL') {
      where.status = params.status;
    }
    if (params.source && params.source !== 'ALL') {
      where.source = params.source;
    }
    if (params.search?.trim()) {
      const q = params.search.trim();
      where.OR = [
        { subject: { contains: q, mode: 'insensitive' } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
      ];
    }

    return paginatedQuery<AdminTicketRow>(db.ticket, {
      cursor: params.cursor,
      pageSize: params.pageSize || 50,
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        user: { select: { id: true, email: true } },
        _count: { select: { messages: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }

  /**
   * Close a ticket.
   */
  async closeTicket(ticketId: string) {
    await db.ticket.update({
      where: { id: ticketId },
      data: { status: 'CLOSED' },
    });
  }

  /**
   * Reopen a closed ticket.
   */
  async reopenTicket(ticketId: string) {
    await db.ticket.update({
      where: { id: ticketId },
      data: { status: 'OPEN' },
    });
  }

  /**
   * Ticket statistics for the header.
   */
  async getTicketStats() {
    const [total, open, pending, closed] = await Promise.all([
      db.ticket.count(),
      db.ticket.count({ where: { status: 'OPEN' } }),
      db.ticket.count({ where: { status: 'PENDING' } }),
      db.ticket.count({ where: { status: 'CLOSED' } }),
    ]);

    return { total, open, pending, closed };
  }
}

export const adminTicketService = new AdminTicketService();
