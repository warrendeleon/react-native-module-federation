/**
 * @format
 */

import { parsePokemonDetail } from '@pokedex/contracts';

const pikachu = {
  id: 25,
  name: 'pikachu',
  types: [{ type: { name: 'electric' } }],
};

test('parses the detail model and cases the names for display', () => {
  const detail = parsePokemonDetail(pikachu);
  expect(detail.name).toBe('Pikachu');
  expect(detail.types).toEqual(['Electric']);
  expect(detail.spriteUri).toContain('/25.png');
});

test.each([
  ['id 0', { ...pikachu, id: 0 }],
  ['negative id', { ...pikachu, id: -25 }],
  ['fractional id', { ...pikachu, id: 25.5 }],
  ['unsafe id', { ...pikachu, id: 9007199254740993 }],
  ['blank name', { ...pikachu, name: '   ' }],
  ['blank type name', { ...pikachu, types: [{ type: { name: ' ' } }] }],
])('%s fails the parse', (_label, raw) => {
  expect(() => parsePokemonDetail(raw)).toThrow();
});

test.each([
  ['empty types', { ...pikachu, types: [] }],
  ['duplicate type name', { ...pikachu, types: [{ type: { name: 'electric' } }, { type: { name: 'electric' } }] }],
])('%s fails the parse', (_label, raw) => {
  expect(() => parsePokemonDetail(raw)).toThrow();
});
