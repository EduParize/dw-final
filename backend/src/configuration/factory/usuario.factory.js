import { criarUsuarioRepository } from '../../infraestructure/repository/usuario/usuario.repository.js';
import { criarUsuarioService } from '../../domain/usuario/service/usuario.service.js';

/** Monta repository + service do contexto usuário. */
export function criarContextoUsuario() {
  const usuarioRepository = criarUsuarioRepository();
  const usuarioService = criarUsuarioService({ usuarioRepository });
  return { usuarioRepository, usuarioService };
}
