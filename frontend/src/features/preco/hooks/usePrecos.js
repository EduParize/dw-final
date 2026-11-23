import { useState } from 'react';
import { useRequisicao } from '../../../shared/hooks/useRequisicao.js';
import { precoApi } from '../api/preco.api.js';

/** Status dos preços e a atualização manual (que espera o download terminar). */
export function usePrecos() {
  const status = useRequisicao((signal) => precoApi.status({ signal }), []);
  const [atualizando, setAtualizando] = useState(false);
  const [erroAtualizacao, setErroAtualizacao] = useState(null);
  const [falhas, setFalhas] = useState([]);

  async function atualizar() {
    setAtualizando(true);
    setErroAtualizacao(null);
    setFalhas([]);
    try {
      const resposta = await precoApi.atualizar();
      setFalhas(resposta.resultado.filter((r) => !r.ok).map((r) => r.fonte));
      status.recarregar();
      return true;
    } catch (erro) {
      // 502: todas as fontes falharam, mas os preços anteriores continuam valendo.
      setErroAtualizacao(erro);
      return false;
    } finally {
      setAtualizando(false);
    }
  }

  return {
    status: status.dados,
    carregando: status.carregando,
    erroStatus: status.erro,
    atualizando: atualizando || Boolean(status.dados?.atualizando),
    erroAtualizacao,
    falhas,
    atualizar,
  };
}
