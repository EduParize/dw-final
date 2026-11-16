import path from 'node:path';
import dotenv from 'dotenv';

// Lê primeiro o backend/.env (se existir) e depois o .env da raiz do repositório.
// O dotenv não sobrescreve variáveis já definidas, então o que vem do Docker tem prioridade.
dotenv.config({ quiet: true });
dotenv.config({ path: path.resolve(import.meta.dirname, '../../../.env'), quiet: true });

function obrigatoria(nome) {
  const valor = process.env[nome];
  if (!valor) {
    throw new Error(`Variável de ambiente ${nome} não definida (veja o .env.example)`);
  }
  return valor;
}

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: obrigatoria('DATABASE_URL'),
  jwtSecret: obrigatoria('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS ?? 10),
});
