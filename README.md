*shamelessly pasted handout here. pls treat EVERYTHING BELOW as some kind of "guidance". claude tends to give a "defensive/authoritative" voice - spauly*

-----

# CSCI 26 — RSA Project Handout

**Team:** Tony (repo owner), McKay Seamons, Bruce
**Due:** Thursday Aug 27, 12:00pm — hard
**Written:** Tue Aug 18. **Revised:** Wed Aug 20, 01:10. Eight days on the clock.

Read this cold. It assumes you were not in any prior conversation about the project.

**Everything here is tentative.** This is a guideline, not a contract. Any decision below is open to renegotiation by anyone on the team at any time — bring a reason, not a preference, and we change it. Nothing in this document is worth defending past the point where it stops helping.

---

## 0. Orientation — read this first, skip the rest until you need it

> **UNWRITTEN — Tony fills this in.** Five lines, one per person:
> who you are · what you own · when it's due · where the repo is · who to ask when stuck.
> Everything below §0 assumes context this block is supposed to supply.

---

## 1. What we are building

Five things off Kerney's whiteboard.

| # | Item | Stack |
|---|------|-------|
| 1 | User interface — a website | web |
| 2 | RSA encrypt & decrypt | C++ |
| 3 | RSA signature & verification | C++ |
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

**"& BRIDGES" is the BRIDGES visualization library.** Not "bridging two languages" — that misreading cost a full session. A function hands BRIDGES a structure and gets back a working URL. Planned surface: a `More > Visualize using BRIDGES` affordance in the chat UI. *Open: what structure actually gets visualized, and whether the button belongs to item 1 or item 5.*

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

## 4. Architecture — settled Aug 20, do not reopen without a reason

The server is a **relay, a public-key directory, and the crypto engine.** All RSA math runs server-side in C++.

```
A joins       →  A registers with S, S issues/holds A's keypair
A sends       →  A sends plaintext to S
S encrypts    →  S looks up Bpub, encrypts, stores + relays the ciphertext
B receives    →  S decrypts with Bpriv, B displays plaintext
```

Every round-trip is ACKed.

- **Plaintext crosses the wire on the initial send.** Agreed by Tony and McKay, Aug 20. The server is the source of truth; there is no way around plaintext reaching it if it is the thing doing the math. This is the no-hardening rule (§2) applied consistently — there is no attacker in this project, and Kerney grades whether it encrypts and decrypts.
- **`USERID` is a required field.** The server tracks who sent what, and the UI needs it to label messages.
- **Rejected:** hop-by-hop re-encryption through an `Spub`/`Spriv` pair. Sketched Aug 19, scratched the same night.
- **Rejected:** browser-side crypto with each party holding its own private key. Considered seriously and reversed — see the consequence below.
- **Not pursued:** true P2P with no middleman. Possible in principle, out of scope for seven days.

**Consequence — RSA gets written ONCE, in C++.** This is the entire reason the decision is worth taking. Browser-held keys would have forced a second full implementation in JS `BigInt` on a seven-day clock. The browser now sends strings and renders strings; the only big numbers it touches are ciphertext it displays.

**Signatures answer impersonation.** Without one, C can send a message to B carrying A's name and B has no way to tell. A signs with `Apriv`; anybody verifies with `Apub`; only A can produce something that `Apub` turns into readable text. A server-assigned `USERID` label is a convenience for the UI, not proof.

> **Dissent, recorded.** Tony disagrees with this on principle — a public-key system whose private keys live on the server is not the shape the math is for. He conceded for team velocity, not because the objection is wrong. Noted here so it does not have to be re-argued, and so the reasoning survives if the demo raises the question.

### Transport

One connection per browser, one session object per connection, distinguished by id. The map is `userid → session`.

Boost.Beast runs one `io_context` with callbacks — **no thread-per-client.** `chatchapoon` needed threads because raw sockets block in `readLine`; Beast does not, so none of that plumbing carries over.

The wire is `VERB:payload` text in both directions, which means the frontend framework choice cannot reach the C++ implementation.

---

## 5. Wire protocol

Colon-delimited plain text over WebSocket text frames. This is the format McKay already shipped in a prior project, so it is proven and nobody has to design it.

```
client → server:   VERB:payload
server → client:   SERVER:CATEGORY:payload
```

Dispatch on string prefix in the C++ router. One `if` chain. Substring off the verb, parse the rest.

**Do not** introduce REST, JSON schemas, protobuf, or codegen. The problem does not call for them.

### Big integers on the wire — decided

Our payloads are integers with hundreds of digits. **They travel as decimal strings.** Plain digits, no prefix, no padding.

Reason: least code on both ends. Boost `cpp_int` takes a decimal string directly, and the browser's native `BigInt` does too. Hex, binary, and raw bytes all cost a conversion step on at least one side and buy nothing.

Three things that came up and are closed:

- **Size does not matter here.** A 600-digit number is 600 bytes. That is noise on a WebSocket frame. Nobody optimizes this.
- **The browser can hold the number.** JavaScript has had native `BigInt` since ES2020 — arbitrary precision, no library. Splitting messages into chunks is not needed and should not be built.
- **Base has nothing to do with the math.** 255 and 0xFF are the same quantity written two ways; `mod` does not read notation. Choosing decimal is a plumbing decision, not an arithmetic one.

---

## 6. Ownership

> **Cortes dropped the class on Aug 19.** Team is three. Nothing was blocked on him; his rows are reassigned or open below.

