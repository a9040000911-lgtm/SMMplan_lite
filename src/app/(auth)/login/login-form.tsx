"use client";

import { useActionState } from "react";
import { requestMagicLink } from "@/actions/auth/request-magic-link";
import { Mail, Loader2 } from "lucide-react";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(requestMagicLink, {
    error: null,
    success: false,
  });

  if (state.success) {
    return (
      <div className="rounded-xl bg-zinc-50 p-6 text-center border border-zinc-200">
        <Mail className="mx-auto h-8 w-8 text-zinc-400 mb-3" />
        <h3 className="text-sm font-medium text-zinc-900">Проверьте почту</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Мы отправили волшебную ссылку для входа.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-8 space-y-6">
      <div className="rounded-md shadow-sm -space-y-px">
        <div>
          <label htmlFor="email" className="sr-only">
            Email адрес
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-zinc-300 placeholder-zinc-500 text-zinc-900 focus:outline-none focus:ring-zinc-900 focus:border-zinc-900 focus:z-10 sm:text-sm"
            placeholder="name@example.com"
          />
        </div>
      </div>

      {state.error && (
        <div className="text-red-500 text-sm text-center">{state.error}</div>
      )}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-zinc-900 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900 disabled:opacity-50 transition-colors"
        >
          {pending ? (
            <Loader2 className="animate-spin h-5 w-5" />
          ) : (
            "Получить ссылку"
          )}
        </button>
      </div>
    </form>
  );
}
