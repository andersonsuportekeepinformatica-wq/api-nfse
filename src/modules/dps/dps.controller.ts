import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { Acesso, AcessoAtual } from '../../common/auth/acesso';
import { AcessoService } from '../../common/auth/acesso.service';
import { DpsService } from './dps.service';
import { EmitirDpsDto } from './dto/emitir-dps.dto';

@ApiTags('dps')
@ApiSecurity('x-api-key')
@UseGuards(ApiKeyGuard)
@Controller('dps')
export class DpsController {
  constructor(
    private readonly service: DpsService,
    private readonly acesso: AcessoService,
  ) {}

  @Post('emitir')
  async emitir(@Body() dto: EmitirDpsDto, @AcessoAtual() acesso: Acesso) {
    this.acesso.exigirContribuinte(acesso, dto.contribuinteId);
    await this.acesso.exigirCertificado(acesso, dto.certificadoId, dto.contribuinteId);
    return this.service.emitir(dto);
  }

  @Get(':id')
  async obter(@Param('id') id: string, @AcessoAtual() acesso: Acesso) {
    await this.acesso.exigirDps(acesso, id);
    return this.service.consultarPorId(id);
  }

  @Get('contribuinte/:contribuinteId')
  listarPorContribuinte(@Param('contribuinteId') contribuinteId: string, @AcessoAtual() acesso: Acesso) {
    this.acesso.exigirContribuinte(acesso, contribuinteId);
    return this.service.listarPorContribuinte(contribuinteId);
  }
}
