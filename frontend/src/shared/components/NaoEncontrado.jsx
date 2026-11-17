import Botao from './Botao.jsx';

export default function NaoEncontrado({ titulo = 'Página não encontrada', texto, link = '/inventario', textoLink = 'Voltar ao inventário' }) {
  return (
    <div className="pagina pagina--estreita">
      <div className="vazio">
        <p className="vazio__titulo">{titulo}</p>
        {texto && <p className="texto-secundario">{texto}</p>}
        <Botao para={link} variante="secundario">
          {textoLink}
        </Botao>
      </div>
    </div>
  );
}
