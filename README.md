# dw-final — Inventário de Skins CS2

Aplicação web para cadastrar e acompanhar um inventário de skins de Counter-Strike 2.
Cada pessoa cria uma **conta** (nome, e-mail e senha) e mantém o seu próprio inventário. Para
cadastrar uma skin, o usuário escolhe a skin no catálogo público e informa o **float**, **quanto
pagou**, se ela é **StatTrak** e a **data da compra**. O sistema mostra o **valor atual de mercado** (em vários sites de venda) e o
**lucro ou prejuízo** de cada skin e do inventário inteiro.

**Stack:** React (Vite) · JavaScript (Node.js + Express) · PostgreSQL · bcrypt + JWT

**Dados externos (gratuitos, sem chave):** catálogo de skins, preços de mercado e cotação do dólar

### Os dois CRUDs principais

| CRUD | O que guarda | Dados informados pelo usuário |
|---|---|---|
| **Usuários** | A conta que é dona das skins | `nome`, `email`, `senha` (armazenada com hash bcrypt; o acesso usa JWT) |
| **Skins do inventário** | As skins de cada usuário | Skin escolhida no catálogo público + `float` + `preco_pago` + `stattrak` + `data_compra` (opcional) |

---

## 1. Visão geral

```text
frontend (React)  --HTTP /api (Bearer JWT)-->  backend (Express)
                                                    |
                                       application/middleware (auth JWT)
                                                    |
                                          application/controllers
                                                    |
                                          domain/<contexto>/service
                                                    |
                                infraestructure/repository  ──>  PostgreSQL
                                infraestructure/external    ──>  APIs externas
```

Fluxo: request HTTP → (middleware de autenticação) → controller → service → repository → PostgreSQL.

**Princípios:**
- O React nunca fala com as APIs externas. Toda chamada externa passa pelo backend, que baixa os
  dados periodicamente e guarda em cache no banco. Quando o usuário abre a tela, **nenhuma
  requisição externa é feita**: tudo vem do PostgreSQL e do cache.
- Cada usuário só enxerga e altera **as próprias skins**. O `usuario_id` vem sempre do token JWT,
  nunca do corpo da requisição.

### Layout do repositório

```text
dw-final/
├── frontend/                 React + Vite
├── backend/                  Node.js + Express (JavaScript)
├── docker-compose.yml        Postgres + backend + frontend (produção)
├── docker-compose.dev.yml    Mesmo conjunto com hot reload
├── .env.example
├── KANBAN.md                 Lista de tarefas do projeto
└── README.md
```

---

## 2. Arquitetura do backend

### Pastas (`backend/src/`)

```text
backend/src/
├── app.js                          # cria o Express e monta as rotas sob /api
├── server.js                       # ponto de entrada: carrega .env, conecta no banco, sobe o app
├── configuration/
│   ├── env.js                      # leitura das variáveis de ambiente
│   └── factory/                    # monta service + repository de cada contexto
├── application/
│   ├── controllers/
│   │   ├── auth.controller.js      # login
│   │   ├── usuario.controller.js   # cadastro, perfil, edição e exclusão da conta
│   │   ├── catalogo.controller.js
│   │   ├── inventario.controller.js
│   │   └── preco.controller.js
│   └── middleware/
│       ├── auth.js                 # valida o JWT e coloca req.usuario
│       └── error-handler.js        # converte erros em respostas JSON
├── domain/
│   ├── common/errors/              # AppError, ValidationError (400), UnauthorizedError (401),
│   │                               # NotFoundError (404), ConflictError (409)
│   ├── usuario/
│   │   └── service/usuario.service.js   # hash bcrypt, login, geração do JWT
│   ├── catalogo/
│   │   └── service/catalogo.service.js
│   ├── inventario/
│   │   ├── entity/inventario.constants.js   # faixas de desgaste, ordenações válidas
│   │   └── service/inventario.service.js
│   └── preco/
│       ├── entity/preco.constants.js        # fontes de preço, fonte padrão, validade do cache (24h)
│       └── service/preco.service.js         # normaliza os arquivos, guarda o cache, converte para R$
└── infraestructure/
    ├── db/postgres/
    │   ├── connection.js           # pool do pg e inicialização do schema
    │   └── schema.sql              # criação das tabelas
    ├── repository/
    │   ├── usuario/usuario.repository.js
    │   ├── inventario/inventario.repository.js
    │   └── preco/preco.repository.js
    └── external/
        ├── csgo-api.client.js      # catálogo de skins
        ├── csgotrader.client.js    # preços de mercado
        └── awesomeapi.client.js    # cotação USD-BRL
```

