import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { validateImageSignature } from '@/common/utils/file-validator.util';
import { UpdateMyPreferencesDto } from '@/modules/users/dto/update-my-preferences.dto';
import { UsersController } from '@/modules/users/users.controller';

jest.mock('@/common/utils/file-validator.util', () => ({
  ...jest.requireActual('@/common/utils/file-validator.util'),
  validateImageSignature: jest.fn(),
}));

describe('UsersController', () => {
  it('returns timezones list from service', async () => {
    const timezonesService = {
      listTimeZones: jest.fn(() => [{ value: 'UTC', label: '(GMT+00:00) UTC' }]),
    };
    const controller = new UsersController(
      {} as any,
      {} as any,
      {} as any,
      timezonesService as any,
      {} as any,
    );

    const result = await controller.getTimeZones();

    expect(result).toEqual({ timeZones: [{ value: 'UTC', label: '(GMT+00:00) UTC' }] });
  });

  describe('uploadMyContentBackground', () => {
    const user = { id: 'user-1' } as any;
    const file = {
      filename: '0b7c1c0e-5d0c-4b8e-9d5f-2a1e3c4d5e6f.jpg',
      path: '/nonexistent/user-backgrounds/0b7c1c0e-5d0c-4b8e-9d5f-2a1e3c4d5e6f.jpg',
      mimetype: 'image/jpeg',
    } as any;

    const create = () => {
      const usersService = { updateMyContentBackground: jest.fn().mockResolvedValue(undefined) };
      const controller = new UsersController(
        usersService as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
      );
      return { controller, usersService };
    };

    beforeEach(() => {
      jest.mocked(validateImageSignature).mockReset();
    });

    it('stores the path the public route serves the file from', async () => {
      const { controller, usersService } = create();

      await expect(controller.uploadMyContentBackground(user, file)).resolves.toEqual({
        contentBackground: '/api/v1/users/backgrounds/0b7c1c0e-5d0c-4b8e-9d5f-2a1e3c4d5e6f.jpg',
      });
      expect(usersService.updateMyContentBackground).toHaveBeenCalledWith(
        'user-1',
        '/api/v1/users/backgrounds/0b7c1c0e-5d0c-4b8e-9d5f-2a1e3c4d5e6f.jpg',
      );
    });

    it('rejects a request without a file', async () => {
      const { controller, usersService } = create();

      await expect(controller.uploadMyContentBackground(user, undefined)).rejects.toThrow(
        BadRequestException,
      );
      expect(usersService.updateMyContentBackground).not.toHaveBeenCalled();
    });

    it('saves nothing when the bytes are not the declared image type', async () => {
      jest.mocked(validateImageSignature).mockImplementation(() => {
        throw new BadRequestException('File content does not match its type');
      });
      const { controller, usersService } = create();

      await expect(controller.uploadMyContentBackground(user, file)).rejects.toThrow(
        'File content does not match its type',
      );
      expect(usersService.updateMyContentBackground).not.toHaveBeenCalled();
    });
  });

  describe('preferences validation', () => {
    const errorsFor = (body: Record<string, unknown>) =>
      validate(plainToInstance(UpdateMyPreferencesDto, body));

    it.each([
      '/workspace-backgrounds/lightscape-LtnPejWDSAY-unsplash.jpg',
      '/workspace-backgrounds/mikita-karasiou--67uQbVmZ-A-unsplash.jpg',
      null,
    ])('accepts the background %p', async contentBackground => {
      await expect(errorsFor({ contentBackground })).resolves.toHaveLength(0);
    });

    it.each([
      'https://evil.example/photo.jpg',
      '/api/v1/users/backgrounds/someone-else.jpg',
      '/workspace-backgrounds/../../etc/passwd.jpg',
      '/workspace-backgrounds/photo.svg',
      42,
    ])('rejects the background %p', async contentBackground => {
      await expect(errorsFor({ contentBackground })).resolves.not.toHaveLength(0);
    });

    it.each([
      [0, true],
      [80, true],
      [-1, false],
      [81, false],
      [12.5, false],
    ])('dim %p is valid: %p', async (contentBackgroundDim, valid) => {
      const errors = await errorsFor({ contentBackgroundDim });
      expect(errors.length === 0).toBe(valid);
    });
  });
});
