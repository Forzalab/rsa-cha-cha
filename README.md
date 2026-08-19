*shamelessly pasted handout here. pls treat EVERYTHING BELOW as some kind of "guidance". claude tends to give a "defensive/authoritative" voice - spauly*

-----

# CSCI 26 — RSA Project Handout

**Team:** Tony (repo owner), McKay Seamons, Bruce, Cortes
**Due:** Thursday Aug 27, 12:00pm — hard
**Written:** Tue Aug 18. Nine days on the clock.

Read this cold. It assumes you were not in any prior conversation about the project.

**Everything here is tentative.** This is a guideline, not a contract. Any decision below is open to renegotiation by anyone on the team at any time — bring a reason, not a preference, and we change it. Nothing in this document is worth defending past the point where it stops helping.

---

## 1. What is built

Four things off Kerney's whiteboard, plus the glue.

| # | Item | Stack |
|---|------|-------|
| 1 | User interface — a website | web |
| 2 | RSA encrypt & decrypt | C++ |
| 3 | RSA signature & verification | C++ |
| 4 | Generate primes, N, T | C++ |
| — | **Bridges** — web layer talking to C++ layer | both |

The four flows the board specifies:

```
encrypt:  message + public key   →  S
decrypt:  S       + private key  →  message
sign:     message + private key  →  S
verify:   S       + public key   →  message
```

Same two operations, opposite key order. Items 2 and 3 share almost everything.

---

## 2. Non-goals
```
Say no to these out loud so nobody quietly builds one.

- No TLS. No HTTPS. Plain WebSocket.
- No user accounts, no login, no password storage.
- No key management, key rotation, or secure key storage.
- No database. Keys live in memory for the duration of a run.
- No threat model. Nobody is attacking this.
- No deployment pipeline. No CI, no containers, no Vercel. Hosting is two processes on a class server — see §7.
- No unlockables, achievements, hidden modes, easter eggs, tutorials, or anything a user has to *discover*. Nobody has ten minutes to find it.

Kerney grades whether it encrypts and decrypts. Everything above is work that does not move that needle.
```
(probably is applicable for this project)

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
    - *human note: chatgpt-eqse blinker and char-by-char reveal*
- **Ciphertext is the confetti.** A wall of digits landing on screen is the visual payoff. It arrives in one frame; the reveal is a render decision.
    - *human note: maybe... decode animation (preferably on the cipher text -> message trailing the blinker).*
- ~~ **The wait is real.** Modular exponentiation on big numbers takes actual time. A "working" indicator here is honest, not decorative. Fire on send, kill when the frame lands. ~~ (*human note: ignore, too vibe-y lol*)
- **Presence beats features.** One pane showing that the other is doing something is the cheapest engagement mechanism available. Discord's hook is the typing indicator, not the paid tier.
    - *human note: typing indicator, if possible, low priority*

**Bug triage, stated up front.** If something breaks, it should break in appearance or message content — visible, obvious, fixable during a demo. Do not spend the nine days on subtle edge cases, malformed-input hardening, or anything invisible. There is no attacker (see §2). A wrong character on screen matters here; an unhandled exotic input does not.

Smoothness over polish. Immediate over impressive.

---

**Repo:** `github.com/Forzalab/rsa-cha-cha` — already exists on Tony's account. That is the project repo. Everyone clones this, nobody makes a second one.

## 4. Wire protocol

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

## 5. Ownership
```
| Item | Owner | Done when |
|---|---|---|
| 1 — website | McKay (Tony polishes) | text in, ciphertext visible, plaintext out |
| Bridges / transport | McKay | browser sends a string, C++ prints it, C++ replies, browser shows it |
| 2 — encrypt/decrypt | Tony | round-trips a message through both keys |
| 3 — sign/verify | Tony | round-trips in the reverse key order |
| 4 — primes, N, T | Bruce + Cortes | emits a valid keypair on demand, verified by a test |
| Demo + README | Cortes | fresh clone, build, run, works |

Bruce and Cortes start on item 4 first because it depends on nothing else. Bruce writes generation, Cortes writes the test that proves the output is actually prime and that the keypair round-trips.*/
```
(probably)

Repo owner holds merge rights. Architecture disputes settle there.

---

## 6. Nine days, planned backward

