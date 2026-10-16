import { Module } from '@nestjs/common';
import { SefinNacionalClientService } from './sefin-nacional-client.service';
import { CertificadosWindowsService } from './certificados-windows.service';

@Module({
  providers: [SefinNacionalClientService, CertificadosWindowsService],
  exports: [SefinNacionalClientService, CertificadosWindowsService],
})
export class SefinNacionalModule {}
