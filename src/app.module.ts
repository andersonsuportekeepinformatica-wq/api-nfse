import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './common/auth/auth.module';
import { MunicipiosModule } from './modules/municipios/municipios.module';
import { ContribuintesModule } from './modules/contribuintes/contribuintes.module';
import { CertificadosModule } from './modules/certificados/certificados.module';
import { SefinNacionalModule } from './modules/sefin-nacional/sefin-nacional.module';
import { DpsModule } from './modules/dps/dps.module';
import { NfseModule } from './modules/nfse/nfse.module';
import { DistribuicaoModule } from './modules/distribuicao/distribuicao.module';
import { ConfiguracaoModule } from './modules/configuracao/configuracao.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      exclude: ['/docs', '/docs/(.*)'],
    }),
    PrismaModule,
    AuthModule,
    ConfiguracaoModule,
    SefinNacionalModule,
    MunicipiosModule,
    ContribuintesModule,
    CertificadosModule,
    DpsModule,
    NfseModule,
    DistribuicaoModule,
  ],
})
export class AppModule {}
