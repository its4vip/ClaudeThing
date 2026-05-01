# ClaudeThing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a DeskThing app that captures the active Claude spinner verb from Claude Code (hooks), Claude Chat, and Claude Cowork (Chrome extension) and displays it on the CarThing screen in real time.

**Architecture:** The DeskThing plugin (`server/index.ts`) is the hub — it runs a WebSocket + HTTP server on port 7891, maintains a per-source state map with 5s expiry, rotates through active sources every 3s, and pushes display state to the CarThing React UI via `DeskThing.send()`. The Chrome extension sends verb updates over WebSocket; Claude Code hooks POST over HTTP.

**Tech Stack:** TypeScript, React 18, Tailwind CSS, Vite + esbuild, `deskthing-server` / `deskthing-client` v0.10, `ws` v8, Vitest, Chrome Extension Manifest v3

---

## File Map

| File | Purpose |
|------|---------|
| `package.json` | npm manifest + build scripts |
| `vite.config.ts` | Vite + React + legacy (Chrome 69) + Vitest config |
| `tailwind.config.js` | Tailwind content paths |
| `postcss.config.js` | Tailwind + Autoprefixer |
| `tsconfig.json` | Root tsconfig referencing app + node configs |
| `tsconfig.app.json` | Compiler config for `src/` (React) |
| `tsconfig.node.json` | Compiler config for `vite.config.ts` + `server/` |
| `index.html` | Vite entry HTML |
| `scripts/package.js` | Packages `dist/` into a DeskThing-installable zip |
| `src/main.tsx` | React entry point |
| `src/index.css` | Global styles + keyframe animations |
| `src/App.tsx` | CarThing UI — all three states (Idle, Active, Rotating) |
| `server/state.ts` | Pure state functions — StateMap, slot expiry, rotation |
| `server/__tests__/state.test.ts` | Unit tests for state.ts |
| `server/index.ts` | DeskThing plugin — WS+HTTP server, lifecycle, rotation timer |
| `extension/manifest.json` | Chrome Extension Manifest v3 |
| `extension/content.js` | DOM verb watcher + WebSocket client (Chat + Cowork) |
| `hooks/verb-map.js` | Pure tool→verb mapping function (exported, tested) |
| `hooks/__tests__/verb-map.test.js` | Unit tests for verb-map.js |
| `hooks/map-verb.js` | CLI script: reads tool name from argv, prints verb |
| `hooks/send-verb.sh` | PreToolUse hook: reads stdin JSON, POSTs verb to plugin |
| `hooks/clear-verb.sh` | Stop hook: POSTs `verb: null` to plugin |

---

## Task 1: Scaffold project

**Files:**
- Create: `package.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`
- Create: `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
- Create: `index.html`, `src/main.tsx`, `src/index.css`
- Create: `scripts/package.js`
- Create: `public/` (empty directory)

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "claudething",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "description": "Mirrors real-time Claude activity to the CarThing screen",
  "author": "Neil Acquatella",
  "scripts": {
    "dev": "vite",
    "build": "vite build && npm run build-server && node scripts/package.js",
    "build-server": "esbuild server/index.ts --bundle --platform=node --outfile=dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint ."
  },
  "dependencies": {
    "deskthing-client": "^0.10.2",
    "deskthing-server": "^0.10.2",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "ws": "^8.18.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@types/ws": "^8.5.13",
    "@vitejs/plugin-legacy": "^5.4.2",
    "@vitejs/plugin-react": "^4.3.1",
    "archiver": "^7.0.1",
    "autoprefixer": "^10.4.19",
    "esbuild": "^0.19.2",
    "postcss": "^8.4.40",
    "tailwindcss": "^3.4.10",
    "typescript": "^5.5.3",
    "vite": "^5.4.1",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Create `vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    legacy({ targets: ['Chrome 69'] }),
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        assetFileNames: '[name]-[hash][extname]',
        chunkFileNames: '[name]-[hash].js',
        entryFileNames: '[name]-[hash].js',
      },
    },
  },
  test: {
    environment: 'node',
    include: ['server/__tests__/**/*.test.ts', 'hooks/__tests__/**/*.test.js'],
  },
})
```

- [ ] **Step 3: Create `tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

- [ ] **Step 4: Create `postcss.config.js`**

