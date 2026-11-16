import { criarInventarioRepository } from '../../infraestructure/repository/inventario/inventario.repository.js';
import { criarInventarioService } from '../../domain/inventario/service/inventario.service.js';

/** Monta repository + service do contexto inventário. Depende dos services do catálogo e de preço. */
export function criarContextoInventario({ catalogoService, precoService }) {
  const inventarioRepository = criarInventarioRepository();
  const inventarioService = criarInventarioService({ inventarioRepository, catalogoService, precoService });
  return { inventarioRepository, inventarioService };
}
