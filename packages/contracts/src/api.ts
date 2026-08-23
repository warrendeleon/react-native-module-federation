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
// 3.2.0 grows the model with the fields the finished detail design renders: post 6 left them out
// deliberately because no section existed to show them, and the endpoint already fetched them.
export interface PokemonStat {
  name: string;
  value: number;
}

export interface PokemonDetail {
  id: number;
  name: string;
  spriteUri: string;
  types: string[];
  heightM: number;
  weightKg: number;
  abilities: string[];
  stats: PokemonStat[];
  // From the species endpoint, when the consumer fetches it: one Pokédex flavour entry,
  // cleaned of the format's line-break control characters. Optional so a consumer that only
  // has the pokemon payload still parses.
  flavourText?: string;
}

// --- The runtime boundary the build-time contract cannot police. TypeScript checks that our code
// treats the response as { results: [...] }, but it cannot check that PokéAPI actually sends that at
// runtime: a renamed field or a null slips through a hand-written `as` cast and crashes three layers
// later. So we parse the response with a Zod schema at the seam, and a bad shape becomes a caught
// error the screen can show rather than a crash. The deep treatment of this idea is its own post
// later in the series. ---
// Two boundaries every identifier and label in this API answers to. An id is a positive safe
// integer: zero names nothing, and past the safe-integer range the number in the payload has
// stopped being representable. A label is non-blank once trimmed: a name of spaces renders as
// a hole in the UI and an artwork url built from nothing.
const PokemonIdSchema = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
const NonBlankSchema = z.string().trim().min(1);

const PokemonListResponseSchema = z.object({
  // The url is not just any string: the row's id is derived from it, so a url without a
  // trailing numeric id is a malformed payload, and the schema is where malformed payloads
  // are supposed to die. Checked here, a bad url becomes a caught query error at the seam
  // instead of a Pokémon #0 three layers later.
  results: z.array(z.object({ name: NonBlankSchema, url: z.string().regex(/\/\d+\/?$/) })),
});

// A Pokémon has at least one type, and the UI keys the badge row by type name, so an empty
// or duplicated collection is a malformed payload and dies here.
const PokemonDetailResponseSchema = z.object({
  id: PokemonIdSchema,
  name: NonBlankSchema,
  types: z
    .array(z.object({ type: z.object({ name: NonBlankSchema }) }))
    .min(1)
    .refine(t => new Set(t.map(x => x.type.name.trim().toLowerCase())).size === t.length, { message: 'duplicate type name' }),
  // PokéAPI measures height in decimetres and weight in hectograms; the parse converts both to
  // the metric units the screen prints, so no consumer repeats the arithmetic.
  height: z.number(),
  weight: z.number(),
  abilities: z.array(z.object({ ability: z.object({ name: z.string() }) })),
  stats: z.array(z.object({ base_stat: z.number(), stat: z.object({ name: z.string() }) })),
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
  const seen = new Set<number>();
  return results.map(entry => {
    const id = idFromResourceUrl(entry.url);
    // The list keys its rows by id, so a repeated id is a malformed payload that would
    // collide FlatList keys; it dies here like every other malformed shape.
    if (seen.has(id)) {
      throw new Error(`PokéAPI list payload repeats id ${id}`);
    }
    seen.add(id);
    return { id, name: formatName(entry.name), spriteUri: artworkUri(id) };
  });
}

const PokemonSpeciesResponseSchema = z.object({
  flavor_text_entries: z.array(
    z.object({
      flavor_text: z.string(),
      language: z.object({ name: z.string() }),
    }),
  ),
});

/**
 * Validate a raw PokéAPI pokemon payload and shape it into the detail model. Same deal as the list:
 * throw on a bad shape, and let the endpoint surface it as a query error. The species payload is
 * optional: pass it and the model gains the Pokédex flavour text.
 */
export function parsePokemonDetail(raw: unknown, speciesRaw?: unknown): PokemonDetail {
  const parsed = PokemonDetailResponseSchema.parse(raw);
  let flavourText: string | undefined;
  if (speciesRaw !== undefined) {
    const species = PokemonSpeciesResponseSchema.parse(speciesRaw);
    const entry = species.flavor_text_entries.find(e => e.language.name === 'en');
    // The API preserves the games' own line breaks, page-feed characters, and the cartridge-era
    // "POKéMON" casing; print prose gets normal whitespace and normal casing.
    flavourText = entry?.flavor_text
      .replace(/[\n\f\r]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/POKéMON/g, 'Pokémon')
      .trim();
  }
  return {
    id: parsed.id,
    name: formatName(parsed.name),
    spriteUri: artworkUri(parsed.id),
    types: parsed.types.map(entry => formatName(entry.type.name)),
    heightM: parsed.height / 10,
    weightKg: parsed.weight / 10,
    abilities: parsed.abilities.map(entry => formatName(entry.ability.name)),
    stats: parsed.stats.map(entry => ({ name: entry.stat.name, value: entry.base_stat })),
    flavourText,
  };
}
