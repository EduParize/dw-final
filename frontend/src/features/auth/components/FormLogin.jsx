import { useState } from 'react';
import Botao from '../../../shared/components/Botao.jsx';
import Campo from '../../../shared/components/Campo.jsx';
import MensagemErro from '../../../shared/components/MensagemErro.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { apenasErros, validarEmail } from '../lib/validacao.js';

export default function FormLogin({ onSucesso }) {
  const { entrar } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erros, setErros] = useState({});
  const [erroApi, setErroApi] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento) {
    evento.preventDefault();
    const novosErros = apenasErros({
      email: validarEmail(email),
      senha: senha ? null : 'Informe a senha',
    });
    setErros(novosErros);
    setErroApi(null);
    if (Object.keys(novosErros).length > 0) {
      return;
    }

    setEnviando(true);
    try {
      await entrar({ email: email.trim(), senha });
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
        rotulo="E-mail"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        erro={erros.email}
        autoFocus
      />
      <Campo
        rotulo="Senha"
        type="password"
        autoComplete="current-password"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        erro={erros.senha}
      />
      <Botao type="submit" carregando={enviando} className="botao--bloco">
        Entrar
      </Botao>
    </form>
  );
}
