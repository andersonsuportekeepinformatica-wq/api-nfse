import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class DefinirAmbienteDto {
  @ApiProperty({ enum: ['HOMOLOGACAO', 'PRODUCAO'] })
  @IsIn(['HOMOLOGACAO', 'PRODUCAO'])
  ambiente!: 'HOMOLOGACAO' | 'PRODUCAO';
}
