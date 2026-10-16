import { Module } from '@nestjs/common';
import { CertificadosController } from './certificados.controller';
import { CertificadosService } from './certificados.service';
import { SecretCipherService } from '../../common/crypto/secret-cipher.service';
import { ContribuintesModule } from '../contribuintes/contribuintes.module';
import { SefinNacionalModule } from '../sefin-nacional/sefin-nacional.module';

@Module({
  imports: [ContribuintesModule, SefinNacionalModule],
  controllers: [CertificadosController],
  providers: [CertificadosService, SecretCipherService],
  exports: [CertificadosService],
})
export class CertificadosModule {}
