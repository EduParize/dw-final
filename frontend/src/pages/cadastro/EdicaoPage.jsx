import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSkinCatalogo } from '../../features/catalogo/hooks/useSkinCatalogo.js';
import { inventarioApi } from '../../features/inventario/api/inventario.api.js';
import CabecalhoSkin from '../../features/inventario/components/CabecalhoSkin.jsx';
import FormSkin from '../../features/inventario/components/FormSkin.jsx';
import { useItem } from '../../features/inventario/hooks/useItem.js';
import Carregando from '../../shared/components/Carregando.jsx';
import MensagemErro from '../../shared/components/MensagemErro.jsx';
import NaoEncontrado from '../../shared/components/NaoEncontrado.jsx';

/** Edição: a skin não muda; só float, StatTrak, preço pago e data da compra. */
export default function EdicaoPage() {
  const { id } = useParams();
  const navegar = useNavigate();
  const item = useItem(id);
  // O item não traz o intervalo de float nem se existe StatTrak: isso vem do catálogo.
  const skin = useSkinCatalogo(item.dados?.skin_id);

  if (item.erro?.status === 404) {
    return <NaoEncontrado titulo="Skin não encontrada" texto="Ela pode ter sido excluída." />;
  }

  async function salvar(dados) {
    await inventarioApi.editar(id, dados);
    navegar(`/inventario/${id}`, { replace: true });
  }

  const erro = item.erro ?? skin.erro;
  const pronto = item.dados && skin.dados;

  return (
    <div className="pagina pagina--estreita">
      <nav className="migalhas" aria-label="Caminho">
        <Link to="/inventario">Inventário</Link> <span aria-hidden="true">/</span>{' '}
        {item.dados ? <Link to={`/inventario/${id}`}>{item.dados.nome}</Link> : '...'}{' '}
        <span aria-hidden="true">/</span> Editar
      </nav>

      {erro && (
        <MensagemErro
          erro={erro}
          onTentarNovamente={() => {
            item.recarregar();
            skin.recarregar();
          }}
        />
      )}
      {!pronto && !erro && <Carregando />}

      {pronto && (
        <>
          <section className="painel">
            <CabecalhoSkin skin={item.dados}>
              <span className="texto-secundario texto-pequeno">{item.dados.market_hash_name}</span>
            </CabecalhoSkin>
          </section>
          <section className="painel">
            <h2 className="secao__titulo">Editar dados</h2>
            <FormSkin
              skin={skin.dados}
              itemInicial={item.dados}
              textoBotao="Salvar alterações"
              onEnviar={salvar}
              onCancelar={() => navegar(`/inventario/${id}`)}
            />
          </section>
        </>
      )}
    </div>
  );
}
