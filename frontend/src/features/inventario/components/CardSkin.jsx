import { Link } from 'react-router-dom';
import { formatarData, formatarMoeda } from '../../../shared/lib/formatacao.js';
import { NOMES_FONTES } from '../../preco/lib/fontes.js';
import { siglaDesgaste } from '../lib/desgaste.js';
import BarraFloat from './BarraFloat.jsx';
import ValorLucro from './ValorLucro.jsx';

export default function CardSkin({ item }) {
  const sigla = siglaDesgaste(item.desgaste);

  return (
    <Link
      to={`/inventario/${item.id}`}
      className="card-skin"
      style={{ '--cor-raridade': item.raridade?.cor ?? 'var(--cor-borda-forte)' }}
    >
      <div className="card-skin__topo">
        <div className="card-skin__etiquetas">
          {item.stattrak && <span className="etiqueta etiqueta--stattrak">StatTrak™</span>}
          {item.fase && <span className="etiqueta etiqueta--neutra">{item.fase}</span>}
        </div>
        {sigla && (
          <span className="etiqueta etiqueta--neutra" title={item.desgaste}>
            {sigla}
          </span>
        )}
      </div>

      <img src={item.imagem} alt="" loading="lazy" className="card-skin__imagem" />

      <div className="card-skin__nome">
        <span className="card-skin__arma">{item.arma}</span>
        <strong>{item.nome}</strong>
        <span className="card-skin__raridade">
          <span className="ponto-raridade" />
          {item.raridade?.nome ?? 'Sem raridade'}
          {item.desgaste && ` · ${item.desgaste}`}
        </span>
      </div>

      <div className="card-skin__float">
        <span className="numero">{item.float}</span>
        {item.desgaste && <BarraFloat float={item.float} compacta />}
      </div>

      <dl className="card-skin__valores">
        <div>
          <dt>Pago</dt>
          <dd className="numero">{formatarMoeda(item.preco_pago)}</dd>
        </div>
        <div>
          <dt>Valor atual</dt>
          <dd className="numero">
            {item.valor_atual === null ? 'sem preço' : formatarMoeda(item.valor_atual)}
            {item.fonte_valor_atual && <span className="card-skin__fonte">{NOMES_FONTES[item.fonte_valor_atual]}</span>}
          </dd>
        </div>
      </dl>

      <div className="card-skin__rodape">
        <ValorLucro lucro={item.lucro} variacao={item.variacao_percentual} />
        {item.data_compra && <span className="card-skin__data">{formatarData(item.data_compra)}</span>}
      </div>
    </Link>
  );
}
