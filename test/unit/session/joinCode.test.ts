import { describe, expect, it } from 'vitest';
import {
  SESSION_JOIN_LINK_PREFIX,
  generateSessionJoinCode,
  normalizeSessionJoinCode,
  toSessionJoinLink,
} from '../../../src/modules/session/utils/joinCode.js';

describe('session join code utils', () => {
  it('generates a valid UUID', () => {
    const value = generateSessionJoinCode();

    expect(value).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it('builds join link with configured prefix', () => {
    const joinCode = '123e4567-e89b-12d3-a456-426614174000';

    expect(toSessionJoinLink(joinCode)).toBe(
      `${SESSION_JOIN_LINK_PREFIX}${joinCode}`
    );
  });

  it('normalizes prefixed links to code-only', () => {
    const joinCode = '123e4567-e89b-12d3-a456-426614174000';

    expect(normalizeSessionJoinCode(`https://quizArena.com/${joinCode}`)).toBe(
      joinCode
    );
    expect(normalizeSessionJoinCode(`quizArena.com/${joinCode}`)).toBe(
      joinCode
    );
  });
});
