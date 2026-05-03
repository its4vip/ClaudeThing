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
