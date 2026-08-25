/* Four scrolling banners, one per screen edge. Mounted once in App.jsx so it
   survives the join modal and the chat room without remounting.
   pointer-events: none everywhere — it can never eat a click. */

// Horizontal strips carry an English twin for every line. Vertical strips stay
// Chinese — they are peripheral, they read as texture, and that is the point.
const TOP = [
  ['加密万岁！万岁！万万岁！', 'LONG LIVE ENCRYPTION'],
  ['大素数光荣 · 合数可耻', 'LARGE PRIMES ARE GLORIOUS · COMPOSITES ARE SHAMEFUL'],
  ['严禁明文上线 · 违者手算欧几里得', 'NO PLAINTEXT ON THE WIRE · OFFENDERS DO EUCLID BY HAND'],
  ['模幂运算不停 · 群众满意度百分之百', 'MODULAR EXPONENTIATION NEVER RESTS'],
  ['第 6868 号信道 · 运行正常', 'CHANNEL 6868 · NOMINAL'],
]

const BOTTOM = [
  ['公钥公开 · 私钥保密 · 人人有责', 'PUBLIC KEYS PUBLIC · PRIVATE KEYS PRIVATE'],
  ['打倒明文主义！', 'DOWN WITH PLAINTEXTISM'],
  ['一切权力归模运算', 'ALL POWER TO THE MODULUS'],
  ['严禁提交 .vscode 目录 · 已记录在案', 'DO NOT COMMIT .vscode · THIS HAS BEEN NOTED'],
  ['同学们好！同学们辛苦了！', 'GREETINGS STUDENTS · YOU HAVE WORKED HARD'],
]

const LEFT = [
  '本信道由质数保卫',
  '请勿在信道内讨论 e 与 d 的私人关系',
  '密文即是纪律',
  'RSA 万岁',
]

const RIGHT = [
  '一二三四 · 平方 · 乘方 · 取模',
  '每日一模 · 身体健康',
  '光荣属于大整数',
  '本页面由 C++ 与 汗水 驱动',
]

// Deterministic, not random: a reroll on every render would make lines flip
// mid-scroll. Every third slot speaks English.
function weave(pairs) {
  const out = []
  pairs.forEach(([han, latin], i) => {
    out.push(han)
    if (i % 3 === 2) out.push(latin)
  })
  out.push(pairs[pairs.length - 1][1])
  return out
}

function Strip({ side, lines, pulse = 0 }) {
  // rendered twice so the -50% translate loops seamlessly
  const doubled = [...lines, ...lines]
  return (
    <div key={`${side}:${pulse}`} className={`prop-strip prop-strip--${side} ${pulse ? 'prop-pulse' : ''}`} aria-hidden="true">
      <div className="prop-track">
        {doubled.map((line, i) => (
          <span className="prop-item" key={`${side}-${i}`}>
            ★ {line}
          </span>
        ))}
      </div>
    </div>
  )
}

export function PropagandaFrame({ stage = 'idle', pulse = 0 }) {
  return (
    <div key={`stage:${stage}`} className={`prop-frame ${stage === 'freeze' ? 'prop-freeze' : ''} ${stage === 'flash' ? 'prop-flash' : ''}`} aria-hidden="true">
      <Strip side="top" lines={weave(TOP)} pulse={pulse} />
      <Strip side="bottom" lines={weave(BOTTOM)} pulse={pulse} />
      <Strip side="left" lines={LEFT} pulse={pulse} />
      <Strip side="right" lines={RIGHT} pulse={pulse} />
      <span className="prop-star prop-star--tl">★</span>
      <span className="prop-star prop-star--tr">★</span>
      <span className="prop-star prop-star--bl">★</span>
      <span className="prop-star prop-star--br">★</span>
    </div>
  )
}
