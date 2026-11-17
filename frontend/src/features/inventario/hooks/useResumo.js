import { useRequisicao } from '../../../shared/hooks/useRequisicao.js';
import { inventarioApi } from '../api/inventario.api.js';

/** Totais do inventário (total pago, valor atual, lucro, variação, destaques). */
export function useResumo() {
  return useRequisicao((signal) => inventarioApi.resumo({ signal }), []);
}
