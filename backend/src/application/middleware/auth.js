import { UnauthorizedError } from '../../domain/common/errors/index.js';

/**
 * Valida o header `Authorization: Bearer <token>` e preenche `req.usuario = { id, email }`.
 * Sem token válido → 401.
 */
export function criarAutenticar({ usuarioService }) {
  return function autenticar(req, res, next) {
    const [tipo, token] = (req.headers.authorization ?? '').split(' ');
    if (tipo?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedError('Token não informado');
    }
    req.usuario = usuarioService.verificarToken(token);
    next();
  };
}
