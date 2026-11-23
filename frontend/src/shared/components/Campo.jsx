import { useId } from 'react';

/** Rótulo + input + dica/erro, com os ids de acessibilidade ligados. */
export default function Campo({ rotulo, dica, erro, className = '', ...propsDoInput }) {
  const id = useId();
  const idDescricao = `${id}-descricao`;
  const descricao = erro || dica;

  return (
    <div className={`campo ${erro ? 'campo--erro' : ''} ${className}`}>
      <label htmlFor={id} className="campo__rotulo">
        {rotulo}
      </label>
      <input
        id={id}
        className="campo__input"
        aria-invalid={erro ? true : undefined}
        aria-describedby={descricao ? idDescricao : undefined}
        {...propsDoInput}
      />
      {descricao && (
        <span id={idDescricao} className={erro ? 'campo__erro' : 'campo__dica'}>
          {descricao}
        </span>
      )}
    </div>
  );
}
