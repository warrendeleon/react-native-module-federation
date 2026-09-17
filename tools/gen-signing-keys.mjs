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

console.log(`\nprivate key: ${privatePath}  (signs the chunks; never commit it, never ship it)`);
console.log(`public key:  ${publicPath}  (what a host checks the signature against)\n`);
console.log(readFileSync(publicPath, 'utf8').trim());
