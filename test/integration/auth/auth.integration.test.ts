import { randomUUID } from 'node:crypto';
import { it, expect } from 'vitest';
import { describeDb } from '../../setup/test-db.js';
import { AuthRepository } from '../../../src/modules/auth/auth.repository.js';
import { AuthService } from '../../../src/modules/auth/auth.service.js';
import { ERROR_CODES } from '../../../src/shared/utils/errors/errorCodes.js';
import { statusCode } from '../../../src/shared/utils/http/statusCodes.js';

describeDb('Auth integration', () => {
  const service = new AuthService(new AuthRepository());

  it('register creates non-guest user and returns token', async () => {
    const email = `${randomUUID()}@example.com`;

    const result = await service.register({
      username: 'auth-user',
      email,
      password: 'password123',
    });

    expect(result.token).toBeTypeOf('string');
    expect(result.token.length).toBeGreaterThan(10);
    expect(result.user.email).toBe(email);
    expect(result.user.isGuest).toBe(false);
  });

  it('register returns USER_ALREADY_EXISTS for duplicate email', async () => {
    const email = `${randomUUID()}@example.com`;

    await service.register({
      username: 'first-user',
      email,
      password: 'password123',
    });

    await expect(
      service.register({
        username: 'second-user',
        email,
        password: 'password123',
      })
    ).rejects.toMatchObject({
      statusCode: statusCode.conflict,
      errorCode: ERROR_CODES.USER_ALREADY_EXISTS,
    });
  });

  it('login returns INVALID_CREDENTIALS for wrong password', async () => {
    const email = `${randomUUID()}@example.com`;

    await service.register({
      username: 'login-user',
      email,
      password: 'password123',
    });

    await expect(
      service.login({
        email,
        password: 'wrong-password',
      })
    ).rejects.toMatchObject({
      statusCode: statusCode.unauthorized,
      errorCode: ERROR_CODES.INVALID_CREDENTIALS,
    });
  });

  it('login returns token for valid credentials', async () => {
    const email = `${randomUUID()}@example.com`;

    await service.register({
      username: 'login-success-user',
      email,
      password: 'password123',
    });

    const result = await service.login({
      email,
      password: 'password123',
    });

    expect(result.user.email).toBe(email);
    expect(result.token).toBeTypeOf('string');
  });
});
