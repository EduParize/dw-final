import { useEffect, useState } from 'react';
import { BUSCA_MINIMA, catalogoApi } from '../api/catalogo.api.js';

const ESPERA_DIGITACAO_MS = 300;

/**
 * Busca no catálogo enquanto o usuário digita: espera 300 ms parado e cancela a busca anterior.
 * Abaixo de 2 caracteres não busca (o backend exige o mínimo).
 */
export function useBuscaCatalogo(termo) {
  const [resultados, setResultados] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);

  const termoLimpo = termo.trim();
  const buscaValida = termoLimpo.length >= BUSCA_MINIMA;

  useEffect(() => {
    if (!buscaValida) {
      setResultados([]);
      setCarregando(false);
      setErro(null);
      return undefined;
    }

    const controle = new AbortController();
    setCarregando(true);
    const espera = setTimeout(() => {
      catalogoApi
        .buscar(termoLimpo, { signal: controle.signal })
        .then((skins) => {
          setResultados(skins);
          setErro(null);
        })
        .catch((err) => {
          if (!controle.signal.aborted) {
            setResultados([]);
            setErro(err);
          }
        })
        .finally(() => {
          if (!controle.signal.aborted) {
            setCarregando(false);
          }
        });
    }, ESPERA_DIGITACAO_MS);

    return () => {
      clearTimeout(espera);
      controle.abort();
    };
  }, [termoLimpo, buscaValida]);

  return { resultados, carregando, erro, buscaValida };
}
