// Discord-style join slugs, run through a loudspeaker.
// No real party, state, leader, or event appears here — the target is always
// plaintext, semicolons, or the .vscode directory.

import { isRosas } from './rosasMode.js'

const GENERIC = [
  '热烈欢迎 {name} 同志抵达前线！',
  '{name} 同志已通过政治审查 · 予以放行',
  '一名野生的 {name} 出现了！',
  '{name} 已光荣加入本信道 · 请出示公钥',
  '{name} 同志携带质数入场 · 群众鼓掌',
  '经上级批准 · {name} 现予登记在册',
  '{name} 同志刚刚删除了 .vscode 目录 · 特此表扬',
  '{name} 已当众宣誓：绝不上传明文',
  '{name} 抵达 · 第 6868 号信道人数 +1',
  '{name} 通过了欧几里得考核 · 准予入场',
  '{name} 同志自带分号入场 · 编译器表示满意',
  '{name} 已缴纳模运算公粮 · 光荣上线',
]

const KERNEY = [
  '★ 特大喜讯 ★ 克尼教授莅临本信道 · 全体起立！',
  '★ 号外号外 ★ 教授同志亲临视察 · 请立即隐藏未提交的作业！',
]

const ROSAS = [
  '⚠ 警报 ⚠ 明文主义分子 {name} 已混入信道 · 全体加固分号！',
  '⚠ 通缉 ⚠ VSCODE 破坏者 {name} 现身 · 请群众保持警惕！',
]

export function isKerney(name) {
  return (name ?? '').trim().toLocaleLowerCase('en-US') === 'kerney'
}

let lastGeneric = -1

export function joinSlug(name) {
  if (isKerney(name)) {
    return { kind: 'kerney', text: KERNEY[Math.floor(Math.random() * KERNEY.length)] }
  }
  if (isRosas(name)) {
    const line = ROSAS[Math.floor(Math.random() * ROSAS.length)]
    return { kind: 'rosas', text: line.replace('{name}', name) }
  }
  let pick = Math.floor(Math.random() * GENERIC.length)
  if (pick === lastGeneric) pick = (pick + 1) % GENERIC.length
  lastGeneric = pick
  return { kind: 'generic', text: GENERIC[pick].replace('{name}', name) }
}
