import { Module } from '@nestjs/common';
import { MunicipiosController } from './municipios.controller';
import { MunicipiosService } from './municipios.service';
import { SefinNacionalModule } from '../sefin-nacional/sefin-nacional.module';
import { CertificadosModule } from '../certificados/certificados.module';

@Module({
  imports: [SefinNacionalModule, CertificadosModule],
  controllers: [MunicipiosController],
  providers: [MunicipiosService],
  exports: [MunicipiosService],
})
export class MunicipiosModule {}
