import { DeskThing } from 'deskthing-server'
export { DeskThing }

import { createServer, IncomingMessage, ServerResponse } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { createStateMap, updateSlot, getCurrentDisplay, Source } from './state.js'

const PORT = 7891
const ROTATION_INTERVAL_MS = 3000
const KNOWN_VERBS = new Set(['Thinking', 'Reading', 'Writing', 'Running', 'Fetching', 'Searching', 'Analyzing'])

function isValidVerb(v: unknown): v is string {
  return v === null || (typeof v === 'string' && KNOWN_VERBS.has(v))
}

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
      req.on('data', (chunk: Buffer) => {
        if (body.length > 1024) { res.writeHead(413).end(); return }
        body += chunk.toString()
      })
      req.on('end', () => {
        try {
          const { source, verb } = JSON.parse(body)
          if (source === 'code' && isValidVerb(verb)) handleVerb('code', verb)
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
        if ((source === 'chat' || source === 'cowork') && isValidVerb(verb)) {
          handleVerb(source as Source, verb)
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
