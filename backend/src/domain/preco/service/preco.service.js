import { AppError } from '../../common/errors/index.js';
import { FONTE_COTACAO, FONTES_PRECO, VALIDADE_CACHE_MS } from '../entity/preco.constants.js';

/** Primeiro valor que é um número positivo, ou null. */
function primeiroPreco(...valores) {
  for (const valor of valores) {
    if (typeof valor === 'number' && Number.isFinite(valor) && valor > 0) return valor;
  }
  return null;
}

/** Só as entradas { fase: preço } com preço válido, ou null se não sobrar nenhuma. */
function limparFases(fases) {
  if (!fases || typeof fases !== 'object') return null;
  const limpas = Object.entries(fases).filter(([, preco]) => primeiroPreco(preco) !== null);
  return limpas.length ? Object.fromEntries(limpas) : null;
}

/**
 * Cada fonte da CSGO Trader tem um formato diferente. Para cada uma: de onde sai o preço (USD)
 * e, quando existe, o preço por fase das Dopplers (Phase 1..4, Ruby, Sapphire, Black Pearl, Emerald).
 *
 * steam:    { last_24h, last_7d, last_30d, last_90d }          → média mais recente disponível
 * skinport: { starting_at, suggested_price }                    → menor oferta
 * csfloat:  { price, starting_at: { price, doppler }, doppler } → menor oferta
 * buff163:  { starting_at: { price, doppler }, highest_order }  → menor oferta
 */
const EXTRATORES = Object.freeze({
  steam: (e) => ({ preco: primeiroPreco(e?.last_24h, e?.last_7d, e?.last_30d, e?.last_90d), fases: null }),
  skinport: (e) => ({ preco: primeiroPreco(e?.starting_at, e?.suggested_price), fases: null }),
  csfloat: (e) => ({
    preco: primeiroPreco(e?.price, e?.starting_at?.price),
    fases: limparFases(e?.doppler ?? e?.starting_at?.doppler),
  }),
  buff163: (e) => ({ preco: primeiroPreco(e?.starting_at?.price), fases: limparFases(e?.starting_at?.doppler) }),
});

/**
 * Reduz o arquivo bruto de uma fonte para { market_hash_name: { preco, fases? } },
 * descartando os itens sem preço. É isso que vai para o cache (banco e memória).
 */
export function normalizarArquivoDePrecos(fonte, bruto) {
  const extrair = EXTRATORES[fonte];
  if (!extrair) throw new Error(`Fonte de preço desconhecida: ${fonte}`);

  const normalizado = {};
  for (const [nome, entrada] of Object.entries(bruto ?? {})) {
    const { preco, fases } = extrair(entrada);
    if (preco === null && !fases) continue;
    normalizado[nome] = fases ? { preco, fases } : { preco };
  }
  return normalizado;
}

function arredondar(valor) {
  return Math.round(valor * 100) / 100;
}

function descreverErro(err) {
  return err?.message || err?.code || String(err);
}

/**
 * Baixa, guarda e consulta os preços das skins e a cotação do dólar.
 * O download só acontece em `atualizar()`; as consultas usam o cache em memória,
 * que é uma cópia do que está na tabela cache_precos.
 */
