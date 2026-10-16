import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Quem esta chamando a API, resolvido pelo ApiKeyGuard a partir do header x-api-key:
 * - admin: chave mestra do .env (API_KEY), enxerga e administra tudo;
 * - entidade: chave gerada para um contribuinte, enxerga apenas os dados dele.
 */
export type Acesso = { admin: true } | { admin: false; contribuinteId: string };

export interface RequestComAcesso {
  acesso?: Acesso;
}

export const AcessoAtual = createParamDecorator((_: unknown, ctx: ExecutionContext): Acesso => {
  const acesso = ctx.switchToHttp().getRequest<RequestComAcesso>().acesso;
  if (!acesso) {
    // Rota sem ApiKeyGuard usando @AcessoAtual: erro de programacao, nunca liberar por omissao.
    throw new Error('AcessoAtual usado em rota sem ApiKeyGuard.');
  }
  return acesso;
});
