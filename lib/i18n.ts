import type { Category, Condition, Language, ReferenceBasis, Sort } from './offer.ts';

const en = {
  brand: 'Open Box Finder', deals: 'Deals', saved: 'Saved', search: 'Search deals', searchHint: 'Product, brand, or keyword',
  filters: 'Filters', sort: 'Sort', all: 'All', clear: 'Clear', retailers: 'Retailers', categories: 'Categories',
  fulfillment: 'Fulfillment', both: 'Both', pickup: 'Pickup', shipped: 'Shipped', price: 'Price (USD)',
  minPrice: 'Min price', maxPrice: 'Max price', radius: 'Radius (miles)', miles: 'miles', location: 'Location',
  cancel: 'Cancel', apply: 'Apply', close: 'Close', back: 'Back to deals', backSaved: 'Back to Saved',
  noVerified: 'No verified listings yet', noVerifiedHelp: 'Listings appear after a source is verified.',
  noMatches: 'No matching listings', noMatchesHelp: 'Try another retailer, category, or price range.', reset: 'Reset filters',
  noSaved: 'Your saved list starts here', noSavedHelp: 'Save a listing to find it again on this device.',
  sources: 'Sources', sourceStatus: 'Source status', awaitingSource: 'Awaiting source verification',
  permissionRequired: 'Permission required', credentialsRequired: 'Approved access required',
  currentListings: 'Current listings', noSourceConnected: 'No source is connected yet.',
  sourceHelp: 'Source access and availability are checked separately. These links are not inventory.',
  openRetailer: 'Visit retailer', details: 'View details', retailer: 'Retailer', condition: 'Condition',
  cosmeticGrade: 'Cosmetic condition', availability: 'Availability', available: 'Retailer reports available',
  unknownStock: 'Check availability with retailer', unavailable: 'Listing no longer available',
  unavailableHelp: 'This exact listing is no longer in the current catalog. Another unit may differ.',
  stale: 'Last check is out of date', checked: 'Last checked', neverChecked: 'Not checked yet',
  updating: 'Checking listings…', offline: 'You’re offline. Displayed listings may be out of date.',
  updateFailed: 'Couldn’t check listings. Try again later.', refresh: 'Check again', updated: 'Listings updated',
  save: 'Save listing', unsave: 'Unsave listing', remove: 'Remove', savedHere: 'Saved on this device',
  savedPrivacy: 'Saved listings and preferences stay in this browser.', interested: 'Interested',
  navigate: 'Navigate to pickup', pickupAt: 'Pickup at', localDelivery: 'Local delivery',
  shipping: 'US shipping', shippingUnknown: 'Shipping cost shown by retailer', freeShipping: 'Free shipping',
  fulfillmentUnknown: 'Confirm pickup or shipping with retailer', priceUnknown: 'See retailer for price',
  comparison: 'Comparison price', savingsBasis: 'Savings use the labelled comparison price.',
  advertisedSavings: 'Advertised-reference savings', variant: 'Exact variant', sourceListing: 'Source listing',
  syndicated: 'Syndicated deal', sourceText: 'Original source text', licensedText: 'Source text remains in its original language.',
  approximateLocation: 'Distances use an approximate area center.', originHint: 'Choose a nearby area or enter coordinates.',
  area: 'Area', latitude: 'Latitude', longitude: 'Longitude', customLocation: 'Custom location',
  invalidPrice: 'Enter a nonnegative USD price with up to two decimal places.',
  invalidRange: 'Min price must be less than or equal to max price.',
  invalidRadius: 'Enter a radius from 0 to 500 miles.', invalidLocation: 'Enter a label and valid latitude/longitude.',
  storageUnavailable: 'Browser storage is unavailable. Changes will last for this visit.',
  liveLimit: 'Verified source coverage is still being connected.',
  skip: 'Skip to listings', language: 'Language', selectedRetailers: 'Selected retailers',
  noneSelected: 'No retailers selected', more: 'More information', count: 'listings',
} as const;

