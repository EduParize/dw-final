import Botao from '../../../shared/components/Botao.jsx';
import { formatarDataHora } from '../../../shared/lib/formatacao.js';
import { usePrecos } from '../hooks/usePrecos.js';
import { NOMES_FONTES } from '../lib/fontes.js';

const cotacaoFormatada = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });

/**
 * "Preços atualizados em dd/mm/aaaa hh:mm" + botão "Atualizar preços".
 * `onAtualizado` é chamado depois de uma atualização que deu certo (para recarregar a lista).
 */
export default function StatusPrecos({ onAtualizado }) {
  const { status, carregando, erroStatus, atualizando, erroAtualizacao, falhas, atualizar } = usePrecos();

  async function aoClicar() {
    if (await atualizar()) {
      onAtualizado?.();
    }
  }

  let texto;
  if (carregando && !status) {
    texto = 'Verificando preços...';
  } else if (erroStatus) {
    texto = 'Não foi possível consultar o status dos preços';
  } else if (status?.atualizado_em) {
    texto = `Preços atualizados em ${formatarDataHora(status.atualizado_em)}`;
  } else {
    texto = 'Preços ainda não baixados';
  }

  return (
    <div className="status-precos">
      <div className="status-precos__info">
        <span className="status-precos__texto">{texto}</span>
        {status?.cotacao_usd_brl && (
          <span className="status-precos__cotacao">US$ 1 = R$ {cotacaoFormatada.format(status.cotacao_usd_brl)}</span>
        )}
        {erroAtualizacao && (
          <span className="status-precos__erro" role="alert">
            {erroAtualizacao.status === 502
              ? 'Nenhuma fonte respondeu. Os preços anteriores continuam valendo.'
              : erroAtualizacao.message}
          </span>
        )}
        {falhas.length > 0 && (
          <span className="status-precos__aviso" role="status">
            Sem resposta de: {falhas.map((fonte) => NOMES_FONTES[fonte] ?? fonte).join(', ')} (mantido o preço anterior)
          </span>
        )}
      </div>
      <Botao variante="secundario" tamanho="pequeno" onClick={aoClicar} carregando={atualizando}>
        {atualizando ? 'Atualizando...' : 'Atualizar preços'}
      </Botao>
    </div>
  );
}
