import { criarCatalogoService } from '../../src/domain/catalogo/service/catalogo.service.js';
import { AppError, NotFoundError } from '../../src/domain/common/errors/index.js';
import { AK, KARAMBIT_SEM_PINTURA, SKINS } from '../helpers/catalogo.fixture.js';
import { criarCatalogoDeTeste } from '../helpers/contextos.js';

describe('catalogoService', () => {
  describe('carregar', () => {
    test('indexa as skins válidas e devolve o total', async () => {
      const service = criarCatalogoService({ baixarSkins: async () => SKINS });
      await expect(service.carregar()).resolves.toBe(SKINS.length);
    });

    test('ignora itens sem id ou sem nome', async () => {
      const service = criarCatalogoService({
        baixarSkins: async () => [...SKINS, { id: 'sem-nome' }, { name: 'Sem id' }, null],
      });
      await expect(service.carregar()).resolves.toBe(SKINS.length);
    });

    test('falha se o download não trouxer nenhuma skin válida', async () => {
      const service = criarCatalogoService({ baixarSkins: async () => [{ foo: 'bar' }] });
      await expect(service.carregar()).rejects.toThrow('sem nenhuma skin válida');
    });

    test('status: total de skins e data do último download que deu certo', async () => {
      const agora = new Date('2026-11-16T12:00:00Z');
      const service = criarCatalogoService({ baixarSkins: async () => SKINS, agora: () => agora });
      expect(service.status()).toEqual({ total_skins: 0, atualizado_em: null });
      await service.carregar();
      expect(service.status()).toEqual({ total_skins: SKINS.length, atualizado_em: agora });
    });

    test('mantém o catálogo anterior se um novo download falhar', async () => {
      let falhar = false;
      const service = criarCatalogoService({
        baixarSkins: async () => {
          if (falhar) throw new Error('sem internet');
          return SKINS;
        },
      });
      await service.carregar();
      falhar = true;
      await expect(service.carregar()).rejects.toThrow('sem internet');
      expect(service.obter(AK).nome_completo).toBe('AK-47 | Redline');
    });
  });

  describe('antes de carregar', () => {
    test('busca e detalhe respondem 503', () => {
      const service = criarCatalogoService({ baixarSkins: async () => SKINS });
      expect(() => service.buscar('redline')).toThrow(AppError);
      expect(() => service.buscar('redline')).toThrow(expect.objectContaining({ status: 503 }));
      expect(() => service.obter(AK)).toThrow(expect.objectContaining({ status: 503 }));
    });
  });

  describe('buscar', () => {
    let service;
    beforeAll(async () => {
      service = await criarCatalogoDeTeste();
    });

    test('encontra pelo nome, sem diferenciar maiúsculas', () => {
      const nomes = service.buscar('REDLINE').map((s) => s.nome_completo);
      expect(nomes).toEqual(expect.arrayContaining(['AK-47 | Redline', 'AWP | Redline']));
      expect(nomes).toHaveLength(2);
    });

    test('exige todas as palavras digitadas, em qualquer ordem', () => {
      const nomes = service.buscar('redline ak').map((s) => s.nome_completo);
      expect(nomes).toEqual(['AK-47 | Redline']);
    });

    test('ignora acentos na busca', () => {
      expect(service.buscar('rédline')).toHaveLength(2);
    });

    test('termo com menos de 2 caracteres devolve lista vazia', () => {
      expect(service.buscar('a')).toEqual([]);
      expect(service.buscar('')).toEqual([]);
      expect(service.buscar(undefined)).toEqual([]);
    });

    test('nomes que começam com o termo vêm primeiro', () => {
      const nomes = service.buscar('karambit').map((s) => s.nome_completo);
      expect(nomes).toEqual(['★ Karambit', '★ Karambit | Doppler', '★ Karambit | Doppler']);
      const awp = service.buscar('awp').map((s) => s.nome_completo);
      expect(awp[0]).toBe('AWP | Redline');
    });

    test('respeita o limite pedido', () => {
      expect(service.buscar('redline', 1)).toHaveLength(1);
    });

    test('limite inválido usa o padrão e não quebra', () => {
      expect(service.buscar('redline', 'abc')).toHaveLength(2);
      expect(service.buscar('redline', -5)).toHaveLength(1);
    });

    test('não expõe campos internos', () => {
      const [skin] = service.buscar('ak-47 redline');
      expect(skin).toEqual({
        id: AK,
        arma: 'AK-47',
        nome: 'Redline',
        nome_completo: 'AK-47 | Redline',
        imagem: 'https://exemplo/ak-redline.png',
        raridade: { nome: 'Classified', cor: '#d32ce6' },
        min_float: 0.1,
        max_float: 0.7,
        stattrak: true,
        souvenir: false,
        sem_pintura: false,
        fase: null,
      });
    });
  });

  describe('obter', () => {
    let service;
    beforeAll(async () => {
      service = await criarCatalogoDeTeste();
    });

    test('devolve a skin pelo id', () => {
      expect(service.obter(AK).nome_completo).toBe('AK-47 | Redline');
    });

    test('skin inexistente → 404', () => {
      expect(() => service.obter('skin-que-nao-existe')).toThrow(NotFoundError);
    });

    test('faca sem pintura: sem_pintura = true e float de 0 a 1', () => {
      const faca = service.obter(KARAMBIT_SEM_PINTURA);
      expect(faca.sem_pintura).toBe(true);
      expect(faca.nome).toBe('★ Karambit');
      expect(faca.min_float).toBe(0);
      expect(faca.max_float).toBe(1);
    });

    test('Doppler: cada fase é um item com o campo fase', () => {
      const fases = service.buscar('karambit doppler').map((s) => s.fase);
      expect(fases).toEqual(expect.arrayContaining([null, 'Ruby']));
    });

    test('raridade que vem só como texto é normalizada', () => {
      const [m4] = service.buscar('printstream');
      expect(m4.raridade).toEqual({ nome: 'Covert', cor: null });
    });
  });
});
