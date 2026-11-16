/**
 * Arquivos de preço no formato real de cada fonte da CSGO Trader (valores em USD),
 * só com as skins da catalogo.fixture.js. Cotação redonda (R$ 5,00) para facilitar as contas.
 *
 * - AK-47 | Redline (Field-Tested): preço em todas as fontes
 * - StatTrak™ AK-47 | Redline (Field-Tested): preço em todas as fontes
 * - AWP | Redline (Field-Tested): só na Skinport (testa a troca de fonte do valor atual)
 * - ★ Karambit | Doppler (Factory New): preço geral + preço por fase na CSFloat e na Buff163
 * - ★ Karambit: Steam sem last_24h (usa a média de 7 dias)
 * - MP9 | Sand Dashed: não aparece em nenhuma fonte ("sem preço")
 */
export const COTACAO = { valor: 5, data: '2026-11-16 18:30:11' };

export const PRECOS_BRUTOS = {
  steam: {
    'AK-47 | Redline (Field-Tested)': { last_24h: 43.56, last_7d: 42.8, last_30d: 43.51, last_90d: 43.91 },
    'StatTrak™ AK-47 | Redline (Field-Tested)': { last_24h: 88.38, last_7d: 89.62, last_30d: 89.84, last_90d: 91.38 },
    '★ Karambit | Doppler (Factory New)': { last_24h: 1700.24, last_7d: 1796.23, last_30d: 1769.58, last_90d: 1734.52 },
    '★ Karambit': { last_24h: null, last_7d: 1600, last_30d: 1527.48, last_90d: 1530.09 },
    'Item Sem Preco': { last_24h: null, last_7d: null, last_30d: null, last_90d: null },
  },
  skinport: {
    'AK-47 | Redline (Field-Tested)': { starting_at: 22.96, suggested_price: null },
    'StatTrak™ AK-47 | Redline (Field-Tested)': { starting_at: 52.38, suggested_price: null },
    'AWP | Redline (Field-Tested)': { starting_at: 30, suggested_price: null },
    '★ Karambit | Doppler (Factory New)': { starting_at: 1115.93, suggested_price: null },
    '★ Karambit': { starting_at: 880.4, suggested_price: null },
  },
  csfloat: {
    'AK-47 | Redline (Field-Tested)': { price: 23.27, starting_at: { price: 23.27 }, highest_order: { price: 23.1 } },
    'StatTrak™ AK-47 | Redline (Field-Tested)': { price: 52.92, starting_at: { price: 52.92 }, highest_order: { price: 52.4 } },
    '★ Karambit | Doppler (Factory New)': {
      price: 981.15,
      starting_at: { price: 981.15, doppler: { 'Phase 1': 986.59, Ruby: 6135.46 } },
      highest_order: { price: 960, doppler: { 'Phase 1': 960, Ruby: 5750 } },
      doppler: { 'Phase 1': 986.59, Ruby: 6135.46, Sapphire: null },
    },
    '★ Karambit': { price: 746.7, starting_at: { price: 746.7 }, highest_order: { price: 740 } },
  },
  buff163: {
    'AK-47 | Redline (Field-Tested)': { starting_at: { price: 24.06 }, highest_order: { price: 23.06 } },
    'StatTrak™ AK-47 | Redline (Field-Tested)': { starting_at: { price: 54.45 }, highest_order: { price: 52.41 } },
    '★ Karambit | Doppler (Factory New)': {
      starting_at: { price: 988.14, doppler: { 'Phase 1': 988.14, Ruby: 6213.76 } },
      highest_order: { price: 940.3, doppler: { 'Phase 1': 940.3, Ruby: 5435.17 } },
    },
    '★ Karambit': { starting_at: { price: 759.13 }, highest_order: { price: 730.68 } },
  },
};
