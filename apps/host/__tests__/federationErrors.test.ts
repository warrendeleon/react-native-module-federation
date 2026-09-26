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

  // The suffix is the last line the runtime wrote. The same words anywhere else are a diagnostic
  // that happens to quote them, and treating that as handled would hide a real crash.
  test('does not match the suffix words in the middle of a message', () => {
    expect(
      isHandledRemoteLoadError(
        new Error(
          'cache miss\nwhile loading "./ListStack" from 77469\nTypeError: cannot read property of undefined',
        ),
      ),
    ).toBe(false);
    expect(
      isHandledRemoteLoadError(new Error('quoted: while loading "./ListStack" from 77469')),
    ).toBe(false);
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

// --- The installed handler, not just the matcher. What the guard promises is about forwarding:
// a handled remote failure stops here, and everything else reaches the handler that was there
// before, with its fatal flag intact. Loaded fresh each time, because installation happens once
// per module instance. ---
describe('the installed global handler', () => {
  type Handler = (error: unknown, isFatal?: boolean) => void;

  function install() {
    const previous = jest.fn<void, [unknown, boolean?]>();
    let installed: Handler | undefined;
    const globals = globalThis as unknown as { ErrorUtils?: unknown };
    const original = globals.ErrorUtils;
    globals.ErrorUtils = {
      getGlobalHandler: () => previous,
      setGlobalHandler: (handler: Handler) => {
        installed = handler;
      },
    };
    jest.isolateModules(() => {
      require('../src/shell/federationErrors').guardHandledRemoteLoadErrors();
    });
    globals.ErrorUtils = original;
    if (!installed) {
      throw new Error('the guard did not install a handler');
    }
    return { handler: installed, previous };
  }

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('stops a handled remote failure from reaching the fatal handler', () => {
    const { handler, previous } = install();
    handler(
      named('ChunkLoadError', 'Loading chunk __federation_expose_ListStack failed.\nwhile loading "./ListStack" from 77469'),
      true,
    );
    expect(previous).not.toHaveBeenCalled();
  });

  test.each([
    ['an ordinary application error', new Error('Cannot read property id of undefined')],
    ['the suffix words mid-message', new Error('while loading "./ListStack" from 77469\nand then this')],
    ['a string thrown on its own', 'while loading "./ListStack" from 77469'],
  ])('forwards %s with its fatal flag', (_case, error) => {
    const { handler, previous } = install();
    handler(error, true);
    expect(previous).toHaveBeenCalledWith(error, true);
    handler(error, false);
    expect(previous).toHaveBeenLastCalledWith(error, false);
  });
});