```js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
}
```

- [ ] **Step 5: Create `tsconfig.json`**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

- [ ] **Step 6: Create `tsconfig.app.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

- [ ] **Step 7: Create `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true
  },
  "include": ["vite.config.ts", "server/**/*.ts"]
}
```

- [ ] **Step 8: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ClaudeThing</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 9: Create `src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 10: Create `src/index.css` (stub — animations added in Task 4)**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* { box-sizing: border-box; margin: 0; padding: 0; }
```

- [ ] **Step 11: Fetch `scripts/package.js` from the DeskThing example app**

```bash
mkdir -p scripts
gh api repos/ItsRiprod/deskthing-apps/contents/exampleapp/scripts/package.js \
  -q '.content' | base64 -d > scripts/package.js
```

- [ ] **Step 12: Create `public/` directory**

```bash
mkdir -p public
```

- [ ] **Step 13: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "chore: scaffold project — configs, entry files, deps"
```

---

## Task 2: State management (TDD)

**Files:**
- Create: `server/__tests__/state.test.ts`
- Create: `server/state.ts`

- [ ] **Step 1: Create test file `server/__tests__/state.test.ts`**

```bash
mkdir -p server/__tests__
```

```ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  createStateMap,
  updateSlot,
  getActiveSlots,
  getCurrentDisplay,
} from '../state.js'

afterEach(() => vi.useRealTimers())

describe('createStateMap', () => {
  it('returns all null slots', () => {
    expect(createStateMap()).toEqual({ code: null, chat: null, cowork: null })
  })
})

describe('updateSlot', () => {
  it('sets a verb on the named slot', () => {
    const state = updateSlot(createStateMap(), 'code', 'Reading')
    expect(state.code?.verb).toBe('Reading')
    expect(state.code?.updatedAt).toBeCloseTo(Date.now(), -2)
  })

  it('clears a slot when verb is null', () => {
    let state = updateSlot(createStateMap(), 'chat', 'Thinking')
    state = updateSlot(state, 'chat', null)
    expect(state.chat).toBeNull()
  })

  it('does not mutate other slots', () => {
    const state = updateSlot(createStateMap(), 'code', 'Running')
    const next = updateSlot(state, 'chat', 'Thinking')
    expect(next.code?.verb).toBe('Running')
    expect(next.chat?.verb).toBe('Thinking')
  })
})

describe('getActiveSlots', () => {
  it('returns empty array when all slots null', () => {
    expect(getActiveSlots(createStateMap())).toEqual([])
  })

  it('returns active slots with source and verb', () => {
    const state = updateSlot(createStateMap(), 'code', 'Reading')
    const active = getActiveSlots(state)
    expect(active).toHaveLength(1)
    expect(active[0]).toEqual({ source: 'code', verb: 'Reading' })
  })

  it('excludes slots expired beyond 5s', () => {
    vi.useFakeTimers()
    const state = updateSlot(createStateMap(), 'code', 'Reading')
    vi.advanceTimersByTime(5001)
    expect(getActiveSlots(state)).toHaveLength(0)
  })

  it('includes slots updated within 5s', () => {
    vi.useFakeTimers()
    const state = updateSlot(createStateMap(), 'code', 'Reading')
    vi.advanceTimersByTime(4999)
    expect(getActiveSlots(state)).toHaveLength(1)
  })

  it('returns multiple active slots in declaration order (code, chat, cowork)', () => {
    let state = createStateMap()
    state = updateSlot(state, 'chat', 'Thinking')
    state = updateSlot(state, 'code', 'Running')
    const active = getActiveSlots(state)
    expect(active[0].source).toBe('code')
    expect(active[1].source).toBe('chat')
  })
})

describe('getCurrentDisplay', () => {
  it('returns null when no active slots', () => {
    expect(getCurrentDisplay(createStateMap(), 0)).toBeNull()
  })

  it('returns the only active slot at any rotation index', () => {
    const state = updateSlot(createStateMap(), 'chat', 'Thinking')
    expect(getCurrentDisplay(state, 0)).toEqual({
      verb: 'Thinking', source: 'chat', activeCount: 1, rotationPosition: 0,
    })
    expect(getCurrentDisplay(state, 7)).toEqual({
      verb: 'Thinking', source: 'chat', activeCount: 1, rotationPosition: 0,
    })
  })

  it('rotates through active slots by index modulo activeCount', () => {
    let state = createStateMap()
    state = updateSlot(state, 'code', 'Running')
    state = updateSlot(state, 'chat', 'Thinking')
    expect(getCurrentDisplay(state, 0)?.source).toBe('code')
    expect(getCurrentDisplay(state, 1)?.source).toBe('chat')
    expect(getCurrentDisplay(state, 2)?.source).toBe('code') // wraps
  })

  it('includes activeCount and rotationPosition in output', () => {
    let state = createStateMap()
    state = updateSlot(state, 'code', 'Running')
    state = updateSlot(state, 'chat', 'Thinking')
    const display = getCurrentDisplay(state, 1)
    expect(display?.activeCount).toBe(2)
    expect(display?.rotationPosition).toBe(1)
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../state.js'`

