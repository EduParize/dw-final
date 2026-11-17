import { NotFoundError, UnauthorizedError, ValidationError } from '../../common/errors/index.js';
import { CAMPOS_EDITAVEIS, FAIXAS_DESGASTE, ORDENACOES_VALIDAS } from '../entity/inventario.constants.js';
import { FONTE_PRECO_PADRAO, FONTES_PRECO } from '../../preco/entity/preco.constants.js';

const VIOLACAO_CHAVE_ESTRANGEIRA = '23503'; // código do PostgreSQL
const PRECO_MAXIMO = 9_999_999_999.99; // limite do NUMERIC(12,2)
const ID_MAXIMO = 2_147_483_647; // limite do INTEGER
const DATA_MINIMA = '2012-08-21'; // lançamento do CS:GO
const REGEX_DATA = /^\d{4}-\d{2}-\d{2}$/;
// Data de "hoje" no fuso do Brasil, mesmo com o servidor (ou o container) em UTC.
// O locale en-CA formata como AAAA-MM-DD.
const FORMATO_DATA_BRASIL = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' });

function hojeNoBrasil() {
  return FORMATO_DATA_BRASIL.format(new Date());
}

/** Desgaste a partir do float (0.07 já é Minimal Wear, 0.15 já é Field-Tested etc.). */
export function calcularDesgaste(float) {
  const faixa = FAIXAS_DESGASTE.find((f) => float < f.max);
  return (faixa ?? FAIXAS_DESGASTE.at(-1)).nome;
}

/**
 * Nome usado pelos sites de preço: `[StatTrak™ ]<Arma> | <Nome> (<Desgaste>)`.
 * Partindo do nome completo do catálogo, facas ("★ Karambit | Doppler") ficam
 * "★ StatTrak™ Karambit | Doppler (Factory New)", como o mercado escreve.
 * Facas sem pintura não têm desgaste no nome: "★ Karambit" (desgaste = null).
 */
export function montarMarketHashName(skin, stattrak, desgaste) {
  let nome = skin.nomeCompleto;
  if (stattrak) {
    nome = nome.startsWith('★ ') ? `★ StatTrak™ ${nome.slice(2)}` : `StatTrak™ ${nome}`;
  }
  return desgaste ? `${nome} (${desgaste})` : nome;
}

// 0.1 → "0.10", 0.7 → "0.70", 0.065 → "0.065" (só para as mensagens de erro)
function formatarFloat(valor) {
  const centesimos = valor * 100;
  return Math.abs(centesimos - Math.round(centesimos)) < 1e-9 ? valor.toFixed(2) : String(valor);
}

function validarDataCompra(valor) {
  if (valor === null) return null;
  if (typeof valor !== 'string' || !REGEX_DATA.test(valor)) {
    throw new ValidationError('Data da compra inválida (use o formato AAAA-MM-DD)');
  }
  const data = new Date(`${valor}T00:00:00Z`);
  if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== valor) {
    throw new ValidationError('Data da compra inválida');
  }
  if (valor < DATA_MINIMA) {
    throw new ValidationError('Data da compra anterior ao lançamento do CS:GO (21/08/2012)');
  }
  if (valor > hojeNoBrasil()) {
    throw new ValidationError('Data da compra não pode ser futura');
  }
  return valor;
}

/** Regras do cadastro e da edição. Recebe os campos já completos e devolve os valores validados. */
function validarDados(skin, dados) {
  const { float, stattrak, preco_pago: precoPago, data_compra: dataCompra } = dados;

  if (typeof float !== 'number' || !Number.isFinite(float)) {
    throw new ValidationError('Float é obrigatório e deve ser um número');
  }
  if (float < skin.minFloat || float > skin.maxFloat) {
    throw new ValidationError(
      `Float ${float} fora do intervalo desta skin (${formatarFloat(skin.minFloat)} a ${formatarFloat(skin.maxFloat)})`,
    );
  }

  if (typeof stattrak !== 'boolean') {
    throw new ValidationError('StatTrak deve ser true ou false');
  }
  if (stattrak && !skin.stattrak) {
    throw new ValidationError('Esta skin não existe na versão StatTrak™');
  }

  if (typeof precoPago !== 'number' || !Number.isFinite(precoPago)) {
    throw new ValidationError('Preço pago é obrigatório e deve ser um número');
  }
  if (precoPago < 0) {
    throw new ValidationError('Preço pago deve ser maior ou igual a zero');
  }
  if (precoPago > PRECO_MAXIMO) {
    throw new ValidationError('Preço pago acima do valor máximo permitido (R$ 9.999.999.999,99)');
  }

  return { float, stattrak, precoPago, dataCompra: validarDataCompra(dataCompra) };
}

