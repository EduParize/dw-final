// Roda antes de cada arquivo de teste, antes de qualquer import do src/.
// Os testes não usam banco nem internet: os repositories e o download do catálogo são trocados por fakes.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgres://teste:teste@localhost:1/teste_nao_usado';
process.env.JWT_SECRET = 'segredo-dos-testes';
process.env.JWT_EXPIRES_IN = '1h';
process.env.BCRYPT_ROUNDS = '4'; // mínimo do bcrypt, deixa os testes rápidos
