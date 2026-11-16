import { query } from '../../db/postgres/connection.js';

const COLUNAS = 'id, nome, email, senha_hash, criado_em';

/** Consultas SQL da tabela `usuarios`. Devolve as linhas como vêm do banco (inclui senha_hash). */
export function criarUsuarioRepository() {
  return {
    async criar({ nome, email, senhaHash }) {
      const { rows } = await query(
        `INSERT INTO usuarios (nome, email, senha_hash)
         VALUES ($1, $2, $3)
         RETURNING ${COLUNAS}`,
        [nome, email, senhaHash],
      );
      return rows[0];
    },

    async buscarPorId(id) {
      const { rows } = await query(`SELECT ${COLUNAS} FROM usuarios WHERE id = $1`, [id]);
      return rows[0];
    },

    async buscarPorEmail(email) {
      const { rows } = await query(`SELECT ${COLUNAS} FROM usuarios WHERE email = $1`, [email]);
      return rows[0];
    },

    async atualizar(id, { nome, email, senhaHash }) {
      const { rows } = await query(
        `UPDATE usuarios
            SET nome = $1, email = $2, senha_hash = $3
          WHERE id = $4
          RETURNING ${COLUNAS}`,
        [nome, email, senhaHash, id],
      );
      return rows[0];
    },

    /** Devolve true se o usuário existia. As skins dele saem junto (ON DELETE CASCADE). */
    async excluir(id) {
      const { rowCount } = await query('DELETE FROM usuarios WHERE id = $1', [id]);
      return rowCount > 0;
    },
  };
}