function naoEncontrado() {
  return new NotFoundError('Skin não encontrada no inventário');
}

/** Um id que não é inteiro positivo nunca existe: 404, em vez de deixar o PostgreSQL reclamar. */
function interpretarId(valor) {
  const id = /^\d+$/.test(String(valor)) ? Number(valor) : NaN;
  if (!Number.isSafeInteger(id) || id < 1 || id > ID_MAXIMO) {
    throw naoEncontrado();
  }
  return id;
}

function arredondar(valor) {
  return Math.round(valor * 100) / 100;
}

/**
 * A partir dos preços em R$ de cada fonte ({ steam: 246.11, skinport: null, ... }) calcula:
 * - valor atual: o da fonte padrão (Steam) ou, sem ela, o da próxima fonte com preço;
 * - menor preço entre as fontes;
 * - lucro = valor atual − preço pago, e variação % = lucro ÷ preço pago × 100
 *   (null quando o preço pago é zero, porque não há base para a porcentagem).
 * Sem preço em nenhuma fonte, tudo vem null ("sem preço").
 */
export function calcularValores(precos, precoPago) {
  const disponiveis = FONTES_PRECO.filter((fonte) => precos[fonte] != null).map((fonte) => ({
    fonte,
    valor: precos[fonte],
  }));

  if (disponiveis.length === 0) {
    return { valor_atual: null, fonte_valor_atual: null, menor_preco: null, lucro: null, variacao_percentual: null };
  }

  const atual = disponiveis.find((d) => d.fonte === FONTE_PRECO_PADRAO) ?? disponiveis[0];
  const menor = disponiveis.reduce((min, d) => (d.valor < min.valor ? d : min));
  const lucro = arredondar(atual.valor - precoPago);

  return {
    valor_atual: atual.valor,
    fonte_valor_atual: atual.fonte,
    menor_preco: { fonte: menor.fonte, valor: menor.valor },
    lucro,
    variacao_percentual: precoPago > 0 ? arredondar((lucro / precoPago) * 100) : null,
  };
}

/** Valor de um filtro da query string: ausente ou vazio → undefined; repetido (?a=1&a=2) → 400. */
function textoDoFiltro(nome, valor) {
  if (valor === undefined) return undefined;
  if (typeof valor !== 'string') {
    throw new ValidationError(`Filtro ${nome} inválido`);
  }
  const limpo = valor.trim();
  return limpo === '' ? undefined : limpo;
}

/**
 * Valida os filtros da listagem (GET /api/inventario?arma=&desgaste=&stattrak=&ordenar=).
 * Os valores vêm como texto da query string; devolve os valores já interpretados.
 */
export function interpretarFiltros(query = {}) {
  const arma = textoDoFiltro('arma', query.arma);
  const desgasteTexto = textoDoFiltro('desgaste', query.desgaste);
  const stattrakTexto = textoDoFiltro('stattrak', query.stattrak);
  const ordenar = textoDoFiltro('ordenar', query.ordenar);

  let desgaste;
  if (desgasteTexto !== undefined) {
    desgaste = FAIXAS_DESGASTE.find((f) => f.nome.toLowerCase() === desgasteTexto.toLowerCase())?.nome;
    if (!desgaste) {
      throw new ValidationError(`Desgaste inválido. Use: ${FAIXAS_DESGASTE.map((f) => f.nome).join(', ')}`);
    }
  }

  let stattrak;
  if (stattrakTexto !== undefined) {
    if (!['true', 'false'].includes(stattrakTexto)) {
      throw new ValidationError('Filtro stattrak deve ser true ou false');
    }
    stattrak = stattrakTexto === 'true';
  }

  if (ordenar !== undefined && !ORDENACOES_VALIDAS.includes(ordenar)) {
    throw new ValidationError(`Ordenação inválida. Use: ${ORDENACOES_VALIDAS.join(', ')}`);
  }

  return { arma: arma?.toLowerCase(), desgaste, stattrak, ordenar };
}

