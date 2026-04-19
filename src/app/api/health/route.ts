import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

/**
 * Health Check endpoint — используется Docker healthcheck и мониторингом.
 * 
 * Проверяет:
 * - Процесс Next.js запущен (implicit)
 * - PostgreSQL доступен и отвечает на запросы
 * 
 * Стандарт: 12-Factor App #9 (Disposability)
 * Docker: healthcheck → GET http://localhost:3000/api/health
 * 
 * БЕЗ аутентификации — публичный эндпоинт.
 * Не раскрывает sensitive данные (только status + timestamp).
 */
export async function GET() {
  try {
    // Проверка соединения с PostgreSQL (должна быть < 500ms)
    await db.$queryRaw`SELECT 1`;

    return NextResponse.json(
      { status: 'ok', timestamp: new Date().toISOString() },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
      }
    );
  } catch {
    return NextResponse.json(
      { status: 'error', message: 'Database unreachable' },
      {
        status: 503,
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
      }
    );
  }
}
