import { criarPrecoService, normalizarArquivoDePrecos } from '../../src/domain/preco/service/preco.service.js';
import { COTACAO, PRECOS_BRUTOS } from '../helpers/precos.fixture.js';
import { criarPrecoServiceDeTeste } from '../helpers/contextos.js';

const AK_FT = 'AK-47 | Redline (Field-Tested)';
const DOPPLER_FN = '★ Karambit | Doppler (Factory New)';
const UM_DIA = 24 * 60 * 60 * 1000;

describe('normalizarArquivoDePrecos', () => {
  test('steam: usa a média mais recente disponível', () => {
    const precos = normalizarArquivoDePrecos('steam', PRECOS_BRUTOS.steam);
    expect(precos[AK_FT]).toEqual({ preco: 43.56 });
    expect(precos['★ Karambit']).toEqual({ preco: 1600 }); // last_24h null → last_7d
  });

  test('skinport: usa o starting_at', () => {
    expect(normalizarArquivoDePrecos('skinport', PRECOS_BRUTOS.skinport)[AK_FT]).toEqual({ preco: 22.96 });
  });

  test('csfloat: preço geral e preço por fase, sem fases nulas', () => {
    const precos = normalizarArquivoDePrecos('csfloat', PRECOS_BRUTOS.csfloat);
    expect(precos[AK_FT]).toEqual({ preco: 23.27 });
    expect(precos[DOPPLER_FN]).toEqual({ preco: 981.15, fases: { 'Phase 1': 986.59, Ruby: 6135.46 } });
  });

  test('buff163: usa o starting_at (menor oferta), não a maior ordem de compra', () => {
    const precos = normalizarArquivoDePrecos('buff163', PRECOS_BRUTOS.buff163);
    expect(precos[AK_FT]).toEqual({ preco: 24.06 });
    expect(precos[DOPPLER_FN].fases).toEqual({ 'Phase 1': 988.14, Ruby: 6213.76 });
  });

  test('descarta itens sem nenhum preço', () => {
    expect(normalizarArquivoDePrecos('steam', PRECOS_BRUTOS.steam)).not.toHaveProperty('Item Sem Preco');
  });

  test('ignora preços zero, negativos ou que não são número', () => {
    const precos = normalizarArquivoDePrecos('skinport', {
      a: { starting_at: 0 },
      b: { starting_at: -1 },
      c: { starting_at: '10' },
      d: { starting_at: null, suggested_price: 7 },
    });
    expect(precos).toEqual({ d: { preco: 7 } });
  });

  test('fonte desconhecida → erro', () => {
    expect(() => normalizarArquivoDePrecos('bitskins', {})).toThrow('Fonte de preço desconhecida');
  });
});

