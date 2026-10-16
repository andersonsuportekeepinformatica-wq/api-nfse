import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { Acesso, AcessoAtual } from '../../common/auth/acesso';
import { AcessoService } from '../../common/auth/acesso.service';
import { MunicipiosService } from './municipios.service';
import { CriarMunicipioDto } from './dto/criar-municipio.dto';

@ApiTags('municipios')
@ApiSecurity('x-api-key')
@UseGuards(ApiKeyGuard)
@Controller('municipios')
export class MunicipiosController {
  constructor(
    private readonly service: MunicipiosService,
    private readonly acesso: AcessoService,
  ) {}

  @Post()
  criar(@Body() dto: CriarMunicipioDto, @AcessoAtual() acesso: Acesso) {
    this.acesso.exigirAdmin(acesso);
    return this.service.criar(dto);
  }

  @Get()
  listar() {
    return this.service.listar();
  }

  @Get(':id')
  obter(@Param('id') id: string) {
    return this.service.obter(id);
  }

  @Post(':id/sincronizar-convenio')
  sincronizarConvenio(@Param('id') id: string, @Query('certificadoId') certificadoId: string, @AcessoAtual() acesso: Acesso) {
    // Grava os parametros no cadastro compartilhado do municipio: so a chave mestra.
    this.acesso.exigirAdmin(acesso);
    return this.service.sincronizarParametrosConvenio(id, certificadoId);
  }

  @Get(':id/servicos/:codigoServico/aliquotas')
  async consultarAliquotas(
    @Param('id') id: string,
    @Param('codigoServico') codigoServico: string,
    @Query('certificadoId') certificadoId: string,
    @AcessoAtual() acesso: Acesso,
  ) {
    await this.acesso.exigirCertificado(acesso, certificadoId);
    return this.service.consultarAliquotasServico(id, certificadoId, codigoServico);
  }
}
