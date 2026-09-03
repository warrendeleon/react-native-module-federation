import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { addToParty, registerShellNavigateHandler, rootReducer } from '@pokedex/contracts';

import PartyScreen from '../src/PartyScreen';
import { partySlice, setLastBattleWinner } from '../src/partySlice';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

// --- What the handoff promises the party, pinned where the party consumes it: the button's
// gating, the await landing in the owner's own action, and a resultless settle leaving state
// alone. The shell is a registered fake, exactly the seam a remote sees. ---

const makeStore = () => configureStore({ reducer: rootReducer });

const bulbasaur = { id: 1, name: 'Bulbasaur', spriteUri: 'about:blank', types: ['grass'] };
const charmander = { id: 4, name: 'Charmander', spriteUri: 'about:blank', types: ['fire'] };

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function renderParty(store: ReturnType<typeof makeStore>) {
  return render(
    <Provider store={store}>
      <SafeAreaProvider initialMetrics={metrics}>
        <PartyScreen />
      </SafeAreaProvider>
    </Provider>,
  );
}

describe('the party slice, battle pieces', () => {
  it('keeps the winner private state and clears it when the member leaves', () => {
    const store = makeStore();
    store.dispatch(addToParty(bulbasaur));
    const uid = (store.getState() as never as { party: { members: { uid: string }[] } }).party
      .members[0].uid;
    store.dispatch(setLastBattleWinner(uid));
    let state = store.getState() as never as {
      party: { lastBattleWinnerUid: string | null };
    };
    expect(state.party.lastBattleWinnerUid).toBe(uid);
    store.dispatch(partySlice.actions.remove(uid));
    state = store.getState() as never as { party: { lastBattleWinnerUid: string | null } };
    expect(state.party.lastBattleWinnerUid).toBeNull();
  });
});

describe('the Quick Battle button', () => {
  it('is disabled below two members, with the hint saying why', () => {
    const store = makeStore();
    store.dispatch(addToParty(bulbasaur));
    renderParty(store);
    expect(screen.getByText('Quick Battle')).toBeDisabled();
    expect(screen.getByText('Add at least 2 Pokémon to battle.')).toBeOnTheScreen();
  });

  it('sends the members, lands the winner through the private action, and shows the banner', async () => {
    const store = makeStore();
    store.dispatch(addToParty(bulbasaur));
    store.dispatch(addToParty(charmander));
    const members = (store.getState() as never as { party: { members: { uid: string }[] } })
      .party.members;

    let resolveBattle!: (r: { winnerUid: string }) => void;
    const shell = jest.fn().mockImplementation(
      () => new Promise(resolve => (resolveBattle = resolve)),
    );
    registerShellNavigateHandler(shell);

    renderParty(store);
    fireEvent.press(screen.getByText('Quick Battle'));

    // In flight: relabelled, and a second press cannot start a second battle.
    expect(await screen.findByText('Battling…')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Battling…'));
    expect(shell).toHaveBeenCalledTimes(1);
    expect(shell).toHaveBeenCalledWith('QuickBattle', {
      members,
      colourScheme: 'light',
    });

    await act(async () => resolveBattle({ winnerUid: members[1].uid }));
    expect(screen.getByText('Last battle winner: Charmander')).toBeOnTheScreen();
    expect(screen.getByText('Quick Battle')).not.toBeDisabled();
  });

  it('treats a resultless settle as nothing happened', async () => {
    const store = makeStore();
    store.dispatch(addToParty(bulbasaur));
    store.dispatch(addToParty(charmander));
    registerShellNavigateHandler(jest.fn().mockResolvedValue({}));

    renderParty(store);
    await act(async () => {
      fireEvent.press(screen.getByText('Quick Battle'));
    });

    expect(screen.queryByText(/Last battle winner/)).toBeNull();
    expect(
      (store.getState() as never as { party: { lastBattleWinnerUid: string | null } }).party
        .lastBattleWinnerUid,
    ).toBeNull();
  });
});
