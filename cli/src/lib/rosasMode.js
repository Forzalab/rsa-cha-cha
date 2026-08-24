const MANDARIN_PHRASES = [
  '代码正在编译，请稍候。',
  '今天的模运算很有精神。',
  '公钥已经出发了。',
  '私钥拒绝加班。',
  '服务器说一切正常。',
  '这个错误很有教育意义。',
  '请不要关闭终端。',
  '数学正在发生。',
  '加密成功，大概吧。',
  '解密以后还是作业。',
  '我正在计算一个非常大的数字。',
  '系统正在认真思考。',
  '请先检查分号。',
  '这不是错误，这是一个功能。',
  '网络连接充满了希望。',
  '密钥已经迷路了。',
  '编译器今天心情不错。',
  '请向服务器发送更多咖啡。',
  '答案藏在余数里面。',
  '这个质数看起来很可靠。',
  '不要担心，我有公钥。',
  '正在验证宇宙的签名。',
  '消息已经进入加密空间。',
  '终端知道得太多了。',
  '一切都在控制之中，也许吧。',
  '请等待下一个神奇的回调。',
  '算法要求再试一次。',
  '今天适合生成质数。',
  '这个项目绝对没有过度设计。',
  '计算完成，结果非常神秘。',
  '浏览器正在保护国家机密。',
  '请相信这个随机数字。',
]

let previousPhrase = -1

export function isRosas(username) {
  return username.trim().toLocaleLowerCase('en-US') === 'rosas'
}

export function randomMandarinPhrase() {
  let index
  do index = Math.floor(Math.random() * MANDARIN_PHRASES.length)
  while (MANDARIN_PHRASES.length > 1 && index === previousPhrase)
  previousPhrase = index
  return MANDARIN_PHRASES[index]
}
