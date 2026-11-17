import { useState } from 'react';
import Botao from '../../../shared/components/Botao.jsx';
import Campo from '../../../shared/components/Campo.jsx';
import MensagemErro from '../../../shared/components/MensagemErro.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { apenasErros, validarEmail, validarNome } from '../lib/validacao.js';

/** Edita nome e e-mail. Só envia o que mudou. */
export default function FormDadosConta() {
  const { usuario, editarPerfil } = useAuth();
  const [nome, setNome] = useState(usuario.nome);
  const [email, setEmail] = useState(usuario.email);
  const [erros, setErros] = useState({});
  const [erroApi, setErroApi] = useState(null);
  const [sucesso, setSucesso] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const alterado = nome.trim() !== usuario.nome || email.trim().toLowerCase() !== usuario.email;

  async function enviar(evento) {
    evento.preventDefault();
    const novosErros = apenasErros({ nome: validarNome(nome), email: validarEmail(email) });
    setErros(novosErros);
    setErroApi(null);
    setSucesso(false);
    if (Object.keys(novosErros).length > 0 || !alterado) {
      return;
    }

    const dados = {};
    if (nome.trim() !== usuario.nome) dados.nome = nome.trim();
    if (email.trim().toLowerCase() !== usuario.email) dados.email = email.trim();

    setEnviando(true);
    try {
      const atualizado = await editarPerfil(dados);
      setNome(atualizado.nome);
      setEmail(atualizado.email);
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
          Dados atualizados.
        </p>
      )}
      <Campo
        rotulo="Nome"
        autoComplete="name"
        maxLength={100}
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        erro={erros.nome}
      />
      <Campo
        rotulo="E-mail"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        erro={erros.email}
      />
      <div className="formulario__acoes">
        <Botao type="submit" carregando={enviando} disabled={!alterado}>
          Salvar alterações
        </Botao>
      </div>
    </form>
  );
}