### Camadas

| Camada | Onde | Contém | Não contém |
|---|---|---|---|
| **Middleware** | `application/middleware/` | Autenticação JWT, tratamento de erros | Regra de negócio, SQL |
| **Controller** | `application/controllers/` | Rotas Express, validação do formato da requisição, chama o service e monta a resposta HTTP | Regra de negócio, SQL |
| **Service** | `domain/<contexto>/service/` | Regras de negócio: hash de senha, valida float, calcula desgaste, preço e lucro; orquestra os repositories | `req`/`res`, SQL |
| **Repository** | `infraestructure/repository/<contexto>/` | Consultas SQL no PostgreSQL e conversão linha ↔ objeto | Regra de negócio |
| **External** | `infraestructure/external/` | Download dos dados das APIs externas | Regra de negócio, SQL |
| **Entity / constants** | `domain/<contexto>/entity/` | Constantes do domínio (faixas de desgaste, fontes de preço) | HTTP ou banco |

### Contextos

| Contexto | Responsabilidade |
|---|---|
| `usuario` | CRUD da conta, hash da senha com bcrypt, login e emissão do JWT |
| `catalogo` | Mantém o catálogo público de skins em memória e faz a busca por nome |
| `inventario` | CRUD das skins do usuário, validações, cálculo de desgaste, lucro e resumo |
| `preco` | Baixa e guarda preços e cotação, consulta o preço de um `market_hash_name` em R$ |

### Exemplo: cadastro de uma skin

- **`auth.js` (middleware)**: lê o header `Authorization: Bearer <token>`, valida o JWT e define
  `req.usuario = { id, email }`. Sem token válido → 401.
- **`inventario.controller.js`**: recebe `POST /api/inventario`, confere se `skin_id`, `float` e
  `preco_pago` vieram (`stattrak` e `data_compra` são opcionais) e chama `inventarioService.cadastrar(req.usuario.id, dados)`.
- **`inventario.service.js`**: busca a skin no catálogo, valida o float dentro do min/max da skin,
  calcula o desgaste, chama `inventarioRepository.criar(...)` e completa a resposta com preço e lucro
  usando o `precoService`.
- **`inventario.repository.js`**: executa o `INSERT` no PostgreSQL e devolve o registro criado.

Erros de regra são lançados como `ValidationError`, `UnauthorizedError`, `NotFoundError` ou
`ConflictError` e o `error-handler` os converte em `{ "erro": "mensagem" }` com o status correto.

---

## 3. Autenticação (bcrypt + JWT)

- **Senha:** nunca é salva em texto puro. No cadastro e na troca de senha, o service gera o hash
  com `bcrypt` (custo definido por `BCRYPT_ROUNDS`, padrão 10) e salva só o `senha_hash`.
  No login, a senha digitada é comparada com `bcrypt.compare`.
- **Token:** após cadastro ou login, o backend devolve um JWT assinado com `JWT_SECRET`, com
  `sub` = id do usuário e validade `JWT_EXPIRES_IN` (padrão `1d`).
- **Uso:** o frontend guarda o token e envia em toda requisição protegida:
  `Authorization: Bearer <token>`. Se a API responder 401, o frontend desloga e volta para o login.
- **Respostas:** o `senha_hash` nunca aparece em nenhuma resposta da API.
- **Login incorreto:** e-mail inexistente e senha errada devolvem a mesma mensagem
  ("E-mail ou senha inválidos"), para não revelar quais e-mails estão cadastrados.

---

## 4. Arquitetura do frontend

Organização **feature-based**: as páginas compõem as features, e cada feature tem a sua comunicação
com a API, seus hooks e seus componentes.

```text
Page (rota)
    |
Feature hook        # loading, erro e estado
    |
Feature api         # chamadas HTTP daquele contexto
    |
shared/api          # fetch base (prefixo /api + token JWT)
    |
HTTP /api  -->  backend (Express)
```

### Pastas (`frontend/src/`)

