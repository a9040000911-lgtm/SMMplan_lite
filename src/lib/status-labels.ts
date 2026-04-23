/**
 * Russian Status Labels for UI Display.
 * Internal codes stay English (provider API compatibility).
 */

export const ORDER_STATUS_LABELS: Record<string, string> = {
  AWAITING_PAYMENT: 'Ожидает оплаты',
  PENDING: 'Ожидает обработки',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Выполнен',
  PARTIAL: 'Частично выполнен',
  CANCELED: 'Отменён',
  ERROR: 'Ошибка',
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  AWAITING_PAYMENT: 'text-muted-foreground bg-secondary',
  PENDING: 'text-accent-foreground bg-accent',
  IN_PROGRESS: 'text-primary bg-primary/10',
  COMPLETED: 'text-primary-foreground bg-primary',
  PARTIAL: 'text-foreground bg-secondary',
  CANCELED: 'text-destructive-foreground bg-destructive',
  ERROR: 'text-destructive-foreground bg-destructive',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ожидает оплаты',
  SUCCEEDED: 'Оплачен',
  CANCELED: 'Отменён',
};

export const TICKET_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Открыт',
  PENDING: 'Ответ получен',
  CLOSED: 'Закрыт',
};

export function getOrderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status] || status;
}

export function getOrderStatusColor(status: string): string {
  return ORDER_STATUS_COLORS[status] || 'text-zinc-500 bg-zinc-50';
}

export function getPaymentStatusLabel(status: string): string {
  return PAYMENT_STATUS_LABELS[status] || status;
}

export function getTicketStatusLabel(status: string): string {
  return TICKET_STATUS_LABELS[status] || status;
}
