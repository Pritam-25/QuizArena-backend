import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from '../../../src/config/env.js';
import { AuthService } from '../../../src/modules/auth/auth.service.js';
import type { AuthRepository } from '../../../src/modules/auth/auth.repository.js';
import { ERROR_CODES } from '../../../src/shared/utils/errors/errorCodes.js';
import { statusCode } from '../../../src/shared/utils/http/statusCodes.js';
import * as errorUtils from '../../../src/shared/utils/errors/index.js';

type RepoMock = {
  findUserByEmail: ReturnType<typeof vi.fn>;
  createUser: ReturnType<typeof vi.fn>;
};

function buildRepoMock(): RepoMock {
  return {
    findUserByEmail: vi.fn(),
    createUser: vi.fn(),
  };
}

describe('AuthService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('register throws USER_ALREADY_EXISTS when email already exists', async () => {
    const repo = buildRepoMock();
    const service = new AuthService(repo as unknown as AuthRepository);

    repo.findUserByEmail.mockResolvedValue({ id: 'user-1' });

    await expect(
      service.register({
        username: 'pritam',
        email: 'pritam@example.com',
        password: 'password123',
      })
    ).rejects.toMatchObject({
      statusCode: statusCode.conflict,
      errorCode: ERROR_CODES.USER_ALREADY_EXISTS,
    });
  });

  it('register hashes password and returns auth response', async () => {
    const repo = buildRepoMock();
    const service = new AuthService(repo as unknown as AuthRepository);

    repo.findUserByEmail.mockResolvedValue(null);
    repo.createUser.mockImplementation(async data => ({
      id: 'user-1',
      username: data.username,
      email: data.email,
      password: data.password,
      isGuest: false,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    }));

    const result = await service.register({
      username: 'pritam',
      email: 'pritam@example.com',
      password: 'password123',
    });

    const createPayload = repo.createUser.mock.calls[0][0];
    expect(createPayload.password).not.toBe('password123');
    expect(await bcrypt.compare('password123', createPayload.password)).toBe(
      true
    );

    const decoded = jwt.verify(result.token, env.JWT_SECRET) as {
      userId: string;
    };
    expect(decoded.userId).toBe('user-1');
    expect(result.user.email).toBe('pritam@example.com');
  });

  it('register maps unique constraint error to USER_ALREADY_EXISTS', async () => {
    const repo = buildRepoMock();
    const service = new AuthService(repo as unknown as AuthRepository);

    repo.findUserByEmail.mockResolvedValue(null);
    repo.createUser.mockRejectedValue(new Error('duplicate'));
    vi.spyOn(errorUtils, 'isUniqueConstraintError').mockReturnValue(true);

    await expect(
      service.register({
        username: 'pritam',
        email: 'pritam@example.com',
        password: 'password123',
      })
    ).rejects.toMatchObject({
      statusCode: statusCode.conflict,
      errorCode: ERROR_CODES.USER_ALREADY_EXISTS,
    });
  });

  it('login throws INVALID_CREDENTIALS when user does not exist', async () => {
    const repo = buildRepoMock();
    const service = new AuthService(repo as unknown as AuthRepository);

    repo.findUserByEmail.mockResolvedValue(null);

    await expect(
      service.login({
        email: 'missing@example.com',
        password: 'password123',
      })
    ).rejects.toMatchObject({
      statusCode: statusCode.unauthorized,
      errorCode: ERROR_CODES.INVALID_CREDENTIALS,
    });
  });

  it('login throws INVALID_CREDENTIALS when password mismatches', async () => {
    const repo = buildRepoMock();
    const service = new AuthService(repo as unknown as AuthRepository);

    const hashedPassword = await bcrypt.hash('password123', 10);
    repo.findUserByEmail.mockResolvedValue({
      id: 'user-1',
      username: 'pritam',
      email: 'pritam@example.com',
      password: hashedPassword,
      isGuest: false,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await expect(
      service.login({
        email: 'pritam@example.com',
        password: 'wrong-password',
      })
    ).rejects.toMatchObject({
      statusCode: statusCode.unauthorized,
      errorCode: ERROR_CODES.INVALID_CREDENTIALS,
    });
  });

  it('login returns token and user response for valid credentials', async () => {
    const repo = buildRepoMock();
    const service = new AuthService(repo as unknown as AuthRepository);

    const hashedPassword = await bcrypt.hash('password123', 10);
    repo.findUserByEmail.mockResolvedValue({
      id: 'user-1',
      username: 'pritam',
      email: 'pritam@example.com',
      password: hashedPassword,
      isGuest: false,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const result = await service.login({
      email: 'pritam@example.com',
      password: 'password123',
    });

    const decoded = jwt.verify(result.token, env.JWT_SECRET) as {
      userId: string;
    };
    expect(decoded.userId).toBe('user-1');
    expect(result.user.username).toBe('pritam');
  });
});