```text
frontend/src/
├── main.jsx                    # ponto de entrada
├── app/                        # App, router, layout, providers e rota protegida
├── pages/
│   ├── login/                  # login
│   ├── registro/               # criação de conta
│   ├── perfil/                 # dados da conta, troca de senha, excluir conta
│   ├── inventario/             # tela principal (resumo, filtros, cards)
│   ├── cadastro/               # cadastro e edição de skin
│   └── detalhe/                # detalhes de uma skin
├── features/
│   ├── auth/
│   │   ├── api/                # registrar, login, perfil, editarPerfil, excluirConta
│   │   ├── components/         # FormLogin, FormRegistro, RotaProtegida
│   │   └── hooks/              # useAuth (contexto com usuário e token)
│   ├── inventario/
│   │   ├── api/                # listar, buscarPorId, cadastrar, editar, excluir, resumo
│   │   ├── components/         # CardSkin, ResumoInventario, Filtros, FormSkin, BarraFloat
│   │   ├── hooks/              # useInventario, useResumo, useItem
│   │   └── lib/                # prévia do desgaste, formatação de moeda
│   ├── catalogo/
│   │   ├── api/                # buscar skins no catálogo
│   │   ├── components/         # BuscaCatalogo (autocomplete com imagem)
│   │   └── hooks/              # useBuscaCatalogo
│   └── preco/
│       ├── api/                # status e atualização dos preços
│       ├── components/         # ComparacaoPrecos, StatusPrecos
│       └── hooks/              # usePrecos
├── shared/
│   ├── api/client.js           # fetch base, prefixo /api, header Authorization e tratamento de erros
│   └── components/             # botões, modais, loaders genéricos
└── styles/                     # CSS global
```

### Camadas

| Camada | Onde | Contém | Não contém |
|---|---|---|---|
| **Page** | `pages/` | Rota e composição das features | `fetch` direto, regra de negócio |
| **Feature api** | `features/<contexto>/api/` | Chamadas HTTP daquele contexto | JSX, estado de tela |
| **Feature hooks** | `features/<contexto>/hooks/` | Loading, erro, orquestra a api | Acesso a banco |
| **Feature components** | `features/<contexto>/components/` | UI específica do domínio | Chamadas HTTP diretas |
| **Shared** | `shared/` | Client HTTP base e componentes genéricos | Regras de skins ou preços |

Regras de negócio (hash de senha, validação de float, cálculo de lucro, conversão de moeda) ficam no
**service** do backend. Validações no formulário do React servem só para melhorar a experiência do
usuário. Em desenvolvimento, o Vite encaminha `/api` para o backend (proxy).

Rotas do frontend: `/login` e `/registro` são públicas; todas as outras exigem estar logado.

---

## 5. Fontes de dados externas

| Dado | Fonte | URL | Observação |
|---|---|---|---|
| Catálogo de skins | CSGO-API (ByMykel, MIT) | `https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json` | Arma, nome, raridade, `min_float`, `max_float`, StatTrak, imagem |
| Preços: Steam | CSGO Trader | `https://prices.csgotrader.app/latest/steam.json` | Em USD |
| Preços: Skinport | CSGO Trader | `https://prices.csgotrader.app/latest/skinport.json` | Em USD |
| Preços: CSFloat | CSGO Trader | `https://prices.csgotrader.app/latest/csfloat.json` | Em USD |
| Preços: Buff163 | CSGO Trader | `https://prices.csgotrader.app/latest/buff163.json` | Em USD |
| Cotação USD → BRL | AwesomeAPI | `https://economia.awesomeapi.com.br/json/last/USD-BRL` | Usa o campo `bid` |

Cada arquivo de preços é um objeto cuja chave é o **`market_hash_name`** da skin, mas cada fonte
tem um formato. O `preco.service` usa um preço por fonte:

| Fonte | Formato (USD) | Preço usado | Preço por fase (Doppler) |
|---|---|---|---|
| Steam | `{ last_24h, last_7d, last_30d, last_90d }` | média mais recente disponível | não |
| Skinport | `{ starting_at, suggested_price }` | `starting_at` (menor oferta) | não |
| CSFloat | `{ price, starting_at: { price, doppler }, doppler }` | `price` (menor oferta) | sim |
| Buff163 | `{ starting_at: { price, doppler }, highest_order }` | `starting_at.price` (menor oferta) | sim |

