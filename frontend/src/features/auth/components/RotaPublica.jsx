import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

/** Login e registro: quem já está logado vai direto para o inventário. */
export default function RotaPublica() {
  const { logado } = useAuth();
  return logado ? <Navigate to="/inventario" replace /> : <Outlet />;
}
