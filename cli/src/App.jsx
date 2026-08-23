import { useEffect, useRef, useState } from 'react'
import { Activity, ArrowDown, Fingerprint, ImagePlus, LockKeyhole, Radio, Send, ShieldCheck, SmilePlus, Sparkles, Users } from 'lucide-react'
import { JoinModal } from './components/JoinModal.jsx'
import { RsaMatrixBackground } from './components/RsaMatrixBackground.jsx'
import { useChatSocket } from './hooks/useChatSocket.js'
import { parseStickerMessage, STICKERS, stickerShortcode } from './lib/stickers.js'

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
  const [showNewMessages, setShowNewMessages] = useState(false)
  const messageListRef = useRef(null)
  const atBottomRef = useRef(true)
  const previousMessageCountRef = useRef(0)
  const reactionChoices = ['👍', '❤️', '😂', '🔥', '🤯']

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
    if (!message || !chat.send(message)) return
    setDraft('')
    setSendPulse(true)
    window.setTimeout(() => setSendPulse(false), 430)
  }

  return (
    <main onClick={() => { setOpenReactions(null); setStickerPickerOpen(false) }} className="aurora grid-glow relative min-h-screen overflow-hidden p-3 sm:p-7">
      <RsaMatrixBackground />
      <div className="scanlines pointer-events-none fixed inset-0 z-40 opacity-20" />
      {!joined && <JoinModal connectionStatus={chat.status} serverError={chat.error} onJoin={chat.join} onClearError={chat.clearError} />}

      <section className="relative z-10 mx-auto flex h-[calc(100vh-1.5rem)] max-w-6xl overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0a0e16]/85 shadow-[0_30px_100px_rgba(0,0,0,.55)] backdrop-blur-xl sm:h-[calc(100vh-3.5rem)]">
        <div className="pointer-events-none absolute inset-x-24 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/60 to-transparent" />
        <aside className="hidden w-64 shrink-0 border-r border-white/8 bg-white/[.015] p-5 md:flex md:flex-col">
          <div className="flex items-center gap-3 text-white"><span className="relative grid h-9 w-9 place-items-center rounded-xl border border-emerald-300/20 bg-emerald-400/10"><Fingerprint className="text-emerald-300" size={20} /><span className="status-pulse absolute inset-0 rounded-xl border border-emerald-300/30" /></span><div><span className="block font-semibold tracking-tight">RSA Cha-Cha</span><span className="block text-[10px] uppercase tracking-[.2em] text-slate-600">Secure channel</span></div></div>
          <div className="mt-10 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500"><Users size={14} /> In the room</div>
          <div className="mt-4 space-y-2">
            {(chat.members.length ? chat.members : chat.username ? [chat.username] : []).map((member) => (
              <div key={member} className="group flex items-center gap-3 rounded-xl border border-transparent px-2 py-2 text-sm text-slate-300 transition hover:border-white/5 hover:bg-white/[.025]">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_9px_#34d399]" />{member}{member === chat.username && <span className="text-slate-600">you</span>}
              </div>
            ))}
          </div>
          <div className="mt-auto space-y-3">
            <button type="button" tabIndex={showNewMessages ? 0 : -1} aria-hidden={!showNewMessages} onClick={() => scrollToNewest()} className={`flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200/20 bg-emerald-400 px-3 py-2.5 text-xs font-semibold text-emerald-950 transition-all duration-300 hover:bg-emerald-300 ${showNewMessages ? 'new-message-badge opacity-100' : 'pointer-events-none translate-y-2 opacity-0'}`}><ArrowDown size={14} /> View new messages</button>
            <div className="rounded-2xl border border-emerald-300/10 bg-emerald-400/[.035] p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-300"><ShieldCheck size={14} /> RSA channel active</div>
              <p className="mt-2 text-[11px] leading-5 text-slate-600">Messages leave this device as decimal ciphertext.</p>
            </div>
          </div>
        </aside>

        <div className="relative flex min-w-0 flex-1 flex-col">
          <header className="flex h-20 items-center justify-between border-b border-white/8 bg-white/[.01] px-5 sm:px-7">
            <div className="flex items-center gap-3"><span className="relative grid h-10 w-10 place-items-center rounded-xl border border-cyan-300/10 bg-cyan-300/5 text-cyan-300"><Radio size={18} /><span className="status-pulse absolute inset-0 rounded-xl border border-cyan-300/20" /></span><div><h2 className="font-semibold tracking-tight text-white">Encrypted room</h2><p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><Activity size={11} className="text-emerald-400" />{joined ? `${chat.members.length} online · ${chat.username}` : 'Waiting to join'}</p></div></div>
            <span className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1.5 text-xs text-emerald-300 shadow-inner shadow-emerald-300/5"><Sparkles size={12} /> End-to-end RSA</span>
          </header>

          <div ref={messageListRef} onScroll={handleMessageScroll} className="flex flex-1 flex-col gap-5 overflow-y-auto scroll-smooth p-5 sm:p-7">
            {chat.messages.length === 0 && (
              <div className="m-auto max-w-sm text-center"><LockKeyhole className="mx-auto text-slate-700" size={38} /><h3 className="mt-4 font-medium text-slate-300">The room is quiet</h3><p className="mt-2 text-sm leading-6 text-slate-600">Open another browser tab, join with a different name, and send the first encrypted message.</p></div>
            )}
            {chat.messages.map((message) => {
              const own = message.sender === chat.username
              const reactions = Object.entries(message.reactions ?? {})
              const visibleReactions = reactions.slice(0, 3)
              const reactionTrayOpen = openReactions === message.id
              const { sticker, caption } = parseStickerMessage(message.plaintext)
              return (
                <article key={message.id} className={`group/message max-w-[82%] sm:max-w-[70%] ${own ? 'message-enter-right ml-auto' : 'message-enter-left'}`}>
                  <p className={`mb-1 text-xs text-slate-500 ${own ? 'text-right' : ''}`}>{own ? 'You' : message.sender}</p>
                  {sticker ? (
                    <div className="sticker-pop max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-1.5 shadow-2xl shadow-black/30">
                      <StickerImage sticker={sticker} />
                      {caption && <p className={`mx-1 mt-1 rounded-xl px-3 py-2.5 text-sm leading-6 ${own ? 'bg-emerald-400 text-emerald-950' : 'bg-white/[.06] text-slate-200'}`}>{caption}</p>}
                    </div>
                  ) : (
                    <div className={`bubble-arrive rounded-2xl border px-4 py-3 text-sm leading-6 shadow-lg ${own ? 'rounded-br-md border-emerald-200/20 bg-gradient-to-br from-emerald-300 to-emerald-400 text-emerald-950 shadow-emerald-950/20' : 'rounded-bl-md border-white/8 bg-white/[.055] text-slate-200 shadow-black/20 backdrop-blur-md'}`}>{message.plaintext}</div>
                  )}
                  <div className={`relative mt-2 flex h-7 items-center gap-1.5 ${own ? 'justify-end' : ''}`}>
                    {visibleReactions.map(([emoji, people]) => (
                      <button type="button" key={emoji} onClick={(event) => { event.stopPropagation(); chat.react(message.id, emoji) }} title={people.join(', ')} className={`reaction-pop flex h-7 items-center gap-1 rounded-full border px-2 text-xs transition hover:-translate-y-0.5 ${people.includes(chat.username) ? 'border-emerald-300/35 bg-emerald-400/15 text-emerald-200' : 'border-emerald-300/15 bg-emerald-400/[.07] text-slate-300 hover:border-emerald-300/35 hover:bg-emerald-400/15'}`}><span>{emoji}</span><span className="text-[10px] text-slate-500">{people.length}</span></button>
                    ))}
                    <button type="button" onClick={(event) => { event.stopPropagation(); setOpenReactions(reactionTrayOpen ? null : message.id) }} className={`grid h-7 min-w-7 place-items-center rounded-full border border-white/8 bg-white/[.035] px-2 text-xs tracking-widest text-slate-500 transition hover:border-emerald-300/25 hover:text-emerald-300 ${reactions.length || reactionTrayOpen ? 'opacity-100' : 'opacity-0 group-hover/message:opacity-100 focus:opacity-100'}`} aria-label="View and add reactions">•••</button>
                    {reactionTrayOpen && (
                      <div onClick={(event) => event.stopPropagation()} className={`reaction-pop absolute bottom-9 z-30 min-w-52 rounded-2xl border border-white/10 bg-[#111722]/95 p-2 shadow-2xl shadow-black/50 backdrop-blur-xl ${own ? 'right-0' : 'left-0'}`}>
                        {reactions.length > 0 && <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[.16em] text-slate-600">Reactions</p>}
                        {reactions.length > 0 && <div className="mb-2 flex flex-wrap gap-1 border-b border-white/8 pb-2">{reactions.map(([emoji, people]) => <button type="button" key={emoji} onClick={() => chat.react(message.id, emoji)} title={people.join(', ')} className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs transition ${people.includes(chat.username) ? 'bg-emerald-400/15 ring-1 ring-emerald-300/25' : 'bg-white/5 hover:bg-emerald-400/10'}`}><span>{emoji}</span><span className="text-[10px] text-slate-500">{people.length}</span></button>)}</div>}
                        <div className="flex items-center"><SmilePlus className="mx-1.5 text-slate-500" size={13} />{reactionChoices.map((emoji) => <button type="button" key={emoji} onClick={() => { chat.react(message.id, emoji); setOpenReactions(null) }} className="grid h-8 w-8 place-items-center rounded-full text-base transition hover:scale-125 hover:bg-white/8" aria-label={`React with ${emoji}`}>{emoji}</button>)}</div>
                      </div>
                    )}
                  </div>
                  <details className={`group mt-1.5 text-[11px] text-slate-600 ${own ? 'text-right' : ''}`}><summary className="cursor-pointer list-none transition hover:text-emerald-400">⌁ View ciphertext</summary><p className="cipher-text mt-1 max-w-lg break-all font-mono leading-4">{message.cipher}</p></details>
                </article>
              )
            })}
          </div>

          <button type="button" tabIndex={showNewMessages ? 0 : -1} aria-hidden={!showNewMessages} onClick={() => scrollToNewest()} className={`absolute bottom-[5.7rem] left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-emerald-200/25 bg-emerald-400 px-4 py-2 text-xs font-semibold text-emerald-950 shadow-xl shadow-black/40 transition-all duration-300 hover:bg-emerald-300 md:hidden ${showNewMessages ? 'new-message-badge opacity-100' : 'pointer-events-none translate-y-2 opacity-0'}`}><ArrowDown size={14} /> New messages</button>

          <form className="relative border-t border-white/8 bg-black/10 p-4 sm:p-5" onSubmit={send}>
            {stickerPickerOpen && (
              <div onClick={(event) => event.stopPropagation()} className="sticker-pop absolute bottom-[5.4rem] left-4 z-30 w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-[#111722]/95 p-3 shadow-2xl shadow-black/60 backdrop-blur-xl sm:left-5">
                <div className="mb-3 flex items-center justify-between px-1"><div><p className="text-sm font-semibold text-slate-200">Class stickers</p><p className="mt-0.5 text-[10px] text-slate-600">Pick one or type its :shortcode:</p></div><ImagePlus size={17} className="text-emerald-300" /></div>
                <div className="grid max-h-80 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
                  {STICKERS.map((sticker) => <button type="button" key={sticker.name} onClick={() => { setDraft((current) => `${stickerShortcode(sticker.name)}${current.trim() ? ` ${current}` : ''}`); setStickerPickerOpen(false) }} className="group overflow-hidden rounded-xl border border-white/8 bg-white/[.025] p-1.5 text-left transition hover:-translate-y-0.5 hover:border-emerald-300/25 hover:bg-emerald-400/[.05]"><StickerImage sticker={sticker} compact /><span className="mt-1.5 block truncate px-1 pb-0.5 text-[10px] font-mono text-slate-500 group-hover:text-emerald-300">:{sticker.name}:</span></button>)}
                </div>
              </div>
            )}
            <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-black/25 p-2 shadow-inner shadow-black/20 transition duration-300 focus-within:border-emerald-400/35 focus-within:shadow-[0_0_30px_rgba(52,211,153,.06)]">
              <button type="button" onClick={(event) => { event.stopPropagation(); setStickerPickerOpen((open) => !open); setOpenReactions(null) }} disabled={!joined} aria-label="Open image picker" className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border transition disabled:opacity-30 ${stickerPickerOpen ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-300' : 'border-transparent text-slate-500 hover:bg-white/5 hover:text-slate-300'}`}><ImagePlus size={19} /></button>
              <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) send(event) }} disabled={!joined} rows="1" placeholder="Message the room…" className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-3 py-3 text-sm text-slate-300 outline-none placeholder:text-slate-600" />
              <button disabled={!joined || !draft.trim()} aria-label="Send message" className={`group grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-emerald-300 to-teal-400 text-emerald-950 shadow-lg shadow-emerald-950/30 transition duration-200 hover:-translate-y-0.5 hover:shadow-emerald-400/20 active:translate-y-0 disabled:opacity-30 ${sendPulse ? 'send-burst' : ''}`}><Send className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" size={18} /></button>
            </div>
          </form>
        </div>
      </section>
    </main>
  )
}
