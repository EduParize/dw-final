import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Carregando from '../../../shared/components/Carregando.jsx';
import MensagemErro from '../../../shared/components/MensagemErro.jsx';
import { useAuth } from '../hooks/useAuth.jsx';

/** Sem token → /login (guardando a rota de origem para voltar depois do login). */
export default function RotaProtegida() {
  const { token, usuario, carregando, erroSessao, tentarNovamente } = useAuth();
  const local = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ de: local }} />;
  }
  if (carregando) {
    return (
      <div className="tela-cheia">
        <Carregando texto="Carregando sua conta..." />
      </div>
    );
  }
  if (!usuario) {
    return (
      <div className="tela-cheia">
        <MensagemErro
          titulo="Não foi possível carregar sua conta"
          erro={erroSessao ?? 'Tente de novo em instantes.'}
          onTentarNovamente={tentarNovamente}
        />
      </div>
    );
  }
  return <Outlet />;
}
