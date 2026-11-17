import { Link } from 'react-router-dom';
import Spinner from './Spinner.jsx';

/**
 * Botão padrão. `variante`: primario | secundario | perigo | fantasma.
 * Com `para`, vira um link do router com a mesma aparência.
 */
export default function Botao({
  variante = 'primario',
  tamanho,
  carregando = false,
  disabled,
  para,
  className = '',
  children,
  type = 'button',
  ...resto
}) {
  const classes = ['botao', `botao--${variante}`, tamanho && `botao--${tamanho}`, className]
    .filter(Boolean)
    .join(' ');

  if (para) {
    return (
      <Link to={para} className={classes} {...resto}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      {...resto}
    >
      {carregando && <Spinner pequeno />}
      {children}
    </button>
  );
}
