import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { z } from 'zod';

// --- The single RTK Query API instance for the whole federation, and the reason it lives here in
// the shared @pokedex/contracts package rather than in the host: a federated remote can only add its
// endpoints to the SAME instance the host store wired in. Because contracts is a Module Federation
// singleton, the host and every remote import this exact object, so a remote's
// baseApi.injectEndpoints({...}) registers against the one cache + middleware the store already runs.
// One instance means one HTTP cache, one dedup pipeline, one tag graph across every remote, including
// remotes shipped long after the shell. baseApi declares no endpoints; the remotes inject their own.
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://pokeapi.co/api/v2/' }),
  tagTypes: ['PokemonList'],
  endpoints: () => ({}),
});

// --- The row the list screen reads. id and name come from PokéAPI; the sprite URL is derived from
// the id, so no extra request is needed. Declared once here so every remote that reads the shared
// list cache agrees on the shape instead of re-guessing it on each side. ---
export interface PokemonSummary {
  id: number;
  name: string;
  spriteUri: string;
}

// --- The runtime boundary the build-time contract cannot police. TypeScript checks that our code
// treats the response as { results: [...] }, but it cannot check that PokéAPI actually sends that at
// runtime: a renamed field or a null slips through a hand-written `as` cast and crashes three layers
// later. So we parse the response with a Zod schema at the seam, and a bad shape becomes a caught
// error the screen can show rather than a crash. The deep treatment of this idea is its own post
// later in the series. ---
const PokemonListResponseSchema = z.object({
  results: z.array(z.object({ name: z.string(), url: z.string() })),
});

/** Official-artwork sprite URL, derived from the id (no extra request). */
export function artworkUri(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

/** PokéAPI resource URLs end with the numeric id: .../pokemon/25/ -> 25. */
export function idFromResourceUrl(url: string): number {
  const match = url.match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : 0;
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
