import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { env } from '../../../configuration/env.js';

// NUMERIC (código 1700) vem como string por padrão; convertemos para number.
pg.types.setTypeParser(1700, (valor) => (valor === null ? null : Number(valor)));
// DATE (código 1082) fica como texto "AAAA-MM-DD" para não sofrer deslocamento de fuso horário.
pg.types.setTypeParser(1082, (valor) => valor);

export const pool = new pg.Pool({ connectionString: env.databaseUrl });

pool.on('error', (err) => {
  console.error('[db] erro inesperado no pool:', err);
});

export function query(texto, parametros) {
  return pool.query(texto, parametros);
}

/** Cria as tabelas, se ainda não existirem. */
export async function inicializarBanco() {
  const sql = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  await pool.query(sql);
}

export function fecharBanco() {
  return pool.end();
}
