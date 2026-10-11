/** Human-reviewed navigation links only. Never catalog, price or stock evidence. */
export const OPEN_BOX_LINKS = [
  ['computers', 'Computers & tablets', 'Компьютеры и планшеты', 'open-box-computers-tablets', '1751036309117'],
  ['tv', 'TV & home theater', 'Телевизоры и домашний кинотеатр', 'open-box-tv-home-theater', '1751036007848'],
  ['appliances', 'Major appliances', 'Крупная бытовая техника', 'open-box-appliances', '1751033838036'],
  ['phones', 'Phones', 'Телефоны', 'open-box-cell-phones', '1751038780679'],
  ['wearables', 'Wearables', 'Носимые устройства', 'open-box-wearable-technology', '1751039620124'],
  ['gaming', 'Gaming', 'Игры', 'open-box-video-games', '1751039335387'],
  ['headphones', 'Headphones', 'Наушники', 'open-box-headphones', '1755114190178'],
  ['audio', 'Home audio', 'Домашнее аудио', 'open-box-home-audio-speakers', '1751039154833'],
  ['home', 'Home & office', 'Дом и офис', 'open-box-home-furniture-office', '1751040125974'],
  ['fitness', 'Health & fitness', 'Здоровье и фитнес', 'open-box-health-wellness-fitness', '1751039963042'],
  ['cameras', 'Cameras & drones', 'Камеры и дроны', 'open-box-cameras-camcorders-drones', '1751036461812'],
  ['toys', 'Toys & crafts', 'Игрушки и творчество', 'open-box-toys-games-crafts', '1751041962459'],
  ['smart-home', 'Smart home', 'Умный дом', 'open-box-smart-home', '1751041795011'],
  ['outdoor', 'Outdoor living', 'Всё для отдыха на улице', 'open-box-outdoor-living', '1751042200848'],
] as const;

export const BEST_BUY_OUTLET_URL = 'https://www.bestbuy.com/site/electronics/outlet-refurbished-clearance/pcmcat142300050026.c?id=pcmcat142300050026';
export const BEST_BUY_OUTLET_STORES_URL = 'https://www.bestbuy.com/site/outlet-refurbished-clearance/outlet-stores/pcmcat748301966853.c?id=pcmcat748301966853';

/** This is a link to a discussion, not a copied Offer or stock observation.
 * Hide the dated lead after a short manual-review window; no automatic provider fetch.
 */
export const COMMUNITY_LEADS = [{
  id: 'discussion-20103252',
  label: { en: 'Handheld gaming discussion', ru: 'Обсуждение портативной игровой консоли' },
  url: 'https://slickdeals.net/f/20103252-best-buy-open-box-rog-xbox-ally-x-7-fhd-120hz-gaming-handheld-amd-ryzen-ai-z2-extreme-24gb-ram-1tb-ssd-from-789-99',
  reviewedAt: '2026-10-11T17:24:01.683349Z',
  reviewUntil: '2026-10-12T17:24:01.683349Z',
}] as const;
