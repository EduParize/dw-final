import { Navigate, createBrowserRouter } from 'react-router-dom';
import RotaProtegida from '../features/auth/components/RotaProtegida.jsx';
import RotaPublica from '../features/auth/components/RotaPublica.jsx';
import CadastroPage from '../pages/cadastro/CadastroPage.jsx';
import EdicaoPage from '../pages/cadastro/EdicaoPage.jsx';
import DetalhePage from '../pages/detalhe/DetalhePage.jsx';
import InventarioPage from '../pages/inventario/InventarioPage.jsx';
import LoginPage from '../pages/login/LoginPage.jsx';
import PerfilPage from '../pages/perfil/PerfilPage.jsx';
import RegistroPage from '../pages/registro/RegistroPage.jsx';
import NaoEncontrado from '../shared/components/NaoEncontrado.jsx';
import Layout from './Layout.jsx';

// /login e /registro são públicas; o resto exige estar logado.
export const router = createBrowserRouter([
  {
    element: <RotaPublica />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/registro', element: <RegistroPage /> },
    ],
  },
  {
    element: <RotaProtegida />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: '/', element: <Navigate to="/inventario" replace /> },
          { path: '/inventario', element: <InventarioPage /> },
          { path: '/inventario/nova', element: <CadastroPage /> },
          { path: '/inventario/:id', element: <DetalhePage /> },
          { path: '/inventario/:id/editar', element: <EdicaoPage /> },
          { path: '/perfil', element: <PerfilPage /> },
          { path: '*', element: <NaoEncontrado /> },
        ],
      },
    ],
  },
]);
