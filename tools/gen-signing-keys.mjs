// --- Generates the two keypairs that sign what the app downloads.
//
//   RSA-2048   signs each chunk Re.Pack's CodeSigningPlugin emits (an RS256 JWT of the chunk's
//              hash, appended to the bundle). The private half signs at build time; the public
//              half is what a host verifies against before it executes downloaded code.
//   Ed25519    signs the version map, the file that says which version of each remote a binary
//              may load. The private half signs in tools/build-cdn.mjs and
//              tools/sign-version-map.mjs; the public half is what the host checks the map against
//              at launch, in JavaScript, before it trusts a single version in it.
//
// Both private keys live in code-signing/, inside the checkout but git-ignored before this script
// is ever run, and each is written readable by its owner only: .gitignore keeps them out of
// commits, the file mode keeps them from other users of the machine. A pair is generated only when
// neither half exists. An existing private key is kept, never rotated: a chunk or a map signed with
// a new key would not verify against a public key already embedded in installed apps, and a
// signature stays valid only for the key that made it. A missing public half is derived from the
// private one; a public half on its own, or a pair that does not match, stops the script.
//
// The public halves are then written into the files the app reads them from: the chunk key into
// the iOS Info.plist and Android's res/values/strings.xml, where Re.Pack's native verifier looks
// for it, and the map key into src/shell/version-map-public-key.ts, which scriptManager.ts imports
// and hands to the host's own verifier. This tutorial does that here, when the keys are made,
// rather than in a build step: the value in those files is what a binary is compiled with, and
// writing it once means a fresh clone is ready to build after one command. A build step that
// generated them before compilation would work too; it would need the keys present on every
// machine that builds.
//
// Usage: node tools/gen-signing-keys.mjs

import { createPrivateKey, createPublicKey, generateKeyPairSync } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const keyDir = join(repoRoot, 'code-signing');
mkdirSync(keyDir, { recursive: true });

const OWNER_ONLY = 0o600;

// Keys are compared as DER bytes, never as PEM text: line endings and wrapping are not identity.
const der = key => key.export({ type: 'spki', format: 'der' });

// --- One keypair: present, derived, mismatched, orphaned or new. The same five outcomes for
// both keys, so the key rules in this file's header hold for each of them the same way. ---
function ensureKeypair({ label, algorithm, privatePath, publicPath, generate, privateExport }) {
  if (existsSync(privatePath)) {
    // The mode is re-applied on every run, because a copy or an earlier tool may have left it wider.
    chmodSync(privatePath, OWNER_ONLY);
    const derived = createPublicKey(createPrivateKey(readFileSync(privatePath)));
    if (!existsSync(publicPath)) {
      writeFileSync(publicPath, derived.export({ type: 'spki', format: 'pem' }));
      console.log(`${label} private key present; public key derived from it`);
    } else if (!der(createPublicKey(readFileSync(publicPath))).equals(der(derived))) {
      console.error(
        `${publicPath} does not match ${privatePath}. Neither key's contents were changed: decide which key the installed apps trust before touching either file.`,
      );
      process.exit(1);
    } else {
      console.log(`${label} keypair already present, kept`);
    }
  } else if (existsSync(publicPath)) {
    // A public key with no private key is the one state this script must not repair on its own:
    // generating a fresh pair here would silently change the signing identity behind a public key
    // that may already be embedded in installed apps.
    console.error(
      `${publicPath} exists but ${privatePath} does not. Nothing was changed: restore the private key that made it, or plan a deliberate rotation and remove the public key by hand first.`,
    );
    process.exit(1);
  } else {
    const { publicKey, privateKey } = generate();
    writeFileSync(privatePath, privateKey.export(privateExport), { mode: OWNER_ONLY });
    writeFileSync(publicPath, publicKey.export({ type: 'spki', format: 'pem' }));
    console.log(`generated an ${algorithm} ${label} keypair`);
  }
}

