// Browser-side RSA. A direct port of svr/RSA-Core.h + svr/RSA-Utility.h.
//
// Same algorithm as the C++ side, same byte order, same wire format: one
// message packs into ONE integer, one modPow encrypts it, the ciphertext is
// one decimal string. A cipher produced here decrypts in C++ and vice versa.
//
// Speed is the priority over key strength here -- this is a class demo on a
// projector, not a key that guards anything. Both knobs are below.

// Each prime; N lands at roughly twice this.
//
// Since chunking landed, total ciphertext length no longer depends on this
// number at all. A block's cipher is about len(N) digits and you need
// bytes/cap of them, where cap is about len(N)/2.408 -- the len(N) cancels.
// Measured, same 183-byte paragraph:
//
//    64d -> N 128 digits, cap  53B, 4 blocks,  515 cipher chars
//    72d -> N 144 digits, cap  59B, 4 blocks,  578 cipher chars
//    96d -> N 192 digits, cap  79B, 3 blocks,  576 cipher chars
//   128d -> N 255 digits, cap 105B, 2 blocks,  511 cipher chars
//
// So N now decides only two things: how many bytes ride in one block, and how
// much screen a single number eats. 255 digits was a wall of text on the
// inspect panel and bought nothing on the wire.
//
// The floor is the glory bar. cap x 2.4 is the reachable wpm ceiling and the
// top tier is 130, so cap must stay above ~55 bytes or the counter can never
// be filled -- the exact hard ceiling that took a patch to remove. 72-digit
// primes give cap ~59 and a ceiling near 142. Do not go lower than 68.
export const PRIME_DIGITS = 72
export const MILLER_RABIN_ROUNDS = 5

// ---------------------------------------------------------------- big-int math

