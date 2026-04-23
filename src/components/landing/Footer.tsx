export function Footer() {
  return (
    <footer className="border-t mt-10">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
          {/* Brand */}
          <div>
            <div className="font-bold mb-2">SMMplan Lite</div>
            <p className="text-xs text-gray-500">
              Сервис продвижения в социальных сетях.
              <br />
              Быстро, безопасно, с гарантией.
            </p>
          </div>

          {/* Links */}
          <div>
            <div className="font-medium mb-2 text-gray-400 text-xs uppercase">
              Навигация
            </div>
            <ul className="space-y-1 text-gray-600">
              <li>
                <a href="#services">Услуги</a>
              </li>
              <li>
                <a href="#pricing">Цены</a>
              </li>
              <li>
                <a href="#faq">FAQ</a>
              </li>
              <li>
                <a href="/dashboard">Личный кабинет</a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <div className="font-medium mb-2 text-gray-400 text-xs uppercase">
              Информация
            </div>
            <ul className="space-y-1 text-gray-600">
              <li>
                <a href="/terms">Оферта</a>
              </li>
              <li>
                <a href="/privacy">Политика конфиденциальности</a>
              </li>
              <li>support@smmplan.com</li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-6 pt-6 text-xs text-gray-400 text-center">
          © {new Date().getFullYear()} SMMplan. Все права защищены.
        </div>
      </div>
    </footer>
  );
}
