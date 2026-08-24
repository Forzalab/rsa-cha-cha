/* Four scrolling banners, one per screen edge. Mounted once in App.jsx so it
   survives the join modal and the chat room without remounting.
   pointer-events: none everywhere — it can never eat a click. */

const TOP = [
  '加密万岁！万岁！万万岁！',
  '大素数光荣 · 合数可耻',
  '严禁明文上线 · 违者手算欧几里得',
  '模幂运算不停 · 群众满意度百分之百',
  '第 6868 号信道 · 运行正常',
]

const BOTTOM = [
  '公钥公开 · 私钥保密 · 人人有责',
  '打倒明文主义！',
  '一切权力归模运算',
  '严禁提交 .vscode 目录 · 已记录在案',
  '同学们好！同学们辛苦了！',
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

function Strip({ side, lines }) {
  // rendered twice so the -50% translate loops seamlessly
  const doubled = [...lines, ...lines]
  return (
    <div className={`prop-strip prop-strip--${side}`} aria-hidden="true">
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

export function PropagandaFrame({ flash = false }) {
  return (
    <div className={`prop-frame ${flash ? 'prop-flash' : ''}`} aria-hidden="true">
      <Strip side="top" lines={TOP} />
      <Strip side="bottom" lines={BOTTOM} />
      <Strip side="left" lines={LEFT} />
      <Strip side="right" lines={RIGHT} />
      <span className="prop-star prop-star--tl">★</span>
      <span className="prop-star prop-star--tr">★</span>
      <span className="prop-star prop-star--bl">★</span>
      <span className="prop-star prop-star--br">★</span>
    </div>
  )
}
