import { baixarSkins } from '../../infraestructure/external/csgo-api.client.js';
import { criarCatalogoService } from '../../domain/catalogo/service/catalogo.service.js';

/** Monta o service do catálogo (não tem repository: os dados ficam em memória). */
export function criarContextoCatalogo() {
  const catalogoService = criarCatalogoService({ baixarSkins });
  return { catalogoService };
}
