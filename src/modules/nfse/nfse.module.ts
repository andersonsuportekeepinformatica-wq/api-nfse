import { Module } from '@nestjs/common';
import { NfseController } from './nfse.controller';
import { NfseService } from './nfse.service';
import { CertificadosModule } from '../certificados/certificados.module';
import { SefinNacionalModule } from '../sefin-nacional/sefin-nacional.module';

@Module({
  imports: [CertificadosModule, SefinNacionalModule],
  controllers: [NfseController],
  providers: [NfseService],
  exports: [NfseService],
})
export class NfseModule {}