- [ ] **Step 3: Create `server/state.ts`**

```ts
export type Source = 'code' | 'chat' | 'cowork'
export type Slot = { verb: string; updatedAt: number } | null
export type StateMap = Record<Source, Slot>

export interface DisplayState {
  verb: string
  source: Source
  activeCount: number
  rotationPosition: number
}

export const SLOT_EXPIRY_MS = 5000

export function createStateMap(): StateMap {
  return { code: null, chat: null, cowork: null }
}

export function updateSlot(state: StateMap, source: Source, verb: string | null): StateMap {
  return { ...state, [source]: verb !== null ? { verb, updatedAt: Date.now() } : null }
}

export function getActiveSlots(state: StateMap): Array<{ source: Source; verb: string }> {
  const now = Date.now()
  const sources: Source[] = ['code', 'chat', 'cowork']
  return sources
    .filter(s => state[s] !== null && now - state[s]!.updatedAt < SLOT_EXPIRY_MS)
    .map(s => ({ source: s, verb: state[s]!.verb }))
}

export function getCurrentDisplay(state: StateMap, rotationIndex: number): DisplayState | null {
  const active = getActiveSlots(state)
  if (active.length === 0) return null
  const pos = rotationIndex % active.length
  const { source, verb } = active[pos]
  return { verb, source, activeCount: active.length, rotationPosition: pos }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test
```

Expected: All 11 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add server/
git commit -m "feat: add state management with slot expiry and rotation"
```

---

## Task 3: DeskThing plugin server

**Files:**
- Create: `server/index.ts`

- [ ] **Step 1: Create `server/index.ts`**

```ts
import { DeskThing } from 'deskthing-server'
export { DeskThing }

import { createServer, IncomingMessage, ServerResponse } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { createStateMap, updateSlot, getCurrentDisplay, Source } from './state.js'

const PORT = 7891
const ROTATION_INTERVAL_MS = 3000

let httpServer: ReturnType<typeof createServer> | null = null
let wss: WebSocketServer | null = null
let rotationTimer: NodeJS.Timeout | null = null
let rotationIndex = 0
let state = createStateMap()

function broadcast() {
  const display = getCurrentDisplay(state, rotationIndex)
  DeskThing.send({
    type: 'status',
    payload: display ?? { verb: null, source: null, activeCount: 0, rotationPosition: 0 },
  })
}

function handleVerb(source: Source, verb: string | null) {
  state = updateSlot(state, source, verb)
  broadcast()
}

const start = async () => {
  httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
    if (req.method === 'POST' && req.url === '/status') {
      let body = ''
      req.on('data', (chunk: Buffer) => { body += chunk.toString() })
      req.on('end', () => {
        try {
          const { source, verb } = JSON.parse(body)
          if (source === 'code') handleVerb('code', verb ?? null)
          res.writeHead(200).end('ok')
        } catch {
          res.writeHead(400).end('bad request')
        }
      })
    } else {
      res.writeHead(404).end()
    }
  })

  wss = new WebSocketServer({ server: httpServer })

  wss.on('connection', (ws: WebSocket) => {
    ws.on('message', (data: Buffer) => {
      try {
        const { source, verb } = JSON.parse(data.toString())
        if (source === 'chat' || source === 'cowork') {
          handleVerb(source as Source, verb ?? null)
        }
      } catch { /* ignore malformed messages */ }
    })
  })

  httpServer.listen(PORT, () => {
    DeskThing.sendLog(`ClaudeThing listening on :${PORT}`)
  })

  rotationTimer = setInterval(() => {
    rotationIndex++
    broadcast()
  }, ROTATION_INTERVAL_MS)
}