Blocks are fixed. Work expands to fill whatever it is given, so it gets a wall.

| When | Milestone | Blocks if late |
|---|---|---|
| **Wed Aug 19** | Bruce + Cortes told their scope. Everyone has cloned `rsa-cha-cha` and pushed once. *(Payload encoding and chat-app shape — both closed Aug 18, see §3 and §4.)* | everything |
| **Fri Aug 21** | Hello-world bridge alive: browser string → C++ → browser. No crypto in it. | items 2, 3 |
| **Fri Aug 21** | Item 4 emits a keypair. | items 2, 3 |
| **Sun Aug 23** | Item 2 round-trips in a standalone C++ binary, no web layer. | item 3 |
| **Mon Aug 24** | Item 3 round-trips. Website renders the message flow with fake data. | integration |
| **Tue Aug 25** | Integration: real keys through the real bridge. | — |
| **Wed Aug 26** | Freeze. Bugfix only. README, demo rehearsal. | — |
| **Thu Aug 27, 12:00** | Submit. | — |

Two spare days sit between the freeze and the deadline on purpose. They are not extra working days.

**Rule:** if the Friday Aug 21 bridge does not round-trip a plain string, stop adding features and fix that. A finished crypto core with no transport demos nothing.

---

## 7. Sequencing that matters

Build the bridge with **no crypto in it.** Send the literal string `hello`, print it server-side, send `world` back, show it in the browser. Once that works, the crypto is a function swap at one point in the router.

Doing it the other way — crypto first, transport last — means debugging two unknown systems at the same time on the last weekend.

### Where it runs — tested, not assumed

`csci4x.com` (96.126.102.195) accepts inbound connections on arbitrary ports from the open internet. No campus firewall in the way. Verified Aug 18: a file server on the class box and a WebSocket server on a second port were both reached from a phone on mobile data.

Two processes, one class account, two PuTTY tabs:

| Port | Process | Serves |
|---|---|---|
| 6767 | static file server | the built website |
| 6868 | C++ WebSocket server | crypto verbs |

They do not talk to each other. The browser loads the page from 6767, then opens its own socket to 6868. No pipe, no IPC, nothing to wire.

Both plain `http://` and `ws://`. That is deliberate — see §8.

Develop on your own laptop with hot reload. Deploying is `git pull`, build, restart. Everyone has a class account, so anyone can host their own copy on their own ports off the same repo.

**Serve a subdirectory, never your home directory.** A file server on `~` publishes `.ssh/` and `.bash_history` to the internet.

Item 4 blocks items 2 and 3 for *testing*, not for writing. Hardcode a small keypair to develop against. Swap in the generator when it lands.

### Hosting — tested, works

`csci4x.com` is `96.126.102.195`, a public IPv4 address with no inbound firewall. Verified Aug 18: a file server on one port and a Boost.Beast WebSocket server on another were both reached from a phone on mobile data, over the open internet, with no accounts and no configuration.

**Two processes, one class account, two ports.**

```
:6767   static file server   →  serves the built site over http://
:6868   C++ WebSocket server →  ws://
```

They do not talk to each other. No pipe, no IPC. The browser fetches the page from 6767, then opens its own socket to 6868. Two terminal tabs in the same directory, nothing to wire up.

Ports are per-account, so each of us can run our own pair from the same repo on different ports. Pick unused ones; 8080 will collide with classmates.

**Both sides stay `http://` and `ws://`.** That is the constraint everything else hangs on. Vercel and Netlify serve over `https://`, and a browser refuses to open a `ws://` socket from an `https://` page — mixed-content block. Going that route forces a TLS cert onto the C++ server and a domain to put it on. Nine days does not have room for that.

Develop locally with hot reload. Deploy with `git pull && build && restart`. The repo is the source of truth; the class server is a display case.

One rule learned the hard way: **serve a subdirectory, never `~`.** A home directory served on a public port exposes `.ssh/` and `.bash_history` to anyone who types the URL.

---

### Prior art on this team — use it

Both server shapes already exist in our own history:

- **McKay** — `rpg40-server` (C++, Boost.Beast WebSocket): async read loop, per-session write queue, broadcast walks a session registry.
- **Tony** — `chatchapoon` (Java, last semester): thread-per-client, mailbox queue per handler, tick loop drains, `broadcastAll` walks clients.

