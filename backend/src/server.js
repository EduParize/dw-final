import { env } from './configuration/env.js';
import { criarApp } from './app.js';
import { criarContextos } from './configuration/factory/index.js';
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

  const app = criarApp(contextos);
  const server = app.listen(env.port, () => {
    console.log(`[api] rodando em http://localhost:${env.port}/api (${env.nodeEnv})`);
  });

  const encerrar = (sinal) => {
    console.log(`[api] ${sinal} recebido, encerrando...`);
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
