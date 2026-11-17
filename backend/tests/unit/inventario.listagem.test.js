import { criarInventarioService, interpretarFiltros } from '../../src/domain/inventario/service/inventario.service.js';
import { ValidationError } from '../../src/domain/common/errors/index.js';
import { AK, AWP, KARAMBIT_SEM_PINTURA, MP9_SEM_STATTRAK } from '../helpers/catalogo.fixture.js';
import { criarCatalogoDeTeste, criarPrecoServiceDeTeste } from '../helpers/contextos.js';
import {
  criarInventarioRepositoryEmMemoria,
  criarUsuarioRepositoryEmMemoria,
} from '../helpers/repositories-em-memoria.js';

const USUARIO = 1;
const OUTRO_USUARIO = 2;

describe('interpretarFiltros', () => {
  test('sem filtros → tudo undefined', () => {
    expect(interpretarFiltros({})).toEqual({
      arma: undefined,
      desgaste: undefined,
      stattrak: undefined,
      ordenar: undefined,
    });
  });

  test('valores vazios são ignorados', () => {
    expect(interpretarFiltros({ arma: '  ', desgaste: '', stattrak: '', ordenar: '' })).toEqual({
      arma: undefined,
      desgaste: undefined,
      stattrak: undefined,
      ordenar: undefined,
    });
  });

  test('desgaste sem diferenciar maiúsculas, devolvido com o nome oficial', () => {
    expect(interpretarFiltros({ desgaste: 'field-tested' }).desgaste).toBe('Field-Tested');
  });

  test('stattrak "true"/"false" vira booleano', () => {
    expect(interpretarFiltros({ stattrak: 'true' }).stattrak).toBe(true);
    expect(interpretarFiltros({ stattrak: 'false' }).stattrak).toBe(false);
  });

  test.each([
    ['desgaste desconhecido', { desgaste: 'Usada' }, 'Desgaste inválido. Use: Factory New, Minimal Wear'],
    ['stattrak que não é true/false', { stattrak: 'sim' }, 'Filtro stattrak deve ser true ou false'],
    ['ordenação desconhecida', { ordenar: 'nome' }, 'Ordenação inválida. Use: lucro, valor, data'],
    ['filtro repetido na URL', { arma: ['AK-47', 'AWP'] }, 'Filtro arma inválido'],
  ])('%s → 400', (_, query, mensagem) => {
    expect(() => interpretarFiltros(query)).toThrow(ValidationError);
    expect(() => interpretarFiltros(query)).toThrow(mensagem);
  });
});

/**
 * Inventário de teste (cotação R$ 5,00), cadastrado nesta ordem:
 * 1. AK-47 Redline FT          pago 85   → valor 217,80  lucro  132,80  (+156,24%)  compra 2025-01-10
 * 2. StatTrak AK-47 Redline FT pago 500  → valor 441,90  lucro  −58,10  (−11,62%)   compra 2025-06-01
 * 3. AWP Redline FT            pago 100  → valor 150,00  lucro   50,00  (+50%)      sem data
 * 4. MP9 Sand Dashed FT        pago 1    → sem preço                                compra 2024-01-01
 * 5. ★ Karambit (sem pintura)  pago 0    → valor 8000    lucro 8000     (sem %)     compra 2025-12-01
 */
