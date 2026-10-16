import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AnexarRapidoDto {
  @ApiProperty({ description: 'Senha do arquivo .pfx' })
  @IsString()
  @IsNotEmpty()
  senha!: string;

  @ApiProperty({ required: false, description: 'Municipio de domicilio (opcional, so informativo)' })
  @IsOptional()
  @IsString()
  municipioId?: string;
}
