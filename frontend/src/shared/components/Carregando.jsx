import Spinner from './Spinner.jsx';

export default function Carregando({ texto = 'Carregando...' }) {
  return (
    <div className="carregando" role="status">
      <Spinner />
      <span>{texto}</span>
    </div>
  );
}
