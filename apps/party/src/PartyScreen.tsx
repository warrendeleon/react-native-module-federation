import React, { useEffect } from 'react';
import { LayoutAnimation, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { MAX_PARTY, type PartySliceShape } from '@pokedex/contracts';
import { Box, EmptySlot, PokemonCard, ScreenContainer, Text } from '@pokedex/ui';
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
export default function PartyScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<PartyParamList>>();
  const dispatch = useDispatch();
  const members = useSelector((s: PartySliceShape) => s.party?.members ?? []);

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
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 20 }}
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
              <Box key={member.uid} className="w-1/2 p-1.5">
                <PokemonCard
                  id={member.id}
                  name={member.name}
                  types={member.types}
                  spriteUri={member.spriteUri}
                  onPress={() => navigation.navigate('PokemonDetail', { id: member.id })}
                  onRemove={() => dispatch(remove(member.uid))}
                />
              </Box>
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
