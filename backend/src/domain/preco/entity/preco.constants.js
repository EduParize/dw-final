/** Sites de venda cujos preços são baixados da CSGO Trader (todos em USD). */
export const FONTES_PRECO = Object.freeze(['steam', 'skinport', 'csfloat', 'buff163']);

/** Fonte usada como "valor atual" quando tem preço; senão vale a próxima da lista. */
export const FONTE_PRECO_PADRAO = 'steam';

/** Nome da linha da cotação USD→BRL na tabela cache_precos. */
export const FONTE_COTACAO = 'cotacao';

/** Depois desse tempo o cache é considerado velho e deve ser baixado de novo. */
export const VALIDADE_CACHE_MS = 24 * 60 * 60 * 1000;
