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

  // Preços: usa o cache salvo no banco e, se ele estiver incompleto ou com mais de 24h,
  // baixa de novo em segundo plano (a API já responde com o cache antigo enquanto isso).
  const { precoService } = contextos.preco;
  const fontesNoBanco = await precoService.carregarDoBanco();
  console.log(`[precos] ${fontesNoBanco} fontes carregadas do cache`);
  if (precoService.precisaAtualizar()) {
    console.log('[precos] cache incompleto ou velho, baixando preços e cotação...');
    precoService
      .atualizar()
      .then((resultado) => {
        const ok = resultado.filter((r) => r.ok).map((r) => r.fonte);
        console.log(`[precos] atualizados: ${ok.join(', ') || 'nenhum'}`);
      })
      .catch((err) => console.error('[precos] falha ao atualizar:', err.message || err));
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
