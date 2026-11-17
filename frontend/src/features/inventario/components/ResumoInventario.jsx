import { Link } from 'react-router-dom';
import { formatarMoeda, formatarPercentual } from '../../../shared/lib/formatacao.js';
import ValorLucro from './ValorLucro.jsx';

function Tile({ rotulo, children, nota }) {
  return (
    <div className="tile">
      <span className="tile__rotulo">{rotulo}</span>
      <span className="tile__valor numero">{children}</span>
      {nota && <span className="tile__nota">{nota}</span>}
    </div>
  );
}

function Destaque({ titulo, item }) {
  return (
    <Link to={`/inventario/${item.id}`} className="destaque">
      <img src={item.imagem} alt="" loading="lazy" className="destaque__imagem" />
      <span className="destaque__textos">
        <span className="destaque__titulo">{titulo}</span>
        <span className="destaque__nome">
          {item.arma} | {item.nome}
          {item.fase && ` (${item.fase})`}
        </span>
        <ValorLucro lucro={item.lucro} variacao={item.variacao_percentual} />
      </span>
    </Link>
  );
}

/** Os 4 números do topo + skin mais valorizada e mais desvalorizada. */
export default function ResumoInventario({ resumo }) {
  const semPreco = resumo.quantidade_sem_preco;
  const notaSemPreco =
    semPreco > 0 ? `${semPreco} ${semPreco === 1 ? 'skin sem preço fica' : 'skins sem preço ficam'} de fora` : null;

  return (
    <section className="resumo" aria-label="Resumo do inventário">
      <div className="resumo__tiles">
        <Tile
          rotulo="Total pago"
          nota={`${resumo.quantidade_itens} ${resumo.quantidade_itens === 1 ? 'skin' : 'skins'}`}
        >
          {formatarMoeda(resumo.total_pago)}
        </Tile>
        <Tile rotulo="Valor atual" nota={notaSemPreco}>
          {formatarMoeda(resumo.valor_atual_total)}
        </Tile>
        <Tile rotulo="Lucro total">
          <ValorLucro lucro={resumo.quantidade_itens === 0 ? 0 : resumo.lucro_total} grande />
        </Tile>
        <Tile rotulo="Variação">
          {resumo.variacao_percentual === null ? '—' : formatarPercentual(resumo.variacao_percentual)}
        </Tile>
      </div>

      {(resumo.mais_valorizada || resumo.mais_desvalorizada) && (
        <div className="resumo__destaques">
          {resumo.mais_valorizada && <Destaque titulo="Mais valorizada" item={resumo.mais_valorizada} />}
          {resumo.mais_desvalorizada && <Destaque titulo="Mais desvalorizada" item={resumo.mais_desvalorizada} />}
        </div>
      )}
    </section>
  );
}
