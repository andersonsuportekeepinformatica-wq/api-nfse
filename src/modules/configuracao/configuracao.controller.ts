import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { Acesso, AcessoAtual } from '../../common/auth/acesso';
import { AcessoService } from '../../common/auth/acesso.service';
import { ConfiguracaoService } from './configuracao.service';
import { DefinirAmbienteDto } from './dto/definir-ambiente.dto';

@ApiTags('configuracao')
@ApiSecurity('x-api-key')
@UseGuards(ApiKeyGuard)
@Controller('configuracao')
export class ConfiguracaoController {
  constructor(
    private readonly service: ConfiguracaoService,
    private readonly acesso: AcessoService,
  ) {}

  @Get()
  obter() {
    return this.service.obter();
  }

  @Post('ambiente')
  definirAmbiente(@Body() dto: DefinirAmbienteDto, @AcessoAtual() acesso: Acesso) {
    // Ambiente e global (afeta todas as entidades): so a chave mestra troca.
    this.acesso.exigirAdmin(acesso);
    return this.service.definirAmbiente(dto.ambiente);
  }
}
