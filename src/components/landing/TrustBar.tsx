export function TrustBar() {
  const stats = [
    { value: "2M+", label: "Заказов выполнено" },
    { value: "4 сек", label: "Среднее время старта" },
    { value: "99%", label: "Заказов в срок" },
    { value: "24/7", label: "Поддержка" },
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="text-center border rounded-xl p-4">
            <div className="text-xl md:text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
