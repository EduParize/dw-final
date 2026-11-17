import { useEffect, useRef } from 'react';

/**
 * Modal com <dialog> nativo: foco preso dentro, Esc fecha e o fundo fica inerte.
 * `acoes` são os botões do rodapé.
 */
export default function Modal({ aberto, titulo, children, acoes, onFechar }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) {
      return;
    }
    if (aberto && !dialogo.open) {
      dialogo.showModal();
    } else if (!aberto && dialogo.open) {
      dialogo.close();
    }
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="modal-titulo"
      onCancel={(evento) => {
        evento.preventDefault();
        onFechar?.();
      }}
      onClick={(evento) => {
        // clique no fundo (fora da caixa) fecha
        if (evento.target === ref.current) {
          onFechar?.();
        }
      }}
    >
      <div className="modal__caixa">
        <h2 id="modal-titulo" className="modal__titulo">
          {titulo}
        </h2>
        <div className="modal__conteudo">{children}</div>
        {acoes && <div className="modal__acoes">{acoes}</div>}
      </div>
    </dialog>
  );
}
