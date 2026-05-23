import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const readSource = () =>
  readFileSync(join(__dirname, '..', 'app', '_layout.tsx'), 'utf8');

describe('app/_layout root routing', () => {
  it('test_rootLayout_noUnstableSettings_anchorNotPresent', () => {
    const source = readSource();
    expect(source).not.toContain('unstable_settings');
  });

  it('test_rootLayout_noInitialRouteName', () => {
    const source = readSource();
    expect(source).not.toContain('initialRouteName');
  });

  it('test_rootLayout_conditionalAuth_usesHasUserGuard', () => {
    const source = readSource();
    expect(source).toContain('hasUser');
  });

  it('test_rootLayout_authGuard_usesExpoRouterProtectedRoutes', () => {
    const source = readSource();

    expect(source).toContain('Stack.Protected guard={hasUser}');
    expect(source).toContain('Stack.Protected guard={!hasUser}');
  });

  it('test_rootLayout_conditionalAuth_separatesAuthAndAppStacks', () => {
    const source = readSource();
    expect(source).toContain('auth/index');
    expect(source).toContain('(tabs)');
  });

  it('test_rootLayout_topLevelScreens_usesConcreteExpoRouteNames', () => {
    const source = readSource();

    expect(source).not.toContain('name="backup"');
    expect(source).not.toContain('name="track-diet"');
    expect(source).not.toContain('name="track-weight"');
    expect(source).not.toContain('name="track-workouts"');
    expect(source).toContain('name="track-diet/index"');
    expect(source).toContain('name="track-weight/index"');
    expect(source).toContain('name="track-workouts/index"');
  });
});
