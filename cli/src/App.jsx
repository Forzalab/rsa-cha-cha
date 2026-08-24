import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { Activity, ArrowDown, Eye, EyeOff, Fingerprint, ImagePlus, Radio, Send, ShieldCheck, Smile, SmilePlus } from 'lucide-react'
import { JoinModal } from './components/JoinModal.jsx'
import { RsaMatrixBackground } from './components/RsaMatrixBackground.jsx'
import { useChatSocket } from './hooks/useChatSocket.js'
import { parseStickerMessage, STICKERS, stickerShortcode } from './lib/stickers.js'
import { EMOJIS } from './lib/emojis.js'
import { isKerney, joinSlug } from './lib/joinSlugs.js'
import { BOT_ID, displayName } from './lib/names.js'
import { ping, unlockPing } from './lib/ping.js'
import { CipherReveal } from './components/CipherReveal.jsx'
import { PropagandaFrame } from './components/PropagandaFrame.jsx'

const MAX_MESSAGE_LENGTH = 500
const SEND_COOLDOWN_MS = 400

function StickerImage({ sticker, compact = false }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <div className={`${compact ? 'h-24' : 'h-44'} grid w-full place-items-center rounded-xl border border-dashed border-white/10 bg-white/[.025] px-3 text-center text-xs text-[#f4e4c1]/45`}>{sticker.label}<br />asset needed</div>
  return <img src={sticker.src} alt={sticker.label} onError={() => setFailed(true)} className={`${compact ? 'h-24' : 'max-h-72'} w-full rounded-xl object-cover`} />
}

function HammerSickle({ className = '', size = 48 }) {
  // Geometry from the public-domain Wikimedia file (Hammer_and_sickle.svg).
  // Red backing rect dropped and the gold recoloured to currentColor, so the
  // mark inherits whatever the surrounding text colour is.
  return (
    <svg viewBox="0 0 550 550" width={size} height={size} className={className}
         xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<defs>
      <mask
      maskUnits="userSpaceOnUse"
      id="mask941">
      <rect fill="#ffffff"
      width="48"
      height="48"
      x="-240"
      y="780"
      transform="rotate(-45)" />
      </mask>
      <mask
      maskUnits="userSpaceOnUse"
      id="mask945">
      <rect
      y="780"
      x="-704"
      height="48"
      width="48" fill="#ffffff"
      transform="rotate(-45)" />
      </mask>
      <mask
      maskUnits="userSpaceOnUse"
      id="mask2036">
      <path fill="#ffffff"
      d="M 144.24978,777.81746 53.740115,687.30779 202.35943,663.7698 Z" />
      </mask>
      </defs>
<g fill="currentColor"
      transform="translate(18.000002,-824.0001)">
      <path fill="currentColor"
      d="m 157.54301,922.36336 -16.97149,16.9707 -45.256019,45.2539 -56.570993,56.57034 62.227502,62.2246 56.571,-56.5684 299.82842,299.8124 a 32.001491,31.999993 0 0 0 45.25601,0 32.001491,31.999993 0 0 0 0,-45.2539 l -299.82646,-299.8143 16.9715,-16.97074 50.91448,-50.91015 z" />
      <path fill="currentColor"
      d="m 255.989,844.0001 c 0,0 168.00781,127.99997 168.00783,256 C 423.99684,1164 367.99425,1236 271.98975,1236 c -64.00296,0 -104.24119,-47.7637 -104.24119,-47.7637 l -11.31302,11.3125 a 16.000745,15.999996 0 0 0 -22.62801,0 16.000745,15.999996 0 0 0 -2.47863,3.2227 32.001491,31.999993 0 0 0 -31.464359,8.0918 32.001491,31.999993 0 0 0 -9.330512,21.5449 C 65.101725,1246.1605 22.969246,1272.9834 4.2643862,1308 l 0.029298,0.029 A 32.001491,31.999993 0 0 0 4.2643862,1340 32.001491,31.999993 0 0 0 47.979313,1351.7129 c 35.025561,-18.708 61.854737,-60.8518 75.605087,-86.2813 a 32.001491,31.999993 0 0 0 21.53616,-9.3144 32.001491,31.999993 0 0 0 7.93201,-13.2012 c 24.51647,23.0544 71.44493,57.084 134.93792,57.084 96.00451,0 200.00932,-72 200.00932,-199.9999 0,-160.00002 -232.01081,-256 -232.01081,-256 z" />
      </g>
    </svg>
  )
}

