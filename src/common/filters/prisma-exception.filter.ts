import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '@prisma/client';

/**
 * Traduz erros conhecidos do Prisma (violacao de chave estrangeira, unicidade, registro
 * nao encontrado) em respostas HTTP claras, evitando que virem "Internal server error"
 * genericos quando o ID informado (contribuinteId, municipioId etc.) nao existe no banco.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    this.logger.warn(`${exception.code} ${JSON.stringify(exception.meta)} - ${exception.message.split('\n').pop()}`);
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.BAD_REQUEST;
    let message = 'Erro ao processar a requisicao.';

    switch (exception.code) {
      case 'P2025':
        status = HttpStatus.NOT_FOUND;
        message = 'Registro nao encontrado.';
        break;
      case 'P2003':
        status = HttpStatus.BAD_REQUEST;
        message = 'Referencia invalida: verifique se o ID informado (ex: contribuinteId, municipioId) existe.';
        break;
      case 'P2002':
        status = HttpStatus.CONFLICT;
        message = `Registro duplicado: ja existe um registro com os mesmos valores (${(exception.meta?.target as string[])?.join(', ') ?? ''}).`;
        break;
      case 'P2011':
        status = HttpStatus.BAD_REQUEST;
        message = `Campo obrigatorio ausente: ${(exception.meta?.constraint as string[])?.join(', ') ?? ''}.`;
        break;
      default:
        status = HttpStatus.BAD_REQUEST;
        message = `Erro de banco de dados (${exception.code}).`;
    }

    response.status(status).json(new HttpException(message, status).getResponse());
  }
}
