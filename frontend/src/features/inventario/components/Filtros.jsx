import { useId } from 'react';
import Botao from '../../../shared/components/Botao.jsx';
import { NOMES_DESGASTE } from '../lib/desgaste.js';

export const ORDENACOES = [
  { valor: '', rotulo: 'Mais recentes' },
  { valor: 'lucro', rotulo: 'Maior lucro' },
  { valor: 'valor', rotulo: 'Maior valor' },
  { valor: 'data', rotulo: 'Data da compra' },
];

function Seletor({ rotulo, valor, onMudar, children }) {
  const id = useId();
  return (
    <div className="filtro">
      <label htmlFor={id} className="filtro__rotulo">
        {rotulo}
      </label>
      <select id={id} className="filtro__select" value={valor} onChange={(e) => onMudar(e.target.value)}>
        {children}
      </select>
    </div>
  );
}

/**
 * Filtros e ordenação numa linha só, acima dos cards. Os valores ficam na URL
 * (a página cuida disso), então dá para recarregar ou compartilhar a tela filtrada.
 */
export default function Filtros({ filtros, armas, onMudar, onLimpar }) {
  const algumFiltro = Boolean(filtros.arma || filtros.desgaste || filtros.stattrak || filtros.ordenar);

  return (
    <div className="filtros" role="search" aria-label="Filtrar o inventário">
      <Seletor rotulo="Arma" valor={filtros.arma} onMudar={(v) => onMudar('arma', v)}>
        <option value="">Todas</option>
        {armas.map((arma) => (
          <option key={arma} value={arma}>
            {arma}
          </option>
        ))}
      </Seletor>

      <Seletor rotulo="Desgaste" valor={filtros.desgaste} onMudar={(v) => onMudar('desgaste', v)}>
        <option value="">Todos</option>
        {NOMES_DESGASTE.map((nome) => (
          <option key={nome} value={nome}>
            {nome}
          </option>
        ))}
      </Seletor>

      <Seletor rotulo="StatTrak™" valor={filtros.stattrak} onMudar={(v) => onMudar('stattrak', v)}>
        <option value="">Todas</option>
        <option value="true">Só StatTrak™</option>
        <option value="false">Sem StatTrak™</option>
      </Seletor>

      <Seletor rotulo="Ordenar por" valor={filtros.ordenar} onMudar={(v) => onMudar('ordenar', v)}>
        {ORDENACOES.map((opcao) => (
          <option key={opcao.valor} value={opcao.valor}>
            {opcao.rotulo}
          </option>
        ))}
      </Seletor>

      {algumFiltro && (
        <Botao variante="fantasma" tamanho="pequeno" onClick={onLimpar} className="filtros__limpar">
          Limpar filtros
        </Botao>
      )}
    </div>
  );
}
