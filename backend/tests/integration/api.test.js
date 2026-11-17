import request from 'supertest';
import { criarApp } from '../../src/app.js';
import { AK, AWP, KARAMBIT_SEM_PINTURA } from '../helpers/catalogo.fixture.js';
import { criarContextosDeTeste } from '../helpers/contextos.js';

/**
 * Testa as rotas de ponta a ponta (rota → middleware → controller → service),
 * com os repositories em memória no lugar do PostgreSQL.
 */
describe('API', () => {
  let app;

  beforeEach(async () => {
    app = criarApp(await criarContextosDeTeste());
  });

  async function registrar(nome = 'Ana', email = 'ana@email.com', senha = 'senha123') {
    const res = await request(app).post('/api/usuarios').send({ nome, email, senha });
    expect(res.status).toBe(201);
    return res.body.token;
  }

  const auth = (token) => ({ Authorization: `Bearer ${token}` });

  describe('erros gerais', () => {
    test('rota inexistente → 404 em JSON', async () => {
      const res = await request(app).get('/api/nao-existe');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ erro: 'Rota não encontrada: GET /api/nao-existe' });
    });

    test('JSON malformado → 400', async () => {
      const res = await request(app)
        .post('/api/usuarios')
        .set('Content-Type', 'application/json')
        .send('{"nome": "Ana",');
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ erro: 'JSON inválido no corpo da requisição' });
    });

    test('corpo vazio não quebra a rota → 400 de validação', async () => {
      const res = await request(app).post('/api/usuarios');
      expect(res.status).toBe(400);
      expect(res.body.erro).toBe('Nome é obrigatório');
    });
  });

  describe('usuários e autenticação', () => {
    test('POST /api/usuarios cria a conta → 201 com usuário e token', async () => {
      const res = await request(app)
        .post('/api/usuarios')
        .send({ nome: 'Ana', email: 'ana@email.com', senha: 'senha123' });

      expect(res.status).toBe(201);
      expect(res.body.usuario).toMatchObject({ id: 1, nome: 'Ana', email: 'ana@email.com' });
      expect(res.body.usuario).not.toHaveProperty('senha_hash');
      expect(res.body.token).toEqual(expect.any(String));
    });

    test('POST /api/usuarios com e-mail repetido → 409', async () => {
      await registrar();
      const res = await request(app)
        .post('/api/usuarios')
        .send({ nome: 'Outra', email: 'ANA@email.com', senha: 'senha123' });
      expect(res.status).toBe(409);
      expect(res.body).toEqual({ erro: 'E-mail já cadastrado' });
    });

    test('POST /api/auth/login → 200 com token, ou 401 com senha errada', async () => {
      await registrar();

      const ok = await request(app).post('/api/auth/login').send({ email: 'ana@email.com', senha: 'senha123' });
      expect(ok.status).toBe(200);
      expect(ok.body.token).toEqual(expect.any(String));

      const errado = await request(app).post('/api/auth/login').send({ email: 'ana@email.com', senha: 'xxxxxx' });
      expect(errado.status).toBe(401);
      expect(errado.body).toEqual({ erro: 'E-mail ou senha inválidos' });
    });

    test('GET /api/usuarios/me exige token', async () => {
      const semToken = await request(app).get('/api/usuarios/me');
      expect(semToken.status).toBe(401);
      expect(semToken.body).toEqual({ erro: 'Token não informado' });

      const tokenRuim = await request(app).get('/api/usuarios/me').set(auth('abc'));
      expect(tokenRuim.status).toBe(401);
      expect(tokenRuim.body).toEqual({ erro: 'Token inválido ou expirado' });

      const outroEsquema = await request(app).get('/api/usuarios/me').set('Authorization', 'Basic abc');
      expect(outroEsquema.status).toBe(401);
    });

    test('GET /api/usuarios/me devolve o usuário do token', async () => {
      const token = await registrar();
      const res = await request(app).get('/api/usuarios/me').set(auth(token));
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: 1, nome: 'Ana', email: 'ana@email.com' });
    });

    test('PUT /api/usuarios/me troca a senha e o login passa a usar a nova', async () => {
      const token = await registrar();

      const res = await request(app)
        .put('/api/usuarios/me')
        .set(auth(token))
        .send({ senha: 'novasenha', senha_atual: 'senha123' });
      expect(res.status).toBe(200);

      const login = await request(app).post('/api/auth/login').send({ email: 'ana@email.com', senha: 'novasenha' });
      expect(login.status).toBe(200);
    });

    test('PUT /api/usuarios/me com senha_atual errada → 400', async () => {
      const token = await registrar();
      const res = await request(app)
        .put('/api/usuarios/me')
        .set(auth(token))
        .send({ senha: 'novasenha', senha_atual: 'errada' });
      expect(res.status).toBe(400);
    });

    test('DELETE /api/usuarios/me → 204, apaga as skins e o token deixa de servir para o perfil', async () => {
      const token = await registrar();
      await request(app).post('/api/inventario').set(auth(token)).send({ skin_id: AK, float: 0.2, preco_pago: 10 });

      const res = await request(app).delete('/api/usuarios/me').set(auth(token));
      expect(res.status).toBe(204);

      const perfil = await request(app).get('/api/usuarios/me').set(auth(token));
      expect(perfil.status).toBe(401);

      const login = await request(app).post('/api/auth/login').send({ email: 'ana@email.com', senha: 'senha123' });
      expect(login.status).toBe(401);
    });
  });

  describe('catálogo (público)', () => {
    test('GET /api/catalogo?busca= funciona sem token', async () => {
      const res = await request(app).get('/api/catalogo').query({ busca: 'redline' });
      expect(res.status).toBe(200);
      expect(res.body.map((s) => s.nome_completo)).toEqual(
        expect.arrayContaining(['AK-47 | Redline', 'AWP | Redline']),
      );
    });

    test('GET /api/catalogo?busca=&limite=1', async () => {
      const res = await request(app).get('/api/catalogo').query({ busca: 'redline', limite: 1 });
      expect(res.body).toHaveLength(1);
    });

    test('GET /api/catalogo/:skinId → 200 ou 404', async () => {
      const ok = await request(app).get(`/api/catalogo/${AK}`);
      expect(ok.status).toBe(200);
      expect(ok.body).toMatchObject({ id: AK, min_float: 0.1, max_float: 0.7, stattrak: true });

      const inexistente = await request(app).get('/api/catalogo/skin-x');
      expect(inexistente.status).toBe(404);
      expect(inexistente.body).toEqual({ erro: 'Skin não encontrada no catálogo' });
    });
  });

  describe('preços', () => {
    test('GET /api/precos/status é público e traz a data de cada fonte e a cotação', async () => {
      const res = await request(app).get('/api/precos/status');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        atualizado_em: expect.any(String),
        fontes: {
          steam: expect.any(String),
          skinport: expect.any(String),
          csfloat: expect.any(String),
          buff163: expect.any(String),
          cotacao: expect.any(String),
        },
        cotacao_usd_brl: 5,
        atualizando: false,
      });
    });

    test('POST /api/precos/atualizar exige token', async () => {
      const res = await request(app).post('/api/precos/atualizar');
      expect(res.status).toBe(401);
    });

    test('POST /api/precos/atualizar baixa de novo e devolve o resultado de cada fonte', async () => {
      const token = await registrar();
      const res = await request(app).post('/api/precos/atualizar').set(auth(token));
      expect(res.status).toBe(200);
      expect(res.body.resultado).toEqual([
        { fonte: 'steam', ok: true },
        { fonte: 'skinport', ok: true },
        { fonte: 'csfloat', ok: true },
        { fonte: 'buff163', ok: true },
        { fonte: 'cotacao', ok: true },
      ]);
      expect(res.body.atualizado_em).toEqual(expect.any(String));
    });

    test('POST /api/precos/atualizar com todas as fontes fora do ar → 502', async () => {
      const foraDoAr = async () => {
        throw new Error('fora do ar');
      };
      app = criarApp(
        await criarContextosDeTeste({
          precosAtualizados: false,
          opcoesPreco: { baixarPrecos: foraDoAr, baixarCotacao: foraDoAr },
        }),
      );
      const token = await registrar();
      const res = await request(app).post('/api/precos/atualizar').set(auth(token));
      expect(res.status).toBe(502);
      expect(res.body).toEqual({ erro: 'Não foi possível atualizar os preços: todas as fontes falharam' });
    });
  });

  describe('inventário', () => {
    let token;
    beforeEach(async () => {
      token = await registrar();
    });

    test('todas as rotas exigem token', async () => {
      const rotas = [
        request(app).get('/api/inventario'),
        request(app).get('/api/inventario/1'),
        request(app).post('/api/inventario').send({}),
        request(app).put('/api/inventario/1').send({}),
        request(app).delete('/api/inventario/1'),
      ];
      for (const res of await Promise.all(rotas)) {
        expect(res.status).toBe(401);
      }
    });

    test('CRUD completo: cadastrar → listar → detalhar → editar → excluir', async () => {
      const criado = await request(app)
        .post('/api/inventario')
        .set(auth(token))
        .send({ skin_id: AK, float: 0.162, stattrak: true, preco_pago: 85, data_compra: '2025-10-02' });
      expect(criado.status).toBe(201);
      expect(criado.body).toMatchObject({
        skin_id: AK,
        desgaste: 'Field-Tested',
        market_hash_name: 'StatTrak™ AK-47 | Redline (Field-Tested)',
        preco_pago: 85,
        data_compra: '2025-10-02',
      });
      const { id } = criado.body;

      const lista = await request(app).get('/api/inventario').set(auth(token));
      expect(lista.status).toBe(200);
      expect(lista.body.map((i) => i.id)).toEqual([id]);

      const detalhe = await request(app).get(`/api/inventario/${id}`).set(auth(token));
      expect(detalhe.status).toBe(200);
      expect(detalhe.body.id).toBe(id);

      const editado = await request(app)
        .put(`/api/inventario/${id}`)
        .set(auth(token))
        .send({ float: 0.4, preco_pago: 90 });
      expect(editado.status).toBe(200);
      expect(editado.body).toMatchObject({ float: 0.4, desgaste: 'Well-Worn', preco_pago: 90, stattrak: true });

      const excluido = await request(app).delete(`/api/inventario/${id}`).set(auth(token));
      expect(excluido.status).toBe(204);

      const depois = await request(app).get(`/api/inventario/${id}`).set(auth(token));
      expect(depois.status).toBe(404);
    });

    test('PUT ignora campos que não são editáveis (skin_id, usuario_id, id)', async () => {
      const { body: item } = await request(app)
        .post('/api/inventario')
        .set(auth(token))
        .send({ skin_id: AK, float: 0.2, preco_pago: 10 });

      const res = await request(app)
        .put(`/api/inventario/${item.id}`)
        .set(auth(token))
        .send({ skin_id: AWP, usuario_id: 999, id: 999, preco_pago: 20 });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: item.id, skin_id: AK, preco_pago: 20 });
    });

    test('PUT só com campos não editáveis → 400', async () => {
      const { body: item } = await request(app)
        .post('/api/inventario')
        .set(auth(token))
        .send({ skin_id: AK, float: 0.2, preco_pago: 10 });

      const res = await request(app).put(`/api/inventario/${item.id}`).set(auth(token)).send({ skin_id: AWP });
      expect(res.status).toBe(400);
    });

    test('POST com float fora do intervalo → 400 com a mensagem do README', async () => {
      const res = await request(app)
        .post('/api/inventario')
        .set(auth(token))
        .send({ skin_id: AK, float: 0.05, preco_pago: 85 });
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ erro: 'Float 0.05 fora do intervalo desta skin (0.10 a 0.70)' });
    });

    test('POST com skin inexistente → 404', async () => {
      const res = await request(app)
        .post('/api/inventario')
        .set(auth(token))
        .send({ skin_id: 'skin-x', float: 0.2, preco_pago: 85 });
      expect(res.status).toBe(404);
    });

    test('a resposta traz os preços em R$, o valor atual e o lucro', async () => {
      const res = await request(app)
        .post('/api/inventario')
        .set(auth(token))
        .send({ skin_id: AK, float: 0.162, preco_pago: 85 });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        precos: { steam: 217.8, skinport: 114.8, csfloat: 116.35, buff163: 120.3 },
        valor_atual: 217.8,
        fonte_valor_atual: 'steam',
        menor_preco: { fonte: 'skinport', valor: 114.8 },
        lucro: 132.8,
        variacao_percentual: 156.24,
      });
    });

    test('POST de faca sem pintura → desgaste null', async () => {
      const res = await request(app)
        .post('/api/inventario')
        .set(auth(token))
        .send({ skin_id: KARAMBIT_SEM_PINTURA, float: 0.3, preco_pago: 3000 });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ desgaste: null, market_hash_name: '★ Karambit' });
    });

    test('um usuário não vê, não edita e não exclui as skins de outro', async () => {
      const { body: item } = await request(app)
        .post('/api/inventario')
        .set(auth(token))
        .send({ skin_id: AK, float: 0.2, preco_pago: 10 });

      const tokenBia = await registrar('Bia', 'bia@email.com');

      const lista = await request(app).get('/api/inventario').set(auth(tokenBia));
      expect(lista.body).toEqual([]);

      const detalhe = await request(app).get(`/api/inventario/${item.id}`).set(auth(tokenBia));
      expect(detalhe.status).toBe(404);

      const edicao = await request(app).put(`/api/inventario/${item.id}`).set(auth(tokenBia)).send({ preco_pago: 1 });
      expect(edicao.status).toBe(404);

      const exclusao = await request(app).delete(`/api/inventario/${item.id}`).set(auth(tokenBia));
      expect(exclusao.status).toBe(404);

      const doDono = await request(app).get(`/api/inventario/${item.id}`).set(auth(token));
      expect(doDono.body.preco_pago).toBe(10);
    });

    test('GET /api/inventario aceita filtros e ordenação pela URL', async () => {
      const cadastrar = (dados) => request(app).post('/api/inventario').set(auth(token)).send(dados);
      const { body: ak } = await cadastrar({ skin_id: AK, float: 0.162, preco_pago: 85 });
      const { body: awp } = await cadastrar({ skin_id: AWP, float: 0.2, preco_pago: 100 });

      const porArma = await request(app).get('/api/inventario').query({ arma: 'AWP' }).set(auth(token));
      expect(porArma.status).toBe(200);
      expect(porArma.body.map((i) => i.id)).toEqual([awp.id]);

      const porLucro = await request(app).get('/api/inventario').query({ ordenar: 'lucro' }).set(auth(token));
      expect(porLucro.body.map((i) => i.id)).toEqual([ak.id, awp.id]);
    });

    test('GET /api/inventario com filtro inválido → 400', async () => {
      const res = await request(app).get('/api/inventario').query({ ordenar: 'nome' }).set(auth(token));
      expect(res.status).toBe(400);
      expect(res.body.erro).toMatch(/Ordenação inválida/);
    });

    test('GET /api/inventario?arma=a&arma=b (filtro repetido) → 400', async () => {
      const res = await request(app).get('/api/inventario?arma=AK-47&arma=AWP').set(auth(token));
      expect(res.status).toBe(400);
    });

    test('GET /api/inventario/resumo não é confundido com um id', async () => {
      await request(app).post('/api/inventario').set(auth(token)).send({ skin_id: AK, float: 0.162, preco_pago: 85 });

      const res = await request(app).get('/api/inventario/resumo').set(auth(token));
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        quantidade_itens: 1,
        total_pago: 85,
        valor_atual_total: 217.8,
        lucro_total: 132.8,
        variacao_percentual: 156.24,
      });
    });

    test('GET /api/inventario/resumo exige token', async () => {
      const res = await request(app).get('/api/inventario/resumo');
      expect(res.status).toBe(401);
    });

    test('id que não é número → 404 (sem erro 500)', async () => {
      const res = await request(app).get('/api/inventario/abc').set(auth(token));
      expect(res.status).toBe(404);
    });
  });
});
