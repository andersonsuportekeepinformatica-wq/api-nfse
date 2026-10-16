import { Module } from '@nestjs/common';
import { DistribuicaoController } from './distribuicao.controller';
import { DistribuicaoService } from './distribuicao.service';
import { CertificadosModule } from '../certificados/certificados.module';
import { SefinNacionalModule } from '../sefin-nacional/sefin-nacional.module';

@Module({
  imports: [CertificadosModule, SefinNacionalModule],
  controllers: [DistribuicaoController],
  providers: [DistribuicaoService],
})
export class DistribuicaoModule {}
