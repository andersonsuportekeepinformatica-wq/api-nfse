import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export enum TipoInscricaoDto {
  CPF = 'CPF',
  CNPJ = 'CNPJ',
}

export class CriarContribuinteDto {
  @ApiProperty({ enum: TipoInscricaoDto })
  @IsEnum(TipoInscricaoDto)
  tipoInscricao!: TipoInscricaoDto;

  @ApiProperty({ description: 'CPF ou CNPJ, somente digitos' })
  @IsString()
  @Length(11, 14)
  inscricaoFederal!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  inscricaoMunicipal?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  razaoSocial!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nomeFantasia?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  telefone?: string;

  @ApiProperty({
    required: false,
    description: 'ID interno do municipio de domicilio (ver endpoint /municipios) - apenas informativo',
  })
  @IsOptional()
  @IsString()
  municipioId?: string;
}
