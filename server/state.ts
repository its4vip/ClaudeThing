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
