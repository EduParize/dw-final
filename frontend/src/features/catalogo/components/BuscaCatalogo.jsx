import { useId, useState } from 'react';
import Spinner from '../../../shared/components/Spinner.jsx';
import { BUSCA_MINIMA } from '../api/catalogo.api.js';
import { useBuscaCatalogo } from '../hooks/useBuscaCatalogo.js';

/**
 * Autocomplete do catálogo (combobox acessível): digita, navega com ↑/↓, Enter escolhe, Esc fecha.
 * Chama `onSelecionar(skin)` com a skin completa do catálogo.
 */
export default function BuscaCatalogo({ onSelecionar, autoFocus = false }) {
  const [termo, setTermo] = useState('');
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(-1);
  const { resultados, carregando, erro, buscaValida } = useBuscaCatalogo(termo);
  const id = useId();
  const idLista = `${id}-lista`;

  const mostrarLista = aberto && buscaValida;

  function escolher(skin) {
    onSelecionar(skin);
    setTermo('');
    setAberto(false);
    setAtivo(-1);
  }

  function aoTeclar(evento) {
    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      setAberto(true);
      setAtivo((atual) => Math.min(atual + 1, resultados.length - 1));
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      setAtivo((atual) => Math.max(atual - 1, 0));
    } else if (evento.key === 'Enter' && mostrarLista && resultados[ativo]) {
      evento.preventDefault();
      escolher(resultados[ativo]);
    } else if (evento.key === 'Escape') {
      setAberto(false);
    }
  }

  return (
    <div className="busca-catalogo">
      <label htmlFor={id} className="campo__rotulo">
        Buscar skin no catálogo
      </label>
      <div className="busca-catalogo__entrada">
        <input
          id={id}
          className="campo__input"
          type="search"
          role="combobox"
          aria-expanded={mostrarLista}
          aria-controls={idLista}
          aria-autocomplete="list"
          aria-activedescendant={mostrarLista && ativo >= 0 ? `${idLista}-${ativo}` : undefined}
          placeholder="Ex.: ak redline, karambit doppler, awp asiimov"
          autoComplete="off"
          autoFocus={autoFocus}
          value={termo}
          onChange={(e) => {
            setTermo(e.target.value);
            setAberto(true);
            setAtivo(-1);
          }}
          onFocus={() => setAberto(true)}
          onBlur={() => setAberto(false)}
          onKeyDown={aoTeclar}
        />
        {carregando && (
          <span className="busca-catalogo__spinner">
            <Spinner pequeno />
          </span>
        )}
      </div>
      {!buscaValida && (
        <span className="campo__dica">Digite pelo menos {BUSCA_MINIMA} letras do nome da arma ou da skin.</span>
      )}

      {mostrarLista && (
        <ul id={idLista} role="listbox" className="busca-catalogo__lista" aria-label="Skins encontradas">
          {erro && <li className="busca-catalogo__aviso">{erro.message}</li>}
          {!erro && !carregando && resultados.length === 0 && (
            <li className="busca-catalogo__aviso">Nenhuma skin encontrada para “{termo.trim()}”.</li>
          )}
          {resultados.map((skin, indice) => (
            <li
              key={skin.id}
              id={`${idLista}-${indice}`}
              role="option"
              aria-selected={indice === ativo}
              className={`busca-catalogo__opcao ${indice === ativo ? 'busca-catalogo__opcao--ativa' : ''}`}
              // mousedown (e não click) para escolher antes do blur fechar a lista
              onMouseDown={(e) => {
                e.preventDefault();
                escolher(skin);
              }}
              onMouseEnter={() => setAtivo(indice)}
            >
              <img src={skin.imagem} alt="" loading="lazy" className="busca-catalogo__imagem" />
              <span className="busca-catalogo__textos">
                <span className="busca-catalogo__nome">
                  {skin.nome_completo}
                  {skin.fase && <span className="etiqueta etiqueta--neutra">{skin.fase}</span>}
                </span>
                <span className="busca-catalogo__detalhe">
                  <span className="ponto-raridade" style={{ '--cor-raridade': skin.raridade?.cor }} />
                  {skin.raridade?.nome ?? 'Sem raridade'}
                  {!skin.sem_pintura && ` · float ${skin.min_float} a ${skin.max_float}`}
                  {skin.stattrak && ' · StatTrak™'}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
