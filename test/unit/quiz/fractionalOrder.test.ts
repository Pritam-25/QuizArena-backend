import { describe, expect, it } from 'vitest';
import { getMiddleString } from '../../../src/modules/quiz/utils/fractionalOrder.js';

describe('getMiddleString', () => {
  it('returns a value between two simple bounds', () => {
    const result = getMiddleString('a', 'c');

    expect(result).toBe('b');
  });

  it('returns a value between bounds with same prefix', () => {
    const result = getMiddleString('am', 'az');

    expect(result > 'am').toBe(true);
    expect(result < 'az').toBe(true);
  });

  it('throws when left bound is not less than right bound', () => {
    expect(() => getMiddleString('m', 'm')).toThrow(
      'Invalid order bounds: left bound must be less than right bound'
    );
    expect(() => getMiddleString('z', 'a')).toThrow(
      'Invalid order bounds: left bound must be less than right bound'
    );
  });

  it('throws when non-lowercase characters are used', () => {
    expect(() => getMiddleString('A', 'z')).toThrow(
      'Invalid order value: only lowercase a-z are supported'
    );
  });
});
