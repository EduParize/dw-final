/**
 * Repositories falsos, em memória, com a mesma interface dos repositories reais.
 * Imitam as restrições do PostgreSQL que os services tratam (UNIQUE no e-mail e
 * ON DELETE CASCADE dos itens), para os testes não dependerem de um banco rodando.
 */

function erroDoPostgres(code, mensagem) {
  const err = new Error(mensagem);
  err.code = code;
  return err;
}

export function criarUsuarioRepositoryEmMemoria() {
  const usuarios = new Map();
  let proximoId = 1;
  let aoExcluir = () => {};

  return {
    /** Usado pelo repository de inventário para simular o ON DELETE CASCADE. */
    aoExcluirUsuario(callback) {
      aoExcluir = callback;
    },

    /** Só para os testes: acesso direto às linhas "do banco". */
    linhas: usuarios,

    async criar({ nome, email, senhaHash }) {
      if ([...usuarios.values()].some((u) => u.email === email)) {
        throw erroDoPostgres('23505', 'duplicate key value violates unique constraint');
      }
      const usuario = { id: proximoId++, nome, email, senha_hash: senhaHash, criado_em: new Date() };
      usuarios.set(usuario.id, usuario);
      return { ...usuario };
    },

    async buscarPorId(id) {
      const usuario = usuarios.get(id);
      return usuario ? { ...usuario } : undefined;
    },

    async buscarPorEmail(email) {
      const usuario = [...usuarios.values()].find((u) => u.email === email);
      return usuario ? { ...usuario } : undefined;
    },

    async atualizar(id, { nome, email, senhaHash }) {
      const usuario = usuarios.get(id);
      if (!usuario) return undefined;
      if ([...usuarios.values()].some((u) => u.id !== id && u.email === email)) {
        throw erroDoPostgres('23505', 'duplicate key value violates unique constraint');
      }
      Object.assign(usuario, { nome, email, senha_hash: senhaHash });
      return { ...usuario };
    },

    async excluir(id) {
      const existia = usuarios.delete(id);
      if (existia) aoExcluir(id);
      return existia;
    },
  };
}

export function criarPrecoRepositoryEmMemoria() {
  const linhas = new Map();
  return {
    linhas,

    async listar() {
      return [...linhas.values()].map((linha) => structuredClone(linha));
    },

    async salvar(fonte, conteudo, atualizadoEm) {
      linhas.set(fonte, { fonte, conteudo: structuredClone(conteudo), atualizado_em: atualizadoEm });
    },
  };
}

export function criarInventarioRepositoryEmMemoria({ usuarioRepository } = {}) {
  const itens = new Map();
  let proximoId = 1;

  usuarioRepository?.aoExcluirUsuario((usuarioId) => {
    for (const [id, item] of itens) {
      if (item.usuario_id === usuarioId) itens.delete(id);
    }
  });

  const doUsuario = (usuarioId, id) => {
    const item = itens.get(id);
    return item && item.usuario_id === usuarioId ? item : undefined;
  };

  return {
    linhas: itens,

    async listarPorUsuario(usuarioId) {
      return [...itens.values()]
        .filter((item) => item.usuario_id === usuarioId)
        .sort((a, b) => b.id - a.id)
        .map((item) => ({ ...item }));
    },

    async buscarPorId(usuarioId, id) {
      const item = doUsuario(usuarioId, id);
      return item ? { ...item } : undefined;
    },

    async criar(usuarioId, { skinId, float, stattrak, precoPago, dataCompra }) {
      if (usuarioRepository && !(await usuarioRepository.buscarPorId(usuarioId))) {
        throw erroDoPostgres('23503', 'insert or update violates foreign key constraint');
      }
      const item = {
        id: proximoId++,
        usuario_id: usuarioId,
        skin_id: skinId,
        float,
        stattrak,
        preco_pago: precoPago,
        data_compra: dataCompra,
        criado_em: new Date(),
      };
      itens.set(item.id, item);
      return { ...item };
    },

    async atualizar(usuarioId, id, { float, stattrak, precoPago, dataCompra }) {
      const item = doUsuario(usuarioId, id);
      if (!item) return undefined;
      Object.assign(item, { float, stattrak, preco_pago: precoPago, data_compra: dataCompra });
      return { ...item };
    },

    async excluir(usuarioId, id) {
      const item = doUsuario(usuarioId, id);
      if (!item) return false;
      itens.delete(id);
      return true;
    },
  };
}
