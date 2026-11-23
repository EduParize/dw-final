// Validações só para dar retorno rápido no formulário. A regra que vale é a do backend.

export const SENHA_MINIMA = 6;
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validarNome(nome) {
  if (!nome.trim()) return 'Informe o seu nome';
  if (nome.trim().length > 100) return 'O nome pode ter no máximo 100 caracteres';
  return null;
}

export function validarEmail(email) {
  if (!email.trim()) return 'Informe o e-mail';
  if (!FORMATO_EMAIL.test(email.trim())) return 'E-mail inválido';
  return null;
}

export function validarSenha(senha) {
  if (!senha) return 'Informe a senha';
  if (senha.length < SENHA_MINIMA) return `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres`;
  return null;
}

export function validarConfirmacao(senha, confirmacao) {
  return senha === confirmacao ? null : 'As senhas não conferem';
}

/** Remove as chaves sem erro; objeto vazio = formulário válido. */
export function apenasErros(erros) {
  return Object.fromEntries(Object.entries(erros).filter(([, mensagem]) => mensagem));
}
