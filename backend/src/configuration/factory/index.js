import { criarContextoUsuario } from './usuario.factory.js';
import { criarContextoCatalogo } from './catalogo.factory.js';
import { criarContextoInventario } from './inventario.factory.js';

/** Cria todos os contextos uma única vez. O server.js e o app.js compartilham este mesmo conjunto. */
export function criarContextos() {
  const usuario = criarContextoUsuario();
  const catalogo = criarContextoCatalogo();
  const inventario = criarContextoInventario({ catalogoService: catalogo.catalogoService });
  return { usuario, catalogo, inventario };
}
