const URL_BASE = 'https://prices.csgotrader.app/latest';
const TIMEOUT_MS = 120_000;

/**
 * Baixa o arquivo de preços de uma fonte (steam, skinport, csfloat ou buff163) da CSGO Trader.
 * Devolve o objeto bruto, indexado pelo market_hash_name. Os valores estão em USD.
 * O servidor responde com gzip; o fetch do Node descomprime sozinho.
 */
export async function baixarPrecos(fonte) {
  const resposta = await fetch(`${URL_BASE}/${fonte}.json`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!resposta.ok) {
    throw new Error(`CSGO Trader (${fonte}) respondeu ${resposta.status}`);
  }
  const dados = await resposta.json();
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
    throw new Error(`Formato inesperado do arquivo de preços ${fonte} (esperava um objeto)`);
  }
  return dados;
}
