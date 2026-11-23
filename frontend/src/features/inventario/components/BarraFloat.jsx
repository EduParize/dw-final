import { FAIXAS_DESGASTE, calcularDesgaste } from '../lib/desgaste.js';

const porcento = (valor) => `${Math.min(Math.max(valor, 0), 1) * 100}%`;

/**
 * Régua de 0 a 1 com as 5 faixas de desgaste e um marcador no float.
 * Com `minFloat`/`maxFloat`, o trecho em que a skin não existe aparece hachurado.
 * `compacta` esconde as siglas das faixas (uso no card).
 */
export default function BarraFloat({ float, minFloat, maxFloat, compacta = false }) {
  const valido = typeof float === 'number' && !Number.isNaN(float) && float >= 0 && float <= 1;
  const faixaAtual = valido ? calcularDesgaste(float) : null;
  const temIntervalo = typeof minFloat === 'number' && typeof maxFloat === 'number';

  const descricao = valido
    ? `Float ${float}, ${faixaAtual.nome}${temIntervalo ? `; esta skin vai de ${minFloat} a ${maxFloat}` : ''}`
    : 'Float ainda não informado';

  return (
    <div className={`barra-float ${compacta ? 'barra-float--compacta' : ''}`} role="img" aria-label={descricao}>
      <div className="barra-float__trilho">
        {FAIXAS_DESGASTE.map((faixa) => (
          <span
            key={faixa.sigla}
            className={`barra-float__faixa ${faixaAtual?.sigla === faixa.sigla ? 'barra-float__faixa--atual' : ''}`}
            style={{ width: porcento(faixa.max - faixa.min) }}
          />
        ))}

        {temIntervalo && minFloat > 0 && (
          <span className="barra-float__fora" style={{ left: 0, width: porcento(minFloat) }} />
        )}
        {temIntervalo && maxFloat < 1 && (
          <span className="barra-float__fora" style={{ left: porcento(maxFloat), right: 0 }} />
        )}

        {valido && <span className="barra-float__marcador" style={{ left: porcento(float) }} />}
      </div>

      {!compacta && (
        <div className="barra-float__siglas" aria-hidden="true">
          {FAIXAS_DESGASTE.map((faixa) => (
            <span
              key={faixa.sigla}
              style={{ width: porcento(faixa.max - faixa.min) }}
              className={faixaAtual?.sigla === faixa.sigla ? 'barra-float__sigla--atual' : ''}
            >
              {faixa.sigla}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
