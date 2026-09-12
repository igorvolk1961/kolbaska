export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      <h1 className="section-title">О нас</h1>
      <div className="card mt-6 space-y-4 p-8 text-meat-700">
        <p>
          «Колбасный цех» — новое заказное производство при крупном мясокомбинате. Мы соединяем
          промышленное качество и ремесленный подход: собираем колбасные торты из готовой продукции и
          выпускаем изделия малыми объёмами по рецепту клиента.
        </p>
        <p>
          Комбинат имеет налаженные каналы поставки любого сырья — от классических говядины и свинины до
          экзотических ингредиентов, — а также квалифицированный персонал и современное технологическое
          оборудование.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-meat-50 p-5">
            <p className="font-display text-3xl font-bold text-meat-800">32</p>
            <p className="text-sm">авторских колбасных торта и арт-объекта</p>
          </div>
          <div className="rounded-2xl bg-meat-50 p-5">
            <p className="font-display text-3xl font-bold text-meat-800">2</p>
            <p className="text-sm">направления: готовые композиции и рецепт клиента</p>
          </div>
          <div className="rounded-2xl bg-meat-50 p-5">
            <p className="font-display text-3xl font-bold text-meat-800">5</p>
            <p className="text-sm">уровней программы лояльности со скидками</p>
          </div>
        </div>
        <p className="text-sm text-meat-500">
          Это демонстрационный прототип интерфейса. Реальные платежи, транзакции, автоматическая отправка
          заказов в производство и отслеживание доставки не выполняются.
        </p>
      </div>
    </div>
  );
}