Os arquivos vêm com gzip (≈500 KB cada) e têm ≈35 a 47 mil itens. Antes de salvar, o backend reduz
cada um para `{ "<market_hash_name>": { "preco": 23.27, "fases": { "Ruby": 6135.46 } } }`,
descartando os itens sem preço.

> As fontes de preço são mantidas pela comunidade e não são oficiais. Por isso o backend
> sempre guarda a última cópia baixada e continua funcionando com ela se um download falhar.

---

## 6. Fluxos do sistema

### 6.1 Inicialização do backend (e atualização diária)

```text
servidor inicia
  │
  ├─ 1. Conecta no PostgreSQL e cria as tabelas, se não existirem
  ├─ 2. Baixa o catálogo (skins.json) e guarda em memória, indexado por id
  ├─ 3. Lê o cache de preços e a cotação da tabela cache_precos para a memória
  ├─ 4. Se faltar alguma fonte ou o cache tiver mais de 24h, em segundo plano:
  │      ├─ baixa os arquivos de preço (Steam, Skinport, CSFloat, Buff163) e a cotação USD-BRL
  │      └─ salva cada fonte na tabela cache_precos com a data de atualização
  └─ 5. Agenda os passos 2 e 4 para rodarem de novo a cada 24h

As consultas de preço usam só o cache em memória; nenhuma requisição do usuário dispara download.
Se algum download falhar → mantém a cópia anterior do cache e registra o erro no log.

Se algum download falhar → mantém a cópia anterior do cache e registra o erro no log.
```

### 6.2 Criação de conta e login

```text
[React] Usuário preenche nome, e-mail e senha na tela de registro
   │
   ├─> POST /api/usuarios  { nome, email, senha }
   │
[Service]
   ├─ 1. Valida nome (obrigatório), e-mail (formato) e senha (mínimo 6 caracteres) → senão: 400
   ├─ 2. Normaliza o e-mail (minúsculas, sem espaços)
   ├─ 3. Confere se o e-mail já existe                                           → senão: 409
   ├─ 4. Gera o senha_hash com bcrypt
   ├─ 5. Salva o usuário
   └─ 6. Gera o JWT
   │
[Controller] responde 201 { usuario, token }
   │
[React] Guarda o token e vai para a tela de inventário

Login: POST /api/auth/login { email, senha }
   └─ busca o usuário pelo e-mail → bcrypt.compare(senha, senha_hash) → 200 { usuario, token } ou 401
```

### 6.3 Cadastro de uma skin

```text
[React] Usuário logado digita "redline" no campo de busca
   │
   ├─> GET /api/catalogo?busca=redline
   │      └─ devolve as skins encontradas (nome, imagem, min/max float)
   │
[React] Usuário escolhe "AK-47 | Redline", digita o float 0.162, marca StatTrak, o preço pago R$ 85,00
   │      e a data da compra 02/10/2026
   │      └─ a tela já mostra a prévia do desgaste: "Field-Tested"
   │
   ├─> POST /api/inventario  { skin_id, float, stattrak, preco_pago, data_compra }   (Authorization: Bearer <token>)
   │
[Middleware] valida o JWT → req.usuario
[Controller] confere o formato dos dados e chama o service
[Service]
   ├─ 1. Confere se o skin_id existe no catálogo            → senão: 404
   ├─ 2. Confere se o float está entre min_float e max_float → senão: 400
   ├─ 3. Confere se StatTrak existe para essa skin          → senão: 400
   ├─ 4. Confere se preco_pago >= 0                          → senão: 400
   ├─ 5. Confere se data_compra é uma data válida, não futura e não anterior ao CS:GO → senão: 400
   ├─ 6. Calcula o desgaste a partir do float (null para facas sem pintura)
   └─ 7. Chama o repository para salvar com o usuario_id do token
[Repository] INSERT no PostgreSQL
[Service] completa com preço atual e lucro → [Controller] responde 201
   │
[React] Volta para a tela de inventário e recarrega a lista e o resumo
```

### 6.4 Listagem do inventário

