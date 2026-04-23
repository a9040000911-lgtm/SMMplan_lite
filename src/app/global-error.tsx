'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ru">
      <body>
        <h2>Что-то пошло не так (Global Error)</h2>
        <button onClick={() => reset()}>Попробовать снова</button>
      </body>
    </html>
  );
}