describe('inventarioService: listagem e resumo', () => {
  let service;
  const ids = {};

  beforeEach(async () => {
    const usuarios = criarUsuarioRepositoryEmMemoria();
    await usuarios.criar({ nome: 'Ana', email: 'ana@email.com', senhaHash: 'x' });
    await usuarios.criar({ nome: 'Bia', email: 'bia@email.com', senhaHash: 'x' });
    service = criarInventarioService({
      inventarioRepository: criarInventarioRepositoryEmMemoria({ usuarioRepository: usuarios }),
      catalogoService: await criarCatalogoDeTeste(),
      precoService: (await criarPrecoServiceDeTeste()).precoService,
    });

    const cadastrar = async (nome, dados) => {
      ids[nome] = (await service.cadastrar(USUARIO, dados)).id;
    };
    await cadastrar('ak', { skin_id: AK, float: 0.162, preco_pago: 85, data_compra: '2025-01-10' });
    await cadastrar('akSt', { skin_id: AK, float: 0.2, stattrak: true, preco_pago: 500, data_compra: '2025-06-01' });
    await cadastrar('awp', { skin_id: AWP, float: 0.2, preco_pago: 100 });
    await cadastrar('mp9', { skin_id: MP9_SEM_STATTRAK, float: 0.3, preco_pago: 1, data_compra: '2024-01-01' });
    await cadastrar('faca', { skin_id: KARAMBIT_SEM_PINTURA, float: 0.5, preco_pago: 0, data_compra: '2025-12-01' });

    // Item de outro usuário: nunca pode aparecer na listagem nem no resumo.
    await service.cadastrar(OUTRO_USUARIO, { skin_id: AK, float: 0.2, preco_pago: 99999 });
  });

  const listarIds = async (query) => (await service.listar(USUARIO, query)).map((item) => item.id);
  const nomes = (...chaves) => chaves.map((chave) => ids[chave]);

  describe('listar', () => {
    test('sem filtros: todas as skins do usuário, cadastros mais recentes primeiro', async () => {
      expect(await listarIds()).toEqual(nomes('faca', 'mp9', 'awp', 'akSt', 'ak'));
    });

    test('filtro por arma, sem diferenciar maiúsculas', async () => {
      expect(await listarIds({ arma: 'ak-47' })).toEqual(nomes('akSt', 'ak'));
    });

    test('filtro por desgaste (facas sem pintura não têm desgaste)', async () => {
      expect(await listarIds({ desgaste: 'Field-Tested' })).toEqual(nomes('mp9', 'awp', 'akSt', 'ak'));
      expect(await listarIds({ desgaste: 'Battle-Scarred' })).toEqual([]);
    });

    test('filtro por StatTrak', async () => {
      expect(await listarIds({ stattrak: 'true' })).toEqual(nomes('akSt'));
    });

    test('filtros combinados', async () => {
      expect(await listarIds({ arma: 'AK-47', stattrak: 'false' })).toEqual(nomes('ak'));
    });

    test('ordenar=lucro: maior lucro primeiro, sem preço no fim', async () => {
      expect(await listarIds({ ordenar: 'lucro' })).toEqual(nomes('faca', 'ak', 'awp', 'akSt', 'mp9'));
    });

    test('ordenar=valor: maior valor atual primeiro, sem preço no fim', async () => {
      expect(await listarIds({ ordenar: 'valor' })).toEqual(nomes('faca', 'akSt', 'ak', 'awp', 'mp9'));
    });

    test('ordenar=data: compra mais recente primeiro, sem data no fim', async () => {
      expect(await listarIds({ ordenar: 'data' })).toEqual(nomes('faca', 'akSt', 'ak', 'mp9', 'awp'));
    });

    test('filtro e ordenação juntos', async () => {
      expect(await listarIds({ arma: 'ak-47', ordenar: 'valor' })).toEqual(nomes('akSt', 'ak'));
    });

    test('filtro inválido → 400', async () => {
      await expect(service.listar(USUARIO, { ordenar: 'preco' })).rejects.toThrow(ValidationError);
    });
  });

  describe('resumo', () => {
    test('totais, variação e destaques', async () => {
      const resumo = await service.resumo(USUARIO);

      expect(resumo).toMatchObject({
        quantidade_itens: 5,
        quantidade_sem_preco: 1,
        total_pago: 686, // 85 + 500 + 100 + 1 + 0 (todos os itens)
        valor_atual_total: 8809.7, // 217,80 + 441,90 + 150 + 8000 (só os com preço)
        lucro_total: 8124.7, // 132,80 − 58,10 + 50 + 8000
        variacao_percentual: 1186.09, // 8124,70 ÷ 685 (pago pelos itens com preço) × 100
      });
    });

    test('mais valorizada e mais desvalorizada pela variação %', async () => {
      const { mais_valorizada: mais, mais_desvalorizada: menos } = await service.resumo(USUARIO);

      expect(mais).toEqual({
        id: ids.ak,
        skin_id: AK,
        arma: 'AK-47',
        nome: 'Redline',
        fase: null,
        imagem: 'https://exemplo/ak-redline.png',
        market_hash_name: 'AK-47 | Redline (Field-Tested)',
        preco_pago: 85,
        valor_atual: 217.8,
        lucro: 132.8,
        variacao_percentual: 156.24,
      });
      expect(menos).toMatchObject({ id: ids.akSt, variacao_percentual: -11.62 });
    });

    test('inventário vazio → zeros e destaques null', async () => {
      await expect(service.resumo(3)).resolves.toEqual({
        quantidade_itens: 0,
        quantidade_sem_preco: 0,
        total_pago: 0,
        valor_atual_total: 0,
        lucro_total: 0,
        variacao_percentual: null,
        mais_valorizada: null,
        mais_desvalorizada: null,
      });
    });
  });
});
