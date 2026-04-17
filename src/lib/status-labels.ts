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
  AWAITING_PAYMENT: 'text-amber-600 bg-amber-50',
  PENDING: 'text-yellow-600 bg-yellow-50',
  IN_PROGRESS: 'text-blue-600 bg-blue-50',
  COMPLETED: 'text-emerald-600 bg-emerald-50',
  PARTIAL: 'text-orange-600 bg-orange-50',
  CANCELED: 'text-red-600 bg-red-50',
  ERROR: 'text-zinc-600 bg-zinc-100',
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
