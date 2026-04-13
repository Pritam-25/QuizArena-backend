import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserService } from '../../../src/modules/user/user.service.js';
import type { UserRepository } from '../../../src/modules/user/user.repository.js';

type RepoMock = {
  createUser: ReturnType<typeof vi.fn>;
  findById: ReturnType<typeof vi.fn>;
};

function buildRepoMock(): RepoMock {
  return {
    createUser: vi.fn(),
    findById: vi.fn(),
  };
}

describe('UserService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('createUser uses provided username', async () => {
    const repo = buildRepoMock();
    const service = new UserService(repo as unknown as UserRepository);

    const now = new Date('2026-01-01T00:00:00.000Z');
    repo.createUser.mockResolvedValue({
      id: 'user-1',
      username: 'explicit-name',
      email: null,
      password: null,
      isGuest: true,
      createdAt: now,
      updatedAt: now,
    });

    const result = await service.createUser({ username: 'explicit-name' });

    expect(repo.createUser).toHaveBeenCalledWith('explicit-name');
    expect(result.username).toBe('explicit-name');
  });

  it('createUser generates guest username when missing', async () => {
    const repo = buildRepoMock();
    const service = new UserService(repo as unknown as UserRepository);

    vi.spyOn(Date, 'now').mockReturnValue(1234567890);

    repo.createUser.mockResolvedValue({
      id: 'user-2',
      username: 'guest_1234567890',
      email: null,
      password: null,
      isGuest: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const result = await service.createUser({});

    expect(repo.createUser).toHaveBeenCalledWith('guest_1234567890');
    expect(result.username).toBe('guest_1234567890');
  });

  it('getUserById returns null when user does not exist', async () => {
    const repo = buildRepoMock();
    const service = new UserService(repo as unknown as UserRepository);

    repo.findById.mockResolvedValue(null);

    const result = await service.getUserById('missing-user');

    expect(result).toBeNull();
  });

  it('getUserById maps user to response dto', async () => {
    const repo = buildRepoMock();
    const service = new UserService(repo as unknown as UserRepository);

    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    repo.findById.mockResolvedValue({
      id: 'user-3',
      username: 'player-one',
      email: null,
      password: null,
      isGuest: true,
      createdAt,
      updatedAt: createdAt,
    });

    const result = await service.getUserById('user-3');

    expect(result).toEqual({
      id: 'user-3',
      username: 'player-one',
      isGuest: true,
      createdAt,
    });
  });
});
