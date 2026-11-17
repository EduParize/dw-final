import { Link, useLocation, useNavigate } from 'react-router-dom';
import FormLogin from '../../features/auth/components/FormLogin.jsx';

export default function LoginPage() {
  const navegar = useNavigate();
  const local = useLocation();
  const destino = local.state?.de?.pathname ?? '/inventario';

  return (
    <main className="pagina-auth">
      <div className="pagina-auth__caixa">
        <div className="marca marca--grande" aria-hidden="true">
          <span className="marca__icone">◆</span> Inventário CS2
        </div>
        <h1 className="pagina-auth__titulo">Entrar</h1>
        <p className="texto-secundario">Acompanhe o valor das suas skins nos principais sites.</p>
        <FormLogin onSucesso={() => navegar(destino, { replace: true })} />
        <p className="pagina-auth__rodape">
          Ainda não tem conta? <Link to="/registro">Criar conta</Link>
        </p>
      </div>
    </main>
  );
}
