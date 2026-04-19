import { z } from 'zod';

type ServerActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; issues?: string[] };

/**
 * A highly secured wrapper for Server Actions.
 * It validates input using Zod and catches any internal throws
 * (including Prisma errors) so that stack traces never leak to the client.
 */
export async function createSafeAction<TInput, TOutput>(
  schema: z.Schema<TInput> | null,
  input: any,
  handler: (validatedInput: TInput) => Promise<TOutput>
): Promise<ServerActionResponse<TOutput>> {
  try {
    let parsedInput = input as TInput;

    if (schema) {
      const validation = schema.safeParse(input);
      if (!validation.success) {
        return {
          success: false,
          error: 'Validation failed',
          issues: validation.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
        };
      }
      parsedInput = validation.data;
    }

    const data = await handler(parsedInput);
    return { success: true, data };
  } catch (error: any) {
    // 1. Log the full detailed error securely on the server
    console.error('[SAFE_ACTION_ERROR]', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });

    // 2. Do not leak details like "PrismaClientKnownRequestError"
    if (error.code && error.clientVersion) {
      // It's definitely a Prisma Error
      return { success: false, error: 'Внутренняя ошибка базы данных. Попробуйте позже.' };
    }

    // 3. Known business-logic errors (e.g. throw new Error("..."))
    // In Smmplan, usually we throw simple string errors for business logic.
    // If it looks like a generic system error, obscure it.
    if (error.name === 'Error' && !error.message.includes('Prisma')) {
      return { success: false, error: error.message };
    }

    return { success: false, error: 'Непредвиденная проблема сервера.' };
  }
}
