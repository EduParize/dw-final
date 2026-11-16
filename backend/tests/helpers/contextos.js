import { criarUsuarioService } from '../../src/domain/usuario/service/usuario.service.js';
import { criarCatalogoService } from '../../src/domain/catalogo/service/catalogo.service.js';
import { criarInventarioService } from '../../src/domain/inventario/service/inventario.service.js';
import { SKINS } from './catalogo.fixture.js';
import {
  criarInventarioRepositoryEmMemoria,
  criarUsuarioRepositoryEmMemoria,
} from './repositories-em-memoria.js';

/** Catálogo já carregado com o recorte de skins da fixture. */
export async function criarCatalogoDeTeste(skins = SKINS) {
  const catalogoService = criarCatalogoService({ baixarSkins: async () => skins });
  await catalogoService.carregar();
  return catalogoService;
}

/**
 * Monta os mesmos contextos que o configuration/factory monta,
 * trocando o banco e o download do catálogo por versões em memória.
 */
export async function criarContextosDeTeste() {
  const usuarioRepository = criarUsuarioRepositoryEmMemoria();
  const inventarioRepository = criarInventarioRepositoryEmMemoria({ usuarioRepository });
  const catalogoService = await criarCatalogoDeTeste();

  return {
    usuario: { usuarioRepository, usuarioService: criarUsuarioService({ usuarioRepository }) },
    catalogo: { catalogoService },
    inventario: {
      inventarioRepository,
      inventarioService: criarInventarioService({ inventarioRepository, catalogoService }),
    },
  };
}
