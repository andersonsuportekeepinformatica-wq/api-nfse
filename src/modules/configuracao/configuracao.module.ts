import { Global, Module } from '@nestjs/common';
import { ConfiguracaoController } from './configuracao.controller';
import { ConfiguracaoService } from './configuracao.service';

@Global()
@Module({
  controllers: [ConfiguracaoController],
  providers: [ConfiguracaoService],
  exports: [ConfiguracaoService],
})
export class ConfiguracaoModule {}
