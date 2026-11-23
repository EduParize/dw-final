import { api } from '../../../shared/api/client.js';

export const inventarioApi = {
  /** GET /inventario?arma=&desgaste=&stattrak=&ordenar= */
  listar: (filtros = {}, opcoes) => api.get('/inventario', { ...opcoes, query: filtros }),

  /** GET /inventario/resumo */
  resumo: (opcoes) => api.get('/inventario/resumo', opcoes),

  /** GET /inventario/:id */
  buscarPorId: (id, opcoes) => api.get(`/inventario/${encodeURIComponent(id)}`, opcoes),

  /** POST /inventario { skin_id, float, stattrak, preco_pago, data_compra } */
  cadastrar: (dados) => api.post('/inventario', dados),

  /** PUT /inventario/:id { float?, stattrak?, preco_pago?, data_compra? } */
  editar: (id, dados) => api.put(`/inventario/${encodeURIComponent(id)}`, dados),

  /** DELETE /inventario/:id */
  excluir: (id) => api.delete(`/inventario/${encodeURIComponent(id)}`),
};
