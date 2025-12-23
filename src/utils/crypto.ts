import * as Crypto from 'expo-crypto';

const DEFAULT_SALT_BYTES = 16;

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function generateSalt(size = DEFAULT_SALT_BYTES) {
  const randomBytes = await Crypto.getRandomBytesAsync(size);
  return bytesToHex(randomBytes);
}

export async function hashPassword(password: string, salt?: string) {
  const effectiveSalt = salt ?? (await generateSalt());
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${effectiveSalt}:${password}`,
  );

  return { salt: effectiveSalt, hash: digest };
}

export async function verifyPassword(password: string, salt: string, hash: string) {
  const computed = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${password}`,
  );
  return computed === hash;
}
