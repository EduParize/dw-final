import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { criarUsuarioService } from '../../src/domain/usuario/service/usuario.service.js';
import {
  ConflictError,
  UnauthorizedError,
  ValidationError,
} from '../../src/domain/common/errors/index.js';
import { criarUsuarioRepositoryEmMemoria } from '../helpers/repositories-em-memoria.js';

const SEGREDO = process.env.JWT_SECRET;

describe('usuarioService', () => {
  let repo;
  let service;

  const cadastroValido = (extra = {}) => ({
    nome: 'Eduardo',
    email: 'eduardo@email.com',
    senha: 'minhasenha',
    ...extra,
  });

  beforeEach(() => {
    repo = criarUsuarioRepositoryEmMemoria();
    service = criarUsuarioService({ usuarioRepository: repo });
  });

  describe('cadastrar', () => {
    test('cria o usuário e devolve os dados públicos e um token', async () => {
      const { usuario, token } = await service.cadastrar(cadastroValido());

      expect(usuario).toEqual({
        id: 1,
        nome: 'Eduardo',
        email: 'eduardo@email.com',
        criado_em: expect.any(Date),
      });
      expect(typeof token).toBe('string');
    });

    test('nunca devolve a senha nem o hash', async () => {
      const resposta = await service.cadastrar(cadastroValido());
      const texto = JSON.stringify(resposta);
      expect(texto).not.toContain('senha');
      expect(texto).not.toContain('minhasenha');
    });

    test('salva a senha com hash bcrypt, não em texto puro', async () => {
      await service.cadastrar(cadastroValido());
      const { senha_hash: hash } = repo.linhas.get(1);

      expect(hash).not.toBe('minhasenha');
      expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/);
      await expect(bcrypt.compare('minhasenha', hash)).resolves.toBe(true);
    });

    test('o token tem o id do usuário no sub e é assinado com HS256', async () => {
      const { token } = await service.cadastrar(cadastroValido());
      const payload = jwt.verify(token, SEGREDO, { algorithms: ['HS256'] });

      expect(payload.sub).toBe('1');
      expect(payload.email).toBe('eduardo@email.com');
      expect(payload.exp).toBeGreaterThan(payload.iat);
    });

    test('normaliza o e-mail (minúsculas, sem espaços) e o nome (sem espaços nas pontas)', async () => {
      const { usuario } = await service.cadastrar(
        cadastroValido({ nome: '  Eduardo  ', email: '  Eduardo@Email.COM ' }),
      );
      expect(usuario.nome).toBe('Eduardo');
      expect(usuario.email).toBe('eduardo@email.com');
    });

    test('e-mail já cadastrado → 409, mesmo com maiúsculas diferentes', async () => {
      await service.cadastrar(cadastroValido());
      await expect(service.cadastrar(cadastroValido({ email: 'EDUARDO@email.com' }))).rejects.toThrow(
        new ConflictError('E-mail já cadastrado'),
      );
    });

    test('cadastro simultâneo: o UNIQUE do banco vira 409', async () => {
      // As duas requisições passam pela checagem antes de qualquer uma salvar.
      const [a, b] = await Promise.allSettled([
        service.cadastrar(cadastroValido()),
        service.cadastrar(cadastroValido()),
      ]);
      expect([a.status, b.status].sort()).toEqual(['fulfilled', 'rejected']);
      const erro = a.status === 'rejected' ? a.reason : b.reason;
      expect(erro).toBeInstanceOf(ConflictError);
    });

    test.each([
      ['nome ausente', { nome: undefined }, 'Nome é obrigatório'],
      ['nome só com espaços', { nome: '   ' }, 'Nome é obrigatório'],
      ['nome com mais de 100 caracteres', { nome: 'a'.repeat(101) }, 'no máximo 100 caracteres'],
      ['e-mail ausente', { email: undefined }, 'E-mail é obrigatório'],
      ['e-mail sem @', { email: 'eduardo.email.com' }, 'E-mail inválido'],
      ['e-mail sem domínio', { email: 'eduardo@email' }, 'E-mail inválido'],
      ['senha ausente', { senha: undefined }, 'Senha é obrigatória'],
      ['senha curta', { senha: '12345' }, 'no mínimo 6 caracteres'],
      ['senha maior que o limite do bcrypt', { senha: 'a'.repeat(73) }, 'no máximo 72 bytes'],
    ])('%s → 400', async (_, extra, mensagem) => {
      const promessa = service.cadastrar(cadastroValido(extra));
      await expect(promessa).rejects.toThrow(ValidationError);
      await expect(service.cadastrar(cadastroValido(extra))).rejects.toThrow(mensagem);
    });

    test('senha com exatamente 6 caracteres é aceita', async () => {
      await expect(service.cadastrar(cadastroValido({ senha: '123456' }))).resolves.toBeDefined();
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await service.cadastrar(cadastroValido());
    });

    test('credenciais certas devolvem usuário e token', async () => {
      const { usuario, token } = await service.login({ email: 'eduardo@email.com', senha: 'minhasenha' });
      expect(usuario.id).toBe(1);
      expect(service.verificarToken(token)).toEqual({ id: 1, email: 'eduardo@email.com' });
    });

    test('aceita o e-mail com maiúsculas e espaços', async () => {
      await expect(service.login({ email: ' EDUARDO@email.com ', senha: 'minhasenha' })).resolves.toBeDefined();
    });

    test('senha errada e e-mail inexistente dão a mesma resposta (401)', async () => {
      const senhaErrada = service.login({ email: 'eduardo@email.com', senha: 'errada' });
      const emailInexistente = service.login({ email: 'ninguem@email.com', senha: 'minhasenha' });

      await expect(senhaErrada).rejects.toThrow(new UnauthorizedError('E-mail ou senha inválidos'));
      await expect(emailInexistente).rejects.toThrow(new UnauthorizedError('E-mail ou senha inválidos'));
    });

    test.each([
      [{ email: 'eduardo@email.com' }],
      [{ senha: 'minhasenha' }],
      [{ email: '   ', senha: 'minhasenha' }],
      [{ email: 123, senha: 'minhasenha' }],
    ])('campos ausentes ou inválidos → 400 (%p)', async (dados) => {
      await expect(service.login(dados)).rejects.toThrow('E-mail e senha são obrigatórios');
    });
  });

  describe('verificarToken', () => {
    test('token válido devolve { id, email }', async () => {
      const { token } = await service.cadastrar(cadastroValido());
      expect(service.verificarToken(token)).toEqual({ id: 1, email: 'eduardo@email.com' });
    });

    test.each([
      ['texto qualquer', () => 'nao-e-um-jwt'],
      ['assinado com outro segredo', () => jwt.sign({}, 'outro-segredo', { subject: '1' })],
      ['expirado', () => jwt.sign({}, SEGREDO, { subject: '1', expiresIn: -10 })],
      ['sub que não é número', () => jwt.sign({}, SEGREDO, { subject: 'abc' })],
      ['sem assinatura (alg none)', () => jwt.sign({}, null, { subject: '1', algorithm: 'none' })],
      ['outro algoritmo (HS512)', () => jwt.sign({}, SEGREDO, { subject: '1', algorithm: 'HS512' })],
    ])('%s → 401', (_, gerar) => {
      expect(() => service.verificarToken(gerar())).toThrow(
        new UnauthorizedError('Token inválido ou expirado'),
      );
    });
  });

  describe('obterPerfil', () => {
    test('devolve os dados públicos', async () => {
      await service.cadastrar(cadastroValido());
      await expect(service.obterPerfil(1)).resolves.toEqual({
        id: 1,
        nome: 'Eduardo',
        email: 'eduardo@email.com',
        criado_em: expect.any(Date),
      });
    });

    test('usuário que não existe mais → 401', async () => {
      await expect(service.obterPerfil(42)).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('atualizar', () => {
    beforeEach(async () => {
      await service.cadastrar(cadastroValido());
      await service.cadastrar(cadastroValido({ nome: 'Bia', email: 'bia@email.com' }));
    });

    test('altera só o nome', async () => {
      const usuario = await service.atualizar(1, { nome: 'Edu' });
      expect(usuario).toMatchObject({ nome: 'Edu', email: 'eduardo@email.com' });
    });

    test('altera o e-mail (normalizado)', async () => {
      const usuario = await service.atualizar(1, { email: 'NOVO@email.com' });
      expect(usuario.email).toBe('novo@email.com');
    });

    test('manter o próprio e-mail não dá conflito', async () => {
      await expect(service.atualizar(1, { email: 'eduardo@email.com' })).resolves.toBeDefined();
    });

    test('e-mail de outro usuário → 409', async () => {
      await expect(service.atualizar(1, { email: 'bia@email.com' })).rejects.toThrow(ConflictError);
    });

    test('troca a senha com a senha_atual certa', async () => {
      await service.atualizar(1, { senha: 'senhanova', senha_atual: 'minhasenha' });

      await expect(service.login({ email: 'eduardo@email.com', senha: 'senhanova' })).resolves.toBeDefined();
      await expect(service.login({ email: 'eduardo@email.com', senha: 'minhasenha' })).rejects.toThrow(
        UnauthorizedError,
      );
    });

    test('trocar a senha sem senha_atual → 400', async () => {
      await expect(service.atualizar(1, { senha: 'senhanova' })).rejects.toThrow(
        'Informe a senha_atual para trocar a senha',
      );
    });

    test('senha_atual errada → 400 (não 401, para o frontend não deslogar)', async () => {
      const promessa = service.atualizar(1, { senha: 'senhanova', senha_atual: 'errada' });
      await expect(promessa).rejects.toThrow(new ValidationError('Senha atual incorreta'));
    });

    test('nova senha curta → 400', async () => {
      await expect(service.atualizar(1, { senha: '123', senha_atual: 'minhasenha' })).rejects.toThrow(
        'no mínimo 6 caracteres',
      );
    });

    test('sem nenhum campo → 400', async () => {
      await expect(service.atualizar(1, {})).rejects.toThrow('Informe ao menos um campo para atualizar');
    });

    test('nunca devolve o hash', async () => {
      const usuario = await service.atualizar(1, { nome: 'Edu' });
      expect(usuario).not.toHaveProperty('senha_hash');
    });

    test('usuário que não existe mais → 401', async () => {
      await expect(service.atualizar(42, { nome: 'X' })).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('excluir', () => {
    test('remove o usuário', async () => {
      await service.cadastrar(cadastroValido());
      await service.excluir(1);
      expect(repo.linhas.size).toBe(0);
    });

    test('usuário que não existe → 401', async () => {
      await expect(service.excluir(42)).rejects.toThrow(UnauthorizedError);
    });
  });
});
