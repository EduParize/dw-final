import { AppError, NotFoundError } from '../../common/errors/index.js';

const LIMITE_PADRAO = 20;
const LIMITE_MAXIMO = 50;
const MINIMO_CARACTERES_BUSCA = 2;

/** Minúsculas e sem acento, para a busca por nome. */
function normalizarTexto(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

// Algumas versões do skins.json trazem objetos ({ name }) e outras só o texto.
function nomeDe(valor) {
  return typeof valor === 'string' ? valor : (valor?.name ?? null);
}

function normalizarRaridade(rarity) {
  if (!rarity) return null;
  if (typeof rarity === 'string') return { nome: rarity, cor: null };
  return { nome: rarity.name ?? null, cor: rarity.color ?? null };
}

function normalizarSkin(item) {
  const nomeCompleto = item.name;
  return {
    id: item.id,
    arma: nomeDe(item.weapon),
    nome: nomeDe(item.pattern) ?? nomeCompleto,
    nomeCompleto, // ex.: "AK-47 | Redline" ou "★ Karambit | Doppler"
    imagem: item.image ?? null,
    raridade: normalizarRaridade(item.rarity),
    minFloat: Number(item.min_float ?? 0),
    maxFloat: Number(item.max_float ?? 1),
    stattrak: Boolean(item.stattrak),
    souvenir: Boolean(item.souvenir),
    // Facas sem pintura ("★ Karambit"): sem pattern, sem min/max float e sem desgaste no nome de mercado.
    semPintura: !item.pattern,
    // Dopplers: cada fase é uma skin separada no catálogo, mas o market_hash_name é o mesmo.
    fase: item.phase ?? null,
    textoBusca: normalizarTexto(nomeCompleto),
  };
}

/** Formato devolvido pela API (o campo interno textoBusca não sai). */
function paraResposta(skin) {
  return {
    id: skin.id,
    arma: skin.arma,
    nome: skin.nome,
    nome_completo: skin.nomeCompleto,
    imagem: skin.imagem,
    raridade: skin.raridade,
    min_float: skin.minFloat,
    max_float: skin.maxFloat,
    stattrak: skin.stattrak,
    souvenir: skin.souvenir,
    sem_pintura: skin.semPintura,
    fase: skin.fase,
  };
}

/**
 * Mantém o catálogo de skins em memória, indexado por id.
 * `baixarSkins` vem de fora (infraestructure/external) para o service não conhecer HTTP.
 */
export function criarCatalogoService({ baixarSkins }) {
  let porId = new Map();

  function garantirCarregado() {
    if (porId.size === 0) {
      throw new AppError('Catálogo de skins indisponível no momento', 503);
    }
  }

  function buscarPorId(skinId) {
    garantirCarregado();
    return porId.get(skinId);
  }

  return {
    /**
     * Baixa o catálogo e troca o índice em memória só se o download der certo,
     * então uma falha não apaga o catálogo que já estava carregado.
     */
    async carregar() {
      const itens = await baixarSkins();
      const novo = new Map();
      for (const item of itens) {
        if (item?.id && item?.name) {
          novo.set(item.id, normalizarSkin(item));
        }
      }
      if (novo.size === 0) {
        throw new Error('Catálogo baixado sem nenhuma skin válida');
      }
      porId = novo;
      return novo.size;
    },

    /** Uso interno (inventário): devolve a skin normalizada ou undefined. */
    buscarPorId,

    /** GET /api/catalogo?busca= : todas as palavras digitadas precisam aparecer no nome. */
    buscar(termo, limite) {
      garantirCarregado();
      const normalizado = normalizarTexto(termo).trim();
      const palavras = normalizado.split(/\s+/).filter(Boolean);
      if (normalizado.length < MINIMO_CARACTERES_BUSCA) {
        return [];
      }
      const maximo = Math.min(Math.max(Math.trunc(Number(limite)) || LIMITE_PADRAO, 1), LIMITE_MAXIMO);

      return [...porId.values()]
        .filter((skin) => palavras.every((palavra) => skin.textoBusca.includes(palavra)))
        .sort((a, b) => {
          const posA = a.textoBusca.startsWith(normalizado) ? 0 : 1;
          const posB = b.textoBusca.startsWith(normalizado) ? 0 : 1;
          return posA - posB || a.textoBusca.length - b.textoBusca.length;
        })
        .slice(0, maximo)
        .map(paraResposta);
    },

    /** GET /api/catalogo/:skinId */
    obter(skinId) {
      const skin = buscarPorId(skinId);
      if (!skin) {
        throw new NotFoundError('Skin não encontrada no catálogo');
      }
      return paraResposta(skin);
    },
  };
}
