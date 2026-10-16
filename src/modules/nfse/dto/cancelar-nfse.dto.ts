import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CancelarNfseDto {
  @ApiProperty({ description: 'ID do certificado digital do solicitante do cancelamento' })
  @IsUUID()
  certificadoId!: string;

  @ApiProperty({ description: 'Motivo do cancelamento' })
  @IsString()
  @IsNotEmpty()
  motivo!: string;
}
