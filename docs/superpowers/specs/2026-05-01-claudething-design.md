# ClaudeThing — Design Spec

**Date:** 2026-05-01
**Status:** Approved

---

## Overview

ClaudeThing is a DeskThing app for the Spotify CarThing that mirrors real-time Claude activity across three surfaces — Claude Code, Claude Chat, and Claude Cowork — by capturing the "spinner verb" currently active on each surface and displaying it on the CarThing screen.

No Claude API key required. Purely a local display/mirror app.

---

## Status Model

```
Idle → [verb arrives from any source] → Active(verb, source) → [all slots expire] → Idle
```

Each source (`code`, `chat`, `cowork`) gets an independent slot:

```ts
type Slot = { verb: string; updatedAt: number } | null
type StateMap = Record<'code' | 'chat' | 'cowork', Slot>
```

A slot is **active** if `Date.now() - updatedAt < 5000` (5s expiry). A slot is cleared immediately when the source explicitly sends `verb: null`. Zero active slots = Idle.

When multiple sources are active, the display rotates through them every **3 seconds**. When only one source is active, it displays continuously. Idle shows a static Claude logo with no animation.

---

## Architecture

**Chosen approach: Hub inside the DeskThing plugin.**

The DeskThing plugin (`server/index.ts`) owns everything: it hosts both a WebSocket server and an HTTP server on port `7891`, manages the state map, drives the rotation timer, and pushes display state to the CarThing client via `DeskThing.send()`.

```
┌─────────────────┐
│  Claude Code    │  PreToolUse hook → HTTP POST → http://localhost:7891/status
└─────────────────┘

┌─────────────────┐
│  Claude Chat    │  content.js MutationObserver → WebSocket → ws://localhost:7891
└─────────────────┘

┌─────────────────┐
│  Claude Cowork  │  content.js MutationObserver → WebSocket → ws://localhost:7891
└─────────────────┘

         ↓ all sources feed into ↓

┌──────────────────────────────────────────┐
│  DeskThing Plugin (server/index.ts)      │
│  • WS + HTTP server on :7891             │
│  • StateMap: { code, chat, cowork }      │
│  • 5s slot expiry                        │
│  • 3s rotation setInterval               │
│  • DeskThing.send({ type: 'status', … }) │
└──────────────────────────────────────────┘

         ↓ DeskThing message bus ↓

┌──────────────────────────────────────────┐
│  CarThing UI (src/App.tsx)               │
│  • Landscape: 800 × 480px                │
│  • Large verb, centered                  │
│  • Pulse animation when active           │
│  • Source label + rotation dots          │
└──────────────────────────────────────────┘
```

---

## Component 1 — DeskThing Plugin (`server/index.ts`)

**Responsibilities:**
- Spin up an `http.createServer` + `ws.WebSocketServer` on port `7891` at `start`
- Accept WebSocket connections from the Chrome extension (sources: `chat`, `cowork`)
- Accept HTTP POST to `/status` from the Claude Code hook
- Maintain `StateMap` — update slot on verb received, null slot on `verb: null`
- Run a `setInterval` every 3s that:
  - Filters `StateMap` to non-expired slots
  - Advances rotation index (wraps around)
  - Calls `DeskThing.send({ type: 'status', payload: { verb, source } })` or `{ verb: null }` if none active
- Tear down servers cleanly at `stop`

**WebSocket message shape (from Chrome extension):**
```json
{ "source": "chat" | "cowork", "verb": "Thinking" | null }
```

**HTTP POST body (from Claude Code hook):**
```json
{ "source": "code", "verb": "Reading" | null }
```

**DeskThing.send payload:**
```json
{ "type": "status", "payload": { "verb": "Reading", "source": "code", "activeCount": 1 } }
```
Or when idle:
```json
{ "type": "status", "payload": { "verb": null, "source": null, "activeCount": 0 } }
```

---

## Component 2 — Chrome Extension (`extension/`)

**Files:** `manifest.json`, `content.js`

**Manifest v3.** Matches `https://claude.ai/*` and `https://cowork.claude.ai/*`. No background service worker needed — content script only.

**`content.js` behavior:**
1. On load, open a WebSocket to `ws://localhost:7891`
2. Reconnect on close/error with exponential backoff: 1s → 2s → 4s → … → max 30s
3. Attach a `MutationObserver` to `document.body` watching for the spinner element
4. When spinner text appears or changes: strip trailing `…`, send `{ source, verb }`
5. When spinner element is removed from DOM: send `{ source, verb: null }`
6. `source` is `"chat"` on `claude.ai`, `"cowork"` on `cowork.claude.ai`

