import { api } from '../../../shared/api/client.js';

export const precoApi = {
  /** GET /precos/status → { atualizado_em, fontes, cotacao_usd_brl, atualizando } */
  status: (opcoes) => api.get('/precos/status', opcoes),

  /** POST /precos/atualizar (com token) → status + resultado por fonte; 502 se todas falharem */
  atualizar: () => api.post('/precos/atualizar'),
};
