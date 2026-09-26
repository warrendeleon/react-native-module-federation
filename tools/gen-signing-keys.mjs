// --- Generates the keypair that signs every production remote chunk.
//
//   RSA-2048   signs each chunk Re.Pack's CodeSigningPlugin emits (an RS256 JWT of the chunk's
//              hash, appended to the bundle). The private half signs at build time; the public
//              half is what a host verifies against before it executes downloaded code.
//
// The private key lives in code-signing/, inside the checkout but git-ignored before this script
// is ever run, and it is written readable by its owner only: .gitignore keeps it out of commits,
// the file mode keeps it from other users of the machine. A pair is generated only when neither
// half exists. An existing private key is kept, never rotated: a chunk signed with a new key
// would not verify against a public key already embedded in installed apps, and a signature
// stays valid only for the key that made it. A missing public half is derived from the private
// one; a public half on its own, or a pair that does not match, stops the script.
//
// The public half is then written into the two files the host's native verifier reads it from:
// the iOS Info.plist and Android's res/values/strings.xml. Neither can be a build step, because
// both are read by name at runtime and both are committed files, so the copy in them is what a
// binary is compiled with. Doing it here means a fresh clone is ready to build after one command,
// rather than after one command and two instructions nobody reads.
//
// Usage: node tools/gen-signing-keys.mjs

import { createPrivateKey, createPublicKey, generateKeyPairSync } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const keyDir = join(repoRoot, 'code-signing');
mkdirSync(keyDir, { recursive: true });

const privatePath = join(keyDir, 'private-key.pem');
const publicPath = join(keyDir, 'public-key.pem');
const OWNER_ONLY = 0o600;

// Keys are compared as DER bytes, never as PEM text: line endings and wrapping are not identity.
const der = key => key.export({ type: 'spki', format: 'der' });

if (existsSync(privatePath)) {
  // The mode is re-applied on every run, because a copy or an earlier tool may have left it wider.
  chmodSync(privatePath, OWNER_ONLY);
  const derived = createPublicKey(createPrivateKey(readFileSync(privatePath)));
  if (!existsSync(publicPath)) {
    writeFileSync(publicPath, derived.export({ type: 'spki', format: 'pem' }));
    console.log('chunk-signing private key present; public key derived from it');
  } else if (!der(createPublicKey(readFileSync(publicPath))).equals(der(derived))) {
    console.error(
      `${publicPath} does not match ${privatePath}. Neither key's contents were changed: decide which key the installed apps trust before touching either file.`,
    );
    process.exit(1);
  } else {
    console.log('chunk-signing keypair already present, kept');
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
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  writeFileSync(privatePath, privateKey.export({ type: 'pkcs1', format: 'pem' }), { mode: OWNER_ONLY });
  writeFileSync(publicPath, publicKey.export({ type: 'spki', format: 'pem' }));
  console.log('generated an RSA-2048 chunk-signing keypair');
}

// --- Put the public half where the app reads it. The two platforms take the key in two shapes:
// iOS parses PEM, so it gets the file verbatim; Android strips the header, the footer and the line
// breaks before it decodes, so it is given the base64 body alone, on one line. ---
// Line endings are normalised before either shape is built, so a public key that has been through
// a tool or an editor that writes CRLF embeds exactly the values one saved with LF does. It still
// matches its private key either way: the check above compares DER bytes, not text.
const publicPem = readFileSync(publicPath, 'utf8').replace(/\r\n/g, '\n').trim();
const publicBase64 = publicPem
  .split('\n')
  .filter(line => !line.includes('PUBLIC KEY'))
  .join('');

const hostDir = join(repoRoot, 'apps', 'host');
const embedTargets = [
  {
    file: join(hostDir, 'ios', 'Host', 'Info.plist'),
    label: 'ios/Host/Info.plist',
    pattern: /(<key>RepackPublicKey<\/key>\s*<string>)[\s\S]*?(<\/string>)/,
    value: publicPem,
  },
  {
    file: join(hostDir, 'android', 'app', 'src', 'main', 'res', 'values', 'strings.xml'),
    label: 'android/app/src/main/res/values/strings.xml',
    pattern: /(<string name="RepackPublicKey">)[\s\S]*?(<\/string>)/,
    value: publicBase64,
  },
];

// A target that cannot be written is a failure, not a warning. Verification is strict and fails
// closed, so a key that never reached the app surfaces later as every remote refusing to load,
// with an error that says nothing about this script.
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
      `no RepackPublicKey entry in ${target.label}: add one, then run this again. Without it the app has no key to verify against and strict verification refuses every chunk.`,
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

console.log(`\nprivate key: ${privatePath}  (signs the chunks; never commit it, never ship it)`);
console.log(`public key:  ${publicPath}  (what a host checks the signature against)\n`);
console.log(publicPem);

if (embedFailed) {
  process.exit(1);
}
