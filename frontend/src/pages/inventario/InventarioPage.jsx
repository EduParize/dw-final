import { useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import CardSkin from '../../features/inventario/components/CardSkin.jsx';
import Filtros from '../../features/inventario/components/Filtros.jsx';
import ResumoInventario from '../../features/inventario/components/ResumoInventario.jsx';
import { useInventario } from '../../features/inventario/hooks/useInventario.js';
import { useResumo } from '../../features/inventario/hooks/useResumo.js';
import StatusPrecos from '../../features/preco/components/StatusPrecos.jsx';
import Botao from '../../shared/components/Botao.jsx';
import Carregando from '../../shared/components/Carregando.jsx';
import MensagemErro from '../../shared/components/MensagemErro.jsx';

const CHAVES_FILTRO = ['arma', 'desgaste', 'stattrak', 'ordenar'];

export default function InventarioPage() {
  const [parametros, setParametros] = useSearchParams();
  const filtros = Object.fromEntries(CHAVES_FILTRO.map((chave) => [chave, parametros.get(chave) ?? '']));
  const filtrando = Boolean(filtros.arma || filtros.desgaste || filtros.stattrak);

  const inventario = useInventario(filtros);
  const resumo = useResumo();

  // As opções de arma vêm das skins já vistas: com o filtro de arma ativo a lista só tem
  // uma arma, então as outras opções são guardadas de quando a lista estava completa.
  const armasVistas = useRef(new Set());
  const armas = useMemo(() => {
    for (const item of inventario.dados ?? []) armasVistas.current.add(item.arma);
    if (filtros.arma) armasVistas.current.add(filtros.arma);
    return [...armasVistas.current].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [inventario.dados, filtros.arma]);

  function mudarFiltro(chave, valor) {
    const novos = new URLSearchParams(parametros);
    if (valor) novos.set(chave, valor);
    else novos.delete(chave);
    setParametros(novos, { replace: true });
  }

  function recarregarTudo() {
    inventario.recarregar();
    resumo.recarregar();
  }

  const itens = inventario.dados ?? [];
  const primeiraCarga = inventario.carregando && !inventario.dados;
  const inventarioVazio = resumo.dados?.quantidade_itens === 0;

  return (
    <div className="pagina">
      <header className="pagina__cabecalho">
        <div>
          <h1 className="pagina__titulo">Meu inventário</h1>
          <StatusPrecos onAtualizado={recarregarTudo} />
        </div>
        <Botao para="/inventario/nova">+ Adicionar skin</Botao>
      </header>

      {resumo.erro && <MensagemErro erro={resumo.erro} titulo="Resumo indisponível" onTentarNovamente={resumo.recarregar} />}
      {resumo.dados && <ResumoInventario resumo={resumo.dados} />}

      {!inventarioVazio && (
        <Filtros
          filtros={filtros}
          armas={armas}
          onMudar={mudarFiltro}
          onLimpar={() => setParametros(new URLSearchParams(), { replace: true })}
        />
      )}

      {inventario.erro && (
        <MensagemErro
          erro={inventario.erro}
          titulo="Não foi possível carregar o inventário"
          onTentarNovamente={inventario.recarregar}
        />
      )}

      {primeiraCarga && <Carregando texto="Carregando suas skins..." />}

      {!primeiraCarga && !inventario.erro && itens.length === 0 && (
        <div className="vazio">
          {filtrando ? (
            <>
              <p className="vazio__titulo">Nenhuma skin com esses filtros.</p>
              <Botao variante="secundario" onClick={() => setParametros(new URLSearchParams(), { replace: true })}>
                Limpar filtros
              </Botao>
            </>
          ) : (
            <>
              <p className="vazio__titulo">Seu inventário está vazio.</p>
              <p className="texto-secundario">Busque uma skin no catálogo e informe o float e quanto você pagou.</p>
              <Botao para="/inventario/nova">Adicionar a primeira skin</Botao>
            </>
          )}
        </div>
      )}

      {itens.length > 0 && (
        <ul className={`grade-skins ${inventario.carregando ? 'grade-skins--atualizando' : ''}`} aria-busy={inventario.carregando}>
          {itens.map((item) => (
            <li key={item.id}>
              <CardSkin item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
