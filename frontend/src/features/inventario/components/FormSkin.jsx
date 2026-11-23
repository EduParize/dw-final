import { useState } from 'react';
import Botao from '../../../shared/components/Botao.jsx';
import Campo from '../../../shared/components/Campo.jsx';
import MensagemErro from '../../../shared/components/MensagemErro.jsx';
import { hojeEmSaoPaulo } from '../../../shared/lib/formatacao.js';
import { calcularDesgaste, lerNumero } from '../lib/desgaste.js';
import BarraFloat from './BarraFloat.jsx';

const DATA_MINIMA = '2012-08-21'; // lançamento do CS:GO
const PRECO_MAXIMO = 9_999_999_999.99;

function valoresDoItem(item) {
  return {
    float: item?.float !== undefined ? String(item.float) : '',
    stattrak: item?.stattrak ?? false,
    precoPago: item?.preco_pago !== undefined ? String(item.preco_pago) : '',
    dataCompra: item?.data_compra ?? '',
  };
}

/**
 * Formulário de float, StatTrak, preço pago e data da compra para uma skin do catálogo.
 * Usado no cadastro e na edição. Valida o básico para dar retorno rápido; a validação que
 * vale é a da API, e os erros dela (400/404) aparecem no topo do formulário.
 */
export default function FormSkin({ skin, itemInicial, textoBotao, onEnviar, onCancelar }) {
  const [valores, setValores] = useState(() => valoresDoItem(itemInicial));
  const [erros, setErros] = useState({});
  const [erroApi, setErroApi] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const semPintura = skin.sem_pintura;
  const minFloat = semPintura ? 0 : skin.min_float;
  const maxFloat = semPintura ? 1 : skin.max_float;
  const hoje = hojeEmSaoPaulo();

  const float = lerNumero(valores.float);
  const floatNoIntervalo = typeof float === 'number' && float >= minFloat && float <= maxFloat;
  const previaDesgaste = !semPintura && floatNoIntervalo ? calcularDesgaste(float) : null;

  const alterar = (campo) => (evento) => {
    const valor = evento.target.type === 'checkbox' ? evento.target.checked : evento.target.value;
    setValores((atual) => ({ ...atual, [campo]: valor }));
  };

  function validar() {
    const novos = {};
    if (float === null) {
      novos.float = 'Informe o float';
    } else if (Number.isNaN(float)) {
      novos.float = 'Use um número, ex.: 0.162';
    } else if (!floatNoIntervalo) {
      novos.float = `O float desta skin vai de ${minFloat} a ${maxFloat}`;
    }

    const preco = lerNumero(valores.precoPago);
    if (preco === null) {
      novos.precoPago = 'Informe quanto você pagou (0 se ganhou em drop)';
    } else if (Number.isNaN(preco) || preco < 0) {
      novos.precoPago = 'O preço precisa ser um número maior ou igual a zero';
    } else if (preco > PRECO_MAXIMO) {
      novos.precoPago = 'Preço acima do máximo permitido';
    }

    if (valores.dataCompra) {
      if (valores.dataCompra > hoje) novos.dataCompra = 'A data da compra não pode ser no futuro';
      else if (valores.dataCompra < DATA_MINIMA) novos.dataCompra = 'A data não pode ser anterior a 21/08/2012';
    }
    return novos;
  }

  async function enviar(evento) {
    evento.preventDefault();
    const novosErros = validar();
    setErros(novosErros);
    setErroApi(null);
    if (Object.keys(novosErros).length > 0) {
      return;
    }

    setEnviando(true);
    try {
      await onEnviar({
        float,
        stattrak: skin.stattrak ? valores.stattrak : false,
        preco_pago: Math.round(lerNumero(valores.precoPago) * 100) / 100,
        data_compra: valores.dataCompra || null,
      });
    } catch (erro) {
      setErroApi(erro);
      setEnviando(false);
    }
  }

  return (
    <form className="formulario" onSubmit={enviar} noValidate>
      <MensagemErro erro={erroApi} titulo="Não foi possível salvar" />

      <div className="formulario__grade">
        <div className="formulario__coluna">
          <Campo
            rotulo="Float"
            inputMode="decimal"
            placeholder={semPintura ? 'Ex.: 0.25' : `Entre ${minFloat} e ${maxFloat}`}
            value={valores.float}
            onChange={alterar('float')}
            erro={erros.float}
            dica={semPintura ? 'Faca sem pintura: qualquer float de 0 a 1, sem desgaste.' : `Intervalo desta skin: ${minFloat} a ${maxFloat}`}
            autoFocus
          />
          {!semPintura && (
            <div className="previa-desgaste" aria-live="polite">
              <BarraFloat float={floatNoIntervalo ? float : null} minFloat={minFloat} maxFloat={maxFloat} />
              <span className="previa-desgaste__texto">
                Desgaste: <strong>{previaDesgaste ? previaDesgaste.nome : '—'}</strong>
              </span>
            </div>
          )}
        </div>

        <div className="formulario__coluna">
          <Campo
            rotulo="Preço pago (R$)"
            inputMode="decimal"
            placeholder="Ex.: 85,00"
            value={valores.precoPago}
            onChange={alterar('precoPago')}
            erro={erros.precoPago}
          />
          <Campo
            rotulo="Data da compra (opcional)"
            type="date"
            min={DATA_MINIMA}
            max={hoje}
            value={valores.dataCompra}
            onChange={alterar('dataCompra')}
            erro={erros.dataCompra}
          />
          <label className={`caixa-marcar ${skin.stattrak ? '' : 'caixa-marcar--desabilitada'}`}>
            <input
              type="checkbox"
              checked={skin.stattrak ? valores.stattrak : false}
              disabled={!skin.stattrak}
              onChange={alterar('stattrak')}
            />
            <span>
              StatTrak™
              {!skin.stattrak && <span className="campo__dica"> · esta skin não existe em StatTrak™</span>}
            </span>
          </label>
        </div>
      </div>

      <div className="formulario__acoes">
        {onCancelar && (
          <Botao variante="secundario" onClick={onCancelar} disabled={enviando}>
            Cancelar
          </Botao>
        )}
        <Botao type="submit" carregando={enviando}>
          {textoBotao}
        </Botao>
      </div>
    </form>
  );
}
