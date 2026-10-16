import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  // Painel ainda em desenvolvimento ativo: nunca deixar o navegador cachear o HTML/JS/CSS
  // estaticos, para que alteracoes apareçam sempre no proximo F5, sem precisar de hard refresh.
  app.use((req: { path: string }, res: { setHeader: (k: string, v: string) => void }, next: () => void) => {
    if (!req.path.startsWith('/docs')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    }
    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new PrismaExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('API NFS-e Nacional - Gestao Publica')
    .setDescription(
      'API para emissao, consulta e cancelamento de NFS-e via Ambiente Nacional (Sefin Nacional / ADN). ' +
        'Autenticacao via header x-api-key.',
    )
    .setVersion('0.1.0')
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'x-api-key')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API NFS-e rodando em http://localhost:${port}`);
  // eslint-disable-next-line no-console
  console.log(`Documentacao Swagger em http://localhost:${port}/docs`);
  // eslint-disable-next-line no-console
  console.log(`Painel (frontend minimo) em http://localhost:${port}/`);
}
bootstrap();
