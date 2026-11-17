import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from '../features/auth/hooks/useAuth.jsx';
import { router } from './router.jsx';

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