const BANNERS = [
  ['加密万岁', 'Now with RSA!'],
  ['明文可耻', 'Ciphertext is glory'],
  ['质数光荣', 'Primes on duty'],
  ['取模不停', 'The modulus never sleeps'],
  ['信道正常', 'Channel nominal'],
  ['分号已发', 'Semicolons issued'],
]

function RollingBanner() {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    const tick = window.setInterval(() => setIndex((n) => (n + 1) % BANNERS.length), 4200)
    return () => window.clearInterval(tick)
  }, [])
  const [han, latin] = BANNERS[index]
  return (
    <div className="banner-plaque flex h-9 w-[15.5rem] shrink-0 items-center justify-center overflow-hidden border-2 border-[#ffd100] bg-[#4a0410] px-3">
      <span key={index} className="banner-line flex items-baseline gap-2 whitespace-nowrap text-[#ffd100]">
        <span className="han text-[13px] leading-none">{han}</span>
        <span className="text-[#ffd100]/50">·</span>
        <span className="text-[12px] font-bold leading-none">{latin}</span>
      </span>
    </div>
  )
}

const PROMPTS = [
  '请畅所欲言 · Speak freely, the modulus is listening',
  '砸键盘吧 · Smash your keyboard for the collective',
  '你在想什么？ · What are you thinking, comrade?',
  '光荣发言 · Promote eternal glory, 450 characters max',
  '明文可耻 · Type something shameful, we will encrypt it',
  '请勿泄露私钥 · Do not leak your private key in here',
  '大声说出你的余数 · Announce your remainder proudly',
  '今日质数已就位 · Today\'s prime is standing by',
  '分号已配发到户 · Semicolons have been issued to all',
  '编译器正在倾听 · The compiler is listening',
  '为模运算而战 · Say something for modular arithmetic',
  '作业尚未提交 · The homework remains unsubmitted',
]

function RollingPlaceholder() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * PROMPTS.length))
  useEffect(() => {
    const tick = window.setInterval(() => setIndex((n) => (n + 1) % PROMPTS.length), 3600)
    return () => window.clearInterval(tick)
  }, [])
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 flex items-center overflow-hidden px-2">
      <span key={index} className="rolling-prompt truncate text-sm leading-5">{PROMPTS[index]}</span>
    </span>
  )
}

function JoinSlug({ notice }) {
  const tone = notice.kind === 'kerney'
    ? 'text-[#ffd100] slug-jackpot'
    : notice.kind === 'rosas'
      ? 'text-[#ff86ae]'
      : 'text-[#fff6dc]/45'
  return (
    <div className="join-slug my-1 flex items-center gap-2.5 px-4">
      <span className="h-px flex-1 bg-[#fff6dc]/12" />
      <span className={`shrink-0 text-[11px] leading-4 ${tone}`}>{notice.text}</span>
      <span className="h-px flex-1 bg-[#fff6dc]/12" />
    </div>
  )
}

