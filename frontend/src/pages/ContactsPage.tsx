export default function ContactsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      <h1 className="section-title">Контакты</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card space-y-3 p-8 text-meat-700">
          <p>
            <span className="font-semibold text-meat-900">Телефон:</span> +7 (495) 000-00-00
          </p>
          <p>
            <span className="font-semibold text-meat-900">Почта:</span> hello@kolbaska.ru
          </p>
          <p>
            <span className="font-semibold text-meat-900">Адрес цеха:</span> г. Москва, ул. Колбасная, д. 1
          </p>
          <p>
            <span className="font-semibold text-meat-900">Часы работы:</span> ежедневно 9:00–20:00
          </p>
          <p className="text-sm text-meat-500">
            Заказное производство: обсуждение рецепта и сроков — по телефону или в чате с ассистентом
            Робертом ИИчкиным.
          </p>
        </div>
        <form className="card space-y-4 p-8" onSubmit={(event) => event.preventDefault()}>
          <div>
            <label className="label" htmlFor="contact-name">
              Имя
            </label>
            <input id="contact-name" className="input" placeholder="Как к вам обращаться" />
          </div>
          <div>
            <label className="label" htmlFor="contact-message">
              Сообщение
            </label>
            <textarea id="contact-message" className="input h-32" placeholder="Опишите ваш заказ или вопрос" />
          </div>
          <button type="submit" className="btn-primary w-full">
            Демо-отправка сообщения
          </button>
          <p className="text-xs text-meat-500">
            В прототипе форма не отправляет данные — показан только интерфейс.
          </p>
        </form>
      </div>
    </div>
  );
}
