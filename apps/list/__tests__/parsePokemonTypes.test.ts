/**
 * @format
 */

import { parsePokemonTypes } from '../src/typesApi';

test('parses rows into an id-keyed map of display-cased types', () => {
  const byId = parsePokemonTypes({
    pokemon: [{ id: 1, pokemontypes: [{ type: { name: 'grass' } }, { type: { name: 'poison' } }] }],
  });
  expect(byId[1]).toEqual(['Grass', 'Poison']);
});

test.each([
  ['id 0', { pokemon: [{ id: 0, pokemontypes: [] }] }],
  ['negative id', { pokemon: [{ id: -1, pokemontypes: [] }] }],
  ['fractional id', { pokemon: [{ id: 1.5, pokemontypes: [] }] }],
  ['unsafe id', { pokemon: [{ id: 9007199254740993, pokemontypes: [] }] }],
  ['blank type name', { pokemon: [{ id: 1, pokemontypes: [{ type: { name: '  ' } }] }] }],
])('%s fails the parse', (_label, raw) => {
  expect(() => parsePokemonTypes(raw)).toThrow();
});
