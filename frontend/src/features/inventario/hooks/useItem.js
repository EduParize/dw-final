import { useRequisicao } from '../../../shared/hooks/useRequisicao.js';
import { inventarioApi } from '../api/inventario.api.js';

/** Uma skin do inventário pelo id (404 se não existir ou for de outro usuário). */
export function useItem(id) {
  return useRequisicao((signal) => inventarioApi.buscarPorId(id, { signal }), [id]);
}
