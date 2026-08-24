/**
 * @format
 */

import { idFromResourceUrl, parsePokemonList } from '@pokedex/contracts';

test('parses rows and derives ids from resource urls', () => {
  const rows = parsePokemonList({
    results: [{ name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon/25/' }],
  });
  expect(rows).toEqual([
    {
      id: 25,
      name: 'Pikachu',
      spriteUri:
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
    },
  ]);
});

test('a resource url without a trailing id fails the parse instead of becoming id 0', () => {
  expect(() =>
    parsePokemonList({
      results: [{ name: 'missingno', url: 'https://pokeapi.co/api/v2/pokemon/' }],
    }),
  ).toThrow();
});

test('idFromResourceUrl throws on a url with no trailing id', () => {
  expect(() => idFromResourceUrl('https://pokeapi.co/api/v2/pokemon/')).toThrow(
    /no trailing id/,
  );
});

test('id 0 fails the parse instead of naming a phantom Pokémon', () => {
  expect(() =>
    parsePokemonList({
      results: [{ name: 'missingno', url: 'https://pokeapi.co/api/v2/pokemon/0/' }],
    }),
  ).toThrow(/out of range/);
});

test('an id past the safe-integer range fails the parse', () => {
  expect(() =>
    parsePokemonList({
      results: [{ name: 'glitch', url: 'https://pokeapi.co/api/v2/pokemon/99999999999999999999999/' }],
    }),
  ).toThrow(/out of range/);
});

test('a blank name fails the parse', () => {
  expect(() =>
    parsePokemonList({
      results: [{ name: '', url: 'https://pokeapi.co/api/v2/pokemon/25/' }],
    }),
  ).toThrow();
});