```text
[React] ─> GET /api/inventario?arma=AK-47&ordenar=lucro   (com token)
   │
[Repository] busca os itens do usuário logado no PostgreSQL
[Service] para cada item:
   ├─ 1. Busca os dados da skin no catálogo (nome, imagem, raridade)
   ├─ 2. Monta o market_hash_name:
   │       [StatTrak™ ]<Arma> | <Nome> (<Desgaste>)
   │       ex.: "StatTrak™ AK-47 | Redline (Field-Tested)"
   │       facas: "★ StatTrak™ Karambit | Doppler (Factory New)"
   │       facas sem pintura não têm desgaste: "★ Karambit"
   ├─ 3. Busca o preço desse nome em cada fonte do cache (em USD)
   ├─ 4. Converte para R$ com a cotação salva
   ├─ 5. Define o "valor atual" (fonte padrão: Steam) e o menor preço entre as fontes
   ├─ 6. Calcula o lucro e a variação percentual
   └─ 7. Aplica filtros e ordenação
   │
[React] Renderiza os cards (verde = lucro, vermelho = prejuízo)
```

### 6.5 Resumo do inventário

```text
[React]   ─> GET /api/inventario/resumo   (com token)
[Service] soma o preço pago e o valor atual de todos os itens do usuário e calcula:
          total pago, valor total atual, lucro total, variação %,
          skin mais valorizada e skin mais desvalorizada
[React]   mostra os 4 cards do topo da tela
```

### 6.6 Edição e exclusão

- `PUT /api/inventario/:id`: altera o float, o StatTrak, o preço pago ou a data da compra. O service repete as validações do
  cadastro e recalcula o desgaste.
- `DELETE /api/inventario/:id`: remove a skin (vendida ou trocada).
- Um item de outro usuário é tratado como inexistente (404).
- `PUT /api/usuarios/me`: altera nome, e-mail ou senha (para trocar a senha é preciso informar a
  `senha_atual`).
- `DELETE /api/usuarios/me`: exclui a conta e todas as skins dela (`ON DELETE CASCADE`).

### 6.7 Atualização manual dos preços

- `POST /api/precos/atualizar`: força o download dos preços e da cotação fora do horário agendado.
- `GET /api/precos/status`: informa a data da última atualização de cada fonte. O frontend mostra
  "Preços atualizados em 13/11/2026 17:12".

---

## 7. Regras de negócio

### Usuário
- `nome` obrigatório (até 100 caracteres).
- `email` obrigatório, formato válido e único (comparado em minúsculas).
- `senha` com no mínimo 6 caracteres; salva apenas como hash bcrypt.

### Desgaste calculado pelo float

| Float | Desgaste |
|---|---|
| 0.00 até 0.07 | Factory New |
| 0.07 até 0.15 | Minimal Wear |
| 0.15 até 0.38 | Field-Tested |
| 0.38 até 0.45 | Well-Worn |
| 0.45 até 1.00 | Battle-Scarred |

### Float válido por skin
Cada skin tem seu próprio intervalo de float. Exemplo: a AK-47 | Redline só existe entre
0.10 e 0.70, então um float 0.05 é recusado pela API. Os limites exatos (0.10 e 0.70) são aceitos.

### Facas sem pintura
As facas "vanilla" (ex.: `★ Karambit`, `★ Bayonet`) não têm pintura, intervalo de float nem
desgaste no nome de mercado. Para elas:
- o catálogo devolve `sem_pintura: true` (o frontend não deve mostrar a prévia do desgaste);
- qualquer float de 0 a 1 é aceito;
- o `desgaste` da resposta vem `null` e o `market_hash_name` fica sem o desgaste (`★ Karambit`).

### StatTrak, preço e data da compra
- `stattrak` só pode ser `true` se a skin existir na versão StatTrak™ (campo `stattrak` do catálogo).
- `preco_pago` entre 0 (skin ganha de drop) e R$ 9.999.999.999,99 (limite do `NUMERIC(12,2)`).
- `data_compra` é opcional, no formato `AAAA-MM-DD`, não pode ser futura nem anterior ao
  lançamento do CS:GO (21/08/2012). "Hoje" é calculado no fuso de São Paulo, mesmo que o
  servidor esteja em UTC.

### Cálculos
- `preco_brl = preco_usd × cotacao_usd_brl`, para cada fonte, arredondado em 2 casas
- `valor_atual` = preço da **Steam**; se a Steam não tiver o item, o da próxima fonte com preço
  (Skinport → CSFloat → Buff163). O campo `fonte_valor_atual` diz qual foi usada.
- `menor_preco` = menor preço entre as fontes que têm o item
- `lucro = valor_atual − preco_pago`
- `variacao_percentual = lucro ÷ preco_pago × 100` (fica `null` se o preço pago for 0)

