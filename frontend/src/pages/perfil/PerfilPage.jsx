import ExcluirConta from '../../features/auth/components/ExcluirConta.jsx';
import FormDadosConta from '../../features/auth/components/FormDadosConta.jsx';
import FormTrocarSenha from '../../features/auth/components/FormTrocarSenha.jsx';
import { useAuth } from '../../features/auth/hooks/useAuth.jsx';
import { formatarDataHora } from '../../shared/lib/formatacao.js';

export default function PerfilPage() {
  const { usuario } = useAuth();

  return (
    <div className="pagina pagina--estreita">
      <header className="pagina__cabecalho">
        <div>
          <h1 className="pagina__titulo">Minha conta</h1>
          <p className="texto-secundario">Conta criada em {formatarDataHora(usuario.criado_em)}</p>
        </div>
      </header>

      <section className="painel" aria-labelledby="dados-titulo">
        <h2 id="dados-titulo" className="secao__titulo">
          Dados da conta
        </h2>
        <FormDadosConta />
      </section>

      <section className="painel" aria-labelledby="senha-titulo">
        <h2 id="senha-titulo" className="secao__titulo">
          Trocar senha
        </h2>
        <FormTrocarSenha />
      </section>

      <section className="painel painel--perigo" aria-labelledby="excluir-titulo">
        <h2 id="excluir-titulo" className="secao__titulo">
          Excluir conta
        </h2>
        <ExcluirConta />
      </section>
    </div>
  );
}
