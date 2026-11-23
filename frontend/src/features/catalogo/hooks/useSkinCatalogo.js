import { useRequisicao } from '../../../shared/hooks/useRequisicao.js';
import { catalogoApi } from '../api/catalogo.api.js';

/** Uma skin do catálogo pelo id (para saber min/max float e StatTrak na edição e no detalhe). */
export function useSkinCatalogo(skinId) {
  return useRequisicao(
    (signal) => (skinId ? catalogoApi.obter(skinId, { signal }) : Promise.resolve(null)),
    [skinId],
  );
}