### Dopplers
No catálogo, cada fase (Phase 1–4, Ruby, Sapphire, Black Pearl, Emerald) é uma skin separada,
com o campo `fase`, mas todas têm o mesmo `market_hash_name`. Para uma skin com fase, só valem as
fontes que informam o preço daquela fase (CSFloat e Buff163). Steam e Skinport ficam `null`,
porque o preço geral de "Karambit | Doppler" é o da fase mais barata, e não o de uma Ruby.

### Observações
- Os sites cobram **por faixa de desgaste**, não por float exato. Duas Redline Field-Tested com
  floats 0.16 e 0.37 recebem o mesmo preço.
- Os preços variam entre os sites (a Steam costuma ser mais cara). A tela sempre mostra a fonte usada.
- Se uma skin não tiver preço em nenhuma fonte, o valor atual aparece como "sem preço" e ela
  não entra no cálculo do lucro total.

---

## 8. Modelo de dados (PostgreSQL)

```text
usuarios 1 ──── N itens_inventario
```

### `usuarios`
| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `SERIAL PRIMARY KEY` | Identificador do usuário |
| `nome` | `VARCHAR(100) NOT NULL` | Nome |
| `email` | `VARCHAR(255) NOT NULL UNIQUE` | E-mail de login (minúsculas) |
| `senha_hash` | `VARCHAR(100) NOT NULL` | Hash bcrypt da senha |
| `criado_em` | `TIMESTAMP DEFAULT now()` | Data do cadastro |

### `itens_inventario`
| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `SERIAL PRIMARY KEY` | Identificador do item |
| `usuario_id` | `INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE` | Dono da skin |
| `skin_id` | `VARCHAR(50) NOT NULL` | Id da skin no catálogo (ex.: `skin-65604`) |
| `float` | `NUMERIC(10,9) NOT NULL` | Float informado pelo usuário |
| `stattrak` | `BOOLEAN NOT NULL DEFAULT false` | Se a skin é StatTrak |
| `preco_pago` | `NUMERIC(12,2) NOT NULL` | Valor pago em R$ |
| `data_compra` | `DATE` | Data da compra (opcional) |
| `criado_em` | `TIMESTAMP DEFAULT now()` | Data do cadastro |

### `cache_precos`
| Coluna | Tipo | Descrição |
|---|---|---|
| `fonte` | `VARCHAR(20) PRIMARY KEY` | `steam`, `skinport`, `csfloat`, `buff163` ou `cotacao` |
| `conteudo` | `JSONB NOT NULL` | Preços normalizados em USD (`{ "<market_hash_name>": { "preco", "fases"? } }`) ou, na linha `cotacao`, `{ "valor", "data" }` |
| `atualizado_em` | `TIMESTAMP NOT NULL` | Data e hora do download |

O desgaste, o preço atual e o lucro **não são salvos**: são calculados pelo service a cada requisição.

---

## 9. Endpoints da API

Todas as rotas ficam sob o prefixo `/api`. 🔒 = exige `Authorization: Bearer <token>` (sem token
válido → 401).

### Saúde
| Método | Rota | Descrição | Respostas |
|---|---|---|---|
| `GET` | `/api/health` | Confere se a API e o banco estão no ar | 200, 500 |

### Usuários e autenticação
| Método | Rota | Descrição | Respostas |
|---|---|---|---|
| `POST` | `/api/usuarios` | Cria uma conta e devolve o token | 201, 400, 409 |
| `POST` | `/api/auth/login` | Login, devolve o token | 200, 400, 401 |
| `GET` | `/api/usuarios/me` 🔒 | Dados do usuário logado | 200, 401 |
| `PUT` | `/api/usuarios/me` 🔒 | Edita nome, e-mail ou senha | 200, 400, 401, 409 |
| `DELETE` | `/api/usuarios/me` 🔒 | Exclui a conta e as skins dela | 204, 401 |

### Catálogo (público)
| Método | Rota | Descrição | Respostas |
|---|---|---|---|
| `GET` | `/api/catalogo?busca=` | Busca skins no catálogo | 200 |
| `GET` | `/api/catalogo/:skinId` | Detalhes de uma skin do catálogo | 200, 404 |

