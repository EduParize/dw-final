// Único wrapper de fetch do frontend: prefixo /api, token JWT e erros no formato { erro }.
// As features chamam api.get/post/put/delete; as páginas nunca chamam fetch direto.

const URL_BASE = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/+$/, '');
const CHAVE_TOKEN = 'dw-final:token';

export class ErroApi extends Error {
  constructor(mensagem, status) {
    super(mensagem);
    this.name = 'ErroApi';
    this.status = status;
  }
}

// O localStorage pode estar bloqueado (aba anônima, cookies desativados): nesse caso o token
// fica só em memória e a sessão dura até recarregar a página.
let tokenEmMemoria = null;

export function obterToken() {
  try {
    return localStorage.getItem(CHAVE_TOKEN) ?? tokenEmMemoria;
  } catch {
    return tokenEmMemoria;
  }
}

export function salvarToken(token) {
  tokenEmMemoria = token;
  try {
    localStorage.setItem(CHAVE_TOKEN, token);
  } catch {
    /* fica só em memória */
  }
}

export function removerToken() {
  tokenEmMemoria = null;
  try {
    localStorage.removeItem(CHAVE_TOKEN);
  } catch {
    /* nada a remover */
  }
}

// Quem cuida da sessão (useAuth) se registra aqui para ser avisado de um 401.
let aoNaoAutorizado = null;

export function definirAoNaoAutorizado(callback) {
  aoNaoAutorizado = callback;
}

function montarUrl(caminho, query) {
  const parametros = new URLSearchParams();
  for (const [chave, valor] of Object.entries(query ?? {})) {
    if (valor !== undefined && valor !== null && valor !== '') {
      parametros.set(chave, String(valor));
    }
  }
  const texto = parametros.toString();
  return `${URL_BASE}${caminho}${texto ? `?${texto}` : ''}`;
}

async function requisitar(caminho, { metodo = 'GET', corpo, query, signal } = {}) {
  const token = obterToken();
  const headers = { Accept: 'application/json' };
  if (corpo !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let resposta;
  try {
    resposta = await fetch(montarUrl(caminho, query), {
      method: metodo,
      headers,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw err;
    }
    throw new ErroApi('Não foi possível conectar ao servidor. Tente de novo em instantes.', 0);
  }

  if (resposta.status === 204) {
    return null;
  }

  const texto = await resposta.text();
  let dados = null;
  if (texto) {
    try {
      dados = JSON.parse(texto);
    } catch {
      dados = null;
    }
  }

  if (!resposta.ok) {
    // 401 com token = sessão expirada ou conta excluída: desloga. Sem token (ex.: senha errada
    // no login) é só um erro do formulário.
    if (resposta.status === 401 && token) {
      removerToken();
      aoNaoAutorizado?.();
    }
    throw new ErroApi(dados?.erro ?? `Erro inesperado do servidor (${resposta.status})`, resposta.status);
  }

  return dados;
}

export const api = {
  get: (caminho, opcoes) => requisitar(caminho, { ...opcoes, metodo: 'GET' }),
  post: (caminho, corpo, opcoes) => requisitar(caminho, { ...opcoes, metodo: 'POST', corpo }),
  put: (caminho, corpo, opcoes) => requisitar(caminho, { ...opcoes, metodo: 'PUT', corpo }),
  delete: (caminho, opcoes) => requisitar(caminho, { ...opcoes, metodo: 'DELETE' }),
};
