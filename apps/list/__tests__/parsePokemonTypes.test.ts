/**
 * @format
 */

import { parsePokemonTypes } from '../src/typesApi';

// The parser demands the whole Kanto set, so test payloads are built at full size and
// then broken one row at a time.
function kanto(overrides: Record<number, unknown> = {}) {
  return {
    pokemon: Array.from({ length: 151 }, (_, i) => {
      const id = i + 1;
      return (
        overrides[id] ?? { id, pokemontypes: [{ type: { name: 'normal' } }] }
      );
    }),
  };
}

test('parses the full set into an id-keyed map of display-cased types', () => {
  const byId = parsePokemonTypes(
    kanto({ 1: { id: 1, pokemontypes: [{ type: { name: 'grass' } }, { type: { name: 'poison' } }] } }),
  );
  expect(byId[1]).toEqual(['Grass', 'Poison']);
  expect(Object.keys(byId)).toHaveLength(151);
});

test('an incomplete set fails the parse instead of shipping partial badges', () => {
  const partial = kanto();
  partial.pokemon = partial.pokemon.slice(0, 150);
  expect(() => parsePokemonTypes(partial)).toThrow(/151 Kanto/);
});

test('a repeated id fails the parse instead of overwriting a row', () => {
  const dupes = kanto();
  dupes.pokemon[1] = { id: 1, pokemontypes: [{ type: { name: 'poison' } }] };
  expect(() => parsePokemonTypes(dupes)).toThrow(/repeats id/);
});

test.each([
  ['id 0', { id: 0, pokemontypes: [{ type: { name: 'grass' } }] }],
  ['id past Kanto', { id: 152, pokemontypes: [{ type: { name: 'grass' } }] }],
  ['fractional id', { id: 1.5, pokemontypes: [{ type: { name: 'grass' } }] }],
  ['no types', { id: 1, pokemontypes: [] }],
  ['three types', { id: 1, pokemontypes: [{ type: { name: 'a' } }, { type: { name: 'b' } }, { type: { name: 'c' } }] }],
  ['duplicate type per row', { id: 1, pokemontypes: [{ type: { name: 'grass' } }, { type: { name: 'Grass' } }] }],
  ['blank type name', { id: 1, pokemontypes: [{ type: { name: '  ' } }] }],
])('%s fails the parse', (_label, badRow) => {
  expect(() => parsePokemonTypes(kanto({ 1: badRow }))).toThrow();
});
