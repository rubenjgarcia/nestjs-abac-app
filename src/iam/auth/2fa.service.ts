import { Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';

@Injectable()
export class TwoFAService {
  verifyToken(token: string, secret: string): boolean {
    return authenticator.verify({ token, secret });
  }

  generateSecret(): string {
    return authenticator.generateSecret(64);
  }

  generateUri(accountName: string, issuer: string, secret: string): string {
    return authenticator.keyuri(accountName, issuer, secret);
  }
}
