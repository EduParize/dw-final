const URL_SKINS =
  'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json';
const TIMEOUT_MS = 60_000;

/** Baixa o catálogo público de skins (CSGO-API / ByMykel). Devolve o array bruto. */
export async function baixarSkins() {
  const resposta = await fetch(URL_SKINS, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!resposta.ok) {
    throw new Error(`CSGO-API respondeu ${resposta.status}`);
  }
  const dados = await resposta.json();
  if (!Array.isArray(dados)) {
    throw new Error('Formato inesperado do skins.json (esperava um array)');
  }
  return dados;
}
