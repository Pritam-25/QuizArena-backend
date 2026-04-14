import { describe, expect, it } from 'vitest';
import {
  canTransition,
  transitions,
} from '../../../src/modules/session/domain/session.machine.js';

describe('session.machine', () => {
  it('defines expected transitions map', () => {
    expect(transitions.WAITING).toEqual(['STARTED']);
    expect(transitions.STARTED).toEqual(['QUESTION']);
    expect(transitions.QUESTION).toEqual(['QUESTION', 'ENDED']);
    expect(transitions.ENDED).toEqual([]);
  });

  it('allows only valid transitions', () => {
    expect(canTransition('WAITING', 'STARTED')).toBe(true);
    expect(canTransition('STARTED', 'QUESTION')).toBe(true);
    expect(canTransition('QUESTION', 'QUESTION')).toBe(true);
    expect(canTransition('QUESTION', 'ENDED')).toBe(true);

    expect(canTransition('WAITING', 'QUESTION')).toBe(false);
    expect(canTransition('STARTED', 'ENDED')).toBe(false);
    expect(canTransition('ENDED', 'WAITING')).toBe(false);
  });
});
