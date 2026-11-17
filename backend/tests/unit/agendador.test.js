import { jest } from '@jest/globals';
import { criarAgendador } from '../../src/configuration/agendador.js';
import { criarCatalogoService } from '../../src/domain/catalogo/service/catalogo.service.js';
import { SKINS } from '../helpers/catalogo.fixture.js';
import { criarPrecoServiceDeTeste } from '../helpers/contextos.js';

const UMA_HORA = 60 * 60 * 1000;
const UM_DIA = 24 * UMA_HORA;
const logSilencioso = { log: () => {}, error: () => {} };

/**
 * Catálogo e preços com downloads contados e um relógio controlado pelo teste,
 * para simular a passagem do tempo sem esperar de verdade.
 */
async function montar({ catalogoCarregado = true, precosAtualizados = true } = {}) {
  const relogio = { agora: new Date('2026-11-16T12:00:00Z') };
  const agora = () => relogio.agora;
  const downloads = { catalogo: 0, cotacao: 0 };
  const falhas = { catalogo: false };

  const catalogoService = criarCatalogoService({
    agora,
    baixarSkins: async () => {
      downloads.catalogo += 1;
      if (falhas.catalogo) throw new Error('GitHub fora do ar');
      return SKINS;
    },
  });
  if (catalogoCarregado) await catalogoService.carregar();

  const { precoService } = await criarPrecoServiceDeTeste({
    atualizado: precosAtualizados,
    agora,
    baixarCotacao: async () => {
      downloads.cotacao += 1;
      return { valor: 5, data: null };
    },
  });

  const agendador = criarAgendador({ catalogoService, precoService, agora, log: logSilencioso });
  const avancar = (ms) => {
    relogio.agora = new Date(relogio.agora.getTime() + ms);
  };
  // Zera os contadores depois da preparação, para contar só o que o agendador baixar.
  downloads.catalogo = 0;
  downloads.cotacao = 0;
  return { agendador, catalogoService, precoService, downloads, falhas, avancar };
}

describe('agendador', () => {
  describe('verificar', () => {
    test('tudo em dia → não baixa nada', async () => {
      const { agendador, downloads } = await montar();
      await expect(agendador.verificar()).resolves.toEqual({ catalogo: 'em dia', precos: 'em dia' });
      expect(downloads).toEqual({ catalogo: 0, cotacao: 0 });
    });

    test('catálogo que falhou na inicialização é baixado na próxima verificação', async () => {
      const { agendador, catalogoService } = await montar({ catalogoCarregado: false });
      await expect(agendador.verificar()).resolves.toMatchObject({ catalogo: 'atualizado' });
      expect(catalogoService.status().total_skins).toBe(SKINS.length);
    });

    test('preços nunca baixados → baixa todas as fontes', async () => {
      const { agendador, downloads } = await montar({ precosAtualizados: false });
      const { precos } = await agendador.verificar();
      expect(precos.every((r) => r.ok)).toBe(true);
      expect(downloads.cotacao).toBe(1);
    });

    test('depois de 24h baixa de novo o catálogo e os preços; antes disso não', async () => {
      const { agendador, downloads, avancar } = await montar();

      avancar(UM_DIA - UMA_HORA);
      await agendador.verificar();
      expect(downloads).toEqual({ catalogo: 0, cotacao: 0 });

      avancar(UMA_HORA);
      const resultado = await agendador.verificar();
      expect(resultado.catalogo).toBe('atualizado');
      expect(downloads).toEqual({ catalogo: 1, cotacao: 1 });
    });

    test('falha no catálogo não impede os preços e é tentada de novo na próxima verificação', async () => {
      const { agendador, catalogoService, downloads, falhas, avancar } = await montar();
      avancar(UM_DIA);
      falhas.catalogo = true;

      const resultado = await agendador.verificar();
      expect(resultado.catalogo).toBe('falhou');
      expect(resultado.precos.every((r) => r.ok)).toBe(true);
      expect(catalogoService.status().total_skins).toBe(SKINS.length); // o catálogo antigo continua

      falhas.catalogo = false;
      avancar(UMA_HORA);
      await expect(agendador.verificar()).resolves.toMatchObject({ catalogo: 'atualizado', precos: 'em dia' });
      expect(downloads.catalogo).toBe(2);
    });

    test('verificações sobrepostas viram uma só', async () => {
      const { agendador, downloads } = await montar({ catalogoCarregado: false, precosAtualizados: false });
      const [a, b] = await Promise.all([agendador.verificar(), agendador.verificar()]);
      expect(a).toBe(b);
      expect(downloads).toEqual({ catalogo: 1, cotacao: 1 });
    });
  });

  describe('iniciar e parar', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    test('verifica logo ao iniciar e depois a cada hora, até parar', async () => {
      jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'Date'] });
      const { agendador, downloads, avancar } = await montar({ catalogoCarregado: false });

      agendador.iniciar();
      await jest.advanceTimersByTimeAsync(0);
      expect(downloads.catalogo).toBe(1);

      avancar(UM_DIA); // o relógio do domínio avança um dia...
      await jest.advanceTimersByTimeAsync(UMA_HORA); // ...e o timer dispara a verificação da hora
      expect(downloads).toEqual({ catalogo: 2, cotacao: 1 });

      agendador.parar();
      avancar(UM_DIA);
      await jest.advanceTimersByTimeAsync(UMA_HORA * 5);
      expect(downloads).toEqual({ catalogo: 2, cotacao: 1 });
    });

    test('chamar iniciar duas vezes não cria dois timers', async () => {
      jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'Date'] });
      const { agendador, downloads, avancar } = await montar();

      agendador.iniciar();
      agendador.iniciar();
      avancar(UM_DIA);
      await jest.advanceTimersByTimeAsync(UMA_HORA);
      expect(downloads.cotacao).toBe(1);
      agendador.parar();
    });
  });
});
