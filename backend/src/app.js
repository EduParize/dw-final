import express from 'express';
import { query } from './infraestructure/db/postgres/connection.js';
import { errorHandler, notFoundHandler } from './application/middleware/error-handler.js';

export function criarApp() {
  const app = express();

  app.use(express.json());

  const api = express.Router();

  api.get('/health', async (req, res) => {
    await query('SELECT 1');
    res.json({ status: 'ok' });
  });

  // As rotas de cada contexto entram aqui, por exemplo:
  // api.use('/auth', authRoutes);
  // api.use('/usuarios', usuarioRoutes);
  // api.use('/catalogo', catalogoRoutes);
  // api.use('/inventario', autenticar, inventarioRoutes);
  // api.use('/precos', precoRoutes);

  app.use('/api', api);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
