import { registerShellNavigateHandler, shellNavigate } from '@pokedex/contracts';

import { shellNavigateHandler } from '../src/shell/shellNavigation';

// The native module is required lazily inside the handler, so the mock has to sit on the module
// path, not on an import. Each test decides what openNative resolves with.
const mockOpenNative = jest.fn<Promise<string>, [string, string]>();
jest.mock('../specs/NativeShellNavigationModule', () => ({
  __esModule: true,
  get default() {
    return { openNative: mockOpenNative };
  },
}));

// --- The bridge's JS seam, pinned from both sides: the contract's slot (what a remote calls)
// and the host handler (what runs). The native side is exercised on simulators; these tests
// hold the parts a unit test can hold — routing, serialisation, and the promise's tolerant
// edges — so a refactor cannot quietly change what a remote observes. ---
describe('the contract slot', () => {
  it('resolves undefined with a warning when no handler is registered', async () => {
    registerShellNavigateHandler(undefined as never);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(shellNavigate('QuickBattle')).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      '[shellNavigate] no handler registered (called with QuickBattle)',
    );
    warn.mockRestore();
  });

  it('hands destination and params through to the registered handler', async () => {
    const handler = jest.fn().mockResolvedValue({ ok: true });
    registerShellNavigateHandler(handler);
    await expect(shellNavigate('QuickBattle', { members: [] })).resolves.toEqual({ ok: true });
    expect(handler).toHaveBeenCalledWith('QuickBattle', { members: [] });
  });
});

describe('the host handler', () => {
  beforeEach(() => mockOpenNative.mockReset());

  it('warns and resolves undefined for a destination the registry does not know', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(shellNavigateHandler('ShareTeam')).resolves.toBeUndefined();
    expect(mockOpenNative).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith('[shellNavigate] unknown destination: ShareTeam');
    warn.mockRestore();
  });

  it('serialises params to JSON, calls the module by nativeId, and parses the result', async () => {
    mockOpenNative.mockResolvedValue('{"winnerUid":"abc"}');
    const result = await shellNavigateHandler('QuickBattle', {
      members: [],
      colourScheme: 'dark',
    });
    expect(mockOpenNative).toHaveBeenCalledWith(
      'quickBattle',
      JSON.stringify({ members: [], colourScheme: 'dark' }),
    );
    expect(result).toEqual({ winnerUid: 'abc' });
  });

  it('passes an empty object over the boundary when the caller sends no params', async () => {
    mockOpenNative.mockResolvedValue('{}');
    await expect(shellNavigateHandler('QuickBattle')).resolves.toEqual({});
    expect(mockOpenNative).toHaveBeenCalledWith('quickBattle', '{}');
  });

  it('resolves undefined for an empty result string rather than throwing on JSON.parse', async () => {
    mockOpenNative.mockResolvedValue('');
    await expect(shellNavigateHandler('QuickBattle', {})).resolves.toBeUndefined();
  });
});
