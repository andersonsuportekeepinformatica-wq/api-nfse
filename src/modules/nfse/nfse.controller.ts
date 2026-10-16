import { Controller, Get, Param, Post, Query, Res, UseGuards, Body } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { Acesso, AcessoAtual } from '../../common/auth/acesso';
import { AcessoService } from '../../common/auth/acesso.service';
import { NfseService } from './nfse.service';
import { CancelarNfseDto } from './dto/cancelar-nfse.dto';

@ApiTags('nfse')
@ApiSecurity('x-api-key')
@UseGuards(ApiKeyGuard)
@Controller('nfse')
export class NfseController {
  constructor(
    private readonly service: NfseService,
    private readonly acesso: AcessoService,
  ) {}

  @Get()
  listar(@AcessoAtual() acesso: Acesso) {
    return this.service.listar(this.acesso.filtroContribuinte(acesso));
  }

  @Get(':chaveAcesso')
  async obter(@Param('chaveAcesso') chaveAcesso: string, @AcessoAtual() acesso: Acesso) {
    await this.acesso.exigirNfse(acesso, chaveAcesso);
    return this.service.obterPorChave(chaveAcesso);
  }

  @Get(':chaveAcesso/remoto')
  async consultarRemoto(
    @Param('chaveAcesso') chaveAcesso: string,
    @Query('certificadoId') certificadoId: string,
    @AcessoAtual() acesso: Acesso,
  ) {
    await this.acesso.exigirCertificado(acesso, certificadoId);
    return this.service.consultarRemoto(chaveAcesso, certificadoId);
  }

  @Get(':chaveAcesso/danfse')
  async baixarDanfse(
    @Param('chaveAcesso') chaveAcesso: string,
    @Query('certificadoId') certificadoId: string,
    @AcessoAtual() acesso: Acesso,
    @Res() res: Response,
  ) {
    await this.acesso.exigirCertificado(acesso, certificadoId);
    const pdf = await this.service.baixarDanfse(chaveAcesso, certificadoId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="danfse-${chaveAcesso}.pdf"`);
    res.send(pdf);
  }

  @Post(':chaveAcesso/cancelar')
  async cancelar(@Param('chaveAcesso') chaveAcesso: string, @Body() dto: CancelarNfseDto, @AcessoAtual() acesso: Acesso) {
    const emissorId = await this.acesso.exigirNfse(acesso, chaveAcesso);
    await this.acesso.exigirCertificado(acesso, dto.certificadoId, emissorId);
    return this.service.cancelar(chaveAcesso, dto);
  }
}
