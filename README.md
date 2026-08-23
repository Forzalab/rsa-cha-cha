*shamelessly pasted handout here. pls treat EVERYTHING BELOW as some kind of "guidance". claude tends to give a "defensive/authoritative" voice - spauly*

-----

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

The JS side now carries a port of items 2 and 3, plus UI helpers. **Plain ES modules** — one export per operation, one import line. No build config; Vite runs on Node and already treats `.js` as ESM. `cli/modules/RSA.js` is the stub that holds this.

- Debug loop is `node file.js`, or bare `node` for a REPL.
- `BigInt` prints with a trailing `n`. That is the type, not a bug.
- Standalone files need `.mjs`, or a scratch `package.json` containing `{ "type": "module" }`. Skip `npm init`.
- `.mjs` is scaffolding for local debugging only. Rename to `.js` when the file lands in `src/`.

### C++ build

Plain `#include`, one header per unit. **Not** C++20 modules — compiler and CMake support is still uneven and Boost is header-only anyway.

---

## 9. Potholes — decisions that will come up mid-build

Each of these is a spot where two people silently assume different things and lose an evening.

**~~Where keys live.~~ Revised Aug 20 13:45** — both sides. Browser encrypts and signs for the normal send path; the server holds the directory and can do the math itself. C++ is canonical, JS is a port. See §4.

**~~Server topology.~~ Decided Aug 20** — one C++ server, one session per connection, `userid → session`. See §4.

**~~Who assigns identity.~~ Decided Aug 20** — `USERID` is a required field on the wire.

**One process or two on the C++ side.** Item 4 and item 5 live in one file with four functions (§6), which keeps Bruce out of the server internals. Whether that file compiles into the server binary or runs as a separate tool is still open. *Decide based on how much merging pain we want, not elegance.*

**~~Errors on the wire.~~ Decided Aug 22** — five error verbs, same envelope as everything else. See §5a.

**Framing drift.** Tony's old protocol was newline-delimited; WebSocket is frame-delimited. One message per frame, no splitting, no combining — say it out loud and write it in the README, because it is exactly the kind of assumption that never gets stated.

**Vercel / Netlify — why not, and it is not a preference.** They force `https://`, which blocks `ws://` as mixed content, which forces a TLS cer
