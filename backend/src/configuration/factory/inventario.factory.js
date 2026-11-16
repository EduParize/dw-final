import { criarInventarioRepository } from '../../infraestructure/repository/inventario/inventario.repository.js';
import { criarInventarioService } from '../../domain/inventario/service/inventario.service.js';

/** Monta repository + service do contexto inventário. Depende do service do catálogo. */
export function criarContextoInventario({ catalogoService }) {
  const inventarioRepository = criarInventarioRepository();
  const inventarioService = criarInventarioService({ inventarioRepository, catalogoService });
  return { inventarioRepository, inventarioService };
}
