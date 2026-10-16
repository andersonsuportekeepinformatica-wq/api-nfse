import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';

export class TomadorDto {
  @ApiProperty({ description: 'CPF ou CNPJ do tomador, somente digitos' })
  @IsString()
  inscricaoFederal!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  razaoSocial!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ description: 'Codigo IBGE do municipio do tomador' })
  @IsString()
  @Length(7, 7)
  codigoMunicipio!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  logradouro?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cep?: string;
}

export class ServicoDto {
  @ApiProperty({ description: 'Codigo de tributacao nacional do servico (Anexo da LC 116)' })
  @IsString()
  codigoTributacaoNacional!: string;

  @ApiProperty({ required: false, description: 'Codigo de tributacao municipal, se exigido pelo municipio' })
  @IsOptional()
  @IsString()
  codigoTributacaoMunicipal?: string;

  @ApiProperty({ description: 'Descricao do servico prestado' })
  @IsString()
  @IsNotEmpty()
  descricao!: string;

  @ApiProperty({ description: 'Codigo IBGE do municipio de prestacao do servico' })
  @IsString()
  @Length(7, 7)
  codigoMunicipioPrestacao!: string;
}

export class ValoresDto {
  @ApiProperty({ description: 'Valor total dos servicos, em reais' })
  @IsNumber()
  @Min(0.01)
  valorServicos!: number;

  @ApiProperty({ required: false, description: 'Aliquota do ISSQN em percentual (ex: 5 para 5%)' })
  @IsOptional()
  @IsNumber()
  aliquotaIss?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  valorDeducoes?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  valorDescontoIncondicionado?: number;
}

export class EmitirDpsDto {
  @ApiProperty({ description: 'ID do contribuinte prestador (ja cadastrado)' })
  @IsUUID()
  contribuinteId!: string;

  @ApiProperty({ description: 'ID do certificado digital (A1) do prestador, ja cadastrado' })
  @IsUUID()
  certificadoId!: string;

  @ApiProperty({ description: 'Serie da DPS (ate 5 caracteres), definida pelo emissor' })
  @IsString()
  @Length(1, 5)
  serie!: string;

  @ApiProperty({ description: 'Numero sequencial da DPS, controlado pelo emissor' })
  @IsString()
  numero!: string;

  @ApiProperty({ description: 'Competencia no formato AAAA-MM-DD' })
  @IsString()
  competencia!: string;

  @ApiProperty({ type: TomadorDto })
  @ValidateNested()
  @Type(() => TomadorDto)
  tomador!: TomadorDto;

  @ApiProperty({ type: ServicoDto })
  @ValidateNested()
  @Type(() => ServicoDto)
  servico!: ServicoDto;

  @ApiProperty({ type: ValoresDto })
  @ValidateNested()
  @Type(() => ValoresDto)
  valores!: ValoresDto;

  @ApiProperty({
    required: false,
    description: 'Chave de acesso de NFS-e a ser substituida (emissao de nota substituta)',
  })
  @IsOptional()
  @IsString()
  chaveNfseSubstituida?: string;
}
