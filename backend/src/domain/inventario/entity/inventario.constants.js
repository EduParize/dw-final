/** Faixas de desgaste: o float vale de `min` (inclusive) até `max` (exclusive). */
export const FAIXAS_DESGASTE = Object.freeze([
  { nome: 'Factory New', min: 0.0, max: 0.07 },
  { nome: 'Minimal Wear', min: 0.07, max: 0.15 },
  { nome: 'Field-Tested', min: 0.15, max: 0.38 },
  { nome: 'Well-Worn', min: 0.38, max: 0.45 },
  { nome: 'Battle-Scarred', min: 0.45, max: 1.0 },
]);

/** Ordenações aceitas na listagem (usadas na Etapa 5). */
export const ORDENACOES_VALIDAS = Object.freeze(['lucro', 'valor', 'data']);

/** Fontes de preço (usadas na Etapa 4). */
export const FONTES_PRECO = Object.freeze(['steam', 'skinport', 'csfloat', 'buff163']);
export const FONTE_PRECO_PADRAO = 'steam';

/** Campos que o PUT /api/inventario/:id pode alterar. */
export const CAMPOS_EDITAVEIS = Object.freeze(['float', 'stattrak', 'preco_pago', 'data_compra']);
