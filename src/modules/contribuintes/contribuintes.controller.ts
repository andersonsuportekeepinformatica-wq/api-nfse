import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { Acesso, AcessoAtual } from '../../common/auth/acesso';
import { AcessoService } from '../../common/auth/acesso.service';
import { ChavesApiService } from '../../common/auth/chaves-api.service';
import { ContribuintesService } from './contribuintes.service';
import { CriarContribuinteDto } from './dto/criar-contribuinte.dto';

@ApiTags('contribuintes')
@ApiSecurity('x-api-key')
@UseGuards(ApiKeyGuard)
@Controller('contribuintes')
export class ContribuintesController {
  constructor(
    private readonly service: ContribuintesService,
    private readonly acesso: AcessoService,
    private readonly chavesApi: ChavesApiService,
  ) {}

  @Post()
  criar(@Body() dto: CriarContribuinteDto, @AcessoAtual() acesso: Acesso) {
    this.acesso.exigirAdmin(acesso);
    return this.service.criar(dto);
  }

  @Get()
  listar(@AcessoAtual() acesso: Acesso) {
    return this.service.listar(this.acesso.filtroContribuinte(acesso));
  }

  /** Lista para o seletor de entidade do painel (contribuintes com certificado ativo). */
  @Get('selecionaveis')
  listarSelecionaveis(@AcessoAtual() acesso: Acesso) {
    return this.service.listarSelecionaveis(this.acesso.filtroContribuinte(acesso));
  }

  /** Gera uma nova chave de API restrita a esta entidade e revoga a anterior. Exibida uma unica vez. */
  @Post(':id/chave-api')
  async gerarChaveApi(@Param('id') id: string, @AcessoAtual() acesso: Acesso) {
    this.acesso.exigirAdmin(acesso);
    await this.service.obter(id);
    return this.chavesApi.gerarParaContribuinte(id);
  }

  @Get(':id')
  obter(@Param('id') id: string, @AcessoAtual() acesso: Acesso) {
    this.acesso.exigirContribuinte(acesso, id);
    return this.service.obter(id);
  }

  @Delete(':id')
  inativar(@Param('id') id: string, @AcessoAtual() acesso: Acesso) {
    this.acesso.exigirAdmin(acesso);
    return this.service.inativar(id);
  }
}