export function criarPrecoService({ precoRepository, baixarPrecos, baixarCotacao, agora = () => new Date() }) {
  /** fonte → { conteudo, atualizadoEm } */
  const cache = new Map();
  let atualizacaoEmAndamento = null;

  async function baixarFonte(fonte) {
    if (fonte === FONTE_COTACAO) {
      const { valor, data } = await baixarCotacao();
      return { valor, data };
    }
    const normalizado = normalizarArquivoDePrecos(fonte, await baixarPrecos(fonte));
    if (Object.keys(normalizado).length === 0) {
      throw new Error(`Arquivo de preços ${fonte} veio sem nenhum preço`);
    }
    return normalizado;
  }

  /** Baixa uma fonte e só troca o cache (banco + memória) se tudo deu certo. */
  async function atualizarFonte(fonte) {
    const conteudo = await baixarFonte(fonte);
    const atualizadoEm = agora();
    await precoRepository.salvar(fonte, conteudo, atualizadoEm);
    cache.set(fonte, { conteudo, atualizadoEm });
  }

  async function executarAtualizacao() {
    const fontes = [...FONTES_PRECO, FONTE_COTACAO];
    const resultados = await Promise.allSettled(fontes.map((fonte) => atualizarFonte(fonte)));
    return fontes.map((fonte, i) => {
      const { status, reason } = resultados[i];
      if (status === 'fulfilled') return { fonte, ok: true };
      console.error(`[precos] falha ao atualizar ${fonte}:`, descreverErro(reason));
      return { fonte, ok: false, erro: descreverErro(reason) };
    });
  }

  /**
   * Baixa todas as fontes e a cotação. Uma fonte que falha mantém a cópia anterior.
   * Chamadas simultâneas reaproveitam a mesma atualização em andamento.
   * Devolve [{ fonte, ok, erro? }].
   */
  function atualizar() {
    atualizacaoEmAndamento ??= executarAtualizacao().finally(() => {
      atualizacaoEmAndamento = null;
    });
    return atualizacaoEmAndamento;
  }

  /**
   * Data de cada fonte no cache, a cotação atual e se há download em andamento.
   * `atualizado_em` é a data da fonte mais antiga (o que a tela mostra como "Preços atualizados em"),
   * ou null enquanto alguma fonte nunca foi baixada.
   */
  function status() {
    const fontes = Object.fromEntries(
      [...FONTES_PRECO, FONTE_COTACAO].map((fonte) => [fonte, cache.get(fonte)?.atualizadoEm ?? null]),
    );
    const datas = Object.values(fontes);
    const atualizadoEm = datas.includes(null) ? null : new Date(Math.min(...datas.map((d) => d.getTime())));
    return {
      atualizado_em: atualizadoEm,
      fontes,
      cotacao_usd_brl: cache.get(FONTE_COTACAO)?.conteudo?.valor ?? null,
      atualizando: atualizacaoEmAndamento !== null,
    };
  }

  return {
    status,

    /**
     * Atualização pedida pelo usuário (POST /api/precos/atualizar).
     * Devolve o resultado de cada fonte e o novo status; se nenhuma fonte deu certo → 502.
     */
    async atualizarAgora() {
      const resultado = await atualizar();
      if (!resultado.some((r) => r.ok)) {
        throw new AppError('Não foi possível atualizar os preços: todas as fontes falharam', 502);
      }
      return { resultado, ...status() };
    },

    /** Lê o cache salvo no banco para a memória (usado na inicialização). */
    async carregarDoBanco() {
      const linhas = await precoRepository.listar();
      for (const { fonte, conteudo, atualizado_em: atualizadoEm } of linhas) {
        cache.set(fonte, { conteudo, atualizadoEm: new Date(atualizadoEm) });
      }
      return linhas.length;
    },

    atualizar,

    /** true se falta alguma fonte no cache ou se alguma tem 24h ou mais. */
    precisaAtualizar() {
      const limite = agora().getTime() - VALIDADE_CACHE_MS;
      return [...FONTES_PRECO, FONTE_COTACAO].some((fonte) => {
        const item = cache.get(fonte);
        return !item || item.atualizadoEm.getTime() <= limite;
      });
    },

    /**
     * Preço de um market_hash_name em cada fonte, já convertido para R$ e arredondado.
     * Com `fase` (Doppler), só vale o preço daquela fase: uma fonte que não separa as fases
     * (Steam, Skinport) devolve null, porque o preço geral de uma Ruby seria o de uma Phase 1.
     * Fonte sem preço → null. Sem cotação → todas null.
     */
    precosEmReais(marketHashName, fase = null) {
      const cotacao = cache.get(FONTE_COTACAO)?.conteudo?.valor;
      return Object.fromEntries(
        FONTES_PRECO.map((fonte) => {
          const entrada = marketHashName ? cache.get(fonte)?.conteudo?.[marketHashName] : undefined;
          const usd = fase ? entrada?.fases?.[fase] : entrada?.preco;
          return [fonte, cotacao && usd ? arredondar(usd * cotacao) : null];
        }),
      );
    },
  };
}
