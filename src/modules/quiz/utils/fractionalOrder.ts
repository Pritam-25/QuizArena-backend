const BASE = 'abcdefghijklmnopqrstuvwxyz';
const MIN_CHAR = 'a';
const MAX_CHAR = 'z';

export function getMiddleString(a: string, b: string): string {
  if (a >= b) {
    throw new Error(
      'Invalid order bounds: left bound must be less than right bound'
    );
  }

  let result = '';
  let i = 0;

  while (true) {
    const charA = a[i] ?? MIN_CHAR;
    const charB = b[i] ?? MAX_CHAR;

    if (charA === charB) {
      result += charA;
      i += 1;
      continue;
    }

    const indexA = BASE.indexOf(charA);
    const indexB = BASE.indexOf(charB);

    if (indexA === -1 || indexB === -1) {
      throw new Error('Invalid order value: only lowercase a-z are supported');
    }

    const mid = Math.floor((indexA + indexB) / 2);

    if (mid === indexA) {
      result += charA;
      i += 1;
      continue;
    }

    result += BASE[mid];
    break;
  }

  if (!(result > a && result < b)) {
    throw new Error('Unable to generate a fractional order key between bounds');
  }

  return result;
}
