import { useState } from 'react';
import Botao from '../../../shared/components/Botao.jsx';
import Campo from '../../../shared/components/Campo.jsx';
import MensagemErro from '../../../shared/components/MensagemErro.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import {
  SENHA_MINIMA,
  apenasErros,
  validarConfirmacao,
  validarEmail,
  validarNome,
  validarSenha,
} from '../lib/validacao.js';

export default function FormRegistro({ onSucesso }) {
  const { registrar } = useAuth();
  const [dados, setDados] = useState({ nome: '', email: '', senha: '', confirmacao: '' });
  const [erros, setErros] = useState({});
  const [erroApi, setErroApi] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const alterar = (campo) => (evento) => setDados((atual) => ({ ...atual, [campo]: evento.target.value }));

  async function enviar(evento) {
    evento.preventDefault();
    const novosErros = apenasErros({
      nome: validarNome(dados.nome),
      email: validarEmail(dados.email),
      senha: validarSenha(dados.senha),
      confirmacao: validarConfirmacao(dados.senha, dados.confirmacao),
    });
    setErros(novosErros);
    setErroApi(null);
    if (Object.keys(novosErros).length > 0) {
      return;
    }

    setEnviando(true);
    try {
      await registrar({ nome: dados.nome.trim(), email: dados.email.trim(), senha: dados.senha });
      onSucesso?.();
    } catch (erro) {
      setErroApi(erro);
      setEnviando(false);
    }
  }

  return (
    <form className="formulario" onSubmit={enviar} noValidate>
      <MensagemErro erro={erroApi} />
      <Campo
        rotulo="Nome"
        autoComplete="name"
        maxLength={100}
        value={dados.nome}
        onChange={alterar('nome')}
        erro={erros.nome}
        autoFocus
      />
      <Campo
        rotulo="E-mail"
        type="email"
        autoComplete="email"
        value={dados.email}
        onChange={alterar('email')}
        erro={erros.email}
      />
      <Campo
        rotulo="Senha"
        type="password"
        autoComplete="new-password"
        value={dados.senha}
        onChange={alterar('senha')}
        erro={erros.senha}
        dica={`Mínimo de ${SENHA_MINIMA} caracteres`}
      />
      <Campo
        rotulo="Confirmar senha"
        type="password"
        autoComplete="new-password"
        value={dados.confirmacao}
        onChange={alterar('confirmacao')}
        erro={erros.confirmacao}
      />
      <Botao type="submit" carregando={enviando} className="botao--bloco">
        Criar conta
      </Botao>
    </form>
  );
}
