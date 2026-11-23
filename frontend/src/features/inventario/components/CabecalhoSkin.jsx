/** Imagem + nome de uma skin (do catálogo ou do inventário), com a cor da raridade. */
export default function CabecalhoSkin({ skin, children }) {
  return (
    <div className="cabecalho-skin" style={{ '--cor-raridade': skin.raridade?.cor ?? 'var(--cor-borda-forte)' }}>
      <img src={skin.imagem} alt="" className="cabecalho-skin__imagem" />
      <div className="cabecalho-skin__textos">
        <span className="cabecalho-skin__arma">{skin.arma}</span>
        <h1 className="cabecalho-skin__nome">
          {skin.nome}
          {skin.fase && <span className="etiqueta etiqueta--neutra">{skin.fase}</span>}
        </h1>
        <span className="cabecalho-skin__raridade">
          <span className="ponto-raridade" />
          {skin.raridade?.nome ?? 'Sem raridade'}
        </span>
        {children}
      </div>
    </div>
  );
}
