const URL_COTACAO = 'https://economia.awesomeapi.com.br/json/last/USD-BRL';
const TIMEOUT_MS = 30_000;

/**
 * Baixa a cotação do dólar na AwesomeAPI.
 * Devolve { valor, data }: `valor` é o campo `bid` (R$ por US$ 1) e `data` é o create_date da API.
 */
export async function baixarCotacao() {
  const resposta = await fetch(URL_COTACAO, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!resposta.ok) {
    throw new Error(`AwesomeAPI respondeu ${resposta.status}`);
  }
  const dados = await resposta.json();
  const valor = Number(dados?.USDBRL?.bid);
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new Error('Formato inesperado da cotação USD-BRL (campo bid ausente ou inválido)');
  }
  return { valor, data: dados.USDBRL.create_date ?? null };
}
