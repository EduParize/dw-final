import { env } from './configuration/env.js';
import { criarApp } from './app.js';
import { criarContextos } from './configuration/factory/index.js';
import { criarAgendador } from './configuration/agendador.js';
import { fecharBanco, inicializarBanco } from './infraestructure/db/postgres/connection.js';

async function iniciar() {
  await inicializarBanco();
  console.log('[db] conectado e tabelas verificadas');

  const contextos = criarContextos();

  // Se o download falhar o servidor sobe mesmo assim: as rotas que dependem do catálogo respondem 503.
  try {
    const total = await contextos.catalogo.catalogoService.carregar();
    console.log(`[catalogo] ${total} skins carregadas`);
  } catch (err) {
    console.error('[catalogo] falha ao carregar:', err.message || err);
  }

  // Preços: começa com o cache salvo no banco; o agendador baixa de novo o que estiver
  // faltando ou com mais de 24h (em segundo plano, a API já responde com o cache antigo).
  const fontesNoBanco = await contextos.preco.precoService.carregarDoBanco();
  console.log(`[precos] ${fontesNoBanco} fontes carregadas do cache`);

  const agendador = criarAgendador({
    catalogoService: contextos.catalogo.catalogoService,
    precoService: contextos.preco.precoService,
  });
  agendador.iniciar();

  const app = criarApp(contextos);
  const server = app.listen(env.port, () => {
    console.log(`[api] rodando em http://localhost:${env.port}/api (${env.nodeEnv})`);
  });

  const encerrar = (sinal) => {
    console.log(`[api] ${sinal} recebido, encerrando...`);
    agendador.parar();
    server.close(async () => {
      await fecharBanco();
      process.exit(0);
    });
  };
  process.on('SIGINT', encerrar);
  process.on('SIGTERM', encerrar);
}

iniciar().catch((err) => {
  // Erros de conexão (ex.: ECONNREFUSED) costumam vir com message vazia.
  console.error('[api] falha ao iniciar:', err.message || err.code || err);
  process.exit(1);
});
