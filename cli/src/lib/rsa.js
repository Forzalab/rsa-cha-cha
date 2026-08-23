// Temporary class-project keypair. This keeps the transport encrypted while
// key generation is being implemented. Replace this module's key source once
// the canonical RSA work lands.
export const DEV_KEYPAIR = {
  publicKey: { value: '17', modulus: '3233' },
  privateKey: { value: '2753', modulus: '3233' },
}

function modPow(base, exponent, modulus) {
  let result = 1n
  let factor = BigInt(base) % BigInt(modulus)
  let power = BigInt(exponent)
  const mod = BigInt(modulus)

  while (power > 0n) {
    if (power & 1n) result = (result * factor) % mod
    factor = (factor * factor) % mod
    power >>= 1n
  }
  return result
}

export function encryptText(text, publicKey = DEV_KEYPAIR.publicKey) {
  return [...new TextEncoder().encode(text)]
    .map((byte) => modPow(byte, publicKey.value, publicKey.modulus).toString().padStart(4, '0'))
    .join('')
}

export function decryptText(cipher, privateKey = DEV_KEYPAIR.privateKey) {
  if (!/^\d*$/.test(cipher) || cipher.length % 4 !== 0) {
    throw new Error('Invalid development ciphertext.')
  }

  const bytes = []
  for (let index = 0; index < cipher.length; index += 4) {
    bytes.push(Number(modPow(cipher.slice(index, index + 4), privateKey.value, privateKey.modulus)))
  }
  return new TextDecoder().decode(new Uint8Array(bytes))
}
