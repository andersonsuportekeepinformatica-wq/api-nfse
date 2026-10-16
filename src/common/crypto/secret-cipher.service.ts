import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export interface CipherResult {
  ciphertext: Buffer;
  iv: string;
  authTag: string;
}

/**
 * Cifra/decifra dados sensiveis em repouso (arquivo .pfx, senha do certificado)
 * com AES-256-GCM, usando CERT_ENCRYPTION_KEY (32 bytes em hex) como chave mestra.
 */
@Injectable()
export class SecretCipherService implements OnModuleInit {
  private key!: Buffer;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const hex = this.config.get<string>('CERT_ENCRYPTION_KEY');
    if (!hex || hex.length !== 64) {
      throw new Error(
        'CERT_ENCRYPTION_KEY ausente ou invalida: defina 32 bytes em hex (64 caracteres) no .env.',
      );
    }
    this.key = Buffer.from(hex, 'hex');
  }

  encrypt(data: Buffer | string): CipherResult {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const plain = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
    const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return { ciphertext, iv: iv.toString('hex'), authTag: authTag.toString('hex') };
  }

  decrypt(ciphertext: Buffer, ivHex: string, authTagHex: string): Buffer {
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }
}
