import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  definirAoNaoAutorizado,
  obterToken,
  removerToken,
  salvarToken,
} from '../../../shared/api/client.js';
import { authApi } from '../api/auth.api.js';

const AuthContext = createContext(null);

/**
 * Sessão do usuário: token salvo, dados do usuário logado, login, registro e logout.
 * Com um token salvo, busca o perfil ao abrir o app; qualquer 401 da API desloga.
 */
export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => obterToken());
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(() => Boolean(obterToken()));
  const [erroSessao, setErroSessao] = useState(null);
  const [tentativa, setTentativa] = useState(0);

  const sair = useCallback(() => {
    removerToken();
    setToken(null);
    setUsuario(null);
    setErroSessao(null);
  }, []);

  useEffect(() => {
    definirAoNaoAutorizado(sair);
    return () => definirAoNaoAutorizado(null);
  }, [sair]);

  // Token salvo de uma visita anterior: confere se ainda vale e carrega o usuário.
  useEffect(() => {
    if (!token || usuario) {
      setCarregando(false);
      return undefined;
    }
    const controle = new AbortController();
    setCarregando(true);
    setErroSessao(null);
    authApi
      .perfil({ signal: controle.signal })
      .then((dados) => setUsuario(dados))
      .catch((erro) => {
        // 401 já deslogou pelo client; outro erro (servidor fora do ar) mantém o token.
        if (!controle.signal.aborted && erro.status !== 401) {
          setErroSessao(erro);
        }
      })
      .finally(() => {
        if (!controle.signal.aborted) {
          setCarregando(false);
        }
      });
    return () => controle.abort();
    // `usuario` fica de fora: depois do login ele já vem preenchido junto com o token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, tentativa]);

  const iniciarSessao = useCallback(({ usuario: novoUsuario, token: novoToken }) => {
    salvarToken(novoToken);
    setUsuario(novoUsuario);
    setToken(novoToken);
    setErroSessao(null);
  }, []);

  const entrar = useCallback(
    async (credenciais) => iniciarSessao(await authApi.login(credenciais)),
    [iniciarSessao],
  );

  const registrar = useCallback(
    async (dados) => iniciarSessao(await authApi.registrar(dados)),
    [iniciarSessao],
  );

  const editarPerfil = useCallback(async (dados) => {
    const atualizado = await authApi.editarPerfil(dados);
    setUsuario(atualizado);
    return atualizado;
  }, []);

  const excluirConta = useCallback(async () => {
    await authApi.excluirConta();
    sair();
  }, [sair]);

  const valor = useMemo(
    () => ({
      usuario,
      token,
      logado: Boolean(token && usuario),
      carregando,
      erroSessao,
      tentarNovamente: () => setTentativa((n) => n + 1),
      entrar,
      registrar,
      sair,
      editarPerfil,
      excluirConta,
    }),
    [usuario, token, carregando, erroSessao, entrar, registrar, sair, editarPerfil, excluirConta],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  }
  return contexto;
}
