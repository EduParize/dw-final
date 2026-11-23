import { api } from '../../../shared/api/client.js';

export const BUSCA_MINIMA = 2;

export const catalogoApi = {
  /** GET /catalogo?busca=&limite= → lista de skins do catálogo */
  buscar: (busca, { limite = 20, signal } = {}) => api.get('/catalogo', { query: { busca, limite }, signal }),

  /** GET /catalogo/:skinId → skin do catálogo (min/max float, StatTrak, sem_pintura...) */
  obter: (skinId, opcoes) => api.get(`/catalogo/${encodeURIComponent(skinId)}`, opcoes),
};
