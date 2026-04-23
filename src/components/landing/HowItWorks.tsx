export function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Выберите услугу",
      desc: "Укажите платформу и тип. Или просто вставьте ссылку — система определит всё сама.",
    },
    {
      num: "02",
      title: "Оформите заказ",
      desc: "Укажите количество, email и оплатите удобным способом. Регистрация не нужна.",
    },
    {
      num: "03",
      title: "Получите результат",
      desc: "Запуск за 4 секунды. Плавная подача для естественного роста.",
    },
  ];

  return (
    <section id="how" className="mx-auto max-w-6xl px-4 py-10">
      <h2 className="text-xl md:text-2xl font-bold text-center mb-8">
        Как это работает
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {steps.map((s) => (
          <div key={s.num} className="border rounded-xl p-5">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {s.num}
            </div>
            <h3 className="font-bold mb-1">{s.title}</h3>
            <p className="text-sm text-gray-500">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
