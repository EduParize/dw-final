import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../../configuration/env.js';
import { ConflictError, UnauthorizedError, ValidationError } from '../../common/errors/index.js';

const NOME_MAXIMO = 100;
const EMAIL_MAXIMO = 255;
const SENHA_MINIMA = 6;
const SENHA_MAXIMA_BYTES = 72; // limite do bcrypt
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MENSAGEM_LOGIN = 'E-mail ou senha inválidos';
const EMAIL_DUPLICADO = 'E-mail já cadastrado';
const VIOLACAO_UNICIDADE = '23505'; // código do PostgreSQL

// Hash descartável: quando o e-mail não existe ainda gastamos um bcrypt.compare,
// para o tempo da resposta não revelar quais e-mails estão cadastrados.
const HASH_DESCARTAVEL = bcrypt.hashSync('senha-descartavel', env.bcryptRounds);

function validarNome(nome) {
  if (typeof nome !== 'string' || nome.trim() === '') {
    throw new ValidationError('Nome é obrigatório');
  }
  const limpo = nome.trim();
  if (limpo.length > NOME_MAXIMO) {
    throw new ValidationError(`Nome deve ter no máximo ${NOME_MAXIMO} caracteres`);
  }
  return limpo;
}

function validarEmail(email) {
  if (typeof email !== 'string' || email.trim() === '') {
    throw new ValidationError('E-mail é obrigatório');
  }
  const limpo = email.trim().toLowerCase();
  if (limpo.length > EMAIL_MAXIMO || !REGEX_EMAIL.test(limpo)) {
    throw new ValidationError('E-mail inválido');
  }
  return limpo;
}

function validarSenha(senha) {
  if (typeof senha !== 'string' || senha === '') {
    throw new ValidationError('Senha é obrigatória');
  }
  if (senha.length < SENHA_MINIMA) {
    throw new ValidationError(`A senha deve ter no mínimo ${SENHA_MINIMA} caracteres`);
  }
  if (Buffer.byteLength(senha, 'utf8') > SENHA_MAXIMA_BYTES) {
    throw new ValidationError(`A senha deve ter no máximo ${SENHA_MAXIMA_BYTES} bytes`);
  }
}

/** Só estes campos saem da API: o senha_hash nunca é devolvido. */
function publico(usuario) {
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    criado_em: usuario.criado_em,
  };
}

/** Duas requisições simultâneas podem passar pela checagem de e-mail; o UNIQUE do banco pega a segunda. */
function traduzirErroDeBanco(err) {
  if (err.code === VIOLACAO_UNICIDADE) {
    return new ConflictError(EMAIL_DUPLICADO);
  }
  return err;
}

export function criarUsuarioService({ usuarioRepository }) {
  function gerarToken(usuario) {
    return jwt.sign({ email: usuario.email }, env.jwtSecret, {
      subject: String(usuario.id),
      expiresIn: env.jwtExpiresIn,
      algorithm: 'HS256',
    });
  }

  return {
    async cadastrar({ nome, email, senha }) {
      const nomeValido = validarNome(nome);
      const emailValido = validarEmail(email);
      validarSenha(senha);

      if (await usuarioRepository.buscarPorEmail(emailValido)) {
        throw new ConflictError(EMAIL_DUPLICADO);
      }

      const senhaHash = await bcrypt.hash(senha, env.bcryptRounds);
      let usuario;
      try {
        usuario = await usuarioRepository.criar({
          nome: nomeValido,
          email: emailValido,
          senhaHash,
        });
      } catch (err) {
        throw traduzirErroDeBanco(err);
      }

      return { usuario: publico(usuario), token: gerarToken(usuario) };
    },

    async login({ email, senha }) {
      if (typeof email !== 'string' || typeof senha !== 'string' || !email.trim() || !senha) {
        throw new ValidationError('E-mail e senha são obrigatórios');
      }

      const usuario = await usuarioRepository.buscarPorEmail(email.trim().toLowerCase());
      const senhaConfere = await bcrypt.compare(senha, usuario?.senha_hash ?? HASH_DESCARTAVEL);
      if (!usuario || !senhaConfere) {
        throw new UnauthorizedError(MENSAGEM_LOGIN);
      }

      return { usuario: publico(usuario), token: gerarToken(usuario) };
    },

    /** Valida o JWT e devolve { id, email }. Qualquer problema vira 401. */
    verificarToken(token) {
      try {
        const payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
        const id = Number(payload.sub);
        if (!Number.isInteger(id)) {
          throw new Error('sub inválido');
        }
        return { id, email: payload.email };
      } catch {
        throw new UnauthorizedError('Token inválido ou expirado');
      }
    },

    async obterPerfil(id) {
      const usuario = await usuarioRepository.buscarPorId(id);
      if (!usuario) {
        throw new UnauthorizedError('Usuário não encontrado');
      }
      return publico(usuario);
    },

    /** Edição parcial: só altera o que veio. Trocar a senha exige a senha atual. */
    async atualizar(id, { nome, email, senha, senha_atual: senhaAtual }) {
      const atual = await usuarioRepository.buscarPorId(id);
      if (!atual) {
        throw new UnauthorizedError('Usuário não encontrado');
      }

      const mudaNome = nome !== undefined;
      const mudaEmail = email !== undefined;
      const mudaSenha = senha !== undefined;
      if (!mudaNome && !mudaEmail && !mudaSenha) {
        throw new ValidationError('Informe ao menos um campo para atualizar: nome, email ou senha');
      }

      let novoNome = atual.nome;
      let novoEmail = atual.email;
      let novoHash = atual.senha_hash;

      if (mudaNome) {
        novoNome = validarNome(nome);
      }

      if (mudaEmail) {
        novoEmail = validarEmail(email);
        if (novoEmail !== atual.email && (await usuarioRepository.buscarPorEmail(novoEmail))) {
          throw new ConflictError(EMAIL_DUPLICADO);
        }
      }

      if (mudaSenha) {
        validarSenha(senha);
        if (typeof senhaAtual !== 'string' || senhaAtual === '') {
          throw new ValidationError('Informe a senha_atual para trocar a senha');
        }
        // 400 (e não 401): o frontend desloga o usuário em qualquer 401.
        if (!(await bcrypt.compare(senhaAtual, atual.senha_hash))) {
          throw new ValidationError('Senha atual incorreta');
        }
        novoHash = await bcrypt.hash(senha, env.bcryptRounds);
      }

      try {
        const atualizado = await usuarioRepository.atualizar(id, {
          nome: novoNome,
          email: novoEmail,
          senhaHash: novoHash,
        });
        return publico(atualizado);
      } catch (err) {
        throw traduzirErroDeBanco(err);
      }
    },

    async excluir(id) {
      const existia = await usuarioRepository.excluir(id);
      if (!existia) {
        throw new UnauthorizedError('Usuário não encontrado');
      }
    },
  };
}
