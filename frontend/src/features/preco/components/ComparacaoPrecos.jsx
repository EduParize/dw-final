import { formatarMoeda } from '../../../shared/lib/formatacao.js';
import { FONTES, NOMES_FONTES } from '../lib/fontes.js';

/**
 * Preço da skin em cada site (R$), destacando o menor e o usado no valor atual.
 * Os destaques têm texto ("menor", "valor atual"), não só cor.
 */
export default function ComparacaoPrecos({ item }) {
  const menor = item.menor_preco;
  const temFase = Boolean(item.fase);

  return (
    <section className="comparacao" aria-labelledby="comparacao-titulo">
      <h2 id="comparacao-titulo" className="secao__titulo">
        Preço por site
      </h2>
      <table className="tabela">
        <thead>
          <tr>
            <th scope="col">Site</th>
            <th scope="col" className="tabela__numero">
              Preço
            </th>
            <th scope="col">
              <span className="sr-only">Observação</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {FONTES.map((fonte) => {
            const valor = item.precos?.[fonte] ?? null;
            const ehMenor = menor?.fonte === fonte;
            const ehAtual = item.fonte_valor_atual === fonte;
            return (
              <tr key={fonte} className={ehMenor ? 'tabela__linha--menor' : ''}>
                <th scope="row">{NOMES_FONTES[fonte]}</th>
                <td className="tabela__numero numero">{valor === null ? 'sem preço' : formatarMoeda(valor)}</td>
                <td className="tabela__marcas">
                  {ehMenor && <span className="etiqueta etiqueta--sucesso">menor</span>}
                  {ehAtual && <span className="etiqueta etiqueta--neutra">valor atual</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="texto-secundario texto-pequeno">
        Os sites cobram por faixa de desgaste, não pelo float exato. O valor atual usa a Steam e, se ela
        não tiver o item, a próxima fonte com preço.
        {temFase &&
          ` Para a fase ${item.fase}, só valem CSFloat e Buff163, que informam o preço de cada fase.`}
      </p>
    </section>
  );
}
