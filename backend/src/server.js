import { env } from './configuration/env.js';
import { criarApp } from './app.js';
import { fecharBanco, inicializarBanco } from './infraestructure/db/postgres/connection.js';

async function iniciar() {
  await inicializarBanco();
  console.log('[db] conectado e tabelas verificadas');

  const app = criarApp();
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
