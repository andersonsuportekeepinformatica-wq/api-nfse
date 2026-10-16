import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CadastrarCertificadoDto {
  @ApiProperty()
  @IsUUID()
  contribuinteId!: string;

  @ApiProperty({ description: 'Senha do arquivo .pfx' })
  @IsString()
  @IsNotEmpty()
  senha!: string;
}
