import { Router } from 'express';

export function criarPrecoRouter({ precoService, autenticar }) {
  const router = Router();

  // GET /api/precos/status (público): data da última atualização de cada fonte e a cotação
  router.get('/status', (req, res) => {
    res.json(precoService.status());
  });

  // POST /api/precos/atualizar: força o download fora do horário agendado
  router.post('/atualizar', autenticar, async (req, res) => {
    res.json(await precoService.atualizarAgora());
  });

  return router;
}
