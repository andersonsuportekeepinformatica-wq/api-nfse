import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { timingSafeEqual } from 'crypto';
import { RequestComAcesso } from '../auth/acesso';
import { ChavesApiService, hashChave } from '../auth/chaves-api.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly chavesApi: ChavesApiService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & RequestComAcesso>();
    const provided = request.header('x-api-key')?.trim();
    const chaveMestra = this.config.get<string>('API_KEY');

    if (!chaveMestra) {
      throw new UnauthorizedException('API_KEY nao configurada no servidor.');
    }
    if (!provided) {
      throw new UnauthorizedException('x-api-key invalido ou ausente.');
    }

    if (iguaisEmTempoConstante(provided, chaveMestra)) {
      request.acesso = { admin: true };
      return true;
    }

    const contribuinteId = await this.chavesApi.resolverContribuinte(provided);
    if (!contribuinteId) {
      throw new UnauthorizedException('x-api-key invalido ou ausente.');
    }
    request.acesso = { admin: false, contribuinteId };
    return true;
  }
}

function iguaisEmTempoConstante(a: string, b: string): boolean {
  // Compara os hashes (mesmo tamanho) para nao vazar o tamanho/prefixo da chave mestra por timing.
  return timingSafeEqual(Buffer.from(hashChave(a), 'hex'), Buffer.from(hashChave(b), 'hex'));
}
