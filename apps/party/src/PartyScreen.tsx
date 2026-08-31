import React, { useEffect } from 'react';
import { LayoutAnimation, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { useColorScheme } from 'nativewind';
import {
  MAX_PARTY,
  partyStateReady,
  shellNavigate,
  type PartyMember,
  type PartySliceShape,
  type QuickBattleResult,
} from '@pokedex/contracts';
import { Box, Button, ButtonText, EmptySlot, PokemonCard, ScreenContainer, Text, toast } from '@pokedex/ui';
import { remove, setLastBattleWinner } from './partySlice';
import type { PartyParamList } from './routes';

// The owner reads its own state through the same tolerant shape foreign modules use — even the
// owner's first render can beat the first action into the store, so the slice key may still be
// undefined here. (Importing `remove` above also runs partySlice.ts, so opening this tab injects
// the slice as a side effect; the host's boot import exists so nobody has to rely on that.)
//
// The Party tab rides the colour scheme like every other surface: offWhite in light, navy in
// dark, members as the same PokemonCard the Pokédex uses — same component, same singleton
// instance at runtime — and the empty slots keep their dashed outline as token classes.
// A single shared empty array: a fresh [] per render from the selector would re-render
// every consumer of `members` even while the party is unchanged.
const EMPTY_MEMBERS: PartyMember[] = [];

// The owner's own view of its slice. The contract carries `members`, because foreign modules read
// it; the last winner is read here and nowhere else, so it stays out of the contract and is added
// to the shape locally instead.
type PartyOwnShape = PartySliceShape & {
  party?: { lastBattleWinnerUid?: string | null };
};

// Two contestants is the floor for a battle. Stated as a constant because the button's disabled
// state and the hint under it are two readings of the same rule.
const MIN_CONTESTANTS = 2;

// One filled slot, memoised at module level: PokemonCard's memo only holds when its props
// are stable, and closures built inside the slot map are new on every parent render. This
// wrapper owns those closures and re-renders only when its member or a stable handler changes.
const PartySlot = React.memo(function PartySlotRow({
  member,
  onOpen,
  onRemoveMember,
}: {
  member: PartyMember;
  onOpen: (id: number) => void;
  onRemoveMember: (member: PartyMember) => void;
}) {
  return (
    <Box className="w-1/2 p-1.5">
      <PokemonCard
        id={member.id}
        name={member.name}
        types={member.types}
        spriteUri={member.spriteUri}
        onPress={() => onOpen(member.id)}
        onRemove={() => onRemoveMember(member)}
      />
    </Box>
  );
});

export default function PartyScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<PartyParamList>>();
  const dispatch = useDispatch();
  const { colorScheme } = useColorScheme();
  const members = useSelector((s: PartyOwnShape) => s.party?.members ?? EMPTY_MEMBERS);
  const lastBattleWinnerUid = useSelector(
    (s: PartyOwnShape) => s.party?.lastBattleWinnerUid ?? null,
  );
  const lastWinner = members.find(m => m.uid === lastBattleWinnerUid) ?? null;
  // Stable handlers, so the memoised slots above skip re-renders their props do not ask for.
  const openDetail = React.useCallback(
    (id: number) => navigation.navigate('PokemonDetail', { id }),
    [navigation],
  );
  const removeMember = React.useCallback(
    (member: PartyMember) => {
      // The spring is configured in the same tick as the dispatch, before React re-renders
      // and lays out the five-slot grid, so the shrink animates. Configuring during render
      // would be a side effect in a phase React is free to restart or abandon; this handler
      // runs exactly once per tap. The write itself still crosses the seam as a plain
      // action; the motion is presentation, owned by this screen.
      LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
      dispatch(remove(member.uid));
      // The owner confirms its own write the same way the list confirms its add:
      // one toast() into the shared singleton, shown by the host.
      toast(`${member.name} left your party`, {
        spriteUri: member.spriteUri,
        accentType: member.types[0],
      });
    },
    [dispatch],
  );

  // The one call a remote makes to reach native. `shellNavigate` is the whole of what this app
  // knows about the other side: no TurboModule import, no native types, no idea that the screen
  // it opens is SwiftUI on one platform and Compose on the other. The host resolves the
  // destination and owns everything past it.
  //
  // The await is the point. It does not return until the native flow has finished, and what comes
  // back lands in this app's own state through this app's own action — the round trip starts and
  // ends inside the party, so nothing about the battle needs to cross the contract.
  const [battleInFlight, setBattleInFlight] = React.useState(false);
  const onQuickBattle = React.useCallback(async () => {
    if (battleInFlight) return;
    setBattleInFlight(true);
    try {
      // The theme is read at the moment of the call, from the same NativeWind observable every
      // dark: class in the federation subscribes to. It is sent rather than observed because the
      // native screen has no way to subscribe: a toggle while the battle is open will not reach it.
      const result = (await shellNavigate('QuickBattle', {
        members,
        colourScheme: colorScheme === 'dark' ? 'dark' : 'light',
      })) as QuickBattleResult | undefined;
      // No winner is a real outcome, not a failure: the screen can be closed without battling,
      // and the native side resolves with an empty object when it is.
      if (result?.winnerUid) {
        dispatch(setLastBattleWinner(result.winnerUid));
      }
    } finally {
      setBattleInFlight(false);
    }
  }, [battleInFlight, colorScheme, dispatch, members]);

  // The owner announces its own arrival. Importing ./partySlice above injected the reducer
  // as a side effect, so on the path where the boot import failed and this tab performed the
  // injection instead, nothing has dispatched the marker and state.party is still unsurfaced,
  // which would leave the Pokédex's Add disabled until some other action ran. Dispatching the
  // marker here is idempotent: no case handles it, and it costs one no-op action when the
  // boot path already fired it.
  useEffect(() => {
    dispatch(partyStateReady());
  }, [dispatch]);

  // Six slots: the first `members.length` filled, the rest dashed placeholders.
  const slots = Array.from({ length: MAX_PARTY }, (_, i) => members[i]);

  return (
    <ScreenContainer>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}>
        {/* Grouped, named and live, the same as the Pokédex's counter. Ungrouped, a reader gets
            "Your team" and "1/6" as two unrelated reads, and "1/6" is spoken as "one slash six"
            or as a date depending on the reader. The colour repair reached this pill two rounds
            before its name and grouping did, which is the shape this post is about. */}
        <Box
          className="flex-row items-center justify-between"
          accessible
          accessibilityLiveRegion="polite"
          accessibilityLabel={`Your team, ${members.length} of ${MAX_PARTY}`}>
          <Text size="sm" className="font-semi text-darkGrey dark:text-lightGrey">
            Your team
          </Text>
          <Box className="rounded-full bg-lightGreen px-2.5 py-0.5 dark:bg-white/10">
            {/* darkGrey, not darkGreen: darkGreen is #A6D3A0, the grass fill, and on lightGreen
                it measures 1.53:1. darkGrey is the colour the label beside it already uses. */}
            <Text size="xs" className="font-head text-darkGrey dark:text-pokemonGreen">
              {members.length}/{MAX_PARTY}
            </Text>
          </Box>
        </Box>
        <Text size="sm" className="mb-5 mt-1 text-darkGrey dark:text-lightGrey">
          {members.length === 0
            ? 'Your party is empty. Add up to 6 Pokémon from the Pokédex.'
            : 'Tap a Pokémon for its detail, or remove it to free the slot.'}
        </Text>
        <Box className="flex-row flex-wrap">
          {slots.map((member, index) =>
            member ? (
              // The key carries the colour scheme, and it has to. A theme change alters none of
              // this slot's props, so the memo above finds them identical and skips the subtree;
              // the card then keeps the style objects the styling runtime resolved for the old
              // scheme and paints as an empty white rectangle. Keying by scheme makes a toggle a
              // remount of six small cards, while the memo goes on doing its job within a theme.
              // The Pokédex grid does not memoise its cards, which is why it never showed this.
              <PartySlot
                key={`${member.uid}:${colorScheme}`}
                member={member}
                onOpen={openDetail}
                onRemoveMember={removeMember}
              />
            ) : (
              <Box key={`empty-${index}`} className="w-1/2 p-1.5">
                <EmptySlot number={index + 1} />
              </Box>
            ),
          )}
        </Box>

        {/* The handoff's one control. Disabled below two members, because a battle needs two
            contestants; the hint under it says which rule it is rather than leaving a dead
            button to explain itself. */}
        <Button
          onPress={onQuickBattle}
          disabled={members.length < MIN_CONTESTANTS || battleInFlight}
          size="lg"
          className={`mt-6 rounded-xl ${
            members.length < MIN_CONTESTANTS ? 'bg-lightGrey dark:bg-white/10' : 'bg-purple'
          }`}
          // The 44pt minimum is declared, not inherited from the size variant, the same way the
          // detail's Add button declares it: the accessibility suite can only check what the
          // control states about itself.
          style={{ alignSelf: 'stretch', minWidth: 44, minHeight: 44 }}
          accessibilityRole="button">
          <ButtonText
            className={members.length < MIN_CONTESTANTS ? 'text-midGrey' : 'text-white'}>
            {battleInFlight ? 'Battling…' : 'Quick Battle'}
          </ButtonText>
        </Button>
        {members.length < MIN_CONTESTANTS ? (
          <Text size="xs" className="mt-2 text-center text-darkGrey dark:text-lightGrey">
            Add at least 2 Pokémon to battle.
          </Text>
        ) : null}

        {/* What came back from native, rendered by the app that owns the state. */}
        {lastWinner ? (
          <Text
            size="sm"
            className="mt-3 text-center font-semi text-darkGrey dark:text-lightGrey"
            accessibilityLiveRegion="polite">
            Last battle winner: {lastWinner.name}
          </Text>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

// Static style values live in a sheet; only the safe-area offset is computed per render.
const styles = StyleSheet.create({
  scrollContent: { padding: 20 },
});
