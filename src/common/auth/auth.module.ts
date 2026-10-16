import { Global, Module } from '@nestjs/common';
import { AcessoService } from './acesso.service';
import { ChavesApiService } from './chaves-api.service';

// Global: o ApiKeyGuard e instanciado no modulo de cada controller e precisa do ChavesApiService.
@Global()
@Module({
  providers: [ChavesApiService, AcessoService],
  exports: [ChavesApiService, AcessoService],
})
export class AuthModule {}
