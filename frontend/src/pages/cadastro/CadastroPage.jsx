import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BuscaCatalogo from '../../features/catalogo/components/BuscaCatalogo.jsx';
import CabecalhoSkin from '../../features/inventario/components/CabecalhoSkin.jsx';
import FormSkin from '../../features/inventario/components/FormSkin.jsx';
import { inventarioApi } from '../../features/inventario/api/inventario.api.js';
import Botao from '../../shared/components/Botao.jsx';

/** Cadastro: 1) escolhe a skin no catálogo, 2) informa float, preço, StatTrak e data. */
export default function CadastroPage() {
  const navegar = useNavigate();
  const [skin, setSkin] = useState(null);

  async function cadastrar(dados) {
    const item = await inventarioApi.cadastrar({ skin_id: skin.id, ...dados });
    navegar(`/inventario/${item.id}`, { replace: true });
  }

  return (
    <div className="pagina pagina--estreita">
      <nav className="migalhas" aria-label="Caminho">
        <Link to="/inventario">Inventário</Link> <span aria-hidden="true">/</span> Adicionar skin
      </nav>

      <header className="pagina__cabecalho">
        <h1 className="pagina__titulo">Adicionar skin</h1>
      </header>

      <section className="painel">
        <h2 className="secao__titulo">
          <span className="passo">1</span> Escolha a skin
        </h2>
        {skin ? (
          <CabecalhoSkin skin={skin}>
            <span className="texto-secundario texto-pequeno">
              {skin.sem_pintura ? 'Faca sem pintura (sem desgaste)' : `Float de ${skin.min_float} a ${skin.max_float}`}
              {skin.stattrak ? ' · existe em StatTrak™' : ''}
            </span>
            <Botao variante="fantasma" tamanho="pequeno" onClick={() => setSkin(null)}>
              Trocar skin
            </Botao>
          </CabecalhoSkin>
        ) : (
          <BuscaCatalogo onSelecionar={setSkin} autoFocus />
        )}
      </section>

      {skin && (
        <section className="painel">
          <h2 className="secao__titulo">
            <span className="passo">2</span> Dados da sua skin
          </h2>
          {/* key: trocar de skin limpa o formulário */}
          <FormSkin
            key={skin.id}
            skin={skin}
            textoBotao="Adicionar ao inventário"
            onEnviar={cadastrar}
            onCancelar={() => navegar('/inventario')}
          />
        </section>
      )}
    </div>
  );
}