const ru: Record<keyof typeof en, string> = {
  brand: 'Open Box Finder', deals: 'Предложения', saved: 'Сохранённое', search: 'Поиск предложений', searchHint: 'Товар, бренд или слово',
  filters: 'Фильтры', sort: 'Сортировка', all: 'Все', clear: 'Очистить', retailers: 'Магазины', categories: 'Категории',
  fulfillment: 'Получение', both: 'Любое', pickup: 'Самовывоз', shipped: 'Доставка', price: 'Цена (USD)',
  minPrice: 'Цена от', maxPrice: 'Цена до', radius: 'Радиус (мили)', miles: 'миль', location: 'Местоположение',
  cancel: 'Отмена', apply: 'Применить', close: 'Закрыть', back: 'Назад к предложениям', backSaved: 'Назад к сохранённому',
  noVerified: 'Проверенных предложений пока нет', noVerifiedHelp: 'Предложения появятся после проверки источника.',
  noMatches: 'Подходящих предложений нет', noMatchesHelp: 'Измените магазин, категорию или диапазон цен.', reset: 'Сбросить фильтры',
  noSaved: 'Здесь будут сохранённые товары', noSavedHelp: 'Сохраните предложение, чтобы вернуться к нему на этом устройстве.',
  sources: 'Источники', sourceStatus: 'Состояние источников', awaitingSource: 'Источник ожидает проверки',
  permissionRequired: 'Требуется разрешение', credentialsRequired: 'Требуется одобренный доступ',
  currentListings: 'Текущие предложения', noSourceConnected: 'Источники пока не подключены.',
  sourceHelp: 'Доступ к источнику и наличие проверяются отдельно. Эти ссылки не являются каталогом товаров.',
  openRetailer: 'Открыть магазин', details: 'Подробнее', retailer: 'Магазин', condition: 'Состояние',
  cosmeticGrade: 'Внешнее состояние', availability: 'Наличие', available: 'Магазин сообщает о наличии',
  unknownStock: 'Уточните наличие в магазине', unavailable: 'Предложение больше недоступно',
  unavailableHelp: 'Этого предложения больше нет в текущем каталоге. Другой экземпляр может отличаться.',
  stale: 'Данные проверки устарели', checked: 'Последняя проверка', neverChecked: 'Проверки ещё не было',
  updating: 'Проверяем предложения…', offline: 'Нет интернета. Показанные предложения могут быть устаревшими.',
  updateFailed: 'Не удалось проверить предложения. Попробуйте позже.', refresh: 'Проверить снова', updated: 'Предложения обновлены',
  save: 'Сохранить предложение', unsave: 'Убрать из сохранённого', remove: 'Удалить', savedHere: 'Сохранено на этом устройстве',
  savedPrivacy: 'Сохранённое и настройки остаются в этом браузере.', interested: 'Интересует',
  navigate: 'Маршрут к месту самовывоза', pickupAt: 'Самовывоз из', localDelivery: 'Местная доставка',
  shipping: 'Доставка по США', shippingUnknown: 'Стоимость доставки указана в магазине', freeShipping: 'Бесплатная доставка',
  fulfillmentUnknown: 'Уточните самовывоз или доставку в магазине', priceUnknown: 'Уточните цену в магазине',
  comparison: 'Цена для сравнения', savingsBasis: 'Экономия рассчитана по указанной цене для сравнения.',
  advertisedSavings: 'Экономия от указанной цены', variant: 'Точный вариант', sourceListing: 'Исходное предложение',
  syndicated: 'Предложение из ленты', sourceText: 'Исходный текст', licensedText: 'Текст источника сохранён на исходном языке.',
  approximateLocation: 'Расстояние рассчитано от примерного центра района.', originHint: 'Выберите район или введите координаты.',
  area: 'Район', latitude: 'Широта', longitude: 'Долгота', customLocation: 'Другое местоположение',
  invalidPrice: 'Введите цену в USD не ниже нуля, не более двух цифр после запятой.',
  invalidRange: 'Минимальная цена не должна превышать максимальную.',
  invalidRadius: 'Введите радиус от 0 до 500 миль.', invalidLocation: 'Введите название и допустимые широту и долготу.',
  storageUnavailable: 'Хранилище браузера недоступно. Изменения сохранятся только на время посещения.',
  liveLimit: 'Проверенные источники ещё подключаются.',
  skip: 'Перейти к предложениям', language: 'Язык', selectedRetailers: 'Выбранные магазины',
  noneSelected: 'Магазины не выбраны', more: 'Дополнительная информация', count: 'предложений',
};

export type TextKey = keyof typeof en;
export function text(language: Language, key: TextKey): string { return language === 'ru' ? ru[key] : en[key]; }

const categories: Record<Category, [string, string]> = {
  appliances: ['Appliances', 'Бытовая техника'], tv: ['TV & Home Theater', 'ТВ и домашний кинотеатр'],
  computers: ['Computers & Tablets', 'Компьютеры и планшеты'], phones: ['Phones & Wearables', 'Телефоны и часы'],
  audio: ['Audio', 'Аудио'], 'smart-home': ['Smart Home', 'Умный дом'], gaming: ['Gaming', 'Игры'],
  tools: ['Tools & Home Improvement', 'Инструменты и ремонт'], other: ['Other', 'Другое'],
};
export const CATEGORIES = Object.keys(categories) as Category[];
export function categoryLabel(language: Language, category: Category): string { return categories[category][language === 'ru' ? 1 : 0]; }
const conditions: Record<Condition, [string, string]> = {
  'open-box': ['Open box', 'Открытая упаковка'], refurbished: ['Refurbished', 'Восстановлен'], used: ['Used', 'Б/у'],
  'scratch-and-dent': ['Scratch & dent', 'Царапины или вмятины'], 'new-clearance': ['New · clearance', 'Новый · распродажа'],
  unspecified: ['Condition not specified', 'Состояние не указано'],
};
export function conditionLabel(language: Language, condition: Condition): string { return conditions[condition][language === 'ru' ? 1 : 0]; }
const references: Record<ReferenceBasis, [string, string]> = {
  'current-new': ['Current new price', 'Текущая цена нового товара'], msrp: ['MSRP', 'Рекомендованная цена (MSRP)'],
  'retailer-list': ['Retailer list price', 'Указанная магазином цена'], 'retailer-regular': ['Retailer regular price', 'Обычная цена магазина'],
  'retailer-was': ['Retailer previous price', 'Прежняя цена магазина'],
};
export function referenceLabel(language: Language, basis: ReferenceBasis): string { return references[basis][language === 'ru' ? 1 : 0]; }
const sorts: Record<Sort, [string, string]> = {
  percent: ['Savings: %', 'Экономия: %'], dollars: ['Savings: $', 'Экономия: $'],
  'price-low': ['Price: low to high', 'Цена: по возрастанию'], newest: ['Recently checked', 'Последние проверки'],
};
export const SORTS = Object.keys(sorts) as Sort[];
export function sortLabel(language: Language, sort: Sort): string { return sorts[sort][language === 'ru' ? 1 : 0]; }
