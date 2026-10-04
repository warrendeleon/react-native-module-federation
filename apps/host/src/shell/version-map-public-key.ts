// --- The public half of the key that signs the version map. Written here by
// tools/gen-signing-keys.mjs, the way the chunk-signing public key is written into Info.plist
// and strings.xml: empty in the repository, because the key is generated per checkout, and filled
// in by the one command a fresh clone runs before it builds. The value is the raw 32-byte Ed25519
// key in base64url, the form a JSON Web Key (JWK) carries it in.
//
// It can only verify, never sign, so it is safe to compile into every binary. Regenerating it for
// an app that is already installed is not safe: a map signed by a new key does not verify against
// the key those installs carry, and they treat every map as untrusted from then on.
// ---

export const VERSION_MAP_PUBLIC_KEY = '';
