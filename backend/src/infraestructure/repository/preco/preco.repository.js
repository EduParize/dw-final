import { query } from '../../db/postgres/connection.js';

/**
 * Consultas SQL da tabela `cache_precos`: uma linha por fonte (steam, skinport, csfloat,
 * buff163 e cotacao), com o conteúdo já normalizado em JSONB e a data do download.
 */
export function criarPrecoRepository() {
  return {
    async listar() {
      const { rows } = await query('SELECT fonte, conteudo, atualizado_em FROM cache_precos');
      return rows;
    },

    /** Insere ou substitui o cache de uma fonte. */
    async salvar(fonte, conteudo, atualizadoEm) {
      await query(
        `INSERT INTO cache_precos (fonte, conteudo, atualizado_em)
         VALUES ($1, $2::jsonb, $3)
         ON CONFLICT (fonte) DO UPDATE
           SET conteudo = EXCLUDED.conteudo, atualizado_em = EXCLUDED.atualizado_em`,
        [fonte, JSON.stringify(conteudo), atualizadoEm],
      );
    },
  };
}