| Item | Owner | Done when |
|---|---|---|
| 1 — website | McKay (Tony polishes) | text in, ciphertext visible, plaintext out |
| Transport / WebSocket layer | McKay | browser sends a string, C++ prints it, C++ replies, browser shows it |
| 2 — encrypt/decrypt | Tony | round-trips a message through both keys |
| 3 — sign/verify | Tony | round-trips in the reverse key order |
| 4 — primes, N, T | Bruce | emits a valid keypair on demand, verified by a test |
| 5 — BRIDGES URL | Bruce | returns a working URL for a stored structure |
| Demo + README | **UNOWNED** | fresh clone, build, run, works |

**Bruce's surface is one file.** Four functions, all called internally by the server: prime generation, N, T, and the BRIDGES URL. He has limited repo experience, so everything he touches lives in one place and nothing he writes requires editing somebody else's file. Item 4 depends on nothing else, so he can start immediately.

Repo owner holds merge rights. Architecture disputes settle there.

**Team rule:** whoever owns an item must be able to explain it out loud with the file closed.

---

## 7. Eight days, planned backward

Blocks are fixed. Work expands to fill whatever it is given, so it gets a wall.

| When | Milestone | Blocks if late |
|---|---|---|
| ~~Wed Aug 19~~ | ~~Scope assigned~~ — architecture settled instead; scope list still owed | everything |
| **Thu Aug 20** | Bruce told his scope. Everyone has cloned `rsa-cha-cha` and pushed once. | everything |
| **Fri Aug 21** | Hello-world bridge alive: browser string → C++ → browser. No crypto in it. | items 2, 3 |
| **Fri Aug 21** | Item 4 emits a keypair. | items 2, 3 |
| **Sun Aug 23** | Item 2 round-trips in a standalone C++ binary, no web layer. | item 3 |
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

There is no JS crypto to ship — items 2 and 3 live in C++ only. What remains on the JS side is whatever small helpers the UI needs, as a **plain ES module**: one export per operation, one import line. No build config; Vite runs on Node and already treats `.js` as ESM.

- Debug loop is `node file.js`, or bare `node` for a REPL.
- `BigInt` prints with a trailing `n`. That is the type, not a bug.
- Standalone files need `.mjs`, or a scratch `package.json` containing `{ "type": "module" }`. Skip `npm init`.
- `.mjs` is scaffolding for local debugging only. Rename to `.js` when the file lands in `src/`.

### C++ build

Plain `#include`, one header per unit. **Not** C++20 modules — compiler and CMake support is still uneven and Boost is header-only anyway.

---

## 9. Potholes — decisions that will come up mid-build

Each of these is a spot where two people silently assume different things and lose an evening.

**~~Where keys live.~~ Decided Aug 20** — the server holds keys and runs all crypto. Browsers send and display strings. See §4.

**~~Server topology.~~ Decided Aug 20** — one C++ server, one session per connection, `userid → session`. See §4.

**~~Who assigns identity.~~ Decided Aug 20** — `USERID` is a required field on the wire.

**One process or two on the C++ side.** Item 4 and item 5 live in one file with four functions (§6), which keeps Bruce out of the server internals. Whether that file compiles into the server binary or runs as a separate tool is still open. *Decide based on how much merging pain we want, not elegance.*

**Errors on the wire.** Malformed message, ciphertext that doesn't parse as a number, wrong key. McKay's pattern answers with `SERVER:ERROR:reason`. Adopt it or invent nothing — but the browser must render *something* when it arrives, or debugging becomes staring at silence. *Decide the error verb on day one; it is the first thing the hello-world bridge should exercise.*

**Framing drift.** Tony's old protocol was newline-delimited; WebSocket is frame-delimited. One message per frame, no splitting, no combining — say it out loud and write it in the README, because it is exactly the kind of assumption that never gets stated.

**Vercel / Netlify — why not, and it is not a preference.** They force `https://`, which blocks `ws://` as mixed content, which forces a TLS certificate, which forces a domain. That cascade is real — it is why `server.starbornrpg.com` exists. *If someone still wants Vercel, that is fine, but they own getting a cert onto the C++ server.*

**~~Which frontend stack.~~ Decided Aug 20** — McKay's call: **Vite + React + Tailwind.** Vite builds to a folder of static files, which is exactly what the file server hands out, so the Vercel-and-https cascade never starts. *A static host places no limit on what the page does once loaded. Animation, canvas, whatever — all client-side.*

**The demo failure mode.** Rehearse the demo on a machine that did a fresh clone. The classic project-death is code that only runs on the machine it was written on.

---

## 10. Open questions

- [x] ~~Which Thursday~~ — Aug 27, confirmed
- [x] ~~Chat app or literal email form~~ — Kerney: anything with RSA. Chat app, closed Aug 18
- [x] ~~Big-integer character encoding at the seam~~ — decimal strings, closed Aug 18
- [x] ~~Where the C++ binary runs during the demo~~ — csci4x, ports 6767 + 6868, tested Aug 18
- [x] ~~Layout~~ — one browser tab per machine, closed Aug 18
- [x] ~~Where the crypto runs~~ — server-side C++, plaintext on the initial send, closed Aug 20
- [ ] Whether signature output must be human-readable or can stay raw
- [ ] What structure BRIDGES visualizes, and how long it is retained
- [ ] Whether the BRIDGES button belongs to item 1 or item 5
- [ ] Who owns demo + README
- [ ] JS export names for any UI-side helpers, written before implementation

---

## 11. AI policy

Kerney announced in class that AI is allowed on **any CS project.** Vibe coding is explicitly fair game. This overrides the syllabus line for project scope only — daily homework and Competency Exams are unchanged.

One team rule on top of that: whoever owns an item must be able to explain it out loud without the file open. The Modular Math CE includes an RSA decryption done by hand, on paper. Code you cannot explain is a liability twice.
