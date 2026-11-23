import { useState } from 'react';
import Botao from '../../../shared/components/Botao.jsx';
import MensagemErro from '../../../shared/components/MensagemErro.jsx';
import Modal from '../../../shared/components/Modal.jsx';
import { useAuth } from '../hooks/useAuth.jsx';

export default function ExcluirConta() {
  const { excluirConta } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState(null);

  async function confirmar() {
    setExcluindo(true);
    setErro(null);
    try {
      await excluirConta(); // desloga; a RotaProtegida leva para /login
    } catch (err) {
      setErro(err);
      setExcluindo(false);
    }
  }

  return (
    <>
      <p className="texto-secundario">
        Exclui a sua conta e todas as skins cadastradas nela. Não dá para desfazer.
      </p>
      <div className="formulario__acoes">
        <Botao variante="perigo" onClick={() => setAberto(true)}>
          Excluir minha conta
        </Botao>
      </div>

      <Modal
        aberto={aberto}
        titulo="Excluir a conta?"
        onFechar={() => !excluindo && setAberto(false)}
        acoes={
          <>
            <Botao variante="secundario" onClick={() => setAberto(false)} disabled={excluindo}>
              Cancelar
            </Botao>
            <Botao variante="perigo" onClick={confirmar} carregando={excluindo}>
              Excluir conta
            </Botao>
          </>
        }
      >
        <MensagemErro erro={erro} />
        <p>A conta e todo o inventário serão apagados permanentemente.</p>
      </Modal>
    </>
  );
}
