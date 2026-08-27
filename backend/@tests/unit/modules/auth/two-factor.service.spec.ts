import { User } from '@/entities';
import { TwoFactorService } from '@/modules/auth/two-factor.service';
import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { generateSync } from 'otplib';
import type { Repository } from 'typeorm';

describe('TwoFactorService', () => {
  let service: TwoFactorService;
  let userRepository: jest.Mocked<Repository<User>>;
  let stored: Partial<User>;

  beforeEach(async () => {
    stored = {
      id: 'u1',
      email: 'user@example.com',
      passwordHash: await bcrypt.hash('correct-password', 4),
      twoFactorSecret: null,
      twoFactorEnabledAt: null,
      twoFactorRecoveryCodes: [],
    };

    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        TwoFactorService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(async () => stored as User),
            update: jest.fn(async (_id: string, patch: Partial<User>) => {
              Object.assign(stored, patch);
              return { affected: 1 };
            }),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn(() => 'session-salt') },
        },
      ],
    }).compile();

    service = testingModule.get(TwoFactorService);
    userRepository = testingModule.get(getRepositoryToken(User));
  });

  const enable = async () => {
    const { secret } = await service.setup('u1', 'correct-password');
    const { recoveryCodes } = await service.enable('u1', generateSync({ secret }));
    return { secret, recoveryCodes };
  };

  it('rejects setup when the current password is wrong', async () => {
    await expect(service.setup('u1', 'nope')).rejects.toBeInstanceOf(ForbiddenException);
    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it('stores the secret encrypted and stays disabled until a code is confirmed', async () => {
    const { secret, otpauthUrl } = await service.setup('u1', 'correct-password');

    expect(otpauthUrl).toContain('otpauth://totp/Lumio');
    expect(stored.twoFactorSecret).toMatch(/^enc:/);
    expect(stored.twoFactorSecret).not.toContain(secret);
    await expect(service.getStatus('u1')).resolves.toMatchObject({
      enabled: false,
      pendingSetup: true,
    });
  });

  it('enables only with a valid code and issues recovery codes once', async () => {
    const { secret } = await service.setup('u1', 'correct-password');

    await expect(service.enable('u1', '000000')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(stored.twoFactorEnabledAt).toBeNull();

    const { recoveryCodes } = await service.enable('u1', generateSync({ secret }));

    expect(recoveryCodes).toHaveLength(10);
    expect(stored.twoFactorEnabledAt).toBeInstanceOf(Date);
    // Only hashes are persisted — the plaintext codes never hit the database.
    expect(stored.twoFactorRecoveryCodes).toHaveLength(10);
    expect(stored.twoFactorRecoveryCodes).not.toEqual(expect.arrayContaining(recoveryCodes));
  });

  it('accepts a current TOTP code at login and rejects a wrong one', async () => {
    const { secret } = await enable();

    await expect(service.assertLoginCode('u1', generateSync({ secret }))).resolves.toBeUndefined();
    await expect(service.assertLoginCode('u1', '000000')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('burns a recovery code after a single use', async () => {
    const { recoveryCodes } = await enable();
    const code = recoveryCodes[0];

    await expect(service.assertLoginCode('u1', code.toLowerCase())).resolves.toBeUndefined();
    expect(stored.twoFactorRecoveryCodes).toHaveLength(9);

    await expect(service.assertLoginCode('u1', code)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(stored.twoFactorRecoveryCodes).toHaveLength(9);
  });

  it('clears every 2FA field on disable and refuses a wrong password', async () => {
    await enable();

    await expect(service.disable('u1', 'nope')).rejects.toBeInstanceOf(ForbiddenException);
    expect(stored.twoFactorEnabledAt).toBeInstanceOf(Date);

    await service.disable('u1', 'correct-password');

    expect(stored).toMatchObject({
      twoFactorSecret: null,
      twoFactorEnabledAt: null,
      twoFactorRecoveryCodes: [],
    });
  });

  it('replaces recovery codes on regeneration and only while enabled', async () => {
    await expect(
      service.regenerateRecoveryCodes('u1', 'correct-password'),
    ).rejects.toBeInstanceOf(BadRequestException);

    const { recoveryCodes } = await enable();
    const { recoveryCodes: next } = await service.regenerateRecoveryCodes('u1', 'correct-password');

    expect(next).toHaveLength(10);
    expect(next).not.toEqual(expect.arrayContaining(recoveryCodes));
    await expect(service.assertLoginCode('u1', recoveryCodes[0])).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
