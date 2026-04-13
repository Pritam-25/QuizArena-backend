import { describeDb } from '../../setup/test-db.js';
import { UserRepository } from '../../../src/modules/user/user.repository.js';
import { UserService } from '../../../src/modules/user/user.service.js';
import { expect, it } from 'vitest';

describeDb('User integration', () => {
  const service = new UserService(new UserRepository());

  it('createUser creates guest user with provided username', async () => {
    const result = await service.createUser({ username: 'player-one' });

    expect(result.username).toBe('player-one');
    expect(result.isGuest).toBe(true);
  });

  it('createUser generates fallback guest username when missing', async () => {
    const result = await service.createUser({});

    expect(result.username.startsWith('guest_')).toBe(true);
    expect(result.isGuest).toBe(true);
  });

  it('getUserById returns created user data', async () => {
    const created = await service.createUser({ username: 'player-two' });

    const found = await service.getUserById(created.id);

    expect(found).not.toBeNull();
    expect(found?.id).toBe(created.id);
    expect(found?.username).toBe('player-two');
  });
});
