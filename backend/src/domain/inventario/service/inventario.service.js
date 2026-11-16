import { NotFoundError, UnauthorizedError, ValidationError } from '../../common/errors/index.js';
import { CAMPOS_EDITAVEIS, FAIXAS_DESGASTE } from '../entity/inventario.constants.js';

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

/**
 * Junta a linha do banco com os dados do catálogo.
 * Os campos de preço ficam null até a Etapa 4 (preços) preencher.
 * Se a skin sumiu do catálogo, os dados dela vêm null em vez de derrubar a listagem.
 */
function montarItem(linha, skin) {
  const desgaste = skin?.semPintura ? null : calcularDesgaste(linha.float);
  return {
    id: linha.id,
    skin_id: linha.skin_id,
    arma: skin?.arma ?? null,
    nome: skin?.nome ?? null,
    imagem: skin?.imagem ?? null,
    raridade: skin?.raridade ?? null,
    float: linha.float,
    desgaste,
    stattrak: linha.stattrak,
    market_hash_name: skin ? montarMarketHashName(skin, linha.stattrak, desgaste) : null,
    preco_pago: linha.preco_pago,
    data_compra: linha.data_compra,
    precos: null,
    valor_atual: null,
    fonte_valor_atual: null,
    menor_preco: null,
    lucro: null,
    variacao_percentual: null,
    criado_em: linha.criado_em,
  };
}

export function criarInventarioService({ inventarioRepository, catalogoService }) {
  return {
    async listar(usuarioId) {
      const linhas = await inventarioRepository.listarPorUsuario(usuarioId);
      return linhas.map((linha) => montarItem(linha, catalogoService.buscarPorId(linha.skin_id)));
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
