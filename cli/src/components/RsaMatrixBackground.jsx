import { useEffect, useRef } from 'react'

const TOKENS = [
  'RSA', 'mod n', 'n = p · q', 'φ(n)', 'gcd(e, φ)', 'd ≡ e⁻¹',
  'c = mᵉ mod n', 'm = cᵈ mod n', '65537', '101101', 'powm()',
  'public_key', 'private_key', 'encrypt()', 'decrypt()', 'SIGN', 'VERIFY',
  'AES-256-GCM', 'SubBytes()', 'ShiftRows()', 'MixColumns()', 'AddRoundKey()',
  'Cᵢ = Eₖ(Pᵢ ⊕ Cᵢ₋₁)', 'HMAC(k, m)', 'SHA-256', 'h = H(m)',
  'Diffie–Hellman', 'A = gᵃ mod p', 'B = gᵇ mod p', 's = Bᵃ mod p',
  'ECDH', 'Q = dG', 'P + Q', 'y² = x³ + ax + b', 'Ed25519',
  'ChaCha20', 'quarter_round()', 'nonce || counter', 'XOR stream',
  'Caesar: E(x)=x+k', 'Vigenère', 'ROT13', 'one-time pad',
  'salt || password', 'PBKDF2', 'Argon2id', 'CSPRNG', 'entropy',
  '01001101', '11010110', '0x6a09e667', '⊕', '≡', 'λ(n)',
]

export function RsaMatrixBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas.getContext('2d', { alpha: true })
    let columns = []
    let animationFrame = 0
    let previousFrame = 0
    let running = true

    function reset() {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas.width = Math.floor(window.innerWidth * ratio)
      canvas.height = Math.floor(window.innerHeight * ratio)
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      context.setTransform(ratio, 0, 0, ratio, 0, 0)

      const spacing = window.innerWidth < 700 ? 62 : 72
      columns = Array.from({ length: Math.ceil(window.innerWidth / spacing) }, (_, index) => ({
        x: index * spacing + Math.random() * 30,
        y: Math.random() * window.innerHeight,
        speed: 38 + Math.random() * 34,
        token: Math.floor(Math.random() * TOKENS.length),
        phase: Math.random() * Math.PI * 2,
        hue: Math.random() > 0.72 ? 'cyan' : 'emerald',
      }))
    }

    function draw(time) {
      if (!running) return
      if (time - previousFrame < 33) {
        animationFrame = requestAnimationFrame(draw)
        return
      }
      const delta = Math.min((time - previousFrame) / 1000, 0.08)
      previousFrame = time
      context.clearRect(0, 0, window.innerWidth, window.innerHeight)
      context.font = '11px ui-monospace, SFMono-Regular, Consolas, monospace'
      context.textBaseline = 'middle'

      for (const column of columns) {
        column.y += column.speed * delta
        if (column.y > window.innerHeight + 180) {
          column.y = -120 - Math.random() * 260
          column.token = Math.floor(Math.random() * TOKENS.length)
        }

        for (let trail = 0; trail < 8; trail += 1) {
          const y = column.y - trail * 43
          if (y < -30 || y > window.innerHeight + 30) continue
          const alpha = (1 - trail / 8) * (0.17 + Math.sin(time / 1800 + column.phase) * 0.025)
          context.fillStyle = trail === 0
            ? column.hue === 'cyan' ? `rgba(103, 232, 249, ${alpha + 0.08})` : `rgba(110, 231, 183, ${alpha + 0.08})`
            : column.hue === 'cyan' ? `rgba(34, 211, 238, ${alpha})` : `rgba(45, 212, 191, ${alpha})`
          context.fillText(TOKENS[(column.token + trail) % TOKENS.length], column.x, y)
        }
      }
      animationFrame = requestAnimationFrame(draw)
    }

    function handleVisibility() {
      running = !document.hidden
      if (running) {
        previousFrame = performance.now()
        cancelAnimationFrame(animationFrame)
        animationFrame = requestAnimationFrame(draw)
      }
    }

    reset()
    animationFrame = requestAnimationFrame(draw)
    window.addEventListener('resize', reset)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      running = false
      cancelAnimationFrame(animationFrame)
      window.removeEventListener('resize', reset)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  return <canvas ref={canvasRef} aria-hidden="true" className="rsa-matrix pointer-events-none fixed inset-0" />
}