export default function App() {
  const chat = useChatSocket()
  const joined = chat.status === 'joined'
  const [draft, setDraft] = useState('')
  const [sendPulse, setSendPulse] = useState(false)
  const [openReactions, setOpenReactions] = useState(null)
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false)
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
  const [entryComplete, setEntryComplete] = useState(false)
  const [sendCoolingDown, setSendCoolingDown] = useState(false)
  const completeEntry = useCallback(() => setEntryComplete(true), [])
  useEffect(() => { setHoveredCipher(null) }, [chat.messages.length])
  // Chinese shows first, English swaps in — the motion is what says 'button'
  useEffect(() => {
    const tick = window.setInterval(() => setLabelEnglish((on) => !on), 2600)
    return () => window.clearInterval(tick)
  }, [])
  // The newest message that is not yours. Its cluster keeps a permanent react
  // button; every other cluster only shows one on hover.
  const lastIncomingId = (() => {
    for (let n = chat.messages.length - 1; n >= 0; n -= 1) {
      if (chat.messages[n].sender !== chat.username) return chat.messages[n].id
    }
    return null
  })()

  // MEMBERS arrives as a full roster, so a join is a set difference. The very
  // first roster is the room as it already was — announcing it would be noise.
  const [notices, setNotices] = useState([])
  const [freshMembers, setFreshMembers] = useState([])
  // One state machine for the whole frame. Overlapping triggers cannot stack
  // because every transition is scheduled off a single stage value.
  const [frameStage, setFrameStage] = useState('idle')
  const [framePulse, setFramePulse] = useState(0)
  const stageBusyRef = useRef(false)
  const [litMember, setLitMember] = useState(null)
  const [dimOthers, setDimOthers] = useState(null)

  const runJackpot = useCallback(() => {
    if (stageBusyRef.current) return
    stageBusyRef.current = true
    setFrameStage('freeze')
    window.setTimeout(() => setFrameStage('flash'), 620)
    window.setTimeout(() => { setFrameStage('idle'); stageBusyRef.current = false }, 620 + 780)
  }, [])
  const seenMembersRef = useRef(null)

  useEffect(() => {
    // Roster frames arrive before and during our own join. Baseline is the
    // first roster that contains us — everything up to that point is the room
    // as it already was, and announcing it is noise.
    const inRoster = chat.username && chat.members.includes(chat.username)
    if (!inRoster) return
    const previous = seenMembersRef.current
    seenMembersRef.current = chat.members
    if (previous === null) return

    const arrivals = chat.members.filter((member) => !previous.includes(member))
    if (!arrivals.length) return

    const anchor = chat.messages.length
    setNotices((current) => [
      ...current,
      ...arrivals.map((name) => {
        const slug = joinSlug(name)
        return { id: `join:${name}:${anchor}:${current.length}`, anchor, name, ...slug }
      }),
    ])

    // The joiner does not get the fanfare about themselves — only the slug.
    const others = arrivals.filter((name) => name !== chat.username)
    if (!others.length) return

    setFreshMembers((current) => [...current, ...others])
    window.setTimeout(() => {
      setFreshMembers((current) => current.filter((name) => !others.includes(name)))
    }, 1900)

    if (others.some(isKerney)) runJackpot()
  }, [chat.members])

  const noticesAt = (index) => notices.filter((notice) => notice.anchor === index)

  // A draft that has sat unsent for two seconds gets a nudge.
  const [sendNudge, setSendNudge] = useState(false)
  useEffect(() => {
    setSendNudge(false)
    if (!draft.trim()) return
    const wake = window.setTimeout(() => setSendNudge(true), 2000)
    return () => window.clearTimeout(wake)
  }, [draft])

  const draftLength = [...draft].length
  const charactersOver = Math.max(0, draftLength - MAX_MESSAGE_LENGTH)
  const [showNewMessages, setShowNewMessages] = useState(false)
  const messageListRef = useRef(null)
  const atBottomRef = useRef(true)
  const previousMessageCountRef = useRef(0)
  const [revealsLeft, setRevealsLeft] = useState(2)
  const [allCipher, setAllCipher] = useState(false)
  const [hoveredCipher, setHoveredCipher] = useState(null)
  const [blockedFlash, setBlockedFlash] = useState(null)
  const flashBlocked = (key) => {
    setBlockedFlash(key)
    window.setTimeout(() => setBlockedFlash((current) => (current === key ? null : current)), 480)
  }
  const [labelEnglish, setLabelEnglish] = useState(false)
  const [ciphered, setCiphered] = useState(() => new Set())
  const flipCipher = (id) => {
    setOpenReactions(null)
    setCiphered((current) => {
      const next = new Set(current)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const [revealed, setRevealed] = useState(() => new Set())

  function scrollToNewest(behavior = 'smooth') {
    const list = messageListRef.current
    if (!list) return
    list.scrollTo({ top: list.scrollHeight, behavior })
    atBottomRef.current = true
    setShowNewMessages(false)
  }

  function handleMessageScroll() {
    const list = messageListRef.current
    if (!list) return
    const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 48
    atBottomRef.current = atBottom
    if (atBottom) setShowNewMessages(false)
  }

  useEffect(() => {
    const count = chat.messages.length
    if (count <= previousMessageCountRef.current) return
    previousMessageCountRef.current = count

    if (atBottomRef.current) {
      requestAnimationFrame(() => scrollToNewest('smooth'))
      const settle = window.setTimeout(() => {
        if (atBottomRef.current) scrollToNewest('smooth')
      }, 180)
      return () => window.clearTimeout(settle)
    }
    setShowNewMessages(true)
  }, [chat.messages.length])

  // Reactive motion, unlike the ambient marquees, is causally tied to what
  // someone just did — which is the only kind people actually notice.
  const arrivalRef = useRef(0)
  useEffect(() => {
    if (chat.messages.length <= arrivalRef.current) {
      arrivalRef.current = chat.messages.length
      return
    }
    arrivalRef.current = chat.messages.length
    const latest = chat.messages[chat.messages.length - 1]
    if (!latest || latest.sender === chat.username) return

    setFramePulse((n) => n + 1)
    setLitMember(latest.sender)
    setDimOthers(latest.id)
    ping()
    const a = window.setTimeout(() => setLitMember(null), 1000)
    const b = window.setTimeout(() => setDimOthers(null), 700)
    return () => { window.clearTimeout(a); window.clearTimeout(b) }
  }, [chat.messages.length])

  function send(event) {
    event.preventDefault()
    const message = draft.trim()
    if (!message || charactersOver || sendCoolingDown || !chat.send(message)) return
    setDraft('')
    setSendPulse(true)
    setSendCoolingDown(true)
    window.setTimeout(() => setSendPulse(false), 430)
    window.setTimeout(() => setSendCoolingDown(false), SEND_COOLDOWN_MS)
  }

  return (
    <main onPointerDown={unlockPing} onKeyDown={unlockPing} onClick={() => { setOpenReactions(null); setStickerPickerOpen(false); setEmojiPickerOpen(false) }} className="aurora grid-glow relative min-h-screen overflow-hidden app-main">
      <RsaMatrixBackground />
      <div className="scanlines pointer-events-none fixed inset-0 z-40 opacity-20" />
      <div className={`freeze-veil ${frameStage === 'freeze' ? 'freeze-veil--on' : ''}`} />
      <PropagandaFrame stage={frameStage} pulse={framePulse} />
      {!entryComplete && <JoinModal connectionStatus={chat.status} serverError={chat.error} onJoin={chat.join} onClearError={chat.clearError} onComplete={completeEntry} />}
<div className="pointer-events-none absolute inset-x-24 top-0 h-px bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />
      <section className="chat-shell chat-shell-fit relative z-10 mx-auto flex max-w-6xl overflow-hidden rounded-[1.75rem] border border-slate-300/10 shadow-[0_30px_100px_rgba(0,0,0,.55)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-x-24 top-0 h-px bg-gradient-to-r from-transparent via-red-400/60 to-transparent" />
        <aside className="chat-sidebar hidden w-64 shrink-0 p-5 md:flex md:flex-col">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center border-2 border-[#ffd100] bg-[#4a0410]"><Fingerprint className="text-[#ffd100]" size={19} /></span>
            <span className="text-base font-bold tracking-tight text-[#fff6dc]">RSA Cha-Cha</span>
          </div>
          <div className="mt-7 space-y-1">
            <div className="flex items-center gap-3 border-l-[3px] border-[#ffd100] bg-[#ffd100]/10 px-3 py-2 text-sm font-bold text-[#ffd100]">
              <span className="h-2 w-2 shrink-0 bg-[#ffd100]" />{displayName(BOT_ID)}
            </div>
            {(chat.members.length ? chat.members : chat.username ? [chat.username] : []).map((member) => (
              <div key={`member:${member}`} className={`group flex items-center gap-3 border-l-[3px] border-transparent px-3 py-2 text-sm text-[#fff6dc] transition hover:border-[#ffd100]/50 hover:bg-[#ffd100]/[.07] ${freshMembers.includes(member) ? 'member-pop' : ''} ${litMember === member ? 'member-ping' : ''}`}>
                <span className="h-2 w-2 shrink-0 bg-[#ffd100]/70" />{displayName(member)}{member === chat.username && <span className="ml-auto text-[10px] uppercase tracking-wider text-[#ffd100]/70">you</span>}{litMember === member && <span className="msg-dot ml-auto h-2 w-2 shrink-0 rounded-full bg-[#ffd100]" />}
              </div>
            ))}
          </div>
          <div className="mt-auto space-y-3">
            <button type="button" tabIndex={showNewMessages ? 0 : -1} aria-hidden={!showNewMessages} onClick={() => scrollToNewest()} className={`flex w-full items-center justify-center gap-2 border-2 border-[#4a0410] bg-[#ffd100] px-3 py-2.5 text-xs font-bold text-[#4a0410] shadow-[0_3px_0_#4a0410] transition-all duration-300 hover:-translate-y-0.5 ${showNewMessages ? 'new-message-badge opacity-100' : 'pointer-events-none translate-y-2 opacity-0'}`}><ArrowDown size={14} /> View new messages</button>

          </div>
        </aside>

        <div className="chat-pane relative flex min-w-0 flex-1 flex-col">
          <header className="chat-header flex h-20 items-center justify-between border-b border-slate-300/8 px-5 sm:px-7">
              <RollingBanner />
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); setAllCipher((on) => !on); setCiphered(new Set()); setOpenReactions(null); flashBlocked('ALL') }}
              aria-pressed={allCipher}
              aria-label={allCipher ? 'Show plaintext' : 'Show ciphertext'}
              className={`cipher-switch group/switch flex shrink-0 items-center gap-2 rounded-full border-2 px-3 py-1.5 text-xs font-bold transition active:translate-y-px ${allCipher
                ? 'border-[#4a0410] bg-[#ffd100] text-[#4a0410] shadow-[0_3px_0_#4a0410] hover:shadow-[0_5px_0_#4a0410] hover:-translate-y-0.5'
                : 'border-[#4a0410] bg-[#fff6dc] text-[#4a0410] shadow-[0_3px_0_#4a0410] hover:bg-white hover:shadow-[0_5px_0_#4a0410] hover:-translate-y-0.5'}`}
            >
              {allCipher ? <EyeOff size={14} /> : <Eye size={14} />}
              <span className={`switch-label ${labelEnglish ? '' : 'han'}`} key={`${allCipher}-${labelEnglish}`}>
                {allCipher
                  ? (labelEnglish ? 'See plaintext' : '密文')
                  : (labelEnglish ? 'See ciphertext' : '明文')}
              </span>
              <span className="switch-dot" />
            </button>
          </header>

          <div ref={messageListRef} onScroll={handleMessageScroll} className="flex flex-1 flex-col gap-1 overflow-y-auto scroll-smooth p-5 sm:p-7">
            {chat.messages.length === 0 && (
            <div className="m-auto flex max-w-sm flex-col items-center gap-3 px-6 text-center">
              <HammerSickle className="text-white/20" size={58} />
              <p className="han text-sm text-white/45">房间安静</p>
              <p className="text-sm text-white/35">The room is quiet</p>
            </div>
            )}
            {chat.messages.length > 0 && <div className="mt-auto" />}
            {chat.messages.map((message, i) => {
              const leading = noticesAt(i)
              const own = message.sender === chat.username
              const prev = chat.messages[i - 1]
              const next = chat.messages[i + 1]
              const firstOfGroup = !prev || prev.sender !== message.sender || prev.isAi !== message.isAi
              const lastOfGroup  = !next || next.sender !== message.sender || next.isAi !== message.isAi
              const reactions = Object.entries(message.reactions ?? {})
              const visibleReactions = reactions.slice(0, 3)
              const reactionTrayOpen = openReactions === message.id
              const { sticker, caption } = parseStickerMessage(message.plaintext)
              // Messenger rule: the react affordance is always visible on the last
              // incoming bubble of a group. Everywhere else it stays hover-only.
              const wordCount = (message.plaintext || '').trim().split(/\s+/).filter(Boolean).length
              // long incoming walls of text: no flip, and they never spend a reveal
              const tooLong = !own && !message.isAi && wordCount > 25
              const revealing = !own && !revealed.has(message.id) && revealsLeft > 0 && !tooLong
              const cipherLocked = tooLong || revealing
              const blocked = blockedFlash === message.id || (blockedFlash === 'ALL' && revealing)
              const showCipher = Boolean(message.cipher) && !revealing
                && ((allCipher !== ciphered.has(message.id)) || hoveredCipher === message.id)
              return (
                <Fragment key={message.id}>
                {leading.map((notice) => <JoinSlug key={notice.id} notice={notice} />)}
                <article
  className={`group/message w-fit max-w-[min(84%,30rem)] sm:max-w-[min(70%,38rem)] ${firstOfGroup ? 'mt-2.5 first:mt-0' : ''} ${own ? 'message-enter-right ml-auto' : 'message-enter-left mr-auto'}`}>
                {firstOfGroup && (
                  <p className={`mb-1 flex items-center gap-1.5 text-xs font-bold text-[#ffd100]/85 ${own ? 'justify-end text-right' : ''}`}>
                    {own ? 'You' : displayName(message.sender)}
                  </p>
                )}
                  {sticker ? (
                    <div className="sticker-pop max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-1.5 shadow-2xl shadow-black/30">
                      <StickerImage sticker={sticker} />
                      {caption && <p className={`mx-1 mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere] rounded-xl px-3 py-2.5 text-sm leading-6 ${own ? 'bg-red-500 text-yellow-100' : 'bg-white/[.06] text-[#f4e4c1]/90'}`}>{caption}</p>}
                    </div>
                  ) : (<div
  role="button"
  tabIndex={0}
  onClick={(event) => { event.stopPropagation(); if (cipherLocked) { flashBlocked(message.id); return } flipCipher(message.id) }}
  onPointerEnter={(event) => { if (cipherLocked) return; if (event.pointerType === 'mouse') setHoveredCipher(message.id) }}
  onPointerLeave={() => setHoveredCipher((current) => (current === message.id ? null : current))}
  onKeyDown={(event) => { if (event.key !== 'Enter' && event.key !== ' ') return; event.preventDefault(); if (cipherLocked) { flashBlocked(message.id); return } flipCipher(message.id) }}
  className={`bubble-arrive max-w-full whitespace-pre-wrap break-words [overflow-wrap:anywhere] border px-4 py-3 text-sm leading-6 shadow-lg select-none ${cipherLocked ? 'cursor-default' : 'cursor-pointer'} ${blocked ? 'cipher-blocked' : ''} ${dimOthers && dimOthers !== message.id ? 'msg-recede' : ''} ${dimOthers === message.id ? 'msg-arrive-pop' : ''}
  ${own
    ? `border-[#ff8fa3]/35 bg-[#9e0c22] text-white shadow-black/40
       rounded-l-2xl ${firstOfGroup ? 'rounded-tr-2xl' : 'rounded-tr-md'} ${lastOfGroup ? 'rounded-br-md' : 'rounded-br-md'}`
    : message.isAi
      ? `border-[#ffd100]/55 bg-[#2e0912] text-[#fff6dc] shadow-black/40
         rounded-r-2xl ${firstOfGroup ? 'rounded-tl-2xl' : 'rounded-tl-md'} rounded-bl-md`
      : `border-[#ffd100]/22 bg-[#2e0912] text-[#fff6dc] shadow-black/40
         rounded-r-2xl ${firstOfGroup ? 'rounded-tl-2xl' : 'rounded-tl-md'} rounded-bl-md`}`}>{showCipher
  ? <span className="cipher-text block break-all font-mono text-[11px] leading-4">{message.cipher}</span>
  : revealing
    ? <CipherReveal
        text={message.plaintext}
        cipher={message.cipher}
        onDone={() => {
          setRevealed((s) => new Set(s).add(message.id))
          setRevealsLeft((n) => n - 1)
        }}
      />
    : message.plaintext}</div>
                  )}
                  <div className={`relative flex items-center gap-1.5 ${lastOfGroup || reactions.length || reactionTrayOpen ? 'mt-1 h-7' : 'h-0'} ${own ? 'justify-end' : ''}`}>
                    {visibleReactions.map(([emoji, people]) => (
                      <button type="button" key={emoji} onClick={(event) => { event.stopPropagation(); chat.react(message.id, emoji) }} title={people.join(', ')} className={`reaction-pop react-pill flex h-7 items-center gap-1 rounded-full border px-2 text-xs ${people.includes(chat.username) ? 'border-[#ffd100] bg-[#ffd100]/20 text-[#ffd100]' : 'border-[#ffd100]/30 bg-[#3d0510] text-[#fff6dc] hover:border-[#ffd100] hover:bg-[#ffd100]/15'}`}><span>{emoji}</span><span className="text-[10px] text-[#ffd100]/80">{people.length}</span></button>
                    ))}
                    <button type="button" onClick={(event) => { event.stopPropagation(); setOpenReactions(reactionTrayOpen ? null : message.id) }} className={`react-nub react-idle grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[#ffd100]/35 bg-[#3d0510] text-[#ffd100]/70 shadow-lg shadow-black/50 hover:border-[#ffd100] hover:bg-[#ffd100] hover:text-[#4a0410] ${reactions.length || reactionTrayOpen || message.id === lastIncomingId
                      ? 'opacity-100'
                      : 'opacity-0 group-hover/message:opacity-100 focus-visible:opacity-100'}`} aria-label="View and add reactions"><SmilePlus size={14} /></button>
                    {reactionTrayOpen && (
                      <div onClick={(event) => event.stopPropagation()} className={`reaction-pop absolute bottom-9 z-30 min-w-52 rounded-2xl border border-amber-200/10 bg-[#1b181f]/95 p-2 shadow-2xl shadow-black/50 backdrop-blur-xl ${own ? 'right-0' : 'left-0'}`}>
                        {reactions.length > 0 && <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[.16em] text-[#f4e4c1]/45">Reactions</p>}
                        {reactions.length > 0 && <div className="mb-2 flex flex-wrap gap-1 border-b border-white/8 pb-2">{reactions.map(([emoji, people]) => <button type="button" key={emoji} onClick={() => chat.react(message.id, emoji)} title={people.join(', ')} className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs transition ${people.includes(chat.username) ? 'bg-red-500/15 ring-1 ring-red-400/25' : 'bg-white/5 hover:bg-red-500/10'}`}><span>{emoji}</span><span className="text-[10px] text-[#ffd100]/80">{people.length}</span></button>)}</div>}
                        <div className="mb-1 flex items-center gap-1 px-1 text-[10px] font-semibold uppercase tracking-[.16em] text-[#f4e4c1]/45"><SmilePlus size={12} /> Add reaction</div>
                        <div className="grid max-h-40 w-64 grid-cols-8 gap-0.5 overflow-y-auto pr-1">{EMOJIS.map((emoji) => <button type="button" key={emoji} onClick={() => { chat.react(message.id, emoji); setOpenReactions(null) }} className="grid h-8 w-8 place-items-center rounded-lg text-base transition hover:scale-125 hover:bg-white/8" aria-label={`React with ${emoji}`}>{emoji}</button>)}</div>
                      </div>
                    )}
                  </div>
                </article>
                </Fragment>
              )
            })}
            {notices.filter((notice) => notice.anchor >= chat.messages.length).map((notice) => (
              <JoinSlug key={notice.id} notice={notice} />
            ))}
            {chat.kerneyThinking && <div className="message-enter-left mt-4 w-fit max-w-[70%]"><p className="mb-1 text-xs font-bold text-[#ffd100]/85">{displayName(BOT_ID)}</p><div className="flex w-fit items-center gap-[5px] rounded-full border border-[#ffd100]/45 bg-[#26040a]/92 px-3.5 py-2.5 shadow-lg shadow-black/50"><span className="typing-dot h-[7px] w-[7px] rounded-full bg-[#ffd100]" /><span className="typing-dot h-[7px] w-[7px] rounded-full bg-[#ffd100]" /><span className="typing-dot h-[7px] w-[7px] rounded-full bg-[#ffd100]" /></div></div>}
          </div>

          <button type="button" tabIndex={showNewMessages ? 0 : -1} aria-hidden={!showNewMessages} onClick={() => scrollToNewest()} className={`absolute bottom-[5.7rem] left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-amber-200/25 bg-red-500 px-4 py-2 text-xs font-semibold text-yellow-100 shadow-xl shadow-black/40 transition-all duration-300 hover:bg-red-400 md:hidden ${showNewMessages ? 'new-message-badge opacity-100' : 'pointer-events-none translate-y-2 opacity-0'}`}><ArrowDown size={14} /> New messages</button>

          <form className="chat-composer relative border-t border-slate-300/8 p-4 sm:p-5" onSubmit={send}>
            {stickerPickerOpen && (
              <div onClick={(event) => event.stopPropagation()} className="sticker-pop absolute bottom-[5.4rem] left-4 z-30 w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-amber-200/10 bg-[#1b181f]/95 p-3 shadow-2xl shadow-black/60 backdrop-blur-xl sm:left-5">
                <div className="mb-3 flex items-center justify-between px-1"><div><p className="text-sm font-semibold text-[#f4e4c1]/90">Class stickers</p><p className="mt-0.5 text-[10px] text-[#f4e4c1]/45">Pick one or type its :shortcode:</p></div><ImagePlus size={17} className="text-[#ffe873]" /></div>
                <div className="grid max-h-80 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
                  {STICKERS.map((sticker) => <button type="button" key={sticker.name} onClick={() => { setDraft((current) => `${stickerShortcode(sticker.name)}${current.trim() ? ` ${current}` : ''}`); setStickerPickerOpen(false) }} className="group overflow-hidden rounded-xl border border-white/8 bg-white/[.025] p-1.5 text-left transition hover:-translate-y-0.5 hover:border-red-400/25 hover:bg-red-500/[.05]"><StickerImage sticker={sticker} compact /><span className="mt-1.5 block truncate px-1 pb-0.5 text-[10px] font-mono text-[#f4e4c1]/55 group-hover:text-[#ffe873]">:{sticker.name}:</span></button>)}
                </div>
              </div>
            )}
            {emojiPickerOpen && (
              <div onClick={(event) => event.stopPropagation()} className="sticker-pop absolute bottom-[5.4rem] left-4 z-30 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-amber-200/10 bg-[#1b181f]/95 p-3 shadow-2xl shadow-black/60 backdrop-blur-xl sm:left-5">
                <div className="mb-3 flex items-center justify-between px-1"><div><p className="text-sm font-semibold text-[#f4e4c1]/90">Emoji</p><p className="mt-0.5 text-[10px] text-[#f4e4c1]/45">Add some personality to your message</p></div><Smile size={17} className="text-[#ffe873]" /></div>
                <div className="grid max-h-64 grid-cols-8 gap-1 overflow-y-auto pr-1">
                  {EMOJIS.map((emoji) => <button type="button" key={emoji} onClick={() => setDraft((current) => `${current}${current && !current.endsWith(' ') ? ' ' : ''}${emoji}`)} className="grid aspect-square place-items-center rounded-lg text-xl transition duration-150 hover:scale-125 hover:bg-red-500/10" aria-label={`Add ${emoji}`}>{emoji}</button>)}
                </div>
              </div>
            )}
            <div className="flex items-end gap-1.5 rounded-[1.75rem] border-2 border-[#ffd100]/50 bg-[#1a0206] p-1.5 shadow-inner shadow-black/60 transition-all duration-300 hover:border-[#ffd100]/75 focus-within:border-[#ffd100] focus-within:bg-[#120104] focus-within:shadow-[0_0_28px_rgba(255,209,0,.12)]">
              <button type="button" onClick={(event) => { event.stopPropagation(); setStickerPickerOpen((open) => !open); setEmojiPickerOpen(false); setOpenReactions(null) }} disabled={!joined} aria-label="Open image picker" className={`react-idle react-idle--offset grid h-10 w-10 shrink-0 place-items-center rounded-full transition duration-150 hover:scale-110 disabled:opacity-30 disabled:hover:scale-100 ${stickerPickerOpen ? 'bg-[#ffd100] text-[#4a0410]' : 'text-[#ffd100] hover:bg-[#ffd100] hover:text-[#4a0410]'}`}><ImagePlus size={19} /></button>
              <button type="button" onClick={(event) => { event.stopPropagation(); setEmojiPickerOpen((open) => !open); setStickerPickerOpen(false); setOpenReactions(null) }} disabled={!joined} aria-label="Open emoji picker" className={`react-idle grid h-10 w-10 shrink-0 place-items-center rounded-full transition duration-150 hover:scale-110 disabled:opacity-30 disabled:hover:scale-100 ${emojiPickerOpen ? 'bg-[#ffd100] text-[#4a0410]' : 'text-[#ffd100] hover:bg-[#ffd100] hover:text-[#4a0410]'}`}><Smile size={19} /></button>
              <div className="relative min-w-0 flex-1">
              {!draft && joined && <RollingPlaceholder />}
              <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) send(event) }} disabled={!joined} rows="1" wrap="soft" placeholder="" aria-invalid={charactersOver > 0} className={`relative z-10 max-h-32 min-h-10 w-full resize-none overflow-y-auto whitespace-pre-wrap break-words [overflow-wrap:anywhere] bg-transparent px-2 py-2 text-sm leading-5 outline-none placeholder:text-[#ffd100]/50 ${charactersOver ? 'text-rose-300' : 'text-white'}`} />
              </div>
              <button disabled={!joined || !draft.trim() || charactersOver > 0 || sendCoolingDown} aria-label="Send message" className={`group grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#ffd100] text-[#4a0410] transition duration-150 hover:-translate-y-0.5 hover:hover:scale-110 active:translate-y-px disabled:bg-[#5c3a06] disabled:text-[#ffd100]/55 disabled:shadow-none disabled:hover:translate-y-0 ${sendPulse ? 'send-burst' : sendNudge ? 'send-nudge' : ''}`}><Send className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" size={18} /></button>
            </div>
            <div className={`flex justify-end px-3 text-[10px] ${charactersOver > 0 || draftLength >= 450 || /\bkerney\b/i.test(draft) ? 'mt-1.5 h-4' : 'h-0'}`}>
              {charactersOver > 0 ? <span className="font-medium text-rose-400">Remove {charactersOver} character{charactersOver === 1 ? '' : 's'} to send</span> : /\bkerney\b/i.test(draft) ? <span className="text-yellow-400/60">Careful what you wish for.</span> : draftLength >= 450 ? <span className={draftLength >= 490 ? 'text-[#ffe873]' : 'text-[#f4e4c1]/45'}>{draftLength}/{MAX_MESSAGE_LENGTH}</span> : null}
            </div>
          </form>
        </div>
      </section>
    </main>
  )
}
