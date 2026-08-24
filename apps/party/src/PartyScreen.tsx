import React, { useEffect } from 'react';
import { LayoutAnimation, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { MAX_PARTY, partyStateReady, type PartyMember, type PartySliceShape } from '@pokedex/contracts';
import { Box, EmptySlot, PokemonCard, ScreenContainer, Text, toast } from '@pokedex/ui';
import { remove } from './partySlice';
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
  const members = useSelector((s: PartySliceShape) => s.party?.members ?? EMPTY_MEMBERS);
  // Stable handlers, so the memoised slots above skip re-renders their props do not ask for.
  const openDetail = React.useCallback(
    (id: number) => navigation.navigate('PokemonDetail', { id }),
    [navigation],
  );
  const removeMember = React.useCallback(
    (member: PartyMember) => {
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

  // The owner announces its own arrival. Importing ./partySlice above injected the reducer
  // as a side effect, so on the path where the boot import failed and this tab performed the
  // injection instead, nothing has dispatched the marker and state.party is still unsurfaced,
  // which would leave the Pokédex's Add disabled until some other action ran. Dispatching the
  // marker here is idempotent: no case handles it, and it costs one no-op action when the
  // boot path already fired it.
  useEffect(() => {
    dispatch(partyStateReady());
  }, [dispatch]);

  // A member arriving or leaving animates the grid into its new shape: the next render after
  // the store changes is wrapped in a spring. The write itself still crosses the seam as a
  // plain action; the motion is presentation, owned by this screen.
  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
  }, [members.length]);

  // Six slots: the first `members.length` filled, the rest dashed placeholders.
  const slots = Array.from({ length: MAX_PARTY }, (_, i) => members[i]);

  return (
    <ScreenContainer>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}>
        <Box className="flex-row items-center justify-between">
          <Text size="sm" className="font-semi text-darkGrey dark:text-lightGrey">
            Your team
          </Text>
          <Box className="rounded-full bg-lightGreen px-2.5 py-0.5 dark:bg-white/10">
            <Text size="xs" className="font-head text-darkGreen dark:text-pokemonGreen">
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
              <PartySlot key={member.uid} member={member} onOpen={openDetail} onRemoveMember={removeMember} />
            ) : (
              <Box key={`empty-${index}`} className="w-1/2 p-1.5">
                <EmptySlot number={index + 1} />
              </Box>
            ),
          )}
        </Box>
      </ScrollView>
    </ScreenContainer>
  );
}

// Static style values live in a sheet; only the safe-area offset is computed per render.
const styles = StyleSheet.create({
  scrollContent: { padding: 20 },
});