**Spinner element selector:** to be confirmed against live DOM — do not hardcode until verified.

---

## Component 3 — Claude Code Hook (`hooks/`)

**Hook type:** `PreToolUse` (fires before every tool call) + `Stop` (fires when session ends).

**Installation:** Defined in `~/.claude/settings.json` under `hooks`.

**Hook script (`hooks/send-verb.sh`):**
```bash
#!/bin/bash
# Claude Code passes hook context as JSON on stdin
# Parse tool_name from stdin, map to verb, POST to plugin
TOOL_NAME=$(cat | node -e "const d=require('fs').readFileSync(0,'utf8'); console.log(JSON.parse(d).tool_name || '')")
VERB=$(node hooks/map-verb.js "$TOOL_NAME")
curl -sf -X POST http://localhost:7891/status \
  -H "Content-Type: application/json" \
  -d "{\"source\":\"code\",\"verb\":\"$VERB\"}" || true
```
> **Note:** Exact stdin JSON shape must be verified against Claude Code hook docs before finalizing.

**Hook script (`hooks/clear-verb.sh`):**
```bash
#!/bin/bash
curl -sf -X POST http://localhost:7891/status \
  -H "Content-Type: application/json" \
  -d '{"source":"code","verb":null}' || true
```

**Tool → Verb mapping (`hooks/map-verb.js`):**

| Tool | Verb |
|------|------|
| `Read` | Reading |
| `Write` | Writing |
| `Edit` | Writing |
| `Bash` | Running |
| `WebFetch` | Fetching |
| `WebSearch` | Searching |
| `Agent` | Thinking |
| `Task*` | Analyzing |
| *(default)* | Thinking |

The mapping lives in `hooks/map-verb.js` so it can be tuned without touching the hook registration.

---

## Component 4 — CarThing UI (`src/`)

**Canvas:** 800 × 480px landscape.

**States:**

| State | Display |
|-------|---------|
| Idle | Static Claude logo (✦), centered, no animation |
| Active (1 source) | Large verb + animated dots + source label, pulse rings |
| Active (rotating) | Same as above + rotation dot indicators at bottom |

**Visual design:**
- Verb: ~120px bold, centered, white (`#e6edf3`)
- Pulse rings: two concentric circles behind verb, animate opacity + scale on 2s cycle
- Animated dots: three dots below verb, staggered fade (1.4s cycle)
- Source label: 10px uppercase, muted (`#4a5a8a`), below dots
- Rotation dots: small filled/empty dots at bottom-center, only shown when `activeCount > 1`
- Per-source accent color: blue `#58a6ff` (Code) · green `#3fb950` (Chat) · orange `#f0883e` (Cowork)
- Background: near-black `#0a0a0a`
- Verb transitions: CSS opacity fade + slight scale on change

**React client (`src/App.tsx`):**
```tsx
DeskThing.on('status', ({ verb, source, activeCount }) => {
  // update state → re-render
})
```

---

## Project Structure

```
ClaudeThing/
├── server/
│   └── index.ts          # DeskThing plugin — hub, WS server, state, rotation
├── src/
│   ├── App.tsx            # CarThing React UI
│   ├── main.tsx
│   └── index.css
├── extension/
│   ├── manifest.json      # Chrome extension Manifest v3
│   └── content.js         # DOM watcher + WebSocket client
├── hooks/
│   ├── send-verb.sh       # PreToolUse hook script
│   ├── clear-verb.sh      # Stop hook script
│   └── map-verb.js        # Tool → verb mapping
├── public/
├── package.json
├── vite.config.ts
└── CLAUDE.md
```

---

## Key Constraints

- No Claude API key, no external network calls
- Plugin must not crash if no Chrome extension is connected
- Hook scripts must fail silently (`|| true`) if plugin is not running
- WebSocket reconnection must not surface errors to the user
- Spinner element selector in `content.js` must be verified against live Claude DOM before hardcoding

---

## Open Questions

- **Spinner DOM selector:** Exact selector for the Claude Chat/Cowork spinner element — to be confirmed by inspecting live DOM before implementing `content.js`
- **Screen orientation:** CLAUDE.md lists `480 × 800px`; confirmed as **landscape 800 × 480px** during design — CLAUDE.md should be updated