export function modPow(base, exponent, modulus) {
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

// Euclid, same loop as Utility::gcd.
function gcd(a, b) {
  let x = a < 0n ? -a : a
  let y = b < 0n ? -b : b
  while (y !== 0n) {
    const temp = y
    y = x % y
    x = temp
  }
  return x
}

// Extended Euclid, same shape as Utility::D -- carries only the coefficient
// on `a`, normalises a negative result by adding the modulus once.
function modInverse(a, m) {
  let oldR = a % m
  let r = m
  let oldS = 1n
  let s = 0n

  while (r !== 0n) {
    const quotient = oldR / r
    ;[oldR, r] = [r, oldR - quotient * r]
    ;[oldS, s] = [s, oldS - quotient * s]
  }

  const d = oldS % m
  return d < 0n ? d + m : d
}

// ---------------------------------------------------------------- primes

const SMALL_PRIMES = (() => {
  const sieve = new Uint8Array(1000).fill(1)
  const found = []
  for (let i = 2; i < 1000; i++) {
    if (!sieve[i]) continue
    found.push(BigInt(i))
    for (let j = i * i; j < 1000; j += i) sieve[j] = 0
  }
  return found
})()

function randomOddWithDigits(digits) {
  const lower = 10n ** BigInt(digits - 1)
  const span = 10n ** BigInt(digits) - lower

  // Draw enough random bytes to cover the span, then fold into range.
  const byteCount = Math.ceil((digits * 10) / 8) + 8
  const bytes = new Uint8Array(byteCount)
  crypto.getRandomValues(bytes)

  let raw = 0n
  for (const byte of bytes) raw = (raw << 8n) | BigInt(byte)

  const candidate = lower + (raw % span)
  return candidate % 2n === 0n ? candidate + 1n : candidate
}

function millerRabin(n, rounds = MILLER_RABIN_ROUNDS) {
  if (n < 2n) return false
  for (const p of SMALL_PRIMES) {
    if (n === p) return true
    if (n % p === 0n) return false
  }

  // n - 1 = d * 2^r with d odd
  let d = n - 1n
  let r = 0n
  while (d % 2n === 0n) {
    d /= 2n
    r += 1n
  }

  for (let round = 0; round < rounds; round++) {
    const a = 2n + (randomOddWithDigits(8) % (n - 4n))
    let x = modPow(a, d, n)
    if (x === 1n || x === n - 1n) continue

    let composite = true
    for (let i = 1n; i < r; i++) {
      x = (x * x) % n
      if (x === n - 1n) {
        composite = false
        break
      }
    }
    if (composite) return false
  }
  return true
}

export function getNewPrime(digits = PRIME_DIGITS) {
  // Walk upward by 2 instead of redrawing. Same expected number of primality
  // tests, none of the wasted entropy, and it keeps the search local.
  let candidate = randomOddWithDigits(digits)
  while (!millerRabin(candidate)) candidate += 2n
  return candidate
}

// Kerney's spec: 65537 for E, unless N is smaller than that, in which case a
// prime smaller than N. Coprimality with T is the extra condition -- D is the
// inverse of E, and an inverse only exists when gcd(E, T) is 1.
export function chooseExponent(n, t) {
  const preferred = 65537n
  if (n > preferred && gcd(preferred, t) === 1n) return preferred

  for (const candidate of SMALL_PRIMES) {
    if (candidate < 3n) continue
    if (candidate >= n) break
    if (gcd(candidate, t) === 1n) return candidate
  }
  // SMALL_PRIMES stops at 1000. Keep walking for the rare wide gap.
  for (let candidate = 1001n; candidate < n && candidate < preferred; candidate += 2n) {
    if (millerRabin(candidate) && gcd(candidate, t) === 1n) return candidate
  }
  throw new Error('No usable public exponent for this modulus.')
}

// ---------------------------------------------------------------- keygen

export function generateKeypair(digits = PRIME_DIGITS) {
  const p = getNewPrime(digits)
  let q = getNewPrime(digits)
  while (q === p) q = getNewPrime(digits)

  const n = p * q
  const t = (p - 1n) * (q - 1n)

  const e = chooseExponent(n, t)
  const d = modInverse(e, t)

  return {
    publicKey: { value: e.toString(), modulus: n.toString() },
    privateKey: { value: d.toString(), modulus: n.toString() },
    // Kept for inspect mode. Nothing on the wire ever carries these.
    factors: { p: p.toString(), q: q.toString(), totient: t.toString() },
  }
}

// ---------------------------------------------------------------- text <-> int
// Byte order matches RSA-Core.h exactly: text[0] is the LEAST significant
// byte. Change one of these and you must change both, in two languages.

export function decimalFromText(text) {
  const bytes = new TextEncoder().encode(text)
  let msg = 0n
  for (let i = bytes.length - 1; i >= 0; i--) {
    msg <<= 8n
    msg += BigInt(bytes[i])
  }
  return msg
}

export function textFromDecimal(bigNum) {
  let value = BigInt(bigNum)
  const bytes = []
  while (value > 0n) {
    bytes.push(Number(value % 256n))
    value /= 256n
  }
  return new TextDecoder().decode(new Uint8Array(bytes))
}

// How many bytes fit strictly under this modulus. Anything longer packs to an
// integer >= N and will not survive the round trip.
export function maxBytesFor(modulus) {
  const n = BigInt(modulus)
  let bytes = 0
  let ceiling = 1n
  while (ceiling * 256n <= n) {
    ceiling *= 256n
    bytes += 1
  }
  return bytes
}

// ---------------------------------------------------------------- blocks
//
// One modulus holds maxBytesFor(N) bytes and not one more. Longer text is cut
// into that many bytes at a time, each block run through the same single
// operation, and the results joined. Cost is linear in message length while
// the key never moves -- growing N instead buys bytes linearly and pays for
// them roughly cubically.
//
// A comma cannot occur inside a decimal string, so it separates cleanly and a
// one-block ciphertext still looks exactly like it always did. Anything
// encrypted before this change still decrypts.
export const BLOCK_SEP = ','

// Split on whole characters, never mid-codepoint. A multi-byte character that
// straddled a block boundary would decode to a replacement glyph on the far
// side, and the round trip would fail on a message that looked fine.
function textBlocks(text, cap) {
  const coder = new TextEncoder()
  const blocks = []
  let current = ''
  for (const ch of text) {
    if (current && coder.encode(current + ch).length > cap) {
      blocks.push(current)
      current = ''
    }
    current += ch
  }
  blocks.push(current)
  return blocks
}

// ---------------------------------------------------------------- RSA

export function encryptText(text, publicKey) {
  if (!publicKey?.modulus) throw new Error('No public key for that recipient.')
  const cap = maxBytesFor(publicKey.modulus)
  if (cap < 4) throw new Error('That key is too small to carry text.')
  return textBlocks(String(text ?? ''), cap)
    .map((block) => modPow(decimalFromText(block), publicKey.value, publicKey.modulus).toString())
    .join(BLOCK_SEP)
}

export function decryptText(cipher, privateKey) {
  if (!privateKey?.modulus) throw new Error('No private key available.')
  const blocks = String(cipher).split(BLOCK_SEP)
    .map((part) => part.trim())
    .filter((part) => part.length)   // a stray leading or trailing comma is not an error
  if (!blocks.length || blocks.some((part) => !/^\d+$/.test(part))) {
    throw new Error('Ciphertext is not a decimal integer.')
  }
  return blocks
    .map((part) => textFromDecimal(modPow(part, privateKey.value, privateKey.modulus)))
    .join('')
}

// Item 3. Identical machinery, opposite key order -- and because these are
// literal aliases, signatures block and reassemble on exactly the same code
// path as ciphertext. There is no second scheme to keep in step.
export function signText(text, privateKey) {
  return encryptText(text, privateKey)
}

export function verifySignature(signature, publicKey) {
  return decryptText(signature, publicKey)
}
