import { Router } from 'express';

export function criarAuthRouter({ usuarioService }) {
  const router = Router();

  // POST /api/auth/login
  router.post('/login', async (req, res) => {
    const { email, senha } = req.body ?? {};
    res.json(await usuarioService.login({ email, senha }));
  });

  return router;
}