/** Compara do maior para o menor, com null sempre no fim. */
function decrescenteComNullNoFim(a, b) {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  return a < b ? 1 : -1;
}

const CAMPO_DA_ORDENACAO = Object.freeze({
  lucro: 'lucro',
  valor: 'valor_atual',
  data: 'data_compra', // "AAAA-MM-DD": a ordem do texto é a ordem da data
});

/**
 * Aplica os filtros e a ordenação nos itens já montados.
 * Sem `ordenar`, mantém a ordem do banco (cadastros mais recentes primeiro); empates também
 * mantêm essa ordem, porque o sort do JavaScript é estável.
 */
export function filtrarEOrdenar(itens, { arma, desgaste, stattrak, ordenar }) {
  const filtrados = itens.filter(
    (item) =>
      (arma === undefined || item.arma?.toLowerCase() === arma) &&
      (desgaste === undefined || item.desgaste === desgaste) &&
      (stattrak === undefined || item.stattrak === stattrak),
  );
  if (!ordenar) return filtrados;
  const campo = CAMPO_DA_ORDENACAO[ordenar];
  return filtrados.sort((a, b) => decrescenteComNullNoFim(a[campo], b[campo]));
}

/** Versão curta do item, usada no resumo para a mais valorizada e a mais desvalorizada. */
function destaque(item) {
  if (!item) return null;
  const { id, skin_id, arma, nome, fase, imagem, market_hash_name, preco_pago, valor_atual, lucro, variacao_percentual } =
    item;
  return { id, skin_id, arma, nome, fase, imagem, market_hash_name, preco_pago, valor_atual, lucro, variacao_percentual };
}

/**
 * Totais do inventário (GET /api/inventario/resumo).
 * - total_pago soma todos os itens;
 * - valor_atual_total, lucro_total e variacao_percentual só consideram os itens com preço
 *   (a variação é sobre o que foi pago por esses itens);
 * - mais_valorizada / mais_desvalorizada: maior e menor variação % (itens com preço pago zero
 *   não têm variação e ficam de fora).
 */
export function calcularResumo(itens) {
  const comPreco = itens.filter((item) => item.valor_atual !== null);
  const soma = (lista, campo) => arredondar(lista.reduce((total, item) => total + item[campo], 0));

  const pagoComPreco = soma(comPreco, 'preco_pago');
  const lucroTotal = soma(comPreco, 'lucro');

  const comVariacao = comPreco.filter((item) => item.variacao_percentual !== null);
  const porVariacao = [...comVariacao].sort(
    (a, b) => b.variacao_percentual - a.variacao_percentual || b.lucro - a.lucro,
  );

  return {
    quantidade_itens: itens.length,
    quantidade_sem_preco: itens.length - comPreco.length,
    total_pago: soma(itens, 'preco_pago'),
    valor_atual_total: soma(comPreco, 'valor_atual'),
    lucro_total: lucroTotal,
    variacao_percentual: pagoComPreco > 0 ? arredondar((lucroTotal / pagoComPreco) * 100) : null,
    mais_valorizada: destaque(porVariacao.at(0)),
    mais_desvalorizada: destaque(porVariacao.at(-1)),
  };
}

