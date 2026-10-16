import { Module } from '@nestjs/common';
import { DpsController } from './dps.controller';
import { DpsService } from './dps.service';
import { CertificadosModule } from '../certificados/certificados.module';
import { SefinNacionalModule } from '../sefin-nacional/sefin-nacional.module';

@Module({
  imports: [CertificadosModule, SefinNacionalModule],
  controllers: [DpsController],
  providers: [DpsService],
  exports: [DpsService],
})
export class DpsModule {}
