import { query } from '../../db/postgres/connection.js';

// "float" entre aspas: é também o nome de um tipo do PostgreSQL.
const COLUNAS = 'id, usuario_id, skin_id, "float", stattrak, preco_pago, data_compra, criado_em';

/**
 * Consultas SQL da tabela `itens_inventario`.
 * Toda consulta filtra por `usuario_id`: um item de outro usuário é tratado como inexistente.
 */
export function criarInventarioRepository() {
  return {
    async listarPorUsuario(usuarioId) {
      const { rows } = await query(
        `SELECT ${COLUNAS}
           FROM itens_inventario
          WHERE usuario_id = $1
          ORDER BY criado_em DESC, id DESC`,
        [usuarioId],
      );
      return rows;
    },

    async buscarPorId(usuarioId, id) {
      const { rows } = await query(
        `SELECT ${COLUNAS} FROM itens_inventario WHERE id = $1 AND usuario_id = $2`,
        [id, usuarioId],
      );
      return rows[0];
    },

    async criar(usuarioId, { skinId, float, stattrak, precoPago, dataCompra }) {
      const { rows } = await query(
        `INSERT INTO itens_inventario (usuario_id, skin_id, "float", stattrak, preco_pago, data_compra)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING ${COLUNAS}`,
        [usuarioId, skinId, float, stattrak, precoPago, dataCompra],
      );
      return rows[0];
    },

    /** Devolve a linha atualizada, ou undefined se o item não existe para esse usuário. */
    async atualizar(usuarioId, id, { float, stattrak, precoPago, dataCompra }) {
      const { rows } = await query(
        `UPDATE itens_inventario
            SET "float" = $1, stattrak = $2, preco_pago = $3, data_compra = $4
          WHERE id = $5 AND usuario_id = $6
          RETURNING ${COLUNAS}`,
        [float, stattrak, precoPago, dataCompra, id, usuarioId],
      );
      return rows[0];
    },

    /** Devolve true se o item existia para esse usuário. */
    async excluir(usuarioId, id) {
      const { rowCount } = await query(
        'DELETE FROM itens_inventario WHERE id = $1 AND usuario_id = $2',
        [id, usuarioId],
      );
      return rowCount > 0;
    },
  };
}
