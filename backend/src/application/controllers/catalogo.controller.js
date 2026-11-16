import { Router } from 'express';

export function criarCatalogoRouter({ catalogoService }) {
  const router = Router();

  // GET /api/catalogo?busca=redline&limite=20
  router.get('/', (req, res) => {
    res.json(catalogoService.buscar(req.query.busca, req.query.limite));
  });

  // GET /api/catalogo/:skinId
  router.get('/:skinId', (req, res) => {
    res.json(catalogoService.obter(req.params.skinId));
  });

  return router;
}
