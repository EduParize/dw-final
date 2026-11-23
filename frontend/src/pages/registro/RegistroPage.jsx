import { Link, useNavigate } from 'react-router-dom';
import FormRegistro from '../../features/auth/components/FormRegistro.jsx';

export default function RegistroPage() {
  const navegar = useNavigate();

  return (
    <main className="pagina-auth">
      <div className="pagina-auth__caixa">
        <div className="marca marca--grande" aria-hidden="true">
          <span className="marca__icone">◆</span> Inventário CS2
        </div>
        <h1 className="pagina-auth__titulo">Criar conta</h1>
        <p className="texto-secundario">Cadastre suas skins e veja quanto elas valem hoje.</p>
        <FormRegistro onSucesso={() => navegar('/inventario', { replace: true })} />
        <p className="pagina-auth__rodape">
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </div>
    </main>
  );
}
