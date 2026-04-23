export function WhyUs() {
  const features = [
    {
      icon: "🌊",
      title: "Плавный рост",
      desc: "Drip-Feed подача — подписчики приходят постепенно, неотличимо от органического роста.",
    },
    {
      icon: "🛡️",
      title: "Гарантия от отписок",
      desc: "Бесплатная замена при отписках в течение гарантийного периода.",
    },
    {
      icon: "🧠",
      title: "AI-подбор услуг",
      desc: "Вставьте ссылку — система определит платформу и подберёт оптимальный пакет.",
    },
    {
      icon: "💎",
      title: "Программа лояльности",
      desc: "Чем больше заказов — тем ниже цены. До 15% скидки для постоянных.",
    },
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <h2 className="text-xl md:text-2xl font-bold text-center mb-8">
        Почему выбирают нас
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {features.map((f) => (
          <div key={f.title} className="border rounded-xl p-5">
            <div className="text-2xl mb-2">{f.icon}</div>
            <h3 className="font-bold text-sm mb-1">{f.title}</h3>
            <p className="text-xs text-gray-500">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
