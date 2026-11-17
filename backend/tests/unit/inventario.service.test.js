import { jest } from '@jest/globals';
import {
  calcularDesgaste,
  calcularValores,
  criarInventarioService,
  montarMarketHashName,
} from '../../src/domain/inventario/service/inventario.service.js';
import {
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../src/domain/common/errors/index.js';
import {
  AK,
  AWP,
  KARAMBIT_DOPPLER,
  KARAMBIT_DOPPLER_RUBY,
  KARAMBIT_SEM_PINTURA,
  MP9_SEM_STATTRAK,
} from '../helpers/catalogo.fixture.js';
import { criarCatalogoDeTeste, criarPrecoServiceDeTeste } from '../helpers/contextos.js';
import {
  criarInventarioRepositoryEmMemoria,
  criarUsuarioRepositoryEmMemoria,
} from '../helpers/repositories-em-memoria.js';

const USUARIO = 1;
const OUTRO_USUARIO = 2;

describe('calcularDesgaste', () => {
  test.each([
    [0, 'Factory New'],
    [0.069999, 'Factory New'],
    [0.07, 'Minimal Wear'],
    [0.149999, 'Minimal Wear'],
    [0.15, 'Field-Tested'],
    [0.162, 'Field-Tested'],
    [0.38, 'Well-Worn'],
    [0.45, 'Battle-Scarred'],
    [0.999, 'Battle-Scarred'],
    [1, 'Battle-Scarred'],
  ])('float %p → %s', (float, desgaste) => {
    expect(calcularDesgaste(float)).toBe(desgaste);
  });
});

describe('montarMarketHashName', () => {
  let catalogo;
  beforeAll(async () => {
    catalogo = await criarCatalogoDeTeste();
  });

  test('skin comum', () => {
    expect(montarMarketHashName(catalogo.buscarPorId(AK), false, 'Field-Tested')).toBe(
      'AK-47 | Redline (Field-Tested)',
    );
  });

  test('skin comum StatTrak', () => {
    expect(montarMarketHashName(catalogo.buscarPorId(AK), true, 'Field-Tested')).toBe(
      'StatTrak™ AK-47 | Redline (Field-Tested)',
    );
  });

  test('faca StatTrak: o ★ continua na frente', () => {
    expect(montarMarketHashName(catalogo.buscarPorId(KARAMBIT_DOPPLER), true, 'Factory New')).toBe(
      '★ StatTrak™ Karambit | Doppler (Factory New)',
    );
  });

  test('faca sem pintura não leva desgaste no nome', () => {
    const faca = catalogo.buscarPorId(KARAMBIT_SEM_PINTURA);
    expect(montarMarketHashName(faca, false, null)).toBe('★ Karambit');
    expect(montarMarketHashName(faca, true, null)).toBe('★ StatTrak™ Karambit');
  });
});

describe('calcularValores', () => {
  const precos = (steam, skinport, csfloat, buff163) => ({ steam, skinport, csfloat, buff163 });

  test('valor atual da Steam, menor preço entre as fontes, lucro e variação', () => {
    expect(calcularValores(precos(217.8, 114.8, 116.35, 120.3), 85)).toEqual({
      valor_atual: 217.8,
      fonte_valor_atual: 'steam',
      menor_preco: { fonte: 'skinport', valor: 114.8 },
      lucro: 132.8,
      variacao_percentual: 156.24,
    });
  });

  test('sem preço na Steam, o valor atual vem da próxima fonte com preço', () => {
    expect(calcularValores(precos(null, null, 116.35, 120.3), 85)).toMatchObject({
      valor_atual: 116.35,
      fonte_valor_atual: 'csfloat',
    });
  });

  test('prejuízo: lucro e variação negativos', () => {
    expect(calcularValores(precos(50, null, null, null), 100)).toMatchObject({
      lucro: -50,
      variacao_percentual: -50,
    });
  });

  test('preço pago zero: lucro igual ao valor, variação null', () => {
    expect(calcularValores(precos(10, null, null, null), 0)).toMatchObject({
      lucro: 10,
      variacao_percentual: null,
    });
  });

  test('arredonda em 2 casas', () => {
    expect(calcularValores(precos(10.1, null, null, null), 3)).toMatchObject({
      lucro: 7.1,
      variacao_percentual: 236.67,
    });
  });

  test('sem preço em nenhuma fonte → tudo null', () => {
    expect(calcularValores(precos(null, null, null, null), 85)).toEqual({
      valor_atual: null,
      fonte_valor_atual: null,
      menor_preco: null,
      lucro: null,
      variacao_percentual: null,
    });
  });
});

describe('inventarioService', () => {
  let service;
  let repo;

  const dadosValidos = (extra = {}) => ({ skin_id: AK, float: 0.162, preco_pago: 85, ...extra });

  beforeEach(async () => {
    const usuarios = criarUsuarioRepositoryEmMemoria();
    await usuarios.criar({ nome: 'Ana', email: 'ana@email.com', senhaHash: 'x' });
    await usuarios.criar({ nome: 'Bia', email: 'bia@email.com', senhaHash: 'x' });
    repo = criarInventarioRepositoryEmMemoria({ usuarioRepository: usuarios });
    service = criarInventarioService({
      inventarioRepository: repo,
      catalogoService: await criarCatalogoDeTeste(),
      precoService: (await criarPrecoServiceDeTeste()).precoService,
    });
  });

  describe('preços (cotação da fixture: R$ 5,00)', () => {
    test('completa o item com os preços de cada fonte, valor atual e lucro', async () => {
      const item = await service.cadastrar(USUARIO, dadosValidos());
      expect(item).toMatchObject({
        precos: { steam: 217.8, skinport: 114.8, csfloat: 116.35, buff163: 120.3 },
        valor_atual: 217.8,
        fonte_valor_atual: 'steam',
        menor_preco: { fonte: 'skinport', valor: 114.8 },
        lucro: 132.8,
        variacao_percentual: 156.24,
      });
    });

    test('StatTrak usa o preço da versão StatTrak', async () => {
      const item = await service.cadastrar(USUARIO, dadosValidos({ stattrak: true }));
      expect(item.precos.steam).toBe(441.9); // 88.38 × 5
    });

    test('o preço é por faixa de desgaste, não por float exato', async () => {
      const a = await service.cadastrar(USUARIO, dadosValidos({ float: 0.16 }));
      const b = await service.cadastrar(USUARIO, dadosValidos({ float: 0.37 }));
      expect(a.precos).toEqual(b.precos);
    });

    test('Doppler com fase: preço da fase só nas fontes que separam fases', async () => {
      const item = await service.cadastrar(
        USUARIO,
        dadosValidos({ skin_id: KARAMBIT_DOPPLER_RUBY, float: 0.01, preco_pago: 25000 }),
      );
      expect(item).toMatchObject({
        fase: 'Ruby',
        market_hash_name: '★ Karambit | Doppler (Factory New)',
        precos: { steam: null, skinport: null, csfloat: 30677.3, buff163: 31068.8 },
        valor_atual: 30677.3,
        fonte_valor_atual: 'csfloat',
      });
    });

    test('faca sem pintura usa o nome sem desgaste para achar o preço', async () => {
      const item = await service.cadastrar(
        USUARIO,
        dadosValidos({ skin_id: KARAMBIT_SEM_PINTURA, float: 0.3, preco_pago: 7000 }),
      );
      expect(item.precos).toEqual({ steam: 8000, skinport: 4402, csfloat: 3733.5, buff163: 3795.65 });
      expect(item.lucro).toBe(1000);
    });

    test('skin sem preço em nenhuma fonte → precos com null e valores null', async () => {
      const item = await service.cadastrar(USUARIO, dadosValidos({ skin_id: MP9_SEM_STATTRAK, float: 0.3 }));
      expect(item).toMatchObject({
        precos: { steam: null, skinport: null, csfloat: null, buff163: null },
        valor_atual: null,
        fonte_valor_atual: null,
        menor_preco: null,
        lucro: null,
        variacao_percentual: null,
      });
    });

    test('cache de preços ainda vazio → todos os valores null', async () => {
      const semPrecos = criarInventarioService({
        inventarioRepository: repo,
        catalogoService: await criarCatalogoDeTeste(),
        precoService: (await criarPrecoServiceDeTeste({ atualizado: false })).precoService,
      });
      const item = await semPrecos.cadastrar(USUARIO, dadosValidos());
      expect(item.valor_atual).toBeNull();
      expect(item.lucro).toBeNull();
    });
  });

  describe('cadastrar', () => {
    test('cadastra e completa a resposta com os dados do catálogo', async () => {
      const item = await service.cadastrar(USUARIO, dadosValidos({ stattrak: true, data_compra: '2025-10-02' }));

      expect(item).toMatchObject({
        id: expect.any(Number),
        skin_id: AK,
        arma: 'AK-47',
        nome: 'Redline',
        imagem: 'https://exemplo/ak-redline.png',
        raridade: { nome: 'Classified', cor: '#d32ce6' },
        float: 0.162,
        desgaste: 'Field-Tested',
        stattrak: true,
        market_hash_name: 'StatTrak™ AK-47 | Redline (Field-Tested)',
        preco_pago: 85,
        data_compra: '2025-10-02',
      });
      expect(repo.linhas.get(item.id).usuario_id).toBe(USUARIO);
    });

    test('stattrak e data_compra são opcionais', async () => {
      const item = await service.cadastrar(USUARIO, dadosValidos());
      expect(item.stattrak).toBe(false);
      expect(item.data_compra).toBeNull();
    });

    test('preço pago zero é aceito (skin ganha de drop)', async () => {
      await expect(service.cadastrar(USUARIO, dadosValidos({ preco_pago: 0 }))).resolves.toBeDefined();
    });

    test('faca sem pintura: desgaste null e nome de mercado sem desgaste', async () => {
      const item = await service.cadastrar(
        USUARIO,
        dadosValidos({ skin_id: KARAMBIT_SEM_PINTURA, float: 0.5, preco_pago: 3000 }),
      );
      expect(item.desgaste).toBeNull();
      expect(item.market_hash_name).toBe('★ Karambit');
    });

    test('skin_id ausente → 400', async () => {
      await expect(service.cadastrar(USUARIO, dadosValidos({ skin_id: undefined }))).rejects.toThrow(
        new ValidationError('skin_id é obrigatório'),
      );
    });

    test('skin que não existe no catálogo → 404', async () => {
      await expect(service.cadastrar(USUARIO, dadosValidos({ skin_id: 'skin-x' }))).rejects.toThrow(
        NotFoundError,
      );
    });

    describe('float', () => {
      test.each([
        ['ausente', undefined],
        ['texto', '0.16'],
        ['NaN', Number.NaN],
        ['infinito', Number.POSITIVE_INFINITY],
      ])('%s → 400', async (_, float) => {
        await expect(service.cadastrar(USUARIO, dadosValidos({ float }))).rejects.toThrow(
          'Float é obrigatório e deve ser um número',
        );
      });

      test('abaixo do mínimo da skin → 400 com o intervalo na mensagem', async () => {
        await expect(service.cadastrar(USUARIO, dadosValidos({ float: 0.05 }))).rejects.toThrow(
          'Float 0.05 fora do intervalo desta skin (0.10 a 0.70)',
        );
      });

      test('acima do máximo da skin → 400', async () => {
        await expect(
          service.cadastrar(USUARIO, dadosValidos({ skin_id: AWP, float: 0.5 })),
        ).rejects.toThrow('fora do intervalo desta skin (0.10 a 0.40)');
      });

      test('os limites exatos da skin são aceitos', async () => {
        await expect(service.cadastrar(USUARIO, dadosValidos({ float: 0.1 }))).resolves.toBeDefined();
        await expect(service.cadastrar(USUARIO, dadosValidos({ float: 0.7 }))).resolves.toBeDefined();
      });
    });

    describe('stattrak', () => {
      test('valor que não é booleano → 400', async () => {
        await expect(service.cadastrar(USUARIO, dadosValidos({ stattrak: 'sim' }))).rejects.toThrow(
          'StatTrak deve ser true ou false',
        );
      });

      test('skin que não existe em StatTrak → 400', async () => {
        await expect(
          service.cadastrar(USUARIO, dadosValidos({ skin_id: MP9_SEM_STATTRAK, float: 0.3, stattrak: true })),
        ).rejects.toThrow('Esta skin não existe na versão StatTrak™');
      });
    });

    describe('preco_pago', () => {
      test.each([
        ['ausente', undefined],
        ['texto', '85'],
      ])('%s → 400', async (_, preco) => {
        await expect(service.cadastrar(USUARIO, dadosValidos({ preco_pago: preco }))).rejects.toThrow(
          'Preço pago é obrigatório e deve ser um número',
        );
      });

      test('negativo → 400', async () => {
        await expect(service.cadastrar(USUARIO, dadosValidos({ preco_pago: -1 }))).rejects.toThrow(
          'Preço pago deve ser maior ou igual a zero',
        );
      });

      test('acima do limite do banco → 400 com mensagem própria', async () => {
        await expect(service.cadastrar(USUARIO, dadosValidos({ preco_pago: 1e12 }))).rejects.toThrow(
          'Preço pago acima do valor máximo permitido',
        );
      });
    });

    describe('data_compra', () => {
      afterEach(() => {
        jest.useRealTimers();
      });

      test.each([
        ['formato brasileiro', '02/10/2025', 'use o formato AAAA-MM-DD'],
        ['número', 20251002, 'use o formato AAAA-MM-DD'],
        ['dia que não existe', '2025-02-30', 'Data da compra inválida'],
        ['mês 13', '2025-13-01', 'Data da compra inválida'],
        ['antes do CS:GO', '2010-01-01', 'anterior ao lançamento do CS:GO'],
      ])('%s → 400', async (_, data, mensagem) => {
        await expect(service.cadastrar(USUARIO, dadosValidos({ data_compra: data }))).rejects.toThrow(
          mensagem,
        );
      });

      test('usa a data do Brasil: às 22h30 de 16/11 em Brasília (01h30 UTC do dia 17), "17/11" é futura', async () => {
        jest.useFakeTimers({ now: new Date('2026-11-17T01:30:00Z'), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });

        await expect(
          service.cadastrar(USUARIO, dadosValidos({ data_compra: '2026-11-16' })),
        ).resolves.toMatchObject({ data_compra: '2026-11-16' });
        await expect(service.cadastrar(USUARIO, dadosValidos({ data_compra: '2026-11-17' }))).rejects.toThrow(
          'Data da compra não pode ser futura',
        );
      });
    });

    test('usuário excluído depois de logar → 401', async () => {
      await expect(service.cadastrar(999, dadosValidos())).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('listar e obter', () => {
    test('lista só as skins do próprio usuário, mais recentes primeiro', async () => {
      const a = await service.cadastrar(USUARIO, dadosValidos());
      await service.cadastrar(OUTRO_USUARIO, dadosValidos());
      const b = await service.cadastrar(USUARIO, dadosValidos({ skin_id: AWP, float: 0.2 }));

      const lista = await service.listar(USUARIO);
      expect(lista.map((i) => i.id)).toEqual([b.id, a.id]);
    });

    test('inventário vazio → lista vazia', async () => {
      await expect(service.listar(USUARIO)).resolves.toEqual([]);
    });

    test('obter devolve o item do usuário', async () => {
      const criado = await service.cadastrar(USUARIO, dadosValidos());
      await expect(service.obter(USUARIO, String(criado.id))).resolves.toMatchObject({ id: criado.id });
    });

    test('item de outro usuário → 404', async () => {
      const criado = await service.cadastrar(USUARIO, dadosValidos());
      await expect(service.obter(OUTRO_USUARIO, String(criado.id))).rejects.toThrow(NotFoundError);
    });

    test.each(['abc', '0', '-1', '1.5', '99999999999'])('id inválido %p → 404', async (id) => {
      await expect(service.obter(USUARIO, id)).rejects.toThrow(NotFoundError);
    });

    test('skin que saiu do catálogo não derruba a listagem', async () => {
      await repo.criar(USUARIO, {
        skinId: 'skin-removida',
        float: 0.2,
        stattrak: false,
        precoPago: 10,
        dataCompra: null,
      });
      const [item] = await service.listar(USUARIO);
      expect(item).toMatchObject({ skin_id: 'skin-removida', arma: null, market_hash_name: null, valor_atual: null });
    });
  });

  describe('atualizar', () => {
    let item;
    beforeEach(async () => {
      item = await service.cadastrar(USUARIO, dadosValidos({ data_compra: '2025-10-02' }));
    });

    test('altera só os campos enviados e recalcula o desgaste', async () => {
      const atualizado = await service.atualizar(USUARIO, String(item.id), { float: 0.11 });
      expect(atualizado).toMatchObject({
        float: 0.11,
        desgaste: 'Minimal Wear',
        preco_pago: 85,
        data_compra: '2025-10-02',
      });
    });

    test('pode ativar o StatTrak e trocar o preço', async () => {
      const atualizado = await service.atualizar(USUARIO, String(item.id), { stattrak: true, preco_pago: 100 });
      expect(atualizado).toMatchObject({
        stattrak: true,
        preco_pago: 100,
        market_hash_name: 'StatTrak™ AK-47 | Redline (Field-Tested)',
      });
    });

    test('data_compra null apaga a data', async () => {
      const atualizado = await service.atualizar(USUARIO, String(item.id), { data_compra: null });
      expect(atualizado.data_compra).toBeNull();
    });

    test('repete as validações do cadastro', async () => {
      await expect(service.atualizar(USUARIO, String(item.id), { float: 0.9 })).rejects.toThrow(
        'fora do intervalo',
      );
      await expect(service.atualizar(USUARIO, String(item.id), { preco_pago: -5 })).rejects.toThrow(
        ValidationError,
      );
    });

    test('sem nenhum campo → 400', async () => {
      await expect(service.atualizar(USUARIO, String(item.id), {})).rejects.toThrow(
        'Informe ao menos um campo para atualizar',
      );
    });

    test('item de outro usuário → 404 e nada muda', async () => {
      await expect(service.atualizar(OUTRO_USUARIO, String(item.id), { preco_pago: 1 })).rejects.toThrow(
        NotFoundError,
      );
      expect(repo.linhas.get(item.id).preco_pago).toBe(85);
    });
  });

  describe('excluir', () => {
    test('remove o item do usuário', async () => {
      const item = await service.cadastrar(USUARIO, dadosValidos());
      await service.excluir(USUARIO, String(item.id));
      await expect(service.listar(USUARIO)).resolves.toEqual([]);
    });

    test('item de outro usuário → 404 e o item continua lá', async () => {
      const item = await service.cadastrar(USUARIO, dadosValidos());
      await expect(service.excluir(OUTRO_USUARIO, String(item.id))).rejects.toThrow(NotFoundError);
      expect(repo.linhas.has(item.id)).toBe(true);
    });

    test('item inexistente → 404', async () => {
      await expect(service.excluir(USUARIO, '123')).rejects.toThrow(NotFoundError);
    });
  });
});
