import { useCallback, useEffect, useRef, useState } from 'react'
import { Activity, ArrowDown, Fingerprint, ImagePlus, LockKeyhole, Radio, Send, ShieldCheck, Smile, SmilePlus, Users } from 'lucide-react'
import { JoinModal } from './components/JoinModal.jsx'
import { RsaMatrixBackground } from './components/RsaMatrixBackground.jsx'
import { useChatSocket } from './hooks/useChatSocket.js'
import { parseStickerMessage, STICKERS, stickerShortcode } from './lib/stickers.js'
import { EMOJIS } from './lib/emojis.js'
import { CipherReveal } from './components/CipherReveal.jsx'

const MAX_MESSAGE_LENGTH = 500
const SEND_COOLDOWN_MS = 400

function StickerImage({ sticker, compact = false }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <div className={`${compact ? 'h-24' : 'h-44'} grid w-full place-items-center rounded-xl border border-dashed border-white/10 bg-white/[.025] px-3 text-center text-xs text-slate-600`}>{sticker.label}<br />asset needed</div>
  return <img src={sticker.src} alt={sticker.label} onError={() => setFailed(true)} className={`${compact ? 'h-24' : 'max-h-72'} w-full rounded-xl object-cover`} />
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
  const draftLength = [...draft].length
  const charactersOver = Math.max(0, draftLength - MAX_MESSAGE_LENGTH)
  const [showNewMessages, setShowNewMessages] = useState(false)
  const messageListRef = useRef(null)
  const atBottomRef = useRef(true)
  const previousMessageCountRef = useRef(0)
  const [revealsLeft, setRevealsLeft] = useState(2)
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
    <main onClick={() => { setOpenReactions(null); setStickerPickerOpen(false); setEmojiPickerOpen(false) }} className="aurora grid-glow relative min-h-screen overflow-hidden p-3 sm:p-7">
      <RsaMatrixBackground />
      <div className="scanlines pointer-events-none fixed inset-0 z-40 opacity-20" />
      {!entryComplete && <JoinModal connectionStatus={chat.status} serverError={chat.error} onJoin={chat.join} onClearError={chat.clearError} onComplete={completeEntry} />}
<div className="pointer-events-none absolute inset-x-24 top-0 h-px bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />
      <section className="chat-shell relative z-10 mx-auto flex h-[calc(100vh-1.5rem)] max-w-6xl overflow-hidden rounded-[1.75rem] border border-slate-300/10 shadow-[0_30px_100px_rgba(0,0,0,.55)] backdrop-blur-xl sm:h-[calc(100vh-3.5rem)]">
        <div className="pointer-events-none absolute inset-x-24 top-0 h-px bg-gradient-to-r from-transparent via-red-400/60 to-transparent" />
        <aside className="chat-sidebar hidden w-64 shrink-0 border-r border-slate-300/8 p-5 md:flex md:flex-col">
          <div className="flex items-center gap-3 text-white"><span className="relative grid h-9 w-9 place-items-center rounded-xl border border-red-400/20 bg-red-500/10"><Fingerprint className="text-red-400" size={20} /><span className="status-pulse absolute inset-0 rounded-xl border border-red-400/30" /></span><div><span className="block font-semibold tracking-tight">RSA Cha-Cha</span><span className="block text-[10px] uppercase tracking-[.2em] text-slate-600">Secure channel</span></div></div>
          <div className="mt-10 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500"><Users size={14} /> In the room</div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-3 rounded-xl border border-yellow-400/10 bg-yellow-400/[.035] px-2 py-2 text-sm text-slate-200">
              <span className="h-2 w-2 rounded-full bg-yellow-400 shadow-[0_0_9px_#67e8f9]" />kerney
            </div>
            {(chat.members.length ? chat.members : chat.username ? [chat.username] : []).map((member) => (
              <div key={`member:${member}`} className="group flex items-center gap-3 rounded-xl border border-transparent px-2 py-2 text-sm text-slate-300 transition hover:border-white/5 hover:bg-white/[.025]">
                <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_9px_#34d399]" />{member}{member === chat.username && <span className="text-slate-600">you</span>}
              </div>
            ))}
          </div>
          <div className="mt-auto space-y-3">
            <button type="button" tabIndex={showNewMessages ? 0 : -1} aria-hidden={!showNewMessages} onClick={() => scrollToNewest()} className={`flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200/20 bg-red-500 px-3 py-2.5 text-xs font-semibold text-yellow-100 transition-all duration-300 hover:bg-red-400 ${showNewMessages ? 'new-message-badge opacity-100' : 'pointer-events-none translate-y-2 opacity-0'}`}><ArrowDown size={14} /> View new messages</button>
            <div className="rounded-2xl border border-red-400/10 bg-red-500/[.035] p-4">
            </div>
          </div>
        </aside>

        <div className="chat-pane relative flex min-w-0 flex-1 flex-col">
          <header className="chat-header flex h-20 items-center justify-between border-b border-slate-300/8 px-5 sm:px-7">
               <div className="flex items-center gap-3"><h2 className="font-semibold tracking-tight text-white">加密房间 · Encrypted Room</h2></div>
            <span className="flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-xs text-red-400 shadow-inner shadow-red-400/5"> End-to-end RSA</span>
          </header>

          <div ref={messageListRef} onScroll={handleMessageScroll} className="flex flex-1 flex-col gap-5 overflow-y-auto scroll-smooth p-5 sm:p-7">
            {chat.messages.length === 0 && (
            <div className="m-auto max-w-sm text-center"><LockKeyhole className="mx-auto text-slate-700" size={38} /><h3 className="mt-4 font-medium text-slate-300">房间安静 · The room is quiet</h3></div>
            )}
            {chat.messages.map((message) => {
              const own = message.sender === chat.username
              const reactions = Object.entries(message.reactions ?? {})
              const visibleReactions = reactions.slice(0, 3)
              const reactionTrayOpen = openReactions === message.id
              const { sticker, caption } = parseStickerMessage(message.plaintext)
              return (
                <article key={message.id} className={`group/message max-w-[82%] sm:max-w-[70%] ${own ? 'message-enter-right ml-auto' : 'message-enter-left'}`}>
                  <p className={`mb-1 flex items-center gap-1.5 text-xs text-slate-500 ${own ? 'justify-end text-right' : ''}`}>{own ? 'You' : message.sender}</p>
                  {sticker ? (
                    <div className="sticker-pop max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-1.5 shadow-2xl shadow-black/30">
                      <StickerImage sticker={sticker} />
                      {caption && <p className={`mx-1 mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere] rounded-xl px-3 py-2.5 text-sm leading-6 ${own ? 'bg-red-500 text-yellow-100' : 'bg-white/[.06] text-slate-200'}`}>{caption}</p>}
                    </div>
                  ) : (
                    <div className={`bubble-arrive max-w-full whitespace-pre-wrap break-words [overflow-wrap:anywhere] rounded-2xl border px-4 py-3 text-sm leading-6 shadow-lg ${own ? 'rounded-br-md border-amber-200/20 bg-gradient-to-br from-red-400 to-red-600 text-yellow-100 shadow-yellow-100/20' : message.isAi ? 'rounded-bl-md border-yellow-400/20 bg-red-950/30 text-cyan-50 shadow-red-950/20' : 'rounded-bl-md border-slate-300/10 bg-slate-700/25 text-slate-100 shadow-black/20 backdrop-blur-md'}`}>{!own && !revealed.has(message.id) && revealsLeft > 0
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
                  <div className={`relative mt-2 flex h-7 items-center gap-1.5 ${own ? 'justify-end' : ''}`}>
                    {visibleReactions.map(([emoji, people]) => (
                      <button type="button" key={emoji} onClick={(event) => { event.stopPropagation(); chat.react(message.id, emoji) }} title={people.join(', ')} className={`reaction-pop flex h-7 items-center gap-1 rounded-full border px-2 text-xs transition hover:-translate-y-0.5 ${people.includes(chat.username) ? 'border-red-400/35 bg-red-500/15 text-amber-200' : 'border-red-400/15 bg-red-500/[.07] text-slate-300 hover:border-red-400/35 hover:bg-red-500/15'}`}><span>{emoji}</span><span className="text-[10px] text-slate-500">{people.length}</span></button>
                    ))}
                    <button type="button" onClick={(event) => { event.stopPropagation(); setOpenReactions(reactionTrayOpen ? null : message.id) }} className={`grid h-7 min-w-7 place-items-center rounded-full border border-white/8 bg-white/[.035] px-2 text-xs tracking-widest text-slate-500 transition hover:border-red-400/25 hover:text-red-400 ${reactions.length || reactionTrayOpen ? 'opacity-100' : 'opacity-0 group-hover/message:opacity-100 focus:opacity-100'}`} aria-label="View and add reactions">•••</button>
                    {reactionTrayOpen && (
                      <div onClick={(event) => event.stopPropagation()} className={`reaction-pop absolute bottom-9 z-30 min-w-52 rounded-2xl border border-amber-200/10 bg-[#1b181f]/95 p-2 shadow-2xl shadow-black/50 backdrop-blur-xl ${own ? 'right-0' : 'left-0'}`}>
                        {reactions.length > 0 && <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[.16em] text-slate-600">Reactions</p>}
                        {reactions.length > 0 && <div className="mb-2 flex flex-wrap gap-1 border-b border-white/8 pb-2">{reactions.map(([emoji, people]) => <button type="button" key={emoji} onClick={() => chat.react(message.id, emoji)} title={people.join(', ')} className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs transition ${people.includes(chat.username) ? 'bg-red-500/15 ring-1 ring-red-400/25' : 'bg-white/5 hover:bg-red-500/10'}`}><span>{emoji}</span><span className="text-[10px] text-slate-500">{people.length}</span></button>)}</div>}
                        <div className="mb-1 flex items-center gap-1 px-1 text-[10px] font-semibold uppercase tracking-[.16em] text-slate-600"><SmilePlus size={12} /> Add reaction</div>
                        <div className="grid max-h-40 w-64 grid-cols-8 gap-0.5 overflow-y-auto pr-1">{EMOJIS.map((emoji) => <button type="button" key={emoji} onClick={() => { chat.react(message.id, emoji); setOpenReactions(null) }} className="grid h-8 w-8 place-items-center rounded-lg text-base transition hover:scale-125 hover:bg-white/8" aria-label={`React with ${emoji}`}>{emoji}</button>)}</div>
                      </div>
                    )}
                  </div>
                  {!message.isAi && <details className={`group mt-1.5 text-[11px] text-slate-600 ${own ? 'text-right' : ''}`}><summary className="cursor-pointer list-none transition hover:text-red-500">⌁ View ciphertext</summary><p className="cipher-text mt-1 max-w-lg break-all font-mono leading-4">{message.cipher}</p></details>}
                </article>
              )
            })}
            {chat.kerneyThinking && <div className="message-enter-left max-w-[70%]"><p className="mb-1 text-xs text-slate-500">kerney</p><div className="flex w-fit gap-1 rounded-2xl rounded-bl-md border border-yellow-400/20 bg-red-950/30 px-4 py-3"><span className="status-pulse h-1.5 w-1.5 rounded-full bg-yellow-400" /><span className="status-pulse h-1.5 w-1.5 rounded-full bg-yellow-400 [animation-delay:150ms]" /><span className="status-pulse h-1.5 w-1.5 rounded-full bg-yellow-400 [animation-delay:300ms]" /></div></div>}
          </div>

          <button type="button" tabIndex={showNewMessages ? 0 : -1} aria-hidden={!showNewMessages} onClick={() => scrollToNewest()} className={`absolute bottom-[5.7rem] left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-amber-200/25 bg-red-500 px-4 py-2 text-xs font-semibold text-yellow-100 shadow-xl shadow-black/40 transition-all duration-300 hover:bg-red-400 md:hidden ${showNewMessages ? 'new-message-badge opacity-100' : 'pointer-events-none translate-y-2 opacity-0'}`}><ArrowDown size={14} /> New messages</button>

          <form className="chat-composer relative border-t border-slate-300/8 p-4 sm:p-5" onSubmit={send}>
            {stickerPickerOpen && (
              <div onClick={(event) => event.stopPropagation()} className="sticker-pop absolute bottom-[5.4rem] left-4 z-30 w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-amber-200/10 bg-[#1b181f]/95 p-3 shadow-2xl shadow-black/60 backdrop-blur-xl sm:left-5">
                <div className="mb-3 flex items-center justify-between px-1"><div><p className="text-sm font-semibold text-slate-200">Class stickers</p><p className="mt-0.5 text-[10px] text-slate-600">Pick one or type its :shortcode:</p></div><ImagePlus size={17} className="text-red-400" /></div>
                <div className="grid max-h-80 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
                  {STICKERS.map((sticker) => <button type="button" key={sticker.name} onClick={() => { setDraft((current) => `${stickerShortcode(sticker.name)}${current.trim() ? ` ${current}` : ''}`); setStickerPickerOpen(false) }} className="group overflow-hidden rounded-xl border border-white/8 bg-white/[.025] p-1.5 text-left transition hover:-translate-y-0.5 hover:border-red-400/25 hover:bg-red-500/[.05]"><StickerImage sticker={sticker} compact /><span className="mt-1.5 block truncate px-1 pb-0.5 text-[10px] font-mono text-slate-500 group-hover:text-red-400">:{sticker.name}:</span></button>)}
                </div>
              </div>
            )}
            {emojiPickerOpen && (
              <div onClick={(event) => event.stopPropagation()} className="sticker-pop absolute bottom-[5.4rem] left-4 z-30 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-amber-200/10 bg-[#1b181f]/95 p-3 shadow-2xl shadow-black/60 backdrop-blur-xl sm:left-5">
                <div className="mb-3 flex items-center justify-between px-1"><div><p className="text-sm font-semibold text-slate-200">Emoji</p><p className="mt-0.5 text-[10px] text-slate-600">Add some personality to your message</p></div><Smile size={17} className="text-red-400" /></div>
                <div className="grid max-h-64 grid-cols-8 gap-1 overflow-y-auto pr-1">
                  {EMOJIS.map((emoji) => <button type="button" key={emoji} onClick={() => setDraft((current) => `${current}${current && !current.endsWith(' ') ? ' ' : ''}${emoji}`)} className="grid aspect-square place-items-center rounded-lg text-xl transition duration-150 hover:scale-125 hover:bg-red-500/10" aria-label={`Add ${emoji}`}>{emoji}</button>)}
                </div>
              </div>
            )}
            <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-black/25 p-2 shadow-inner shadow-black/20 transition-all duration-300 hover:border-white/20 hover:bg-black/30 hover:shadow-[0_0_24px_rgba(52,211,153,.045)] focus-within:border-red-500/35 focus-within:bg-black/30 focus-within:shadow-[0_0_32px_rgba(52,211,153,.085)]">
              <button type="button" onClick={(event) => { event.stopPropagation(); setStickerPickerOpen((open) => !open); setEmojiPickerOpen(false); setOpenReactions(null) }} disabled={!joined} aria-label="Open image picker" className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border transition disabled:opacity-30 ${stickerPickerOpen ? 'border-red-400/30 bg-red-500/10 text-red-400' : 'border-transparent text-slate-500 hover:bg-white/5 hover:text-slate-300'}`}><ImagePlus size={19} /></button>
              <button type="button" onClick={(event) => { event.stopPropagation(); setEmojiPickerOpen((open) => !open); setStickerPickerOpen(false); setOpenReactions(null) }} disabled={!joined} aria-label="Open emoji picker" className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border transition disabled:opacity-30 ${emojiPickerOpen ? 'border-red-400/30 bg-red-500/10 text-red-400' : 'border-transparent text-slate-500 hover:bg-white/5 hover:text-slate-300'}`}><Smile size={19} /></button>
              <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) send(event) }} disabled={!joined} rows="1" wrap="soft" placeholder="Message the room…" aria-invalid={charactersOver > 0} className={`max-h-32 min-h-11 min-w-0 flex-1 resize-none overflow-y-auto whitespace-pre-wrap break-words [overflow-wrap:anywhere] bg-transparent px-3 py-3 text-sm outline-none placeholder:text-slate-600 ${charactersOver ? 'text-rose-300' : 'text-slate-300'}`} />
              <button disabled={!joined || !draft.trim() || charactersOver > 0 || sendCoolingDown} aria-label="Send message" className={`group grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-red-400 to-red-600 text-yellow-100 shadow-lg shadow-yellow-100/30 transition duration-200 hover:-translate-y-0.5 hover:shadow-red-500/20 active:translate-y-0 disabled:opacity-30 ${sendPulse ? 'send-burst' : ''}`}><Send className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" size={18} /></button>
            </div>
            <div className="mt-1.5 flex h-4 justify-end px-2 text-[10px]">
              {charactersOver > 0 ? <span className="font-medium text-rose-400">Remove {charactersOver} character{charactersOver === 1 ? '' : 's'} to send</span> : /\bkerney\b/i.test(draft) ? <span className="text-yellow-400/60">Careful what you wish for.</span> : draftLength >= 450 ? <span className={draftLength >= 490 ? 'text-red-400' : 'text-slate-600'}>{draftLength}/{MAX_MESSAGE_LENGTH}</span> : null}
            </div>
          </form>
        </div>
      </section>
    </main>
  )
}
