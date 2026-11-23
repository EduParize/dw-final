import { useState } from 'react';
import Botao from '../../../shared/components/Botao.jsx';
import Campo from '../../../shared/components/Campo.jsx';
import MensagemErro from '../../../shared/components/MensagemErro.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { SENHA_MINIMA, apenasErros, validarConfirmacao, validarSenha } from '../lib/validacao.js';

const VAZIO = { senhaAtual: '', senha: '', confirmacao: '' };

export default function FormTrocarSenha() {
  const { editarPerfil } = useAuth();
  const [dados, setDados] = useState(VAZIO);
  const [erros, setErros] = useState({});
  const [erroApi, setErroApi] = useState(null);
  const [sucesso, setSucesso] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const alterar = (campo) => (evento) => setDados((atual) => ({ ...atual, [campo]: evento.target.value }));

  async function enviar(evento) {
    evento.preventDefault();
    const novosErros = apenasErros({
      senhaAtual: dados.senhaAtual ? null : 'Informe a senha atual',
      senha: validarSenha(dados.senha),
      confirmacao: validarConfirmacao(dados.senha, dados.confirmacao),
    });
    setErros(novosErros);
    setErroApi(null);
    setSucesso(false);
    if (Object.keys(novosErros).length > 0) {
      return;
    }

    setEnviando(true);
    try {
      // Senha atual errada volta 400 (não 401), então o usuário continua logado.
      await editarPerfil({ senha: dados.senha, senha_atual: dados.senhaAtual });
      setDados(VAZIO);
      setSucesso(true);
    } catch (erro) {
      setErroApi(erro);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="formulario" onSubmit={enviar} noValidate>
      <MensagemErro erro={erroApi} />
      {sucesso && (
        <p className="alerta alerta--sucesso" role="status">
          Senha alterada.
        </p>
      )}
      <Campo
        rotulo="Senha atual"
        type="password"
        autoComplete="current-password"
        value={dados.senhaAtual}
        onChange={alterar('senhaAtual')}
        erro={erros.senhaAtual}
      />
      <Campo
        rotulo="Nova senha"
        type="password"
        autoComplete="new-password"
        value={dados.senha}
        onChange={alterar('senha')}
        erro={erros.senha}
        dica={`Mínimo de ${SENHA_MINIMA} caracteres`}
      />
      <Campo
        rotulo="Confirmar nova senha"
        type="password"
        autoComplete="new-password"
        value={dados.confirmacao}
        onChange={alterar('confirmacao')}
        erro={erros.confirmacao}
      />
      <div className="formulario__acoes">
        <Botao type="submit" carregando={enviando}>
          Trocar senha
        </Botao>
      </div>
    </form>
  );
}
