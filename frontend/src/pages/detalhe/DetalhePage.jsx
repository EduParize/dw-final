import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSkinCatalogo } from '../../features/catalogo/hooks/useSkinCatalogo.js';
import { inventarioApi } from '../../features/inventario/api/inventario.api.js';
import BarraFloat from '../../features/inventario/components/BarraFloat.jsx';
import CabecalhoSkin from '../../features/inventario/components/CabecalhoSkin.jsx';
import ValorLucro from '../../features/inventario/components/ValorLucro.jsx';
import { useItem } from '../../features/inventario/hooks/useItem.js';
import ComparacaoPrecos from '../../features/preco/components/ComparacaoPrecos.jsx';
import { NOMES_FONTES } from '../../features/preco/lib/fontes.js';
import Botao from '../../shared/components/Botao.jsx';
import Carregando from '../../shared/components/Carregando.jsx';
import MensagemErro from '../../shared/components/MensagemErro.jsx';
import Modal from '../../shared/components/Modal.jsx';
import NaoEncontrado from '../../shared/components/NaoEncontrado.jsx';
import { formatarData, formatarDataHora, formatarMoeda } from '../../shared/lib/formatacao.js';

export default function DetalhePage() {
  const { id } = useParams();
  const navegar = useNavigate();
  const { dados: item, carregando, erro, recarregar } = useItem(id);
  // Intervalo de float da skin para a régua (se o catálogo falhar, a régua só fica sem ele).
  const { dados: skin } = useSkinCatalogo(item?.skin_id);

  const [confirmando, setConfirmando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState(null);

  if (erro?.status === 404) {
    return <NaoEncontrado titulo="Skin não encontrada" texto="Ela pode ter sido excluída." />;
  }
  if (erro) {
    return (
      <div className="pagina pagina--estreita">
        <MensagemErro erro={erro} onTentarNovamente={recarregar} />
      </div>
    );
  }
  if (carregando && !item) {
    return <Carregando />;
  }

  async function excluir() {
    setExcluindo(true);
    setErroExclusao(null);
    try {
      await inventarioApi.excluir(id);
      navegar('/inventario', { replace: true });
    } catch (err) {
      setErroExclusao(err);
      setExcluindo(false);
    }
  }

  const fonteAtual = item.fonte_valor_atual ? NOMES_FONTES[item.fonte_valor_atual] : null;

  return (
    <div className="pagina pagina--estreita">
      <nav className="migalhas" aria-label="Caminho">
        <Link to="/inventario">Inventário</Link> <span aria-hidden="true">/</span> {item.nome}
      </nav>

      <section className="painel">
        <CabecalhoSkin skin={item}>
          <div className="cabecalho-skin__etiquetas">
            {item.stattrak && <span className="etiqueta etiqueta--stattrak">StatTrak™</span>}
            {item.desgaste && <span className="etiqueta etiqueta--neutra">{item.desgaste}</span>}
          </div>
          <span className="texto-secundario texto-pequeno">{item.market_hash_name}</span>
        </CabecalhoSkin>

        <div className="detalhe__acoes">
          <Botao variante="secundario" para={`/inventario/${id}/editar`}>
            Editar
          </Botao>
          <Botao variante="perigo" onClick={() => setConfirmando(true)}>
            Excluir
          </Botao>
        </div>
      </section>

      <section className="painel detalhe__numeros" aria-label="Valores">
        <div className="tile">
          <span className="tile__rotulo">Preço pago</span>
          <span className="tile__valor numero">{formatarMoeda(item.preco_pago)}</span>
        </div>
        <div className="tile">
          <span className="tile__rotulo">Valor atual{fonteAtual && ` · ${fonteAtual}`}</span>
          <span className="tile__valor numero">{item.valor_atual === null ? 'sem preço' : formatarMoeda(item.valor_atual)}</span>
          {item.menor_preco && item.menor_preco.fonte !== item.fonte_valor_atual && (
            <span className="tile__nota">
              Menor: {formatarMoeda(item.menor_preco.valor)} na {NOMES_FONTES[item.menor_preco.fonte]}
            </span>
          )}
        </div>
        <div className="tile">
          <span className="tile__rotulo">Lucro</span>
          <span className="tile__valor">
            <ValorLucro lucro={item.lucro} variacao={item.variacao_percentual} grande />
          </span>
        </div>
      </section>

      <section className="painel">
        <h2 className="secao__titulo">Detalhes</h2>
        <dl className="lista-dados">
          <div>
            <dt>Float</dt>
            <dd className="numero">{item.float}</dd>
          </div>
          <div>
            <dt>Desgaste</dt>
            <dd>{item.desgaste ?? 'Sem desgaste (faca sem pintura)'}</dd>
          </div>
          <div>
            <dt>Data da compra</dt>
            <dd>{formatarData(item.data_compra)}</dd>
          </div>
          <div>
            <dt>Cadastrada em</dt>
            <dd>{formatarDataHora(item.criado_em)}</dd>
          </div>
        </dl>
        {item.desgaste && (
          <BarraFloat
            float={item.float}
            minFloat={skin && !skin.sem_pintura ? skin.min_float : undefined}
            maxFloat={skin && !skin.sem_pintura ? skin.max_float : undefined}
          />
        )}
      </section>

      <div className="painel">
        <ComparacaoPrecos item={item} />
      </div>

      <Modal
        aberto={confirmando}
        titulo="Excluir esta skin?"
        onFechar={() => !excluindo && setConfirmando(false)}
        acoes={
          <>
            <Botao variante="secundario" onClick={() => setConfirmando(false)} disabled={excluindo}>
              Cancelar
            </Botao>
            <Botao variante="perigo" onClick={excluir} carregando={excluindo}>
              Excluir
            </Botao>
          </>
        }
      >
        <MensagemErro erro={erroExclusao} />
        <p>
          <strong>{item.market_hash_name}</strong> será removida do seu inventário.
        </p>
      </Modal>
    </div>
  );
}
