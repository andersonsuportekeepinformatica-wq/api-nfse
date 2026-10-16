import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { Acesso, AcessoAtual } from '../../common/auth/acesso';
import { AcessoService } from '../../common/auth/acesso.service';
import { CertificadosService } from './certificados.service';
import { CadastrarCertificadoDto } from './dto/cadastrar-certificado.dto';
import { AnexarRapidoDto } from './dto/anexar-rapido.dto';
import { UsarCertificadoWindowsDto } from './dto/usar-certificado-windows.dto';

@ApiTags('certificados')
@ApiSecurity('x-api-key')
@UseGuards(ApiKeyGuard)
@Controller('certificados')
export class CertificadosController {
  constructor(
    private readonly service: CertificadosService,
    private readonly acesso: AcessoService,
  ) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        arquivo: { type: 'string', format: 'binary' },
        contribuinteId: { type: 'string' },
        senha: { type: 'string' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('arquivo'))
  async cadastrar(
    @UploadedFile() arquivo: Express.Multer.File,
    @Body() dto: CadastrarCertificadoDto,
    @AcessoAtual() acesso: Acesso,
  ) {
    this.acesso.exigirContribuinte(acesso, dto.contribuinteId);
    if (!arquivo) {
      throw new BadRequestException('Arquivo .pfx nao enviado (campo "arquivo").');
    }
    return this.service.cadastrar({
      contribuinteId: dto.contribuinteId,
      arquivoPfx: arquivo.buffer,
      senha: dto.senha,
    });
  }

  @Post('anexar-rapido')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        arquivo: { type: 'string', format: 'binary' },
        senha: { type: 'string' },
        municipioId: { type: 'string' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('arquivo'))
  async anexarRapido(
    @UploadedFile() arquivo: Express.Multer.File,
    @Body() dto: AnexarRapidoDto,
    @AcessoAtual() acesso: Acesso,
  ) {
    if (!arquivo) {
      throw new BadRequestException('Arquivo .pfx nao enviado (campo "arquivo").');
    }
    return this.service.anexarRapido(
      {
        arquivoPfx: arquivo.buffer,
        senha: dto.senha,
        municipioId: dto.municipioId || undefined,
      },
      acesso,
    );
  }

  /**
   * Certificados instalados no Windows do computador que roda a API (com chave privada).
   * Restrito a chave mestra: a lista expoe os certificados de todas as entidades da maquina.
   */
  @Get('windows')
  listarInstaladosWindows(@AcessoAtual() acesso: Acesso) {
    this.acesso.exigirAdmin(acesso);
    return this.service.listarInstaladosWindows();
  }

  /** Usa um certificado instalado no Windows (sem anexar .pfx): cadastra/reconhece a entidade e gera chave de API. */
  @Post('windows')
  usarInstaladoWindows(@Body() dto: UsarCertificadoWindowsDto, @AcessoAtual() acesso: Acesso) {
    return this.service.usarInstaladoWindows(
      { thumbprint: dto.thumbprint, municipioId: dto.municipioId || undefined },
      acesso,
    );
  }

  @Get('contribuinte/:contribuinteId')
  async listar(@Param('contribuinteId') contribuinteId: string, @AcessoAtual() acesso: Acesso) {
    this.acesso.exigirContribuinte(acesso, contribuinteId);
    return this.service.listarPorContribuinte(contribuinteId);
  }

  @Delete(':id')
  async revogar(@Param('id') id: string, @AcessoAtual() acesso: Acesso) {
    await this.acesso.exigirCertificado(acesso, id);
    return this.service.revogar(id);
  }
}
