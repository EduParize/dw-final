// Faixas de desgaste (mesmos limites do backend). No frontend servem só para a prévia
// enquanto o usuário digita e para desenhar a barra de float: o desgaste salvo vem da API.

export const FAIXAS_DESGASTE = [
  { nome: 'Factory New', sigla: 'FN', min: 0, max: 0.07 },
  { nome: 'Minimal Wear', sigla: 'MW', min: 0.07, max: 0.15 },
  { nome: 'Field-Tested', sigla: 'FT', min: 0.15, max: 0.38 },
  { nome: 'Well-Worn', sigla: 'WW', min: 0.38, max: 0.45 },
  { nome: 'Battle-Scarred', sigla: 'BS', min: 0.45, max: 1 },
];

export const NOMES_DESGASTE = FAIXAS_DESGASTE.map((faixa) => faixa.nome);

/** Mesma regra do backend: o limite superior pertence à faixa seguinte (0.07 é Minimal Wear). */
export function calcularDesgaste(float) {
  if (typeof float !== 'number' || Number.isNaN(float) || float < 0 || float > 1) {
    return null;
  }
  return FAIXAS_DESGASTE.find((faixa) => float < faixa.max) ?? FAIXAS_DESGASTE.at(-1);
}

export function siglaDesgaste(nome) {
  return FAIXAS_DESGASTE.find((faixa) => faixa.nome === nome)?.sigla ?? null;
}

/** Aceita vírgula ("0,15") e devolve number ou NaN; vazio → null. */
export function lerNumero(texto) {
  const limpo = String(texto ?? '').trim().replace(',', '.');
  if (limpo === '') {
    return null;
  }
  return /^-?\d*\.?\d+$/.test(limpo) || /^-?\d+\.$/.test(limpo) ? Number(limpo) : Number.NaN;
}
