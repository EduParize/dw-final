import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/hooks/useAuth.jsx';

export default function Layout() {
  const { usuario, sair } = useAuth();
  const navegar = useNavigate();

  function aoSair() {
    sair();
    navegar('/login', { replace: true });
  }

  return (
    <>
      <a href="#conteudo" className="pular-link">
        Pular para o conteúdo
      </a>
      <header className="topo">
        <div className="topo__conteudo">
          <Link to="/inventario" className="marca">
            <span className="marca__icone" aria-hidden="true">◆</span> Inventário CS2
          </Link>
          <nav className="topo__nav" aria-label="Principal">
            <NavLink to="/inventario" end className="topo__link">
              Inventário
            </NavLink>
            <NavLink to="/inventario/nova" className="topo__link">
              Adicionar
            </NavLink>
          </nav>
          <div className="topo__usuario">
            <NavLink to="/perfil" className="topo__link topo__nome" title="Minha conta">
              {usuario.nome}
            </NavLink>
            <button type="button" className="botao botao--fantasma botao--pequeno" onClick={aoSair}>
              Sair
            </button>
          </div>
        </div>
      </header>
      <main id="conteudo" className="conteudo">
        <Outlet />
      </main>
    </>
  );
}
