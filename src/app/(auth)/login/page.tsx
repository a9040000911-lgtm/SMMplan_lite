import { LoginForm } from "./login-form";

export const metadata = {
  title: "Вход | SMMplan",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-3xl shadow-sm border border-zinc-100">
        <div>
          <h2 className="mt-2 text-center text-3xl font-extrabold text-zinc-900">
            Вход в систему
          </h2>
          <p className="mt-2 text-center text-sm text-zinc-600">
            Код придет вам на почту, пароль не требуется
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
