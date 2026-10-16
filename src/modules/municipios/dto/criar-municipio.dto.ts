import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class CriarMunicipioDto {
  @ApiProperty({ description: 'Codigo IBGE do municipio (7 digitos)' })
  @IsString()
  @Length(7, 7)
  codigoIbge!: string;

  @ApiProperty()
  @IsString()
  nome!: string;

  @ApiProperty({ description: 'UF, 2 letras' })
  @IsString()
  @Length(2, 2)
  uf!: string;
}
