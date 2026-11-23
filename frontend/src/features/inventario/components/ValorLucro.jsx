import { formatarMoedaComSinal, formatarPercentual } from '../../../shared/lib/formatacao.js';

/**
 * Lucro com cor E seta/sinal (a informação nunca depende só da cor).
 * `lucro` null = skin sem preço.
 */
export default function ValorLucro({ lucro, variacao, grande = false }) {
  if (lucro === null || lucro === undefined) {
    return <span className="lucro lucro--neutro">sem preço</span>;
  }

  const tipo = lucro > 0 ? 'positivo' : lucro < 0 ? 'negativo' : 'neutro';
  const seta = lucro > 0 ? '▲' : lucro < 0 ? '▼' : '■';

  return (
    <span className={`lucro lucro--${tipo} ${grande ? 'lucro--grande' : ''}`}>
      <span className="lucro__valor">
        <span aria-hidden="true" className="lucro__seta">
          {seta}
        </span>{' '}
        {formatarMoedaComSinal(lucro)}
      </span>
      {variacao !== null && variacao !== undefined && (
        <span className="lucro__variacao">({formatarPercentual(variacao)})</span>
      )}
    </span>
  );
}