const stop = async () => {
  if (rotationTimer) { clearInterval(rotationTimer); rotationTimer = null }
  wss?.close()
  wss = null
  httpServer?.close()
  httpServer = null
  DeskThing.sendLog('ClaudeThing stopped')
}

DeskThing.on('start', start)
DeskThing.on('stop', stop)
```

- [ ] **Step 2: Smoke-test the server bundle builds without errors**

```bash
npm run build-server
```

Expected: `dist/index.js` created, no TypeScript or esbuild errors.

- [ ] **Step 3: Manually verify the server starts and accepts messages**

Start the plugin in isolation:
```bash
node dist/index.js
```

In a second terminal, test the HTTP endpoint:
```bash
curl -s -X POST http://localhost:7891/status \
  -H 'Content-Type: application/json' \
  -d '{"source":"code","verb":"Reading"}'
```
Expected output: `ok`

Test WebSocket (requires `wscat` or similar):
```bash
echo '{"source":"chat","verb":"Thinking"}' | \
  npx wscat -c ws://localhost:7891 --execute -
```

Stop the test server with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add server/index.ts dist/
git commit -m "feat: add DeskThing plugin with WS+HTTP server and rotation"
```

---

## Task 4: CarThing UI

**Files:**
- Modify: `src/index.css`
- Create: `src/App.tsx`

- [ ] **Step 1: Replace `src/index.css` with full styles including animations**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* { box-sizing: border-box; margin: 0; padding: 0; }

@keyframes pulse-ring {
  0%, 100% { opacity: 0.25; transform: scale(1); }
  50% { opacity: 0.65; transform: scale(1.06); }
}

@keyframes dot-bounce {
  0%, 80%, 100% { opacity: 0.2; transform: scale(0.75); }
  40% { opacity: 1; transform: scale(1); }
}

@keyframes verb-in {
  from { opacity: 0; transform: scale(0.94); }
  to   { opacity: 1; transform: scale(1); }
}

.animate-pulse-ring {
  animation: pulse-ring 2s ease-in-out infinite;
}

.animate-pulse-ring-delayed {
  animation: pulse-ring 2s ease-in-out infinite 0.35s;
}

.animate-dot {
  animation: dot-bounce 1.4s ease-in-out infinite;
}

.animate-verb-in {
  animation: verb-in 0.25s ease-out both;
}
```

- [ ] **Step 2: Create `src/App.tsx`**

```tsx
import React, { useEffect, useState } from 'react'
import { DeskThing } from 'deskthing-client'

type Source = 'code' | 'chat' | 'cowork'

interface DisplayState {
  verb: string | null
  source: Source | null
  activeCount: number
  rotationPosition: number
}

const ACCENT: Record<Source, string> = {
  code:   '#58a6ff',
  chat:   '#3fb950',
  cowork: '#f0883e',
}

const SOURCE_LABEL: Record<Source, string> = {
  code:   'Claude Code',
  chat:   'Claude Chat',
  cowork: 'Claude Cowork',
}

const IDLE: DisplayState = { verb: null, source: null, activeCount: 0, rotationPosition: 0 }