A busca exige pelo menos 2 caracteres, ignora maiúsculas e acentos, aceita as palavras em
qualquer ordem e devolve no máximo `limite` itens (padrão 20, máximo 50). Se o catálogo não
pôde ser baixado na inicialização, as rotas que dependem dele respondem `503`.

Exemplo de item do catálogo:
```json
{
  "id": "skin-91a429af4a60",
  "arma": "AK-47",
  "nome": "Redline",
  "nome_completo": "AK-47 | Redline",
  "imagem": "https://...",
  "raridade": { "nome": "Classified", "cor": "#d32ce6" },
  "min_float": 0.1,
  "max_float": 0.7,
  "stattrak": true,
  "souvenir": false,
  "sem_pintura": false,
  "fase": null
}
```

### Inventário (skins do usuário)
| Método | Rota | Descrição | Respostas |
|---|---|---|---|
| `GET` | `/api/inventario` 🔒 | Lista as skins do usuário. Filtros: `arma`, `desgaste`, `stattrak`, `ordenar` (`lucro`, `valor`, `data`) | 200, 401 |
| `GET` | `/api/inventario/resumo` 🔒 | Totais do inventário | 200, 401 |
| `GET` | `/api/inventario/:id` 🔒 | Detalhes de uma skin | 200, 401, 404 |
| `POST` | `/api/inventario` 🔒 | Cadastra uma skin | 201, 400, 401, 404 |
| `PUT` | `/api/inventario/:id` 🔒 | Edita float, StatTrak, preço pago ou data da compra | 200, 400, 401, 404 |
| `DELETE` | `/api/inventario/:id` 🔒 | Remove uma skin | 204, 401, 404 |

### Preços
| Método | Rota | Descrição | Respostas |
|---|---|---|---|
| `GET` | `/api/precos/status` | Data da última atualização de cada fonte | 200 |
| `POST` | `/api/precos/atualizar` 🔒 | Força a atualização de preços e cotação | 200, 401, 502 |

### Exemplo: `POST /api/usuarios`

Requisição:
```json
{ "nome": "Eduardo", "email": "eduardo@email.com", "senha": "minhasenha" }
```

Resposta `201`:
```json
{
  "usuario": { "id": 1, "nome": "Eduardo", "email": "eduardo@email.com", "criado_em": "2026-11-16T18:00:00.000Z" },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Exemplo: `POST /api/inventario`

Requisição (com `Authorization: Bearer <token>`):
```json
{
  "skin_id": "skin-xxxxx",
  "float": 0.162,
  "stattrak": true,
  "preco_pago": 85.00,
  "data_compra": "2026-10-02"
}
```

Resposta `201` (valores ilustrativos):
```json
{
  "id": 1,
  "skin_id": "skin-xxxxx",
  "arma": "AK-47",
  "nome": "Redline",
  "fase": null,
  "imagem": "https://...",
  "raridade": { "nome": "Classified", "cor": "#d32ce6" },
  "float": 0.162,
  "desgaste": "Field-Tested",
  "stattrak": true,
  "market_hash_name": "StatTrak™ AK-47 | Redline (Field-Tested)",
  "preco_pago": 85.00,
  "data_compra": "2026-10-02",
  "precos": {
    "steam": 246.11,
    "skinport": 132.55,
    "csfloat": 132.32,
    "buff163": 134.41
  },
  "valor_atual": 246.11,
  "fonte_valor_atual": "steam",
  "menor_preco": { "fonte": "csfloat", "valor": 132.32 },
  "lucro": 161.11,
  "variacao_percentual": 189.54,
  "criado_em": "2026-11-16T18:05:00.000Z"
}
```

### Exemplos de erro
```json
{ "erro": "Float 0.05 fora do intervalo desta skin (0.10 a 0.70)" }
```
```json
{ "erro": "E-mail já cadastrado" }
```

---

## 10. Como executar

### Variáveis de ambiente

```bash
cp .env.example .env
```

Troque o `JWT_SECRET` por um valor longo e aleatório. O backend lê o `backend/.env` (se existir)
e depois o `.env` da raiz.

### Com Docker (recomendado)

```bash
# desenvolvimento, com hot reload
docker compose -f docker-compose.dev.yml up --build
#   frontend: http://localhost:5173
#   API:      http://localhost:3001/api/health

