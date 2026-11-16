import { criarUsuarioService } from '../../src/domain/usuario/service/usuario.service.js';
import { criarCatalogoService } from '../../src/domain/catalogo/service/catalogo.service.js';
import { criarPrecoService } from '../../src/domain/preco/service/preco.service.js';
import { criarInventarioService } from '../../src/domain/inventario/service/inventario.service.js';
import { SKINS } from './catalogo.fixture.js';
import { COTACAO, PRECOS_BRUTOS } from './precos.fixture.js';
import {
  criarInventarioRepositoryEmMemoria,
  criarPrecoRepositoryEmMemoria,
  criarUsuarioRepositoryEmMemoria,
} from './repositories-em-memoria.js';

/** Catálogo já carregado com o recorte de skins da fixture. */
export async function criarCatalogoDeTeste(skins = SKINS) {
  const catalogoService = criarCatalogoService({ baixarSkins: async () => skins });
  await catalogoService.carregar();
  return catalogoService;
}

/**
 * Service de preços com downloads falsos (fixture). Com `atualizado: true` (padrão)
 * os preços e a cotação já estão no cache; com false, o cache começa vazio ("sem preço").
 */
export async function criarPrecoServiceDeTeste({ atualizado = true, ...opcoes } = {}) {
  const precoRepository = criarPrecoRepositoryEmMemoria();
  const precoService = criarPrecoService({
    precoRepository,
    baixarPrecos: async (fonte) => structuredClone(PRECOS_BRUTOS[fonte]),
    baixarCotacao: async () => ({ ...COTACAO }),
    ...opcoes,
  });
  if (atualizado) await precoService.atualizar();
  return { precoService, precoRepository };
}

/**
 * Monta os mesmos contextos que o configuration/factory monta,
 * trocando o banco e os downloads externos por versões em memória.
 */
export async function criarContextosDeTeste({ precosAtualizados = true, opcoesPreco = {} } = {}) {
  const usuarioRepository = criarUsuarioRepositoryEmMemoria();
  const inventarioRepository = criarInventarioRepositoryEmMemoria({ usuarioRepository });
  const catalogoService = await criarCatalogoDeTeste();
  const { precoService, precoRepository } = await criarPrecoServiceDeTeste({
    atualizado: precosAtualizados,
    ...opcoesPreco,
  });

  return {
    usuario: { usuarioRepository, usuarioService: criarUsuarioService({ usuarioRepository }) },
    catalogo: { catalogoService },
    preco: { precoRepository, precoService },
    inventario: {
      inventarioRepository,
      inventarioService: criarInventarioService({ inventarioRepository, catalogoService, precoService }),
    },
  };
}
