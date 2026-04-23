'use client';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2>Произошла ошибка</h2>
      <button onClick={() => reset()}>Попробовать снова</button>
    </div>
  );
}
