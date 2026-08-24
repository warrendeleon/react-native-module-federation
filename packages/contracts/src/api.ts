import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { z } from 'zod';

// --- The single RTK Query API instance for the whole federation, and the reason it lives here in
// the shared @pokedex/contracts package rather than in the host: a federated remote can only add its
// endpoints to the SAME instance the host store wired in. Because contracts is a Module Federation
// singleton, the host and every remote import this exact object, so a remote's
// baseApi.injectEndpoints({...}) registers against the one cache + middleware the store already runs.
// One instance means one HTTP cache, one dedup pipeline, one tag graph across every remote, including
// remotes shipped long after the shell. baseApi declares no endpoints; the consumers inject their own.
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://pokeapi.co/api/v2/' }),
  tagTypes: ['PokemonList'],
  endpoints: () => ({}),
});

// --- The row the list screen reads. id and name come from PokéAPI; the sprite URL is derived from
// the id, so no extra request is needed. Declared once here so every consumer that reads the shared
// list cache agrees on the shape instead of re-guessing it on each side. ---
export interface PokemonSummary {
  id: number;
  name: string;
  spriteUri: string;
}

// The subset of a full PokéAPI pokemon payload the detail screen renders. The real payload is
// enormous; parsing only what the UI shows keeps the schema honest about what the app depends on.
export interface PokemonDetail {
  id: number;
  name: string;
  spriteUri: string;
  types: string[];
}

// --- The runtime boundary the build-time contract cannot police. TypeScript checks that our code
// treats the response as { results: [...] }, but it cannot check that PokéAPI actually sends that at
// runtime: a renamed field or a null slips through a hand-written `as` cast and crashes three layers
// later. So we parse the response with a Zod schema at the seam, and a bad shape becomes a caught
// error the screen can show rather than a crash. The deep treatment of this idea is its own post
// later in the series. ---
const PokemonListResponseSchema = z.object({
  // The url is not just any string: the row's id is derived from it, so a url without a
  // trailing numeric id is a malformed payload, and the schema is where malformed payloads
  // are supposed to die. Checked here, a bad url becomes a caught query error at the seam
  // instead of a Pokémon #0 three layers later.
  results: z.array(z.object({ name: z.string().trim().min(1), url: z.string().regex(/\/\d+\/?$/) })),
});

const PokemonDetailResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  types: z.array(z.object({ type: z.object({ name: z.string() }) })),
});

/** Official-artwork sprite URL, derived from the id (no extra request). */
export function artworkUri(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

/**
 * PokéAPI resource URLs end with the numeric id: .../pokemon/25/ -> 25. Throws on a url with no
 * trailing id rather than inventing one: inside parsePokemonList the schema has already policed
 * the shape, and any other caller gets a loud error instead of a silent 0.
 */
export function idFromResourceUrl(url: string): number {
  const match = url.match(/\/(\d+)\/?$/);
  if (!match) {
    throw new Error(`PokéAPI resource URL has no trailing id: ${url}`);
  }
  const id = Number(match[1]);
  // A trailing run of digits is not yet an id: /pokemon/0/ names nothing, and a digit string
  // long enough to fall outside the safe-integer range has silently stopped being the number
  // in the url. Both are malformed payloads, and malformed payloads die here.
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new Error(`PokéAPI resource URL id is out of range: ${url}`);
  }
  return id;
}

// PokéAPI returns lower-case, hyphenated names ("mr-mime"); title-case each word for display.
function formatName(name: string): string {
  return name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Validate a raw PokéAPI list response and shape it into PokemonSummary rows. Throws if the payload
 * does not match the schema; the calling endpoint turns that into a query error. Kept here so the
 * schema and the model that flows through the shared cache stay in one place.
 */
export function parsePokemonList(raw: unknown): PokemonSummary[] {
  const { results } = PokemonListResponseSchema.parse(raw);
  return results.map(entry => {
    const id = idFromResourceUrl(entry.url);
    return { id, name: formatName(entry.name), spriteUri: artworkUri(id) };
  });
}

/**
 * Validate a raw PokéAPI pokemon payload and shape it into the detail model. Same deal as the list:
 * throw on a bad shape, and let the endpoint surface it as a query error.
 */
export function parsePokemonDetail(raw: unknown): PokemonDetail {
  const parsed = PokemonDetailResponseSchema.parse(raw);
  return {
    id: parsed.id,
    name: formatName(parsed.name),
    spriteUri: artworkUri(parsed.id),
    types: parsed.types.map(entry => formatName(entry.type.name)),
  };
}