const App: React.FC = () => {
  const [display, setDisplay] = useState<DisplayState>(IDLE)

  useEffect(() => {
    const remove = (DeskThing as any).on('status', (data: any) => {
      setDisplay(data.payload ?? IDLE)
    })
    return () => remove()
  }, [])

  const { verb, source, activeCount, rotationPosition } = display
  const accent = source ? ACCENT[source] : '#58a6ff'
  const isActive = !!verb

  return (
    <div className="w-screen h-screen bg-[#0a0a0a] flex flex-col items-center justify-center relative overflow-hidden select-none">

      {/* Pulse rings — only visible when active */}
      {isActive && (
        <>
          <div
            className="absolute rounded-full border animate-pulse-ring"
            style={{ width: 340, height: 340, borderColor: `${accent}28` }}
          />
          <div
            className="absolute rounded-full border animate-pulse-ring-delayed"
            style={{ width: 250, height: 250, borderColor: `${accent}45` }}
          />
        </>
      )}

      {/* Idle state */}
      {!isActive && (
        <div className="flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-[#1a1a2e] border-2 border-[#2a2d4a] flex items-center justify-center">
            <span className="text-[#4a5a8a] text-5xl font-light">✦</span>
          </div>
          <span className="text-[#252830] text-xs tracking-[0.25em] uppercase">idle</span>
        </div>
      )}

      {/* Active state */}
      {isActive && (
        <div key={verb} className="flex flex-col items-center gap-3 z-10 animate-verb-in">
          {/* Verb — dominant element */}
          <span
            className="font-bold tracking-tight leading-none text-[#e6edf3]"
            style={{ fontSize: 'clamp(72px, 14vw, 120px)' }}
          >
            {verb}
          </span>

          {/* Animated ellipsis dots */}
          <div className="flex gap-2">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2 h-2 rounded-full animate-dot"
                style={{ background: accent, animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>

          {/* Source label */}
          {source && (
            <span className="text-[10px] tracking-[0.18em] uppercase text-[#4a5a8a]">
              {SOURCE_LABEL[source]}
            </span>
          )}

          {/* Rotation position dots — only when multiple sources active */}
          {activeCount > 1 && (
            <div className="flex gap-2 mt-1">
              {Array.from({ length: activeCount }).map((_, i) => (
                <div
                  key={i}
                  className="h-[3px] w-5 rounded-full transition-colors duration-300"
                  style={{ background: i === rotationPosition ? accent : '#252830' }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default App
```

- [ ] **Step 3: Run the Vite dev server and inspect all three states**

```bash
npm run dev
```

Open http://localhost:5173 in a browser. The page will show the Idle state (dark background, ✦ logo, "idle" label).

To preview the Active state, temporarily add this to `src/main.tsx` just before the `createRoot` call, then remove it after verifying:
```tsx
// Temporary preview — remove after checking
import { DeskThing } from 'deskthing-client'
setTimeout(() => {
  (DeskThing as any).emit?.('status', {
    payload: { verb: 'Reading', source: 'code', activeCount: 1, rotationPosition: 0 }
  })
}, 500)
```

Verify:
- Idle: ✦ logo, no rings, no animation
- Active (1 source): verb at large size, pulse rings, dots, source label, no rotation indicators
- Active (2 sources): same + rotation position bar shown

Remove the temporary preview code after confirming.

- [ ] **Step 4: Build the full client to confirm no errors**

```bash
npx vite build
```

Expected: `dist/` populated with `index.html`, `index-[hash].js`, `index-[hash].css`. No TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/ index.html
git commit -m "feat: add CarThing UI with idle, active, and rotation states"
```

---

## Task 5: Chrome extension

**Files:**
- Create: `extension/manifest.json`
- Create: `extension/content.js`

- [ ] **Step 1: Verify the Claude spinner DOM selector**

1. Open https://claude.ai in Chrome
2. Start a conversation that triggers tool use (e.g., ask Claude to search for something)
3. Open DevTools → Elements
4. While the spinner is visible, find the element whose text reads "Thinking…", "Searching…", etc.
5. Note the exact element type and any stable attributes (class, data-testid, aria-label)

The content script uses text-based detection (searches all text nodes for known verbs), so a precise CSS selector is not strictly required — but knowing the DOM structure helps confirm the approach will work.

- [ ] **Step 2: Create `extension/manifest.json`**

```json
{
  "manifest_version": 3,
  "name": "ClaudeThing",
  "version": "0.1.0",
  "description": "Sends Claude spinner verbs to the ClaudeThing DeskThing plugin",
  "content_scripts": [
    {
      "matches": ["https://claude.ai/*", "https://cowork.claude.ai/*"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ]
}
```

- [ ] **Step 3: Create `extension/content.js`**

```js
// Known spinner verbs — must match exactly what Claude displays (without the ellipsis)
const KNOWN_VERBS = ['Thinking', 'Reading', 'Writing', 'Running', 'Fetching', 'Searching', 'Analyzing']

const source = location.hostname === 'cowork.claude.ai' ? 'cowork' : 'chat'

let ws = null
let reconnectDelay = 1000
let currentVerb = null
let reconnectTimer = null

function connect() {
  ws = new WebSocket('ws://localhost:7891')

  ws.addEventListener('open', () => {
    reconnectDelay = 1000
    if (currentVerb) send(currentVerb)
  })

  ws.addEventListener('close', scheduleReconnect)
  ws.addEventListener('error', () => ws.close())
}

function scheduleReconnect() {
  clearTimeout(reconnectTimer)
  reconnectTimer = setTimeout(() => {
    reconnectDelay = Math.min(reconnectDelay * 2, 30000)
    connect()
  }, reconnectDelay)
}

function send(verb) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ source, verb }))
  }
}

function findActiveVerb() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) {
    const text = (walker.currentNode.textContent ?? '').trim()
    for (const verb of KNOWN_VERBS) {
      if (text === `${verb}…` || text === `${verb}...` || text === verb) {
        return verb
      }
    }
  }
  return null
}

const observer = new MutationObserver(() => {
  const verb = findActiveVerb()
  if (verb === currentVerb) return
  currentVerb = verb
  send(verb)
})

observer.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true,
})

connect()
```

- [ ] **Step 4: Load the extension in Chrome and test it**

1. Open Chrome → chrome://extensions
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked" → select the `extension/` directory
4. Open https://claude.ai and start a conversation that triggers tool use
5. Open DevTools → Console on the claude.ai tab and confirm no WebSocket errors (it will log connection refused if the DeskThing plugin isn't running — that's expected)
6. Start the plugin server: `node dist/index.js`
7. Refresh the claude.ai tab, trigger tool use, confirm the plugin logs received verbs

- [ ] **Step 5: Commit**

```bash
git add extension/
git commit -m "feat: add Chrome extension for Chat/Cowork verb detection"
```

---

## Task 6: Tool→verb mapping (TDD)

**Files:**
- Create: `hooks/__tests__/verb-map.test.js`
- Create: `hooks/verb-map.js`
- Create: `hooks/map-verb.js`

- [ ] **Step 1: Create test file `hooks/__tests__/verb-map.test.js`**

```bash
mkdir -p hooks/__tests__
```

```js
import { describe, it, expect } from 'vitest'
import { mapToolToVerb } from '../verb-map.js'

describe('mapToolToVerb', () => {
  it.each([
    ['Read',      'Reading'],
    ['Write',     'Writing'],
    ['Edit',      'Writing'],
    ['Bash',      'Running'],
    ['WebFetch',  'Fetching'],
    ['WebSearch', 'Searching'],
    ['Agent',     'Thinking'],
  ])('maps %s → %s', (tool, verb) => {
    expect(mapToolToVerb(tool)).toBe(verb)
  })

  it('maps any Task* tool to Analyzing', () => {
    expect(mapToolToVerb('TaskCreate')).toBe('Analyzing')
    expect(mapToolToVerb('TaskUpdate')).toBe('Analyzing')
    expect(mapToolToVerb('TaskGet')).toBe('Analyzing')
  })

  it('defaults unknown tools to Thinking', () => {
    expect(mapToolToVerb('UnknownTool')).toBe('Thinking')
    expect(mapToolToVerb('')).toBe('Thinking')
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../verb-map.js'`

- [ ] **Step 3: Create `hooks/verb-map.js`**

```js
const VERB_MAP = {
  Read:      'Reading',
  Write:     'Writing',
  Edit:      'Writing',
  Bash:      'Running',
  WebFetch:  'Fetching',
  WebSearch: 'Searching',
  Agent:     'Thinking',
}

export function mapToolToVerb(toolName) {
  if (toolName.startsWith('Task')) return 'Analyzing'
  return VERB_MAP[toolName] ?? 'Thinking'
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test
```

Expected: All tests PASS (state tests + verb-map tests).

- [ ] **Step 5: Create `hooks/map-verb.js`** (CLI script called by shell hooks)

```js
import { mapToolToVerb } from './verb-map.js'
process.stdout.write(mapToolToVerb(process.argv[2] ?? ''))
```

- [ ] **Step 6: Smoke-test the CLI script**

```bash
node hooks/map-verb.js Read
```
Expected output: `Reading` (no newline)

```bash
node hooks/map-verb.js Bash
```
Expected output: `Running`

```bash
node hooks/map-verb.js TaskCreate
```
Expected output: `Analyzing`

- [ ] **Step 7: Commit**

```bash
git add hooks/
git commit -m "feat: add tool-to-verb mapping with tests"
```

---

## Task 7: Hook shell scripts

**Files:**
- Create: `hooks/send-verb.sh`
- Create: `hooks/clear-verb.sh`

- [ ] **Step 1: Create `hooks/send-verb.sh`**

```bash
#!/usr/bin/env bash
# PreToolUse hook — Claude Code passes hook context as JSON on stdin.
# Extracts tool_name, maps to a verb, POSTs to the ClaudeThing plugin.
# Fails silently if the plugin is not running.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

INPUT=$(cat)
TOOL_NAME=$(printf '%s' "$INPUT" | node -e "
  let d = '';
  process.stdin.on('data', c => d += c);
  process.stdin.on('end', () => {
    try { process.stdout.write(JSON.parse(d).tool_name || '') }
    catch { process.stdout.write('') }
  });
")

VERB=$(node "$SCRIPT_DIR/map-verb.js" "$TOOL_NAME" 2>/dev/null || printf 'Thinking')

curl -sf --max-time 1 \
  -X POST http://localhost:7891/status \
  -H 'Content-Type: application/json' \
  -d "{\"source\":\"code\",\"verb\":\"$VERB\"}" \
  >/dev/null 2>&1 || true
```

- [ ] **Step 2: Create `hooks/clear-verb.sh`**

```bash
#!/usr/bin/env bash
# Stop hook — clears the Claude Code slot in the ClaudeThing plugin.
# Fails silently if the plugin is not running.
curl -sf --max-time 1 \
  -X POST http://localhost:7891/status \
  -H 'Content-Type: application/json' \
  -d '{"source":"code","verb":null}' \
  >/dev/null 2>&1 || true
```

- [ ] **Step 3: Make scripts executable**

```bash
chmod +x hooks/send-verb.sh hooks/clear-verb.sh
```

- [ ] **Step 4: Verify `send-verb.sh` parses stdin correctly**

With the plugin running (`node dist/index.js` in another terminal):

```bash
printf '{"tool_name":"Read","tool_input":{"file_path":"/tmp/x"}}' \
  | bash hooks/send-verb.sh
```

Then check the plugin terminal — it should log that it received `{ source: 'code', verb: 'Reading' }`. If the plugin isn't running, confirm the script exits without error (no crash, no output).

- [ ] **Step 5: Verify `clear-verb.sh` clears the slot**

With the plugin running:
```bash
bash hooks/clear-verb.sh
```

Plugin should broadcast idle state. Without the plugin running, the script should exit silently.

- [ ] **Step 6: Commit**

```bash
git add hooks/send-verb.sh hooks/clear-verb.sh
git commit -m "feat: add Claude Code PreToolUse and Stop hook scripts"
```

---

## Task 8: Hook installation

**Files:**
- Modify: `~/.claude/settings.json`

- [ ] **Step 1: Find the absolute path to the hook scripts**

```bash
echo "$(pwd)/hooks/send-verb.sh"
echo "$(pwd)/hooks/clear-verb.sh"
```

Note both paths. They will look like `/Users/nacquatella/Documents/Claude/Projects/ClaudeThing/hooks/send-verb.sh`.

- [ ] **Step 2: Open `~/.claude/settings.json` and add the hooks**

The file may already have content. Add a `hooks` key (or merge with existing). The final hooks section should be:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "/Users/nacquatella/Documents/Claude/Projects/ClaudeThing/hooks/send-verb.sh"
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "/Users/nacquatella/Documents/Claude/Projects/ClaudeThing/hooks/clear-verb.sh"
          }
        ]
      }
    ]
  }
}
```

> **Note:** `matcher: ""` matches all tool calls / all stop events. If `~/.claude/settings.json` already has a `hooks` key, add to the existing arrays rather than replacing them.

- [ ] **Step 3: Verify hook fires**

Start a new Claude Code session in the terminal from any directory (not this project). With the plugin running (`node dist/index.js`), trigger a tool call (e.g., ask Claude to read a file). The plugin terminal should log `code` verb updates.

- [ ] **Step 4: Commit the install instructions (not the settings file)**

`~/.claude/settings.json` is a global user file — do not commit it. Instead update `CLAUDE.md` with hook installation instructions:

In `CLAUDE.md`, add:

```markdown
## Hook Installation

To enable Claude Code verb detection, add the following to `~/.claude/settings.json`:

\`\`\`json
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "", "hooks": [{ "type": "command", "command": "<absolute-path>/hooks/send-verb.sh" }] }
    ],
    "Stop": [
      { "matcher": "", "hooks": [{ "type": "command", "command": "<absolute-path>/hooks/clear-verb.sh" }] }
    ]
  }
}
\`\`\`

Replace `<absolute-path>` with the absolute path to this repo.
```

```bash
git add CLAUDE.md
git commit -m "docs: add Claude Code hook installation instructions"
```

---

## Task 9: Full build and integration test

- [ ] **Step 1: Run the full test suite**

```bash
npm test
```

Expected: All tests PASS.

- [ ] **Step 2: Run the full build**

```bash
npm run build
```

Expected:
- `dist/index.html` — client entry
- `dist/index-[hash].js` — client bundle
- `dist/index-[hash].css` — styles
- `dist/index.js` — server bundle
- `dist/claudething-v0.1.0.zip` — DeskThing-installable package

- [ ] **Step 3: End-to-end integration test**

Start the plugin server:
```bash
node dist/index.js
```

In a second terminal, simulate each source:

```bash
# Simulate Claude Code — Reading
printf '{"tool_name":"Read"}' | bash hooks/send-verb.sh

# Simulate Claude Code — Running
printf '{"tool_name":"Bash"}' | bash hooks/send-verb.sh

# Simulate Chat — Thinking (WebSocket)
echo '{"source":"chat","verb":"Thinking"}' | \
  npx wscat -c ws://localhost:7891 --execute -

# Clear code slot
bash hooks/clear-verb.sh
```

Confirm the plugin logs each state transition correctly.

- [ ] **Step 4: Load the extension and run a full live test**

1. Ensure `extension/` is loaded as an unpacked extension in Chrome
2. Open https://claude.ai and trigger a multi-step Claude Code session (or just have a conversation)
3. With `node dist/index.js` running, confirm the plugin logs Chat verbs arriving over WebSocket
4. Trigger a Claude Code tool call in a separate terminal — confirm the plugin logs Code verbs arriving via HTTP

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: verify full build and integration"
```

---

## Self-Review

### Spec Coverage

| Spec requirement | Task(s) |
|-----------------|---------|
| DeskThing plugin as hub | Task 3 |
| WebSocket server :7891 | Task 3 |
| HTTP /status endpoint | Task 3 |
| StateMap with 5s expiry | Task 2 |
| 3s rotation timer | Task 3 |
| DeskThing.send() push | Task 3 |
| Idle → Active → Idle model | Tasks 2 + 4 |
| Landscape 800×480 UI | Task 4 |
| Pulse rings, verb, dots | Task 4 |
| Source label + accent color | Task 4 |
| Rotation position indicators | Task 4 |
| Chrome extension MV3 | Task 5 |
| MutationObserver DOM watch | Task 5 |
| WebSocket reconnect backoff | Task 5 |
| claude.ai + cowork.claude.ai | Task 5 |
| Tool→verb mapping | Task 6 |
| PreToolUse hook script | Tasks 6 + 7 |
| Stop hook script | Task 7 |
| Hook installation docs | Task 8 |
| Full build + package | Task 9 |
| Integration verification | Task 9 |

All spec requirements covered. ✓

### Type Consistency

- `Source` type defined in `server/state.ts`, imported in `server/index.ts` — consistent
- `DisplayState` interface defined in `server/state.ts`, referenced in `src/App.tsx` (as local inline type — consistent shape)
- `DeskThing.send({ type: 'status', payload: DisplayState | idle })` on server → `DeskThing.on('status', handler)` on client — consistent
- `rotationPosition` field added to `DisplayState` and used in `App.tsx` rotation dots — consistent

### No Placeholders

Scanned: no TBD/TODO/implement later patterns. The spinner DOM selector is handled via text-node search (selector-agnostic) rather than a hardcoded selector, with an explicit DevTools verification step. ✓
