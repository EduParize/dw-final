import { baixarPrecos } from '../../infraestructure/external/csgotrader.client.js';
import { baixarCotacao } from '../../infraestructure/external/awesomeapi.client.js';
import { criarPrecoRepository } from '../../infraestructure/repository/preco/preco.repository.js';
import { criarPrecoService } from '../../domain/preco/service/preco.service.js';

/** Monta repository + service do contexto preço (cache em banco + downloads externos). */
export function criarContextoPreco() {
  const precoRepository = criarPrecoRepository();
  const precoService = criarPrecoService({ precoRepository, baixarPrecos, baixarCotacao });
  return { precoRepository, precoService };
}