Same architecture, different plumbing. The bridge is a merge of two patterns both of us have already shipped — nobody is inventing anything new here. One habit worth carrying from chatchapoon: validate the message before relaying it, and skip bad input instead of crashing.

---

## 8. Potholes — design decisions that will come up mid-build

These are the spots where two people will silently make different assumptions and lose an evening. Each has a hole left open on purpose — decide it as a team when you hit it, in the repo, in writing.

**Server topology.** One C++ server holding all sessions, or one C++ process per demo laptop? The broadcast pattern assumes a shared registry. If McKay builds session handling differently from `rpg40-server` — and he might — the "who relays a message from pane A to pane B" question changes shape. *Decide: where does a message physically travel when user A sends to user B?*

**Where keys live.** The board says public/private keypairs per user. Does the browser hold its own private key and decrypt client-side, or does it send ciphertext up and let C++ decrypt? Both demo fine. They produce very different verb lists. *Decide before the verb list is written, because the verb list is downstream of this.*

**One process or two on the C++ side.** Item 4 (keygen) and items 2/3 (crypto ops) can be one binary or the keygen can be a separate tool that runs once and prints a keypair. Separate tool means Bruce and Cortes never touch the server code. *Decide based on how much merging pain we want, not elegance.*

**Errors on the wire.** Malformed message, ciphertext that doesn't parse as a number, wrong key. McKay's pattern answers with `SERVER:ERROR:reason`. Adopt it or invent nothing — but the browser must render *something* when it arrives, or debugging becomes staring at silence. *Decide the error verb on day one; it is the first thing the hello-world bridge should exercise.*

**Framing drift.** Tony's old protocol was newline-delimited; WebSocket is frame-delimited. One message per frame, no splitting, no combining — say it out loud and write it in the README, because it is exactly the kind of assumption that never gets stated.

**Who assigns identity.** Each chat client needs to know which "user" they are. Server assigns on connect (McKay's `WELCOME` pattern), or browser declares on first message (Tony's `JOIN` pattern). Either works. Both at once is a bug factory. *Pick one.*

**Vercel / Netlify — why not, and it is not a preference.** They force `https://`. A page served over `https://` is not allowed to open a `ws://` socket; the browser blocks it as mixed content. So hosting the frontend there forces `wss://` on the C++ side, which forces a TLS certificate, which forces a domain. That cascade is real — it is why `server.starbornrpg.com` exists. Serving the page over plain `http://` from csci4x sidesteps all of it. *If someone still wants Vercel, that is fine, but they own getting a cert onto the C++ server.*

**Which frontend stack.** Anything that builds to static files works — the file server hands out bytes and does not care. Vite is the known-good choice here: it is what `rpg-react-client` used, it builds to a folder, and that folder renders an animated canvas game. Next.js works too, but its server-rendering path is the thing that pulls toward Vercel, so if it gets used, it gets used in static-export mode. *Note for the ambitious UI ideas: a static host places no limit on what the page does once loaded. Animation, canvas, whatever — all client-side.*

**The demo failure mode.** Whatever topology gets picked, rehearse the demo on a machine that did a fresh clone. The classic project-death is code that only runs on the machine it was written on.

---

## 9. Open questions

- [x] ~~Which Thursday~~ — Aug 27, confirmed
- [x] ~~Chat app or literal email form~~ — Kerney: anything with RSA. Chat app, closed Aug 18
- [x] ~~Big-integer character encoding at the seam~~ — decimal strings, closed Aug 18
- [x] ~~Where the C++ binary runs during the demo~~ — csci4x, ports 6767 + 6868, tested Aug 18
- [x] ~~Layout~~ — one browser tab per machine, closed Aug 18
- [ ] Whether signature output must be human-readable or can stay raw
- [ ] Layout — two panes one screen, two windows, or two machines (McKay decides, §3)

---

## 10. AI policy

Kerney announced in class that AI is allowed on this project. This overrides the syllabus line for **this project only** — daily homework and Competency Exams are unchanged.

One team rule on top of that: whoever owns an item must be able to explain it out loud without the file open. The Modular Math CE includes an RSA decryption done by hand, on paper. Code you cannot explain is a liability twice.
