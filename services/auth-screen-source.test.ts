import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const readSource = () =>
  readFileSync(join(__dirname, '..', 'app', 'auth', 'index.tsx'), 'utf8');

describe('app/auth/index auth screen', () => {
  it('test_authScreen_noOnAuthStateChanged', () => {
    const source = readSource();
    expect(source).not.toContain('onAuthStateChanged');
  });

  it('test_authScreen_noRouterReplaceInHandleSubmit', () => {
    const source = readSource();
    expect(source).not.toContain("router.replace('/(tabs)')");
  });
});