# produção
docker compose up --build
#   app:      http://localhost:8080
```

### Sem Docker

Pré-requisitos: Node.js 22+ e um PostgreSQL rodando (pode ser só o do compose:
`docker compose -f docker-compose.dev.yml up postgres`). Nesse caso, use no `.env`
`DATABASE_URL=postgres://dwfinal:dwfinal@localhost:5433/dw_final`.

```bash
# backend
cd backend
npm install
npm run dev             # API em http://localhost:3000/api

# frontend
cd frontend
npm install
npm run dev             # app em http://localhost:5173 (proxy de /api para localhost:3000)
```

Na inicialização, o backend cria as tabelas automaticamente a partir do `schema.sql`.

---

## 11. Testes (backend)

Os testes usam **Jest** e **Supertest** e **não precisam de banco nem de internet**: os
repositories são trocados por versões em memória e o catálogo vem de uma fixture com um recorte
do `skins.json` real. Isso é possível porque os services recebem as dependências pelas factories.

```bash
cd backend
npm test                 # roda todos os testes
npm run test:watch       # roda de novo a cada alteração
npm run test:coverage    # gera o relatório de cobertura em backend/coverage/
```

```text
backend/tests/
├── setup-env.js                     # variáveis de ambiente dos testes (JWT_SECRET, BCRYPT_ROUNDS=4...)
├── helpers/
│   ├── catalogo.fixture.js          # skins de exemplo: AK, AWP, MP9 sem StatTrak, Karambit Doppler (e Ruby) e vanilla
│   ├── precos.fixture.js            # arquivos de preço no formato real de cada fonte + cotação de R$ 5,00
│   ├── repositories-em-memoria.js   # repositories falsos (com UNIQUE no e-mail e ON DELETE CASCADE)
│   └── contextos.js                 # monta os contextos como a factory, mas em memória
├── unit/
│   ├── usuario.service.test.js      # validações, hash bcrypt, login, JWT, troca de senha
│   ├── catalogo.service.test.js     # carga, busca, limite, 503 sem catálogo
│   ├── preco.service.test.js        # formato de cada fonte, conversão para R$, fases, falha parcial, cache
│   └── inventario.service.test.js   # desgaste, market_hash_name, validações, CRUD, isolamento entre usuários
└── integration/
    └── api.test.js                  # rotas HTTP de ponta a ponta com Supertest
```

O que é coberto:

| Área | Principais casos |
|---|---|
| Usuário | Senha salva só como hash bcrypt; `senha_hash` nunca sai na resposta; e-mail normalizado e único (409, inclusive em cadastro simultâneo); login com a mesma mensagem para e-mail inexistente e senha errada; troca de senha exige `senha_atual` |
| JWT | Token válido; token expirado, com outro segredo, sem assinatura (`alg: none`) ou com outro algoritmo → 401 |
| Catálogo | Busca sem acento e em qualquer ordem; limite; falha no download mantém o catálogo anterior; 503 antes de carregar |
| Preços | Extração do preço de cada fonte; conversão para R$; fases das Dopplers; fonte que falha mantém a cópia anterior; downloads simultâneos viram um só; cache restaurado do banco; validade de 24h |
| Inventário | Valor atual com troca de fonte, menor preço, lucro, variação e "sem preço"; todas as faixas de desgaste; `market_hash_name` comum, StatTrak, faca e faca sem pintura; float fora do intervalo; StatTrak inexistente; preço e data inválidos; data futura no fuso do Brasil |
| API | Rotas protegidas sem token → 401; CRUD completo; PUT ignora `skin_id`/`usuario_id`; um usuário não vê, edita nem exclui as skins de outro; JSON malformado → 400; rota inexistente → 404 |

Os repositories (SQL) e as factories não são cobertos por esses testes, porque dependem do
PostgreSQL. Eles são verificados rodando a API com o banco (Docker).

---

## 12. Divisão sugerida da equipe

| Integrante | Responsabilidade |
|---|---|
| 1 | Backend: CRUD de usuários (bcrypt + JWT), CRUD de skins, services, repositories, integração com as fontes externas e banco |
| 2 | Frontend: feature `inventario` e tela de inventário (resumo, filtros, cards) |
| 3 | Frontend: features `auth`, `catalogo` e `preco`, telas de login/registro/perfil, cadastro/edição e detalhes, estilo geral |

O andamento das tarefas fica no [KANBAN.md](KANBAN.md).
