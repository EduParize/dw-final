/**
 * Recorte do skins.json real (CSGO-API / ByMykel), só com os campos que o sistema usa.
 * Cobre: skin comum com StatTrak, skin sem StatTrak, faca com pintura e faca sem pintura.
 */
export const SKINS = [
  {
    id: 'skin-ak-redline',
    name: 'AK-47 | Redline',
    weapon: { id: 'weapon_ak47', name: 'AK-47' },
    pattern: { id: 'redline', name: 'Redline' },
    rarity: { id: 'rarity_legendary_weapon', name: 'Classified', color: '#d32ce6' },
    min_float: 0.1,
    max_float: 0.7,
    stattrak: true,
    souvenir: false,
    image: 'https://exemplo/ak-redline.png',
  },
  {
    id: 'skin-awp-redline',
    name: 'AWP | Redline',
    weapon: { id: 'weapon_awp', name: 'AWP' },
    pattern: { id: 'redline', name: 'Redline' },
    rarity: { id: 'rarity_legendary_weapon', name: 'Classified', color: '#d32ce6' },
    min_float: 0.1,
    max_float: 0.4,
    stattrak: true,
    souvenir: false,
    image: 'https://exemplo/awp-redline.png',
  },
  {
    id: 'skin-mp9-sand-dashed',
    name: 'MP9 | Sand Dashed',
    weapon: { id: 'weapon_mp9', name: 'MP9' },
    pattern: { id: 'sand_dashed', name: 'Sand Dashed' },
    rarity: { id: 'rarity_common_weapon', name: 'Consumer Grade', color: '#b0c3d9' },
    min_float: 0.0,
    max_float: 1.0,
    stattrak: false,
    souvenir: true,
    image: 'https://exemplo/mp9.png',
  },
  {
    id: 'skin-karambit-doppler',
    name: '★ Karambit | Doppler',
    weapon: { id: 'weapon_knife_karambit', name: 'Karambit' },
    pattern: { id: 'doppler', name: 'Doppler' },
    rarity: { id: 'rarity_ancient_weapon', name: 'Covert', color: '#eb4b4b' },
    min_float: 0.0,
    max_float: 0.08,
    stattrak: true,
    souvenir: false,
    image: 'https://exemplo/karambit-doppler.png',
  },
  {
    id: 'skin-vanilla-weapon_knife_karambit',
    name: '★ Karambit',
    weapon: { id: 'weapon_knife_karambit', name: 'Karambit' },
    pattern: null,
    rarity: { id: 'rarity_ancient_weapon', name: 'Covert', color: '#eb4b4b' },
    min_float: null,
    max_float: null,
    stattrak: true,
    souvenir: false,
    image: 'https://exemplo/karambit.png',
  },
  {
    id: 'skin-m4a1s-printstream',
    name: 'M4A1-S | Printstream',
    weapon: { id: 'weapon_m4a1_silencer', name: 'M4A1-S' },
    pattern: { id: 'printstream', name: 'Printstream' },
    rarity: 'Covert', // algumas versões do skins.json trazem a raridade só como texto
    min_float: 0.0,
    max_float: 1.0,
    stattrak: true,
    souvenir: false,
    image: 'https://exemplo/m4a1s.png',
  },
];

export const AK = 'skin-ak-redline';
export const AWP = 'skin-awp-redline';
export const MP9_SEM_STATTRAK = 'skin-mp9-sand-dashed';
export const KARAMBIT_DOPPLER = 'skin-karambit-doppler';
export const KARAMBIT_SEM_PINTURA = 'skin-vanilla-weapon_knife_karambit';
