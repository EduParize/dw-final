import { api } from '../../../shared/api/client.js';

export const authApi = {
  /** POST /usuarios → { usuario, token } */
  registrar: ({ nome, email, senha }) => api.post('/usuarios', { nome, email, senha }),

  /** POST /auth/login → { usuario, token } */
  login: ({ email, senha }) => api.post('/auth/login', { email, senha }),

  /** GET /usuarios/me → usuario */
  perfil: (opcoes) => api.get('/usuarios/me', opcoes),

  /** PUT /usuarios/me (parcial: nome, email, senha + senha_atual) → usuario */
  editarPerfil: (dados) => api.put('/usuarios/me', dados),

  /** DELETE /usuarios/me → 204 */
  excluirConta: () => api.delete('/usuarios/me'),
};