export function criarInventarioService({ inventarioRepository, catalogoService, precoService }) {
  /**
   * Junta a linha do banco com os dados do catálogo e os preços do cache.
   * Se a skin sumiu do catálogo, os dados dela (e os preços) vêm null em vez de derrubar a listagem.
   */
  function montarItem(linha, skin) {
    const desgaste = skin?.semPintura ? null : calcularDesgaste(linha.float);
    const marketHashName = skin ? montarMarketHashName(skin, linha.stattrak, desgaste) : null;
    const precos = precoService.precosEmReais(marketHashName, skin?.fase);

    return {
      id: linha.id,
      skin_id: linha.skin_id,
      arma: skin?.arma ?? null,
      nome: skin?.nome ?? null,
      fase: skin?.fase ?? null,
      imagem: skin?.imagem ?? null,
      raridade: skin?.raridade ?? null,
      float: linha.float,
      desgaste,
      stattrak: linha.stattrak,
      market_hash_name: marketHashName,
      preco_pago: linha.preco_pago,
      data_compra: linha.data_compra,
      precos,
      ...calcularValores(precos, linha.preco_pago),
      criado_em: linha.criado_em,
    };
  }

  async function montarTodos(usuarioId) {
    const linhas = await inventarioRepository.listarPorUsuario(usuarioId);
    return linhas.map((linha) => montarItem(linha, catalogoService.buscarPorId(linha.skin_id)));
  }

  return {
    /**
     * Lista as skins do usuário. `query` são os filtros da URL (arma, desgaste, stattrak, ordenar).
     * Os filtros são aplicados depois de montar os itens, porque arma, desgaste e preços
     * vêm do catálogo e do cache, não do banco.
     */
    async listar(usuarioId, query = {}) {
      const filtros = interpretarFiltros(query);
      return filtrarEOrdenar(await montarTodos(usuarioId), filtros);
    },

    async resumo(usuarioId) {
      return calcularResumo(await montarTodos(usuarioId));
    },

    async obter(usuarioId, idParam) {
      const linha = await inventarioRepository.buscarPorId(usuarioId, interpretarId(idParam));
      if (!linha) throw naoEncontrado();
      return montarItem(linha, catalogoService.buscarPorId(linha.skin_id));
    },

    async cadastrar(usuarioId, dados) {
      const { skin_id: skinId } = dados;
      if (typeof skinId !== 'string' || skinId.trim() === '') {
        throw new ValidationError('skin_id é obrigatório');
      }
      const skin = catalogoService.buscarPorId(skinId);
      if (!skin) {
        throw new NotFoundError('Skin não encontrada no catálogo');
      }

      const validados = validarDados(skin, {
        float: dados.float,
        stattrak: dados.stattrak ?? false,
        preco_pago: dados.preco_pago,
        data_compra: dados.data_compra ?? null,
      });

      try {
        const linha = await inventarioRepository.criar(usuarioId, { skinId, ...validados });
        return montarItem(linha, skin);
      } catch (err) {
        // O usuário do token foi excluído depois de logar.
        if (err.code === VIOLACAO_CHAVE_ESTRANGEIRA) {
          throw new UnauthorizedError('Usuário não encontrado');
        }
        throw err;
      }
    },

    /** Edição parcial: só altera o que veio e repete as validações do cadastro com os valores finais. */
    async atualizar(usuarioId, idParam, dados) {
      const id = interpretarId(idParam);
      const atual = await inventarioRepository.buscarPorId(usuarioId, id);
      if (!atual) throw naoEncontrado();

      if (!CAMPOS_EDITAVEIS.some((campo) => Object.hasOwn(dados, campo))) {
        throw new ValidationError(
          'Informe ao menos um campo para atualizar: float, stattrak, preco_pago ou data_compra',
        );
      }

      const skin = catalogoService.buscarPorId(atual.skin_id);
      if (!skin) {
        throw new NotFoundError('Skin não encontrada no catálogo');
      }

      const validados = validarDados(skin, {
        float: atual.float,
        stattrak: atual.stattrak,
        preco_pago: atual.preco_pago,
        data_compra: atual.data_compra,
        ...dados,
      });

      const linha = await inventarioRepository.atualizar(usuarioId, id, validados);
      if (!linha) throw naoEncontrado();
      return montarItem(linha, skin);
    },

    async excluir(usuarioId, idParam) {
      const existia = await inventarioRepository.excluir(usuarioId, interpretarId(idParam));
      if (!existia) throw naoEncontrado();
    },
  };
}
