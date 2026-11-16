import { useEffect, useState } from 'react';

// Tela provisória: só confere se o frontend consegue falar com o backend.
// Será substituída pelo router (login, registro, inventário, cadastro, detalhe).
export default function App() {
  const [status, setStatus] = useState('verificando...');

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL ?? '/api'}/health`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((dados) => setStatus(dados.status))
      .catch((err) => setStatus(`erro (${err.message})`));
  }, []);

  return (
    <main className="container">
      <h1>Inventário de Skins CS2</h1>
      <p>
        Status da API: <strong>{status}</strong>
      </p>
    </main>
  );
}
