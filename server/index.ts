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
