*shamelessly pasted handout here. just... dont... read it, its a backup of a wordsalad thta happens to run :))) - spauly*

-----
# RSA CHA-CHA — Handover

**Written 2026-08-26, 01:00am PT. Deadline: Thursday Aug 27, 12:00pm PT.**

Read this cold. It assumes zero prior conversation.

---

## 0. The one-paragraph version

Tony (repo owner) is building a browser chat app for CSCI 26 where every message is
really encrypted with hand-rolled RSA. C++ is the canonical implementation; the
browser runs a faithful JS port. The core crypto works end to end. What is being
built now is **Inspect mode** — a Factorio-style factory floor that opens on any
message and shows the whole RSA pipeline with that message's real numbers, plus a
hidden typing-speed game that escalates into a site-wide "possession" event.

The submission bar is: **does it encrypt and decrypt.** That already passes. Everything
current is theater, and theater is what the demo is graded on.

---

## 1. Hard facts

| Thing | Value |
|---|---|
| Repo | `github.com/Forzalab/rsa-cha-cha` |
| Working branch | `spauly` (Tony's). `main` protected. `bruce` merged Aug 25. |
| HEAD at writing | `c6d70ca feat: add ritual` |
| Host | `csci4x.com` = `96.126.102.195`, public IPv4, no firewall |
| Ports | `6767` static site (http), `6868` C++ WebSocket (ws) |
| Transport | plain `http://` + `ws://`. **No TLS, permanently.** |
| Team | Tony, McKay Seamons, Bruce. |
| Professor | Kerney. AI use on projects explicitly allowed. |

**Mixed content is the constraint everything hangs on.** A browser refuses `ws://`
from an `https://` page, so Vercel/Netlify can never host this. Also, plain http is an
*insecure context*: `crypto.subtle` and `crypto.randomUUID` are `undefined`. Do not
introduce anything that depends on WebCrypto. `crypto.getRandomValues` **does** work
in insecure contexts and is used by keygen.

---

## 2. Layout

```
svr/
  Transport.h     Boost.Beast WebSocket. One io_context, callbacks, no threads.
                  Session map userid -> session. JSON router. Rate limiting.
                  KernAI hook. Public-key directory lives in Hub::Entry.
  RSA-Core.h      class LocksmithBox. encrypt/decrypt via powm.
                  sign() delegates to encrypt, verify() to decrypt.
                  decimal_from_text / text_from_decimal  <-- Tony wrote these
  RSA-Utility.h   class Utility, all static: gcd, get_new_prime (Miller-Rabin 25
                  rounds), N, T, E, D, get_visualization_url. Bruce's surface.
  LLM.h           OpenRouter over libcurl, max_tokens 1500. KernAI persona.
  main.cc         Two modes: server on 6868, or --selftest (prints the whole
                  RSA pipeline to stdout; this is the C++ demo artifact).
cli/
  src/lib/rsa.js          Browser RSA. Port of the C++ above. See §3.
  src/lib/ritualState.js  Session singleton for the typing game. See §5.
  src/lib/protocol.js     Envelope builders.
  src/lib/{emojis,stickers,names,joinSlugs,ping,rosasMode}.js
  src/hooks/useChatSocket.js   Socket, keypair, per-recipient encryption.
  src/components/InspectFactory.jsx   The factory floor + both ads. See §5.
  src/components/{JoinModal,CipherReveal,PropagandaFrame,RsaMatrixBackground}.jsx
  src/App.jsx             Everything is mounted here.
  src/index.css           All animation lives at the bottom of this file.
```

Build + deploy: either `cli/run.sh` or `svr/run.sh`. Modify as needed.

---

## 3. How the crypto actually works

**One message packs into ONE integer, one modPow encrypts it.** Not per-byte.

- `decimalFromText(text)` — walks bytes from the end, `msg <<= 8n; msg += byte`.
  So `text[0]` is the **least significant** byte.
- `textFromDecimal(n)` — `byte = n % 256n`, **append**, `n /= 256n`.
- Byte order is identical on both sides. Change one, you must change both, in two
  languages. A C++ ciphertext decrypts in the browser and vice versa.

**Keys.** Each browser tab generates its own keypair on mount (`generateKeypair()`,
`PRIME_DIGITS = 64` → N is ~128 decimal digits, keygen ~28ms). The public half ships
in `JOIN`. The server puts every member's public key into the `MEMBERS` broadcast as
a `keys{}` object alongside `users[]`, so every client holds the whole directory and
`LOOKUP` is never needed. **Sending encrypts once per recipient, under that
recipient's key.**

**The 52-byte ceiling.** One key encrypts one block, so a message must pack to an
integer smaller than N — about 52 bytes at the current key size. `encryptText` throws
past that; the composer refuses to send. This limit is **deliberately not solved.**

---

## 4. Wire protocol

Flat JSON over WebSocket text frames. Four keys, always present:

```json
{ "sender": "tony", "receiver": "mckay", "request": "SEND", "content": {} }
```

Server id is the literal `"SERVER"`. Big integers travel as decimal strings.

| Verb | Dir | `content` |
|---|---|---|
| `JOIN` | c→s | `key_value`, `key_mod`, `key_type` |
| `JOIN_SUCC` | s→c | — |
| `MEMBERS` | s→c | `users[]`, **`keys{}`** (the public-key directory) |
| `SEND` | c→s | `cipher`, `message_id`, `event_id`, optional `kind` |
| `DELIVER` | s→c | `cipher`, `message_id`, `kind` |
| `REACTION` | both | `message_id`, `kind`, `reaction_action` |
| `AI_KERNEY` / `AI_THINKING` / `AI_DELIVER` | — | KernAI bot |
| `ERR_*` | s→c | `ERR_DUPL_JOIN`, `ERR_NOT_JOINED`, `ERR_NO_USER`, `ERR_BAD_JSON`, `ERR_UNSPC`, `ERR_RATE_LIMIT`, `ERR_AI_*` |
| `LOOKUP` / `LOOKUP_SUCC` | — | defined, now dead — `MEMBERS` carries keys |

**Reactions prove `kind` rides through the relay untouched.** That is the mechanism
Sprint 3 piggybacks on for ritual broadcasts — verify it in `Transport.h` before
relying on it. If the router whitelists fields instead of passing `content` through,
a small server patch is needed and Tony must rebuild and restart on csci4x.

---

## 5. Inspect mode — what exists today

Opened by a `?` nub on a message. First open shows an Ovaltine ad interstitial with a
2s fill on the Skip button; after one skip, `adSeen` sticks and later opens go
straight in.

**Five stations wired in a U:**

```
[1 WRITE] --pipe--> [2 PACK] --pipe--> [3 LOCK]
                    ★                      |
                                        (drop pipe)
[5 OPEN]  <------- pipe -------- [4 SEND] <-'
```

1 = editable textarea. 2 = the packed integer. 3 = `m^E mod N`. 4 = what's on the
wire. 5 = `c^D mod N` decoded back to text. Every number is live from that tab's real
keypair; edit station 1 and the whole line re-runs.

**The star** fires a laser at station 2, 3, or 4 and flips one digit there. Damage
**cascades**: a hit at stage *i* breaks every stage from *i* onward. Hit stations show
a siren border, three smoke puffs, dead pipes, and the flipped digit burning red in
place. The rolled digit is guaranteed different from the one already there — an
earlier version rolled randomly and produced a visible no-op ~10% of the time.

**Per-station seals** (2–5) each show that stage's own integrity as an inline SVG tick
or bang. Clicking any of them opens the signature card (`m^D mod N`, then `s^E mod N`).
They are inline SVG on purpose: at 9px bold, `✓` fell through to a fallback font and
rendered as ⊘, which reads as *forbidden* — the opposite meaning.

**The hidden typing game.** `useWpm` counts characters in a 5s sliding window
(5 chars = 1 word; `wpm = round(chars/5 * 12)`), recomputed every 300ms so it drains
on its own. Then:

- **Below 20 wpm the counter is disguised as the station number `1`** — same font,
  same size, indistinguishable from stations 2–5. At 20 it pops open into three
  Titan One reels and starts turning. Nobody is told.
- **Glory gauge** on station 1's right edge fills toward 130, drains in 150ms when
  you slow, ticks at 60/100/130, ratchets when you cross one.
- **Coins** burst at 15% per keystroke past heat 0.4. Raw `appendChild`, 700ms
  cleanup, hard cap 12 live. React never sees them — otherwise the whole floor
  re-renders per letter.
- **The eye** fades open in the star at 100+ wpm and the pupil tracks the cursor
  (100ms throttle, 3.2 unit cap).
- **Heat** drives everything: matrix rain opacity and colour, pipe digit speed and
  glow, panel quake past 100.
- **Tooltip** slides out of station 1's bottom-right corner every 4s while idle, and
  slides back. Empty box always gets `Type something... / Don't go faster... 🤫`.
  Once a tier has been hit and there is text: `you were warned 🤫`. After a takeover:
  `faster, comrade 🤫`. That memory lives in `ritualState.js`, a module singleton that
  survives every mount/unmount and resets on refresh.

**Ads.** A dismissable sidebar banner rotating six creatives every 5s (Ovaltine,
decoder ring, Cracker Jack, Bazooka Joe, Enigma, bulk primes) plus the full
interstitial. Both fall back to a 🥛 placeholder — **drop the real image at
`cli/public/ovaltine.png`** and both pick it up with no code change.

---

## 6. What is NOT built yet

**Sprint 3 — the network ritual.** New `zalgo.js`; `sendRitual()` on the hook with a
30s cooldown; `RitualTakeover.jsx`. At 100 wpm the room gets a join-slug
(`comrade X seeks glory, glory shall deliver`, 5 variants). At **130 wpm the site
disappears for everyone**, including someone sitting at the login screen, for 4
seconds: three zalgo words strobing, permuted within fixed columns
(`DRINK/RSA/PRAISE/OBEY` · `YOUR/YOUR/SUPREME/THE` · `OVALTINE/MESSAGE/LEADER/MODULUS`
— column-locked, so `PRAISE RSA OVALTINE` can never appear). The **trigger** sees
red/white; **everyone else** sees gold/black plus four border marquees scrolling
`向{X}俯首 BOW TO {X}` in zalgo — the point is to make the room look at that person.
Then it releases and each client posts a closing slug so bystanders have a thread to
pull instead of thinking the site broke.

**Strobe is capped near 2.9Hz** for photosensitivity, with a static card under
`prefers-reduced-motion`. Do not raise it.

**Sprint 4 — ads and skin.** 1950s Cracker-Jack sidebar (white `#fff8ee`, halftone
dots, Lobster script, Anton shout, starburst badge, 14px `×`); OmegaMart four-stage
decay driven by `ritualState.score` (normal → one detail wrong → semantically wrong →
zalgo-possessed); **hydra dismissal** (kill one, two more in 5–7s; leave one alone,
one more in 10–15s; cap 5; eight consecutive dismissals clears everything and stops
spawning for 30s so a demo can't be buried); a 🥛→👁 subliminal frame, 130ms, max 2 per
session; global Comic Sans with `Baloo 2` inside the factory and `Titan One` on the
counter, loaded via `<link>` in `index.html` — **not `@import`**, Tailwind v4 silently
drops `@import` that follows `@import "tailwindcss"`; and the **emoji picker letter
rows**, which have been promised twice and dropped twice:

```
🥀 🇷 🇴 🇸 🇦 🇸 🥀        (each in its own <button>, so no flag fusion)
🐐 🇰 🇪 🇷 🇳 🇪 🇾 🧓
```

Both pickers — the composer one and the reaction tray — then a divider, then the
normal grid. Fallback if a platform renders regional indicators blank: `®️ 🅾️ 💲 🅰️ 💲`.

**Sprint 5 — close-out.** Touch devices have no `mousemove`, so the eye currently sits
still; give it a 2.5s wander under `matchMedia('(pointer:fine)')`. Then re-run
everything and cut the final patch.

---

## 7. Loose ends, unowned

- `App.jsx` still has `MAX_MESSAGE_LENGTH = 500` while the real ceiling is ~52 bytes.
  Typing 53+ makes send fail with no visible reason. **Fix the UI feedback, not the
  ceiling** (see CE wall).
- `Utility::get_visualization_url()` ships `apiKey = "YOUR_API_KEY"` — compiles, dies
  at runtime. Working credentials exist in `Forzalab/particle-raincheck`. It also
  posts the private key `d` to a public BRIDGES page.
- Handout §2 says "no rate limits" while `Transport.h` implements them. One has to go.
- README exists; demo rehearsal and failover drill have not been run.
- `cli/public/ovaltine.png` does not exist yet.

---

## 8. How to work with Tony

**Verify, never assume.** His tree has been out of sync with the patch three separate
times. Always `git fetch`, checkout `origin/spauly`, and `grep` for the anchors before
editing. A `git checkout` in the middle of an edit session silently wiped changes once
and shipped a broken patch.

**Never hand-write a diff.** Make the edit, build it, `git diff`, `git stash`,
`git apply --check`, `git stash pop`. A hand-written hunk header was rejected as
corrupt. Whole files go through `present_files`; small diffs get pasted into chat as
fenced code.

**Build passing ≠ working.** Undeclared identifiers and hooks called at module scope
compile fine and produce a blank page. Both happened. When a page goes blank, run the
built bundle under jsdom and read the throw; `root children: 0` on its own is a false
negative from the canvas background.

**He is ADHD, ASD, ESL, and has severe RSD.** Short sentences. No hypophora, no
"not X but Y", no corporate register. Warm but never sycophantic. Devil's advocate on
architecture — his self-assessment runs about two weeks behind his actual ability, so
challenge it rather than reflecting it back. Under evaluative pressure (exam, being
judged) he freezes: reduce scope, give two or three anchors, stop asking questions.
Under project crunch he is at his most productive: get out of the way.

The persona he works with is **Cluck** — a senior CS professor turned duck. Terse,
heavy quacking, kaomoji, Socratic by default on anything CE-adjacent, direct on
plumbing. Every message ends with a Chinese state block that carries the diagnosis and
the no-reveal rule forward.

**Toll protocol.** Before Claude does a self-contained coding task he could do alone,
state a fixed countable batch of hand-worked problems from the live course material,
up front, never retroactively. Pay out immediately and fully on delivery; never raise
the price mid-transaction. Reward is never CE material.

---

## 9. Commit history that matters

```
c6d70ca  feat: add ritual          <- HEAD. ritualState.js + sprint 2 wiring
de0c333  feat: sprint 2 ui         counter, gauge, coins, eye, tooltip
08daffe  fix: sprint 1 visual fix   one lamp, SVG marks, pipe transform, matrix dim
67542c7  fix: factorio themibg      v3 factory: matrix field, pipes, plating
101b2ef  fix: ui layout
1ac01fd  feat: shhhhh
df35313  fix: empty site            hooks-at-module-scope blank page fixed
c49a3df  feat:ovaltine              first inspect mode + ad gate
3da55f1  feat: rsa integration      main.cc restored, MEMBERS ships keys
```

Pending on top of `c6d70ca`: the five interjection fixes (matrix seed starvation,
tooltip first-line and placement and palette, counter disguise, amber matrix) —
delivered as `InspectFactory.jsx` plus `interject.patch`.
# CSCI 26 — RSA Project Handout

**Team:** Tony (repo owner), McKay Seamons, Bruce
**Due:** Thursday Aug 27, 12:00pm — hard
**Written:** Tue Aug 18. **Revised:** Sat Aug 22, 19:05. Five days to deadline; four to freeze.

**Now (Sat Aug 22):** verb schema drafted (§5a) — needs Tony's redline, then goes to McKay. Transport implementation next. Four working days to the Wed Aug 26 freeze.

Read this cold. It assumes you were not in any prior conversation about the project.

**Everything here is tentative.** This is a guideline, not a contract. Any decision below is open to renegotiation by anyone on the team at any time — bring a reason, not a preference, and we change it. Nothing in this document is worth defending past the point where it stops helping.

---

## 1. What we are building

Five things off Kerney's whiteboard.

| # | Item | Stack |
|---|------|-------|
| 1 | User interface — a website | web |
| 2 | RSA encrypt & decrypt | C++ (canonical) + JS port |
| 3 | RSA signature & verification | C++ (canonical) + JS port |
| 4 | Generate primes, N, T | C++ |
| 5 | **& BRIDGES** — visualize a structure, get back a URL | C++ |

The four flows the board specifies:

```
encrypt:  message + public key   →  S
decrypt:  S       + private key  →  message
sign:     message + private key  →  S
verify:   S       + public key   →  message
```

Same two operations, opposite key order. Items 2 and 3 share almost everything.

**"& BRIDGES" is the BRIDGES visualization library.** Not "bridging two languages" — that misreading cost a full session. A function hands BRIDGES a structure and gets back a working URL. Planned surface: a `More > Visualize using BRIDGES` affordance in the chat UI. **How it installs — answered, from our own history.** `Forzalab/particle-raincheck` already did this: the whole library is vendored into the repo at `libs/include/`, no package manager, and the Makefile carries `-Ilibs/include -lcurl`. It is *not* header-only — `-lcurl` is a real link dependency. BRIDGES also needs `setApiKey()` and `setUserName()`; the URL comes back from their server, so somebody registers an account before `get_visualization_url` can return anything. `Bifrost.h` in that repo is a working wrapper to crib from.

*Open: what structure actually gets visualized, and whether the button belongs to item 1 or item 5.*

---

## 2. Non-goals

Say no to these out loud so nobody quietly builds one.

- No TLS. No HTTPS. Plain WebSocket.
- No user accounts, no login, no password storage.
- No key management, key rotation, or secure key storage.
- No database. In-memory only, for the duration of a run. (BRIDGES needs message data held server-side to visualize it — that is retention in a map, not a database.)
- No threat model. Nobody is attacking this.
- No deployment pipeline. No CI, no containers, no Vercel. Hosting is two processes on a class server — see §7.
- No unlockables, achievements, hidden modes, easter eggs, tutorials, or anything a user has to *discover*. Nobody has ten minutes to find it.

Kerney grades whether it encrypts and decrypts. Everything above is work that does not move that needle.

---

## 3. Shape: chat app

**Approved.** Kerney was asked directly on Aug 18 and said anything is fine as long as it does RSA. No prescribed form factor.

So: a chat window. Type a message, ciphertext goes over the wire, plaintext comes out the other end. All four whiteboard flows are reachable from one screen, and it needs less scaffolding than a fake email client.

**Layout: one browser tab per machine.** Each person opens the site on their own PC and is one "user." Nobody juggles two chats in one window.

Consequence, and it is the reason the wire protocol looks the way it does: two separate browsers means the server has to speak first when a message arrives for the other side. Plain HTTP request/response cannot do that. WebSocket is required, not preferred.

The board's "Email" wording was a stand-in for "some text a user typed." A chat message is the same thing. The C++ side does not care either way — if the shape ever changes, only item 1 changes.

### Who actually uses this, and for how long

Two audiences, both under ten minutes.

1. Kerney, watching a demo on one screen.
2. Classmates, sitting down at a laptop and mashing it themselves.

Neither is stress-testing. Expect a short paragraph typed by a human, or `nejejdbdodjdbeiejeejeosudbdj`. Not Shakespeare, not a 4KB file. **Plaintext is short and human-scale.** Ciphertext is the only long string on screen, and it is machine-generated.

Design target: someone walks away with a *memory* of using it. Zero onboarding, zero instructions, obvious on sight.

### Presentation rules

**Theater where it costs nothing, nowhere else.**

- **Typewriter reveal on incoming plaintext.** A string, an index, a tick. Human-length message, so per-character is fine — this is the wrong place to build a dual-speed system. Append to the node, never re-render it.
- **Ciphertext is the confetti.** A wall of digits landing on screen is the visual payoff. It arrives in one frame; the reveal is a render decision.
- **The wait is real.** Modular exponentiation on big numbers takes actual time. A "working" indicator here is honest, not decorative. Fire on send, kill when the frame lands.
- **Presence beats features.** One pane showing that the other is doing something is the cheapest engagement mechanism available. Discord's hook is the typing indicator, not the paid tier.

**Bug triage, stated up front.** If something breaks, it should break in appearance or message content — visible, obvious, fixable during a demo. Do not spend the remaining days on subtle edge cases, malformed-input hardening, or anything invisible. There is no attacker (see §2). A wrong character on screen matters here; an unhandled exotic input does not.

Smoothness over polish. Immediate over impressive.

**Repo:** `github.com/Forzalab/rsa-cha-cha` — already exists on Tony's account. That is the project repo. Everyone clones this, nobody makes a second one.

---

## 4. Architecture — revised Aug 20 13:45

The server is a **relay, a public-key directory, and a crypto engine.** The browser is also a crypto engine. **RSA exists on both sides.**

```
A joins       →  A registers with S, S issues/holds the keypairs
A sends       →  A encrypts in the browser (JS), ships ciphertext
S relays      →  S stores + relays; S can encrypt/decrypt/sign/verify itself
B receives    →  B decrypts in the browser, or S decrypts and sends plaintext
```

Every round-trip is ACKed.

- **C++ is canonical.** `svr/RSA-Utility.h` is the reference implementation and the thing explained out loud at the demo. The JS side is a port of the same standardized algorithm, not a separate design.
- **Kerney does not penalize the duplication.** Confirmed by Tony, Aug 20: it needs to work, that is the whole bar. The usual over-engineering objection does not apply here.
- **`USERID` is a required field.** The server tracks who sent what, and the UI needs it to label messages.
- **Rejected:** hop-by-hop re-encryption through an `Spub`/`Spriv` pair. Sketched Aug 19, scratched the same night.
- **Not pursued:** true P2P with no middleman. Possible in principle, out of scope for seven days.

**Cost, stated honestly.** Two implementations means two places to be wrong and two things to explain with the file closed. The mitigation is that they are the *same algorithm* — port, do not redesign, and test both against one hardcoded keypair so a mismatch shows up immediately.

**Deadline on this decision: Sun Aug 23.** If the JS port is not round-tripping by then, it gets cut and the server does all the math. That fallback costs nothing because C++ is canonical either way.

**Signatures answer impersonation.** Without one, C can send a message to B carrying A's name and B has no way to tell. A signs with `Apriv`; anybody verifies with `Apub`; only A can produce something that `Apub` turns into readable text. A server-assigned `USERID` label is a convenience for the UI, not proof.

> **Prior dissent, resolved.** Tony objected that a public-key system whose private keys live only on the server inverts the point of the math. This revision restores browser-side keys, so the objection no longer applies.

### Transport

One connection per browser, one session object per connection, distinguished by id. The map is `userid → session`.

Boost.Beast runs one `io_context` with callbacks — **no thread-per-client.** `chatchapoon` needed threads because raw sockets block in `readLine`; Beast does not, so none of that plumbing carries over.

The wire is `VERB:payload` text in both directions, which means the frontend framework choice cannot reach the C++ implementation.

---

## 5. Wire protocol — changed Aug 21, 13:00

**Flat JSON over WebSocket text frames.** One level deep. A `verb` field plus flat fields alongside it. No nesting.

```
client → server:   { "verb": "...", ...fields }
server → client:   { "verb": "...", ...fields }
```

`nlohmann/json` on the C++ side — already a dependency in `rpg40-server`, so nothing new. `JSON.parse` in the browser, free.

**This replaces the colon-delimited `VERB:payload` scheme.** Two reasons, both real:

1. **Colons are injection hell.** A user types a colon inside their message and the delimiter lies about where the payload starts. That bug exists today, not later.
2. **`JSON.parse` mangles big numbers.** A 600-digit ciphertext does not survive a JSON number field. So **every number on the wire is a string** — all of them, not just the big ones, so nobody has to hold a mental table of which fields are quoted.

**Consequence: a parse can now fail.** The error verb is no longer deferrable (§9). It is the first thing the hello-world bridge exercises.

**Do not** introduce nesting, JSON Schema, protobuf, or codegen. Flat verb + fields is the whole design.

### Big integers on the wire — decided

Our payloads are integers with hundreds of digits. **They travel as decimal strings.** Plain digits, no prefix, no padding.

Reason: least code on both ends. Boost `cpp_int` takes a decimal string directly, and the browser's native `BigInt` does too. Hex, binary, and raw bytes all cost a conversion step on at least one side and buy nothing. This is the same rule as above — numbers are quoted — stated for the one field it matters most on.

Three things that came up and are closed:

- **Size does not matter here.** A 600-digit number is 600 bytes. That is noise on a WebSocket frame. Nobody optimizes this.
- **The browser can hold the number.** JavaScript has had native `BigInt` since ES2020 — arbitrary precision, no library. Splitting messages into chunks is not needed and should not be built.
- **Base has nothing to do with the math.** 255 and 0xFF are the same quantity written two ways; `mod` does not read notation. Choosing decimal is a plumbing decision, not an arithmetic one.

---

## 5a. Verb schema — drafted Aug 22, 19:00

> **Status: DRAFT.** Tony redlines, then it goes to McKay. Nothing is implemented against it yet.

Every message uses one envelope. The server's id is the literal string `SERVER`. **Every number is a quoted string** — all of them, so nobody keeps a mental table of which fields are quoted.

```jsonc
{ "sender": "...", "receiver": "...", "request": "VERB", "content": { } }
```

`request` carries the verb in **both** directions. One field name, one lookup. `content_sig` appears only where noted below.

### Client → Server

```jsonc
{ "sender":"tony", "receiver":"SERVER", "request":"JOIN",
  "content":{ "key_value":"65537", "key_mod":"3233", "key_type":"pub" },
  "content_sig":"1394" }

{ "sender":"tony", "receiver":"SERVER", "request":"LOOKUP",
  "content":{ "who":"mckay" } }

{ "sender":"tony", "receiver":"mckay", "request":"SEND",
  "content":{ "cipher":"2790" },
  "content_sig":"1301" }
```

### Server → Client

```jsonc
{ "sender":"SERVER", "receiver":"tony", "request":"JOIN_SUCC",
  "content":{ "key_value":"17", "key_mod":"3233", "key_type":"pub" },
  "content_sig":"..." }

{ "sender":"SERVER", "receiver":"tony", "request":"LOOKUP_SUCC",
  "content":{ "who":"mckay", "key_value":"7", "key_mod":"3599", "key_type":"pub" } }

{ "sender":"SERVER", "receiver":"tony", "request":"SEND_SUCC",
  "content":{ "to":"mckay" } }

{ "sender":"tony", "receiver":"mckay", "request":"DELIVER",
  "content":{ "cipher":"2790" },
  "content_sig":"1301" }
```

### Errors

```jsonc
{ "sender":"SERVER", "receiver":"tony", "request":"ERR_DUPL_JOIN",  "content":{} }
{ "sender":"SERVER", "receiver":"tony", "request":"ERR_NOT_JOINED", "content":{} }
{ "sender":"SERVER", "receiver":"tony", "request":"ERR_NO_USER",    "content":{"who":"mckay"} }
{ "sender":"SERVER", "receiver":"?",    "request":"ERR_BAD_JSON",   "content":{} }
{ "sender":"SERVER", "receiver":"tony", "request":"ERR_UNSPC",      "content":{} }
```

`ERR_BAD_JSON` fires when the frame didn't parse, so `sender` cannot be trusted. The session is still open, so it goes back down that socket anyway.

### Three calls that need agreement

- **`key_mod` is split out from `key_value`.** A public key is two numbers. Jamming both into one string means somebody writes a splitter.
- **`DELIVER` passes `sender` and `content_sig` through untouched.** That is what makes item 3 verifiable end to end.
- **`SEND` carries `cipher`, never plaintext.** This is §4 restated as schema.

### Still unresolved

`JOIN` is self-certifying: the server verifies `content_sig` using the public key delivered in that same message, so anyone can generate a keypair and sign their own JOIN. It proves nothing at that moment. Left open deliberately — it does not block the bridge.

---

## 6. Ownership

> **Cortes dropped the class on Aug 19.** Team is three. Nothing was blocked on him; his rows are reassigned or open below.

| Item | Owner | Done when |
|---|---|---|
| 1 — website | McKay — **committed through the weekend, Aug 21** (Tony polishes) | text in, ciphertext visible, plaintext out |
| Transport / WebSocket layer | **Tony, tonight Aug 21** | browser sends a string, C++ prints it, C++ replies, browser shows it |
| 2 — encrypt/decrypt | Tony | round-trips through both keys, C++ **and** JS |
| 3 — sign/verify | Tony | round-trips in the reverse key order, C++ **and** JS |
| 4 — primes, N, T | Bruce | emits a valid keypair on demand, verified by a test |
| — *Bruce's first task* | Bruce | `get_new_prime` alone. Sent Aug 20. Next function only after this one lands. |
| 5 — BRIDGES URL | Bruce | returns a working URL for a stored structure |
| Demo + README | **UNOWNED** — decide by Sun Aug 23 | fresh clone, build, run, works |

**Bruce's surface is one file.** Four functions, all called internally by the server: prime generation, N, T, and the BRIDGES URL. He has limited repo experience, so everything he touches lives in one place and nothing he writes requires editing somebody else's file. Item 4 depends on nothing else, so he can start immediately.

Repo owner holds merge rights. Architecture disputes settle there.

**Team rule:** whoever owns an item must be able to explain it out loud with the file closed.

---

## 6b. Where the code actually is — Aug 22, 17:00

Branch `spauly`, five commits on Aug 20 evening.

```
svr/RSA-Utility.h   Bruce's surface. gcd + get_new_prime/N/T/E/D/get_visualization_url,
                    all static, all inline stubs returning 0. Compiles clean.
svr/RSA-Core.h      class LocksmithBox. Ctor takes (n, key, key_is_priv).
                    encrypt/decrypt call powm. sign() delegates to encrypt with an
                    override flag; verify() delegates to decrypt. Structure done.
cli/                ImportTest.js, modules/RSA.js, bare package.json {"type":"module"}
```

**Still empty:** `decimal_from_text`, `text_from_decimal`, and every `Utility` body. No transport code exists in the repo at all — no `main`, no Beast, nothing.

**Build system — added Aug 22.** `svr/Makefile`, derived from `particle-raincheck`. Run it from inside `svr/`.

- `make` → builds `./server`
- `make check` → `-fsyntax-only` over every header. No `main`, no linking, nothing left on disk.
- `make clean`

**`make check` before every push.** If it says FAIL, it does not compile. This is the gate that did not exist before Aug 22, which is why unbuilt code reached the repo — nobody had a build step to run.

**Bruce's branch, reviewed Aug 22.** Does not compile: five blocking issues, four logic issues. Merge itself is safe — dry-run `spauly` ← `bruce` is clean, zero conflicts. **Nobody rebases.** Bruce opens a PR into `spauly`; Tony merges.

**Gate still open.** Hello-world bridge round-tripping a plain string, plus the two encoding functions. Everything else — BRIDGES, keypair generation, UI polish — waits.

**Message encoding — decided.** Bytes pack into one integer, base 256, positional. `std::string` is already a byte container, so iterate `unsigned char` and never reason about "characters." UTF-8 comes out the other side intact; accented letters, Chinese, and emoji are just two-, three-, and four-byte runs. No library needed, no BOM anywhere — browser textboxes and WebSocket text frames are both BOM-free UTF-8. Formal names, for searching: **OS2IP** for bytes→integer, **blocking** for splitting a long message first.

*Open: chunk size. The constraint that sets it has not been hit yet.*

**Dev keypair, hand-computed and verified:** `P=11, Q=13 → N=143, T=120, E=7, D=103`. Hardcode this until item 4 lands.

**Known bug, demo-grade.** `encrypt` and `decrypt` return `67` / `69` as error codes. Both are legal ciphertexts, so a wrong-key path is indistinguishable from a real message on screen. Needs a different failure channel before the demo.

---

## 7. Six days, planned backward

Blocks are fixed. Work expands to fill whatever it is given, so it gets a wall.

| When | Milestone | Blocks if late |
|---|---|---|
| ~~Wed Aug 19~~ | ~~Scope assigned~~ — architecture settled instead; scope list still owed | everything |
| ~~**Thu Aug 20**~~ | ~~Everyone cloned and pushed once~~ — **done.** Bruce pushed `test.cc` on branch `bruce` and has been sent `get_new_prime`. | everything |
| **Fri Aug 21** | **Hello-world bridge alive: browser string → C++ → browser. No crypto in it. THE priority — everything else waits.** | items 2, 3 |
| **Fri Aug 21** | Item 4 emits a keypair. | items 2, 3 |
| **Sun Aug 23** | Item 2 round-trips in a standalone C++ binary. **Go/no-go on the JS port** — not round-tripping by tonight means it gets cut. | item 3 |
| **Mon Aug 24** | Item 3 round-trips. Website renders the message flow with fake data. | integration |
| **Tue Aug 25** | Integration: real keys through the real bridge. | — |
| **Wed Aug 26** | Freeze. Bugfix only. README, demo rehearsal. | — |
| **Thu Aug 27, 12:00** | Submit. | — |

Two spare days sit between the freeze and the deadline on purpose. They are not extra working days.

**Rule:** if the Friday Aug 21 bridge does not round-trip a plain string, stop adding features and fix that. A finished crypto core with no transport demos nothing.

**Wed Aug 26 is load-bearing for a second reason.** The first Modular Math Competency Exam is the same hour as this deadline. The last 24 hours are CE review, not debugging.

---

## 8. Sequencing that matters

Build the transport with **no crypto in it.** Send the literal string `hello`, print it server-side, send `world` back, show it in the browser. Once that works, the crypto is a function swap at one point in the router.

Doing it the other way — crypto first, transport last — means debugging two unknown systems at the same time on the last weekend.

# RSA CHA-CHA — Handover

**Written 2026-08-26, 01:00 PT. Deadline: Thursday Aug 27, 12:00pm. Freeze is today.**

Read this cold. It assumes zero prior conversation.

---

## 0. The one-paragraph version

Tony (repo owner) is building a browser chat app for CSCI 26 where every message is
really encrypted with hand-rolled RSA. C++ is the canonical implementation; the
browser runs a faithful JS port. The core crypto works end to end. What is being
built now is **Inspect mode** — a Factorio-style factory floor that opens on any
message and shows the whole RSA pipeline with that message's real numbers, plus a
hidden typing-speed game that escalates into a site-wide "possession" event.

The submission bar is: **does it encrypt and decrypt.** That already passes. Everything
current is theater, and theater is what the demo is graded on.

---

## 1. Hard facts

| Thing | Value |
|---|---|
| Repo | `github.com/Forzalab/rsa-cha-cha` |
| Working branch | `spauly` (Tony's). `main` protected. `bruce` merged Aug 25. |
| HEAD at writing | `c6d70ca feat: add ritual` |
| Host | `csci4x.com` = `96.126.102.195`, public IPv4, no firewall |
| Ports | `6767` static site (http), `6868` C++ WebSocket (ws) |
| Transport | plain `http://` + `ws://`. **No TLS, permanently.** |
| Team | Tony, McKay Seamons, Bruce. Cortes dropped Aug 19. |
| Professor | Kerney. AI use on projects explicitly allowed. |

**Mixed content is the constraint everything hangs on.** A browser refuses `ws://`
from an `https://` page, so Vercel/Netlify can never host this. Also, plain http is an
*insecure context*: `crypto.subtle` and `crypto.randomUUID` are `undefined`. Do not
introduce anything that depends on WebCrypto. `crypto.getRandomValues` **does** work
in insecure contexts and is used by keygen.

---

## 2. Layout

```
svr/
  Transport.h     Boost.Beast WebSocket. One io_context, callbacks, no threads.
                  Session map userid -> session. JSON router. Rate limiting.
                  KernAI hook. Public-key directory lives in Hub::Entry.
  RSA-Core.h      class LocksmithBox. encrypt/decrypt via powm.
                  sign() delegates to encrypt, verify() to decrypt.
                  decimal_from_text / text_from_decimal  <-- Tony wrote these
  RSA-Utility.h   class Utility, all static: gcd, get_new_prime (Miller-Rabin 25
                  rounds), N, T, E, D, get_visualization_url. Bruce's surface.
  LLM.h           OpenRouter over libcurl, max_tokens 1500. KernAI persona.
  main.cc         Two modes: server on 6868, or --selftest (prints the whole
                  RSA pipeline to stdout; this is the C++ demo artifact).
cli/
  src/lib/rsa.js          Browser RSA. Port of the C++ above. See §3.
  src/lib/ritualState.js  Session singleton for the typing game. See §5.
  src/lib/protocol.js     Envelope builders.
  src/lib/{emojis,stickers,names,joinSlugs,ping,rosasMode}.js
  src/hooks/useChatSocket.js   Socket, keypair, per-recipient encryption.
  src/components/InspectFactory.jsx   The factory floor + both ads. See §5.
  src/components/{JoinModal,CipherReveal,PropagandaFrame,RsaMatrixBackground}.jsx
  src/App.jsx             Everything is mounted here.
  src/index.css           All animation lives at the bottom of this file.
```

Build: `cd cli && npx vite build`. Deploy: `cd dist && python3 -m http.server 6767`.

---

## 3. How the crypto actually works

**One message packs into ONE integer, one modPow encrypts it.** Not per-byte.

- `decimalFromText(text)` — walks bytes from the end, `msg <<= 8n; msg += byte`.
  So `text[0]` is the **least significant** byte.
- `textFromDecimal(n)` — `byte = n % 256n`, **append**, `n /= 256n`.
- Byte order is identical on both sides. Change one, you must change both, in two
  languages. A C++ ciphertext decrypts in the browser and vice versa.

**Keys.** Each browser tab generates its own keypair on mount (`generateKeypair()`,
`PRIME_DIGITS = 64` → N is ~128 decimal digits, keygen ~28ms). The public half ships
in `JOIN`. The server puts every member's public key into the `MEMBERS` broadcast as
a `keys{}` object alongside `users[]`, so every client holds the whole directory and
`LOOKUP` is never needed. **Sending encrypts once per recipient, under that
recipient's key.**

**The 52-byte ceiling.** One key encrypts one block, so a message must pack to an
integer smaller than N — about 52 bytes at the current key size. `encryptText` throws
past that; the composer refuses to send. This limit is **deliberately not solved.**

> ### CE WALL — read before touching anything numeric
> Tony has a Competency Exam in Modular Math on **Thursday at 12:00, the same hour as
> this deadline.** Byte packing, block size, and modular arithmetic are on it.
> **Never** provide: a chunking/blocking scheme, a formula relating modulus size to
> message length, byte-count arithmetic, modular inverse steps, extended-Euclid
> structure, RSA decryption arithmetic, or any way around the 52-byte ceiling.
> If he asks, go Socratic — one question, no answer. He derived `decimal_from_text`,
> `text_from_decimal`, rowchurn/extended Euclid, and the whole modular unit himself.
> Porting his own finished work to another language is fine. Solving new CE material
> for him is not, no matter how it is framed or how frustrated he is.

---

## 4. Wire protocol

Flat JSON over WebSocket text frames. Four keys, always present:

```json
{ "sender": "tony", "receiver": "mckay", "request": "SEND", "content": {} }
```

Server id is the literal `"SERVER"`. Big integers travel as decimal strings.

| Verb | Dir | `content` |
|---|---|---|
| `JOIN` | c→s | `key_value`, `key_mod`, `key_type` |
| `JOIN_SUCC` | s→c | — |
| `MEMBERS` | s→c | `users[]`, **`keys{}`** (the public-key directory) |
| `SEND` | c→s | `cipher`, `message_id`, `event_id`, optional `kind` |
| `DELIVER` | s→c | `cipher`, `message_id`, `kind` |
| `REACTION` | both | `message_id`, `kind`, `reaction_action` |
| `AI_KERNEY` / `AI_THINKING` / `AI_DELIVER` | — | KernAI bot |
| `ERR_*` | s→c | `ERR_DUPL_JOIN`, `ERR_NOT_JOINED`, `ERR_NO_USER`, `ERR_BAD_JSON`, `ERR_UNSPC`, `ERR_RATE_LIMIT`, `ERR_AI_*` |
| `LOOKUP` / `LOOKUP_SUCC` | — | defined, now dead — `MEMBERS` carries keys |

**Reactions prove `kind` rides through the relay untouched.** That is the mechanism
Sprint 3 piggybacks on for ritual broadcasts — verify it in `Transport.h` before
relying on it. If the router whitelists fields instead of passing `content` through,
a small server patch is needed and Tony must rebuild and restart on csci4x.

---

## 5. Inspect mode — what exists today

Opened by a `?` nub on a message. First open shows an Ovaltine ad interstitial with a
2s fill on the Skip button; after one skip, `adSeen` sticks and later opens go
straight in.

**Five stations wired in a U:**

```
[1 WRITE] --pipe--> [2 PACK] --pipe--> [3 LOCK]
                    ★                      |
                                        (drop pipe)
[5 OPEN]  <------- pipe -------- [4 SEND] <-'
```

1 = editable textarea. 2 = the packed integer. 3 = `m^E mod N`. 4 = what's on the
wire. 5 = `c^D mod N` decoded back to text. Every number is live from that tab's real
keypair; edit station 1 and the whole line re-runs.

**The star** fires a laser at station 2, 3, or 4 and flips one digit there. Damage
**cascades**: a hit at stage *i* breaks every stage from *i* onward. Hit stations show
a siren border, three smoke puffs, dead pipes, and the flipped digit burning red in
place. The rolled digit is guaranteed different from the one already there — an
earlier version rolled randomly and produced a visible no-op ~10% of the time.

**Per-station seals** (2–5) each show that stage's own integrity as an inline SVG tick
or bang. Clicking any of them opens the signature card (`m^D mod N`, then `s^E mod N`).
They are inline SVG on purpose: at 9px bold, `✓` fell through to a fallback font and
rendered as ⊘, which reads as *forbidden* — the opposite meaning.

**The hidden typing game.** `useWpm` counts characters in a 5s sliding window
(5 chars = 1 word; `wpm = round(chars/5 * 12)`), recomputed every 300ms so it drains
on its own. Then:

- **Below 20 wpm the counter is disguised as the station number `1`** — same font,
  same size, indistinguishable from stations 2–5. At 20 it pops open into three
  Titan One reels and starts turning. Nobody is told.
- **Glory gauge** on station 1's right edge fills toward 130, drains in 150ms when
  you slow, ticks at 60/100/130, ratchets when you cross one.
- **Coins** burst at 15% per keystroke past heat 0.4. Raw `appendChild`, 700ms
  cleanup, hard cap 12 live. React never sees them — otherwise the whole floor
  re-renders per letter.
- **The eye** fades open in the star at 100+ wpm and the pupil tracks the cursor
  (100ms throttle, 3.2 unit cap).
- **Heat** drives everything: matrix rain opacity and colour, pipe digit speed and
  glow, panel quake past 100.
- **Tooltip** slides out of station 1's bottom-right corner every 4s while idle, and
  slides back. Empty box always gets `Type something... / Don't go faster... 🤫`.
  Once a tier has been hit and there is text: `you were warned 🤫`. After a takeover:
  `faster, comrade 🤫`. That memory lives in `ritualState.js`, a module singleton that
  survives every mount/unmount and resets on refresh.

**Ads.** A dismissable sidebar banner rotating six creatives every 5s (Ovaltine,
decoder ring, Cracker Jack, Bazooka Joe, Enigma, bulk primes) plus the full
interstitial. Both fall back to a 🥛 placeholder — **drop the real image at
`cli/public/ovaltine.png`** and both pick it up with no code change.

---

## 6. What is NOT built yet

**Sprint 3 — the network ritual.** New `zalgo.js`; `sendRitual()` on the hook with a
30s cooldown; `RitualTakeover.jsx`. At 100 wpm the room gets a join-slug
(`comrade X seeks glory, glory shall deliver`, 5 variants). At **130 wpm the site
disappears for everyone**, including someone sitting at the login screen, for 4
seconds: three zalgo words strobing, permuted within fixed columns
(`DRINK/RSA/PRAISE/OBEY` · `YOUR/YOUR/SUPREME/THE` · `OVALTINE/MESSAGE/LEADER/MODULUS`
— column-locked, so `PRAISE RSA OVALTINE` can never appear). The **trigger** sees
red/white; **everyone else** sees gold/black plus four border marquees scrolling
`向{X}俯首 BOW TO {X}` in zalgo — the point is to make the room look at that person.
Then it releases and each client posts a closing slug so bystanders have a thread to
pull instead of thinking the site broke.

**Strobe is capped near 2.9Hz** for photosensitivity, with a static card under
`prefers-reduced-motion`. Do not raise it.

**Sprint 4 — ads and skin.** 1950s Cracker-Jack sidebar (white `#fff8ee`, halftone
dots, Lobster script, Anton shout, starburst badge, 14px `×`); OmegaMart four-stage
decay driven by `ritualState.score` (normal → one detail wrong → semantically wrong →
zalgo-possessed); **hydra dismissal** (kill one, two more in 5–7s; leave one alone,
one more in 10–15s; cap 5; eight consecutive dismissals clears everything and stops
spawning for 30s so a demo can't be buried); a 🥛→👁 subliminal frame, 130ms, max 2 per
session; global Comic Sans with `Baloo 2` inside the factory and `Titan One` on the
counter, loaded via `<link>` in `index.html` — **not `@import`**, Tailwind v4 silently
drops `@import` that follows `@import "tailwindcss"`; and the **emoji picker letter
rows**, which have been promised twice and dropped twice:

```
🥀 🇷 🇴 🇸 🇦 🇸 🥀        (each in its own <button>, so no flag fusion)
🐐 🇰 🇪 🇷 🇳 🇪 🇾 🧓
```

Both pickers — the composer one and the reaction tray — then a divider, then the
normal grid. Fallback if a platform renders regional indicators blank: `®️ 🅾️ 💲 🅰️ 💲`.

**Sprint 5 — close-out.** Touch devices have no `mousemove`, so the eye currently sits
still; give it a 2.5s wander under `matchMedia('(pointer:fine)')`. Then re-run
everything and cut the final patch.

---

## 7. Loose ends, unowned

- `App.jsx` still has `MAX_MESSAGE_LENGTH = 500` while the real ceiling is ~52 bytes.
  Typing 53+ makes send fail with no visible reason. **Fix the UI feedback, not the
  ceiling** (see CE wall).
- `Utility::get_visualization_url()` ships `apiKey = "YOUR_API_KEY"` — compiles, dies
  at runtime. Working credentials exist in `Forzalab/particle-raincheck`. It also
  posts the private key `d` to a public BRIDGES page.
- Handout §2 says "no rate limits" while `Transport.h` implements them. One has to go.
- README exists; demo rehearsal and failover drill have not been run.
- `cli/public/ovaltine.png` does not exist yet.

---

## 8. How to work with Tony

**Verify, never assume.** His tree has been out of sync with the patch three separate
times. Always `git fetch`, checkout `origin/spauly`, and `grep` for the anchors before
editing. A `git checkout` in the middle of an edit session silently wiped changes once
and shipped a broken patch.

**Never hand-write a diff.** Make the edit, build it, `git diff`, `git stash`,
`git apply --check`, `git stash pop`. A hand-written hunk header was rejected as
corrupt. Whole files go through `present_files`; small diffs get pasted into chat as
fenced code.

**Build passing ≠ working.** Undeclared identifiers and hooks called at module scope
compile fine and produce a blank page. Both happened. When a page goes blank, run the
built bundle under jsdom and read the throw; `root children: 0` on its own is a false
negative from the canvas background.


---

## 9. Commit history that matters

```
c6d70ca  feat: add ritual          <- HEAD. ritualState.js + sprint 2 wiring
de0c333  feat: sprint 2 ui         counter, gauge, coins, eye, tooltip
08daffe  fix: sprint 1 visual fix   one lamp, SVG marks, pipe transform, matrix dim
67542c7  fix: factorio themibg      v3 factory: matrix field, pipes, plating
101b2ef  fix: ui layout
1ac01fd  feat: shhhhh
df35313  fix: empty site            hooks-at-module-scope blank page fixed
c49a3df  feat:ovaltine              first inspect mode + ad gate
3da55f1  feat: rsa integration      main.cc restored, MEMBERS ships keys
```

Pending on top of `c6d70ca`: the five interjection fixes (matrix seed starvation,
tooltip first-line and placement and palette, counter disguise, amber matrix) —
delivered as `InspectFactory.jsx` plus `interject.patch`.
Item 4 blocks items 2 and 3 for *testing*, not for writing. Hardcode a small keypair to develop against. Swap in the generator when it lands.

### Hosting — tested, works

`csci4x.com` is `96.126.102.195`, a public IPv4 address with no inbound firewall. Verified Aug 18: a static file server on one port and a Boost.Beast WebSocket server on another were both reached from a phone on mobile data, over the open internet, with no accounts and no configuration.

**Two processes, one class account, two ports.**

```
:6767   static file server   →  serves the built site over http://
:6868   C++ WebSocket server →  ws://
```

They do not talk to each other. No pipe, no IPC. The browser fetches the page from 6767, then opens its own socket to 6868 — the browser is the only thing talking to both. Two terminal tabs in the same directory, nothing to wire up.

Ports are per-account, so each of us can run our own pair from the same repo on different ports. Pick unused ones; 8080 will collide with classmates.

**Both sides stay `http://` and `ws://`.** That is the constraint everything else hangs on. Vercel and Netlify serve over `https://`, and a browser refuses to open a `ws://` socket from an `https://` page — mixed-content block. Going that route forces a TLS cert onto the C++ server and a domain to put it on. Eight days does not have room for that.

Develop locally with hot reload. Deploy with `git pull && build && restart`. The repo is the source of truth; the class server is a display case.

One rule learned the hard way: **serve a subdirectory, never `~`.** A home directory served on a public port exposes `.ssh/` and `.bash_history` to anyone who types the URL.

### Prior art on this team — use it

Both server shapes already exist in our own history:

- **McKay** — `rpg40-server` (C++, Boost.Beast WebSocket): async read loop, per-session write queue, broadcast walks a session registry.
- **Tony** — `chatchapoon` (Java, last semester): thread-per-client, mailbox queue per handler, tick loop drains, `broadcastAll` walks clients.

Same architecture, different plumbing. The transport layer is a merge of two patterns both of us have already shipped — nobody is inventing anything new. One habit worth carrying from chatchapoon: validate the message before relaying it, and skip bad input instead of crashing.

### JS toolchain notes


