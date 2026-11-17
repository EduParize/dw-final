import { useRequisicao } from '../../../shared/hooks/useRequisicao.js';
import { inventarioApi } from '../api/inventario.api.js';

/** Lista as skins do usuário com os filtros e a ordenação (feitos no backend). */
export function useInventario({ arma, desgaste, stattrak, ordenar } = {}) {
  return useRequisicao(
    (signal) => inventarioApi.listar({ arma, desgaste, stattrak, ordenar }, { signal }),
    [arma, desgaste, stattrak, ordenar],
  );
}
