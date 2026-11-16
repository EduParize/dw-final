-- As datas e horas usam TIMESTAMPTZ (com fuso): o Postgres guarda o instante exato e o Node
-- devolve a hora certa mesmo quando o banco (UTC no Docker) e o Node (ex.: Brasília) estão em
-- fusos diferentes. Com TIMESTAMP sem fuso, o criado_em gerado pelo banco era lido 3h adiantado.

CREATE TABLE IF NOT EXISTS usuarios (
  id          SERIAL PRIMARY KEY,
  nome        VARCHAR(100) NOT NULL,
  email       VARCHAR(255) NOT NULL UNIQUE,
  senha_hash  VARCHAR(100) NOT NULL,
  criado_em   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS itens_inventario (
  id          SERIAL PRIMARY KEY,
  usuario_id  INTEGER       NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  skin_id     VARCHAR(50)   NOT NULL,
  float       NUMERIC(10,9) NOT NULL CHECK (float >= 0 AND float <= 1),
  stattrak    BOOLEAN       NOT NULL DEFAULT false,
  preco_pago  NUMERIC(12,2) NOT NULL CHECK (preco_pago >= 0),
  data_compra DATE,
  criado_em   TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Para bancos criados antes dessas colunas existirem
ALTER TABLE itens_inventario ADD COLUMN IF NOT EXISTS stattrak BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE itens_inventario ADD COLUMN IF NOT EXISTS data_compra DATE;

CREATE INDEX IF NOT EXISTS idx_itens_inventario_usuario ON itens_inventario (usuario_id);

CREATE TABLE IF NOT EXISTS cache_precos (
  fonte          VARCHAR(20) PRIMARY KEY,
  conteudo       JSONB       NOT NULL,
  atualizado_em  TIMESTAMPTZ NOT NULL
);

-- Para bancos criados com TIMESTAMP sem fuso: converte para TIMESTAMPTZ (só na primeira vez).
-- Os valores antigos são interpretados no fuso da sessão do banco, o mesmo usado pelo DEFAULT now().
DO $$
DECLARE
  coluna RECORD;
BEGIN
  FOR coluna IN
    SELECT table_name, column_name
      FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND data_type = 'timestamp without time zone'
       AND (table_name, column_name) IN (
         ('usuarios', 'criado_em'),
         ('itens_inventario', 'criado_em'),
         ('cache_precos', 'atualizado_em')
       )
  LOOP
    EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE TIMESTAMPTZ', coluna.table_name, coluna.column_name);
  END LOOP;
END $$;
