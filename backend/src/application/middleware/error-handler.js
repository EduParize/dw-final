import { AppError } from '../../domain/common/errors/index.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ erro: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
}

// O Express identifica o middleware de erro pelos 4 parâmetros.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ erro: err.message });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição' });
  }

  console.error('[erro]', err);
  return res.status(500).json({ erro: 'Erro interno do servidor' });
}
