/**
 * @format
 */

import { parsePokemonDetail } from '@pokedex/contracts';

const pikachu = {
  id: 25,
  name: 'pikachu',
  types: [{ type: { name: 'electric' } }],
  height: 4,
  weight: 60,
  abilities: [{ ability: { name: 'static' } }],
  stats: [{ base_stat: 35, stat: { name: 'hp' } }],
};

const species = {
  flavor_text_entries: [
    { flavor_text: 'When several of\nthese POKéMON gather.', language: { name: 'en' } },
  ],
};

test('parses the full model and normalises the flavour text', () => {
  const detail = parsePokemonDetail(pikachu, species);
  expect(detail.name).toBe('Pikachu');
  expect(detail.heightM).toBeCloseTo(0.4);
  expect(detail.weightKg).toBeCloseTo(6);
  expect(detail.flavourText).toBe('When several of these Pokémon gather.');
});

test.each([
  ['id 0', { ...pikachu, id: 0 }],
  ['negative id', { ...pikachu, id: -25 }],
  ['fractional id', { ...pikachu, id: 25.5 }],
  ['unsafe id', { ...pikachu, id: 9007199254740993 }],
  ['blank name', { ...pikachu, name: '   ' }],
  ['blank type name', { ...pikachu, types: [{ type: { name: ' ' } }] }],
  ['blank ability name', { ...pikachu, abilities: [{ ability: { name: '' } }] }],
  ['negative height', { ...pikachu, height: -4 }],
  ['negative weight', { ...pikachu, weight: -60 }],
  ['negative stat', { ...pikachu, stats: [{ base_stat: -1, stat: { name: 'hp' } }] }],
  ['blank stat name', { ...pikachu, stats: [{ base_stat: 35, stat: { name: '' } }] }],
])('%s fails the parse', (_label, raw) => {
  expect(() => parsePokemonDetail(raw)).toThrow();
});

test('a malformed species payload costs the flavour text, never the screen', () => {
  const detail = parsePokemonDetail(pikachu, { flavor_text_entries: 'not an array' });
  expect(detail.name).toBe('Pikachu');
  expect(detail.flavourText).toBeUndefined();
});

test('type names colliding after formatting fail the parse', () => {
  expect(() =>
    parsePokemonDetail({ ...pikachu, types: [{ type: { name: 'electric' } }, { type: { name: 'Electric' } }] }),
  ).toThrow();
});
