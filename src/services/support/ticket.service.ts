import { db } from '@/lib/db';
import { sendMail } from '@/lib/smtp';

export class TicketService {
  async getOrCreateTicket(userId: string, subject: string) {
    const existing = await db.ticket.findFirst({
      where: { userId, status: { not: 'CLOSED' } },
      orderBy: { updatedAt: 'desc' }
    });

    if (existing) return existing;

    return db.ticket.create({
      data: { userId, subject }
    });
  }

  async addMessage(ticketId: string, sender: 'USER' | 'STAFF' | 'INTERNAL', text: string) {
    const message = await db.ticketMessage.create({
      data: { ticketId, sender, text },
      include: {
        ticket: { include: { user: true } }
      }
    });

    await db.ticket.update({
      where: { id: ticketId },
      data: { status: sender === 'STAFF' ? 'PENDING' : 'OPEN' }
    });

    // Notify user if STAFF replied
    if (sender === 'STAFF' && message.ticket.user.email) {
      void sendMail(message.ticket.user.email, `Support Reply: ${message.ticket.subject}`, `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
          <h2 style="color: #4f46e5;">New message from Smmplan Tech Support</h2>
          <p><strong>Subject:</strong> ${message.ticket.subject}</p>
          <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #4f46e5;">
            ${text}
          </div>
          <p style="color: #64748b; font-size: 14px;">Please login to your dashboard to reply.</p>
        </div>
      `);
    }

    return message;
  }
}

export const ticketService = new TicketService();