describe('precoService', () => {
  describe('precosEmReais', () => {
    let service;
    beforeAll(async () => {
      ({ precoService: service } = await criarPrecoServiceDeTeste());
    });

    test('converte cada fonte para R$ com a cotação e arredonda em 2 casas', () => {
      expect(service.precosEmReais(AK_FT)).toEqual({
        steam: 217.8, // 43.56 × 5
        skinport: 114.8,
        csfloat: 116.35,
        buff163: 120.3,
      });
    });

    test('fonte sem o item → null', () => {
      expect(service.precosEmReais('AWP | Redline (Field-Tested)')).toEqual({
        steam: null,
        skinport: 150,
        csfloat: null,
        buff163: null,
      });
    });

    test('item que não existe em nenhuma fonte → tudo null', () => {
      expect(service.precosEmReais('MP9 | Sand Dashed (Field-Tested)')).toEqual({
        steam: null,
        skinport: null,
        csfloat: null,
        buff163: null,
      });
    });

    test('market_hash_name null (skin fora do catálogo) → tudo null', () => {
      expect(Object.values(service.precosEmReais(null))).toEqual([null, null, null, null]);
    });

    test('Doppler com fase: usa o preço da fase e ignora as fontes que não separam fases', () => {
      expect(service.precosEmReais(DOPPLER_FN, 'Ruby')).toEqual({
        steam: null,
        skinport: null,
        csfloat: 30677.3, // 6135.46 × 5
        buff163: 31068.8,
      });
    });

    test('fase que nenhuma fonte tem → tudo null', () => {
      expect(Object.values(service.precosEmReais(DOPPLER_FN, 'Sapphire'))).toEqual([null, null, null, null]);
    });

    test('sem cotação no cache → tudo null', async () => {
      const { precoService } = await criarPrecoServiceDeTeste({
        baixarCotacao: async () => {
          throw new Error('AwesomeAPI fora do ar');
        },
      });
      expect(Object.values(precoService.precosEmReais(AK_FT))).toEqual([null, null, null, null]);
    });
  });

  describe('atualizar', () => {
    test('baixa todas as fontes e a cotação e salva no banco', async () => {
      const { precoService, precoRepository } = await criarPrecoServiceDeTeste({ atualizado: false });

      const resultado = await precoService.atualizar();

      expect(resultado).toEqual([
        { fonte: 'steam', ok: true },
        { fonte: 'skinport', ok: true },
        { fonte: 'csfloat', ok: true },
        { fonte: 'buff163', ok: true },
        { fonte: 'cotacao', ok: true },
      ]);
      expect([...precoRepository.linhas.keys()].sort()).toEqual(
        ['buff163', 'cotacao', 'csfloat', 'skinport', 'steam'],
      );
      expect(precoRepository.linhas.get('cotacao').conteudo).toEqual(COTACAO);
      expect(precoRepository.linhas.get('steam').conteudo[AK_FT]).toEqual({ preco: 43.56 });
    });

    test('uma fonte que falha mantém a cópia anterior e não impede as outras', async () => {
      let skinportFora = false;
      let precoSteam = 43.56;
      const { precoService } = await criarPrecoServiceDeTeste({
        baixarPrecos: async (fonte) => {
          if (fonte === 'skinport' && skinportFora) throw new Error('timeout');
          const bruto = structuredClone(PRECOS_BRUTOS[fonte]);
          if (fonte === 'steam') bruto[AK_FT].last_24h = precoSteam;
          return bruto;
        },
      });

      skinportFora = true;
      precoSteam = 50;
      const resultado = await precoService.atualizar();

      expect(resultado.find((r) => r.fonte === 'skinport')).toEqual({ fonte: 'skinport', ok: false, erro: 'timeout' });
      expect(precoService.precosEmReais(AK_FT)).toMatchObject({ steam: 250, skinport: 114.8 });
    });

    test('arquivo que vem sem nenhum preço é tratado como falha', async () => {
      const { precoService } = await criarPrecoServiceDeTeste({
        atualizado: false,
        baixarPrecos: async (fonte) => (fonte === 'csfloat' ? {} : structuredClone(PRECOS_BRUTOS[fonte])),
      });
      const resultado = await precoService.atualizar();
      expect(resultado.find((r) => r.fonte === 'csfloat')).toMatchObject({ ok: false, erro: expect.stringContaining('sem nenhum preço') });
    });

    test('chamadas simultâneas fazem um único download', async () => {
      let downloads = 0;
      const { precoService } = await criarPrecoServiceDeTeste({
        atualizado: false,
        baixarCotacao: async () => {
          downloads += 1;
          return { ...COTACAO };
        },
      });

      const [a, b] = await Promise.all([precoService.atualizar(), precoService.atualizar()]);
      expect(downloads).toBe(1);
      expect(a).toBe(b);

      await precoService.atualizar();
      expect(downloads).toBe(2);
    });
  });

  describe('carregarDoBanco', () => {
    test('restaura o cache salvo, sem baixar nada', async () => {
      const { precoRepository } = await criarPrecoServiceDeTeste();

      const naoBaixa = async () => {
        throw new Error('não deveria baixar');
      };
      const novo = criarPrecoService({ precoRepository, baixarPrecos: naoBaixa, baixarCotacao: naoBaixa });

      await expect(novo.carregarDoBanco()).resolves.toBe(5);
      expect(novo.precosEmReais(AK_FT).steam).toBe(217.8);
    });
  });

  describe('precisaAtualizar', () => {
    test('cache vazio → true', async () => {
      const { precoService } = await criarPrecoServiceDeTeste({ atualizado: false });
      expect(precoService.precisaAtualizar()).toBe(true);
    });

    test('tudo baixado agora → false; 24h depois → true', async () => {
      let agora = new Date('2026-11-16T12:00:00Z');
      const { precoService } = await criarPrecoServiceDeTeste({ agora: () => agora });

      expect(precoService.precisaAtualizar()).toBe(false);
      agora = new Date(agora.getTime() + UM_DIA - 1000);
      expect(precoService.precisaAtualizar()).toBe(false);
      agora = new Date(agora.getTime() + 2000);
      expect(precoService.precisaAtualizar()).toBe(true);
    });

    test('falta uma fonte → true', async () => {
      const { precoService } = await criarPrecoServiceDeTeste({
        baixarCotacao: async () => {
          throw new Error('fora do ar');
        },
      });
      expect(precoService.precisaAtualizar()).toBe(true);
    });
  });
});
