import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class UsarCertificadoWindowsDto {
  @ApiProperty({ description: 'Thumbprint (SHA-1, 40 hexa) do certificado, obtido em GET /certificados/windows' })
  @Matches(/^[0-9A-F]{40}$/i, { message: 'thumbprint invalido' })
  thumbprint!: string;

  @ApiProperty({ required: false, description: 'Municipio de domicilio (opcional, so informativo)' })
  @IsOptional()
  @IsString()
  municipioId?: string;
}
