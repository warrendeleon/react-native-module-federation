import { isHandledRemoteLoadError } from '../src/shell/federationErrors';

// The guard decides whether React Native's global handler is allowed to call an error fatal, so
// what it must never do is match something the app has not already handled. Every case below is
// about that boundary rather than about the happy path. The matching messages are copied from
// real iOS runs, development and release, rather than written to fit the implementation.

function named(name: string, message: string) {
  const error = new Error(message);
  error.name = name;
  return error;
}

describe('isHandledRemoteLoadError', () => {
  // A chunk whose signature does not verify, in a development build.
  test('matches a failed chunk load', () => {
    expect(
      isHandledRemoteLoadError(
        named(
          'ChunkLoadError',
          'Loading chunk __federation_expose_ListStack failed.\n(exec: __federation_expose_ListStack)\nwhile loading "./ListStack" from webpack/container/reference/listApp',
        ),
      ),
    ).toBe(true);
  });

  // The same failure in a release build, where the container module is minified to a numeric id.
  // An earlier version of this guard looked for the remote's name in that position: it passed in
  // development, failed in release, and let the app die exactly where it mattered.
  test('matches the release build, where the container is a numeric id', () => {
    expect(
      isHandledRemoteLoadError(
        named(
          'ChunkLoadError',
          'Loading chunk __federation_expose_ListStack failed.\nwhile loading "./ListStack" from 77469',
        ),
      ),
    ).toBe(true);
  });

  // A version the CDN does not hold: a different error, a different name, the same suffix and the
  // same already-handled state. A guard written around ChunkLoadError alone let this one through.
  test('matches a manifest that could not be fetched', () => {
    expect(
      isHandledRemoteLoadError(
        new Error(
          '[ Federation Runtime ]: Failed to get manifest. #RUNTIME-003\nwhile loading "./ListStack" from 77469',
        ),
      ),
    ).toBe(true);
  });

  // Everything below is an error nothing has absorbed, and calling any of them handled would hide
  // a real crash.
  test('does not match a chunk failure from outside the federation', () => {
    expect(
      isHandledRemoteLoadError(named('ChunkLoadError', 'Loading chunk 42 failed.\n(exec: 42)')),
    ).toBe(false);
  });

  test('does not match an ordinary application error', () => {
    expect(isHandledRemoteLoadError(new Error('Cannot read property id of undefined'))).toBe(false);
  });

  test('does not match an error that merely names a remote', () => {
    expect(isHandledRemoteLoadError(new Error('listApp failed to do something'))).toBe(false);
  });

  test.each([
    ['a string', 'while loading "./ListStack" from 77469'],
    ['null', null],
    ['undefined', undefined],
    ['an object with no message', { name: 'ChunkLoadError' }],
    ['a message that is not a string', { message: 42 }],
  ])('does not match %s', (_case, value) => {
    expect(isHandledRemoteLoadError(value)).toBe(false);
  });
});
