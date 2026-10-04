import {
  FAILURE_THRESHOLD,
  nextHealthOnFailure,
  nextHealthOnSuccess,
  type RemoteHealth,
  shouldRollBack,
} from '../src/shell/remoteHealth';

// The decisions behind the launch-time rollback, asked directly: how a failure and a render move
// the record, and when the record says to stop trying a version.

describe('after a failed load', () => {
  test('the first failure of a version starts its count at one', () => {
    expect(nextHealthOnFailure(null, '1.2.0')).toEqual({ version: '1.2.0', fails: 1 });
  });

  test('the same version counts up', () => {
    const once = nextHealthOnFailure(null, '1.2.0');
    expect(nextHealthOnFailure(once, '1.2.0')).toEqual({ version: '1.2.0', fails: 2 });
  });

  test('a different version starts over: a fixed release is not held back by the old one', () => {
    const old: RemoteHealth = { version: '1.2.0', fails: 5 };
    expect(nextHealthOnFailure(old, '1.3.0')).toEqual({ version: '1.3.0', fails: 1 });
  });
});

describe('after the remote rendered', () => {
  test('a render of the CDN version clears the count', () => {
    expect(nextHealthOnSuccess({ version: '1.2.0', fails: 1 }, '1.2.0', false)).toEqual({
      version: '1.2.0',
      fails: 0,
    });
  });

  test('the first ever render writes a clean record', () => {
    expect(nextHealthOnSuccess(null, '1.2.0', false)).toEqual({ version: '1.2.0', fails: 0 });
  });

  // The rule that lets a broken version reach the threshold: what rendered was the copy, which says
  // nothing about the version the map named.
  test('a render of the copy changes nothing', () => {
    expect(nextHealthOnSuccess({ version: '1.2.0', fails: 1 }, '1.2.0', true)).toBeNull();
  });

  test('a launch with no CDN version, bundled or dev, changes nothing', () => {
    expect(nextHealthOnSuccess({ version: '1.2.0', fails: 1 }, undefined, false)).toBeNull();
  });

  test('a count already at zero is not written again', () => {
    expect(nextHealthOnSuccess({ version: '1.2.0', fails: 0 }, '1.2.0', false)).toBeNull();
  });

  test('a render of a newer version writes that version clean', () => {
    expect(nextHealthOnSuccess({ version: '1.2.0', fails: 0 }, '1.3.0', false)).toEqual({
      version: '1.3.0',
      fails: 0,
    });
  });
});

describe('deciding to roll back', () => {
  test('nothing recorded, nothing to roll back', () => {
    expect(shouldRollBack(null, '1.2.0')).toBe(false);
  });

  test('one short of the threshold is still a version worth trying', () => {
    expect(shouldRollBack({ version: '1.2.0', fails: FAILURE_THRESHOLD - 1 }, '1.2.0')).toBe(false);
  });

  test('at the threshold the version is skipped', () => {
    expect(shouldRollBack({ version: '1.2.0', fails: FAILURE_THRESHOLD }, '1.2.0')).toBe(true);
  });

  test('a record for another version does not count against this one', () => {
    expect(shouldRollBack({ version: '1.2.0', fails: 9 }, '1.3.0')).toBe(false);
  });

  test('the threshold is two: one failure is weather, two is a pattern', () => {
    expect(FAILURE_THRESHOLD).toBe(2);
  });
});

describe('across launches', () => {
  test('exactly FAILURE_THRESHOLD failed launches in a row roll the version back, not fewer', () => {
    let health: RemoteHealth | null = null;
    for (let launch = 1; launch < FAILURE_THRESHOLD; launch++) {
      health = nextHealthOnFailure(health, '1.2.0');
      expect(shouldRollBack(health, '1.2.0')).toBe(false);
    }
    health = nextHealthOnFailure(health, '1.2.0');
    expect(shouldRollBack(health, '1.2.0')).toBe(true);
  });

  test('a render of the CDN version in between starts the count again', () => {
    let health: RemoteHealth | null = nextHealthOnFailure(null, '1.2.0');
    health = nextHealthOnSuccess(health, '1.2.0', false);
    health = nextHealthOnFailure(health, '1.2.0');
    expect(shouldRollBack(health, '1.2.0')).toBe(false);
  });

  test('a render of the copy in between does not', () => {
    let health: RemoteHealth | null = nextHealthOnFailure(null, '1.2.0');
    health = nextHealthOnSuccess(health, '1.2.0', true) ?? health;
    health = nextHealthOnFailure(health, '1.2.0');
    expect(shouldRollBack(health, '1.2.0')).toBe(true);
  });
});
