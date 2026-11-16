export class AppError extends Error {
  constructor(mensagem, status = 500) {
    super(mensagem);
    this.name = this.constructor.name;
    this.status = status;
  }
}

/** 400: dados inválidos (float fora do intervalo, campo faltando etc.). */
export class ValidationError extends AppError {
  constructor(mensagem) {
    super(mensagem, 400);
  }
}

/** 401: sem token, token inválido ou login incorreto. */
export class UnauthorizedError extends AppError {
  constructor(mensagem = 'Não autenticado') {
    super(mensagem, 401);
  }
}

/** 404: recurso não encontrado. */
export class NotFoundError extends AppError {
  constructor(mensagem = 'Recurso não encontrado') {
    super(mensagem, 404);
  }
}

/** 409: conflito, por exemplo e-mail já cadastrado. */
export class ConflictError extends AppError {
  constructor(mensagem) {
    super(mensagem, 409);
  }
}
