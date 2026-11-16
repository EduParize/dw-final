import express from 'express';
import { query } from './infraestructure/db/postgres/connection.js';
import { errorHandler, notFoundHandler } from './application/middleware/error-handler.js';
import { criarAutenticar } from './application/middleware/auth.js';
import { criarAuthRouter } from './application/controllers/auth.controller.js';
import { criarUsuarioRouter } from './application/controllers/usuario.controller.js';
import { criarCatalogoRouter } from './application/controllers/catalogo.controller.js';
import { criarInventarioRouter } from './application/controllers/inventario.controller.js';

export function criarApp(contextos) {
  const app = express();

  app.use(express.json());

  const api = express.Router();
  const autenticar = criarAutenticar({ usuarioService: contextos.usuario.usuarioService });

  api.get('/health', async (req, res) => {
    await query('SELECT 1');
    res.json({ status: 'ok' });
  });

  api.use('/auth', criarAuthRouter({ usuarioService: contextos.usuario.usuarioService }));
  api.use(
    '/usuarios',
    criarUsuarioRouter({ usuarioService: contextos.usuario.usuarioService, autenticar }),
  );
  api.use('/catalogo', criarCatalogoRouter({ catalogoService: contextos.catalogo.catalogoService }));
  api.use(
    '/inventario',
    autenticar,
    criarInventarioRouter({ inventarioService: contextos.inventario.inventarioService }),
  );
  // Próximas etapas: api.use('/precos', precoRoutes);

  app.use('/api', api);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
