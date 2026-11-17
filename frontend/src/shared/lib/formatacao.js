// Formatação para exibição. Nenhum cálculo de negócio aqui: os valores já vêm prontos da API.

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const numero = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dataHora = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatarMoeda(valor) {
  return valor === null || valor === undefined ? '—' : moeda.format(valor);
}

/** Moeda com sinal explícito (+R$ 10,00 / −R$ 5,00), para lucro. */
export function formatarMoedaComSinal(valor) {
  if (valor === null || valor === undefined) {
    return '—';
  }
  if (valor === 0) {
    return moeda.format(0);
  }
  return `${valor > 0 ? '+' : '−'}${moeda.format(Math.abs(valor))}`;
}

export function formatarPercentual(valor) {
  if (valor === null || valor === undefined) {
    return '—';
  }
  if (valor === 0) {
    return '0,00%';
  }
  return `${valor > 0 ? '+' : '−'}${numero.format(Math.abs(valor))}%`;
}

/** "2026-10-02" → "02/10/2026" (sem passar por Date, para não mudar o dia por causa do fuso). */
export function formatarData(textoIso) {
  if (!textoIso) {
    return '—';
  }
  const [ano, mes, dia] = textoIso.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

/** ISO com hora → "16/11/2026 19:12" no horário de Brasília. */
export function formatarDataHora(textoIso) {
  return textoIso ? dataHora.format(new Date(textoIso)).replace(',', '') : '—';
}

export function formatarFloat(valor) {
  return valor === null || valor === undefined ? '—' : String(valor);
}

/** Hoje no fuso de São Paulo, como "AAAA-MM-DD" (mesma regra do backend). */
export function hojeEmSaoPaulo() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}
