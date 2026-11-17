import { VALIDADE_CACHE_MS } from '../domain/preco/entity/preco.constants.js';

/** De quanto em quanto tempo o agendador confere se o catálogo e os preços estão velhos. */
export const INTERVALO_VERIFICACAO_MS = 60 * 60 * 1000; // 1h

function descreverErro(err) {
  return err?.message || err?.code || String(err);
}

/**
 * Mantém o catálogo e os preços em dia enquanto o servidor está no ar.
 *
 * A cada `intervaloMs` (1h) confere o que está velho e baixa só isso:
 * - catálogo: se nunca carregou (falhou na inicialização) ou tem mais de 24h;
 * - preços e cotação: se falta alguma fonte ou alguma tem mais de 24h.
 * Assim os downloads acontecem a cada 24h, e uma falha é tentada de novo na hora seguinte
 * em vez de esperar mais um dia.
 */
export function criarAgendador({
  catalogoService,
  precoService,
  intervaloMs = INTERVALO_VERIFICACAO_MS,
  agora = () => new Date(),
  log = console,
}) {
  let timer = null;
  let verificacaoEmAndamento = null;

  function catalogoPrecisaAtualizar() {
    const { atualizado_em: atualizadoEm } = catalogoService.status();
    return !atualizadoEm || agora().getTime() - atualizadoEm.getTime() >= VALIDADE_CACHE_MS;
  }

  async function atualizarCatalogo() {
    try {
      const total = await catalogoService.carregar();
      log.log(`[agendador] catálogo atualizado: ${total} skins`);
      return 'atualizado';
    } catch (err) {
      log.error('[agendador] falha ao atualizar o catálogo:', descreverErro(err));
      return 'falhou';
    }
  }

  async function atualizarPrecos() {
    const resultado = await precoService.atualizar();
    const ok = resultado.filter((r) => r.ok).map((r) => r.fonte);
    log.log(`[agendador] preços atualizados: ${ok.join(', ') || 'nenhuma fonte'}`);
    return resultado;
  }

  async function executar() {
    const [catalogo, precos] = await Promise.all([
      catalogoPrecisaAtualizar() ? atualizarCatalogo() : 'em dia',
      precoService.precisaAtualizar() ? atualizarPrecos() : 'em dia',
    ]);
    return { catalogo, precos };
  }

  /**
   * Confere e atualiza o que estiver velho. Devolve { catalogo, precos }, onde cada um é
   * 'em dia', o resultado do download ou 'falhou'. Verificações sobrepostas viram uma só.
   */
  function verificar() {
    verificacaoEmAndamento ??= executar().finally(() => {
      verificacaoEmAndamento = null;
    });
    return verificacaoEmAndamento;
  }

  return {
    verificar,

    /** Começa a verificar a cada `intervaloMs`, já fazendo a primeira verificação agora (em segundo plano). */
    iniciar() {
      if (timer) return;
      const verificarSemQuebrar = () =>
        verificar().catch((err) => log.error('[agendador] erro inesperado:', descreverErro(err)));
      timer = setInterval(verificarSemQuebrar, intervaloMs);
      timer.unref?.(); // o timer sozinho não segura o processo aberto
      verificarSemQuebrar();
    },

    parar() {
      clearInterval(timer);
      timer = null;
    },
  };
}
