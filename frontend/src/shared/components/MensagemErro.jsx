import Botao from './Botao.jsx';

/** Caixa de erro. Aceita um Error/ErroApi ou um texto. */
export default function MensagemErro({ erro, titulo, onTentarNovamente }) {
  if (!erro) {
    return null;
  }
  const mensagem = typeof erro === 'string' ? erro : erro.message;

  return (
    <div className="alerta alerta--erro" role="alert">
      <span className="alerta__icone" aria-hidden="true">!</span>
      <div className="alerta__texto">
        {titulo && <strong>{titulo}</strong>}
        <span>{mensagem}</span>
      </div>
      {onTentarNovamente && (
        <Botao variante="secundario" tamanho="pequeno" onClick={onTentarNovamente}>
          Tentar de novo
        </Botao>
      )}
    </div>
  );
}
