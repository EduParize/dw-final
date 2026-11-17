import { useCallback, useEffect, useState } from 'react';

/**
 * Executa `buscar(signal)` sempre que `dependencias` mudam e guarda dados, loading e erro.
 * Cancela a requisição anterior (troca de filtro, saída da tela) para uma resposta velha não
 * sobrescrever a nova. `recarregar()` busca de novo mantendo os dados atuais na tela.
 */
export function useRequisicao(buscar, dependencias) {
  const [estado, setEstado] = useState({ dados: null, carregando: true, erro: null });
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    const controle = new AbortController();
    setEstado((atual) => ({ ...atual, carregando: true, erro: null }));

    buscar(controle.signal).then(
      (dados) => {
        if (!controle.signal.aborted) {
          setEstado({ dados, carregando: false, erro: null });
        }
      },
      (erro) => {
        if (!controle.signal.aborted) {
          setEstado((atual) => ({ ...atual, carregando: false, erro }));
        }
      },
    );

    return () => controle.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencias, versao]);

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);

  return { ...estado, recarregar };
}
