import { Router } from 'express';

export function criarUsuarioRouter({ usuarioService, autenticar }) {
  const router = Router();

  // POST /api/usuarios (público): cria a conta e já devolve o token
  router.post('/', async (req, res) => {
    const { nome, email, senha } = req.body ?? {};
    const resultado = await usuarioService.cadastrar({ nome, email, senha });
    res.status(201).json(resultado);
  });

  // GET /api/usuarios/me
  router.get('/me', autenticar, async (req, res) => {
    res.json(await usuarioService.obterPerfil(req.usuario.id));
  });

  // PUT /api/usuarios/me
  router.put('/me', autenticar, async (req, res) => {
    const { nome, email, senha, senha_atual } = req.body ?? {};
    res.json(await usuarioService.atualizar(req.usuario.id, { nome, email, senha, senha_atual }));
  });

  // DELETE /api/usuarios/me
  router.delete('/me', autenticar, async (req, res) => {
    await usuarioService.excluir(req.usuario.id);
    res.status(204).end();
  });

  return router;
}
