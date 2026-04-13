import { randomUUID } from 'node:crypto';

export const SESSION_JOIN_LINK_PREFIX = 'quizArena.com/';

/**
 * Generates a random UUID join code.
 */
export function generateSessionJoinCode(): string {
  return randomUUID();
}

/**
 * Converts raw join input (code or link) into a normalized code-only value.
 */
export function normalizeSessionJoinCode(rawJoinCode: string): string {
  const normalizedInput = rawJoinCode.trim().toLowerCase();
  const withoutProtocol = normalizedInput.replace(/^https?:\/\//, '');

  if (withoutProtocol.startsWith(SESSION_JOIN_LINK_PREFIX.toLowerCase())) {
    return withoutProtocol.slice(SESSION_JOIN_LINK_PREFIX.length);
  }

  return withoutProtocol;
}

/**
 * Builds a user-facing join link from a code-only join value.
 */
export function toSessionJoinLink(joinCode: string): string {
  return `${SESSION_JOIN_LINK_PREFIX}${joinCode}`;
}
