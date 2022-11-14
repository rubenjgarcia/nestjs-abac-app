import { when } from 'jest-when';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { UserService } from '../../users/users.service';
import { Jwt2FAStrategy } from './jwt-2fa.strategy';

describe('JWT 2FAStrategy', () => {
  let jwt2FAStrategy: Jwt2FAStrategy;

  beforeAll(async () => {
    const findOneById = jest.fn();
    when(findOneById)
      .calledWith('1')
      .mockResolvedValue({
        isTwoFactorAuthenticationEnabled: true,
      })
      .calledWith('0')
      .mockResolvedValue({
        isTwoFactorAuthenticationEnabled: false,
      });

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockResolvedValue('foo'),
          },
        },
        {
          provide: UserService,
          useValue: { findOneById },
        },
        Jwt2FAStrategy,
      ],
    }).compile();

    jwt2FAStrategy = module.get<Jwt2FAStrategy>(Jwt2FAStrategy);
  });

  describe('validate', () => {
    it('should return payload if user has 2FA activated and second factor is not authenticated', async () => {
      const payload = await jwt2FAStrategy.validate({
        sub: '1',
        isSecondFactorAuthenticated: false,
      });

      expect(payload.userId).toBe('1');
    });

    it('should fail if user has 2FA activated and second factor is authenticated', async () => {
      const payload = await jwt2FAStrategy.validate({
        sub: '1',
        isSecondFactorAuthenticated: true,
      });

      expect(payload).toBeUndefined();
    });

    it('should fail if user has no 2FA activated', async () => {
      const payload = await jwt2FAStrategy.validate({
        sub: '0',
      });

      expect(payload).toBeUndefined();
    });
  });
});
