CREATE TABLE IF NOT EXISTS usuarios (
  id          SERIAL PRIMARY KEY,
  nome        VARCHAR(100) NOT NULL,
  email       VARCHAR(255) NOT NULL UNIQUE,
  senha_hash  VARCHAR(100) NOT NULL,
  criado_em   TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS itens_inventario (
  id          SERIAL PRIMARY KEY,
  usuario_id  INTEGER       NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  skin_id     VARCHAR(50)   NOT NULL,
  float       NUMERIC(10,9) NOT NULL CHECK (float >= 0 AND float <= 1),
  stattrak    BOOLEAN       NOT NULL DEFAULT false,
  preco_pago  NUMERIC(12,2) NOT NULL CHECK (preco_pago >= 0),
  data_compra DATE,
  criado_em   TIMESTAMP     NOT NULL DEFAULT now()
);

-- Para bancos criados antes dessas colunas existirem
ALTER TABLE itens_inventario ADD COLUMN IF NOT EXISTS stattrak BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE itens_inventario ADD COLUMN IF NOT EXISTS data_compra DATE;

CREATE INDEX IF NOT EXISTS idx_itens_inventario_usuario ON itens_inventario (usuario_id);

CREATE TABLE IF NOT EXISTS cache_precos (
  fonte          VARCHAR(20) PRIMARY KEY,
  conteudo       JSONB       NOT NULL,
  atualizado_em  TIMESTAMP   NOT NULL
);
