import { EmailChangeService } from '@/modules/users/services/email-change.service';
import { BadRequestException, ConflictException } from '@nestjs/common';

describe('EmailChangeService', () => {
  let userRepository: { findOne: jest.Mock; save: jest.Mock };
  let tokenRepository: {
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
  };
  let mailerService: { send: jest.Mock };
  let service: EmailChangeService;

  const currentUser = {
    id: 'user-1',
    email: 'old@example.com',
    name: 'User',
    workspaceId: 'ws-1',
  } as never;

  beforeEach(() => {
    userRepository = { findOne: jest.fn().mockResolvedValue(null), save: jest.fn(async u => u) };
    tokenRepository = {
      findOne: jest.fn(),
      save: jest.fn(async t => t),
      create: jest.fn(t => t),
      delete: jest.fn(),
    };
    mailerService = { send: jest.fn().mockResolvedValue(true) };

    service = new EmailChangeService(
      userRepository as never,
      tokenRepository as never,
      mailerService as never,
      { get: (key: string) => (key === 'JWT_SECRET' ? 'secret' : undefined) } as never,
    );
  });

  describe('requestEmailChange', () => {
    it('does not touch the account — it only stores a pending token', async () => {
      await service.requestEmailChange(currentUser, 'new@example.com');

      expect(userRepository.save).not.toHaveBeenCalled();
      expect(tokenRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', newEmail: 'new@example.com' }),
      );
    });

    it('sends the confirmation to the new address, not the current one', async () => {
      await service.requestEmailChange(currentUser, 'new@example.com');

      expect(mailerService.send.mock.calls[0][0].to).toBe('new@example.com');
    });

    it('stores only the hash of the token', async () => {
      await service.requestEmailChange(currentUser, 'new@example.com');

      const stored = tokenRepository.save.mock.calls[0][0];
      const tokenInEmail = decodeURIComponent(
        /token=([^\s]+)/.exec(mailerService.send.mock.calls[0][0].text)?.[1] ?? '',
      );

      expect(tokenInEmail).toHaveLength(64);
      expect(stored.tokenHash).not.toBe(tokenInEmail);
    });

    it('normalizes the address and supersedes any pending request', async () => {
      await service.requestEmailChange(currentUser, '  NEW@Example.COM ');

      expect(tokenRepository.delete).toHaveBeenCalledWith({ userId: 'user-1', usedAt: null });
      expect(tokenRepository.save.mock.calls[0][0].newEmail).toBe('new@example.com');
    });

    it('rejects an address already used by someone else', async () => {
      userRepository.findOne.mockResolvedValue({ id: 'someone-else' });

      await expect(service.requestEmailChange(currentUser, 'taken@example.com')).rejects.toThrow(
        ConflictException,
      );
      expect(tokenRepository.save).not.toHaveBeenCalled();
    });

    it('rejects a no-op change', async () => {
      await expect(service.requestEmailChange(currentUser, 'OLD@example.com')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('still resolves when the confirmation email cannot be sent', async () => {
      mailerService.send.mockRejectedValue(new Error('smtp down'));

      await expect(
        service.requestEmailChange(currentUser, 'new@example.com'),
      ).resolves.toBeUndefined();
    });
  });

  describe('confirmEmailChange', () => {
    const validRecord = () => ({
      id: 'token-1',
      userId: 'user-1',
      newEmail: 'new@example.com',
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });

    it('applies the address and burns the token', async () => {
      tokenRepository.findOne.mockResolvedValue(validRecord());
      userRepository.findOne
        .mockResolvedValueOnce(null) // nobody else claimed it
        .mockResolvedValueOnce({ id: 'user-1', email: 'old@example.com' });

      const result = await service.confirmEmailChange('plain');

      expect(result.email).toBe('new@example.com');
      expect(userRepository.save.mock.calls[0][0].email).toBe('new@example.com');
      expect(tokenRepository.save.mock.calls[0][0].usedAt).toBeInstanceOf(Date);
    });

    it('rejects a used token', async () => {
      tokenRepository.findOne.mockResolvedValue({ ...validRecord(), usedAt: new Date() });

      await expect(service.confirmEmailChange('plain')).rejects.toThrow(BadRequestException);
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('rejects an expired token', async () => {
      tokenRepository.findOne.mockResolvedValue({
        ...validRecord(),
        expiresAt: new Date(Date.now() - 1),
      });

      await expect(service.confirmEmailChange('plain')).rejects.toThrow(BadRequestException);
    });

    it('rejects an unknown token', async () => {
      tokenRepository.findOne.mockResolvedValue(null);

      await expect(service.confirmEmailChange('plain')).rejects.toThrow(BadRequestException);
    });

    // The address can be claimed between the request and the click.
    it('re-checks availability at confirmation time', async () => {
      tokenRepository.findOne.mockResolvedValue(validRecord());
      userRepository.findOne.mockResolvedValue({ id: 'someone-else' });

      await expect(service.confirmEmailChange('plain')).rejects.toThrow(ConflictException);
      expect(userRepository.save).not.toHaveBeenCalled();
    });
  });
});