const chunkKey = {
  label: 'chunk-signing',
  algorithm: 'RSA-2048',
  privatePath: join(keyDir, 'private-key.pem'),
  publicPath: join(keyDir, 'public-key.pem'),
  generate: () => generateKeyPairSync('rsa', { modulusLength: 2048 }),
  privateExport: { type: 'pkcs1', format: 'pem' },
};
const mapKey = {
  label: 'map-signing',
  algorithm: 'Ed25519',
  privatePath: join(keyDir, 'version-map-private.pem'),
  publicPath: join(keyDir, 'version-map-public.pem'),
  generate: () => generateKeyPairSync('ed25519'),
  privateExport: { type: 'pkcs8', format: 'pem' },
};
ensureKeypair(chunkKey);
ensureKeypair(mapKey);

// --- Put the public halves where the app reads them. The chunk key reaches two platforms in two
// shapes: iOS parses PEM, so it gets the whole PEM text, header and footer included; Android strips
// the header, the footer and the line breaks before it decodes, so it is given the base64 body
// alone, on one line. The map key goes to the host's TypeScript as the raw 32 bytes in base64url,
// which is the `x` field of the key's JSON Web Key (JWK) form and what the verifier decodes. ---
// Line endings are normalised before either shape is built, so a public key that has been through
// a tool or an editor that writes CRLF embeds exactly the values one saved with LF does. It still
// matches its private key either way: ensureKeypair compares the keys as DER bytes, not text.
const publicPem = readFileSync(chunkKey.publicPath, 'utf8').replace(/\r\n/g, '\n').trim();
const publicBase64 = publicPem
  .split('\n')
  .filter(line => !line.includes('PUBLIC KEY'))
  .join('');
const mapPublicKey = createPublicKey(readFileSync(mapKey.publicPath)).export({ format: 'jwk' }).x;

const hostDir = join(repoRoot, 'apps', 'host');
const embedTargets = [
  {
    file: join(hostDir, 'ios', 'Host', 'Info.plist'),
    label: 'ios/Host/Info.plist',
    entry: 'RepackPublicKey',
    pattern: /(<key>RepackPublicKey<\/key>\s*<string>)[\s\S]*?(<\/string>)/,
    value: publicPem,
  },
  {
    file: join(hostDir, 'android', 'app', 'src', 'main', 'res', 'values', 'strings.xml'),
    label: 'android/app/src/main/res/values/strings.xml',
    entry: 'RepackPublicKey',
    pattern: /(<string name="RepackPublicKey">)[\s\S]*?(<\/string>)/,
    value: publicBase64,
  },
  {
    file: join(hostDir, 'src', 'shell', 'version-map-public-key.ts'),
    label: 'src/shell/version-map-public-key.ts',
    entry: 'VERSION_MAP_PUBLIC_KEY',
    pattern: /(export const VERSION_MAP_PUBLIC_KEY = ')[^']*(';)/,
    value: mapPublicKey,
  },
];

// A target that cannot be written is a failure, not a warning. Verification is strict and fails
// closed, so a key that never reached the app surfaces later as every remote refusing to load, or
// every map being refused, with an error that says nothing about this script.
let embedFailed = false;
for (const target of embedTargets) {
  let before;
  try {
    before = readFileSync(target.file, 'utf8');
  } catch {
    console.error(`could not read ${target.label}: the public key was not embedded there`);
    embedFailed = true;
    continue;
  }
  // Whether the entry is there is asked of the file, not inferred from whether the write changed
  // anything: on every run after the first the replacement produces the same bytes, and reading
  // that as a missing entry would report a healthy file as broken.
  if (!target.pattern.test(before)) {
    console.error(
      `no ${target.entry} entry in ${target.label}: add one, then run this again. Without it the app has no key to verify against and refuses everything that key signs.`,
    );
    embedFailed = true;
    continue;
  }
  const after = before.replace(target.pattern, `$1${target.value}$2`);
  if (after === before) {
    console.log(`public key already embedded in apps/host/${target.label}`);
    continue;
  }
  writeFileSync(target.file, after);
  console.log(`embedded the public key -> apps/host/${target.label}`);
}

console.log(`\nchunk-signing private key: ${chunkKey.privatePath}  (signs the chunks; never commit it, never ship it)`);
console.log(`chunk-signing public key:  ${chunkKey.publicPath}  (what a host checks a chunk's signature against)`);
console.log(`map-signing private key:   ${mapKey.privatePath}  (signs the version map; never commit it, never ship it)`);
console.log(`map-signing public key:    ${mapKey.publicPath}  (what a host checks the map against)`);

if (embedFailed) {
  process.exit(1);
}
