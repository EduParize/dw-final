import { Router } from 'express';
import { CAMPOS_EDITAVEIS } from '../../domain/inventario/entity/inventario.constants.js';

export function criarInventarioRouter({ inventarioService }) {
  const router = Router();

  // GET /api/inventario
  router.get('/', async (req, res) => {
    res.json(await inventarioService.listar(req.usuario.id));
  });

  // Etapa 5: GET /api/inventario/resumo precisa ser declarado ANTES de /:id.

  // GET /api/inventario/:id
  router.get('/:id', async (req, res) => {
    res.json(await inventarioService.obter(req.usuario.id, req.params.id));
  });

  // POST /api/inventario
  router.post('/', async (req, res) => {
    const { skin_id, float, stattrak, preco_pago, data_compra } = req.body ?? {};
    const item = await inventarioService.cadastrar(req.usuario.id, {
      skin_id,
      float,
      stattrak,
      preco_pago,
      data_compra,
    });
    res.status(201).json(item);
  });

  // PUT /api/inventario/:id : só os campos editáveis que vieram no corpo
  router.put('/:id', async (req, res) => {
    const corpo = req.body ?? {};
    const dados = Object.fromEntries(
      CAMPOS_EDITAVEIS.filter((campo) => Object.hasOwn(corpo, campo)).map((campo) => [campo, corpo[campo]]),
    );
    res.json(await inventarioService.atualizar(req.usuario.id, req.params.id, dados));
  });

  // DELETE /api/inventario/:id
  router.delete('/:id', async (req, res) => {
    await inventarioService.excluir(req.usuario.id, req.params.id);
    res.status(204).end();
  });

  return router;
}
